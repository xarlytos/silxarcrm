# Plan: Centro de Operaciones Social Media (Agencia-Level)

## Contexto

Transformar la p&aacute;gina actual de Social Posts (`/dashboard/growth/social-posts`) en un **centro total de operaciones de social media** equivalente al software que usar&iacute;a una agencia de marketing digital profesional.

La base ya existe (pipeline de 9 estados, cuentas multi-plataforma, generaci&oacute;n IA, kanban drag &amp; drop, campos espec&iacute;ficos por red social), pero necesita escalar a nivel agencia: campa&ntilde;as, brands/clientes, asset library, workflow de aprobaciones, analytics avanzados, portal de cliente, y automatizaci&oacute;n inteligente.

---

## Features Propuestas

### 1. BRANDS / CLIENTES (Multi-cliente por Software)

**Problema:** Ahora todo va a `softwareId`. Una agencia gestiona m&uacute;ltiples clientes (brands) dentro de un mismo software.

**Soluci&oacute;n:**
- Nuevo modelo `Brand` (cliente de la agencia):
  - `id`, `softwareId`, `nombre`, `slug`, `logoUrl`, `colorPrimario`
  - `descripcion`, `industria`, `website`, `emailContacto`
  - `brandVoice` (tono de marca definido)
  - `targetAudience` (JSON con datos del p&uacute;blico objetivo)
  - `contentGuidelines` (texto con guidelines de marca)
  - `hashtagsOficiales` (array)
  - `competidores` (array de URLs/usernames)
  - `activo`, `createdAt`, `updatedAt`
- Las `SocialAccount` pasan a tener `brandId` (opcional, compatibilidad hacia atr&aacute;s)
- El selector de software en la UI se ampl&iacute;a con selector de brand

---

### 2. CAMPAÑAS (Campaigns)

**Problema:** No existe el concepto de campa&ntilde;a. Los posts son sueltos.

**Soluci&oacute;n:**
- Nuevo modelo `SocialCampaign`:
  - `id`, `softwareId`, `brandId`
  - `nombre`, `slug`, `descripcion`
  - `objetivo`: enum (`AWARENESS`, `ENGAGEMENT`, `CONVERSION`, `TRAFFIC`, `LEADS`, `SALES`, `UGC`, `LAUNCH`)
  - `fechaInicio`, `fechaFin`
  - `presupuesto`, `moneda`
  - `status`: enum (`PLANNING`, `ACTIVE`, `PAUSED`, `COMPLETED`, `ARCHIVED`)
  - `briefCreativo` (texto largo con el brief)
  - `kpisObjetivo` (JSON: `{ alcance: 10000, engagement: 5.0, clicks: 500, conversiones: 50 }`)
  - `colorTag` (para identificaci&oacute;n visual en calendario)
  - `createdBy` (usuarioId)
- `SocialAccountPost` a&ntilde;ade `campaignId` (opcional)
- Campa&ntilde;as tienen muchos posts

**UI:**
- `/dashboard/growth/campanas` &mdash; listado con filtros por brand, estado, fechas
- `/dashboard/growth/campanas/nueva` &mdash; wizard de creaci&oacute;n
- `/dashboard/growth/campanas/[id]` &mdash; detalle con posts, brief, analytics, equipo

---

### 3. CUENTAS TEMÁTICAS / NICHE ACCOUNTS

**Ejemplo:** "cuenta de Atleevo que relacione con deporte, otra con f&uacute;tbol"

**Soluci&oacute;n:**
- El modelo `Brand` resuelve la segmentaci&oacute;n por cliente
- Adem&aacute;s, cada `SocialAccount` tiene:
  - `categorias` (array): ej `["deporte", "fitness", "running"]`
  - `nicho` (string): ej `"deporte"`, `"futbol"`, `"tecnologia"`
  - `subnichos` (array): ej `["futbol-sala", "entrenamiento"]`
  - `audienciaTarget` (JSON): `{ edad: "18-35", genero: "todos", intereses: ["fitness"] }`
  - `tonoExtendido` (texto): descripci&oacute;n detallada del tono de voz
  - `contenidoProhibido` (texto): qu&eacute; NO publicar
  - `contenidoFavorito` (texto): ejemplos de posts que funcionan
