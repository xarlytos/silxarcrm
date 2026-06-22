# Integración de Pipeline Groq

## 1. Configuración (.env)

Agregar las siguientes variables al archivo `.env`:

```env
# === Groq LLM ===
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=mixtral-8x7b-32768  # O tu modelo preferido
GROQ_TIMEOUT_SECONDS=5

# === Deepgram STT ===
DEEPGRAM_API_KEY=your_deepgram_api_key_here
DEEPGRAM_LANGUAGE=es
DEEPGRAM_VAD_SILENCE_MS=500

# === Pipeline Selector ===
# Opciones: "gemini", "elevenlabs", "groq"
VOICE_PIPELINE=groq
```

## 2. Actualizar config.py

En `app/config.py`, agregar estos campos a la clase `Settings`:

```python
# --- Groq LLM ---
groq_api_key: str = ""
groq_model: str = "mixtral-8x7b-32768"
groq_timeout_seconds: int = 5

# --- Deepgram STT ---
deepgram_api_key: str = ""
deepgram_language: str = "es"
deepgram_vad_silence_ms: int = 500

# === Pipeline selector ===
# Actualizar voice_pipeline para soportar "groq":
# voice_pipeline: str = "groq"  # Nuevo valor posible
```

Agregar inyección de secrets en `_inject_aws_secrets()`:

```python
# Groq
if not self.groq_api_key and self._secrets_client:
    key = self._secrets_client.get_groq_key()
    if key:
        self.groq_api_key = key

# Deepgram
if not self.deepgram_api_key and self._secrets_client:
    key = self._secrets_client.get_deepgram_key()
    if key:
        self.deepgram_api_key = key
```

## 3. Integración con FastAPI

En `app/main.py`, importar y usar el handler:

### Opción A: Router separado para Groq (recomendado)

```python
from fastapi import APIRouter
from app.telephony.media_stream_groq import handle_groq_media_stream

groq_router = APIRouter(prefix="/groq", tags=["groq"])

@groq_router.websocket("/media")
async def groq_media_stream(websocket: WebSocket):
    """WebSocket Groq Media Streams (STT: Deepgram, LLM: Groq, TTS: ElevenLabs)."""
    await handle_groq_media_stream(websocket)

app.include_router(groq_router)
```

### Opción B: Ruteo dinámico en el handler existente

En `app/main.py`, modificar el router existente:

```python
from app.telephony.media_stream import handle_media_stream
from app.telephony.media_stream_groq import handle_groq_media_stream

@app.websocket("/media")
async def media_stream(websocket: WebSocket):
    """Detecta pipeline (Groq vs Gemini) y rutea."""
    pipeline = settings.voice_pipeline
    
    if pipeline == "groq":
        await handle_groq_media_stream(websocket)
    else:
        # Fallback a Gemini/ElevenLabs
        await handle_media_stream(websocket)
```

## 4. Dependencias pip

Agregar a `requirements.txt`:

```
groq>=0.4.0
deepgram-sdk>=3.0.0
websockets>=11.0
```

Instalar:
```bash
pip install groq deepgram-sdk websockets
```

## 5. Flujo de Ejecución

```
┌─────────────────────────────────────────────────────────────┐
│ Twilio → Media Stream WebSocket (/media o /groq/media)      │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ├─── Pipeline selector (config)
                       │
                       ├─── Si "groq" → handle_groq_media_stream()
                       │
                       └─── Si "gemini"/"elevenlabs" → handle_media_stream()

┌─────────────────────────────────────────────────────────────┐
│ Groq Pipeline: Deepgram STT + Groq LLM + ElevenLabs TTS     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Audio μ-law 8k ──→ Bridge ──→ PCM 16k                   │
│                                                              │
│  2. PCM 16k ──→ [Deepgram WebSocket STT] ──→ Transcript     │
│                                                              │
│  3. Transcript + Context ──→ [Groq LLM] ──→ Response Text   │
│                                                              │
│  4. Response ──→ [ElevenLabs TTS] ──→ μ-law 8k Audio        │
│                                                              │
│  5. μ-law 8k ──→ Bridge ──→ Frames ──→ Twilio              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 6. Métricas Registradas

La sesión Groq registra automáticamente:

- `groq_e2e_latency_ms`: Latencia total (audio recibido → audio enviado)
- `groq_stt_latency_ms`: Latencia Deepgram (STT)
- `groq_llm_latency_ms`: Latencia Groq (LLM)
- `groq_tts_latency_ms`: Latencia ElevenLabs (TTS)
- `pipeline_groq`: Marca que se usó pipeline Groq
- `call_started_groq`: Inicio de llamada Groq
- `call_ended_groq`: Fin de llamada Groq
- `barge_in`: Interrupciones del usuario
- `technical_issue_groq`: Errores técnicos

## 7. Fallbacks y Circuit Breaker

### Implementar fallback a Gemini (TODO)

Si Deepgram o Groq fallan/timeout, la sesión puede:

1. **Timeout Deepgram**: Pausar y esperar siguiente transcript
2. **Timeout Groq (LLM)**: Fallback a Gemini Chat + ElevenLabs TTS
3. **Timeout ElevenLabs TTS**: Usar TTS local o Gemini TTS

Ejemplo de implementación:

```python
# En media_stream_groq.py, método _generate_response():

