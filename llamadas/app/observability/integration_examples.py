"""Integration Examples — Cómo integrar observabilidad en el código existente.

Este archivo contiene ejemplos prácticos de cómo usar observabilidad en los
componentes principales de Revenue AI (Gemini, ElevenLabs, Classifier, etc).
"""
from __future__ import annotations

import time
from typing import Any

# ═══ EJEMPLO 1: Instrumentar llamadas a Gemini LLM ═══

async def example_gemini_instrumentation(call_id: str, prompt: str) -> str:
    """Ejemplo: Loguear llamada a Gemini con tracing + eventos."""
    from app.gemini.chat_session import GeminiChatSession
    from app.observability.tracing import LLMSpan
    from app.observability.event_logger import log_llm_call_complete
    from app.observability.metrics import record_component_latency

    # Usar context manager para tracing
    with LLMSpan(call_id=call_id, model="gemini-3.1-flash-lite") as span:
        # Registrar entrada
        span.set_input(tokens=512, cached=256)

        # Simular llamada a Gemini
        start_time = time.perf_counter()
        # response = await gemini_session.generate(prompt)
        response = "Response simulada"
        latency_ms = int((time.perf_counter() - start_time) * 1000)

        # Registrar salida
        span.set_output(
            tokens=145,
            latency_ms=latency_ms,
            cost_usd=0.00023
        )

        # Log evento estructurado
        await log_llm_call_complete(
            call_id=call_id,
            model="gemini-3.1-flash-lite",
            latency_ms=latency_ms,
            input_tokens=512,
            output_tokens=145,
            cached_tokens=256,
            cost_usd=0.00023,
            cache_hit=True,
            tools_used=["check_availability"]
        )

        # Registrar métrica
        record_component_latency("gemini_llm", latency_ms)

    return response


# ═══ EJEMPLO 2: Instrumentar clasificador ═══

async def example_classifier_instrumentation(
    call_id: str,
    turn: int,
    user_input: str
) -> dict[str, Any]:
    """Ejemplo: Loguear ejecución del classifier."""
    from app.observability.event_logger import log_classification
    from app.observability.tracing import LLMSpan
    from app.observability.metrics import record

    with LLMSpan(call_id=call_id, model="classifier") as span:
        start_time = time.perf_counter()

        # Simular clasificación
        # classification = await classifier.classify(user_input)
        classification = {
            "intent": "objection_price",
            "confidence": 0.92,
            "emotion": "skeptical",
            "tags": ["price_sensitive", "needs_roe_proof"],
            "nueva_objecion": False
        }

        latency_ms = int((time.perf_counter() - start_time) * 1000)
        span.set_attribute("confidence", classification["confidence"])
        span.set_attribute("latency_ms", latency_ms)

        # Log evento
        await log_classification(
            call_id=call_id,
            turn=turn,
            input_text=user_input,
            classification_result=classification,
            latency_ms=latency_ms
        )

        # Métrica
        record("classifier_invoked")
        if classification["confidence"] < 0.70:
            record("classifier_low_confidence")

    return classification


# ═══ EJEMPLO 3: Instrumentar transiciones de estado ═══

async def example_state_transition(
    call_id: str,
    turn: int,
    state_before: Any,
    state_after: Any,
    call_goal: Any
) -> None:
    """Ejemplo: Loguear transición de estado."""
    from app.observability.event_logger import (
        StateTransitionEvent,
        log_event,
        EventType
    )

    # Crear evento de transición
    event = StateTransitionEvent(
        call_id=call_id,
        turn=turn,
        event_type=EventType.STATE_TRANSITION,
        state_before={
            "stage": state_before.stage,
            "confidence": round(state_before.confidence, 3),
            "pain_detected": state_before.pain_detected,
            "wants_demo": state_before.wants_demo
        },
        state_after={
            "stage": state_after.stage,
            "confidence": round(state_after.confidence, 3),
            "pain_detected": state_after.pain_detected,
            "wants_demo": state_after.wants_demo,
            "next_stages": {
                k: round(v, 3)
                for k, v in (state_after.next_stages or {}).items()
            }
        },
        transition_reason="Confirmed pain, explored solution",
        confidence_change=state_after.confidence - state_before.confidence,
        component="state_engine"
    )

    await log_event(event)


# ═══ EJEMPLO 4: Instrumentar llamadas API ═══

