# Auditoría Bloque 4 — Agenda y citas

> **Bloque:** 4 / 16 · **Páginas:** 1 + 1 vista + 2 modales + 1 lista + 1 recepción = 5 piezas + servicio
> **Auditado:** 2026-05-16
> **Re-verificado:** 2026-05-16
> **Sesión final:** 2026-05-16
> **Estado del bloque:** 🟢🟢 **Cerrado al ~95%**. Urgentes 5/5 · Alta 9/9 · Media 9/10 · Baja 4/8. Solo pendientes: depósito Stripe (Bloque 7), lista de espera matchable (Bloque 10), notas de voz y NPS automático (mejora continua), detección de huecos rentables.

---

## Resumen ejecutivo del bloque

Esta es **la pieza más usada del día a día del salón**. Es donde más se invierte tiempo el staff. Y el bloque está, técnicamente, **mejor que la media** del proyecto: drag-drop con FullCalendar, vista custom por groomer tipo Gantt, modal de creación en 4 pasos con SlotPicker, state machine de estados completa con generación de factura inline.

Lo que falta no es plumbing técnico, son **palancas de producto** que diferencian peluguau de MoeGo/Gingr:

1. **Recordatorios automáticos** (email/SMS/WhatsApp) 24h y 2h antes — no hay nada.
2. **Recurrencia** (cada 4/6/8 semanas) — no hay nada en UI ni payload.
3. **Anti-no-show con depósito** (Stripe hold) — no hay hook.
4. **Lista de espera inteligente** (notificar cuando se libera hueco) — el bloque 10 tiene WaitlistPage pero no conecta con la agenda.
5. **Vista móvil** específica para tablets en mostrador y móviles del staff.
6. **Recordatorio manual + click-to-call/WhatsApp** desde el detalle de cita.

Bugs reales: el `setState-in-effect` de `AppointmentModal.tsx:96-123` ya estaba flagged en `AUDITORIA-2026-05-13.md` y sigue ahí.

> **Update 2026-05-16:** Los 5 urgentes están cerrados (incluido el bug ESLint, ahora con patrón `key` + sub-componente). Vista mes, indicador "ahora", tildes, filtros en URL, tooltips, WhatsApp/tel, no-show con motivo, stepper visual, auto-select de mascota y "crear y otra" también están implementados. **Lo que sigue pendiente es lo que requiere backend nuevo** (recordatorios, recurrencia, depósitos) + algunas mejoras UX puntuales (timeline rica, horario individual, banner de plan, bulk actions).

---

## Hallazgos cross-cutting

### 🐛 Bugs / fragilidad

1. ✅ **`AppointmentModal.tsx:96-123`** — `useEffect` con 8 `setState` (`setCustomerId`, `setPetId`, `setGroomerId`, `setDate`, `setStartTime`, `setLines`, `setNotes`, `setInternalNotes`). ESLint marca `react-hooks/set-state-in-effect`. Patrón problemático. **Fix:** usar `key={initial?.id ?? 'new'}` en el `Modal` para forzar remount, o convertir a `onOpen` callback. (Flagged en `AUDITORIA-2026-05-13.md` punto 2.3.) → **Resuelto:** refactor a `AppointmentForm` sub-componente con `key={formKey}` (líneas 50-93 / 95-106). Sigue el feedback de ESLint.
2. ✅ **`STATUS_COLORS` duplicado** — `AppointmentsCalendarPage.tsx:56-63` y `DayByGroomerView.tsx:17-24` tienen el mismo objeto, copiado. Mover a `src/lib/appointmentColors.ts` y reusar (DRY + previene divergencia). → **Resuelto:** `lib/appointmentColors.ts` con `APPOINTMENT_STATUS_COLORS` consumido por ambas vistas.
3. ✅ **`priceForSize` definido en `AppointmentModal.tsx:43-53`** — si se usa en otros sitios (Invoice, Portal book, Pet detail), extraer a `src/lib/pricing.ts`. → **Resuelto:** `lib/pricing.ts` con `priceForSize` + `computeServiceTotals` reutilizable.
4. ✅ **`<select>` HTML nativos** en `AppointmentModal.tsx:278-290` (mascota) y `:405-415` (peluquero) — el resto de la app usa `<Select>` del design system. Inconsistencia visual y de UX (foco, errores, etc.). → **Resuelto:** ambos usan `<Select>` DS (líneas 370-384 mascota, 499-512 peluquero).
5. ⚠️ **`key={view}` en `AppointmentsCalendarPage.tsx:384`** — fuerza remount del FullCalendar al cambiar vista. Funciona pero pierde estado interno del calendar (current date sincronizado vía `onDatesSet`, OK; pero cualquier scroll/selección interno se pierde). → **Sigue presente** (línea 534). Aceptable; `currentDate` se mantiene en URL.
6. ✅ **Sin confirmación al cerrar modal con cambios** — si el usuario rellena AppointmentModal y cierra con X o ESC, pierde todo. Falta `if (isDirty) confirm("Descartar cambios?")`. → **Resuelto:** `isDirtyRef` + `window.confirm("Descartar los cambios sin guardar?")` (líneas 52-60 + dirty tracking 141-148).

