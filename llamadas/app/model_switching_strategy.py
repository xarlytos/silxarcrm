"""Model switching strategy — detección de latencia y fallback automático.

FILOSOFÍA:
- Monitorear latencia en tiempo real
- Si TTFT > umbral → cambiar modelo automáticamente
- Mantener histórico de qué modelos funcionan bien
- Circuit breaker con auto-recovery

PLANES DE ACCIÓN (por latencia):
1. NORMAL (<150ms): todo perfecto, seguir con modelo actual
2. ALTO (150-300ms): cambiar a fallback más ligero, log
3. CRÍTICO (>300ms): cambiar a ultra-rápido, alerta
4. FALLO: circuit breaker activo

ARQUITECTURA:
┌─ MonitorLatencia: mide TTFT de cada componente
├─ ModelSwitcher: elige siguiente modelo basado en latencia
├─ SwitchContext: contexto para tomar decisión
└─ CircuitBreakerEnhanced: detiene modelo que falla
"""
import logging
import time
from dataclasses import dataclass, field
from enum import Enum
from collections import defaultdict, deque

from app.models_registry import (
    GEMINI_CHAT_MODELS,
    GEMINI_MASTER_MODELS,
    get_available_fallback_chain,
    ModelInfo,
)

logger = logging.getLogger(__name__)


class LatencyLevel(Enum):
    """Niveles de latencia para decisiones automáticas."""
    EXCELENTE = "excelente"  # <100ms
    NORMAL = "normal"        # 100-200ms
    ALTO = "alto"            # 200-400ms
    CRÍTICO = "critico"      # 400-800ms
    FALLO = "fallo"          # >800ms o excepción


class ModelComponent(Enum):
    """Componentes que monitoreamos."""
    GEMINI_CHAT = "gemini_chat"        # VOZ: tiempo de respuesta
    GEMINI_MASTER = "gemini_master"    # MAESTRO: tiempo de brief
    ELEVENLABS_STT = "elevenlabs_stt"  # STT: transcripción
    ELEVENLABS_TTS = "elevenlabs_tts"  # TTS: síntesis


@dataclass
class LatencyReading:
    """Una medida de latencia."""
    component: ModelComponent
    model_id: str
    ttft_ms: float
    timestamp: float = field(default_factory=time.time)
    success: bool = True
    error_msg: str = ""


@dataclass
class SwitchContext:
    """Contexto para tomar decisión de cambio de modelo."""
    component: ModelComponent
    current_model: str
    current_ttft_ms: float
    latency_level: LatencyLevel
    consecutive_failures: int = 0
    should_switch: bool = False
    suggested_model: str | None = None
    reason: str = ""


class MonitorLatencia:
    """Monitorea TTFT de cada componente y detecta degradación."""

    def __init__(self, window_size: int = 10):
        """
        Args:
            window_size: número de últimas medidas para calcular promedio
        """
        self.window_size = window_size
        self._readings: dict[ModelComponent, deque[LatencyReading]] = defaultdict(
            lambda: deque(maxlen=window_size)
        )
        self._thresholds = {
            LatencyLevel.EXCELENTE: 100,
            LatencyLevel.NORMAL: 200,
            LatencyLevel.ALTO: 400,
            LatencyLevel.CRÍTICO: 800,
        }

    def record(self, reading: LatencyReading) -> None:
        """Registra una lectura de latencia."""
        self._readings[reading.component].append(reading)

        avg_ms = self.get_average_latency(reading.component)
        level = self.classify_latency(avg_ms)

        if level != LatencyLevel.EXCELENTE:
            logger.warning(
                "⏱️ Latencia %s: %s (modelo=%s, último=%.0fms, promedio=%.0fms)",
                level.value,
                reading.component.value,
                reading.model_id,
                reading.ttft_ms,
                avg_ms,
            )

    def get_average_latency(self, component: ModelComponent) -> float:
        """Retorna latencia promedio de los últimos readings."""
        readings = self._readings[component]
        if not readings:
            return 0.0
        return sum(r.ttft_ms for r in readings if r.success) / max(1, len(readings))

    def classify_latency(self, ttft_ms: float) -> LatencyLevel:
        """Clasifica latencia en nivel."""
        if ttft_ms <= self._thresholds[LatencyLevel.EXCELENTE]:
            return LatencyLevel.EXCELENTE
        elif ttft_ms <= self._thresholds[LatencyLevel.NORMAL]:
            return LatencyLevel.NORMAL
        elif ttft_ms <= self._thresholds[LatencyLevel.ALTO]:
            return LatencyLevel.ALTO
        elif ttft_ms <= self._thresholds[LatencyLevel.CRÍTICO]:
            return LatencyLevel.CRÍTICO
        else:
            return LatencyLevel.FALLO

    def set_threshold(self, level: LatencyLevel, ms: int) -> None:
        """Ajusta umbral de latencia dinámicamente."""
        self._thresholds[level] = ms
        logger.info("📊 Umbral %s ajustado a %dms", level.value, ms)


