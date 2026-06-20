# Guía detallada del Software — ¿Qué hace cada página?

Esta guía explica, en lenguaje sencillo y con todo lujo de detalle, cada pantalla del panel de trabajo del software: qué se ve, qué información muestra, qué botones tiene y qué puede hacer el usuario en cada una. Está pensada para entenderlo sin saber nada de programación.

El software es un CRM y motor de marketing completo. Está organizado en grandes bloques: **panel principal**, **leads y clientes**, **organización del equipo**, **captación**, **comunicación (WhatsApp, llamadas, email)**, **propuestas comerciales**, **asistente de inteligencia artificial**, **gestión de tus productos (softwares)** y el gran **Growth Engine** (motor de crecimiento automático).

> Nota: a lo largo de la guía aparecen dos colaboradores del equipo mencionados en algunas pantallas (Carlos y Silviu) y nombres de productos de ejemplo (peluguau, groomly, silxar). Son ejemplos reales de la configuración actual.

---

## 1. Panel principal

### Centro de control (Dashboard)
**Dirección:** `/dashboard`

La pantalla de bienvenida con el resumen del negocio en tiempo real. Lleva un indicador "En vivo" con un punto verde parpadeante y un botón para actualizar los datos manualmente (muestra la fecha y hora de la última actualización).

- **Seis indicadores principales** en tarjetas grandes: ingresos mensuales recurrentes (MRR), ingresos anuales (ARR), total de clientes activos, suscripciones activas, tasa de cancelación (churn) e ingresos de los últimos 30 días. Algunas muestran su tendencia comparativa.
- **Gráfico de evolución del MRR**: muestra cómo han variado los ingresos mensuales a lo largo del tiempo.
- **Softwares conectados**: lista los primeros productos conectados, cada uno con su avatar (las dos primeras letras), su nombre y cuántos clientes tiene. Si no hay ninguno, invita a configurar las conexiones.
- **Pagos recientes**: los últimos pagos procesados, cada uno con un icono que indica si fue exitoso (verde) o fallido (rojo), el nombre del cliente, la fecha y el importe.
- **Clientes destacados** (columna derecha): los clientes más activos, con su inicial, nombre (que enlaza a su ficha), correo, total pagado y número de pagos.

---

## 2. Leads y clientes (gestión de contactos)

### Listado de leads
**Dirección:** `/dashboard/leads`

La pantalla central para gestionar todos tus prospectos. Arriba, dos botones: **Importar CSV** y **Nuevo lead**.

- **Tres estadísticas rápidas**: leads totales, nuevos en los últimos 7 días y el resultado actual filtrado (con el porcentaje sobre el total).
- **Buscador y filtros** (barra fija al desplazar): búsqueda por nombre, correo, empresa o teléfono; botones rápidos para mostrar solo los que tienen teléfono o correo; y selectores de estado (Nuevo, Contactado, Interesado, En seguimiento, Calificado, Rechazado, No responde, Convertido), software de origen y sector.
- **Filtros avanzados** (desplegables): prioridad (baja, media, alta, urgente), tipo de teléfono (móvil/fijo) y presencia de correo.
- **Dos vistas**: tabla o tablero Kanban (columnas por estado).
- **Tabla de leads** con columnas: casilla de selección, lead (nombre y empresa/correo), sector, software, contacto (iconos de teléfono, WhatsApp y correo), estado, prioridad, origen, fecha de creación y acciones (ver/eliminar).
- **Acciones en lote**: al seleccionar varios leads aparece una barra para cambiar el estado de todos a la vez o eliminarlos.
- **Paginación** cuando hay más de 25 leads.
- **Confirmación de borrado**: un aviso que muestra los leads que se van a eliminar y advierte de que no se puede deshacer.

### Crear nuevo lead
**Dirección:** `/dashboard/leads/nuevo`

Un formulario sencillo para añadir un prospecto a mano: nombre, correo, teléfono, empresa, cargo, país, software destino, estado inicial, prioridad, sector y notas. Botones de cancelar y guardar.

### Importar leads desde archivo
**Dirección:** `/dashboard/leads/importar`

Permite subir muchos leads de golpe desde un archivo CSV.

- Eliges el **software destino**.
- Puedes **descargar una plantilla CSV** de ejemplo con la estructura correcta.
- **Zona de arrastre** donde sueltas el archivo o haces clic para seleccionarlo.
- **Vista previa** con las primeras filas del archivo para revisar antes de confirmar.
- **Resultado de la importación**: tres tarjetas con cuántos leads se crearon (verde), cuántos eran duplicados (naranja) y cuántos errores hubo (rojo). Luego puedes ir a la lista de leads o importar otro archivo.

### Ficha de un lead
**Dirección:** `/dashboard/leads/[id]`

Toda la información de un prospecto concreto.

