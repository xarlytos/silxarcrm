# Estado Actual del Proyecto — CRM Maestro

**Fecha:** 2026-06-01  
**Proyecto:** CRM Maestro — Gestión multi-SaaS con IA, llamadas y outreach omnicanal  
**Repositorio:** `E:\exclusion\silxarcrm\`

---

## Índice

1. [Visión General](#visión-general)
2. [Estructura del Proyecto](#estructura-del-proyecto)
3. [Frontend](#frontend)
4. [Backend](#backend)
5. [Agente de Voz (Llamadas)](#agente-de-voz-llamadas)
6. [Integración entre Módulos](#integración-entre-módulos)
7. [Estado de Implementación por Feature](#estado-de-implementación-por-feature)
8. [Archivos sin Trackear / Cambios Pendientes](#archivos-sin-trackear--cambios-pendientes)
9. [Notas Técnicas](#notas-técnicas)

---

## Visión General

CRM Maestro es una plataforma de gestión comercial multi-tenant que opera varios SaaS (Atleevo, PeluGuau, Ervok, etc.) desde un único dashboard. Incluye:

- **Frontend:** Dashboard Next.js con diseño "Expo" premium (dark/light mode, animaciones avanzadas)
- **Backend:** API REST + WebSocket en Node.js/Express con Prisma + PostgreSQL
- **Agente de Voz:** Servicio Python/FastAPI que realiza llamadas salientes con IA (Gemini Live o ElevenLabs híbrido)
- **Comunicaciones:** Email (Resend), WhatsApp (wa.me + whatsapp-web.js), Llamadas (Zadarma + Twilio AI)

---

## Estructura del Proyecto

```
silxarcrm/
├── frontend/          # Next.js 14 + React 18 + TypeScript + Tailwind
├── backend/           # Node.js 20 + Express + Prisma + PostgreSQL
├── llamadas/          # Python + FastAPI + Gemini Live/ElevenLabs
├── groomlyproyecto/   # Subproyecto / docs adicionales
└── ESTADO-PROYECTO.md # ← Este documento
```

---

## Frontend

### Stack Tecnológico

| Tecnología | Versión |
|-----------|---------|
| Next.js | 14.2.35 (App Router) |
| React | 18 |
| TypeScript | 5 |
| Tailwind CSS | 3.4.1 |

### Dependencias Clave

- `next-auth` — Autenticación JWT
- `recharts` — Gráficos de KPIs
- `socket.io-client` — WebSocket en tiempo real
- `date-fns` — Formateo de fechas
- `lucide-react` — Iconografía
- `@tanstack/react-query` — Estado de servidor

### Rutas de la App

#### Públicas
| Ruta | Propósito |
|------|-----------|
| `/` | Redirección a `/dashboard` o `/auth/login` |
| `/auth/login` | Login con animaciones premium |
| `/propuesta/[token]` | Aceptar/rechazar propuestas comerciales |
| `/email/baja` | Unsubscribe público |

#### Dashboard (protegidas)
| Ruta | Propósito |
|------|-----------|
| `/dashboard` | Command Center — KPIs, gráficos, pagos recientes |
| `/dashboard/tareas` | **Gamificación RPG** — misiones, talentos, cofres, slot, tarot |
| `/dashboard/leads` | CRUD leads con filtros, tabla/kanban, import CSV |
| `/dashboard/leads/[id]` | Detalle de lead |
| `/dashboard/llamadas` | **Centro de Llamadas** — 4 tabs: Llamar, Practicar, Spechs, Historial |
| `/dashboard/llamadas/probar-ai` | Probar Agente AI en vivo vía WebSocket de audio |
| `/dashboard/whatsapp` | WhatsApp outreach, cementerio, arena, plantillas, A/B tests |
| `/dashboard/email` | Dashboard email: senders, campañas, plantillas |
| `/dashboard/email/accounts` | Cuentas Resend |
| `/dashboard/email/senders` | Direcciones de envío |
| `/dashboard/email/plantillas` | Plantillas reutilizables |
| `/dashboard/email/campañas` | Campañas masivas con A/B testing |
| `/dashboard/calendario` | Calendario mensual (Carlos / Silviu / ambos) |
| `/dashboard/propuestas` | Propuestas comerciales con flujo de estados |
| `/dashboard/softwares` | Lista de SaaS conectados con MRR |
| `/dashboard/softwares/[saas]` | Detalle de un software |
| `/dashboard/softwares/[saas]/buscar-leads` | Búsqueda de leads externos |
| `/dashboard/métricas` | Métricas detalladas |
| `/dashboard/eventos` | Feed de eventos en tiempo real |
| `/dashboard/ia` | Asistente IA con acceso a todo el CRM |
| `/dashboard/ia/propuestas` | Generador de propuestas con IA |
| `/dashboard/landings` | Gestión de landing pages |
| `/dashboard/free-values` | Gestión de lead magnets |
| `/dashboard/clientes/[id]` | Detalle de cliente |

### Componentes Principales

**Layout:**
- `Sidebar.tsx` — Navegación lateral con 5 grupos, pill deslizante, cursor glow
- `Header.tsx` — Título, buscador global (Ctrl+K), toggle tema, notificaciones
- `CommandPalette.tsx` — Paleta de comandos con fuzzy search

**Dashboard:**
- `StatsWidget`, `KPICard`, `RevenueChart`, `ClientTable`, `EventFeed`, `ChatIA`

**Llamadas:**
- `LlamadaEnVivo.tsx` — Panel de llamada en curso (timer, spech, objeciones, notas, transcript AI, calificación)
- `HistorialLlamadas.tsx` — Lista paginada con filtros y reproductor de audio
- `SpechList/SpechViewer/SpechEditor` — CRUD de guiones
- `SimulacionConfig/SimulacionChat/SimulacionFeedback` — Práctica con IA
- `LeadSelector`, `LlamadaIniciarModal`, `LlamadaStats`, `AudioPlayer`

**Leads:**
- `LeadStatusBadge`, `LeadPriorityBadge`, `LeadsKanban`, `LeadForm`

**Email:**
- `PlantillaEditor`, `GeneradorPlantillaIA`

### Hooks

| Hook | Propósito |
|------|-----------|
| `useAuth` | Contexto de autenticación JWT (localStorage) |
| `useTheme` | Tema claro/oscuro con persistencia |
| `useLiveAudioSimulation` | WebSocket de audio bidireccional con Gemini Live |

### Librerías

- **`src/lib/api.ts`** — Cliente HTTP centralizado (~120 métodos por dominio)
- **`src/lib/utils.ts`** — Helpers: `cn()`, `formatCurrency()`, `formatDate()`
- **`src/lib/socket.ts`** — Cliente Socket.io (rooms WhatsApp + llamadas)
- **`src/types/index.ts`** — Tipos del dominio completos

### Estilos (globals.css)

Sistema de diseño "Expo":
- Variables CSS semánticas para light/dark mode
- Sistema de easing: `spring` (física con overshoot), `luxe` (deceleración refinada)
- Animaciones premium: aurora, shimmer, magnetic button, cursor spotlight
- Scrollbar custom
- Respecto a `prefers-reduced-motion`

---

## Backend

### Stack Tecnológico

| Tecnología | Versión |
|-----------|---------|
| Node.js | 20 |
| TypeScript | 5 (strict mode) |
| Express | 4 |
| Prisma | ORM |
| PostgreSQL | Base de datos |
| Socket.IO | WebSocket en tiempo real |
| Redis | Cache / colas / rate limiting |

### Dependencias Clave

- `openai` — Chat con IA
- `zadarma` — Telefonía
- `resend` — Email transaccional
- `firebase-admin` — Push notifications
- `puppeteer` — Scraping
- `bull` — Colas de trabajo
- `whatsapp-web.js` — WhatsApp automation
- `winston` — Logging

### Esquema Prisma (~30 modelos)

| Dominio | Modelos |
|---------|---------|
| Clientes/SaaS | `ClienteGlobal`, `Suscripcion`, `Pago`, `Evento`, `MetricaDiaria`, `WebhookConfig`, `Software` |
| Tracking | `CrmClient`, `ApiKey`, `TrackedEvent` |
| Leads | `Lead` (8 estados), `LeadHistorial`, `LeadEtiqueta` |
| WhatsApp | `WhatsappPlantilla`, `WhatsappEnvio`, `WhatsappChatbotRegla`, `WhatsappABTest`, `WhatsappConversacion`, `WhatsappMensaje`, `WhatsappArenaBattle`, `WhatsappArenaPerfil` |
| Email | `EmailAccount`, `EmailSender`, `EmailPlantilla`, `EmailCampana`, `EmailVariante`, `EmailEnvio`, `EmailEvento`, `EmailBaja` |
| Llamadas | `SpechLlamada`, `SesionPruebaIA`, `LlamadaReal` |
| Landing/Propuestas | `Landing`, `FreeValue`, `Propuesta` |
| Calendario | `CalendarioEvento` |
| Usuarios/IA | `UsuarioCrm`, `ConversacionIa`, `AccionIa` |

### Rutas (20 routers)

| Ruta | Archivo | Propósito |
|------|---------|-----------|
| `/api/auth` | `auth.ts` | Login, refresh, logout, FCM, /me |
| `/api/admin` | `admin.ts` | CRM clients, API keys, tracking |
| `/api/calendario` | `calendario.ts` | Eventos, stats |
| `/api/dashboard` | `dashboard.ts` | KPIs globales, métricas, SaaS list |
| `/api/email` | `email.ts` | Accounts, senders, plantillas, campañas, webhooks |
| `/events` | `events.ts` | Tracking de eventos |
| `/api/ia` | `ia.ts` | Chat IA streaming, insights, acciones propuestas |
| `/api/leads` | `leads.ts` | CRUD, búsqueda externa, import CSV |
| `/api/llamadas` | `llamadas.ts` | Webhooks Zadarma/AI, iniciar llamada, stats |
| `/api/spechs` | `spechs.ts` | Guiones de llamada CRUD |
| `/api/softwares` | `software.ts` | Perfiles de software |
| `/api/tareas` | `tareas.ts` | Gamificación: achievements, pools |
| `/api/whatsapp` | `whatsapp.ts` | Plantillas, envíos, A/B, cementerio, arena, sparring |
| `/api/whatsapp-wweb` | `whatsappWebJs.ts` | whatsapp-web.js |
| `/api/whatsapp-chatbot` | `whatsappChatbot.ts` | Reglas de chatbot |
| `/webhooks` | `webhooks.ts` | Webhooks genéricos de SaaS |
| `/api/landings` | `landings.ts` | Landing pages |
| `/api/free-values` | `freeValues.ts` | Lead magnets |
| `/api/propuestas` | `propuestas.ts` | Propuestas comerciales |
| `/api/simulacion` | `simulacion.ts` | Simulación de llamadas |

### Servicios (20+)

| Servicio | Propósito |
|----------|-----------|
| `llamadaService.ts` | Click-to-call Zadarma, gestión de estados |
| `llamadaAiService.ts` | Llamadas AI (dispara servicio Python), simulador |
| `leadService.ts` | CRUD leads, filtros avanzados, import CSV |
| `whatsappService.ts` | Plantillas, envíos, A/B, cementerio, arena, sparring, whisper |
| `emailService.ts` | Envío Resend, plantillas, unsubscribe tokens |
| `campanaService.ts` | Campañas con audiencia filtrada, A/B testing |
| `iaService.ts` | Chat OpenAI con function calling, acciones propuestas |
| `zadarmaService.ts` | API Zadarma (click-to-call, grabaciones) |
| `webhookProcessor.ts` | Procesa eventos de SaaS |
| `metricsService.ts` | Cálculo diario MRR, ARR, churn |
| `notificationService.ts` | Push FCM |
| `trackingService.ts` | Tracking tipo Segment/Mixpanel |
| `scrapingService.ts` | Scraping Páginas Amarillas, Google Maps |
| `webhookEmailService.ts` | Webhooks Resend |
| `tareasService.ts` | Gamificación |
| `softwareService.ts` | Perfiles de software |
| `spechService.ts` | Guiones de llamada |
| `simulacionService.ts` | Simulación de llamadas |

### Configuración y Middleware

- **`src/config/env.ts`** — Variables de entorno centralizadas
- **`src/config/database.ts`** — PrismaClient singleton + instancia read-only para IA
- **`src/config/redis.ts`** — Cliente Redis con fallback en memoria
- **`src/middleware/auth.ts`** — JWT Bearer validation
- **`src/middleware/rateLimiter.ts`** — 100 req/15min (API), 10 login/15min
- **`src/middleware/webhookValidator.ts`** — HMAC + timestamp + idempotencia

### Jobs y Workers

- **Cron jobs (4):**
  - 2:00 AM — Cálculo de métricas diarias
  - 9:00 AM — Alertas de trials expirando
  - 10:00 AM — Alertas de pagos fallidos
  - Cada minuto — Procesar envíos WhatsApp programados
- **emailWorker.ts** — Worker async para campañas en lotes

### Scripts (~30)

| Categoría | Scripts |
|-----------|---------|
| Importación leads | `import-leads-*.ts` (Google Maps, OSM, Páginas Amarillas, Ervok, PeluGuau) |
| Scraping | `scan-*.ts` (peluquerías, criaderos, PYMEs) |
| Clasificación IA | `classify-*.ts`, `apply-rules-to-json.ts` |
| Limpieza | `clean-atleevo-leads.ts`, `sync-atleevo-json.ts` |
| Emails | `scrape-lead-emails.ts` |

---

## Agente de Voz (Llamadas)

### Stack Tecnológico

| Tecnología | Versión |
|-----------|---------|
| Python | 3.13+ |
| FastAPI | 0.115.6 |
| google-genai | 0.8.0 |
| Twilio | 9.4.1 |
| Redis | 5.2.1 |

### Arquitectura

Servicio Python/FastAPI que realiza llamadas salientes B2B con IA para agendar demos. Soporta **dos pipelines de voz:**

1. **Gemini Live nativo** — Audio bidireccional directo con Gemini
2. **Híbrido ElevenLabs** — STT (Scribe v2) + LLM (Gemini Flash) + TTS (Flash v2.5)

### Estructura de Módulos

```
llamadas/app/
├── main.py              # FastAPI: endpoints HTTP + WebSocket
├── config.py            # Settings Pydantic desde .env
├── audio/
│   ├── bridge.py        # Conversión mu-law 8kHz ↔ PCM 16/24kHz
│   └── dsp.py           # DSP: RMS, VAD, AGC, noise gate
├── telephony/
│   ├── media_stream.py  # Orquestador WebSocket (corazón del sistema)
│   └── twilio_client.py # Cliente Twilio (outbound, transfer, WhatsApp)
├── elevenlabs/
│   ├── hybrid_session.py # Orquestador pipeline híbrido
│   ├── stt_session.py   # ElevenLabs Scribe v2
│   └── tts_session.py   # ElevenLabs Flash v2.5
├── gemini/
│   ├── live_session.py  # Gemini Live API
│   ├── chat_session.py  # Gemini Chat API (para híbrido)
│   ├── model_provider.py # Fallback de modelos
│   └── tools.py         # 7 function-tools
├── conversation/
│   ├── classifier.py    # Mini clasificador de intención (~100ms)
│   ├── state_engine.py  # State engine probabilístico (7 stages)
│   ├── strategist.py    # Supervisor estratégico
│   ├── prompts.py       # System prompts multi-capa
│   ├── state.py         # CallContext + ConversationStore
│   └── signals.py       # Heurísticas emoción/caos
├── crm/
│   ├── postgres_repo.py # PostgreSQL (primario)
│   ├── supabase_repo.py # Supabase (legacy fallback)
│   └── calcom.py        # Agendado Cal.com
├── knowledge/
│   ├── rag.py           # RAG semántico (embeddings Gemini)
│   └── seed_data.py     # 7 casos de éxito por nicho
├── compliance/
│   └── mx.py            # Compliance México (horario, opt-out, REUS)
├── observability/
│   ├── metrics.py       # Métricas en memoria
│   ├── alerts.py        # Alertas Slack (6 tipos)
│   └── decision_log.py  # Log estructurado JSONL por turno
└── simulation/
    ├── live_audio.py    # Simulador con audio real
    └── text_session.py  # Simulador por texto (sin costo telefónico)
