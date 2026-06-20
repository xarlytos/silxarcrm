# Agente de Ventas por Voz — Estado de la Arquitectura

> Documento generado: 2026-05-30 (actualizado con State Engine probabilístico v3.0)
> Pipeline: ElevenLabs STT + Mini Classifier (híbrido) + State Engine Probabilístico + Hysteresis + Call Goal (con freno) + Gemini Chat + ElevenLabs TTS + Decision Logger

---

## 1. Visión General

Sistema de agente de voz AI para llamadas de ventas salientes B2B/SaaS (veterinarias, peluquerías caninas, dentistas, gimnasios). El agente llama a leads, conversa en español neutro mexicano, y agenda demos de ~15 minutos.

**Arquitectura jerárquica de 4 capas (simplificada):**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CAPA 1: SUPERVISOR ESTRATÉGICO (lightweight)              │
│                         Solo pre-call + excepciones                          │
│              (HOT LEAD / OPT OUT / TRANSFER) — NO cada 5 turnos             │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CAPA 2: MINI CLASSIFIER (híbrido)                         │
│              Solo cuando hay cambio / objeción / cada 3 turnos               │
│                    ↓                                                         │
│                    CAPA 3: STATE ENGINE PROBABILÍSTICO + CALL GOAL           │
│         Stage + next_stages_probs + confidence + tags (NO lineal)            │
│         Hysteresis: mínimo 2 turnos antes de transicionar                    │
│         CallGoal: progress + risk_of_loss + freno temprano                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CAPA 3.5: DECISION LOGGER                                 │
│              Event log estructurado de cada turno (JSON)                     │
│              input → classification → state_before/after → call_goal         │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CAPA 3: CONVERSADOR RÁPIDO (naturalizador)                │
│              (gemini-2.5-flash, solo naturaliza, NO decide)                  │
│                    Recibe: estrategia del State Engine + contexto            │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CAPA 4: MOTOR DE VOZ                                      │
│         ElevenLabs Scribe v2 (STT) ←──→ ElevenLabs Flash v2.5 (TTS)         │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Filosofía:** El LLM es **naturalizador**, no **decisor**. La estrategia comercial la define el State Engine (código puro). El LLM solo convierte la estrategia en lenguaje humano natural.

---

## 2. Flujo de una Llamada

```
[Backend Express] ──POST /outbound──► [Agente FastAPI]
                                           │
                                           ├─► Valida compliance MX
                                           │
                                           ├─► Twilio: client.calls.create()
                                           │       url: /voice?phone=...
                                           │
[Telco] ◄── Twilio marca ──────────────────┘
   │
   ▼
[Prospecto contesta]
   │
   ▼
[Twilio] ──GET /voice──► [Agente]
   │                       │
   │   TwiML: <Connect><Stream url="wss://.../media">
   │   + prewarm_session() (fire-and-forget)
   │
   ▼
[Twilio WS] ───► /media (WebSocket bidireccional)
   │
   │   Evento "start" + customParameters
   │
   ▼
[media_stream.handle_media_stream()]
   │
   ├─► Reclama sesión precalentada o crea nueva
   ├─► Selector de pipeline (gemini | elevenlabs)
   │
   ◄──► ElevenLabs STT ◄──► ElevenLabs TTS
   │         │                      ▲
   │         ▼                      │
   │    HybridSession (orquestador) │
   │         │                      │
   │    ├─► Classifier (híbrido)    │
   │    │     Solo cuando hay cambio │
   │    ├─► State Engine (prob)     │
   │    │     stage + next_probs    │
   │    ├─► Call Goal Tracker       │
   │    ├─► Supervisor (excepciones)│
   │    └─► Gemini Chat (naturaliza)│
   │
   ◄──► Audio bidireccional ◄──► Twilio
   │
   ▼
[Evento "stop"]
   │
   ▼
[Cierre: guarda en DB, notifica Express vía webhook]
```

---

## 3. Dos Loops Separados

### Loop A — Crítico (<700ms, sincrónico)

