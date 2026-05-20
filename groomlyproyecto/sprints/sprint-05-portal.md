# Sprint 5: Portal del Cliente y Comunicaciones

**Duracion estimada:** 2 semanas  
**Objetivo:** Portal para que los clientes gestionen sus mascotas, citas y pagos; sistema de recordatorios y notificaciones.

**Depende de:** Sprint 2 (citas), Sprint 4 (facturacion)

---

## 5.1 Schema Prisma — Comunicaciones

```prisma
model Message {
  id        String   @id @default(cuid())
  salonId   String
  fromUserId String
  toUserId  String
  body      String
  readAt    DateTime?
  createdAt DateTime @default(now())

  salon     Salon    @relation(fields: [salonId], references: [id], onDelete: Cascade)

  @@index([salonId])
  @@index([toUserId, readAt])
}

model Notification {
  id        String   @id @default(cuid())
  salonId   String
  userId    String   // puede ser user del staff o customer
  type      String   // appointment, payment, message, reminder, system
  title     String
  body      String
  link      String?
  readAt    DateTime?
  createdAt DateTime @default(now())

  @@index([salonId, userId])
  @@index([userId, readAt])
}

model Review {
  id            String   @id @default(cuid())
  salonId       String
  customerId    String
  appointmentId String   @unique
  rating        Int      // 1-5
  body          String?
  recommends    Boolean  @default(true)
  status        String   @default("pending") // pending, published, hidden
  response      String?  // respuesta del salon
  createdAt     DateTime @default(now())

  salon         Salon    @relation(fields: [salonId], references: [id], onDelete: Cascade)
  customer      Customer @relation(fields: [customerId], references: [id], onDelete: Cascade)
  appointment   Appointment @relation(fields: [appointmentId], references: [id], onDelete: Cascade)

  @@index([salonId])
  @@index([salonId, status])
}
```

---

## 5.2 Backend: Portal del Cliente

### Middleware de Portal

```typescript
// Verifica:
// 1. JWT valido
// 2. X-Salon-Id presente
// 3. Rol CUSTOMER en SalonUser
// 4. Existe Customer con userId = req.user.id

async function resolveSelfCustomer(req) {
  const customer = await prisma.customer.findFirst({
    where: { salonId: req.tenant.salonId, userId: req.user.id },
  });
  if (!customer) throw HttpErrors.notFound('Perfil no encontrado');
  return customer;
}
```

### Endpoints del Portal

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | `/api/v1/portal/me` | Perfil del cliente |
| PATCH | `/api/v1/portal/me` | Actualizar perfil |
| GET | `/api/v1/portal/pets` | Mascotas del cliente |
| GET | `/api/v1/portal/pets/:id` | Detalle de mascota |
| GET | `/api/v1/portal/pets/:id/history` | Historial de servicios |
| GET | `/api/v1/portal/appointments` | Citas (pasadas y futuras) |
| POST | `/api/v1/portal/appointments` | Solicitar cita online |
| PATCH | `/api/v1/portal/appointments/:id/cancel` | Cancelar cita propia |
| GET | `/api/v1/portal/invoices` | Facturas |
| POST | `/api/v1/portal/invoices/:id/payment-link` | Link de pago Stripe |
| GET | `/api/v1/portal/loyalty` | Puntos de fidelizacion |
| POST | `/api/v1/portal/reviews` | Dejar resena |
| GET | `/api/v1/portal/salon` | Info publica del salon |

### Solicitar cita online

```typescript
// 1. Cliente selecciona mascota y servicios
// 2. Sistema muestra slots disponibles (proximos 14 dias)
// 3. Cliente elige fecha/hora
// 4. Se crea Appointment en estado 'pending'
// 5. Staff recibe notificacion
// 6. Staff confirma → estado 'confirmed'
// 7. Cliente recibe notificacion de confirmacion
```

### Reglas de aislamiento
- Solo ve sus citas: `where: { salonId, customerId: me.id }`
- Solo ve sus mascotas: `where: { salonId, ownerCustomerId: me.id }`
- Solo puede cancelar citas en estado pending/confirmed
- Solo puede resenar citas completadas
- Solo puede solicitar citas con al menos 24h de anticipacion

---

## 5.3 Backend: Sistema de Recordatorios

### Tipos de recordatorios

| Tipo | Cuando | Canal |
|------|--------|-------|
| confirmation | Al crear cita (portal) | email |
| reminder_24h | 24h antes de la cita | email + sms |
| reminder_2h | 2h antes de la cita | sms |
| followup | 24h despues de cita completada | email |
| birthday | Dia del cumpleanos de la mascota | email |

### Implementacion

```typescript
// Job programado (cada hora via node-cron o similar)
async function processReminders() {
  const reminders = await prisma.reminder.findMany({
    where: {
      status: 'pending',
      scheduledAt: { lte: new Date() },
    },
  });
  
  for (const reminder of reminders) {
    // Enviar segun canal
    // email -> SendGrid/mock
    // sms -> Twilio/mock
    // Marcar como sent
  }
}
```

### Tareas
- [ ] Crear Reminders automaticamente al crear/confirmar cita
- [ ] Job que procesa reminders pendientes cada hora
- [ ] En desarrollo, loguear en consola en lugar de enviar
- [ ] Configurar horarios de envio (no enviar de noche)

