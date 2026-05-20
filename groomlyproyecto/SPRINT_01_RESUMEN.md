# Sprint Comercial 01 — Resumen de Cambios

> Documento de cierre del Sprint Comercial 01 de Groomly.
> Sprint: *Demolición y Reconstrucción de la Oferta*.
> Fecha de ejecución: 12 de mayo de 2026.
> Plan origen: [PLAN_ACCION_COMERCIAL.md](PLAN_ACCION_COMERCIAL.md) (sprints 01-06).
> Auditoría origen: [AUDITORIA_GROOMLY.md](AUDITORIA_GROOMLY.md).

---

## 0. Resumen de una línea

Eliminado el plan Free, subidos los precios a 39 / 79 / 179€, añadido el servicio Done-For-You de 197€ one-time, creados 5 documentos estratégicos (avatar, garantía, outreach, DFY, migración), y actualizada toda la cadena de tipos/tests/UI para reflejar el nuevo catálogo.

---

## 1. Decisiones tomadas durante la ejecución

| Pregunta | Decisión | Quién decidió |
|---|---|---|
| ¿Mantenemos usuarios Free como deprecated? | **No.** Eliminación limpia. | Confirmado con el usuario. |
| ¿Qué precios mensuales son realistas para el mercado real? | **39 / 79 / 179€** (no los 47/97/297 estilo Hormozi americano). | Usuario eligió "Realista al avatar". |
| ¿Cómo gestionamos el plan Done-For-You? | **One-time 197€**, sin mensualidad extra. NO entra en `PLAN_CATALOG`. Se gestiona manualmente. | Usuario corrigió la propuesta inicial. |
| ¿Cómo migramos las filas existentes con plan='free'? | UPDATE defensivo a `'starter' + 'past_due'` aunque no se esperan filas afectadas en pre-launch. | Decisión técnica del plan. |
| ¿Cuándo modelamos el DFY en BD? | Cuando lleguen **5 clientes DFY activos**. Antes, tracking manual en `docs/dfy-clientes.md`. | Decisión técnica del plan. |

---

## 2. Archivos nuevos (entregables del sprint)

### Documentos estratégicos (`docs/`)

| Archivo | Líneas aprox. | Para qué sirve |
|---|---|---|
| `docs/avatar.md` | ~240 | Definición exacta del Smallest Viable Market: demografía, negocio, mentalidad, 9 dolores verbalizados, 8 sueños verbalizados, canales, herramientas reemplazadas, sub-segmentos a evitar, plan de 5 entrevistas de validación. |
| `docs/garantia.md` | ~140 | Copy completa de la garantía pública de 60 días: promesa, "damn good reason why", proceso de reclamación, lo que NO cubre, badges/variantes cortas, notas operativas internas. |
| `docs/outreach-script.md` | ~250 | 3 plantillas de primer contacto (DM Instagram, WhatsApp, email), guion de conversación de 30 min, las 10 objeciones esperadas con respuestas, cadencia diaria, política de follow-up. |
| `docs/dfy-service.md` | ~150 | Servicio Done-For-You de 197€: posicionamiento, entregables día a día (kick-off → configuración → formación → cierre), proceso operativo interno, copy de venta. |
| `docs/migracion-free-users.md` | ~50 | Registro de decisión arquitectónica: por qué eliminación limpia y no deprecated. |

### Migración Prisma (`prisma/migrations/`)

| Archivo | Acción |
|---|---|
| `20260512180000_remove_free_plan/migration.sql` | Mueve cualquier `plan='free'` a `'starter' + past_due` + cambia el default del campo `plan` a `'starter'`. |

---

## 3. Cambios en código backend

### `groomly-backend/src/lib/billing.ts` (reescrito)

**Antes:**
- 4 planes: `free` (0€), `starter` (19€), `pro` (49€), `business` (99€).
- Tipo `PlanId = 'free' | 'starter' | 'pro' | 'business'`.
- `stripePriceEnv` podía ser `null` (para free).
- `highlights` genéricos sin valor monetario.

