# Playbook Operativo del Servicio Done-For-You

> Lista paso a paso de qué hace el equipo Groomly cuando una peluquería contrata el servicio DFY (197€ one-time).
> Sprint Comercial 02.1.
> Este documento es interno. NO se comparte con clientes.
> Última actualización: 12 de mayo de 2026.

---

## Compromiso temporal

**5 días laborables desde el cobro hasta la entrega.** No empezamos sin cobro confirmado. Si el cliente paga un martes a las 14:00, el day 1 oficial es el miércoles.

---

## Pre-arranque (entre el cobro y el día 1)

**Trigger:** Stripe Invoice marcada como `paid` o transferencia confirmada.

| Tarea | Responsable | Tiempo |
|---|---|---|
| Crear registro en `docs/dfy-clientes.md` con fecha de cobro, importe, plan adquirido y persona de contacto. | Founder | 5 min |
| Enviar email de bienvenida (template en sección 6). Acuse de recibo + calendario para llamada kick-off. | Founder | 10 min |
| Crear carpeta del cliente en Drive interno (`/dfy/[nombre-salon]/`) con sub-carpetas: `kickoff`, `datos-cliente`, `screenshots`, `manual-final`. | Founder | 3 min |
| Bloquear ~6h de trabajo profundo en agenda durante los próximos 5 días. | Founder | 5 min |

---

## Día 1 — Kick-off y recolección

### Llamada de kick-off (30 min)

**Agenda interna del fundador durante la llamada:**

1. **Apertura (3 min)** — Saludo, agradecimiento, contexto: "Esto es lo que vamos a hacer en los próximos 5 días, este lunes lo tienes funcionando."

2. **Recolección de datos del negocio (15 min)** — Cubrir TODOS estos puntos. Ir con la checklist abierta en otra pestaña. Anotar respuestas en el doc del cliente.
   - Horario de apertura del salón (apertura, cierre, descanso, días cerrados).
   - Lista de servicios completa: nombre, descripción corta, duración estimada, precio (variable por tamaño si aplica).
   - Lista de peluqueros: nombre, horario semanal, especialidades, comisión si la cobran.
   - Lista de clientes activos: ¿cuántos hay? ¿En qué formato (Excel, libreta, otro software)? ¿Lo mandan ahora o después?
   - Tipos de mascotas habituales (predominio raza/tamaño).
   - Tono de comunicación con clientes (tú/usted, formal/cercana, emojis sí/no).
   - Política de cancelaciones (¿cobran fee? ¿con cuánto preaviso?).
   - Promociones recurrentes o paquetes (si los tienen).
   - Datos fiscales para la facturación (CIF/NIF, razón social, dirección).

3. **Información técnica (5 min)** — Credenciales temporales:
   - Email del cliente para crear su usuario admin en Groomly.
   - Acceso (read-only) a sus herramientas actuales si quieren migrar datos automáticamente.
   - Logo del salón (pedir alta resolución).
   - Subdominio elegido (`xxxxx.groomly.app`).

4. **Cierre (5 min)** — Explicar siguientes pasos:
   - Mañana hago la configuración inicial.
   - Pasado mañana migro los clientes.
   - Día 4 te enseño todo a ti y a tu equipo.
   - Día 5 te paso el manual y te dejo el soporte prioritario activado.

### Tareas post-llamada (Día 1, mismo día)

- [ ] Documentar las respuestas del cliente en `dfy/[nombre-salon]/kickoff/notas-kickoff.md`.
- [ ] Crear cuenta Groomly del cliente con el email del owner. Verificación de email pre-marcada como completada.
- [ ] Crear el Salon con plan = el adquirido (Starter/Pro/Business) y `subscriptionStatus: 'active'`. Setear `trialEndsAt: null` (DFY salta el trial).
- [ ] Crear `SalonSettings` con timezone, currency EUR, primaryColor del cliente, logoUrl subido a S3.
- [ ] Enviar email de "Día 1 cerrado, mañana configuro tu salón" con resumen de lo recogido en el kick-off (template en sección 6).