```
STT ElevenLabs (~150ms)
    │
    ▼
Classifier (condicional, ~100ms cuando aplica)
    │  "intencion: interesado, tags: [dolor_alto], confidence: 0.8"
    │  O reuso de cache (~0ms)
    ▼
State Engine (<1ms)
    │  Actualiza stage + next_stages_probs + hysteresis + call_goal
    ▼
Decision Logger (~1ms)
    │  Guarda evento estructurado en JSONL
    ▼
Conversador Flash (~200-400ms)
    │  Naturaliza estrategia + meta en texto humano
    ▼
TTS ElevenLabs Flash (~75ms)
    │
    ▼
Twilio
```

**Total estimado: 475-725ms** (cuando classifier corre)  
**Total estimado: 375-625ms** (cuando reusa caché, ~40% de turnos)

### Loop B — Background (async, no bloquea)

```
CRM Update → PostgreSQL save → Metrics → Redis persist
```

---

## 4. Estructura de Archivos

```
llamadas/
├── app/
│   ├── main.py                          # FastAPI: endpoints HTTP + WebSocket
│   ├── config.py                        # Settings (Pydantic) — todas las env vars
│   │
│   ├── audio/
│   │   ├── bridge.py                    # Conversión μ-law 8kHz ↔ PCM 16/24kHz
│   │   └── dsp.py                       # RMS, noise gate, AGC (opcional)
│   │
│   ├── telephony/
│   │   ├── media_stream.py              # Orquestador WebSocket Twilio (el corazón)
│   │   └── twilio_client.py             # Cliente Twilio: outbound calls, transfer
│   │
│   ├── elevenlabs/                      # CAPA 4: Motor de Voz
│   │   ├── stt_session.py               # WebSocket Scribe v2 Realtime STT
│   │   ├── tts_session.py               # WebSocket Flash v2.5 TTS streaming
│   │   ├── hybrid_session.py            # Orquesta Loop A: STT→Classifier→State→LLM→TTS
│   │   └── __init__.py
│   │
│   ├── gemini/
│   │   ├── live_session.py              # Gemini Live API (pipeline original)
│   │   ├── chat_session.py              # Gemini Chat API (conversador naturalizador)
│   │   ├── model_provider.py            # Fallback de modelos + backoff
│   │   ├── tools.py                     # 7 tools: CRM, RAG, ROI, agenda, WhatsApp
│   │   └── __init__.py
│   │
│   ├── conversation/                    # CAPA 1, 2, 3: Inteligencia
│   │   ├── classifier.py                # Mini Classifier (Flash, intención + tags)
│   │   ├── state_engine.py              # State Engine (SalesState + transiciones)
│   │   ├── strategist.py                # Supervisor (solo pre-call + excepciones)
│   │   ├── prompts.py                   # System prompts + build_conversator_prompt()
│   │   ├── state.py                     # CallContext + ConversationStore
│   │   └── signals.py                   # Heurísticas: emoción, objeciones (keywords)
│   │
│   ├── crm/
│   │   ├── postgres_repo.py             # PostgreSQL compartido con Express
│   │   ├── supabase_repo.py             # Supabase legacy
│   │   └── calcom.py                    # Agendado Cal.com
│   │
│   ├── knowledge/
│   │   ├── rag.py                       # Búsqueda semántica casos de éxito
│   │   └── seed_data.py                 # Datos seed
│   │
│   ├── compliance/
│   │   └── mx.py                        # Horario legal MX, opt-out, REUS
│   │
│   ├── observability/
│   │   ├── metrics.py                   # Contadores + latencia
│   │   └── alerts.py                    # Slack webhooks
│   │
│   └── simulation/
│       ├── live_audio.py                # Simulador con audio real (navegador)
│       └── text_session.py              # Simulador por texto (sin Twilio)
│
├── scripts/
│   ├── test_voice.py                    # Prueba voz
│   └── test_call.py                     # Prueba llamada completa
│
├── tests/                               # Tests unitarios
├── .env                                 # Variables de entorno (NO versionar)
├── .env.example                         # Template de configuración
└── requirements.txt                     # Dependencias Python
```

