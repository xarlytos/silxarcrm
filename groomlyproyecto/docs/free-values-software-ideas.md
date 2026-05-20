# Free Values de software para outreach a peluquerías caninas

> Brainstorming de micro-herramientas software gratuitas para usar como gancho en el workflow de prospección de peluquerías caninas (ver `outreach-script.md`, `prospectos-peluquerias-metodologia.md`).
>
> **No son demos limitadas de Groomly.** Son herramientas independientes, utilizables sin abrir cuenta, que la peluquería incorpora a su día a día y que naturalmente abren puente a Groomly.
>
> Fecha: 2026-05-18.

---

## Principios de un buen free value de software

Antes de las ideas, los filtros que tiene que pasar cualquier candidato:

1. **Valor inmediato sin registro.** Como mucho un email al exportar/guardar. Cero fricción en el primer uso.
2. **Resuelve un dolor real ya validado** en las conversaciones del Sprint 02 (no-shows, WhatsApps manuales, no saber números, no tener web).
3. **Independiente.** Funciona aunque la peluquería no compre Groomly nunca. No es trial disfrazado.
4. **Brandeable.** Lleva discretamente "Powered by Groomly / peluguau" + link, sin ser invasivo.
5. **Compartible / viral.** La peluquera lo enseña a otra peluquera. Idealmente genera output con marca (cartel, link, post).
6. **Capturable.** Para usar la versión completa (exportar PDF, guardar resultado, recibir reportes) se pide email → entra al CRM.
7. **Bridge natural.** Cuando se topa con el límite del free value, el siguiente paso evidente es Groomly. Sin forzarlo.

---

## A. Visibilidad y presencia online

Atacan el dolor proxy del workflow: la peluquería **no tiene web propia**.

### 1. Mini-web instantánea (`peluguau.com/mi-salon`)

**Qué es:** Una landing page generada en 60 segundos con nombre del salón, fotos del Instagram, lista de servicios, horarios, mapa y botón "Pide cita por WhatsApp". Hosting gratis para siempre en subdominio `peluguau.com/[nombre]` o equivalente.

**Dolor:** No tienen web. Cuando un cliente las busca por Google encuentra Booksy, una foto de fachada y nada más.

**Hook DM:** *"Vi que no tenéis web propia. Te he montado una en 2 minutos con tus datos públicos, mírala aquí: [link]. Es gratis para siempre, si quieres la editas tú."*

**Bridge a Groomly:** El botón "Pide cita" lleva a WhatsApp con plantilla auto-rellenada. Cuando saturen el WhatsApp manual, Groomly mete la agenda online de verdad encima.

**Esfuerzo:** L (landing builder + subdominio multi-tenant + scrape opcional). **Tipo:** Web app, login opcional.

---

### 2. Linkbio especializado para peluquerías ("peluLink")

**Qué es:** Una alternativa a Linktree pensada para peluquerías caninas. Bloques pre-hechos: "Pide cita WhatsApp", "Cómo llegar", "Servicios y precios", "Antes/después", "Reseñas Google", "Productos que vendo", "Mascotas perdidas". Diseño limpio, mobile-first.

**Dolor:** Sus stories y bio de Instagram apuntan a un Linktree genérico mal montado, o directamente al WhatsApp con cero contexto.

**Hook DM:** *"He visto que tienes Linktree. Te he probado peluLink, está pensado para peluquerías caninas: tiene bloque de antes/después, mapa, botón cita... Pruébalo y me dices."*

**Bridge a Groomly:** Cuando el bloque "Pide cita" reciba 50+ clicks/mes, sugerir Groomly para no gestionarlo todo a mano por WhatsApp.

**Esfuerzo:** M. **Tipo:** Web app con login (necesita editar bloques).

---

### 3. Generador de QR de servicios y precios

**Qué es:** Subes los precios, generas un QR + PDF imprimible que va en el escaparate o en la sala. Cliente escanea → ve precios actualizados, horarios, formas de contacto.

**Dolor:** Tienen los precios en una pizarra desactualizada o en un folio plastificado. Subir precios obliga a reimprimir.

**Hook DM:** *"Te he montado un cartel QR con los precios de tu web/Booksy. Si subes precios solo lo cambias en un sitio. Lo imprimes en A4 y al cristal. Aquí lo tienes: [link]."*

**Bridge a Groomly:** El QR enlaza a la mini-web del punto 1. Si quieren que el QR enseñe disponibilidad/huecos libres en vivo → Groomly.

**Esfuerzo:** S. **Tipo:** Web tool, sin login (export por email).

---

### 4. Auditor de Google Business Profile

