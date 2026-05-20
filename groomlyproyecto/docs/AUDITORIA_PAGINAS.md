# Auditoría Páginas peluguau (Groomly) — Plan por bloques

> **Total:** 63 páginas · 16 bloques
> **Marca pública:** peluguau · **Codebase técnico:** groomly-* (no renombrar identificadores)
> **Referencias previas:**
> - [AUDITORIA-2026-05-13.md](../AUDITORIA-2026-05-13.md) — auditoría técnica reciente (18 errores TS en build, 5 violaciones React Hooks)
> - [AUDITORIA_GROOMLY.md](../AUDITORIA_GROOMLY.md) — análisis estratégico (oferta / funnel / posicionamiento)
> - [DOCUMENTACION_GROOMLY.md](../DOCUMENTACION_GROOMLY.md) — documentación canónica del producto
> - [sprints/](../sprints/) — sprint-00 fundación → sprint-07 SaaS
>
> **Última actualización:** 2026-05-16

---

## Cómo usar este plan

1. Elige un bloque por su número.
2. Pide: `auditar bloque N` (o `arreglar bloque N` si quieres ir directo a fixes).
3. Por cada página del bloque revisamos:
   - 🐛 **Bugs visibles** (errores TS, render loops, datos rotos, build roto)
   - 🎭 **Mock data persistente** que debería venir del backend
   - 🔘 **Botones inertes** sin handler real
   - 💾 **Persistencia local** que se pierde al recargar (useState en vez de API)
   - 🎯 **Acciones faltantes** que la página claramente necesita
   - 📐 **Mejoras UI/UX** (filtros, búsqueda, paginación, validación, jerarquía visual)
   - 💡 **Funcionalidades extra** propuestas (lo que diferencia a peluguau de MoeGo/Gingr/Pawfinity)
   - 🌐 **Branding** — cualquier "Groomly" visible al usuario debe pasar a "peluguau"
4. Al terminar un bloque, marca `- [x]` su línea en "Progreso global".

---

## Progreso global

- [~] **Bloque 1** — Landing pública peluguau (4) → [auditoria-bloque-01-landing.md](./auditoria-bloque-01-landing.md) · 🟡 Auditado, pendiente de acción
- [~] **Bloque 2** — Autenticación e invitaciones (6) → [auditoria-bloque-02-auth.md](./auditoria-bloque-02-auth.md) · 🟡 Auditado, pendiente de acción
- [~] **Bloque 3** — Onboarding y dashboard principal (3) → [auditoria-bloque-03-onboarding-dashboard.md](./auditoria-bloque-03-onboarding-dashboard.md) · 🟡 Auditado, pendiente de acción
- [~] **Bloque 4** — Agenda y citas (1 + vistas/modales) → [auditoria-bloque-04-agenda.md](./auditoria-bloque-04-agenda.md) · 🟡 Auditado, pendiente de acción
- [~] **Bloque 5** — Clientes y mascotas (8) → [auditoria-bloque-05-clientes-mascotas.md](./auditoria-bloque-05-clientes-mascotas.md) · 🟡 Auditado, pendiente de acción
- [~] **Bloque 6** — Servicios y peluqueros (9) → [auditoria-bloque-06-servicios-peluqueros.md](./auditoria-bloque-06-servicios-peluqueros.md) · 🟡 Auditado, pendiente de acción
- [~] **Bloque 7** — Equipo multi-user (1) → [auditoria-bloque-07-equipo.md](./auditoria-bloque-07-equipo.md) · 🟡 Auditado, pendiente de acción
- [~] **Bloque 8** — Finanzas: facturación (4) → [auditoria-bloque-08-finanzas-facturacion.md](./auditoria-bloque-08-finanzas-facturacion.md) · 🟡 Auditado, pendiente de acción
- [~] **Bloque 9** — Finanzas: operaciones (4) → [auditoria-bloque-09-finanzas-operaciones.md](./auditoria-bloque-09-finanzas-operaciones.md) · 🟡 Auditado, pendiente de acción
- [~] **Bloque 10** — Fidelización y marketing (4) → [auditoria-bloque-10-fidelizacion.md](./auditoria-bloque-10-fidelizacion.md) · 🟡 Auditado, pendiente de acción
- [ ] **Bloque 11** — Reportes y configuración (2)
- [ ] **Bloque 12** — Portal cliente: core (5)
- [ ] **Bloque 13** — Portal cliente: extras (4)
- [ ] **Bloque 14** — Plataforma super admin: operativa (4)
- [ ] **Bloque 15** — Plataforma: facturación y auditoría (3)
- [ ] **Bloque 16** — Páginas globales (1)

**Total páginas:** 4+6+3+1+8+9+1+4+4+4+2+5+4+4+3+1 = **63** ✓

---

## 🚨 Hallazgos críticos previos

Antes de entrar en bloques, hallazgos visibles que afectan a todo el frontend (extraídos de `AUDITORIA-2026-05-13.md` + grep en estado actual del repo):

1. **El frontend NO compila** — `npx tsc -b --noEmit` arroja 18 errores TS, casi todos en el bloque del portal cliente (Bloque 12). Raíz: `PortalBookAppointmentPage.tsx:27-29` pasa `queryFn: listServices` a `useQuery`, pero las firmas no encajan y TS infiere `data` como `{}` (cascada). Fix: `queryFn: () => listServices()`.
2. **`PortalLayout.tsx:29`** — `useAuthStore((s) => s.salon)` accede a una propiedad que no existe en `AuthState`. Usar `useAuthStore(selectCurrentMembership)?.salon` (Bloque 12).
3. **`portal.service.ts:2`** — importa `Salon` desde `@/types/api` que no exporta ese tipo. Usar `SalonSummary` o añadir el tipo (Bloque 12).
4. **5 violaciones React Hooks** que ESLint marca y que rompen el comportamiento:
   - `QuickPetCreateModal.tsx:42` — `setName('')` dentro de `useEffect` (Bloque 5)
   - `AppointmentModal.tsx:98` — múltiples `setState` en `useEffect` (Bloque 4)
   - `CustomersListPage.tsx:26` — `setPage(1)` en `useEffect` (Bloque 5)
   - `SellPackageModal.tsx:44` — `Date.now()` en render (impurity, Bloque 5)
   - `GroomerSchedulePage.tsx:42` — `setEntries()` en `useEffect` (Bloque 6)
5. **`LoyaltyPage.tsx:263`** — uso de `confirm()` nativo del navegador (`if (confirm("Eliminar regla "...?"))`). Sustituir por modal coherente con el sistema de diseño (Bloque 10).
6. **Inconsistencias backend menores** — `TEST_DATABASE_URL` apunta a la misma DB que producción (riesgo en runs paralelos); Prisma 6.6.0 con 7.8.0 disponible (no crítico).
7. **Branding pendiente en landing** — verificar que `groomly-landing/` no exponga texto "Groomly" al usuario (la marca pública es **peluguau**). En `groomly-web/src/pages/` el grep ya da limpio.