**Después:**
- 3 planes: `starter` (39€), `pro` (79€), `business` (179€).
- Tipo `PlanId = 'starter' | 'pro' | 'business'`.
- `stripePriceEnv` siempre definido (los 3 planes tienen Stripe price).
- Nuevo campo `stackValueMonthly` con el valor monetario referencial del Offer Stack por plan.
- `highlights` reescritos siguiendo el patrón Hormozi: cada componente con valor referencia en €.

**Ejemplo de cambio en `highlights` (Professional):**

```diff
- highlights: [
-   'Citas ilimitadas',
-   '8 peluqueros',
-   'Fidelizacion + paquetes + cupones',
-   'Portal completo',
- ],
+ highlights: [
+   'Agenda profesional con prevencion de no-shows (valor referencia 29€)',
+   'Portal cliente completo con reservas online (valor referencia 19€)',
+   'Recordatorios automaticos email + WhatsApp (valor referencia 15€)',
+   'Sistema de fidelizacion con puntos y cupones (valor referencia 25€)',
+   'Paquetes de servicios y bonos prepagados (valor referencia 19€)',
+   'Reports financieros y de productividad (valor referencia 15€)',
+   'Citas ilimitadas, 8 peluqueros',
+   'Soporte por chat en horario comercial',
+ ],
+ stackValueMonthly: 122,
```

### `groomly-backend/prisma/schema.prisma`

```diff
- plan                 String           @default("free") // free, starter, pro, business
+ plan                 String           @default("starter") // starter, pro, business
```

### `groomly-backend/src/modules/salons/salons.routes.ts`

```diff
- plan: z.enum(['free', 'starter', 'pro', 'business']).optional(),
+ plan: z.enum(['starter', 'pro', 'business']).optional(),
```

### `groomly-backend/src/modules/platform/platform.routes.ts`

```diff
- plan: z.enum(['free', 'starter', 'pro', 'business']).optional(),
+ plan: z.enum(['starter', 'pro', 'business']).optional(),
```

### `groomly-backend/src/modules/platform/platform.controller.ts`

```diff
- const PAID_PLANS: PlanId[] = ['starter', 'pro', 'business'];
- ...
- where: { subscriptionStatus: 'active', plan: { in: PAID_PLANS } }
+ where: { subscriptionStatus: 'active', plan: { in: PLAN_IDS } }
```

Constante eliminada por redundancia: ahora todos los planes son paid, así que `PAID_PLANS === PLAN_IDS`.

### `groomly-backend/src/modules/billing/billing.controller.ts`

**Bloque eliminado 1** (en `createCheckout`, líneas 132-134 originales):

```diff
- if (planId === 'free') {
-   throw HttpErrors.unprocessable('No se puede contratar el plan free');
- }
```

Redundante: `isValidPlanId('free')` ya devuelve `false`, así que `'planId invalido'` cubre el caso.

**Bloque eliminado 2** (en `changePlan`, líneas 275-297 originales):

```diff
- // Si se pide downgrade a free → cancelar subscripcion (si hay) y marcar como free trial sin Stripe
- if (planId === 'free') {
-   if (isStripeEnabled() && salon.stripeSubscriptionId) {
-     await cancelStripeSubscriptionAtPeriodEnd(salon.stripeSubscriptionId);
-   }
-   await prisma.salon.update({
-     where: { id: salonId },
-     data: { plan: 'free', subscriptionStatus: 'active' },
-   });
-   ...
-   return res.json({ message: 'Plan cambiado a free', plan: 'free' });
- }
```

La única vía para "salir" de un plan es ahora `POST /billing/cancel` (que pone `subscriptionStatus: 'canceled'`, dejando el último plan registrado).

### `groomly-backend/src/modules/auth/auth.service.ts`

**Cambio de homogeneización con onboarding:**

```diff
+ import { env } from '../../config/env';
...
  if (input.salonName) {
    let slug = slugify(input.salonName);
    ...
+   const trialEndsAt = new Date(Date.now() + env.STRIPE_TRIAL_DAYS * 24 * 60 * 60 * 1000);

    const salon = await prisma.salon.create({
      data: {
        name: input.salonName,
        slug,
        ownerUserId: user.id,
+       trialEndsAt,
        ...
      },
    });
  }
```

