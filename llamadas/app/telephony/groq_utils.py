"""Utilidades para pipeline Groq: buffering, VAD, circuit breaker, fallbacks."""
from __future__ import annotations

import asyncio
import logging
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Callable, Awaitable

from app.audio import dsp
from app.config import settings
from app.observability import metrics

logger = logging.getLogger(__name__)


class CircuitBreakerState(Enum):
    """Estados del circuit breaker."""
    CLOSED = "closed"       # Funcionando normalmente
    OPEN = "open"           # Fallos detectados, fallback activado
    HALF_OPEN = "half_open"  # Probando recuperación


class CircuitBreaker:
    """Circuit breaker para componentes (STT, LLM, TTS).

    Si un componente excede latencia/timeouts, activa fallback.
    """

    def __init__(
        self,
        name: str,
        threshold_ms: int = 500,
        timeout_s: float = 3.0,
        failure_threshold: int = 3,
        recovery_timeout_s: float = 30.0,
    ):
        self.name = name
        self.threshold_ms = threshold_ms
        self.timeout_s = timeout_s
        self.failure_threshold = failure_threshold
        self.recovery_timeout_s = recovery_timeout_s

        self.state = CircuitBreakerState.CLOSED
        self.failure_count = 0
        self.last_failure_time = None
        self.last_success_time = None

    async def execute(
        self,
        coroutine: Callable[..., Awaitable],
        *args,
        fallback: Callable[..., Awaitable] | None = None,
        **kwargs,
    ):
        """Ejecuta coroutine con timeout y fallback."""
        # Si circuit abierto y recovery time pasó, intentar half-open
        if self.state == CircuitBreakerState.OPEN:
            if time.time() - self.last_failure_time > self.recovery_timeout_s:
                self.state = CircuitBreakerState.HALF_OPEN
                logger.info("CircuitBreaker %s: HALF_OPEN (probando recuperación)", self.name)
            else:
                logger.warning("CircuitBreaker %s: OPEN, usando fallback", self.name)
                if fallback:
                    return await fallback(*args, **kwargs)
                raise Exception(f"{self.name} circuit breaker abierto")

        try:
            start = time.time()
            result = await asyncio.wait_for(
                coroutine(*args, **kwargs),
                timeout=self.timeout_s,
            )
            latency_ms = (time.time() - start) * 1000

            # Éxito: resetear contador
            self.failure_count = 0
            self.last_success_time = time.time()

            if self.state == CircuitBreakerState.HALF_OPEN:
                self.state = CircuitBreakerState.CLOSED
                logger.info("CircuitBreaker %s: CLOSED (recuperado)", self.name)

            # Advertencia si latencia alta pero OK
            if latency_ms > self.threshold_ms:
                logger.warning(
                    "CircuitBreaker %s: latencia alta %.0fms (umbral: %d)",
                    self.name, latency_ms, self.threshold_ms,
                )
                metrics.record(f"{self.name}_latency_high")

            return result

        except asyncio.TimeoutError:
            self.failure_count += 1
            self.last_failure_time = time.time()
            logger.error(
                "CircuitBreaker %s: TIMEOUT (intento %d/%d)",
                self.name, self.failure_count, self.failure_threshold,
            )
            metrics.record(f"{self.name}_timeout")

            if self.failure_count >= self.failure_threshold:
                self.state = CircuitBreakerState.OPEN
                logger.error("CircuitBreaker %s: OPEN (demasiados fallos)", self.name)
                metrics.record(f"{self.name}_circuit_open")

            if fallback:
                return await fallback(*args, **kwargs)
            raise

        except Exception as exc:
            self.failure_count += 1
            self.last_failure_time = time.time()
            logger.error("CircuitBreaker %s: ERROR %s", self.name, exc)
            metrics.record(f"{self.name}_error")

            if self.failure_count >= self.failure_threshold:
                self.state = CircuitBreakerState.OPEN

            if fallback:
                return await fallback(*args, **kwargs)
            raise