- **Content Themes por cuenta:**
  - Tabla `ContentTheme`: `nombre`, `descripcion`, `frecuencia`, `diaPreferido`, `formatoPreferido`
  - Ej: "Tip del lunes", "Producto mi&eacute;rcoles", "UGC viernes", "Behind the scenes s&aacute;bado"

---

### 4. CONTENT HUB / ASSET LIBRARY

**Problema:** No hay gesti&oacute;n centralizada de im&aacute;genes, videos, copy.

**Soluci&oacute;n:**
- Nuevo modelo `MediaAsset`:
  - `id`, `softwareId`, `brandId`
  - `nombre`, `descripcion`, `tipo` (`IMAGE`, `VIDEO`, `GIF`, `CAROUSEL`, `DOCUMENT`, `AUDIO`)
  - `url`, `thumbnailUrl`, `dimensiones`, `duracion`, `tamanoBytes`
  - `tags`, `plataformasRecomendadas`, `formatosCompatibles`
  - `usoCount`, `ultimoUsoAt`, `metadata` (JSON con EXIF, colores dominantes)
- Nuevo modelo `CopySnippet` (biblioteca de texto reutilizable):
  - `nombre`, `contenido`, `tipo` (`CAPTION`, `CTA`, `HASHTAG_SET`, `BIO`, `RESPONSE`, `HOOK`)
  - `plataformas`, `tags`, `usoCount`

**UI:**
- `/dashboard/growth/biblioteca` &mdash; tabs: Media / Copy / Templates
- Grid de assets con preview, b&uacute;squeda por tags/tipo/plataforma
- Upload drag &amp; drop
- Asset picker directamente desde el modal de crear/editar post

---

### 5. WORKFLOW DE APROBACIONES

**Problema:** El pipeline tiene `IN_REVIEW` pero no hay qui&eacute;n revisa ni c&oacute;mo aprueba.

**Soluci&oacute;n:**
- Nuevo modelo `PostApproval`:
  - `postId`, `reviewerId`, `status` (`PENDING`, `APPROVED`, `REJECTED`, `CHANGES_REQUESTED`)
  - `comentario`, `requestedChanges` (JSON), `createdAt`, `resolvedAt`
- Configuraci&oacute;n de workflow por brand:
  ```json
  {
    "steps": [
      { "role": "creator", "required": true },
      { "role": "reviewer", "required": true },
      { "role": "client", "required": false }
    ],
    "autoPublishAfterApproval": false
  }
  ```
- Comentarios en posts: modelo `PostComment` (`postId`, `usuarioId`, `comentario`, `resuelto`)

**UI:**
- En el kanban, posts en `IN_REVIEW` muestran badge con qui&eacute;n debe revisar
- En el modal de edici&oacute;n, panel lateral de "Comentarios y Aprobaciones"
- Notificaciones cuando te asignan un post para revisar

---

### 6. CALENDARIO EDITORIAL AVANZADO

**Problema:** El calendario actual solo muestra `ContentPiece` (art&iacute;culos). No muestra posts sociales.

**Soluci&oacute;n:**
- Unificar calendario para mostrar TODO:
  - `ContentPiece` (art&iacute;culos SEO)
  - `SocialAccountPost` (posts sociales)
  - `EmailCampana` (campa&ntilde;as de email)
  - Eventos manuales (deadlines, launches)