- **Cabecera** con el nombre, su estado y prioridad (con colores), y dos botones: **Cambiar estado** y **Convertir a cliente** (este desaparece si ya está convertido).
- **Información de contacto** (columna izquierda): correo, teléfono, empresa, cargo, país, fecha de creación, último contacto y gestor asignado, cada dato con su icono.
- **Notas**: cuadro con las anotaciones libres del lead.
- **Análisis con IA**: clasificación automática del sector, subsector e industria del lead.
- **Historial de actividad** (columna derecha): una línea de tiempo con todo lo que ha pasado (notas, cambios de estado, etc.) y un campo para añadir notas nuevas.
- **Cambio de estado**: ventana para elegir el nuevo estado y escribir un motivo opcional.

### Ficha de un cliente
**Dirección:** `/dashboard/clientes/[id]`

El perfil completo de un cliente que ya paga, con su historial económico.

- **Cabecera** con avatar, nombre, correo, estado (activo/inactivo), software de origen, país, total pagado y fecha desde la que es cliente.
- **Cuatro estadísticas rápidas**: número de suscripciones, de pagos, de eventos y fecha del último pago.
- **Suscripciones**: lista de sus planes activos con nombre, software, estado (activa/prueba/cancelada), fecha de inicio y precio.
- **Historial de pagos**: cada pago con su icono de estado, importe, fecha y resultado.
- **Línea de tiempo de actividad**: eventos importantes del cliente (pagos, cambios de plan, cancelaciones) con puntos de color (rojo para los críticos).

---

## 3. Organización y planificación

### Calendario
**Dirección:** `/dashboard/calendario`

Un calendario visual para planificar eventos y tareas entre el equipo (Carlos y Silviu).

- **Cuatro estadísticas**: eventos de hoy, pendientes de Carlos, pendientes de Silviu y completados este mes.
- **Panel lateral** con un creador de evento rápido (título, fecha/hora, a quién se asigna, color), filtros por persona (todos/Carlos/Silviu) y una leyenda de colores.
- **Vista de calendario**: cuadrícula de los días del mes; el día actual aparece marcado; cada día muestra sus eventos como bloques de color (y un "+X más" si hay muchos). Cada celda es clicable para crear un evento en esa fecha.
- **Vista de lista**: los eventos agrupados por fecha, cada uno con casilla para marcarlo completado, hora o "todo el día", título, descripción, persona asignada y botón de eliminar.
- **Crear/editar evento**: ventana con título, descripción, inicio y fin, casilla de "todo el día", a quién se asigna (Carlos/Silviu/ambos) y color.

### Actividad del sistema (eventos)
**Dirección:** `/dashboard/eventos`

Un feed en tiempo real de todo lo que ocurre en tus softwares conectados.

- **Cuatro estadísticas**: eventos de hoy, pagos, nuevos registros y bajas.
- **Filtros** por tipo: todos, pagos, registros, bajas, upgrades, y un botón de "solo críticos".
- **Lista de eventos**: cada uno con un punto de color (rojo si es crítico), el tipo de evento (pago exitoso, nuevo registro, cancelación…), su descripción y la fecha y hora.

### Tareas y logros (gamificación)
**Dirección:** `/dashboard/tareas`

Convierte el trabajo en un juego de rol con fondo animado. Es una de las pantallas más elaboradas.

- **Perfil del jugador**: nivel, barra de experiencia, gemas (moneda virtual), título/rango, racha de días consecutivos, mejor racha y un compañero virtual.
- **Evento diario** con bonificaciones especiales.
- **Ocho pestañas**: Misiones, Talentos, Reino, Carrera, Constelaciones (logros), Saga (historia) y Récords.
  - **Misiones**: una misión "jefe" grande, misiones semanales y diarias (cada una con progreso y recompensa de experiencia y gemas), un **cofre diario** que abres una vez al día, un **tarot del día** con efectos especiales y una **máquina de tragaperras** disponible solo los fines de semana.
  - **Talentos**: un árbol de habilidades por ramas (velocidad, inteligencia, persuasión, dragón, imperio) donde gastas puntos para mejorar.
  - **Constelaciones**: todos los logros del juego con su progreso y recompensa.
  - **Saga**: una historia por capítulos que se desbloquea al subir de nivel.
  - **Reino / Carrera / Récords**: estadísticas avanzadas, progresión histórica (con opción de "reencarnarse" a partir del nivel 25) y tus mejores marcas personales.

### Métricas y análisis
**Dirección:** `/dashboard/metricas`

Gráficos y tablas que analizan a fondo el negocio. Eliges un período (7, 30, 90 días o 12 meses) y filtras por software.

- **Ocho indicadores clave**: MRR, ARR, ingresos de 30 días, clientes activos, tasa de cancelación, suscripciones activas, pruebas activas y total de pagos (varios con su tendencia).
- **Seis gráficos**: evolución del MRR, tasa de cancelación, actividad diaria (registros, pagos, bajas), reparto de ingresos por software (gráfico de tarta), ingresos frente a pérdidas, y conversión de pruebas a pago.
- **Tabla de pagos recientes** (cliente, software, plan, importe, fecha).
- **Tabla detallada día a día** con todas las métricas (MRR, registros, pagos, cancelaciones, upgrades, downgrades, clientes activos y churn).

---

## 4. Captación de leads (herramientas de marketing)

### Recursos gratuitos (Free Values)
**Dirección:** `/dashboard/free-values`