**Criterio de cierre Día 1:** Cliente tiene cuenta Groomly creada, datos completos recogidos en doc interno, email de confirmación enviado.

---

## Día 2 — Configuración del catálogo

### Tareas del día (4-5 horas)

- [ ] **Servicios:** crear cada servicio del cliente en el panel admin. Para cada uno:
  - Nombre exacto (no inventar).
  - Categoría correcta (bath / haircut / nails / deshedding / spa / other).
  - Duración real reportada por la peluquería (no estimaciones tuyas).
  - Precio variable si aplica (`priceSmall`, `priceMedium`, `priceLarge`, `priceXLarge`).
  - Color visual diferenciado (para la agenda).
- [ ] **Addons:** si los hay (ej: "cepillado extra", "champú medicado"), crearlos vinculados a los servicios correspondientes.
- [ ] **Paquetes (Pro+):** si el cliente vendía paquetes (ej: "Bono 5 baños"), recrearlos.
- [ ] **Peluqueros:** dar de alta a cada peluquero con su `SalonUser` rol `GROOMER`, su `Groomer` profile, especialidades y horarios semanales (`GroomerSchedule` por día).
- [ ] **Horarios:** configurar el `OpeningHours` del `SalonSettings` con la realidad del salón.
- [ ] **Fidelización (Pro+):** crear `LoyaltyRule` base (ej: 1 punto por euro, recompensa a 100 puntos).
- [ ] **Recordatorios:** crear plantillas de Reminder personalizadas con el tono del cliente. Mínimo:
  - Recordatorio 24h antes (email + SMS si tiene módulo).
  - Confirmación post-reserva online.
  - Follow-up post-cita pidiendo review.
- [ ] Hacer screenshot de cada pantalla configurada para el manual final (carpeta `dfy/[nombre-salon]/screenshots/`).

### Tareas post-trabajo

- [ ] Enviar email "Día 2 cerrado, ya tienes tu catálogo. Mañana subo a tus clientes" con 3 screenshots del progreso (template en sección 6).

**Criterio de cierre Día 2:** Catálogo completo, peluqueros configurados, horarios listos. Si entra una cita ahora, el sistema puede procesarla.

---

## Día 3 — Migración de clientes

### Preparación

- [ ] Recibir el archivo del cliente con sus contactos. Formatos aceptados: Excel, CSV, Google Sheets, foto/PDF de libreta (con OCR manual si hace falta).
- [ ] Normalizar el archivo. Pasarlo al template estándar de Groomly:
  - Columnas obligatorias: `fullName`, `phone`, `email` (opcional pero recomendado).
  - Columnas de mascota: `petName`, `petBreed`, `petSize` (xs/s/m/l/xl), `petBirthDate` (si lo saben).
  - Columnas opcionales: `address`, `notes`, `allergies`, `behaviorNotes`.
- [ ] **Validar números de teléfono** (formato E.164 con +34) y emails (regex básico). Marcar los problemáticos en una columna `validation_issue`.

### Importación

- [ ] Usar el endpoint admin `POST /api/v1/customers/bulk-import` (o el script `prisma/scripts/import-customers.ts` si existe; si no, crearlo).
- [ ] Para cada fila:
  - Crear `Customer` con datos básicos.
  - Crear `Pet` vinculada (uno o varios por cliente).
  - Crear `CustomerPet` link.
  - Asignar peluquero por defecto si el cliente reportó preferencia.
- [ ] Loguear los errores. Si más del 5% falla, investigar antes de continuar.
- [ ] Hacer una segunda pasada manual de los registros con `validation_issue`.

### Verificación

- [ ] Total importado debe coincidir con lo entregado (±2% margen por duplicados detectados).
- [ ] Spot-check: abrir 10 clientes random y verificar que los datos están correctos.

### Tareas post-trabajo

- [ ] Enviar email "Día 3 cerrado, [N] clientes ya están en tu cuenta. Pasado mañana te entreno" (template en sección 6).

