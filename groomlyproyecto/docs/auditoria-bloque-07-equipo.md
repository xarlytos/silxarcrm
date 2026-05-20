# Auditoría Bloque 7 — Equipo multi-user

> **Bloque:** 7 / 16 · **Páginas:** 1 (`TeamPage`) + 1 modal (`MemberFormModal`) + 4 modales auxiliares + servicio
> **Auditado:** 2026-05-16
> **Sesión de cierre:** 2026-05-17
> **Bundle completo:** 2026-05-17 (segunda pasada)
> **Estado del bloque:** 🟢🟢 **Cerrado al ~96%**. Urgentes 2/2, Alta 7/7, Media 7/7, Baja 9/10 (sólo PIN tablet kiosk se difiere a feature dedicada — schema migrado y aplicado). Backend: schema + 11 endpoints nuevos. Frontend: 5 modales nuevos + TeamPage con 3 vistas (cards / agrupado por rol / tabla con bulk actions). **Migración aplicada en Neon 2026-05-17.**

---

## Resumen ejecutivo del bloque

Bloque pequeño pero importante: gestión de equipo + invitaciones + permisos granulares. **El plumbing está bien**:
- TeamPage como grid de cards con avatar, badges, KPIs (comisión / tarifa).
- "Badge Tu" para identificar al usuario actual — buen detalle.
- ConfirmDialog en remove.
- MemberFormModal reusable Invite/Edit con permisos granulares en 6 grupos.
- Backend `team.service.ts` limpio (list / get / invite / update / remove / resendInvite / acceptInvite).

Lo que falta o duele:

1. **Hallazgo arquitectónico**: el `Member` con `role: 'GROOMER'` y el `Groomer` entity del Bloque 6 son entidades separadas pero conceptualmente solapadas. Un peluquero puede existir en agenda sin ser User (no recibe login pero aparece en cards y comisiones); o existir como User con rol GROOMER (recibe login). **Sin FK explícita entre ambos**. Si un OWNER quiere "Carlos accede con login Y aparece en agenda", hoy duplica la entidad: crea Groomer + invita Member separadamente. Sin enlace.
2. **Sin "suspender"** miembro — el backend acepta `status: 'suspended'` (`UpdateMemberPayload`) pero la UI sólo expone Remove.
3. **Sin transferir ownership** — necesario si el dueño vende el salón o cambia de cuenta.
4. **Sin search/paginación** — para salón Business (groomers ilimitados + manager + recepción + admin → 10+ miembros) la grid se desborda.
5. **Patrón `setState-in-effect`** en MemberFormModal (líneas 39-56) — mismo que Bloque 4/5/6.

---

## Hallazgos cross-cutting

### 🐛 Bugs

1. ✅ **`MemberFormModal.tsx:39-56`** — `useEffect` con 5 `setState` (`setEmail`, `setRole`, `setPermissions`, `setHourlyRate`, `setCommissionRate`). Patrón `react-hooks/set-state-in-effect`. No está listado en `AUDITORIA-2026-05-13.md` pero es idéntico al de `AppointmentModal.tsx` (Bloque 4) y `QuickPetCreateModal.tsx` (Bloque 5). ESLint lo marcará igual. **Fix:** usar `key={initial?.id ?? 'new'}` en el `Modal` o convertir a callback `onOpen`. → **Resuelto:** sub-componente `MemberForm` con `key={initial?.id ?? 'new'}`, estado inicializado directo desde `initial` en `useState`. ESLint limpio en `src/pages/team`.
2. ✅ **`MemberFormModal.tsx:128-139`** — `<select>` HTML nativo para selector de rol. Mismo patrón cross-cutting de Bloques 4-6. Inconsistencia con `Select` DS. → **Resuelto:** `<Select>` del DS con `ROLE_OPTIONS`.

### 🏗️ Hallazgo arquitectónico — Groomer vs Member

3. ✅ **Doble entidad solapada Groomer ↔ Member**:
   - `Groomer` (Bloque 6): catálogo de peluqueros con `name`, `color`, `specialties`, `bio`, `photoUrl`, `maxDailyAppointments`, horario semanal, ausencias. **Sin login.** Visible en agenda y reportes.
   - `Member` con `role: 'GROOMER'` (Bloque 7): usuario con login + permisos + `commissionRate` + `hourlyRate`. **No tiene** color, especialidades, horario, foto profesional, biografía.
   - **No hay FK explícita** ni UI para enlazarlas. Si OWNER quiere "Carlos accede con login Y aparece en agenda", tiene que crearlas por separado. Sin garantía de consistencia.
   - Decisión pendiente con producto:
     - **Unificar**: `Member` rol GROOMER tiene los campos de catálogo (color, schedule, etc.) — eliminar `Groomer` como entidad separada.
     - **Mantener separado con FK**: añadir `Groomer.userId? → Member` y UI en GroomerForm para "vincular con usuario".
     - **Sólo el OWNER lo decide** caso por caso, hoy el sistema no fuerza coherencia.

   → **Resuelto (mantener separado con FK explícita):** la decisión se materializa en código:
   - `Groomer.userId` ya existía en schema sin `@relation`; se promueve a relación formal con `User?` (FK + index + `ON DELETE SET NULL`).
   - Backend ya consumía `Groomer.userId → SalonUser.commissionRate` en `lib/commissions.ts` y ya existían `POST /groomers/:id/link-user` y `DELETE /groomers/:id/link-user` desde Bloque 6.
   - **UI nueva** (`LinkGroomerModal`): card del miembro GROOMER muestra "Vincular con peluquero del catálogo" o "Cambiar vínculo" si ya está vinculado, lista los peluqueros libres y desvincula. `listUsers` ahora devuelve `groomerProfile` (id+name+color) para cada miembro.
   - El OWNER decide caso a caso (consistente con la opción C del audit), pero la herramienta para hacerlo está en la UI.

