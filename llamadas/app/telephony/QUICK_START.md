# Quick Start: Pipeline Groq

**¿Quieres habilitar Groq en 10 minutos?** Sigue este guide.

---

## 1. Instalar dependencias (2 min)

```bash
pip install groq deepgram-sdk websockets
```

## 2. Obtener API keys (3 min)

| Proveedor | Dónde | Qué necesitas |
|-----------|-------|--------------|
| **Groq** | https://console.groq.com | API key (empieza con `gsk_`) |
| **Deepgram** | https://console.deepgram.com | API key |
| **ElevenLabs** | https://elevenlabs.io | (Ya deberías tener) |

## 3. Agregar a .env (1 min)

```env
VOICE_PIPELINE=groq
GROQ_API_KEY=gsk_...your_key...
DEEPGRAM_API_KEY=...your_key...
```

## 4. Actualizar config.py (2 min)

Copiar esta sección al final de la clase `Settings` en `app/config.py`:

```python
# --- Groq LLM ---
groq_api_key: str = ""
groq_model: str = "mixtral-8x7b-32768"
groq_timeout_seconds: int = 5

# --- Deepgram STT ---
deepgram_api_key: str = ""
deepgram_language: str = "es"
deepgram_vad_silence_ms: int = 500
```

Y agregar a `_inject_aws_secrets()`:

```python
# Groq
if not self.groq_api_key and self._secrets_client:
    key = self._secrets_client.get_secret("groq_api_key")
    if key:
        self.groq_api_key = key

# Deepgram
if not self.deepgram_api_key and self._secrets_client:
    key = self._secrets_client.get_secret("deepgram_api_key")
    if key:
        self.deepgram_api_key = key
```

## 5. Actualizar main.py (1 min)

**Opción A** (Ruteo dinámico, recomendado):

Reemplazar el handler de `/media`:

```python
from app.config import settings
from app.telephony.media_stream import handle_media_stream
from app.telephony.media_stream_groq import handle_groq_media_stream

@app.websocket("/media")
async def media_stream(websocket: WebSocket):
    """Detecta pipeline y rutea."""
    if settings.voice_pipeline == "groq":
        await handle_groq_media_stream(websocket)
    else:
        await handle_media_stream(websocket)
```

**Opción B** (Router separado):

```python
from app.telephony.media_stream_groq import handle_groq_media_stream

groq_router = APIRouter(prefix="/groq", tags=["groq"])

@groq_router.websocket("/media")
async def groq_media_stream(websocket: WebSocket):
    await handle_groq_media_stream(websocket)

app.include_router(groq_router)
```

## 6. ¡Listo! Probar (1 min)

```bash
# Iniciar servidor
python -m app.main

# En otra terminal, probar WebSocket
wscat -c ws://localhost:8000/media

# Debería conectar sin error
```

## 7. Verificar logs

```bash
tail -f llamadas.log | grep -i groq
```

Deberías ver:
```
[INFO] Deepgram STT: WebSocket conectado
[INFO] ElevenLabs TTS iniciado
[INFO] Llamada iniciada (Groq) stream=MzIz... phone=+5255123456
```

---

## 🔥 Troubleshooting

| Problema | Solución |
|----------|----------|
| `ImportError: groq` | `pip install groq` |
| `GROQ_API_KEY no encontrada` | Agregar a .env o AWS Secrets Manager |
| `Deepgram connection failed` | Verificar DEEPGRAM_API_KEY es válida |
| `WebSocket connection refused` | Verificar `VOICE_PIPELINE=groq` en config |
| `timeout after 5s` | Reducir `vad_silence_ms=300` en config.py |

---

## 📊 Verificar que funciona

### Logs esperados (primeros 5 segundos)

```
[INFO] Llamada iniciada (Groq) stream=XXX phone=+5255123456
[INFO] Deepgram STT: WebSocket conectado
[INFO] ElevenLabs TTS iniciado
[DEBUG] Deepgram transcript: Hola, buenos días
[DEBUG] Groq response: Hola, ¿cómo estás?
[DEBUG] Audio TTS enviado (160 bytes)
```

### Métrica de latencia

```bash
# Ver latencia E2E en logs
grep "Groq pipeline metrics" llamadas.log

# Expected: E2E: ~800ms (STT: 250ms, LLM: 200ms, TTS: 200ms)
```

---

## 🚀 Próximas mejoras

- [ ] Fallback automático a Gemini si Groq timeout
- [ ] Agregar compliance (grabación consentimiento)
- [ ] Agregar análisis de sentimiento
- [ ] Fine-tuning Groq por industria
- [ ] Dashboard Grafana

---

## 📁 Archivos clave

```
E:\exclusion\silxarcrm\llamadas\app\telephony\
├─ media_stream_groq.py          ← Principal (no editar, copy-paste ready)
├─ groq_utils.py                 ← Utilidades (no editar)
├─ groq_integration.md           ← Guía completa
├─ groq_examples.py              ← Tests (ejecutar: python -m ...)
├─ CONFIG_ADDITIONS.py           ← Qué agregar a config.py
└─ QUICK_START.md               ← Este archivo
```

---

## ✅ Checklist: 10 minutos

- [ ] (1) Instalar pip
- [ ] (2) Obtener API keys
- [ ] (3) Actualizar .env
- [ ] (4) Actualizar config.py
- [ ] (5) Actualizar main.py
- [ ] (6) Probar con wscat
- [ ] (7) Ver logs Groq
- [ ] (8) Verificar métrica E2E ~800ms

**¡Listo!** Groq está en producción.

---

## 🆘 Soporte

- **Documentación completa**: `groq_integration.md`
- **Ejemplos y tests**: `groq_examples.py`
- **Troubleshooting**: Ver arriba o `groq_integration.md` sección 11

---

**⏱️ Tiempo total: ~10 minutos**