---

## Bloque 1 — Landing pública peluguau

**Páginas:** 4
- [ ] `groomly-landing/app/page.tsx` — Home
- [ ] `groomly-landing/app/precios/page.tsx` — Pricing
- [ ] `groomly-landing/app/demo/page.tsx` — Demo / petición de prueba
- [ ] `groomly-landing/app/registro/page.tsx` — Registro desde landing

**Foco de auditoría:**
- **page.tsx (Home)**: Hero con promesa medible (no "gestiona tu peluquería" — usar "X horas a la semana recuperadas / Y€ más de ticket medio", ver `AUDITORIA_GROOMLY.md` sección Hormozi)
- **page.tsx**: prueba social verificable (testimonios con nombre real de peluquería, screenshots de panel, número de citas gestionadas) vs lorem ipsum
- **page.tsx**: CTAs jerarquizados (primario "Probar gratis 14 días" — secundario "Ver demo en vivo")
- **page.tsx**: `<head>` SEO (title, description, OG image), schema.org/SoftwareApplication, sitemap.xml, robots.txt
- **page.tsx**: Core Web Vitals (LCP imagen del hero, CLS de fonts), Next 16 Image optimization, fonts via next/font
- **precios/page.tsx**: comparativa Free/$19/$49/$99 — feature matrix con tooltip; "más popular" en uno de los tiers
- **precios/page.tsx**: toggle anual/mensual con descuento visible (palanca de ARR sin tocar pricing real)
- **precios/page.tsx**: FAQ con objeciones reales (puedo migrar mis datos, qué pasa si cancelo, hay permanencia, soporte incluido)
- **precios/page.tsx**: garantía pública (ver Hormozi en `AUDITORIA_GROOMLY.md`: "si no recuperas 10h/semana en 60 días, devolución completa")
- **demo/page.tsx**: ¿formulario que dispara `POST /api/landing/demo-request` o solo redirige a Calendly?
- **demo/page.tsx**: lead capture mínimo (nombre, peluquería, nº staff, email) para calificar
- **demo/page.tsx**: confirmación post-submit (email automático con calendario o pantalla "te llamaremos en X horas")
- **registro/page.tsx**: ¿se duplica con `groomly-web/auth/RegisterPage`? Si sí, decidir si la landing manda al `/register` de la SPA o es flujo independiente
- **registro/page.tsx**: trial 14 días sin tarjeta vs con tarjeta requerida (`AUDITORIA_GROOMLY.md` recomienda con tarjeta para calidad de leads)
- **Branding global**: ningún literal "Groomly" en texto visible (alt, title, meta, footer, copy). `groomly-` solo en código

**💡 Funcionalidades extra a considerar:**
- ROI calculator interactivo en el hero ("tengo X citas/mes, gano Y€ con peluguau")
- Demo interactiva sin registro (sandbox con datos fake, pre-cargado con perros tipo)
- Página `/comparativa-moego` específica para SEO comparativo
- Página `/nicho-X` para nichos verticales (peluquería de raza fina, peluquería móvil, etc.)

---

## Bloque 2 — Autenticación e invitaciones

**Páginas:** 6
- [ ] `groomly-web/src/pages/auth/LoginPage.tsx`
- [ ] `groomly-web/src/pages/auth/RegisterPage.tsx`
- [ ] `groomly-web/src/pages/auth/ForgotPasswordPage.tsx`
- [ ] `groomly-web/src/pages/auth/ResetPasswordPage.tsx`
- [ ] `groomly-web/src/pages/auth/VerifyEmailPage.tsx`
- [ ] `groomly-web/src/pages/auth/AcceptInvitePage.tsx`

**Foco de auditoría:**
- **LoginPage**: redirect por rol tras login (OWNER → `/`, STAFF → `/`, PORTAL_CLIENT → `/portal`, PLATFORM_ADMIN → `/platform`)
- **LoginPage**: "Recordarme" — persistencia de email en localStorage (no de password)
- **LoginPage**: rate-limit feedback del backend (`429 Too Many Requests` con tiempo restante) — el limiter es 30/15min en auth
- **LoginPage**: mensajes de error precisos pero no enumerativos (no decir "este email no existe" — abre vector de enumeración de usuarios)
- **RegisterPage**: flujo trial 14d (¿auto-asigna plan Starter o queda en limbo hasta primer pago?)
- **RegisterPage**: validación email + password mínimo (12 chars según política), confirmación visible de fortaleza
- **RegisterPage**: aceptación T&C/privacidad RGPD, opt-in marketing separado
- **RegisterPage**: deduplicar con `groomly-landing/registro` o redirigir a uno solo
- **ForgotPasswordPage**: respuesta uniforme exista o no el email (anti-enumeration)
- **ResetPasswordPage**: validación de token (expiración, single-use), revocar sesiones activas tras reset
- **VerifyEmailPage**: handler `?token=...`, reenvío con cooldown, qué pasa si el usuario ya verificó
- **AcceptInvitePage**: `/accept-invite/:token` — flujo si el usuario ya existe (link a login con auto-join al salón) vs si es nuevo (registro con token preasignado)
- **AcceptInvitePage**: rol y salón quedan claros antes de aceptar (mostrar nombre del salón, rol, quién invita)
- **AcceptInvitePage**: expiración de invite, revocación desde TeamPage

**💡 Funcionalidades extra a considerar:**
- 2FA opcional (TOTP) — diferenciador en peluquerías premium con muchos staff
- Magic link (sin password) — UX peluguau-grade
- SSO Google/Apple para portal cliente — fricción mínima

---

## Bloque 3 — Onboarding y dashboard principal

**Páginas:** 3
- [ ] `groomly-web/src/pages/OnboardingPage.tsx`
- [ ] `groomly-web/src/pages/DashboardPage.tsx`
- [ ] `groomly-web/src/pages/ProfilePage.tsx`

