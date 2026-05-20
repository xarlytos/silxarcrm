# Diseño: Personalización completa de disponibilidad (rotación + excepciones + ausencias)

**Estado:** Propuesta — pendiente de aprobación.
**Fecha:** 2026-05-18.
**Alcance:** Backend (schema + slot generator + endpoints) + Frontend (refactor de `GroomerSchedulePage` + `AvailabilityModal`).
**No tocar código hasta aprobación.**

---

## 1. Problema

`GroomerSchedulePage` solo edita el patrón semanal recurrente, sin más personalización. El usuario necesita poder definir:

1. **Turnos rotatorios** (semana A vs semana B).
2. **Horario especial un día concreto** (override puntual de la regla semanal).
3. **Ausencias / vacaciones** desde la misma página (hoy viven en `GroomerDetailPage`).

Las tres son "excepciones" a la regla semanal. Las modelamos juntas porque el cálculo de slots tiene que resolverlas en orden.

---

## 2. Estado actual relevante

### Schema (`groomly-backend/prisma/schema.prisma`)
- `GroomerSchedule` con `@@unique([groomerId, dayOfWeek])` — una entrada por día.
- `GroomerTimeOff` ya existe: range de fechas, type (`vacation|sick|other`), reason.
- **No existe** ningún modelo para overrides por día.

### Slot generator (`groomly-backend/src/lib/slots.ts:139`)
```ts
include: {
  schedules: { where: { dayOfWeek } },
  timeOffs: { where: { startDate: { lte: dayEnd }, endDate: { gte: dayStart } } },
}
// usa schedules[0] directamente
```

### UI
- `groomly-web/src/pages/groomers/GroomerSchedulePage.tsx` — solo 7 filas semanales.
- `groomly-web/src/pages/groomers/GroomerDetailPage.tsx` tab "Ausencias" — `listTimeOff` + `TimeOffFormModal` (queda interno al archivo).
- `groomly-web/src/pages/appointments/AvailabilityModal.tsx` — modal recién añadido en agenda.

---

## 3. Arquitectura conceptual

Resolución del horario efectivo de un peluquero en una fecha `d`:

```
1. ¿Hay TimeOff que cubra d?         → no trabaja, fin.
2. ¿Hay ScheduleException para d?    → usar esa (puede ser isWorking=false).
3. Patrón semanal:
   weekIndex = computeWeekIndex(d, groomer.weeksInRotation, groomer.rotationAnchorDate)
   buscar GroomerSchedule(groomerId, weekIndex, dayOfWeek)  → usar si isWorking.
4. Si nada de lo anterior aplica     → no trabaja.
```

Las tres capas son aditivas y no se solapan conceptualmente:
- **Capa 1 (TimeOff)**: rangos largos (vacaciones, bajas).
- **Capa 2 (ScheduleException)**: día único con horario distinto o cierre puntual.
- **Capa 3 (GroomerSchedule + rotación)**: regla base recurrente.

---

## 4. Modelo de datos propuesto

### 4.1 Cambios en `Groomer`
```prisma
model Groomer {
  // campos existentes
  weeksInRotation    Int       @default(1)
  rotationAnchorDate DateTime?
  scheduleExceptions ScheduleException[]
}
```

### 4.2 Cambios en `GroomerSchedule`
```prisma
model GroomerSchedule {
  id          String   @id @default(cuid())
  groomerId   String
  weekIndex   Int      @default(0)  // NUEVO
  dayOfWeek   Int
  startTime   String
  endTime     String
  isWorking   Boolean  @default(true)
  breakStart  String?
  breakEnd    String?
  breakStart2 String?
  breakEnd2   String?
  createdAt   DateTime @default(now())
  groomer     Groomer  @relation(fields: [groomerId], references: [id], onDelete: Cascade)

  @@unique([groomerId, weekIndex, dayOfWeek])  // reemplaza el unique anterior
}
```

### 4.3 Nueva tabla `ScheduleException`
```prisma
model ScheduleException {
  id          String   @id @default(cuid())
  groomerId   String
  date        DateTime
  isWorking   Boolean  @default(true)
  startTime   String?  // requerido si isWorking=true
  endTime     String?
  breakStart  String?
  breakEnd    String?
  breakStart2 String?
  breakEnd2   String?
  reason      String?
  createdAt   DateTime @default(now())
  groomer     Groomer  @relation(fields: [groomerId], references: [id], onDelete: Cascade)

  @@unique([groomerId, date])
  @@index([groomerId, date])
}
```

