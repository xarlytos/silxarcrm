# Sistema de Llamadas Automatizadas - Documentacion Completa

> *"El telefono sigue siendo el canal de conversion mas alto del mercado B2B en Mexico. El problema no es que no funcione — es que a nadie le gusta hacer 50 llamadas frias al dia. Eso lo resolvemos nosotros."*
> — peluguau.com

---

## Indice

1. [Vision General](#1-vision-general)
2. [Arquitectura de 3 Capas](#2-arquitectura-de-3-capas)
3. [Componente: Agente AI (`llamadas/`)](#3-componente-agente-ai-llamadas)
4. [Componente: Backend API (`backend/`)](#4-componente-backend-api-backend)
5. [Componente: Frontend (`frontend/`)](#5-componente-frontend-frontend)
6. [Flujo Completo de una Llamada AI](#6-flujo-completo-de-una-llamada-ai)
7. [Modelo de Datos (Prisma)](#7-modelo-de-datos-prisma)
8. [Pipelines de Voz](#8-pipelines-de-voz)
9. [Herramientas del Agente (Tools)](#9-herramientas-del-agente-tools)
10. [Estados de Llamada](#10-estados-de-llamada)
11. [Simulaciones](#11-simulaciones)
12. [Configuracion y Variables de Entorno](#12-configuracion-y-variables-de-entorno)
13. [Servicios Externos y Costos](#13-servicios-externos-y-costos)
14. [Como Usar el Sistema](#14-como-usar-el-sistema)

---

## 1. Vision General

El sistema de llamadas es un motor de **ventas por voz con inteligencia artificial** que permite a los equipos comerciales de SilxarCRM:

- **Llamar leads automaticamente** con una voz AI que suena natural y vende como un humano experimentado
- **Practicar con un simulador** antes de hacer llamadas reales
- **Gestionar guiones (spechs)** reutilizables con variables dinamicas
- **Ver historial completo** con transcripciones, grabaciones y analytics
- **Dos modos de llamada**: Humano (via Zadarma click-to-call) o AI (via Twilio + Gemini/ElevenLabs)

El sistema esta construido sobre **tres componentes** que se comunican entre si:

```
+---------------+     HTTP/WS      +---------------+     HTTP/WS     +---------------+
|   FRONTEND    | <-------------> |    BACKEND    | <-------------> |   AGENTE AI   |
|   Next.js     |    JWT + SIO    |   Express     |    + Webhooks   |   FastAPI     |
+---------------+                 +---------------+                 +---------------+
                                                                         |
                                                                         v
                                                                   +------------+
                                                                   |   Twilio   |
                                                                   |  Telefonia |
                                                                   +------------+
```

---

## 2. Arquitectura de 3 Capas

### 2.1 Frontend (Next.js 14 App Router)

**Ruta principal**: `/dashboard/llamadas`

4 pestanas principales:
- **Llamar** — Seleccionar lead, elegir modo (Humano/AI), iniciar llamada
- **Practicar** — Simulador por texto con la IA
- **Spechs** — Editor y gestor de guiones de llamada
- **Historial** — Listado paginado con filtros, transcripciones y grabaciones

**Ruta de simulacion con audio**: `/dashboard/llamadas/probar-ai`

Simulador con microfono real que se conecta directamente al agente AI via WebSocket.

### 2.2 Backend (Express + Prisma + PostgreSQL)

**Rutas de llamadas** (`/api/llamadas/*`):
- CRUD de llamadas
- Iniciar llamada humana (Zadarma)
- Iniciar llamada AI (dispara agente Python)
- Simulacion AI por texto
- Webhooks de Zadarma y Agente AI
- Estadisticas

**Comunicacion en tiempo real**: Socket.IO emite eventos a las rooms `saas:{softwareId}` y `llamadas`.

### 2.3 Agente AI (FastAPI + Python 3.11+)

Servidor independiente en `llamadas/` que orquesta:
- **Telefonia**: Twilio (llamadas salientes, Media Streams, WhatsApp)
- **Voz**: Google Gemini Live API o ElevenLabs hibrido
- **Estrategia**: Arquitectura jerarquica con Classifier, State Engine y Supervisor
- **Herramientas**: CRM, RAG, ROI, agenda, WhatsApp, transferencia

---

## 3. Componente: Agente AI (`llamadas/`)

### 3.1 Estructura de Archivos

```
llamadas/
├── app/
│   ├── main.py                    # Servidor FastAPI — endpoints + WebSockets
│   ├── config.py                  # Pydantic Settings — todo desde .env
│   │
│   ├── audio/
│   │   ├── bridge.py              # Conversion mu-law 8kHz <-> PCM 16/24kHz
│   │   └── dsp.py                 # RMS, noise gate, AGC (opcional)
│   │
│   ├── telephony/
│   │   ├── media_stream.py        # Orquestador WebSocket Twilio (CORAZON)
│   │   └── twilio_client.py       # Cliente Twilio: outbound, transfer, WhatsApp
│   │
│   ├── gemini/
│   │   ├── live_session.py        # Gemini Live API (pipeline nativo)
│   │   ├── chat_session.py        # Gemini Chat API (naturalizador)
│   │   ├── model_provider.py      # Retry logic + fallback entre modelos
│   │   └── tools.py               # 7 function tools ejecutables
│   │
│   ├── elevenlabs/
│   │   ├── stt_session.py         # WebSocket Scribe v2 Realtime STT
│   │   ├── tts_session.py         # WebSocket Flash v2.5 TTS streaming
│   │   └── hybrid_session.py      # Orquesta Loop: STT -> Classifier -> LLM -> TTS
│   │
│   ├── conversation/
│   │   ├── classifier.py          # Mini Classifier (Flash) — intencion + tags
│   │   ├── state_engine.py        # State Engine probabilistico + Call Goal
│   │   ├── strategist.py          # Supervisor (pre-call + excepciones)
│   │   ├── prompts.py             # System prompts + scripts por nicho
│   │   ├── state.py               # CallContext + ConversationStore (Redis)
│   │   └── signals.py             # Heuristicas: emocion, objeciones, frustracion
│   │
│   ├── crm/
│   │   ├── postgres_repo.py       # PostgreSQL compartido con Express
│   │   └── supabase_repo.py       # Supabase legacy
│   │
│   ├── knowledge/
│   │   └── rag.py                 # Busqueda semantica de casos de exito
│   │
│   ├── compliance/
│   │   └── mx.py                  # Horario legal MX, opt-out, REUS
│   │
│   ├── observability/
│   │   ├── metrics.py             # Metricas en memoria
│   │   └── alerts.py              # Alertas Slack
│   │
│   └── simulation/
│       ├── text_session.py        # Simulador por texto
│       └── live_audio.py          # Simulador con audio real (navegador)
│
├── scripts/
│   ├── test_call.py               # Script para probar llamada
│   └── test_voice.py              # Script para probar voz
│
├── tests/                         # Tests unitarios con pytest
├── requirements.txt
├── pytest.ini
└── .env / .env.example
```

### 3.2 Endpoints del Agente AI

| Endpoint | Metodo | Descripcion |
|----------|--------|-------------|
| `/voice` | GET/POST | Webhook Twilio al contestar. Devuelve TwiML con `<Stream>` |
| `/media` | WS | Canal de audio bidireccional Twilio <-> Agente |
| `/outbound` | POST | Inicia llamada saliente. Body: `{phone, leadId, ...}` |
| `/status` | GET | Healthcheck + metricas + pipeline activo |
| `/webhook/status` | POST | Webhook interno para estado de llamadas |
| `/simulate/start` | POST | Inicia sesion de simulacion por texto |
| `/simulate/{sid}/message` | POST | Envia mensaje en simulacion por texto |
| `/simulate/{sid}` | GET | Estado de sesion de simulacion |
| `/simulate/live` | WS | Simulacion con audio real (navegador) |

### 3.3 Flujo Interno del Agente (Media Stream)

```
1. Twilio marca al lead
   |
   v
2. Lead CONTESTA -> GET /voice
   ├─ Genera TwiML: <Connect><Stream url="wss://.../media">
   ├─ Inyecta parametros: phone, business_type, lead_id, spech_id...
   └─ Dispara prewarm_session() [fire-and-forget]
   |
   v
3. Twilio WS -> /media (WebSocket bidireccional)
   |
   v
4. Evento "start" -> Reclama sesion precalentada o crea nueva
   |
   v
5. Selector de pipeline:
   |
   ├─ PIPELINE GEMINI (default):
   │   Twilio (mu-law 8k) -> AudioBridge -> Gemini Live (PCM 16k/24k)
   │   Gemini maneja STT + LLM + TTS nativo
   │
   └─ PIPELINE ELEVENLABS (hibrido):
       Twilio (mu-law 8k) -> AudioBridge -> ElevenLabs STT (PCM 16k)
       |
       v
       HybridSession:
         ├─ ElevenLabs Scribe v2 -> texto
         ├─ Mini Classifier -> intencion + tags
         ├─ State Engine -> stage + next_stages_probs
         ├─ Call Goal Tracker -> progress + risk_of_loss
         ├─ Gemini Chat (Flash) -> naturaliza estrategia en texto
         └─ ElevenLabs Flash v2.5 TTS -> audio -> Twilio
   |
   v
6. BIDIRECCIONAL CONTINUO:
   Usuario habla -> Twilio -> AudioBridge -> STT -> texto
   Classifier (condicional) -> State Engine -> Call Goal
   Gemini Chat -> texto respuesta
   TTS -> audio -> AudioBridge -> Twilio -> telefono
   |
   v
7. BARGE-IN (interrupcion):
   Usuario empieza a hablar -> STT detecta -> cancela TTS
   -> limpia buffer -> Twilio "clear" event
   |
   v
8. TOOL CALLING:
   Gemini invoca funcion -> ejecuta -> devuelve resultado
   Ej: agendar_demo, enviar_whatsapp, transferir_humano
   |
   v
9. Evento "stop" (Twilio) -> Cierre
   ├─ Guarda en PostgreSQL: outcome, transcript, duracion, metadata
   ├─ Notifica backend Express via webhook
   └─ Alertas Slack (si aplica)
```

### 3.4 Pre-calentamiento de Sesiones (Prewarm)

La latencia critica es el tiempo desde que el prospecto habla hasta que la IA responde. Para reducirla:

1. Cuando Twilio inicia la llamada (`/voice`), se dispara `prewarm_session()` en **fire-and-forget**
2. El handshake con Gemini ocurre **mientras suena el timbre**, no al contestar
3. Cuando el lead contesta y se abre el WebSocket `/media`, la sesion ya esta conectada
4. Se "reclama" la sesion precalentada; si no existe (cold start), se crea en el momento

**Resultado**: La primera respuesta de la IA ocurre en ~600ms en vez de ~1.5s.

### 3.5 Señales y Metricas

Durante la llamada el agente monitorea:

| Señal | Descripcion | Accion |
|-------|-------------|--------|
| `emotion` | Emocion detectada (interesado, molesto, ocupado...) | Ajusta tono respuesta |
| `frustration` | Frustracion acumulada (0-10) | Alerta Slack si >= 5 |
| `interrupted` | Barge-in detectado | Cancela TTS, limpia buffer |
| `conversation_30s` | 4 turnos consecutivos | Metrica de embudo |
| `optout` | Palabras clave de rechazo (REUS) | Registra opt-out, cierra amable |
| `turns` | Contador de turnos | Contexto para resumen |

---

## 4. Componente: Backend API (`backend/`)

### 4.1 Archivos de Llamadas

| Archivo | Ruta | Proposito |
|---------|------|-----------|
| `src/routes/llamadas.ts` | `/api/llamadas/*` | Endpoints REST + webhooks |
| `src/services/llamadaService.ts` | — | Logica de llamadas humanas (Zadarma) |
| `src/services/llamadaAiService.ts` | — | Logica de llamadas AI (agente Python) |
| `src/services/zadarmaService.ts` | — | Cliente Zadarma para click-to-call |
| `src/websocket/socket.ts` | — | Socket.IO para eventos en tiempo real |

### 4.2 Endpoints del Backend

#### Webhooks (sin auth o con secreto)

| Endpoint | Metodo | Auth | Descripcion |
|----------|--------|------|-------------|
| `/api/llamadas/webhook/zadarma` | POST | No | Eventos de llamada Zadarma |
| `/api/llamadas/webhook/ai` | POST | `X-Agent-Secret` | Estado del agente AI |

#### API REST (requiere JWT)

| Endpoint | Metodo | Descripcion |
|----------|--------|-------------|
| `GET /api/llamadas` | GET | Listar con filtros y paginacion |
| `GET /api/llamadas/stats` | GET | Estadisticas globales |
| `GET /api/llamadas/:id` | GET | Obtener una llamada especifica |
| `POST /api/llamadas/iniciar` | POST | Iniciar llamada humana (Zadarma) |
| `POST /api/llamadas/iniciar-ai` | POST | Iniciar llamada AI |
| `POST /api/llamadas/simular-ai/start` | POST | Iniciar simulacion AI por texto |
| `POST /api/llamadas/simular-ai/:sid/mensaje` | POST | Enviar mensaje en simulacion |
| `PUT /api/llamadas/:id/notas` | PUT | Actualizar notas post-llamada |
| `GET /api/llamadas/:id/audio` | GET | Obtener URL de grabacion |
| `DELETE /api/llamadas/:id` | DELETE | Eliminar llamada |

### 4.3 Servicio: Llamada Humana (Zadarma)

```typescript
// src/services/llamadaService.ts

async function iniciarLlamada({ leadId, spechId, telefonoAgente, agenteId }) {
  1. Buscar lead en DB -> validar telefono
  2. Buscar spech (si aplica)
  3. Crear registro en llamadaReal (estado: "iniciando")
  4. Llamar Zadarma API: clickToCall({ from: telefonoAgente, to: lead.telefono })
  5. Actualizar registro: estado "esperando_agente", zadarmaCallId
  6. Emitir Socket.IO: "llamada:estado" -> frontend
}
```

**Flujo Zadarma**:
```
iniciando -> esperando_agente -> agente_descolgo -> llamando_lead -> en_curso
                                                                     |
                    +------------------------------------------------+
                    v
            completada / no_contesta / cancelada / fallida
```

### 4.4 Servicio: Llamada AI (Agente Python)

```typescript
// src/services/llamadaAiService.ts

async function iniciarLlamadaAI({ leadId, spechId, agenteId }) {
  1. Buscar lead en DB -> validar telefono
  2. Buscar spech (si aplica)
  3. Crear registro en llamadaReal (estado: "ai_conectando")
  4. POST http://localhost:8000/outbound {
       phone, softwareId, leadId, llamadaId, spechId,
       businessType, businessName, city, agenteId
     }
  5. Actualizar registro con aiCallSid
  6. Emitir Socket.IO: "llamada:estado" -> frontend
}
```

**Webhook AI** (`procesarWebhookAI`):
```
Recibe eventos del agente Python:
  - call_ended: actualiza estado, duracion, transcript, grabacion
  - Actualiza estado del lead segun outcome:
      demo_agendada -> INTERESADO
      transferido -> CALIFICADO
      rechazado/optout -> RECHAZADO
      completada -> CONTACTADO
  - Crea entrada en lead_historial
  - Emite Socket.IO al frontend
```

### 4.5 WebSocket / Socket.IO

```typescript
// Rooms:
- `saas:${softwareId}`  -> todos los usuarios de ese SaaS
- `llamadas`            -> todos los usuarios en la pagina de llamadas

// Eventos emitidos:
- "llamada:estado"      -> { llamadaId, estado, modo, duracionSeg, outcome }
- "llamada:grabacion"   -> { llamadaId, grabacionUrl }
```

---

## 5. Componente: Frontend (`frontend/`)

### 5.1 Paginas

| Archivo | Ruta | Descripcion |
|---------|------|-------------|
| `page.tsx` | `/dashboard/llamadas` | Dashboard principal con 4 tabs |
| `probar-ai/page.tsx` | `/dashboard/llamadas/probar-ai` | Simulador de audio con microfono |

### 5.2 Componentes de Llamadas

| Componente | Proposito |
|------------|-----------|
| `LlamadaEnVivo.tsx` | Panel de llamada en curso (humano o AI). Timer, notas, transcript, post-llamada |
| `LlamadaIniciarModal.tsx` | Modal para iniciar llamada con seleccion de spech y telefono agente |
| `LlamadaStats.tsx` | Stats rapidas en el header (total, hoy, semana, tasa contacto) |
| `HistorialLlamadas.tsx` | Listado paginado con filtros (estado, modo, busqueda) y expandibles |
| `LeadSelector.tsx` | Selector de leads para llamar |
| `SimulacionChat.tsx` | Chat de simulacion por texto |
| `SimulacionConfig.tsx` | Configuracion de simulacion (lead simulado, spech) |
| `SimulacionFeedback.tsx` | Feedback post-simulacion |
| `SpechEditor.tsx` | Editor de guiones (spechs) con bloques estructurados |
| `SpechList.tsx` | Lista de spechs con acciones |
| `SpechViewer.tsx` | Vista previa de spech con variables substituidas |
| `AudioPlayer.tsx` | Reproductor de grabaciones |
| `spechHelpers.ts` | Helpers de formato, estados y colores |

### 5.3 Hook de Simulacion de Audio

`useLiveAudioSimulation` (`hooks/useLiveAudioSimulation.ts`):

```typescript
const {
  status,           // "idle" | "connecting" | "connected" | "error"
  error,            // mensaje de error
  transcripts,      // array de { role: "agente"|"prospecto", text: string }
  isAISpeaking,     // boolean
  isUserSpeaking,   // boolean
  recording,        // { userAudio, aiAudio, sampleRate, duration }
  start,            // (params) => void
  stop,             // () => void
  downloadWav,      // ("user" | "ai" | "both") => void
} = useLiveAudioSimulation();
```

**Flujo del hook**:
1. Conecta WebSocket a `ws://localhost:8000/simulate/live`
2. Captura microfono a 48kHz via `navigator.mediaDevices.getUserMedia()`
3. Downsample 48kHz -> 16kHz Int16 (con filtro de promedio movil anti-aliasing)
4. Envia audio Int16 al agente AI via WebSocket
5. Recibe audio PCM 24kHz Int16 del agente -> upsample a 48kHz Float32
6. Reproduce via ScriptProcessorNode con pre-buffer de 200ms
7. Detecta habla del usuario por RMS y barge-in
8. Al detener: guarda grabacion WAV descargable

### 5.4 Cliente API (`lib/api.ts`)

Funciones relacionadas con llamadas:

```typescript
apiClient.iniciarLlamada({ leadId, spechId?, telefonoAgente? })
apiClient.iniciarLlamadaAI({ leadId, spechId? })
apiClient.getLlamadas(params)              // filtros: softwareId, estado, modo, page...
apiClient.getLlamada(id)
apiClient.getLlamadasStats(softwareId?)
apiClient.getLlamadaAudio(id)
apiClient.actualizarNotasLlamada(id, { notasPost, calificacion, proximaAccion, nuevoEstadoLead })
apiClient.iniciarSimulacion({ softwareId, leadId?, spechId?, leadSimulado })
apiClient.enviarMensajeSimulacion(sid, texto)
apiClient.finalizarSimulacion(sid)
```

---

## 6. Flujo Completo de una Llamada AI

### Paso a paso:

```
[USUARIO en Frontend]
   |
   v
Selecciona lead "Dr. Martinez - Clinica Vet San Carlos" -> clic "Llamar con AI"
   |
   v
[FRONTEND]
POST /api/llamadas/iniciar-ai
  { leadId: "cm2abc...", spechId: "cm2def..." }
   |
   v
[BACKEND — llamadaAiService.ts]
1. Crea registro en DB: llamadaReal {
     id: "cm2ghi...", estado: "ai_conectando",
     leadId: "cm2abc...", spechId: "cm2def...",
     telefonoLead: "+525512345678", modo: "AI"
   }
2. POST http://localhost:8000/outbound {
     phone: "+525512345678",
     softwareId: "groomly",
     leadId: "cm2abc...",
     llamadaId: "cm2ghi...",
     spechId: "cm2def...",
     businessType: "veterinaria",
     businessName: "Clinica Vet San Carlos",
     city: "Ciudad de Mexico",
     agenteId: 42
   }
3. Emite Socket.IO: "llamada:estado" -> { llamadaId: "cm2ghi...", estado: "ai_conectando" }
   |
   v
[AGENTE AI — main.py]
1. Valida compliance MX: horario legal (9h-20h) + opt-out
2. Si bloqueado: responde 409 { status: "bloqueada", motivo: "horario" }
3. Si permitido:
   Twilio: client.calls.create()
     to: "+525512345678"
     from: "+1xxxxxxxxx"
     url: "https://agente.peluguau.com/voice?phone=...&lead_id=..."
     machine_detection: "DetectMessageEnd"
     record: true
4. Responde: { status: "iniciada", sid: "CAxxxx..." }
   |
   v
[TWILIO]
Marca al numero +525512345678
   |
   v
[LEAD CONTESTA]
   |
   v
[TWILIO -> GET /voice]
1. Genera TwiML:
   <Response>
     <Connect>
       <Stream url="wss://agente.peluguau.com/media">
         <Parameter name="phone" value="+525512345678" />
         <Parameter name="lead_id" value="cm2abc..." />
         ...
       </Stream>
     </Connect>
   </Response>
2. Dispara prewarm_session(call_sid) [fire-and-forget]
   |
   v
[TWILIO WS -> /media]
Evento "start":
  streamSid: "MZxxxx..."
  callSid: "CAxxxx..."
  customParameters: { phone, lead_id, spech_id, business_type, ... }
   |
   v
[AGENTE — media_stream.py]
1. Reclama sesion precalentada por callSid
2. (o crea nueva si no existe — cold start)
3. Carga lead desde PostgreSQL + spech
4. Construye system_prompt con datos del lead + contenido del spech
5. Selector de pipeline:
   - Si VOICE_PIPELINE=gemini -> GeminiLiveSession
   - Si VOICE_PIPELINE=elevenlabs -> HybridSession
6. Adjunta callbacks: send_to_twilio, on_interrupt, on_transcript
   |
   v
[CONVERSACION EN CURSO]
Lead habla -> Twilio envia audio mu-law 8k
  -> AudioBridge: mu-law -> PCM 16k
  -> Gemini Live: STT + procesamiento
  -> Gemini responde con audio PCM 24k
  -> AudioBridge: PCM 24k -> mu-law 8k
  -> Twilio reproduce al telefono

Durante la conversacion:
  - Detecta emocion, objeciones, frustracion
  - Si pide agendar demo -> tool call "agendar_demo" -> Cal.com
  - Si pide info por WhatsApp -> tool call "enviar_whatsapp" -> Twilio
  - Si quiere hablar con humano -> tool call "transferir_humano"
   |
   v
[LEAD COLGA / SE ACABA]
Twilio envia evento "stop"
   |
   v
[AGENTE — cierre]
1. Cierra sesion Gemini/ElevenLabs
2. Guarda en PostgreSQL:
   - outcome: "demo_agendada" | "transferido" | "rechazado" | ...
   - transcript: [{role:"agente", text:"Hola, soy Mariana..."}, ...]
   - durationS: 187
   - metadata: { emotion, frustration, turns }
3. Notifica backend:
   POST /api/llamadas/webhook/ai {
     event: "call_ended", callSid: "CAxxxx...",
     llamadaId: "cm2ghi...", outcome: "demo_agendada",
     transcript: [...], durationS: 187
   }
4. Alertas Slack si aplica
   |
   v
[BACKEND — webhook AI]
1. Actualiza llamadaReal: estado="demo_agendada", duracionSeg=187, transcript=...
2. Actualiza lead: estado="INTERESADO", ultimoContacto=now
3. Crea lead_historial: tipo="llamada_ai", descripcion="Demo agendada via llamada AI"
4. Emite Socket.IO: "llamada:estado" -> frontend
   |
   v
[FRONTEND]
Recibe evento Socket.IO -> actualiza LlamadaEnVivo
Muestra: estado "Demo agendada", duracion 3:07, transcript completo
Usuario puede: calificar, cambiar estado lead, escribir proxima accion
```

---

## 7. Modelo de Datos (Prisma)

### 7.1 `LlamadaReal`

```prisma
model LlamadaReal {
  id             String    @id @default(cuid())
  softwareId     String    // SaaS al que pertenece
  leadId         String    // Lead llamado
  spechId        String?   // Guion usado (opcional)
  agenteId       Int       // Usuario que inicio la llamada
  estado         String    @default("iniciando") // Ver tabla de estados
  direccion      String    @default("saliente")  // saliente | entrante
  telefonoLead   String    // Numero marcado
  telefonoAgente String?   // Numero del agente (modo humano)
  duracionSeg    Int?      // Duracion en segundos
  grabacionUrl   String?   // URL de grabacion (Twilio/Zadarma)
  notasPost      String?   // Notas del agente post-llamada
  leadEstadoPrev String?   // Estado del lead antes de llamar
  leadEstadoPost String?   // Estado del lead despues de llamar
  transcript     String?   @db.Text // Transcripcion JSON (modo AI)
  calificacion   Int?      // 1-5 estrellas
  proximaAccion  String?   // Ej: "Llamar martes 10h"
  zadarmaCallId  String?   // ID de llamada Zadarma
  modo           String    @default("HUMANO") // HUMANO | AI
  aiCallSid      String?   // CallSid de Twilio
  aiSessionId    String?   // Session ID del agente AI
  metadata       Json?     // Datos extras (webhooks, respuestas API...)
  iniciadaAt     DateTime? // Cuando empezo la llamada
  terminadaAt    DateTime? // Cuando termino
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  lead   Lead          @relation(fields: [leadId], references: [id])
  spech  SpechLlamada? @relation(fields: [spechId], references: [id])
  agente UsuarioCrm    @relation(fields: [agenteId], references: [id])
}
```

### 7.2 `SpechLlamada`

```prisma
model SpechLlamada {
  id          String   @id @default(cuid())
  softwareId  String
  titulo      String
  contenido   String   @db.Text  // JSON estructurado del guion
  objeciones  Json?    // Array de { objecion, respuesta }
  variables   Json?    // Variables soportadas
  esDefault   Boolean  @default(false)
  activo      Boolean  @default(true)
  tags        String[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  llamadas LlamadaReal[]
}
```

### 7.3 `SesionPruebaIA`

```prisma
model SesionPruebaIA {
  id            String   @id @default(cuid())
  softwareId    String
  agenteId      Int
  leadSimulado  Json     // { nombre, empresa, cargo, objeciones }
  spechId       String?
  mensajes      Json     // Historial de la conversacion
  feedback      Json?    // Evaluacion post-simulacion
  calificacion  Int?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

---

## 8. Pipelines de Voz

### 8.1 Pipeline 1: Gemini Live (default)

Configuracion: `VOICE_PIPELINE=gemini`

```
Twilio (mu-law 8kHz) <-> AudioBridge <-> Gemini Live API (PCM 16k in / 24k out)
                                       |
                                       +-- STT nativo
                                       +-- LLM nativo
                                       +-- TTS nativo
                                       +-- Tool calling nativo
                                       +-- VAD automatico
```

**Ventajas**:
- Mas simple, un solo servicio
- Buena latencia (~600ms primera respuesta)
- Tool calling integrado
- Transcripciones automaticas

**Desventajas**:
- Menos control sobre la estrategia comercial
- Voz menos configurable

### 8.2 Pipeline 2: ElevenLabs Hibrido

Configuracion: `VOICE_PIPELINE=elevenlabs`

```
Twilio (mu-law 8kHz) <-> AudioBridge <-> ElevenLabs STT (Scribe v2, PCM 16k)
                                               |
                                               v
                                       Mini Classifier (Gemini Flash)
                                               |
                                               v
                                       State Engine (probabilistico)
                                               |
                                               v
                                       Call Goal Tracker
                                               |
                                               v
                                       Gemini Chat (Flash) — naturalizador
                                               |
                                               v
                                       ElevenLabs TTS (Flash v2.5)
                                               |
                                               v
                                       Twilio (mu-law 8kHz)
```

**Ventajas**:
- Mejor calidad de voz (ElevenLabs Flash v2.5)
- Control total de la estrategia comercial (State Engine + Classifier)
- Pipeline optimizado para latencia (mu-law directo)

**Desventajas**:
- Mas complejo, mas puntos de fallo
- Requiere API key de ElevenLabs

### 8.3 Selector de Pipeline

En `app/config.py`:
```python
voice_pipeline: str = "gemini"  # "gemini" | "elevenlabs"
```

En `app/telephony/media_stream.py`, `_build_session()`:
```python
use_elevenlabs = (
    settings.voice_pipeline == "elevenlabs"
    and settings.elevenlabs_api_key
)
if use_elevenlabs:
    session = HybridSession(ctx=ctx, system_prompt=system_prompt)
else:
    session = GeminiLiveSession(ctx=ctx, system_prompt=system_prompt)
```

---

## 9. Herramientas del Agente (Tools)

El agente puede invocar 7 funciones durante la llamada:

| Tool | Descripcion | Ejemplo |
|------|-------------|---------|
| `consultar_crm` | Obtener historial del prospecto | "Déjeme ver sus datos..." |
| `buscar_caso_de_exito` | Buscar caso relevante por nicho | "Una veterinaria en Guadalajara similar a la suya aumento sus citas 40%..." |
| `calcular_roi` | Calcular retorno de inversión | "Con 20 citas/semana recuperaria el costo en 2 semanas..." |
| `comparar_con_competidor` | Comparar con herramienta actual | "A diferencia de Excel, nosotros automatizamos los recordatorios..." |
| `agendar_demo` | Agendar demo en Cal.com | "¿Le queda mejor mañana a las 3?" -> link de Cal.com |
| `enviar_whatsapp` | Enviar seguimiento por WhatsApp | "Le mando el link por WhatsApp en este momento" |
| `transferir_humano` | Transferir a vendedor humano | "Le paso con un especialista que puede resolverle eso" |

Las tools se declaran en `app/gemini/tools.py` y se pasan a Gemini Live como `function_declarations`. Cuando Gemini invoca una tool, el agente la ejecuta y devuelve el resultado en la misma sesion.

---

## 10. Estados de Llamada

### Modo Humano (Zadarma)

```
iniciando -> esperando_agente -> agente_descolgo -> llamando_lead -> en_curso
                                                              |
                    +-------------------------------------------+
                    v
            completada | fallida | no_contesta | cancelada
```

### Modo AI (Agente Python)

```
ai_conectando -> en_curso
                    |
                    v
            completada | fallida | no_contesta | cancelada |
            rechazado | optout | transferido
```

### Mapping de Outcomes a Estado Lead

| Outcome AI | Estado Lead | Descripcion |
|------------|-------------|-------------|
| `demo_agendada` | `INTERESADO` | Demo agendada via Cal.com |
| `transferido` | `CALIFICADO` | Lead pidio hablar con humano |
| `rechazado` / `optout` | `RECHAZADO` | Lead rechazo o pidio no llamar |
| `completada` | `CONTACTADO` | Llamada terminada normalmente |

---

## 11. Simulaciones

### 11.1 Simulacion por Texto

**Ruta**: `/dashboard/llamadas` -> Tab "Practicar"

1. Usuario configura un lead simulado (nombre, empresa, cargo, objeciones)
2. Selecciona un spech (opcional)
3. Clic "Iniciar practica"
4. Frontend -> POST `/api/llamadas/simular-ai/start` -> Backend -> POST `/simulate/start` -> Agente AI
5. El agente responde con un saludo inicial
6. Usuario escribe como si fuera el lead
7. Frontend -> POST `/api/llamadas/simular-ai/{sid}/mensaje` -> Backend -> POST `/simulate/{sid}/message`
8. El agente responde en contexto
9. Al finalizar: POST `/api/llamadas/simular-ai/{sid}/finalizar` -> feedback con calificacion

### 11.2 Simulacion con Audio Real

**Ruta**: `/dashboard/llamadas/probar-ai`

1. Usuario selecciona un lead real de la base de datos
2. Selecciona un spech (opcional)
3. Clic "Iniciar llamada simulada"
4. Frontend se conecta **directamente** al agente AI via WebSocket: `ws://localhost:8000/simulate/live`
5. Se solicita acceso al microfono
6. El usuario habla por microfono y escucha la respuesta de la IA por los auriculares
7. La IA usa el **mismo pipeline** que en llamadas reales (mismo prompt, mismo spech, mismo modelo)
8. Transcripciones en tiempo real
9. Al colgar: descarga de grabacion WAV (voz del usuario + voz de la IA)

**Flujo de audio en simulacion**:
```
Microfono (48kHz Float32)
  -> ScriptProcessorNode
  -> downsampleFloat32ToInt16(48k -> 16k)
  -> WebSocket -> Agente AI

Agente AI (PCM 24kHz Int16)
  -> WebSocket
  -> upsampleInt16ToFloat32(24k -> 48k)
  -> ScriptProcessorNode (playback)
  -> Altavoces
```

---

## 12. Configuracion y Variables de Entorno

### 12.1 Agente AI (`llamadas/.env`)

```bash
# === Gemini ===
GEMINI_API_KEY=xxxxxxxx
GEMINI_LIVE_MODEL=gemini-3.1-flash-live-preview
GEMINI_LIVE_FALLBACK_MODEL=gemini-2.5-flash-native-audio-latest
GEMINI_VOICE=Leda
GEMINI_LANGUAGE=es-US

# === Gemini Chat (pipeline hibrido) ===
GEMINI_CHAT_MODEL=gemini-2.5-flash

# === ElevenLabs (pipeline hibrido) ===
ELEVENLABS_API_KEY=xxxxxxxx
ELEVENLABS_VOICE_ID=pNInz6obpgDQGcFmaJgB  # Adam (espanol neutro)
ELEVENLABS_TTS_FORMAT=ulaw_8000
ELEVENLABS_STT_SAMPLE_RATE=16000
ELEVENLABS_LATENCY_OPT=4

# === Pipeline selector ===
# "gemini" = nativo | "elevenlabs" = hibrido
VOICE_PIPELINE=gemini

# === VAD / latencia ===
VAD_SILENCE_MS=500
VAD_PREFIX_PADDING_MS=150
VAD_START_SENSITIVITY=HIGH
VAD_END_SENSITIVITY=HIGH

# === Comportamiento ===
FRUSTRATION_ALERT_THRESHOLD=5
LONG_CALL_SECONDS=480
ENABLE_INPUT_DSP=false

# === Twilio ===
TWILIO_ACCOUNT_SID=ACxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxx
TWILIO_FROM_NUMBER=+1xxxxxxxxx
HUMAN_TRANSFER_NUMBER=+52xxxxxxxxx

# === Servidor ===
PUBLIC_HOST=agente.peluguau.com
PORT=8000
LOG_LEVEL=INFO

# === Storage ===
REDIS_URL=redis://localhost:6379/0
DATABASE_URL=postgresql://...

# === Webhook hacia backend Express ===
BACKEND_WEBHOOK_URL=https://api.peluguau.com
BACKEND_WEBHOOK_SECRET=xxxxxxxx

# === Agendado ===
CALCOM_API_KEY=xxxxxxxx
CALCOM_EVENT_TYPE_ID=xxxxxxxx

# === Alertas ===
SLACK_WEBHOOK_URL=https://hooks.slack.com/...

# === Compliance ===
DISCLOSE_AI=true
CALL_HOUR_START=9
CALL_HOUR_END=20
```

### 12.2 Backend (`backend/.env`)

```bash
# URLs del agente AI
AI_AGENT_URL=http://localhost:8000
AI_AGENT_SECRET=xxxxxxxx  # Debe coincidir con BACKEND_WEBHOOK_SECRET del agente

# Zadarma (llamadas humanas)
ZADARMA_KEY=xxxxxxxx
ZADARMA_SECRET=xxxxxxxx
ZADARMA_DEFAULT_AGENT_PHONE=+52xxxxxxxxx

# Socket.IO
SOCKET_CORS_ORIGIN=http://localhost:3000
```

### 12.3 Frontend (`frontend/.env.local`)

```bash
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_AI_AGENT_WS_URL=ws://localhost:8000/simulate/live
```

---

## 13. Servicios Externos y Costos

| Servicio | Uso | Costo estimado |
|----------|-----|----------------|
| **Google Gemini** | Voz AI (Live API), Chat (Flash), Embeddings | Gratuito en preview (~$0.012/min cuando sea de pago) |
| **Twilio** | Telefonia: llamadas salientes, Media Streams, grabaciones | ~$0.014-0.05/min (fijo/movil MX) |
| **ElevenLabs** | STT (Scribe v2) + TTS (Flash v2.5) | Variable segun uso |
| **Zadarma** | Click-to-call para llamadas humanas | Segun plan contratado |
| **Cal.com** | Agendado de demos | Gratuito (API key propia) |
| **PostgreSQL** | Base de datos compartida | Infra propia |
| **Redis** | Estado de conversacion en memoria | Infra propia |
| **Slack** | Alertas del sistema | Webhook gratuito |

### Latencias medidas

| Componente | Latencia |
|------------|----------|
| VAD endpointing | ~500ms |
| Red telefono -> Twilio -> servidor | ~50-150ms |
| Inferencia Gemini (1er audio) | ~600ms |
| Servidor -> Twilio -> telefono | ~50-100ms |
| **Total percibido** | **~1.0-1.3s** |
| Pre-calentamiento sesion | ~312ms (fuera del camino critico) |

---

## 14. Como Usar el Sistema

### 14.1 Llamar a un Lead con AI

1. Ve a `/dashboard/llamadas`
2. Selecciona tu SaaS/negocio en el dropdown superior derecho
3. En la lista de leads, elige uno con telefono
4. Asegurate de que el modo este en "AI" (toggle Humano/AI)
5. Clic en "Llamar con AI"
6. En el modal, selecciona un spech (guion) si quieres
7. Clic en "Confirmar"
8. Veras el panel `LlamadaEnVivo` con el estado "AI conectando"
9. Cuando el lead conteste, el estado cambia a "En curso"
10. Al terminar: se muestra el transcript, calificacion, y opciones post-llamada

### 14.2 Llamar a un Lead con Humano (Zadarma)

1. Ve a `/dashboard/llamadas`
2. Selecciona el modo "Humano"
3. Elige un lead con telefono
4. Clic en "Llamar ahora"
5. En el modal, ingresa tu telefono (o usa el default configurado)
6. Clic en "Confirmar"
7. Zadarma llamara primero a tu telefono, luego al del lead
8. Usa las notas en vivo y la chuleta de objeciones durante la llamada
9. Al colgar: califica, cambia estado del lead, escribe proxima accion

### 14.3 Practicar con la IA (Simulacion por Texto)

1. Ve a `/dashboard/llamadas` -> Tab "Practicar"
2. Configura un lead simulado (nombre, empresa, objeciones)
3. Selecciona un spech (opcional)
4. Clic en "Iniciar practica"
5. El agente saludara como si fuera una llamada real
6. Escribe como si fueras el lead (objeciones, preguntas, etc.)
7. Practica tus respuestas con la guia del spech
8. Clic en "Finalizar" para ver feedback

### 14.4 Probar la IA con Audio Real

1. Ve a `/dashboard/llamadas/probar-ai`
2. Selecciona un lead real (la IA usara sus datos)
3. Selecciona un spech (opcional)
4. Clic en "Iniciar llamada simulada"
5. Permite acceso al microfono cuando el navegador lo pida
6. Habla normalmente como si fueras el lead
7. Escucha la respuesta de la IA por los auriculares
8. Puedes interrumpirla hablando (barge-in)
9. Clic en "Colgar" para terminar
10. Descarga la grabacion WAV si quieres revisar

### 14.5 Crear y Gestionar Spechs (Guiones)

1. Ve a `/dashboard/llamadas` -> Tab "Spechs"
2. Clic en "Nuevo" para crear un guion
3. Escribe el contenido con bloques estructurados:
   - Saludo
   - Presentacion
   - Preguntas de calificacion
   - Propuesta de valor
   - Cierre
   - Objeciones y respuestas
4. Usa variables dinamicas: `{{nombre}}`, `{{empresa}}`, `{{ciudad}}`
5. Marca uno como "default" para que se use automaticamente
6. Los spechs se guardan por SaaS

---

## Resumen de Comunicacion entre Componentes

```
┌─────────────┐         REST + JWT          ┌─────────────┐
│  FRONTEND   │ <-------------------------> │   BACKEND   │
│  Next.js    │                           │  Express    │
│             │      Socket.IO (realtime)   │             │
│             │ <-------------------------> │             │
│             │                             │             │
│             │   WS directo (simulacion    │             │
│             │   audio)                    │             │
│             │ <---------
│             │           
└─────────────┘           
                          
                          WS directo
                          (simulacion audio)
                          ┌─────────────┐
                          │  AGENTE AI  │
                          │   FastAPI   │
                          │             │
                          │  ┌───────┐  │
                          │  │Gemini │  │
                          │  │Live   │  │
                          │  └───┬───┘  │
                          │      │      │
                          │  ┌───┴───┐  │
                          │  │Twilio │  │
                          │  │Voice  │  │
                          │  └───────┘  │
                          └─────────────┘
                               │
                          ┌────┴────┐
                          │  RED    │
                          │TELEFONICA│
                          └────┬────┘
                               │
                          ┌────┴────┐
                          │  LEAD   │
                          │(prospecto)│
                          └─────────┘

Backend <-> Agente AI:
  - Backend -> Agente: POST /outbound (iniciar llamada)
  - Backend -> Agente: POST /simulate/* (simulaciones)
  - Agente -> Backend: POST /api/llamadas/webhook/ai (estado)
```

---

*Documentacion generada el 2026-06-02. Para actualizaciones, revisa el codigo fuente en `llamadas/`, `backend/src/routes/llamadas.ts`, y `frontend/src/app/dashboard/llamadas/`.*

*Mas info en peluguau.com*
