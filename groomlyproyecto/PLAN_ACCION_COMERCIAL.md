# Plan de Acción Comercial — Groomly

> Ejecución operativa de la [Auditoría Billion Dollar AI Team](AUDITORIA_GROOMLY.md) en formato sprint.
> 6 sprints comerciales de 2 semanas cada uno = 12 semanas (90 días).
> Tracker paralelo a los sprints técnicos (`/sprints/sprint-00...07`), no los sustituye.
> Fecha de inicio sugerida: lunes 18 de mayo de 2026.

---

## Filosofía del Plan

Los sprints comerciales **no son sprints de producto**. No añaden features. Construyen oferta, funnel, narrativa y tráfico. El equipo técnico puede seguir cerrando los sprints 00-07; este plan corre en paralelo y lo lidera quien tenga el rol de **founder / marketing / comercial**.

**Regla de oro:** ninguna feature técnica nueva entra al backlog hasta que la oferta convierta consistentemente. Si la oferta no cierra, más producto no arregla el problema.

**Orden de prioridad según la auditoría** (negocio sin ingresos consistentes):
**Hormozi (Sprints 1-2) → Brunson (Sprints 3-4) → Godin (Sprint 5) → Iteración (Sprint 6).**

---

## Tabla de Sprints

| Sprint | Foco | Asesor principal | Duración | Entregable clave |
|---|---|---|---|---|
| **Comercial 01** | Demolición y reconstrucción de la oferta | Hormozi | 2 semanas | Pricing nuevo + garantía + avatar definido |
| **Comercial 02** | Done-For-You y outreach masivo | Hormozi | 2 semanas | 100 conversaciones + 5 ventas premium |
| **Comercial 03** | Funnel hack y Value Ladder | Brunson | 2 semanas | Lead magnet + tripwire $27 + guion webinar |
| **Comercial 04** | Webinar en producción y secuencias | Brunson | 2 semanas | Webinar grabado + Soap Opera + Dream 100 |
| **Comercial 05** | Posicionamiento, manifiesto y tribu | Godin | 2 semanas | Manifiesto + newsletter + comunidad cerrada |
| **Comercial 06** | Iteración, métricas y escala | Mixto | 2 semanas | 100 clientes pagantes + primer evento |

---

# Sprint Comercial 01 — Demolición y Reconstrucción de la Oferta

**Duración estimada:** 2 semanas (semanas 1-2)
**Asesor principal:** Alex Hormozi
**Objetivo:** Eliminar la oferta commodity actual y sustituirla por una oferta irresistible con precio elevado, garantía pública y avatar reducido.

---

## 1.1 Eliminar el Plan Free

### Tareas
- [ ] Quitar el plan **Free ($0/mes)** del pricing público de la landing.
- [ ] Diseñar el nuevo trial: **14 días con tarjeta requerida**, cobro automático al día 15 si no cancela.
- [ ] Implementar en Stripe: trial period de 14 días con `payment_method` obligatorio al inicio.
- [ ] Migrar usuarios existentes en Free a una de dos opciones (anuncio con 30 días de aviso):
  - Aceptar el trial de 14 días y empezar plan de pago.
  - Exportar sus datos y cerrar cuenta.
- [ ] Actualizar copy: eliminar todas las menciones a "gratis" / "sin coste" / "$0" en landing y materiales.

### Entregable
Página de pricing pública sin plan Free. Sistema de trial con tarjeta funcionando en Stripe. Anuncio enviado a usuarios Free actuales.

---

## 1.2 Nuevo Pricing (Grand Slam Offer)

### Tareas
- [ ] Definir nuevos planes y precios:

  | Plan | Precio actual | Precio nuevo | Justificación |
  |---|---|---|---|
  | Free | $0 | **eliminado** | Mata conversión |
  | Starter | $19/mes | $47/mes | Sube barrera de entrada |
  | Professional | $49/mes | **$97/mes** | Tier ancla principal |
  | Business | $99/mes | **$297/mes** | Multi-sucursal y serio |
  | **Done-For-You** (nuevo) | — | **$1,997 setup + $297/mes** | Backend high-ticket |

