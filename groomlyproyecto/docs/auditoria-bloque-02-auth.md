# Auditoría Bloque 2 — Autenticación e invitaciones

> **Bloque:** 2 / 16 · **Páginas:** 6 + PublicLayout + PublicOnlyRoute guard
> **Auditado:** 2026-05-16
> **Estado del bloque:** 🔴 Funcional pero con varios problemas de seguridad/UX que conviene resolver antes de abrir tráfico

---

## Resumen ejecutivo del bloque

Las 6 páginas de auth **funcionan** y consumen el backend correctamente. La capa de servicio está limpia (`auth.service.ts` es trivial y bien tipada). El problema no es el plumbing, son tres cosas:

1. **Inconsistencia de branding** — la marca es **peluguau** (minúsculas, según `project_groomly.md`), pero `LoginPage.tsx` mezcla "Peluguau" (capitalizado, 4 ocurrencias) con un wordmark estilizado "Pelu**Guau**". La landing usa "peluguau" minúsculas. Hay que elegir una.
2. **Cosas de developer asomando en UX final** — mensajes "En desarrollo aparecera en la consola del backend" visibles al usuario en `ForgotPassword` y `VerifyEmail`. No es producción.
3. **Faltan piezas de seguridad y compliance** — sin "Recordarme", sin 2FA, sin SSO, sin opt-in T&C en registro, sin rate-limit feedback claro, sin validación de password robusta, sin manejo del param `?plan=X` que viene de la landing.

`LoginPage` está **completamente custom** (377 líneas, layout dual con vídeo + 9 iconos flotantes animados + 7 keyframes inline). Las otras 5 viven dentro de `PublicLayout` con `<Card>` centrada. Esta asimetría es deliberada (el login es la "vitrina") pero introduce mantenimiento doble.

---

## Hallazgos cross-cutting (afectan a todo el bloque)

### 🌐 Branding / copy

1. **"Peluguau" capitalizado vs "peluguau" minúsculas** — `LoginPage.tsx:88, 91, 135, 138, 144` usa "Peluguau". Landing y `project_groomly.md` dicen **peluguau** minúsculas. Unificar. (El wordmark estilizado de `LoginPage.tsx:281-291` se puede mantener — es decoración, no copy.)
2. **Sin tildes ni eñes** — mismo problema sistémico de la landing. Ejemplos en cada página:
   - "Contrasena" / "contrasena" — `LoginPage.tsx:326, 332`, `RegisterPage.tsx:86, 94`, `ResetPasswordPage.tsx:32, 44, 63, 76`, `AcceptInvitePage.tsx:85`
   - "Iniciar sesion" / "Sesion" — todas las páginas
   - "informacion", "facturacion", "Gestion", "automaticos" — `LoginPage.tsx:35, 39, 45, 102`
   - "Olvidaste la contrasena?" sin `¿` ni `?` curva — `LoginPage.tsx:332`
   - "Peluqueria", "peluquerias" — todas
