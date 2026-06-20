# Plan de Implementación: Growth Engine

**Proyecto:** CRM Maestro — Motor de Adquisición Autónoma  
**Fecha:** 2026-06-01  
**Duración estimada:** 12 semanas (3 meses)  
**Fases:** 7  

---

## Visión

Transformar CRM Maestro de una **máquina de outbound** (buscas → contactas → conviertes) en una **máquina de adquisición 24/7** que también funcione por **inbound**:

```
ANTES (solo outbound):
Tú buscas al cliente → Lo contactas → Lo conviertes

DESPUÉS (outbound + inbound):
Growth Engine genera contenido → Cliente te encuentra → Entra al CRM
    ↓
Email/WhatsApp/Llamada IA automática → Demo → Cliente
```

El Growth Engine es el siguiente módulo crítico. Ya tienes la parte difícil: qué hacer con el lead una vez que entra. Lo que falta es alimentar la parte superior del embudo automáticamente.

---

## Estructura del Módulo

```
growth-engine/
├── social-media/       # Posts IA + programación + publicación + métricas
├── seo-engine/         # Artículos, FAQs, casos de éxito, comparativas
├── video-engine/       # Guiones + voz + video corto auto-generado
├── referrals/          # Enlaces de referido + recompensas + tracking
├── marketplaces/       # Monitorización de canales de terceros
└── activation/         # Cuando un lead entra, activar secuencia automática
```

---

## Fase 1: Fundaciones (Semana 1-2)

**Objetivo:** Base de datos, servicios core, y panel de configuración.

### 1.1 Extender Schema Prisma

```prisma
// === GROWTH ENGINE ===

model GrowthConfig {
  id          String   @id @default(cuid())
  softwareId  String
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
  searchConsoleJson String? // Service account JSON
  targetKeywords    String[] // Array de keywords objetivo
  
  // Video
  videoEnabled      Boolean @default(false)
  elevenLabsKey     String?
  
  // Referrals
  referralsEnabled  Boolean @default(false)
  referralReward    String?  // Ej: "1 mes gratis"
  
  // Activation
  autoActivate      Boolean @default(true)
  activationChannel String   @default("email") // email | whatsapp | llamada
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model ContentPiece {
  id          String   @id @default(cuid())
  softwareId  String
  software    Software @relation(fields: [softwareId], references: [id])
  
  type        ContentType // POST | ARTICLE | FAQ | CASE_STUDY | COMPARISON | VIDEO_SCRIPT
  status      ContentStatus // DRAFT | SCHEDULED | PUBLISHED | FAILED
  
  title       String
  body        String   @db.Text
  excerpt     String?
  keywords    String[]
  
  // Para social media
  platform    SocialPlatform?
  scheduledAt DateTime?
  publishedAt DateTime?
  externalId  String?  // ID en la red social
  
  // Métricas (actualizadas por cron)
  impressions Int      @default(0)
  clicks      Int      @default(0)
  likes       Int      @default(0)
  shares      Int      @default(0)
  comments    Int      @default(0)
  leadsGenerated Int   @default(0)
  
  // Atribución: leads generados por este contenido
  leads       Lead[]
  
  // AI metadata
  aiPrompt    String?  @db.Text
  aiModel     String?
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model ReferralProgram {
  id          String   @id @default(cuid())
  softwareId  String
  software    Software @relation(fields: [softwareId], references: [id])
  
  code        String   @unique
  referrerId  String   // ID del cliente que refiere
  referrer    ClienteGlobal @relation(fields: [referrerId], references: [id])
  
  status      ReferralStatus // PENDING | CONVERTED | EXPIRED
  clicks      Int      @default(0)
  signups     Int      @default(0)
  convertedAt DateTime?
  rewardGiven Boolean  @default(false)
  
  createdAt   DateTime @default(now())
}

model MarketplaceOpportunity {
  id          String   @id @default(cuid())
  softwareId  String
  software    Software @relation(fields: [softwareId], references: [id])
  
  marketplace String   // shopify | hubspot | salesforce | wordpress | etc
  title       String
  description String   @db.Text
  url         String
  category    String?
  rating      Float?
  reviews     Int?
  
  status      OpportunityStatus // NEW | CONTACTED | CONVERTED | DISMISSED
  leadId      String?
  lead        Lead?    @relation(fields: [leadId], references: [id])
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model GrowthMetric {
  id          String   @id @default(cuid())
  softwareId  String
  date        DateTime @db.Date
  
  // Funnel
  impressions Int      @default(0)
  clicks      Int      @default(0)
  leads       Int      @default(0)
  demos       Int      @default(0)
  customers   Int      @default(0)
  
  // Por canal
  socialLeads      Int @default(0)
  seoLeads         Int @default(0)
  videoLeads       Int @default(0)
  referralLeads    Int @default(0)
  marketplaceLeads Int @default(0)
  
  // Costos estimados
  estimatedSpend   Float @default(0)
  
  @@unique([softwareId, date])
}

// Enums
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

enum ReferralStatus {
  PENDING
  CONVERTED
  EXPIRED
}

enum OpportunityStatus {
  NEW
  CONTACTED
  CONVERTED
  DISMISSED
}
```