- [ ] Actualizar `prisma/schema.prisma` con los nuevos identificadores de plan si es necesario.
- [ ] Actualizar productos y precios en Stripe Dashboard.
- [ ] Reescribir la página de pricing con **Offer Stack visible**: descomponer cada plan en componentes con valor monetario explícito por componente (ej. "Agenda inteligente: $497 — incluido", "Portal cliente: $297 — incluido", etc.).
- [ ] Añadir bloque de "comparación con Excel + WhatsApp manual": cuantificar lo que el dueño pierde al mes en horas y dinero por no usar Groomly.

### Entregable
Nuevo pricing publicado. Stripe configurado. Página de pricing reescrita con Offer Stack.

---

## 1.3 Garantía Pública

### Tareas
- [ ] Redactar garantía pública con condiciones específicas y medibles. Ejemplo:
  > **Garantía Groomly de 60 días:** Si en los primeros 60 días no recuperas al menos **10 horas a la semana en gestión de agenda** y no ves al menos **3 clientes nuevos** llegando por el portal de reservas, te devolvemos el 100% de lo pagado y te transferimos $100 adicionales por las molestias.
- [ ] Añadir página `/garantia` con la garantía completa, condiciones, plazo de reclamación y proceso.
- [ ] Añadir badge/sello de garantía en la página de pricing y en el checkout.
- [ ] Crear endpoint interno o proceso manual para procesar solicitudes de garantía.

### Entregable
Página de garantía pública publicada. Proceso de reclamación documentado internamente.

---

## 1.4 Definición del Avatar (Smallest Viable Market)

### Tareas
- [ ] Workshop interno de 2 horas para definir avatar exacto.
- [ ] Documentar en `/docs/avatar.md`:
  - Datos demográficos (edad, género, ubicación geográfica).
  - Datos del negocio (nº peluqueros, facturación mensual, tipo de servicios).
  - Mentalidad y creencias (qué piensan del grooming, qué les frustra).
  - Dolores específicos verbalizados (las frases que dicen en voz alta).
  - Sueños específicos verbalizados.
  - Dónde consumen contenido (Instagram, YouTube, asociaciones).
  - Qué herramientas usan ahora (Excel, WhatsApp, Calendly, Booksy, otros).
- [ ] Avatar propuesto como punto de partida:
  > "Dueña de peluquería canina independiente en España, 30-45 años, 2-4 peluqueros, factura entre 8.000€ y 25.000€/mes, ve el grooming como oficio artesano, está saturada de WhatsApps de clientes preguntando huecos, usa Excel + Google Calendar y siente que su negocio depende 100% de ella."
- [ ] Validar avatar con 5 entrevistas a clientes actuales o prospectos.

### Entregable
Documento `/docs/avatar.md` validado con entrevistas. Una sola frase de avatar que cabe en una línea.

---

## 1.5 Activar Warm Outreach (semilla del Sprint 2)

### Tareas
- [ ] Construir lista de **200 dueños de peluquería canina** que encajen con el avatar (Google Maps, Instagram, directorios sectoriales).
- [ ] Preparar guion de primer contacto (3 versiones: DM Instagram, WhatsApp directo, email).
- [ ] Empezar a contactar 10 por día desde el día 8 del sprint (mínimo 30 al final del sprint).

### Entregable
Lista de 200 prospectos con datos de contacto. 30 conversaciones iniciadas en los últimos 7 días del sprint.

---

# Sprint Comercial 02 — Done-For-You y Outreach Masivo

**Duración estimada:** 2 semanas (semanas 3-4)
**Asesor principal:** Alex Hormozi
**Objetivo:** Lanzar el servicio premium "Done-For-You" como backend high-ticket y completar 100 conversaciones de outreach para validar la nueva oferta con dinero real.

---

## 2.1 Producto "Done-For-You"

