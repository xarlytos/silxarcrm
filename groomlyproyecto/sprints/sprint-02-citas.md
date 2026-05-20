# Sprint 2: Agenda y Citas (Core del Sistema)

**Duracion estimada:** 3 semanas  
**Objetivo:** Tener el calendario de citas funcionando, incluyendo creacion, edicion, cambio de estados y vista de disponibilidad.

**Depende de:** Sprint 1 (mascotas, clientes, servicios)

---

## 2.1 Schema Prisma — Modelos de Citas

```prisma
model Appointment {
  id              String   @id @default(cuid())
  salonId         String
  customerId      String
  petId           String
  groomerId       String?  // null = sin asignar aun
  date            DateTime @db.Date
  startTime       String   // "HH:mm"
  endTime         String   // "HH:mm" (calculado por sistema)
  status          String   @default("pending") // pending, confirmed, in_progress, completed, cancelled, no_show
  totalPrice      Decimal  @db.Decimal(10, 2)
  notes           String?
  internalNotes   String?  // notas internas del staff
  checkInAt       DateTime?
  checkOutAt      DateTime?
  source          String   @default("manual") // manual, portal, walkin
  reminderSent    Boolean  @default(false)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  salon           Salon    @relation(fields: [salonId], references: [id], onDelete: Cascade)
  customer        Customer @relation(fields: [customerId], references: [id], onDelete: Cascade)
  pet             Pet      @relation(fields: [petId], references: [id], onDelete: Cascade)
  groomer         Groomer? @relation(fields: [groomerId], references: [id], onDelete: SetNull)
  services        AppointmentService[]
  invoice         Invoice?
  photos          PetPhoto[]
  reminders       Reminder[]
  review          Review?

  @@index([salonId])
  @@index([salonId, date])
  @@index([salonId, groomerId, date])
  @@index([salonId, status])
  @@index([salonId, customerId])
}

model AppointmentService {
  id              String   @id @default(cuid())
  appointmentId   String
  serviceId       String
  addonId         String?
  serviceName     String   // snapshot del nombre
  price           Decimal  @db.Decimal(10, 2) // snapshot del precio
  durationMinutes Int
  notes           String?

  appointment     Appointment @relation(fields: [appointmentId], references: [id], onDelete: Cascade)
  service         Service     @relation(fields: [serviceId], references: [id])
  addon           ServiceAddon? @relation(fields: [addonId], references: [id])

  @@index([appointmentId])
}

model Groomer {
  id                  String   @id @default(cuid())
  salonId             String
  userId              String?  // si el groomer tambien es usuario del sistema
  name                String
  specialties         Json?    // ["bath", "haircut", "deshedding"]
  bio                 String?
  photoUrl            String?
  color               String?  // color en el calendario
  active              Boolean  @default(true)
  maxDailyAppointments Int     @default(8)
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  salon               Salon    @relation(fields: [salonId], references: [id], onDelete: Cascade)
  appointments        Appointment[]
  schedules           GroomerSchedule[]
  timeOffs            GroomerTimeOff[]
  commissions         Commission[]

  @@index([salonId])
}

model GroomerSchedule {
  id          String   @id @default(cuid())
  groomerId   String
  dayOfWeek   Int      // 0 = domingo, 1 = lunes, ...
  startTime   String   // "HH:mm"
  endTime     String   // "HH:mm"
  isWorking   Boolean  @default(true)
  breakStart  String?  // "HH:mm" (descanso)
  breakEnd    String?  // "HH:mm"
  createdAt   DateTime @default(now())

  groomer     Groomer  @relation(fields: [groomerId], references: [id], onDelete: Cascade)

  @@unique([groomerId, dayOfWeek])
}

model GroomerTimeOff {
  id          String   @id @default(cuid())
  groomerId   String
  startDate   DateTime @db.Date
  endDate     DateTime @db.Date
  reason      String?
  type        String   @default("vacation") // vacation, sick, other
  createdAt   DateTime @default(now())

  groomer     Groomer  @relation(fields: [groomerId], references: [id], onDelete: Cascade)
}

model PetPhoto {
  id            String   @id @default(cuid())
  petId         String
  appointmentId String?
  type          String   // before, after
  url           String
  createdAt     DateTime @default(now())

  pet           Pet      @relation(fields: [petId], references: [id], onDelete: Cascade)
  appointment   Appointment? @relation(fields: [appointmentId], references: [id], onDelete: SetNull)
}

model Reminder {
  id            String    @id @default(cuid())
  appointmentId String
  type          String    // confirmation, reminder_24h, reminder_2h, followup
  channel       String    // email, sms, push
  scheduledAt   DateTime
  sentAt        DateTime?
  status        String    @default("pending") // pending, sent, failed
  createdAt     DateTime  @default(now())

  appointment   Appointment @relation(fields: [appointmentId], references: [id], onDelete: Cascade)
}
```

### Tareas
- [ ] Agregar modelos al schema
- [ ] Crear migracion
- [ ] Seed: crear un groomer por defecto al registrar salon

---

## 2.2 Logica de Disponibilidad de Slots