- Nuevo endpoint: `/api/growth/calendar/unified`
- **Vistas:** mensual / semanal / agenda
- **Filtros:** por brand, plataforma, cuenta, campa&ntilde;a, tipo, estado
- **Drag &amp; drop** para reprogramar posts
- **Best Time to Post:** sugerencias de horario &oacute;ptimo basadas en hist&oacute;rico de engagement

---

### 7. ANALYTICS & REPORTING

**Problema:** No hay analytics espec&iacute;ficos de social media.

**Soluci&oacute;n:**
- Nuevo modelo `SocialPostMetric` (m&eacute;tricas hist&oacute;ricas por post por d&iacute;a):
  - `postId`, `fecha`, `impressions`, `reach`, `likes`, `comments`, `shares`, `saves`, `clicks`
  - `profileVisits`, `follows`, `engagementRate`, `ctr`
  - `storyExits`, `storyReplies`, `videoViews`, `videoCompletionRate`, `averageWatchTime`
- **Dashboard Analytics** (`/dashboard/growth/analytics/social`):
  - KPIs: total reach, engagement rate, growth rate, top post
  - Gr&aacute;ficas: engagement over time, posts por plataforma, best content types, follower growth, posting frequency vs engagement
  - Tablas: top posts, worst posts, cuentas con mejor crecimiento
- **Report Generator:**
  - Periodo: semana, mes, trimestre, custom
  - Cover page con logo del brand
  - Resumen ejecutivo generado por IA
  - Exportar a PDF
  - Programar env&iacute;o autom&aacute;tico semanal/mensual

---

### 8. COMPETIDOR TRACKING

- Nuevo modelo `Competitor`: `nombre`, `username`, `plataforma`, `profileUrl`, `followersCount`
- Nuevo modelo `CompetitorPost`: `competitorId`, `externalId`, `content`, `likes`, `comments`, `shares`, `postedAt`
- **UI:** `/dashboard/growth/competidores`
  - A&ntilde;adir competidor por URL/username
  - Dashboard comparativo side-by-side
  - Gr&aacute;fica de followers over time
  - Posts virales del competidor (inspiraci&oacute;n)
  - Alerts: "Tu competidor public&oacute; un reel con 10K likes"

---

### 9. CONTENT RECYCLING & EVERGREEN

- Campos en `SocialAccountPost`: `isEvergreen`, `recycleCount`, `originalPostId`
- **Evergreen Library:** `/dashboard/growth/evergreen`
  - Posts marcados como evergreen con filtros
  - Bot&oacute;n "Reciclar" &rarr; copia con estado DRAFT
- **Auto-recycle rules:** "Re-publicar posts evergreen con &gt;5% engagement cada 30 d&iacute;as"

---

### 10. VARIANTES A/B DE POSTS

- Al crear un post, opci&oacute;n de "Crear variantes"
- Generar 2-4 variantes: diferente copy, imagen, CTA, horario
- Publicar variantes y medir cu&aacute;l funciona mejor
- Dashboard de resultados por variante

---

### 11. BATCH OPERATIONS

- Selecci&oacute;n m&uacute;ltiple de posts en el kanban
- Acciones batch: cambiar estado, reprogramar, asignar, a&ntilde;adir a campa&ntilde;a, duplicar, eliminar, exportar

---

### 12. NOTIFICACIONES & ACTIVITY FEED

- Modelo `ActivityFeed`: `softwareId`, `usuarioId`, `tipo`, `mensaje`, `metadata`, `read`
- Tipos: `POST_CREATED`, `POST_STATUS_CHANGED`, `POST_ASSIGNED`, `POST_APPROVED`, `POST_REJECTED`, `CAMPAIGN_STARTED`, `CAMPAIGN_ENDED`, `METRIC_MILESTONE`
- UI: Bell icon en header con badge + dropdown + p&aacute;gina completa

---

### 13. PORTAL DE CLIENTE

