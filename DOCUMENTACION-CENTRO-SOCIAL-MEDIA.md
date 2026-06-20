# Documentación — Centro de Operaciones Social Media

Implementación del plan `PLAN-CENTRO-SOCIAL-MEDIA.md`. Transforma la sección de Social Posts en un centro de operaciones nivel agencia.

**Estado:** Fases 1-5 completas y operativas end-to-end. Fase 7 (portal cliente) parcialmente en marcha en paralelo.

| Fase | Alcance | Estado |
|------|---------|--------|
| 1 | Brands, Campañas, Content Themes | ✅ |
| 2 | Content Hub (biblioteca media/copy + pickers) | ✅ |
| 3 | Workflow (aprobaciones, comentarios, asignaciones) | ✅ |
| 4 | Calendario editorial unificado | ✅ |
| 5 | Analytics & Reporting | ✅ |
| 6 | Competidores, A/B, recycling | ⏳ pendiente |
| 7 | Portal de cliente | 🔶 parcial (paralelo) |

---

## Arquitectura general

- **Backend:** Express + Prisma (PostgreSQL en Neon). Rutas en `backend/src/routes/growth.ts` bajo el prefijo `/api/growth`.
- **Frontend:** Next.js (App Router) en `frontend/src/app/dashboard/growth/`. Cliente API centralizado en `frontend/src/lib/api.ts` (`apiClient`).
- **Multi-tenant:** todo cuelga de `softwareId`. Dentro de un software, los `Brand` representan clientes de la agencia.
- **IA:** `backend/src/config/openai.ts` (`openai.chat.completions`, modelo `gpt-4o`).

> ⚠️ **Migraciones:** el historial de Prisma migrations está roto (una migración antigua no replica en shadow DB → `migrate dev` falla con P1014). Se usa **`npx prisma db push`** para aplicar cambios de schema (todos aditivos). Ver memoria `prisma-migrate-roto-usar-db-push`.

### Flujo para aplicar cambios de schema
```bash
cd backend
npx prisma generate          # regenera el cliente (hoisted a node_modules raíz del monorepo)
npx prisma db push --skip-generate   # aplica el schema a la BD (sin --accept-data-loss)
```

---

## Fase 1 — Brands, Campañas, Content Themes

### Modelos (`backend/prisma/schema.prisma`)
- **`Brand`** (`brands`): cliente de agencia. `nombre`, `slug`, `logoUrl`, `colorPrimario`, `brandVoice`, `contentGuidelines`, `hashtagsOficiales`, `targetAudience` (JSON), `approvalWorkflow` (JSON). Relaciona `socialAccounts`, `campaigns`, `mediaAssets`, `copySnippets`.
- **`SocialCampaign`** (`social_campaigns`): `objetivo` (enum `CampaignObjective`), `status` (enum `CampaignStatus`), `fechaInicio/Fin`, `presupuesto`, `briefCreativo`, `kpisObjetivo` (JSON), `colorTag`.
- **`ContentTheme`** (`content_themes`): pilares editoriales por cuenta. `nombre`, `frecuencia`, `diaPreferido`, `formatoPreferido`.
- **`SocialAccount`** ampliado: `brandId`, `nicho`, `categorias`, `subnichos`, `audienciaTarget`, `tonoExtendido`, `contenidoProhibido`, `contenidoFavorito`.
- **`SocialAccountPost`** ampliado: `campaignId`, `assignedTo`, `isEvergreen`, `recycleCount`, `originalPostId`.

### Endpoints
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET/POST/PUT/DELETE | `/brands` `/brands/:id` | CRUD brands |
| GET/POST/PUT/DELETE | `/campaigns` `/campaigns/:id` | CRUD campañas (filtros brand/status) |
| GET/POST/PUT/DELETE | `/content-themes` `/content-themes/:id` | CRUD temas (por `accountId`) |

### Frontend
- `growth/brands/page.tsx` — listado + modal crear/editar (logo, color, voz, guidelines, hashtags).
- `growth/campanas/page.tsx` — listado con filtros brand/estado.
- `growth/campanas/nueva/page.tsx` — wizard 4 pasos (básicos → objetivo → fechas/presupuesto → brief/KPIs).
- `growth/campanas/[id]/page.tsx` — detalle: KPIs, brief, cambio de estado, posts asociados.
- Tab **Temas** en el detalle de cuenta (`social-posts/page.tsx`, componente `ContentThemes`).