**Foco de auditoría:**
- **OnboardingPage**: pasos (datos salón → horarios → servicios → peluqueros → primer cliente/mascota); progreso visible, skip permitido
- **OnboardingPage**: ¿guarda parcial o exige completar? Si abandono y vuelvo, ¿continúa donde estaba?
- **OnboardingPage**: import CSV de clientes/mascotas (clave para migración desde MoeGo/Excel) — flagged en `AUDITORIA_GROOMLY.md` como diferenciador
- **OnboardingPage**: plantillas de servicios pre-cargadas por raza/tamaño (corte estándar perro pequeño, baño, etc.) para arranque rápido
- **OnboardingPage**: integración Stripe trial + tarjeta (si la estrategia es "tarjeta requerida" en trial)
- **DashboardPage**: KPIs reales vs hardcoded — citas hoy, no-shows, ingresos del día, próxima cita, alertas
- **DashboardPage**: filtro temporal (hoy / esta semana / este mes)
- **DashboardPage**: vista diferenciada por rol — Owner ve ingresos, Groomer ve solo su agenda
- **DashboardPage**: panel de alertas vacío `"Sin alertas. Todo en orden."` (línea 327) — definir qué dispara una alerta (cita en 15min sin confirmar, factura vencida, stock bajo, no-show repetido)
- **DashboardPage**: click-through a páginas de detalle (cada KPI debe llevar a su lista filtrada)
- **DashboardPage**: heatmap de ocupación semanal (huecos vacíos en franjas que se podrían llenar)
- **ProfilePage**: edición de datos personales, cambio de password, gestión de sesiones activas, eliminar cuenta (RGPD)
- **ProfilePage**: cambio de salón activo (si el usuario es miembro de varios), avatar/foto

**💡 Funcionalidades extra a considerar:**
- Onboarding asistido en vivo (vídeo grabado dentro de la pantalla) — diferenciador vs autoservicio
- Dashboard "tipo Whatsapp" — chat con cliente y vista de hoy en la misma pantalla
- Widget "próxima cita en X min" con prep recordado (perro miedoso, sin nudos, etc.)

---

## Bloque 4 — Agenda y citas

**Páginas:** 1 + vistas/modales
- [ ] `groomly-web/src/pages/appointments/AppointmentsCalendarPage.tsx`
- [ ] `groomly-web/src/pages/appointments/DayByGroomerView.tsx` (vista)
- [ ] `groomly-web/src/pages/appointments/AppointmentModal.tsx` (modal)
- [ ] `groomly-web/src/pages/appointments/AppointmentDetailModal.tsx` (modal)

**Foco de auditoría:**
- **AppointmentsCalendarPage**: vistas día/semana/mes; drag&drop para reprogramar; bloqueo de horario (vacaciones, comida)
- **AppointmentsCalendarPage**: filtro por peluquero (línea 334 `"Todos los peluqueros"` ya existe — verificar persistencia entre sesiones)
- **AppointmentsCalendarPage**: solapamientos (el backend ya valida, pero la UI debe avisar antes del submit)
- **AppointmentsCalendarPage**: límites de plan (Starter 200 citas/mes) — banner cuando se acerque al límite
- **DayByGroomerView**: vista tipo "Gantt" por peluquero con huecos visibles; click para crear cita en ese hueco
- **DayByGroomerView**: indicador de duración del servicio según raza/tamaño (no todos los cortes duran igual)
- **AppointmentModal**: 🐛 **bug ESLint conocido** — múltiples `setState` dentro de `useEffect` (línea 98). Refactor: convertir a `onOpen`/`onClose` handlers o usar `key` prop para forzar remount
- **AppointmentModal**: campos clave — cliente, mascota (filtrado por cliente), servicio, peluquero, fecha/hora, duración estimada, notas internas
- **AppointmentModal**: pre-relleno si se crea desde click en hueco vacío (fecha+peluquero ya seleccionados)
- **AppointmentModal**: "creación rápida de mascota" si el cliente trae perro nuevo — ¿se usa `QuickPetCreateModal.tsx` aquí?
- **AppointmentDetailModal**: cambio de estado (pending → confirmed → in_progress → completed → no-show / cancelled)
- **AppointmentDetailModal**: histórico del estado, motivo de cancelación, foto antes/después
- **AppointmentDetailModal**: facturación inline (crear factura desde la cita completada)

**💡 Funcionalidades extra a considerar:**
- Recordatorios automáticos SMS/WhatsApp 24h y 2h antes — reduce no-show drásticamente
- Recurrencia automática (cada 4 / 6 / 8 semanas vuelve la cita) con notificación al cliente
- Depósito anti-no-show (Stripe hold del 30% para reservas portal) — fuerte diferenciador
- "Lista de inteligente": si se libera hueco, notificar a clientes en waitlist (cruza con Bloque 10)
- Bloqueo automático de huecos cortos sin valor (15min entre cortes largos) según reglas

---

## Bloque 5 — Clientes y mascotas

**Páginas:** 8
- [ ] `groomly-web/src/pages/customers/CustomersListPage.tsx`
- [ ] `groomly-web/src/pages/customers/CustomerCreatePage.tsx`
- [ ] `groomly-web/src/pages/customers/CustomerDetailPage.tsx`
- [ ] `groomly-web/src/pages/customers/CustomerEditPage.tsx`
- [ ] `groomly-web/src/pages/pets/PetsListPage.tsx`
- [ ] `groomly-web/src/pages/pets/PetCreatePage.tsx`
- [ ] `groomly-web/src/pages/pets/PetDetailPage.tsx`
- [ ] `groomly-web/src/pages/pets/PetEditPage.tsx`

**Foco de auditoría:**
- **CustomersListPage**: 🐛 **bug ESLint conocido** — `setPage(1)` en `useEffect` (línea 26). Refactor: derivar `page` de filtros o resetear en el handler que cambia el filtro
- **CustomersListPage**: búsqueda por nombre/email/teléfono con debounce; filtros (con/sin cita futura, con saldo pendiente, sin actividad >90 días)
- **CustomersListPage**: paginación; export CSV; bulk actions (etiquetar, enviar campaña)
- **CustomerCreatePage** + **CustomerEditPage**: validación teléfono internacional (libphonenumber-js); avatar; consentimiento RGPD; dirección con autocompletado
- **CustomerDetailPage**: ficha 360 — datos personales, mascotas, historial de citas, facturas, pagos, paquetes activos, puntos loyalty, notas
- **CustomerDetailPage**: tab "Comunicaciones" (emails / SMS / WhatsApp enviados) — ¿se persiste o solo `useState`?
- **CustomerDetailPage**: NPS / valoración del cliente sobre el salón
- **CustomerDetailPage**: `SellPackageModal.tsx` — 🐛 **bug ESLint conocido** — `Date.now()` en render (línea 44). Mover a `useMemo` o handler de apertura
- **PetsListPage**: filtro por tamaño ya implementado (línea 162 `SIZE_LABELS`); falta filtro por raza, por edad, por última visita
- **PetCreatePage** + **PetEditPage**: 🐛 **bug ESLint conocido** en `QuickPetCreateModal.tsx:42` — `setName('')` en `useEffect`
- **PetCreatePage** + **PetEditPage**: campos clave — nombre, raza, tamaño, peso, fecha nacimiento, sexo, esterilización, alergias, vacunas, carácter (miedoso/agresivo/tranquilo)
- **PetDetailPage**: histórico de cortes con fotos antes/después (diferenciador fuerte)
- **PetDetailPage**: cartilla de vacunación (upload PDF/imagen, alertas de vencimiento)
- **PetDetailPage**: ficha sanitaria — enfermedades crónicas, medicaciones, contacto del veterinario
- **PetDetailPage**: timeline (alta, citas, cambios de servicio, alertas)
- **CustomerForm / PetForm**: ambos son componentes reutilizables entre Create y Edit — verificar que el reset/inicialización no genere bug de "se queda con datos del anterior"