---

## 5.4 Backend: Notificaciones

### Eventos que generan notificaciones

| Evento | Destinatarios | Tipo |
|--------|--------------|------|
| Nueva cita creada | Staff (OWNER, MANAGER, RECEPTIONIST) | appointment |
| Cita confirmada (portal) | Cliente | appointment |
| Cita cancelada | Cliente + Staff | appointment |
| Cita completada | Cliente | appointment |
| Nuevo pago registrado | OWNER, MANAGER | payment |
| Stock bajo | OWNER, MANAGER | system |
| Nueva resena | OWNER, MANAGER | system |
| Nuevo mensaje | Destinatario | message |

### Endpoints

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | `/api/v1/communications/notifications` | Notificaciones del usuario |
| PATCH | `/api/v1/communications/notifications/:id/read` | Marcar como leida |
| PATCH | `/api/v1/communications/notifications/read-all` | Marcar todas como leidas |
| GET | `/api/v1/communications/unread-summary` | Conteo de no leidas |

---

## 5.5 Backend: Resenas

### Endpoints

| Metodo | Ruta | Auth | Descripcion |
|--------|------|------|-------------|
| GET | `/api/v1/reviews` | OWNER, MANAGER | Listar resenas |
| PATCH | `/api/v1/reviews/:id` | OWNER, MANAGER | Publicar/ocultar/responder |
| DELETE | `/api/v1/reviews/:id` | OWNER, MANAGER | Eliminar |

### Reglas
- [ ] Cliente puede crear resena solo de citas completadas (7 dias despues)
- [ ] Resena queda en estado 'pending' hasta que staff la apruebe
- [ ] OWNER puede responder a resenas
- [ ] Resenas publicadas se muestran en microsite publico

---

## 5.6 Frontend: Portal del Cliente

### Layout del Portal

```
┌─────────────────────────────────────────────────────────────┐
│  [Logo]  Groomly Portal          [Notificaciones] [Perfil]  │
├────────────┬────────────────────────────────────────────────┤
│            │                                                │
│  Mis Citas │           CONTENIDO                            │
│  ───────── │                                                │
│  Mis Perros│                                                │
│  ───────── │                                                │
│  Facturas  │                                                │
│  ───────── │                                                │
│  Puntos    │                                                │
│  ───────── │                                                │
│  Resenas   │                                                │
│  ───────── │                                                │
│  Config    │                                                │
│            │                                                │
└────────────┴────────────────────────────────────────────────┘
```

### Pantallas

| Ruta | Componente | Descripcion |
|------|------------|-------------|
| `/portal` | PortalDashboard | Proximas citas, accesos rapidos |
| `/portal/appointments` | PortalAppointments | Historial de citas |
| `/portal/appointments/new` | PortalBookAppointment | Solicitar cita |
| `/portal/pets` | PortalPets | Mis mascotas |
| `/portal/pets/:id` | PortalPetDetail | Ficha de mascota |
| `/portal/invoices` | PortalInvoices | Facturas y pagos |
| `/portal/loyalty` | PortalLoyalty | Puntos y beneficios |
| `/portal/reviews` | PortalReviews | Dejar resenas |
| `/portal/settings` | PortalSettings | Perfil y preferencias |

### Solicitar cita (wizard)

**Paso 1: Seleccionar mascota**
- Tarjetas con fotos de las mascotas del cliente
- Boton "+ Agregar mascota"

**Paso 2: Seleccionar servicios**
- Lista de servicios del salon con precios
- Checkboxes para seleccionar
- Precio total dinamico

**Paso 3: Seleccionar fecha y hora**
- Calendario (proximos 14 dias)
- Al seleccionar fecha, carga slots disponibles
- Botones de hora disponibles
- Sin seleccion de groomer (asignacion automatica)

**Paso 4: Confirmar**
- Resumen de cita
- Notas opcionales
- Boton "Solicitar cita"

### Flujo de login del cliente

```
1. Cliente recibe email de invitacion o accede a /portal/login
2. Se registra/loguea con email
3. Sistema busca Customer con ese email en el salon
4. Si existe → vincula userId y crea SalonUser CUSTOMER
5. Si no existe → muestra mensaje "Contacta con la peluqueria"
```

---

## 5.7 Frontend: Notificaciones en Panel Staff

### Componente: NotificationBell

- Icono de campana en navbar
- Badge con conteo de no leidas
- Dropdown con lista de notificaciones recientes
- Click en notificacion → marca como leida + navega al link

### Tareas
- [ ] Polling cada 60 segundos para nuevas notificaciones
- [ ] Sonido opcional para nuevas notificaciones
- [ ] Toast notification para notificaciones en tiempo real

---

## Criterios de Aceptacion

- [ ] Cliente puede registrarse en el portal
- [ ] Cliente ve sus mascotas y proximas citas
- [ ] Cliente puede solicitar cita online (wizard completo)
- [ ] Staff recibe notificacion de nueva solicitud
- [ ] Staff puede confirmar/rechazar solicitud
- [ ] Cliente recibe recordatorio 24h antes de cita (logueado en consola)
- [ ] Cliente puede ver facturas y pagar online
- [ ] Cliente puede dejar resena despues de cita completada
- [ ] Staff puede responder resenas
- [ ] Notificaciones en tiempo real en panel de staff
