"""Adiciones a config.py para soportar pipeline Groq.

Copiar estas secciones a app/config.py en la clase Settings y en _inject_aws_secrets().
"""

# ═══════════════════════════════════════════════════════════════════════════════
# AGREGAR ESTOS CAMPOS A LA CLASE Settings EN app/config.py
# ═══════════════════════════════════════════════════════════════════════════════

# --- Groq LLM ---
groq_api_key: str = ""
groq_model: str = "mixtral-8x7b-32768"  # Alternativas: "llama-3.1-405b-reasoning", "llama-3.1-70b"
groq_timeout_seconds: int = 5

# --- Deepgram STT ---
deepgram_api_key: str = ""
deepgram_language: str = "es"
deepgram_vad_silence_ms: int = 500  # VAD: silencio para fin de turno
deepgram_utterance_end_ms: int = 500  # Utterance end timeout

# --- Pipeline selector (actualizar descripción) ---
# "elevenlabs" = hybrid (STT+TTS ElevenLabs + LLM Gemini Chat)
#     RECOMENDADO: Flash v2.5 (~75ms TTFA) + calidad de voz superior.
# "gemini" = original (Gemini Live nativo)
#     Fallback si ElevenLabs API key no está configurada.
# "groq" = pipeline Groq (STT Deepgram + LLM Groq + TTS ElevenLabs)
#     Ultra-bajo latency (~700ms E2E) + bajo costo (-80% vs Gemini)
voice_pipeline: str = "elevenlabs"


# ═══════════════════════════════════════════════════════════════════════════════
# AGREGAR ESTA SECCIÓN AL MÉTODO _inject_aws_secrets() EN app/config.py
# ═══════════════════════════════════════════════════════════════════════════════

    def _inject_aws_secrets(self):
        """Inject secrets from AWS Secrets Manager into settings."""
        # ... (existing code for Gemini, ElevenLabs, Twilio, Webhook, Cal.com) ...

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


# ═══════════════════════════════════════════════════════════════════════════════
# AGREGAR ESTAS VARIABLES A .env
# ═══════════════════════════════════════════════════════════════════════════════

"""
# === Groq LLM ===
GROQ_API_KEY=gsk_...your_key_here...
GROQ_MODEL=mixtral-8x7b-32768
GROQ_TIMEOUT_SECONDS=5

# === Deepgram STT ===
DEEPGRAM_API_KEY=...your_key_here...
DEEPGRAM_LANGUAGE=es
DEEPGRAM_VAD_SILENCE_MS=500
DEEPGRAM_UTTERANCE_END_MS=500

# === Pipeline Selector (cambiar para habilitar Groq) ===
VOICE_PIPELINE=groq
"""


# ═══════════════════════════════════════════════════════════════════════════════
# AGREGAR A requirements.txt
# ═══════════════════════════════════════════════════════════════════════════════

"""
# Groq LLM
groq>=0.4.0

# Deepgram STT
deepgram-sdk>=3.0.0

# WebSockets (ya probablemente esté instalado)
websockets>=11.0

# numpy para simulaciones de audio (si no está presente)
numpy>=1.24.0
"""


# ═══════════════════════════════════════════════════════════════════════════════
# OPCIÓN A: ROUTER SEPARADO EN main.py
# ═══════════════════════════════════════════════════════════════════════════════

"""
from fastapi import WebSocket, APIRouter
from app.telephony.media_stream_groq import handle_groq_media_stream
from app.telephony.media_stream import handle_media_stream

# Router existente
@app.websocket("/media")
async def media_stream(websocket: WebSocket):
    '''WebSocket para Gemini/ElevenLabs pipeline.'''
    await websocket.accept()
    await handle_media_stream(websocket)


# Nuevo router para Groq
groq_router = APIRouter(prefix="/groq", tags=["groq_pipeline"])

@groq_router.websocket("/media")
async def groq_media_stream(websocket: WebSocket):
    '''WebSocket para Groq pipeline (STT: Deepgram, LLM: Groq, TTS: ElevenLabs).'''
    await handle_groq_media_stream(websocket)

app.include_router(groq_router)
"""


# ═══════════════════════════════════════════════════════════════════════════════
# OPCIÓN B: RUTEO DINÁMICO EN main.py (Recomendado)
# ═══════════════════════════════════════════════════════════════════════════════

"""
from fastapi import WebSocket
from app.config import settings
from app.telephony.media_stream import handle_media_stream
from app.telephony.media_stream_groq import handle_groq_media_stream

@app.websocket("/media")
async def media_stream(websocket: WebSocket):
    '''WebSocket que detecta pipeline activo (Groq vs Gemini/ElevenLabs).'''
    if settings.voice_pipeline == "groq":
        await handle_groq_media_stream(websocket)
    else:
        await handle_media_stream(websocket)
"""


# ═══════════════════════════════════════════════════════════════════════════════
# EJEMPLO: ACTUALIZACIÓN DE .env PARA PRODUCCIÓN
# ═══════════════════════════════════════════════════════════════════════════════