**💡 Funcionalidades extra a considerar:**
- Reconocimiento de raza desde foto del perro (Vision API) — onboarding 10x más rápido
- Plantilla de corte por raza (Schnauzer estándar, Yorkie show, etc.) con preferencia guardada por mascota
- "Carnet digital" de la mascota — el dueño accede vía QR sin login
- Birthday automation: el día del cumpleaños del perro, mail con cupón
- Detección de inactividad (>60d sin cita) → trigger automático a marketing (Bloque 10)

---

## Bloque 6 — Servicios y peluqueros

**Páginas:** 9
- [ ] `groomly-web/src/pages/services/ServicesListPage.tsx`
- [ ] `groomly-web/src/pages/services/ServiceCreatePage.tsx`
- [ ] `groomly-web/src/pages/services/ServiceEditPage.tsx`
- [ ] `groomly-web/src/pages/groomers/GroomersListPage.tsx`
- [ ] `groomly-web/src/pages/groomers/GroomerCreatePage.tsx`
- [ ] `groomly-web/src/pages/groomers/GroomerDetailPage.tsx`
- [ ] `groomly-web/src/pages/groomers/GroomerEditPage.tsx`
- [ ] `groomly-web/src/pages/groomers/GroomerSchedulePage.tsx`
- [ ] `groomly-web/src/pages/groomers/GroomerCalendarPage.tsx`

**Foco de auditoría:**
- **ServicesListPage**: categorías ya implementadas (línea 73 `'Todos'`); grid denso con todas las tarjetas (línea 460)
- **ServicesListPage**: precio fijo vs precio por raza/tamaño/peso (peluquerías premium cobran por raza)
- **ServicesListPage**: duración estimada por servicio + override por mascota
- **ServiceCreatePage** + **ServiceEditPage**: comisión por defecto (% que se lleva el peluquero); kit asociado (Bloque 9 Inventario)
- **ServiceForm**: validación de precio mínimo, duración no negativa, imagen del servicio (foto del corte tipo)
- **GroomersListPage**: directorio con especialidades, valoración, citas/mes, ingresos generados
- **GroomerCreatePage** + **GroomerEditPage**: especialidades (raza/tipo), horario, color (para calendario), foto, idiomas
- **GroomerDetailPage**: ficha 360 — citas atendidas, valoración media, comisiones del mes, no-shows asignados
- **GroomerSchedulePage**: 🐛 **bug ESLint conocido** — `setEntries()` en `useEffect` (línea 42). Refactor a derivación o handler
- **GroomerSchedulePage**: turno semanal (M-D L-V, cierre, descansos), vacaciones, festivos
- **GroomerSchedulePage**: bloqueos puntuales (formación, baja médica) con motivo
- **GroomerCalendarPage**: vista personal del peluquero (su agenda del día/semana) — útil si el peluquero accede con su login
- **GroomerCalendarPage**: estadísticas inline (ocupación, hueco más cercano, próxima cita)

**💡 Funcionalidades extra a considerar:**
- Mapping servicio ↔ duración real por raza/tamaño (a partir de histórico) — auto-ajuste de duraciones
- "Personal trainer pattern": clientes pueden pedir peluquero preferido al reservar
- Comparativa de peluqueros (KPIs internos para el dueño) — quién tiene más no-shows, quién genera más ingresos
- Calendario público compartible (el peluquero comparte un link tipo Calendly para sus huecos)

---

## Bloque 7 — Equipo multi-user

**Páginas:** 1
- [ ] `groomly-web/src/pages/team/TeamPage.tsx`
- (modal: `MemberFormModal.tsx`)

**Foco de auditoría:**
- **TeamPage**: lista de miembros del salón (OWNER, MANAGER, STAFF, FRONT_DESK) con su rol, estado, último acceso
- **TeamPage**: invitación por email con rol pre-asignado → genera `AcceptInvitePage` token
- **TeamPage**: revocar acceso, cambiar rol, pausar usuario sin borrarlo
- **TeamPage**: límite por plan (Starter 3 staff, Pro 8, Business ilimitado — coherente con `planLimits.test.ts`); banner cuando se acerca
- **TeamPage**: permisos granulares por feature (¿el STAFF ve ingresos? ¿el FRONT_DESK puede crear facturas?)
- **MemberFormModal**: validación email único en salón, rol bloqueado para OWNER (no se puede degradar al único Owner)
- **MemberFormModal**: ¿se distingue entre "es usuario con login" vs "es peluquero solo identificado en agenda" (Groomer del Bloque 6)? Aclarar relación Groomer ↔ Member

**💡 Funcionalidades extra a considerar:**
- Auditoría de acciones por miembro (quién canceló qué cita, quién modificó qué factura) — cruza con `PlatformAuditPage` pero a nivel salón
- Permisos por horario (un FRONT_DESK solo puede actuar durante el turno)
- Login con PIN rápido en tablet compartida (kiosk del mostrador)

---

## Bloque 8 — Finanzas: facturación

**Páginas:** 4
- [ ] `groomly-web/src/pages/finance/FinanceDashboardPage.tsx`
- [ ] `groomly-web/src/pages/finance/InvoicesListPage.tsx`
- [ ] `groomly-web/src/pages/finance/InvoiceCreatePage.tsx`
- [ ] `groomly-web/src/pages/finance/InvoiceDetailPage.tsx`

**Foco de auditoría:**
- **FinanceDashboardPage**: ingresos del periodo, gastos, neto, MRR, comparativa MoM
- **FinanceDashboardPage**: top servicios por ingresos, top clientes, top peluqueros
- **FinanceDashboardPage**: previsión de caja basada en citas confirmadas futuras
- **InvoicesListPage**: filtros (estado pagado/pendiente/vencido, rango fechas, cliente, peluquero); paginación; export CSV
- **InvoicesListPage**: serie de facturación (numeración legal correlativa) — auditar que no se salta números
- **InvoiceCreatePage**: línea de servicio desde cita completada (auto-carga); línea de producto (Inventario, Bloque 9); descuentos; IVA según producto
- **InvoiceCreatePage**: validación cliente activo, mascota perteneciente al cliente, total ≥ 0
- **InvoiceDetailPage**: PDF descargable, envío por email al cliente, marcador de pagado/pendiente
- **InvoiceDetailPage**: método de pago (línea 380 `<Label htmlFor="pay-method">` ya existe) — efectivo, tarjeta, transferencia, Bizum, Stripe
- **InvoiceDetailPage**: factura rectificativa, abono parcial, multi-pago (parte hoy + parte el día 30)