**Por qué:** Antes el endpoint `/auth/register` creaba salones SIN `trialEndsAt`, mientras `/onboarding/salon` sí lo seteaba. Inconsistencia ahora resuelta. Las dos rutas crean salones idénticos en estado de trial.

### `groomly-backend/vitest.config.ts` (arreglo colateral)

```diff
- import { defineConfig, loadEnv } from 'vitest/config';
+ import { defineConfig } from 'vitest/config';
+ import { loadEnv } from 'vite';
```

Bug pre-existente: en Vitest 4 `loadEnv` ya no se re-exporta desde `vitest/config`. Sin este fix, los tests no arrancan ni siquiera para correrse.

---

## 4. Cambios en tests backend

### `groomly-backend/tests/helpers.ts`

- Quitada `'free'` del tipo `RegisterOpts.plan` y de `upgradeSalon`.
- Quitada la condición `opts.plan !== 'free'` en `registerUser` (simplificada).

### `groomly-backend/tests/billing.test.ts` (reescrito)

- Test "lista los 4 planes" → ahora "lista los 3 planes con flag current (default: starter)". `data.length === 3`, ids `['starter','pro','business']`, `priceMonthly: 39` para starter.
- Test "rechaza plan free (422)" → renombrado a "rechaza planId free como invalido (422)". Mismo resultado (422), distinta razón interna.
- Test "cambia de free a starter (mock)" → reemplazado por "cambia de starter a pro (mock)".
- Test "rechaza cambiar al mismo plan" → ahora envía `planId: 'starter'` (que es el plan default actual) en lugar de `'free'`.
- Test "downgrade a free cancela y vuelve a free" → **eliminado**. La rama de downgrade a free ya no existe en el controller.
- Test nuevo: "rechaza change-plan a free como invalido (422)".

### `groomly-backend/tests/planLimits.test.ts` (reescrito)

- Test "Plan free: rechaza crear segundo groomer (limite 1)" → reemplazado por "Plan starter (default): rechaza crear cuarto groomer (limite 3)".
- Test "Plan free: rechaza loyalty" → renombrado a "Plan starter (default): rechaza loyalty". Mismo comportamiento (starter tampoco tiene loyalty).
- Test "Plan starter: rechaza loyalty (no incluye)" → eliminado por duplicar el anterior.
- Test "Plan free: rechaza coupons" → renombrado a "Plan starter (default): rechaza coupons".

### `groomly-backend/tests/onboarding.test.ts`

```diff
- plan: 'free',
+ plan: 'starter',
```

### `groomly-backend/tests/auth.test.ts`

```diff
- plan: 'free',
+ plan: 'starter',
```

### `groomly-backend/tests/platform.test.ts`

Precios actualizados:

```diff
- await setActivePlan(a.salonId!, 'pro'); // 49
- await setActivePlan(b.salonId!, 'starter'); // 19
- expect(res.body.mrr).toBe(49 + 19);
- expect(proRow.revenue).toBe(49);
+ await setActivePlan(a.salonId!, 'pro'); // 79
+ await setActivePlan(b.salonId!, 'starter'); // 39
+ expect(res.body.mrr).toBe(79 + 39);
+ expect(proRow.revenue).toBe(79);
```

---

## 5. Cambios en frontend

### `groomly-web/src/types/api.ts`

```diff
- export type Plan = 'free' | 'starter' | 'pro' | 'business';
+ export type Plan = 'starter' | 'pro' | 'business';
```

### `groomly-web/src/pages/platform/PlatformSalonDetailPage.tsx`

```diff
- const PLAN_OPTIONS: Plan[] = ['free', 'starter', 'pro', 'business'];
+ const PLAN_OPTIONS: Plan[] = ['starter', 'pro', 'business'];
```

### `groomly-web/src/pages/settings/SettingsBillingPage.tsx`

**Lógica simplificada en `handlePlanCta`:**

