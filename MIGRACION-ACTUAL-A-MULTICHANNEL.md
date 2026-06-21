# MIGRACIÓN: ARQUITECTURA ACTUAL → MULTICHANNEL

**Guía de implementación pragmática (sin romper lo que funciona)**

---

## ANÁLISIS DE ESTADO ACTUAL

### Código Existente

Tu arquitectura actual en `llamadas/app/`:

```
app/
├─ main.py                 # FastAPI entry point (Twilio)
├─ config.py              # Settings (.env)
├─ conversation/
│  ├─ prompts.py          # System prompts por nicho
│  ├─ humanization.py     # Features de humanización
│  ├─ state_engine.py     # Máquina de estado conversacional
│  └─ memory.py           # Redis memory (ACTUAL)
├─ telephony/
│  ├─ media_stream.py     # WebSocket Twilio Media Streams
│  └─ twilio_client.py    # Cliente Twilio
├─ elevenlabs/
│  └─ hybrid_session.py   # STT + TTS
├─ gemini/
│  └─ live_session.py     # Gemini Live API
└─ compliance/
   └─ mx.py               # Verificación MX (horario, DNC)
```

### Fortalezas Actuales

✅ **Media Streams WebSocket:** Pipeline de audio ultrarápido (75-100ms TTFA)
✅ **Humanización:** Análisis de emoción, pausa natural, respuestas dinámicas
✅ **Memory Shareable:** Ya usa Redis para sesiones
✅ **Compliance:** Verificación de horario MX, opt-out, logs
✅ **Modularidad:** Conversation state es agnóstico de canal

### Debilidades

❌ **Monolítico:** Solo Twilio Voice
❌ **Sin continuidad entre canales:** Una llamada fallida no puede continuarse por WhatsApp
❌ **Sesiones acopladas:** CallSid de Twilio es la llave, no el phone
❌ **Prompts únicos:** El humanization.py y prompts.py no adaptan por canal

---

## ESTRATEGIA DE MIGRACIÓN (3 FASES)

### Fase 0: PREPARACIÓN (Semana 1)

**No tocar código de voz. Solo setup.**

#### 0.1 - Crear estructura de directorios

```bash
# En repo existente
mkdir -p llamadas/app/channels
mkdir -p llamadas/app/channels/handlers
mkdir -p llamadas/app/memory_v2
mkdir -p tests/channels
```

#### 0.2 - Actualizar Supabase schema

```sql
-- Agregar tablas nuevas (sin tocar las existentes)

-- Sesiones unificadas por prospect
CREATE TABLE prospect_sessions_v2 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone TEXT NOT NULL,
    software_id TEXT NOT NULL,
    prospect_data JSONB,
    state TEXT DEFAULT 'discovery',
    active_channels TEXT[] DEFAULT ARRAY[]::TEXT[],
    last_channel TEXT,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),
    UNIQUE(phone, software_id)
);

-- Historial unificado (todos los canales)
CREATE TABLE unified_messages_v2 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone TEXT NOT NULL,
    channel TEXT NOT NULL,
    role TEXT NOT NULL,  -- 'user' | 'assistant'
    text TEXT,
    metadata JSONB,
    timestamp TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT now()
);

-- Consentimiento por canal
CREATE TABLE consents_v2 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone TEXT NOT NULL,
    channel TEXT NOT NULL,
    consented_at TIMESTAMP DEFAULT now(),
    expires_at TIMESTAMP DEFAULT (now() + INTERVAL '730 days'),
    opted_out_at TIMESTAMP,
    consent_method TEXT,
    created_at TIMESTAMP DEFAULT now(),
    UNIQUE(phone, channel)
);

-- Índices
CREATE INDEX idx_sessions_v2_phone ON prospect_sessions_v2(phone);
CREATE INDEX idx_messages_v2_phone_timestamp ON unified_messages_v2(phone, timestamp);
CREATE INDEX idx_consents_v2_phone ON consents_v2(phone);
```

#### 0.3 - Variables de entorno nuevas

```bash
# Agregar a .env

# Redis (si no está)
REDIS_URL=redis://localhost:6379/1

# Meta (WhatsApp/Instagram/Facebook)
META_ACCESS_TOKEN=tu-token
META_BUSINESS_ACCOUNT_ID=tu-business-id

# SendGrid (Email)
SENDGRID_API_KEY=tu-key

# Feature flags
MULTICHANNEL_ENABLED=false  # Activar cuando esté listo
CHANNELS_ACTIVE=voice,whatsapp  # Qué canales usar
```