@dataclass
class VADBuffer:
    """Buffering con Voice Activity Detection (VAD).

    Acumula audio PCM y emite segmentos cuando detecta:
    1. Inicio de voz (energía > umbral)
    2. Fin de voz (silencio > duracion_umbral)
    """

    sample_rate: int = 16000
    frame_duration_ms: int = 20
    vad_silence_threshold_ms: int = 500
    vad_energy_threshold: float = 0.02
    on_segment: Callable[[bytes], Awaitable[None]] | None = None

    # Estado interno
    _buffer: bytearray = field(default_factory=bytearray)
    _last_energy_ts: float = field(default_factory=lambda: time.time())
    _segment_start_ts: float | None = None
    _in_speech: bool = False

    async def feed(self, pcm16k: bytes) -> None:
        """Agrega audio al buffer y detecta segmentos."""
        self._buffer.extend(pcm16k)

        # Calcular RMS cada frame_duration_ms
        frame_bytes = (self.sample_rate * self.frame_duration_ms // 1000) * 2  # 2 bytes/muestra
        while len(self._buffer) >= frame_bytes:
            frame = bytes(self._buffer[:frame_bytes])
            del self._buffer[:frame_bytes]

            rms = dsp.rms_level(frame)
            now = time.time()

            # Detectar transiciones voz/silencio
            if rms > self.vad_energy_threshold:
                # Voz activa
                self._last_energy_ts = now
                if not self._in_speech:
                    self._in_speech = True
                    self._segment_start_ts = now
                    logger.debug("VAD: inicio de habla detectado (RMS=%.3f)", rms)

            else:
                # Silencio
                if self._in_speech:
                    silence_ms = (now - self._last_energy_ts) * 1000
                    if silence_ms > self.vad_silence_threshold_ms:
                        # Fin de segmento
                        await self._emit_segment()
                        self._in_speech = False
                        self._segment_start_ts = None

    async def _emit_segment(self) -> None:
        """Emite segmento completo cuando termina habla."""
        if not self._buffer or not self.on_segment:
            return

        segment = bytes(self._buffer)
        duration_ms = len(segment) * 1000 // (self.sample_rate * 2)

        logger.debug("VAD: segmento completado (%.0fms)", duration_ms)
        await self.on_segment(segment)
        self._buffer.clear()

    async def flush(self) -> None:
        """Emite cualquier buffer pendiente (fin de sesión)."""
        if self._buffer and self.on_segment:
            await self._emit_segment()


@dataclass
class AdaptiveBuffer:
    """Buffer adaptativo que ajusta tamaño según latencia.

    Si latencia es alta, reduce buffer para ser más receptivo.
    Si latencia es baja, incrementa buffer para mayor estabilidad.
    """

    min_buffer_ms: int = 100
    max_buffer_ms: int = 500
    latency_target_ms: int = 300
    sample_rate: int = 16000

    _buffer: bytearray = field(default_factory=bytearray)
    _current_buffer_ms: int = field(default=200)
    _recent_latencies: list[float] = field(default_factory=lambda: [])

    def add_latency_sample(self, latency_ms: float) -> None:
        """Registra muestra de latencia para ajustar buffer."""
        self._recent_latencies.append(latency_ms)
        if len(self._recent_latencies) > 10:
            self._recent_latencies.pop(0)

        # Ajustar buffer según promedio
        avg_latency = sum(self._recent_latencies) / len(self._recent_latencies)

        if avg_latency > self.latency_target_ms * 1.2:
            # Latencia alta: reducir buffer
            new_ms = max(self._current_buffer_ms - 50, self.min_buffer_ms)
            if new_ms != self._current_buffer_ms:
                logger.debug("AdaptiveBuffer: reduciendo a %.0fms (latencia=%.0fms)",
                           new_ms, avg_latency)
                self._current_buffer_ms = new_ms
        elif avg_latency < self.latency_target_ms * 0.8:
            # Latencia baja: aumentar buffer
            new_ms = min(self._current_buffer_ms + 50, self.max_buffer_ms)
            if new_ms != self._current_buffer_ms:
                logger.debug("AdaptiveBuffer: aumentando a %.0fms (latencia=%.0fms)",
                           new_ms, avg_latency)
                self._current_buffer_ms = new_ms

    def push(self, data: bytes) -> None:
        """Agrega datos al buffer."""
        self._buffer.extend(data)

    def pop(self, size_bytes: int) -> bytes | None:
        """Extrae datos si hay suficientes."""
        buffer_bytes = (self.sample_rate * self._current_buffer_ms // 1000) * 2
        if len(self._buffer) >= buffer_bytes:
            result = bytes(self._buffer[:size_bytes])
            del self._buffer[:size_bytes]
            return result
        return None

    def ready(self) -> bool:
        """¿Hay suficiente data en buffer?"""
        buffer_bytes = (self.sample_rate * self._current_buffer_ms // 1000) * 2
        return len(self._buffer) >= buffer_bytes

    def clear(self) -> None:
        """Vacía el buffer."""
        self._buffer.clear()


class FallbackManager:
    """Gestor de fallbacks entre pipelines.

    Coordina fallbacks de Groq → Gemini cuando Deepgram/Groq fallan.
    """

    def __init__(self):
        self.is_failed_over = False
        self.failure_reason = None
        self.fallback_start_time = None

    async def activate_gemini_fallback(self, reason: str) -> None:
        """Activa fallback a Gemini Live."""
        self.is_failed_over = True
        self.failure_reason = reason
        self.fallback_start_time = time.time()

        logger.warning("FallbackManager: activando fallback a Gemini (%s)", reason)
        metrics.record("groq_fallback_to_gemini")
        metrics.record(f"groq_fallback_reason_{reason}")

    def get_fallback_stats(self) -> dict:
        """Retorna estadísticas del fallback."""
        return {
            "is_failed_over": self.is_failed_over,
            "failure_reason": self.failure_reason,
            "fallback_duration_s": (
                (time.time() - self.fallback_start_time)
                if self.fallback_start_time else None
            ),
        }


class TranscriptCache:
    """Cache de transcripts para evitar procesamiento duplicado.

    Si Deepgram emite el mismo transcript múltiples veces
    (debido a confirmación incremental), evita re-procesar.
    """

    def __init__(self, ttl_s: float = 2.0):
        self.ttl_s = ttl_s
        self._cache: dict[str, float] = {}

    def should_process(self, transcript: str) -> bool:
        """¿Debería procesar este transcript?"""
        now = time.time()

        # Limpiar entradas expiradas
        self._cache = {
            k: v for k, v in self._cache.items()
            if now - v < self.ttl_s
        }

        if transcript in self._cache:
            logger.debug("TranscriptCache: duplicado ignorado (%s)", transcript[:50])
            return False

        self._cache[transcript] = now
        return True

    def clear(self) -> None:
        """Limpia el cache."""
        self._cache.clear()


# ═══════════════════════════════════════════════════════════════════════════════
# HELPERS PARA CONVERSIONES DE AUDIO
# ═══════════════════════════════════════════════════════════════════════════════

def pcm16_to_mono_float(pcm16k: bytes) -> list[float]:
    """Convierte PCM 16-bit a array de floats [-1.0, 1.0]."""
    import struct
    samples = struct.unpack(f'<{len(pcm16k) // 2}h', pcm16k)
    return [s / 32768.0 for s in samples]


def mono_float_to_pcm16(samples: list[float]) -> bytes:
    """Convierte array de floats a PCM 16-bit."""
    import struct
    int_samples = [int(s * 32767.0) for s in samples]
    return struct.pack(f'<{len(int_samples)}h', *int_samples)


# ═══════════════════════════════════════════════════════════════════════════════
# HELPERS PARA MÉTRICAS
# ═══════════════════════════════════════════════════════════════════════════════

class LatencyTracker:
    """Rastrea latencias de componentes individuales."""

    def __init__(self, window_size: int = 100):
        self.window_size = window_size
        self._latencies: dict[str, list[float]] = {}

    def record(self, component: str, latency_ms: float) -> None:
        """Registra latencia de un componente."""
        if component not in self._latencies:
            self._latencies[component] = []

        self._latencies[component].append(latency_ms)
        if len(self._latencies[component]) > self.window_size:
            self._latencies[component].pop(0)

    def get_stats(self, component: str) -> dict | None:
        """Retorna stats (min, avg, p99) de un componente."""
        if component not in self._latencies:
            return None

        lats = self._latencies[component]
        if not lats:
            return None

        sorted_lats = sorted(lats)
        return {
            "min_ms": min(lats),
            "avg_ms": sum(lats) / len(lats),
            "max_ms": max(lats),
            "p99_ms": sorted_lats[int(len(sorted_lats) * 0.99)],
            "count": len(lats),
        }

    def get_all_stats(self) -> dict:
        """Retorna stats de todos los componentes."""
        return {
            component: self.get_stats(component)
            for component in self._latencies
        }