- Ruta semi-p&uacute;blica con token: `/cliente/[brandSlug]`
- Vista read-only del cliente:
  - Sus campa&ntilde;as activas
  - Calendario editorial de sus posts
  - Posts pendientes de aprobaci&oacute;n (bot&oacute;n aprobar/rechazar)
  - Reportes de sus campa&ntilde;as
  - NO puede editar posts, solo aprobar/comentar

---

## Schema Prisma &mdash; Modelos Nuevos

```prisma
model Brand {
  id                String   @id @default(cuid())
  softwareId        String   @map("software_id")
  software          Software @relation(fields: [softwareId], references: [id], onDelete: Cascade)
  nombre            String
  slug              String
  logoUrl           String?  @map("logo_url")
  colorPrimario     String   @default("#6366F1") @map("color_primario")
  descripcion       String?  @db.Text
  industria         String?
  website           String?
  emailContacto     String?  @map("email_contacto")
  brandVoice        String?  @map("brand_voice") @db.Text
  targetAudience    Json?    @map("target_audience")
  contentGuidelines String?  @map("content_guidelines") @db.Text
  hashtagsOficiales String[] @default([]) @map("hashtags_oficiales")
  competidores      Json?
  approvalWorkflow  Json?    @map("approval_workflow")
  activo            Boolean  @default(true)
  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt @map("updated_at")

  socialAccounts    SocialAccount[]
  campaigns         SocialCampaign[]
  mediaAssets       MediaAsset[]
  copySnippets      CopySnippet[]
  competitors       Competitor[]

  @@index([softwareId])
  @@index([slug])
  @@index([activo])
  @@map("brands")
}

model SocialCampaign {
  id            String          @id @default(cuid())
  softwareId    String          @map("software_id")
  brandId       String          @map("brand_id")
  brand         Brand           @relation(fields: [brandId], references: [id], onDelete: Cascade)
  nombre        String
  slug          String
  descripcion   String?         @db.Text
  objetivo      CampaignObjective @default(AWARENESS)
  fechaInicio   DateTime?       @map("fecha_inicio")
  fechaFin      DateTime?       @map("fecha_fin")
  presupuesto   Decimal?        @db.Decimal(10, 2)
  moneda        String          @default("EUR")
  status        CampaignStatus  @default(PLANNING)
  briefCreativo String?         @map("brief_creativo") @db.Text
  kpisObjetivo  Json?           @map("kpis_objetivo")
  colorTag      String          @default("#6366F1") @map("color_tag")
  createdBy     Int             @map("created_by")
  createdAt     DateTime        @default(now()) @map("created_at")
  updatedAt     DateTime        @updatedAt @map("updated_at")

  posts         SocialAccountPost[]

  @@index([softwareId])
  @@index([brandId])
  @@index([status])
  @@index([fechaInicio])
  @@map("social_campaigns")
}

enum CampaignObjective {
  AWARENESS
  ENGAGEMENT
  CONVERSION
  TRAFFIC
  LEADS
  SALES
  UGC
  LAUNCH
}

enum CampaignStatus {
  PLANNING
  ACTIVE
  PAUSED
  COMPLETED
  ARCHIVED
}

model ContentTheme {
  id               String   @id @default(cuid())
  accountId        String   @map("account_id")
  account          SocialAccount @relation(fields: [accountId], references: [id], onDelete: Cascade)
  nombre           String
  descripcion      String?
  frecuencia       String   @default("semanal")
  diaPreferido     String?  @map("dia_preferido")
  formatoPreferido String?  @map("formato_preferido")
  activo           Boolean  @default(true)
  createdAt        DateTime @default(now()) @map("created_at")
  updatedAt        DateTime @updatedAt @map("updated_at")

  @@index([accountId])
  @@index([activo])
  @@map("content_themes")
}

model MediaAsset {
  id                      String   @id @default(cuid())
  softwareId              String   @map("software_id")
  brandId                 String?  @map("brand_id")
  brand                   Brand?   @relation(fields: [brandId], references: [id], onDelete: SetNull)
  nombre                  String
  descripcion             String?
  tipo                    AssetType
  url                     String
  thumbnailUrl            String?  @map("thumbnail_url")
  dimensiones             Json?
  duracion                Int?
  tamanoBytes             Int?     @map("tamano_bytes")
  tags                    String[] @default([])
  plataformasRecomendadas String[] @default([]) @map("plataformas_recomendadas")
  formatosCompatibles     String[] @default([]) @map("formatos_compatibles")
  usoCount                Int      @default(0) @map("uso_count")
  ultimoUsoAt             DateTime? @map("ultimo_uso_at")
  metadata                Json?
  createdAt               DateTime @default(now()) @map("created_at")
  updatedAt               DateTime @updatedAt @map("updated_at")

  @@index([softwareId])
  @@index([brandId])
  @@index([tipo])
  @@index([tags])
  @@map("media_assets")
}

enum AssetType {
  IMAGE
  VIDEO
  GIF
  CAROUSEL
  DOCUMENT
  AUDIO
}

model CopySnippet {
  id          String      @id @default(cuid())
  softwareId  String      @map("software_id")
  brandId     String?     @map("brand_id")
  brand       Brand?      @relation(fields: [brandId], references: [id], onDelete: SetNull)
  nombre      String
  contenido   String      @db.Text
  tipo        SnippetType
  plataformas String[]    @default([])
  tags        String[]    @default([])
  usoCount    Int         @default(0) @map("uso_count")
  createdAt   DateTime    @default(now()) @map("created_at")
  updatedAt   DateTime    @updatedAt @map("updated_at")

  @@index([softwareId])
  @@index([brandId])
  @@index([tipo])
  @@map("copy_snippets")
}

enum SnippetType {
  CAPTION
  CTA
  HASHTAG_SET
  BIO
  RESPONSE
  HOOK
}

model PostApproval {
  id               String         @id @default(cuid())
  postId           String         @map("post_id")
  post             SocialAccountPost @relation(fields: [postId], references: [id], onDelete: Cascade)
  reviewerId       Int            @map("reviewer_id")
  status           ApprovalStatus @default(PENDING)
  comentario       String?        @db.Text
  requestedChanges Json?          @map("requested_changes")
  createdAt        DateTime       @default(now()) @map("created_at")
  resolvedAt       DateTime?      @map("resolved_at")

  @@index([postId])
  @@index([reviewerId])
  @@index([status])
  @@map("post_approvals")
}

enum ApprovalStatus {
  PENDING
  APPROVED
  REJECTED
  CHANGES_REQUESTED
}

model PostComment {
  id         String   @id @default(cuid())
  postId     String   @map("post_id")
  usuarioId  Int      @map("usuario_id")
  comentario String   @db.Text
  resuelto   Boolean  @default(false)
  createdAt  DateTime @default(now()) @map("created_at")

  @@index([postId])
  @@index([createdAt])
  @@map("post_comments")
}

model SocialPostMetric {
  id                  String   @id @default(cuid())
  postId              String   @map("post_id")
  post                SocialAccountPost @relation(fields: [postId], references: [id], onDelete: Cascade)
  fecha               DateTime @db.Date
  impressions         Int      @default(0)
  reach               Int      @default(0)
  likes               Int      @default(0)
  comments            Int      @default(0)
  shares              Int      @default(0)
  saves               Int      @default(0)
  clicks              Int      @default(0)
  profileVisits       Int      @default(0) @map("profile_visits")
  follows             Int      @default(0)
  engagementRate      Float    @default(0) @map("engagement_rate")
  ctr                 Float    @default(0)
  storyExits          Int      @default(0) @map("story_exits")
  storyReplies        Int      @default(0) @map("story_replies")
  videoViews          Int      @default(0) @map("video_views")
  videoCompletionRate Float    @default(0) @map("video_completion_rate")
  averageWatchTime    Float    @default(0) @map("average_watch_time")
  fetchedAt           DateTime @map("fetched_at")

  @@unique([postId, fecha])
  @@index([postId])
  @@index([fecha])
  @@map("social_post_metrics")
}

model Competitor {
  id             String         @id @default(cuid())
  softwareId     String         @map("software_id")
  brandId        String         @map("brand_id")
  brand          Brand          @relation(fields: [brandId], references: [id], onDelete: Cascade)
  nombre         String
  username       String
  plataforma     SocialPlatform
  profileUrl     String         @map("profile_url")
  followersCount Int            @default(0) @map("followers_count")
  followingCount Int            @default(0) @map("following_count")
  postsCount     Int            @default(0) @map("posts_count")
  ultimaSyncAt   DateTime?      @map("ultima_sync_at")
  createdAt      DateTime       @default(now()) @map("created_at")

  posts          CompetitorPost[]

  @@index([softwareId])
  @@index([brandId])
  @@index([plataforma])
  @@map("competitors")
}

model CompetitorPost {
  id           String   @id @default(cuid())
  competitorId String   @map("competitor_id")
  competitor   Competitor @relation(fields: [competitorId], references: [id], onDelete: Cascade)
  externalId   String   @map("external_id")
  content      String   @db.Text
  mediaUrls    String[] @default([]) @map("media_urls")
  likes        Int      @default(0)
  comments     Int      @default(0)
  shares       Int      @default(0)
  postedAt     DateTime @map("posted_at")
  fetchedAt    DateTime @map("fetched_at")

  @@index([competitorId])
  @@index([postedAt])
  @@map("competitor_posts")
}

model ActivityFeed {
  id         String   @id @default(cuid())
  softwareId String   @map("software_id")
  usuarioId  Int?     @map("usuario_id")
  tipo       String
  mensaje    String
  metadata   Json?
  read       Boolean  @default(false)
  createdAt  DateTime @default(now()) @map("created_at")

  @@index([softwareId])
  @@index([usuarioId])
  @@index([read])
  @@index([createdAt])
  @@map("activity_feed")
}
```