**Criterio de cierre Día 3:** ≥95% de clientes importados con datos limpios. Email enviado.

---

## Día 4 — Formación

### Antes de la sesión

- [ ] Confirmar 24h antes la asistencia del cliente + equipo (mejor todos juntos en una sala con un proyector o pantalla compartida).
- [ ] Preparar grabación (Zoom/Google Meet con grabación local activada, con consentimiento del cliente).
- [ ] Tener la cuenta del cliente abierta en pantalla, no el demo de Groomly.

### Estructura de la sesión (2 horas)

**Bloque 1 — Mapa general (15 min)**
- Tour del dashboard. Qué se ve y dónde está cada cosa.
- Diferencias entre roles (OWNER, MANAGER, RECEPTIONIST, GROOMER).
- Cómo se comparte la cuenta entre el equipo.

**Bloque 2 — Día típico (45 min)**
- Abrir la jornada por la mañana: ver agenda del día, ver quién hizo check-in.
- Hacer check-in de una cita real (o de demo si no hay todavía).
- Empezar la cita: status `in_progress`.
- Cerrar la cita: añadir fotos antes/después, notas para próxima vez, pasar a `completed`.
- Cobrar la cita: facturación + Payment.
- Cerrar el día: ver resumen, dejar notas para mañana.

**Bloque 3 — Gestión de la agenda (30 min)**
- Crear una cita desde cero: cliente nuevo, mascota nueva, servicios, peluquero, hora.
- Mover una cita (drag & drop).
- Cancelar una cita.
- Gestionar lista de espera (`Waitlist`).
- Bloquear un slot (vacaciones, comida, formación).

**Bloque 4 — Cliente y mascota (20 min)**
- Buscar un cliente: por nombre, por teléfono.
- Editar datos del cliente.
- Ver historial de citas de una mascota.
- Añadir nota crítica (alergia, mal carácter) que aparezca en la próxima cita.

**Bloque 5 — Configuración que el cliente puede tocar (10 min)**
- Qué SÍ pueden tocar: precios, horarios, peluqueros, plantillas de recordatorio.
- Qué NO pueden tocar (riesgo): branding, integraciones, plan/billing sin avisar.

### Después de la sesión

- [ ] Guardar la grabación en `dfy/[nombre-salon]/training/`.
- [ ] Hacer una transcripción rápida (Whisper o similar) y archivar.
- [ ] Enviar email "Día 4 cerrado, mañana te paso tu manual personalizado" + grabación adjunta (template en sección 6).

**Criterio de cierre Día 4:** Cliente + equipo formados. Pueden operar el salón sin llamarte para cada cosa.

---

## Día 5 — Cierre y entrega

### Manual personalizado

- [ ] Crear PDF de 8-12 páginas usando el template estándar de Groomly + los screenshots tomados estos días.
- [ ] El manual incluye:
  - Página de portada con logo del cliente.
  - "Cómo abrir tu día" (con screenshots reales).
  - "Cómo cerrar una cita" (con screenshots reales).
  - "Cómo añadir un cliente nuevo".
  - "Cómo gestionar cancelaciones".
  - "Qué hacer si...": top 5 escenarios (no contesta el cliente, se solapan citas, el peluquero llamó enfermo, etc.).
  - Página de contactos: email de soporte prioritario, teléfono fundadora directo, horario.
- [ ] Subir el PDF a `dfy/[nombre-salon]/manual-final/manual.pdf`.

### Activación del soporte prioritario

- [ ] Crear etiqueta `DFY-60d` en el sistema de soporte con expiry en 60 días desde el día 5.
- [ ] Compromiso: respuesta en menos de 4h en horario laboral durante 60 días.

### Email de cierre

- [ ] Enviar el manual + grabación de training + recordatorio de garantía (template en sección 6).
- [ ] Programar reunión de seguimiento a 30 días con calendario compartido.

### Tareas administrativas internas