async def example_api_call_instrumentation(
    call_id: str,
    api_name: str,
    endpoint: str
) -> None:
    """Ejemplo: Loguear llamada a API externa."""
    from app.observability.event_logger import log_api_call
    from app.observability.tracing import APISpan
    from app.observability.metrics import record_rate_limit_hit

    with APISpan(call_id=call_id, api=api_name, endpoint=endpoint) as span:
        start_time = time.perf_counter()

        try:
            # Simular llamada API
            # response = await api_client.post(endpoint, data=...)
            status_code = 200
            response_data = {"id": "xyz"}

            latency_ms = int((time.perf_counter() - start_time) * 1000)
            span.set_response(status_code, latency_ms)

            await log_api_call(
                call_id=call_id,
                api=api_name,
                endpoint=endpoint,
                method="POST",
                status_code=status_code,
                latency_ms=latency_ms,
                cost_usd=0.001
            )

        except Exception as exc:
            latency_ms = int((time.perf_counter() - start_time) * 1000)
            span.set_response(500, latency_ms)

            # Detectar rate limit
            if "429" in str(exc):
                record_rate_limit_hit()

            await log_api_call(
                call_id=call_id,
                api=api_name,
                endpoint=endpoint,
                method="POST",
                status_code=429,
                latency_ms=latency_ms,
                error=str(exc)
            )
            raise


# ═══ EJEMPLO 5: Instrumentar compliance events ═══

async def example_compliance_logging(call_id: str, timestamp_s: int) -> None:
    """Ejemplo: Loguear eventos de compliance."""
    from app.observability.event_logger import log_compliance_event

    # Disclosure
    await log_compliance_event(
        call_id=call_id,
        compliance_type="disclosure",
        action="disclosed_ai_identity",
        timestamp_in_call_s=timestamp_s,
        requirement_satisfied=True,
        jurisdiction="mx"
    )

    # Recording consent
    await log_compliance_event(
        call_id=call_id,
        compliance_type="recording_consent",
        action="prospect_accepted_recording",
        timestamp_in_call_s=timestamp_s + 5,
        requirement_satisfied=True,
        jurisdiction="mx"
    )


# ═══ EJEMPLO 6: Instrumentar costo end-to-end ═══

async def example_cost_tracking(call_id: str, call_duration_s: int) -> None:
    """Ejemplo: Loguear desglose de costo completo."""
    from app.observability.event_logger import log_cost_event

    cost_breakdown = {
        "llm_calls": {
            "gemini_3.1_flash_lite": {
                "input_tokens": 2048,
                "output_tokens": 480,
                "cached_tokens": 256,
                "cost_usd": 0.00072
            }
        },
        "tts": {
            "elevenlabs_flash_v2.5": {
                "characters": 4200,
                "cost_usd": 0.084
            }
        },
        "stt": {
            "google_stt": {
                "duration_min": call_duration_s / 60,
                "cost_usd": 0.05
            }
        },
        "api_calls": 15,
        "api_cost_usd": 0.02,
        "infrastructure": 0.05
    }

    total_cost_usd = sum(
        v.get("cost_usd", 0)
        for v in cost_breakdown.values()
        if isinstance(v, dict) and "cost_usd" in v
    )

    await log_cost_event(
        call_id=call_id,
        duration_s=call_duration_s,
        total_cost_usd=total_cost_usd,
        cost_breakdown=cost_breakdown,
        deal_value_usd=1200,
        probability=0.35  # 35% probabilidad de cerrar
    )


# ═══ EJEMPLO 7: Instrumentar decision log ═══

async def example_decision_logging(
    call_id: str,
    turn: int,
    user_input: str,
    classification: dict[str, Any],
    state_before: Any,
    state_after: Any,
    agent_response: str
) -> None:
    """Ejemplo: Loguear decisión completa del turno."""
    from app.observability.decision_log import DecisionLogger

    logger = DecisionLogger(call_id)
    logger.start_turn(turn, user_input)

    # Log classification
    logger.log_classification(
        classification,
        invoked=True,
        latency_ms=45
    )

    # Log state transition
    logger.log_state_transition(
        state_before,
        state_after,
        call_goal=None,  # o tu object de goal
        reason="Prospect expressed interest"
    )

    # Log agent response
    logger.log_agent_response(agent_response, tools_used=["check_availability"])

    # Finalizar turno (guarda a disco)
    logger.end_turn()

    # Obtener resumen
    summary = logger.get_summary()
    print(f"Call summary: {summary}")