### Modificaciones a modelos existentes

```prisma
model SocialAccount {
  // ... campos existentes ...
  brandId            String?       @map("brand_id")
  brand              Brand?        @relation(fields: [brandId], references: [id], onDelete: SetNull)
  nicho              String?
  categorias         String[]      @default([])
  subnichos          String[]      @default([])
  audienciaTarget    Json?         @map("audiencia_target")
  tonoExtendido      String?       @map("tono_extendido") @db.Text
  contenidoProhibido String?       @map("contenido_prohibido") @db.Text
  contenidoFavorito  String?       @map("contenido_favorito") @db.Text

  contentThemes      ContentTheme[]

  @@index([brandId])
}

model SocialAccountPost {
  // ... campos existentes ...
  campaignId     String?          @map("campaign_id")
  campaign       SocialCampaign?  @relation(fields: [campaignId], references: [id], onDelete: SetNull)
  assignedTo     Int?             @map("assigned_to")
  isEvergreen    Boolean          @default(false) @map("is_evergreen")
  recycleCount   Int              @default(0) @map("recycle_count")
  originalPostId String?          @map("original_post_id")

  approvals      PostApproval[]
  comments       PostComment[]
  metrics        SocialPostMetric[]

  @@index([campaignId])
  @@index([assignedTo])
  @@index([isEvergreen])
}
```