### Tareas
- [ ] Definir paquete Done-For-You ($1,997 setup + $297/mes), entregables exactos:
  - Migración completa de datos (clientes, mascotas, historial) desde Excel/papel.
  - Configuración de servicios, precios, peluqueros y horarios.
  - Configuración de recordatorios automáticos y plantillas de WhatsApp.
  - Configuración del portal cliente con dominio personalizado.
  - 4 sesiones de training de 1 hora (cliente + staff).
  - Soporte prioritario 60 días + manual de operaciones personalizado.
- [ ] Crear página de venta dedicada `/done-for-you` con:
  - Promesa específica (ej: "operativo en 7 días, sin que tú toques nada").
  - Comparación con la opción DIY.
  - Testimonios (cuando los haya — al principio puede ser "primeros 5 clientes con descuento del 50% a cambio de testimonio").
  - Garantía reforzada.
- [ ] Crear checklist operativo interno de implementación (qué hace el equipo Groomly paso a paso en cada onboarding).

### Entregable
Página `/done-for-you` publicada. Checklist operativo documentado. Primeros 2-3 clientes contratando este paquete.

---

## 2.2 100 Conversaciones de Outreach

### Tareas
- [ ] Contactar 10-15 dueños por día durante 10 días laborables (mínimo 100 conversaciones).
- [ ] Estructura de cada conversación:
  1. Romper hielo desde algo específico de su negocio (visto en Instagram, Google Reviews, etc.).
  2. Preguntar por su situación operativa actual (no vender).
  3. Si hay dolor explícito → presentar Groomly como solución específica al dolor mencionado.
  4. Ofrecer una de tres rutas: demo 30 min, trial 14 días, o paquete Done-For-You.
- [ ] Registrar cada conversación en un CRM simple (Airtable, Notion, o Excel) con campos: nombre, peluquería, dolor principal, objeción principal, próximo paso, fecha.
- [ ] Iterar el guion cada 25 conversaciones basado en lo que escuchas (las objeciones reales redefinen la oferta).

### Entregable
100+ conversaciones registradas. Documento con las 10 objeciones más frecuentes y respuestas. Mínimo 5 ventas (trial paid o Done-For-You).

---

## 2.3 Iteración de la Oferta Basada en Outreach

### Tareas
- [ ] Reunión de iteración al final del sprint para revisar:
  - ¿Qué objeción aparece en más del 50% de conversaciones? → reformular oferta para neutralizarla.
  - ¿Qué frase concreta hizo cerrar a los que compraron? → meterla en la página de pricing.
  - ¿Qué precio dijeron "demasiado caro" más del 30% del tiempo? → revisar value stack, no necesariamente bajar precio.
- [ ] Actualizar copy de landing, página de pricing y guion de outreach con los aprendizajes.

### Entregable
Documento `/docs/feedback-mercado.md` con las 10 frases que más resonaron, las 10 objeciones, y la versión iterada de la oferta.

---

# Sprint Comercial 03 — Funnel Hack y Construcción de la Value Ladder

**Duración estimada:** 2 semanas (semanas 5-6)
**Asesor principal:** Russell Brunson
**Objetivo:** Replicar lo que ya funciona en competidores, construir bait + tripwire, y dejar listo el guion del Perfect Webinar.

---

## 3.1 Funnel Hack de 3 Competidores

### Tareas
- [ ] Identificar 3 competidores directos. Sugerencia: **MoeGo, Gingr, Pawfinity**.
- [ ] Para cada competidor, suscribirse y documentar:
  - Página de inicio + página de pricing.
  - Lead magnets ofrecidos (descargar todos).
  - Secuencia de emails post-optin (al menos 14 días).
  - Webinars/VSL/demos (registrarse y verlos completos).
  - Tripwires/frontends de bajo coste (comprar si los hay).
  - Upsells y order bumps en el checkout.
- [ ] Crear documento `/docs/funnel-hack.md` con capturas, copy, secuencias y estructura de cada uno.
- [ ] Identificar 3 patrones repetidos y 3 huecos no cubiertos por ningún competidor.

