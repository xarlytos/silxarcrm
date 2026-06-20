"""Master LLM — Modelo inteligente (Gemini 3.5 Flash) que piensa estratégicamente.

NO genera la respuesta final que el usuario escucha. Genera un BRIEF
detallado que el modelo Voz (Gemini 3.1 Flash-Lite) interpreta para responder.

Arquitectura dual:
  Maestro (3.5 Flash, ~300ms) → Brief estratégico → Caché
  Voz (3.1 Flash-Lite, ~180ms) → Brief + contexto inmediato → Texto natural → ElevenLabs TTS (~75ms)

Latencia end-to-end estimada:
  STT Scribe v2 (~120ms) + Voz Flash-Lite (~180ms) + TTS Flash v2.5 (~75ms) + red (~60ms) = ~435ms

El Maestro corre:
  1. Cada 2-3 turnos (planificación periódica)
  2. En eventos críticos (objeción, agendamiento, cambio de emoción, gatekeeper)
  3. Al inicio de la llamada (brief inicial)

El Maestro tiene visión GLOBAL de la conversación. El Voz solo ve
el brief + el último turno. Esto permite que el Maestro use un modelo
más inteligente (3.5 Flash) sin afectar la latencia percibida.
"""
from __future__ import annotations

import json
import logging
import time
from dataclasses import dataclass, field
from typing import TYPE_CHECKING

from app.config import settings

if TYPE_CHECKING:
    from app.conversation.state_engine import SalesState, CallGoal

logger = logging.getLogger(__name__)


@dataclass
class ConversationBrief:
    """Instrucciones generadas por el Maestro para el modelo Voz.

    El Voz NO decide estrategia. Solo interpreta el brief y lo
    convierte en lenguaje humano natural.
    """

    # ── Identidad ──
    identidad: str = "Carlos, asesor comercial de SmartDental"
    tono: str = "profesional_cercano"

    # ── Objetivo estratégico ──
    objetivo: str = ""  # Qué conseguir en los próximos 1-2 turnos
    estrategia: str = ""  # pattern_interrupt | discovery | quantification | trial_close | cierre
    stage_target: str = ""  # Hacia qué stage mover la conversación

    # ── Guion de respuesta (lo que el Voz DEBE decir, en bullets) ──
    puntos_clave: list[str] = field(default_factory=list)
    frases_obligatorias: list[str] = field(default_factory=list)
    prohibiciones: list[str] = field(default_factory=list)
    max_frases: int = 3

    # ── Datos del prospecto a mencionar ──
    datos_personalizados: dict = field(default_factory=dict)

    # ── Tools preparadas ──
    tools_preparadas: list[str] = field(default_factory=list)
    usar_tool: str = ""  # Tool específica que el Voz DEBE usar este turno

    # ── Manejo de gatekeeper ──
    modo_gatekeeper: bool = False
    estrategia_gatekeeper: str = ""  # obtener_email | transferir | cortar

    # ── Metadatos ──
    timestamp: float = field(default_factory=time.time)
    razonamiento: str = ""  # Por qué el Maestro tomó estas decisiones
    turno_generado: int = 0  # En qué turno se generó este brief
    validez_turnos: int = 3  # Cuántos turnos más es válido este brief

    def to_prompt_section(self) -> str:
        """Convierte el brief en instrucciones para el system prompt del Voz."""
        lines = [
            "=== BRIEF DEL MAESTRO (instrucciones estrictas para esta respuesta) ===",
            f"Objetivo: {self.objetivo}",
            f"Estrategia: {self.estrategia}",
            f"Tono: {self.tono}",
        ]
        if self.stage_target:
            lines.append(f"Mover conversación hacia: {self.stage_target}")
        if self.puntos_clave:
            lines.append("Puntos que DEBES tocar:")
            for punto in self.puntos_clave:
                lines.append(f"  • {punto}")
        if self.frases_obligatorias:
            lines.append("Frases/palabras que DEBES incluir:")
            for frase in self.frases_obligatorias:
                lines.append(f"  → {frase}")
        if self.prohibiciones:
            lines.append("ABSOLUTAMENTE PROHIBIDO:")
            for prohibido in self.prohibiciones:
                lines.append(f"  ✗ {prohibido}")
        if self.usar_tool:
            lines.append(f"USAR ESTA TOOL AHORA: {self.usar_tool}")
        elif self.tools_preparadas:
            lines.append(f"Tools preparadas si aplica: {', '.join(self.tools_preparadas)}")
        if self.modo_gatekeeper:
            lines.append(f"⚠️ MODO GATEKEEPER: {self.estrategia_gatekeeper}")
        lines.append(f"Máximo {self.max_frases} frases en tu respuesta.")
        lines.append("=== FIN BRIEF ===")
        return "\n".join(lines)

    def is_valid(self, turno_actual: int) -> bool:
        """Un brief expira después de N turnos o en eventos críticos."""
        return (turno_actual - self.turno_generado) < self.validez_turnos