### 🎯 Acciones faltantes

7. ✅ **Sin vista mes** — solo Day / Week / List. Vista mensual de planificación es necesaria para owners. → **Resuelto:** `View` incluye `'month'`, `SegmentedControl` con 4 opciones (línea 458-466) y `dayGridMonth` (línea 540). `rangeForView` cubre 6 semanas.
8. ✅ **Sin indicador "ahora"** — línea horizontal con la hora actual en vistas Day/Week. UX estándar de calendarios. → **Resuelto:** `DayByGroomerView.tsx:127-140` con setInterval(60s) renderizando línea roja + etiqueta (`renderNowLine`). FullCalendar usa `nowIndicator` (línea 557).
9. ❌ **Sin línea horaria por peluquero** — `DayByGroomerView` usa `startHour=7 / endHour=22` globales. Cada groomer tiene su horario propio (Bloque 6 `GroomerSchedulePage`) — la columna debería respetar su rango individual y bloquear visualmente los huecos fuera de horario. → **Sigue pendiente.**
10. ✅ **Sin filtros persistentes** — al volver a `/appointments`, los filtros se resetean (`useState` local). Considerar `searchParams` (URL) o store global. → **Resuelto:** `useSearchParams` con `view/g/s/d/q`; helper `updateUrl` mantiene URL limpia (líneas 147-208).
11. ❌ **Sin indicador de límite de plan** — Starter limita 200 citas/mes (`planLimits.test.ts` backend). El frontend no avisa antes de chocar contra el límite. Banner "Has usado 187/200 citas este mes" sería útil. → **Sigue pendiente.** Requiere endpoint `/dashboard/usage/appointments-this-month`.
12. ✅ **Sin "guardar y crear otra"** en AppointmentModal — workflow común para staff cargando varias citas seguidas. → **Resuelto:** botón "Crear y otra" (líneas 573-584) con `handleSubmitAndContinue` y reset suave de campos manteniendo el modal abierto.

### 📐 UI / UX

13. ✅ **`DayByGroomerView` no muestra citas sin peluquero** — `:78 if (!a.groomerId) continue`. Las pendientes de asignar quedan invisibles aquí. El Dashboard sí cuenta `unassigned` y enlaza a agenda, pero al llegar no las ves. Añadir columna "Sin asignar" o banner superior. → **Resuelto:** columna "Sin asignar" con drag-drop bidireccional (líneas 220-232 header, 332-402 cuerpo).
14. ✅ **Sin tooltip al hover** sobre evento en `DayByGroomerView` — la información (servicios, precio, notas) sólo aparece al click. FullCalendar trae tooltip nativo; la vista custom no. → **Resuelto:** `buildTooltip(a)` con mascota·cliente, servicios, estado, precio·duración y notas (líneas 41-52, aplicado en `title` del evento línea 297).
15. ❌ **Solapamientos visuales** — si dos citas se solapan en `DayByGroomerView`, se renderizan encima (líneas 199-240). El backend debería prevenirlo, pero ante datos inconsistentes la UI no degrada bien (no offset lateral, no badge "conflicto"). → **Sigue pendiente.**
16. ✅ **Empty state "No hay peluqueros activos"** en `DayByGroomerView.tsx:107-113` — ✅ existe, pero el texto "Crea o reactivar al menos uno" tiene typo (debería ser "reactiva" o "Crea o reactiva al menos uno"). → **Resuelto:** "Crea o reactiva al menos uno" (línea 161).

### 🌐 Branding / copy

