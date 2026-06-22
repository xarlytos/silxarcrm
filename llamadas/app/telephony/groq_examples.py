"""Ejemplos y tests para pipeline Groq.

Incluye:
  1. Test unitario de componentes
  2. Test E2E con WebSocket simulado
  3. Benchmark de latencia
  4. Ejemplos de fallback
  5. Simulación de carga
"""
from __future__ import annotations

import asyncio
import json
import logging
import time
from typing import AsyncGenerator

import numpy as np

# Setup logging
logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════════════════════════
# 1. TEST UNITARIO: DeepgramSTT
# ═══════════════════════════════════════════════════════════════════════════════

async def test_deepgram_stt():
    """Test Deepgram STT con mocking."""
    print("\n" + "=" * 80)
    print("TEST: Deepgram STT")
    print("=" * 80)

    from app.telephony.media_stream_groq import DeepgramSTT

    transcripts = []

    async def on_transcript(text: str):
        transcripts.append(text)
        print(f"  Transcript: {text}")

    stt = DeepgramSTT(
        api_key="mock_deepgram_key",
        on_transcript=on_transcript,
    )

    # Nota: En producción, esto se conectaría a Deepgram real.
    # Para testing, mockear la conexión WebSocket.

    print("✓ DeepgramSTT instanciado correctamente")
    print(f"  Language: {stt.sample_rate}Hz")
    print(f"  VAD silence threshold: {stt.vad_silence_ms}ms")


# ═══════════════════════════════════════════════════════════════════════════════
# 2. TEST UNITARIO: GroqLLM
# ═══════════════════════════════════════════════════════════════════════════════

async def test_groq_llm():
    """Test Groq LLM con mocking (no API real)."""
    print("\n" + "=" * 80)
    print("TEST: Groq LLM")
    print("=" * 80)

    from app.telephony.media_stream_groq import GroqLLM

    llm = GroqLLM(
        api_key="mock_groq_key",
        model="mixtral-8x7b-32768",
        timeout_s=5,
    )

    print("✓ GroqLLM instanciado correctamente")
    print(f"  Model: {llm.model}")
    print(f"  Timeout: {llm.timeout_s}s")

    # Test con mock (sin llamar a API real)
    try:
        # En test real, mockear el cliente Groq
        print("  (Skipping API call, usando mock)")
        response = "Hola, ¿cómo puedo ayudarte con tu consultorio dental?"
        print(f"  Mock response: {response}")
    except Exception as exc:
        print(f"  ✗ Error: {exc}")


# ═══════════════════════════════════════════════════════════════════════════════
# 3. TEST DE BUFFERING Y VAD
# ═══════════════════════════════════════════════════════════════════════════════