---

## Plan de Implementaci&oacute;n por Fases

### Fase 1: Fundamentos de Agencia (Semana 1-2)
- Schema: Brand, SocialCampaign, ContentTheme
- Backend: CRUD brands, CRUD campaigns, asociar posts a campaigns
- Frontend: selector de brand, p&aacute;gina brands, p&aacute;gina campa&ntilde;as, wizard campa&ntilde;a, detalle campa&ntilde;a, kanban filtrado por campa&ntilde;a
- SocialAccount: campos de nicho/categor&iacute;as

### Fase 2: Content Hub (Semana 3)
- Schema: MediaAsset, CopySnippet
- Backend: upload assets, CRUD snippets
- Frontend: p&aacute;gina biblioteca, asset picker en modal de posts, copy snippet picker
- SocialAccount: temas de contenido recurrentes

### Fase 3: Workflow &amp; Colaboraci&oacute;n (Semana 4)
- Schema: PostApproval, PostComment
- Backend: aprobaciones, comentarios, asignaciones
- Frontend: panel aprobaciones y comentarios en modal, asignaci&oacute;n de posts, notificaciones b&aacute;sicas

### Fase 4: Calendario &amp; Scheduling (Semana 5)
- Backend: calendario unificado (posts + art&iacute;culos + emails + eventos)
- Frontend: calendario editorial mejorado, drag &amp; drop, filtros, best time to post

