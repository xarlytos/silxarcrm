# Servicio Done-For-You (DFY) — Groomly

> Servicio one-time de implementación express por 197€. Sin recurrente extra; el cliente paga después su plan normal.
> No es un plan en `PLAN_CATALOG` — se gestiona manualmente fuera del catálogo hasta que haya volumen que justifique código dedicado.
> Sprint Comercial 01.2 — Decisión: 197€ one-time, sin mensualidad extra.
> Fecha: 12 de mayo de 2026.

---

## Posicionamiento del servicio

**Para quién:**
> Peluquerías que quieren empezar con Groomly funcionando al 100% desde el primer día, sin tener que configurar nada técnico ellas mismas. Ideal para dueñas que dicen *"yo no soy técnica"* o que tienen demasiado lío para parar 5 horas a montarlo solas.

**Promesa:**
> En 5 días laborables tienes Groomly operativo, tus clientes y citas subidos, recordatorios activados y a tus empleadas formadas. Tú no tocas nada técnico. Por 197€ una sola vez. Sin mensualidad extra.

**NO es:** una mensualidad. **NO sustituye** al plan (sigues pagando tu Starter / Professional / Business). **NO incluye** consultoría continua post-arranque.

---

## Qué incluye exactamente (entregables)

### Antes de empezar (día 0-1)

- 📞 **Llamada kick-off de 30 minutos.** Recolección de información:
  - Lista de servicios con precios actuales (por tamaño si aplica).
  - Lista de peluqueros y sus horarios.
  - Lista de clientes activos (CSV, Excel, captura de agenda o WhatsApp).
  - Horario de apertura y excepciones.
  - Tono de los recordatorios automáticos (tú/usted, emojis sí/no).
- 📋 **Acceso temporal a la cuenta** del cliente para que el equipo Groomly configure.

### Configuración (día 2-3)

- ⚙️ **Catálogo de servicios** creado con precios y duraciones (variable por tamaño cuando aplica).
- 👥 **Peluqueros** dados de alta con sus horarios y especialidades.
- 📅 **Horario del salón** configurado (apertura, descanso, días de cierre).
- 🐕 **Clientes y mascotas migrados** (hasta 200 clientes / 300 mascotas en el paquete; más a partir de aquí, 0,50€/cliente extra).
- 💬 **Plantillas de recordatorios** personalizadas (24h antes, día mismo, follow-up para review).
- 🎁 **Plantilla de fidelización** básica si está incluida en el plan (Pro o Business): regla "1 punto = 1€", recompensa al llegar a 100 puntos.
- 🔗 **Portal del cliente** activado con dominio sub-de Groomly (`misalon.groomly.app`).

### Formación (día 4)

- 🎓 **Sesión de training de 2 horas** vía videollamada con la dueña + sus empleadas:
  - Cómo abrir un día de trabajo: ver agenda, hacer check-in.
  - Cómo cerrar una cita: cobro, fotos antes/después, notas para próxima vez.
  - Cómo gestionar cancelaciones / cambios / waitlist.
  - Cómo añadir un cliente nuevo en 30 segundos.
  - Cómo leer los reports semanales.

### Cierre (día 5)

- 📖 **Manual operativo personalizado** de 8-12 páginas en PDF con capturas reales del salón.
- 📊 **Reunión de seguimiento** en 30 días para revisar uso y resolver dudas.
- 📞 **Soporte prioritario 60 días** post-arranque (respuesta en menos de 4h en horario laboral).

---

## Lo que NO incluye

- ❌ Diseño / desarrollo de página web propia.
- ❌ Campañas de marketing o Ads.
- ❌ Asesoría fiscal/contable.
- ❌ Migración desde sistemas custom (otros SaaS de pago que requieran integración técnica). Si surge, presupuesto aparte.
- ❌ Configuración de pasarela de pago propia (Stripe Connect en Business).
- ❌ Cambios estructurales después de la entrega: si tras 30 días quieres re-cablear toda la fidelización o crear una estructura de servicios distinta, presupuesto aparte (no abuso por modificaciones menores, sí por re-trabajos grandes).

---

## Proceso operativo interno

### Cuándo se ofrece