### 1.2 Servicios Core

| Servicio | Archivo | Propósito |
|----------|---------|-----------|
| `contentGeneratorService.ts` | `src/services/growth/contentGenerator.ts` | Genera todo tipo de contenido con IA (OpenAI/Gemini) |
| `socialPublisherService.ts` | `src/services/growth/socialPublisher.ts` | Publica en redes sociales vía APIs |
| `seoPublisherService.ts` | `src/services/growth/seoPublisher.ts` | Publica artículos en blog/landing |
| `videoGeneratorService.ts` | `src/services/growth/videoGenerator.ts` | Orquesta guión + voz + video |
| `referralService.ts` | `src/services/growth/referralService.ts` | Gestión de programa de referidos |
| `marketplaceMonitorService.ts` | `src/services/growth/marketplaceMonitor.ts` | Scrapea/monitorea marketplaces |
| `growthMetricsService.ts` | `src/services/growth/metricsService.ts` | Calcula métricas del embudo |
| `growthActivationService.ts` | `src/services/growth/activationService.ts` | Activa secuencia automática al recibir lead inbound |

### 1.3 Rutas API

```
/api/growth/config           GET/PUT    → Configuración del Growth Engine
/api/growth/content          GET/POST   → CRUD de contenido
/api/growth/content/:id/generate POST    → Generar con IA
/api/growth/content/:id/schedule POST    → Programar publicación
/api/growth/content/:id/publish  POST    → Publicar ahora
/api/growth/calendar         GET        → Calendario editorial
/api/growth/metrics          GET        → Métricas del embudo
/api/growth/referrals        GET/POST   → Programa de referidos
/api/growth/referrals/:code  GET        → Tracking de referido
/api/growth/marketplaces     GET        → Oportunidades detectadas
/api/growth/activation       GET/PUT    → Configuración de activación automática
```

### 1.4 Jobs/Cron Nuevos

```typescript
// src/jobs/growthJobs.ts

// Cada hora: Publicar contenido programado
schedule('0 * * * *', publishScheduledContent);

// Cada 6 horas: Actualizar métricas de posts publicados
schedule('0 */6 * * *', syncSocialMetrics);

// Cada día a las 3 AM: Generar contenido SEO programado
schedule('0 3 * * *', generateSeoContent);

// Cada día a las 4 AM: Monitorizar marketplaces
schedule('0 4 * * *', monitorMarketplaces);

// Cada semana (lunes 5 AM): Generar posts sociales semanales
schedule('0 5 * * 1', generateWeeklySocialContent);

// Cada día: Calcular métricas de Growth
schedule('0 2 * * *', calculateGrowthMetrics);
```

### 1.5 Frontend — Panel de Configuración

```
/dashboard/growth
├── /growth                   → Dashboard de Growth Engine
├── /growth/config            → Configuración (redes, SEO, video, referrals)
├── /growth/content           → Biblioteca de contenido generado
├── /growth/calendar          → Calendario editorial
├── /growth/analytics         → Métricas del embudo
├── /growth/referrals         → Gestión de referidos
└── /growth/marketplaces      → Oportunidades de marketplaces
```

---

## Fase 2: Social Media Engine (Semana 3-4)

### 2.1 Generador de Posts con IA

**Prompt base (adaptable por nicho):**

```
Eres un especialista en marketing de contenidos para [NICHO].
Genera 30 posts para [RED_SOCIAL] sobre [TEMA/PRODUCTO].

Cada post debe:
- Tener un hook fuerte en la primera línea
- Incluir 1-2 insights valiosos
- Terminar con un CTA sutil
- Usar emojis relevantes
- Adaptarse al tono de [RED_SOCIAL]
- Incluir 3-5 hashtags relevantes

Devuelve JSON: [{ "title", "body", "hashtags", "tone", "cta" }]
```

