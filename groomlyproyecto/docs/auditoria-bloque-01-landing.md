# Auditoría Bloque 1 — Landing pública peluguau

> **Bloque:** 1 / 16 · **Páginas:** 4 + 8 componentes compartidos + 1 archivo de datos
> **Auditado:** 2026-05-16
> **Estado del bloque:** 🔴 Requiere intervención (assets boilerplate, rutas legales rotas, copy sin tildes)

---

## Resumen ejecutivo del bloque

La landing **compila y se ve presentable**, pero tiene tres clases de problemas que la frenan:

1. **Calidad percibida baja** — todo el copy está sin tildes ni eñes ("Peluquerias", "fidelizacion", "tamano", "dias"). Para un SaaS español dirigido a peluquerías, esto es un golpe directo a la confianza.
2. **Compliance y producción a medias** — rutas legales del footer rotas (4 0 4), assets boilerplate de Next.js sin limpiar, logo con nombre temporal `image-removebg-preview (1).png`, sin sitemap, sin robots.txt, sin Open Graph image, sin analytics, sin cookie banner.
3. **Conversión sin palancas** — no hay garantía pública (la que recomienda `AUDITORIA_GROOMLY.md`), testimonios probablemente inventados, promesa medible vaga, sin ROI calculator, sin video del producto, sin tabla comparativa por features.

El plan Free **sigue activo** en `plans.ts` aunque `AUDITORIA_GROOMLY.md` recomienda matarlo. Decisión pendiente del Owner.

---

## Hallazgos cross-cutting (afectan a todo el bloque)

### 🐛 Bugs visibles / build / 404

1. **Rutas legales rotas** — `Footer.tsx:42-46` enlaza a `/legal/privacidad`, `/legal/terminos`, `/legal/cookies`. Estas rutas **no existen** (`groomly-landing/app/legal/` no existe). Click → 404 + problema RGPD real.
2. **Logo con nombre temporal** — `Header.tsx:12` y `Footer.tsx:13` referencian `/image-removebg-preview%20(1).png`. Nombre placeholder de removedor de fondos. Renombrar a `/logo-peluguau.png` y actualizar referencias.
3. **Assets Next.js boilerplate sin limpiar** en `public/`:
   - `next.svg`, `vercel.svg`, `globe.svg`, `window.svg`, `file.svg`
   - No se referencian en código pero pesan en deploy y dan mala señal en auditorías externas.
4. **`next.config.ts` vacío** — sin `redirects`, `rewrites`, `images.remotePatterns`, `headers` de seguridad (X-Frame-Options, CSP), `experimental` flags. Configuración por defecto en producción.
5. **Sin `robots.txt`** en `public/` ni `app/robots.ts`.
6. **Sin `sitemap.xml`** en `public/` ni `app/sitemap.ts`. Google no descubrirá `/precios` ni `/demo` salvo por enlaces internos.
7. **Sin `favicon.ico` real** en `public/` (Next 16 lo busca en `app/favicon.ico` que sí existe, pero conviene un favicon propio peluguau, no el default).

### 🌐 Branding / copy

8. **Falta de tildes y eñes en TODA la landing** — confirmado en `Hero.tsx`, `Features.tsx`, `Pricing.tsx`, `Faq.tsx`, `Testimonials.tsx`, `plans.ts`, `Cta.tsx`, `Footer.tsx`, `demo/page.tsx`, `precios/page.tsx`, `layout.tsx`. Ejemplos:
   - "Peluquerias caninas" → "Peluquerías caninas"
   - "fidelizacion" → "fidelización"
   - "tamano" → "tamaño"
   - "Espana" → "España"
   - "dias gratis" → "días gratis"
   - "informacion" / "Caracteristicas" / "facturacion" / "Cancelar cuando quieras"
   - Diagnóstico: probable estrategia para evitar problemas de codificación, pero hoy es contraproducente. UTF-8 es estándar; los acentos deben volver.