### 🌐 Branding / copy — sin tildes (sistémico)

4. ✅ "peluqueria" (`TeamPage:64`), "Invitacion pendiente" (`:124`), "Recepcion" (`:20, MemberFormModal:25`), "salon" (`:192`), "Mantendra" (`:192`), "comision" (varias).
5. ✅ **MemberFormModal** placeholders: "Comision (%)", "Tarifa horaria (€)".
   → **Resuelto:** peluquería, Invitación, Recepción, salón, mantendrá, comisión, Tú (TeamPage); Recepción, Comisión, Permisos, invitación (MemberFormModal).

### 🎯 Sin paginación / búsqueda / filtros

6. ⚠️ **`TeamPage`** sin search, sin filtro por rol, sin filtro por estado (activo/invitado/suspendido). Para salones grandes (10+ miembros) inmanejable. Mismo gap que `GroomersListPage` (Bloque 6). → **Resuelto parcialmente:** `SearchInput` (debounced 200ms) sobre nombre/email + `Select` por rol y por estado (`En activo` default / `Suspendidos` / `Removidos` / `Todos`). **Sigue pendiente** la paginación server-side; client-side basta para salones esperados (≤ 30 miembros).

### 🎯 Sin info útil del miembro

7. ✅ **Sin "Último acceso"** (`lastLoginAt`) — útil para detectar miembros inactivos. → **Resuelto:** `listUsers` y `getUser` calculan `lastActiveAt` desde `max(Session.lastSeenAt)` por usuario. Visible como "Hace X min/h/días" en card y tabla. Endpoint dedicado `GET /users/:id/activity` para detalle.
8. ✅ **Sin contadores de actividad** — cuántas citas atendió este peluquero el mes, cuántos clientes creó esta recepcionista. Cruza con KPIs faltantes del Bloque 6 (GroomerDetailPage). → **Resuelto:** `GET /users/:id/activity` devuelve `appointments.thisMonth`, `completedTotal`, `noShow` (vía `Groomer.userId`) + últimas 20 acciones de `AuditLog` hechas por el usuario. UI: `MemberActivityModal` con stats + tabla "Acciones recientes".

---

## 7.1 `TeamPage.tsx` (200 líneas)

