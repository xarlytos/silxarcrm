# 📞 Documentación Completa del Centro de Llamadas

> **peluguau.com** — Sistema de llamadas con agente AI (Mariana) + llamadas humanas (Zadarma)

---

## Índice

1. [Arquitectura General](#1-arquitectura-general)
2. [El Agente de Voz AI (`llamadas/`)](#2-el-agente-de-voz-ai-llamadas)
3. [Backend Express (`backend/`)](#3-backend-express-backend)
4. [Frontend Next.js (`frontend/`)](#4-frontend-nextjs-frontend)
5. [Flujo de Datos End-to-End](#5-flujo-de-datos-end-to-end)
6. [Modelo de Datos (Prisma)](#6-modelo-de-datos-prisma)
7. [Páginas y Componentes del Frontend](#7-páginas-y-componentes-del-frontend)
8. [Modos de Operación](#8-modos-de-operación)
9. [Webhooks y Eventos en Tiempo Real](#9-webhooks-y-eventos-en-tiempo-real)
10. [Configuración y Variables de Entorno](#10-configuración-y-variables-de-entorno)

---

## 1. Arquitectura General

El sistema de llamadas es un **ecosistema de 3 capas**:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (Next.js 14)                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │ /dashboard/ │  │ /dashboard/ │  │ /dashboard/ │  │ /dashboard/llamadas/│ │
│  │   llamadas  │  │ llamadas/   │  │   leads     │  │     probar-ai       │ │
│  │   (page)    │  │ probar-ai   │  │   (page)    │  │      (page)         │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘ │
│         │                │                │                    │            │
│         └────────────────┴────────────────┴────────────────────┘            │
│                              REST API + Socket.IO                            │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ HTTP / WS
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                        BACKEND EXPRESS (Node.js)                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │  /api/      │  │  /api/      │  │  /api/      │  │   WebSocket Server  │ │
│  │  llamadas   │  │   leads     │  │   spechs    │  │   (Socket.IO)       │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘ │
│         │                │                │                    │            │
│         └────────────────┴────────────────┴────────────────────┘            │
│                              Prisma ORM → PostgreSQL                         │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ HTTP Webhooks
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                     AGENTE AI PYTHON (FastAPI)                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   /voice    │  │   /media    │  │  /outbound  │  │   /simulate/live    │ │
│  │  (TwiML)    │  │  (WebSocket)│  │ (llamadas)  │  │  (simulación audio) │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘ │
│         │                │                │                    │            │
│         └────────────────┴────────────────┴────────────────────┘            │
│                          Gemini Live API + Twilio                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Tecnologías clave

| Capa | Tecnología | Puerto típico |
|------|-----------|---------------|
| Frontend | Next.js 14 (App Router), React, TailwindCSS | 3000 |
| Backend | Express.js, TypeScript, Prisma, Socket.IO | 5000 |
| Agente AI | Python 3.11, FastAPI, google-genai, Twilio | 8000 |
| Base de datos | PostgreSQL (compartida entre backend y agente) | 5432 |

---

## 2. El Agente de Voz AI (`llamadas/`)

Este es el **corazón del sistema**. Es un servidor FastAPI en Python que orquesta llamadas de voz usando Google Gemini Live API + Twilio.

### 2.1 Estructura de directorios

```
llamadas/
├── app/
│   ├── main.py                    # Entry point FastAPI (endpoints HTTP + WS)
│   ├── config.py                  # Settings desde .env
│   ├── audio/
│   │   ├── bridge.py              # Conversión μ-law ↔ PCM
│   │   └── dsp.py                 # Preprocesado de audio (noise gate, AGC)
│   ├── telephony/
│   │   ├── twilio_client.py       # Cliente Twilio: outbound calls, TwiML, WhatsApp
│   │   └── media_stream.py        # Orquestador WebSocket Twilio ↔ Gemini
│   ├── gemini/
│   │   ├── live_session.py        # Sesión Gemini Live (audio bidireccional)
│   │   ├── tools.py               # Function calling (8 herramientas)
│   │   └── model_provider.py      # Plan de fallback + reintentos
│   ├── conversation/
│   │   ├── prompts.py             # System prompt multi-capa (Mariana)
│   │   ├── state.py               # CallContext + ConversationStore
│   │   ├── signals.py             # Análisis de emociones/frustración
│   │   └── state_engine.py        # Motor de estado comercial
│   ├── simulation/
│   │   ├── text_session.py        # Simulador por texto (sin Twilio)
│   │   └── live_audio.py          # Simulador con audio real (WebSocket navegador)
│   ├── crm/
│   │   ├── postgres_repo.py       # Acceso a PostgreSQL compartido
│   │   └── supabase_repo.py       # Fallback a Supabase (legacy)
│   ├── knowledge/
│   │   └── rag.py                 # Retrieval de casos de éxito
│   ├── compliance/
│   │   └── mx.py                  # Compliance MX (horario, opt-out)
│   ├── elevenlabs/
│   │   └── hybrid_session.py      # Pipeline híbrido ElevenLabs + Gemini Chat
│   └── observability/
│       └── metrics.py             # Métricas y alertas
├── tests/                         # Tests unitarios
├── scripts/                       # Scripts de utilidad
└── requirements.txt
```

### 2.2 Endpoints del Agente AI

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET/POST` | `/voice` | Webhook Twilio al contestar. Devuelve TwiML con `<Connect><Stream>` |
| `WS` | `/media` | WebSocket bidireccional de audio (Twilio ↔ Gemini) |
| `POST` | `/outbound` | Inicia una llamada saliente con compliance checks |
| `POST` | `/simulate/start` | Inicia simulación de texto (probar AI sin Twilio) |
| `POST` | `/simulate/{sid}/message` | Envía mensaje en simulación de texto |
| `WS` | `/simulate/live` | Simulación con audio real desde el navegador |
| `GET` | `/status` | Healthcheck + métricas + configuración activa |
| `POST` | `/webhook/status` | Recibe notificaciones de estado del media stream |

### 2.3 Pipeline de Audio

```
┌──────────┐    μ-law 8kHz    ┌─────────────┐    PCM 16kHz    ┌──────────────┐
│  Twilio  │ ────────────────>│ AudioBridge │ ───────────────>│ Gemini Live  │
│  (tel)   │                  │  (convert)  │                 │   (STT+LLM)  │
│          │ <────────────────│             │ <───────────────│   (TTS)      │
└──────────┘    μ-law 8kHz    └─────────────┘    PCM 24kHz    └──────────────┘
```

**Flujo detallado:**

1. **Twilio** recibe la llamada y abre un Media Stream enviando audio en **μ-law 8kHz**
2. **`AudioBridge`** convierte μ-law → PCM 16kHz (para Gemini) y PCM 24kHz → μ-law 8kHz (para Twilio)
3. **`GeminiLiveSession`** conecta con Gemini Live API enviando PCM 16kHz y recibiendo PCM 24kHz
4. **VAD (Voice Activity Detection)** configurado con 500ms de silencio para endpointing rápido
5. **Barge-in**: si el usuario interrumpe, se envía `clear` a Twilio para cortar reproducción

### 2.4 La Personalidad: Mariana

Mariana es el avatar de ventas de GestPro. Su prompt (`app/conversation/prompts.py`) tiene 5 capas:

1. **Identidad**: Asesora comercial de GestPro, acento mexicano neutro
2. **Voz y Prosodia**: Instrucciones para que suene humana (pausas, muletillas, dudas, risas)
3. **Reglas de Supervivencia**: Cómo manejar interrupciones, insultos, cambios de tema, opt-out
4. **Flujo de Llamada**: Saludo → Interés → Objeción → Agendar demo → Despedida
5. **Guiones por Nicho**: Veterinaria, peluquería canina, dentista, gimnasio, yoga, terapeuta, entrenador

**Objetivo único de la llamada**: Agendar una demo de ~15 minutos. **No cerrar venta**.

### 2.5 Tools (Function Calling)

El agente tiene **7 herramientas** disponibles durante la llamada:

| Tool | Descripción | Ejemplo de uso |
|------|-------------|----------------|
| `consultar_crm` | Obtiene datos del lead desde PostgreSQL | "¿Ya nos había contactado antes?" |
| `buscar_caso_de_exito` | Busca caso de éxito por tipo de negocio | "Una veterinaria similar redujo cancelaciones" |
| `calcular_roi` | Calcula ROI con datos del prospecto | "Con 20 citas/semana y 5 cancelaciones..." |
| `comparar_con_competidor` | Compara con herramienta actual | "Vs. Excel, nosotros recordamos automáticamente" |
| `agendar_demo` | Agenda demo en Cal.com | "¿Le queda bien mañana a las 3?" |
| `enviar_whatsapp` | Envía seguimiento por WhatsApp | "Le mando la info por WhatsApp" |
| `transferir_humano` | Transfiere a vendedor humano | "Le paso con un especialista" |

### 2.6 Pipelines de Voz

El agente soporta **dos pipelines** configurables:

| Pipeline | Modelo STT | LLM | TTS | Latencia |
|----------|-----------|-----|-----|----------|
| `gemini` (default) | Gemini Live nativo | Gemini Live nativo | Gemini Live nativo | ~800ms |
| `elevenlabs` | ElevenLabs STT | Gemini Chat (texto) | ElevenLabs TTS | ~600ms |

Configurado vía `VOICE_PIPELINE` en `.env`.

### 2.7 Pre-calentamiento de Sesiones

Para reducir la latencia de la primera respuesta:

1. Cuando el backend llama a `/outbound`, Twilio inicia la llamada
2. Al contestar, Twilio hace `POST` a `/voice`
3. `/voice` inicia `prewarm_session()` en **background** (fire-and-forget)
4. El prewarm hace el handshake con Gemini mientras suena el timbre
5. Cuando el prospecto contesta y abre `/media`, la sesión ya está lista

---

## 3. Backend Express (`backend/`)

El backend es el **orquestador central** que conecta frontend, base de datos y agente AI.

### 3.1 Rutas de Llamadas (`src/routes/llamadas.ts`)

```typescript
// Webhooks (sin auth)
POST /api/llamadas/webhook/zadarma     // Webhook de Zadarma (llamadas humanas)
POST /api/llamadas/webhook/ai          // Webhook del agente AI (estado de llamadas)

// Con autenticación
GET    /api/llamadas                   // Listar llamadas con filtros + paginación
GET    /api/llamadas/stats             // Estadísticas de llamadas
GET    /api/llamadas/:id               // Obtener una llamada
POST   /api/llamadas/iniciar           // Iniciar llamada humana (Zadarma)
POST   /api/llamadas/iniciar-ai        // Iniciar llamada AI (agente Python)
PUT    /api/llamadas/:id/notas         // Actualizar notas post-llamada
GET    /api/llamadas/:id/audio         // Obtener URL de grabación
DELETE /api/llamadas/:id               // Eliminar llamada

// Simulación AI
POST   /api/llamadas/simular-ai/start  // Iniciar simulación AI
POST   /api/llamadas/simular-ai/:sid/mensaje  // Enviar mensaje en simulación
```

### 3.2 Servicio de Llamadas Humanas (`src/services/llamadaService.ts`)

Maneja llamadas a través de **Zadarma** (VoIP):

**Flujo de llamada humana:**
1. Usuario selecciona lead y hace clic en "Llamar"
2. Backend crea registro en `LlamadaReal` con estado `iniciando`
3. Llama a Zadarma `clickToCall` (llama al agente primero, luego al lead)
4. Zadarma devuelve `call_id` → estado cambia a `esperando_agente`
5. Webhooks de Zadarma actualizan el estado en tiempo real:
   - `NOTIFY_START` → `esperando_agente`
   - `NOTIFY_INTERNAL` → `agente_descolgo`
   - `NOTIFY_OUT_START` → `llamando_lead`
   - `NOTIFY_ANSWER` → `en_curso`
   - `NOTIFY_END` → `completada` / `no_contesta` / `cancelada`
6. Al terminar, se guarda duración y grabación

**Estados de llamada humana:**
```
iniciando → esperando_agente → agente_descolgo → llamando_lead → en_curso → completada/fallida/no_contesta/cancelada
```

### 3.3 Servicio de Llamadas AI (`src/services/llamadaAiService.ts`)

Maneja llamadas a través del **agente Python**:

**Flujo de llamada AI:**
1. Usuario selecciona lead y hace clic en "Llamar con AI"
2. Backend crea registro en `LlamadaReal` con estado `ai_conectando` y modo `AI`
3. Backend hace `POST` al agente Python en `/outbound` con:
   - `phone`, `softwareId`, `leadId`, `llamadaId`, `spechId`, `businessType`, etc.
4. El agente Python inicia la llamada vía Twilio
5. Durante la llamada, el agente envía webhooks al backend con actualizaciones
6. Al terminar, el agente notifica `call_ended` con transcript, outcome, duración

**Outcomes posibles de llamada AI:**
- `completada` — Llamada terminada normalmente
- `demo_agendada` — El lead aceptó una demo
- `transferido` — Se transfirió a humano
- `rechazado` — El lead rechazó
- `optout` — El lead pidió no ser llamado
- `no_contesta` — No contestó
- `fallida` — Error técnico

**Actualización automática del lead:**
- `demo_agendada` → Estado `INTERESADO`
- `transferido` → Estado `CALIFICADO`
- `rechazado` / `optout` → Estado `RECHAZADO`
- `completada` → Estado `CONTACTADO`

### 3.4 WebSocket (Socket.IO)

El backend emite eventos en tiempo real a los clientes conectados:

```typescript
// Canales
io.to(`saas:${softwareId}`).emit(...)   // Eventos por software
io.to(`llamadas`).emit(...)             // Eventos globales de llamadas

// Eventos emitidos
'llamada:estado'       // Cambio de estado de llamada
'llamada:grabacion'    // Grabación disponible
```

El frontend se une a estos canales para ver actualizaciones en vivo.

---

## 4. Frontend Next.js (`frontend/`)

### 4.1 Estructura de páginas de Llamadas

```
frontend/src/app/dashboard/llamadas/
├── page.tsx              # Centro de Llamadas principal (4 tabs)
└── probar-ai/
    └── page.tsx          # Página para probar agente AI con audio real
```

### 4.2 Página Principal: `/dashboard/llamadas`

Es la página más compleja del frontend. Tiene **4 tabs**:

#### Tab 1: "Llamar" (`tab === 'llamar'`)

Layout de 2 columnas:
- **Izquierda (4/12)**: Lista de leads con `LeadSelector`. Muestra leads del software seleccionado, filtrados por los que tienen teléfono.
- **Derecha (8/12)**: Panel de acción
  - Si hay llamada activa: muestra `LlamadaEnVivo` (estado en tiempo real)
  - Si hay lead seleccionado pero sin llamada: muestra info del lead + selector de modo (Humano/AI) + botón "Llamar"
  - Si no hay lead seleccionado: estado vacío

**Selector de modo:**
- **Humano**: Usa Zadarma (click-to-call). El agente del CRM recibe la llamada en su teléfono.
- **AI**: Usa el agente Python. Mariana (la IA) llama directamente al lead.

**Modal de inicio** (`LlamadaIniciarModal`):
- Permite seleccionar spech (guion) a usar
- En modo humano: permite ingresar teléfono del agente

#### Tab 2: "Practicar" (`tab === 'practicar'`)

Simulador de conversaciones para entrenar al equipo de ventas:

- **Configuración** (`SimulacionConfig`): Elige spech y configura lead simulado (nombre, empresa, personalidad, dificultad)
- **Chat** (`SimulacionChat`): Conversación por texto con la IA actuando como lead simulado
- **Feedback** (`SimulacionFeedbackView`): Al finalizar, la IA evalúa la conversación con puntuaciones por categoría

**Flujo:**
1. Configurar lead simulado + spech → "Iniciar práctica"
2. El usuario (vendedor) escribe como si fuera la llamada
3. La IA responde como el lead simulado
4. Al finalizar, la IA genera feedback con puntuación global y áreas de mejora

#### Tab 3: "Spechs" (`tab === 'spechs'`)

Gestión de guiones de llamada:

- **Lista** (izquierda): Todos los spechs del software. Acciones: seleccionar, editar, duplicar, eliminar, marcar como default
- **Editor** (derecha): Crear/editar spech con:
  - Título
  - Contenido (con variables `{{nombre}}`, `{{empresa}}`, `{{ciudad}}`, `{{telefono}}`, `{{cargo}}`)
  - Objetivo (Cierre, Información, Seguimiento)
  - Objeciones (lista de objeción + respuesta)

#### Tab 4: "Historial" (`tab === 'historial'`)

Lista paginada de todas las llamadas realizadas:

- Filtros por estado, modo (Humano/AI), búsqueda por nombre/teléfono
- Expandible: muestra detalles al hacer clic
- Información mostrada:
  - Lead, teléfono, estado, duración
  - Notas post-llamada
  - Transcripción (modo AI)
  - Grabación de audio con reproductor
  - Cambio de estado del lead
  - Calificación con estrellas
  - Próxima acción

### 4.3 Página Probar AI: `/dashboard/llamadas/probar-ai`

Página dedicada a **probar el agente AI con audio real** sin necesidad de Twilio:

**Funcionamiento:**
1. Seleccionas un lead (tú actúas como ese lead)
2. Opcionalmente seleccionas un spech
3. Haces clic en "Iniciar llamada simulada"
4. El navegador pide permiso de micrófono
5. Se abre WebSocket directo al agente Python en `/simulate/live`
6. Hablas por micrófono → el agente responde por audio
7. Se muestran transcripciones en tiempo real
8. Al colgar, puedes descargar la grabación como WAV

**Tecnología:** Usa el hook `useLiveAudioSimulation` que maneja:
- WebSocket binario con el agente Python
- AudioContext de Web Audio API a 48kHz
- Captura de micrófono con downsample 48→16kHz
- Reproducción con upsample 24→48kHz
- Grabación de ambos canales (usuario + IA)
- Codificación WAV para descarga

### 4.4 Componentes Clave

| Componente | Ubicación | Descripción |
|-----------|-----------|-------------|
| `LlamadaEnVivo` | `components/llamadas/LlamadaEnVivo.tsx` | Panel de llamada en curso con cronómetro, notas, objeciones, transcript |
| `HistorialLlamadas` | `components/llamadas/HistorialLlamadas.tsx` | Lista paginada con filtros y expandibles |
| `LlamadaStats` | `components/llamadas/LlamadaStats.tsx` | Tarjetas de estadísticas (total, hoy, semana, tasa contacto) |
| `LeadSelector` | `components/llamadas/LeadSelector.tsx` | Lista seleccionable de leads |
| `SpechList` | `components/llamadas/SpechList.tsx` | Lista de spechs con acciones |
| `SpechEditor` | `components/llamadas/SpechEditor.tsx` | Formulario CRUD de spechs |
| `SpechViewer` | `components/llamadas/SpechViewer.tsx` | Vista previa del spech con variables resueltas |
| `SimulacionChat` | `components/llamadas/SimulacionChat.tsx` | Chat de práctica con IA |
| `SimulacionConfig` | `components/llamadas/SimulacionConfig.tsx` | Configuración del lead simulado |
| `SimulacionFeedbackView` | `components/llamadas/SimulacionFeedbackView.tsx` | Feedback post-simulación |
| `LlamadaIniciarModal` | `components/llamadas/LlamadaIniciarModal.tsx` | Modal para iniciar llamada |
| `AudioPlayer` | `components/llamadas/AudioPlayer.tsx` | Reproductor de grabaciones |

### 4.5 Hook de Audio (`useLiveAudioSimulation.ts`)

Hook custom que maneja toda la comunicación de audio en tiempo real:

```typescript
const {
  status,        // 'idle' | 'connecting' | 'connected' | 'error'
  error,         // Mensaje de error
  transcripts,   // Array de {role, text}
  isAISpeaking,  // boolean
  isUserSpeaking,// boolean
  recording,     // {userAudio, aiAudio, sampleRate, duration}
  start,         // (params) => void
  stop,          // () => void
  downloadWav,   // ('user' | 'ai' | 'both') => void
} = useLiveAudioSimulation();
```

**Flujo de audio:**
```
Mic (48kHz Float32) → ScriptProcessor → Downsample → Int16 16kHz → WebSocket → Agente Python
                                                                     ↑
Web Audio API ← ScriptProcessor ← Upsample ← Int16 24kHz ← WebSocket ← Gemini Live
```

---

## 5. Flujo de Datos End-to-End

### 5.1 Llamada Humana (Zadarma)

```
[Usuario] selecciona lead → "Llamar" (modo HUMANO)
  ↓
[Frontend] POST /api/llamadas/iniciar {leadId, spechId, telefonoAgente}
  ↓
[Backend] Crea LlamadaReal (estado: iniciando)
  ↓
[Backend] Zadarma clickToCall(from: agente, to: lead)
  ↓
[Zadarma] Llama al agente → agente descuelga → llama al lead
  ↓
[Zadarma] Webhooks NOTIFY_* → Backend actualiza estado
  ↓
[Backend] Emite Socket.IO 'llamada:estado' → Frontend actualiza UI
  ↓
[Llamada termina] Zadarma envía NOTIFY_END + recording_url
  ↓
[Backend] Actualiza estado, duración, grabación
  ↓
[Usuario] Abre historial → reproduce grabación → añade notas/calificación
```

### 5.2 Llamada AI (Agente Python)

```
[Usuario] selecciona lead → "Llamar con AI" (modo AI)
  ↓
[Frontend] POST /api/llamadas/iniciar-ai {leadId, spechId}
  ↓
[Backend] Crea LlamadaReal (estado: ai_conectando, modo: AI)
  ↓
[Backend] POST /outbound al agente Python
  ↓
[Agente Python] Twilio.calls.create() → inicia llamada al lead
  ↓
[Twilio] Lead contesta → POST /voice al agente
  ↓
[Agente] Responde TwiML con <Connect><Stream> → abre WS /media
  ↓
[Agente] Media Stream ↔ Gemini Live (audio bidireccional)
  ↓
[Durante llamada] Agente ejecuta tools, detecta emociones, maneja objeciones
  ↓
[Llamada termina] Agente guarda en PostgreSQL + envía webhook al backend
  ↓
[Backend] Recibe webhook AI → actualiza estado, transcript, outcome
  ↓
[Backend] Actualiza estado del lead según outcome
  ↓
[Backend] Emite Socket.IO → Frontend muestra resultado
```

### 5.3 Simulación de Práctica (Texto)

```
[Usuario] Tab "Practicar" → configura lead simulado → "Iniciar"
  ↓
[Frontend] POST /api/simulacion/iniciar {softwareId, leadSimulado, spechId}
  ↓
[Backend] Crea SesionPruebaIA en DB
  ↓
[Usuario] Escribe mensaje → POST /api/simulacion/{id}/mensaje
  ↓
[Backend] Envía a simulador AI (llama al agente Python /simulate/start y /simulate/{sid}/message)
  ↓
[Agente Python] Gemini Chat genera respuesta como lead simulado
  ↓
[Backend] Devuelve mensajes actualizados → Frontend muestra chat
  ↓
[Usuario] "Finalizar" → Backend pide feedback a Gemini
  ↓
[Frontend] Muestra feedback con puntuaciones y recomendaciones
```

---

## 6. Modelo de Datos (Prisma)

### 6.1 Entidades principales del Centro de Llamadas

```prisma
model SpechLlamada {
  id          String   @id @default(cuid())
  softwareId  String   // A qué SaaS pertenece
  titulo      String
  contenido   String   @db.Text  // Guion con variables {{nombre}}
  objetivo    String   @default("Cierre")  // Cierre, Info, Seguimiento
  objeciones  Json?    // [{objecion, respuesta}]
  orden       Int      @default(0)
  activo      Boolean  @default(true)
  esDefault   Boolean  @default(false)
  
  sesionesPractica SesionPruebaIA[]
  llamadasReales   LlamadaReal[]
}

model SesionPruebaIA {
  id           String   @id @default(cuid())
  softwareId   String
  spechId      String?  // Spech usado (opcional)
  usuarioId    Int?     // Quién practica
  leadSimulado Json     // {nombre, empresa, personalidad, contexto, dificultad}
  mensajes     Json     @default("[]")  // [{rol, texto, timestamp}]
  resultado    String?  // pendiente | exitoso | fallido
  feedback     Json?    // {puntuacionGlobal, puntuaciones, puntosFuertes, ...}
  notas        String?
}

model LlamadaReal {
  id             String    @id @default(cuid())
  softwareId     String
  leadId         String
  spechId        String?   // Spech usado
  agenteId       Int       // Quien inicia la llamada
  estado         String    @default("iniciando")
  direccion      String    @default("saliente")  // saliente | entrante
  telefonoLead   String
  telefonoAgente String?   // Solo modo humano
  duracionSeg    Int?
  grabacionUrl   String?   // URL de grabación
  notasPost      String?   @db.Text  // Notas del agente
  leadEstadoPrev String?   // Estado antes de la llamada
  leadEstadoPost String?   // Estado después de la llamada
  transcript     String?   @db.Text  // Transcripción (modo AI)
  calificacion   Int?      // 1-5 estrellas
  proximaAccion  String?   // Ej: "Llamar martes 10am"
  zadarmaCallId  String?   // ID de llamada en Zadarma
  modo           String    @default("HUMANO")  // HUMANO | AI
  aiCallSid      String?   // CallSid de Twilio (modo AI)
  aiSessionId    String?   // Sesión del agente AI
  metadata       Json?     // Datos extra de webhooks
  iniciadaAt     DateTime?
  terminadaAt    DateTime?
  
  lead   Lead
  spech  SpechLlamada?
  agente UsuarioCrm
}
```

### 6.2 Estados de Lead

```
NUEVO → CONTACTADO → INTERESADO → EN_SEGUIMIENTO → CALIFICADO → CONVERTIDO
   ↓         ↓            ↓
RECHAZADO  NO_RESPONDE
```

### 6.3 Estados de Llamada

```
// Modo HUMANO
iniciando → esperando_agente → agente_descolgo → llamando_lead → en_curso → completada
                                                              ↘→ fallida
                                                              ↘→ no_contesta
                                                              ↘→ cancelada

// Modo AI
ai_conectando → en_curso → completada/demo_agendada/transferido/rechazado/optout
                    ↘→ fallida/no_contesta/cancelada
```

---

## 7. Páginas y Componentes del Frontend

### 7.1 Mapa de navegación del Dashboard

```
/dashboard/
├── page.tsx                    # Dashboard principal (KPIs)
├── layout.tsx                  # Layout con Sidebar
├── llamadas/
│   ├── page.tsx               # Centro de Llamadas (4 tabs)
│   └── probar-ai/
│       └── page.tsx           # Probar AI con audio
├── leads/
│   └── page.tsx               # Gestión de leads
├── clientes/
│   └── [id]/
│       └── page.tsx           # Detalle de cliente
├── calendario/
│   └── page.tsx               # Calendario de eventos
├── email/
│   ├── page.tsx               # Dashboard email
│   ├── accounts/              # Cuentas de email
│   ├── senders/               # Remitentes
│   ├── plantillas/            # Plantillas
│   ├── campanas/              # Campañas
│   └── bajas/                 # Bajas/unsubscribes
├── whatsapp/
│   └── page.tsx               # Gestión WhatsApp
├── metricas/
│   └── page.tsx               # Métricas y analytics
├── eventos/
│   └── page.tsx               # Eventos del sistema
├── growth/
│   ├── page.tsx               # Growth Engine
│   ├── content/               # Contenido generado
│   ├── seo/                   # SEO
│   ├── referrals/             # Referidos
│   └── ...                    # Más subpáginas
├── propuestas/
│   └── page.tsx               # Propuestas comerciales
├── softwares/
│   └── page.tsx               # Configuración de softwares
├── ia/
│   └── page.tsx               # Chat con IA
├── free-values/
│   └── page.tsx               # Free values/lead magnets
└── tareas/
    └── page.tsx               # Tareas y gamificación
```

### 7.2 API Client (`frontend/src/lib/api.ts`)

El `apiClient` es un objeto monolítico que expone **todos los endpoints** del backend. Para llamadas, los métodos relevantes son:

```typescript
// Llamadas reales
apiClient.getLlamadas(params)           // GET /api/llamadas
apiClient.getLlamada(id)                // GET /api/llamadas/:id
apiClient.iniciarLlamada(data)          // POST /api/llamadas/iniciar
apiClient.iniciarLlamadaAI(data)        // POST /api/llamadas/iniciar-ai
apiClient.actualizarNotasLlamada(id, data) // PUT /api/llamadas/:id/notas
apiClient.getLlamadaAudio(id)           // GET /api/llamadas/:id/audio
apiClient.getLlamadasStats(softwareId)  // GET /api/llamadas/stats
apiClient.deleteLlamada(id)             // DELETE /api/llamadas/:id

// Simulación AI
apiClient.iniciarSimulacionAI(data)     // POST /api/llamadas/simular-ai/start
apiClient.enviarMensajeSimulacionAI(sid, text) // POST /api/llamadas/simular-ai/:sid/mensaje

// Spechs
apiClient.getSpechs(softwareId)         // GET /api/spechs
apiClient.createSpech(data)             // POST /api/spechs
apiClient.updateSpech(id, data)         // PUT /api/spechs/:id
apiClient.deleteSpech(id)               // DELETE /api/spechs/:id
apiClient.setDefaultSpech(id)           // PUT /api/spechs/:id/default
apiClient.duplicateSpech(id)            // POST /api/spechs/:id/duplicar

// Simulación de práctica
apiClient.iniciarSimulacion(data)       // POST /api/simulacion/iniciar
apiClient.enviarMensajeSimulacion(id, text) // POST /api/simulacion/:id/mensaje
apiClient.finalizarSimulacion(id)       // POST /api/simulacion/:id/finalizar

// Leads
apiClient.getLeads(params)              // GET /api/leads
apiClient.getLead(id)                   // GET /api/leads/:id
apiClient.createLead(data)              // POST /api/leads
apiClient.updateLead(id, data)          // PUT /api/leads/:id
apiClient.changeLeadStatus(id, estado)  // PUT /api/leads/:id/estado
```

---

## 8. Modos de Operación

### 8.1 Modo Humano (Zadarma)

**Cuándo usar:** Cuando un vendedor humano quiere llamar a un lead personalmente.

**Ventajas:**
- Conexión humana real
- Manejo de objeciones complejas
- Cierre de venta directo

**Desventajas:**
- Requiere tiempo del vendedor
- Limitado a horario laboral
- Sin escalabilidad

**Configuración:**
- `ZADARMA_DEFAULT_AGENT_PHONE` — Teléfono del agente por defecto
- Cuenta Zadarma configurada con webhooks apuntando a `/api/llamadas/webhook/zadarma`

### 8.2 Modo AI (Agente Python)

**Cuándo usar:** Para llamadas masivas, fuera de horario, o como primer contacto.

**Ventajas:**
- 24/7 disponible
- Escalable (múltiples llamadas simultáneas)
- Consistente (siempre sigue el guion)
- Registra transcript completo
- Agendas demos automáticamente

**Desventajas:**
- No maneja situaciones muy complejas
- Requiere transferencia a humano para cierre

**Configuración:**
- `AI_AGENT_URL` — URL del agente Python
- `AI_AGENT_SECRET` — Secreto para validar webhooks
- `TWILIO_*` — Credenciales de Twilio
- `GEMINI_API_KEY` — API key de Google AI Studio

### 8.3 Simulación de Práctica

**Cuándo usar:** Para entrenar nuevos vendedores sin arriesgar leads reales.

**Características:**
- Lead simulado con personalidad (resistente, interesado, ocupado, curioso, hostil)
- Dificultad ajustable (fácil, medio, difícil)
- Feedback automático con puntuación
- Sin costo (no usa Twilio)

---

## 9. Webhooks y Eventos en Tiempo Real

### 9.1 Webhook Zadarma → Backend

Zadarma envía webhooks para cada evento de la llamada:

```json
{
  "event": "NOTIFY_START",
  "call_id": "12345",
  "pbx_call_id": "67890",
  "internal": "101",
  "destination": "+5215512345678",
  "disposition": "answered",
  "duration": "120"
}
```

**Validación:** Zadarma valida el webhook con un `zd_echo` que el backend responde.

### 9.2 Webhook Agente AI → Backend

El agente Python notifica al backend al finalizar la llamada:

```json
{
  "event": "call_ended",
  "callSid": "CA123...",
  "llamadaId": "abc-123",
  "phone": "+5215512345678",
  "softwareId": "groomly",
  "leadId": "lead-456",
  "outcome": "demo_agendada",
  "transcript": [
    {"role": "agente", "text": "Hola, soy Mariana de GestPro..."},
    {"role": "prospecto", "text": "Sí, cuéntame más..."}
  ],
  "durationS": 180,
  "timestamp": "2026-06-02T15:30:00Z"
}
```

**Validación:** Header `X-Agent-Secret` debe coincidir con `AI_AGENT_SECRET`.

### 9.3 Eventos Socket.IO (Frontend)

El frontend escucha estos eventos para actualizaciones en tiempo real:

```typescript
// Unirse a canales
socket.emit('join_llamadas');

// Escuchar eventos
socket.on('llamada:estado', (payload) => {
  // { llamadaId, estado, modo, duracionSeg, outcome }
});

socket.on('llamada:grabacion', (payload) => {
  // { llamadaId, grabacionUrl }
});
```

---

## 10. Configuración y Variables de Entorno

### 10.1 Agente Python (`llamadas/.env`)

```bash
# Gemini
GEMINI_API_KEY=sk-...
GEMINI_LIVE_MODEL=gemini-3.1-flash-live-preview
GEMINI_LIVE_FALLBACK_MODEL=gemini-2.5-flash-native-audio-latest
GEMINI_VOICE=Leda
GEMINI_LANGUAGE=es-US

# ElevenLabs (pipeline híbrido)
ELEVENLABS_API_KEY=sk_...
ELEVENLABS_VOICE_ID=pNInz6obpgDQGcFmaJgB
ELEVENLABS_TTS_FORMAT=ulaw_8000

# Pipeline: "gemini" | "elevenlabs"
VOICE_PIPELINE=gemini

# Twilio
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM_NUMBER=+1...

# Servidor
PUBLIC_HOST=agente.tudominio.com
PORT=8000

# Base de datos (compartida con backend)
DATABASE_URL=postgresql://user:pass@host:5432/db

# Webhook al backend
BACKEND_WEBHOOK_URL=https://api.tudominio.com
BACKEND_WEBHOOK_SECRET=secreto-webhook

# Redis
REDIS_URL=redis://localhost:6379/0

# Compliance
CALL_HOUR_START=9
CALL_HOUR_END=20
DISCLOSE_AI=true

# Alertas
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
```

### 10.2 Backend (`backend/.env`)

```bash
# Base de datos
DATABASE_URL=postgresql://user:pass@host:5432/db
DIRECT_URL=postgresql://user:pass@host:5432/db

# Agente AI
AI_AGENT_URL=http://localhost:8000
AI_AGENT_SECRET=secreto-webhook

# Zadarma
ZADARMA_KEY=...
ZADARMA_SECRET=...
ZADARMA_DEFAULT_AGENT_PHONE=+521...

# Socket.IO (compartido)
# El servidor Express escucha en el mismo puerto
```

### 10.3 Frontend (`frontend/.env.local`)

```bash
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_AI_AGENT_WS_URL=ws://localhost:8000/simulate/live
```

---

## Resumen de Integración

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         CÓMO SE CONECTA TODO                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. USUARIO abre /dashboard/llamadas en el navegador                    │
│     → Frontend carga leads y spechs del software seleccionado           │
│                                                                          │
│  2. USUARIO selecciona lead → "Llamar con AI"                           │
│     → Frontend POST /api/llamadas/iniciar-ai al Backend                 │
│                                                                          │
│  3. BACKEND crea registro LlamadaReal y POST /outbound al Agente        │
│                                                                          │
│  4. AGENTE inicia llamada via Twilio → Lead recibe llamada              │
│                                                                          │
│  5. AGENTE mantiene conversación con Gemini Live + Tools                │
│     → Audio bidireccional en tiempo real                                │
│     → Tools: agendar_demo, enviar_whatsapp, transferir_humano...        │
│                                                                          │
│  6. AGENTE guarda resultado en PostgreSQL + envía webhook al Backend    │
│                                                                          │
│  7. BACKEND actualiza LlamadaReal + estado del Lead + emite Socket.IO   │
│                                                                          │
│  8. FRONTEND recibe evento y muestra resultado (transcript, outcome)    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

*Documento generado el 2026-06-02 para peluguau.com*