class MasterLLM:
    """Modelo Maestro (Gemini 2.5 Pro) — visión estratégica global.

    Genera un Brief que el modelo Voz interpreta para cada respuesta.
    Corre en background o blocking según la criticidad del evento.
    """

    # Modelo para el Maestro (más potente, más lento, estratégico)
    # Se configura en config.py: gemini_master_model / gemini_master_fallback_model
    @property
    def MASTER_MODEL(self) -> str:
        return settings.gemini_master_model

    @property
    def FALLBACK_MODEL(self) -> str:
        return settings.gemini_master_fallback_model

    # Cada cuántos turnos el Maestro regenera el brief (planificación periódica)
    BRIEF_REFRESH_TURNS: int = 2

    def __init__(self) -> None:
        self._client = None
        self._last_brief: ConversationBrief | None = None
        self._pending_brief_task = None

    def _get_client(self):
        if self._client is None:
            from google import genai
            self._client = genai.Client(api_key=settings.gemini_api_key)
        return self._client

    # ── Interfaz pública ──

    async def generate_initial_brief(
        self,
        ctx,
        sales_state: "SalesState",
        call_goal: "CallGoal",
    ) -> ConversationBrief:
        """Genera el brief inicial antes de que empiece la conversación.

        Este brief guía los primeros 2-3 turnos (saludo + pattern interrupt + discovery).
        """
        prompt = self._build_master_prompt(
            historial=[],
            sales_state=sales_state,
            call_goal=call_goal,
            prospecto=ctx.prospect,
            business_type=ctx.business_type,
            business_name=ctx.business_name,
            city=ctx.city,
            evento="inicio_llamada",
        )
        brief = await self._call_master(prompt, turno=0)
        self._last_brief = brief
        logger.info("Brief inicial generado: estrategia=%s objetivo=%s", brief.estrategia, brief.objetivo)
        return brief

    async def should_regenerate_brief(
        self,
        turno: int,
        text: str,
        classification,
        sales_state: "SalesState",
        last_brief: ConversationBrief | None,
    ) -> tuple[bool, str]:
        """Decide si el Maestro necesita regenerar el brief AHORA.

        Returns: (necesita_regenerar, razon)
        """
        # Eventos críticos que SIEMPRE requieren brief nuevo
        eventos_criticos = {
            "agendando": "El prospecto quiere agendar — brief de cierre inmediato",
            "rechazando": "Objeción fuerte detectada — brief de manejo de objeción",
            "pidiendo_humano": "Solicita humano — brief de transferencia",
        }
        intent = getattr(classification, "intencion", "neutro")
        if intent in eventos_criticos:
            return True, eventos_criticos[intent]

        # Gatekeeper detectado
        if self._detect_gatekeeper(text):
            return True, "Gatekeeper detectado — cambiar estrategia a obtener-email"

        # Objeción nueva
        if getattr(classification, "nueva_objecion", "ninguna") != "ninguna":
            return True, f"Nueva objeción: {classification.nueva_objecion}"

        # Brief expirado
        if last_brief is None or not last_brief.is_valid(turno):
            return True, f"Brief expirado (turno {turno}, generado en turno {getattr(last_brief, 'turno_generado', 0)})"

        # Planificación periódica (cada N turnos)
        if turno > 0 and turno % self.BRIEF_REFRESH_TURNS == 0:
            return True, f"Regeneración periódica (cada {self.BRIEF_REFRESH_TURNS} turnos)"

        # Cambio de stage importante
        if sales_state.stage != getattr(last_brief, "stage_target", ""):
            # Si el prospecto ya avanzó de stage pero el brief no lo refleja
            return True, f"Stage cambiado a {sales_state.stage}"

        return False, ""

    async def regenerate_brief(
        self,
        ctx,
        historial: list[dict],
        sales_state: "SalesState",
        call_goal: "CallGoal",
        classification,
        turno: int,
    ) -> ConversationBrief:
        """Regenera el brief con contexto actualizado.

        Este método puede llamarse en background (no bloquea la respuesta del Voz)
        o en blocking (si es un evento crítico).
        """
        evento = getattr(classification, "intencion", "neutro")
        prompt = self._build_master_prompt(
            historial=historial,
            sales_state=sales_state,
            call_goal=call_goal,
            prospecto=ctx.prospect,
            business_type=ctx.business_type,
            business_name=ctx.business_name,
            city=ctx.city,
            evento=evento,
            classification=classification,
        )
        brief = await self._call_master(prompt, turno=turno)
        self._last_brief = brief
        logger.info(
            "Brief regenerado (turno %d): estrategia=%s objetivo=%s razonamiento=%s",
            turno, brief.estrategia, brief.objetivo, brief.razonamiento[:80]
        )
        return brief

    def get_current_brief(self) -> ConversationBrief | None:
        """Devuelve el brief más reciente (puede estar desactualizado)."""
        return self._last_brief

    # ── Internos ──

    def _detect_gatekeeper(self, text: str) -> bool:
        """Detecta si el interlocutor es gatekeeper (recepcionista/secretaria)."""
        text_lower = text.lower()
        gatekeeper_keywords = [
            "soy la recepcionista", "soy la secretaria", "el doctor no está",
            "no está disponible", "déjeme sus datos", "mándeme un email",
            "yo solo atiendo", "no puedo darle", "le paso", "diga",
            "quien llama", "de parte de quien", "dígame", "sí, dígame",
        ]
        return any(kw in text_lower for kw in gatekeeper_keywords)

    def _build_master_prompt(
        self,
        historial: list[dict],
        sales_state: "SalesState",
        call_goal: "CallGoal",
        prospecto: dict | None,
        business_type: str,
        business_name: str,
        city: str,
        evento: str,
        classification=None,
    ) -> str:
        """Construye el prompt para el Maestro.

        El Maestro recibe TODA la información estratégica y genera un brief.
        """
        # Formatear historial
        historial_text = ""
        if historial:
            historial_text = "\n".join(
                f"{t.get('role', 'desconocido').upper()}: {t.get('text', '')}"
                for t in historial[-10:]  # Últimos 10 turnos
            )

        # Formatear clasificación si existe
        clasificacion_text = ""
        if classification:
            clasificacion_text = f"""
Clasificación del turno actual:
  Intención: {getattr(classification, 'intencion', 'neutro')}
  Tags: {getattr(classification, 'tags', [])}
  Confianza: {getattr(classification, 'confidence', 0)}
  Emoción: {getattr(classification, 'emocion', 'neutro')}
  Objeción: {getattr(classification, 'nueva_objecion', 'ninguna')}
"""

        return f"""Eres el MAESTRO ESTRATÉGICO de un sistema de ventas por teléfono para SmartDental
(software de gestión para clínicas dentales en España).

Tu trabajo NO es escribir la respuesta que el prospecto escuchará. Tu trabajo es
GENERAR UN BRIEF (guión estratégico) que otro modelo (el Voz) interpretará para
responder de forma natural.

=== CONTEXTO ACTUAL ===
Prospecto: {business_name or 'Clínica dental'} en {city or 'España'}
Tipo: {business_type}
Stage actual: {sales_state.stage}
Confianza en stage: {sales_state.confidence:.0%}
CallGoal progreso: {call_goal.progress:.0%}
CallGoal riesgo: {call_goal.risk_of_loss:.0%}
Tags detectados: {', '.join(sales_state.tags)}
Objeción activa: {sales_state.objecion_activa or 'ninguna'}
Evento que desencadena este brief: {evento}
{clasificacion_text}
=== HISTORIAL RECIENTE ===
{historial_text or '(Inicio de llamada — sin historial)'}

=== TU TAREA ===
Analiza la situación y genera un BRIEF detallado en formato JSON.

El brief debe incluir:
1. objetivo: Qué conseguir en los próximos 1-2 turnos (máx 15 palabras)
2. estrategia: Una de [pattern_interrupt, discovery, quantification, trial_close, cierre, objecion_handler, gatekeeper_bypass, exit]
3. stage_target: A qué stage intentar mover la conversación
4. tono: Una de [profesional_cercano, amigable, empatico, directo, urgente, formal]
5. puntos_clave: Lista de 2-4 bullets que el Voz DEBE tocar (cada uno máx 20 palabras)
6. frases_obligatorias: Palabras/frases específicas que DEBE incluir (máx 3)
7. prohibiciones: Qué NO debe decir (máx 3)
8. max_frases: Cuántas frases máximo en la respuesta (1-4)
9. tools_preparadas: Tools que probablemente necesite usar (nombres exactos)
10. usar_tool: Si DEBE usar una tool ESTE turno, pon el nombre. Si no, deja vacío.
11. modo_gatekeeper: true/false
12. estrategia_gatekeeper: Si modo_gatekeeper=true, una de [obtener_email, cortar_amable, transferir]
13. razonamiento: Explica en 1-2 frases por qué tomaste estas decisiones

=== REGLAS DEL MAESTRO ===
- Sé estratégico, no táctico. Piensa 2-3 turnos adelante.
- Si el prospecto muestra interés real, acelera hacia cierre.
- Si hay objeción, NO ignores el brief anterior — adáptalo.
- Si detectas gatekeeper, cambia estrategia a "obtener número/whatsapp" (no email).
- Si el prospecto dice "no" 2 veces, brief de exit (despedida + enviar auditoría web).
- NUNCA pidas al Voz que cierre venta en cold call. Solo agenda demo.

=== EL "FREE VALUE" — AUDITORÍA WEB INTERACTIVA ===
El "valor gratuito" que ofrecemos NO es un PDF por email. Es una PÁGINA WEB interactiva:
- URL única: auditoria.smartdental.es/a/TOKEN (personalizada para cada clínica)
- Contenido: estadísticas de no-shows de su provincia, comparativa con clínicas similares, calculadora de pérdidas, casos de éxito locales.
- Se envía por WHATSAPP (no email). El prospecto la abre en el móvil y navega en 2 minutos.
- Tiene CTA para agendar demo directamente desde la página.
- El Voz debe decir: "Le envío un enlace por WhatsApp" — NUNCA "le envío un PDF por email".
- Si el prospecto da su número, usar generar_auditoria_web + enviar_whatsapp con tipo="auditoria_web".

=== FORMATO DE RESPUESTA ===
Responde ÚNICAMENTE con un JSON válido. Sin markdown, sin explicaciones extra.
El JSON debe tener exactamente estos campos:
{{
  "objetivo": "...",
  "estrategia": "...",
  "stage_target": "...",
  "tono": "...",
  "puntos_clave": ["...", "..."],
  "frases_obligatorias": ["..."],
  "prohibiciones": ["..."],
  "max_frases": 3,
  "tools_preparadas": ["..."],
  "usar_tool": "",
  "modo_gatekeeper": false,
  "estrategia_gatekeeper": "",
  "razonamiento": "..."
}}
"""

    async def _call_master(self, prompt: str, turno: int) -> ConversationBrief:
        """Llama al modelo Maestro y parsea el brief."""
        from google import genai
        from google.genai import types

        client = self._get_client()
        model = self.MASTER_MODEL

        try:
            response = await client.aio.models.generate_content(
                model=model,
                contents=[types.Content(role="user", parts=[types.Part(text=prompt)])],
                config=types.GenerateContentConfig(
                    temperature=0.5,  # Menos creatividad, más consistencia estratégica
                    max_output_tokens=2048,
                ),
            )
            text = response.text or "{}"
            # Limpiar posible markdown
            text = text.strip()
            if text.startswith("```json"):
                text = text[7:]
            if text.startswith("```"):
                text = text[3:]
            if text.endswith("```"):
                text = text[:-3]
            text = text.strip()

            data = json.loads(text)
            return ConversationBrief(
                objetivo=data.get("objetivo", ""),
                estrategia=data.get("estrategia", ""),
                stage_target=data.get("stage_target", ""),
                tono=data.get("tono", "profesional_cercano"),
                puntos_clave=data.get("puntos_clave", []),
                frases_obligatorias=data.get("frases_obligatorias", []),
                prohibiciones=data.get("prohibiciones", []),
                max_frases=data.get("max_frases", 3),
                tools_preparadas=data.get("tools_preparadas", []),
                usar_tool=data.get("usar_tool", ""),
                modo_gatekeeper=data.get("modo_gatekeeper", False),
                estrategia_gatekeeper=data.get("estrategia_gatekeeper", ""),
                razonamiento=data.get("razonamiento", ""),
                turno_generado=turno,
                timestamp=time.time(),
            )

        except json.JSONDecodeError as exc:
            logger.warning("MasterLLM devolvió JSON inválido: %s. Texto: %s", exc, text[:200])
            return self._fallback_brief(turno)
        except Exception as exc:
            logger.warning("Error en MasterLLM: %s. Usando fallback.", exc)
            return self._fallback_brief(turno)

    def _fallback_brief(self, turno: int) -> ConversationBrief:
        """Brief de fallback si el Maestro falla."""
        return ConversationBrief(
            objetivo="Mantener la conversación y descubrir si hay interés",
            estrategia="discovery",
            tono="profesional_cercano",
            puntos_clave=["Preguntar cómo gestionan citas", "Detectar si hay dolor real"],
            max_frases=3,
            turno_generado=turno,
            razonamiento="Fallback por error del Maestro",
        )