### API client
`getBrands/getBrand/createBrand/updateBrand/deleteBrand`, `getCampaigns/getCampaign/createCampaign/updateCampaign/deleteCampaign`, `getContentThemes/createContentTheme/updateContentTheme/deleteContentTheme`.

---

## Fase 2 — Content Hub (Biblioteca)

### Modelos
- **`MediaAsset`** (`media_assets`): `tipo` (enum `AssetType`: IMAGE/VIDEO/GIF/CAROUSEL/DOCUMENT/AUDIO), `url`, `thumbnailUrl`, `tags`, `usoCount`, `ultimoUsoAt`. Opcional `brandId`.
- **`CopySnippet`** (`copy_snippets`): `tipo` (enum `SnippetType`: CAPTION/CTA/HASHTAG_SET/BIO/RESPONSE/HOOK), `contenido`, `plataformas`, `tags`, `usoCount`.

> La biblioteca es **basada en URLs** (no hay almacenamiento de archivos / upload). La subida drag&drop real requeriría S3/Cloudinary.

### Endpoints
| Método | Ruta |
|--------|------|
| GET/POST/PUT/DELETE | `/media-assets` `/media-assets/:id` |
| POST | `/media-assets/:id/use` (incrementa `usoCount`) |
| GET/POST/PUT/DELETE | `/copy-snippets` `/copy-snippets/:id` |
| POST | `/copy-snippets/:id/use` |

Filtros en GET: `softwareId`, `brandId`, `tipo`, `tag`, `search`.

### Frontend
- `growth/biblioteca/page.tsx` — tabs **Media / Copy**, búsqueda con debounce, filtro por tipo, modales crear/editar, editor de tags, copiar copy al portapapeles.
- `components/growth/LibraryPicker.tsx` — picker modal reutilizable (`mode: 'media' | 'copy'`) integrado en el editor de posts: botones **"Biblioteca"** junto a *Contenido* (inserta copy) y *URLs de media* (añade URL). Incrementa el contador de uso al elegir.

### API client
`getMediaAssets/createMediaAsset/updateMediaAsset/useMediaAsset/deleteMediaAsset` y equivalentes `*CopySnippet`.

---

## Fase 3 — Workflow & Colaboración

### Modelos
- **`PostApproval`** (`post_approvals`): `reviewerId` (Int → `UsuarioCrm`, sin FK estricta), `status` (enum `ApprovalStatus`: PENDING/APPROVED/REJECTED/CHANGES_REQUESTED), `comentario`, `requestedChanges` (JSON), `resolvedAt`.
- **`PostComment`** (`post_comments`): `usuarioId`, `comentario`, `resuelto`.
- Relaciones en `SocialAccountPost`: `approvals`, `postComments` (la métrica `comments Int` ya ocupaba el nombre `comments`).

### Lógica de estados
Al registrar una decisión, se sincroniza el estado del post:
- `APPROVED` → post a `DRAFT` + `approvedAt`/`approvedBy`.
- `CHANGES_REQUESTED` / `REJECTED` → post a `NEEDS_REVISION`.
- `PENDING` → post a `IN_REVIEW`.

### Endpoints
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/team` | usuarios CRM activos (asignar/revisar) |
| GET/POST | `/posts/:postId/approvals` | historial / registrar decisión |
| GET/POST | `/posts/:postId/comments` | hilo de comentarios |
| PUT | `/comments/:id/resolve` | marcar resuelto/reabrir |
| DELETE | `/comments/:id` | eliminar comentario |
| PUT | `/posts/:postId/assign` | asignar (`assignedTo`) |
| GET | `/review-queue` | posts en `IN_REVIEW` (filtro `softwareId`, `assignedTo`) |

Los endpoints enriquecen `reviewer`/`usuario`/`assignee` con nombre y email vía lookup a `UsuarioCrm`.

### Frontend
- `components/growth/CollaborationPanel.tsx` — integrado en el editor de post (solo al editar): asignación, botones de aprobación (Pedir revisión / Aprobar / Pedir cambios / Rechazar) con historial, e hilo de comentarios (añadir / resolver / eliminar).
- Badge **"asignado"** en las tarjetas del kanban (`PostPipeline.tsx`).

### API client
`getGrowthTeam`, `getPostApprovals/createPostApproval`, `getPostComments/createPostComment/resolvePostComment/deletePostComment`, `assignPost`, `getReviewQueue`.

---

## Fase 4 — Calendario editorial unificado

Sin cambios de BD (usa modelos existentes).

### Endpoints
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/calendar/unified` | agrega posts + contenido SEO + emails + eventos en un rango |
| PUT | `/calendar/reschedule` | reprograma por tipo (`{type, id, date}`) |
| GET | `/calendar/best-times` | mejores horas por engagement histórico, con fallback a buenas prácticas por plataforma |