**Qué es:** Pegas tu URL de Google Maps. Te devuelve un informe de 1 página: "Te falta foto del interior", "Tu horario no incluye sábados", "No has respondido a las últimas 8 reseñas", "Tus competidores cercanos tienen 3x más fotos". Score 0-100.

**Dolor:** Saben que Google Maps importa pero no saben qué les falta exactamente.

**Hook DM:** *"He pasado tu ficha de Google por nuestro auditor. Score 62/100, hay 6 cosas concretas que arreglar en menos de 1 hora. Te paso el PDF si quieres."*

**Bridge a Groomly:** La parte "no respondes reseñas" + "no publicas posts" lleva natural a "Groomly tiene módulo de respuesta automática a reseñas con IA".

**Esfuerzo:** M (Google Places API + heurísticas). **Tipo:** Web app, email para PDF.

---

## B. Marketing visual y contenido

Atacan: las peluquerías tienen que producir contenido a diario en Instagram y se les hace bola.

### 5. Generador de stories antes/después con marca

**Qué es:** Subes dos fotos (antes y después). El generador hace un story 1080×1920 con la marca del salón, separador animado, copy automático ("Toy Poodle • Corte cara osito • @tu_salon"), CTA "Reserva en bio".

**Dolor:** Las stories antes/después son su mejor contenido pero exigen edición manual cada vez.

**Hook DM:** *"He visto tus antes/después de la semana pasada. Te paso un generador que los monta en 30 segundos con tu marca encima. Si lo usas un mes te ahorras tipo 5 horas."*

**Bridge a Groomly:** Cuando lo usen rutinariamente, Groomly puede generar el story automáticamente al cerrar la cita (foto antes/después → story brandeado → publicar).

**Esfuerzo:** M (Canva-like sencillo, plantillas fijas). **Tipo:** Web app, login opcional.

---

### 6. Generador de carteles A4 imprimibles

**Qué es:** Biblioteca de plantillas: "Cerramos por vacaciones", "Nuevo servicio: deslanado", "Promo de septiembre", "Normas del local", "Aviso recogida". Cambias texto + logo, descargas PDF listo para impresora del local.

**Dolor:** Imprimen carteles cutres hechos en Word o Paint.

**Hook DM:** *"Te paso una librería de carteles para el local. Cierre por vacaciones, normas, promos... Cambias texto, descargas PDF, a imprimir."*

**Bridge a Groomly:** Cuando hagan campaña de fidelización seria, Groomly tiene tarjetas digitales + WhatsApp automático en vez de cartel A4.

**Esfuerzo:** S (plantillas estáticas + edición ligera). **Tipo:** Web tool, email para export.

---

### 7. Respondedor de reseñas con IA

**Qué es:** Pegas el texto de la reseña (positiva o negativa) + tipo de servicio. Te devuelve 3 borradores de respuesta en tono profesional-cercano, tonos a elegir (cálido, formal, conciso). Copy-paste a Google.

**Dolor:** Las reseñas negativas las paralizan. Las positivas las contestan con un "gracias" genérico que no añade nada.

**Hook DM:** *"Vi que tienes 4 reseñas sin responder, incluida una de 3 estrellas de hace un mes. Te paso una herramienta que te redacta la respuesta en 5 segundos."*

**Bridge a Groomly:** Groomly Pro tendría auto-respuesta integrada + recordatorio post-servicio para *pedir* reseña al cliente contento.

**Esfuerzo:** S (wrapper sobre LLM con prompts curados). **Tipo:** Web app, login para historial.

---

### 8. Generador de bio y caption Instagram

**Qué es:** Le metes nombre del salón, ciudad, servicios principales, vibe (premium/cercano/divertido). Te devuelve 5 opciones de bio + 30 captions reutilizables para posts de antes/después, posts de equipo, posts de producto.

**Dolor:** Su bio de Instagram es "Peluquería canina | Cita: WhatsApp xxx". Sus captions son emojis.

**Hook DM:** *"Te he generado 5 bios para tu Instagram y 30 captions reutilizables para tus antes/después. Pruébalas durante un mes."*

**Bridge a Groomly:** Esto es educación gratis. El bridge es de confianza, no funcional. Una vez confía, se abre la conversación de agenda.

**Esfuerzo:** S. **Tipo:** Web tool, email para PDF.

---

## C. Calculadoras y herramientas operativas

Atacan: tarificación a ojo, no saber márgenes reales, no entender capacidad.

### 9. Calculadora de tarifa transparente por raza/peso/pelo

**Qué es:** Selector raza → peso → tipo pelo → tipo servicio → te devuelve "rango de mercado en tu zona: 28-42€". Datos basados en agregado anonimizado de Groomly + scraping público.

