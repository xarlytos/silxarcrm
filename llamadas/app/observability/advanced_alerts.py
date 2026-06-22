"""Advanced Alerting — Sistema de alertas P0/P1/P2 con runbooks automáticos.

Detecta anomalías, escala severidad, dispara acciones automáticas y
notifica a canales apropiados (PagerDuty, Slack, etc).
"""
from __future__ import annotations

import asyncio
import logging
import time
from dataclasses import dataclass
from enum import Enum
from typing import Any, Callable, Optional

import httpx

from app.config import settings
from app.observability import metrics

logger = logging.getLogger(__name__)


# ═══ ALERT SEVERITY ═══

class AlertSeverity(str, Enum):
    P0 = "P0"  # Critical - 5 min SLA
    P1 = "P1"  # High - 15 min SLA
    P2 = "P2"  # Medium - 1 hour SLA
    P3 = "P3"  # Low - 4 hours SLA


# ═══ ALERT DEFINITION ═══

@dataclass
class Alert:
    """Definición de una alerta."""

    id: str
    name: str
    severity: AlertSeverity
    condition: Callable[[], bool]  # Función que retorna True si se debe alertar
    description: str
    runbook: str  # markdown with remediation steps
    notification_channels: list[str]  # ['pagerduty', 'slack', 'email']
    auto_remediation: Optional[Callable[[], None]] = None  # Acción automática
    cooldown_seconds: int = 300  # No alertar más de una vez en este período

    def __hash__(self):
        return hash(self.id)

    def __eq__(self, other):
        return isinstance(other, Alert) and self.id == other.id


# ═══ ALERT ENGINE ═══

class AlertEngine:
    """Motor de alertas que monitorea condiciones y dispara notificaciones."""

    def __init__(self):
        self.alerts: dict[str, Alert] = {}
        self.active_alerts: dict[str, float] = {}  # {alert_id: timestamp}
        self._check_interval_s = 10  # Verificar cada 10 segundos
        self._running = False
        self._lock = asyncio.Lock()

    def register_alert(self, alert: Alert) -> None:
        """Registra una alerta en el sistema."""
        self.alerts[alert.id] = alert
        logger.info("Alerta registrada: %s (%s)", alert.name, alert.severity)

    async def start_monitoring(self) -> None:
        """Inicia el monitor de alertas (async task)."""
        self._running = True
        logger.info("Iniciando AlertEngine...")

        while self._running:
            try:
                await self._check_all_alerts()
                await asyncio.sleep(self._check_interval_s)
            except Exception as exc:
                logger.error("Error en AlertEngine: %s", exc)
                await asyncio.sleep(self._check_interval_s)

    async def stop_monitoring(self) -> None:
        """Detiene el monitor de alertas."""
        self._running = False
        logger.info("Deteniendo AlertEngine...")

    async def _check_all_alerts(self) -> None:
        """Verifica todas las alertas registradas."""
        for alert_id, alert in self.alerts.items():
            try:
                # Verificar si la condición se cumple
                if alert.condition():
                    await self._fire_alert(alert)
                else:
                    # Alerta resuelta (si estaba activa)
                    if alert_id in self.active_alerts:
                        await self._resolve_alert(alert)
            except Exception as exc:
                logger.warning("Error evaluando alerta %s: %s", alert_id, exc)

    async def _fire_alert(self, alert: Alert) -> None:
        """Dispara una alerta."""
        async with self._lock:
            now = time.time()
            last_fire = self.active_alerts.get(alert.id, 0)

            # Respetar cooldown
            if now - last_fire < alert.cooldown_seconds:
                return

            # Marcar como activa
            self.active_alerts[alert.id] = now

        logger.warning("🚨 ALERTA: %s [%s]", alert.name, alert.severity)

        # Auto-remediation si existe
        if alert.auto_remediation:
            try:
                logger.info("Ejecutando remediación automática para %s...", alert.id)
                if asyncio.iscoroutinefunction(alert.auto_remediation):
                    await alert.auto_remediation()
                else:
                    alert.auto_remediation()
            except Exception as exc:
                logger.error("Error en remediación automática: %s", exc)

        # Notificar
        await self._notify_alert(alert)

    async def _resolve_alert(self, alert: Alert) -> None:
        """Marca una alerta como resuelta."""
        async with self._lock:
            if alert.id in self.active_alerts:
                del self.active_alerts[alert.id]

        logger.info("✓ Alerta resuelta: %s", alert.name)
        await self._notify_resolution(alert)

    async def _notify_alert(self, alert: Alert) -> None:
        """Envía notificaciones de la alerta."""
        for channel in alert.notification_channels:
            if channel == "pagerduty":
                await self._notify_pagerduty(alert)
            elif channel == "slack":
                await self._notify_slack(alert, is_resolution=False)
            elif channel == "email":
                await self._notify_email(alert)

    async def _notify_resolution(self, alert: Alert) -> None:
        """Notifica que una alerta fue resuelta."""
        for channel in alert.notification_channels:
            if channel == "slack":
                await self._notify_slack(alert, is_resolution=True)

    async def _notify_pagerduty(self, alert: Alert) -> None:
        """Envía alerta a PagerDuty."""
        if not settings.pagerduty_integration_key:
            logger.debug("[pagerduty] No configurado, ignorando")
            return

        try:
            payload = {
                "routing_key": settings.pagerduty_integration_key,
                "event_action": "trigger",
                "dedup_key": alert.id,
                "payload": {
                    "summary": f"[{alert.severity}] {alert.name}",
                    "severity": "critical" if alert.severity == AlertSeverity.P0 else "error",
                    "source": "revenue-ai",
                    "custom_details": {
                        "description": alert.description,
                        "runbook": alert.runbook,
                    }
                }
            }

            async with httpx.AsyncClient(timeout=5) as client:
                await client.post("https://events.pagerduty.com/v2/enqueue", json=payload)
                logger.info("Alerta enviada a PagerDuty: %s", alert.name)
        except Exception as exc:
            logger.warning("Error enviando a PagerDuty: %s", exc)

    async def _notify_slack(self, alert: Alert, is_resolution: bool = False) -> None:
        """Envía alerta a Slack."""
        if not settings.slack_webhook_url:
            logger.debug("[slack] No configurado, ignorando")
            return

        try:
            icon = "✓" if is_resolution else "🚨"
            color = "good" if is_resolution else ("danger" if alert.severity == AlertSeverity.P0 else "warning")

            message = {
                "attachments": [
                    {
                        "color": color,
                        "title": f"{icon} {alert.name} [{alert.severity}]",
                        "text": alert.description,
                        "fields": [
                            {
                                "title": "Severidad",
                                "value": alert.severity,
                                "short": True
                            },
                            {
                                "title": "Runbook",
                                "value": alert.runbook[:200] + "..." if len(alert.runbook) > 200 else alert.runbook,
                                "short": False
                            }
                        ],
                        "footer": "Revenue AI Observability"
                    }
                ]
            }

            async with httpx.AsyncClient(timeout=5) as client:
                await client.post(settings.slack_webhook_url, json=message)
                logger.info("Alerta enviada a Slack: %s", alert.name)
        except Exception as exc:
            logger.warning("Error enviando a Slack: %s", exc)

    async def _notify_email(self, alert: Alert) -> None:
        """Envía alerta por email (placeholder)."""
        logger.info("[email] Notificación de alerta: %s", alert.name)
        # TODO: Implementar integración con SendGrid o similar


