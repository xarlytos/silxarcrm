# Template del CRM de Outreach — Sprint Comercial 02

> Estructura completa del CRM para registrar las 200 conversaciones objetivo del Sprint 02.
> Tool-agnostic: implementable en Notion, Airtable, Google Sheets, HubSpot o cualquier herramienta similar.
> Sprint Comercial 02.3.
> Tiempo de implementación: 30 minutos.

---

## Por qué necesitas un CRM y no una libreta

Vas a tener 200 conversaciones en 4 semanas. Sin sistema:
- A los 40 contactos pierdes el hilo de quién dijo qué.
- A los 80 contactos repites mensajes a la misma persona.
- A los 120 no recuerdas si Marisa estaba interesada o no.
- A los 160 no sabes por qué te dicen "no" más en Valencia que en Madrid.

**Con CRM, los 200 contactos rinden 5x más.** Sin CRM, son 200 conversaciones sueltas que se evaporan.

---

## 1. Recomendación de herramienta (decide en 1 minuto)

| Herramienta | Pros | Contras | Recomendado si... |
|---|---|---|---|
| **Notion** | Templates, vistas múltiples, gratuito hasta 1k filas, fácil para una persona | Sin automatizaciones nativas, lento con >500 filas | Eres una sola persona haciendo outreach |
| **Airtable** | Vistas potentes, automatizaciones gratuitas, fórmulas | Pricing escala rápido si pasas de 1.000 filas | Quieres automatizar (ej: recordatorios para follow-ups) |
| **Google Sheets** | Cero curva de aprendizaje, gratis ilimitado | Sin vistas filtradas decentes, fácil corromper | Trabajas con varias personas que ya usan Sheets |
| **HubSpot CRM Free** | CRM de verdad, integración email | Curva de aprendizaje, overhead | Si planeas escalar a equipo de ventas de 3+ pronto |

**Decisión recomendada para Sprint 02: Notion o Airtable.** Notion si quieres simplicidad, Airtable si quieres seguimiento más serio.

A partir de ahora, este documento describe la **estructura** que debes recrear. Los pasos son idénticos en cualquier herramienta.

---

## 2. Tabla principal: `Prospectos`

### Campos obligatorios (no pueden faltar)

| Campo | Tipo | Ejemplo | Notas |
|---|---|---|---|
| `id` | Auto / Texto | `P-001` | Identificador único. Si la herramienta lo da automático, dejarlo. |
| `nombre_salon` | Texto | `Patas de Algodón` | Nombre del negocio. |
| `nombre_contacto` | Texto | `María García` | Persona física que decide. Si no la sabes, dejar vacío al principio. |
| `ciudad` | Texto | `Valencia` | Solo ciudad, no provincia. |
| `canal_principal` | Select | `Instagram` | Opciones: Instagram / WhatsApp / Email / Facebook / Referido / Otro |
| `handle_o_contacto` | Texto | `@patasdealgodon` o `+34 612 345 678` | Lo que necesitas para escribirles. |
| `estado_pipeline` | Select (ver §3) | `Sin contactar` | Estado actual en el embudo. |
| `prioridad` | Select | `Alta` | Alta / Media / Baja. Basado en encaje con avatar. |
| `fecha_primer_contacto` | Fecha | `2026-05-18` | Cuándo escribiste por primera vez. Si vacío, aún no contactado. |
| `fecha_proximo_paso` | Fecha | `2026-05-21` | Cuándo tienes que volver a tocar este contacto. Crítico. |
| `objecion_principal` | Select (ver §5) | `Precio` | Solo se rellena si hubo conversación. |
| `notas` | Texto largo | `Tiene 89 reviews 4.7★, postea historias diarias` | Observaciones, contexto, frases textuales. |

### Campos opcionales (rellenar cuando se sepa)

| Campo | Tipo | Ejemplo | Notas |
|---|---|---|---|
| `num_peluqueros_estim` | Número | `3` | Estimado al investigar antes del primer contacto. |
| `facturacion_estim` | Select | `8-15k€` | Rangos: <5k / 5-8k / 8-15k / 15-25k / 25k+ |
| `encaje_avatar` | Select | `🟢 Alto` | 🟢 Alto / 🟡 Medio / 🔴 Bajo. |
| `email` | Email | `maria@patasdealgodon.es` | Si la tienes. |
| `telefono` | Teléfono | `+34 612 345 678` | Si lo tienes. |
| `web` | URL | `https://patasdealgodon.es` | Si tienen web. |
| `referido_por` | Texto | `Lourdes (Madrid)` | Si llegan vía recomendación. |
| `producto_interesa` | Multi-select | `Pro + DFY` | Qué le encaja más después de hablar. |
| `valor_estim_ltv` | Número | `1200€` | Tu estimación del LTV si cierra. |
| `fecha_cierre_real` | Fecha | `2026-06-02` | Día que pagó (cuando aplique). |
| `motivo_perdida` | Texto | `Acaba de contratar Booksy hace 1 mes` | Cuando se marca como "perdido". |

