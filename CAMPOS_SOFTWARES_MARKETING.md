# Campos de Marketing para el Modelo Software/SaaS

## Estado actual

Hoy el campo `saas` es un `String` suelto que aparece en `Suscripcion`, `Evento`, `MetricaDiaria`, `WebhookConfig`, `CrmClient`, etc. No existe un modelo propio `Software` que centralice metadatos, branding y configuracion de marketing por SaaS.

## Propuesta: modelo `Software` en Prisma

```prisma
model Software {
  id                  String   @id @default(cuid())
  slug                String   @unique // ej: "groomly", "silxar"
  nombre              String   // ej: "Groomly Pro"
  tagline             String?  // One-liner para headers, ads, meta description
  descripcion         String?  @db.Text // Pitch largo para landing pages
  urlWebsite          String?  @map("url_website")
  logoUrl             String?  @map("logo_url")
  faviconUrl          String?  @map("favicon_url")
  colorPrimario       String   @default("#6366F1") @map("color_primario")
  colorSecundario     String?  @map("color_secundario")
  dominioLanding      String?  @map("dominio_landing") // Dominio custom para landings

  // --- Posicionamiento ---
  categoria           String?  // ej: "SaaS", "Agencia", "Consultoria", "Producto digital"
  nicho               String?  // ej: "peluquerias caninas", "clinicas dentales"
  problemaPrincipal   String?  @map("problema_principal") @db.Text // Pain point que resolvemos
  promesaValor        String?  @map("promesa_valor") @db.Text // Value proposition
  diferenciador       String?  @db.Text // Por que nos eligen vs la competencia

  // --- Audiencia objetivo ---
  icpTitulo           String?  @map("icp_titulo") // ej: "Duenos de peluqueria canina"
  icpDescripcion      String?  @map("icp_descripcion") @db.Text
  icpIngresosAnuales  String?  @map("icp_ingresos_anuales") // ej: "50k-200k"
  icpTamanoEquipo     String?  @map("icp_tamano_equipo") // ej: "1-5 empleados"
  icpUbicacion        String?  @map("icp_ubicacion") // ej: "Espana, Mexico, Colombia"
  icpDolorTop1        String?  @map("icp_dolor_top1") // Dolor principal del ICP
  icpDolorTop2        String?  @map("icp_dolor_top2")
  icpDolorTop3        String?  @map("icp_dolor_top3")

  // --- Copy & messaging ---
  toneOfVoice         String?  @map("tone_of_voice") // ej: "profesional cercano", "directo", "humoristico"
  palabrasProhibidas  String[] @default([]) @map("palabras_prohibidas")
  testimonioEstrella  String?  @map("testimonio_estrella") @db.Text // Testimonio top para campanas
  casoExitoUrl        String?  @map("caso_exito_url")
  garantia            String?  // ej: "30 dias de garantia"

  // --- Canales de adquisicion ---
  canalPrincipal      String?  @map("canal_principal") // ej: "whatsapp", "email", "ads", "seo", "referidos"
  canalSecundario     String?  @map("canal_secundario")
  cacObjetivo         Decimal? @map("cac_objetivo") @db.Decimal(10, 2) // Customer Acquisition Cost objetivo
  presupuestoMensual  Decimal? @map("presupuesto_mensual") @db.Decimal(10, 2)
  monedaPresupuesto   String   @default("EUR") @map("moneda_presupuesto")

  // --- Metricas de marketing ---
  ltvObjetivo         Decimal? @map("ltv_objetivo") @db.Decimal(10, 2)
  trialToPaidObjetivo Decimal? @map("trial_to_paid_objetivo") @db.Decimal(5, 2)
  churnMaxObjetivo    Decimal? @map("churn_max_objetivo") @db.Decimal(5, 2)

  // --- Competencia ---
  competidorTop1      String?  @map("competidor_top1")
  competidorTop2      String?  @map("competidor_top2")
  competidorTop3      String?  @map("competidor_top3")

  // --- Integraciones y config ---
  webhookSecret       String?  @map("webhook_secret")
  endpointWebhook     String?  @map("endpoint_webhook")
  googleAnalyticsId   String?  @map("google_analytics_id")
  pixelFacebookId     String?  @map("pixel_facebook_id")
  pixelTiktokId       String?  @map("pixel_tiktok_id")

  // --- Estado ---
  activo              Boolean  @default(true)
  modoDemo            Boolean  @default(false) @map("modo_demo") // Si es un SaaS de ejemplo para demos
  fechaLanzamiento    DateTime? @map("fecha_lanzamiento")
  createdAt           DateTime @default(now()) @map("created_at")
  updatedAt           DateTime @updatedAt @map("updated_at")

  // Relaciones
  suscripciones   Suscripcion[]
  eventos         Evento[]
  metricas        MetricaDiaria[]
  leads           Lead[]
  plantillasWhatsapp WhatsappPlantilla[]
  campanasEmail   EmailCampana[]
  landings        Landing[]
  freeValues      FreeValue[]
  propuestas      Propuesta[]
  spechs          SpechLlamada[]
  llamadas        LlamadaReal[]

  @@map("softwares")
}
```