**Implementación:**

```typescript
// src/services/growth/contentGenerator.ts

async function generateSocialPosts(
  softwareId: string,
  platform: SocialPlatform,
  count: number = 30,
  topic?: string
): Promise<ContentPiece[]> {
  const software = await getSoftware(softwareId);
  const prompt = buildSocialPrompt(software, platform, count, topic);
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'system', content: prompt }],
    response_format: { type: 'json_object' },
  });
  
  const posts = JSON.parse(response.choices[0].message.content).posts;
  
  // Guardar en DB como DRAFT
  return await Promise.all(
    posts.map(post => prisma.contentPiece.create({
      data: {
        softwareId,
        type: 'POST',
        status: 'DRAFT',
        platform,
        title: post.title,
        body: post.body,
        keywords: post.hashtags,
        aiPrompt: prompt,
        aiModel: 'gpt-4o',
      }
    }))
  );
}
```

### 2.2 Integraciones con Redes Sociales

| Plataforma | API | Autenticación | Dificultad |
|------------|-----|---------------|------------|
| **LinkedIn** | LinkedIn API v2 | OAuth 2.0 | Media |
| **Facebook** | Graph API | OAuth 2.0 | Baja |
| **Instagram** | Instagram Graph API | OAuth 2.0 | Media |
| **X (Twitter)** | X API v2 | OAuth 2.0 | Baja |
| **TikTok** | TikTok for Business API | OAuth 2.0 | Alta |

**Servicio de publicación:**

```typescript
// src/services/growth/socialPublisher.ts

interface PublishResult {
  success: boolean;
  externalId?: string;
  url?: string;
  error?: string;
}

class SocialPublisherService {
  async publish(content: ContentPiece, config: GrowthConfig): Promise<PublishResult> {
    switch (content.platform) {
      case 'LINKEDIN':
        return this.publishLinkedIn(content, config);
      case 'FACEBOOK':
        return this.publishFacebook(content, config);
      case 'INSTAGRAM':
        return this.publishInstagram(content, config);
      case 'X':
        return this.publishX(content, config);
      case 'TIKTOK':
        return this.publishTikTok(content, config);
    }
  }
  
  private async publishLinkedIn(content: ContentPiece, config: GrowthConfig): Promise<PublishResult> {
    // LinkedIn Share API
    // POST /v2/ugcPosts
    // Requiere: author URN, specificContent (com.linkedin.ugc.ShareContent),
    // visibility, lifecycleState
  }
  
  // ... implementaciones para cada red
}
```

### 2.3 Calendario Editorial

- Vista semanal/mensual
- Drag & drop para reprogramar
- Colores por plataforma
- Preview del post antes de publicar
- Estado: Draft → Scheduled → Published → Failed

### 2.4 Métricas y Atribución

```typescript
// Actualizar métricas por post (cron cada 6 horas)

async function syncSocialMetrics() {
  const published = await prisma.contentPiece.findMany({
    where: { status: 'PUBLISHED', publishedAt: { gte: thirtyDaysAgo } }
  });
  
  for (const post of published) {
    const metrics = await fetchPlatformMetrics(post);
    
    await prisma.contentPiece.update({
      where: { id: post.id },
      data: {
        impressions: metrics.impressions,
        clicks: metrics.clicks,
        likes: metrics.likes,
        shares: metrics.shares,
        comments: metrics.comments,
      }
    });
    
    // Atribuir leads: buscar leads que entraron después de la publicación
    // y que tengan source = social_media o similar
    const leads = await prisma.lead.findMany({
      where: {
        createdAt: { gte: post.publishedAt },
        createdAt: { lte: new Date(post.publishedAt.getTime() + 7 * 24 * 60 * 60 * 1000) },
        fuente: { contains: post.platform?.toLowerCase() },
      }
    });
    
    await prisma.contentPiece.update({
      where: { id: post.id },
      data: { leadsGenerated: leads.length }
    });
  }
}
```

### 2.5 Frontend — Social Media

```tsx
// Componentes:

<GrowthDashboard />        // KPIs: posts este mes, leads generados, engagement
<PostGenerator />          // Generar 30 posts con un clic
<ContentCalendar />        // Calendario editorial drag & drop
<PostPreview />            // Preview por plataforma
<PostEditor />             // Editor WYSIWYG con IA
<AnalyticsSocial />        // Gráficos de engagement, CTR, leads
```

---

## Fase 3: SEO Engine (Semana 5-6)

### 3.1 Estrategia: "Página por Keyword"