### Archivos obsoletos (conservados por compatibilidad, no se usan)

| Archivo | Reemplazado por |
|---------|-----------------|
| `app/conversation/briefing.py` | `state_engine.py` — `SalesState` |
| `app/conversation/memory.py` | `state_engine.py` — `tags` dentro de `SalesState` |

---

## 5. Capas en Detalle

### 5.1 Mini Classifier (`app/conversation/classifier.py`)

**Modelo:** `gemini-2.5-flash` (ultrarrápido, barato)  
**Latencia:** ~100ms  
**Costo:** ~$0.001/turno  
**Prompt:** Ultra-corto (clasificación, NO generación)

**Input:** Texto del prospecto + últimos 5 turnos  
**Output:** `IntentClassification`
```python
@dataclass
class IntentClassification:
    intencion: str      # interesado|neutro|rechazando|pidiendo_info|agendando|pidiendo_humano
    tags: list[str]     # ["tiene_software", "dolor_alto", "es_decisor", ...]
    confidence: float   # 0.0-1.0
    nueva_objecion: str # ya_tenemos_software|es_caro|ninguna
    emocion: str        # molesto|ocupado|interesado|confundido|neutro
```

**Por qué Flash y no Pro:** Es clasificación, no razonamiento. Flash es suficiente, 5x más rápido, 10x más barato.

### 5.2 State Engine (`app/conversation/state_engine.py`)

**Código puro. Sin LLM. Sin red.**  
**Latencia:** <1ms

**SalesState (probabilístico):**
```python
@dataclass
class SalesState:
    stage: str = "saludo"              # NO lineal: puede saltar estados
    confidence: float = 0.5
    tags: list[str] = field(default_factory=list)

    # Flags decisionales (código puro)
    pain_detected: bool = False
    has_software: bool = False
    is_decision_maker: bool = False
    wants_demo: bool = False
    is_rejecting: bool = False
    needs_human: bool = False
    objecion_activa: str = ""

    # Probabilidades de próximos estados (NO transiciones duras)
    next_stages: dict[str, float] = field(default_factory=dict)
    # Ejemplo: {"closing": 0.40, "solution_aware": 0.30, "exit": 0.10, ...}

    # Historial para detectar ciclos
    stage_history: list[str] = field(default_factory=list)
    turnos_en_stage: int = 0
    objeciones_count: int = 0
```

**Stages:** `saludo` → `discovery` → `problem_aware` → `solution_aware` → `qualified` → `closing` → `exit`  
**NO es lineal.** El prospecto puede saltar de `discovery` a `closing` si dice "sí, agéndame". O estar en `solution_aware` con probabilidad de retroceder a `problem_aware` si aparece una objeción.

**Transiciones probabilísticas:**
El State Engine NO impone transiciones duras. Calcula probabilidades para TODOS los estados y solo transiciona si la probabilidad del estado destino es > 60%.

| Intención | `next_stages` típico |
|-----------|---------------------|
| `rechazando` | `{"exit": 0.70, "...": 0.15, "...": 0.10}` |
| `agendando` | `{"closing": 0.75, "...": 0.10, "...": 0.10}` |
| `interesado` + `pain_detected` | `{"closing": 0.35, "solution_aware": 0.30, "qualified": 0.20}` |
| `interesado` sin dolor | `{"solution_aware": 0.40, "problem_aware": 0.25}` |
| `neutro` | `{"stage_actual": 0.50, "...": 0.25}` |

**Estrategia por stage:**
| Stage | Objetivo | Alertas |
|-------|----------|---------|
| `saludo` | presentarse, pedir permiso | no_vender_todavía |
| `discovery` | descubrir dolor | no_mencionar_precio, escuchar_más |
| `problem_aware` | cuantificar dolor | no_presionar, validar_dolor |
| `solution_aware` | explicar solución | no_cerrar_venta, solo_agendar_demo |
| `qualified` | confirmar interés + autoridad | confirmar_autoridad, no_negociar |
| `closing` | agendar demo concreta | ser_concreto_con_fecha, confirmar_whatsapp |
| `exit` | despedirse amable | no_insistir |

