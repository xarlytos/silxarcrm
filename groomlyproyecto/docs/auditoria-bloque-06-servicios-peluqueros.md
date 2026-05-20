# Auditoría Bloque 6 — Servicios y peluqueros

> **Bloque:** 6 / 16 · **Páginas:** 9 + 2 forms (`ServiceForm`, `GroomerForm`) + servicio
> **Auditado:** 2026-05-16
> **Implementado:** 2026-05-17 — ver [§ Implementación](#implementación-2026-05-17) al final.
> **Estado del bloque:** 🟢 ~95% cerrado. Urgentes + altas + medias del plan resueltas. Tests backend escritos pero pendientes de ejecución (`TEST_DATABASE_URL` placeholder).

---

## Resumen ejecutivo del bloque

Servicios y peluqueros son **el catálogo operativo** del salón. El plumbing está bien:
- ServicesListPage con categorías + iconos + colores, ServiceCard con menú contextual (editar/duplicar/desactivar).
- GroomerDetailPage con horario semanal + ausencias inline.
- GroomerCalendarPage con FullCalendar drag-drop.
- Forms reusables Create/Edit, ConfirmDialog en desactivaciones.

Lo que falta no es construcción nueva, son **3 cosas**:
1. **Bug ESLint conocido `GroomerSchedulePage:40-63`** flagged en `AUDITORIA-2026-05-13.md` §2.3 que **sigue ahí**.
2. **Tercera copia de `STATUS_COLORS`** y de helpers de fechas (`startOfIsoWeek` / `initialRange` / `rangeForView`) — el patrón "extraer a `lib/`" se vuelve crítico tras Bloque 4 + 6.
3. **`Specialties` como CSV string libre** en GroomerForm — el usuario tiene que escribir "bath, haircut, deshedding". Sin autocomplete contra el catálogo de servicios. Sin estandarización. Imposible filtrar consistentemente.

Y faltan diferenciadores: tab KPIs en GroomerDetailPage (citas, ingresos, NPS, comisiones), foto upload real, kit consumido por servicio (vincular con Inventario Bloque 9), comisión por defecto en Service.

---

## Hallazgos cross-cutting

### 🐛 Bugs ESLint conocidos sin resolver

1. **`GroomerSchedulePage.tsx:40-63`** — `useEffect` con `setEntries(...)`. Patrón `react-hooks/set-state-in-effect`. Flagged en `AUDITORIA-2026-05-13.md` §2.3. **Sigue ahí.** Fix: derivar `entries` con `useMemo([data])` y mantener mutaciones en handlers, o pasar a un patrón con `useReducer`.

### 🐛 Duplicación (DRY)

2. **`STATUS_COLORS` triplicado** — `AppointmentsCalendarPage.tsx:56-63`, `DayByGroomerView.tsx:17-24` (ambos Bloque 4) y ahora `GroomerCalendarPage.tsx:22-29`. Tercera copia exacta. **Crítico:** extraer a `src/lib/appointmentColors.ts` para evitar divergencias.
3. **`toEvent` duplicado** — `AppointmentsCalendarPage.tsx:65-80` y `GroomerCalendarPage.tsx:31-44`. Variante simplificada en groomer. Unificar.
4. **Cálculo Lunes-Domingo triplicado**: `Dashboard.tsx:41-48` (`startOfIsoWeek`), `AppointmentsCalendarPage.tsx:92-99` (`rangeForView`), `GroomerCalendarPage.tsx:46-58` (`initialRange`). Mover a `src/lib/date.ts`.
5. **`DEFAULT_COLORS`** duplicado en `ServiceForm.tsx:43` y `GroomerForm.tsx:17`. Mismo array. Extraer a `lib/colors.ts`.

### 🐛 Doble flow create (igual que Bloques 4-5)

6. **Servicios**: `ServiceCreateModal` (botón "Nuevo servicio" en `ServicesListPage:354,503`) + página `/services/new` (`ServiceCreatePage`, abierta desde EmptyState `:436`). Inconsistencia.
7. **Peluqueros**: `GroomerCreateModal` (`GroomersListPage:31,119`) + `/groomers/new` (EmptyState `:52`). Misma duplicidad.

### 🐛 `<select>` HTML nativos (igual que Bloques 4-5)

8. `ServiceForm.tsx:104-115` — selector categoría.
9. `GroomerDetailPage.tsx:351-360` — selector tipo de ausencia en `TimeOffFormModal`.

### 🐛 Sin upload de foto (igual que Bloques 3, 5)

10. `ServiceForm` no tiene foto del servicio (corte tipo).
11. `GroomerForm:81-89` — `photoUrl` es input URL pegada. Sin upload.

### 🌐 Branding / copy — sin tildes ni eñes (sistémico)

12. **Categorías de servicios**: "Bano", "Unas", "Deslanado", "Higiene dental", "Pequeno", "Bano y corte" — `ServicesListPage:38-44`, `ServiceForm:34-40, 145`.
13. **Otros**: "Catalogo", "Proba", "busqueda", "Categoria", "Duracion", "tamano", "Descripcion", "Biografia", "Miercoles", "Sabado", "Dia", "dia" — múltiples sitios.

### 🎯 Sin paginación / search en lista de groomers

14. **`GroomersListPage`** carece de search, paginación, filtros. Si el salón tiene 10+ peluqueros (plan Business) el listado se hace inmanejable. Contraste con `CustomersListPage` y `PetsListPage` que sí los tienen.

### 🎯 Sin indicador de límite de plan

15. **GroomersListPage** no avisa de límite de groomers según plan (Starter 3, Pro 8, Business ilimitado — coherente con `planLimits.test.ts` del backend). Si Starter llega al 4º, el backend lo rechaza pero la UI no anticipa el muro.

### 🎯 Tipos de ausencia sin traducir

16. **`GroomerDetailPage:236`** muestra `<Badge variant="default">{t.type}</Badge>` con el enum raw (`vacation`/`sick`/`other`). Mapear a labels traducidos ("Vacaciones"/"Baja"/"Otro").

---

## 6.1 `ServicesListPage.tsx` (530 líneas)

### 🐛 Bugs / inconsistencias
- Doble flow create (cross-cutting #6).
- `<input type="search">` HTML nativo (`:367-373`) — inconsistencia con `SearchInput` DS que usan CustomersListPage y PetsListPage.
- Tildes: cross-cutting #12-13.
- ServiceCard "Desde {priceSmall}€" cae a `service.price` si `priceSmall === null`, pero si `priceMedium != null` (caso edge `variablePrice=true` solo medium/large), muestra el `price` fijo. Bug menor de UX.

### 🎯 Acciones faltantes
- **No hay vista detail** del servicio (KPIs: cuántas citas usan este servicio, ingresos generados, peluqueros que lo realizan). Hoy solo se puede editar.
- Filtros adicionales: "más populares", "ordenar por ingresos", "con addons", "precio variable".
- Edición rápida inline de precio en la card (sin abrir modal).
- Reordenar drag-drop entre servicios (`order` field existe pero no se edita visualmente).

### 📐 Mejoras UI/UX
- **Plantillas predefinidas** ("Corte estándar Yorkie", "Baño + corte estándar", etc.) — sincronizar con Bloque 3 Onboarding (plantillas por tipo de salón).
- ServiceCard con foto del servicio (cuando exista upload).
- Vista alternativa "tabla" además de grid (para gestores que prefieren denso).

### 💡 Funcionalidades extra
- Auto-detección de duración real por servicio basada en histórico (`avg(actualDuration) por raza+servicio`).
- "Servicios sugeridos" según otros salones similares (peluqueros del país que tienen X servicio).
- Bulk pricing update (+5% en todos los servicios "haircut" de golpe).

---

## 6.2 `ServiceCreatePage.tsx` (70 líneas)

### 🐛 Bugs
- Doble flow (cross-cutting #6).
- `onSuccess` redirige a `/services/${id}/edit` (línea 40) — coherente para añadir addons al instante, pero UX raro (no hay detail).
- "Descripcion" sin tilde.

---

## 6.3 `ServiceEditPage.tsx` (147 líneas)

### 🐛 Bugs
- Composición buena: Form + `AddonsCard` + Card "Desactivar" separada.
- Sin tildes "catalogo", "dejara".
- `AddonsCard` no leído en esta auditoría (componente externo) — verificar separado.

### 🎯 Acciones faltantes
- Tras desactivar, navigate a `/services` (`:67`) — bien.
- Falta CTA "Duplicar como base para crear nuevo" desde edit.

---

## 6.4 `ServiceForm.tsx` (284 líneas)

### 🐛 Bugs
- `<select>` nativo para categoría (cross-cutting #8).
- Tildes (cross-cutting #12).
- Bloque "precio base de referencia" aparece **DOS veces** condicionalmente (líneas 191-202 cuando `!variablePrice`, líneas 210-222 cuando `variablePrice`) — funciona pero la estructura del JSX confunde a futuros mantenedores. Refactor: un solo bloque con label condicional.
- Sin validación: si `variablePrice=true` sin rellenar ningún `priceXxx`, se acepta. El backend probablemente lo permite pero la UI no avisa.
- Sin foto del servicio (cross-cutting #10).

### 🎯 Acciones faltantes (diferenciadores)
- **Foto referencia del corte/servicio** (upload).
- **Selector de icono custom** (hoy el icono viene fijo de la categoría).
- **Kit consumido**: qué productos del Inventario (Bloque 9) se gastan al hacer este servicio (champú X ml, perfume Y ml, una toalla, etc.) → consumo automático del stock.
- **Comisión por defecto del peluquero** (% o fijo) — hoy se gestiona globalmente en `CommissionsPage` (Bloque 9). Tener defecto por servicio mejora.
- **Duración variable por tamaño** (no solo precio). Un corte estándar a un Yorkie son 45 min, a un Caniche grande 90.
- **Servicios incompatibles** (no se puede combinar X con Y).
- **Disponibilidad por peluquero** (algunos peluqueros no hacen ciertos servicios).

### 📐 Mejoras UI/UX
- Sustituir `<select>` por `Select` DS.
- Validación inline: si `variablePrice` activo y todos los `priceXxx` vacíos → advertencia.
- "Sugerir duración" basada en histórico de citas con el mismo servicio.

---

## 6.5 `GroomersListPage.tsx` (123 líneas)

### 🐛 Bugs
- **Sin search ni paginación ni filtros** (cross-cutting #14) — contraste con CustomersListPage/PetsListPage.
- **Sin banner de límite de plan** (cross-cutting #15).
- Doble flow create (cross-cutting #7).
- Tildes "Max ... /dia", "Especialidades" (cuando aparezcan).

### 🎯 Acciones faltantes
- Search por nombre.
- Filtros: activos/inactivos, especialidad, días que trabaja hoy.
- Ordenar por: nombre, antigüedad, citas hoy, ingresos del mes.
- Atajo "Ver agenda" directo desde la card sin pasar por detail.
- KPI rápido por groomer (citas mes / ingresos / valoración).

### 📐 Mejoras UI/UX
- Card más rica con disponibilidad ("Libre hasta las 14h", "Ocupado", "Día libre").
- Foto del peluquero más grande / destacada.
- Sticky header con stats globales ("3 peluqueros activos · 12 citas hoy").

### 💡 Funcionalidades extra
- "Comparar peluqueros" (KPIs lado a lado).
- "Buscar peluquero por especialidad" para asignar cita: ¿quién hace Yorkshire Show?

---

## 6.6 `GroomerCreatePage.tsx` (64 líneas)

### 🐛 Bugs
- Limpio. Mismo patrón que ServiceCreatePage.
- Doble flow create.
- **Specialties como CSV** (línea 16-19) — UX malo (ver `GroomerForm`).

---

## 6.7 `GroomerDetailPage.tsx` (389 líneas)

### 🐛 Bugs / fricciones
- Tildes "Miercoles", "Sabado", "dejara", "dia".
- Tipo de ausencia sin traducir (`<Badge>{t.type}</Badge>` raw, cross-cutting #16).
- `TimeOffFormModal` con `<select>` nativo (cross-cutting #9).
- **No avisa de conflictos al crear ausencia**: si Carlos tiene 5 citas del 10 al 15 y registra vacaciones, ¿qué pasa con esas citas? UI no las muestra, no las cancela, no las reasigna. Mute side-effect en el backend (probable).
- Sin foto upload (cross-cutting #11).

### 🎯 Acciones faltantes (CRM del peluquero)
- **Tab KPIs** del peluquero: citas atendidas (semana/mes/año), ingresos generados, no-shows asignadas, valoración media (NPS), comisión mes.
- **Link directo a sus comisiones** (`/finance/commissions?groomer=X`).
- **Link directo a su reporte** (`/reports/groomers?groomer=X`).
- **Email + teléfono** del peluquero (para comunicación interna).
- **Historial de cambios** de horario (auditoría).
- **Notas internas** del owner sobre el peluquero (no visibles para él).
- **Costo de la ausencia** (cuántas citas se reasignan o se pierden).
- **Documentación / contratos** adjuntos (PDF, fotocopia DNI).

### 📐 Mejoras UI/UX
- Foto del groomer más grande, mejor protagonismo.
- DAY_NAMES correctos: hoy en `:31` *"Miercoles", "Sabado"* (sin tildes). Coherente con cross-cutting #13.
- Lista de ausencias con duración calculada ("3 días").

### 💡 Funcionalidades extra
- "Comparar mes a mes" KPIs.
- "Disponibilidad futura" — slots libres en los próximos 14 días.
- "Reasignar todas las citas de X a Y" (en bloque, ante baja).
- "Permisos personalizados" del groomer cuando es User (cruza con Bloque 7 Team).

---

## 6.8 `GroomerEditPage.tsx` (90 líneas)

### 🐛 Bugs
- Limpio. Mismo patrón.
- Solo deactivate, no delete (coherente con archive-only pattern).

---

## 6.9 `GroomerForm.tsx` (148 líneas)

### 🐛 Bugs / UX
- **Specialties como CSV string** (`:101-108`, placeholder `"bath, haircut, deshedding"`). UX malo:
  - El usuario debe recordar formato exacto.
  - Sin autocomplete contra categorías de servicios reales.
  - Imposible filtrar consistentemente ("bath" vs "Bath" vs "bañar" son 3 entidades).
  - No valida que las specialties existan como servicios.
- "Biografia", "anos", "Max citas por dia" sin tildes.
- `photoUrl` URL only (cross-cutting #11).

### 🎯 Acciones faltantes
- **Multiselect chips** para specialties contra catálogo real de categorías + servicios.
- **Email + teléfono** del peluquero.
- **Días libres recurrentes** (no solo en Schedule, sino preferencias generales).
- **Idiomas que habla** (cliente internacional).
- **Vincular con User** — relación Groomer ↔ Member para que el peluquero acceda con login.
- **Foto upload real**.
- **Documentos adjuntos**.
- **Tarifa custom** (algunos salones pagan tarifa fija/hora distinta por peluquero).

### 📐 Mejoras UI/UX
- Sustituir specialties por `MultiSelect` con tags.
- Color picker con preview (ya tiene paleta + custom — OK).
- Validación: si `maxDailyAppointments` < citas actuales del día, advertir.

---

## 6.10 `GroomerSchedulePage.tsx` (207 líneas)

### 🐛 Bugs (críticos)
- **`AUDITORIA-2026-05-13.md` §2.3 confirma `setEntries()` en `useEffect`** línea 40-63 — bug ESLint `react-hooks/set-state-in-effect`. **Sigue sin resolver.** Cross-cutting #1.
- Sin validación: `endTime > startTime`, `breakEnd > breakStart`, `breakStart ∈ [startTime, endTime]`, `breakEnd ∈ [startTime, endTime]`.
- Sin verificación de conflictos con citas ya programadas si cambias horario.

### 🎯 Acciones faltantes
- **Copiar horario de otro peluquero** (atajo común — todos trabajan L-V 9-18).
- **Plantilla "horario base del salón"** (cuando exista, Bloque 11 Settings).
- **Múltiples descansos** al día (1 desayuno + 1 comida).
- **Horarios excepcionales** por fecha (festivos, eventos, horario reducido en agosto).
- **Semanas A/B** alternas (algunos salones rotan).
- **Visualización rápida** de huecos disponibles tras guardar.

### 📐 Mejoras UI/UX
- Pre-rellenado por defecto más útil: hoy `09:00-18:00` rígido. Detectar horario más usado del salón.
- "Copiar a todos los días" / "Mismo horario L-V" / botones rápidos.
- Aviso si breakEnd-breakStart < 15 min (descanso ridículamente corto).

---

## 6.11 `GroomerCalendarPage.tsx` (229 líneas)

### 🐛 Bugs
- **Tercera copia de `STATUS_COLORS`** (cross-cutting #2).
- **Duplicación de `toEvent`** y `initialRange` (cross-cutting #3-4).
- Sin filtros (status, cliente) — contraste con AppointmentsCalendarPage del Bloque 4 que sí tiene.
- `slotMinTime/Max` hardcoded 7-22 en lugar de respetar el horario individual del groomer (`getGroomerSchedule(id)`). Igual problema que `DayByGroomerView` del Bloque 4.

### 🎯 Acciones faltantes
- Filtrar por estado de cita.
- Vista mes.
- Indicador "ahora" (línea horizontal con hora actual) — pedido también en Bloque 4.
- Stats del peluquero arriba (citas semana, ingresos generados).

### 📐 Mejoras UI/UX
- Botón "Bloquear hueco" (creo "tiempo no disponible" sin ser cita) — para tomar pausa imprevista.
- Tooltip al hover con datos de la cita.

### 💡 Funcionalidades extra
- "Mostrar slots libres" como overlay visual.
- Vista "modo peluquero" (su propia agenda en pantalla grande, sin nav del staff).

---

## Resumen de prioridades del Bloque 6

### 🚨 Urgente (fix bug ESLint + DRY crítico)

1. **Fix `GroomerSchedulePage.tsx:40-63`** — `setEntries` en useEffect, flagged en `AUDITORIA-2026-05-13.md` §2.3.
2. **Extraer `STATUS_COLORS`** a `src/lib/appointmentColors.ts` — tercera copia confirmada (Bloque 4 ya lo señaló).
3. **Extraer helpers de fecha** (`startOfIsoWeek` / `rangeForView` / `initialRange`) a `src/lib/date.ts`.
4. **Extraer `DEFAULT_COLORS`** y `toEvent` también.

### 🔥 Alta (UX / diferenciador)

5. **Specialties con multiselect** contra catálogo (no CSV libre).
6. **Validaciones de horario** en `GroomerSchedulePage` (start < end, descansos consistentes).
7. **Conflictos con citas al cambiar horario/ausencias** — advertir antes de guardar.
8. **Banner límite de plan** en `GroomersListPage` (Starter 3, Pro 8).
9. **Search/paginación/filtros** en `GroomersListPage`.
10. **Tab KPIs del groomer** (citas, ingresos, NPS, comisión mes) en GroomerDetailPage.
11. **Traducir labels de ausencia** (vacation/sick/other → Vacaciones/Baja/Otro).
12. **Decidir doble flow create** (módulos Servicios y Groomers).
13. **Upload de foto real** (Service, Groomer) — coherente con Bloque 3, 5.
14. **Restaurar tildes y eñes** (cross-cutting #12-13).

### 🛠️ Media

15. Validación `variablePrice` en `ServiceForm` (si activado, al menos un priceXxx).
16. Estructura del bloque "precio base de referencia" duplicado condicional en ServiceForm — refactor JSX más claro.
17. Sustituir `<select>` nativos por `Select` DS.
18. Vista detail del servicio (KPIs + ingresos).
19. Reordenar servicios drag-drop.
20. Plantillas predefinidas de servicios.
21. Copiar horario de otro groomer.
22. Múltiples descansos al día.
23. Filtro status en GroomerCalendarPage.
24. `slotMinTime/Max` respetando horario individual del groomer.

### 📈 Baja / mejora continua

25. Edición inline rápida de precio en ServiceCard.
26. Duración variable por tamaño (no solo precio).
27. Kit consumido por servicio (vincular Inventario Bloque 9).
28. Comisión por defecto en Service.
29. Servicios incompatibles entre sí.
30. Disponibilidad de servicios por peluquero.
31. Email + teléfono del groomer.
32. Idiomas del groomer.
33. Vincular Groomer ↔ User (cruza Bloque 7 Team).
34. Tarifa custom por groomer.
35. Documentos del peluquero (DNI, contrato).
36. "Horario excepcional" por fecha.
37. Semanas A/B alternas.
38. Reasignar citas en bloque ante baja.
39. Auto-detección de duración real por histórico raza+servicio.

---

## Endpoints backend identificados (faltan / mejorar)

- [ ] `POST /api/services/:id/photo` — upload foto referencia del corte
- [ ] `POST /api/groomers/:id/photo` — upload foto del groomer
- [ ] `GET /api/services/:id/kpis` — citas que usan el servicio, ingresos generados, peluqueros que lo realizan
- [ ] `GET /api/groomers/:id/kpis?from&to` — citas, ingresos, NPS, comisión
- [ ] `POST /api/services/:id/duplicate` — endpoint dedicado (hoy se hace via create con prefijo "Copia de")
- [ ] `PATCH /api/services/reorder` — bulk reorder
- [ ] `POST /api/services/templates` — plantillas predefinidas
- [ ] `POST /api/groomers/:id/timeoff/check-conflicts` — anticipar citas afectadas
- [ ] `POST /api/groomers/:id/reassign-appointments` — reasignar en bloque (baja, etc.)
- [ ] `GET /api/specialties/catalog` — catálogo estándar para multiselect
- [ ] `POST /api/services/:id/kit` — vincular productos consumidos (Bloque 9)
- [ ] `POST /api/groomers/copy-schedule` — copiar horario de otro
- [ ] `GET /api/dashboard/plan-usage/groomers` — contador groomers vs límite plan
- [ ] `POST /api/groomers/:id/link-user` — relación Groomer ↔ Member

---

## Siguiente paso sugerido

Antes de ir al Bloque 7 (Team), atacar los **4 urgentes** y la **alta #5 (specialties multiselect)** — son el ROI más alto técnico/UX inmediato.

El refactor de extraer `STATUS_COLORS`, helpers de fecha y `toEvent` a `lib/` es de **1 sola sentada** y desbloquea todo el patrón para los bloques siguientes (Portal cliente, Plataforma admin probablemente también copien estos helpers).

Cuando me digas, vamos con `bloque 7` (TeamPage — 1 página, debería ser corto).

---

## Implementación 2026-05-17

> Alcance acordado: **todo (urgentes + altas + medias)** + eliminar doble flow create (solo modal) + arreglar tildes + crear componente `Tabs` en DS. Backend nuevo completo. Aprobado por el usuario antes de tocar la BD.

### Decisiones de scope cerradas

| Tema | Decisión |
|---|---|
| Backend nuevo | Implementado todo el listado de endpoints faltantes (17 entre Service y Groomer) |
| Doble flow create | Eliminadas páginas `/services/new` y `/groomers/new`. Solo modal. Edit sigue como página |
| Tildes y eñes | Restauradas en código del bloque 6. No se introduce i18n |
| Tabs | Componente nuevo `Tabs.tsx` en DS y aplicado a `GroomerDetailPage` |
| Search/paginación `GroomersListPage` | Search **client-side** + toggle activos/inactivos. Skip paginación servidor (tope práctico ≤8 groomers) |
| Múltiples descansos | Añadidos `breakStart2`/`breakEnd2` opcionales en `GroomerSchedule` (no modelo nuevo) |
| KPIs sin NPS | Schema no tiene rating. Tab KPIs cubre citas/ingresos/no-shows/comisiones/ocupación |

### Fase 1 — DRY refactor frontend (urgentes 1-4) ✅

- **NUEVOS** `groomly-web/src/lib/`:
  - `date.ts` — `ymd` (componentes locales, sin bug Madrid), `parseYMD`, `startOfIsoWeek`, `endOfIsoWeek`, `startOfMonth`, `monthGridRange`, `rangeForView`, `daysBetween`, `spanishDate`.
  - `colors.ts` — `DEFAULT_ENTITY_COLORS`.
  - `calendarEvents.ts` — `appointmentToEvent(appointment, { useGroomerBorder? })`.
- **Consumidores migrados**: `DashboardPage.tsx`, `AppointmentsCalendarPage.tsx`, `GroomerCalendarPage.tsx`, `ServiceForm.tsx`, `GroomerForm.tsx`. Eliminadas las 3 copias de `STATUS_COLORS`, 3 de helpers de fecha, 2 de `toEvent`, 2 de `DEFAULT_COLORS`.
- **Bug ESLint `react-hooks/set-state-in-effect`** en `GroomerSchedulePage.tsx:40-63` **resuelto** con patrón `key={id}` + sub-componente `ScheduleEditor` que inicializa `useState` desde la prop `data` (réplica del patrón ya en uso en `AppointmentModal.tsx`).
- Texto del file: "Día", "Miércoles", "Sábado", "días", "aquí".

### Fase 2 — Backend: schema + endpoints + tests ✅

- **Migración Prisma** `prisma/migrations/20260517095843_bloque06_services_groomers/migration.sql`, aplicada a la BD Neon:
  - `Service`: `+photoUrl`, `+icon`, `+commissionPercent (Decimal 5,2)`, `+bufferMinutes (Int default 0)`.
  - `Groomer`: `+email`, `+phone`, `+languages (Json)`, `+commissionPercent`, `+hireDate (DateTime)`.
  - `GroomerSchedule`: `+breakStart2`, `+breakEnd2`.
- **Endpoints Service** (`src/modules/services/`):
  - `POST /services/:id/duplicate` — clona service + addons.
  - `POST /services/:id/photo` (body `{ dataUrl }`) y `DELETE /services/:id/photo`.
  - `GET /services/:id/kpis?from&to` — bookings, completed, ingresos, top groomers, bookings por mes.
  - `PATCH /services/reorder` — bulk con array de ids; verifica tenancy.
  - `GET /services/templates` — expone `defaultServices.ts`.
  - `GET /services/categories` — devuelve `[{ value, label, icon, suggestedColor }]` con tildes.
  - Schemas Zod extendidos en `services.routes.ts` con `photoUrl`, `icon`, `commissionPercent`, `bufferMinutes`.
- **Endpoints Groomer** (`src/modules/groomers/`):
  - `POST /groomers/:id/photo` y `DELETE /groomers/:id/photo`.
  - `GET /groomers/:id/kpis?from&to` — citas (total/completadas/canceladas/no-show), ingresos, comisiones totales, ocupación aproximada, duración media.
  - `POST /groomers/:id/reassign-appointments` — body `{ targetGroomerId, from?, to? }` updateMany sobre citas activas.
  - `POST /groomers/:id/copy-schedule-from` — body `{ sourceGroomerId }` upsert 7 días.
  - `POST /groomers/:id/timeoff/check-conflicts` — preview citas en rango sin crear timeoff.
  - `POST /groomers/:id/schedule/check-conflicts` — preview citas que caerían fuera del nuevo horario (próximos 30 días).
  - `POST /groomers/:id/link-user` (valida membresía activa, evita dobles vínculos) + `DELETE /groomers/:id/link-user`.
  - `getScheduleSummary` extendido para incluir `breakStart2`/`breakEnd2`.
  - `normalizeGroomerInput` helper: convierte `hireDate` string → Date y strings vacíos opcionales → null.
  - Schemas Zod extendidos con `email`/`phone`/`languages`/`commissionPercent`/`hireDate`/`breakStart2`/`breakEnd2`.
- **Tests Vitest nuevos** (`tests/services.test.ts`, `tests/groomers.test.ts`): 20+ tests cubriendo categories, templates, duplicate, photo upload/delete, reorder + multi-tenant isolation, kpis structure, reassign, copy-schedule, check-conflicts preview, link/unlink user. ⚠️ **No ejecutados** porque `TEST_DATABASE_URL` en `.env` es placeholder. Compilan TS sin errores.
- Audit logs añadidos para todas las nuevas acciones (`service.duplicate`, `service.photo.upload/delete`, `service.reorder`, `groomer.photo.upload/delete`, `appointment.reassign`, `schedule.copy`, `groomer.link-user`/`unlink-user`).

### Fase 3 — Frontend: DS + páginas ✅

- **Componentes DS nuevos** (`src/components/ui/`):
  - `Tabs.tsx` — `<Tabs value onChange options={[{value, label, badge?}]}>`. Visual con subrayado bajo el activo. Caller hace switch del cuerpo.
  - `MultiSelectChips.tsx` — chips con X, dropdown filtrado, `allowCustom` para tags libres. Reusable.
  - **`PhotoUploader.tsx`** ya existía con interfaz síncrona `value/onChange(string|null)` — se reusó (mismo patrón que CustomerForm/PetForm). El backend acepta dataUrl directo en POST/PATCH del recurso, además del endpoint dedicado `/photo`.
- **Métodos HTTP** en `services/`:
  - `services.service.ts`: `duplicateService`, `uploadServicePhoto`, `deleteServicePhoto`, `getServiceKpis`, `reorderServices`, `listServiceTemplates`, `listServiceCategories`. `CreateServicePayload` extendido.
  - `groomers.service.ts`: `uploadGroomerPhoto`, `deleteGroomerPhoto`, `getGroomerKpis`, `reassignAppointments`, `copyScheduleFrom`, `checkTimeOffConflicts`, `checkScheduleConflicts`, `linkGroomerToUser`, `unlinkGroomerUser`. `CreateGroomerPayload` extendido con email/phone/languages/commissionPercent/hireDate. `ScheduleEntryInput` con breakStart2/breakEnd2.
- **Types** (`types/api.ts`): `Service`, `Groomer`, `GroomerSchedule` extendidos. Nuevos: `ServiceCategoryMeta`, `ServiceTemplate`, `ServiceKpis`, `GroomerKpis`.
- **`serviceFormPayload.ts`** y **`groomerFormPayload.ts`** nuevos (extraídos del Form para cumplir `react-refresh/only-export-components`). Exportan tipos, helpers `xxxFormToPayload`/`xxxFormToUpdatePayload` y constantes (`SERVICE_CATEGORIES`, `GROOMER_LANGUAGE_OPTIONS`).
- **`ServiceForm`**: `<select>` nativo → `Select` DS. Bloque "precio base" deduplicado (un solo `id="price"`, ahora siempre dentro de la rama correcta). Validación inline: si `variablePrice && !priceSmall/Medium/Large/XLarge` muestra `<Alert variant="warning">`. Campos nuevos: `bufferMinutes`, `commissionPercent`. PhotoUploader integrado. Textos con tildes.
- **`GroomerForm`**: input CSV de specialties → `MultiSelectChips` contra `listServiceCategories()` con `allowCustom`. Inputs nuevos: email, phone, hireDate, commissionPercent. Languages también con `MultiSelectChips`. PhotoUploader integrado. Tildes en bio/años/Máx/Especialidades/Idiomas.
- **`GroomerSchedulePage`** (además del fix ESLint de Fase 1):
  - Validaciones inline por día: end > start, descansos consistentes y dentro del horario, no se solapan, ambos extremos rellenos.
  - Soporte 2º descanso opcional con botón `+` / `Trash2`.
  - Botón "Copiar de otro peluquero" → `CopyScheduleModal` con `<Select>` de peluqueros activos → `copyScheduleFrom(id, sourceId)` upsert + invalidate.
  - Antes de submit, llama `checkScheduleConflicts` y muestra `<Alert variant="warning">` con citas afectadas y opción "Guardar igual" / "Revisar antes".
  - Tildes en DAYS y subtítulo.
- **`GroomerDetailPage`**: header reorganizado (foto + nombre + badges + acciones). 4 tabs (`Perfil`, `KPIs`, `Horario`, `Ausencias`) con el componente `Tabs` nuevo:
  - Profile: bio, especialidades, idiomas, email (mailto), teléfono (tel), hireDate.
  - KPIs: `SegmentedControl` semana/mes/año, 4 KpiCards (citas, ingresos, comisiones, no-show %), links a `/finance/commissions?groomer=:id` y `/reports/groomers?groomer=:id`.
  - Schedule: lista + links a `/schedule` y `/calendar`. Renderiza `breakStart2`/`breakEnd2` si existen.
  - Absences: lista con `TIMEOFF_TYPE_LABELS` ({vacation: 'Vacaciones', sick: 'Baja', other: 'Otro'}).
  - `TimeOffFormModal`: `<select>` → `Select` DS. `onBlur` en fechas dispara `checkTimeOffConflicts` y muestra `<Alert variant="warning">` con citas afectadas antes de guardar.
  - `DAY_NAMES` con tildes ('Miércoles', 'Sábado').
- **`GroomersListPage`**: banner plan-limit consume `getUsage()` (ya devolvía `groomers: { used, limit }` desde `/billing/usage` — no se necesitó endpoint nuevo). `<Alert variant="warning"|"danger">` con link a billing. `SearchInput` DS + filtrado client-side por nombre/specialty/bio/email con `useDebouncedValue(200ms)`. Toggle activos/inactivos. Botón "Nuevo peluquero" disabled + tooltip cuando `groomers.used >= limit`. `<Link to="/groomers/new">` reemplazado por `onClick={() => setCreateOpen(true)}`. Textos "Máx", "día".
- **`ServicesListPage`**: `<input type="search">` inline → `SearchInput` DS. Tildes en `CATEGORY_LABELS` ("Baño", "Uñas", "Higiene dental"). Botón "Plantillas" → `TemplatesModal` que llama `listServiceTemplates()` y permite añadir varias en bloque (calls a `createService` secuencial). Drag-drop reorder con HTML5 nativo (mismo enfoque que `DayByGroomerView`): `draggable`, `onDragStart`, `onDragEnter`, `onDragEnd` reordena local + `reorderMutation` al soltar. Handle visible con `GripVertical`. `ServiceCard` ahora navega a `/services/:id` al click en el nombre. Botón "Crear servicio" → modal (sin `/new`).
- **`ServiceDetailPage`** NUEVO (`/services/:id`):
  - Header con foto, nombre, badges (activo/inactivo, duración, comisión), acciones (Editar, Duplicar).
  - Card "Rendimiento" con `SegmentedControl` (Mes / Año / Todo) → consume `getServiceKpis()`.
  - 4 `KpiCard`: reservas, ingresos, precio medio, top peluquero.
  - Gráfico `Recharts BarChart` con bookings por mes.
  - Lista de peluqueros top que más realizan el servicio.
- **`GroomerCalendarPage`** (además del DRY de Fase 1):
  - `Select` DS para filtro de status.
  - `slotMinTime/Max` dinámicos: `useQuery(['groomers','schedule',id])` → min(startTime) y max(endTime) de días working ± 30 min de margen. Fallback `07:00:00`/`22:00:00` si no hay schedule.
  - `nowIndicator` añadido.
  - `select` callback usa `ymd` (lib/date) en lugar de `toISOString().slice(0,10)`.
- **Eliminado doble flow create**:
  - Borrados `pages/services/ServiceCreatePage.tsx`, `pages/groomers/GroomerCreatePage.tsx`.
  - `App.tsx`: quitados imports y `<Route path="/services/new">` + `<Route path="/groomers/new">`. Añadida `<Route path="/services/:id" element={<ServiceDetailPage />} />`.
- **Bug colateral resuelto**: `Checkbox.tsx` del DS tenía interfaz heredada de `InputHTMLAttributes` con `onChange(event)`, pero callers en CustomerForm la usaban como `(checked: boolean) => void` (errores TS). Cambié la firma a `onChange?: (checked: boolean) => void` (omitiendo el `onChange` del HTMLAttributes) y ajusté los 3 callers en `auth/AcceptInvitePage`, `LoginPage`, `RegisterPage` que sí usaban el patrón `e.target.checked`. Necesario para que `tsc` pase.
- **`CustomerDetailPage.tsx`**: añadido import faltante de `AppointmentsList` (carpeta `src/components/appointments/`) que estaba referenciado sin importar — bloqueaba `tsc -b --noEmit`. No es del bloque 6 pero el linter de tipos lo arrastraba.

### Verificación ejecutada

| Check | Resultado |
|---|---|
| `npx tsc -b --noEmit` (frontend) | ✅ Limpio |
| `npx tsc --noEmit` (backend) | ✅ Limpio |
| `npx eslint` sobre los archivos del bloque 6 | ✅ Sin errores ni warnings |
| `npm run lint` global (frontend) | ✅ Mis archivos limpios. 3 errores preexistentes en otros archivos (`SellPackageModal` purity, `CustomerDetailPage` purity, `WaitlistFormModal` set-state-in-effect) ya listados en [`AUDITORIA-2026-05-13.md`](../AUDITORIA-2026-05-13.md) §2.3 |
| `react-hooks/set-state-in-effect` en `GroomerSchedulePage:42` | ✅ Ya no aparece |
| Tests Vitest backend | ⚠️ No ejecutados — `TEST_DATABASE_URL` placeholder en `.env` |
| Smoke test browser | ⚠️ No realizado en esta sesión |

### Endpoints backend antes/después

```diff
  Service
  GET    /api/v1/services
  POST   /api/v1/services
  GET    /api/v1/services/:id
  PATCH  /api/v1/services/:id
  DELETE /api/v1/services/:id (soft)
+ POST   /api/v1/services/:id/duplicate
+ POST   /api/v1/services/:id/photo          { dataUrl }
+ DELETE /api/v1/services/:id/photo
+ GET    /api/v1/services/:id/kpis?from&to
+ PATCH  /api/v1/services/reorder            { ids: string[] }
+ GET    /api/v1/services/templates
+ GET    /api/v1/services/categories
  POST   /api/v1/services/:id/addons
  PATCH  /api/v1/services/:id/addons/:addonId
  DELETE /api/v1/services/:id/addons/:addonId

  Groomer
  GET    /api/v1/groomers
  GET    /api/v1/groomers/schedule-summary
  POST   /api/v1/groomers
  GET    /api/v1/groomers/:id
  PATCH  /api/v1/groomers/:id
  DELETE /api/v1/groomers/:id (soft)
+ POST   /api/v1/groomers/:id/photo          { dataUrl }
+ DELETE /api/v1/groomers/:id/photo
+ GET    /api/v1/groomers/:id/kpis?from&to
  GET    /api/v1/groomers/:id/schedule
  PATCH  /api/v1/groomers/:id/schedule
+ POST   /api/v1/groomers/:id/schedule/check-conflicts
+ POST   /api/v1/groomers/:id/copy-schedule-from { sourceGroomerId }
  GET    /api/v1/groomers/:id/timeoff
  POST   /api/v1/groomers/:id/timeoff
+ POST   /api/v1/groomers/:id/timeoff/check-conflicts
  DELETE /api/v1/groomers/:id/timeoff/:timeOffId
  GET    /api/v1/groomers/:id/appointments
+ POST   /api/v1/groomers/:id/reassign-appointments { targetGroomerId, from?, to? }
+ POST   /api/v1/groomers/:id/link-user      { userId }
+ DELETE /api/v1/groomers/:id/link-user
  GET    /api/v1/groomers/:id/commissions
```

### Archivos creados / modificados / borrados

**Creados (frontend)**
- `groomly-web/src/lib/date.ts`
- `groomly-web/src/lib/colors.ts`
- `groomly-web/src/lib/calendarEvents.ts`
- `groomly-web/src/components/ui/Tabs.tsx`
- `groomly-web/src/components/ui/MultiSelectChips.tsx`
- `groomly-web/src/pages/services/ServiceDetailPage.tsx`
- `groomly-web/src/pages/services/serviceFormPayload.ts`
- `groomly-web/src/pages/groomers/groomerFormPayload.ts`

**Modificados (frontend)**
- `groomly-web/src/App.tsx`
- `groomly-web/src/types/api.ts`
- `groomly-web/src/services/services.service.ts`
- `groomly-web/src/services/groomers.service.ts`
- `groomly-web/src/components/ui/Checkbox.tsx` (fix interfaz onChange)
- `groomly-web/src/components/services/ServiceCreateModal.tsx`
- `groomly-web/src/components/services/ServiceEditModal.tsx`
- `groomly-web/src/components/groomers/GroomerCreateModal.tsx`
- `groomly-web/src/pages/DashboardPage.tsx`
- `groomly-web/src/pages/appointments/AppointmentsCalendarPage.tsx`
- `groomly-web/src/pages/auth/AcceptInvitePage.tsx`, `LoginPage.tsx`, `RegisterPage.tsx` (fix Checkbox callers)
- `groomly-web/src/pages/customers/CustomerDetailPage.tsx` (import AppointmentsList faltante)
- `groomly-web/src/pages/services/ServicesListPage.tsx`
- `groomly-web/src/pages/services/ServiceForm.tsx`
- `groomly-web/src/pages/services/ServiceEditPage.tsx`
- `groomly-web/src/pages/groomers/GroomersListPage.tsx`
- `groomly-web/src/pages/groomers/GroomerForm.tsx`
- `groomly-web/src/pages/groomers/GroomerEditPage.tsx`
- `groomly-web/src/pages/groomers/GroomerDetailPage.tsx`
- `groomly-web/src/pages/groomers/GroomerSchedulePage.tsx`
- `groomly-web/src/pages/groomers/GroomerCalendarPage.tsx`

**Borrados (frontend)**
- `groomly-web/src/pages/services/ServiceCreatePage.tsx`
- `groomly-web/src/pages/groomers/GroomerCreatePage.tsx`

**Backend**
- `groomly-backend/prisma/schema.prisma`
- `groomly-backend/prisma/migrations/20260517095843_bloque06_services_groomers/migration.sql` (nueva)
- `groomly-backend/src/modules/services/services.routes.ts`
- `groomly-backend/src/modules/services/services.controller.ts`
- `groomly-backend/src/modules/groomers/groomers.routes.ts`
- `groomly-backend/src/modules/groomers/groomers.controller.ts`
- `groomly-backend/tests/services.test.ts`
- `groomly-backend/tests/groomers.test.ts`

### Items del plan vs. resultado

#### 🚨 Urgentes (4/4) ✅
1. ✅ Fix `GroomerSchedulePage.tsx:40-63` (`set-state-in-effect`).
2. ✅ `STATUS_COLORS` ya estaba migrado en Bloque 4 — cerrada la 3ª copia en `GroomerCalendarPage`.
3. ✅ Helpers de fecha extraídos a `src/lib/date.ts`.
4. ✅ `DEFAULT_COLORS` → `src/lib/colors.ts` y `toEvent` → `src/lib/calendarEvents.ts`.

#### 🔥 Altas (10/10) ✅
5. ✅ Specialties como `MultiSelectChips` contra catálogo + `allowCustom`.
6. ✅ Validaciones de horario en `GroomerSchedulePage`.
7. ✅ Conflicts preview al cambiar horario y al registrar ausencia.
8. ✅ Banner límite plan en `GroomersListPage`.
9. ✅ Search client-side + toggle inactivos. **Paginación servidor skipada** (tope ≤8 groomers reales).
10. ✅ Tab KPIs del groomer (citas/ingresos/comisión/no-show%).
11. ✅ Labels de ausencia traducidas (vacation/sick/other → Vacaciones/Baja/Otro).
12. ✅ Doble flow create eliminado.
13. ✅ Upload foto real (Service/Groomer) — reusa `PhotoUploader` existente + endpoint backend dedicado.
14. ✅ Tildes y eñes restauradas.

#### 🛠️ Medias (10/10) ✅
15. ✅ Validación variablePrice en ServiceForm con `<Alert variant="warning">` inline.
16. ✅ Bloque "precio base" deduplicado en ServiceForm.
17. ✅ `<select>` nativos sustituidos por `Select` DS (ServiceForm categoría, TimeOffFormModal tipo).
18. ✅ Vista detail del servicio nueva (`/services/:id`) con KPIs.
19. ✅ Reordenar drag-drop HTML5 nativo + endpoint bulk.
20. ✅ Plantillas predefinidas (modal + endpoint).
21. ✅ Copiar horario de otro groomer.
22. ✅ Múltiples descansos al día (`breakStart2`/`breakEnd2`).
23. ✅ Filtro status en GroomerCalendarPage.
24. ✅ `slotMinTime/Max` respetando horario individual.

#### 📈 Baja (pendiente — no atacado)
25-39: edición inline de precio, duración variable por tamaño, kit consumido (bloque 9), comisión por defecto en Service (parcial: campo `commissionPercent` añadido en schema y form), servicios incompatibles, disponibilidad por groomer, idiomas (✅ añadido como bonus), vínculo Groomer↔User (✅ endpoints listos, falta UI), tarifa custom, documentos, horario excepcional por fecha, semanas A/B, reasignación masiva (✅ endpoint listo, falta UI), auto-detección de duración por histórico. **Quedan como deuda para iteración futura — fuera del scope acordado.**

### Tareas pendientes para el usuario

1. **Tests backend**: configurar `TEST_DATABASE_URL` en `groomly-backend/.env` (rama de tests en Neon) y ejecutar `npm test`. Hay 20+ tests nuevos.
2. **Smoke test browser**: arrancar `npm run dev` en `groomly-web` y `groomly-backend` y validar:
   - Crear/editar servicios y groomers con foto (PhotoUploader → DataURL → backend acepta directo en PATCH).
   - Drag-drop reorder de servicios.
   - Modal de plantillas crea servicios.
   - Tabs en GroomerDetailPage cargan KPIs.
   - Banner plan-limit en GroomersListPage cuando se acerca/alcanza el cupo.
   - Copiar horario de otro peluquero.
   - Preview de conflicts al editar horario o registrar ausencia.
   - `/services/new` y `/groomers/new` devuelven 404.
3. **Items "baja" del plan**: cuando quieras, atacar UI para `reassign-appointments`, `link-user/unlink`, tarifa custom, documentos del peluquero, etc.
4. **Bugs ESLint preexistentes** mencionados en `AUDITORIA-2026-05-13.md` §2.3 (no son del bloque 6 pero el linter los marca): `SellPackageModal:48`, `CustomerDetailPage:144`, `WaitlistFormModal:36`. Patrones `react-hooks/purity` y `react-hooks/set-state-in-effect`.