Para cada SaaS, generar cientos de páginas que capturen tráfico orgánico:

```
SmartDental (ejemplo)
├── /blog/como-gestionar-citas-dentales-online
├── /blog/software-dental-vs-excel
├── /blog/mejor-software-para-clinicas-dentales-2026
├── /faq/como-funciona-smartdental
├── /caso-exito/clinica-dental-madriz-aumento-citas-40
├── /comparativa/smartdental-vs-dentimax
├── /comparativa/smartdental-vs-opendental
└── /nicho/[ciudad]-software-dental  ← Programático por ciudad
```

### 3.2 Generador de Contenido SEO

```typescript
// src/services/growth/contentGenerator.ts

async function generateSeoArticle(
  softwareId: string,
  keyword: string,
  type: 'ARTICLE' | 'FAQ' | 'CASE_STUDY' | 'COMPARISON'
): Promise<ContentPiece> {
  const software = await getSoftware(softwareId);
  const competitors = await getCompetitors(software.nicho);
  
  const prompt = buildSeoPrompt({ software, keyword, type, competitors });
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'system', content: prompt }],
  });
  
  const article = parseArticleResponse(response);
  
  return prisma.contentPiece.create({
    data: {
      softwareId,
      type,
      status: 'DRAFT',
      title: article.title,
      body: article.content, // HTML/Markdown
      excerpt: article.excerpt,
      keywords: [keyword, ...article.relatedKeywords],
      aiPrompt: prompt,
      aiModel: 'gpt-4o',
    }
  });
}
```

**Prompts por tipo:**

| Tipo | Prompt base |
|------|-------------|
| Artículo | "Escribe un artículo de 1500 palabras optimizado para SEO sobre [KEYWORD] para [NICHO]. Estructura: H1, H2s, bullet points, conclusión con CTA." |
| FAQ | "Genera 10 preguntas frecuentes sobre [PRODUCTO] con respuestas de 100-150 palabras cada una." |
| Caso de éxito | "Escribe un caso de éxito ficticio pero realista de [NICHO] que usó [PRODUCTO] y mejoró [MÉTRICA]." |
| Comparativa | "Compara [PRODUCTO] vs [COMPETIDOR] en tabla. Sé honesto. Destaca ventajas únicas de [PRODUCTO]." |
| Landing programática | "Genera una landing page para [PRODUCTO] enfocada en [CIUDAD/NICHO_ESPECÍFICO]." |

### 3.3 Publicación Automática

```typescript
// src/services/growth/seoPublisher.ts

class SeoPublisherService {
  async publishArticle(content: ContentPiece, config: GrowthConfig): Promise<string> {
    // Opción 1: Publicar en blog integrado del CRM
    // Opción 2: Publicar en CMS externo (WordPress, Ghost, etc.)
    // Opción 3: Generar página estática en Next.js
    
    if (config.blogDomain) {
      // Publicar vía API del CMS
      return this.publishToCMS(content, config);
    } else {
      // Generar página en Next.js y rebuild
      return this.publishAsStaticPage(content, config);
    }
  }
  
  private async publishAsStaticPage(content: ContentPiece, config: GrowthConfig): Promise<string> {
    // Generar archivo MDX en frontend/src/app/blog/[slug]/page.tsx
    // o guardar en DB y usar dynamic rendering
    
    const slug = slugify(content.title);
    const url = `${config.blogDomain || process.env.APP_URL}/blog/${slug}`;
    
    // Guardar contenido en tabla contentPiece
    // La ruta /blog/[slug] en Next.js lo renderizará desde DB
    
    return url;
  }
}
```

### 3.4 Integración con Google Search Console

```typescript
// src/services/growth/searchConsoleService.ts

class SearchConsoleService {
  async syncSearchData(softwareId: string) {
    // Google Search Console API
    // GET /webmasters/v3/sites/{siteUrl}/searchAnalytics/query
    
    const data = await searchConsole.searchanalytics.query({
      siteUrl: config.blogDomain,
      requestBody: {
        startDate: thirtyDaysAgo,
        endDate: today,
        dimensions: ['query', 'page'],
        rowLimit: 5000,
      }
    });
    
    // Actualizar métricas de keywords
    // Identificar oportunidades (posiciones 4-15 con impresiones altas)
  }
  
  async submitSitemap(config: GrowthConfig) {
    // POST sitemap a Google
    await fetch(`https://www.google.com/ping?sitemap=${config.blogDomain}/sitemap.xml`);
  }
}
```

### 3.5 Indexación Automática

```typescript
// src/jobs/seoJobs.ts