Registra y mide las mini-herramientas gratuitas que usas para captar contactos (calculadoras, checklists, tests, plantillas).

- **Cuatro estadísticas**: total de recursos, publicados, usos totales y leads generados.
- **Tabla** con cada recurso: nombre, tipo, dirección web, software, estado (borrador/publicado/pausado), usos y leads (con su porcentaje de conversión), y acciones de editar/eliminar.
- **Crear/editar**: ventana con nombre, identificador, software, URL, tipo, estado, descripción, usos y leads generados.

### Landing pages
**Dirección:** `/dashboard/landings`

Igual que lo anterior pero para páginas de aterrizaje completas, con seguimiento de visitas y conversiones.

- **Cinco estadísticas**: total de landings, publicadas, visitas totales, conversiones totales y leads generados.
- **Tabla** con nombre, URL, software, estado, visitas, conversiones (con su tasa) y leads, más acciones de editar/eliminar.
- **Crear/editar**: ventana con nombre, identificador, software, URL, descripción, estado, visitas, conversiones y leads.

---

## 5. Comunicación por WhatsApp

### Centro de WhatsApp
**Dirección:** `/dashboard/whatsapp`

La pantalla más completa de comunicación. Arriba muestra el estado de la conexión de WhatsApp Web (con botones para iniciarla/detenerla y un código QR cuando hace falta) y un selector de negocio. Se organiza en **ocho pestañas**:

- **Enviar**: envíos masivos con plantillas. A la izquierda, la lista de plantillas (cada una con su categoría de color: General, Bienvenida, Follow-up, Recordatorio, Agradecimiento, Oferta, Reactivación). En el centro, la vista previa de la plantilla con sus variables disponibles ({{primer_nombre}}, {{empresa}}, {{email}}…), filtros de leads (búsqueda, estado, "solo móviles"), y la tabla de leads seleccionables. Botones para **hiperpersonalizar con IA**, **enviar** (abre WhatsApp Web) o **enviar automático** (vía WhatsApp Web sin abrir navegador).
- **Chat**: conversación bidireccional. Lista de conversaciones a la izquierda (con avisos de mensajes no leídos) y el hilo a la derecha, con un campo para escribir, un botón de **sugerir con IA** y opciones de envío manual o automático.
- **Cementerio**: leads inactivos. Eliges cuántos días de inactividad, generas con IA un mensaje de reactivación por lead y lo envías.
- **Arena**: pestaña reservada para funciones futuras.
- **Plantillas**: crear y editar plantillas (nombre, categoría, contenido, variables, activar/desactivar) con vista previa en tiempo real.
- **Historial**: registro de todos los envíos (fecha, lead, plantilla, teléfono, estado).
- **Tests A/B**: comparas varias versiones de un mensaje. Cada test muestra sus variantes con su peso, envíos, respuestas y tasa de respuesta; puedes crear, pausar, reanudar y ver métricas.
- **Chatbot**: reglas de respuesta automática basadas en palabras clave.

---

## 6. Centro de llamadas

### Centro de llamadas
**Dirección:** `/dashboard/llamadas`

El centro para gestionar llamadas de venta, con un selector de negocio, un panel de estadísticas (total de llamadas, duración media, tasa de contacto, completadas hoy) y un panel de métricas del agente IA. Tiene **cuatro pestañas**:

- **Llamar**: a la izquierda la lista de tus leads (con búsqueda); a la derecha, la ficha del lead elegido con un selector **Humano** o **IA** y el botón de llamar. Muestra una vista previa del guion que se usará. Si hay una llamada en curso, aparece el panel "en vivo" con su estado, duración y transcripción.
- **Practicar**: una conversación simulada con IA para entrenar. Configuras un lead ficticio (nombre, empresa, sector, presupuesto, objeción principal) y practicas; al final recibes una puntuación y feedback por secciones (apertura, preguntas, objeciones, cierre).
- **Espechs (guiones)**: crear y editar los guiones de llamada, con variables, marcar uno como predeterminado, duplicar y eliminar.
- **Historial**: todas las llamadas hechas (lead, fecha, duración, tipo humano/IA, estado, transcripción y grabación), con filtros y paginación.

### Practicar llamada con IA en directo
**Dirección:** `/dashboard/llamadas/probar-ai`

Para ensayar una llamada hablando de verdad por el micrófono contra una IA llamada "Mariana", que responde en tiempo real como si fuera el cliente.

- **Panel de configuración** (izquierda): elegir negocio, lead (haces de él) y guion opcional; botones de iniciar o colgar la llamada; e indicadores de quién está hablando (la IA o tú).
- **Panel de transcripciones** (derecha): el historial de lo que se va diciendo, con la IA a un lado y tú al otro, y un pie con el estado del micrófono.
- **Grabación**: al terminar puedes descargar tu voz, la voz de la IA o ambas.

---

## 7. Email marketing

### Panel de email
**Dirección:** `/dashboard/email`

El resumen general de email.