### Entregable
Documento `/docs/funnel-hack.md` con análisis completo de 3 competidores y mapa de oportunidades.

---

## 3.2 Lead Magnet (Bait Gratuito)

### Tareas
- [ ] Crear PDF de 8-12 páginas titulado:
  > **"7 plantillas de WhatsApp para reducir no-shows en peluquerías caninas (probadas con +500 citas)"**
- [ ] Contenido: 7 plantillas concretas + cuándo enviar cada una + por qué funciona + cómo medir resultado.
- [ ] Diseño limpio en Canva o similar.
- [ ] Crear landing `/recursos/plantillas-no-shows` con:
  - Headline orientado al beneficio.
  - 3 bullets de qué obtiene.
  - Formulario simple: nombre + email.
  - Doble opt-in para verificar email.
- [ ] Conectar formulario a sistema de email marketing (Brevo, ConvertKit, Mailerlite — elegir uno).

### Entregable
PDF publicado. Landing del lead magnet activa. Sistema de email marketing conectado. Primer test con 50 visitantes para medir tasa de optin (objetivo: >25%).

---

## 3.3 Tripwire ($27 Frontend)

### Tareas
- [ ] Crear **mini-curso en vídeo** titulado:
  > **"Digitaliza tu peluquería canina en 7 días — Sistema paso a paso para dejar Excel y WhatsApp manual"**
- [ ] 7 vídeos de 10-15 minutos cada uno (uno por día), entregados por email diariamente o todos juntos en plataforma simple (Thinkific, Teachable, o Notion con vídeos privados).
- [ ] Contenido del mini-curso (no es venta de Groomly, es valor real):
  - Día 1: Auditoría de tu sistema actual y dónde pierdes dinero.
  - Día 2: Cómo digitalizar la agenda sin perder a los clientes mayores.
  - Día 3: Plantillas de WhatsApp para automatizar confirmaciones.
  - Día 4: Cómo subir precios sin perder clientes.
  - Día 5: Sistema de fidelización casero antes de invertir en software.
  - Día 6: Cómo medir si tu peluquería gana dinero de verdad.
  - Día 7: Roadmap personal para digitalizar tu peluquería en 30 días.
- [ ] Crear página de venta del tripwire en `/digitaliza-tu-peluqueria` con copy directo: $27, garantía 30 días, no upsells agresivos.
- [ ] **Al final del Día 7 del mini-curso:** OTO directa para trial de Groomly Professional o demo del Done-For-You.

### Entregable
Mini-curso publicado y accesible tras pago. Página de venta activa. Sistema de entrega automatizado por email.

---

## 3.4 Guion del Perfect Webinar (sin grabar todavía)

### Tareas
- [ ] Redactar guion de 60 minutos siguiendo la estructura Brunson:
  - **Intro y rapport** (10 min): "¿Quién soy y por qué estás aquí?".
  - **Big Domino** (5 min): la creencia que si la cambias, todo lo demás cae solo. Ej: *"La razón por la que tu peluquería no escala no es que necesites más clientes, es que pierdes el 40% de los actuales en la gestión manual."*
  - **Secreto 1: Vehículo** (10 min): por qué el método antiguo no funciona (Excel + WhatsApp manual).
  - **Secreto 2: Creencia interna** (10 min): por qué crees que no puedes hacerlo (mito derribado: "yo no soy técnica").
  - **Secreto 3: Creencia externa** (10 min): por qué crees que el entorno no te deja (mito derribado: "mis clientes no son digitales").
  - **Stack y oferta** (10 min): Groomly Professional + Setup + bonos.
  - **Cierre con urgencia** (5 min): bonus que desaparece, precio que sube, etc.
- [ ] Diseñar slides en Google Slides o Keynote (60-100 slides).
- [ ] Revisar guion con 1-2 personas externas para detectar puntos flojos.

### Entregable
Guion del webinar finalizado en `/docs/webinar-guion.md`. Slides en estado "draft revisado".

---

# Sprint Comercial 04 — Webinar en Producción y Secuencias Automatizadas

