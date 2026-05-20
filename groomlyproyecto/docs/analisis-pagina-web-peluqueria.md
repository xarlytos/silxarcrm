# Análisis Técnico: Página Web Pública por Peluquería

## Resumen Ejecutivo

Implementar una **página web pública personalizada por peluquería** que permita a cada salon mostrar su información, servicios, horarios y aceptar reservas online sin necesidad de que el cliente esté autenticado. La URL será del tipo `groomly.app/peluqueria/:slug`.

---

## 1. Contexto del Proyecto

| Aspecto | Estado Actual |
|---------|---------------|
| Multi-tenancy | Por header `X-Salon-Id`, no por subdominio |
| Campo slug | Existe en `Salon.slug` (único, no se usa para rutas) |
| API pública | No existe — todo requiere autenticación |
| Datos de marca | `SalonSettings` ya tiene: `primaryColor`, `logoUrl`, `faviconUrl`, `openingHours`, `bookingSettings` |
| Landing | Next.js 16 en `groomly-landing/` (ideal para SEO) |
| Web app | React SPA en `groomly-web/` (solo staff autenticado) |
| Plan Business | Ya tiene feature flag `white-label` con descripción "portal con tu marca y dominio" |

---

## 2. Decisiones de Arquitectura

### 2.1 ¿Dónde alojar las páginas públicas?

**Opción A: groomly-landing (Next.js) — RECOMENDADA**

- Ventajas: SSR para SEO, mejor rendimiento inicial, App Router de Next.js, ya es público.
- Ruta: `groomly-landing/app/peluqueria/[slug]/page.tsx`
- URL resultante: `groomly.app/peluqueria/mi-peluqueria`

**Opción B: groomly-web (React SPA)**

- Desventajas: peor SEO, SPA no indexable por defecto, mezcla rutas públicas con privadas.
- Descartada para el storefront público.

**Decisión: Opción A.** Las páginas públicas van en `groomly-landing` como un nuevo segmento de rutas.

### 2.2 ¿Cómo identificar la peluquería?

| Enfoque | URL | Pros | Contras |
|---------|-----|------|---------|
| Path param | `/peluqueria/:slug` | Simple, sin DNS, funciona hoy | Menos "premium" |
| Subdominio | `mi-peluqueria.groomly.app` | Más profesional | Requiere wildcard DNS, SSL, Vercel config |
| Custom domain | `mi-peluqueria.com` | White-label completo | Complejo, DNS, SSL, plan Business |

**Fase 1:** Path param (`/peluqueria/:slug`) — implementable inmediatamente.
**Fase 2:** Subdominio — cuando se active el feature `white-label` del plan Business.
**Fase 3:** Custom domain — futuro, solo plan Business.

### 2.3 ¿Nuevo módulo de API o extender portal?

| Opción | Veredicto |
|--------|-----------|
| Extender `/api/v1/portal/*` | ❌ Rompe el modelo de seguridad (portal = cliente autenticado) |
| Nuevo `/api/v1/public/*` | ✅ Limpio, explícito, sin auth, rate-limited |

**Decisión: Nuevo módulo `public` en el backend.**

---

## 3. Cambios en el Modelo de Datos

No se requieren cambios obligatorios para el MVP. Sin embargo, se recomiendan campos opcionales para enriquecer la página:

```prisma
// Opcionales — agregar en migración futura si se desea
model Salon {
  // ... campos existentes ...
  description   String?  // Breve descripción de la peluquería
  phone         String?  // Teléfono de contacto público
  email         String?  // Email de contacto público
  address       String?  // Dirección
  socialLinks   Json?    // { instagram, facebook, tiktok, website }
  isPublished   Boolean  @default(true) // Activar/desactivar página
}

model SalonSettings {
  // ... campos existentes ...
  // bannerUrl     String?  // Imagen de portada/cabecera
  // aboutText     String?  // Texto "Sobre nosotros"
}
```

> **Nota:** Para el MVP mínimo, se puede reutilizar todo lo existente en `Salon` + `SalonSettings`.

---

## 4. Especificación de la API Pública

### 4.1 Endpoints propuestos

```
GET /api/v1/public/salons/:slug
GET /api/v1/public/salons/:slug/services
GET /api/v1/public/salons/:slug/available-slots
POST /api/v1/public/salons/:slug/bookings
```

### 4.2 GET /api/v1/public/salons/:slug

**Sin autenticación. Rate limited.**