- **Cinco indicadores**: remitentes activos, emails enviados, aperturas, fallidos y bajas.
- **Cinco accesos rápidos**: cuentas, remitentes, plantillas, campañas y bajas (cada uno indica cuántos elementos tiene).
- **Tabla de últimos envíos** (destinatario, asunto, remitente, estado con color y fecha).
- **Guía de configuración** en cuatro pasos para dejar el envío listo.

### Cuentas de envío
**Dirección:** `/dashboard/email/accounts`

Gestiona las cuentas/claves usadas para enviar correos (con Resend). Tener varias cuentas da más cuota mensual y velocidad.

- **Tabla** con nombre, software, clave enmascarada, uso (barra de progreso con color según el porcentaje), número de remitentes que la usan y estado (activa/inactiva), más acciones de reset de cuota, editar y eliminar.
- **Crear/editar**: software, proveedor, nombre interno, clave y cuota máxima mensual.
- Incluye una guía de "cómo multiplicar tu cuota".

### Remitentes (senders)
**Dirección:** `/dashboard/email/senders`

Las direcciones desde las que envías (por ejemplo, contacto@peluguau.com).

- **Tabla** con el correo (con estrella si es el predeterminado), nombre visible, software, cuenta asociada y estado (verificado/sin verificar y activo/inactivo), con acciones para marcar como predeterminado o eliminar.
- **Crear**: software, cuenta de envío, correo, nombre visible y casilla de "predeterminado".

### Bajas
**Dirección:** `/dashboard/email/bajas`

El registro de todos los que se dieron de baja, excluidos automáticamente de futuras campañas.

- **Dos estadísticas**: bajas totales y bajas filtradas.
- **Búsqueda** por correo y filtro por software, con botón de **exportar a CSV**.
- **Tabla** con correo, software, motivo (con color; en rojo si marcó como spam) y fecha, con opción de restaurar a alguien.
- **Paginación** cuando hay más de 50.

### Listado de campañas
**Dirección:** `/dashboard/email/campanas`

Todas tus campañas de envío masivo, filtrables por software.

- Cada campaña se muestra como una tarjeta con nombre, estado (borrador, enviando con su barra de progreso, enviada, cancelada, error), remitente, plantilla, software y fecha.
- **Métricas en cuatro columnas**: enviados (con barra), aperturas (con %), clics y rebotes.

### Crear campaña
**Dirección:** `/dashboard/email/campanas/nueva`

Un asistente paso a paso con un indicador de progreso. Los pasos son: **Setup → (Variantes si hay A/B) → Audiencia → Revisar → Lanzar**.

- **Setup**: software, remitente, plantilla y opción de activar **prueba A/B**.
- **Variantes** (solo si hay A/B): hasta 4 variantes, cada una con su porcentaje de audiencia, asunto y contenido.
- **Audiencia**: filtras qué leads la reciben (estado, prioridad, origen) y ves cuántos coinciden y una muestra.
- **Revisar**: vista previa del correo ya personalizado con los datos del primer lead, con remitente y tamaño de audiencia.
- **Lanzar**: le pones nombre, ves el resumen (destinatarios, duración estimada, proveedor) y una checklist de advertencias; luego guardas como borrador o lanzas.

### Detalle de campaña
**Dirección:** `/dashboard/email/campanas/[id]`

El panel completo de una campaña.

- **Cabecera** con nombre, estado y botones según el estado (lanzar/cancelar).
- **Barra de progreso** en tiempo real si está enviando.
- **Cuatro indicadores**: enviados, aperturas (open rate), clics (CTR) y rebotes/fallidos.
- **Comparativa A/B** (si la usaste): cada variante con sus métricas, una corona para la ganadora y un botón para **promover** la ganadora al resto de la audiencia.
- **Línea de tiempo de eventos** (quién abrió, quién hizo clic y en qué enlace, rebotes, spam).
- **Tabla de envíos individuales** con destinatario, estado, seguimiento (iconos de abierto/clic) y fecha, con filtro por estado y paginación.

### Plantillas de email
**Dirección:** `/dashboard/email/plantillas`

La galería de plantillas reutilizables. Dos botones arriba: **generar con IA** y **nueva plantilla**.

- **Filtros**: búsqueda, software y tipo (cold outreach, follow-up, newsletter, onboarding, re-engagement, promocional, personalizada).
- **Cuadrícula** de plantillas: cada una con su nombre, software, tipo (con color), asunto de ejemplo, variables que usa y fecha de actualización, con acciones de editar, duplicar y eliminar.

### Crear plantilla
**Dirección:** `/dashboard/email/plantillas/nueva`

Formulario para crear una plantilla con nombre, tipo, asunto y cuerpo, usando variables como {{nombre}} o {{empresa}}. Tiene también la opción de **generarla con IA**.

### Editar plantilla
**Dirección:** `/dashboard/email/plantillas/[id]`

La misma pantalla de edición para una plantilla existente, con opción de archivarla si ya no se usa.

---

## 8. Propuestas comerciales

### Listado de propuestas
**Dirección:** `/dashboard/propuestas`

Todas tus propuestas de venta. Botón de **nueva propuesta** arriba.

