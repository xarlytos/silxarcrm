# Migración de Usuarios Free — Registro de Decisión

> Documento de decisión arquitectónica. Sprint Comercial 01.1.
> Fecha: 12 de mayo de 2026.

---

## Contexto

La auditoría Billion Dollar AI Team recomienda eliminar el plan Free (€0/mes) porque entrena al mercado a esperar gratis y mata la conversión a planes pagados. El Plan de Acción Comercial Sprint 01 ejecuta esta eliminación.

---

## Decisión

**Eliminación limpia, sin grandfather, sin periodo de aviso.**

Justificación:
1. Groomly está en fase pre-lanzamiento sin usuarios reales con plan Free.
2. El seed (`prisma/seed.ts`) crea el demo salon con plan `pro`, no con plan `free`.
3. Mantener el plan Free en el código como "deprecated" sería complejidad innecesaria (zod enums, type unions, ramas condicionales en controllers) sin beneficio para ningún usuario real.

**Plan de migración aplicado:**
- Migración Prisma `20260512_remove_free_plan` que ejecuta:
  - `UPDATE Salon SET plan='starter', subscriptionStatus='past_due' WHERE plan='free'` (defensivo, aunque no haya filas afectadas).
  - `ALTER TABLE Salon ALTER COLUMN plan SET DEFAULT 'starter'`.
- Eliminación del valor `'free'` de:
  - `PlanId` type, `PLAN_CATALOG`, `PLAN_IDS` en `src/lib/billing.ts`.
  - Zod enums en `salons.routes.ts:15` y `platform.routes.ts:19`.
  - Type `Plan` en frontend (`groomly-web/src/types/api.ts:5`).
  - Ramas condicionales en `billing.controller.ts` (rechazo en createCheckout, downgrade a free en changePlan).
  - Constante `PAID_PLANS` en `platform.controller.ts` (ya no tiene sentido distinguir).

---

## Alternativa descartada

**Mantener 'free' como deprecated.**

Habría implicado:
- Conservar `'free'` en `PlanId` con flag `deprecated: true` en `PLAN_CATALOG`.
- Filtrarlo en el endpoint público `GET /billing/plans` pero permitirlo en validación.
- Bloquear nuevos registros en `free` pero permitir lecturas de salones legacy.
- Periodo de aviso de 30 días a usuarios existentes con email + dashboard banner.

Descartada porque:
- Sin usuarios reales no aporta valor.
- Aumenta complejidad de tests (cada caso necesita "ahora deprecated" vs "antes válido").
- Si en el futuro queremos un plan freemium real, lo crearemos con un nombre distinto (ej: `lite`) y posicionamiento distinto (ej: solo para autónomos).

---

## Validación de la decisión

Antes de mergear la migración, ejecutar:

```sql
SELECT COUNT(*) FROM "Salon" WHERE "plan" = 'free';
```

Si el resultado en producción es 0 (esperado), proceder sin notificaciones.
Si el resultado es >0 (no esperado), pausar y notificar manualmente a esos owners antes de aplicar.

---

## Consecuencias futuras

- Nuevos salones se crean con `plan: 'starter'`, `subscriptionStatus: 'trial'`, `trialEndsAt: now + 14 días`.
- Tras los 14 días, si no hay método de pago, `subscriptionStatus` pasa a `'past_due'` (lógica del webhook de Stripe ya existente).
- Eliminar la suscripción no convierte al salón en `'free'`; lo deja en `subscriptionStatus: 'canceled'` con el último plan que tuviera. La UI debe gestionar correctamente este estado (mostrar "Suscripción cancelada, reactiva tu cuenta").

---

*Documento generado como parte del Sprint Comercial 01 de Groomly. No requiere actualización posterior salvo que cambie la política de planes.*