### 5.3 Call Goal Tracker (`app/conversation/state_engine.py` — `CallGoal`)

**Meta global de la llamada.** Evita conversaciones bonitas pero improductivas.

```python
@dataclass
class CallGoal:
    goal: str = "book_demo"           # meta: siempre "book_demo"
    progress: float = 0.0             # 0%-100% avance en el funnel
    risk_of_loss: float = 0.5         # 0%-100% riesgo de perder el lead
    turns_without_progress: int = 0   # turnos sin avance
```

**Cómo se actualiza:**
- Avanza en el funnel → `progress` sube, `risk` baja
- Retrocede (objeción) → `risk` sube
- Sin avance durante 3+ turnos → alerta: "subir urgencia o salir"

**Frenos integrados:**
1. **Freno temprano:** Si  y target es , el progreso se capa a 40% (no cerrar en los primeros 2 turnos)
2. **Señales mínimas:** Progress solo sube si hay ≥ 2 señales de valor (ej:  + ). Sin señales sólidas, el progreso sube solo al 70% del target
3. **Sin señales:** Si el lead avanza de stage pero sin señales claras, el riesgo baja menos (-5% en vez de -15%)

**Prompt del conversador:**
```
=== META DE LA LLAMADA ===
Objetivo: book_demo
Progreso: 72%
Riesgo de pérdida: 30%
=== FIN META ===
```

Si `risk > 70%`: "ALERTA: Riesgo alto. Ofrecer WhatsApp y cerrar amable."  
Si `progress > 70%`: "ALERTA: Lead caliente. Ser concreto, agendar ya."

### 5.3 Mini Classifier (`app/conversation/classifier.py`) — Híbrido

**Modelo:** `gemini-2.5-flash`  
**Latencia:** ~100ms (cuando se invoca)  
**Costo:** ~$0.001/turno (pero NO corre en cada turno)

**Estrategia híbrida (no cada turno):**

El classifier se invoca SOLO cuando:
1. **Primeros 2 turnos** (siempre)
2. **Cada 3 turnos** (periódico)
3. **Heurística detecta objeción** (`signals.detect_objection()`)
4. **Cambio de emoción** (vs emoción previa)
5. **Sin avance durante 2+ turnos** en el mismo stage

**Si NO se invoca:** Reusa la última clasificación con confianza reducida al 80%.

```python
# ¿Invocar classifier?
if self._should_classify(text):
    classification = await self._classifier.classify(text, recent_turns)
else:
    # Reusar caché con confianza degradada
    classification = IntentClassification(
        intencion=last.intencion,
        tags=last.tags,
        confidence=last.confidence * 0.8,
        ...
    )
```

**Por qué híbrido:** Reduce jitter de latencia, inconsistencias entre turnos, y dependencia de servicio externo en cada interacción crítica.

### 5.4 Conversador Rápido (`app/gemini/chat_session.py`)

**Modelo:** `gemini-2.5-flash`  
**Rol:** **Naturalizador**, no **Decisor**

**Prompt dinámico** (construido por `build_conversator_prompt`):
```
1. System prompt base (identidad Mariana, reglas, voz, prosodia)
2. Estrategia del State Engine:
   - Estado actual: closing (confianza: 90%)
   - Próximos estados probables: closing=75%, qualified=15%
   - Objetivo: agendar demo de 15 minutos
   - Próxima pregunta: ¿mañana a las 3 o pasado en la mañana?
   - Alertas: ser_concreto_con_fecha | confirmar_whatsapp
   - Tags: dolor_alto, es_decisor, pregunta_demo
3. Meta de la llamada:
   - Progreso: 72%
   - Riesgo de pérdida: 30%
4. Últimos 3 turnos (contexto inmediato)
```

**NO ve:** Todo el historial completo. Esto reduce tokens y latencia.

**Tools:** Las mismas 7 tools (CRM, RAG, ROI, agenda, WhatsApp, transfer).