**Duración estimada:** 2 semanas (semanas 7-8)
**Asesor principal:** Russell Brunson
**Objetivo:** Tener el webinar grabado y operativo, secuencias de email funcionando, y haber activado Dream 100.

---

## 4.1 Grabación y Publicación del Webinar

### Tareas
- [ ] Grabar el webinar en estudio o setup casero profesional (mejor calidad audio que vídeo).
- [ ] Editar a 60 minutos exactos. Cortar todo lo que no aporte tensión, certeza o avance.
- [ ] Subir a plataforma de webinar evergreen (WebinarJam, EverWebinar, Demio, o Zoom + automatización propia).
- [ ] Crear landing de registro al webinar `/masterclass` con:
  - Promesa específica.
  - Próximas sesiones disponibles (3-5 horarios distintos al día).
  - Formulario simple.
- [ ] Configurar secuencia post-registro:
  - Email de confirmación + recordatorios.
  - Email durante el webinar con enlace.
  - Email post-webinar con resumen + oferta.
- [ ] Test: 50 registros + 1 sesión piloto antes de escalar tráfico.

### Entregable
Webinar evergreen funcionando. Landing de registro activa. Primer registro real convertido en cliente.

---

## 4.2 Soap Opera Sequence (Email Marketing)

### Tareas
- [ ] Redactar **5 emails** estructurados según Brunson:
  - **Email 1 — Hook:** "Casi me cargo mi peluquería en 2024" (apertura emocional fuerte, sin cerrar la historia).
  - **Email 2 — Backstory:** por qué este problema te importa, contexto personal.
  - **Email 3 — Epiphany:** el momento exacto en que descubriste el nuevo enfoque.
  - **Email 4 — Hidden Benefit:** beneficio inesperado del nuevo enfoque + crítica al método tradicional.
  - **Email 5 — Urgent CTA:** oferta directa con razón creíble de urgencia.
- [ ] Configurar la secuencia en el sistema de email marketing: se dispara automáticamente cuando alguien descarga el lead magnet.
- [ ] Después del email 5, pasar a la **Seinfeld Sequence**: emails de mantenimiento conversacionales 2-3 veces por semana indefinidamente.

### Entregable
5 emails Soap Opera redactados y automatizados. Plantilla de Seinfeld con 20 ideas listas para los primeros 2 meses.

---

## 4.3 Dream 100 — Activación

### Tareas
- [ ] Completar la lista de **100 cuentas** clave (si no se hizo en sprints anteriores):
  - 20 peluqueros caninos influencers en Instagram.
  - 10 escuelas de peluquería canina con presencia digital.
  - 5 asociaciones sectoriales (ANPCC, AEPGTPM, GACC, etc.).
  - 15 distribuidores de productos de grooming.
  - 20 canales YouTube/TikTok de grooming en español.
  - 10 podcasts del sector (si existen).
  - 20 grupos cerrados de Facebook/WhatsApp de peluqueros.
- [ ] Para cada cuenta, definir:
  - Tipo de relación inicial (cliente, colaborador, sponsor).
  - Qué les ofrecemos a cambio de exposición.
  - Persona del equipo responsable del contacto.
- [ ] Empezar contacto con **20 cuentas** durante el sprint, objetivo: 3-5 colaboraciones cerradas.

### Entregable
Lista Dream 100 completa en hoja de cálculo. Plan de aproximación por cuenta. 3-5 colaboraciones cerradas (post de Instagram patrocinado, webinar conjunto, descuento para sus alumnos, etc.).

---

## 4.4 OTOs y Upsells en el Funnel

### Tareas
- [ ] Implementar order bumps en checkout del tripwire ($27):
  - Order bump: "Añade el pack de plantillas de email (no solo WhatsApp) por solo $17 más".
- [ ] Implementar OTO inmediatamente después de comprar tripwire:
  - "Reserva tu demo personalizada de Groomly por $97 (deducible si contratas)".
- [ ] Implementar OTO post-trial de Groomly:
  - "Hazlo Done-For-You por $1,997 — ahorra 20h de configuración".