// Indexar nuevo contenido en Google
async function indexNewContent() {
  const newContent = await prisma.contentPiece.findMany({
    where: {
      status: 'PUBLISHED',
      publishedAt: { gte: oneHourAgo },
    }
  });
  
  for (const content of newContent) {
    // Google Indexing API (requiere service account)
    await indexInGoogle(content.url);
    
    // Ping a motores de búsqueda
    await pingSearchEngines(content.url);
  }
}
```

### 3.6 Frontend — SEO Engine

```tsx
<SeoDashboard />           // Tráfico orgánico, keywords ranking, oportunidades
<KeywordResearch />        // Sugerencias de keywords con volumen estimado
<ContentGeneratorSeo />    // Generar artículo/FAQ/comparativa con un clic
<ContentLibrary />         // Biblioteca de contenido SEO
<SeoOpportunities />       // Keywords en posición 4-15 (quick wins)
<SearchConsoleSync />      // Datos de GSC integrados
```

---

## Fase 4: Video Engine (Semana 7-8)

### 4.1 Flujo de Generación de Video

```
Caso de éxito nuevo / Update de producto
        ↓
IA genera guion (60 segundos)
        ↓
ElevenLabs genera voz (TTS)
        ↓
Generar video:
  - Imagenes/screen recordings del producto
  - Subtítulos animados
  - Música de fondo (royalty-free)
  - Transiciones
        ↓
Exportar MP4
        ↓
Subir a TikTok / Reels / Shorts
        ↓
Métricas y atribución
```

### 4.2 Generador de Guiones

```typescript
// src/services/growth/contentGenerator.ts

async function generateVideoScript(
  softwareId: string,
  topic: string,
  duration: number = 60 // segundos
): Promise<ContentPiece> {
  const prompt = `Escribe un guion de video de ${duration} segundos sobre "${topic}".

Reglas:
- Hook en los primeros 3 segundos
- Lenguaje conversacional y directo
- Incluye indicaciones visuales [entre corchetes]
- CTA claro al final
- Optimizado para TikTok/Reels/Shorts

Formato: array de segmentos con timing
[{ "time": "0-5", "voiceover": "...", "visual": "..." }]`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'system', content: prompt }],
    response_format: { type: 'json_object' },
  });
  
  // Guardar como VIDEO_SCRIPT
}
```

### 4.3 Generación de Audio (ElevenLabs)

```typescript
// src/services/growth/videoGenerator.ts

async function generateVoiceover(
  script: string,
  voiceId: string = 'premade/Adam' // o voz custom
): Promise<Buffer> {
  const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/' + voiceId, {
    method: 'POST',
    headers: {
      'xi-api-key': process.env.ELEVENLABS_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: script,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
      }
    }),
  });
  
  return Buffer.from(await response.arrayBuffer());
}
```

### 4.4 Generación de Video (FFmpeg)

```typescript
// src/services/growth/videoGenerator.ts

async function generateVideo(
  script: VideoScript,
  voiceover: Buffer,
  images: Buffer[] // screenshots del producto
): Promise<Buffer> {
  // Opciones:
  // 1. FFmpeg puro: combinar imágenes + audio + subtítulos
  // 2. Remotion (React + video)
  // 3. Integración con API de generación de video (Pictory, etc.)
  
  // Implementación con FFmpeg:
  // - Crear frames con imágenes + texto superpuesto
  // - Combinar con audio
  // - Añadir música de fondo (bajo volumen)
  // - Exportar MP4 1080x1920 (vertical)
  
  const ffmpeg = require('fluent-ffmpeg');
  
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(imageListFile) // archivo con lista de imágenes
      .input(voiceoverFile)
      .input(backgroundMusicFile)
      .complexFilter([
        // Subtítulos, transiciones, mezcla de audio
      ])
      .outputOptions([
        '-vf scale=1080:1920',
        '-r 30',
        '-pix_fmt yuv420p',
      ])
      .on('end', resolve)
      .on('error', reject)
      .save(outputPath);
  });
}
```

### 4.5 Publicación en Plataformas de Video

| Plataforma | API | Notas |
|------------|-----|-------|
| **TikTok** | TikTok API | Requiere business account |
| **Instagram Reels** | Instagram Graph API | Reels publishing API |
| **YouTube Shorts** | YouTube Data API v3 | Upload con metadata |

### 4.6 Frontend — Video Engine

```tsx
<VideoDashboard />         // Videos generados, views, leads
<ScriptGenerator />        // Generar guion con IA
<VideoPreview />           // Preview antes de renderizar
<VideoEditor />            // Editor simple (timing, imágenes)
<VideoPublisher />         // Publicar a múltiples plataformas
```

---

## Fase 5: Programa de Referidos (Semana 9)

### 5.1 Flujo de Referido

```
Cliente existente (SmartDental)
        ↓