**💡 Funcionalidades extra a considerar:**
- **Verifactu / SII** (España) — obligatorio desde 2026 para facturas electrónicas; diferenciador real vs competencia internacional
- TPV físico integrado (lector de tarjeta vía Stripe Terminal o Redsys POS)
- Cobro con QR Bizum desde la página de detalle
- Recordatorio automático de facturas vencidas (email + WhatsApp)
- Conciliación bancaria (subir extracto, matchear pagos)

---

## Bloque 9 — Finanzas: operaciones

**Páginas:** 4
- [ ] `groomly-web/src/pages/finance/ExpensesPage.tsx`
- [ ] `groomly-web/src/pages/finance/InventoryPage.tsx`
- [ ] `groomly-web/src/pages/finance/CommissionsPage.tsx`
- [ ] `groomly-web/src/pages/finance/FinanceReportsPage.tsx`

**Foco de auditoría:**
- **ExpensesPage**: registro de gasto con categoría (suministros, alquiler, sueldos, marketing); ticket adjunto (foto/PDF)
- **ExpensesPage**: recurrentes (alquiler mensual auto-generado) vs puntuales
- **ExpensesPage**: filtro por proveedor, categoría, periodo; export para asesoría fiscal
- **InventoryPage**: productos (champú, perfume, accesorios) con stock, mínimo, proveedor, precio compra vs venta
- **InventoryPage**: alertas de stock bajo (cruza con DashboardPage alerts)
- **InventoryPage**: movimientos (entrada por compra, salida por venta en factura, mermas)
- **InventoryPage**: kits por servicio (corte estándar consume X ml de champú) → descuento automático al completar cita
- **CommissionsPage**: filtro por peluquero (línea 141 `<option value="">Todos</option>` ya existe)
- **CommissionsPage**: cálculo por modelo (% sobre servicio, fijo por cita, mixto)
- **CommissionsPage**: liquidación mensual con comprobante PDF descargable
- **CommissionsPage**: estado "Pagado" — ¿hardcoded o flujo real con confirmación bancaria?
- **FinanceReportsPage**: ingresos por categoría, margen, evolución temporal, comparativa periodos
- **FinanceReportsPage**: gráficos Recharts coherentes (mismo eje X, mismo formato fecha)
- **FinanceReportsPage**: "Exportar CSV" / "Descargar reporte PDF" con handler real (no botón inerte)
- **FinanceReportsPage**: previsión de caja, LTV por cliente, CAC si hay datos de marketing

**💡 Funcionalidades extra a considerar:**
- Punto de equilibrio del salón (cuántas citas/mes para cubrir costes fijos)
- Pricing dinámico: huecos vacíos en martes a las 11h → -10% automático
- Conexión contable (Holded, Quipu, Contasimple) para exportar diario contable
- Predicción de demanda por época (Navidad, verano) basada en histórico

---

## Bloque 10 — Fidelización y marketing

**Páginas:** 4
- [ ] `groomly-web/src/pages/loyalty/LoyaltyPage.tsx`
- [ ] `groomly-web/src/pages/coupons/CouponsPage.tsx`
- [ ] `groomly-web/src/pages/packages/PackagesPage.tsx`
- [ ] `groomly-web/src/pages/waitlist/WaitlistPage.tsx`

**Foco de auditoría:**
- **LoyaltyPage**: 🐛 `confirm("Eliminar regla...")` nativo en línea 263 — sustituir por modal del sistema
- **LoyaltyPage**: reglas de puntos (filtro por categoría/servicio, líneas 141/364); cuántos puntos por euro gastado, multiplicador por servicio premium
- **LoyaltyPage**: canjes (descuento, servicio gratis, producto); fecha de expiración de puntos
- **LoyaltyPage**: leaderboard (clientes más fieles) — opcional, para gamificación interna
- **CouponsPage**: tipo (% / fijo / servicio gratis), cantidad, uso por cliente (1x / ilimitado), expiración, código
- **CouponsPage**: bulk generation (100 cupones de bienvenida con códigos únicos)
- **CouponsPage**: tracking de uso (cuántos generados, canjeados, ingresos atribuidos)
- **PackagesPage**: bonos prepago (5 cortes por 100€), expiración, transferible entre mascotas del mismo cliente
- **PackagesPage**: venta del paquete desde `SellPackageModal` (ver bug Bloque 5)
- **PackagesPage**: consumo automático al completar cita; saldo visible al cliente en portal
- **WaitlistPage**: filtros ya implementados (línea 79 `STATUS_LABELS`)
- **WaitlistPage**: cliente + mascota + servicio + franja preferida; cuando se libere hueco compatible → notificación
- **WaitlistPage**: ¿hay job/cron que matchea waitlist con huecos liberados o es manual?
- **WaitlistFormModal**: validación de franjas no contradictorias, mascota del cliente

**💡 Funcionalidades extra a considerar:**
- Campañas WhatsApp segmentadas (clientes inactivos 60d, cumpleaños del perro, baño antes de Navidad)
- Referrals: cada cliente con código único; cuando alguien lo usa, ambos ganan crédito
- Reseñas Google integradas — tras cita completada, mail con link directo para review
- A/B testing de plantillas de marketing (qué asunto convierte mejor)
- Birthday Box: paquete físico de productos que se envía el día del cumpleaños del perro (upsell potente)

---

## Bloque 11 — Reportes y configuración

**Páginas:** 2
- [ ] `groomly-web/src/pages/reports/ReportsPage.tsx`
- [ ] `groomly-web/src/pages/settings/SettingsBillingPage.tsx`
- (layout: `settings/SettingsLayout.tsx`)

**Foco de auditoría:**
- **ReportsPage** (ruta `/reports/groomers`): reportes operativos del staff — ocupación, citas, no-shows, valoración
- **ReportsPage**: filtros temporales, comparativa entre peluqueros, export CSV/PDF
- **ReportsPage**: ¿solo "groomers" o crecerá a `/reports/<dimension>` (clientes, servicios, productos)?
- **SettingsBillingPage**: estado de suscripción, próxima fecha de cobro, método de pago, descarga de facturas
- **SettingsBillingPage**: cambio de plan (upgrade/downgrade) — flujo Stripe Checkout
- **SettingsBillingPage**: aviso de pago fallido (línea 146 `"Hay un problema con el ultimo pago..."`) con CTA al portal Stripe
- **SettingsBillingPage**: comportamiento en modo mock (línea 61 `if (resp.isMock)`) — testear que el toggle Stripe live/test funciona
- **SettingsBillingPage**: cancelación de suscripción con motivo (datos para retention) + retención inline (oferta de descuento si va a cancelar)
- **SettingsLayout**: por ahora solo `billing` — preparar futuras secciones (perfil del salón, integraciones, notificaciones, marca/branding)