"""
# .env.production

# === VOICE PIPELINE ===
VOICE_PIPELINE=groq

# === GROQ ===
GROQ_API_KEY=${AWS_SECRETS:groq_api_key}
GROQ_MODEL=mixtral-8x7b-32768
GROQ_TIMEOUT_SECONDS=5

# === DEEPGRAM STT ===
DEEPGRAM_API_KEY=${AWS_SECRETS:deepgram_api_key}
DEEPGRAM_LANGUAGE=es
DEEPGRAM_VAD_SILENCE_MS=300  # Más agresivo para telefonía
DEEPGRAM_UTTERANCE_END_MS=300

# === ELEVENLABS (para TTS) ===
ELEVENLABS_API_KEY=${AWS_SECRETS:elevenlabs_api_key}
ELEVENLABS_VOICE_ID=ErXwobaYiN019PkySvjV  # Antoni español
ELEVENLABS_TTS_FORMAT=ulaw_8000
ELEVENLABS_LATENCY_OPT=0  # Mínima latencia

# === OBSERVABILITY ===
PROMETHEUS_EXPORT_INTERVAL_S=15
TRACE_SAMPLE_RATE=1.0
DETAILED_LOG_SAMPLE_RATE=0.1
"""


# ═══════════════════════════════════════════════════════════════════════════════
# ALERTAS A CONFIGURAR EN app/observability/alerts.py
# ═══════════════════════════════════════════════════════════════════════════════

"""
# Agregar nuevas alertas en app/observability/alerts.py

GROQ_LLM_TIMEOUT = Alert(
    name="groq_llm_timeout",
    severity="P2",
    message="Groq LLM timeout (> 5s)",
    threshold={"count": 5, "window": "5m"},
)

DEEPGRAM_STT_TIMEOUT = Alert(
    name="deepgram_stt_timeout",
    severity="P3",
    message="Deepgram STT timeout",
    threshold={"count": 3, "window": "5m"},
)

GROQ_CIRCUIT_OPEN = Alert(
    name="groq_circuit_breaker_open",
    severity="P1",
    message="Groq circuit breaker abierto (demasiados fallos)",
    threshold={"count": 1, "window": "1m"},
)

GROQ_HIGH_LATENCY = Alert(
    name="groq_e2e_latency_high",
    severity="P2",
    message="Groq E2E latency > 1s",
    threshold={"value": 1000, "unit": "ms", "window": "5m"},
)

# Luego registrarlas:
# alerts.register(GROQ_LLM_TIMEOUT)
# alerts.register(DEEPGRAM_STT_TIMEOUT)
# alerts.register(GROQ_CIRCUIT_OPEN)
# alerts.register(GROQ_HIGH_LATENCY)
"""


# ═══════════════════════════════════════════════════════════════════════════════
# CONFIGURACIÓN DE SECRETS MANAGER (AWS)
# ═══════════════════════════════════════════════════════════════════════════════

"""
# En AWS Secrets Manager, crear secrets:

{
  "groq_api_key": "gsk_...",
  "deepgram_api_key": "...",
}

# O usar AWS CLI:
aws secretsmanager create-secret \
  --name silxarcrm/groq/api_key \
  --secret-string "gsk_..."

aws secretsmanager create-secret \
  --name silxarcrm/deepgram/api_key \
  --secret-string "..."
"""


# ═══════════════════════════════════════════════════════════════════════════════
# VERIFICACIÓN: CHECKLIST DESPUÉS DE AGREGAR CONFIG
# ═══════════════════════════════════════════════════════════════════════════════

"""
CHECKLIST:

1. CONFIG
   [ ] Agregar campos a Settings en app/config.py
   [ ] Agregar _inject_aws_secrets() para Groq/Deepgram
   [ ] Actualizar .env con GROQ_API_KEY, DEEPGRAM_API_KEY, VOICE_PIPELINE=groq

2. DEPENDENCIAS
   [ ] pip install groq deepgram-sdk websockets
   [ ] pip freeze > requirements.txt

3. CÓDIGO
   [ ] app/telephony/media_stream_groq.py existe
   [ ] app/telephony/groq_utils.py existe
   [ ] main.py tiene router /groq/media O ruteo dinámico /media

4. SECRETS
   [ ] Groq API key en AWS Secrets Manager
   [ ] Deepgram API key en AWS Secrets Manager
   [ ] ElevenLabs API key configuda (para TTS)

5. TESTING
   [ ] python -m app.telephony.groq_examples
   [ ] wscat -c ws://localhost:8000/groq/media (si router separado)
   [ ] wscat -c ws://localhost:8000/media (si ruteo dinámico)

6. OBSERVABILITY
   [ ] Alertas Groq agregadas a app/observability/alerts.py
   [ ] Dashboard Grafana creado para métricas Groq
   [ ] PagerDuty configurado para alertas críticas

7. CANARY
   [ ] Cambiar 1% de tráfico a VOICE_PIPELINE=groq
   [ ] Monitor latencias durante 24h
   [ ] Si OK, escalar a 100%

8. COMPLIANCE (TODO)
   [ ] Agregar grabación consentimiento en GroqSession
   [ ] Agregar análisis de sentimiento
   [ ] Agregar fallback a Gemini

9. DOCUMENTACIÓN
   [ ] Actualizar runbook de incidentes
   [ ] Documentar cambios en changelog
   [ ] Crear SOP de troubleshooting
"""