### Algoritmo: slots disponibles

```typescript
function getAvailableSlots(params: {
  salonId: string;
  date: Date;
  groomerId?: string; // null = cualquier groomer
  durationMinutes: number;
}) {
  // 1. Obtener horario de apertura del salon para ese dia
  // 2. Obtener groomers activos que trabajan ese dia
  // 3. Para cada groomer:
  //    a. Obtener su horario (GroomerSchedule)
  //    b. Verificar que no este de vacaciones (GroomerTimeOff)
  //    c. Obtener citas existentes para ese dia
  //    d. Calcular slots libres entre citas
  // 4. Devolver slots ordenados por hora
}
```

### Reglas
- Slot minimo: 15 minutos
- Slot default: segun configuracion del salon (default 30 min)
- No se puede agendar en el pasado
- Respetar minNoticeHours (default 24h)
- No solapar con citas existentes del mismo groomer
- Considerar descansos del groomer

### Endpoint

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | `/api/v1/appointments/slots` | Slots disponibles (query: date, groomerId, durationMinutes) |

---

## 2.3 Backend: CRUD de Citas

### Endpoints

| Metodo | Ruta | Auth | Descripcion |
|--------|------|------|-------------|
| GET | `/api/v1/appointments` | Todos (staff) | Listar citas (filtros: date, groomerId, status, customerId) |
| POST | `/api/v1/appointments` | Todos (staff) | Crear cita |
| GET | `/api/v1/appointments/:id` | Todos (staff) | Obtener cita con servicios |
| PATCH | `/api/v1/appointments/:id` | Todos (staff) | Actualizar cita (si no esta completed/cancelled) |
| PATCH | `/api/v1/appointments/:id/status` | Todos (staff) | Cambiar estado |
| DELETE | `/api/v1/appointments/:id` | OWNER, MANAGER, RECEPTIONIST | Cancelar cita |
| GET | `/api/v1/appointments/calendar` | Todos (staff) | Vista calendario por rango de fechas |
| POST | `/api/v1/appointments/:id/photos` | Todos (staff) | Subir foto antes/despues |

### Validaciones

```typescript
const createAppointmentSchema = z.object({
  customerId: z.string(),
  petId: z.string(),
  groomerId: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  startTime: z.string().regex(/^([0-1]?\d|2[0-3]):([0-5]\d)$/), // HH:mm
  services: z.array(z.object({
    serviceId: z.string(),
    addonId: z.string().optional(),
  })).min(1),
  notes: z.string().max(1000).optional(),
});
```

### Reglas de negocio
- [ ] Al crear cita:
  - Verificar que customer y pet pertenezcan al salon
  - Verificar que groomer pertenezca al salon (si se especifica)
  - Calcular duracion total sumando duracion de servicios + addons
  - Calcular precio total (usando precio segun tamano de mascota si variablePrice)
  - Verificar disponibilidad del slot
  - Crear Appointment + AppointmentServices (snapshot de precios/nombres)
- [ ] Estados y transiciones:
  - `pending` → `confirmed`, `cancelled`
  - `confirmed` → `in_progress`, `cancelled`, `no_show`
  - `in_progress` → `completed`, `cancelled`
  - `completed`, `cancelled`, `no_show` → no cambian
- [ ] Al completar cita: marcar checkOutAt, opcionalmente generar invoice
- [ ] Al cancelar: requerir razon, liberar slot

---

## 2.4 Backend: Modulo Groomers

### Endpoints

| Metodo | Ruta | Auth | Descripcion |
|--------|------|------|-------------|
| GET | `/api/v1/groomers` | Todos (staff) | Listar peluqueros activos |
| POST | `/api/v1/groomers` | OWNER, MANAGER | Crear peluquero |
| GET | `/api/v1/groomers/:id` | Todos (staff) | Obtener peluquero |
| PATCH | `/api/v1/groomers/:id` | OWNER, MANAGER | Actualizar |
| DELETE | `/api/v1/groomers/:id` | OWNER, MANAGER | Desactivar |
| GET | `/api/v1/groomers/:id/schedule` | Todos (staff) | Horario semanal |
| PATCH | `/api/v1/groomers/:id/schedule` | OWNER, MANAGER | Actualizar horario |
| GET | `/api/v1/groomers/:id/appointments` | Todos (staff) | Citas del peluquero (filtro fecha) |
| POST | `/api/v1/groomers/:id/timeoff` | OWNER, MANAGER | Registrar ausencia |
| GET | `/api/v1/groomers/:id/timeoff` | Todos (staff) | Ver ausencias |

### Tareas
- [ ] CRUD de groomers
- [ ] Horario semanal por defecto: L-V 9:00-18:00, S 9:00-14:00, D descanso
- [ ] Ausencias con validacion de fechas
- [ ] Validar que no haya citas en periodo de ausencia al crear timeoff

---

## 2.5 Frontend: Calendario de Citas