### 4.4 `GroomerTimeOff` — sin cambios
Se mantiene tal como está. No se unifica con `ScheduleException` porque tiene semántica distinta (rango + tipo + razón formal) y migrar datos existentes añade riesgo sin beneficio claro.

### 4.5 Semántica del anclaje de rotación
Igual que la versión anterior del diseño:
- `rotationAnchorDate` es el lunes de la "semana 0".
- Fallback global: `DEFAULT_ROTATION_ANCHOR = 2026-01-05` (lunes ISO).
- `computeWeekIndex(d, n, anchor) = ((floor((mondayOf(d) − anchor) / 7) mod n) + n) mod n`.

---

## 5. Migración

```sql
-- 1. Columnas en Groomer y GroomerSchedule
ALTER TABLE "Groomer" ADD COLUMN "weeksInRotation" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Groomer" ADD COLUMN "rotationAnchorDate" TIMESTAMP NULL;
ALTER TABLE "GroomerSchedule" ADD COLUMN "weekIndex" INTEGER NOT NULL DEFAULT 0;

-- 2. Reemplazar unique
DROP INDEX "GroomerSchedule_groomerId_dayOfWeek_key";
CREATE UNIQUE INDEX "GroomerSchedule_groomerId_weekIndex_dayOfWeek_key"
  ON "GroomerSchedule"("groomerId", "weekIndex", "dayOfWeek");

-- 3. Nueva tabla ScheduleException
CREATE TABLE "ScheduleException" (
  "id"          TEXT PRIMARY KEY,
  "groomerId"   TEXT NOT NULL REFERENCES "Groomer"("id") ON DELETE CASCADE,
  "date"        TIMESTAMP NOT NULL,
  "isWorking"   BOOLEAN NOT NULL DEFAULT true,
  "startTime"   TEXT NULL,
  "endTime"     TEXT NULL,
  "breakStart"  TEXT NULL,
  "breakEnd"    TEXT NULL,
  "breakStart2" TEXT NULL,
  "breakEnd2"   TEXT NULL,
  "reason"      TEXT NULL,
  "createdAt"   TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX "ScheduleException_groomerId_date_key" ON "ScheduleException"("groomerId", "date");
CREATE INDEX "ScheduleException_groomerId_date_idx"        ON "ScheduleException"("groomerId", "date");
```

Datos existentes: comportamiento inalterado. Todos los peluqueros quedan con `weeksInRotation=1` y sin `ScheduleException`.

---

## 6. Cambios en backend

### 6.1 `groomly-backend/src/lib/slots.ts`

Pseudocódigo del nuevo bucle:

```ts
const groomers = await prisma.groomer.findMany({
  where: { salonId, active: true, ...(groomerId ? { id: groomerId } : {}) },
  include: {
    schedules: true,
    timeOffs:           { where: { startDate: { lte: dayEnd }, endDate: { gte: dayStart } } },
    scheduleExceptions: { where: { date: dayStart } },
  },
});

for (const groomer of groomers) {
  // Capa 1: TimeOff
  if (groomer.timeOffs.length > 0) continue;

  // Capa 2: ScheduleException
  const exception = groomer.scheduleExceptions[0];
  let effective;
  if (exception) {
    if (!exception.isWorking) continue;
    effective = exception;
  } else {
    // Capa 3: rotación + dayOfWeek
    const weekIndex = computeWeekIndex(
      dayStart, groomer.weeksInRotation, groomer.rotationAnchorDate ?? DEFAULT_ROTATION_ANCHOR,
    );
    effective = groomer.schedules.find(s => s.dayOfWeek === dayOfWeek && s.weekIndex === weekIndex);
    if (!effective || !effective.isWorking) continue;
  }

  // ...resto de cálculo de slots usando effective (mismo código)
}
```

### 6.2 Endpoints en `groomly-backend/src/modules/groomers/`

#### Rotación (modifica existentes)
| Endpoint | Cambio |
|---|---|
| `GET /groomers/:id/schedule` | Devuelve todas las semanas (filtrar en cliente). |
| `PATCH /groomers/:id/schedule` | Body acepta `schedules[]` con `weekIndex` opcional (default 0). Valida `weekIndex < weeksInRotation`. |
| `PATCH /groomers/:id` | Acepta `weeksInRotation` (1-4) y `rotationAnchorDate`. Al reducir N, eliminar entradas con `weekIndex >= nuevoN` en la misma transacción. |
| `POST /groomers/:id/schedule/check-conflicts` | Calcula `weekIndex` por cita y compara con la semana propuesta. |
| `POST /groomers/:id/copy-schedule-from` | Error 400 si `weeksInRotation` distinto entre origen y destino. |
| `GET /groomers/schedule-summary` | Resuelve `weekIndex` y excepción para la fecha y devuelve el horario efectivo. |