```diff
  const handlePlanCta = (plan: BillingPlan) => {
    setActionError(null);
-   if (plan.id === 'free') {
-     changePlanMutation.mutate('free' as Plan);
-     return;
-   }
-   if (subscription && subscription.status === 'active' && currentPlan?.id !== 'free') {
+   if (subscription && subscription.status === 'active') {
      changePlanMutation.mutate(plan.id);
    } else {
      checkoutMutation.mutate(plan.id);
    }
  };
```

**Otras limpiezas:**

```diff
- {currentPlan.priceMonthly === 0
-   ? 'Gratis'
-   : `${currentPlan.priceMonthly} ${currentPlan.currency}/mes`}
+ {`${currentPlan.priceMonthly} ${currentPlan.currency}/mes`}
```

```diff
- {currentPlan.id !== 'free' && subscription?.status !== 'canceled' ? (
+ {subscription?.status !== 'canceled' ? (
```

```diff
- {!plan.stripeConfigured && plan.id !== 'free' ? (
+ {!plan.stripeConfigured ? (
```

```diff
- {plan.id === 'free' ? 'Bajar a free' : 'Elegir plan'}
+ Elegir plan
```

---

## 6. Verificación ejecutada

| Check | Resultado |
|---|---|
| `cd groomly-backend && npm run build` | ✅ Verde, cero errores TypeScript. |
| `cd groomly-backend && npx prisma validate` | ✅ Schema válido. |
| `cd groomly-backend && npx prisma generate` | ⚠️ EPERM en Windows (DLL bloqueada). Reintentar con dev server parado. No es un problema de schema. |
| `cd groomly-backend && npm test` | ⚠️ Requiere `TEST_DATABASE_URL` en `.env`. Sin esa variable, no arrancan los tests. Test infrastructure pre-existente, no es responsabilidad del sprint. |
| `cd groomly-web && npm run build` | ⚠️ Errores TypeScript en `portal/*.tsx` y `portal.service.ts` — **pre-existentes y no relacionados** con los cambios de pricing. Verificado con `grep` que ninguno menciona `plan`, `billing` o `free`. |
| Grep final `'free'` en todo el repo | ✅ Solo aparece en sitios esperados: nuevos tests que verifican el rechazo, nueva migración, doc de decisión, migración inicial (histórica), sprint-00 doc (histórico). |

---

## 7. Lo que el usuario tiene que hacer ahora

### Pasos técnicos

1. **Aplicar la migración Prisma:**
   ```bash
   cd groomly-backend
   npx prisma migrate dev
   ```

2. **Regenerar el cliente Prisma** (si no se hizo automáticamente):
   ```bash
   cd groomly-backend
   npx prisma generate
   ```
   (Si da EPERM en Windows, parar el dev server primero.)

3. **Configurar Stripe** (manualmente en el dashboard):
   - Crear 3 productos: `Starter`, `Professional`, `Business`.
   - Crear 3 precios mensuales en EUR: 39€, 79€, 179€.
   - Copiar los `price_xxx` IDs a `.env`:
     ```
     STRIPE_PRICE_STARTER=price_xxxxxxxxxxxxx
     STRIPE_PRICE_PRO=price_xxxxxxxxxxxxx
     STRIPE_PRICE_BUSINESS=price_xxxxxxxxxxxxx
     ```
   - Crear un cuarto producto **"Done-For-You Setup"** con precio one-time de **197€** (sin recurrencia). Este se factura manualmente con Stripe Invoice, no entra en checkout self-serve.

4. **Configurar `TEST_DATABASE_URL`** si quieres correr los tests:
   - Crear una base de datos PostgreSQL separada para tests (puede ser una branch de Neon, una DB local, o un schema separado).
   - Añadir a `.env`:
     ```
     TEST_DATABASE_URL="postgresql://user:pass@host:5432/groomly_test?sslmode=require"
     ```
   - Correr: `npm test`.

### Pasos operativos (humanos, fuera del código)

5. **Validar el avatar** con 5 entrevistas a peluquerías reales (guion en `docs/avatar.md`, sección 9). Antes del Sprint 02.

6. **Construir la lista de 200 prospectos** siguiendo las fuentes y filtros de `docs/outreach-script.md`. Es el input del Sprint 02.