### Entregable
Order bumps y OTOs configurados en el funnel. Aumento medible del AOV (Average Order Value) en el tripwire (+30% mínimo).

---

# Sprint Comercial 05 — Posicionamiento, Manifiesto y Tribu

**Duración estimada:** 2 semanas (semanas 9-10)
**Asesor principal:** Seth Godin
**Objetivo:** Cambiar Groomly de "ERP genérico" a "movimiento con voz", construyendo manifiesto, narrativa y los cimientos de una tribu.

---

## 5.1 Manifiesto Público

### Tareas
- [ ] Escribir manifiesto en **una sola página** que articule:
  - **A quién va dirigido** (no "todos", el avatar exacto).
  - **Qué creencia comparte** la marca con el cliente.
  - **Qué historia se cuenta** el cliente cuando elige Groomly.
  - **Qué cambio concreto** produce en su vida.
  - **Quién NO encaja** (declaración explícita de exclusión).
- [ ] Borrador inicial sugerido (a iterar):
  > *"Creemos que el grooming es arte, no un servicio commodity. Creemos que las peluquerías caninas independientes merecen herramientas tan profesionales como las grandes cadenas. Creemos que tu negocio no debería depender de ti 24/7. Si tratas a los perros como mercancía o buscas la opción más barata, este software no es para ti. Si quieres elevar el estatus de tu profesión y construir un negocio que funcione mientras tú vives, bienvenida."*
- [ ] Publicar el manifiesto en la página `/manifiesto`.
- [ ] Enlazar desde la home, el footer y el primer email post-optin.

### Entregable
Página `/manifiesto` publicada. Enlace desde el resto del sitio.

---

## 5.2 Reescritura del Copy Principal

### Tareas
- [ ] Reescribir la **homepage** desde el ángulo de la transformación, no de las funciones:
  - Headline antes: *"ERP para peluquerías caninas"* (categoría).
  - Headline después: *"El sistema operativo de las peluquerías caninas que quieren ser tomadas en serio"* (identidad).
- [ ] Reescribir la **página de pricing** integrando elementos del manifiesto.
- [ ] Reescribir la **página /about** o `/quienes-somos` con la historia real del fundador (epiphany bridge).
- [ ] Reescribir **bio y descripción** en redes sociales para reflejar el nuevo posicionamiento.

### Entregable
Homepage, pricing, about y redes alineados con el manifiesto. A/B test interno con 100 visitantes para medir si la nueva home convierte mejor.

---

## 5.3 Newsletter Semanal (Permission Marketing)

### Tareas
- [ ] Definir nombre, día de envío fijo y ángulo editorial de la newsletter.
- [ ] Ejemplos de nombre: *"Lunes de Pelo"* / *"El Box Profesional"* / *"Cartas desde el salón"*.
- [ ] Día sugerido: lunes 7:00am (cuando la dueña abre el WhatsApp del trabajo).
- [ ] Estructura semanal:
  - **Una idea fuerte** del sector (200-400 palabras).
  - **Un caso real** de cliente o de la propia operación.
  - **Una herramienta o recurso** descargable.
  - **Un PD** con guiño personal o pregunta abierta.
- [ ] Preparar **8 newsletters** (2 meses) por adelantado antes de lanzar.
- [ ] Mover toda la base de email (lead magnet, tripwire, clientes, trials) a la newsletter como canal de mantenimiento.

### Entregable
8 newsletters escritas y programadas. Sistema de envío configurado. Primer envío en el sprint.

---

## 5.4 Posicionamiento Controversial

### Tareas
- [ ] Decidir y publicar **1 posición pública controversial** del sector. Opciones:
  - *"No vendemos a peluquerías que cobren menos de 35€ el corte. Aquí explicamos por qué."*
  - *"Las cadenas low-cost están matando el oficio. Por eso Groomly nunca trabajará con ellas."*
  - *"Las peluquerías caninas no deberían existir si no operan con criterios sanitarios profesionales. Esta es nuestra posición."*
