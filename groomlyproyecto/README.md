# Groomly — ERP para Peluquerias Caninas

SaaS multi-tenant de gestion integral para peluquerias caninas: agenda, fichas, fidelizacion, paquetes, fotos antes/despues, facturas, comisiones y panel de plataforma.

## Estado

Sprints 0-7 implementados. ~232 tests backend pasando. Build de la landing genera estatica.

## Estructura del repo

```
groomlyproyecto/
├── groomly-backend/    # API REST Express + Prisma + SQLite/Postgres
├── groomly-web/        # App principal React + Vite (panel admin + portal cliente)
├── groomly-landing/    # Landing publica Next.js 16 (App Router)
├── docs/               # Documentacion adicional
└── sprints/            # Planificacion sprint-by-sprint
```

## Stack

| Capa | Tecnologia |
|------|------------|
| Backend | Node.js 20+, Express, TypeScript, Prisma |
| BD | SQLite (dev) / PostgreSQL (prod) |
| App web | React 19, Vite, Tailwind CSS, Zustand, React Query, Recharts |
| Landing | Next.js 16, Tailwind CSS v4 |
| Auth | JWT (jose), Argon2id |
| Pagos | Stripe (suscripciones + checkout para invoices) |

## Arrancar en desarrollo

Cada app es independiente. Abre 3 terminales:

### 1) Backend (`http://localhost:3000`)

```powershell
cd groomly-backend
npm install
npx prisma migrate dev
npm run dev
```

Ver detalles en `groomly-backend/README.md`.

### 2) App web (`http://localhost:5173`)

```powershell
cd groomly-web
npm install
npm run dev
```

### 3) Landing (`http://localhost:3001`)

```powershell
cd groomly-landing
npm install
npm run dev -- -p 3001
```

(Por defecto Next.js usa el 3000, pero el backend ya ocupa ese puerto).

## Stripe en modo dev

Si no configuras `STRIPE_SECRET_KEY`, el backend opera en modo mock:
- Los checkout y change-plan se aplican directamente sobre la BD.
- El portal devuelve la URL de la app.
- Los webhooks devuelven 503.

Para probar webhooks reales:

```powershell
stripe listen --forward-to localhost:3000/api/v1/billing/webhook
stripe trigger checkout.session.completed
```

Tarjetas de prueba: `4242 4242 4242 4242` (cualquier cvc, fecha futura).

## Variables de entorno principales

Backend (`groomly-backend/.env`):
- `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN`
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_STARTER|PRO|BUSINESS`
- Lista completa en `groomly-backend/README.md`.

Web (`groomly-web/.env`):
- `VITE_API_URL` (default `http://localhost:3000/api/v1`)

Landing (`groomly-landing/.env.local`):
- `NEXT_PUBLIC_APP_URL` (default `http://localhost:5173`)

## Tests

Solo el backend tiene suite de tests automatizados:

```powershell
cd groomly-backend
npm test
```

## Despliegue

Pendiente de concretar. Recomendado:

| Componente | Plataforma sugerida |
|------------|---------------------|
| Backend | Railway / Render / Fly.io + Postgres |
| App web | Vercel / Netlify |
| Landing | Vercel |
| Storage fotos | Cloudflare R2 / AWS S3 (actualmente: data URL en BD) |

Aun no se incluye:
- Dockerfile
- Workflow de GitHub Actions
- Migracion automatica en deploy

Estos se generaran cuando se decida la plataforma final.

## Roles

| Rol | Descripcion |
|-----|-------------|
| OWNER | Dueno del salon. Acceso total. |
| MANAGER | Gestion operativa (citas, finanzas, equipo). |
| GROOMER | Peluquero. Calendario y notas de mascotas. |
| RECEPTIONIST | Recepcion. Citas, clientes, cobros. |
| CUSTOMER | Cliente final. Solo portal. |
| Platform admin | Acceso al panel `/platform`. Bandera `User.isPlatformAdmin`. |

## Convenciones

- Multi-tenant: header `X-Salon-Id` en todas las rutas de negocio.
- Soft deletes en entidades principales.
- Audit logging centralizado en `lib/auditLog.ts`.
- Plan limits aplicados via `requirePlanFeature` y `requirePlanLimit` middlewares.

## Sprints

| Sprint | Tema | Estado |
|--------|------|--------|
| 0 | Fundacion: monorepo, auth, multi-tenant | Hecho |
| 1 | Core: mascotas, clientes, catalogo | Hecho |
| 2 | Citas: calendario, agenda, estados | Hecho |
| 3 | Staff: invitaciones, permisos, comisiones | Hecho |
| 4 | Finanzas: facturas, pagos, gastos, inventario | Hecho |
| 5 | Portal del cliente, comunicaciones, reviews | Hecho |
| 6 | Fidelizacion, paquetes, cupones, waitlist, fotos | Hecho |
| 7 | SaaS: Stripe billing, admin platform, landing | Hecho |

## Documentacion

- `DOCUMENTACION_GROOMLY.md`: arquitectura completa
- `sprints/sprint-XX-*.md`: planificacion por sprint
- `groomly-backend/README.md`: detalles del backend