except asyncio.TimeoutError:
    logger.error("Groq LLM timeout, fallback a Gemini")
    # Crear sesión Gemini Chat
    from app.gemini.chat_session import GeminiChatSession
    fallback_session = GeminiChatSession(ctx=self.ctx, system_prompt=self.system_prompt)
    response = await fallback_session.generate(transcript)
    metrics.record("groq_fallback_to_gemini")
```

## 8. Testing

### Test básico (curl)

```bash
# Simular WebSocket con audio dummy
wscat -c ws://localhost:8000/groq/media \
  -x '{"event": "start", "start": {"streamSid": "MzIzMmZhNzQtNzUwOC00OTEz", "callSid": "CA12345", "customParameters": {"phone": "+5255123456", "business_type": "dental"}}}'
```

### Test E2E (código)

```python
import asyncio
from app.telephony.media_stream_groq import build_groq_session

async def test_groq_session():
    session, ctx = await build_groq_session(
        call_sid="TEST123",
        phone="+5255123456",
        business_type="dental",
        business_name="Clínica Test",
        city="CDMX",
    )
    
    # Simular audio
    import numpy as np
    audio = np.random.randint(-32768, 32767, 16000, dtype=np.int16).tobytes()
    
    task = asyncio.create_task(session.run())
    await session.send_audio(audio)
    await asyncio.sleep(2)
    await session.close()
    
    print(f"Metricas: {session._metrics}")

asyncio.run(test_groq_session())
```

## 9. Optimizaciones

### Latencia mínima (telefonía)

- **Deepgram**: `utterance_end_ms=500` para VAD agresivo
- **Groq**: `max_tokens=500` limita respuesta
- **ElevenLabs**: `latency_optimization=0` (~75ms TTFA)
- **Buffering**: Accumular 20ms de audio antes de enviar (20 ms frame)

### Calidad vs Latencia

```
LOW LATENCY:      STT 300-400ms + LLM 200-300ms + TTS 100-150ms = ~700-850ms
BALANCED:         STT 400-500ms + LLM 300-400ms + TTS 150-200ms = ~1000-1100ms
HIGH QUALITY:     STT 500-600ms + LLM 400-500ms + TTS 200-300ms = ~1200-1400ms
```

Configurar con timeouts:
- `vad_silence_ms=300`: VAD más agresivo
- `gemini_chat_timeout_seconds=3`: LLM timeout
- `elevenlabs_tts_timeout_seconds=2`: TTS timeout

## 10. Observabilidad

### Logs

Ver logs de pipeline Groq:

```bash
tail -f llamadas.log | grep -i groq
```

### Métricas en Prometheus

```promql
# Latencia promedio E2E (últimas 5 min)
avg_over_time(groq_e2e_latency_ms[5m])

# Latencia P99
histogram_quantile(0.99, groq_e2e_latency_ms)

# Tasa de fallbacks a Gemini
increase(groq_fallback_to_gemini[5m])
```

### Alertas (PagerDuty)

Configurar alertas en `app/observability/alerts.py`:

```python
GROQ_LLM_TIMEOUT = Alert(
    name="groq_llm_timeout",
    severity="P2",
    message="Groq LLM timeout excedido",
)

GROQ_STT_TIMEOUT = Alert(
    name="groq_stt_timeout",
    severity="P3",
    message="Deepgram STT timeout excedido",
)
```

## 11. Roadmap de Mejoras

- [ ] Fallback automático a Gemini si Groq timeout
- [ ] Caching de transcripts idénticos (evitar LLM duplicado)
- [ ] Streaming de respuesta LLM a TTS (latencia mínima)
- [ ] VAD customizable por software_id
- [ ] A/B testing: Groq vs Gemini por lead
- [ ] Fine-tuning de modelo Groq por industria
- [ ] Soporte para Deepgram multi-language (ES/EN/PT)

## 12. Contacto y Soporte

- **Groq API**: https://console.groq.com
- **Deepgram API**: https://console.deepgram.com
- **ElevenLabs API**: https://elevenlabs.io
- **Documentación**: Ver media_stream_groq.py docstrings