**Dolor:** No saben si están cobrando bien. Miran a la competencia y copian.

**Hook DM:** *"Hemos hecho una calculadora de tarifas con datos de 200 peluquerías. Métele tu zona y servicios, te dice si estás dentro de mercado. Te paso el link."*

**Bridge a Groomly:** Cuando vean que están por debajo de mercado, abren conversación sobre cómo subir precios sin perder clientes → ahí entra Groomly con CRM + comunicación + segmentación.

**Esfuerzo:** M (UI + dataset + lógica). **Tipo:** Web app, email para reporte detallado.

---

### 10. Calculadora de capacidad real semanal

**Qué es:** Metes nº peluqueros, horas/día, duración media servicio, % no-shows, % huecos vacíos. Te devuelve: facturación máxima teórica vs real, qué pasaría si redujeses no-shows un 50%, qué pasaría si llenases huecos vacíos.

**Dolor:** "No sé cuánto podría facturar de más". Sensación vaga de que dejan dinero en la mesa.

**Hook DM:** *"Mira lo que pierdes al mes solo por huecos vacíos y no-shows: te he hecho una calculadora. Métele tus números, son 2 minutos. Suele salir entre 800-2.500€/mes."*

**Bridge a Groomly:** El número que sale es tan grande que la conversación de Groomly se cierra sola. "Te cobras 24€/mes para recuperar 1.500€/mes".

**Esfuerzo:** S (form + cálculo + visualización). **Tipo:** Web app, email para reporte personalizado.

---

### 11. Calculadora de coste real de un no-show

**Qué es:** Pregunta cuánto cuesta tu hora, duración del servicio típico, qué precio cobras, cuántos no-shows tienes al mes. Te devuelve coste anual + comparativa con el coste de un sistema que los reduzca.

**Dolor:** Saben que duele un no-show pero no han puesto número. Lo asumen como "parte del oficio".

**Hook DM:** *"Calculé el coste de no-shows de un salón parecido al tuyo: 7.200€/año. Te dejo la calculadora para que metas tus números."*

**Bridge a Groomly:** Directísimo. Recordatorios automáticos + confirmación + lista de espera = Groomly.

**Esfuerzo:** S. **Tipo:** Web tool, sin login.

---

### 12. Calculadora de margen real por servicio

**Qué es:** Por cada servicio (corte, deslanado, baño, etc.) introduces precio, tiempo medio, coste producto, % comisión peluquera. Te dice margen real €/h por servicio. Ranking de qué te conviene empujar.

**Dolor:** Empujan deslanado pensando que da margen y no han hecho la cuenta.

**Hook DM:** *"He hablado con varias peluqueras que descubren que el servicio que más empujan es el de menos margen. ¿Quieres mirar los tuyos? Tengo una calculadora."*

**Bridge a Groomly:** Una vez ven los números, quieren que el sistema sugiera servicios complementarios al cliente correcto. Eso es Groomly.

**Esfuerzo:** S. **Tipo:** Web app, login para guardar.

---

## D. Gestión cliente / mascota

Atacan: WhatsApps manuales, dependencia de memoria, fichas en libreta.

### 13. Ficha de mascota imprimible con QR

**Qué es:** Genera una ficha A5 por mascota con QR. El QR lleva a una mini-página pública con: foto del perro, raza, peso, alergias, corte de referencia (foto previa), notas. La peluquera la imprime, plastifica y la cliente la lleva consigo.

**Dolor:** Cada cita re-piden los mismos datos. Si cambia la peluquera de turno, los detalles se pierden.

**Hook DM:** *"Te paso una herramienta para hacer fichas plastificables de cada mascota. La cliente la lleva al móvil, el cuidador la escanea, en 5 segundos sabe alergias y el corte exacto del último día."*

**Bridge a Groomly:** Cuando tengan 50 fichas creadas, lo natural es que sea Groomly quien las gestione + historial + recordatorios.

**Esfuerzo:** M (form + QR + página pública). **Tipo:** Web app, login.

---

### 14. Cumpleañómetro de mascotas (WhatsApp programado)

**Qué es:** Subes CSV con cliente + perro + fecha nacimiento. Cada día te llega un email/WhatsApp recordándote a quién felicitar hoy + plantilla pre-rellenada lista para copy-paste.

**Dolor:** Felicitar el cumpleaños del perro genera fidelización absurda. Nadie lo hace porque no se acuerdan.

**Hook DM:** *"Truco que veo funcionar: felicitar el cumpleaños del perro. Re-engagement brutal. Te paso una herramienta que te avisa cada día a quién toca."*

