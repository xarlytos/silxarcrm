# Informe de Auditoria Tecnica - Groomly ERP

**Fecha:** 2026-05-13
**Proyectos auditados:** `groomly-backend`, `groomly-web`
**Auditor:** Claude Code

---

## Resumen Ejecutivo

| Proyecto | Estado | Bloqueos |
|----------|--------|----------|
| `groomly-backend` | Funcional | Ninguno |
| `groomly-web` | **No compila** | 18 errores TypeScript + multiples ESLint |

El backend es solido: compila limpio, los tests pasan, la arquitectura es robusta. El frontend tiene errores de TypeScript que impiden el build y violaciones de reglas de React Hooks.

---

## 1. Backend (`groomly-backend`)

### 1.1 Compilacion TypeScript

```
npx tsc --noEmit -> SIN ERRORES
```

Compila limpio. Sin warnings ni errores.

### 1.2 Tests Automatizados

| Suite | Tests | Estado | Duracion |
|-------|-------|--------|----------|
| `auth.test.ts` | 22/22 | Pasan | 133s |
| `appointments.test.ts` | 16/16 | Pasan | ~210s |
| `planLimits.test.ts` | 8/8 | Pasan | ~69s |

**Cobertura probada:**
- Registro/login con argon2id
- Verificacion de email y reset de password
- CRUD de citas con validacion de solapamientos
- Flujo de estados de cita (pending -> confirmed -> in_progress -> completed)
- Limites de plan (starter 3 groomers/200 citas, pro 8 groomers, business ilimitado)
- Middleware de features por plan

### 1.3 Arquitectura

```
src/
  config/env.ts          # Validacion Zod de variables de entorno
  lib/                   # Utilidades (prisma, jwt, errores, billing, slots, etc.)
  middleware/            # auth, tenant, plan, validate, error handling
  modules/               # Feature-based: auth, appointments, billing, portal...
  server.ts              # Entry point con graceful shutdown
```

**Puntos fuertes:**
- **Seguridad:** Helmet, rate-limiting (general 300/min, auth 30/15min), CORS con origen explicito, JWT con `jose` (HS256), passwords con `argon2id`
- **Multi-tenancy:** Header `X-Salon-Id` + `tenantMiddleware` con verificacion de membresia activa
- **Validacion:** Zod en todas las rutas con `validateBody`/`validateQuery`/`validateParams`
- **Errores:** `HttpError` con codigos especificos, mensaje generico en produccion
- **Prisma:** Schema de 23 modelos con relaciones bien definidas, indices estrategicos, `Decimal.toJSON` para serializacion limpia
- **Billing:** Planes (starter/pro/business) con features y limites, integracion Stripe con fallback mock
- **Tests:** Vitest con DB de test aislada, `global-setup.ts` hace `prisma migrate reset` antes de cada run

**Nota menor:** Prisma 6.6.0 tiene update disponible a 7.8.0 (no critico).

### 1.4 Variables de Entorno

| Variable | Estado | Nota |
|----------|--------|------|
| `DATABASE_URL` | Configurado | Neon PostgreSQL con pooling |
| `TEST_DATABASE_URL` | Configurado | Misma DB (idealmente deberia ser separada) |
| `JWT_SECRET` | Configurado | >=16 chars |
| `SMTP_*` | Opcional | Fallback a console transport |
| `STRIPE_*` | Opcional | Fallback a modo mock |

---

## 2. Frontend (`groomly-web`)

### 2.1 Compilacion TypeScript

```
npx tsc -b --noEmit -> 18 ERRORES (build bloqueado)
```

### 2.2 Errores TypeScript Detallados

| Archivo | Linea | Error | Severidad |
|---------|-------|-------|-----------|
| `PortalBookAppointmentPage.tsx` | 4 | `Dog` importado pero no usado | Baja |
| `PortalBookAppointmentPage.tsx` | 29 | `listServices` firma incompatible con `useQuery` | **Alta** |
| `PortalBookAppointmentPage.tsx` | 32 | `salon` declarado pero no usado | Baja |
| `PortalBookAppointmentPage.tsx` | 40-48 | `.filter()` y `.reduce()` no existen en `{}` | **Alta** |
| `PortalBookAppointmentPage.tsx` | 195 | `.map()` no existe en `{}` | **Alta** |
| `PortalDashboardPage.tsx` | 35 | `past` declarado pero no usado | Baja |
| `PortalLayout.tsx` | 29 | Property `salon` no existe en `AuthState & AuthActions` | **Alta** |
| `PortalSettingsPage.tsx` | 3 | `Settings` importado pero no usado | Baja |
| `portal.service.ts` | 2 | Module `@/types/api` no exporta `Salon` | **Alta** |

