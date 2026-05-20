# Auditoría Estratégica de Groomly

> Análisis del producto Groomly (ERP SaaS para peluquerías caninas) aplicando el consejo asesor virtual **Billion Dollar AI Team**.
> Asesores activados: **Alex Hormozi** (oferta/precio), **Russell Brunson** (funnel/value ladder) y **Seth Godin** (posicionamiento/diferenciación).
> Fecha: 12 de mayo de 2026.

---

## Tabla de Contenidos

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [Caso Analizado](#2-caso-analizado)
3. [Análisis: Alex Hormozi — Oferta y Pricing](#3-análisis-alex-hormozi--oferta-y-pricing)
4. [Análisis: Russell Brunson — Funnel y Value Ladder](#4-análisis-russell-brunson--funnel-y-value-ladder)
5. [Análisis: Seth Godin — Posicionamiento y Diferenciación](#5-análisis-seth-godin--posicionamiento-y-diferenciación)
6. [Síntesis y Orden de Acción](#6-síntesis-y-orden-de-acción)
7. [Roadmap Sugerido (90 días)](#7-roadmap-sugerido-90-días)

---

## 1. Resumen Ejecutivo

**Diagnóstico unificado:** Groomly está bien construido como software pero mal construido como negocio. El producto técnico (backlog de sprints 00-07) avanza correctamente, pero los tres pilares comerciales (oferta, funnel y posicionamiento) están vacíos o son commodity.

**Tres conclusiones que comparten los tres asesores:**

1. **El nicho es demasiado ancho.** "Peluquerías caninas" no es un nicho, es una categoría. Hay que reducir hasta dolerle al equipo.
2. **El precio es commodity.** $19-$99/mes te coloca en la guerra de descuentos contra MoeGo, Gingr, Pawfinity. Esa guerra no se gana.
3. **No hay funnel, no hay narrativa, no hay tribu.** Solo hay una página de pricing esperando que la gente decida sola.

**Cuello de botella actual:** No es el producto. Es la oferta + el funnel + el posicionamiento.

---

## 2. Caso Analizado

| Dimensión | Estado Actual |
|---|---|
| **Producto** | ERP SaaS multi-tenant para peluquerías caninas. Funcionalidades core: citas, mascotas, clientes, peluqueros, finanzas, inventario, fidelización, portal cliente. |
| **Stack** | Node 20 + Express + Prisma + SQLite/Postgres + React 19/Vite + Tailwind 4 + Stripe. Landing pública con Next.js. |
| **Pricing** | Free ($0/mes) → Starter ($19/mes) → Professional ($49/mes) → Business ($99/mes). |
| **Trial** | 14 días (mencionado en `subscriptionStatus`). |
| **Onboarding** | Implícito en el flujo (verificación email → configuración inicial → dashboard). No hay servicio profesional de implementación. |
| **Estrategia comercial** | No documentada en repo. |
| **Estrategia de marca** | No documentada en repo. |

---

## 3. Análisis: Alex Hormozi — Oferta y Pricing

### Diagnóstico

Esto no es una oferta, es una lista de funcionalidades con precios sacados del aire. $19, $49, $99 es pricing de commodity, comparable a cualquier ERP genérico. **La oferta es débil y se está enmascarando como un problema de "construir el producto".** El 80% de los problemas que parecen de marketing son problemas de oferta.

### Problemas Detectados

- **El plan Free te está matando.** Has entrenado al mercado a pensar que esta categoría debería ser gratis. El 95% de los free nunca pagan y consumen soporte. Los serios pagan; los freebies son ruido.
- **Cero promesa medible.** ¿Qué le prometes al dueño de la peluquería? "Gestionar citas" no es un resultado, es una característica. ¿Le devuelves 10 horas a la semana? ¿Le subes el ticket medio un 23%? ¿Reduces no-shows al <5%? Nada de eso está articulado.
- **Sin garantía.** No existe "si no recuperas X horas al mes en 30 días, te devuelvo el dinero". Síntoma claro de inseguridad en el resultado.
- **Pricing por "asientos" y "citas/mes".** Estás vendiendo software, no resultado. El dueño no compra "200 citas/mes", compra "más cobros, menos huecos vacíos, menos llamadas para confirmar".
- **No hay onboarding profesional ni servicio de implementación.** Una peluquería sin agenda digital necesita que alguien le suba sus clientes, configure servicios y entrene al staff. Eso vale $1,500 y nadie en este modelo lo está cobrando.
- **Avatar difuso.** "Peluquerías caninas" es demasiado amplio. ¿1 peluquero o 10? ¿Independiente o cadena? ¿España o LATAM? ¿Premium o low-cost?

### Aplicación del Value Equation

| Palanca | Estado | Acción |
|---|---|---|
| Resultado soñado | Vago, no articulado | Articular el cambio: "X horas/semana recuperadas + Y€ más de ticket medio" |
| Probabilidad percibida de éxito | Baja (muchos competidores) | Añadir garantía pública + casos de éxito + reviews verificadas |
| Tiempo de espera | Sin onboarding rápido visible | Servicio de migración 7-días "ready-to-use" |
| Esfuerzo y sacrificio | Alto (configurar todo) | Servicio "Done-For-You" como add-on premium |

### Recomendaciones Concretas

1. **Mata el Free. Hoy.** Sustitúyelo por trial de 14 días con tarjeta requerida. El acceso fricciona, la calidad de leads sube, la tasa de conversión paid se multiplica.
2. **Sube precios x3-x5 y construye un Grand Slam Offer.** Ejemplo: en vez de $99/mes a secas, ofrece "$297 setup único + $97/mes" con garantía pública: *"Si tu peluquería no recupera 10 horas/semana en agenda en los primeros 60 días, te devuelvo todo + te pago $100 por la pérdida de tiempo"*.
3. **Recompone la oferta como Offer Stack** con valor explícito por componente:
   - Agenda inteligente con prevención de no-shows: $497
   - Portal cliente con reservas online: $297
   - Sistema de fidelización + cupones: $397
   - Recordatorios automáticos SMS/email: $297
   - Reports financieros y de productividad: $297
   - **Total en valor: $1,785/año. Precio: $97/mes.**
4. **Niche down hasta que duela.** Avatar exacto sugerido: *"Peluquerías caninas independientes con 2-4 peluqueros que facturan entre 8.000€ y 25.000€ al mes, en España, con dueña mujer 30-45 años"*. Habla SOLO a ese avatar.
5. **Activa Warm Outreach masivo durante 30 días.** Si esta semana no contactaste personalmente a 100 dueños de peluquería, el problema no es el producto.

### Acción Inmediata

> Quita el plan Free. Sustituye por trial 14 días con tarjeta. Sube Professional a $97 y Business a $297. Añade hoy mismo una garantía pública de devolución a 60 días.

### Lenguaje Hormozi

> *"Make offers so good people feel stupid saying no. The market is never saturated, your offer is just weak. Volume solves all problems."*

---

## 4. Análisis: Russell Brunson — Funnel y Value Ladder

### Diagnóstico

Tienes una **"lista de precios", no una Value Ladder**. Tienes un producto, no un funnel. Estás construyendo un SaaS como si la gente llegara sola a la página de pricing y eligiera plan racionalmente. **El dinero está en el follow-up funnel, no en el front-end funnel.**

### Problemas Detectados

- **Value Ladder plana y lineal.** $0→$19→$49→$99. ¿Dónde está el bait gratuito que captura email? ¿Dónde está el frontend de $7-$27 que convierte navegador → comprador? ¿Dónde está el backend de $1,500-$5,000 (consultoría, setup white-glove, marketing automation hecho por ti)? Ningún negocio debe existir con un solo producto, y mucho menos con un solo nivel de pricing.
- **No hay mecanismo de conversión visible.** ¿Cómo llega el dueño de peluquería a la página de pricing? ¿Hay webinar? ¿VSL? ¿Demo? Si la respuesta es "se registra solo en la landing", estás perdiendo el 95%.
- **Cero seguimiento.** No veo Soap Opera Sequence, no veo emails de bienvenida con historia, no veo recuperación de carritos abandonados, no veo onboarding por email automatizado.
- **Tráfico a homepage genérica.** La página intenta vender a "todos". Necesitas funnels específicos: uno para "peluquería con 1 peluquero que quiere digitalizarse", otro para "salón con 5+ peluqueros que quiere multi-sucursal".
- **No hay Dream 100.** ¿Quiénes son las 100 cuentas de Instagram/YouTube/Facebook de educación grooming, asociaciones de peluqueros caninos, distribuidores de productos, escuelas? Ahí vive ya tu cliente. No estás ahí.
- **Posicionamiento como "mejora" en vez de "nueva oportunidad".** Groomly se vende como "mejor ERP", no como "nueva categoría". El cerebro confundido siempre dice no.

### Value Ladder Recomendada

```
        ┌─────────────────────────────────────────────────────────┐
        │  Backend High-Ticket                                     │
        │  "Groomly Done-For-You"                                  │
        │  $1,997 setup + $297/mes                                 │
        │  → Te montamos todo, migramos clientes,                 │
        │    configuramos automatizaciones, 4 sesiones training    │
        └─────────────────────────────────────────────────────────┘
                              ▲
        ┌─────────────────────────────────────────────────────────┐
        │  Core Product                                            │
        │  Groomly Professional                                    │
        │  $97/mes (con setup $297 incluido)                       │
        └─────────────────────────────────────────────────────────┘
                              ▲
        ┌─────────────────────────────────────────────────────────┐
        │  Frontend (Tripwire)                                     │
        │  "Mini-curso: Digitaliza tu peluquería en 7 días"        │
        │  $27 one-time                                            │
        │  → Convierte lead en comprador                           │
        └─────────────────────────────────────────────────────────┘
                              ▲
        ┌─────────────────────────────────────────────────────────┐
        │  Bait (Lead Magnet)                                      │
        │  "7 plantillas de WhatsApp para reducir no-shows en      │
        │   peluquerías caninas" (PDF gratuito)                    │
        │  → Captura email + crea el problema que solo            │
        │    Groomly resuelve completamente                        │
        └─────────────────────────────────────────────────────────┘
```

### Recomendaciones Concretas

1. **Construye la Value Ladder completa** (ver diagrama arriba). Empieza por diseñar el backend high-ticket y trabaja hacia atrás.
2. **Perfect Webinar de 60 minutos**, título sugerido: *"Cómo llené mi peluquería canina sin invertir en publicidad usando 3 sistemas que ningún competidor está copiando"*. Estructura: Hook → Big Domino → 3 Secretos que destruyen 3 objeciones (vehículo / interna / externa) → Stack → Cierre con urgencia. Pitch al final → trial Groomly. Convierte 8-15% si está bien hecho.
3. **Soap Opera Sequence de 5 emails** desde el momento de captura del email:
   - Día 1: Hook + apertura de historia
   - Día 2: Backstory + por qué este problema te importa
   - Día 3: Epifanía (cómo descubriste el nuevo enfoque)
   - Día 4: Beneficio oculto + crítica al enfoque tradicional
   - Día 5: Oferta directa + urgencia
4. **Dream 100 inmediato.** Lista hoy mismo las 100 cuentas/plataformas donde ya vive tu audiencia: peluqueros caninos influencers, asociaciones (ANPCC, AEPGTPM, GACC), escuelas de peluquería canina, distribuidores de productos, canales YouTube de grooming. Una columna adicional: "qué les ofrezco a cambio de exposición".
5. **OTOs (One-Time Offers) tras cada compra.** Si alguien se hace trial → ofrécele al minuto siguiente el mini-curso de $27. Si paga el mini-curso → ofrécele el setup white-glove. Cada conversión es una nueva oportunidad de venta.

### Acción Inmediata

> **Funnel hack** 3 competidores directos (MoeGo, Gingr, Pawfinity) esta semana. Suscríbete a sus emails, descarga sus lead magnets, mira sus webinars, compra sus tripwires. Documenta el funnel completo de cada uno. **No improvises, copia primero**, optimiza después.

### Lenguaje Brunson

> *"You're one funnel away. The money is in the follow-up funnel, not the front-end funnel. A confused mind always says no. Funnel hack first. Build second."*

---

## 5. Análisis: Seth Godin — Posicionamiento y Diferenciación

### Diagnóstico

Te llamas "Groomly" y vendes "ERP para peluquerías caninas". **Eso no es una marca, es una descripción de categoría.** La pregunta no es cómo construir el software. La pregunta es: **¿por qué alguien hablaría de Groomly con otro dueño de peluquería sin que se lo pidas?**

### Problemas Detectados

- **No es una Purple Cow.** Tu producto, tal como está descrito, es indistinguible de MoeGo, Gingr, Pawfinity, Vagaro, y todos los competidores. **La posición segura del centro es la posición más peligrosa.** Vacas moradas se propagan solas; vacas grises desaparecen.
- **"Para todas las peluquerías caninas" = para nadie.** No hay Smallest Viable Market identificado. La masificación viene después de servir a los extremos, no antes.
- **Ausencia de worldview.** ¿Qué creencia previa del dueño activa Groomly? Si no puedes terminar la frase *"Groomly es para los peluqueros caninos que creen que ___"*, no tienes posicionamiento.
- **No vendes una historia que el cliente se cuente a sí mismo.** Volvo vende "soy responsable". Patagonia vende "me importa el planeta". Groomly vende... ¿"soy organizado"? Demasiado tibio, no es identidad.
- **Marketing de interrupción disfrazado.** La estrategia parece "estar listados en directorios y aparecer en búsquedas". Eso es competir en precio en el siguiente paso. SEO y volumen ≠ servir a la audiencia.
- **Sin tribu, sin permiso.** No hay newsletter, no hay comunidad, no hay un mecanismo de conexión entre los clientes.
- **Diseñado para el promedio.** Para no ofender a nadie, no atrae a nadie con fuerza.

### Frameworks Aplicados

| Framework | Estado actual | Acción |
|---|---|---|
| **Smallest Viable Market** | No definido | Definir avatar extremo y específico |
| **Purple Cow** | Producto indistinguible | Tomar posición pública controversial |
| **Tribes** | No existe | Construir movimiento + comunidad |
| **Permission Marketing** | No existe | Newsletter semanal + lista |
| **Worldview** | No articulada | Manifiesto público en 1 página |
| **Tensión, Status y Worldview** | No usados | Articular el cambio de identidad |
| **All Marketers Tell Stories** | Sin historia | Historia que el cliente se cuenta |

### Recomendaciones Concretas

1. **Define el Smallest Viable Market.** Sugerencia inicial: *"Peluquerías caninas independientes en España con 2-4 peluqueros, dueñas mujeres entre 30-45 años, que ven el grooming como oficio artesano y quieren elevar el estatus de la profesión"*. Ese es un grupo lo bastante pequeño para servirles extraordinariamente bien, y lo bastante cohesionado para que se hablen entre sí.
2. **Construye una tribu, no una base de clientes.** Crea algo como *"El Movimiento del Grooming Profesional"* (o el nombre que encaje con la marca). Componentes:
   - **Manifiesto público** de 1 página con tu worldview.
   - **Comunidad cerrada** para clientes (Discord, Circle, o WhatsApp si es España).
   - **Eventos físicos o virtuales** trimestrales.
   - **Insignia/sello** que clientes ponen en su web/escaparate.
3. **Articula el cambio que produces.** No "gestionas citas". Produces el cambio de:
   *"trabajo desbordada, no me valoran, subvaloro mi oficio, gano poco"*
   →
   *"soy una profesional respetada, mi negocio funciona sin que yo lo aguante 24/7, cobro lo que valgo"*.
   **Todo el copy debe hablar de ese cambio, no de funciones.**
4. **Sé más extremo, no más seguro.** Toma posición pública controversial. Ejemplos posibles:
   - *"No vendemos a peluquerías que cobren menos de 35€ el corte. Punto."*
   - *"Si tu peluquería trata a los perros como mercancía, este software no es para ti."*
   - *"Creemos que el grooming es arte. Si tú lo ves como un servicio commodity, vete con MoeGo."*

   Eso filtra y atrae. Los que no encajan se autodescartan. Los que encajan se enamoran.
5. **Construye permiso antes de vender.** Lanza newsletter semanal escrita en primera persona desde la voz de la marca, con punto de vista, dirigida exclusivamente al Smallest Viable Market. **1.000 suscriptores comprometidos > 50.000 visitantes desconocidos.**

### Acción Inmediata

> Escribe en una sola página: (a) **quién** es tu cliente exacto, (b) **qué creencia** comparte con la marca, (c) **qué historia** se cuenta a sí mismo cuando elige Groomly, (d) **qué cambio** se produce en su vida cuando lo usa. **Si no cabe en una página, no está claro.**

### Lenguaje Godin

> *"Safe is risky. People like us do things like this. Be remarkable, or be invisible. The goal is not to do business with everybody who needs what you have. The goal is to do business with people who believe what you believe."*

---

## 6. Síntesis y Orden de Acción

### Donde coinciden los tres asesores

| Punto de acuerdo | Cómo lo dice cada uno |
|---|---|
| **El nicho es demasiado ancho** | Hormozi: *"niche down hasta que duela"* / Brunson: *"habla solo a tu dream customer"* / Godin: *"Smallest Viable Market"* |
| **El producto no es el cuello de botella** | Los tres apuntan a que la construcción técnica está sobreestimada y la construcción de oferta + historia + funnel está vacía. |
| **El pricing actual es commodity** | Hormozi: *"vendes software, no resultado"* / Brunson: *"no hay backend high-ticket"* / Godin: *"compites en el centro, posición más peligrosa"*. |

### Donde discrepan

| Asesor | Postura |
|---|---|
| **Hormozi** | Quiere acción y volumen YA. Subir precio HOY. Contactar 100 leads esta semana. La sofisticación llega después. |
| **Brunson** | Posición intermedia. Construye el sistema (funnel completo) antes de escalar, pero no esperes meses filosofando. |
| **Godin** | Quiere pensar PRIMERO. Define el cambio, la tribu, la historia. Sin claridad estratégica, las tácticas no convergen. |

### Regla de Desempate

Aplicando la regla del skill para **negocio sin ingresos consistentes todavía**:

> **Hormozi > Brunson > Kennedy > Belfort > Godin > Gary Vee**
>
> Prioriza oferta y volumen. La sofisticación narrativa viene después de que la oferta cierre.

Por tanto, la jerarquía operativa para Groomly es:

1. **Hormozi primero:** oferta, precio, garantía, avatar reducido, volumen de outreach.
2. **Brunson segundo:** Value Ladder, funnel, webinar, secuencias automatizadas.
3. **Godin tercero:** posicionamiento, tribu, narrativa, permiso.

> **Importante:** Esto no significa "ignora a Godin". Significa que la narrativa de Godin se construye **encima** de una oferta de Hormozi que ya convierta. Sin oferta que cierre, la narrativa más bonita del mundo no factura.

---

## 7. Roadmap Sugerido (90 días)

### Semana 1 — Acción Hormozi (oferta y precio)

- [ ] Quitar el plan Free del pricing público.
- [ ] Sustituir por trial 14 días con tarjeta requerida.
- [ ] Subir precios: Professional → $97/mes; Business → $297/mes.
- [ ] Añadir garantía pública de 60 días con condición específica y medible.
- [ ] Definir avatar exacto en 1 página (no "peluquerías caninas", sino el subnicho específico).
- [ ] Contactar manualmente a 50-100 dueños de peluquería del avatar definido.
- [ ] Crear servicio premium "Done-For-You" como add-on ($1,997 setup).

### Semanas 2-4 — Acción Brunson (funnel y value ladder)

- [ ] **Funnel hack** completo de 3 competidores (MoeGo, Gingr, Pawfinity).
- [ ] Crear bait gratuito: "7 plantillas de WhatsApp para reducir no-shows".
- [ ] Crear frontend ($27): mini-curso "Digitaliza tu peluquería en 7 días".
- [ ] Diseñar guion del Perfect Webinar (60 min).
- [ ] Implementar Soap Opera Sequence (5 emails) en el sistema de email marketing.
- [ ] Listar Dream 100 con plan de aproximación para cada cuenta.
- [ ] Configurar OTOs post-compra (mini-curso → trial → setup white-glove).

### Mes 2 — Acción Godin (posicionamiento y tribu)

- [ ] Articular manifiesto / worldview en 1 página pública.
- [ ] Definir el cambio de identidad que produce Groomly (no funciones, transformación).
- [ ] Reescribir homepage y todo el copy desde el ángulo de la transformación.
- [ ] Lanzar newsletter semanal (primer envío con manifiesto).
- [ ] Tomar posición pública controversial sobre algo del sector (filtrar + atraer).
- [ ] Diseñar comunidad cerrada para clientes (plataforma, normas, calendario de eventos).

### Mes 3 — Iteración y medición

- [ ] Revisar métricas: tasa de conversión trial → paid, churn mensual, LTV, CAC.
- [ ] Optimizar Webinar basado en datos reales de conversión.
- [ ] Escalar Dream 100: pasar de "lista" a "10 colaboraciones cerradas".
- [ ] Primeros 100 clientes pagantes en el avatar definido.
- [ ] Primer evento de la comunidad (virtual o físico según escala).

---

## Notas finales

- **Lo que NO recomendaría ninguno de los tres asesores en este momento:** seguir construyendo features. El backlog técnico de los sprints 00-07 está bien ejecutado, pero el cuello de botella ya no es el producto — es la oferta, el funnel y el posicionamiento. Toda hora invertida en features adicionales hoy es una hora no invertida en lo que sí mueve la aguja.
- **Asesores no consultados en esta auditoría inicial:** Kennedy (copy de venta directa), Belfort (cierre 1-a-1) y Gary Vee (contenido y atención). Convocarlos en una segunda fase, cuando el funnel esté en marcha y haya copy que iterar, llamadas que entrenar y contenido que distribuir.

---

*Documento generado por la skill Billion Dollar AI Team. No es asesoría real de los expertos citados; es un análisis estructurado siguiendo sus frameworks operativos documentados.*