### Fase 5: Analytics &amp; Reporting (Semana 6)
- Schema: SocialPostMetric
- Backend: sincronizaci&oacute;n de m&eacute;tricas
- Frontend: dashboard analytics, report generator, export PDF

### Fase 6: Competidores &amp; IA Avanzada (Semana 7-8)
- Schema: Competitor, CompetitorPost
- Backend: scraping de competidores
- Frontend: p&aacute;gina competidores, dashboard comparativo, variantes A/B, content recycling

### Fase 7: Portal de Cliente (Semana 9)
- Backend: API semi-p&uacute;blica para clientes
- Frontend: portal de cliente con auth por token, aprobaci&oacute;n de contenido, reportes

---

## Archivos a Modificar/Crear (Representativos)

### Schema
- `backend/prisma/schema.prisma` &mdash; A&ntilde;adir modelos y campos

### Backend
- `backend/src/routes/growth.ts` &mdash; Endpoints para brands, campaigns, assets, approvals, comments, metrics, competitors
- `backend/src/services/growth/brandService.ts` &mdash; Nuevo
- `backend/src/services/growth/campaignService.ts` &mdash; Nuevo
- `backend/src/services/growth/assetService.ts` &mdash; Nuevo
- `backend/src/services/growth/analyticsService.ts` &mdash; Nuevo
- `backend/src/services/growth/competitorService.ts` &mdash; Nuevo
- `backend/src/jobs/growthJobs.ts` &mdash; Jobs de sincronizaci&oacute;n

### Frontend
- `frontend/src/lib/api.ts` &mdash; Nuevos endpoints
- `frontend/src/app/dashboard/growth/page.tsx` &mdash; Links nuevos
- `frontend/src/app/dashboard/growth/brands/page.tsx` &mdash; Nuevo
- `frontend/src/app/dashboard/growth/brands/nueva/page.tsx` &mdash; Nuevo
- `frontend/src/app/dashboard/growth/campanas/page.tsx` &mdash; Nuevo
- `frontend/src/app/dashboard/growth/campanas/nueva/page.tsx` &mdash; Nuevo
- `frontend/src/app/dashboard/growth/campanas/[id]/page.tsx` &mdash; Nuevo
- `frontend/src/app/dashboard/growth/biblioteca/page.tsx` &mdash; Nuevo
- `frontend/src/app/dashboard/growth/analytics/social/page.tsx` &mdash; Nuevo
- `frontend/src/app/dashboard/growth/competidores/page.tsx` &mdash; Nuevo
- `frontend/src/components/growth/PostPipeline.tsx` &mdash; Filtros, asignaci&oacute;n, comentarios
- `frontend/src/components/growth/AssetPicker.tsx` &mdash; Nuevo
- `frontend/src/components/growth/CampaignSelector.tsx` &mdash; Nuevo
- `frontend/src/components/layout/Sidebar.tsx` &mdash; Nuevos links