```

### Endpoints

| Endpoint | Método | Propósito |
|----------|--------|-----------|
| `/voice` | GET | Webhook Twilio → TwiML con `<Stream>` |
| `/media` | WebSocket | Audio bidireccional Twilio |
| `/outbound` | POST | Iniciar llamada saliente con compliance |
| `/status` | GET | Healthcheck + métricas |
| `/simulate/text` | POST | Simulador por texto |
| `/simulate/audio` | WebSocket | Simulador con audio real |
| `/webhook/status` | POST | Notificaciones internas |

### 7 Function Tools

1. `consultar_crm` — Consulta datos del lead
2. `buscar_caso_de_exito` — RAG semántico de casos de éxito
3. `calcular_roi` — ROI de ~70% cancelaciones recuperables
4. `comparar_con_competidor` — Comparativa vs Calendly/Excel/papel
5. `agendar_demo` — Booking vía Cal.com
6. `enviar_whatsapp` — Seguimiento por WhatsApp
7. `transferir_humano` — Transferencia a operador humano

### State Engine (7 Stages)

```
saludo → discovery → problem_aware → solution_aware → qualified → closing → exit
```

- NO es lineal: puede saltar estados
- Hysteresis: mínimo 2 turnos antes de transicionar
- Frenos: no cerrar antes de turno 3, progress solo con ≥2 señales de valor

### Tests (28 tests, 7 archivos)

| Archivo | Qué testea |
|---------|-----------|
| `test_audio_bridge.py` | Resampleo, frames exactos, buffering, clear_output |
| `test_metrics.py` | Tasas de conversión, snapshot, división por cero |
| `test_prewarm.py` | Prompt con datos de prospecto, attach precalentado |
| `test_rag.py` | Fallback substring, comparación competidor |
| `test_signals.py` | Detección emoción, caos, frustración 0-10 |
| `test_tools.py` | 7 tools exactas, ROI math, transferencia |
| `test_vad_config.py` | VAD usa settings correctamente |

### Documentación Interna

| Archivo | Contenido |
|---------|-----------|
| `ESTADO-ARQUITECTURA.md` | Arquitectura jerárquica v3.0: 4 capas, 2 loops |
| `ESTADO-DEL-SISTEMA.md` | Estado 2026-05-28: 28/28 tests, latencia 565-635ms |
| `agente-ia-software-veterinarios.md` | Diseño anti-robot, scripts, RAG, ROI 9x |
| `agente-ventas-gemini-3.5.md` | Comparativa precios, DIY vs no-code |

---

## Integración entre Módulos

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (Next.js)                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │  Dashboard  │  │   Leads     │  │  Llamadas   │  │   WhatsApp  │   │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │
│           │                │                │                │          │
│           └────────────────┴────────────────┴────────────────┘          │
│                                    │                                    │
│                              HTTP / WS                                │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
┌────────────────────────────────────┼────────────────────────────────────┐
│                           BACKEND (Node.js)                           │
│  ┌─────────────┐  ┌─────────────┐  │  ┌─────────────┐  ┌─────────────┐│
│  │   Express   │  │   Prisma    │──┘  │   Socket.IO │  │  OpenAI     ││
│  │   Routes    │  │  PostgreSQL │     │  WebSocket  │  │  Function   ││
│  └─────────────┘  └─────────────┘     └─────────────┘  │   Calling   ││
│         │                                    │          └─────────────┘│
│         │ Webhook Zadarma        Webhook Twilio│                       │
│         │                                    │                        │
│         ▼                                    ▼                        │
│  ┌─────────────┐                    ┌─────────────────┐                │
│  │   Zadarma   │                    │  llamadaAiService │               │
│  │  (humano)   │                    │  → HTTP POST     │               │
│  └─────────────┘                    │  → /outbound     │               │
│                                     └─────────────────┘                │
└────────────────────────────────────────────────────────────────────────┘
                                                     │
                                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                         AGENTE DE VOZ (Python)                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  FastAPI → Twilio Media Stream → AudioBridge → Gemini Live      │   │
│  │                                    ↕                            │   │
│  │                          ElevenLabs (híbrido)                   │   │
│  │                                    ↕                            │   │
│  │  State Engine → Classifier → Tools → RAG → CRM (PostgreSQL)     │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

### Flujo de Llamada AI

1. Frontend: Usuario selecciona lead → clic "Llamar con AI"
2. Backend (`llamadaAiService.ts`): POST a `/outbound` del agente Python
3. Agente Python: Valida compliance → inicia llamada Twilio
4. Twilio: Conecta WebSocket a `/media`
5. Agente Python: Carga lead + spech desde PostgreSQL
6. Pipeline: Audio → Bridge → Gemini Live (o ElevenLabs híbrido)
7. Al finalizar: Guarda en DB → notifica backend vía webhook → emite Socket.IO
8. Frontend: Recibe evento de fin de llamada, actualiza historial

---

## Estado de Implementación por Feature

| Feature | Estado | Notas |
|---------|--------|-------|
| **Autenticación JWT** | ✅ Implementado | Login, refresh, logout, localStorage |
| **Dashboard KPIs** | ✅ Implementado | MRR, ARR, churn, gráficos recharts |
| **CRUD Leads** | ✅ Implementado | Filtros avanzados, kanban, import CSV |
| **Llamadas Humanas (Zadarma)** | ✅ Implementado | Click-to-call, grabaciones, webhooks |
| **Llamadas AI (Gemini Live)** | ✅ Implementado | WebSocket bidireccional, transcript |
| **Práctica/Simulación AI** | ✅ Implementado | Texto + audio real |
| **Spechs de Llamada** | ✅ Implementado | CRUD completo con variables |
| **WhatsApp Outreach** | ✅ Implementado | Plantillas, envíos, A/B, cementerio, arena |
| **Email Masivo** | ✅ Implementado | Campañas, A/B testing, tracking Resend |
| **Calendario** | ✅ Implementado | Eventos Carlos/Silviu/ambos |
| **Propuestas Comerciales** | ✅ Implementado | Flujo completo con token público |
| **Gamificación RPG** | ✅ Implementado | Misiones, talentos, cofres, slot, tarot |
| **Asistente IA** | ✅ Implementado | Chat streaming, function calling, acciones |
| **Landing Pages** | ✅ Implementado | Gestión y visualización |
| **Free Values** | ✅ Implementado | Lead magnets |
| **Tracking de Eventos** | ✅ Implementado | API key auth, batch events |
| **Notificaciones Push** | ✅ Implementado | Firebase Cloud Messaging |
| **WebSocket Tiempo Real** | ✅ Implementado | Socket.IO con rooms |
| **Scraping Leads** | ✅ Implementado | Páginas Amarillas, Google Maps |
| **Agente de Voz AI** | ✅ Implementado | 28/28 tests, latencia ~600ms |
| **RAG Semántico** | ✅ Implementado | Embeddings Gemini, pgvector |
| **State Engine Probabilístico** | ✅ Implementado | 7 stages, no lineal |
| **Compliance México** | ✅ Implementado | Horario 9-20, opt-out, disclose AI |
| **Observability** | ✅ Implementado | Métricas, alertas Slack, decision log |
| **WhatsApp Web.js** | ✅ Implementado | Automatización real vía QR |
| **WhatsApp Chatbot** | ✅ Implementado | Reglas automáticas |
| **Dark Mode** | ✅ Implementado | Sistema completo con CSS variables |
| **Command Palette** | ✅ Implementado | Ctrl+K, fuzzy search |

---

## Archivos sin Trackear / Cambios Pendientes

Según `git status`, hay archivos modificados y sin trackear:

### Modificados (staged o unstaged)

**Backend:**
- `backend/prisma/schema.prisma`
- `backend/src/config/env.ts`
- `backend/src/routes/llamadas.ts`
- `backend/src/services/llamadaService.ts`

**Frontend:**
- `frontend/src/app/dashboard/llamadas/page.tsx`
- `frontend/src/components/layout/Sidebar.tsx`
- `frontend/src/components/llamadas/HistorialLlamadas.tsx`
- `frontend/src/components/llamadas/LlamadaEnVivo.tsx`
- `frontend/src/lib/api.ts`
- `frontend/src/types/index.ts`

**Otros:**
- `groomlyproyecto/.claude/settings.local.json`
- `groomlyproyecto/docs/mensajes-whatsapp-outreach.md`

### Sin Trackear (untracked)

- `0.6`
- `=`
- `backend/src/services/llamadaAiService.ts` — **Nuevo servicio de llamadas AI**
- `frontend/src/app/dashboard/llamadas/probar-ai/` — **Nueva página para probar AI en vivo**
- `frontend/src/hooks/useLiveAudioSimulation.ts` — **Nuevo hook WebSocket audio**
- `llamadas/` — **Directorio completo del agente de voz** (aun no en git)

---

## Notas Técnicas

### Convenciones de Código

- **Frontend:** TypeScript estricto, path alias `@/*`, componentes funcionales con hooks
- **Backend:** TypeScript estricto, path alias `@/*`, services pattern, Prisma ORM
- **Llamadas:** Python 3.13+, async/await, Pydantic settings, pytest-asyncio

### Variables de Entorno Críticas

**Backend (.env):**
- `DATABASE_URL` — PostgreSQL
- `REDIS_URL` — Cache/colás
- `JWT_SECRET` — Tokens
- `OPENAI_API_KEY` — Chat IA
- `ZADARMA_KEY` / `ZADARMA_SECRET` — Telefonía humana
- `RESEND_API_KEY` — Email
- `FIREBASE_SERVICE_ACCOUNT` — Push notifications
- `AI_AGENT_URL` — URL del servicio Python de llamadas

**Llamadas (.env):**
- `GEMINI_API_KEY` — Gemini Live/Chat
- `ELEVENLABS_API_KEY` — STT/TTS híbrido
- `TWILIO_SID` / `TWILIO_AUTH_TOKEN` — Telefonía
- `TWILIO_PHONE_NUMBER` — Número saliente
- `DATABASE_URL` — PostgreSQL (compartido con backend)
- `REDIS_URL` — Estado de llamadas
- `CALCOM_API_KEY` — Agendado
- `SLACK_WEBHOOK_URL` — Alertas

### Filosofía Arquitectónica del Agente de Voz

> **"El LLM es NATURALIZADOR, no DECISOR."**

La estrategia comercial la define el **State Engine** (código puro, <1ms). El LLM solo convierte la estrategia en lenguaje humano natural. Esto reduce costo, latencia e inconsistencias.

### Métricas del Agente de Voz

- **Tests:** 28/28 pasan ✅
- **Latencia:** 565–635ms por turno
- **Costo estimado:** ~$0.03–0.05 por llamada (Gemini Live)
- **ROI proyectado:** 9x (documento de diseño)

### Dominios Atendidos por el Agente

1. Veterinarias
2. Peluquerías caninas
3. Gimnasios
4. Dentistas
5. Yoga / wellness
6. Terapeutas
7. Entrenadores personales

---

*Documento generado automáticamente el 2026-06-01.*