9. **Mock UI del Hero usa nombres genéricos** — `Hero.tsx:62` muestra "Toby, Luna, Rocco, Nala" — está bien para mock pero podría ser captura real del producto (más persuasivo).

### 📐 SEO / OG

10. **Sin Open Graph image** en `layout.tsx` ni en pages. Compartir en redes muestra preview vacío/genérico.
11. **Sin Twitter Card metadata** específica.
12. **Sin JSON-LD `SoftwareApplication`** ni `Organization` — schema.org desaprovechado.
13. **Keywords pobres** en `layout.tsx:19-24` — solo 4 generales. Falta nicho ("agenda perros", "ERP peluquería canina", competencia: "alternativa MoeGo", etc.).

### 🔘 Tracking / compliance

14. **Sin analytics** — no veo `@next/third-parties/google`, ni `plausible`, ni `posthog`, ni `@vercel/analytics`. No se mide conversión de la landing.
15. **Sin cookie banner** ni gestor de consentimiento (RGPD lo exige cuando haya tracking — ahora no hay tracking, pero el día que se añada explotará).
16. **Sin formulario de captura de leads** en ningún sitio (ver `demo/page.tsx` abajo).

### ⚠️ Estratégico (sincronizar con `AUDITORIA_GROOMLY.md`)

17. **Plan Free vivo** en `plans.ts:14-26` con "50 citas/mes · 1 peluquero" → contradice la recomendación Hormozi de matarlo. Decisión pendiente del Owner.
18. **Sin garantía pública** en Pricing ni Hero. Hormozi recomendaba "si no recuperas 10h/semana en 60d, devolución completa".
19. **Sin promesa medible** — el headline del Hero ("La agenda inteligente para peluquerias caninas") es feature, no resultado. Cambiar a algo como "Recupera 8 horas a la semana y reduce no-shows un 60%".

### ⚠️ Stack

20. **`groomly-landing/AGENTS.md` avisa Next.js 16 tiene breaking changes** — confirmar que `metadata`, `redirect()` desde `next/navigation`, `next/image`, `next/font/google` siguen estables. El proyecto usa Next 16.2.6 (relativamente reciente).

---

## 1.1 `app/page.tsx` — Home

**Líneas:** 25 · **Rol:** Composer de la home

### 🐛 Bugs visibles
- Sin `metadata` exportada — la home hereda `layout.tsx` metadata (que es genérica). La home merece su propio `<title>` y `description` afinados para SEO.

### 🎯 Acciones faltantes
- Exportar `metadata` específico: `title: "peluguau · Agenda online para peluquerías caninas"`, `description` con keyword principal + promesa medible.
- Añadir JSON-LD `<Script type="application/ld+json">` con `SoftwareApplication` (precio, valoración, screenshots).

### 📐 Mejoras UI/UX
- Orden de secciones es Hero → Features → Pricing → Testimonials → FAQ → CTA. Considerar mover Testimonios **antes** de Pricing (prueba social ablanda la decisión de precio).
- Falta sección "Cómo funciona" (3-4 pasos visuales) entre Features y Pricing.
- Falta sección "Para quién" (filtro de avatar: peluquería de 1 / 2-5 / 5+ groomers) para que el visitante se identifique.

### 💡 Funcionalidades extra
- Tab "Migrar desde MoeGo / Pawfinity / Excel" con copy específico por origen (palanca SEO comparativo).
- Sección "Para tu equipo" — qué ve el peluquero, qué ve la dueña, qué ve el cliente.
- Comparativa "peluguau vs Excel/cuaderno" — el competidor real de la mayoría de peluquerías.

---

## 1.2 `app/precios/page.tsx` — Pricing

**Líneas:** 36 · **Rol:** Hero específico + Pricing(compact) + FAQ + CTA

### 🐛 Bugs visibles
- Ninguno técnico. Compila y renderiza.

### 🎭 Mock data
- Misma fuente de planes (`PLANS` en `plans.ts`) — bien, una sola fuente de verdad.