### 5.4 Supervisor Estratégico (`app/conversation/strategist.py`)

**SIMPLIFICADO.** Ya no corre cada 5 turnos.

**Solo 2 responsabilidades:**
1. **Pre-call** (una sola vez): Analiza datos del CRM/nicho y genera `SalesState` inicial con tags de apertura
2. **Excepciones** (runtime): Solo interviene en:
   - `HOT_LEAD` detectado → forzar `closing`
   - `OPT_OUT` → forzar `exit`
   - `TRANSFER_REQUEST` → forzar `qualified` + `needs_human`

**Modelo:** `gemini-1.5-pro-latest` (solo en pre-call, no en runtime)

### 5.5 Motor de Voz ElevenLabs (`app/elevenlabs/`)

**STT — Scribe v2 Realtime:**
- Latencia: ~150ms
- Formatos: PCM 8-48kHz
- VAD integrado (detecta inicio/fin de habla)
- Eventos: `user_started_speaking` (barge-in), `partial`, `final`, `turn_finalized`

**TTS — Flash v2.5:**
- Latencia: ~75ms (TTFA)
- Formato: `ulaw_8000` (directo a Twilio, sin conversión)
- Optimización: nivel 4 (mínima latencia)
- Cancelación: mensaje `cancel` por WebSocket para barge-in

---

## 6. Flujo de Datos Detallado (un turno)

```
1. USUARIO HABLA
   Twilio ──μ-law 8kHz──► AudioBridge.twilio_to_gemini()
   ──PCM 16kHz──► ElevenLabsScribe.send_audio()

2. STT FINALIZA TURNO
   ElevenLabs STT --"turn_finalized"--> HybridSession._on_stt_turn_finalized()
   |
   |---> CallContext.add_turn("prospecto", texto)
   |
   |---> _should_classify()? ---> Heuristica rapida
   |       |---> SI (primeros 2 turnos / cada 3 turnos / objecion / cambio emocion)
   |       |   |---> MiniClassifier.classify(texto, ultimos_5_turnos)
   |       |       |---> IntentClassification
   |       |           intencion="interesado"
   |       |           tags=["dolor_alto", "es_decisor"]
   |       |           confidence=0.85
   |       |           nueva_objecion="ninguna"
   |       |           emocion="interesado"
   |       |---> NO (reusar cache con confidence * 0.8)
   |
   |---> StateEngine.update(sales_state, classification, call_goal)
   |       stage: "discovery" -> "solution_aware"
   |       next_stages: {"closing": 0.35, "solution_aware": 0.30, "qualified": 0.20}
   |       pain_detected=True
   |       is_decision_maker=True
   |       call_goal.progress=0.50
   |       call_goal.risk_of_loss=0.20
   |
   |---> Excepcion? ---> Strategist.handle_exception()
   |       (solo si HOT_LEAD / OPT_OUT / TRANSFER)
   |
   |---> GeminiChatSession.send_message(texto)
           |
           |---> build_conversator_prompt()
           |       base_prompt + sales_state + call_goal + ultimos_3_turnos
           |
           |---> Gemini Chat API generate_content_stream()
           |       model=gemini-2.5-flash
           |       system_instruction=dynamic_prompt
           |
           |---> Streaming de texto -> on_text_chunk()

3. TTS GENERA VOZ
   on_text_chunk() ──texto──► ElevenLabsTTS.send_text()
   ──μ-law 8kHz chunks──► AudioBridge.pack_ulaw_frames()
   ──frames 160 bytes──► Twilio WebSocket

4. INTERRUPCIÓN (barge-in)
   ElevenLabs STT ──"user_started_speaking"──► on_user_started_speaking()
   │
   ├──► ElevenLabsTTS.cancel()
   ├──► AudioBridge.clear_output()
   ├──► Twilio clear event
   └──► metrics.record("barge_in")

5. TOOL CALLING
   Gemini Chat ──function_call──► on_tool_call()
   │
   ├──► tools_mod.execute_tool() → resultado
   ├──► GeminiChatSession.send_tool_result() → continúa generación
   └──► Guarda en CallContext.transcript
```