**💡 Funcionalidades extra a considerar:**
- Reporte ejecutivo mensual auto-enviado al OWNER (PDF con KPIs)
- Dashboard "modo dueño" (alto nivel) vs "modo operativo" (granular)
- Sección Settings → Notificaciones (qué eventos disparan email/SMS/WhatsApp)
- Sección Settings → Marca/Branding (logo, colores, plantillas email) para personalizar comunicaciones al cliente
- Sección Settings → Integraciones (Stripe, Google Calendar, WhatsApp Business, Mailchimp, Holded)

---

## Bloque 12 — Portal cliente: core

**Páginas:** 5
- [ ] `groomly-web/src/pages/portal/PortalDashboardPage.tsx`
- [ ] `groomly-web/src/pages/portal/PortalAppointmentsPage.tsx`
- [ ] `groomly-web/src/pages/portal/PortalBookAppointmentPage.tsx`
- [ ] `groomly-web/src/pages/portal/PortalPetsPage.tsx`
- [ ] `groomly-web/src/pages/portal/PortalPetDetailPage.tsx`
- (layout: `portal/PortalLayout.tsx`)

**Foco de auditoría:**
- 🚨 **Este bloque es el que tiene el build roto.** Ver Hallazgos críticos previos (puntos 1-3). Hay que arreglar antes de seguir auditando.
- **PortalLayout**: 🐛 `useAuthStore((s) => s.salon)` (línea 29) — propiedad inexistente. Usar selector correcto
- **PortalDashboardPage**: 🐛 `past` declarado y no usado (línea 35) — limpiar
- **PortalDashboardPage**: KPIs del cliente — próxima cita, puntos loyalty, factura pendiente, paquetes activos
- **PortalDashboardPage**: bienvenida personalizada por nombre del cliente y mascotas
- **PortalAppointmentsPage**: lista de citas pasadas y futuras; cancelación con ventana mínima (según política salón); reagendar
- **PortalAppointmentsPage**: descarga de factura asociada a la cita
- **PortalBookAppointmentPage**: 🐛 **build roto** — `queryFn: listServices` mal pasado (línea 27-29); `data` inferido como `{}`, casca `.filter()`, `.reduce()`, `.map()`. Fix: `queryFn: () => listServices()`
- **PortalBookAppointmentPage**: flujo (mascota → servicio → peluquero opcional → fecha/hora → confirmar); precio total visible antes de confirmar
- **PortalBookAppointmentPage**: depósito anti-no-show (Stripe hold) si el salón lo configura
- **PortalPetsPage**: lista de mascotas del cliente; alta de nueva mascota desde portal
- **PortalPetDetailPage**: histórico de cortes con fotos antes/después (visibles al cliente); preferencias guardadas (corte preferido, peluquero preferido)
- **PortalPetDetailPage**: cartilla de vacunación, alertas próximas (vacuna anual)
- **PortalLayout**: sidebar/nav propio (separado de ProtectedLayout del staff); responsive móvil — el cliente entrará desde móvil mayoritariamente

**💡 Funcionalidades extra a considerar:**
- App móvil (React Native / Expo) o PWA — el portal se vivirá en móvil
- Notificaciones push (web push + móvil) para recordatorios de cita
- "Mi familia" — vincular varias mascotas y compartir cuenta con familia (madre + hija reservan misma cuenta)
- Pago anticipado opcional con descuento (pago al reservar → 5% off)
- Chat directo con el salón desde el portal (whatsapp embedded o canal propio)

---

## Bloque 13 — Portal cliente: extras

**Páginas:** 4
- [ ] `groomly-web/src/pages/portal/PortalLoyaltyPage.tsx`
- [ ] `groomly-web/src/pages/portal/PortalInvoicesPage.tsx`
- [ ] `groomly-web/src/pages/portal/PortalReviewsPage.tsx`
- [ ] `groomly-web/src/pages/portal/PortalSettingsPage.tsx`

**Foco de auditoría:**
- **PortalSettingsPage**: 🐛 `Settings` icon importado y no usado — limpiar
- **PortalLoyaltyPage**: saldo de puntos, historial de canjes, recompensas disponibles, paquetes activos con saldo
- **PortalLoyaltyPage**: gamificación (badges "5 cortes seguidos", "1 año con nosotros") — opcional
- **PortalInvoicesPage**: histórico de facturas; descarga PDF; estado pagado/pendiente; método de pago usado
- **PortalInvoicesPage**: pago pendiente desde el portal (Stripe Checkout o Bizum) — diferenciador real
- **PortalReviewsPage**: dejar reseña tras cita completada; ¿se publica en Google Maps o solo interno?
- **PortalReviewsPage**: mostrar reseñas previas dadas y las recibidas (si el cliente quiere borrarlas → flow RGPD)
- **PortalSettingsPage**: edición datos personales, cambio de password, preferencias de comunicación (opt-in/out de cada canal)
- **PortalSettingsPage**: eliminar cuenta + sus datos (derecho al olvido RGPD)
- **PortalSettingsPage**: gestión de mascotas (link a PortalPetsPage)

**💡 Funcionalidades extra a considerar:**
- Programa de referidos en el portal: "Invita un amigo, ambos ganáis X puntos"
- "Wishlist" — productos del catálogo del salón que el cliente quiere comprar
- Subscription model — pagar 39€/mes y tener corte ilimitado (modelo Netflix de la peluquería)
- Recordatorio inteligente: "Tu última cita fue hace 6 semanas, ¿reservamos otro?"

---

## Bloque 14 — Plataforma super admin: operativa

**Páginas:** 4
- [ ] `groomly-web/src/pages/platform/PlatformDashboardPage.tsx`
- [ ] `groomly-web/src/pages/platform/PlatformSalonsPage.tsx`
- [ ] `groomly-web/src/pages/platform/PlatformSalonDetailPage.tsx`
- [ ] `groomly-web/src/pages/platform/PlatformUsersPage.tsx`
- (layout: `platform/PlatformLayout.tsx`)

**Foco de auditoría:**
- **PlatformDashboardPage**: KPIs de la plataforma — salones totales/activos, MRR, churn, conversión trial→paid, soporte abierto
- **PlatformDashboardPage**: gráficos de evolución (signups, downgrades, upgrades); alertas (salón churn risk, salón con uso >100% del plan)
- **PlatformSalonsPage**: directorio de todos los salones; filtros (plan, estado, fecha alta); búsqueda
- **PlatformSalonsPage**: acciones rápidas (impersonar Owner, pausar salón, ver tickets)
- **PlatformSalonDetailPage**: ficha 360 del salón — Owner, miembros, plan, uso (citas/mes), ingresos generados al SaaS (MRR contribuido), tickets, NPS
- **PlatformSalonDetailPage**: histórico de cambios de plan, pagos, refunds; comunicaciones desde plataforma
- **PlatformUsersPage** (línea 27 `"Todos los usuarios registrados"`): tabla con todos los usuarios cross-tenant; filtros por rol, salón, estado
- **PlatformUsersPage**: detectar usuarios huérfanos (sin salón), usuarios admin de varios salones (consultoras)