### 🎯 Acciones faltantes
- **Tabla comparativa de features** (matriz Free/Starter/Pro/Business × N features con ✓/✗). Hoy solo hay 4 highlights por plan, no se ve qué Pro hace que Starter no hace.
- **Toggle anual/mensual** con descuento -15% o -20% en anual (palanca ARR sin tocar pricing del mensual).
- **Garantía visible** en cada card o un banner global.
- **Calculadora de ROI** ("tengo X citas/mes, ahorro Y horas y Z€ con peluguau").

### 📐 Mejoras UI/UX
- "Mas de 8 peluqueros o multi-sucursal? Habla con ventas" (`Pricing.tsx:33`) — CTA débil. Convertir en card "Enterprise" con label "Custom" y link directo a demo.
- Sin distinción visual entre plan recomendado para cada tipo de peluquería (1 groomer / 2-5 / 5+).
- IVA: "Precios sin IVA" (línea 33) está bien para B2B, pero verificar que el flow de Stripe lo añade.

### 💡 Funcionalidades extra
- FAQ específico de pricing (qué método de pago, qué pasa con datos si cancelo, hay fees ocultos, hay setup fee).
- Bottom social proof: "300+ peluquerías ya usan peluguau" (cuando sea cierto).

### ⚠️ Estratégico
- Decidir si el plan Free se mantiene o se elimina (ver hallazgo cross-cutting #17).

---

## 1.3 `app/demo/page.tsx` — Solicitar demo

**Líneas:** 97 · **Rol:** Página de captación de leads

### 🐛 Bugs visibles
- **No es un formulario, es solo mailto + tel**. La conversión esperable de un mailto vs un formulario con calendario embebido es **3-5x peor**. Crítico para el funnel.
- **Teléfono placeholder** (`tel:+34900000000` en línea 70 y texto "+34 900 000 000" en línea 78). Numeración no asignada en España. Click telefónico falla.
- **Promesa inconsistente** — línea 39: "Plan starter o pro **gratis durante el primer mes**". El resto de la landing dice "14 días gratis". ¿Cuál es el mensaje real? Confusión = pérdida de conversión.
- Sin `metadata.openGraph` específico (Hero genérico al compartir).

### 🎭 Mock data
- Email `ventas@peluguau.es` (línea 11) — verificar que el buzón existe y se monitoriza, sino se pierden leads.

### 🔘 Botones inertes
- Ninguno propiamente — pero el mailto pasa al cliente de email del usuario y muchos visitantes (móvil sobre todo) no tienen cliente de email configurado → click sin acción = lead perdido.

### 🎯 Acciones faltantes
- **Formulario real** con campos: nombre, peluquería, ciudad, nº staff, teléfono, email, "qué usas hoy" (select: nada / cuaderno / Excel / otro software / MoeGo / Pawfinity), franja horaria preferida para llamada.
- **Calendario embebido** (Cal.com / TidyCal / Calendly) para auto-agendar la demo de 20 min.
- **Endpoint `POST /api/landing/demo-request`** — guardar lead en backend con UTM tracking, source, page.
- **Confirmación post-submit** (email automático con calendario, mensaje "te llamamos en X").
- **Slack/email notification** al equipo de ventas en cada nuevo lead.

### 📐 Mejoras UI/UX
- Numero teléfono real (al menos un Twilio/Aircall enrutado).
- Indicar disponibilidad del equipo ("Lunes a viernes 9h-18h CET").
- Mostrar foto/cara del comercial que hará la demo (humaniza enormemente).
- Botón WhatsApp además de email/teléfono (más natural para peluquerías).

### 💡 Funcionalidades extra
- Calificación automática de leads (score basado en nº staff, plan probable).
- Asignación automática del calendario al SDR según ciudad/idioma.
- Versión "demo en vídeo" embebida (Loom) — para quien no quiere hablar con nadie.

---

## 1.4 `app/registro/page.tsx` — Registro

**Líneas:** 7 · **Rol:** Redirige a la SPA

### 🐛 Bugs visibles
- `redirect(`${APP_URL}/register`)` — si `NEXT_PUBLIC_APP_URL` no está en producción, va a `http://localhost:5173/register` (fallback en `plans.ts:1`). **Riesgo de deploy roto** si el env var se olvida.
- **No propaga querystring** — si alguien llega con `/registro?plan=pro&utm_source=google`, se pierden los params al redirigir (el redirect no incluye `?...`).

### 🎯 Acciones faltantes
- Propagar querystring: `redirect(`${APP_URL}/register${searchParams ? '?' + searchParams.toString() : ''}`)` (o usar el helper de Next 16 — confirmar API estable).
- Validar `APP_URL` en build time con Zod (igual que `groomly-backend/config/env.ts`). Si falta, fallar el build, no caer a localhost en prod.
- Considerar si tiene sentido mantener `/registro` cuando los CTAs ya van directos a `${APP_URL}/register?plan=X` (ver `Pricing.tsx:73-77`). Posiblemente borrar y consolidar en el redirect del Header.

### 📐 Mejoras UI/UX
- Si se mantiene la ruta, mostrar al menos un "Redirigiendo..." con spinner (ahora es redirección server-side, no se ve transición pero si falla el redirect el usuario ve página en blanco).

---

## 1.5 Componentes compartidos (en `app/components/`)

### `Header.tsx` (49 líneas)

- 🐛 Logo path placeholder `/image-removebg-preview%20(1).png` (ver hallazgo #2).
- 📐 Sin menú hamburguesa móvil — la nav se oculta en <md y solo quedan logo + Entrar + Empezar. Funciona pero pierde discoverability de `/precios` y `/demo`.
- 📐 Sin link visible a `/#caracteristicas` en nav (existe el ancla pero no se enlaza).
- 📐 Sin selector idioma (España + LATAM en roadmap → preparar i18n con `next-intl` o similar).
- 💡 Considerar barra promo arriba ("🎁 Lanzamiento: 30% off primer año hasta el 31/05") — palanca de urgencia controlable desde código.

### `Hero.tsx` (111 líneas)

- 📐 **Headline feature, no resultado** (`Hero.tsx:17`): "La agenda inteligente para peluquerias caninas". Cambiar a promesa medible (ver Hallazgos #18 #19).
- 📐 Badge `"14 dias gratis · sin tarjeta"` (`Hero.tsx:13`) — coexiste con plan Free; mensaje contradictorio.
- 📐 Mock UI dibujado con CSS — funcional pero genérico. Reemplazar por **captura real del producto** (recortada y polished) o **vídeo Lottie/MP4 autoplay muted loop** de la agenda en acción.
- 📐 Sin "logos de clientes" debajo del Hero ("Usado por 200+ peluquerías de toda España"). Cuando haya, añadir.
- 💡 ROI calculator interactivo en el Hero ("¿Cuántas citas/mes? → ahorrarías X horas y Y€/mes con peluguau").
- 💡 GIF/vídeo del producto, no mock estático.

### `Features.tsx` (82 líneas)

- 6 features razonables (Agenda, Ficha mascota, Fidelización, Paquetes/cupones, Fotos antes/después, Facturación).
- 📐 Sin CTA al final del bloque (acaba abruptamente). Añadir "Ver todas las funcionalidades" → `/funcionalidades` o "Probar gratis".
- 📐 Iconos lucide genéricos. Diferenciador: ilustraciones custom de perros o iconos con "carácter" peluguau.
- 💡 Hover con captura del producto por feature (ej. hover en "Agenda" muestra screenshot del calendario).
- 💡 Tab para alternar vistas según rol: "Para el dueño / Para el groomer / Para el cliente".

### `Pricing.tsx` (88 líneas)

- 4 planes coherentes con backend (Free 0€ / Starter 19€ / Pro 49€ / Business 99€).
- ✅ Plan "popular" destacado correctamente (Pro).
- 📐 CTAs van a `/register?plan=ID` directo, salvo Business → `/demo`. OK.
- 📐 Falta `Pricing.tsx:33` "Mas de 8 peluqueros o multi-sucursal?" — copy débil (ver Pricing #1.2).
- 📐 Sin garantía visible.
- 📐 Sin toggle anual/mensual.
- ⚠️ Plan Free debate estratégico (ver hallazgo #17).

### `Testimonials.tsx` (41 líneas)

- 3 testimonios en `plans.ts:92-110`.
- 🎭 **Testimonios probablemente inventados**: "Marta Lopez · Mestiza de Barrio · Madrid", "Joel Ramirez · Pelajes felices · Valencia", "Estela Caballero · El Pelo del Perro · Sevilla". Verificar existencia de los negocios. Si son inventados:
  - **Riesgo legal** (publicidad engañosa, art. 5 LGP, sanción AEPD si hay datos personales).
  - **Riesgo de credibilidad** si un visitante busca el negocio y no existe.
- 🎯 Capturar testimonios reales con foto + autorización por escrito + link al negocio.
- 📐 Sin foto de la persona, sin logo de la peluquería, sin enlace, sin estrellas, sin métricas concretas ("ahorré X horas/semana"). Easy upgrade.
- 💡 Vídeo-testimonio embebido (Loom/YouTube short).
- 💡 Logos de clientes en barra de "Empresas que confían en peluguau".

### `Faq.tsx` (52 líneas)

- ✅ `"use client"` correctamente declarado (interactivo).
- 5 preguntas razonables.
- 📐 Faltan objeciones reales:
  - "¿Cuánto cuesta en comparación con MoeGo / Pawfinity?"
  - "¿Tiene app móvil?"
  - "¿Tiene WhatsApp Business integrado?"
  - "¿Y si quiero exportar mis datos al cancelar?"
  - "¿Soporte está en castellano? ¿Por qué canal? ¿En qué horario?"
  - "¿Acepta Bizum?"
  - "¿Es compatible con Verifactu / SII?"
- 📐 Sin categorías (todas en una lista). Si pasamos de 5 a 12+, dividir en tabs/grupos.
- 📐 Una sola pregunta abierta al inicio (`useState(0)` en línea 8) — bien para SEO, pero considerar abrir según hash (`#faq-precios`) para deep linking.

### `Cta.tsx` (34 líneas)

- ✅ Diseño limpio, dos CTAs claros (Crear cuenta gratis primario, Solicitar demo secundario).
- 📐 Headline algo genérico (`Cta.tsx:9`): "Empieza hoy. Tu primer cliente puede reservar esta noche." — Considerar concretar con dato ("300+ peluquerías ya cobran online con peluguau").
- 💡 Añadir contador / urgencia controlable ("Quedan X plazas en el plan Founders Pro").

### `Footer.tsx` (80 líneas)

- 🐛 **Links legales rotos** (`Footer.tsx:42-46`) — 3 rutas inexistentes (ver hallazgo cross-cutting #1).
- 🐛 Logo path placeholder (ver hallazgo #2).
- 📐 Sin redes sociales (Instagram, TikTok, LinkedIn) — los groomers viven en Instagram, ausencia es señal débil.
- 📐 Sin newsletter signup.
- 📐 Sin sello de seguridad/RGPD compliance.
- 📐 Tagline "Hecho en España" (línea 51) — bueno, conservar.
- ✅ `new Date().getFullYear()` para copyright dinámico — correcto.

---

## 1.6 `app/lib/plans.ts` — Datos de planes, FAQs, testimonios

**Líneas:** 111

- 🐛 Una sola fuente de verdad para Pricing — bien.
- ⚠️ Los precios (`plans.ts:30, 43, 57`) están duplicados respecto al backend (`groomly-backend/lib/billing.ts` presumiblemente). Si cambias precios en uno solo, se desincroniza el cobro real vs la landing.
  - **Mitigación:** definir precios en una sola fuente (env o JSON compartido) o, al menos, añadir test de paridad CI.
- 🐛 Testimonios probablemente inventados (ver `Testimonials.tsx`).
- 🐛 `APP_URL` fallback `"http://localhost:5173"` (línea 1) — riesgo en producción si falta env var (ver registro #1.4).
- 📐 Considerar añadir `TRIAL_DAYS = 14` constante reutilizable en Hero, Pricing, FAQ — hoy "14 dias" está hardcoded en 5+ sitios.

---

## Resumen de prioridades del Bloque 1

### 🚨 Urgente (bloquea producción / compliance)

1. **Crear `/legal/privacidad`, `/legal/terminos`, `/legal/cookies`** o quitar los enlaces del Footer hasta que existan. RGPD lo exige.
2. **Renombrar el logo** y todas las referencias (`Header.tsx:12`, `Footer.tsx:13`).
3. **Eliminar SVGs boilerplate** de `public/` (`next.svg`, `vercel.svg`, `globe.svg`, `window.svg`, `file.svg`).
4. **Sustituir teléfono placeholder** en `demo/page.tsx:70,78` o quitar el bloque del teléfono.
5. **Validar `NEXT_PUBLIC_APP_URL`** en build time (Zod) para evitar deploy con fallback a localhost.

### 🔥 Alta (calidad percibida + conversión)

6. **Restaurar tildes y eñes** en todo el copy (cross-cutting #8). Es un find-and-replace cuidadoso pero rápido.
7. **Convertir `/demo` en formulario real con Cal.com embebido + endpoint `POST /api/landing/demo-request`** + email auto-confirmación.
8. **Decisión estratégica plan Free** (mantener vs matar). Si se mantiene, revisar mensaje "14 días gratis sin tarjeta" para no confundir.
9. **Headline del Hero a promesa medible** (sincronizar con `AUDITORIA_GROOMLY.md`).
10. **Capturar testimonios reales** o señalar visualmente que son ejemplos hasta que existan.

### 🛠️ Media (SEO + branding)

11. Añadir `metadata` específico a `page.tsx` (home).
12. Crear `app/sitemap.ts` y `public/robots.txt`.
13. Añadir Open Graph image (1200×630) y referenciarla en `layout.tsx`.
14. Añadir JSON-LD `SoftwareApplication` en home.
15. Tabla comparativa de features en `/precios`.
16. Garantía pública visible (Hormozi) en Hero y Pricing.

### 📈 Baja / mejora continua

17. Toggle anual/mensual en Pricing.
18. Sección "Cómo funciona" entre Features y Pricing.
19. Sección "Para quién" con avatares.
20. Vídeo/GIF del producto en lugar del mock CSS del Hero.
21. ROI calculator interactivo.
22. Menú hamburguesa móvil.
23. Bandera + selector idioma (preparar i18n).
24. Analytics (Plausible/PostHog/Vercel) + cookie banner.

---

## Endpoints backend identificados (faltan)

- [ ] `POST /api/landing/demo-request` — capturar lead (nombre, peluquería, ciudad, staff, contacto, source, UTMs)
- [ ] `POST /api/landing/newsletter` — si se añade newsletter en Footer
- [ ] `GET /api/landing/social-proof` — número agregado de salones / citas gestionadas para mostrar dinámico

---

## Siguiente paso sugerido

Antes de avanzar al Bloque 2, decidir tres cosas con el Owner para no rehacer trabajo:

1. **Plan Free: vivo o muerto.** Si muere, hay que actualizar `plans.ts`, `Hero.tsx` (badge), `Cta.tsx`, FAQ #1, y comunicar a usuarios actuales del Free (ver `docs/migracion-free-users.md` existente).
2. **Promesa medible del Hero.** Sin esto, todo el copy del Hero/Features/Pricing está construido sobre arena.
3. **¿Demo con humano o auto-servicio?** Si auto-servicio, `/demo` se convierte en sandbox de prueba (no form). Si humano, formulario + Cal.com.

Cuando estos tres puntos estén decididos, atacar Hallazgos críticos #1-5 (urgente) → #6-10 (alta) → resto en orden.