- [ ] Convertir esa posición en **un artículo o vídeo** publicado en la web + redes.
- [ ] Aceptar que polarizará. Medir reacciones: el éxito es comentarios fuertes a favor Y en contra, no silencio.

### Entregable
1 publicación pública controversial. Reacciones medidas (positivas + negativas) y respondidas individualmente.

---

## 5.5 Comunidad Cerrada para Clientes

### Tareas
- [ ] Elegir plataforma. Sugerencias: **WhatsApp Community** (España, baja fricción) o **Circle/Discord** (más features, más fricción).
- [ ] Definir normas, formato y ritmo:
  - Solo clientes pagantes.
  - Posts del fundador 2 veces/semana.
  - 1 sesión Q&A en vivo al mes.
  - Canales por temas (agenda, marketing, finanzas, off-topic).
- [ ] Crear bienvenida automática para nuevos clientes con onboarding a la comunidad.
- [ ] Invitar a los **primeros 30 clientes** y empezar conversación.

### Entregable
Comunidad cerrada activa con 30+ miembros. Primer Q&A en vivo realizado.

---

# Sprint Comercial 06 — Iteración, Métricas y Escala

**Duración estimada:** 2 semanas (semanas 11-12)
**Asesor principal:** Mixto (decisiones basadas en datos)
**Objetivo:** Cerrar el ciclo de 90 días con métricas claras, optimizaciones basadas en datos reales, y primeros hitos de escala.

---

## 6.1 Dashboard de Métricas

### Tareas
- [ ] Implementar dashboard simple (Google Sheets, Notion, o herramienta dedicada) con métricas clave:
  - **Adquisición:** visitantes → optins → tripwire → trial → paid (funnel completo con %).
  - **Conversión:** tasa de cierre del webinar, del outreach, del tripwire.
  - **Retención:** churn mensual, % trial → paid, LTV estimado.
  - **Economía:** CAC por canal, payback period.
  - **Operativo:** nº demos, nº onboardings Done-For-You, NPS de clientes activos.
- [ ] Revisar semanalmente. Decisiones basadas en datos, no opiniones.

### Entregable
Dashboard funcionando con datos reales de los 60 días anteriores. Ritual semanal de revisión calendarizado.

---

## 6.2 Optimización del Webinar

### Tareas
- [ ] Revisar grabación del webinar con datos:
  - ¿En qué minuto se va más gente?
  - ¿Qué slide es la que más comentarios genera?
  - ¿Qué objeción no está siendo respondida?
- [ ] Hacer **1 iteración profunda** del guion y regrabar segmentos críticos.
- [ ] Test A/B con dos versiones del webinar durante 2 semanas si hay suficiente volumen.

### Entregable
Webinar v2 con mejoras documentadas. Aumento medible de la tasa de conversión (mínimo +20%).

---

## 6.3 Escalado del Dream 100

### Tareas
- [ ] Pasar de "lista" a "10 colaboraciones cerradas" durante el sprint.
- [ ] Diseñar **paquete específico para colaboradores** (sponsor):
  - Comisión por referido (ej: 30% del primer año).
  - Códigos de descuento personalizados.
  - Materiales co-brandeados.
- [ ] Activar el primer **podcast del fundador** (si el nicho lo soporta) o el primer **YouTube** documentando casos reales.

### Entregable
10 colaboraciones activas con tracking de revenue. Primer canal de contenido propio lanzado.

---

## 6.4 Hito de 100 Clientes Pagantes

### Tareas
- [ ] Si aún no se ha alcanzado, **outreach final intensivo** para llegar a 100 clientes pagantes en cualquier tier.
- [ ] Si ya se alcanzó, plantear objetivo de 200 para los próximos 90 días.
- [ ] Hacer **5 entrevistas en profundidad** con clientes que ya pagan para extraer:
  - Por qué decidieron pagar.
  - Qué casi les hizo no pagar.
  - Qué les sorprendió positivamente.
  - Qué recomendarían cambiar.
- [ ] Usar esas entrevistas como input para el siguiente ciclo de 90 días.

