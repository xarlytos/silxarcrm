# Deepgram STT Module Usage Guide

## Overview

`deepgram_stt.py` provides production-ready Speech-to-Text with integrated Voice Activity Detection (VAD) and fallback to ElevenLabs.

**Key features:**
- Real-time streaming transcription from Twilio audio (mu-law 8kHz)
- Voice Activity Detection with high sensitivity
- Automatic audio format conversion (8kHz → 16kHz PCM)
- Latency tracking (<120ms SLA)
- ElevenLabs STT fallback on timeout/error
- Async-first design with callbacks

---

## Installation

Module is in: `llamadas/app/deepgram_stt.py`

### Dependencies (already in requirements.txt)
- `aiohttp` - HTTP client for WebSocket & REST
- `audioop-lts` - Audio format conversion (Python 3.13+)

```bash
pip install -r llamadas/requirements.txt
```

---

## Quick Start

### 1. Streaming Mode (WebSocket) - Recommended

```python
import asyncio
from llamadas.app.deepgram_stt import DeepgramSTT

async def handle_transcription(text: str):
    print(f"Transcription: {text}")

async def handle_vad_start():
    print("User started speaking")

async def main():
    dg = DeepgramSTT(
        api_key="your_deepgram_api_key",
        model="nova-3",
        language="es",
        on_final=handle_transcription,
        on_user_started_speaking=handle_vad_start,
    )
    
    await dg.start()
    
    # Send audio chunks (mu-law 8kHz from Twilio)
    for audio_chunk in audio_stream:
        await dg.send_audio(audio_chunk)
    
    await dg.close()
    print(dg.metrics)

asyncio.run(main())
```

### 2. Batch Mode (REST)

For non-streaming, one-shot transcription:

```python
from llamadas.app.deepgram_stt import DeepgramSTT

async def transcribe_file():
    dg = DeepgramSTT(api_key="your_deepgram_api_key")
    
    # PCM16 16kHz audio
    with open("audio.wav", "rb") as f:
        audio = f.read()
    
    text = await dg.transcribe_audio(audio, sample_rate=16000)
    print(f"Result: {text}")

asyncio.run(transcribe_file())
```

### 3. Streaming with Async Iterator

```python
async def transcribe_stream(audio_stream):
    dg = DeepgramSTT(api_key="key")
    await dg.start()
    
    # stream_transcribe yields final transcriptions when VAD detects silence
    async for text in dg.stream_transcribe(audio_stream):
        print(f"Final: {text}")
    
    await dg.close()
```

---

## Configuration

### Initialization Parameters

```python
DeepgramSTT(
    api_key: str,                              # Required: Deepgram API token
    model: str = "nova-3",                     # Deepgram model
    language: str = "es",                      # ISO 639-1 (es=Spanish)
    on_partial: Callable[[str], None] = None,  # Interim results callback
    on_final: Callable[[str], None] = None,    # Final transcription callback
    on_user_started_speaking: Callable[[], None] = None,  # VAD start
    on_user_stopped_speaking: Callable[[], None] = None,  # VAD silence
    elevenlabs_fallback_enabled: bool = True,
    elevenlabs_api_key: str | None = None,
    logger_instance: logging.Logger | None = None,
)
```

### VAD Settings (Module Constants)

```python
from llamadas.app.deepgram_stt import (
    VAD_SILENCE_THRESHOLD_MS,    # 150ms - silence cutoff
    VAD_PREFIX_PADDING_MS,       # 200ms - include before first sound
    VAD_SENSITIVITY,             # "high" - detection level
)
```

**Tuning VAD:**
- Increase `VAD_SILENCE_THRESHOLD_MS` if cutting off speech too early
- Decrease if getting false positives from background noise
- Change `VAD_SENSITIVITY` to "medium" or "low" for noisy environments

---

## Integration with Twilio

### Audio Format Conversion

Twilio sends **mu-law 8kHz** frames. DeepgramSTT handles conversion automatically:

```
Twilio (ulaw 8k) → [audioop.ulaw2lin + resample] → Deepgram (PCM16 16k)
```

Just pass raw Twilio chunks:

```python
dg = DeepgramSTT(api_key="...")
await dg.start()

# From Twilio Media Stream
for frame in twilio_frames:
    await dg.send_audio(frame)  # Automatically converted
```

