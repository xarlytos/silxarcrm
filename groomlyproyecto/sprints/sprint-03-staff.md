# Sprint 3: Staff Avanzado, Horarios y Comisiones

**Duracion estimada:** 2 semanas  
**Objetivo:** Gestion completa del equipo, horarios, ausencias y sistema de comisiones.

**Depende de:** Sprint 2 (citas y groomers)

---

## 3.1 Schema Prisma — Modelos adicionales

```prisma
model Commission {
  id            String   @id @default(cuid())
  salonId       String
  groomerId     String
  appointmentId String   @unique
  amount        Decimal  @db.Decimal(10, 2)
  percentage    Decimal  @db.Decimal(5, 2)
  baseAmount    Decimal  @db.Decimal(10, 2) // monto sobre el que se calculo
  status        String   @default("pending") // pending, paid
  paidAt        DateTime?
  notes         String?
  createdAt     DateTime @default(now())

  salon         Salon    @relation(fields: [salonId], references: [id], onDelete: Cascade)
  groomer       Groomer  @relation(fields: [groomerId], references: [id], onDelete: Cascade)

  @@index([salonId])
  @@index([salonId, groomerId])
  @@index([salonId, status])
}
```

---

## 3.2 Backend: Modulo Staff (Usuarios del Salon)

### Endpoints

| Metodo | Ruta | Auth | Descripcion |
|--------|------|------|-------------|
| GET | `/api/v1/users` | OWNER, MANAGER | Listar miembros del salon |
| POST | `/api/v1/users` | OWNER, MANAGER | Invitar miembro (enviar email) |
| GET | `/api/v1/users/:id` | OWNER, MANAGER | Detalle de miembro |
| PATCH | `/api/v1/users/:id` | OWNER, MANAGER | Actualizar rol, permisos, tarifa |
| DELETE | `/api/v1/users/:id` | OWNER | Eliminar del salon |
| POST | `/api/v1/users/:id/resend-invite` | OWNER, MANAGER | Reenviar invitacion |

### Flujo de invitacion

```
1. OWNER/MANAGER crea invitacion con email + rol
   ↓
2. Backend crea SalonUser con status='invited'
   ↓
3. Se envia email con link de registro + token de invitacion
   ↓
4. Usuario se registra (o loguea si ya tiene cuenta)
   ↓
5. Token valida la invitacion, cambia status a 'active'
```

### Reglas
- [ ] Solo OWNER puede crear/eliminar MANAGER
- [ ] OWNER no puede eliminarse a si mismo
- [ ] OWNER puede editar permisos granulares de cada miembro
- [ ] Invitaciones expiran en 7 dias
- [ ] Email de invitacion con link unico

---

## 3.3 Backend: Comisiones

### Logica de comisiones

```typescript
function calculateCommission(appointment: Appointment, groomer: Groomer) {
  // 1. Obtener commissionRate del SalonUser del groomer
  // 2. Si no tiene rate personal, usar default del salon
  // 3. Calcular: commission = totalPrice * (commissionRate / 100)
  // 4. Crear Commission record
}
```

### Endpoints

| Metodo | Ruta | Auth | Descripcion |
|--------|------|------|-------------|
| GET | `/api/v1/finance/commissions` | OWNER, MANAGER | Listar comisiones |
| GET | `/api/v1/finance/commissions/:id` | OWNER, MANAGER | Detalle |
| POST | `/api/v1/finance/commissions/:id/pay` | OWNER, MANAGER | Marcar como pagada |
| GET | `/api/v1/finance/commissions/summary` | OWNER, MANAGER | Resumen por groomer/periodo |
| GET | `/api/v1/groomers/:id/commissions` | OWNER, MANAGER, GROOMER | Comisiones de un groomer |

### Reglas
- [ ] Comision se calcula automaticamente al completar una cita
- [ ] Si se edita el precio de la cita, recalcular comision
- [ ] Si se cancela una cita, anular comision (status=cancelled)
- [ ] GROOMER puede ver sus propias comisiones (solo lectura)
- [ ] Resumen mensual por groomer