# ═══ EJEMPLO 8: Usar Event Bus para real-time processing ═══

async def example_event_bus_subscription() -> None:
    """Ejemplo: Subscribirse a eventos en tiempo real."""
    from app.observability.event_logger import get_event_bus, EventType

    bus = get_event_bus()

    # Definir callback
    async def on_llm_error(event):
        print(f"🚨 LLM Error en call {event.call_id}: {event.data}")
        # TODO: Enviar alerta inmediata a Slack, PagerDuty, etc

    async def on_cost_anomaly(event):
        cost = event.data.get("total_cost_usd", 0)
        if cost > 1.0:  # Si cost > $1, investigar
            print(f"💰 Cost anomaly: ${cost} en call {event.call_id}")

    # Subscribe
    bus.subscribe(EventType.LLM_ERROR, on_llm_error)
    bus.subscribe(EventType.COST_EVENT, on_cost_anomaly)

    print("✓ Event subscriptions configuradas")


# ═══ EJEMPLO 9: Instrumentar agent routing ═══

async def example_agent_routing(call_id: str, prospect_id: str) -> str:
    """Ejemplo: Loguear decisión de routing de agente."""
    from app.observability.event_logger import (
        BaseEvent,
        EventType,
        log_event
    )

    # Simular routing decision
    selected_agent = "sdr"
    reasoning = "First contact - needs qualification"

    # Log evento
    event = BaseEvent(
        event_type=EventType.AGENT_SELECTED,
        call_id=call_id,
        component="agent_router",
        data={
            "agent_type": selected_agent,
            "reasoning": reasoning,
            "prospect_state": {
                "current_stage": "awareness",
                "qualification_score": 0
            }
        }
    )

    await log_event(event)
    return selected_agent


# ═══ EJEMPLO 10: Monitorear alerts activas ═══

async def example_alert_monitoring() -> None:
    """Ejemplo: Revisar qué alertas están activas."""
    from app.observability.advanced_alerts import get_alert_engine

    engine = get_alert_engine()

    # Revisar alertas activas
    if engine.active_alerts:
        print("🚨 Alertas activas:")
        for alert_id, timestamp in engine.active_alerts.items():
            alert = engine.alerts[alert_id]
            print(f"  - {alert.name} ({alert.severity}) desde {timestamp}")
    else:
        print("✓ Sin alertas activas")

    # Revisar todas las alertas registradas
    print(f"\nAlertas registradas: {len(engine.alerts)}")
    for alert in engine.alerts.values():
        print(f"  - {alert.name} ({alert.severity})")


# ═══ MAIN: Correr ejemplos ═══

if __name__ == "__main__":
    import asyncio

    async def main():
        print("📊 Revenue AI Observability Integration Examples\n")

        # Nota: Estos son ejemplos. En producción, integrar en el código real.

        call_id = "test_ca_123"
        turn = 1
        user_input = "Hola, quiero saber el precio"

        print("1️⃣  Gemini Instrumentation")
        response = await example_gemini_instrumentation(call_id, user_input)
        print(f"   Response: {response}\n")

        print("2️⃣  Classifier Instrumentation")
        classification = await example_classifier_instrumentation(call_id, turn, user_input)
        print(f"   Classification: {classification['intent']} ({classification['confidence']})\n")

        print("3️⃣  API Call Instrumentation")
        await example_api_call_instrumentation(call_id, "supabase_crm", "/v1/contacts/create")
        print(f"   API call logged\n")

        print("4️⃣  Compliance Logging")
        await example_compliance_logging(call_id, timestamp_s=5)
        print(f"   Compliance events logged\n")

        print("5️⃣  Cost Tracking")
        await example_cost_tracking(call_id, call_duration_s=225)
        print(f"   Cost event logged\n")

        print("6️⃣  Event Bus Subscription")
        await example_event_bus_subscription()
        print()

        print("7️⃣  Agent Routing")
        agent = await example_agent_routing(call_id, "p_98765")
        print(f"   Routed to: {agent}\n")

        print("8️⃣  Alert Monitoring")
        await example_alert_monitoring()

        print("\n✓ Todos los ejemplos completados")

    asyncio.run(main())