Tres momentos en el funnel:

1. **Outreach manual (Sprint 02):** en conversaciones con prospectos que dicen *"yo no soy técnica"* o *"no tengo tiempo para montar nada"*.
2. **Post-trial day 7 OTO (Sprint 04):** si alguien lleva 7 días en trial y no ha completado el onboarding (no ha subido clientes, no ha creado servicios), se le ofrece DFY como rescate.
3. **Demo personalizada:** al final de una demo en directo, si el cliente decide contratar plan Professional o Business, se ofrece DFY como add-on.

### Cómo se cobra

- **Stripe Invoice manual** de 197€ enviado por email desde el dashboard de Stripe.
- Pago obligatorio antes de empezar (no se hace setup sin haber cobrado).
- IVA: aplicar el 21% en España (precio final 238,37€). En el copy público se decidirá si se muestra con o sin IVA — recomendación: mostrar con IVA incluido para evitar fricción mental.

### Cómo se factura internamente

- Categoría: **Ingreso por servicios profesionales** (no por SaaS recurrente).
- Margen: el coste real estimado es 5-8 horas de trabajo del equipo. A 30€/h coste interno ≈ 200€. **El servicio tiene margen mínimo en este precio.** Justificación: es un acelerador de conversión y un sistema de prevención de churn (cliente bien montado churn menos), no un centro de beneficio en sí mismo.

### Tracking hasta tener flag en BD

Mientras NO existe campo en `Salon` para tracking de DFY, registro manual en:

```
/docs/dfy-clientes.md
```

(Crear cuando llegue el primer cliente DFY.)

Estructura por cliente:
- Fecha kick-off
- Fecha entrega
- Importe cobrado
- Plan adquirido
- Nº clientes migrados
- Notas de uso post-30 días
- Notas de uso post-90 días

### Cuándo modelarlo en BD

Cuando lleguemos a **5 clientes DFY activos**, añadir a `Salon`:

```prisma
model Salon {
  // ...campos existentes...
  dfyContractedAt   DateTime?
  dfyDeliveredAt    DateTime?
  dfyDeliveredById  String?  // userId del platform admin que entregó
  dfyAmountCents    Int?     // 19700 = 197,00€
}
```

Y crear endpoint de admin para marcarlo. Antes de 5 clientes, no merece el código.

---

## Copy de venta del DFY (para landing y materiales)

### Headline

> **Hazlo Done-For-You: Groomly operativo en 5 días, por 197€ una sola vez.**

### Sub-headline

> Tú no tocas nada técnico. Nosotros migramos tus clientes, configuramos tus servicios, activamos los recordatorios y formamos a tu equipo. Llegas el lunes con el salón gestionado como las grandes.

### Bullets (5)

- ✅ Migración de hasta 200 clientes y 300 mascotas
- ✅ Configuración de servicios, precios, peluqueros y horarios
- ✅ Recordatorios automáticos personalizados con el tono de tu salón
- ✅ Sesión de formación de 2 horas para ti y tus empleadas
- ✅ Manual operativo personalizado + soporte prioritario 60 días

### Precio + garantía

> **197€** una sola vez. Sin mensualidad extra. Pagas tu plan Groomly aparte (desde 39€/mes).
>
> Si en 60 días no recuperas 10 horas a la semana o no llegan 3 clientes nuevos por el portal, te devolvemos los 197€ + las cuotas + 50€ extra. **Cero burocracia.**

### CTA

> [Reservar mi setup DFY →]

---

## Notas finales

- **No vender DFY a salones que no encajen con el avatar.** Si la peluquería cobra menos de 25€ corte completo, el ticket no justifica el setup. Mejor decir no.
- **Limitar capacidad inicial a 3 DFY al mes** durante los primeros 3 meses. Más volumen sin proceso refinado = mal servicio y reclamaciones de garantía.
- **Cada DFY entregado = caso de éxito potencial.** Pedir testimonio + permiso para usar el nombre del salón en la web tras 30 días de uso satisfactorio.

---

*Documento generado como parte del Sprint Comercial 01 de Groomly. El servicio se considera definido y lanzable; el copy de landing está listo para dropear en la página `/done-for-you` cuando exista.*