**Bridge a Groomly:** El siguiente paso obvio: que el envío sea automático (no copy-paste), con plantilla personalizada y oferta de cita. Eso es Groomly.

**Esfuerzo:** S (CSV + cron + email/WhatsApp link). **Tipo:** Web app + cron job.

---

### 15. Generador de consentimientos firmables

**Qué es:** Biblioteca de PDFs: consentimiento de sedación, consentimiento de uso de fotos para Instagram, consentimiento de tratamiento veterinario de urgencia, ficha de incidencias. Personalizable con datos del salón. Cliente firma en el móvil con el dedo, le llega copia por email, queda guardado.

**Dolor:** Si pasa algo (perro se hace daño, mascota con problema cardiaco), no tienen documentación. Riesgo legal real.

**Hook DM:** *"Cosa que casi ninguna peluquería tiene: consentimientos firmados de sedación y de fotos. Te paso una herramienta que los genera y firmas en el móvil. Cubre las espaldas."*

**Bridge a Groomly:** Cuando tengan que vincular consentimiento ↔ cliente ↔ historial → es exactamente Groomly.

**Esfuerzo:** M (PDF templates + firma digital tipo signature pad). **Tipo:** Web app, login.

---

### 16. Mini-CRM "última visita" / re-engagement

**Qué es:** Subes CSV con cliente + última cita. Te marca en rojo a quien no ha vuelto en 8+ semanas. Plantilla de WhatsApp pre-rellenada para reactivarles.

**Dolor:** Pierden clientes silenciosamente. No notan que María García lleva 3 meses sin venir hasta que es tarde.

**Hook DM:** *"Te he mirado por encima: tienes clientes que no vuelven y no te das cuenta. Te paso una herramienta donde subes tu lista y te marca los que llevan tiempo sin venir."*

**Bridge a Groomly:** Esto es la versión light de la segmentación de Groomly. Cuando saturen el copy-paste, vienen.

**Esfuerzo:** S (CSV + lógica fechas + plantilla). **Tipo:** Web tool, email opcional.

---

## E. Auditorías y diagnóstico

Atacan: "no sé cómo me ven desde fuera".

### 17. Auditor de Instagram para peluquerías

**Qué es:** Pegas tu @ de Instagram. Heurísticas: % posts antes/después, frecuencia de publicación, % posts con CTA claro, uso de stories destacadas, calidad de la bio, presencia de info clave (horarios, ubicación, contacto). Score + 10 recomendaciones priorizadas.

**Dolor:** Postean por inercia. No saben qué funciona y qué no.

**Hook DM:** *"He pasado tu Instagram por nuestro auditor. Score 71/100. Hay 6 cambios concretos que te dejarían ese score por encima de 85. Te paso el reporte."*

**Bridge a Groomly:** El reporte cierra con "y para que el contenido genere reservas, necesitas un sistema que las capte y mida". Hola Groomly.

**Esfuerzo:** L (necesita scraping/API de Instagram, frágil). **Tipo:** Web app + backend job. **Riesgo TOS:** alto, requiere cuidado.

---

### 18. Comparador anónimo de zona

**Qué es:** Le dices tu ciudad/barrio + tipo de salón. Te muestra (anónimamente) cómo te comparas con peluquerías similares: precios medios, nº reviews, frecuencia posts, score Google. Tu posición en un percentil.

**Dolor:** "¿Estoy bien o mal?" sin referencia.

**Hook DM:** *"Te he sacado el comparativo de tu zona: estás en percentil 40 en reviews pero percentil 85 en frecuencia de posts. Te paso el detalle."*

**Bridge a Groomly:** Conversación natural sobre qué activar primero para subir percentil.

**Esfuerzo:** M (necesita base de datos de scraping continuo). **Tipo:** Web tool con email.

---

## F. Herramientas pensadas para sus clientes (uso compartido)

La peluquería las comparte con sus clientes y el branding de Groomly llega a la siguiente capa.

### 19. Quiz "¿Qué corte le toca a tu perro?"

**Qué es:** Página embebible en su Linkbio/web. El dueño del perro responde 6 preguntas (raza, tipo pelo, longitud actual, uso del perro, estación, sensibilidad piel) y recibe una recomendación + foto de referencia. CTA: "Reserva en [tu salón]".

**Dolor:** Sus clientes vienen sin saber qué pedir, perden tiempo decidiendo en la mesa.

**Hook DM:** *"Te paso un quiz para meter en bio de Instagram. Tus clientes responden 6 preguntas, llegan ya sabiendo qué corte quieren. Te ahorra 5 minutos por cita."*