- [ ] Actualizar registro en `docs/dfy-clientes.md`: fecha de entrega, link al manual, observaciones.
- [ ] Marcar internamente el cliente como "DFY entregado" (cuando exista el campo en BD; mientras tanto, etiqueta manual).
- [ ] Enviar al cliente la encuesta NPS de entrega (Notion Form simple, 3 preguntas).

**Criterio de cierre Día 5:** Manual entregado, soporte 60d activo, reunión a 30 días en calendario, encuesta NPS enviada, registro interno actualizado.

---

## Seguimiento post-entrega

### Día +30 (reunión de seguimiento programada)

- [ ] 30 minutos en videollamada con el cliente.
- [ ] Revisar uso real: ¿están entrando reservas por el portal? ¿Los recordatorios se envían? ¿Han usado la fidelización?
- [ ] Resolver dudas operativas.
- [ ] Pedir testimonio si el cliente está contento. Permiso para usar nombre + logo en la web.
- [ ] Si el cliente no usa el sistema → escalar. Tal vez necesite sesión de re-training. Decisión: ofrecer 1h gratis o intervenir más.

### Día +60 (cierre de soporte prioritario)

- [ ] Email automatizado: "Hoy termina tu soporte prioritario DFY de 60 días. ¡Has llegado al final del periodo de garantía y todo está perfecto!"
- [ ] Quitar la etiqueta `DFY-60d` del sistema de soporte.
- [ ] Si el cliente ha consumido el soporte agresivamente (>20h), revisar internamente si hubo problemas de entrega.

### Día +90 (caso de éxito o feedback)

- [ ] Si el cliente está activo y satisfecho: producir mini-case study (1 página + 3 frases textuales del cliente + métricas reales). Pedir permiso para publicar.
- [ ] Si el cliente está churned o insatisfecho: entrevista post-mortem de 30 minutos. Documentar el aprendizaje en `docs/dfy-lecciones-aprendidas.md`.

---

## Templates de email (sección 6)

### Email 1 — Bienvenida tras cobro

**Asunto:** Bienvenida a Groomly DFY — Empezamos esta semana

```
Hola [Nombre],

Acabo de recibir el pago del setup Done-For-You. Bienvenida.

Esta semana montamos tu peluquería en Groomly. Aquí los próximos pasos:

📅 LUNES — Llamada kick-off de 30 minutos. Te paso un par de huecos:
   - Lunes 10:00
   - Lunes 16:00
   Dime cuál te encaja y mañana te mando el enlace.

📋 Antes de la llamada, ayuda si tienes a mano:
   - Lista de tus servicios (con precios)
   - Lista de tus peluqueros (con horarios)
   - Lista de clientes (en cualquier formato — Excel, libreta, foto)
   - Tu logo en buena calidad si lo tienes

Estoy contigo en cada paso. Cualquier duda hasta el lunes, este email.

Un abrazo,
[Tu nombre]
```

### Email 2 — Cierre Día 1

**Asunto:** Día 1 cerrado — Mañana configuro tu catálogo

```
Hola [Nombre],

Acabamos de cerrar el kick-off. Resumen rápido:

✅ Tu cuenta Groomly ya está creada
✅ Tengo todos tus datos del salón
✅ Mañana monto tu catálogo de servicios y peluqueros

Mañana por la tarde te mando 3 screenshots del progreso. Si hay algo
que se me haya pasado, contesta a este email.

[Tu nombre]
```

### Email 3 — Cierre Día 2

**Asunto:** Día 2 cerrado — Mira tu catálogo

```
Hola [Nombre],

Tu catálogo está listo. Adjunto 3 screenshots:

1. Tus servicios con precios
2. Tus peluqueros con horarios
3. Tu agenda configurada con los colores que elegiste

Si ves algo raro, dímelo hoy mismo y lo corrijo. Si todo bien, no
tienes que hacer nada.

Mañana subo a tus clientes.

[Tu nombre]
```

### Email 4 — Cierre Día 3

**Asunto:** [N] clientes importados — Día 4 te entreno