- **Búsqueda** por título, cliente o correo, y **filtros por estado**: todas, borradores, enviadas, vistas, aceptadas, rechazadas.
- Cada propuesta muestra título, estado (con color: borrador gris, enviada azul, vista morada, aceptada verde, rechazada roja, expirada ámbar), cliente, importe total, y fechas de creación/envío/aceptación.
- **Acciones**: enviar (si es borrador), editar/ver, copiar enlace público, duplicar y eliminar.

### Crear propuesta
**Dirección:** `/dashboard/propuestas/nueva`

Formulario para crear una propuesta desde cero.

- **Información general**: título, software, validez (días por defecto 30), nombre y correo del cliente, descripción.
- **Servicios y productos**: una tabla editable donde añades líneas con nombre, descripción, cantidad y precio unitario.
- **Totales automáticos**: subtotal, IVA (21%) y total, que se recalculan al instante.
- **Condiciones**: un texto con los términos (viene uno predefinido).
- Botones de cancelar y guardar (queda como borrador).

### Detalle de propuesta
**Dirección:** `/dashboard/propuestas/[id]`

Todos los detalles de una propuesta y las acciones sobre ella.

- **Acciones** según el estado: marcar como enviada, copiar enlace, ver la versión pública (como la ve el cliente) o eliminar.
- **Cliente**, **servicios** con su desglose de precios (subtotal, IVA, total), **condiciones** e **historial de fechas** (creada, enviada, aceptada, rechazada con motivo).
- **Enlace público** para compartir con el cliente (si no es borrador).

---

## 9. Asistente de inteligencia artificial

### Asistente IA
**Dirección:** `/dashboard/ia`

La interfaz principal del asistente inteligente. Muestra una cuadrícula con sus **ocho capacidades** (Leads y pipeline, Email outreach, Centro de llamadas, WhatsApp, Métricas SaaS, Calendario, Insights proactivos y Consultas avanzadas) y, debajo, un **chat** donde le pides análisis de tus datos y le pides que ejecute acciones.

### Acciones propuestas por la IA
**Dirección:** `/dashboard/ia/propuestas`

El historial de acciones que el asistente sugiere hacer y que tú apruebas antes de que se ejecuten.

- **Filtros** por estado: todas, pendientes, completadas, canceladas, fallidas.
- Cada acción muestra su tipo (crear lead, cambiar estado, añadir nota, crear evento, enviar WhatsApp) con un icono, su estado (con color), una descripción, los datos que usaría y la fecha.
- Para las **pendientes**, dos botones: **confirmar** (ejecuta) o **cancelar** (rechaza).

---

## 10. Softwares (tus productos conectados)

### Centro de softwares
**Dirección:** `/dashboard/softwares`

La pantalla principal con todos los productos conectados al CRM.

- **Tres tarjetas de resumen**: MRR total, número de softwares conectados y estado de las conexiones (100% si todo va bien).
- **Tabla de softwares**: cada uno con su icono (dos letras), nombre y descripción, número de clientes y suscripciones, su MRR y el % que aporta al total, y dos botones: **Leads** (ver sus leads) y **Obtener leads** (buscar nuevos).

### Configuración de softwares
**Dirección:** `/dashboard/softwares/config`

Define la identidad de marketing de cada producto. A la izquierda, la lista de softwares; a la derecha, un formulario por secciones desplegables:

- **General**: identificador, nombre, eslogan, descripción, web, dominio de landing, categoría, nicho y si está activo.
- **Posicionamiento**: problema principal, promesa de valor y diferenciador.
- **Audiencia (cliente ideal)**: título, ingresos anuales, tamaño del equipo, ubicación, descripción y los tres principales "dolores" que resuelves.
- **Branding**: logo, favicon y colores primario y secundario.
- Botones para crear, guardar y eliminar softwares.

### Detalle de un software
**Dirección:** `/dashboard/softwares/[software]`

El tablero de un producto concreto.

- **Cuatro indicadores** con su variación: MRR, clientes, suscripciones y tasa de cancelación.
- **Tabla de clientes** (con búsqueda y paginación) y un panel lateral de **actividad reciente**.
- Botones para actualizar, obtener nuevos leads o visitar la web oficial del producto.

### Buscar leads para un software
**Dirección:** `/dashboard/softwares/[software]/buscar-leads`

Una herramienta para encontrar prospectos desde dos fuentes: **Páginas Amarillas** o **Google Maps**.

- Escribes el tipo de negocio (con sugerencias clicables según el producto) y una ciudad opcional.
- Con **Páginas Amarillas**: una tabla de negocios encontrados (nombre, web, teléfono, dirección, sector); seleccionas los que quieras e **importas** varios de golpe como leads nuevos (los duplicados se ignoran solos).
- Con **Google Maps**: como Google no permite extracción automática, se abre el mapa para que busques y copies a mano.

---

## 11. Growth Engine (motor de crecimiento automático)

La sección más grande: un conjunto de herramientas para captar, activar y convertir clientes de forma casi automática. Todas comparten un selector de software arriba y muestran avisos amables cuando aún no hay datos.

### Panel del Growth Engine
**Dirección:** `/dashboard/growth`

La portada del motor de crecimiento, con un indicador de "Motor activo".