3. **Logo path placeholder** — `/image-removebg-preview%20(1).png` referenciado en 3 sitios:
   - `LoginPage.tsx:87` (panel izquierdo del login)
   - `LoginPage.tsx:269` (panel derecho, encima del formulario)
   - `PublicLayout.tsx:17` (header de auth)
   - Sale del mismo problema que la landing (Bloque 1 hallazgo #2). Renombrar a `/logo-peluguau.png` y actualizar referencias.
4. **Footer del PublicLayout** dice "ERP para peluquerias caninas" (`PublicLayout.tsx:43`) — alineado pero "ERP" es jerga B2B; "software de gestión" o "agenda + ficha + cobros" puede convertir mejor.

### 🐛 Mensajes orientados a desarrollo en producción

5. **`ForgotPasswordPage.tsx:41`** — Alert success dice *"En desarrollo aparecera en la consola del backend"*. Eliminar el sufijo en build de producción o detrás de `import.meta.env.DEV`.
6. **`VerifyEmailPage.tsx:74-76`** — Alert idéntico ("En desarrollo aparece en la consola del backend"). Mismo tratamiento.

### 🔐 Seguridad / compliance

7. **Sin checkbox de T&C / política de privacidad** en `RegisterPage` ni `AcceptInvitePage`. **RGPD lo exige**: consentimiento explícito antes de crear cuenta. Cruza con Bloque 1 hallazgo #1 (las rutas legales del footer ni siquiera existen).
8. **Sin opt-in marketing separado** — si en algún momento se quiere mandar newsletter, hay que tener `marketingConsent: boolean` capturado al registro.
9. **Password mínimo 8 caracteres** en `RegisterPage.tsx:91` y `ResetPasswordPage.tsx:68, 81`. Pero **`AcceptInvitePage.tsx:86-93` no tiene `minLength`**. Validación inconsistente — el flow invite acepta passwords débiles.
10. **Sin validación de fortaleza visible** (zxcvbn / barra de progreso). 8 chars es bajo para SaaS B2B; recomendación: 12 chars + al menos algo (mayúscula, número, símbolo).
11. **Sin "Recordarme" en LoginPage** ni persistencia de email en `localStorage`. UX peor para staff que entra varias veces al día.
12. **Sin 2FA opcional** (TOTP). Diferenciador para Owners que gestionan datos sensibles + obligatorio si algún día se vende a cadenas grandes.
13. **Sin SSO** (Google / Apple) — especialmente útil para el portal cliente (fricción cero).
14. **Sin magic link login** (one-click sin password) — peluguau-grade.
15. **Sin rate-limit feedback explícito** — el backend tiene rate limiter `30/15min` en `/auth/*` (ver `AUDITORIA-2026-05-13.md` punto 1.3). Cuando el cliente recibe `429 Too Many Requests`, la UI muestra `extractErrorMessage` genérico. Mejor: parsear `Retry-After` y mostrar "Demasiados intentos, espera X min".
16. **Sin manejo explícito de cuenta bloqueada** (lockout) — depende de cómo lo devuelva el backend.
17. **`AcceptInvitePage.tsx:33-37`** — `setSession` recibe `res.user as unknown as User` y `res.memberships as unknown as Membership[]`. Doble cast con `as unknown as` = tipos desincronizados entre `acceptInvite()` response y el `AuthState`. Auditar `team.service.ts#acceptInvite` y unificar tipos.

### 🎯 Flujo / acciones faltantes

18. **`RegisterPage` no captura `?plan=X` del query string** — la landing manda `${APP_URL}/register?plan=pro` (`Pricing.tsx:75` de la landing). RegisterPage no lo lee, no lo guarda, no lo envía al backend. **El plan elegido en la landing se pierde** y el usuario aterriza en Free por defecto. Bug grave de funnel.
19. **`RegisterPage` no captura UTM params** (`utm_source`, `utm_medium`, `utm_campaign`, `referrer`). Ningún tracking de adquisición. Difícil medir qué canal funciona.
20. **`RegisterPage` no pide teléfono / nº de staff / ciudad** — datos básicos de calificación que ayudarían al onboarding y al sales follow-up.
21. **`LoginPage` no muestra el `state.message`** que `ResetPasswordPage.tsx:23-26` envía vía `navigate('/login', { state: { message: ... } })`. El mensaje *"Contrasena actualizada, ya puedes iniciar sesion."* nunca se ve.
22. **`AcceptInvitePage` no muestra contexto antes de aceptar** — ¿qué salón? ¿qué rol? ¿quién invita? El usuario rellena formulario "a ciegas". Necesita un `GET /api/team/invites/:token/preview` para mostrar (nombre del salón, rol asignado, invitador, expiración) antes del form.
23. **`AcceptInvitePage` no valida token al cargar** — si el token caducó/se revocó, el usuario rellena todo el form y solo descubre el error al submit. Mala UX. Validar primero, mostrar form solo si el invite es válido.
24. **`AcceptInvitePage` no distingue "soy usuario nuevo" vs "ya tengo cuenta"** — el copy *"Si ya tienes cuenta en peluguau, deja este campo vacio"* (línea 94-95) es confuso. Mejor: dos botones / dos flows visualmente distintos. O detectar automáticamente vía email.
25. **`ResetPasswordPage` muestra el token como input editable** (línea 51-60) — UX malo. El token llega por URL (`?token=...`), no debería ser visible / editable. Mostrar solo si el querystring no lo trae.
26. **Sin "cambiar email"** — solo password. Si el usuario cambia de email laboralmente, no hay flow. (No bloqueante, pero un día se pedirá.)
27. **Sin "eliminar cuenta"** desde auth (vive en `ProfilePage` o `SettingsBillingPage` — Bloque 3/11). RGPD lo exige.

### 📐 UI / arquitectura

28. **Asimetría visual** entre `LoginPage` (377 líneas, layout dual, vídeo, iconos flotantes) y `RegisterPage` (146 líneas, Card simple centrada). La página de Registro merece tratamiento parejo o, mejor, **unificar en un layout dual con vídeo** y reusar el chrome.
29. **`LoginPage.tsx:152-194`** — bloque `<style>` inline con 7 `@keyframes` (`float1`, `float2`, `float3`, `drift1`, `drift2`, `drift3`, `glowPulse`, `titleFloat`). 42 líneas de CSS dentro del JSX. Extraer a `LoginPage.module.css` o a `tailwind.config.ts` (`theme.extend.animation`).
30. **`LoginPage` no respeta `prefers-reduced-motion`** — 9 iconos flotantes + circles blureados + título animado. Accesibilidad: añadir `@media (prefers-reduced-motion: reduce)` para deshabilitar animaciones.
31. **`LoginPage:71`** — `<video src="/login.mp4" autoPlay muted loop playsInline>` sin `<source type="...">` ni fallback. Si el vídeo falla, fondo negro. Considerar poster (`poster="/login-poster.jpg"`) y fallback estático.
32. **`LoginPage` testimonio hardcoded** (línea 134-139): *"Laura, Peluqueria Canina HappyDog"*. Otro testimonio sin verificar — mismo problema que en la landing (Bloque 1 hallazgo #6). Riesgo legal + credibilidad.
33. **Auth pages sin `<title>` específico** — la pestaña del navegador siempre dice lo del `index.html`. Añadir `document.title = 'Iniciar sesión · peluguau'` en cada page (o `react-helmet-async`).
34. **`PublicLayout` aplicó un workaround**: `if (isLoginPage) return <Outlet />` (`PublicLayout.tsx:5-9`). Esto pasa el layout entero al LoginPage. Coherente con el diseño dual, pero merece comentario explicando la decisión.
35. **`PublicLayout` no oculta su nav si la página child la trae** — irrelevante aquí porque solo LoginPage la bypassea, pero anticipa fricción si en el futuro otra page bypasea.

### 🔁 Patrones React Hooks

36. **`VerifyEmailPage.tsx:26-30`** — `useEffect` con dependencia `verifyMutation` (objeto entero que cambia cada render). El guard `!isPending && !isSuccess && !isError` evita el bucle, pero es frágil. Mejor: dependencia `[token]` y un `useRef` para tracking de "ya disparé". Patrón típico ESLint-eslint marca esto.

---

## 2.1 `LoginPage.tsx` (377 líneas)

### 🐛 Bugs
- Branding inconsistente "Peluguau" en líneas 88, 91, 135, 144 (la marca es "peluguau" minúsculas).
- Logo placeholder `/image-removebg-preview%20(1).png` (líneas 87, 269).
- Testimonio probablemente inventado (línea 134-139): "Laura · Peluqueria Canina HappyDog".
- `<video>` sin poster ni fallback (línea 70-77).
- Bloque `<style>` inline gigante (líneas 152-194).
- No respeta `prefers-reduced-motion`.

### 🎯 Acciones faltantes
- "Recordarme" + persistencia de email en `localStorage`.
- Mostrar `useLocation().state.message` si viene de ResetPassword (el mensaje hoy se pierde).
- Magic link login (botón secundario "Enviarme un link al email").
- SSO Google / Apple.
- Rate-limit feedback claro (parsear `Retry-After` del 429).

### 📐 Mejoras UI/UX
- Extraer keyframes a CSS modular / Tailwind.
- Reducir cantidad de iconos flotantes a 3-4 (9 es ruido visual).
- Foto/logo del salón en lugar del logo peluguau (post-login multi-tenant — *experimental*).

### 💡 Funcionalidades extra
- Detección de "estás en otro dispositivo, ¿es tuyo?" si IP/UA cambian bruscamente.
- Login passkey (WebAuthn) — diferenciador 2027.

---

## 2.2 `RegisterPage.tsx` (146 líneas)

### 🐛 Bugs
- **No captura `?plan=X`** del query string que viene de la landing → plan elegido se pierde (`Pricing.tsx:75` de landing manda el plan).
- **No captura UTM params** → no se puede atribuir adquisición.
- **Sin checkbox T&C / RGPD** — compliance issue.
- Branding "peluguau" en CardTitle (`RegisterPage.tsx:40`) ✓ correcto. Pero "Contrasena" sin tilde.
- `salonName` con placeholder "Pet Style Madrid" (línea 125) — nombre de ejemplo bien, pero coherencia con el ecosistema de peluquerías genuinas.

### 🎯 Acciones faltantes
- Leer `useSearchParams()` para capturar `plan`, `utm_*`, `referrer` y mandarlos al backend.
- Checkbox T&C obligatorio + checkbox marketing opcional.
- Validación de fortaleza de password (mínimo 12 chars, barra visual).
- Campo teléfono (libphonenumber-js, optional).
- Campo ciudad (autocompletado).
- Campo nº de peluqueros estimado (calificación).
- Confirmación de email (segundo campo) — opcional pero baja errores.

### 📐 Mejoras UI/UX
- Diseño dual-pane equivalente a LoginPage (vídeo + form). Hoy es Card simple. Inconsistencia.
- Indicador de "paso 1 de X" si en el futuro el registro se parte (con plan elegido pre-seleccionado).

### 💡 Funcionalidades extra
- "Importa tus clientes durante el registro" — CSV/Excel upload directo (mata fricción del onboarding posterior).
- Recordar plan elegido en localStorage si abandona y vuelve.

---

## 2.3 `ForgotPasswordPage.tsx` (74 líneas)

### 🐛 Bugs
- **`ForgotPasswordPage.tsx:41`** — texto *"En desarrollo aparecera en la consola del backend"* visible al usuario. Eliminar o `import.meta.env.DEV` only.
- "Contrasena" sin tilde (líneas 32, 34).

### 🎯 Acciones faltantes
- Cooldown visible tras envío (ej. "Espera 60s antes de reintentar"). Hoy puede repetir submits.
- Captcha si el rate limit suelta señales de abuso.

### 📐 Mejoras UI/UX
- ✅ Mensaje uniforme "si existe la cuenta..." (anti-enumeration) — correctamente neutral.

### 💡 Funcionalidades extra
- Reset por SMS para Owner (opt-in en perfil).

---

## 2.4 `ResetPasswordPage.tsx` (101 líneas)

### 🐛 Bugs
- **Token mostrado como input editable** (líneas 51-60). Si llega por URL `?token=...`, autocargar y ocultar. Solo mostrar el input si falta.
- "Contrasena" sin tilde en 4 sitios.

### 🎯 Acciones faltantes
- Confirmación de que las **sesiones activas se revocan** tras reset (mostrar al usuario: "Cerramos sesión en tus otros dispositivos").
- Validación de fortaleza visible.
- Confirmar que `password !== confirm` se valida también en backend (defensa en profundidad).
- Si el token está caducado, mostrar CTA "Pide otro link" → redirect a `/forgot-password`.

### 📐 Mejoras UI/UX
- ✅ Navegación con `state.message` a `/login` tras éxito (línea 23-26) — buena UX. PERO `LoginPage` no lee `state.message`. **Mensaje silencioso, gran fricción**.

### 💡 Funcionalidades extra
- Mostrar último login antes del reset (transparencia de seguridad: *"Tu última sesión fue desde Madrid el 14/05"*).

---

## 2.5 `VerifyEmailPage.tsx` (108 líneas)

### 🐛 Bugs
- **`VerifyEmailPage.tsx:74-76`** — *"En desarrollo aparece en la consola del backend"* visible al usuario. Eliminar.
- **`VerifyEmailPage.tsx:26-30`** — `useEffect` con dep `verifyMutation` (objeto que cambia cada render). El guard interno funciona, pero el patrón es frágil. Refactor a `[token]` + `useRef`.
- "verificacion" sin tilde, "verificacion" en línea 41.

### 🎯 Acciones faltantes
- Si el token está caducado, mostrar CTA "Pedir reenvío" (hoy hay un form de reenvío pero está siempre visible — solo mostrar cuando hace falta).
- Si la verificación se hace ANTES de logged-in, redirigir a `/login` al éxito con mensaje. Si DESPUÉS, marcar el state y mandar a `/` o `/dashboard`.
- Tracking: cuántos usuarios verifican vs cuántos abandonan (KPI de activación).

### 📐 Mejoras UI/UX
- Cooldown en botón "Reenviar" (no permitir spam).
- Diferenciar visualmente "ya verificado" (success duradero) de "verificando" (spinner) de "error" (CTA reintento). Hoy los tres estados coexisten.

### 💡 Funcionalidades extra
- Email tracking pixel para saber si el email se abrió (señal de delivery).

---

## 2.6 `AcceptInvitePage.tsx` (107 líneas)

### 🐛 Bugs
- **No muestra contexto antes de aceptar** — falta `GET /api/team/invites/:token/preview` con (salón, rol, invitador, expiración).
- **No valida token al cargar** — el usuario rellena el form aunque el invite esté caducado/revocado.
- **Password sin `minLength`** (línea 86-93) — inconsistente con Register/Reset.
- **Cast `as unknown as User` y `as unknown as Membership[]`** (líneas 35-36) — tipos desalineados con `acceptInvite` response. Arreglar tipos en `team.service.ts`.
- "invitacion", "contrasena", "Apellido" (vs "Apellidos" en RegisterPage — inconsistencia menor).

### 🎯 Acciones faltantes
- Pre-validación al cargar (validar token, mostrar quién invita y a qué salón).
- Diferenciar visualmente "soy nuevo" / "ya tengo cuenta" — dos botones / dos flows.
- T&C obligatorio (RGPD).
- Email visible (read-only del invite — el usuario debe ver a qué cuenta entra).

### 📐 Mejoras UI/UX
- Card de bienvenida con el logo / nombre del salón anfitrión.
- Mostrar el rol con badge y descripción ("Eres FRONT_DESK — podrás ver agenda y dar de alta clientes").

### 💡 Funcionalidades extra
- "Rechazar invitación" explícito (notifica al invitador).
- Si el email del invite ya está en peluguau con otro user, ofrecer "iniciar sesión y unirse al salón" en 1 click.

---

## 2.7 `PublicLayout.tsx` y `PublicOnlyRoute.tsx` (49 + 14 líneas)

### 🐛 Bugs
- Logo placeholder `/image-removebg-preview%20(1).png` (`PublicLayout.tsx:17`).
- "ERP para peluquerias caninas" sin tildes (línea 19, 43).
- "Iniciar sesion", "Crear cuenta" — sin tildes.

### 🎯 Acciones faltantes
- Comentario explicando el bypass `if (isLoginPage) return <Outlet />` (línea 5-9) — la asimetría es deliberada pero opaca al onboarding de devs.
- Considerar uniformizar: o todas las auth pages dentro del layout, o todas con bypass.

### 📐 Mejoras UI/UX
- Footer con link a `/legal/*` (cuando existan — Bloque 1 hallazgo #1).
- Selector idioma (si LATAM en roadmap).

### 💡 Funcionalidades extra
- Banner "estamos en mantenimiento" controlable desde env var / settings.

---

## Resumen de prioridades del Bloque 2

### 🚨 Urgente (compliance + funnel)

1. **`RegisterPage` debe leer `?plan=X` y UTM params** y mandarlos al backend → corrige fuga de leads del funnel desde la landing.
2. **Añadir checkbox T&C obligatorio** en `RegisterPage` y `AcceptInvitePage` → RGPD.
3. **Quitar / esconder los textos "En desarrollo aparecera en la consola del backend"** en `ForgotPassword:41` y `VerifyEmail:74-76`.
4. **Crear `GET /api/team/invites/:token/preview`** y refactor `AcceptInvitePage` para validar primero.
5. **Renombrar logo y unificar referencias** (cross-cutting con Bloque 1).

### 🔥 Alta (calidad percibida)

6. **Unificar branding "peluguau" minúsculas** — fix en `LoginPage.tsx:88, 91, 135, 144`. Decisión del wordmark "PeluGuau" estilizado (mantener como decoración).
7. **Restaurar tildes y eñes** sistémicamente (alineado con Bloque 1 hallazgo #8).
8. **`LoginPage` debe leer `useLocation().state.message`** del ResetPassword success y mostrarlo en un Alert.
9. **Capturar / ocultar token en `ResetPasswordPage`** — autocargar del query, mostrar solo si falta.
10. **Cambiar testimonio inventado** del LoginPage (igual que en landing).
11. **Validación de password robusta** + visible (12 chars + indicador de fortaleza).

### 🛠️ Media (seguridad + UX)

12. Rate-limit feedback en LoginPage (parsear `Retry-After`).
13. "Recordarme" + persistencia de email en LoginPage.
14. Cooldown del botón "Reenviar" en VerifyEmail.
15. `minLength=8` (al menos) en AcceptInvitePage password.
16. Arreglar tipos en `team.service.ts#acceptInvite` para quitar `as unknown as User`.
17. Refactor del `useEffect` en `VerifyEmailPage.tsx:26-30` para no depender del objeto mutación.
18. Respetar `prefers-reduced-motion` en LoginPage.
19. Comentar el bypass del `PublicLayout` para LoginPage.

### 📈 Baja / mejora continua

20. 2FA TOTP opcional desde Profile (Bloque 11).
21. SSO Google / Apple (portal cliente sobre todo).
22. Magic link login.
23. Diseño dual-pane en RegisterPage (paridad con LoginPage).
24. Captura de teléfono / nº staff / ciudad en RegisterPage.
25. WebAuthn / passkey.
26. Email del invite visible read-only en AcceptInvitePage.
27. Extracción de keyframes inline a CSS modular.
28. `document.title` por página.
29. Logout / "sesión expirada" UX explícito (cuando el JWT muere mid-uso).

---

## Endpoints backend identificados (faltan / mejorar)

- [ ] `GET /api/team/invites/:token/preview` — devolver `{ salonName, role, invitedBy, expiresAt, valid }` para que AcceptInvitePage muestre contexto.
- [ ] `POST /api/auth/register` extendido — aceptar `plan`, `utm_source`, `utm_medium`, `utm_campaign`, `referrer`, `marketingConsent`, `phone?`, `city?`, `staffCount?`.
- [ ] `POST /api/auth/magic-link` — envía link de login sin password.
- [ ] `POST /api/auth/2fa/enroll` + `POST /api/auth/2fa/verify` — TOTP.
- [ ] `POST /api/auth/sso/google` + Apple (cuando se decida).
- [ ] `POST /api/auth/sessions/revoke-all` — revocación de sesiones activas al reset password (probablemente ya existe internamente; exponer/garantizar).
- [ ] `GET /api/auth/sessions` — listar sesiones activas (para Profile).

---

## Siguiente paso sugerido

Antes de avanzar al Bloque 3, atacar al menos los hallazgos urgentes (1-5) — son los que sangran funnel y compliance. El resto pueden cerrarse iterativamente.

Cuando termines el fix de RegisterPage `?plan=X`, vale la pena testear el funnel completo: pricing landing → register?plan=pro → onboarding → trial activo. Si el plan llega correcto al `subscriptionStatus` del backend, el funnel está sano. Si no, hay otro bug en `auth.service.ts` o en el backend.

Dime cuando vamos con `bloque 3` (Onboarding + Dashboard + Profile).