---

## 7. Configuración Completa

```bash
# ── Gemini ──
GEMINI_API_KEY=AIzaSy...
GEMINI_LIVE_MODEL=gemini-3.1-flash-live-preview        # Pipeline original
GEMINI_LIVE_FALLBACK_MODEL=gemini-2.5-flash-native-audio-latest
GEMINI_VOICE=Leda
GEMINI_LANGUAGE=es-US
GEMINI_CHAT_MODEL=gemini-2.5-flash                     # Conversador + Classifier

# ── ElevenLabs ──
ELEVENLABS_API_KEY=sk_...                              # Dejar vacío = usar Gemini Live
ELEVENLABS_VOICE_ID=pNInz6obpgDQGcFmaJgB
ELEVENLABS_TTS_FORMAT=ulaw_8000                        # μ-law directo a Twilio
ELEVENLABS_LATENCY_OPT=4                               # 0-4, 4 = mínima latencia
ELEVENLABS_STT_LANGUAGE=es
ELEVENLABS_STT_SAMPLE_RATE=16000

# ── Pipeline ──
VOICE_PIPELINE=gemini                                  # "gemini" | "elevenlabs"

# ── Supervisor Estratégico (lightweight) ──
STRATEGIST_ENABLED=false                               # true = activar pre-call + excepciones
STRATEGIST_MODEL=gemini-1.5-pro-latest                 # Solo para pre-call
STRATEGIST_TURN_INTERVAL=5                             # Ya no se usa en runtime (conservado)

# ── Twilio ──
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM_NUMBER=+521...
HUMAN_TRANSFER_NUMBER=+521...

# ── Servidor ──
PUBLIC_HOST=localhost:8000
PORT=8000

# ── Estado ──
REDIS_URL=redis://localhost:6379/0
DATABASE_URL=postgresql://...                          # Compartido con Express
SUPABASE_URL=...
SUPABASE_SERVICE_KEY=...

# ── Agendado ──
CALCOM_API_KEY=...
CALCOM_EVENT_TYPE_ID=...

# ── Webhook a Express ──
BACKEND_WEBHOOK_URL=http://localhost:5000
BACKEND_WEBHOOK_SECRET=supersecreto

# ── Compliance MX ──
DISCLOSE_AI=true
CALL_HOUR_START=9
CALL_HOUR_END=20
```

---

## 8. Endpoints HTTP/WebSocket

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/voice` | GET/POST | Webhook Twilio al contestar. Devuelve TwiML con `<Stream>` |
| `/media` | WS | Canal de audio bidireccional Twilio ↔ Agente |
| `/outbound` | POST | Inicia llamada saliente. Body: `{phone, leadId, ...}` |
| `/status` | GET | Healthcheck + métricas + pipeline activo |
| `/webhook/status` | POST | Webhook interno para estado de llamadas |
| `/simulate/start` | POST | Inicia sesión de simulación por texto |
| `/simulate/{sid}/message` | POST | Envía mensaje en simulación por texto |
| `/simulate/{sid}` | GET | Estado de sesión de simulación |
| `/simulate/live` | WS | Simulación con audio real (navegador) |

---

## 9. Métricas y Observabilidad

**Métricas registradas (`metrics.py`):**
- `call_started` — llamada iniciada
- `session_prewarmed` / `session_warm_hit` / `session_cold_start`
- `barge_in` — interrupción detectada
- `conversation_30s` — >30s con varios turnos
- `interes` — emoción "interesado" detectada
- `sentimiento_negativo` — frustración alta
- `outcome_*` — resultado de la llamada
- `pipeline_elevenlabs` / `pipeline_gemini`
- Latencia por turno (último audio usuario → primer audio agente)

**Alertas Slack (`alerts.py`):**
- `NEGATIVE_SENTIMENT` — frustración ≥ umbral
- `HOT_LEAD` — demo agendada
- `TRANSFER_NEEDED` — solicitó humano
- `LONG_CALL` — llamada larga (posible interés alto)
- `TECHNICAL_ISSUE` — error en WebSocket

---

## 10. Simuladores

### Simulador por texto (`/simulate/start`)
- Sin Twilio, sin audio
- Útil para probar prompts y lógica de conversación
- POST `/simulate/start` → devuelve `sid`
- POST `/simulate/{sid}/message` → devuelve respuesta de la IA

### Simulador con audio (`/simulate/live`)
- WebSocket en el navegador
- Acceso a micrófono + reproducción de audio
- Usa el mismo pipeline que llamadas reales (ElevenLabs STT + Classifier + State Engine + Gemini Chat + ElevenLabs TTS)
- Permite probar calidad de voz y latencia sin gastar en Twilio

---

## 11. Compliance México

**Validaciones (`app/compliance/mx.py`):**
- Horario legal: `CALL_HOUR_START` a `CALL_HOUR_END` (default 9-20)
- REUS: consulta lista de no llamar
- Opt-out: detecta frases como "no me llamen", "quíteme de la lista"
- Disclosure IA: si `DISCLOSE_AI=true`, el prompt incluye instrucción de revelar que es IA

---

## 12. Estados de una Llamada

```
iniciando → esperando_agente → agente_descolgo → llamando_lead → en_curso
                                                           │
                    ┌──────────────────────────────────────┘
                    ▼
            ┌──────completada
            │
            ├──────fallida
            ├──────no_contesta
            ├──────cancelada
            ├──────rechazado
            ├──────optout
            └──────transferido