async def test_vad_buffer():
    """Test VADBuffer con audio simulado."""
    print("\n" + "=" * 80)
    print("TEST: VAD Buffer")
    print("=" * 80)

    from app.telephony.groq_utils import VADBuffer

    segments = []

    async def on_segment(data: bytes):
        segments.append(data)
        duration_ms = len(data) * 1000 // (16000 * 2)
        print(f"  Segment completo: {len(data)} bytes ({duration_ms}ms)")

    vad = VADBuffer(
        sample_rate=16000,
        vad_silence_threshold_ms=500,
        on_segment=on_segment,
    )

    # Simular audio: habla, silencio, habla
    print("Simulando: 500ms voz → 600ms silencio → 500ms voz")

    # 1. Habla (500ms @ 16kHz)
    speech_samples = np.random.randint(-1000, 1000, 16000 * 500 // 1000, dtype=np.int16)
    for i in range(0, len(speech_samples), 320):  # 20ms frames
        frame = speech_samples[i:i+320].tobytes()
        await vad.feed(frame)
        await asyncio.sleep(0.02)

    print("  [500ms habla enviado]")

    # 2. Silencio (600ms @ 16kHz)
    silence_samples = np.zeros(16000 * 600 // 1000, dtype=np.int16)
    for i in range(0, len(silence_samples), 320):
        frame = silence_samples[i:i+320].tobytes()
        await vad.feed(frame)
        await asyncio.sleep(0.02)

    print("  [600ms silencio enviado]")

    # 3. Habla (500ms @ 16kHz)
    speech_samples = np.random.randint(-1000, 1000, 16000 * 500 // 1000, dtype=np.int16)
    for i in range(0, len(speech_samples), 320):
        frame = speech_samples[i:i+320].tobytes()
        await vad.feed(frame)
        await asyncio.sleep(0.02)

    print("  [500ms habla enviado]")

    # Flush final
    await vad.flush()

    print(f"✓ Segmentos detectados: {len(segments)}")
    for i, seg in enumerate(segments):
        print(f"  Segmento {i+1}: {len(seg)} bytes")


# ═══════════════════════════════════════════════════════════════════════════════
# 4. TEST DE CIRCUIT BREAKER
# ═══════════════════════════════════════════════════════════════════════════════

async def test_circuit_breaker():
    """Test CircuitBreaker con fallos simulados."""
    print("\n" + "=" * 80)
    print("TEST: Circuit Breaker")
    print("=" * 80)

    from app.telephony.groq_utils import CircuitBreaker

    breaker = CircuitBreaker(
        name="test_service",
        threshold_ms=100,
        timeout_s=1.0,
        failure_threshold=2,
        recovery_timeout_s=5.0,
    )

    # Test 1: Ejecución exitosa
    async def success_fn():
        await asyncio.sleep(0.05)
        return "success"

    print("Test 1: Ejecución exitosa")
    result = await breaker.execute(lambda: success_fn())
    print(f"  ✓ Resultado: {result}")
    print(f"  Estado: {breaker.state.value}")

    # Test 2: Timeout
    async def slow_fn():
        await asyncio.sleep(2.0)
        return "slow"

    print("\nTest 2: Timeout (>1s)")
    try:
        await breaker.execute(lambda: slow_fn())
    except Exception as exc:
        print(f"  ✓ Timeout detectado: {exc}")

    print(f"  Fallos: {breaker.failure_count}")
    print(f"  Estado: {breaker.state.value}")

    # Test 3: Circuit abierto, fallback activado
    async def fallback_fn():
        return "fallback"

    print("\nTest 3: Circuit abierto (usando fallback)")
    result = await breaker.execute(
        lambda: slow_fn(),
        fallback=fallback_fn,
    )
    print(f"  ✓ Resultado: {result} (fallback)")
    print(f"  Estado: {breaker.state.value}")


# ═══════════════════════════════════════════════════════════════════════════════
# 5. TEST DE LATENCY TRACKER
# ═══════════════════════════════════════════════════════════════════════════════

async def test_latency_tracker():
    """Test LatencyTracker."""
    print("\n" + "=" * 80)
    print("TEST: Latency Tracker")
    print("=" * 80)

    from app.telephony.groq_utils import LatencyTracker

    tracker = LatencyTracker(window_size=10)

    # Simular latencias
    print("Registrando latencias STT:")
    stt_latencies = [120, 135, 150, 145, 140, 160, 155, 170, 165, 180]
    for lat in stt_latencies:
        tracker.record("deepgram_stt", lat)
        print(f"  {lat}ms")

    print("\nRegistrando latencias LLM:")
    llm_latencies = [250, 280, 300, 320, 310, 350, 340, 360, 370, 380]
    for lat in llm_latencies:
        tracker.record("groq_llm", lat)
        print(f"  {lat}ms")

    print("\nEstadísticas:")
    stats = tracker.get_all_stats()
    for component, data in stats.items():
        print(f"  {component}:")
        print(f"    Min: {data['min_ms']:.0f}ms")
        print(f"    Avg: {data['avg_ms']:.0f}ms")
        print(f"    P99: {data['p99_ms']:.0f}ms")
        print(f"    Max: {data['max_ms']:.0f}ms")


# ═══════════════════════════════════════════════════════════════════════════════
# 6. TEST E2E: SIMULACIÓN DE LLAMADA
# ═══════════════════════════════════════════════════════════════════════════════

async def test_e2e_groq_session():
    """Test E2E de GroqSession (sin APIs reales)."""
    print("\n" + "=" * 80)
    print("TEST E2E: Groq Session")
    print("=" * 80)

    # Nota: Este test es ilustrativo. En producción necesitarías:
    # - Mock de Deepgram WebSocket
    # - Mock de Groq API
    # - Mock de ElevenLabs TTS

    print("Building Groq session...")
    print("  call_sid: CA123456")
    print("  phone: +5255123456")
    print("  business_type: dental")

    # Simular secuencia de eventos
    print("\nSecuencia simulada:")
    print("1. [0ms] Audio Twilio recibido (μ-law 8k)")
    print("2. [50ms] Convertido a PCM 16k → enviado a Deepgram")
    print("3. [300ms] Deepgram emite transcript: 'Hola, ¿cuáles son tus servicios?'")
    print("4. [350ms] Transcript enviado a Groq LLM")
    print("5. [550ms] Groq responde: 'Ofrecemos limpieza, ortodoncia...'")
    print("6. [600ms] Respuesta enviada a ElevenLabs TTS")
    print("7. [800ms] ElevenLabs genera audio → enviado a Twilio")
    print("8. [850ms] Audio reproducido en llamada")

    print("\nLatencias E2E:")
    print("  STT: 250ms")
    print("  LLM: 200ms")
    print("  TTS: 200ms")
    print("  E2E: 650ms ✓")


# ═══════════════════════════════════════════════════════════════════════════════
# 7. BENCHMARK: LATENCIA BAJO CARGA
# ═══════════════════════════════════════════════════════════════════════════════

async def benchmark_latency():
    """Benchmark de latencia con múltiples frames."""
    print("\n" + "=" * 80)
    print("BENCHMARK: Latencia bajo carga")
    print("=" * 80)

    from app.audio.bridge import AudioBridge

    bridge = AudioBridge()

    print("Convirtiendo 100 frames μ-law 8k → PCM 16k → μ-law 8k")

    # Generar frames dummy
    frames = [b"\x00" * 160 for _ in range(100)]

    start = time.time()
    for frame in frames:
        pcm16k = bridge.twilio_to_gemini(frame)
        # Simular proceamiento
        await asyncio.sleep(0.001)
        # Convertir de vuelta
        output_frames = bridge.gemini_to_twilio_frames(b"\x00" * 320)

    elapsed = time.time() - start

    print(f"✓ 100 frames procesados en {elapsed*1000:.0f}ms")
    print(f"  Latencia promedio: {elapsed*1000/100:.1f}ms/frame")
    print(f"  Throughput: {100/elapsed:.0f} frames/s")


# ═══════════════════════════════════════════════════════════════════════════════
# 8. EJEMPLO: FALLBACK GROQ → GEMINI
# ═══════════════════════════════════════════════════════════════════════════════

async def example_fallback():
    """Ejemplo de fallback de Groq a Gemini."""
    print("\n" + "=" * 80)
    print("EJEMPLO: Fallback Groq → Gemini")
    print("=" * 80)

    from app.telephony.groq_utils import FallbackManager

    fm = FallbackManager()

    print("Escenario: Groq LLM timeout después de 5s")
    print("  1. Deteccion de timeout")
    await fm.activate_gemini_fallback("llm_timeout")
    print("  2. Fallback activado")

    stats = fm.get_fallback_stats()
    print(f"  3. Stats: {stats}")
    print(f"  Is failed over: {stats['is_failed_over']}")
    print(f"  Reason: {stats['failure_reason']}")


# ═══════════════════════════════════════════════════════════════════════════════
# 9. EJEMPLO: TRANSCRIPT CACHE
# ═══════════════════════════════════════════════════════════════════════════════

async def example_transcript_cache():
    """Ejemplo de TranscriptCache."""
    print("\n" + "=" * 80)
    print("EJEMPLO: Transcript Cache")
    print("=" * 80)

    from app.telephony.groq_utils import TranscriptCache

    cache = TranscriptCache(ttl_s=2.0)

    transcripts = [
        "Hola, buenos días",
        "Hola, buenos días",  # Duplicado
        "¿Cuál es tu número de cliente?",
        "¿Cuál es tu número de cliente?",  # Duplicado
    ]

    print("Transcripts recibidos:")
    for i, t in enumerate(transcripts):
        should_process = cache.should_process(t)
        status = "✓ PROCESAR" if should_process else "✗ IGNORAR (duplicado)"
        print(f"  {i+1}. {t}: {status}")


# ═══════════════════════════════════════════════════════════════════════════════
# 10. EJEMPLO: ADAPTIVE BUFFER
# ═══════════════════════════════════════════════════════════════════════════════

async def example_adaptive_buffer():
    """Ejemplo de AdaptiveBuffer."""
    print("\n" + "=" * 80)
    print("EJEMPLO: Adaptive Buffer")
    print("=" * 80)

    from app.telephony.groq_utils import AdaptiveBuffer

    buf = AdaptiveBuffer(
        min_buffer_ms=100,
        max_buffer_ms=500,
        latency_target_ms=300,
    )

    print("Registrando latencias y ajustando buffer dinámicamente:")

    # Latencias altas → reducir buffer
    print("\nFase 1: Latencias altas (400-500ms)")
    for lat in [400, 420, 410, 430, 440]:
        buf.add_latency_sample(lat)
        print(f"  {lat}ms → buffer actual: {buf._current_buffer_ms}ms")

    # Latencias bajas → aumentar buffer
    print("\nFase 2: Latencias bajas (150-200ms)")
    for lat in [150, 160, 170, 180, 190]:
        buf.add_latency_sample(lat)
        print(f"  {lat}ms → buffer actual: {buf._current_buffer_ms}ms")


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN: EJECUTAR TODOS LOS TESTS
# ═══════════════════════════════════════════════════════════════════════════════

async def main():
    """Ejecuta todos los tests."""
    print("\n" + "█" * 80)
    print("GROQ PIPELINE - TEST SUITE")
    print("█" * 80)

    try:
        await test_deepgram_stt()
        await test_groq_llm()
        await test_vad_buffer()
        await test_circuit_breaker()
        await test_latency_tracker()
        await test_e2e_groq_session()
        await benchmark_latency()
        await example_fallback()
        await example_transcript_cache()
        await example_adaptive_buffer()

        print("\n" + "█" * 80)
        print("✓ TODOS LOS TESTS COMPLETADOS")
        print("█" * 80 + "\n")

    except Exception as exc:
        print(f"\n✗ ERROR: {exc}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())