class ModelSwitcher:
    """Elige siguiente modelo basado en latencia y disponibilidad."""

    def __init__(
        self,
        chat_models: list[ModelInfo] = None,
        master_models: list[ModelInfo] = None,
    ):
        self.chat_models = chat_models or GEMINI_CHAT_MODELS
        self.master_models = master_models or GEMINI_MASTER_MODELS
        self._model_blacklist: set[str] = set()
        self._switch_history: list[tuple[str, str, str]] = []  # (timestamp, from, to, reason)

    def decide_switch(
        self,
        component: ModelComponent,
        current_model: str,
        latency_level: LatencyLevel,
        consecutive_failures: int = 0,
    ) -> SwitchContext:
        """Decide si cambiar modelo y cuál usar.

        Lógica:
        - EXCELENTE/NORMAL: no cambiar
        - ALTO: cambiar a siguiente fallback
        - CRÍTICO: cambiar a ultra-rápido
        - FALLO: saltar a fallback más estable
        """
        reason = ""
        should_switch = False
        suggested_model = None

        # Escoger lista de modelos según componente
        if component == ModelComponent.GEMINI_CHAT:
            models_list = self.chat_models
        elif component == ModelComponent.GEMINI_MASTER:
            models_list = self.master_models
        else:
            # STT/TTS no se cambian aquí (son por proveedor)
            return SwitchContext(
                component=component,
                current_model=current_model,
                current_ttft_ms=0,
                latency_level=latency_level,
                consecutive_failures=consecutive_failures,
            )

        # Lógica de switch
        if latency_level == LatencyLevel.EXCELENTE:
            reason = "Latencia excelente, no cambiar"
        elif latency_level == LatencyLevel.NORMAL:
            reason = "Latencia normal, no cambiar"
        elif latency_level == LatencyLevel.ALTO:
            should_switch = True
            reason = f"Latencia ALTA ({latency_level.value}): cambiar a fallback"
            suggested_model = self._get_next_available_model(current_model, models_list)
        elif latency_level == LatencyLevel.CRÍTICO:
            should_switch = True
            reason = f"Latencia CRÍTICA ({latency_level.value}): cambiar a ultra-rápido"
            # Buscar modelo ultra-rápido
            suggested_model = self._get_fastest_available_model(models_list)
        elif latency_level == LatencyLevel.FALLO:
            should_switch = True
            if consecutive_failures > 2:
                reason = f"Fallo x{consecutive_failures}: cambiar a fallback estable"
                suggested_model = self._get_stable_fallback(current_model, models_list)
            else:
                reason = "Fallo temporal: intentar siguiente fallback"
                suggested_model = self._get_next_available_model(current_model, models_list)

        # Si no hay fallback disponible, mantener actual
        if should_switch and not suggested_model:
            logger.warning(
                "⚠️ No hay fallback disponible para %s. Manteniendo modelo actual.",
                current_model,
            )
            should_switch = False

        return SwitchContext(
            component=component,
            current_model=current_model,
            current_ttft_ms=0,
            latency_level=latency_level,
            consecutive_failures=consecutive_failures,
            should_switch=should_switch,
            suggested_model=suggested_model,
            reason=reason,
        )

    def _get_next_available_model(self, current_model: str, models_list: list[ModelInfo]) -> str | None:
        """Obtiene siguiente modelo en cadena de fallback."""
        fallbacks = get_available_fallback_chain(current_model, models_list)
        # Filtrar modelos en blacklist
        available = [m for m in fallbacks if m not in self._model_blacklist]
        return available[0] if available else None

    def _get_fastest_available_model(self, models_list: list[ModelInfo]) -> str | None:
        """Obtiene modelo más rápido disponible."""
        available = [
            m for m in models_list
            if m.available and m.id not in self._model_blacklist
        ]
        if not available:
            return None
        return min(available, key=lambda m: m.ttft_ms).id

    def _get_stable_fallback(self, current_model: str, models_list: list[ModelInfo]) -> str | None:
        """Obtiene fallback más estable (después del actual, prefer rápido)."""
        fallbacks = get_available_fallback_chain(current_model, models_list)
        available = [m for m in fallbacks if m not in self._model_blacklist]
        if not available:
            return None
        # Preferir modelo más equilibrado (no ultra-rápido ni ultra-lento)
        return available[0]

    def record_switch(self, from_model: str, to_model: str, reason: str) -> None:
        """Registra un cambio de modelo."""
        self._switch_history.append((time.time(), from_model, to_model, reason))
        logger.info(
            "🔄 SWITCH: %s → %s (%s)",
            from_model,
            to_model,
            reason,
        )

    def blacklist_model(self, model_id: str, reason: str = "") -> None:
        """Deshabilita modelo temporalmente."""
        self._model_blacklist.add(model_id)
        logger.error("🚫 Modelo blacklisted: %s (%s)", model_id, reason)

    def get_switch_history(self, last_n: int = 10) -> list[str]:
        """Retorna histórico de cambios de modelo."""
        return [
            f"{time.ctime(t)} {f} → {t} ({r})"
            for t, f, t, r in self._switch_history[-last_n:]
        ]