**💡 Funcionalidades extra a considerar:**
- Impersonation segura (admin entra al salón con flag visible "modo soporte"); audit log automático
- "Health score" del salón (uso del producto + pagos al día + NPS) — predictor de churn
- Bandeja de soporte integrada (tickets desde dentro del salón) — sin Intercom
- Heatmap geográfico de salones activos (mapa de calor por ciudad/comunidad)

---

## Bloque 15 — Plataforma: facturación y auditoría

**Páginas:** 3
- [ ] `groomly-web/src/pages/platform/PlatformSubscriptionsPage.tsx`
- [ ] `groomly-web/src/pages/platform/PlatformRevenuePage.tsx`
- [ ] `groomly-web/src/pages/platform/PlatformAuditPage.tsx`

**Foco de auditoría:**
- **PlatformSubscriptionsPage**: todas las suscripciones activas, trialing, past_due, canceladas; filtro por estado, plan
- **PlatformSubscriptionsPage**: acción manual (extender trial, aplicar cupón, refund) con motivo registrado en audit
- **PlatformSubscriptionsPage**: webhook Stripe — verificar sincronización (un past_due en Stripe debe reflejarse aquí)
- **PlatformRevenuePage**: MRR, ARR, ARPA, churn $; cohortes de retención por mes de signup
- **PlatformRevenuePage**: breakdown por plan; LTV; CAC si hay datos de adquisición
- **PlatformRevenuePage**: previsión a 90/180 días basada en tendencia actual
- **PlatformAuditPage**: log de acciones administrativas (impersonation, refund manual, cambios de plan forzados); inmutable, filtros por usuario/acción/fecha
- **PlatformAuditPage**: alertas de patrones sospechosos (mismo admin haciendo muchos refunds, downgrades masivos en una franja)

**💡 Funcionalidades extra a considerar:**
- Análisis de motivos de cancelación (qué texto escriben los Owners al cancelar) con sentiment/categorización
- Programa "salón embajador" — descuento para Owners que traen otros salones
- Comparativa entre planes (qué % usa cada feature de cada plan — base para rediseño de pricing)

---

## Bloque 16 — Páginas globales

**Páginas:** 1
- [ ] `groomly-web/src/pages/NotFoundPage.tsx`

**Foco de auditoría:**
- **NotFoundPage**: ilustración, mensaje claro, CTA "Volver al dashboard" / "Ir a inicio"
- **NotFoundPage**: tracking analítico de rutas 404 (qué URLs intentan los usuarios — pistas de funcionalidades demandadas)
- **NotFoundPage**: variantes según estado auth (logueado → dashboard, no logueado → login)
- Layout y branding peluguau coherente

---

## Patrones críticos a arreglar a nivel sistémico

Antes (o en paralelo) a los bloques, fijar a nivel global. Estos patrones se repiten y arreglarlos sistémicamente ahorra mucho trabajo:

1. **`setState` dentro de `useEffect`** — confirmado en 5 ubicaciones (Hallazgos críticos #4). Patrón correcto:
   - Derivar el estado de props/queryKey en vez de sincronizarlo en effect
   - Si es reset cuando cambia algo, usar `key` prop para forzar remount
   - Si es por apertura de modal, mover a `onOpen`/`onClose` callback
2. **`Date.now()` / `new Date()` en cuerpo del componente** — `SellPackageModal.tsx:44` confirmado. Esto rompe pureza, hace que `queryKey` cambie cada ms, cache nunca hit. Mover a `useMemo([])` o handler
3. **`confirm()` / `alert()` nativos** — `LoyaltyPage.tsx:263` confirmado. Sustituir todos por modal coherente del sistema de diseño (crear `ConfirmDialog` reutilizable)
4. **`useQuery` con `queryFn` mal tipado** — patrón roto en `PortalBookAppointmentPage`. Auditar cada `queryFn:` para asegurar firma `(context) => Promise<T>`, no `(params?) => Promise<T>` referenciado directo
5. **Imports no usados** — `Dog`, `salon`, `past`, `Settings` confirmados. ESLint debería marcar — verificar config `no-unused-vars`/`no-unused-imports`
6. **Tipos faltantes en `@/types/api`** — `Salon` no exportado. Auditar `portal.service.ts` y similares; añadir tipos o usar los existentes (`SalonSummary`)
7. **`.map`/`.filter`/`.reduce` sin guard `Array.isArray`** — el backend puede devolver `{}` en error; añadir guard o tipar bien la response
8. **Branding** — confirmar a cada bloque que no hay texto "Groomly" visible al usuario (alt, title, meta, copy). Por ahora el grep en `groomly-web/src/pages` da limpio, pero verificar landing
9. **Persistencia de filtros** — los filtros con `useState` local se pierden al cambiar de página; considerar `searchParams` o store global de filtros por dominio
10. **Toast/feedback de mutations** — verificar que cada mutation (crear/editar/borrar) tenga toast de éxito/error coherente; muchos handlers pueden estar mudos
11. **Empty states** — cada lista debe tener un empty state útil (no solo "Sin resultados", sino CTA "Crea tu primer X")
12. **Loading states** — skeletons vs spinners; consistencia entre páginas (puede ser que unas usen `<Spinner />` y otras `<Skeleton />`)
13. **Responsive** — peluquerías usan tablets en mostrador; verificar que todas las páginas funcionan en 768px–1024px sin overflow

---

## Endpoints backend que probablemente faltan

A confirmar tras auditar cada bloque. Probables huecos basados en funcionalidades extra propuestas y patrones de `AUDITORIA_GROOMLY.md`:

- [ ] `POST /api/landing/demo-request` — captura de leads desde landing (Bloque 1)
- [ ] `POST /api/import/customers` + `POST /api/import/pets` — import CSV en onboarding (Bloque 3)
- [ ] `POST /api/appointments/:id/photo-before` + `:id/photo-after` — fotos antes/después (Bloque 4/5)
- [ ] `POST /api/appointments/:id/remind` — disparo manual de recordatorio (Bloque 4)
- [ ] `POST /api/appointments/recurring` — citas recurrentes (Bloque 4)
- [ ] `POST /api/pets/:id/vaccinations` + `GET /api/pets/:id/vaccinations` — cartilla digital (Bloque 5)
- [ ] `POST /api/pets/:id/breed-detect` — Vision API integration (Bloque 5)
- [ ] `POST /api/services/templates` — plantillas por raza (Bloque 6)
- [ ] `POST /api/marketing/campaigns` — campañas WhatsApp/email (Bloque 10)
- [ ] `POST /api/referrals/code` — sistema de referidos (Bloque 10/13)
- [ ] `POST /api/invoices/:id/send-reminder` — recordatorio facturas vencidas (Bloque 8)
- [ ] `POST /api/invoices/:id/verifactu` — envío Verifactu/SII (Bloque 8)
- [ ] `POST /api/finance/reconcile` — conciliación bancaria (Bloque 9)
- [ ] `POST /api/portal/payments/checkout` — pago de factura desde portal (Bloque 13)
- [ ] `POST /api/portal/reviews` — reseña tras cita (Bloque 13)
- [ ] `POST /api/platform/impersonate/:salonId` — impersonation con audit (Bloque 14)
- [ ] `GET /api/platform/health-score/:salonId` — health score del salón (Bloque 14)
- [ ] `GET /api/platform/churn-reasons` — análisis de motivos de cancelación (Bloque 15)
- [ ] Webhooks salientes (`POST` configurables) para CRM externo / Zapier
- [ ] Push notifications (web push API + FCM/APNs para futura app)

---

## Recomendación de orden

Priorizado por ROI (desbloqueo + diferenciación + revenue):

1. **Patrones críticos sistémicos** (1-2 días) — arregla varias páginas de golpe, deja base limpia
2. **Bloque 12 — Portal cliente: core** — 🚨 **build roto en estas páginas**, hasta que se arregle no se puede deployar
3. **Bloque 2 — Autenticación e invitaciones** — puerta de entrada multi-rol, no puede tener fricción
4. **Bloque 3 — Onboarding y dashboard principal** — el onboarding es decisivo para activation; arreglar antes de invertir en adquisición
5. **Bloque 1 — Landing pública peluguau** — depende de tener oferta clara (sincronizar con `AUDITORIA_GROOMLY.md` Hormozi)
6. **Bloque 4 — Agenda y citas** — corazón del producto, mayor uso diario; recordatorios + recurrencia son palancas de revenue
7. **Bloque 5 — Clientes y mascotas** — ficha 360 con histórico de fotos diferencia vs MoeGo/Gingr
8. **Bloque 6 — Servicios y peluqueros** — precio por raza + comisiones desbloquean operativa real
9. **Bloque 8 — Finanzas: facturación** — Verifactu/SII obligatorio España; pagos online aumentan cobro
10. **Bloque 10 — Fidelización y marketing** — palancas de retention y upsell (alto ROI cuando producto está sólido)
11. **Bloque 11 — Reportes y configuración** — depende de datos limpios en bloques anteriores
12. **Bloque 13 — Portal cliente: extras** — depende de Bloque 12 estable
13. **Bloque 7 — Equipo multi-user** — relevante a partir de Pro/Business
14. **Bloque 9 — Finanzas: operaciones** — inventario y comisiones cierran ciclo financiero
15. **Bloque 14 — Plataforma super admin: operativa** — solo crítico cuando hay >50 salones
16. **Bloque 15 — Plataforma: facturación y auditoría** — solo crítico con tracción real
17. **Bloque 16 — Páginas globales** — pulido final

---

## Mapeo de rutas

Para referencia rápida al navegar:

| Bloque | Página | Ruta |
| --- | --- | --- |
| 1 | Home landing | `groomly-landing /` |
| 1 | Pricing | `groomly-landing /precios` |
| 1 | Demo | `groomly-landing /demo` |
| 1 | Registro | `groomly-landing /registro` |
| 2 | LoginPage | `/login` |
| 2 | RegisterPage | `/register` |
| 2 | ForgotPasswordPage | `/forgot-password` |
| 2 | ResetPasswordPage | `/reset-password` |
| 2 | VerifyEmailPage | `/verify-email` |
| 2 | AcceptInvitePage | `/accept-invite/:token` |
| 3 | OnboardingPage | `/onboarding` |
| 3 | DashboardPage | `/` |
| 3 | ProfilePage | `/profile` |
| 4 | AppointmentsCalendarPage | `/appointments` |
| 5 | CustomersListPage | `/customers` |
| 5 | CustomerCreatePage | `/customers/new` |
| 5 | CustomerDetailPage | `/customers/:id` |
| 5 | CustomerEditPage | `/customers/:id/edit` |
| 5 | PetsListPage | `/pets` |
| 5 | PetCreatePage | `/pets/new` |
| 5 | PetDetailPage | `/pets/:id` |
| 5 | PetEditPage | `/pets/:id/edit` |
| 6 | ServicesListPage | `/services` |
| 6 | ServiceCreatePage | `/services/new` |
| 6 | ServiceEditPage | `/services/:id/edit` |
| 6 | GroomersListPage | `/groomers` |
| 6 | GroomerCreatePage | `/groomers/new` |
| 6 | GroomerDetailPage | `/groomers/:id` |
| 6 | GroomerEditPage | `/groomers/:id/edit` |
| 6 | GroomerSchedulePage | `/groomers/:id/schedule` |
| 6 | GroomerCalendarPage | `/groomers/:id/calendar` |
| 7 | TeamPage | `/team` |
| 8 | FinanceDashboardPage | `/finance` |
| 8 | InvoicesListPage | `/finance/invoices` |
| 8 | InvoiceCreatePage | `/finance/invoices/new` |
| 8 | InvoiceDetailPage | `/finance/invoices/:id` |
| 9 | ExpensesPage | `/finance/expenses` |
| 9 | InventoryPage | `/finance/inventory` |
| 9 | CommissionsPage | `/finance/commissions` |
| 9 | FinanceReportsPage | `/finance/reports` |
| 10 | LoyaltyPage | `/loyalty` |
| 10 | CouponsPage | `/coupons` |
| 10 | PackagesPage | `/packages` |
| 10 | WaitlistPage | `/waitlist` |
| 11 | ReportsPage | `/reports/groomers` |
| 11 | SettingsBillingPage | `/settings` y `/settings/billing` |
| 12 | PortalDashboardPage | `/portal` |
| 12 | PortalAppointmentsPage | `/portal/appointments` |
| 12 | PortalBookAppointmentPage | `/portal/appointments/new` |
| 12 | PortalPetsPage | `/portal/pets` |
| 12 | PortalPetDetailPage | `/portal/pets/:id` |
| 13 | PortalLoyaltyPage | `/portal/loyalty` |
| 13 | PortalInvoicesPage | `/portal/invoices` |
| 13 | PortalReviewsPage | `/portal/reviews` |
| 13 | PortalSettingsPage | `/portal/settings` |
| 14 | PlatformDashboardPage | `/platform` |
| 14 | PlatformSalonsPage | `/platform/salons` |
| 14 | PlatformSalonDetailPage | `/platform/salons/:id` |
| 14 | PlatformUsersPage | `/platform/users` |
| 15 | PlatformSubscriptionsPage | `/platform/subscriptions` |
| 15 | PlatformRevenuePage | `/platform/revenue` |
| 15 | PlatformAuditPage | `/platform/audit` |
| 16 | NotFoundPage | `*` (catch-all) |
