# Auditoría Bloque 3 — Onboarding y dashboard principal

> **Bloque:** 3 / 16 · **Páginas:** 3 + 2 servicios + 1 guard
> **Auditado:** 2026-05-16
> **Estado del bloque:** 🟠 Funcional. Onboarding mínimo. Dashboard sólido. Profile incompleto.

---

## Resumen ejecutivo del bloque

Las 3 páginas son la columna vertebral de la activación. El **Dashboard** está bien construido: 7 queries en paralelo, KPIs reales, empty states, click-through. El **Onboarding** es deliberadamente mínimo (un solo campo) pero promete 3 pasos que no existen como flow real. El **Profile** está a medio camino: datos básicos + password + lista de sesiones, pero falta upload de avatar, revocar sesiones, 2FA, cambio de email, eliminar cuenta, cambio de salón activo.

Patrón compartido: las 3 páginas siguen las mismas convenciones (Card / Label / Alert / Spinner / Button del sistema de diseño), `extractErrorMessage`, TanStack Query con `staleTime`, `enabled: !!currentSalon`. Higiene técnica decente.

**Las tres palancas urgentes para subir activación:**
1. Onboarding debe seguir más allá del primer paso (configurar horarios, importar clientes, dar de alta el primer servicio) — hoy te tira al dashboard vacío después de un solo input.
2. Dashboard debe permitir cambiar de rango temporal y de salón activo.
3. Profile debe permitir cerrar sesiones remotas, subir foto (no URL), y verificar email con un click.

---

## Hallazgos cross-cutting

### 🐛 Bugs

1. **`DashboardPage.tsx:50-53` — `daysBetween` muta el Date que recibe** (`a.setHours(0, 0, 0, 0)`). Si el caller usa `a` después esperando que sea el original, se altera. Hoy el call en línea 433 envuelve con `new Date(today)` para mitigar, pero el patrón es frágil. **Fix:** crear copia internamente:
   ```ts
   function daysBetween(a: Date, b: Date): number {
     const A = new Date(a); A.setHours(0,0,0,0);
     const B = new Date(b); B.setHours(0,0,0,0);
     return Math.round((A.getTime() - B.getTime()) / 86400000);
   }
   ```