### Entregable
100+ clientes pagantes. 5 entrevistas grabadas y transcritas. Plan de los siguientes 90 días redactado.

---

## 6.5 Primer Evento de la Comunidad

### Tareas
- [ ] Organizar **primer evento** (virtual o físico):
  - Si virtual: masterclass + Q&A en vivo de 90 min, solo para clientes y comunidad.
  - Si físico (más adelante): meetup de 1 día en Madrid o Barcelona con 30-50 dueños.
- [ ] Tema centrado en una transformación concreta (ej: "Cómo subir tu ticket medio 40% en 60 días").
- [ ] Grabar y reutilizar como contenido post-evento.

### Entregable
Evento celebrado con asistencia documentada. Material grabado para reutilización. Primer feedback formal de la comunidad.

---

# Definición de Éxito al Final de los 90 Días

| Métrica | Objetivo |
|---|---|
| **Plan Free** | Eliminado, todos los usuarios migrados o cerrados |
| **Precio Professional** | Subido a $97/mes y validado por compras reales |
| **Done-For-You** | Lanzado con mínimo 5 clientes contratando |
| **Garantía pública** | Activa, publicada y probada (mínimo 1 reclamación procesada) |
| **Avatar** | Definido, documentado y validado con 5+ entrevistas |
| **Outreach** | 100+ conversaciones registradas y analizadas |
| **Lead magnet** | Publicado con tasa de optin >25% |
| **Tripwire $27** | Operativo con ventas reales recurrentes |
| **Webinar** | Grabado, evergreen, con tasa de cierre >8% |
| **Soap Opera Sequence** | Automatizada y funcionando |
| **Dream 100** | Lista completa + 10 colaboraciones activas |
| **Manifiesto** | Publicado, enlazado, integrado en copy |
| **Newsletter** | 8+ números enviados, lista en crecimiento |
| **Comunidad** | Activa con 30+ miembros |
| **Clientes pagantes** | 100+ |
| **MRR** | Calcular según mix de tiers. Objetivo orientativo: 8.000€-15.000€ MRR |

---

# Reglas de Operación del Plan

1. **Un sprint = 2 semanas, sin excepción.** Si una tarea no se cierra, no se extiende el sprint, se replanifica en el siguiente o se elimina.
2. **Revisión semanal** los lunes a primera hora: qué se cerró, qué quedó pendiente, qué bloquea.
3. **Retrospectiva al final de cada sprint** con 3 preguntas: ¿Qué funcionó? ¿Qué no? ¿Qué cambiamos?
4. **No mezclar sprints técnicos y comerciales.** El equipo técnico cierra su backlog; este plan corre en paralelo con dueño distinto.
5. **Cero features nuevas mientras no convierta la oferta.** Si Sprint 02 no genera 5 ventas reales, repetir Sprint 01-02 antes de avanzar.
6. **Documentar todo en `/docs`**, no en chats. Las decisiones deben quedar trazables.

---

# Notas

- Este plan asume que **el producto técnico está suficientemente maduro** para soportar primeros clientes pagantes (sprints técnicos 00-04 cerrados como mínimo). Si no es así, los sprints comerciales 03+ se retrasan hasta tener producto vendible.
- Los **asesores no usados en este plan** (Kennedy, Belfort, Gary Vee) entran en una **segunda fase** (mes 4-6) cuando ya haya copy que iterar (Kennedy), llamadas de ventas con volumen para entrenar al equipo (Belfort) y suficiente tracción para invertir en contenido orgánico a escala (Gary Vee).
- **Si en sprint 02 las 100 conversaciones devuelven cero ventas**, no es un problema de ejecución, es un problema de oferta o de nicho. Volver a Hormozi y rediseñar antes de seguir.

---

*Plan generado a partir de la [Auditoría Billion Dollar AI Team](AUDITORIA_GROOMLY.md). No sustituye el criterio del fundador en decisiones operativas concretas; es una guía estructurada para ejecutar las recomendaciones de los asesores en 90 días.*