**Raiz del problema:** En `PortalBookAppointmentPage.tsx:27-29`, `useQuery` recibe `queryFn: listServices`. El tipo de `listServices` es `(params?: ListServicesParams) => Promise<Service[]>`, pero `useQuery` espera `QueryFunction<Service[], string[]>` cuyo primer parametro es un objeto de contexto (`{ queryKey, signal, meta, ... }`). Como las firmas no coinciden, TypeScript infiere `data` como `{}`, cascada de errores en todo el componente.

### 2.3 Errores ESLint (React Hooks)

| Archivo | Linea | Regla | Error |
|---------|-------|-------|-------|
| `QuickPetCreateModal.tsx` | 42 | `react-hooks/set-state-in-effect` | `setName('')` dentro de `useEffect` |
| `AppointmentModal.tsx` | 98 | `react-hooks/set-state-in-effect` | Multiples `setState` en `useEffect` |
| `CustomersListPage.tsx` | 26 | `react-hooks/set-state-in-effect` | `setPage(1)` en `useEffect` |
| `SellPackageModal.tsx` | 44 | `react-hooks/purity` | `Date.now()` en render |
| `GroomerSchedulePage.tsx` | 42 | `react-hooks/set-state-in-effect` | `setEntries()` en `useEffect` |

### 2.4 Arquitectura Frontend

```
src/
  types/api.ts           # Tipos compartidos (~786 lineas, completo)
  lib/                   # api (axios), queryClient, pdf, csv
  stores/                # Zustand (authStore con persistencia localStorage)
  hooks/                 # useAuth, useSalon, useDebouncedValue
  services/              # Un servicio por dominio (REST API)
  components/
    ui/                  # Componentes base (Button, Input, Card, etc.)
    guards/              # ProtectedRoute, PublicOnlyRoute, PlatformRoute
    layouts/             # ProtectedLayout, PublicLayout
  pages/                 # Una pagina por ruta, organizado por dominio
```

**Puntos fuertes:**
- Stack moderno: React 19 + Vite 8 + Tailwind CSS 4 + TanStack Query 5 + Zustand 5
- Tipado completo en `types/api.ts` con ~786 lineas cubriendo todos los dominios
- Routing bien estructurado con guards y layouts anidados
- Portal de cliente separado del panel de staff

---

## 3. Recomendaciones Priorizadas

### Prioridad 1 (bloquea build)

1. **`PortalBookAppointmentPage.tsx:27-29`**: Cambiar `queryFn: listServices` -> `queryFn: () => listServices()`
2. **`PortalLayout.tsx:29`**: Cambiar `useAuthStore((s) => s.salon)` -> `useAuthStore(selectCurrentMembership)?.salon`
3. **`portal.service.ts:2`**: Cambiar import `Salon` por `SalonSummary` o anadir tipo `Salon` en `types/api.ts`

### Prioridad 2 (limpia warnings)

4. Remover imports no usados: `Dog`, `salon`, `past`, `Settings`
5. Marcar `past` con `_past` si se quiere mantener por claridad, o eliminar

### Prioridad 3 (calidad codigo)

6. Refactorizar `setState` dentro de `useEffect`:
   - Patron correcto: usar `key` prop para forzar remount, o inicializar estado en handler de apertura
   - Alternativa: `useEffect(() => { if (!open) { ... } }, [open])` -> convertir a `onOpen`/`onClose` callbacks
7. `SellPackageModal.tsx:44`: Mover `Date.now()` a `useMemo` o inicializar en handler

### Prioridad 4 (mejoras backend)

8. Separar `TEST_DATABASE_URL` a una DB/branch distinta de produccion
9. Considerar actualizar Prisma a 7.x cuando sea estable para el proyecto

---

## 4. Conclusion

**Backend:** Listo para produccion. Solido, testeado, seguro.

**Frontend:** Necesita arreglos antes de poder hacer build. Son ~5-6 cambios pequenos que desbloquean la compilacion, mas una revision de patrones de React Hooks para limpiar ESLint.