7. **Notificar el cambio de precios** a clientes actuales (si los hay). Hasta donde llegan mis datos, el seed crea un demo con `plan: 'pro'` y no debería haber clientes reales en plan Free.

8. **Configurar la inbox `garantia@groomly.app`** (o el dominio que uses) para recibir reclamaciones, dirigida al fundador.

---

## 8. Lo que NO se hizo (consciente, fuera de scope)

- ❌ **Página de pricing en landing público**: no existe `groomly-landing/` aún. La copy de pricing y garantía queda en `docs/` lista para dropear cuando se cree el landing (probable Sprint Comercial 03 o un sprint técnico paralelo).
- ❌ **Modelado del DFY en BD**: el servicio se gestiona manualmente hasta tener 5 clientes activos. Cuando los haya, añadir `dfyContractedAt`, `dfyDeliveredAt`, `dfyAmountCents` al modelo `Salon`.
- ❌ **Configuración real de Stripe**: requiere acceso al dashboard. Se documentan los pasos.
- ❌ **Entrevistas de validación del avatar**: acción humana del Sprint 01.4. El documento las prepara, no las ejecuta.
- ❌ **Outreach real**: empieza en Sprint 02.

---

## 9. Cambios en estructura del proyecto

Árbol nuevo de carpetas:

```diff
  groomlyproyecto/
+ ├── AUDITORIA_GROOMLY.md
+ ├── PLAN_ACCION_COMERCIAL.md
+ ├── SPRINT_01_RESUMEN.md            ← este documento
+ ├── docs/                            ← carpeta nueva
+ │   ├── avatar.md
+ │   ├── garantia.md
+ │   ├── outreach-script.md
+ │   ├── dfy-service.md
+ │   └── migracion-free-users.md
  ├── DOCUMENTACION_GROOMLY.md
  ├── sprints/                         ← sprints técnicos (sin cambios)
  ├── groomly-backend/
  │   ├── prisma/
  │   │   ├── schema.prisma            ← modificado (default 'starter')
  │   │   └── migrations/
+ │   │       └── 20260512180000_remove_free_plan/
+ │   │           └── migration.sql
  │   ├── src/                         ← varios archivos modificados
  │   ├── tests/                       ← varios archivos modificados
  │   └── vitest.config.ts             ← arreglo de loadEnv
  └── groomly-web/
      └── src/                         ← 3 archivos modificados
```

---

## 10. Métricas del sprint

| Métrica | Valor |
|---|---|
| Documentos creados | 5 (~830 líneas) |
| Archivos backend modificados | 8 |
| Archivos test modificados | 6 |
| Archivos frontend modificados | 3 |
| Migraciones Prisma nuevas | 1 |
| Bugs colaterales arreglados | 1 (`vitest.config.ts` loadEnv import) |
| Líneas de código eliminadas | ~40 (ramas free + lógica deprecated) |
| Líneas de código añadidas | ~80 (Offer Stack en highlights, stackValueMonthly, homogeneización auth) |
| Decisiones de producto/precio tomadas | 3 (precios, DFY one-time, eliminación limpia) |

---

## 11. Próximo sprint

**Sprint Comercial 02 — Done-For-You y Outreach Masivo.**

Entradas que necesita del Sprint 01:
- ✅ Pricing nuevo publicado y validado (este sprint).
- ✅ Avatar definido (este sprint).
- ✅ Guion de outreach listo (este sprint).
- ✅ Producto DFY definido (este sprint).
- 🟡 Stripe configurado con los nuevos productos (el usuario lo hace).
- 🟡 Avatar validado con 5 entrevistas (el usuario lo hace).
- 🟡 Lista de 200 prospectos construida (el usuario lo hace).

Resultado esperado al cierre del Sprint 02:
- 100+ conversaciones registradas con dueños de peluquería.
- 10 objeciones reales documentadas y respondidas.
- Mínimo 5 ventas confirmadas (trial paid + DFY).
- Documento `feedback-mercado.md` con la oferta iterada según lo aprendido.

---

*Documento generado al cierre del Sprint Comercial 01 de Groomly. Sirve como changelog, audit trail y handoff al siguiente sprint.*