**Bridge a Groomly:** El "Reserva en [tu salón]" lleva a Groomly cuando lo tengan. Mientras tanto va a WhatsApp.

**Esfuerzo:** M (quiz engine + base de recomendaciones por raza). **Tipo:** Web app embebible, login para personalizar branding.

---

### 20. Identificador de raza por foto + recomendación de corte

**Qué es:** Subes foto del perro → te identifica raza/mezcla → recomienda cortes típicos + tiempo medio + rango de precio en tu zona. Versión cliente-side: el dueño la usa antes de pedir cita. Versión peluquera-side: la usa para perros mestizos donde no sabe la raza.

**Dolor:** Clientes con mestizos no saben qué pedir; peluqueras pierden tiempo intentando identificar.

**Hook DM:** *"Cosa divertida: hemos hecho un identificador de razas por foto que recomienda corte. Lo metes en tu Linkbio, tus clientes flipan. Lo enseñas en stories y captas seguidores."*

**Bridge a Groomly:** Pieza viral. Capta atención + email. El bridge es de marca, no funcional inmediato.

**Esfuerzo:** L (modelo IA o API tipo Dog Vision; backend de razas+cortes). **Tipo:** Web app pública.

---

## Matriz de priorización

Cruzando esfuerzo (S/M/L) con impacto comercial estimado (qué tan directo es el bridge a Groomly):

| Impacto comercial → | Bajo | Medio | Alto |
|---|---|---|---|
| **Esfuerzo S** | #6 Carteles A4, #8 Bio IA, #11 Calc no-show, #16 Mini-CRM | #3 QR precios, #7 Respondedor reseñas, #12 Calc margen, #14 Cumpleañómetro | **#10 Calc capacidad** ⭐ |
| **Esfuerzo M** | #9 Calc tarifas, #18 Comparador zona | #4 Auditor Google, #5 Stories antes/después, #13 Fichas QR, #15 Consentimientos, #19 Quiz | **#2 peluLink** ⭐ |
| **Esfuerzo L** | #20 Identificador raza | #17 Auditor Instagram | **#1 Mini-web** ⭐ |

**Las 3 estrellas son las apuestas si solo se construyen tres:**

- **⭐ #10 Calc capacidad semanal** (S, impacto alto) — Es la cuenta que cierra la venta. Pequeño esfuerzo, palanca enorme en conversación.
- **⭐ #2 peluLink** (M, impacto alto) — Captura email + se queda en su bio + lleva tráfico a WhatsApp/Groomly. Recurrente.
- **⭐ #1 Mini-web** (L, impacto alto) — Resuelve directamente el dolor proxy del workflow (sin web propia). Es *el* gancho del outreach.

---

## Recomendación de fases

**Fase 0 (esta semana):** El menos costoso de todos con bridge directísimo.
- Construir **#11 Calc coste no-show** (S) y/o **#10 Calc capacidad semanal** (S). Ambas son formularios + cálculo. 1-2 días por una.
- Mandar el link en cada DM del Sprint 02 en sustitución de las plantillas WhatsApp ("a cambio de 10 min te paso una calculadora que…").

**Fase 1 (este mes):** Una herramienta que se quede en el ecosistema del prospecto.
- **#2 peluLink** o **#13 Fichas QR**. Una vez la usan, no la sueltan, y queda branded.

**Fase 2 (próximos 2 meses):** Pieza diferencial de outreach.
- **#1 Mini-web**, montada con scraping ligero del Instagram/Maps. Permite outreach personalizado al máximo nivel: *"te he montado tu web con tus datos, mírala"*.

**Fase 3 (oportunista):** Herramientas IA-powered con efecto wow.
- **#7 Respondedor reseñas** + **#20 Identificador raza por foto**. Bajo esfuerzo si reutilizas APIs externas, alto perceived value.

---

## Lo que NO se construye

Para tener foco, descartado explícitamente:

- ❌ App móvil nativa de cualquier tipo (fricción de instalación → mata el free value).
- ❌ Herramientas que requieran integración con el TPV o caja del salón (alto coste técnico, poco retorno).
- ❌ Cosas que se solapen 1:1 con Groomly (agenda, facturación, recordatorios automáticos del Groomly Pro). Eso es la venta, no el gancho.
- ❌ PDFs interactivos, ebooks, plantillas Excel. **Esto NO es software.** El usuario quiere software de verdad.

---

*Documento generado en sesión de brainstorming 2026-05-18. Iterar tras 10 conversaciones del Sprint 02 que usen alguno de estos free values: ¿cuál abre más conversación?, ¿cuál acerca más a una demo? Ajustar prioridades en función de datos reales.*