### Pantalla principal: `/appointments`

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  Toolbar: [Nueva Cita] [Hoy] [<] Viernes, 9 Mayo 2026 [>]   │
├─────────────────────────────────────────────────────────────┤
│  Filtros: [Todos los peluqueros ▼] [Estado ▼] [Buscar...]   │
├─────────────────────────────────────────────────────────────┤
│  Vista: [Dia] [Semana] [Lista]                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  +──────+ +──────+ +──────+ +──────+                       │
│  | Juan  | | Maria| |Pedro | |Todos |  (tabs por groomer)   │
│  +──────+ +──────+ +──────+ +──────+                       │
│                                                             │
│  09:00 ├─[🐕 Bano - Luna]──────┤                           │
│  09:30 │                        │                           │
│  10:00 ├──────[🐩 Corte - Max]─┤                           │
│  10:30 │                        │                           │
│  11:00 ├─[🦴 Libre]───────────┤                           │
│        │                        │                           │
│  ...   │      (calendario)     │                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Componentes

| Componente | Descripcion |
|------------|-------------|
| `CalendarDayView` | Vista dia con columnas por groomer |
| `CalendarWeekView` | Vista semana con dias como columnas |
| `CalendarListView` | Lista de citas ordenadas |
| `AppointmentCard` | Tarjeta de cita en el calendario (color por estado) |
| `AppointmentModal` | Modal crear/editar cita |
| `SlotPicker` | Selector de fecha + hora con disponibilidad |
| `GroomerColumn` | Columna de un peluquero en vista dia |

### Estados visuales de cita

| Estado | Color | Icono |
|--------|-------|-------|
| pending | amarillo | reloj |
| confirmed | azul | check |
| in_progress | naranja | play |
| completed | verde | check-circle |
| cancelled | gris | x |
| no_show | rojo | user-x |

### Tareas
- [ ] Integrar FullCalendar o componente custom con React
- [ ] Vista dia: columnas por groomer, eje Y = horas
- [ ] Vista semana: dias como columnas, citas apiladas
- [ ] Click en slot vacio → abre modal nueva cita con fecha/hora prellenada
- [ ] Click en cita → abre modal detalle/editar
- [ ] Drag & drop para mover citas entre horas/groomers
- [ ] Filtros: groomer, estado, busqueda por cliente/mascota
- [ ] Boton "Hoy" para ir a fecha actual

---

## 2.6 Frontend: Modal de Cita

### Crear/Editar Cita

**Pasos (wizard o formulario unico):**

1. **Cliente y Mascota**
   - Searchable select de clientes
   - Al seleccionar cliente, carga sus mascotas
   - Boton "+ Nuevo cliente" (abre modal rapido)
   - Boton "+ Nueva mascota" (abre modal rapido)

2. **Servicios**
   - Lista de servicios agrupados por categoria
   - Checkboxes para seleccionar servicios
   - Si un servicio tiene addons, mostrar checkboxes de addons
   - Precio total calculado en tiempo real
   - Duracion total calculada

3. **Fecha, Hora y Peluquero**
   - DatePicker (solo fechas futuras, respetando minNoticeHours)
   - Select de groomer (opcional)
   - Al cambiar fecha/groomer, se recargan slots disponibles
   - Grid de botones con horarios disponibles
   - Duracion visualizada (ej: "10:00 - 11:30")

4. **Notas**
   - Textarea para notas del cliente
   - Textarea para notas internas

### Detalle de Cita (modal lateral)

- Datos: cliente, mascota, servicios, precio, duracion
- Timeline de estados con timestamps
- Botones de accion segun estado:
  - pending → Confirmar, Cancelar
  - confirmed → Check-in, Cancelar, Marcar no-show
  - in_progress → Completar, Cancelar
  - completed → Ver factura, Subir fotos
- Fotos antes/despues (grid)

---

## 2.7 Frontend: Modulo Groomers

### Pantallas

| Ruta | Componente |
|------|------------|
| `/groomers` | GroomersListPage |
| `/groomers/new` | GroomerCreatePage |
| `/groomers/:id` | GroomerDetailPage |
| `/groomers/:id/edit` | GroomerEditPage |
| `/groomers/:id/schedule` | GroomerSchedulePage |

### Tareas
- [ ] Lista de peluqueros: foto, nombre, especialidades, estado, citas hoy
- [ ] Ficha: datos personales, horario semanal visual, ausencias
- [ ] Horario semanal: tabla editable con checkboxes por dia
- [ ] Calendario personal del groomer (vista semana)

---

## Criterios de Aceptacion

- [ ] Se puede crear una cita completa: cliente → mascota → servicios → fecha/hora → groomer
- [ ] El sistema calcula duracion y precio automaticamente
- [ ] Slots disponibles se filtran correctamente (no solapan, respetan horarios)
- [ ] Vista calendario dia muestra citas en columnas por groomer
- [ ] Vista calendario semana funciona
- [ ] Se puede cambiar estado de cita (check-in, completar, cancelar)
- [ ] Drag & drop mueve citas entre horarios/groomers
- [ ] Groomers tienen horario semanal configurable
- [ ] Ausencias bloquean slots
- [ ] Al completar cita se puede generar factura (placeholder)
