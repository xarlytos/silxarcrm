# 📘 Documentación Completa del Software — peluguau.com

> **Silxar CRM** — Plataforma integral de gestión comercial con IA, llamadas AI, WhatsApp, Email, Growth Engine y más.

---

## Índice

1. [Arquitectura General](#1-arquitectura-general)
2. [Stack Tecnológico](#2-stack-tecnológico)
3. [Base de Datos (Prisma)](#3-base-de-datos-prisma)
4. [Backend Express — Módulos](#4-backend-express--módulos)
5. [Agente de Voz AI (`llamadas/`)](#5-agente-de-voz-ai-llamadas)
6. [Frontend Next.js — Páginas](#6-frontend-nextjs--páginas)
7. [Flujos de Negocio End-to-End](#7-flujos-de-negocio-end-to-end)
8. [Autenticación y Seguridad](#8-autenticación-y-seguridad)
9. [Webhooks y Eventos](#9-webhooks-y-eventos)
10. [Configuración y Variables de Entorno](#10-configuración-y-variables-de-entorno)

---

## 1. Arquitectura General

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (Next.js 14)                           │
│                                                                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │ Dashboard│ │  Leads   │ │Llamadas  │ │ WhatsApp │ │  Email   │          │
│  │  (KPIs)  │ │(CRUD +  │ │(AI +    │ │(Plantillas│ │(Campañas │          │
│  │          │ │scraper)  │ │humano)   │ │+ chat)   │ │+ envíos) │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │Calendario│ │ Propuestas│ │ Landings │ │FreeValues│ │  Growth  │          │
│  │ (eventos)│ │(comercial)│ │(marketing)│ │(lead mag)│ │(autónomo)│          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                                    │
│  │  IA Chat │ │ Softwares│ │  Métricas│                                    │
│  │(Copilot) │ │(config)  │ │(analytics)│                                    │
│  └──────────┘ └──────────┘ └──────────┘                                    │
│                                                                              │
│  Auth: JWT (access + refresh)  │  State: React Hooks  │  API: REST + WS   │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ HTTP / WebSocket
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                        BACKEND EXPRESS (Node.js + TS)                        │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Rutas API REST                                                     │   │
│  │  /api/auth      /api/leads      /api/llamadas    /api/whatsapp     │   │
│  │  /api/email     /api/calendario /api/propuestas  /api/landings     │   │
│  │  /api/free-values /api/softwares /api/growth     /api/ia           │   │
│  │  /api/dashboard /api/webhooks   /api/tareas      /api/simulacion   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Servicios de Negocio                                               │   │
│  │  ├─ leadService        (CRUD + scraping + CSV import)              │   │
│  │  ├─ llamadaService     (Zadarma click-to-call)                     │   │
│  │  ├─ llamadaAiService   (orquesta agente Python)                    │   │
│  │  ├─ whatsappService    (plantillas + envíos + A/B + chat)          │   │
│  │  ├─ emailService       (senders + plantillas + envíos)             │   │
│  │  ├─ campanaService     (campañas masivas + A/B testing)            │   │
│  │  ├─ propuestaService   (propuestas comerciales)                    │   │
│  │  ├─ growth/*           (content + SEO + referrals + activation)    │   │
│  │  ├─ iaService          (chat IA + generación SQL)                  │   │
│  │  └─ metricsService     (KPIs + analytics)                          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  Socket.IO Server  │  Prisma ORM  │  PostgreSQL                           │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ HTTP Webhooks
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                     AGENTE AI PYTHON (FastAPI)                               │
│                                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐│
│  │   /voice    │  │   /media    │  │  /outbound  │  │   /simulate/live    ││
│  │  (TwiML)    │  │  (WebSocket)│  │ (llamadas)  │  │  (simulación audio) ││
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘│
│         │                │                │                    │           │
│         └────────────────┴────────────────┴────────────────────┘           │
│                          Gemini Live API + Twilio                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Stack Tecnológico

| Capa | Tecnología | Versión | Propósito |
|------|-----------|---------|-----------|
| **Frontend** | Next.js | 14 (App Router) | SSR, routing, API routes |
| | React | 18 | UI components |
| | TypeScript | 5.x | Tipado estático |
| | TailwindCSS | 3.x | Estilos utilitarios |
| | shadcn/ui | — | Componentes base |
| | Socket.IO Client | — | Tiempo real |
| | Recharts | — | Gráficas |
| **Backend** | Express.js | 4.x | API REST |
| | TypeScript | 5.x | Tipado estático |
| | Prisma | 5.x | ORM y migraciones |
| | Socket.IO | — | WebSocket server |
| | bcryptjs | — | Hash de contraseñas |
| | jsonwebtoken | — | JWT tokens |
| | Resend | — | Envío de emails |
| | Zod | — | Validación |
| **Agente AI** | Python | 3.11 | Servidor FastAPI |
| | FastAPI | — | API REST + WebSocket |
| | google-genai | — | Gemini Live API |
| | Twilio SDK | — | Telefonía |
| | asyncpg | — | PostgreSQL async |
| | websockets | — | WebSocket server |
| **Base de datos** | PostgreSQL | 15+ | Datos persistentes |
| | Redis | — | Cache + sesiones |
| **Infraestructura** | Vercel | — | Frontend hosting |
| | Docker | — | Backend + Agente |
| | Cloudflare | — | DNS + CDN |

---

## 3. Base de Datos (Prisma)

El esquema tiene **30+ modelos** organizados en 5 dominios:

### 3.1 Dominio: Clientes y Suscripciones

```prisma
model ClienteGlobal {
  id             Int       @id @default(autoincrement())
  email          String    @unique
  nombre         String
  telefono       String?
  pais           String?
  empresa        String?
  origenSaas     String    // "groomly", "silxar", etc.
  estado         String    @default("activo")
  fechaRegistro  DateTime  @default(now())
  fechaUltimoLogin DateTime?
  metadata       Json?
  notasInternas  String?

  suscripciones  Suscripcion[]
  pagos          Pago[]
  eventos        Evento[]
  referralPrograms ReferralProgram[]
}

model Suscripcion {
  id                Int       @id @default(autoincrement())
  clienteId         Int
  saas              String    // Software asociado
  planTipo          String    // "mensual", "anual", "lifetime"
  estado            String    // "activa", "trial", "cancelada", "expirada"
  monto             Decimal   @db.Decimal(10, 2)
  moneda            String    @default("EUR")
  fechaInicio       DateTime
  fechaFin          DateTime?
  fechaProximoPago  DateTime?
  fechaCancelacion  DateTime?
  diasTrialTotal    Int?
  diasTrialRestantes Int?
  metodoPago        String?

  cliente ClienteGlobal @relation(fields: [clienteId], references: [id])
  pagos   Pago[]
}

model Pago {
  id            Int       @id @default(autoincrement())
  suscripcionId Int
  clienteId     Int
  monto         Decimal   @db.Decimal(10, 2)
  moneda        String    @default("EUR")
  estado        String    // "completado", "pendiente", "fallido", "reembolsado"
  descripcion   String?
  fechaPago     DateTime
  numeroFactura String?
  facturaUrl    String?

  suscripcion Suscripcion @relation(fields: [suscripcionId], references: [id])
  cliente     ClienteGlobal @relation(fields: [clienteId], references: [id])
}

model Evento {
  id                  Int       @id @default(autoincrement())
  tipo                String    // "registro", "pago", "cancelacion", "login", etc.
  severidad           String    @default("info")  // "info", "warning", "error", "critical"
  clienteId           Int?
  saas                String?
  datos               Json?     // Payload arbitrario del evento
  procesado           Boolean   @default(false)
  notificadoPush      Boolean   @default(false)
  notificadoDashboard Boolean   @default(false)
  fecha               DateTime  @default(now())

  cliente ClienteGlobal? @relation(fields: [clienteId], references: [id])
}

model MetricaDiaria {
  id                Int      @id @default(autoincrement())
  fecha             DateTime @db.Date
  saas              String
  nuevosRegistros   Int      @default(0)
  nuevosPagos       Int      @default(0)
  cancelaciones     Int      @default(0)
  upgrades          Int      @default(0)
  downgrades        Int      @default(0)
  clientesActivos   Int      @default(0)
  trialsActivos     Int      @default(0)
  trialsConvertidos Int      @default(0)
  trialsExpirados   Int      @default(0)
  mrr               Decimal  @default(0) @db.Decimal(12, 2)
  arr               Decimal  @default(0) @db.Decimal(12, 2)
  ingresosNuevos    Decimal  @default(0) @db.Decimal(12, 2)
  ingresosPerdidos  Decimal  @default(0) @db.Decimal(12, 2)
  loginsTotales     Int      @default(0)
  churnRate         Decimal? @db.Decimal(5, 2)
  conversionRate    Decimal? @db.Decimal(5, 2)
  trialToPaidRate   Decimal? @db.Decimal(5, 2)

  @@unique([fecha, saas])
}
```

### 3.2 Dominio: Leads y CRM

```prisma
enum LeadEstado {
  NUEVO
  CONTACTADO
  INTERESADO
  EN_SEGUIMIENTO
  CALIFICADO
  RECHAZADO
  NO_RESPONDE
  CONVERTIDO
}

enum PrioridadLead {
  BAJA
  MEDIA
  ALTA
  URGENTE
}

model Lead {
  id             String      @id @default(cuid())
  nombre         String
  email          String?
  telefono       String?
  empresa        String?
  cargo          String?
  pais           String?
  origen         String      @default("manual")  // "manual", "web", "landing", "referido"
  softwareId     String      // A qué SaaS pertenece
  estado         LeadEstado  @default(NUEVO)
  prioridad      PrioridadLead @default(MEDIA)
  notas          String?
  ultimoContacto DateTime?
  asignadoA      Int?        // Usuario CRM asignado
  convertidoA    Int?        // ID del ClienteGlobal convertido
  metadata       Json?       // Datos enriquecidos (sector, tamaño, etc.)

  historial      LeadHistorial[]
  etiquetas      LeadEtiqueta[]
  gestor         UsuarioCrm? @relation(fields: [asignadoA], references: [id])
  llamadas       LlamadaReal[]
  whatsappEnvios WhatsappEnvio[]
  whatsappConversacion WhatsappConversacion?

  @@unique([email, softwareId])
}

model LeadHistorial {
  id          String   @id @default(cuid())
  leadId      String
  tipo        String   // "nota", "llamada", "email", "whatsapp", "estado"
  descripcion String
  usuarioId   Int?
  createdAt   DateTime @default(now())

  lead Lead @relation(fields: [leadId], references: [id], onDelete: Cascade)
}

model LeadEtiqueta {
  id     String @id @default(cuid())
  nombre String @unique
  color  String @default("#6B7280")
  leads  Lead[]
}
```

### 3.3 Dominio: Centro de Llamadas

```prisma
model SpechLlamada {
  id          String   @id @default(cuid())
  softwareId  String
  titulo      String
  contenido   String   @db.Text  // Guion con variables {{nombre}}, {{empresa}}
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
  spechId      String?  // Spech usado
  usuarioId    Int?     // Quién practica
  leadSimulado Json     // {nombre, empresa, personalidad, contexto, dificultad}
  mensajes     Json     @default("[]")  // [{rol, texto, timestamp}]
  resultado    String?  // "pendiente" | "exitoso" | "fallido"
  feedback     Json?    // {puntuacionGlobal, puntuaciones, puntosFuertes}

  spech SpechLlamada? @relation(fields: [spechId], references: [id])
}

model LlamadaReal {
  id             String    @id @default(cuid())
  softwareId     String
  leadId         String
  spechId        String?
  agenteId       Int       // Quien inicia la llamada
  estado         String    @default("iniciando")
  direccion      String    @default("saliente")  // saliente | entrante
  telefonoLead   String
  telefonoAgente String?   // Solo modo humano (Zadarma)
  duracionSeg    Int?
  grabacionUrl   String?
  notasPost      String?   @db.Text
  leadEstadoPrev String?
  leadEstadoPost String?
  transcript     String?   @db.Text  // Transcripción (modo AI)
  calificacion   Int?      // 1-5 estrellas
  proximaAccion  String?   // "Llamar martes 10am"
  zadarmaCallId  String?   // ID de llamada Zadarma
  modo           String    @default("HUMANO")  // HUMANO | AI
  aiCallSid      String?   // CallSid de Twilio (modo AI)
  aiSessionId    String?
  metadata       Json?
  iniciadaAt     DateTime?
  terminadaAt    DateTime?

  lead   Lead
  spech  SpechLlamada?
  agente UsuarioCrm    @relation(fields: [agenteId], references: [id])
}
```

### 3.4 Dominio: WhatsApp

```prisma
model WhatsappPlantilla {
  id         String   @id @default(cuid())
  softwareId String
  nombre     String
  contenido  String   // Texto de la plantilla
  categoria  String   @default("general")
  variables  String[] @default([])  // Variables reemplazables
  activa     Boolean  @default(true)
  orden      Int      @default(0)

  envios     WhatsappEnvio[]
  variantes  WhatsappABTestVariante[]
}

model WhatsappEnvio {
  id             String    @id @default(cuid())
  leadId         String
  plantillaId    String?
  varianteId     String?
  telefono       String
  mensaje        String    // Texto final enviado
  usuarioId      Int?
  enviadoAt      DateTime  @default(now())
  programadoPara DateTime?
  estado         String    @default("enviado")  // enviado | programado | fallido

  lead      Lead               @relation(fields: [leadId], references: [id])
  plantilla WhatsappPlantilla? @relation(fields: [plantillaId], references: [id])
}

model WhatsappConversacion {
  id              String   @id @default(cuid())
  leadId          String   @unique
  softwareId      String
  ultimaActividad DateTime @default(now())
  noLeidos        Int      @default(0)

  lead     Lead              @relation(fields: [leadId], references: [id])
  mensajes WhatsappMensaje[]
}

model WhatsappMensaje {
  id             String   @id @default(cuid())
  conversacionId String
  direccion      String   // "IN" (lead) | "OUT" (yo)
  cuerpo         String
  iaGenerado     Boolean  @default(false)
  usuarioId      Int?
  createdAt      DateTime @default(now())

  conversacion WhatsappConversacion @relation(fields: [conversacionId], references: [id])
}

model WhatsappABTest {
  id          String   @id @default(cuid())
  softwareId  String
  nombre      String
  descripcion String?
  categoria   String   @default("general")
  estado      String   @default("ACTIVO")
  enviosTotal Int      @default(0)

  variantes WhatsappABTestVariante[]
}

model WhatsappABTestVariante {
  id          String @id @default(cuid())
  testId      String
  plantillaId String
  peso        Int    @default(50)
  envios      Int    @default(0)
  respuestas  Int    @default(0)

  test      WhatsappABTest    @relation(fields: [testId], references: [id])
  plantilla WhatsappPlantilla @relation(fields: [plantillaId], references: [id])
}
```

### 3.5 Dominio: Email Outreach

```prisma
model EmailAccount {
  id           String    @id @default(cuid())
  softwareId   String
  proveedor    String    @default("resend")  // resend | mailersend
  nombre       String
  apiKey       String
  cuotaMax     Int?
  cuotaUsada   Int       @default(0)
  cuotaResetEn DateTime?
  activo       Boolean   @default(true)

  senders EmailSender[]
}

model EmailSender {
  id         String   @id @default(cuid())
  softwareId String
  accountId  String?
  email      String
  nombre     String
  esDefault  Boolean  @default(false)
  activo     Boolean  @default(true)
  verificado Boolean  @default(false)

  account  EmailAccount?
  campanas EmailCampana[]
  envios   EmailEnvio[]
}

model EmailPlantilla {
  id          String   @id @default(cuid())
  softwareId  String
  nombre      String
  asunto      String
  cuerpoHtml  String   @db.Text
  cuerpoTexto String?  @db.Text
  variables   String[] @default([])
  tipo        String   @default("custom")
  activo      Boolean  @default(true)

  campanas EmailCampana[]
}

model EmailCampana {
  id              String    @id @default(cuid())
  softwareId      String
  nombre          String
  senderId        String
  plantillaId     String?
  asuntoSnapshot  String
  cuerpoSnapshot  String    @db.Text
  estado          String    @default("borrador")  // borrador | enviando | enviada | cancelada | error
  esAbTest        Boolean   @default(false)
  totalLeads      Int       @default(0)
  enviados        Int       @default(0)
  abiertos        Int       @default(0)
  clicks          Int       @default(0)
  rebotes         Int       @default(0)
  bajas           Int       @default(0)
  programadaPara  DateTime?
  iniciadaEn      DateTime?
  completadaEn    DateTime?

  sender    EmailSender
  plantilla EmailPlantilla?
  envios    EmailEnvio[]
  variantes EmailVariante[]
}

model EmailVariante {
  id          String   @id @default(cuid())
  campanaId   String
  letra       String   // "A", "B", etc.
  asunto      String
  cuerpoHtml  String   @db.Text
  porcentaje  Int
  esGanadora  Boolean  @default(false)
  enviados    Int      @default(0)
  abiertos    Int      @default(0)
  clicks      Int      @default(0)

  campana EmailCampana @relation(fields: [campanaId], references: [id])
}

model EmailEnvio {
  id            String    @id @default(cuid())
  campanaId     String?
  varianteId    String?
  leadId        String?
  senderId      String
  destinatario  String
  asunto        String
  cuerpoHtml    String    @db.Text
  estado        String    @default("pendiente")
  enviadoEn     DateTime?
  abiertoEn     DateTime?
  ultimoClickEn DateTime?

  campana  EmailCampana?
  variante EmailVariante?
  sender   EmailSender
  eventos  EmailEvento[]
}

model EmailEvento {
  id      String   @id @default(cuid())
  envioId String
  tipo    String   // sent | delivered | opened | clicked | bounced | complained | unsubscribed
  datos   Json?
  fecha   DateTime @default(now())

  envio EmailEnvio @relation(fields: [envioId], references: [id])
}

model EmailBaja {
  id         String   @id @default(cuid())
  email      String
  softwareId String
  motivo     String?
  ipOrigen   String?
  fecha      DateTime @default(now())

  @@unique([email, softwareId])
}
```

### 3.6 Dominio: Growth Engine

```prisma
enum ContentType {
  POST
  ARTICLE
  FAQ
  CASE_STUDY
  COMPARISON
  VIDEO_SCRIPT
  LANDING_PAGE
}

enum ContentStatus {
  DRAFT
  SCHEDULED
  PUBLISHED
  FAILED
}

enum SocialPlatform {
  LINKEDIN
  FACEBOOK
  INSTAGRAM
  X
  TIKTOK
}

model Software {
  id                String   @id @default(cuid())
  slug              String   @unique  // "groomly", "silxar"
  nombre            String
  tagline           String?
  descripcion       String?  @db.Text
  urlWebsite        String?
  logoUrl           String?
  colorPrimario     String   @default("#6366F1")
  categoria         String?
  nicho             String?
  problemaPrincipal String?  @db.Text
  promesaValor      String?  @db.Text
  activo            Boolean  @default(true)

  growthConfig           GrowthConfig?
  contentPieces          ContentPiece[]
  referralPrograms       ReferralProgram[]
  marketplaceOpportunities MarketplaceOpportunity[]
}

model GrowthConfig {
  id          String   @id @default(cuid())
  softwareId  String   @unique
  software    Software @relation(fields: [softwareId], references: [id])

  // Social Media
  socialEnabled     Boolean @default(false)
  linkedInToken     String?
  facebookToken     String?
  instagramToken    String?
  xToken            String?
  tiktokToken       String?

  // SEO
  seoEnabled        Boolean @default(false)
  blogDomain        String?
  targetKeywords    String[] @default([])

  // Video
  videoEnabled      Boolean @default(false)
  elevenLabsKey     String?

  // Referrals
  referralsEnabled  Boolean @default(false)
  referralReward    String?
  referralRewardType String @default("months_free")
  referralRewardValue Int @default(1)

  // Activation
  autoActivate      Boolean @default(true)
  activationChannel String   @default("email")
}

model ContentPiece {
  id          String        @id @default(cuid())
  softwareId  String
  software    Software      @relation(fields: [softwareId], references: [id])
  type        ContentType
  status      ContentStatus @default(DRAFT)
  title       String
  body        String        @db.Text
  excerpt     String?
  keywords    String[]      @default([])
  platform    SocialPlatform?
  scheduledAt DateTime?
  publishedAt DateTime?
  externalId  String?

  // Métricas
  impressions    Int @default(0)
  clicks         Int @default(0)
  likes          Int @default(0)
  shares         Int @default(0)
  comments       Int @default(0)
  leadsGenerated Int @default(0)

  leads Lead[]
}

model ReferralProgram {
  id          String   @id @default(cuid())
  softwareId  String
  software    Software @relation(fields: [softwareId], references: [id])
  code        String   @unique
  referrerId  Int
  referrer    ClienteGlobal @relation(fields: [referrerId], references: [id])
  status      String   @default("PENDING")  // PENDING | CONVERTED | EXPIRED
  clicks      Int      @default(0)
  signups     Int      @default(0)
  convertedAt DateTime?
  rewardGiven Boolean  @default(false)
}

model MarketplaceOpportunity {
  id          String   @id @default(cuid())
  softwareId  String
  software    Software @relation(fields: [softwareId], references: [id])
  marketplace String
  title       String
  description String   @db.Text
  url         String
  category    String?
  rating      Float?
  reviews     Int?
  status      String   @default("NEW")
  leadId      String?
}

model ActivationLog {
  id          String   @id @default(cuid())
  leadId      String
  lead        Lead     @relation(fields: [leadId], references: [id])
  action      String
  status      String   @default("PENDING")  // PENDING | EXECUTED | FAILED
  scheduledAt DateTime?
  executedAt  DateTime?
  error       String?
  metadata    Json?
}
```

### 3.7 Dominio: Propuestas, Landings, Calendario

```prisma
enum PropuestaEstado {
  BORRADOR
  ENVIADA
  VISTA
  ACEPTADA
  RECHAZADA
  EXPIRADA
}

model Propuesta {
  id            String          @id @default(cuid())
  softwareId    String
  titulo        String
  descripcion   String?
  leadId        String?
  clienteNombre String
  clienteEmail  String?
  items         Json            // [{servicio, descripcion, cantidad, precioUnitario, subtotal}]
  subtotal      Decimal         @default(0) @db.Decimal(10, 2)
  impuestos     Decimal?        @db.Decimal(10, 2)
  total         Decimal         @default(0) @db.Decimal(10, 2)
  condiciones   String?
  validezDias   Int             @default(30)
  estado        PropuestaEstado @default(BORRADOR)
  urlToken      String          @unique @default(cuid())
  enviadaAt     DateTime?
  vistaAt       DateTime?
  aceptadaAt    DateTime?
  rechazadaAt   DateTime?
  notasRechazo  String?
  creadoPor     Int
}

model Landing {
  id             String   @id @default(cuid())
  softwareId     String
  nombre         String
  slug           String
  url            String
  descripcion    String?
  estado         String   @default("BORRADOR")  // BORRADOR | PUBLICADA | PAUSADA
  visitas        Int      @default(0)
  conversiones   Int      @default(0)
  leadsGenerados Int      @default(0)
  metadata       Json?

  @@unique([slug, softwareId])
}

model FreeValue {
  id             String   @id @default(cuid())
  softwareId     String
  nombre         String
  slug           String
  url            String
  tipo           String   // "ebook", "checklist", "template", "curso"
  descripcion    String?
  estado         String   @default("BORRADOR")
  usos           Int      @default(0)
  leadsGenerados Int      @default(0)
  metadata       Json?

  @@unique([slug, softwareId])
}

model CalendarioEvento {
  id          String   @id @default(cuid())
  titulo      String
  descripcion String?
  fechaInicio DateTime
  fechaFin    DateTime
  todoElDia   Boolean  @default(false)
  asignadoA   String   // "carlos" | "silviu" | "ambos"
  color       String   @default("blue")
  completado  Boolean  @default(false)
  creadoPor   String
}
```

### 3.8 Dominio: Usuarios e IA

```prisma
model UsuarioCrm {
  id                    Int       @id @default(autoincrement())
  email                 String    @unique
  nombre                String
  passwordHash          String
  rol                   String    @default("admin")  // admin | editor | viewer
  fcmToken              String?   // Firebase Cloud Messaging
  notificacionesActivas Boolean   @default(true)
  ultimoLogin           DateTime?
  ultimoLoginIp         String?
  activo                Boolean   @default(true)

  conversaciones ConversacionIa[]
  leads          Lead[]
  llamadas       LlamadaReal[]
}

model ConversacionIa {
  id              Int      @id @default(autoincrement())
  usuarioId       Int
  mensajeUsuario  String
  respuestaIa     String   @db.Text
  sqlGenerado     String?  // SQL generado por la IA
  datosConsulta   Json?    // Resultados de la query
  tiempoRespuesta Int?     // ms
  fecha           DateTime @default(now())

  usuario  UsuarioCrm @relation(fields: [usuarioId], references: [id])
  acciones AccionIa[]
}

model AccionIa {
  id             String    @id @default(cuid())
  usuarioId      Int
  conversacionId Int?
  tipo           String    // create_lead | update_lead_status | create_calendar_event | send_whatsapp
  descripcion    String
  datosEntrada   Json
  datosSalida    Json?
  estado         String    @default("propuesta")  // propuesta | confirmada | ejecutada | cancelada
  confirmadoPor  Int?
  error          String?
  ejecutadaAt    DateTime?
}
```

---

## 4. Backend Express — Módulos

### 4.1 Autenticación (`/api/auth`)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST` | `/api/auth/login` | Login con email + password. Devuelve JWT access + refresh |
| `POST` | `/api/auth/refresh` | Renueva access token usando refresh token |
| `POST` | `/api/auth/logout` | Cierra sesión (invalida token lado cliente) |
| `GET` | `/api/auth/me` | Devuelve datos del usuario autenticado |
| `POST` | `/api/auth/register-fcm` | Registra token FCM para notificaciones push |

**Flujo de autenticación:**
```
1. Usuario ingresa email + password
2. Backend verifica con bcrypt.compare()
3. Genera JWT access token (corto: ~15min) + refresh token (largo: ~7d)
4. Frontend guarda ambos en localStorage
5. Cada petición incluye access token en header Authorization: Bearer xxx
6. Si access expira, frontend usa refresh para obtener nuevo par
7. authMiddleware verifica JWT en cada ruta protegida
```

### 4.2 Dashboard (`/api/dashboard`)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/dashboard` | KPIs globales (MRR, ARR, clientes, churn, etc.) |
| `GET` | `/api/dashboard/clientes` | Lista paginada de clientes |
| `GET` | `/api/dashboard/clientes/:id` | Detalle de cliente + suscripciones + pagos + eventos |
| `GET` | `/api/dashboard/eventos` | Feed de eventos del sistema |
| `GET` | `/api/dashboard/metricas` | Métricas históricas por día |
| `GET` | `/api/dashboard/saas` | Lista de SaaS configurados |

**KPIs que devuelve:**
- MRR (Monthly Recurring Revenue)
- ARR (Annual Recurring Revenue)
- Total de clientes
- Suscripciones activas
- Trials activos
- Cancelaciones últimos 30 días
- Churn rate
- Ingresos últimos 30 días

### 4.3 Leads (`/api/leads`)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/leads` | Lista con filtros (estado, prioridad, origen, tags, búsqueda) |
| `GET` | `/api/leads/stats` | Estadísticas agrupadas por estado y prioridad |
| `GET` | `/api/leads/sectores` | Lista de sectores distintos |
| `GET` | `/api/leads/buscar` | Búsqueda en fuentes externas (Páginas Amarillas, Google Maps) |
| `GET` | `/api/leads/:id` | Detalle completo de lead + historial |
| `POST` | `/api/leads` | Crear lead |
| `PUT` | `/api/leads/:id` | Actualizar lead |
| `DELETE` | `/api/leads/:id` | Eliminar lead |
| `POST` | `/api/leads/:id/historial` | Añadir entrada al historial |
| `PUT` | `/api/leads/:id/estado` | Cambiar estado del lead |
| `POST` | `/api/leads/importar-csv` | Importar leads desde CSV |
| `POST` | `/api/leads/:id/convertir` | Convertir lead a cliente |
| `GET` | `/api/leads/plantilla-csv` | Descargar plantilla CSV |

**Filtros disponibles en listado:**
- `estado`: NUEVO, CONTACTADO, INTERESADO, etc.
- `prioridad`: BAJA, MEDIA, ALTA, URGENTE
- `softwareId`: Filtrar por SaaS
- `search`: Búsqueda por nombre, email, empresa
- `asignadoA`: Filtrar por usuario asignado
- `hasTelefono` / `hasEmail`: Booleanos
- `sector`: Filtrar por sector de negocio
- `excludeTags` / `includeTags`: Filtrar por etiquetas

**Scraping de leads:**
- `buscarPaginasAmarillas(q, ciudad)` — Scrapea páginasamarillas.es
- `getGoogleMapsSearchUrl(q, ciudad)` — Genera URL de búsqueda

### 4.4 Calendario (`/api/calendario`)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/calendario/events?inicio=...&fin=...&asignadoA=...` | Eventos en rango de fechas |
| `GET` | `/api/calendario/events/:id` | Evento específico |
| `POST` | `/api/calendario/events` | Crear evento |
| `PUT` | `/api/calendario/events/:id` | Actualizar evento |
| `DELETE` | `/api/calendario/events/:id` | Eliminar evento |
| `GET` | `/api/calendario/stats` | Stats: eventos hoy, pendientes por persona |

**Asignación:** `carlos`, `silviu`, o `ambos`.
**Colores:** `blue`, `green`, `purple`, `orange`, `red`, `pink`.

### 4.5 Llamadas (`/api/llamadas`) — Véase sección 5

### 4.6 WhatsApp (`/api/whatsapp`)

#### Plantillas
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/whatsapp/plantillas` | Listar plantillas |
| `GET` | `/api/whatsapp/plantillas/:id` | Ver plantilla |
| `POST` | `/api/whatsapp/plantillas` | Crear plantilla |
| `PUT` | `/api/whatsapp/plantillas/:id` | Actualizar plantilla |
| `DELETE` | `/api/whatsapp/plantillas/:id` | Eliminar plantilla |
| `POST` | `/api/whatsapp/plantillas/generar-ia` | Generar plantilla con IA |
| `POST` | `/api/whatsapp/plantillas/seed` | Crear plantillas iniciales |

#### Envíos
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST` | `/api/whatsapp/enviar` | Enviar WhatsApp a un lead |
| `POST` | `/api/whatsapp/preview` | Previsualizar mensaje renderizado |
| `GET` | `/api/whatsapp/envios` | Historial de envíos |

#### A/B Tests
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/whatsapp/ab-tests` | Listar tests A/B |
| `GET` | `/api/whatsapp/ab-tests/:id` | Ver test |
| `GET` | `/api/whatsapp/ab-tests/:id/metrics` | Métricas del test |
| `POST` | `/api/whatsapp/ab-tests` | Crear test |
| `PUT` | `/api/whatsapp/ab-tests/:id` | Actualizar test |
| `DELETE` | `/api/whatsapp/ab-tests/:id` | Eliminar test |

#### Conversaciones (chat manual/híbrido)
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/whatsapp/conversaciones?softwareId=xxx` | Lista de conversaciones |
| `GET` | `/api/whatsapp/conversaciones/:leadId` | Hilo completo de conversación |
| `POST` | `/api/whatsapp/conversaciones/:leadId/mensajes` | Enviar mensaje |
| `POST` | `/api/whatsapp/conversaciones/:leadId/leida` | Marcar como leída |
| `POST` | `/api/whatsapp/conversaciones/:leadId/sugerir` | Sugerir respuesta con IA |

#### Secciones Creativas
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/whatsapp/cementerio` | Leads inactivos ("cementerio") |
| `POST` | `/api/whatsapp/cementerio/resurrect` | Generar mensaje de resurrección |
| `POST` | `/api/whatsapp/arena` | Batalla de plantillas contra perfiles sintéticos |
| `POST` | `/api/whatsapp/sparring` | Entrenamiento: IA responde como lead |
| `POST` | `/api/whatsapp/whisper` | Consejos IA para redactar mejor |
| `GET` | `/api/whatsapp/storyboard/:leadId` | Storyboard del lead |
| `POST` | `/api/whatsapp/personalizar-masa` | Generar mensajes personalizados en lote |
| `GET` | `/api/whatsapp/snippets` | Comandos rápidos disponibles |
| `POST` | `/api/whatsapp/snippet` | Ejecutar comando rápido |

### 4.7 Email (`/api/email`)

#### Cuentas y Remitentes
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/email/accounts` | Cuentas de email (Resend, Mailersend) |
| `POST` | `/api/email/accounts` | Crear cuenta |
| `PUT` | `/api/email/accounts/:id` | Actualizar cuenta |
| `DELETE` | `/api/email/accounts/:id` | Eliminar cuenta |
| `GET` | `/api/email/senders` | Remitentes (from addresses) |
| `POST` | `/api/email/senders` | Crear remitente |
| `PUT` | `/api/email/senders/:id` | Actualizar remitente |
| `DELETE` | `/api/email/senders/:id` | Eliminar remitente |

#### Plantillas
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/email/plantillas` | Listar plantillas |
| `GET` | `/api/email/plantillas/:id` | Ver plantilla |
| `POST` | `/api/email/plantillas` | Crear plantilla |
| `PUT` | `/api/email/plantillas/:id` | Actualizar plantilla |
| `DELETE` | `/api/email/plantillas/:id` | Eliminar plantilla |

#### Envíos y Campañas
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST` | `/api/email/send` | Enviar email 1-a-1 |
| `GET` | `/api/email/envios` | Historial de envíos |
| `GET` | `/api/email/campanas` | Listar campañas |
| `GET` | `/api/email/campanas/:id` | Ver campaña |
| `POST` | `/api/email/campanas/preview` | Preview de audiencia |
| `POST` | `/api/email/campanas` | Crear campaña (con A/B testing opcional) |
| `POST` | `/api/email/campanas/:id/promover/:varianteId` | Promover variante ganadora |
| `POST` | `/api/email/campanas/:id/enviar` | Lanzar campaña |
| `POST` | `/api/email/campanas/:id/cancelar` | Cancelar campaña |
| `GET` | `/api/email/campanas/:id/envios` | Envíos de campaña |
| `GET` | `/api/email/campanas/:id/eventos` | Eventos de campaña (opens, clicks) |

#### Webhooks y Bajas
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST` | `/api/email/webhook` | Webhook de Resend (entregas, opens, clicks, bounces) |
| `GET` | `/api/email/baja?token=xxx` | Verificar token de baja (público) |
| `POST` | `/api/email/baja` | Procesar baja/unsubscribe (público) |
| `GET` | `/api/email/bajas` | Listar bajas (admin) |
| `DELETE` | `/api/email/bajas/:id` | Restaurar contacto |

### 4.8 Propuestas (`/api/propuestas`)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/propuestas` | Listar propuestas |
| `GET` | `/api/propuestas/:id` | Ver propuesta |
| `POST` | `/api/propuestas` | Crear propuesta |
| `PUT` | `/api/propuestas/:id` | Actualizar (solo si está en BORRADOR) |
| `DELETE` | `/api/propuestas/:id` | Eliminar propuesta |
| `POST` | `/api/propuestas/:id/enviar` | Enviar propuesta (cambia estado a ENVIADA) |
| `POST` | `/api/propuestas/:id/duplicar` | Duplicar propuesta |

**Rutas públicas (sin auth):**
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/propuestas/publica/:token` | Ver propuesta pública (marca como VISTA) |
| `POST` | `/api/propuestas/publica/:token/aceptar` | Aceptar propuesta |
| `POST` | `/api/propuestas/publica/:token/rechazar` | Rechazar propuesta |

**Cálculo automático:**
- Subtotal = Σ(cantidad × precioUnitario)
- Impuestos = Subtotal × 21% (IVA)
- Total = Subtotal + Impuestos

### 4.9 Landings y Free Values (`/api/landings`, `/api/free-values`)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/landings` | Listar landings |
| `GET` | `/api/landings/:id` | Ver landing |
| `POST` | `/api/landings` | Crear landing |
| `PUT` | `/api/landings/:id` | Actualizar landing |
| `DELETE` | `/api/landings/:id` | Eliminar landing |
| `GET` | `/api/landings/stats` | Estadísticas |
| `GET` | `/api/free-values` | Listar free values |
| `GET` | `/api/free-values/:id` | Ver free value |
| `POST` | `/api/free-values` | Crear free value |
| `PUT` | `/api/free-values/:id` | Actualizar |
| `DELETE` | `/api/free-values/:id` | Eliminar |
| `GET` | `/api/free-values/stats` | Estadísticas |

**Landings:** Páginas de captura de leads (ej: peluguau.com/veterinaria-madrid).
**Free Values:** Lead magnets (ebooks, checklists, templates) que generan leads.

### 4.10 Growth Engine (`/api/growth`)

#### Configuración
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/growth/config/:softwareId` | Config del Growth Engine |
| `PUT` | `/api/growth/config/:softwareId` | Actualizar config |

#### Contenido
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/growth/content` | Listar piezas de contenido |
| `POST` | `/api/growth/content` | Crear contenido manual |
| `POST` | `/api/growth/content/:id/generate` | Generar contenido con IA |
| `POST` | `/api/growth/content/:id/schedule` | Programar publicación |
| `POST` | `/api/growth/content/:id/publish` | Publicar ahora |
| `POST` | `/api/growth/content/:id/regenerate` | Regenerar contenido |
| `DELETE` | `/api/growth/content/:id` | Eliminar |

#### Calendario Editorial
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/growth/calendar` | Calendario de publicaciones programadas |

#### Métricas
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/growth/metrics` | Métricas del funnel |
| `POST` | `/api/growth/metrics/calculate` | Calcular métricas diarias |

#### Referidos
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/growth/referrals` | Stats de referidos |
| `POST` | `/api/growth/referrals` | Crear link de referido |
| `GET` | `/api/growth/referrals/client/:clienteId` | Referidos de un cliente |
| `GET` | `/api/growth/referrals/leaderboard` | Ranking de referidores |
| `POST` | `/api/growth/referrals/:id/process-reward` | Procesar recompensa |
| `GET` | `/api/growth/referral/:code/public` | Datos públicos del referido |

#### Marketplaces
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/growth/marketplaces` | Oportunidades detectadas |
| `GET` | `/api/growth/marketplaces/metrics` | Métricas |
| `POST` | `/api/growth/marketplaces/monitor` | Monitorear marketplaces |
| `POST` | `/api/growth/marketplaces/:id/convert` | Convertir oportunidad a lead |

#### Activación
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/growth/activation/:softwareId` | Config de activación |
| `PUT` | `/api/growth/activation/:softwareId` | Actualizar config |
| `POST` | `/api/growth/activate/:leadId` | Activar un lead manualmente |
| `POST` | `/api/growth/activation/preview/:leadId` | Preview de activación |
| `GET` | `/api/growth/activation/logs/:softwareId` | Logs de activaciones |
| `GET` | `/api/growth/activation/stats/:softwareId` | Stats |
| `GET` | `/api/growth/activation/recent/:softwareId` | Leads recientemente activados |
| `POST` | `/api/growth/activation/process-pending` | Procesar pendientes |
| `POST` | `/api/growth/inbound-lead` | **PÚBLICO**: Lead inbound desde web |

#### SEO y Video
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST` | `/api/growth/seo/batch` | Generar contenido SEO en batch |
| `POST` | `/api/growth/seo/landing` | Generar landing page programática |
| `POST` | `/api/growth/seo/keywords` | Sugerencias de keywords |
| `POST` | `/api/growth/seo/meta-tags` | Generar meta tags |
| `POST` | `/api/growth/seo/schema` | Generar schema markup |
| `GET` | `/api/growth/blog` | Blog público (sin auth) |
| `GET` | `/api/growth/blog/:slug` | Post público (sin auth) |
| `GET` | `/api/growth/video/templates` | Templates de video |
| `POST` | `/api/growth/video/generate` | Generar kit de video |
| `POST` | `/api/growth/video/:id/voice` | Generar voz (ElevenLabs) |

### 4.11 IA Chat (`/api/ia`)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST` | `/api/ia/chat` | Chat con IA (respuesta completa) |
| `POST` | `/api/ia/chat-stream` | Chat con IA (streaming de tokens) |
| `GET` | `/api/ia/history` | Historial de conversaciones |
| `GET` | `/api/ia/suggestions` | Sugerencias de prompts |
| `GET` | `/api/ia/insights` | Insights del negocio |
| `POST` | `/api/ia/generate-plantilla` | Generar plantilla de email con IA |

**Flujo del chat IA:**
1. Usuario envía mensaje
2. IA interpreta la intención (usando LLM)
3. Si requiere datos: genera SQL → ejecuta en PostgreSQL → devuelve resultados
4. IA formatea respuesta natural
5. Si la IA propone una acción (crear lead, enviar email, etc.):
   - Crea una `AccionIa` con estado "propuesta"
   - Usuario debe confirmar explícitamente antes de ejecutar
6. Todo se guarda en `ConversacionIa` con SQL generado y resultados

**Acciones IA disponibles:**
- `create_lead` — Crear lead
- `update_lead_status` — Cambiar estado de lead
- `create_calendar_event` — Crear evento en calendario
- `add_lead_note` — Añadir nota a lead
- `send_whatsapp` — Enviar WhatsApp

### 4.12 Softwares (`/api/softwares`)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/softwares` | Listar todos los softwares |
| `GET` | `/api/softwares/:slug` | Ver software por slug |
| `POST` | `/api/softwares` | Crear software |
| `PUT` | `/api/softwares/:id` | Actualizar software |
| `DELETE` | `/api/softwares/:id` | Eliminar software |

**Configuración por software:** nombre, tagline, descripción, colores, ICP (Ideal Customer Profile), problemas, diferenciador.

### 4.13 Webhooks (`/api/webhooks`)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST` | `/api/webhooks` | Recibir webhooks de SaaS clientes |
| `GET` | `/api/webhooks/config` | Configuración de webhooks |
| `POST` | `/api/webhooks/config` | Crear/actualizar config |

**Webhooks que recibe:**
- Registro de nuevo cliente
- Nuevo pago
- Cancelación de suscripción
- Upgrade/downgrade de plan
- Login de usuario

---

## 5. Agente de Voz AI (`llamadas/`)

### 5.1 Arquitectura

Servidor FastAPI en Python que orquesta llamadas de voz usando Google Gemini Live API + Twilio.

```
Twilio (μ-law 8kHz) ↔ AudioBridge ↔ Gemini Live (PCM 16k/24k)
         ↑                                          ↓
    WebSocket /media                          Function Calling
         ↑                                          ↓
    TwiML /voice                            Tools (CRM, agendar, etc.)
```

### 5.2 Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET/POST` | `/voice` | Webhook Twilio: devuelve TwiML con `<Connect><Stream>` |
| `WS` | `/media` | WebSocket bidireccional de audio |
| `POST` | `/outbound` | Iniciar llamada saliente |
| `POST` | `/simulate/start` | Simulación por texto |
| `POST` | `/simulate/{sid}/message` | Enviar mensaje en simulación |
| `WS` | `/simulate/live` | Simulación con audio real |
| `GET` | `/status` | Healthcheck + métricas |

### 5.3 Pipeline de Audio

1. **Twilio** envía audio en μ-law 8kHz
2. **AudioBridge** convierte: μ-law → PCM 16kHz (hacia Gemini) y PCM 24kHz → μ-law 8kHz (hacia Twilio)
3. **Gemini Live** recibe PCM 16kHz y devuelve PCM 24kHz con voz nativa
4. **VAD** configurado a 500ms de silencio para responder rápido
5. **Barge-in**: si usuario interrumpe, se corta reproducción del agente

### 5.4 Mariana (Avatar de Ventas)

Prompt de 5 capas:
1. **Identidad**: Asesora comercial de GestPro, acento mexicano neutro
2. **Prosodia**: Pausas naturales, muletillas, dudas, risas — para sonar humana
3. **Reglas de Supervivencia**: Manejo de interrupciones, insultos, opt-out
4. **Flujo**: Saludo → Interés → Objeción → Agendar demo → Despedida
5. **Guiones por Nicho**: Veterinaria, peluquería, dentista, gimnasio, yoga, terapeuta, entrenador

### 5.5 Tools (Function Calling)

| Tool | Uso |
|------|-----|
| `consultar_crm` | Obtener datos del lead |
| `buscar_caso_de_exito` | Buscar caso relevante por tipo de negocio |
| `calcular_roi` | Calcular ROI con datos del prospecto |
| `comparar_con_competidor` | Comparar con herramienta actual |
| `agendar_demo` | Agendar demo en Cal.com |
| `enviar_whatsapp` | Enviar seguimiento por WhatsApp |
| `transferir_humano` | Transferir a vendedor humano |

### 5.6 Pre-calentamiento de Sesiones

Para reducir latencia de primera respuesta:
1. `/voice` recibe el webhook de Twilio
2. Inicia `prewarm_session()` en background (fire-and-forget)
3. El prewarm hace handshake con Gemini mientras suena el timbre
4. Cuando el prospecto contesta y abre `/media`, la sesión ya está lista

---

## 6. Frontend Next.js — Páginas

### 6.1 Estructura de rutas

```
frontend/src/app/
├── page.tsx                    # Landing page pública
├── layout.tsx                  # Root layout
├── globals.css                 # Estilos globales + variables CSS
│
├── auth/
│   └── login/
│       └── page.tsx            # Login con email + password
│
├── blog/
│   └── [slug]/
│       └── page.tsx            # Blog público (SEO)
│
├── r/
│   └── [code]/
│       └── page.tsx            # Página pública de referido
│
├── propuesta/
│   └── [token]/
│       └── page.tsx            # Propuesta comercial pública
│
└── dashboard/
    ├── layout.tsx              # Layout con Sidebar + auth check
    ├── page.tsx                # Dashboard principal (KPIs)
    │
    ├── leads/
    │   └── page.tsx            # Gestión de leads (tabla + filtros)
    │
    ├── clientes/
    │   └── [id]/
    │       └── page.tsx        # Detalle de cliente
    │
    ├── llamadas/
    │   ├── page.tsx            # Centro de Llamadas (4 tabs)
    │   └── probar-ai/
    │       └── page.tsx        # Probar agente AI con audio
    │
    ├── calendario/
    │   └── page.tsx            # Calendario de eventos
    │
    ├── email/
    │   ├── page.tsx            # Dashboard email
    │   ├── accounts/
    │   │   └── page.tsx        # Cuentas de email
    │   ├── senders/
    │   │   └── page.tsx        # Remitentes
    │   ├── plantillas/
    │   │   ├── page.tsx        # Lista de plantillas
    │   │   ├── [id]/           # Ver/editar plantilla
    │   │   └── nueva/          # Crear plantilla
    │   ├── campanas/
    │   │   ├── page.tsx        # Lista de campañas
    │   │   ├── [id]/           # Ver campaña
    │   │   └── nueva/          # Crear campaña
    │   └── bajas/
    │       └── page.tsx        # Gestión de bajas
    │
    ├── whatsapp/
    │   ├── page.tsx            # Dashboard WhatsApp
    │   ├── plantillas/
    │   ├── envios/
    │   ├── ab-tests/
    │   ├── conversaciones/
    │   ├── cementerio/
    │   ├── arena/
    │   └── sparring/
    │
    ├── metricas/
    │   └── page.tsx            # Métricas y analytics
    │
    ├── eventos/
    │   └── page.tsx            # Feed de eventos
    │
    ├── growth/
    │   ├── page.tsx            # Dashboard Growth
    │   ├── content/
    │   │   └── page.tsx        # Contenido generado
    │   ├── calendar/
    │   │   └── page.tsx        # Calendario editorial
    │   ├── seo/
    │   │   └── page.tsx        # SEO Engine
    │   ├── referrals/
    │   │   └── page.tsx        # Programa de referidos
    │   ├── marketplaces/
    │   │   └── page.tsx        # Oportunidades de marketplaces
    │   ├── activation/
    │   │   └── page.tsx        # Activación automática
    │   ├── analytics/
    │   │   └── page.tsx        # Métricas de Growth
    │   ├── config/
    │   │   └── page.tsx        # Configuración del Growth
    │   ├── generar/
    │   │   └── page.tsx        # Generar contenido
    │   └── video/
    │       └── page.tsx        # Video Engine
    │
    ├── propuestas/
    │   └── page.tsx            # Propuestas comerciales
    │
    ├── softwares/
    │   └── page.tsx            # Configuración de softwares
    │
    ├── ia/
    │   └── page.tsx            # Chat con IA (Copilot)
    │
    ├── free-values/
    │   └── page.tsx            # Free values / lead magnets
    │
    └── tareas/
        └── page.tsx            # Tareas y gamificación
```

### 6.2 Dashboard Principal (`/dashboard`)

Muestra KPIs en tiempo real:
- **Tarjetas superiores**: MRR, ARR, Clientes totales, Suscripciones activas, Trials, Cancelaciones 30d
- **Gráfica MRR**: Evolución del MRR últimos 30 días
- **Gráfica de clientes**: Nuevos vs cancelados
- **Tabla de SaaS**: Breakdown por software (MRR, suscripciones, clientes)
- **Eventos recientes**: Últimos eventos del sistema
- **Pagos recientes**: Últimos pagos recibidos

### 6.3 Leads (`/dashboard/leads`)

- **Tabla paginada** de leads con: nombre, email, teléfono, empresa, estado, prioridad, tags
- **Filtros avanzados**: estado, prioridad, origen, software, tags, búsqueda
- **Acciones rápidas**: Ver, editar, eliminar, cambiar estado, asignar
- **Importar CSV**: Arrastrar archivo CSV para importar masivamente
- **Scraping**: Buscar leads en Páginas Amarillas directamente desde la UI

### 6.4 Centro de Llamadas (`/dashboard/llamadas`)

Véase la sección detallada en el documento anterior. Tiene 4 tabs: Llamar, Practicar, Spechs, Historial.

### 6.5 WhatsApp (`/dashboard/whatsapp`)

- **Dashboard**: Métricas de envíos, tasa de apertura, respuestas
- **Plantillas**: CRUD de plantillas con generación IA
- **Envíos**: Historial de todos los envíos
- **A/B Tests**: Comparar dos plantillas con métricas
- **Conversaciones**: Chat manual tipo WhatsApp Web con cada lead
- **Cementerio**: Leads inactivos con resucitador IA
- **Arena**: Batalla de plantillas contra perfiles sintéticos
- **Sparring**: Entrenamiento con IA respondiendo como lead
- **Snippets**: Comandos rápidos tipo `/formal`, `/urgente`

### 6.6 Email (`/dashboard/email`)

- **Accounts**: Cuentas de envío (Resend, Mailersend) con API keys
- **Senders**: Remitentes (from addresses) verificados
- **Plantillas**: CRUD con variables {{nombre}}, {{empresa}}, etc.
- **Campañas**: Crear, programar, lanzar campañas masivas
  - A/B testing: Variantes A/B con split automático
  - Preview de audiencia antes de enviar
  - Programación para fecha futura
- **Historial**: Todos los envíos con estado (pendiente, enviado, fallido)
- **Bajas**: Gestión de unsubscribes

### 6.7 Calendario (`/dashboard/calendario`)

- **Vista mensual/semanal** de eventos
- **Crear evento**: Título, descripción, fecha, asignado a (carlos/silviu/ambos), color
- **Marcar completado**: Check en eventos
- **Filtros**: Por persona asignada
- **Stats**: Eventos hoy, pendientes por persona, completados este mes

### 6.8 Propuestas (`/dashboard/propuestas`)

- **Lista** de propuestas con estado (BORRADOR → ENVIADA → VISTA → ACEPTADA/RECHAZADA)
- **Crear propuesta**: Título, cliente, items (servicio + cantidad + precio), condiciones
- **Cálculo automático**: Subtotal, IVA 21%, Total
- **Enviar**: Genera URL pública única con token
- **Duplicar**: Clonar propuesta existente
- **Seguimiento**: Ver cuándo fue vista, aceptada o rechazada

### 6.9 Growth Engine (`/dashboard/growth`)

- **Dashboard**: Métricas del funnel (impressions → clicks → leads → demos → customers)
- **Contenido**: Biblioteca de piezas generadas (posts, artículos, videos)
- **Generar**: Crear contenido nuevo con IA:
  - Posts para redes sociales
  - Artículos SEO
  - FAQs
  - Case studies
  - Video scripts
- **Calendario editorial**: Ver publicaciones programadas
- **SEO**: Generar landing pages programáticas, keywords, meta tags
- **Referidos**: Crear links, ver stats, leaderboard
- **Marketplaces**: Oportunidades detectadas en Fiverr, Upwork, etc.
- **Activación**: Configurar activación automática de leads inbound
- **Video**: Generar scripts de video + voz con ElevenLabs

### 6.10 IA Chat (`/dashboard/ia`)

- **Chat interactivo** con IA que tiene acceso a la base de datos
- La IA puede:
  - Responder preguntas sobre datos de negocio
  - Generar SQL para consultar datos
  - Proponer acciones (crear lead, enviar email, etc.)
  - Generar plantillas de email
- **Historial**: Conversaciones anteriores
- **Sugerencias**: Prompts predefinidos útiles
- **Streaming**: Respuestas en tiempo real (token por token)

### 6.11 Landings y Free Values

- **Landings**: Páginas de captura con slug, URL, visitas, conversiones
- **Free Values**: Lead magnets con tipo (ebook, checklist, template), usos, leads generados

---

## 7. Flujos de Negocio End-to-End

### 7.1 Captura de Lead → Contacto → Conversión

```
[Visitante] entra a landing page (ej: peluguau.com/veterinaria-madrid)
  ↓
[Visitante] deja email en formulario
  ↓
[Backend] Crea Lead con estado NUEVO + origen "landing"
  ↓
[Growth Engine] Si autoActivate=true, inicia secuencia de activación:
  → Email de bienvenida (plantilla personalizada)
  → WhatsApp de seguimiento (24h después)
  → Email con free value (48h después)
  ↓
[Vendedor] ve lead en dashboard, lo asigna
  ↓
[Vendedor] llama al lead (modo humano o AI)
  ↓
[Lead] acepta demo → estado INTERESADO
  ↓
[Vendedor] envía propuesta comercial
  ↓
[Lead] acepta propuesta en URL pública
  ↓
[Backend] Convierte lead a ClienteGlobal + crea Suscripcion
  ↓
[Webhook] Notifica al SaaS del nuevo cliente
```

### 7.2 Campaña de Email

```
[Usuario] crea campaña: nombre, sender, plantilla, audiencia
  ↓
[Backend] Preview de audiencia: cuenta leads que coinciden con filtros
  ↓
[Usuario] configura A/B test (opcional): variante A y B
  ↓
[Usuario] programa fecha o lanza inmediatamente
  ↓
[Backend] Para cada lead que coincide:
  → Renderiza plantilla con variables del lead
  → Crea EmailEnvio en estado "pendiente"
  → Si es A/B: asigna aleatoriamente a variante
  ↓
[Worker] Procesa envíos en batches via Resend API
  ↓
[Resend] Envía emails + dispara webhook de eventos
  ↓
[Webhook] Recibe: delivered, opened, clicked, bounced
  → Actualiza EmailEnvio y EmailEvento
  → Si A/B: calcula ganadora automáticamente
  → Actualiza métricas de campaña
  ↓
[Usuario] ve métricas: enviados, abiertos, clicks, tasa de conversión
```

### 7.3 Llamada AI Completa

```
[Vendedor] selecciona lead en dashboard → "Llamar con AI"
  ↓
[Frontend] POST /api/llamadas/iniciar-ai
  ↓
[Backend] Crea LlamadaReal (estado: ai_conectando, modo: AI)
  ↓
[Backend] POST /outbound al agente Python con datos del lead
  ↓
[Agente] Twilio.calls.create() → llama al lead
  ↓
[Lead] contesta → Twilio POST /voice al agente
  ↓
[Agente] Responde TwiML con <Connect><Stream> → abre WS /media
  ↓
[Agente] Media Stream ↔ Gemini Live (audio bidireccional)
  → Mariana saluda, identifica dolor del lead
  → Usa tools: buscar_caso_de_exito, calcular_roi
  → Lead acepta demo → tool agendar_demo
  → Agente envía WhatsApp de confirmación
  ↓
[Llamada termina] Agente guarda en PostgreSQL
  → transcript completo
  → outcome: "demo_agendada"
  → duración, emoción, frustración
  ↓
[Agente] POST webhook al backend con resultado
  ↓
[Backend] Actualiza LlamadaReal + cambia lead a INTERESADO
  ↓
[Backend] Emite Socket.IO → Frontend muestra resultado
  → Transcript completo visible
  → Demo agendada en calendario
```

---

## 8. Autenticación y Seguridad

### 8.1 JWT Tokens

```
Access Token:  JWT firmado, expira en ~15 minutos
  Payload: { userId, email, rol }
  Uso: Cada petición API en header Authorization: Bearer <token>

Refresh Token: JWT firmado con secret distinto, expira en ~7 días
  Uso: Renovar access token cuando expira
  Almacenamiento: localStorage (frontend)
```

### 8.2 Middleware de Autenticación

```typescript
// authMiddleware verifica:
1. Header Authorization presente
2. Token válido (jwt.verify)
3. Usuario existe y está activo
4. Añade req.user = { userId, email, rol }
```

### 8.3 Roles

| Rol | Permisos |
|-----|----------|
| `admin` | Todo |
| `editor` | CRUD de leads, llamadas, campañas. No puede eliminar cuentas ni ver API keys |
| `viewer` | Solo lectura |

### 8.4 Rate Limiting

- `/api/auth/login`: limitado para prevenir brute force
- Webhooks: verificación de firma (Resend, Zadarma)
- API del agente AI: secreto compartido (`X-Agent-Secret`)

---

## 9. Webhooks y Eventos

### 9.1 Webhooks entrantes

| Origen | Endpoint | Eventos |
|--------|----------|---------|
| **SaaS Clientes** | `/api/webhooks` | registro, pago, cancelación, login |
| **Zadarma** | `/api/llamadas/webhook/zadarma` | NOTIFY_START, NOTIFY_ANSWER, NOTIFY_END |
| **Agente AI** | `/api/llamadas/webhook/ai` | call_ended con transcript y outcome |
| **Resend** | `/api/email/webhook` | delivered, opened, clicked, bounced |

### 9.2 Eventos Socket.IO

```typescript
// Canales
io.to(`saas:${softwareId}`).emit(...)   // Eventos por software
io.to(`llamadas`).emit(...)             // Eventos globales de llamadas

// Eventos emitidos
'llamada:estado'       // Cambio de estado de llamada
'llamada:grabacion'    // Grabación disponible
```

### 9.3 Notificaciones Push (FCM)

- Usuarios registran token FCM vía `/api/auth/register-fcm`
- Eventos críticos (nuevo pago, cancelación) disparan notificación push
- Las notificaciones se marcan como "procesadas" para evitar duplicados

---

## 10. Configuración y Variables de Entorno

### 10.1 Backend (`backend/.env`)

```bash
# Base de datos
DATABASE_URL=postgresql://user:pass@host:5432/db
DIRECT_URL=postgresql://user:pass@host:5432/db

# JWT
JWT_SECRET=super-secret-jwt
JWT_REFRESH_SECRET=super-secret-refresh

# Agente AI
AI_AGENT_URL=http://localhost:8000
AI_AGENT_SECRET=secreto-agente

# Zadarma (llamadas humanas)
ZADARMA_KEY=...
ZADARMA_SECRET=...
ZADARMA_DEFAULT_AGENT_PHONE=+521...

# Email (Resend)
RESEND_API_KEY=re_...
RESEND_WEBHOOK_SECRET=...

# OpenAI / IA
OPENAI_API_KEY=sk-...

# Firebase (FCM push notifications)
FIREBASE_PROJECT_ID=...
FIREBASE_PRIVATE_KEY=...
FIREBASE_CLIENT_EMAIL=...

# Frontend URL (para CORS y links)
FRONTEND_URL=https://app.peluguau.com
```

### 10.2 Agente AI (`llamadas/.env`)

```bash
# Gemini
GEMINI_API_KEY=sk-...
GEMINI_LIVE_MODEL=gemini-3.1-flash-live-preview
GEMINI_VOICE=Leda
GEMINI_LANGUAGE=es-US

# ElevenLabs (pipeline híbrido opcional)
ELEVENLABS_API_KEY=sk_...

# Twilio
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM_NUMBER=+1...

# Servidor
PUBLIC_HOST=agente.peluguau.com
PORT=8000

# Base de datos (compartida con backend)
DATABASE_URL=postgresql://user:pass@host:5432/db

# Webhook al backend
BACKEND_WEBHOOK_URL=https://api.peluguau.com
BACKEND_WEBHOOK_SECRET=secreto-agente

# Redis
REDIS_URL=redis://localhost:6379/0

# Compliance
CALL_HOUR_START=9
CALL_HOUR_END=20
DISCLOSE_AI=true
```

### 10.3 Frontend (`frontend/.env.local`)

```bash
NEXT_PUBLIC_API_URL=https://api.peluguau.com
NEXT_PUBLIC_AI_AGENT_WS_URL=wss://agente.peluguau.com/simulate/live
```

---

## Resumen de Módulos

| Módulo | Backend | Frontend | Propósito |
|--------|---------|----------|-----------|
| **Auth** | `/api/auth` | `/auth/login` | Login JWT |
| **Dashboard** | `/api/dashboard` | `/dashboard` | KPIs y métricas |
| **Leads** | `/api/leads` | `/dashboard/leads` | CRM de prospectos |
| **Llamadas** | `/api/llamadas` | `/dashboard/llamadas` | Centro de llamadas AI + humano |
| **WhatsApp** | `/api/whatsapp` | `/dashboard/whatsapp` | Plantillas, envíos, chat, A/B |
| **Email** | `/api/email` | `/dashboard/email` | Campañas, plantillas, envíos |
| **Calendario** | `/api/calendario` | `/dashboard/calendario` | Eventos y tareas |
| **Propuestas** | `/api/propuestas` | `/dashboard/propuestas` | Propuestas comerciales |
| **Growth** | `/api/growth` | `/dashboard/growth` | Motor de adquisición autónomo |
| **IA** | `/api/ia` | `/dashboard/ia` | Copilot con acceso a datos |
| **Landings** | `/api/landings` | `/dashboard/landings` | Páginas de captura |
| **Free Values** | `/api/free-values` | `/dashboard/free-values` | Lead magnets |
| **Softwares** | `/api/softwares` | `/dashboard/softwares` | Config por SaaS |
| **Webhooks** | `/api/webhooks` | — | Integración con SaaS clientes |
| **Agente AI** | FastAPI `:8000` | `/dashboard/llamadas/probar-ai` | Voz AI con Gemini + Twilio |

---

*Documentación completa del software Silxar CRM*
*Generada el 2026-06-02 para peluguau.com*