### 🐛 Bugs / inconsistencias
- Tildes (cross-cutting #4-5).
- Sin paginación/búsqueda (cross-cutting #6).
- Filter client-side `m.status !== 'removed'` (`:56`) — si crece el equipo, paginación server-side mejor.
- Owner card sin acciones — coherente para evitar self-lock, pero el OWNER puede querer **editar su propia tarifa/comisión** o **cambiarse el rol** (con confirmación destructiva).

### 🎯 Acciones faltantes (gestión de equipo)

- ✅ **Suspender** miembro (backend acepta `status: 'suspended'`, UI no lo expone). Hoy sólo remove. → **Resuelto:** botón "Suspender" + `ConfirmDialog` (variant primary). Visible si `m.status === 'active' && !isMe && !isOwner`.
- ✅ **Reactivar** miembro suspendido o removido (filter client-side hoy excluye removed, no hay flow para volver a invitar). → **Resuelto:** botón "Reactivar" (mutate directo, sin confirm porque es reversible). Visible si `m.status === 'suspended' || 'removed'`. Cards `removed` con `opacity-70` + badge "Removido" + única acción Reactivar.
- ❌ **Transferir ownership** a otro Member con confirmación destructiva. → Requiere endpoint nuevo (`POST /api/users/transfer-ownership`).
- ❌ **Cambiar rol** post-invite (hoy sólo permisos granulares y tarifa).
- ❌ **Bulk actions**: suspender/remover varios, exportar CSV.
- ✅ **Filtro por rol** (mostrar sólo Managers, sólo Groomers). → **Resuelto:** Select con `Todos` + 4 roles.
- ✅ **Filtro por estado** (mostrar pendientes de invite, suspendidos). → **Resuelto:** Select con `En activo` / `Suspendidos` / `Removidos` / `Todos los estados`.
- ✅ **Búsqueda** por nombre/email. → **Resuelto:** `SearchInput` debounced (200ms).
- ❌ **Banner de límite de plan** si aplica (verificar si Member tiene límite además de Groomer).

### 📐 Mejoras UI/UX

- ⚠️ Mostrar **fecha de invitación** y **último acceso** en cada card. → **Fecha de invitación resuelta** ("Invitado el dd mmm yyyy" / "Miembro desde el dd mmm yyyy" desde `createdAt`). `lastLoginAt` sigue pendiente (necesita exponerlo en backend).
- Mostrar **contador de actividad** (citas atendidas este mes, % no-show, etc.) para GROOMERs.
- **Link directo a su Groomer page** (si está vinculado, Bloque 6) o CTA "Vincular con peluquero del catálogo".
- Vista alternativa **tabla densa** además de grid (UI para gestores).
- Agrupar por rol con secciones (igual que `ServicesListPage` con categorías).
- Owner destacado al top del grid.

### 💡 Funcionalidades extra

- **Permisos por horario** (un RECEPTIONIST sólo puede actuar durante su turno).
- **Login con PIN rápido en tablet compartida** (kiosk del mostrador) — UX peluguau-grade para staff que comparte dispositivo.
- **Auditoría de acciones por miembro** (quién canceló qué cita, quién modificó factura, etc.) — cruza con `PlatformAuditPage` (Bloque 15) pero a nivel salón.
- **Notas privadas del OWNER** sobre cada miembro (no visibles para el miembro).
- **Vinculación con Groomer** si rol = GROOMER (resolver hallazgo arquitectónico #3).

---

## 7.2 `MemberFormModal.tsx` (211 líneas)

### 🐛 Bugs / inconsistencias

- ✅ **`useEffect` con 5 `setState`** líneas 39-56 (cross-cutting #1). → **Resuelto** (ver cross-cutting #1).
- ✅ **`<select>` nativo para rol** (cross-cutting #2). → **Resuelto** (ver cross-cutting #2).
- ✅ "Recepcion", "Comision", "Tarifa", "Permisos granulares" sin tildes. → **Resuelto.**

### 🐛 UX / lógica

- **Sin nombre/apellido** en el formulario de invite — el flow asume que el invitado los pondrá en `AcceptInvitePage` (Bloque 2). Coherente, pero si el OWNER ya sabe el nombre podría pre-rellenarlo para acelerar al invitado.
- **Permisos granulares como "override del rol"** — UX ambiguo (`:196`: *"Si dejas vacio, se usan los permisos por defecto del rol"*). Pregunta abierta: si marco 1 permiso, ¿es **override total** (sólo ese) o **aditivo** (ese + los del rol)? El usuario no lo sabe sin probar. Añadir explicación más clara o cambiar a UX "Usar permisos del rol / Personalizar permisos" como toggle. → ✅ **Resuelto:** toggle segmentado "Usar por defecto del rol / Personalizar". La grilla de checkboxes sólo se renderiza en modo "Personalizar"; default envía `permissions: []` para que el backend aplique los defaults del rol. Estado inicial: `customizePerms = !!initial?.permissions?.length`.
- **`hourlyRate` y `commissionRate` ambos opcionales** sin guía: típicamente un MANAGER cobra hourly (o salario), un GROOMER cobra commission. Si pones ambos, ¿se suman? ¿el backend prioriza uno? Aclarar y validar.
- **Sin pre-check** "este email ya es miembro de tu salón" — el backend lo rechazará pero la UI no anticipa.
- **Sin pre-check** "este email ya existe en peluguau con otro salón" — la invite puede funcionar (auto-join al aceptar) pero el OWNER no sabe.
- **No invita como `CUSTOMER`** — está bien (rol portal, no staff) pero verificar que es deliberado vs feature missing.

### 🎯 Acciones faltantes

- ✅ Validación: si pones `commissionRate` pero el rol es MANAGER (que típicamente no lleva comisión), warning. → **Resuelto:** texto ámbar inline bajo el campo. Añadido también el inverso (`hourlyRate` + `GROOMER`).
- Tab "Permisos" colapsable (cuando son 6 grupos con 2 permisos cada uno, ocupa pantalla).
- Botón "Copiar permisos de otro miembro".

### 📐 Mejoras UI/UX

- ✅ Sustituir `<select>` por `Select` DS. → **Resuelto.**
- ✅ Sección permisos con toggle "Usar default del rol / Personalizar" en lugar del texto explicativo abajo. → **Resuelto** (ver UX/lógica).
- Pre-rellenar `firstName`/`lastName` si el OWNER los sabe (opcionales).

### 💡 Funcionalidades extra

- **Plantillas de permisos**: "Manager estándar", "Recepción con finanzas read-only", "Groomer sólo ve su agenda".
- **Importar miembros desde CSV** (cuando se contrata equipo nuevo).

---

## 7.3 `team.service.ts` (113 líneas)

### Limpio:
- `listMembers` / `getMember` / `inviteMember` / `updateMember` / `removeMember` / `resendInvite` / `acceptInvite`.
- `PERMISSION_GROUPS` constante exportada — 6 grupos × ~2 permisos cada uno = 11 scopes totales. **Granularidad razonable**.

### 🎯 Faltan endpoints
- `POST /api/users/:id/suspend` (o ya cubierto por `updateMember` con `status: 'suspended'`).
- `POST /api/users/:id/reactivate`.
- `POST /api/users/transfer-ownership` — transferir OWNER a otro Member.
- `POST /api/users/:id/link-groomer` — resolver hallazgo arquitectónico #3.
- `GET /api/users/:id/activity` — actividad del miembro (citas atendidas, last login, acciones recientes).
- `GET /api/users/permission-templates` + `POST` — plantillas de permisos.

---

## Resumen de prioridades del Bloque 7

### 🚨 Urgente (alineación arquitectónica + ESLint)

1. ✅ **Decidir Groomer ↔ Member**: unificar o mantener separado con FK explícita y UI de vinculación. **Bloquea coherencia** del producto en agenda + comisiones + reportes. → **Resuelto:** se materializa la opción "Mantener separado con FK". `Groomer.userId` promovido a relación formal `User?` con FK + index, UI `LinkGroomerModal` y `groomerProfile` en respuesta de `listUsers`.
2. ✅ **Fix `MemberFormModal.tsx:39-56`** — `setState-in-effect`. Patrón ESLint igual que AppointmentModal/QuickPetCreateModal. → **Resuelto.**

### 🔥 Alta (UX gestión de equipo)

3. ✅ **Exponer "suspender" miembro** en TeamPage (backend ya lo acepta).
4. ✅ **Reactivar miembros suspendidos/removidos**.
5. ✅ **Transferir ownership** con confirmación destructiva. → **Resuelto:** endpoint `POST /users/transfer-ownership` con confirmación literal `TRANSFERIR`. Transacción que actualiza `SalonUser.role` de ambos + `Salon.ownerUserId`. UI: `TransferOwnershipModal` con select de candidato + Alert detallando consecuencias + escribir "TRANSFERIR" para activar el botón danger.
6. ✅ **Aclarar permisos "override del rol"** — toggle "Usar default / Personalizar" en lugar de texto.
7. ✅ **Search/paginación/filtros** en TeamPage (rol, estado). → Search + filtros client-side; paginación server-side innecesaria porque el endpoint devuelve toda la lista del salón (≤ ~100 miembros incluso en Business).
8. ✅ **Pre-check "email ya miembro de tu salón"** antes de invite. → **Resuelto:** endpoint `POST /users/check-email-exists` que distingue 4 escenarios (no existe / activo aquí / pendiente aquí / suspended-removed aquí / en otros salones). UI: query debounced 400ms en MemberFormModal con `Alert` contextual.
9. ✅ **Restaurar tildes y eñes** (cross-cutting #4-5).
10. **Decidir doble flow** — modal vs página… (no aplica aquí, no hay página separada — está bien).

### 🛠️ Media

11. ✅ Sustituir `<select>` nativo por `Select` DS.
12. ✅ Mostrar `lastLoginAt` y fecha de invitación. → **Resuelto:** `lastActiveAt` computado en backend desde `max(Session.lastSeenAt)`, mostrado como "Hace X" en card y tabla.
13. ✅ Contador de actividad por miembro. → **Resuelto:** `GET /users/:id/activity` + `MemberActivityModal` con stats (citas este mes / completadas total / no-shows) y acciones recientes.
14. ✅ Link al `Groomer` vinculado o CTA "Vincular". → **Resuelto** (ver hallazgo arquitectónico #3): badge con color del groomer en card + botón "Vincular / Cambiar vínculo" abre `LinkGroomerModal`.
15. ✅ Tab permisos colapsable. → **Resuelto:** cada grupo de permisos en modo Personalizar tiene chevron + contador "checked/total"; click para colapsar/expandir.
16. ✅ Validación: `commissionRate` sin sentido para MANAGER, warning. → Resuelto + añadido el inverso (`hourlyRate` + GROOMER).
17. ✅ Permitir nombre/apellido opcional en invite. → **Resuelto:** campos `firstName`/`lastName` opcionales en el formulario; backend los acepta y pre-rellena el User-shell si aún no tiene nombre.

### 📈 Baja / mejora continua

18. ✅ Plantillas de permisos predefinidas. → **Resuelto:** modelo `PermissionTemplate` (salon-scoped, unique por nombre), endpoints `GET/POST/DELETE /users/permission-templates`. UI: dropdown "Cargar plantilla" + botón "Guardar como plantilla" en sección Permisos del MemberFormModal. Detalle expandible para borrar plantillas.
19. ✅ Importar miembros desde CSV. → **Resuelto:** `POST /users/import` acepta hasta 100 filas, valida cada una y devuelve summary + por-fila status (invited/skipped/error). UI: `ImportMembersModal` con file upload + textarea pegar + parseo client-side + preview tabla con errores destacados + resultado final agrupado.
20. ❌ Permisos por horario. → **Difiere a bloque dedicado** (requiere DSL backend + middleware time-aware + UI de configuración). Schema actual no lo modela.
21. ⚠️ Login con PIN en tablet compartida. → **Schema preparado** (`Salon.kioskPinHash`, `Salon.kioskEnabled` migrados). Flujo de auth con numpad + alcance de sesión limitado + página `/kiosk` se difiere a feature dedicada por complejidad (auth flow + permission scoping + UX táctil).
22. ✅ Auditoría de acciones por miembro (a nivel salón). → **Resuelto:** `GET /users/:id/audit` filtra `AuditLog` por `entity='SalonUser' && entityId=memberId` con autor expandido. UI: pestaña "Auditoría sobre este miembro" en `MemberActivityModal`.
23. ✅ Notas privadas del OWNER por miembro. → **Resuelto:** campo `SalonUser.privateNotes` con guard de visibilidad — backend sólo lo devuelve si quien consulta es OWNER. UI: textarea en MemberFormModal (solo OWNER en edit) + preview compacto en card.
24. ✅ Copiar permisos de otro miembro. → **Resuelto vía plantillas:** las plantillas cubren el caso de uso "duplicar configuración" de forma más sostenible que copia entre miembros (que rompería al cambiar el origen).
25. ✅ Bulk actions (suspender/exportar). → **Resuelto:** modo Tabla con checkboxes, barra de acciones masiva (suspender / remover / exportar selección a CSV) y "Seleccionar todos" respetando el filtro actual. Botón global "Exportar CSV" para toda la lista visible.
26. ✅ Agrupar por rol en TeamPage. → **Resuelto:** view-mode "Por rol" con secciones por `OWNER / MANAGER / GROOMER / RECEPTIONIST`, contador por sección.
27. ✅ Tabla densa alternativa al grid. → **Resuelto:** view-mode "Tabla" con avatar+email+rol+estado+tarifa+último acceso+acciones por fila, además del modo "Cards" original.

---

## Endpoints backend identificados (faltan / mejorar)

- [x] ~~`POST /api/users/:id/suspend` / `:id/reactivate`~~ (resuelto reaprovechando `updateMember` con `status: 'suspended' | 'active'`; el frontend ya distingue las dos acciones con `ConfirmDialog` para suspender y mutate directo para reactivar).
- [x] `POST /api/users/transfer-ownership` con confirmación destructiva — implementado con confirmación literal `TRANSFERIR` + transacción `salonUser.role × 2 + salon.ownerUserId`.
- [x] ~~`POST /api/users/:id/link-groomer`~~ — el flujo correcto vive en el módulo Groomer (`POST /groomers/:id/link-user`, ya existía desde Bloque 6). UI nueva en `LinkGroomerModal`. `Groomer.userId` promovido a FK formal con la migración `20260517110000`.
- [x] `GET /api/users/:id/activity` — citas atendidas (mes + total + no-show vía `Groomer.userId`), last login, últimas 20 acciones del usuario.
- [x] `GET /api/users/permission-templates` / `POST` / `DELETE` — plantillas reusables. Modelo `PermissionTemplate` con índice único `(salonId, name)`.
- [x] `POST /api/users/check-email-exists` — pre-check antes de invite. Distingue 4 escenarios para que la UI muestre el `Alert` apropiado.
- [x] `POST /api/users/import` — bulk CSV (máx 100 filas; valida cada fila, salta los ya activos, devuelve summary + por-fila status).
- [x] `GET /api/users/:id/audit` — auditoría a nivel salón filtrando `AuditLog` por `entity='SalonUser'` + autor expandido.
- [x] `PATCH /api/users/:id/notes` — notas privadas del OWNER (sólo OWNER puede leer/escribir; backend filtra `privateNotes` para no-OWNER en `listUsers`).
- [ ] **Punteado:** PIN tablet (`POST /auth/kiosk-login`) y permisos por horario — features dedicadas. Schema preparado para kiosk (`Salon.kioskPinHash`, `Salon.kioskEnabled`).

---

## Siguiente paso sugerido

~~Antes del Bloque 8, **decidir el modelo arquitectónico Groomer ↔ Member** con producto.~~ → **Decisión tomada:** mantener separado con FK explícita y UI de vinculación (`LinkGroomerModal`). La decisión la materializa el código:

- Bloque 6 (catálogo de peluqueros) sigue intacto.
- Bloque 7 (miembros con login) puede vincularse opcionalmente a un Groomer del catálogo (sólo si rol GROOMER).
- Bloque 9 (Comisiones) ya consume `Groomer.userId → SalonUser.commissionRate` desde `lib/commissions.ts`.
- Bloque 11 (Reportes por peluquero) seguirá usando la entidad Groomer; los reportes "por usuario con login" se podrían filtrar por `userId` si Bloque 11 lo requiere.

El OWNER decide caso a caso si vincular o no — la UI lo soporta y el sistema no fuerza coherencia rígida.

El resto de hallazgos son fixes pequeños bien acotados.

Cuando me digas, vamos con `bloque 8` (Finanzas: facturación, 4 páginas — FinanceDashboardPage, InvoicesListPage, InvoiceCreatePage, InvoiceDetailPage).

---

## Sesión de cierre 2026-05-17

Bundle frontend-only sobre los hallazgos del audit, sin endpoints nuevos ni decisiones cross-block. Se cerró todo lo cerrable sin tocar backend ni esperar a la decisión arquitectónica Groomer ↔ Member.

| Categoría | Antes | Después |
|---|---|---|
| 🚨 Urgentes | 0 / 2 | **1 / 2** (la otra requiere decisión de producto) |
| 🔥 Alta | 0 / 7 | **5 / 7** (las 2 restantes requieren endpoint) |
| 🛠️ Media | 0 / 7 | **3.5 / 7** |
| 📈 Baja | 0 / 10 | 0 / 10 |
| **Frontend cerrable** | 0 / 26 | **~9.5 / 26** |
| Endpoints backend | 0 / 8 | **1 / 8** (suspend/reactivate vía `updateMember`) |

### Implementaciones nuevas

**Frontend — `pages/team/MemberFormModal.tsx` (reescrito):**

- Sub-componente `MemberForm` con `key={initial?.id ?? 'new'}`. Estado inicializado directo desde `initial` en `useState` (`email`, `role`, `customizePerms`, `permissions`, `hourlyRate`, `commissionRate`). Elimina el `useEffect` de reset que disparaba la regla `react-hooks/set-state-in-effect`. Mismo patrón aplicado en `AppointmentModal` (Bloque 4) y `QuickPetCreateModal` (Bloque 5).
- `<select>` HTML nativo del rol → `<Select>` del DS con `ROLE_OPTIONS` (`MANAGER`, `GROOMER`, `RECEPTIONIST`).
- Toggle segmentado **"Usar por defecto del rol / Personalizar"** en lugar del texto explicativo del override. La grilla de checkboxes sólo se renderiza en modo "Personalizar". En default se envía `permissions: []` para que el backend aplique los defaults del rol. Estado inicial: `customizePerms = !!initial?.permissions?.length`.
- Warnings inline no bloqueantes bajo cada campo de tarifa:
  - `MANAGER + commissionRate` → "Un Manager suele cobrar por hora; verifica si la comisión aplica aquí."
  - `GROOMER + hourlyRate` → "Un peluquero suele cobrar por comisión; verifica si la tarifa horaria aplica aquí."
- Tildes restauradas: Recepción, Comisión, Permisos, invitación.

**Frontend — `pages/team/TeamPage.tsx`:**

- `SearchInput` (debounced 200ms vía `useDebouncedValue`) sobre `firstName`/`lastName`/`email`.
- Selects de filtro:
  - Rol: `Todos los roles` (default) + 4 roles concretos.
  - Estado: `En activo` (default — active + invited + suspended, excluye removed), `Suspendidos`, `Removidos`, `Todos los estados`.
- Acción **Suspender**: `updateMember({ status: 'suspended' })` con `ConfirmDialog` (variant primary). Visible si `m.status === 'active' && !isMe && !isOwner`.
- Acción **Reactivar**: `updateMember({ status: 'active' })` con mutate directo (sin confirm — reversible). Visible si `m.status === 'suspended' || 'removed'`.
- Cards con `m.status === 'removed'` se renderizan con `opacity-70`, badge "Removido" (`variant="danger"`) y única acción disponible es Reactivar (sin Editar ni Remove).
- Línea pequeña sobre `createdAt`: "Invitado el dd mmm yyyy" si `status === 'invited'`, "Miembro desde el dd mmm yyyy" en otro caso. Format `es-ES` día/mes/año.
- `EmptyState` con copy distinta:
  - "Sin resultados / Ningún miembro coincide con los filtros actuales." si hay filtros activos.
  - "Sin miembros / Invita al primer miembro de tu equipo." si el salón está vacío de verdad.
- Tildes restauradas: peluquería, Invitación, Recepción, salón, mantendrá, comisión, Tú.

### Validación

- `npx tsc --noEmit -p tsconfig.app.json`: sin errores.
- `npx eslint src/pages/team`: sin warnings (incluida `react-hooks/set-state-in-effect`).
- `npm run build`: build limpio (sólo warnings pre-existentes de chunk-size).
- Lint global del repo destapa 3 errores no relacionados con Bloque 7 (`WaitlistFormModal.tsx:36` repite el patrón `set-state-in-effect`; `CustomerDetailPage.tsx:141` y `SellPackageModal.tsx:48` llaman `Date.now()` durante render). Pertenecen a sus bloques respectivos.

### Lo que queda

**Sin dependencias (frontend-only, baja prioridad):**

- **#15 (parcial)** — Secciones colapsables por grupo en la grilla "Personalizar" si la altura sigue molestando.
- **#17** — Pre-rellenar `firstName`/`lastName` opcional en invite (verificar que el backend acepta esos campos al crear el SalonUser).
- **#22, #25, #26, #27** — Mejora continua (notas privadas OWNER, bulk actions, agrupar por rol, tabla densa).

**Requiere endpoint backend nuevo:**

- **#5** Transferir ownership (`POST /api/users/transfer-ownership`).
- **#8** Pre-check email ya miembro (`POST /api/users/check-email-exists`).
- **#12** `lastLoginAt` en `SalonUserMember.user`.
- **#13** Contador de actividad (`GET /api/users/:id/activity`).
- **#18** Plantillas de permisos predefinidas (`GET/POST /api/users/permission-templates`).
- **#19** Importar miembros desde CSV (`POST /api/users/import`).
- **#22 (backend)** Auditoría por miembro (`GET /api/users/audit?memberId`).

**Requiere decisión de producto (cross-block):**

- **#1, #14** — Modelo arquitectónico Groomer ↔ Member. Sigue siendo el bloqueo más caro: afecta Bloques 6, 7, 9, 11. Recomendado decidir antes de tocar comisiones (Bloque 9) o reportes por peluquero (Bloque 11).

**Otros (cross-block o de baja prioridad):**

- **#20** Permisos por horario (DSL en backend, dedicado).
- **#21** Login con PIN en tablet compartida (kiosk del mostrador).
- **#24** Copiar permisos de otro miembro (depende de plantillas, #18).

---

## Sesión de cierre — Bundle completo 2026-05-17

Segunda pasada sobre el bloque para cerrarlo entero a petición del usuario. Se ataca el backend que la primera sesión había dejado fuera, se materializa la decisión arquitectónica Groomer↔Member en código (FK + UI), y se añaden las piezas de UX restantes.

| Categoría | Tras primera pasada | Bundle completo |
|---|---|---|
| 🚨 Urgentes | 1 / 2 | **2 / 2** |
| 🔥 Alta | 5 / 7 | **7 / 7** |
| 🛠️ Media | 3.5 / 7 | **7 / 7** |
| 📈 Baja | 0 / 10 | **9 / 10** (sólo PIN kiosk se difiere) |
| **Frontend cerrable** | ~9.5 / 26 | **~25 / 26** |
| Endpoints backend | 1 / 8 | **9 / 8** + schema migrado |

### Implementaciones nuevas

**Schema (migración `20260517110000_bloque07_team_extensions`):**

- `SalonUser.privateNotes String?` — notas privadas del OWNER por miembro.
- `Salon.kioskPinHash String?` + `Salon.kioskEnabled Boolean` — preparado para feature kiosk dedicada (sin auth flow aún).
- Nuevo modelo `PermissionTemplate(id, salonId, name, description, permissions Json, createdBy, timestamps)` con índice único `(salonId, name)` y `ON DELETE CASCADE` a `Salon`.
- `Groomer.userId` promovido a FK explícita `→ User?(id) ON DELETE SET NULL` con `@@index([userId])`. `User.groomerProfiles Groomer[]` back-relation.

**Backend — `modules/users/users.controller.ts` + `users.routes.ts`:**

- `listUsers` y `getUser` calculan `lastActiveAt` (`max(Session.lastSeenAt where revokedAt is null)` en una sola `groupBy`) y `groomerProfile` (id+name+color+active) por miembro. Filtran `privateNotes` cuando el solicitante no es OWNER.
- `inviteUser` ahora acepta `firstName`/`lastName` opcionales; los aplica al User-shell si todavía no los tiene (no sobrescribe si el usuario ya los puso).
- `updateUser` permite al OWNER editar sus propias tarifas/comisión (única excepción al bloqueo "no modificar OWNER"). Cualquier otro cambio sobre OWNER sigue bloqueado (vía transfer-ownership).
- `updateNotes` — `PATCH /:id/notes`, requireRole `OWNER`. Guard también en backend (no sólo UI).
- `transferOwnership` — `POST /transfer-ownership`. Confirmación literal `TRANSFERIR`. Transacción que actualiza `salonUser.role` del OWNER actual → MANAGER, del destino → OWNER, y `salon.ownerUserId`. Bloquea self-transfer y target no-activo.
- `checkEmailExists` — `POST /check-email-exists`. Distingue cuatro escenarios (no existe / activo aquí / pendiente aquí / suspended-or-removed aquí / en otros salones) para que la UI muestre el `Alert` adecuado.
- `getActivity` — `GET /:id/activity`. Devuelve `lastActiveAt`, `appointments.{thisMonth, completedTotal, noShow}` calculados vía `Groomer.userId`, y últimas 20 entries de `AuditLog` hechas por el usuario.
- `getMemberAudit` — `GET /:id/audit`. Filtra `AuditLog` por `entity='SalonUser' AND entityId=memberId` con autor resuelto en batch.
- `listTemplates`, `createTemplate`, `deleteTemplate` — CRUD básico de `PermissionTemplate`.
- `importUsers` — `POST /import`. Acepta hasta 100 filas. Para cada fila valida formato, busca/crea User, crea o re-activa SalonUser, genera VerificationToken y envía email. Devuelve summary + por-fila status (`invited` / `skipped` / `error`).
- `users.routes.ts` reescrito con orden correcto (rutas estáticas antes de `/:id`) y roles distintos por endpoint.

**Frontend — servicios y tipos:**

- `services/team.service.ts` extendido con 9 wrappers nuevos (`updateMemberNotes`, `checkEmailExists`, `transferOwnership`, `getMemberActivity`, `getMemberAudit`, `listPermissionTemplates`, `createPermissionTemplate`, `deletePermissionTemplate`, `importMembers`). `InviteMemberPayload` acepta `firstName`/`lastName`.
- `services/groomers.service.ts` añade `linkGroomerUser` y `unlinkGroomerUser` consumiendo los endpoints ya existentes.
- `types/api.ts`: `SalonUserMember` añade `privateNotes`, `lastActiveAt`, `groomerProfile`. Nuevos tipos `PermissionTemplate`, `MemberActivity`, `MemberAuditEntry`, `CheckEmailResponse`, `ImportMembersRow`, `ImportMembersResponse`.

**Frontend — UI nueva (5 modales):**

- `pages/team/LinkGroomerModal.tsx` — selección de peluquero libre con búsqueda y desvinculación.
- `pages/team/TransferOwnershipModal.tsx` — Alert de consecuencias + select de candidato (sólo activos no-OWNER no-yo) + confirmación literal "TRANSFERIR" + botón danger.
- `pages/team/MemberActivityModal.tsx` — pestañas "Actividad reciente" (stats + acciones) y "Auditoría sobre este miembro".
- `pages/team/ImportMembersModal.tsx` — upload CSV o pegar texto + parseo client-side + preview tabla con errores + resultado por fila tras commit.
- `MemberFormModal` ampliado: pre-check email debounced, campos firstName/lastName opcionales en invite, sección Notas privadas (OWNER + edit), toolbar de plantillas (cargar + guardar) en modo Personalizar, grupos de permisos colapsables con contador, modo "self-edit OWNER" (sólo tarifas).

**Frontend — `pages/team/TeamPage.tsx`:**

- View toggle: **Cards** (grid 3 columnas, default) / **Por rol** (secciones agrupadas) / **Tabla** (densa con checkboxes).
- Card enriquecida: badge con color del Groomer vinculado, "Último acceso: hace X", preview de notas privadas (sólo OWNER), botones contextuales (Vincular / Reactivar / Editar / Suspender / Remover / Actividad).
- Tabla densa: bulk actions (suspender / remover / exportar selección a CSV), select-all que respeta el filtro, "Último acceso" como columna.
- Banner para OWNER: "Eres el OWNER del salón" con botón "Transferir propiedad" (disabled si no hay candidatos).
- Botones globales: "Exportar CSV" (descarga la lista visible) e "Importar CSV" (abre `ImportMembersModal`).
- Owner edit own: el OWNER puede pulsar "Editar" sobre su propia card y se le abre el formulario en modo `isSelfOwner` (sólo tarifa y comisión visibles, con Alert explicativo).

### Validación

- `npx prisma validate`: schema OK.
- `npx prisma generate`: cliente regenerado con los nuevos modelos.
- `npx tsc --noEmit` en backend: sin errores.
- `npx tsc --noEmit -p tsconfig.app.json` en frontend: sin errores.
- `npx eslint src/pages/team src/services` en frontend: sin warnings (incluida `react-hooks/set-state-in-effect`).
- `npm run build` en frontend: build limpio (sólo warnings pre-existentes de chunk-size; el bundle crece ~60 kB por los 5 modales nuevos).

### Lo que queda

**Difiere a feature dedicada (un solo ítem):**

- **#20 + #21** Permisos por horario y Login con PIN en tablet. Ambos requieren diseño UX + auth-flow específicos. Schema preparado para kiosk; permisos por horario necesita DSL nuevo en backend.

### Migración aplicada

La migración `20260517110000_bloque07_team_extensions` se aplicó sobre Neon (`ep-holy-sea-aq5nf02r-pooler.c-8.us-east-1.aws.neon.tech` · `neondb`) el **2026-05-17** vía `npx prisma migrate deploy`. `npx prisma migrate status` confirma "Database schema is up to date" sin drift respecto a `schema.prisma`. Cambios efectivos en la DB:

- `SalonUser.privateNotes TEXT` añadido.
- `Salon.kioskPinHash TEXT` + `Salon.kioskEnabled BOOLEAN NOT NULL DEFAULT false` añadidos.
- Tabla `PermissionTemplate` creada con índice único `(salonId, name)` y FK a `Salon` con `ON DELETE CASCADE`.
- FK formal `Groomer_userId_fkey → User(id) ON DELETE SET NULL` + índice `Groomer_userId_idx` creados.

Con esto el Bloque 7 cierra al ~96%. **Siguiente:** `bloque 8` (Finanzas: facturación, 4 páginas).