## Categorias de campos propuestos

### 1. Identidad y Branding
| Campo | Uso |
|-------|-----|
| `tagline` | Meta description, headers de landing, subject de emails frios |
| `colorPrimario` / `colorSecundario` | Personalizacion visual de landings, propuestas, emails |
| `logoUrl` / `faviconUrl` | Branding consistente en todos los touchpoints |
| `dominioLanding` | Landings white-label con dominio propio por SaaS |

### 2. Posicionamiento (Positioning)
| Campo | Uso |
|-------|-----|
| `nicho` | Segmentacion de campanas, personalizacion de copy |
| `problemaPrincipal` | Hook para outbound (email, WhatsApp, llamadas) |
| `promesaValor` | Hero section de landings, pitch de ventas |
| `diferenciador` | Objeciones en llamadas, comparativas en landings |

### 3. Ideal Customer Profile (ICP)
| Campo | Uso |
|-------|-----|
| `icpTitulo` | "Estamos buscando a [icpTitulo] que..." |
| `icpDolorTop1/2/3` | Personalizacion masiva de mensajes por dolor |
| `icpTamanoEquipo` | Scoring de leads, filtros de calificacion |
| `icpIngresosAnuales` | Deteccion de capacidad de pago, tiering de planes |

### 4. Copy & Messaging
| Campo | Uso |
|-------|-----|
| `toneOfVoice` | Guia para IA generadora de plantillas (MiniMax, GPT) |
| `palabrasProhibidas` | Compliance y consistencia de marca |
| `testimonioEstrella` | Social proof en campanas de recuperacion y outbound |
| `garantia` | Reduccion de friccion en propuestas y landings |

### 5. Canales de Adquisicion
| Campo | Uso |
|-------|-----|
| `canalPrincipal` / `canalSecundario` | Dashboard de mix de canales, forecast |
| `cacObjetivo` | Alerta cuando CAC real supera objetivo |
| `presupuestoMensual` | Tracking de burn de marketing vs resultados |

### 6. Metricas Objetivo
| Campo | Uso |
|-------|-----|
| `ltvObjetivo` | Comparativa LTV real vs objetivo por SaaS |
| `trialToPaidObjetivo` | Funnel health, alertas de conversion |
| `churnMaxObjetivo` | Alerta temprana de retencion |

### 7. Competencia
| Campo | Uso |
|-------|-----|
| `competidorTop1/2/3` | Scripts de llamada para objection handling |
| | Comparativas automaticas en propuestas |

### 8. Tracking & Pixels
| Campo | Uso |
|-------|-----|
| `pixelFacebookId` | Inyeccion automatica en landings generadas |
| `pixelTiktokId` | Idem para TikTok Ads |
| `googleAnalyticsId` | Seguimiento de conversiones en landings |

## Casos de uso concretos con estos campos

### A. Outbound masivo personalizado por WhatsApp
```
Hola {nombre}, soy de {software.nombre}. Estoy contactando con {software.icpTitulo}
porque al 90% les pasa que {software.icpDolorTop1}. Tienes 15 min esta semana
para que te muestre como {software.promesaValor}?
```

### B. Landing page auto-generada por SaaS
- Colores desde `colorPrimario`
- Hero con `tagline` + `problemaPrincipal`
- Social proof con `testimonioEstrella`
- Pixels injectados desde `pixelFacebookId`, `pixelTiktokId`
- Dominio custom desde `dominioLanding`

### C. IA generadora de plantillas (MiniMax)
Prompt enriquecido:
```
Eres copywriter de {software.nombre}. Tono: {software.toneOfVoice}.
Nicho: {software.nicho}. Problema: {software.problemaPrincipal}.
Evita estas palabras: {software.palabrasProhibidas}.
Escribe un mensaje de WhatsApp de 2 parrafos maximo...
```

### D. Scoring y calificacion de leads
```typescript
score += icpTamanoEquipo === lead.tamanoEquipo ? 20 : 0;
score += icpUbicacion.includes(lead.pais) ? 15 : 0;
score += lead.dolorMencionado === icpDolorTop1 ? 25 : 0;
```

### E. Alertas de marketing
```
IF metricaDiaria.cac > software.cacObjetivo * 1.5
  -> Alerta: "CAC en {saas} supero objetivo en un 50%"

IF metricaDiaria.churnRate > software.churnMaxObjetivo
  -> Alerta: "Churn critico en {saas}. Activar campana de win-back."
```

## Migracion sugerida

1. Crear tabla `softwares` con los campos basicos (`slug`, `nombre`, `colorPrimario`, `activo`)
2. Backfill: insertar un `Software` por cada `saas` distinto existente en `Suscripcion`
3. Agregar `softwareId` como FK en los modelos actuales (fase 2)
4. Ir agregando campos de marketing por necesidad