2. **`DashboardPage.tsx:60`** — `useQuery({ queryKey: ['me'], queryFn: getProfile })` sin guardar resultado ni usarlo en la página. Existe para refrescar la auth store, pero `ProfilePage` ya hace esto al cargar. **Probablemente sobra** o conviene mover a un hook compartido (`useRefreshProfile()` en el layout protegido).
3. **`ProfilePage.tsx:27-32`** — `useEffect` que sincroniza `profileQuery.data` con `setUser` / `setMemberships`. Patrón `setState-in-effect` que ESLint marca en otras páginas (`AUDITORIA-2026-05-13.md` punto 2.3). Refactor: usar el callback `onSuccess` de `useQuery` (deprecado en v5) o derivar via `useEffect` con dependencia mínima `[profileQuery.dataUpdatedAt]`, o pasar a un patrón `select` + `useEffect` puro.
4. **`OnboardingPage` no captura `?plan=X` del query string** — viene de la landing y se pierde aquí también (sumando al hallazgo del Bloque 2 #18 en `RegisterPage`). El plan elegido nunca llega al backend en el flujo trial.

### 🌐 Branding / copy

5. **Sin tildes y eñes** — sistémico, igual que Bloques 1 y 2:
   - `OnboardingPage.tsx:42` *"Configuracion inicial"*; línea 50 *"mas adelante"*; línea 68 *"Generaremos automaticamente"*; línea 74 *"Anade"*.
   - `DashboardPage.tsx:191` *"Total con status activo"*; línea 198 *"Inventario al dia"*; línea 357 *"bajo minimo"*; línea 436-439 *"dia"* / *"dias"*.
   - `ProfilePage.tsx:46` *"Cargando perfil"*; línea 95 *"informacion"*; línea 166-187 *"Contrasena"* (8+ veces); línea 255 *"Ultimos accesos"*; línea 264 *"Aun"*; línea 178 *"contrasenas"*.
6. **Inconsistencia mayúsculas/minúsculas en "Peluqueria"** — placeholder `"Pet Style Madrid"` (Onboarding:64) y en otros sitios "Crea tu primera peluqueria" (minúsculas, línea 47) vs "Configurar tu peluqueria" (mismo registro). Consistente con landing/auth, pero verificar la decisión de branding.

### 🎯 Falta de salón / multi-salón

7. **Sin selector de salón activo** — un user con varios `memberships` (consultora, dueño de cadena) no puede cambiar fácilmente el salón visible. `useSalon().currentSalon` se basa en `currentSalonId` del store, pero no hay UI para cambiarlo desde `Dashboard` ni `Profile`. Bloquea el caso "1 user, 2 salones".
8. **`DashboardPage.tsx:108-117`** — early return cuando `!currentSalon`. Pero `RequireSalon` ya redirige a `/onboarding` si `memberships.length === 0`. ¿Cuándo se da el caso de `memberships.length > 0` pero `!currentSalon`? Bug latente: si el `currentSalonId` apunta a un membership inexistente (revocado, eliminado), el dashboard muestra solo el saludo sin más contexto.

### 📐 UX general

9. **Sin selector de rango temporal en Dashboard** — citas hoy + ingresos semana están hardcoded. Usuario que quiere ver "ayer" o "este mes" no puede.
10. **KPIs no son clickeables** — la `KpiCard` no tiene `onClick`. Tap en "Citas hoy" debería llevar a `/appointments?date=today`.
11. **Sin verificación de email proactiva** — `DashboardPage:144-148` muestra Badge "Email pendiente" pero sin CTA. Y en `ProfilePage:139-143` igual: muestra "Sin verificar" sin botón para "Reenviar verificación".

---

## 3.1 `OnboardingPage.tsx` (103 líneas)

### 🐛 Bugs / inconsistencias
- **Un solo campo capturado** (`name`). Servicios, horarios, peluqueros, import CSV — todo queda para "después" sin guiar al usuario.
- Componente `Step` (línea 73-75) muestra 3 pasos *"Crear / Invitar / Configurar"* pero **solo el primero está implementado**. Es UI prometiendo flujo que no existe.
- No captura `?plan=X` del query string (cross-cutting #4).
- No captura `?source=landing` u otros parámetros de tracking.
- Placeholder `"Pet Style Madrid"` (línea 64) — ¿real o ficticio? Consistente con `RegisterPage`.

### 🎯 Acciones faltantes
- **Multi-step real**:
  - Step 1: Datos del salón (nombre, ciudad, teléfono, horario base, slug)
  - Step 2: Servicios (con plantillas pre-cargadas por raza/tamaño)
  - Step 3: Peluqueros (invitar al equipo o saltarse si "soy solo yo")
  - Step 4 (opcional): Import CSV de clientes / mascotas
  - Step 5: ¡listo! → tour guiado al dashboard
- **Progress bar real** que se actualiza con `currentStep / totalSteps`.
- **Saltar / "hacerlo después"** explícito por paso. Hoy es todo-o-nada.
- **Resume**: si el user deja onboarding a mitad y vuelve, retomar donde quedó (`localStorage` + backend state). Hoy cada visita empieza de cero.
- **Auto-detección de zona horaria** del browser para preconfigurar `timezone` del salón.
- **Tour guiado post-onboarding** (Driver.js / Shepherd.js) hacia el primer "crear cita".

### 📐 Mejoras UI/UX
- Avatar/logo del salón (upload) — diferenciador inmediato.
- Selector de plan visible (con `plan` venido de la landing pre-seleccionado y editable).
- Animación celebración al completar (confetti) — pequeño pero memorable.
- Sin "saltar onboarding" no hay forma de explorar la app vacía. Útil para curiosos.

### 💡 Funcionalidades extra
- **Plantillas por tipo de peluquería**: "Solo cortes / Estética completa / Boutique premium / Móvil" — pre-rellena servicios típicos con precios y duraciones razonables.
- **Migración asistida desde MoeGo/Pawfinity/Excel** — upload de export y mapeo automático de columnas.
- **Asistente IA** (LLM ligero): pregunta 5 cosas en lenguaje natural y configura el salón.
- **Demo data** opcional: cargar 20 clientes ficticios + 50 citas pasadas para probar la app antes de meter datos reales.

---

## 3.2 `DashboardPage.tsx` (473 líneas)

### 🐛 Bugs / fragilidad

- **`daysBetween` muta el Date que recibe** (líneas 50-53). Patrón frágil; fix arriba (cross-cutting #1).
- **`useQuery(['me'])` sobrante en línea 60** — no usa el resultado. Probablemente legacy. Mover a layout o eliminar.
- **`enabled: !!currentSalon` falta en línea 60** — la query `['me']` se dispara aunque no haya salón. No es catastrófico (el endpoint `/me` no requiere salón) pero rompe el patrón.
- **`appointmentsToday.filter((a) => !a.groomerId).length`** (línea 121) — cuenta "sin asignar". OK. Pero `pendingConfirmation` (línea 120) y `unassigned` se calculan en el render; podrían memoizarse si la lista crece.

### 🎭 Mock data / hardcoded

- **Rango temporal hardcoded** (citas = hoy, ingresos = semana). Sin selector.
- **`revenueTrend` mostrado tal cual** (línea 130) — si el backend devuelve `null/undefined` cae a `0`, y `"Sin comparativa"` se muestra cuando es exactamente 0. Edge case: hay revenue pero el periodo anterior fue 0 → trend matemáticamente infinito, el backend probablemente devuelve 0 y se pierde la información.

### 🎯 Acciones faltantes

- **Selector de rango temporal** ("Hoy / Esta semana / Este mes / Personalizado") afectando a las 4 KPIs.
- **Sección "Próximas citas (mañana)"** o "Próximas X citas" para anticipar.
- **Top 3 servicios del periodo** (ingresos / cantidad).
- **Top 3 peluqueros del periodo** (citas / ingresos generados).
- **Heatmap de ocupación de la semana** (cuántos huecos vacíos).
- **No-shows del periodo** + tendencia.
- **Conversión trial→paid** (visible solo para Owner si el salón está en trial).
- **CTAs primarios contextuales**: "Crear nueva cita" en el header, "Añadir cliente" en KPI de clientes activos.
- **Alertas adicionales**:
  - Cita en <15 min sin confirmar
  - No-show repetido del mismo cliente (3 en 30d)
  - Cliente sin volver en 60/90d (riesgo de churn)
  - Peluquero con calendario libre y agenda con waitlist activa
  - Cumpleaños de mascota hoy (oportunidad de venta)

### 📐 Mejoras UI/UX

- **KPI cards clickeables** — cada una a su lista filtrada.
- **Subtitle "Estas viendo {salonName}"** (línea 138-143) — convertir en dropdown si hay >1 membership.
- **PageHeader.meta** sólo muestra "Email pendiente" → añadir botón inline "Reenviar verificación" en lugar de solo badge.
- **Empty state "No hay citas para hoy"** (línea 265): añadir CTA "Crear nueva cita" → `/appointments?new`.
- **`AppointmentDetailModal`** desde el dashboard ✓ (línea 220-225) — buena UX (no rompe flujo).
- **`AlertsCard` ocupa 1 columna pero parece poco** comparado con `TodayAppointmentsCard` (2 cols). Si no hay alertas, el espacio se desperdicia.
- Personalización: "Buenos días/Buenas tardes/Buenas noches" según hora — humaniza.
- Métricas históricas pequeñas debajo de cada KPI (sparkline 7 días).

### 💡 Funcionalidades extra

- **Widget "Cita en curso ahora mismo"** con cronómetro — para el peluquero/recepción que tiene la pantalla abierta.
- **"Mi peluquería en vivo"** — quién está atendiendo a qué perro ahora mismo. Útil en salones con 3+ peluqueros.
- **Recomendaciones IA** ("hay 3 huecos vacíos mañana 11h-13h, lanza promo flash 15% off via WhatsApp").
- **Versión "TV mode"** del dashboard para pantalla del local (tipo `GymTVPage` del proyecto gym).
- **Modo "Owner" vs "Operativo"** alternable.

---

## 3.3 `ProfilePage.tsx` (286 líneas)

### 🐛 Bugs / fricciones

- **`avatarUrl` como input de texto** (líneas 105-111) — el usuario debe pegar una URL pública. UX muy mala. Falta upload (FilePond / `<input type="file">` + presigned URL al backend).
- **`useEffect` con `setUser`/`setMemberships`** (líneas 27-32) — patrón `setState-in-effect` problemático (cross-cutting #3).
- **Lista de sesiones sin botón "Revocar"** (línea 266-280) — el endpoint `getSessions` existe pero no hay `revokeSession(id)` ni `revokeAll`. Si veo sesión sospechosa, no puedo cerrarla.
- **Sesión actual no marcada** — el usuario no distingue cuál es "esta sesión" vs "otro dispositivo".
- **Cambiar password sin validación de fortaleza** (línea 214 / 226 — minLength=8 igual que Register).
- **`feedback?.ok = 'Contrasena actualizada'`** (línea 166) — no revoca otras sesiones explícitamente. Buen punto para hacer ambas cosas (igual que ResetPassword en Bloque 2).
- **Email mostrado con badge "Sin verificar"** (línea 138-143) pero sin botón "Reenviar verificación". Atajo natural.

### 🎯 Acciones faltantes

- **Upload de avatar** (drag & drop o file picker).
- **Revocar sesión individual** + "Revocar todas las demás".
- **Marcar sesión actual** ("este dispositivo") visualmente.
- **Cambiar email** (con re-verificación obligatoria).
- **Eliminar cuenta** (RGPD: derecho al olvido).
- **Activar 2FA** (TOTP) — UX de enrollment con QR.
- **Preferencias de notificación**: opt-in/out por canal (email / SMS / WhatsApp / push) y por evento (cita confirmada, no-show, cobro, etc.).
- **Cambio de salón activo** (si user tiene >1 membership) — selector visible aquí.
- **Idioma de la cuenta** (es-ES por defecto, preparar i18n).
- **Zona horaria del usuario** (para mostrar horarios correctos cuando trabaje remoto desde otra TZ).
- **Exportar mis datos** (RGPD: derecho de portabilidad).

### 📐 Mejoras UI/UX

- **Pestañas verticales** en lugar de stack: Datos / Seguridad / Notificaciones / Salones / Privacidad. Hoy es vertical largo.
- **`UserAgent` parseado** — mostrar "Chrome en Windows" en lugar del UA crudo (línea 271).
- **Geolocalización aproximada de la IP** ("Madrid, España"). Crítico para detectar sesiones sospechosas.
- **Última actividad** además de `createdAt` (línea 276) — el `createdAt` es cuándo se creó la sesión, no la última vez que se usó.
- **Confirmar cambio de password con segunda contraseña** ya existe (línea 220-231) ✓.
- **Mostrar fortaleza visual del password** mientras se escribe.

### 💡 Funcionalidades extra

- **Notificaciones push del navegador** (web push) — opt-in aquí.
- **Sincronización con Google Calendar / Apple Calendar** del propio user (ver mi agenda desde otro sitio).
- **Logs de seguridad** (cambios de password, intentos fallidos, accesos desde nueva ubicación).
- **Passkey / WebAuthn enrollment** desde aquí.

---

## 3.4 `useSalon`, `getProfile`, `RequireSalon` (cross-cutting)

### `useSalon`
- No leí el hook completo, pero por uso (línea 21 Dashboard) parece resolver `currentSalon` a partir de `memberships` + `currentSalonId`. Verificar que `currentSalonId` se persiste en el authStore al cambiar (cuando exista UI de cambio).

### `me.service.ts`
- ✅ Limpio. `getProfile`, `updateProfile`, `changePassword`, `getSessions`.
- 🎯 Falta: `revokeSession(id)`, `revokeAllSessionsExceptCurrent()`, `requestEmailChange(newEmail)`, `confirmEmailChange(token)`, `enroll2FA`, `verify2FA`, `disable2FA`, `deleteAccount(password)`, `exportData()`.

### `onboarding.service.ts`
- ✅ Solo expone `createSalon(name)`. Coherente con el form actual.
- 🎯 Si crece a multi-step, considerar `POST /onboarding/salon/:id/services`, `:id/groomers`, `:id/import-customers`, `:id/horarios`.

### `RequireSalon`
- ✅ Correcto: redirige a `/onboarding` si `memberships.length === 0`.
- 🐛 No considera el caso `memberships.length > 0 && !currentSalonId` o `currentSalonId` inválido. Si el authStore queda en estado raro (membership eliminada externamente), el user pasa el guard y rompe queries `enabled: !!currentSalon`.

---

## Resumen de prioridades del Bloque 3

### 🚨 Urgente (activación + RGPD)

1. **`OnboardingPage` debe ofrecer un flow real** post-salón: al menos paso 2 "Crear primer servicio" y "Invitar peluquero (o saltar)". Hoy promete 3 pasos y solo hay 1.
2. **`OnboardingPage` debe capturar `?plan=X`** y cualquier param `utm_*` que viniera del registro.
3. **`ProfilePage` debe permitir eliminar cuenta** (RGPD obligatorio).
4. **Upload de avatar** en `ProfilePage` (no URL).
5. **CTA "Reenviar verificación"** cuando el email no está verificado (Dashboard + Profile).

### 🔥 Alta (UX + seguridad)

6. **Selector de salón activo** (cuando user tiene >1 membership) — visible en Dashboard y Profile.
7. **Revocar sesiones individuales y "todas las demás"** en ProfilePage.
8. **Validación de fortaleza de password** + indicador visual.
9. **Fix `daysBetween` mutation bug** en DashboardPage.
10. **Eliminar o mover el `useQuery(['me'])` huérfano** en DashboardPage:60.
11. **Selector de rango temporal** en Dashboard (Hoy/Semana/Mes/Personalizado).
12. **Restaurar tildes y eñes** sistémicamente (cross-cutting #5).

### 🛠️ Media (calidad)

13. KPI cards clickeables → list filtrada.
14. Próximas citas (mañana/semana) en Dashboard.
15. Top servicios / top peluqueros widget.
16. Empty state "No hay citas hoy" con CTA "Crear cita".
17. Geo-IP y UA parseado en sesiones.
18. Pestañas en ProfilePage en lugar de stack.
19. Marcar sesión actual visualmente.
20. Activar 2FA TOTP.
21. Cambio de email con re-verificación.
22. Preferencias de notificación.
23. Refactor del `setState-in-effect` en ProfilePage:27-32.

### 📈 Baja / mejora continua

24. Saludo según hora ("Buenos días / Buenas tardes").
25. Tour guiado tras onboarding (Driver.js).
26. Plantillas de servicios por tipo de peluquería.
27. Import CSV en onboarding.
28. Demo data opcional para explorar la app.
29. Heatmap de ocupación.
30. Modo TV / cartelería.
31. Recomendaciones IA (huecos vacíos → campañas).
32. Notificaciones web push opt-in.
33. Export de datos del user (RGPD portabilidad).
34. WebAuthn / passkey enrollment.

---

## Endpoints backend identificados (faltan / mejorar)

- [ ] `POST /api/onboarding/salon/:id/services` — crear servicios pre-cargados desde plantilla
- [ ] `POST /api/onboarding/salon/:id/services/templates` — devolver plantillas por tipo
- [ ] `POST /api/onboarding/salon/:id/groomers` — alta de peluqueros desde onboarding
- [ ] `POST /api/onboarding/salon/:id/horarios` — config horario base
- [ ] `POST /api/onboarding/salon/:id/import-customers` — bulk import CSV/Excel
- [ ] `GET /api/onboarding/progress` — devolver estado del flow para resume
- [ ] `POST /api/me/avatar` — upload de avatar (multipart o presigned URL)
- [ ] `DELETE /api/me/sessions/:id` — revocar sesión
- [ ] `DELETE /api/me/sessions` — revocar todas las demás (excepto la actual)
- [ ] `POST /api/me/email-change/request` — solicitar cambio de email
- [ ] `POST /api/me/email-change/confirm` — confirmar con token
- [ ] `POST /api/me/2fa/enroll` + `/verify` + `/disable` — TOTP lifecycle
- [ ] `DELETE /api/me` — eliminar cuenta (RGPD)
- [ ] `GET /api/me/export` — descargar todos mis datos (RGPD)
- [ ] `PATCH /api/me/preferences` — opt-in/out canales y eventos
- [ ] `POST /api/me/salon/:id/activate` — cambiar salón activo (probablemente ya existe, verificar)
- [ ] `GET /api/dashboard/next-appointments?days=N` — próximas citas
- [ ] `GET /api/dashboard/top-services?from&to` + `/top-groomers` — top performers
- [ ] `GET /api/dashboard/occupancy-heatmap?from&to` — heatmap
- [ ] `GET /api/dashboard/at-risk-customers` — clientes sin volver en N días
- [ ] `GET /api/dashboard/alerts` — endpoint unificado de alertas (hoy se compone de 3 queries)

---

## Siguiente paso sugerido

Antes de saltar al Bloque 4, decidir con el Owner si el **onboarding va a expandirse de verdad** (multi-step real) o si la apuesta es "user crea salón rápido y aprende sobre la marcha". Decisión estratégica:

- **Multi-step largo** → más activation, más complejidad, más mantenimiento.
- **Mínimo + tour guiado in-app** → menos fricción inicial, pero aceptas que el user llega al dashboard vacío.

La elección afecta a tasks 1-4 (urgente) y al diseño del Bloque 4 (Agenda) — porque si el onboarding no carga servicios/peluqueros, la primera vez en `/appointments` es una pantalla casi vacía.

Cuando me digas, vamos con `bloque 4` (Agenda + citas).