Dashboard → "Gana 1 mes gratis"
        ↓
Genera enlace único: peluguau.com/r/abc123
        ↓
Comparte con colegas
        ↓
Colega hace clic → Landing de referido
        ↓
Se registra → Lead marcado como "referral"
        ↓
Convierte en cliente pagado
        ↓
Recompensa automática al referidor
```

### 5.2 Implementación

```typescript
// src/services/growth/referralService.ts

class ReferralService {
  async createReferralLink(clienteId: string, softwareId: string): Promise<string> {
    const code = generateShortCode();
    
    await prisma.referralProgram.create({
      data: {
        softwareId,
        referrerId: clienteId,
        code,
        status: 'PENDING',
      }
    });
    
    return `${process.env.APP_URL}/r/${code}`;
  }
  
  async trackClick(code: string): Promise<void> {
    await prisma.referralProgram.update({
      where: { code },
      data: { clicks: { increment: 1 } }
    });
    
    // Cookie/UTM para atribución
  }
  
  async trackConversion(code: string, leadId: string): Promise<void> {
    await prisma.referralProgram.update({
      where: { code },
      data: {
        status: 'CONVERTED',
        convertedAt: new Date(),
      }
    });
    
    // Crear lead con fuente = referral
    await prisma.lead.update({
      where: { id: leadId },
      data: { fuente: 'referral', referralCode: code }
    });
    
    // Notificar al referidor
    await this.notifyReferrer(code);
  }
  
  async processReward(referralId: string): Promise<void> {
    const referral = await prisma.referralProgram.findUnique({
      where: { id: referralId },
      include: { referrer: true }
    });
    
    if (referral.status === 'CONVERTED' && !referral.rewardGiven) {
      // Aplicar recompensa: extender suscripción 1 mes
      await extendSubscription(referral.referrerId, 30);
      
      await prisma.referralProgram.update({
        where: { id: referralId },
        data: { rewardGiven: true }
      });
      
      // Notificar al referidor
      await notificationService.send({
        userId: referral.referrerId,
        title: '¡Recompensa recibida!',
        body: 'Has ganado 1 mes gratis por tu referido.',
      });
    }
  }
}
```

### 5.3 Frontend — Referidos

```tsx
<ReferralDashboard />      // Enlaces generados, clicks, conversiones
<ReferralLinkGenerator />  // Generar enlace personalizado
<ReferralLanding />        // Landing /r/:code para prospectos
<ReferralRewards />        // Historial de recompensas
<ReferralAnalytics />      // Gráficos de conversión
```

---

## Fase 6: Marketplaces (Semana 10)

### 6.1 Monitorización de Marketplaces

| Marketplace | Método | Datos extraídos |
|-------------|--------|-----------------|
| **Shopify App Store** | Scraping | Reviews, installs, categoría |
| **HubSpot Marketplace** | API/Scraping | Listings, categorías |
| **Salesforce AppExchange** | Scraping | Reviews, rating, installs |
| **WordPress.org** | API | Plugins, reviews, installs |
| **G2** | API | Reviews, rating, categoría |
| **Capterra** | Scraping | Reviews, pricing |

### 6.2 Implementación

```typescript
// src/services/growth/marketplaceMonitorService.ts

class MarketplaceMonitorService {
  async monitorAll(): Promise<void> {
    const softwares = await prisma.software.findMany({
      where: { growthConfig: { isNot: null } }
    });
    
    for (const software of softwares) {
      await this.monitorShopify(software);
      await this.monitorHubSpot(software);
      await this.monitorG2(software);
      await this.monitorCapterra(software);
    }
  }
  
  private async monitorShopify(software: Software): Promise<void> {
    // Scraping del listing en Shopify App Store
    // Extraer: reviews, rating, categoría, descripción
    
    // Detectar oportunidades:
    // - Reviews negativos (contactar reviewer con alternativa)
    // - Categorías trending
    // - Competidores con bajo rating
    
    const opportunities = await this.detectOpportunities(software, 'shopify');
    
    for (const opp of opportunities) {
      await prisma.marketplaceOpportunity.create({
        data: {
          softwareId: software.id,
          marketplace: 'shopify',
          title: opp.title,
          description: opp.description,
          url: opp.url,
          category: opp.category,
          rating: opp.rating,
          reviews: opp.reviews,
          status: 'NEW',
        }
      });
    }
  }
  