- **Cuatro indicadores animados**: leads totales (últimos 30 días), activaciones ejecutadas, contenido publicado y leads "HOT" (calientes).
- **Catálogo de 14 módulos** (Social Posts, Brands, Campañas, Biblioteca, SEO, Video, Referidos, Marketplaces, Radar, Auditoría, Casos de éxito, Activación, Resurrección y Analytics), cada uno con su descripción, su número de uso y un botón para abrirlo.
- **Acciones rápidas**: generar contenido, ver calendario, ver métricas y activar leads.

### Activación automática
**Dirección:** `/dashboard/growth/activation`

El "Loop de Oro": el sistema califica cada lead con IA y ejecuta secuencias automáticas según su temperatura.

- **Configuración**: interruptor para activar la automatización, selector del canal principal (email / WhatsApp / llamada IA), y botones de guardar y de ejecutar las activaciones pendientes.
- **Cuatro indicadores**: total de activaciones, ejecutadas, pendientes y tasa de éxito.
- **Tres tarjetas de categoría**: HOT (puntuación ≥80: email + WhatsApp + llamada IA), WARM (50-79: 3 emails + WhatsApp el día 3) y COLD (<50: goteo lento + reenganche a 30 días).
- **Simular activación**: introduces un lead y ves qué categoría y qué acciones tendría.
- **Leads activados recientemente** y **registro de activaciones** (con su estado e icono, y detalles al expandir).

### Red AdSense (blogs de ingresos pasivos)
**Dirección:** `/dashboard/growth/adsense`

Administra una red de varios blogs en distintos dominios que ganan dinero con publicidad.

- **Cuatro estadísticas globales**: sitios, artículos, publicados y visitas.
- **Crear blog**: nombre, dominio, tema editorial y cuenta de AdSense.
- **Lista de sitios**: cada uno con su estado de AdSense, dominio y número de artículos/nichos.
- **Detalle de un sitio**: gestionar sus **nichos** (con palabras clave) y generar artículos para cada uno; generar un lote de 3 de golpe; y ver la lista de artículos con su estado, nicho, visitas y botones para publicar/despublicar.

### Análisis del crecimiento
**Dirección:** `/dashboard/growth/analytics`

Las métricas del embudo de captación. Eliges rango de fechas (7/30/90 días) y software.

- **Cuatro indicadores**: impresiones, clics, leads y CTR (porcentaje de clics).
- **Leads por canal**: barras con los leads de redes sociales, SEO, video, referidos y marketplaces.
- **Tabla de evolución diaria** (últimos 14 días) con impresiones, clics, leads y gasto estimado.

### Análisis de redes sociales
**Dirección:** `/dashboard/growth/analytics/social`

Métricas específicas de redes sociales.

- **Indicadores principales**: alcance total, engagement, tasa de engagement y posts publicados; y secundarios: likes, comentarios, compartidos e impresiones.
- **Gráfico de engagement en el tiempo**.
- **Gráfico de engagement por plataforma** (Instagram, LinkedIn, X, TikTok, Facebook…) y **mejores formatos** (carrusel, imagen, reel, story…) con su engagement medio.
- **Top posts**: ranking de las publicaciones con mejor rendimiento.
- **Reporte ejecutivo**: lo genera la IA y puedes descargarlo en PDF. Un botón "Snapshot" guarda una foto histórica de las métricas.

### Auditorías (captación premium)
**Dirección:** `/dashboard/growth/auditorias`

El panel del lead magnet de auditoría gratuita.

- **URL pública** de tu auditoría, con botones de copiar y abrir.
- **Tres estadísticas**: auditorías hechas, las que dejaron contacto (leads) y la tasa de conversión.
- **Lista de auditorías completadas**: cada una con el nombre del negocio, sus datos de contacto (correo, teléfono, web), una etiqueta verde si se convirtió en lead, la puntuación obtenida (con color según el resultado) y la fecha.

### Biblioteca de contenido
**Dirección:** `/dashboard/growth/biblioteca`

Un almacén reutilizable de marketing con dos pestañas:

- **Media**: imágenes, vídeos, GIFs, carruseles, documentos y audios, cada uno con miniatura, tipo, etiquetas y número de usos.
- **Copy**: textos reutilizables (captions, CTAs, sets de hashtags, biografías, respuestas y ganchos), con su tipo, contenido y un botón de **copiar**.
- En ambas puedes buscar, filtrar por tipo, y crear/editar/eliminar; los recursos se pueden asociar a una marca.

### Marcas / clientes (Brands)
**Dirección:** `/dashboard/growth/brands`

La base de datos de tus clientes de marketing, en tarjetas.

- Cada marca muestra logo o inicial, nombre, sector, descripción, número de cuentas sociales y campañas, y enlace a su web.
- **Portal del cliente**: puedes activarlo y, una vez activo, copiar su enlace, abrirlo o desactivarlo.
- **Crear/editar**: nombre, identificador, sector, color de marca, web, correo de contacto, logo, descripción, tono de voz, normas de contenido y hashtags oficiales.

### Calendario editorial
**Dirección:** `/dashboard/growth/calendar`