#### Excepciones (nuevos)
| Endpoint | Función |
|---|---|
| `GET /groomers/:id/exceptions?from=&to=` | Lista de excepciones en rango. |
| `POST /groomers/:id/exceptions` | Crea o reemplaza (`upsert` por `[groomerId, date]`). Valida horarios. |
| `PATCH /groomers/:id/exceptions/:exceptionId` | Actualiza una excepción. |
| `DELETE /groomers/:id/exceptions/:exceptionId` | Elimina. |
| `POST /groomers/:id/exceptions/:date/check-conflicts` | Igual que el de schedule: devuelve citas que caerían fuera del horario propuesto. |

#### Ausencias (sin cambios)
Los endpoints existentes (`listTimeOff`, `createTimeOff`, `checkTimeOffConflicts`, `deleteTimeOff`) se mantienen. Solo el frontend cambia de ubicación.

### 6.3 Validación cruzada
- Si se crea una `ScheduleException` para una fecha que ya está cubierta por un `TimeOff` → warning en el endpoint (la excepción nunca llegará a aplicarse). No bloquea, pero devuelve aviso en la respuesta.
- Si se crea un `TimeOff` que cubre fechas con excepciones existentes → mismo warning.

---

## 7. Cambios en frontend

### 7.1 Refactor de `GroomerSchedulePage`

Pasa de un único Card a **tres Cards apilados verticalmente**:

```
┌── Patrón semanal ────────────────────────┐
│ [Toggle rotación]                        │
│ [SegmentedControl: Sem 1 | Sem 2 | …]    │
│ [Tabla 7 filas]                          │
│                            [Guardar]     │
└──────────────────────────────────────────┘

┌── Excepciones por día ───────────────────┐
│ Lista próximas excepciones               │
│   • 24 jun · 10-15  [editar] [eliminar]  │
│   • 30 jun · Cerrado                     │
│                  [+ Añadir excepción]    │
└──────────────────────────────────────────┘

┌── Ausencias ─────────────────────────────┐
│   • Vacaciones · 15-25 jul               │
│                   [+ Registrar ausencia] │
└──────────────────────────────────────────┘
```

Componentes reutilizables a extraer:
- `ScheduleEditor` (ya existe internamente; convertirlo en componente independiente, recibe `groomerId`).
- `ExceptionsSection` (nuevo).
- `AbsencesSection` (extraer la lógica actual de `GroomerDetailPage` tab "Ausencias" — incluido `TimeOffFormModal`).

Ubicación de los componentes compartidos: `groomly-web/src/components/groomers/` (carpeta nueva pequeña).

### 7.2 `ExceptionsSection` (nuevo)

- Listado: próximas 30 excepciones por fecha, ordenadas ascendente.
- Botón "Añadir excepción" → `ExceptionFormModal`:
  - `date` (selector, default hoy+1).
  - Toggle "Trabaja ese día" (si off → solo `reason`).
  - Si on → mismos campos que una entrada de schedule (start, end, hasta 2 descansos).
  - Validación idéntica a `validateEntry`.
  - Check de conflictos antes de guardar (mismo patrón que schedule).
- "Editar" abre el mismo modal con valores precargados.
- "Eliminar" con confirmación inline.

### 7.3 `AbsencesSection` (extracción)

- Migrar `TimeOffFormModal` y la lista de `GroomerDetailPage` a un componente compartido.
- `GroomerDetailPage` mantiene el tab "Ausencias" pero usa el componente extraído (sin duplicar UI).
- `GroomerSchedulePage` lo embebe en su tercer Card.

### 7.4 `AvailabilityModal.tsx` (recién creado)
- Resumen multilinea cuando hay rotación o excepciones próximas:
  ```
  Sem 1: L-V 9-18 · Sáb 10-14
  Sem 2: L-V 14-22
  Próx: 24 jun 10-15
  ```
- `formatScheduleSummary` se generaliza a `formatAvailabilitySummary({ schedules, weeksInRotation, exceptions, timeOffs })`.
- Botón "Editar" del modal sigue llevando a `GroomerSchedulePage`, ahora con las tres secciones.

### 7.5 Tipos en `groomly-web/src/types/api.ts`
```ts
export interface Groomer {
  // ...campos existentes
  weeksInRotation: number;
  rotationAnchorDate: string | null;
}

export interface GroomerSchedule {
  // ...
  weekIndex: number;
}

export interface ScheduleException {
  id: string;
  groomerId: string;
  date: string;
  isWorking: boolean;
  startTime: string | null;
  endTime: string | null;
  breakStart: string | null;
  breakEnd: string | null;
  breakStart2: string | null;
  breakEnd2: string | null;
  reason: string | null;
  createdAt: string;
}
```