  // ... implementaciones para cada marketplace
}
```

### 6.3 Frontend — Marketplaces

```tsx
<MarketplaceDashboard />   // Oportunidades detectadas por marketplace
<OpportunityList />        // Lista con filtros y acciones
<OpportunityDetail />      // Detalle de oportunidad + acción (convertir a lead)
<MarketplaceAnalytics />   // Tendencias, competidores
```

---

## Fase 7: Activación Automática (Semana 11-12)

### 7.1 El Loop de Oro

Cuando un lead entra por cualquier canal del Growth Engine, se activa automáticamente:

```
Lead entra (Social / SEO / Video / Referral / Marketplace)
        ↓
[Delay 5 min]
        ↓
IA califica el lead (intención, urgencia, tamaño)
        ↓
┌─────────────────────────────────────────────┐
│  Score ≥ 80 (HOT)                           │
│  → Email de bienvenida + CTA demo           │
│  → WhatsApp en 30 min si no responde        │
│  → Llamada IA en 2h si sigue sin responder  │
├─────────────────────────────────────────────┤
│  Score 50-79 (WARM)                         │
│  → Email con contenido de valor             │
│  → Drip campaign de 5 emails en 14 días     │
│  → WhatsApp en día 3                        │
├─────────────────────────────────────────────┤
│  Score < 50 (COLD)                          │
│  → Drip campaign de nurturing               │
│  → Re-engagement en 30 días                 │
│  → Cementerio WhatsApp en 60 días           │
└─────────────────────────────────────────────┘
```

### 7.2 Implementación

```typescript
// src/services/growth/activationService.ts