---

### Fase 1: LAYER DE COMPATIBILIDAD (Semanas 2-3)

**Hacer el código actual "compatible" con multichannel sin cambios disruptivos.**

#### 1.1 - Crear `SharedMemoryV2`

**Archivo:** `llamadas/app/memory_v2/memory.py`

```python
"""SharedMemoryV2: wrapper sobre Redis + Supabase que es agnóstico de canal."""

from typing import Optional
from datetime import datetime
import redis.asyncio as redis
from supabase import Client as SupabaseClient
from app.conversation.state import CallContext

class SharedMemoryV2:
    """Abstracción de memoria que funciona con phone como llave (no CallSid)."""
    
    def __init__(self, redis_url: str, supabase: SupabaseClient):
        self.redis_url = redis_url
        self.supabase = supabase
        self.redis = None
    
    async def initialize(self):
        self.redis = await redis.from_url(self.redis_url)
    
    async def get_session_by_phone(self, phone: str, software_id: str):
        """Load prospecto session using phone (no CallSid needed)."""
        # Implementar carga desde Supabase prospect_sessions_v2
        pass
    
    async def save_message_by_phone(self, phone: str, channel: str, msg: str, role: str):
        """Guardar mensaje usando phone (compatible con cualquier canal)."""
        # Insertar en unified_messages_v2
        pass
```

**Integración con código actual:**

```python
# En app/telephony/media_stream.py (línea ~40)

# ANTES:
_store = ConversationStore(settings.redis_url)

# DESPUÉS:
_store = ConversationStore(settings.redis_url)  # Mantener para compatibilidad
_store_v2 = SharedMemoryV2(settings.redis_url, supabase_client)  # Nuevo
```

#### 1.2 - Adaptor de CallContext → UnifiedSession

**Archivo:** `llamadas/app/channels/adaptor.py`

```python
"""Permite que CallContext (código actual) trabaje con UnifiedSession (nuevo)."""

from app.conversation.state import CallContext
from app.channels.session_manager import UnifiedSession

class ContextAdaptor:
    @staticmethod
    async def from_call_context(ctx: CallContext) -> UnifiedSession:
        """Convierte CallContext → UnifiedSession."""
        # Mapeo de campos
        # ctx.phone → unified_session.phone
        # ctx.prospect → unified_session.prospect
        # etc.
        pass
    
    @staticmethod
    async def to_call_context(unified: UnifiedSession) -> CallContext:
        """Convierte UnifiedSession → CallContext (para compatibilidad)."""
        pass
```

**Cómo usarlo:**

```python
# En media_stream.py, donde necesites compatibilidad:
from app.channels.adaptor import ContextAdaptor

# Código actual sigue funcionando
ctx = CallContext(...)

# Pero ahora puedes convertir si necesitas multichannel
unified = await ContextAdaptor.from_call_context(ctx)
```

#### 1.3 - Feature Flag para Multichannel

**Archivo:** `llamadas/app/config.py`

```python
class Settings(BaseSettings):
    # ... settings existentes ...
    
    # MULTICHANNEL
    multichannel_enabled: bool = False
    channels_active: str = "voice"  # "voice,whatsapp,sms"
    
    @property
    def active_channels_list(self) -> list[str]:
        if not self.multichannel_enabled:
            return ["voice"]
        return [c.strip() for c in self.channels_active.split(",")]
```

---

### Fase 2: IMPLEMENTACIÓN DE CANALES (Semanas 4-6)

**Agregar nuevos canales sin tocar voz.**

#### 2.1 - WhatsApp Handler (PRIORIDAD 1)

**Archivo:** `llamadas/app/channels/handlers/whatsapp.py`

```python
"""Handler WhatsApp usando Twilio API."""

from fastapi import FastAPI, Request
from twilio.twiml.messaging_response import MessagingResponse

app = FastAPI()

@app.post("/whatsapp/webhook")
async def whatsapp_webhook(request: Request):
    """Webhook que Twilio dispara cuando llega mensaje WhatsApp."""
    form = await request.form()
    phone = form.get("From", "").replace("whatsapp:", "")
    text = form.get("Body", "")
    
    # Procesar con Dispatcher
    from app.channels.dispatcher import Dispatcher
    dispatcher = app.state.dispatcher
    
    msg = ChannelMessage(
        channel=ChannelType.WHATSAPP,
        phone=phone,
        text=text,
        # ...
    )
    
    result = await dispatcher.route_message(msg)
    
    # Twilio requiere respuesta TwiML
    response = MessagingResponse()
    return Response(str(response), media_type="application/xml")
```