```
Hola [Nombre],

He subido [N] clientes a tu cuenta. Spot-check de 10 fichas random:
todas correctas.

Mañana toca la sesión de formación. Lleva preparado:

- A ti y a las peluqueras delante de una pantalla
- 2 horas sin interrupciones (clave: pon el WhatsApp del salón en mute)
- Ganas de preguntar todo

Confirmamos:
📅 [Fecha y hora acordadas]
🔗 [Enlace de Google Meet/Zoom]

[Tu nombre]
```

### Email 5 — Cierre Día 4

**Asunto:** ¡Bien hecho! Mañana te paso tu manual personalizado

```
Hola [Nombre],

Buenísimo el training. Os habéis quedado con todo más rápido de lo que
esperaba.

Adjunto la grabación por si quieres repasar algo concreto. Mañana te
mando el manual personalizado de tu peluquería en PDF, con screenshots
reales (no de demo).

Cualquier cosa entre ahora y mañana, contesta a este email.

[Tu nombre]
```

### Email 6 — Día 5: entrega final

**Asunto:** Tu salón ya está operativo — Aquí tu manual

```
Hola [Nombre],

Felicidades. Tu peluquería está al 100% en Groomly.

📎 Adjunto:
- Manual personalizado de tu salón (PDF)
- Grabación del training (link)
- Encuesta de 3 preguntas para que me cuentes qué tal

A partir de hoy:

✅ Soporte prioritario activo 60 días (respuesta en menos de 4 horas en horario laboral).
   Si necesitas algo: [email de soporte directo].

✅ Garantía pública de 60 días activa.
   Si en 60 días no recuperas 10h/semana o no llegan 3 clientes nuevos
   por el portal, te devolvemos todo + 50€. Sin preguntas.

✅ Reunión de seguimiento en 30 días, ya en tu calendario.

Disfruta. Y dime cuando quieras.

[Tu nombre]
```

---

## Costes internos estimados

| Concepto | Tiempo | Coste interno (30€/h) |
|---|---|---|
| Pre-arranque | 25 min | 12,50€ |
| Día 1: kick-off + post | 75 min | 37,50€ |
| Día 2: configuración | 240 min | 120,00€ |
| Día 3: migración | 150 min | 75,00€ |
| Día 4: formación + transcripción | 180 min | 90,00€ |
| Día 5: manual + cierre | 90 min | 45,00€ |
| **Total interno** | **≈12h** | **≈380€** |

Margen DFY = 197€ - 380€ = **-183€** por cliente.

**Esto NO es un problema** mientras el DFY funcione como acelerador de conversión (sin DFY, no se cierra el deal). Si los clientes DFY tienen LTV de >800€ (16 meses al plan medio €79 + add-ons), el ROI funciona.

**Reevaluar el precio del DFY** cuando: (a) llegues a 10 clientes DFY entregados o (b) el margen interno mejore por procesos optimizados que bajen las 12h a 6h.

---

## Reglas operativas

1. **Cero excepciones en la garantía.** Si un cliente DFY reclama la garantía, se devuelve todo + 50€ sin discusión. Esto es la promesa, se cumple. Si pasa más de una vez al mes, no es un problema del cliente: es un problema de tu entrega.
2. **5 días son 5 días.** No empezamos un DFY si la semana en curso ya tiene un DFY corriendo a mitad. Capacidad: 1 DFY simultáneo al principio, máximo 2 cuando haya proceso refinado.
3. **No descontar el DFY.** Si un cliente pide rebaja, no vendemos DFY. Ofrecemos el plan a secas con onboarding self-serve.
4. **Documentar cada lección.** Después de cada DFY, 15 minutos para escribir "qué fue bien, qué iría más rápido la próxima vez" en `docs/dfy-lecciones-aprendidas.md`.
5. **No prometer features.** Si un cliente pide algo que Groomly no hace ("¿podéis poneros con Holded?"), respuesta honesta: "Ahora no, lo tenemos en backlog". Nunca "te lo monto yo aparte".

---

*Documento generado como parte del Sprint Comercial 02 de Groomly. Se considera v1; iterar después del primer DFY entregado.*