```

**Outcomes posibles (modo AI):**
- `demo_agendada` → lead pasa a INTERESADO
- `transferido` → lead pasa a CALIFICADO
- `rechazado` / `optout` → lead pasa a RECHAZADO
- `completada` → lead pasa a CONTACTADO

---

## 13. Dependencias Clave

```
fastapi==0.115.6          # Servidor HTTP/WebSocket
uvicorn[standard]==0.34.0 # ASGI server
google-genai==0.8.0       # Gemini Live + Chat API
twilio==9.4.1             # Telefonía
websockets==14.2          # WebSocket cliente (ElevenLabs)
redis==5.2.1              # Estado de conversación
asyncpg==0.30.0           # PostgreSQL
httpx==0.28.1             # HTTP async
audioop-lts==0.2.1        # Conversión audio (Python ≥3.13)
```

---

## 14. Evolución de la Arquitectura

### v1.0 — Gemini Live (todo en uno)
- Gemini Live API manejaba STT + LLM + TTS nativo
- Simple, baja latencia, pero voz limitada

### v2.0 — Pipeline Híbrido ElevenLabs
- Separó STT/TTS (ElevenLabs) del LLM (Gemini Chat)
- Mejor calidad de voz, mismo control de prompts

### v3.0 — Arquitectura Jerárquica (actual)
- **Supervisor** simplificado: solo pre-call + excepciones
- **Classifier híbrido**: NO en cada turno. Solo en cambios significativos
- **State Engine probabilístico**: `stage + next_stages_probs + confidence` (NO lineal, NO determinista)
- **Call Goal Tracker**: `progress + risk_of_loss` (evita llamadas improductivas)
- **Conversador**: solo naturaliza, no decide
- **Dos loops**: crítico (<700ms) vs background

**Filosofía final:** No es un chatbot. Es un **sistema de control de decisión comercial en tiempo real**. El LLM ejecuta una estrategia definida por ingeniería, no la inventa.

### Próximos pasos
1. **Clonación de voz** — voice ID personalizado de vendedora real
2. **A/B testing** — comparar conversiones con/sin State Engine probabilístico
3. **Fine-tuning del classifier** — entrenar modelo pequeño para intención+tags
4. **Multi-idioma** — extender a LATAM (ElevenLabs soporta 70+)
5. **Dashboard de funnel** — visualizar estados, probabilidades y progress en tiempo real

---

*Documento generado automáticamente. Para actualizar, modificar el código fuente y regenerar.*
