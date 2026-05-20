# Sprint 7: SaaS, Admin y Despliegue

**Duracion estimada:** 2 semanas  
**Objetivo:** Sistema de suscripciones con Stripe, panel de admin de plataforma, landing page y despliegue.

**Depende de:** Todos los sprints anteriores

---

## 7.1 SaaS: Suscripciones con Stripe

### Planes

| Plan | Precio | Limites |
|------|--------|---------|
| Free | $0/mes | 50 citas/mes, 1 groomer, sin portal cliente, sin fidelizacion |
| Starter | $19/mes | 200 citas/mes, 3 groomers, portal basico, fidelizacion basica |
| Professional | $49/mes | Citas ilimitadas, 8 groomers, portal completo, fidelizacion avanzada, paquetes |
| Business | $99/mes | Ilimitado, multi-sucursal, API, white-label, soporte prioritario |

### Estados de Suscripcion

- `trial` — 14 dias gratis (al crear salon)
- `active` — Suscripcion pagada
- `past_due` — Pago atrasado
- `canceled` — Cancelada

### Limites por plan

```typescript
const PLAN_LIMITS = {
  free: { maxAppointmentsPerMonth: 50, maxGroomers: 1, features: ['basic'] },
  starter: { maxAppointmentsPerMonth: 200, maxGroomers: 3, features: ['basic', 'portal'] },
  pro: { maxAppointmentsPerMonth: Infinity, maxGroomers: 8, features: ['basic', 'portal', 'loyalty', 'packages'] },
  business: { maxAppointmentsPerMonth: Infinity, maxGroomers: Infinity, features: ['all'] },
};
```

### Endpoints de Billing

| Metodo | Ruta | Auth | Descripcion |
|--------|------|------|-------------|
| GET | `/api/v1/billing/plans` | JWT | Listar planes disponibles |
| GET | `/api/v1/billing/invoices` | OWNER | Facturas de suscripcion |
| POST | `/api/v1/billing/checkout` | OWNER | Crear sesion de checkout Stripe |
| POST | `/api/v1/billing/portal` | OWNER | Redirigir a portal de cliente Stripe |
| POST | `/api/v1/billing/cancel` | OWNER | Cancelar suscripcion |
| POST | `/api/v1/billing/change-plan` | OWNER | Cambiar de plan |

### Webhooks de Stripe

| Ruta | Eventos |
|------|---------|
| `/api/v1/billing/webhook` | checkout.session.completed, invoice.payment_succeeded, customer.subscription.deleted |

### Middleware de limites de plan

```typescript
function checkPlanLimit(feature: string) {
  return async (req, res, next) => {
    const salon = await prisma.salon.findUnique({ where: { id: req.tenant.salonId } });
    const limits = PLAN_LIMITS[salon.plan];
    
    if (!limits.features.includes(feature)) {
      throw HttpErrors.forbidden('Esta funcion requiere un plan superior');
    }
    
    // Verificar contadores (citas del mes, groomers, etc.)
    // ...
    
    next();
  };
}
```

---

## 7.2 Panel de Plataforma (Admin)

### Endpoints

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | `/api/v1/platform/dashboard` | KPIs globales |
| GET | `/api/v1/platform/salons` | Listar peluquerias |
| GET | `/api/v1/platform/salons/:id` | Detalle |
| PATCH | `/api/v1/platform/salons/:id` | Actualizar plan/estado |
| GET | `/api/v1/platform/users` | Listar usuarios |
| GET | `/api/v1/platform/subscriptions` | Suscripciones |
| GET | `/api/v1/platform/revenue` | Ingresos por periodo |
| GET | `/api/v1/platform/audit` | Logs de auditoria |

### KPIs del Dashboard de Plataforma

```typescript
interface PlatformDashboard {
  totalSalons: number;
  activeSalons: number;
  totalUsers: number;
  mrr: number; // Monthly Recurring Revenue
  trialsEndingSoon: number; // trial ending in 7 days
  churnRate: number;
  revenueByPlan: { plan: string; revenue: number; count: number }[];
  revenueHistory: { month: string; revenue: number }[];
}
```

---

## 7.3 Frontend: Billing en Settings

