# Deepgram STT - Quick Reference

## One-Liner Import
```python
from llamadas.app.deepgram_stt import DeepgramSTT
```

## Minimal Example
```python
dg = DeepgramSTT(api_key="dg_...", on_final=lambda text: print(f"Transcribed: {text}"))
await dg.start()
await dg.send_audio(twilio_ulaw_chunk)  # Auto-converts to 16kHz PCM
await dg.close()
print(dg.metrics)
```

## Configuration

| Setting | Default | Notes |
|---------|---------|-------|
| `model` | `nova-3` | Deepgram model to use |
| `language` | `es` | ISO 639-1 code |
| `VAD_SILENCE_THRESHOLD_MS` | `150` | Silence cutoff (ms) |
| `VAD_PREFIX_PADDING_MS` | `200` | Include audio before speech (ms) |
| `VAD_SENSITIVITY` | `high` | Detection level |
| `TRANSCRIPTION_TIMEOUT_MS` | `200` | Max latency for SLA |

## Methods

| Method | Purpose | Async | Returns |
|--------|---------|-------|---------|
| `start()` | Connect WebSocket | Yes | None |
| `close()` | Disconnect & cleanup | Yes | None |
| `send_audio(ulaw)` | Queue audio chunk | Yes | None |
| `transcribe_audio(pcm)` | Batch transcription | Yes | `str` |
| `stream_transcribe(iter)` | Stream processor | Yes | `AsyncIterator[str]` |
| `metrics` | Get metrics dict | Property | `dict` |

## Callbacks

```python
dg = DeepgramSTT(
    api_key="...",
    on_partial=lambda text: ...,           # Interim results
    on_final=lambda text: ...,             # Final transcription
    on_user_started_speaking=lambda: ...,  # VAD start (barge-in)
    on_user_stopped_speaking=lambda: ...,  # VAD silence
)
```

## Audio Format

| Twilio Input | Deepgram Processing | Auto-Converted |
|--------------|-------------------|-----------------|
| mu-law 8kHz | PCM16 16kHz | YES (automatic) |

## Error Handling

```python
# Fallback enabled by default
dg = DeepgramSTT(
    api_key="deepgram_key",
    elevenlabs_fallback_enabled=True,
    elevenlabs_api_key="el_...",  # For fallback
)
# If Deepgram times out or errors -> auto-fallback to ElevenLabs
```

## Metrics

```python
metrics = dg.metrics
# {
#   'count': 5,
#   'avg_latency_ms': 87.3,
#   'min_latency_ms': 65.2,
#   'max_latency_ms': 120.1,
#   'total_audio_bytes': 32000,
# }
```

**SLA Target:** `avg_latency_ms < 120`

## VAD Tuning

| Symptom | Solution |
|---------|----------|
| Cutting off speech | Increase `VAD_SILENCE_THRESHOLD_MS` |
| False positives | Decrease `VAD_SILENCE_THRESHOLD_MS` or use `VAD_SENSITIVITY = "low"` |
| Missing start | Increase `VAD_PREFIX_PADDING_MS` |

## Logging

```python
import logging
logger = logging.getLogger("my_app")
dg = DeepgramSTT(api_key="...", logger_instance=logger)
# Logs: connection, transcriptions, VAD events, metrics, errors
```

## Twilio Integration

```python
from llamadas.app.deepgram_stt import DeepgramSTT

dg = DeepgramSTT(api_key=settings.deepgram_api_key, language="es")
await dg.start()

# In your Twilio Media Stream handler
for ulaw_chunk in twilio_stream:
    await dg.send_audio(ulaw_chunk)  # Handled automatically

await dg.close()
```

## Debugging

| Issue | Check |
|-------|-------|
| No transcriptions | API key valid? Network up? Audio format correct? |
| Latency SLA breach | Network latency? `metrics['avg_latency_ms'] > 120`? |
| ElevenLabs fallback not working | Fallback enabled + API key set? |
| VAD not triggering | Audio level too low? Set `VAD_SENSITIVITY = "medium"`? |

## Files

- **Implementation:** `llamadas/app/deepgram_stt.py` (460 lines, 19KB)
- **Full Docs:** `llamadas/app/DEEPGRAM_STT_USAGE.md`
- **Config:** `llamadas/app/config.py` (add `deepgram_api_key` if needed)

## Production Checklist

- [ ] API key in `.env` or AWS Secrets Manager
- [ ] `aiohttp` in requirements.txt (already there)
- [ ] Logging configured for your app
- [ ] Metrics collection/monitoring in place
- [ ] ElevenLabs key configured for fallback
- [ ] VAD sensitivity tuned for your audio environment
- [ ] SLA monitoring (<120ms) enabled
- [ ] Error budget planned for Deepgram API failures

---

**Last updated:** 2026-06-23 | **Status:** Production Ready