class CircuitBreakerEnhanced:
    """Circuit breaker mejorado con auto-recovery y métricas.

    Estados:
    - CERRADO: funcionando normalmente
    - ABIERTO: fallos detectados, en cooldown
    - SEMI_ABIERTO: intento de recuperación
    """

    class State(Enum):
        CLOSED = "closed"
        OPEN = "open"
        HALF_OPEN = "half_open"

    def __init__(
        self,
        component: ModelComponent,
        failure_threshold: int = 3,
        cooldown_seconds: int = 30,
        recovery_attempts: int = 2,
    ):
        self.component = component
        self.failure_threshold = failure_threshold
        self.cooldown_seconds = cooldown_seconds
        self.recovery_attempts = recovery_attempts

        self.state = self.State.CLOSED
        self._failures = 0
        self._last_failure_time = 0
        self._recovery_attempts = 0

    def record_failure(self) -> None:
        """Registra un fallo."""
        self._failures += 1
        self._last_failure_time = time.time()

        if self._failures >= self.failure_threshold:
            self._open()

    def record_success(self) -> None:
        """Registra un éxito."""
        if self.state == self.State.HALF_OPEN:
            self._recovery_attempts += 1
            if self._recovery_attempts >= self.recovery_attempts:
                self._close()
        else:
            self._failures = 0

    def _open(self) -> None:
        """Abre el circuit breaker."""
        self.state = self.State.OPEN
        logger.error(
            "🛑 CIRCUIT BREAKER ABIERTO: %s (fallos=%d)",
            self.component.value,
            self._failures,
        )

    def _half_open(self) -> None:
        """Entra en semi-abierto para intentar recuperación."""
        self.state = self.State.HALF_OPEN
        self._recovery_attempts = 0
        logger.warning(
            "⚡ CIRCUIT BREAKER SEMI-ABIERTO: %s (intentando recuperación)",
            self.component.value,
        )

    def _close(self) -> None:
        """Cierra el circuit breaker."""
        self.state = self.State.CLOSED
        self._failures = 0
        self._recovery_attempts = 0
        logger.info(
            "✅ CIRCUIT BREAKER CERRADO: %s (recuperado)",
            self.component.value,
        )

    def can_use(self) -> bool:
        """¿Se puede usar este componente?"""
        if self.state == self.State.CLOSED:
            return True
        elif self.state == self.State.HALF_OPEN:
            return True  # Intenta recuperación
        else:
            # OPEN: esperar cooldown
            elapsed = time.time() - self._last_failure_time
            if elapsed >= self.cooldown_seconds:
                self._half_open()
                return True
            return False

    def is_open(self) -> bool:
        """¿Está abierto el circuit breaker?"""
        return self.state == self.State.OPEN


# ════════════════════════════════════════════════════════════════════
# SINGLETON: Instancias globales de monitor y switcher
# ════════════════════════════════════════════════════════════════════
_monitor = MonitorLatencia()
_switcher = ModelSwitcher()


def get_latency_monitor() -> MonitorLatencia:
    return _monitor


def get_model_switcher() -> ModelSwitcher:
    return _switcher
