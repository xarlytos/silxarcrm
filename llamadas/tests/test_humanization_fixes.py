"""Tests para los 5 fixes de humanización.

Validar que:
1. Smart Pausing calcula pausas realistas
2. Filler Words inyecta naturalidad
3. Edge Cases detecta traps
4. Emotional Mirroring ajusta tono
5. Memory Consistency rastrea facts
"""
import pytest
from app.conversation.humanization import (
    HumanPacing, FillerInjector, EdgeCaseHandler,
    get_pacing, get_fillers, get_edge_cases
)
from app.conversation.emotional_response import EmotionalToneAdjuster
from app.conversation.memory_consistency import ConversationConsistency, ContextMemory
from app.conversation.master_llm import ConversationBrief


class TestSmartPausing:
    """FIX 1: Smart Pausing - Esperar tiempo variable"""

    def test_pacing_basic(self):
        """Pausa base debe ser 400-1500ms"""
        pacing = HumanPacing()
        pause = pacing.calculate_pause_ms(turn_number=1, intent="neutro")
        assert 400 <= pause <= 1500, f"Pausa {pause} fuera de rango"

    def test_pacing_complex_intent(self):
        """Intención compleja → pausa más larga"""
        pacing = HumanPacing()
        pause_simple = pacing.calculate_pause_ms(turn_number=1, intent="neutro")
        pause_complex = pacing.calculate_pause_ms(turn_number=1, intent="precio")
        assert pause_complex > pause_simple, "Precio debe tomar más tiempo"

    def test_pacing_cached(self):
        """Respuesta cacheada → pausa más corta"""
        pacing = HumanPacing()
        pause_llm = pacing.calculate_pause_ms(
            turn_number=1, intent="precio", is_cached=False
        )
        pause_cached = pacing.calculate_pause_ms(
            turn_number=1, intent="precio", is_cached=True
        )
        assert pause_cached < pause_llm, "Cache debe ser más rápido"

    def test_pacing_late_turn(self):
        """Turno tardío → pausa más larga (cansancio)"""
        pacing = HumanPacing()
        pause_early = pacing.calculate_pause_ms(turn_number=2, intent="neutro")
        pause_late = pacing.calculate_pause_ms(turn_number=20, intent="neutro")
        assert pause_late > pause_early, "Turno tardío debe ser más lento"

    def test_pacing_max_3s(self):
        """Nunca esperar más de 3 segundos"""
        pacing = HumanPacing()
        pause = pacing.calculate_pause_ms(
            turn_number=50, intent="gatekeeper", complexity=1.0
        )
        assert pause <= 3000, f"Pausa {pause} > 3s"


class TestFillerWords:
    """FIX 2: Filler Words - Inyectar naturalidad"""

    def test_fillers_injection(self):
        """40% chance de inyectar filler"""
        fillers = FillerInjector()
        original = "Tengo tres opciones"
        injected = fillers.inject(original, stage="discovery")

        # Si inyectó, debe tener filler al inicio
        if injected != original:
            assert injected.startswith(("Pues", "Te cuento", "Fíjate", "Bueno", "Mira", "Es que"))

    def test_fillers_by_stage(self):
        """Fillers diferentes por stage"""
        fillers = FillerInjector()

        response_discovery = fillers.inject("Respuesta", stage="discovery")
        response_objecion = fillers.inject("Respuesta", stage="objecion")
        response_cierre = fillers.inject("Respuesta", stage="cierre")

        # Al menos una debe tener filler (estadísticamente, con 40% chance)
        responses = [response_discovery, response_objecion, response_cierre]
        assert any(r != "Respuesta" for r in responses), "Ningún filler inyectado (mala suerte de RNG)"

    def test_fillers_format(self):
        """Formato correcto: filler + coma + respuesta"""
        fillers = FillerInjector()
        # Inyectar repetidamente hasta obtener un filler
        for _ in range(100):
            result = fillers.inject("Tengo 3 opciones", stage="discovery")
            if result != "Tengo 3 opciones":
                # Debe tener coma o "que"
                assert "," in result or "que" in result, f"Formato inválido: {result}"
                break


class TestEdgeCaseHandler:
    """FIX 3: Edge Case Handler - Detectar traps"""

    def test_detect_test_humano(self):
        """Detectar 'Prueba que eres humano'"""
        handler = EdgeCaseHandler()
        is_trap, trap_type, response = handler.detect_trap("Prueba que eres humano")
        assert is_trap, "Debe detectar test_humano"
        assert trap_type == "test_humano"
        assert response  # Debe tener respuesta

    def test_detect_absurdo(self):
        """Detectar 'Dile a mi perro que aplauda'"""
        handler = EdgeCaseHandler()
        is_trap, trap_type, _ = handler.detect_trap("Dile a mi perro que aplauda")
        assert is_trap, "Debe detectar absurdo"
        assert trap_type == "absurdo"

    def test_detect_bot(self):
        """Detectar '¿Eres un bot?'"""
        handler = EdgeCaseHandler()
        is_trap, trap_type, _ = handler.detect_trap("¿Eres un bot?")
        assert is_trap, "Debe detectar test_bot"
        assert trap_type == "test_bot"

    def test_handle_returns_response(self):
        """handle() debe retornar respuesta para trap"""
        handler = EdgeCaseHandler()
        response = handler.handle("Prueba que eres humano")
        assert response is not None, "Debe retornar respuesta"
        assert "IA" in response or "humano" in response

    def test_no_trap_returns_none(self):
        """handle() retorna None para no-trap"""
        handler = EdgeCaseHandler()
        response = handler.handle("¿Cuántas citas pierdes al mes?")
        assert response is None, "No debe detectar trap en pregunta normal"