---

## Error Handling

### Automatic Fallback

If Deepgram times out or returns an error, automatically falls back to ElevenLabs STT:

```python
dg = DeepgramSTT(
    api_key="deepgram_key",
    elevenlabs_fallback_enabled=True,  # Auto fallback
    elevenlabs_api_key="elevenlabs_key",
)
```

### Disable Fallback

```python
dg = DeepgramSTT(
    api_key="deepgram_key",
    elevenlabs_fallback_enabled=False,  # No fallback, return empty string
)
```

---

## Metrics & Monitoring

### Real-time Metrics

```python
dg = DeepgramSTT(api_key="...")
await dg.start()

# ... transcribe audio ...

metrics = dg.metrics
print(f"Avg latency: {metrics['avg_latency_ms']:.1f}ms")
print(f"Min/Max: {metrics['min_latency_ms']:.1f}ms / {metrics['max_latency_ms']:.1f}ms")
print(f"Total audio: {metrics['total_audio_bytes']} bytes")
print(f"Count: {metrics['count']} transcriptions")

await dg.close()
```

### SLA Monitoring

Target: **<120ms average latency**

Logger warnings if SLA breached:
```
WARNING:llamadas.app.deepgram_stt:Deepgram latency SLA breach: 145.3ms > 120ms
```

---

## Advanced Usage

### Custom Logger

```python
import logging

logger = logging.getLogger("my_app")
dg = DeepgramSTT(
    api_key="...",
    logger_instance=logger,
)
```

### Barge-in (Interrupt Agent)

Listen to `on_user_started_speaking` callback to detect user interrupt:

```python
async def on_user_starts_speaking():
    print("User interrupted agent!")
    # Signal to pause agent output

dg = DeepgramSTT(
    api_key="...",
    on_user_started_speaking=on_user_starts_speaking,
)
```

### Partial Results

Get interim results as user speaks:

```python
def on_partial_result(text: str):
    print(f"Interim: {text}")

dg = DeepgramSTT(
    api_key="...",
    on_partial=on_partial_result,
)
```

---

## Performance Notes

### Latency Factors
1. Network latency to Deepgram API (~50-100ms typical)
2. Audio buffering (20-40ms frames)
3. Processing time (<20ms)

**Target achieved:** <120ms average in most deployments

### Optimization Tips
- Keep frames small (20-40ms each)
- Use nearby Deepgram edge location
- Monitor network latency with `metrics['avg_latency_ms']`
- Increase `VAD_SILENCE_THRESHOLD_MS` if too many cutoffs

---

## Troubleshooting

### "Connection timeout"
- Check Deepgram API key validity
- Verify network connectivity
- Check firewall (wss://api.deepgram.com)

### "Latency SLA breach"
- Network issue? Check `metrics`
- Reduce frame size
- Switch Deepgram location (regional endpoint)

### No transcriptions
- Check `on_partial` and `on_final` callbacks
- Verify audio format (must be PCM16 or mu-law)
- Check VAD sensitivity vs environment noise

### ElevenLabs fallback not working
- Verify `elevenlabs_api_key` is set
- Check ElevenLabs account active
- Enable debug logging

---

## Example: Full Twilio Integration

```python
import asyncio
from fastapi import APIRouter
from llamadas.app.deepgram_stt import DeepgramSTT
from llamadas.app.config import settings

router = APIRouter()

class TwilioMediaStreamHandler:
    def __init__(self):
        self.dg = None
    
    async def initialize(self):
        self.dg = DeepgramSTT(
            api_key=settings.deepgram_api_key,
            language="es",
            on_final=self.on_transcription,
            elevenlabs_api_key=settings.elevenlabs_api_key,
        )
        await self.dg.start()
    
    async def on_transcription(self, text: str):
        print(f"Transcribed: {text}")
        # Send to agent, store in DB, etc.
    
    async def process_audio(self, ulaw_chunk: bytes):
        await self.dg.send_audio(ulaw_chunk)
    
    async def finalize(self):
        if self.dg:
            await self.dg.close()
            print(self.dg.metrics)

handler = TwilioMediaStreamHandler()
```

---

## See Also

- ElevenLabs STT: `elevenlabs/stt_session.py`
- Audio bridge: `audio/bridge.py`
- Config: `config.py`