**Integración en main.py:**

```python
# app/main.py (línea ~230)

# Importar handlers
from app.channels.dispatcher import Dispatcher

@app.on_event("startup")
async def startup_multichannel():
    if settings.multichannel_enabled:
        # Inicializar Dispatcher
        app.state.dispatcher = Dispatcher(
            memory=memory_v2,
            consent_manager=consent_manager,
            # ...
        )
        logger.info("Multichannel Dispatcher initialized")

# Montar webhook
if settings.multichannel_enabled:
    @app.post("/channels/whatsapp")
    async def whatsapp_webhook(request: Request):
        # ... webhook logic ...
        pass
```

#### 2.2 - SMS Handler

**Archivo:** `llamadas/app/channels/handlers/sms.py`

Análogo a WhatsApp, pero con Twilio SMS API.

#### 2.3 - Tests

**Archivo:** `tests/channels/test_whatsapp_handler.py`

```python
import pytest
from app.channels.handlers.whatsapp import WhatsAppHandler

@pytest.mark.asyncio
async def test_whatsapp_receive_message():
    """Test recibir mensaje WhatsApp."""
    handler = WhatsAppHandler(twilio_client, memory, consent_manager)
    
    msg = ChannelMessage(
        channel=ChannelType.WHATSAPP,
        phone="+52 55 1234 5678",
        text="Hola, tengo una pregunta",
        # ...
    )
    
    response = await handler.receive_message(msg)
    
    assert response.text is not None
    assert response.channel == ChannelType.WHATSAPP
```

---

### Fase 3: OPTIMIZACIÓN (Semanas 7-8)

**Pulir, metricas, caching.**

#### 3.1 - Metrics & Observability

```python
# app/observability/multichannel_metrics.py

from prometheus_client import Counter, Histogram

message_by_channel = Counter(
    "multichannel_messages_total",
    "Mensajes por canal",
    ["channel"]
)

response_time_by_channel = Histogram(
    "multichannel_response_time_seconds",
    "Latencia de respuesta por canal",
    ["channel"],
    buckets=[0.1, 0.5, 1.0, 2.0, 5.0]
)
```

#### 3.2 - Caching agresivo (Redis)

```python
# app/memory_v2/cache.py

async def cache_session_30min(phone: str, session: UnifiedSession):
    """Cache muy agresivo para sesiones activas."""
    await redis.setex(
        f"session:{phone}",
        1800,  # 30 minutos
        session.to_json()
    )
```

---

## IMPACTO EN CÓDIGO EXISTENTE

### Cero cambios necesarios en:

✅ `app/telephony/media_stream.py` — sigue igual
✅ `app/conversation/humanization.py` — sigue igual
✅ `app/elevenlabs/hybrid_session.py` — sigue igual
✅ `app/gemini/live_session.py` — sigue igual
✅ `main.py` (rutas actuales) — sigue igual

### Cambios mínimos (backward compatible):

🔧 `config.py` — agregar feature flags
🔧 `memory.py` — agregar SharedMemoryV2 (no tocar la vieja)
🔧 `main.py` — agregar rutas `/channels/*` (las de voz quedan intactas)

---

## ROLLOUT STRATEGY

### Week 1-2: Desarrollo

- Fase 0: Preparación
- Fase 1: Layer de compatibilidad
- Code review interno

### Week 3: Staging

- Deploy en staging con `MULTICHANNEL_ENABLED=false`
- Test exhaustivo
- Load testing

### Week 4: CANARY DEPLOYMENT

```yaml
# Deploy 10% de tráfico a multichannel
MULTICHANNEL_ENABLED=true (10% de usuarios)
CHANNELS_ACTIVE=voice,whatsapp (WhatsApp solo si consentimiento explícito)
```

**Monitoreo:**

- Tasa de error por canal
- Latencia de respuesta
- Opt-in rate en WhatsApp

### Week 5: Expansión

- 50% tráfico
- Habilitar SMS

### Week 6: Full

- 100% tráfico
- Comenzar Fase 3 (Email, social)

---

## EJEMPLO: FLUJO DE UNA LLAMADA MULTICANAL

### Escenario: Llamada fallida → WhatsApp seguimiento