Un calendario que reúne todo lo programado: posts, contenido SEO, emails y eventos.

- **Dos vistas**: mes (cuadrícula) o agenda (lista).
- Cada elemento es un bloque de color según su tipo (posts en rosa, SEO en verde, emails en azul, eventos en naranja) y se puede **arrastrar** entre días para reprogramar.
- **Filtros** para mostrar u ocultar cada tipo.
- Panel de **mejores horas para publicar** por plataforma, basado en datos reales de engagement.

### Campañas
**Dirección:** `/dashboard/growth/campanas`

Organiza los posts en campañas temáticas. Filtros por marca y estado.

- Cada campaña, como tarjeta, muestra una línea de color, nombre, marca, estado (planificación, activa, pausada, completada, archivada), descripción, objetivo, número de posts y fechas.

### Crear campaña
**Dirección:** `/dashboard/growth/campanas/nueva`

Un asistente de cuatro pasos:

1. **Básicos**: software, marca, nombre, descripción y color.
2. **Objetivo**: ocho opciones (awareness, engagement, conversión, tráfico, leads, ventas, contenido de usuarios o lanzamiento).
3. **Fechas y presupuesto**: inicio, fin, importe y moneda.
4. **Brief y KPIs**: resumen creativo y objetivos numéricos (alcance, engagement, clics, conversiones).

### Detalle de campaña
**Dirección:** `/dashboard/growth/campanas/[id]`

Toda la información de una campaña: cabecera con nombre, marca, objetivo y selector de estado; cuatro tarjetas (inicio, fin, presupuesto, posts); los KPIs objetivo; la descripción y el brief; y la tabla de posts de la campaña con su contenido, cuenta, plataforma, fecha y estado.

### Casos de éxito
**Dirección:** `/dashboard/growth/casos-exito`

Genera automáticamente historias de éxito a partir de tus clientes convertidos.

- **Cuatro estadísticas**: clientes convertidos, hitos pendientes, casos generados y publicados.
- **Hitos alcanzados**: cuando superas cierto número de clientes, te sugiere generar una historia.
- **Conversiones sin caso**: lista de clientes recién convertidos con un botón para generar su caso (un proceso automático nocturno también crea borradores).
- **Casos generados**: con su título, estado, extracto y fecha. Los borradores llevan marcadores "[DATO A CONFIRMAR]" que debes revisar antes de publicar.

### Marcas de ropa automáticas
**Dirección:** `/dashboard/growth/clothing`

Crea marcas de ropa de nicho sin stock: la IA genera la marca y los diseños, se conectan con un fabricante bajo demanda (Printify) y se vende sin inventario.

- **Cinco estadísticas**: marcas, productos, publicados, pedidos e ingresos.
- **Marcas**: cada una con logo, nombre, estado (live/borrador), eslogan, número de diseños y productos, un botón para generar 3 diseños, un campo para su dominio propio y botones de publicar/despublicar.
- **Diseños**: cada uno con su imagen y un botón para convertirlo en producto.
- **Productos**: con imagen, título, precio, estado y botón de publicar.

### Estudio de blogging
**Dirección:** `/dashboard/growth/content`

Un editor profesional de artículos, FAQs, comparativas, casos de éxito y landings.

- **Barra lateral**: botón de nuevo artículo, selector de software, búsqueda y pestañas de filtro (todos, borradores, programados, publicados), con la lista de contenidos.
- **Editor** (centro), con tres vistas:
  - **Editar**: título, contador de palabras y minutos de lectura, botón de "reescribir con IA", imagen de portada, palabras clave SEO, extracto (meta description) y el cuerpo del artículo.
  - **Vista previa**: cómo se verá publicado.
  - **Métricas**: impresiones, clics, likes, compartidos, comentarios y leads generados; y la URL pública si ya está publicado.
- **Programar publicación** y **generar con IA** (eligiendo tema y tipo de contenido).

### Generar posts con IA
**Dirección:** `/dashboard/growth/generar`

Un atajo rápido para crear posts optimizados para cada red social: eliges software, tema, redes y tono, y la IA genera el contenido al instante.

### Oportunidades en marketplaces
**Dirección:** `/dashboard/growth/marketplaces`

El sistema rastrea plataformas (Shopify, G2, Capterra, WordPress, HubSpot) buscando empresas que podrían ser tus clientes.

- **Cuatro indicadores**: total de oportunidades, convertidas, marketplaces y valoración media.
- **Distribución por marketplace** y **filtros** por plataforma y estado.
- **Lista de oportunidades**: cada una con su marketplace, estado, valoración y reseñas, título, descripción y fecha; puedes expandirla, ir a la web, convertirla en lead (rellenando sus datos) o cambiar su estado.

### Radar de leads
**Dirección:** `/dashboard/growth/radar`

Defines tu cliente ideal y, cada noche (a las 3:30), el Radar rastrea Google automáticamente y crea leads que encajan.