class GrowthActivationService {
  async activateLead(leadId: string, source: string): Promise<void> {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: { software: { include: { growthConfig: true } } }
    });
    
    if (!lead.software.growthConfig?.autoActivate) {
      return; // Activación automática desactivada
    }
    
    // 1. Calificar con IA
    const score = await this.qualifyLead(lead);
    
    // 2. Actualizar lead con score
    await prisma.lead.update({
      where: { id: leadId },
      data: { 
        puntuacion: score,
        fuente: source,
      }
    });
    
    // 3. Activar según score y configuración
    await this.executeActivationSequence(lead, score);
  }
  
  private async qualifyLead(lead: Lead): Promise<number> {
    // IA analiza: datos del lead, comportamiento, fuente, sector
    const prompt = `Analiza este lead y dale una puntuación de 0-100:
    
Empresa: ${lead.empresa}
Sector: ${lead.sector}
Tamaño: ${lead.tamaño}
Fuente: ${lead.fuente}
Notas: ${lead.notas}

Devuelve solo un número del 0 al 100.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: prompt }],
    });
    
    return parseInt(response.choices[0].message.content) || 50;
  }
  
  private async executeActivationSequence(lead: Lead, score: number): Promise<void> {
    const config = lead.software.growthConfig;
    
    if (score >= 80) {
      // HOT: Email inmediato + WhatsApp en 30min + Llamada IA en 2h
      await emailService.sendWelcomeEmail(lead);
      
      await scheduleJob('30 min', async () => {
        await whatsappService.sendTemplate(lead, 'bienvenida_hot');
      });
      
      await scheduleJob('2 hours', async () => {
        await llamadaAiService.iniciarLlamadaAI(lead.id);
      });
      
    } else if (score >= 50) {
      // WARM: Drip campaign
      await emailService.startDripCampaign(lead, 'nurture_warm');
      
      await scheduleJob('3 days', async () => {
        await whatsappService.sendTemplate(lead, 'seguimiento_warm');
      });
      
    } else {
      // COLD: Nurturing lento
      await emailService.startDripCampaign(lead, 'nurture_cold');
    }
  }
}
```

### 7.3 Webhook de Entrada de Lead

```typescript
// src/routes/growth.ts

// Endpoint para recibir leads desde formularios, landing pages, etc.
router.post('/inbound-lead', async (req, res) => {
  const { nombre, email, telefono, empresa, source, softwareId } = req.body;
  
  // Crear lead
  const lead = await prisma.lead.create({
    data: {
      nombre,
      email,
      telefono,
      empresa,
      fuente: source,
      softwareId,
      estado: 'NUEVO',
    }
  });
  
  // Activar automáticamente
  await growthActivationService.activateLead(lead.id, source);
  
  res.json({ success: true, leadId: lead.id });
});
```

### 7.4 Frontend — Activación

```tsx
<ActivationConfig />       // Configurar triggers y secuencias
<ActivationPreview />      // Simular secuencia para un lead tipo
<InboundLeadForm />        // Formulario embebible para landing pages
<ActivationLog />          // Log de activaciones ejecutadas
```

---

## Cronograma Completo

```
Semana 1-2:   [████████] Fase 1 — Fundaciones (schema, servicios, panel config)
Semana 3-4:   [████████] Fase 2 — Social Media Engine
Semana 5-6:   [████████] Fase 3 — SEO Engine
Semana 7-8:   [████████] Fase 4 — Video Engine
Semana 9:     [████████] Fase 5 — Referrals
Semana 10:    [████████] Fase 6 — Marketplaces
Semana 11-12: [████████] Fase 7 — Activación + Integración + Testing
```

---

## Costos Estimados (mensuales)

| Servicio | Costo estimado | Notas |
|----------|---------------|-------|
| OpenAI API (generación de contenido) | $100-300/mes | Depende de volumen |
| ElevenLabs (voz para videos) | $22/mes | Plan Creator |
| LinkedIn API | $0 | Gratuito con límites |
| Facebook/Instagram API | $0 | Gratuito |
| X API | $100/mes | Basic tier |
| TikTok API | $0 | Gratuito con aprobación |
| Google Search Console | $0 | Gratuito |
| Google Indexing API | $0 | Gratuito |
| FFmpeg/Remotion | $0 | Open source |
| Infraestructura adicional | $50/mes | Workers, storage |
| **TOTAL** | **~$300-500/mes** | |

---

## KPIs del Growth Engine

| Métrica | Objetivo mensual |
|---------|-----------------|
| Contenido generado | 100+ piezas |
| Posts publicados | 30+ por red social |
| Artículos SEO publicados | 20+ |
| Videos generados | 10+ |
| Leads inbound | 500+ |
| CAC inbound vs outbound | 50% menor |
| Tráfico orgánico | +50% mes a mes |
| Conversion inbound → demo | 10%+ |
| Referidos activos | 100+ |
| Oportunidades marketplace | 50+ |

---

## Arquitectura Final del CRM

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         CRM MAESTRO — SISTEMA COMPLETO                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │                    GROWTH ENGINE (INBOUND)                       │   │
│   │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌───────┐ │   │
│   │  │  Social │  │   SEO   │  │  Video  │  │Referrals│  │Market │ │   │
│   │  │  Media  │  │ Engine  │  │ Engine  │  │ Program │  │places │ │   │
│   │  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘  └───┬───┘ │   │
│   │       └─────────────┴─────────────┴─────────────┴─────────┘     │   │
│   │                          ↓                                      │   │
│   │                   ┌─────────────┐                               │   │
│   │                   │ Activación  │                               │   │
│   │                   │ Automática  │                               │   │
│   │                   └──────┬──────┘                               │   │
│   └──────────────────────────┼──────────────────────────────────────┘   │
│                              ↓                                          │
│   ┌──────────────────────────┼──────────────────────────────────────┐   │
│   │                    LEAD CAPTURADO                                │   │
│   └──────────────────────────┼──────────────────────────────────────┘   │
│                              ↓                                          │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │                   OUTBOUND ENGINE (existente)                    │   │
│   │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────────────────┐│   │
│   │  │  Email  │  │WhatsApp │  │ Llamada │  │  Propuestas/Demo    ││   │
│   │  │Campaign │  │Outreach │  │   AI    │  │                     ││   │
│   │  └─────────┘  └─────────┘  └─────────┘  └─────────────────────┘│   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                              ↓                                          │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │                    CLIENTE CONVERTIDO                            │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Próximos Pasos

1. **Aprobar plan** → Ajustar prioridades/tiempos si es necesario
2. **Semana 1** → Empezar con Fase 1 (fundaciones)
3. **MVP de Social Media** → Priorizar LinkedIn + Facebook (más fáciles)
4. **SEO** → Empezar con artículos y FAQs (más fácil que video)
5. **Video** → Dejar para después de tener tracción en social + SEO
6. **Referidos** → MVP simple: enlace + tracking + recompensa manual
7. **Activación** → Esto es crítico: conectar inbound con outbound existente

---

*Plan generado el 2026-06-01. Duración estimada: 12 semanas.*