---

## 8. Riesgos y tradeoffs

| Riesgo | Mitigación |
|---|---|
| Capas que se contradicen (TimeOff + excepción + rotación) | El orden de resolución es estricto y documentado en el código del slot generator. Endpoints emiten warning si se crea una excepción que será inalcanzable por un TimeOff existente. |
| Excepción en fecha pasada | UI no permite seleccionar fechas anteriores a hoy salvo flag explícito. Backend admite cualquier fecha (necesario para histórico). |
| Slot generator más caro (un `include` extra) | El `where: { date: dayStart }` con índice `(groomerId, date)` es O(log n). Impacto despreciable. |
| Tests de regresión | Suite que cubra: solo semanal, semanal + excepción, semanal + TimeOff, las tres juntas, rotación 2 sem + excepción, rotación + TimeOff, etc. ~10 casos. |
| Refactor de `AbsencesSection` rompe `GroomerDetailPage` | Tests manuales explícitos antes de fusionar; ambos consumidores comparten la misma fuente. |
| Datos sucios al activar/desactivar rotación | Al reducir `weeksInRotation`, mostrar preview de qué entradas se eliminarán + confirmación. |

---

## 9. Plan de implementación

Asume aprobación. Orden de mínimos riesgos primero:

### Fase 1 — Backend (independiente, sin tocar frontend)
1. Migración Prisma: columnas `weekIndex`, `weeksInRotation`, `rotationAnchorDate` + nueva tabla `ScheduleException`. Reemplazo del unique.
2. Helper `computeWeekIndex` con tests unitarios (bordes: año bisiesto, semana 52/53, anchor null).
3. Modificar `getAvailableSlots` y `isSlotAvailable` para resolver las tres capas. Tests con cada combinación.
4. Endpoints de rotación (modificar existentes).
5. Endpoints de excepciones (nuevos).
6. Tests de integración por endpoint.

### Fase 2 — Frontend, refactor preparatorio (frontend-only, antes de UI nueva)
7. Extraer `AbsencesSection` de `GroomerDetailPage`. Verificar que el tab "Ausencias" sigue funcionando idéntico.
8. Extraer `ScheduleEditor` de `GroomerSchedulePage`. Verificar regresión.
9. Actualizar tipos en `types/api.ts`.

### Fase 3 — Frontend, features nuevas
10. Sección "Patrón de turnos" en `GroomerSchedulePage` (toggle rotación, semanas, anchor).
11. `SegmentedControl` de semanas + estado `Map<weekIndex, ScheduleEntryInput[]>`.
12. Sección "Excepciones por día" + `ExceptionFormModal`.
13. Embeber `AbsencesSection` en `GroomerSchedulePage`.
14. Generalizar `formatScheduleSummary` → `formatAvailabilitySummary`.
15. Actualizar `AvailabilityModal` para mostrar resumen multilinea.

### Fase 4 — QA
16. Smoke test manual cubriendo cada capa y sus combinaciones.

---

## 10. Estimación

- Backend: 6-9 h (migración + slot generator + 5 endpoints + tests).
- Frontend refactor preparatorio: 3-4 h (extracciones, mantener regresión).
- Frontend features: 8-12 h (3 secciones + modal de excepción + AvailabilityModal).
- QA manual: 2-3 h.
- **Total: ~20-28 h**.

Si lo dividimos en entregas:
- **Entrega 1** (Fase 1 + 2): ~10-13 h. Backend completo + refactor frontend sin cambios visibles.
- **Entrega 2** (Fase 3 + 4): ~10-15 h. UI nueva visible para el usuario.

---

## 11. Decisiones pendientes

1. **Límite de semanas en rotación:** propuesto 4. ¿Confirmas?
2. **Ancla por defecto:** propuesto lunes 2026-01-05. ¿OK?
3. **Reducir `weeksInRotation`:** confirmación con preview de qué se borra (recomendado) vs silencioso. Propongo: con confirmación.
4. **Excepción en fecha pasada en UI:** bloquear por defecto vs permitir. Propongo: bloquear (más seguro; histórico ya queda registrado en citas).
5. **Unificar `ScheduleException` y `GroomerTimeOff` en una sola tabla:** propongo NO (semánticas distintas; datos existentes de TimeOff intactos).
6. **¿Entregar en 1 push o en 2 entregas?** Propuesta: 2 entregas (Fase 1+2 invisible, Fase 3+4 visible). Permite revertir o pausar entre fases.