---

## 3. Estados del pipeline (campo `estado_pipeline`)

Linealmente, todo prospecto pasa por estos estados. Definir como **Select** con colores:

| # | Estado | Color | Definición |
|---|---|---|---|
| 1 | `Sin contactar` | ⚪ Gris | Está en la lista pero no le has escrito todavía. |
| 2 | `Contactado` | 🔵 Azul claro | Mensaje enviado, esperando respuesta. |
| 3 | `Conversando` | 🟦 Azul fuerte | Ha respondido y estáis hablando. |
| 4 | `Demo agendada` | 🟣 Morado | Llamada/demo confirmada en calendario. |
| 5 | `Propuesta enviada` | 🟠 Naranja | Le mandaste el link al checkout o factura. |
| 6 | `Cerrado - Ganado` | 🟢 Verde | Pagó. |
| 7 | `Cerrado - Perdido` | 🔴 Rojo | Dijo que no o lleva +30 días sin responder al follow-up. |
| 8 | `Nurturing` | 🟡 Amarillo | No es el momento ahora, pero abierta a hablar más adelante (3-6 meses). |

**Regla:** ningún prospecto puede saltarse pasos del pipeline. De `Sin contactar` no se puede pasar directamente a `Cerrado - Ganado` (sería un dato falsificado). Si cierras instantáneamente, primero pasa por `Contactado → Conversando → Cerrado - Ganado` aunque sea el mismo día.

---

## 4. Vistas obligatorias (filtros guardados)

Cuando entres al CRM cada mañana, no quieres ver los 200 contactos. Quieres ver lo que tienes que hacer **HOY**. Configurar estas vistas:

### Vista 1: `🎯 Hoy`

**Filtro:** `fecha_proximo_paso = HOY` OR `fecha_proximo_paso < HOY` (atrasados).
**Orden:** `prioridad DESC`, luego `fecha_proximo_paso ASC`.
**Mostrar:** nombre_salon, nombre_contacto, canal, estado, notas (preview).

Esta es la vista que abres a las 9:00am y cierras a las 18:00.

### Vista 2: `📅 Esta semana`

**Filtro:** `fecha_proximo_paso entre LUNES y DOMINGO` de la semana actual.
**Orden:** por fecha ascendente.
**Mostrar:** todo.

Planning semanal: los domingos por la noche o lunes por la mañana, revisa esta vista.

### Vista 3: `🆕 Sin contactar`

**Filtro:** `estado_pipeline = "Sin contactar"` AND `encaje_avatar IN ('🟢 Alto', '🟡 Medio')`.
**Orden:** `prioridad DESC`.

De aquí sacas tus contactos del día. Si esta vista está vacía, **construye más lista** antes de seguir.

### Vista 4: `💬 Conversaciones activas`

**Filtro:** `estado_pipeline IN ('Contactado', 'Conversando', 'Demo agendada', 'Propuesta enviada')`.
**Orden:** `fecha_proximo_paso ASC`.

Aquí están los "casi cerrados". No los pierdas. Revisar 2x por semana.

### Vista 5: `📊 Cerrados (ganados + perdidos)`

**Filtro:** `estado_pipeline IN ('Cerrado - Ganado', 'Cerrado - Perdido')`.
**Agrupar por:** `objecion_principal` o por `motivo_perdida`.

Esta es la vista de **aprendizaje**. La revisas cada 25 conversaciones para iterar la oferta.

### Vista 6: `🎟️ Nurturing pipeline`

**Filtro:** `estado_pipeline = "Nurturing"`.
**Orden:** `fecha_proximo_paso ASC`.

Estos no están listos hoy, pero estarán dentro de 3-6 meses. Reactivar cuando llegue su fecha.

---

## 5. Objeciones principales (campo `objecion_principal`)

Las 10 categorías que ya vienen documentadas en `docs/outreach-script.md`. Definir como **Select**:

| Categoría | Definición corta |
|---|---|
| `Precio` | "Es caro." |
| `Tiempo` | "No tengo tiempo para configurarlo." |
| `Técnica` | "Yo no soy técnica, no lo voy a saber usar." |
| `Clientes-no-digitales` | "Mis clientes no usarían el portal." |
| `Más-adelante` | "Lo veo más adelante." |
| `Decisión-de-otro` | "Tengo que hablarlo con [socia/pareja]." |
| `Trial-gratuito` | "Solo si es gratis." |
| `Espera-de-evento` | "Cuando termine [mudanza/contratación/temporada]." |
| `Confianza-datos` | "No me da seguridad con mis datos." |
| `Tradición` | "Llevo 15 años con la libreta." |
| `Otra` | Si surge una nueva, documentarla en `feedback-mercado.md`. |

---

## 6. Tabla secundaria: `Conversaciones`

Una sola fila en `Prospectos` puede tener N conversaciones a lo largo del tiempo. Para no perder el detalle, crear una segunda tabla relacionada (Notion: `Database` linked, Airtable: `Linked record`, Sheets: hoja aparte con una columna que apunte al `id` del prospecto).

| Campo | Tipo | Ejemplo |
|---|---|---|
| `prospecto_id` | Relación | `P-001` |
| `fecha` | Fecha+hora | `2026-05-18 11:32` |
| `canal` | Select | `Instagram DM` |
| `tipo` | Select | `Primer contacto` / `Follow-up 1` / `Demo` / `Cierre` / `Soporte` |
| `dirección` | Select | `Saliente` (tú escribes primero) / `Entrante` (te escriben primero) |
| `resumen` | Texto largo | `Le pregunté por su agenda actual. Confirmó que usa Excel + Calendly. Dolor: ~10 cancelaciones/semana sin cobrar.` |
| `frase_clave_textual` | Texto | `"Llevo 8 años cobrando lo mismo porque me da miedo subir precios"` |
| `paso_siguiente` | Texto | `Enviarle PDF con plantillas no-shows + reservar llamada de 15 min para próximo jueves` |
| `paso_siguiente_fecha` | Fecha | `2026-05-22` |

**Regla:** después de cada interacción real (no solo mensajes informales), 5 minutos para rellenar esta tabla. Si no se documenta, no existió.

---

## 7. Métricas calculadas (dashboard semanal)

Una sola vista de tipo "card" o "summary" que muestre estas métricas, actualizadas en tiempo real:

| Métrica | Cómo se calcula | Objetivo Sprint 02 |
|---|---|---|
| Total prospectos en la base | `COUNT(Prospectos)` | ≥200 |
| Prospectos contactados | `COUNT(estado != 'Sin contactar')` | ≥100 |
| Tasa de respuesta | `COUNT(estado >= 'Conversando') / COUNT(contactados)` | ≥40% |
| Conversaciones activas | `COUNT(estado IN ['Conversando','Demo agendada','Propuesta enviada'])` | ≥20 simultáneas |
| Ventas cerradas | `COUNT(estado = 'Cerrado - Ganado')` | ≥5 |
| Tasa cierre conversaciones | `COUNT(ganados) / COUNT(conversando histórico)` | ≥10% |
| Objeción top | `MODE(objecion_principal)` entre los perdidos | <30% concentración (sino, problema de oferta) |
| Tiempo medio en pipeline | `AVG(fecha_cierre - fecha_primer_contacto)` | <14 días |
| MRR previsto (de los ganados) | `SUM(valor_estim_ltv) / 12` | ≥600€ al cerrar Sprint 02 |

Si una métrica se queda en rojo dos semanas seguidas, **disparar revisión de la oferta** (ver `feedback-mercado.md`).

---

## 8. Plantillas de mensaje guardadas (snippets)

En la mayoría de herramientas se pueden guardar "templates" de mensaje. Definir mínimo estos 5 snippets reutilizables, **personalizables con campos del prospecto**:

### Snippet `🚀 Primer contacto Instagram`

```
Hola [nombre_contacto], soy [tu nombre]. Vi tu cuenta de
[nombre_salon] y me llamó la atención [DETALLE_ESPECÍFICO].

Estoy contactando a unas pocas peluquerías caninas en [ciudad]
para entender de primera mano cómo lleváis la agenda y los
WhatsApps de los clientes. No vengo a venderte nada, te lo prometo.

¿Tendrías 10 minutos esta semana para una llamada corta o un par
de mensajes por aquí? A cambio te paso unas plantillas de WhatsApp
para reducir no-shows que estamos viendo que funcionan bastante
bien en el sector.

Un saludo
```

### Snippet `🔄 Follow-up sin respuesta`

```
[nombre_contacto], no quiero ser pesada. Si no es buen momento,
sin problema, solo dímelo y no te molesto más. Si te interesa el
tema de la agenda y los WhatsApps, dime y te mando las plantillas
que te decía.

Un saludo
```

### Snippet `📅 Agendar llamada`