**Fuentes unificadas y campo de fecha:**
- `post` → `SocialAccountPost.scheduledAt`
- `content` → `ContentPiece.scheduledAt`
- `email` → `EmailCampana.programadaPara`
- `event` → `CalendarioEvento.fechaInicio/Fin` (globales del CRM, sin `softwareId`)

### Frontend
- `growth/calendar/page.tsx` (reescrito) — **vista mes + agenda**, filtros por tipo (color/icono), **drag & drop** para reprogramar (optimista con rollback), panel **"Mejores horas"** por plataforma.

### API client
`getUnifiedCalendar`, `rescheduleCalendarItem`, `getBestTimes`.

---

## Fase 5 — Analytics & Reporting

### Modelo
- **`SocialPostMetric`** (`social_post_metrics`): métricas históricas por post/día. `@@unique([postId, fecha])`. Campos: impressions, reach, likes, comments, shares, saves, clicks, profileVisits, follows, engagementRate, ctr, métricas de story/video, `fetchedAt`. Relación `metrics` en `SocialAccountPost`.

### Backend — `services/growth/socialAnalyticsService.ts`
- `getSocialAnalytics(softwareId, {startDate, endDate, brandId, platform})` — agrega de los campos vivos de `SocialAccountPost` (status PUBLISHED): KPIs, engagement-over-time (por día), por plataforma, por formato, top/worst posts.
- `snapshotMetrics(softwareId)` — upsert de las métricas actuales en `SocialPostMetric` (fecha de hoy). Base para historial; stand-in de la sync con APIs reales.
- `generateReport(softwareId, filtros)` — resumen ejecutivo con `gpt-4o` (con fallback automático si falla la IA).

### Endpoints
| Método | Ruta |
|--------|------|
| GET | `/analytics/social` |
| POST | `/analytics/social/snapshot` |
| POST | `/analytics/social/report` |

### Frontend
- `growth/analytics/social/page.tsx` — con **recharts**: KPI cards + mini-KPIs, área de engagement en el tiempo, barras por plataforma, ranking de formatos, top posts, y generador de reporte IA con export a **PDF** (`window.print()`, controles con `print:hidden`).

### API client
`getSocialAnalytics`, `snapshotSocialMetrics`, `generateSocialReport`.

---

## Navegación (Sidebar → grupo Marketing)
`Growth Engine` · `Social Posts` · **Brands** · **Campañas** · **Biblioteca** · **Analytics Social** · (Radar, Auditoría, Resurrección, AdSense, Ropa — otras líneas).

## Archivos clave
**Backend**
- `backend/prisma/schema.prisma` — modelos
- `backend/src/routes/growth.ts` — endpoints `/api/growth/*`
- `backend/src/services/growth/socialAnalyticsService.ts`

**Frontend**
- `frontend/src/lib/api.ts` — `apiClient`
- `frontend/src/app/dashboard/growth/{brands,campanas,biblioteca,calendar,analytics/social}/`
- `frontend/src/components/growth/{LibraryPicker,CollaborationPanel,PostPipeline}.tsx`
- `frontend/src/components/layout/Sidebar.tsx`

## Deuda técnica / pendientes
- **Build de producción del frontend roto** por `frontend/src/app/r/[code]/page.tsx` (literal octal / sintaxis) — WIP ajeno a estas fases, arreglar antes de desplegar.
- Errores de tipo preexistentes en `backend/src/routes/llamadas.ts` (6) — ajenos.
- Sin migraciones versionadas (se usa `db push`); arreglar la migración antigua si se quiere historial.
- Biblioteca sin upload real de archivos (solo URLs).
- Fase 5: la sync de métricas es un snapshot manual; falta integración con APIs reales de plataformas.