# ═══ ALERTAS PRE-CONFIGURADAS ═══

def create_default_alerts() -> list[Alert]:
    """Crea el conjunto de alertas por defecto."""
    return [
        # P0: Service Down
        Alert(
            id="a1_circuit_breaker_active",
            name="LLM Service Degradation (Circuit Breaker)",
            severity=AlertSeverity.P0,
            condition=lambda: metrics.is_circuit_breaker_active("gemini_llm"),
            description="Latencia LLM > 1000ms durante >2 min. Circuit breaker activado.",
            runbook="""
1. Verificar estado de Gemini API (console.cloud.google.com)
2. Revisar cuota de tokens/requests
3. Revisar conectividad de red
4. Si cuota: contactar Google Cloud
5. Fallback: cambiar a Gemini Sonnet
            """,
            notification_channels=["pagerduty", "slack"],
            cooldown_seconds=300
        ),

        # P0: Call Completion Rate
        Alert(
            id="a2_zero_call_completions",
            name="Zero Calls Completing",
            severity=AlertSeverity.P0,
            condition=lambda: (
                metrics.snapshot().get("counters", {}).get("call_started", 0) > 0
                and metrics.snapshot().get("counters", {}).get("call_ended", 0) == 0
            ),
            description="No se han completado llamadas en los últimos 5 minutos.",
            runbook="""
1. Revisar logs de media_stream.py (Twilio WebSocket)
2. Verificar conectividad Twilio → Gemini
3. Revisar base de datos (conectividad)
4. Restart media_stream service si es necesario
            """,
            notification_channels=["pagerduty", "slack"],
            cooldown_seconds=300
        ),

        # P1: Error Rate Spike
        Alert(
            id="a3_error_rate_spike",
            name="Error Rate > 1%",
            severity=AlertSeverity.P1,
            condition=lambda: _check_error_rate_spike(),
            description="Tasa de errores superior a 1% en los últimos 2 minutos.",
            runbook="""
1. Revisar errores recientes (app.observability.alerts)
2. Agrupar por tipo de error
3. Si error LLM: revisar configuración
4. Si error API: revisar estado del servicio externo
5. Correlacionar con cambios de código recientes
            """,
            notification_channels=["slack"],
            cooldown_seconds=300
        ),

        # P1: Model Drift
        Alert(
            id="a4_classifier_drift",
            name="Classification Confidence Drops",
            severity=AlertSeverity.P1,
            condition=lambda: _check_classifier_confidence(),
            description="Confianza del classifier promedio < 0.70 con tendencia negativa.",
            runbook="""
1. Revisar cambios recientes al classifier
2. Samplear 50 clasificaciones y verificar manualmente
3. Revisar si hay nuevos verticales de prospecto
4. Reentrenar o recalibrar el classifier
5. Monitorear tendencia de confianza estrechamente
            """,
            notification_channels=["slack"],
            cooldown_seconds=600
        ),

        # P1: Rate Limit Critical
        Alert(
            id="a5_api_rate_limit",
            name="API Rate Limit Critical",
            severity=AlertSeverity.P1,
            condition=lambda: metrics.is_rate_limit_critical(),
            description="Más de 5 rate limits en el último minuto.",
            runbook="""
1. Identificar cuál API (Twilio, Gemini, Supabase)
2. Revisar si hay spike de llamadas
3. Implementar backoff + queueing
4. Contactar proveedor si cuota es insuficiente
5. Considerar escalado horizontal
            """,
            notification_channels=["slack"],
            cooldown_seconds=300
        ),

        # P2: Cost Anomaly
        Alert(
            id="a6_cost_anomaly",
            name="Cost Per Call Anomaly",
            severity=AlertSeverity.P2,
            condition=lambda: _check_cost_anomaly(),
            description="Costo por llamada 1.5x superior al baseline.",
            runbook="""
1. Desglosar costo por componente (LLM, TTS, API, etc)
2. Revisar si se está usando modelo de fallback
3. Revisar tasa de cache hits (debería ser >30%)
4. Revisar si token count inflado
5. Revisar loops ineficientes
            """,
            notification_channels=["slack"],
            cooldown_seconds=600
        ),

        # P2: High Latency
        Alert(
            id="a7_high_latency_p95",
            name="High User-Perceived Latency",
            severity=AlertSeverity.P2,
            condition=lambda: _check_latency_p95(),
            description="Latencia P95 > 1500ms.",
            runbook="""
1. Revisar cuál componente es lento (LLM, TTS, STT, etc)
2. Si LLM: revisar token count, carga del modelo
3. Si TTS: revisar latencia de ElevenLabs
4. Si STT: revisar calidad de audio
5. Revisar número de llamadas concurrentes
            """,
            notification_channels=["slack"],
            cooldown_seconds=300
        ),

        # P2: Compliance Failure
        Alert(
            id="a8_compliance_failure",
            name="Disclosure Not Mentioned",
            severity=AlertSeverity.P2,
            condition=lambda: _check_compliance_failure(),
            description="Llamada > 30s sin mencionar que es IA.",
            runbook="""
1. Revisar grabación (compliance/recordings/{call_id})
2. Verificar manualmente si se dio disclosure
3. Revisar system prompt (incluye disclosure?)
4. Actualizar classifier si es necesario
5. Revisar respuesta del prospecto
            """,
            notification_channels=["slack"],
            cooldown_seconds=600
        ),
    ]