**Response 200:**
```json
{
  "ok": true,
  "data": {
    "id": "cuid",
    "name": "Peluquería Canina Luna",
    "slug": "peluqueria-luna",
    "description": "Especialistas en...",
    "phone": "+34 612 345 678",
    "email": "contacto@luna.com",
    "address": "Calle Mayor 123, Madrid",
    "settings": {
      "primaryColor": "#FF6B6B",
      "logoUrl": "https://...",
      "faviconUrl": "https://...",
      "openingHours": { /* ... */ },
      "currency": "EUR",
      "language": "es"
    },
    "socialLinks": {
      "instagram": "https://instagram.com/luna",
      "facebook": "https://facebook.com/luna"
    }
  }
}
```

**Campos a OMITIR siempre:**
- `ownerUserId`, `plan`, `subscriptionStatus`, `vatId`, `irpfEnabled`
- `invoicePrefix`, `defaultTaxRate`, `defaultIrpfRate`, `invoiceFooter`
- Cualquier dato de usuarios internos o financiero

### 4.3 GET /api/v1/public/salons/:slug/services

**Response 200:**
```json
{
  "ok": true,
  "data": [
    {
      "id": "cuid",
      "name": "Baño completo",
      "description": "Incluye corte de uñas...",
      "price": 25.00,
      "durationMinutes": 60,
      "category": { "id": "cuid", "name": "Higiene" }
    }
  ]
}
```

> Filtrar solo servicios con `isActive: true` y `isPublic: true` (si existe ese campo).

### 4.4 GET /api/v1/public/salons/:slug/available-slots

Query params: `?serviceId=xxx&date=2026-05-20`

**Response 200:**
```json
{
  "ok": true,
  "data": {
    "date": "2026-05-20",
    "slots": ["09:00", "09:30", "10:00", "11:30"]
  }
}
```

### 4.5 POST /api/v1/public/salons/:slug/bookings

**Body:**
```json
{
  "serviceId": "cuid",
  "date": "2026-05-20",
  "time": "10:00",
  "customer": {
    "name": "María García",
    "phone": "+34 612 345 678",
    "email": "maria@email.com"
  },
  "pet": {
    "name": "Rocky",
    "breed": "Golden Retriever",
    "notes": "Nervioso con el secador"
  }
}
```

**Response 201:**
```json
{
  "ok": true,
  "data": {
    "bookingId": "cuid",
    "status": "confirmed",
    "date": "2026-05-20T10:00:00Z",
    "serviceName": "Baño completo",
    "totalPrice": 25.00
  }
}
```

---

## 5. Frontend: Página Pública en groomly-landing

### 5.1 Estructura de rutas

```
groomly-landing/app/
├── peluqueria/
│   └── [slug]/
│       ├── page.tsx          # Página principal (SSR)
│       ├── layout.tsx        # Layout con theme dinámico
│       └── error.tsx         # 404 si no existe el slug
```

### 5.2 Renderizado

- **Next.js App Router** con `generateMetadata()` para SEO por peluquería.
- **Fetch en servidor** hacia la API pública para primera carga.
- **Theme dinámico:** aplicar `primaryColor` y `logoUrl` desde `SalonSettings`.

### 5.3 Secciones de la página

1. **Hero / Cabecera** — Logo, nombre, descripción, botón "Reservar cita"
2. **Servicios** — Grid de servicios con precios y duración
3. **Horario** — Tabla de `openingHours`
4. **Contacto** — Dirección, teléfono, email, mapa (Google Maps embed)
5. **Redes sociales** — Iconos enlazados
6. **Reserva (CTA)** — Formulario o enlace al flujo de reserva

### 5.4 Reserva sin autenticación

**Flujo propuesto:**

```
1. Usuario selecciona servicio
2. Selecciona fecha → fetch available-slots
3. Selecciona hora
4. Completa datos personales (nombre, teléfono, email)
5. Completa datos de la mascota (nombre, raza, notas)
6. Confirma → POST /public/salons/:slug/bookings
7. Recibe confirmación por pantalla + email (si se implementa)
```

**Modelo de cliente:** En el backend, al recibir la reserva pública:
- Buscar cliente por email/phone en `Customer` del salon.
- Si no existe, crear uno nuevo tipo `guest` o `walk-in`.
- Crear el `Appointment` asociado.
- Marcar origen: `source: 'WEB'` en el appointment.

---

## 6. Seguridad

| Medida | Implementación |
|--------|----------------|
| Rate limiting | Aplicar `express-rate-limit` solo en rutas `/api/v1/public/*` |
| Campo select | Nunca devolver campos sensibles en queries públicas |
| Validación de entrada | Zod en body params de POST /bookings |
| CORS | Landing ya tiene CORS configurado; public endpoints sin auth |
| No-exposure | `plan`, `subscriptionStatus`, `ownerUserId` siempre excluidos |
| CAPTCHA | Considerar hCaptcha/reCAPTCHA v3 en el formulario de reserva |