class TestEmotionalMirroring:
    """FIX 4: Emotional Mirroring - Ajustar por emoción"""

    def test_adjust_molesto(self):
        """Si molesto → tono empático_calmo"""
        adjuster = EmotionalToneAdjuster()
        from dataclasses import dataclass

        @dataclass
        class MockClassification:
            emocion: str = "molesto"
            confidence: float = 0.9

        brief = ConversationBrief(tono="profesional_cercano")
        classification = MockClassification()

        adjusted = adjuster.adjust_brief(brief, classification)
        assert adjusted.tono == "empático_calmo"
        assert adjusted.max_frases <= 2  # Habla menos

    def test_adjust_interesado(self):
        """Si interesado → tono energético"""
        adjuster = EmotionalToneAdjuster()
        from dataclasses import dataclass

        @dataclass
        class MockClassification:
            emocion: str = "interesado"
            confidence: float = 0.9

        brief = ConversationBrief(tono="profesional_cercano")
        classification = MockClassification()

        adjusted = adjuster.adjust_brief(brief, classification)
        assert adjusted.tono == "energético"
        assert adjusted.max_frases >= 3  # Puede hablar más

    def test_adjust_dudoso(self):
        """Si dudoso → tono confiado_paciente"""
        adjuster = EmotionalToneAdjuster()
        from dataclasses import dataclass

        @dataclass
        class MockClassification:
            emocion: str = "dudoso"
            confidence: float = 0.8

        brief = ConversationBrief()
        classification = MockClassification()

        adjusted = adjuster.adjust_brief(brief, classification)
        assert adjusted.tono == "confiado_paciente"


class TestMemoryConsistency:
    """FIX 5: Memory Consistency - Rastrea facts"""

    def test_extract_clientes_numero(self):
        """Extraer '5 clientes'"""
        memory = ContextMemory()
        extracted = memory.extract_from_text("Tenemos 5 clientes en Madrid", turn_number=1)
        assert "clientes_numero" in extracted
        assert extracted["clientes_numero"] == 5

    def test_extract_business_type(self):
        """Extraer 'veterinaria'"""
        memory = ContextMemory()
        extracted = memory.extract_from_text("Soy veterinaria", turn_number=1)
        assert "business_type" in extracted
        assert extracted["business_type"].lower() == "veterinaria"

    def test_extract_prospect_name(self):
        """Extraer nombre del prospecto"""
        memory = ContextMemory()
        extracted = memory.extract_from_text("Me llamo Juan García", turn_number=1)
        assert "prospect_name" in extracted
        assert "Juan" in extracted["prospect_name"]

    def test_should_not_repeat_question(self):
        """No preguntar 2 veces lo mismo"""
        consistency = ConversationConsistency()
        consistency.update("Tengo 5 clientes", turn_number=1)

        should_ask = consistency.should_ask_question(
            "¿Cuántos clientes tienes?",
            data_key="clientes_numero"
        )
        assert not should_ask, "No debe preguntar lo ya dicho"

    def test_should_ask_new_data(self):
        """Preguntar por dato no mencionado"""
        consistency = ConversationConsistency()
        consistency.update("Tengo 5 clientes", turn_number=1)

        should_ask = consistency.should_ask_question(
            "¿Cuántos pierdes al mes?",
            data_key="ingresos_monthly"
        )
        assert should_ask, "Debe preguntar por dato nuevo"

    def test_get_all_facts(self):
        """Retornar todos los facts extraídos"""
        consistency = ConversationConsistency()
        consistency.update("Somos veterinaria con 15 mascotas/día", turn_number=1)

        facts = consistency.get_contextual_facts()
        assert facts["clientes_numero"] == 15
        assert facts["business_type"] == "veterinaria"


class TestIntegration:
    """Tests de integración entre fixes"""

    def test_all_modules_import(self):
        """Todos los módulos importan sin error"""
        from app.conversation.humanization import get_pacing, get_fillers, get_edge_cases
        from app.conversation.emotional_response import EmotionalToneAdjuster
        from app.conversation.memory_consistency import ConversationConsistency

        assert get_pacing() is not None
        assert get_fillers() is not None
        assert get_edge_cases() is not None
        assert EmotionalToneAdjuster() is not None
        assert ConversationConsistency() is not None

    def test_singletons_work(self):
        """Singletons funcionan (get_* retorna misma instancia)"""
        p1 = get_pacing()
        p2 = get_pacing()
        assert p1 is p2, "get_pacing() debe retornar mismo singleton"


if __name__ == "__main__":
    # Ejecutar: python -m pytest tests/test_humanization_fixes.py -v
    pytest.main([__file__, "-v"])