```
10:00 - Llamada entrante por Twilio Voice
│
├─ Código actual (app/telephony/media_stream.py)
│  └─ CallContext → sesión Gemini/ElevenLabs
│  └─ Prospect rechaza → "no me interesa"
│  └─ END CALL
│
└─ NUEVO: Al finalizar call, agent detecta intención "not_interested"
   └─ Pero hay potencial (preguntó 3 cosas, estaría "warm")
   └─ Guardar en unified_messages_v2 junto con contexto
   └─ Crear prospect_sessions_v2 entry

10:05 - Trigger: "Seguimiento por WhatsApp 4 horas después"
│
├─ Scheduler cron (Celery)
│  └─ Busca prospects con state="interested" pero no contactados en 4h
│  └─ Load session desde prospect_sessions_v2
│  └─ Generar mensaje WhatsApp
│  └─ Enviar via Twilio WhatsApp API
│
└─ 10:05 - WhatsApp enviado:
   "¿Hola Juan! 👋 Creo que justo antes de cortar la llamada 
    mencionaste el tema de no-shows. ¿Agendamos una demo?"

10:30 - Prospect responde en WhatsApp
│
├─ Webhook /channels/whatsapp
│  └─ Dispatcher.route_message()
│  └─ Load unified session (con contexto de la llamada)
│  └─ Generate response (modo WHATSAPP, no VOICE)
│  └─ Send via WhatsApp API
│
└─ Flow continúa sin repetir contexto
```

---

## CHECKLIST DE IMPLEMENTACIÓN

### Antes de iniciar

- [ ] Backup Supabase completo
- [ ] Staging environment listo
- [ ] Feature flags en config

### Fase 0

- [ ] Tables Supabase creadas
- [ ] Variables de entorno agregadas
- [ ] Directorio `channels/` estructurado

### Fase 1

- [ ] SharedMemoryV2 implementado
- [ ] ContextAdaptor funcional
- [ ] Tests pasando

### Fase 2

- [ ] WhatsApp handler funcional
- [ ] SMS handler funcional
- [ ] Consentimiento verificable
- [ ] E2E tests con datos reales

### Fase 3

- [ ] Metrics exportados a Prometheus
- [ ] Dashboards en Grafana
- [ ] SLA monitoreado

---

## DIFERENCIA ANTES vs DESPUÉS

### ANTES (Actual)

```
Prospect llama por Twilio
  ↓
CallContext (call_sid + contexto CRM)
  ↓
Gemini/ElevenLabs
  ↓
Respuesta por teléfono
  ↓
→ Fin, no hay continuidad
```

### DESPUÉS (Multichannel)

```
Prospect llama por Teléfono
  ↓
CallContext → UnifiedSession (phone es la llave)
  ↓
Gemini/ElevenLabs (modo VOICE)
  ↓
Respuesta por teléfono
  ↓
→ Auto-guardado en unified_messages_v2 + prospect_sessions_v2

Prospect no respondió bien
  ↓
Trigger: "Seguimiento 4h después"
  ↓
Load UnifiedSession (con CONTEXTO completo de la llamada)
  ↓
Generate respuesta (modo WHATSAPP, no VOICE)
  ↓
Enviar por WhatsApp
  ↓
→ Continuidad fluida, sin repetición, contexto compartido
```

---

## RIESGOS Y MITIGACIÓN

| Riesgo | Probabilidad | Mitigación |
|--------|-------------|-----------|
| Regresión en voz | Alta | Tests de no-regresión, canary deployment |
| Memory corrupta | Media | Backup Supabase, dup detection |
| Latencia aumentada | Media | Cache agresivo, índices en PG |
| Compliance issues | Baja | Revisión legal, tests de consentimiento |

---

## SOPORTE Y ROLLBACK

Si algo falla:

```bash
# Rollback rápido (1 minuto)
MULTICHANNEL_ENABLED=false

# Los datos de multichannel quedan en prospect_sessions_v2
# pero no se procesan. Cuando se arregle, se reactiva.
```

---

## TIMELINE TOTAL

| Fase | Duración | Inicio | Fin |
|------|----------|--------|-----|
| 0: Preparación | 1 sem | Semana 1 | Semana 1 |
| 1: Compatibilidad | 2 sem | Semana 2 | Semana 3 |
| 2: Canales | 3 sem | Semana 4 | Semana 6 |
| 3: Optimización | 2 sem | Semana 7 | Semana 8 |
| **TOTAL** | **8 semanas** | | **Semana 8** |

**Para producción Q3 2026.**