# ═══ HELPER FUNCTIONS PARA CONDICIONES ═══

def _check_error_rate_spike() -> bool:
    """Retorna True si error rate > 1%."""
    snap = metrics.snapshot()
    calls = snap.get("counters", {}).get("call_started", 0)
    errors = snap.get("counters", {}).get("error", 0)
    if calls < 10:
        return False  # Muy pocas llamadas para evaluar
    return (errors / calls) > 0.01


def _check_classifier_confidence() -> bool:
    """Retorna True si confianza del classifier < 0.70."""
    # TODO: Implementar histórico de confianza y tendencia
    return False  # Placeholder


def _check_cost_anomaly() -> bool:
    """Retorna True si costo/llamada > 1.5x baseline."""
    # TODO: Implementar tracking de baseline y detección
    return False  # Placeholder


def _check_latency_p95() -> bool:
    """Retorna True si latencia P95 > 1500ms."""
    snap = metrics.snapshot()
    p95 = snap.get("latency_p95_s", 0) * 1000
    return p95 > 1500


def _check_compliance_failure() -> bool:
    """Retorna True si disclosure rate < 95%."""
    snap = metrics.snapshot()
    compliance = snap.get("compliance", {})
    disclosure_rate = compliance.get("disclosure_rate", 1.0)
    return disclosure_rate < 0.95


# ═══ INSTANCE GLOBAL ═══

_alert_engine: Optional[AlertEngine] = None


def get_alert_engine() -> AlertEngine:
    """Obtiene la instancia global del alert engine."""
    global _alert_engine
    if _alert_engine is None:
        _alert_engine = AlertEngine()
        # Registrar alertas por defecto
        for alert in create_default_alerts():
            _alert_engine.register_alert(alert)
    return _alert_engine


async def start_alert_monitoring() -> None:
    """Inicia el monitoreo de alertas (debe llamarse en startup)."""
    engine = get_alert_engine()
    asyncio.create_task(engine.start_monitoring())
    logger.info("✓ Alert monitoring iniciado")