```
Genial. Te paso un par de huecos:

- [DÍA] a las [HORA]
- [DÍA] a las [HORA]

¿Cuál te encaja? Te mando el enlace de Google Meet en cuanto
me confirmes. Si prefieres por WhatsApp normal en lugar de
videollamada, también vale.
```

### Snippet `📄 Envío de propuesta tras conversación`

```
[nombre_contacto], como hablamos.

Te dejo:
- La página con todo el detalle del DFY: [link]
- El factsheet de Groomly Professional: [link al PDF de 2 páginas]
- Mi disponibilidad la próxima semana para resolver cualquier duda

Sin compromiso de nada. Cuando te encaje, abajo del primer link
tienes el formulario de reserva.

Cualquier cosa, contesta aquí.

Un abrazo,
[tu nombre]
```

### Snippet `🛌 Nurturing — pase a sleep`

```
[nombre_contacto], totalmente entendido. Lo dejamos en pausa.

¿Te parece si te escribo dentro de [3 / 6 meses] para ver cómo va?
Sin que me contestes nada por ahora. Cuando llegue el momento,
te escribo brevemente y tú decides.

Un saludo
```

---

## 9. Reglas de uso del CRM

1. **Toca el CRM antes de tocar Instagram.** Cada mañana primero abres la vista `🎯 Hoy`, luego abres el canal. Nunca al revés.
2. **5 minutos de log tras cada interacción.** Sin excepción. Si una conversación no se registra en menos de 30 minutos, registra menos pero antes.
3. **No borrar registros.** Aunque un prospecto sea "claramente no", se mueve a `Cerrado - Perdido` con `motivo_perdida` documentado. Sirve de aprendizaje agregado.
4. **Una sola fuente de verdad.** Si gestionas algo en WhatsApp, lo reflejas aquí. No hay datos en tu cabeza que no estén en el CRM.
5. **Revisar la vista `🎯 Hoy` antes de empezar nuevos contactos.** Si tienes 15 follow-ups atrasados, primero esos. Después contactos nuevos.
6. **Cerrar pestañas.** Una conversación abierta en el chat durante 3 días sin avanzar = mover a `Cerrado - Perdido` con motivo `"No responde follow-up 1"`.

---

## 10. Setup recomendado para empezar HOY

Si eliges **Notion**:
1. Crear página `CRM Outreach`.
2. Dentro, crear database `Prospectos` con los campos de §2.
3. Crear las 6 vistas de §4 (filtros guardados).
4. Crear database secundaria `Conversaciones` linkada por `prospecto_id`.
5. Guardar los 5 snippets de §8 como "templates" en Notion (o en una página `Snippets` separada).
6. Tiempo total: **~30 min**.

Si eliges **Airtable**:
1. Crear base `Groomly Outreach`.
2. Tabla `Prospects` con los campos de §2.
3. Tabla `Conversations` con `linked record` a Prospects.
4. Crear las 6 vistas (filters + groups).
5. Crear un dashboard con cards para cada métrica de §7.
6. (Opcional) Crear una automatización: "Cuando `fecha_proximo_paso` <= hoy, enviar Slack/email a mí".
7. Tiempo total: **~45 min**.

Si eliges **Google Sheets**:
1. Una pestaña `Prospectos` con las columnas de §2 en la fila 1.
2. Una pestaña `Conversaciones` con las columnas de §6 + columna `prospecto_id`.
3. Una pestaña `Dashboard` con fórmulas (`COUNTIF`, `SUMIF`) que calculan las métricas de §7.
4. Filtros guardados por pestaña.
5. Tiempo total: **~20 min** (pero las vistas son peores que en Notion/Airtable).

---

## 11. Lo que NO se hace en el CRM

- ❌ **No usar el CRM como agenda de citas.** Para las llamadas/demos, usar Google Calendar normal o Cal.com. El CRM registra que la cita existe (`fecha_proximo_paso`, `Demo agendada`), no es la herramienta de calendario.
- ❌ **No meter prospectos que no encajan con el avatar.** Si una cuenta no es 🟢 Alto o 🟡 Medio en `encaje_avatar`, no entra en la lista. Disciplina aquí ahorra tiempo después.
- ❌ **No automatizar el envío de mensajes en frío.** Cada mensaje sale escrito a mano, personalizado con un detalle real. Si automatizas, esto deja de ser outreach y empieza a ser spam.
- ❌ **No compartir el CRM con personas que no son del equipo.** Datos de prospectos = datos privados que merecen el mismo respeto que datos de clientes pagos.

---

*Documento generado como parte del Sprint Comercial 02 de Groomly. El CRM se considera la herramienta central del Sprint 02. Sin él, las 100 conversaciones se evaporan.*