---

## 3.4 Backend: Reportes de Productividad

### Endpoints

| Metodo | Ruta | Auth | Descripcion |
|--------|------|------|-------------|
| GET | `/api/v1/reports/groomers` | OWNER, MANAGER | Productividad por groomer |
| GET | `/api/v1/reports/groomers/:id` | OWNER, MANAGER | Detalle de productividad |

### Datos del reporte

```typescript
interface GroomerReport {
  groomerId: string;
  groomerName: string;
  period: { start: Date; end: Date };
  totalAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  noShowAppointments: number;
  totalRevenue: number; // suma de citas completadas
  totalCommission: number;
  averageAppointmentValue: number;
  servicesBreakdown: { serviceName: string; count: number; revenue: number }[];
  dailyBreakdown: { date: string; appointments: number; revenue: number }[];
}
```

---

## 3.5 Frontend: Gestion de Equipo

### Pantalla: `/team`

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  Equipo                              [+ Invitar miembro]    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │ [Avatar]   │  │ [Avatar]   │  │ [Avatar]   │            │
│  │ Ana Lopez  │  │ Juan Perez │  │ Maria G.   │            │
│  │ OWNER      │  │ GROOMER    │  │ RECEPTION  │            │
│  │ Activo     │  │ Activo     │  │ Invitado   │            │
│  │            │  │ 45 citas   │  │            │            │
│  │ [Editar]   │  │ [Editar]   │  │ [Reenviar] │            │
│  └────────────┘  └────────────┘  └────────────┘            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Modal: Invitar miembro

- Email
- Rol (select: MANAGER, GROOMER, RECEPTIONIST)
- Permisos granulares (checkboxes)
- Tarifa horaria (opcional)
- Porcentaje de comision (opcional)

### Modal: Editar miembro

- Rol
- Permisos
- Tarifa/comision
- Estado (active/suspended)

---

## 3.6 Frontend: Comisiones

### Pantalla: `/finance/commissions`

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  Comisiones                                                 │
├─────────────────────────────────────────────────────────────┤
│  Periodo: [Enero 2026 ▼]  [Filtrar por groomer ▼]           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Resumen:                                                   │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │ $1,250.00   │ │ $890.00     │ │ 15          │           │
│  │ Comisiones  │ │ Pendientes  │ │ Groomers    │           │
│  │ totales     │ │ por pagar   │ │ activos     │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
│                                                             │
│  Tabla:                                                     │
│  Groomer      | Citas  | Ingresos | Comision | Estado      │
│  ─────────────────────────────────────────────────────────  │
│  Juan Perez   | 23     | $3,200   | $480.00  | [Pagar]     │
│  Maria Garcia | 18     | $2,100   | $315.00  | Pagado      │
│  ...                                                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Tareas
- [ ] Tabla de comisiones con filtros por periodo y groomer
- [ ] Boton "Pagar" que marca comisiones como pagadas
- [ ] Grafico de comisiones por groomer (barras)
- [ ] Exportar a CSV

---

## 3.7 Frontend: Reportes de Productividad

### Pantalla: `/reports/groomers`

### Tareas
- [ ] Selector de periodo (semana/mes/custom)
- [ ] Tabla ranking de groomers por citas/ingresos
- [ ] Grafico de citas por dia
- [ ] Grafico de servicios mas populares
- [ ] Comparativa groomer vs groomer
- [ ] Exportar a PDF/CSV

---

## Criterios de Aceptacion

- [ ] OWNER puede invitar miembros al salon
- [ ] Invitados reciben email (en dev, se loguea) con link
- [ ] Usuario puede aceptar invitacion y unirse al salon
- [ ] OWNER puede asignar permisos granulares
- [ ] Comisiones se calculan automaticamente al completar cita
- [ ] OWNER puede pagar comisiones y quedan marcadas
- [ ] GROOMER ve sus comisiones en su perfil
- [ ] Reportes de productividad muestran datos reales
- [ ] Usuario con permisos limitados solo ve lo autorizado