### Pantalla: `/settings/billing`

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  Facturacion y Plan                                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Plan actual: Professional                                  │
│  Estado: Activo | Proximo pago: 15 Mayo 2026               │
│                                                             │
│  [Gestionar en Stripe]  [Cancelar suscripcion]              │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  Comparativa de planes:                                     │
│                                                             │
│  +-----------+ +-----------+ +-----------+ +-----------+   │
│  |   Free    | |  Starter  | |    Pro    | | Business  |   │
│  |   $0/mes  | |  $19/mes  | |  $49/mes  | |  $99/mes  |   │
│  |           | |           | |  ACTUAL   | |           |   │
│  | 50 citas  | | 200 citas | |Ilimitado  | |Ilimitado  |   │
│  | 1 groomer | | 3 groomers| | 8 groomers| |Ilimitado  |   │
│  |           | | Portal    | | Portal    | | Portal    |   │
│  |           | |           | |Fidelizacion| | Todo      |   │
│  |           | |           | | Paquetes  | | API       |   │
│  |           | |           | |           | | White-label|   │
│  | [Actual]  | | [Elegir]  | | [Actual]  | | [Elegir]  |   │
│  +-----------+ +-----------+ +-----------+ +-----------+   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 7.4 Frontend: Panel de Plataforma

### Pantalla: `/platform`

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  Groomly Platform Admin                                     │
├─────────────────────────────────────────────────────────────┤
│  KPIs:                                                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ 245      │ │ 1,203    │ │ $8,450   │ │ 12       │       │
│  │ Salons   │ │ Usuarios │ │ MRR      │ │ Trials   │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
│                                                             │
│  [Grafico: MRR ultimos 6 meses]                             │
│  [Grafico: Salons por plan]                                 │
│                                                             │
│  Salones recientes:                                         │
│  [Tabla: nombre, plan, estado, fecha, acciones]             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Sub-pantallas

| Ruta | Descripcion |
|------|-------------|
| `/platform/salons` | Listado de peluquerias |
| `/platform/users` | Listado de usuarios |
| `/platform/subscriptions` | Suscripciones y facturacion |
| `/platform/audit` | Logs de auditoria |

---

## 7.5 Landing Page (Next.js)

### Secciones

1. **Hero**: Titulo, subtitulo, CTA (Prueba gratis)
2. **Features**: Caracteristicas principales con iconos
3. **Pricing**: Tabla comparativa de planes
4. **Testimonials**: Testimonios de clientes
5. **FAQ**: Preguntas frecuentes
6. **CTA**: Registro final
7. **Footer**: Links, legal

### Rutas

| Ruta | Descripcion |
|------|-------------|
| `/` | Landing page |
| `/precios` | Planes de precios |
| `/registro` | Registro (redirige a app) |
| `/demo` | Solicitar demo |

---

## 7.6 Despliegue

### Infraestructura recomendada

| Componente | Desarrollo | Produccion |
|-----------|-----------|-----------|
| Backend | localhost:3000 | Railway/Render/Fly.io |
| Frontend | localhost:5173 | Vercel/Netlify |
| Landing | localhost:3001 | Vercel |
| BD | SQLite | PostgreSQL (Railway/Supabase) |
| Storage | local | Cloudflare R2 / AWS S3 |
| Email | console | SendGrid/Resend |
| SMS | console | Twilio |

### Variables de entorno produccion

```bash
# Backend
DATABASE_URL="postgresql://..."
JWT_SECRET="..."
JWT_EXPIRES_IN="7d"
CORS_ORIGIN="https://app.peluguau.es,https://admin.peluguau.es"
PUBLIC_API_URL="https://api.peluguau.es"
WEB_URL="https://app.peluguau.es"
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_PRICE_STARTER="price_..."
STRIPE_PRICE_PRO="price_..."
STRIPE_PRICE_BUSINESS="price_..."
SENDGRID_API_KEY="SG...."

# Frontend
VITE_API_URL="https://api.peluguau.es"
```

### Tareas de despliegue
- [ ] Dockerfile para backend
- [ ] GitHub Actions para CI/CD
- [ ] Migraciones automaticas en deploy
- [ ] Health check endpoint
- [ ] Logs centralizados

---

## Criterios de Aceptacion

- [ ] Stripe checkout funciona (test mode)
- [ ] Webhooks de Stripe actualizan estado de suscripcion
- [ ] Limites de plan se respetan (middleware funciona)
- [ ] Panel /platform muestra KPIs reales
- [ ] Landing page es responsive y atractiva
- [ ] Registro desde landing funciona
- [ ] Backend tiene Dockerfile y health check
- [ ] CI/CD pipeline en GitHub Actions
- [ ] Documentacion de deploy en README
- [ ] Variables de entorno documentadas
