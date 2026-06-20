"""Genera un audio de prueba, lo envía a Gemini Live API, y guarda la respuesta como WAV.

Uso:
    python -m scripts.test_voice

Requiere:
    - GEMINI_API_KEY en el .env
    - Dependencias del proyecto instaladas

Guarda:
    - test_output/gemini_response.wav   (voz de la IA)
    - test_output/user_input.wav        (audio de prueba enviado)
    - test_output/transcript.txt        (transcripción)
"""
from __future__ import annotations

import asyncio
import logging
import math
import os
import struct
import time
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

OUTPUT_DIR = Path(__file__).parent.parent / "test_output"


def generate_test_audio(duration_s: float = 2.0, sample_rate: int = 16000) -> bytes:
    """Genera un audio de prueba: 'Hola' simulado con tonos."""
    samples = int(duration_s * sample_rate)
    data = bytearray()

    # Simular "Ho-la" con 3 tonos
    # 'Ho' - tono medio
    for i in range(samples // 3):
        t = i / sample_rate
        # Frecuencia modulada: 300Hz → 350Hz
        freq = 300 + 50 * math.sin(2 * math.pi * 3 * t)
        sample = math.sin(2 * math.pi * freq * t)
        # Envolvente suave
        env = 1.0 if i > 100 else i / 100
        val = int(sample * 0.6 * env * 32767)
        data.extend(struct.pack("<h", val))

    # 'la' - tono más alto
    for i in range(samples // 3, 2 * samples // 3):
        t = i / sample_rate
        freq = 450 + 30 * math.sin(2 * math.pi * 4 * t)
        sample = math.sin(2 * math.pi * freq * t)
        val = int(sample * 0.5 * 32767)
        data.extend(struct.pack("<h", val))

    # Silencio al final
    for i in range(2 * samples // 3, samples):
        data.extend(struct.pack("<h", 0))

    return bytes(data)


def generate_silence(duration_s: float = 0.5, sample_rate: int = 16000) -> bytes:
    """Genera silencio PCM16."""
    samples = int(duration_s * sample_rate)
    return b"\x00\x00" * samples


def save_wav(data: bytes, path: Path, sample_rate: int, bits: int = 16) -> None:
    """Guarda bytes PCM como archivo WAV."""
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "wb") as f:
        # RIFF header
        f.write(b"RIFF")
        f.write(struct.pack("<I", 36 + len(data)))
        f.write(b"WAVE")
        # fmt chunk
        f.write(b"fmt ")
        f.write(struct.pack("<I", 16))  # fmt chunk size
        f.write(struct.pack("<H", 1))   # PCM
        f.write(struct.pack("<H", 1))   # mono
        f.write(struct.pack("<I", sample_rate))
        f.write(struct.pack("<I", sample_rate * 2))  # byte rate
        f.write(struct.pack("<H", 2))   # block align
        f.write(struct.pack("<H", bits))  # bits per sample
        # data chunk
        f.write(b"data")
        f.write(struct.pack("<I", len(data)))
        f.write(data)
    logger.info("Guardado: %s (%d Hz, %.1f KB)", path, sample_rate, len(data) / 1024)


async def test_gemini_voice() -> None:
    """Conecta a Gemini Live, envía audio de prueba, guarda respuesta."""
    import os

    from google import genai
    from google.genai import types

    api_key = os.environ.get("GEMINI_API_KEY", "")
    if not api_key:
        logger.error("Falta GEMINI_API_KEY en el entorno")
        return

    # System prompt de prueba
    system_prompt = """Eres Mariana, asesora comercial de GestPro. Llamas a una veterinaria en CDMX.
Saluda brevemente, presentate, y pregunta si tienen un minuto. Sé amable y profesional."""

    # Configuración de la sesión
    model = "gemini-2.5-flash-native-audio-latest"

    config = types.LiveConnectConfig(
        response_modalities=["AUDIO"],
        system_instruction=types.Content(parts=[types.Part(text=system_prompt)]),
        speech_config=types.SpeechConfig(
            voice_config=types.VoiceConfig(
                prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name="Leda")
            ),
            language_code="es-US",
        ),
        realtime_input_config=types.RealtimeInputConfig(
            automatic_activity_detection=types.AutomaticActivityDetection(
                start_of_speech_sensitivity=types.StartSensitivity.START_SENSITIVITY_HIGH,
                end_of_speech_sensitivity=types.EndSensitivity.END_SENSITIVITY_HIGH,
                prefix_padding_ms=150,
                silence_duration_ms=500,
            )
        ),
        output_audio_transcription=types.AudioTranscriptionConfig(),
    )

    logger.info("Conectando a Gemini Live (%s)...", model)
    client = genai.Client(api_key=api_key)

    user_audio = generate_test_audio(duration_s=2.5, sample_rate=16000)
    silence = generate_silence(duration_s=0.5, sample_rate=16000)

    # Guardar audio de entrada
    save_wav(user_audio, OUTPUT_DIR / "user_input.wav", 16000)

    ai_audio_chunks: list[bytes] = []
    transcript_lines: list[str] = []

    async with client.aio.live.connect(model=model, config=config) as session:
        logger.info("Conectado. Enviando audio de prueba...")

        # Enviar audio de prueba
        await session.send_realtime_input(
            audio=types.Blob(data=user_audio, mime_type="audio/pcm;rate=16000")
        )
        # Enviar silencio para que Gemini sepa que terminó el turno
        await session.send_realtime_input(
            audio=types.Blob(data=silence, mime_type="audio/pcm;rate=16000")
        )

        # Recibir respuesta durante ~15 segundos o hasta que termine
        start_time = time.time()
        max_duration = 15.0

        async for response in session.receive():
            if time.time() - start_time > max_duration:
                logger.info("Tiempo máximo alcanzado (%ds)", max_duration)
                break

            # Audio de respuesta
            if getattr(response, "data", None):
                ai_audio_chunks.append(response.data)
                logger.debug("Recibido chunk de audio: %d bytes", len(response.data))

            # Transcripciones
            server_content = getattr(response, "server_content", None)
            if server_content:
                out_t = getattr(server_content, "output_transcription", None)
                if out_t and getattr(out_t, "text", None):
                    line = f"IA: {out_t.text}"
                    transcript_lines.append(line)
                    logger.info(line)

                in_t = getattr(server_content, "input_transcription", None)
                if in_t and getattr(in_t, "text", None):
                    line = f"Usuario: {in_t.text}"
                    transcript_lines.append(line)
                    logger.info(line)

            # Fin de turno
            if server_content and getattr(server_content, "turn_complete", False):
                logger.info("Turno completo. Esperando...")
                # Esperar un poco más por si hay más audio
                await asyncio.sleep(1.0)
                break

    # Guardar respuesta de audio
    if ai_audio_chunks:
        full_audio = b"".join(ai_audio_chunks)
        # Gemini devuelve a 24kHz
        save_wav(full_audio, OUTPUT_DIR / "gemini_response.wav", 24000)
        logger.info("Total audio recibido: %.1f KB", len(full_audio) / 1024)
    else:
        logger.warning("No se recibió audio de respuesta")

    # Guardar transcripción
    if transcript_lines:
        transcript_path = OUTPUT_DIR / "transcript.txt"
        transcript_path.write_text("\n".join(transcript_lines), encoding="utf-8")
        logger.info("Transcripción guardada: %s", transcript_path)
    else:
        logger.warning("No se recibieron transcripciones")

    logger.info("\n✅ Prueba completada. Archivos en: %s", OUTPUT_DIR.absolute())
    logger.info("   - user_input.wav     (audio enviado)")
    logger.info("   - gemini_response.wav (voz de Gemini)")
    logger.info("   - transcript.txt     (transcripción)")


if __name__ == "__main__":
    asyncio.run(test_gemini_voice())