---

## 7. Plan de Implementación

### Fase 1: MVP (Mínimo Viable)

| # | Tarea | Archivos a crear/modificar |
|---|-------|---------------------------|
| 1 | Crear módulo `public` en backend | `groomly-backend/src/modules/public/public.routes.ts`, `public.controller.ts` |
| 2 | Montar rutas públicas en `app.ts` | `groomly-backend/src/app.ts` |
| 3 | Crear página `[slug]` en landing | `groomly-landing/app/peluqueria/[slug]/page.tsx` |
| 4 | Implementar `GET /public/salons/:slug` | Controller con select limitado |
| 5 | Implementar `GET /public/salons/:slug/services` | Solo servicios activos |
| 6 | Página estática con datos del salon | Hero, servicios, horario, contacto |

**Estimación:** 1-2 días.

### Fase 2: Reserva Online

| # | Tarea | Notas |
|---|-------|-------|
| 7 | Endpoint `GET /available-slots` | Reutilizar lógica de booking existente |
| 8 | Endpoint `POST /bookings` | Crear guest customer + appointment |
| 9 | Flujo de reserva en frontend | Stepper: servicio → fecha → hora → datos → confirmación |
| 10 | Notificación por email | Opcional, con Resend/SendGrid |

**Estimación:** 2-3 días.

### Fase 3: Mejoras y Premium

| # | Tarea | Plan |
|---|-------|------|
| 11 | Campos extras en `Salon` | `description`, `phone`, `address`, `socialLinks` |
| 12 | Subdominio por slug | `mi-peluqueria.groomly.app` (plan Pro/Business) |
| 13 | Custom domain | Configurable por peluquería (plan Business) |
| 14 | SEO avanzado | `generateMetadata()`, sitemap dinámico |
| 15 | Galería de fotos | `SalonGallery` model |
| 16 | Reseñas públicas | Integrar con Google Reviews o sistema propio |

---

## 8. Archivos Clave Referenciados

| Propósito | Ruta |
|-----------|------|
| Esquema de datos | `groomly-backend/prisma/schema.prisma` |
| Middleware de tenant | `groomly-backend/src/middleware/tenant.middleware.ts` |
| Portal (referencia de endpoint público) | `groomly-backend/src/modules/portal/portal.controller.ts` |
| Montaje de rutas | `groomly-backend/src/app.ts` |
| Rutas del frontend web | `groomly-web/src/App.tsx` |
| API client | `groomly-web/src/lib/api.ts` |
| Landing app router | `groomly-landing/app/` |

---

## 9. Mock de la Página

```
┌─────────────────────────────────────────────┐
│  [Logo]  Peluquería Canina Luna             │
│                                             │
│  "Tu mascota merece lo mejor"               │
│  [Reservar Cita]                            │
├─────────────────────────────────────────────┤
│  Nuestros Servicios                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐    │
│  │ Baño     │ │ Corte    │ │ Spa      │    │
│  │ 25 EUR   │ │ 30 EUR   │ │ 45 EUR   │    │
│  │ 60 min   │ │ 45 min   │ │ 90 min   │    │
│  └──────────┘ └──────────┘ └──────────┘    │
├─────────────────────────────────────────────┤
│  Horario                                    │
│  Lunes - Viernes: 9:00 - 20:00              │
│  Sábado: 9:00 - 14:00                       │
│  Domingo: Cerrado                           │
├─────────────────────────────────────────────┤
│  Contacto                                   │
│  Calle Mayor 123, Madrid                    │
│  +34 612 345 678                            │
│  contacto@luna.com                          │
│  [Instagram] [Facebook]                     │
├─────────────────────────────────────────────┤
│  © 2026 Peluquería Canina Luna — por Groomly│
└─────────────────────────────────────────────┘
```

---

## 10. Consideraciones Abiertas

1. **¿Las reservas públicas generan un `Customer` en el sistema?** Sí, como `guest` vinculado al salon.
2. **¿Cómo manejar duplicados de email/teléfono?** Buscar existente por salon+email, actualizar datos si cambian.
3. **¿Qué plan puede tener página web?** MVP para todos. Subdominio/custom domain solo Pro/Business.
4. **¿La página es editable por la peluquería?** Fase 1: hereda de `SalonSettings`. Fase 3: editor visual opcional.
5. **¿Disponibilidad en tiempo real?** Sí, `available-slots` consulta en vivo el calendario del salon.