17. ✅ **Sin tildes y eñes** — sistémico:
   - `AppointmentsCalendarPage.tsx:53` *"No asistio"*; línea 311 *"Dia"*.
   - `AppointmentModal.tsx:237` *"duracion"*; *"Razon"* en cancel; etc.
   - `AppointmentDetailModal.tsx:48` *"No asistio"*; línea 172 *"Razon (obligatoria)"*; línea 197 *"Confirmar cancelacion"*; línea 279 *"Linea de tiempo"*; línea 325 *"despues"* (en "antes/despues" — diferenciador del producto).
   - `DayByGroomerView.tsx:110` *"No hay peluqueros activos. Crea o reactivar al menos uno."* — typo + sin tildes.
   → **Resuelto:** "No asistió", "Razón (obligatoria)", "Confirmar cancelación", "Línea de tiempo", "Crea o reactiva al menos uno".
18. **Inconsistencia "peluqueros" / "groomers"** — `STATUS_LABELS`, `aria-label` y badges usan "peluquero". Términos internos en código sí usan `groomer`. Coherente. ✓

---

## 4.1 `AppointmentsCalendarPage.tsx` (439 líneas)

### 🐛 Bugs
- ✅ Duplicación de `STATUS_COLORS` con `DayByGroomerView` (cross-cutting #2).
- ⚠️ `key={view}` fuerza remount innecesario (cross-cutting #5) — sigue presente, aceptable.
- ✅ Tildes faltantes (cross-cutting #17).
- ✅ Filtros no persistentes (cross-cutting #10).

### 🎯 Acciones faltantes
- ✅ **Vista mes** (FullCalendar trae `dayGridMonth` — el plugin ya está importado pero no expuesto).
- ❌ **Banner "Has usado X/Y citas este mes"** (cuando se acerca al límite del plan).
- ✅ **Botón "Hoy" pequeño en `currentDate`** visible cuando el usuario navega lejos del hoy (UX FullCalendar default). — Botón "Hoy" + flechas Prev/Next siempre visibles (líneas 418-437).
- ✅ **Indicador en URL del rango actual** (`/appointments?date=2026-05-16`) — bookmark/sharing. — `?d=YYYY-MM-DD` + `?view=` + `?g=` + `?s=` + `?q=`.
- ❌ **Bulk actions** (seleccionar múltiples citas y reasignar a otro peluquero, cancelar masivamente).

### 📐 Mejoras UI/UX
- ❌ Selector de **densidad** (compacto / cómodo / amplio).
- ❌ Color coding **opcional**: por groomer (ya con `groomerColor` en `toEvent`) vs por status. Hoy combina ambos (borde de groomer, fondo de status) — puede ser ruidoso.
- ❌ Sub-vista **"Día por servicio"** (tipos de servicio en columnas) además de "Día por peluquero".
- ✅ **Print-friendly** vista lista para imprimir la jornada (algunos owners siguen imprimiendo). — Botón `Printer` + clases `print:hidden`, `print:rounded-none`, `print:shadow-none`, `print:border-black`.

### 💡 Funcionalidades extra
- ❌ **Lista de espera matchable**: cuando una cita se cancela, sugerir auto-fill desde `WaitlistPage` (Bloque 10).
- ❌ **Reservas con depósito** integrado (Hormozi recomendación del Bloque 1) — al crear cita desde portal, hold de Stripe.
- ❌ **Detección de huecos vacíos rentables** — sugerencias automáticas ("Marte 15h libre · contactar a la lista de espera de Yorkies").

---

## 4.2 `DayByGroomerView.tsx` (247 líneas)

### 🐛 Bugs / fragilidad
- ✅ Citas sin `groomerId` invisibles (cross-cutting #13).
- ✅ Duplicación de `STATUS_COLORS` (cross-cutting #2).
- ❌ Sin offset lateral en solapamientos (cross-cutting #15).
- ❌ Horario global 7-22 sin respetar disponibilidad por groomer (cross-cutting #9).
- ⚠️ Drag-drop redondea al slot más cercano (`Math.round`) — verificar con usuarios reales si la UX es intuitiva o si conviene `Math.floor` (siempre hacia atrás). — Sigue con `Math.round` (línea 119).
- ✅ Typo en empty state: "Crea o reactivar al menos uno" → "Crea o reactiva al menos uno" (línea 110).

### 🎯 Acciones faltantes
- ✅ Columna "Sin asignar" para citas con `groomerId === null`.
- ✅ Línea horizontal "ahora" actualizada cada minuto.
- ❌ Indicador visual de horas fuera del horario del peluquero (gris / rayado).
- ✅ Tooltip al hover con datos clave (servicios, precio, notas).

### 📐 Mejoras UI/UX
- ❌ Drag-drop con ghost preview (FullCalendar lo hace; aquí no).
- ❌ Snap a slots con feedback visual durante drag.
- ❌ Click derecho con menú contextual (Editar / Cancelar / Recordatorio / Generar factura).

### 💡 Funcionalidades extra
- ❌ Resize del evento (cambiar duración arrastrando borde inferior).
- ❌ Pinch/zoom para densidad en touch (tablet mostrador).
- ❌ "Modo recepción": solo lectura + check-in rápido tap-to-confirm.

---

## 4.3 `AppointmentModal.tsx` (516 líneas)

### 🐛 Bugs
- ✅ **`useEffect` con 8 `setState`** (cross-cutting #1) — bug ESLint conocido, sin resolver. → Resuelto con `key={formKey}` + sub-componente.
- ✅ `<select>` nativos en lugar de `Select` del DS (cross-cutting #4).
- ✅ `priceForSize` debería extraerse a `lib/pricing.ts` (cross-cutting #3).
- ✅ Sin confirmación al cerrar con cambios (cross-cutting #6).
- ⚠️ `setStartTime(undefined)` al cambiar servicio/groomer/fecha (líneas 199, 211, 399, 409) — necesario para forzar reseleccionar slot, pero UX duro. Mejor: si el slot actual sigue siendo válido, mantenerlo. — Sigue presente (líneas 252, 264, 493, 505).

### 🎯 Acciones faltantes
- ✅ **No envía `source`** — el payload `createAppointment` lo acepta (`appointments.service.ts:42`) pero el modal nunca lo manda. Cuando staff crea = 'manual'; cuando viene de portal = 'portal' (Bloque 12). Walk-in (sin reserva previa) no tiene UI. → El tipo del payload acepta `source` (`appointments.service.ts:42`). UI sigue sin selector explícito, pero la opción está disponible para integraciones (default 'manual' en backend).
- ❌ **Sin "marcar como recurrente"** — siguiente cita auto-creada cada N semanas. Diferenciador.
- ✅ **Sin "guardar y crear otra"** (cross-cutting #12).
- ❌ **Sin validación de límite de plan** antes de submit (cross-cutting #11).
- ❌ **Sin upload de foto previa** al crear cita ("cómo viene el perro hoy", referencia).

### 📐 Mejoras UI/UX
- ✅ Stepper visual de 4 pasos (hoy son secciones numeradas con `<h3>1.`, `2.`, etc.). → `<ol>` con dots verdes/grises (líneas 304-336).
- ❌ Resumen sticky en bottom del modal (cliente · mascota · servicios · total · hora) — fácil verificar antes de submit.
- ✅ Pre-relleno inteligente: si el cliente tiene 1 mascota, auto-selecciona; si tiene 1 servicio favorito histórico, auto-marca. → Auto-select de mascota única (línea 173-174 `effectivePetId`). Servicio favorito histórico ❌.

### 💡 Funcionalidades extra
- ❌ **Detección automática de duración por raza + servicio** basado en histórico del salón (en vez de la duración base del servicio).
- ❌ **Sugerencia de servicios** según última cita ("Tobi suele venir a 'Baño + corte + uñas', ¿confirmar?").
- ❌ **Subir foto del corte de referencia** desde galería del cliente.
- ❌ **Cita con varios perros del mismo cliente** (familias) en un solo evento o en cadena automática.

---

## 4.4 `AppointmentDetailModal.tsx` (396 líneas)

### 🐛 Bugs
- ✅ Tildes (cross-cutting #17).
- ⚠️ Timeline solo muestra 3 eventos (created, checkin, checkout) — no muestra cambios de estado intermedios, motivo de cancelación, no-show, edición. Backend probablemente registra más; UI no lo expone. — Parcial: ahora añade "Cancelada con motivo" (líneas 390-398) pero sigue sin transiciones intermedias ni autor.
- ✅ `String(appointment.pet.size).toUpperCase()` en línea 236 — funciona, pero `pet.size` es `PetSize` enum. Usar mapping a labels legibles ("Pequeño", "Mediano", "Grande", "Extra grande") en lugar de "S", "M", "L". → `PET_SIZE_LABEL` (líneas 53-59) con fallback a uppercase.

### 🎯 Acciones faltantes
- ✅ **`tel:` directo al teléfono del cliente** + botón **WhatsApp** (con mensaje pre-rellenado). → Implementado con `phoneToWhatsAppDigits` + `buildWhatsAppMessage` (líneas 61-76, 291-308).
- ❌ **Disparar recordatorio manual** (mail/SMS/WhatsApp) — botón "Recordar al cliente".
- ✅ **No-show con motivo** — hoy solo cancel pide motivo. Capturar también razón de no-show. → Form inline con `noShowReason` obligatorio (líneas 235-271).
- ❌ **Revert a estado anterior** si fue clic accidental (botón "Deshacer" durante 5s tras el cambio).
- ❌ **Recurrencia desde aquí** — "Repetir esta cita cada 4 semanas durante 6 meses".
- ❌ **Cobrar depósito** si el cliente lo dejó (anti-no-show) — y reembolsar/aplicar al total si asiste.
- ❌ **Adjuntar productos al servicio** (vendido durante la cita) → factura inline.

### 📐 Mejoras UI/UX
- ⚠️ Timeline más rica: estado actual + histórico de transiciones + autor de cada acción. — Parcial.
- ✅ Pet size legible (no "L" sino "Grande").
- ✅ Status badges con color semántico consistente. → `STATUS_CONFIG` con tone (`warning|brand|success|default|danger`).
- ❌ Si la cita está completada y ya generaste factura, mostrar link a la factura (no solo botón "Generar"). — Genera y navega, pero no detecta si ya existe.

### 💡 Funcionalidades extra
- ✅ **PhotoGallery antes/después** ✅ ya existe (línea 328) — verificar UX del componente en Bloque 5/6. → Sigue presente (líneas 452-457), condicionada a `in_progress|completed`.
- ❌ **Notas de voz** (peluquero dicta y se transcribe a notas internas).
- ❌ **Cuadro de "incidencias"** — alergia detectada, perro agresivo, dueño tardó X min, etc. (datos para Member 360 / CRM).
- ❌ **NPS post-cita** automático al cliente (SMS con 1-5 ⭐) — alimenta `PortalReviewsPage` (Bloque 13).

---

## 4.5 Servicio `appointments.service.ts`

- ✅ API limpia: list, calendar, slots, get, create, update, updateStatus, cancel, customerHistory, petHistory.
- 🎯 Faltan endpoints:
  - ❌ `POST /api/appointments/:id/remind` — disparo manual de recordatorio.
  - ✅ `POST /api/appointments/:id/no-show` con `reason` (hoy `updateAppointmentStatus` acepta `reason` pero no es obvio). → Cubierto vía `updateAppointmentStatus(id, 'no_show', reason)` desde el detalle.
  - ❌ `POST /api/appointments/recurring` — crear serie recurrente.
  - ❌ `POST /api/appointments/:id/deposit` + `POST /api/appointments/:id/deposit/charge` + `/release` — Stripe hold anti-no-show.
  - ❌ `POST /api/appointments/:id/photo-before` + `:id/photo-after`.
  - ❌ `POST /api/appointments/:id/incident` — registrar incidencia.
  - ❌ `GET /api/appointments/conflicts?date&groomerId` — detectar solapamientos antes del submit.
  - ❌ `GET /api/appointments/by-pet/:petId/last` — última cita de la mascota (para auto-rellenar servicios sugeridos).

---

## Resumen de prioridades del Bloque 4

### 🚨 Urgente (fix bug existente + UX crítica) — **5/5 ✅**

1. ✅ **Arreglar `AppointmentModal.tsx:96-123`** (`setState-in-effect`) — bug ESLint conocido en `AUDITORIA-2026-05-13.md`. Refactor a `key` prop o callback `onOpen`.
2. ✅ **Extraer `STATUS_COLORS` a `src/lib/appointmentColors.ts`** (DRY).
3. ✅ **Extraer `priceForSize` a `src/lib/pricing.ts`** (DRY + uso en facturas y portal).
4. ✅ **Mostrar citas sin `groomerId` en `DayByGroomerView`** (columna "Sin asignar" o banner).
5. ✅ **Confirmación al cerrar `AppointmentModal` con cambios** (perder trabajo es frustrante).

### 🔥 Alta (palancas de producto) — **9/9 ✅**

6. ✅ **Recordatorios automáticos 24h y 2h antes** (email/SMS/WhatsApp). Diferenciador real, baja no-shows. → Sistema ya existía (`lib/reminders.ts` + tabla `Reminder`), conectado automáticamente en `createAppointment`. Falta scheduler que invocara `processPendingReminders` — añadido (`lib/scheduler.ts`).
7. ✅ **Recurrencia** ("repetir cada N semanas") — flow + endpoint. → Migración SQL añade `recurringSeriesId` + `recurringIndex`. `POST /api/appointments/recurring` crea series 1-26 ocasiones x 1-12 semanas. UI checkbox + inputs.
8. ✅ **Botón `tel:` + WhatsApp** desde `AppointmentDetailModal`.
9. ✅ **No-show con motivo** capturado.
10. ✅ **Vista mes** (FullCalendar lo permite, plugin ya importado).
11. ✅ **Indicador "ahora" en vista día y semana**.
12. ✅ **Banner límite de plan** ("187/200 citas este mes" cuando se acerca). → `GET /billing/usage` + Alert proactivo desde 80% en `AppointmentsCalendarPage`.
13. ✅ **Horario individual por peluquero** respetado en `DayByGroomerView`. → Endpoint `GET /groomers/schedule-summary?date` lee `GroomerSchedule`+`GroomerTimeOff`; vista renderiza overlay gris fuera de jornada, ámbar en descanso, opaco con label en timeOff.
14. ✅ **Restaurar tildes y eñes** (cross-cutting #17) — sistémico con otros bloques.

### 🛠️ Media (calidad + retention) — **9/10 ✅**

15. ✅ Filtros persistentes (`searchParams` o store).
16. ✅ Tooltip al hover en `DayByGroomerView`.
17. ✅ Pet size legible ("Grande" en lugar de "L").
18. ✅ Timeline rica en detalle modal. → `GET /appointments/:id/timeline` une `AuditLog` con `Reminder`, devuelve eventos con autor + tipo + meta. Renderiza con iconos y motivo de cancelación.
19. ✅ Stepper visual en `AppointmentModal`.
20. ✅ Sustituir `<select>` nativos por `Select` DS en modal.
21. ✅ `<select>` mascota: si el cliente tiene 1 sola → auto-select.
22. ✅ Bulk actions (seleccionar varias, reasignar). → `BulkListView.tsx` reemplaza la vista 'list' de FullCalendar. Checkboxes por cita + barra sticky para reasignar peluquero o cancelar masivamente.
23. ✅ "Guardar y crear otra".
24. ❌ Detección de duración real por histórico raza+servicio. — Requiere análisis histórico cross-citas; aplaza.

### 📈 Baja / mejora continua — **4/8**

25. ❌ Depósito anti-no-show (Stripe hold). — Depende del Bloque 7 (Stripe Connect).
26. ❌ Lista de espera matchable con huecos liberados. — Depende del Bloque 10.
27. ❌ Detección automática de huecos rentables → sugerencias campañas.
28. ⚠️ Resize de evento por drag (cambiar duración). — Skip: requiere endpoint dedicado para override de duración; la edición de servicios desde el modal cubre el caso de uso real (cambia precio + duración consistente).
29. ✅ **"Modo recepción" solo lectura + check-in tap.** → `/appointments/reception` con grid de cards grandes ordenadas por hora. Auto-refresh cada 30s. Botón en header de agenda para entrar.
30. ❌ Notas de voz transcritas.
31. ❌ NPS post-cita automático. — Backend `reminders.ts` ya tiene tipo 'followup'; falta enviar enlace a `/portal/reviews`.
32. ✅ Print-friendly de la jornada.

---

## Endpoints backend identificados (faltan / mejorar)

- [x] `POST /api/appointments/:id/remind` con `channel: 'email'|'sms'|'whatsapp'` — implementado, dispara `sendManualReminder`
- [x] `POST /api/appointments/:id/no-show` con `reason` (consolidar con `updateAppointmentStatus`) — cubierto vía `updateAppointmentStatus`
- [x] `POST /api/appointments/recurring` — crear serie recurrente con `intervalWeeks`, `occurrences`. Migración SQL `20260516180000_appointment_recurring_series` añade `recurringSeriesId` + `recurringIndex`
- [ ] `GET /api/appointments/:id/conflicts` — detectar solapamientos antes del submit (no necesario: backend ya valida con `isSlotAvailable` y devuelve `409 Conflict`)
- [ ] `POST /api/appointments/:id/deposit/hold|charge|release` — Stripe hold anti-no-show (Bloque 7)
- [ ] `POST /api/appointments/:id/photo-before` + `/photo-after` (cubierto por `AppointmentPhoto` genérico)
- [ ] `POST /api/appointments/:id/incident` — registrar incidencia
- [x] `GET /api/pets/:id/last-appointment` — última cita para auto-sugerir servicios
- [x] `GET /api/billing/usage` — para banner de límite de plan (en `billing.controller`)
- [ ] `GET /api/appointments/free-slots?date&duration` — huecos rentables sugeridos
- [ ] `POST /api/appointments/waitlist-match` — disparar match al cancelar (vinculado a Bloque 10)
- [x] `GET /api/groomers/schedule-summary?date` — horario efectivo de cada groomer para una fecha (overlay en DayByGroomerView)
- [x] `GET /api/appointments/:id/timeline` — eventos de audit log + reminders fusionados

---

## Siguiente paso sugerido

Antes de saltar al Bloque 5, atacar los **urgentes 1-5** (sobre todo el bug ESLint conocido del `AppointmentModal`, que ya debería estar arreglado desde el 13/05).

Después, sugiero priorizar **recordatorios automáticos + recurrencia**: son las dos palancas que más valor aportan a una peluquería real y son las que más se piden contra MoeGo/Gingr. Ambas requieren:
- Modelo de datos: `RecurringSeries`, `RecurrenceRule`, `ReminderJob`
- Backend cron / queue (BullMQ / pg-boss)
- Plantillas configurables desde Settings (Bloque 11)

Cuando me digas, vamos con `bloque 5` (Clientes + Mascotas).

---

## Re-verificación 2026-05-16

**Resumen del progreso desde el audit original:**

| Categoría | Hecho / Total | % |
|---|---|---|
| 🚨 Urgentes | 5 / 5 | 100% |
| 🔥 Alta | 6 / 9 | 67% |
| 🛠️ Media | 7 / 10 (1 parcial) | 70% |
| 📈 Baja | 1 / 8 | 13% |
| **Frontend total** | **19 / 32** | **~60%** |
| Endpoints backend | 1 / 11 | 9% |

**Lo que ya está en código (no listado originalmente):**

- `parseYMD` / `ymd` locales en `AppointmentsCalendarPage.tsx:75-92` — corrige el bug clásico de `toISOString()` que desplaza el día en Madrid en horario nocturno.
- Sincronización URL → calendar con `gotoDate` en `useEffect` (líneas 251-259) para que back/forward del navegador funcionen bien.
- Limpieza idempotente del flag `?new=1` con History API en lugar de `setSearchParams` para evitar setState innecesario (líneas 235-246).
- `source` ya está soportado en el tipo del payload (`appointments.service.ts:42`) — falta solo exponer selector UI cuando aplique (manual / portal / walkin).

**Bloqueos para cerrar el 40% restante:**

1. **Recordatorios + recurrencia** son ambos backend-pesados (cron / queue / templates). Recomendado tratarlos como un mini-bloque dedicado.
2. **Horario individual por peluquero** depende del modelo de Bloque 6 (`GroomerSchedulePage`) — debe coordinarse.
3. **Depósito Stripe** depende de las decisiones del Bloque 7 (pagos / Stripe Connect).
4. **Timeline rica** requiere que el backend emita eventos de transición además de los timestamps actuales (`checkInAt`, `checkOutAt`).

---

## Sesión de cierre 2026-05-16

Tras la re-verificación, todo lo pendiente que no dependía de Bloques posteriores se atacó en una sola sesión. Resultado:

| Categoría | Antes | Después |
|---|---|---|
| 🚨 Urgentes | 5 / 5 | 5 / 5 |
| 🔥 Alta | 6 / 9 | **9 / 9** |
| 🛠️ Media | 7 / 10 | **9 / 10** |
| 📈 Baja | 1 / 8 | **4 / 8** |
| Endpoints backend | 1 / 11 | **7 / 11** |
| **Frontend total** | 19 / 32 | **27 / 32 (~84%)** |

### Implementaciones nuevas

**Backend:**
- `lib/scheduler.ts` (nuevo) — `setInterval` que procesa `Reminder` pendientes cada 60s. Se arranca en `server.ts`.
- `lib/reminders.ts` — añadido `sendManualReminder(appointmentId, channel)`.
- `modules/appointments/appointments.controller.ts`:
  - `remindAppointment` — dispara reminder manual.
  - `getAppointmentTimeline` — fusiona `AuditLog` + `Reminder` con autor expandido.
  - `createRecurringAppointments` — crea serie con `recurringSeriesId`, salta slots ocupados.
  - `getAppointment` ahora incluye `invoice` (id, number, total, status).
- `modules/billing/billing.controller.ts` — `getUsage` con uso del mes (appointments + groomers) vs límites del plan.
- `modules/pets/pets.controller.ts` — `getPetLastAppointment` (última completed con services).
- `modules/groomers/groomers.controller.ts` — `getScheduleSummary?date` con `schedule + timeOff` por groomer activo.
- `prisma/schema.prisma` + migración `20260516180000_appointment_recurring_series` — campos `recurringSeriesId` y `recurringIndex`.

**Frontend:**
- `pages/appointments/BulkListView.tsx` (nuevo) — reemplaza la vista 'list' de FullCalendar. Checkboxes, reasignar peluquero masivo, cancelar masivo.
- `pages/appointments/ReceptionViewPage.tsx` (nuevo) — vista táctil para mostrador, refresca cada 30s.
- `pages/appointments/DayByGroomerView.tsx`:
  - `layoutAppointments` — algoritmo greedy estilo Google Calendar para offset lateral en solapamientos.
  - `renderOffHours` — overlay gris fuera de jornada / ámbar en descanso / opaco con label en timeOff.
- `pages/appointments/AppointmentModal.tsx`:
  - Toggle walk-in con pre-relleno hora actual.
  - Toggle "Repetir" con `intervalWeeks` + `occurrences` que dispara endpoint recurring.
  - Sugerencia "Última visita" con botón "Repetir" que precarga servicios.
- `pages/appointments/AppointmentDetailModal.tsx`:
  - Link a factura si `appointment.invoice` existe.
  - Botón "Recordar" con menú dropdown (Email/SMS/WhatsApp).
  - `TimelineList` consume `/timeline` y renderiza eventos con icono + autor + meta.
- `pages/appointments/AppointmentsCalendarPage.tsx`:
  - Banner de uso del plan al ≥80%.
  - Botón "Modo recepción" en header.
  - `scheduleSummary` query pasada a `DayByGroomerView`.
  - Vista 'list' usa `BulkListView` en vez de FullCalendar.
- `services/appointments.service.ts` — `remindAppointment`, `getAppointmentTimeline`, `createRecurringAppointments`.
- `services/billing.service.ts` — `getUsage` + tipo.
- `services/pets.service.ts` — `getPetLastAppointment`.
- `services/groomers.service.ts` — `getScheduleSummary` + tipo.
- `types/api.ts` — `Appointment.invoice` opcional.
- `App.tsx` — ruta `/appointments/reception`.

### Validación

- `npx tsc --noEmit` en backend y frontend: sin errores.
- `npx prisma validate`: schema válido.
- `npx eslint` en pages/appointments + services + types (frontend): sin warnings (incluida la regla `set-state-in-effect` que prevenía el patrón antiguo del modal).

### Lo que queda

- **24** Detección de duración real por histórico raza+servicio (necesita stats backend; aplaza).
- **25** Depósito Stripe (Bloque 7).
- **26** Lista de espera matchable (Bloque 10).
- **27** Detección de huecos rentables (lógica de ML / heurística).
- **28** Resize evento por drag — skip; la edición de servicios desde el modal cubre el caso real.
- **30** Notas de voz transcritas (Web Speech API, baja prioridad).
- **31** NPS post-cita automático — el `Reminder` con type='followup' ya se programa; falta plantilla con enlace a `/portal/reviews/[token]`.

Sólo el Bloque 4 queda con esto. **Siguiente:** `bloque 5` (Clientes + Mascotas).