- **Cuatro indicadores**: leads del Radar, estado (activo/pausado), máximo por noche y último rastreo.
- **Configuración del cliente ideal**: interruptor de activación, sector/búsqueda principal, zonas/ciudades, palabras clave extra, valoración máxima, máximo de reseñas, y casillas como "solo sin web", "excluir cerrados" o "lanzar secuencia al captar"; más el máximo de leads por rastreo. Botones de guardar, **probar** (sin crear nada) y **rastrear ahora**.
- **Resultado**: negocios encontrados con sus etiquetas (sin web, web caída, reseñas malas, negocio nuevo, contactable), ciudad y puntuación de probabilidad de compra.
- **Historial de rastreos** con su resultado, tipo y fecha.

### Programa de referidos
**Dirección:** `/dashboard/growth/referrals`

Tus clientes recomiendan a otros y ganan recompensas automáticas.

- **Cuatro estadísticas**: referidos totales, clics, convertidos y tasa de conversión.
- **Vista previa del enlace** que verán tus clientes.
- **Niveles de referidor**: Bronce (0+), Plata (3+, x1.5), Oro (10+, x2) y Platino (25+, x3).
- **Top referidores**: ranking con puesto, nombre, correo y número de conversiones, exportable a CSV.

### Resurrección masiva
**Dirección:** `/dashboard/growth/resurreccion`

Reactiva de golpe los leads inactivos o rechazados ("el cementerio").

- **Estadísticas** (si hay campañas): leads lanzados, "vueltos a la vida", tasa de resurrección y convertidos.
- **Configuración del segmento**: días sin contacto, estados a incluir, canal (WhatsApp, email o ambos), minutos entre envíos, máximo de leads y un pretexto opcional (si lo dejas vacío, la IA inventa uno por lead).
- **Previsualización**: cuántos leads y envíos, duración estimada, reparto por canal y una muestra de los leads.
- **Estado de la cola**: pendientes, enviados y fallidos.

### Motor SEO
**Dirección:** `/dashboard/growth/seo`

Genera contenido SEO en grandes cantidades, en tres pestañas:

- **Generar contenido**: eliges cuántos artículos, FAQs, comparativas y casos de éxito quieres, una palabra clave base y ciudades para landings.
- **Investigación de palabras clave**: a partir de una semilla, una tabla con volumen, dificultad (con color), intención y tipo de contenido recomendado.
- **Landings programáticas**: genera una landing por ciudad (por ejemplo, "software-dental-madrid"), con una explicación de cómo funcionan.

### Gestor de redes sociales
**Dirección:** `/dashboard/growth/social-posts`

El panel para gestionar todas tus cuentas sociales (Instagram, LinkedIn, Facebook, X, TikTok, Reddit, YouTube, Pinterest, Threads).

- **Cuatro estadísticas**: cuentas, activas, plataformas y posts totales.
- **Buscador, filtros por plataforma** y dos vistas (cuadrícula o tabla). Puedes **seleccionar varias cuentas** y generar posts para todas a la vez.
- Las cuentas con el mismo nombre en varias redes se agrupan en una tarjeta de **grupo**.
- Al entrar en una cuenta ves sus posts en un flujo de trabajo (idea → planificación → producción → revisión → cambios → borrador → programado → publicado), y puedes generar posts, crearlos a mano y gestionar temas recurrentes.

### Grupo de cuentas sociales
**Dirección:** `/dashboard/growth/social-posts/group/[grupo]`

La vista de un grupo de cuentas que comparten nombre.

- **Cuatro estadísticas combinadas**: plataformas, seguidores, posts totales y cuentas activas.
- **Cuentas del grupo** y **posts del grupo** en una línea de tiempo (con borradores, programados, publicados y likes totales), con opción de generar posts para todas a la vez.

### Motor de video
**Dirección:** `/dashboard/growth/video`

Crea kits de vídeo corto completos con IA.

- **Tres pasos**: eliges una plantilla (hook + dato + CTA, etc.), defines el tema (con sugerencias) y eliges el tono (profesional, casual, divertido, inspirador, ventas).
- **Resultado**: el gancho de los primeros 3 segundos, un storyboard escena a escena (con voz en off, descripción visual y subtítulos), el cierre con llamada a la acción, hashtags, captions, estilo musical e imágenes sugeridas.
- Puedes **escuchar la voz** generada y descargar el kit completo o la voz en MP3.

---

## Resumen rápido

El software combina, en una sola plataforma de trabajo:

- **Gestión de clientes:** panel principal, leads, clientes, calendario, eventos, tareas (gamificadas) y métricas.
- **Captación:** recursos gratuitos y landing pages, más el buscador de leads en Páginas Amarillas y Google Maps.
- **Comunicación:** WhatsApp completo, centro de llamadas (con práctica por IA y micrófono) y email marketing con campañas, plantillas, cuentas, remitentes y bajas.
- **Ventas:** propuestas comerciales con enlace público.
- **Inteligencia artificial:** un asistente que analiza tus datos y ejecuta acciones con tu aprobación, además de generación automática de contenido en casi todas las secciones.
- **Tus productos (softwares):** métricas, configuración de marca y prospección.
- **Growth Engine:** redes sociales, SEO, blogs con publicidad, vídeos, campañas, referidos, radar de leads, reactivación de clientes, casos de éxito, marcas de ropa y análisis del embudo.
