# Documentacion Completa — Groomly ERP

> Sistema de gestion integral para peluquerias caninas. SaaS multi-tenant con portal de clientes.
> Basado en la arquitectura de Petwelly, adaptado al negocio de grooming.
> Ultima actualizacion: Mayo 2026.

---

## Tabla de Contenidos

1. [Vision General](#1-vision-general)
2. [Arquitectura del Sistema](#2-arquitectura-del-sistema)
3. [Stack Tecnologico](#3-stack-tecnologico)
4. [Modelo de Datos](#4-modelo-de-datos)
5. [Autenticacion y Seguridad](#5-autenticacion-y-seguridad)
6. [Roles y Permisos](#6-roles-y-permisos)
7. [Modulos y Endpoints](#7-modulos-y-endpoints)
8. [Flujos de Negocio](#8-flujos-de-negocio)
9. [Portal del Cliente](#9-portal-del-cliente)
10. [Facturacion y Suscripciones](#10-facturacion-y-suscripciones)

---

## 1. Vision General

**Groomly** es un ERP completo disenado especificamente para peluquerias caninas. Permite gestionar citas, clientes, mascotas, servicios, finanzas y comunicaciones desde una unica plataforma multi-tenant.

### 1.1. Areas de Operacion

| Area | URL Base | Usuario Tipico | Autenticacion |
|------|----------|---------------|---------------|
| Panel de Staff | `/` | Equipo de la peluqueria | JWT + `X-Salon-Id` |
| Portal del Cliente | `/portal` | Tutores/Duenos | JWT + `X-Salon-Id` (rol CUSTOMER) |
| Superficies Publicas | `/public`, `/reservar` | Visitantes | Sin autenticacion |
| Panel de Plataforma | `/platform` | Administradores del sistema | JWT + `isPlatformAdmin` |

### 1.2. Diferencias Clave con Petwelly

| Aspecto | Petwelly (Criaderos) | Groomly (Peluquerias) |
|---------|---------------------|----------------------|
| **Core** | Perros, camadas, genealogia | **Citas, servicios de grooming, peluqueros** |
| **Clientes** | Tutores que compran cachorros | **Duenos que traen perros a grooming** |
| **Agenda** | Tareas generales | **Calendario de citas por peluquero y box** |
| **Servicios** | Venta de cachorros, montas | **Bano, corte, unas, deslanado, spa** |
| **Inventario** | Comida, medicinas | **Productos de grooming, champus, perfumes** |
| **Fidelizacion** | No aplica | **Puntos por servicio, packs, cupones** |

---

## 2. Arquitectura del Sistema

### 2.1. Diagrama de Capas

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENTE (React/Vite)                      │
│              Zustand (estado)  +  React Router (routing)         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ HTTPS
┌─────────────────────────────────────────────────────────────────┐
│                         API REST (Express)                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  Auth Layer │  │ Tenant Layer│  │    Business Modules     │  │
│  │  (JWT)      │──▶│ (Salon)     │──▶│  Appointments, Pets,   │  │
│  └─────────────┘  └─────────────┘  │  Services, Finance...  │  │
│                                    └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ Prisma Client
┌─────────────────────────────────────────────────────────────────┐
│                      BASE DE DATOS (SQLite/PostgreSQL)           │
│              Prisma ORM  +  Indices compuestos por tenant        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Stack Tecnologico

### 3.1. Backend

| Tecnologia | Version | Proposito |
|-----------|---------|-----------|
| Node.js | 20+ | Runtime |
| Express | 4.x | Framework HTTP |
| TypeScript | 5.x | Tipado estatico |
| Prisma ORM | 5.x | Acceso a datos, migraciones |
| SQLite | 3 | BD en desarrollo |
| PostgreSQL | 15+ | BD en produccion |
| Zod | 3.x | Validacion de schemas |
| JWT (jose) | — | Tokens de autenticacion |
| Argon2id | — | Hash de contrasenas |
| Helmet | — | Headers de seguridad |
| CORS | — | Cross-origin |
| Morgan | — | Logging HTTP |
| Express Rate Limit | — | Rate limiting |
| Stripe SDK | 2026-04 | Pagos y suscripciones |
| AES-256-GCM | — | Cifrado de credenciales |

### 3.2. Frontend

| Tecnologia | Version | Proposito |
|-----------|---------|-----------|
| React | 19.x | UI library |
| Vite | 6.x | Build tool |
| TypeScript | 5.x | Tipado |
| Tailwind CSS | 4.x | Estilos |
| Zustand | 5.x | Estado global |
| React Router | 7.x | Routing |
| React Query | 5.x | Data fetching |
| FullCalendar | 6.x | Calendario de citas |
| Recharts | 2.x | Graficos |
| shadcn/ui | — | Componentes base |

### 3.3. Web Publica (Landing)

| Tecnologia | Proposito |
|-----------|-----------|
| Next.js | SSR/SSG para landing |
| Tailwind CSS | Estilos |

---

## 4. Modelo de Datos

### 4.1. Convenciones

- **Todas las tablas de dominio** llevan `salonId NOT NULL`
- **Indices compuestos** por `(salonId, campo_de_filtro)`
- **Claves primarias**: `String @id @default(cuid())`
- **Soft deletes** en entidades principales

### 4.2. Entidades Principales

#### 4.2.1. Identidad (igual que Petwelly)

| Modelo | Descripcion |
|--------|-------------|
| `User` | Usuario de la plataforma |
| `VerificationToken` | Tokens de verificacion |

#### 4.2.2. Tenant (Peluqueria)

| Modelo | Descripcion | Campos Clave |
|--------|-------------|--------------|
| `Salon` | Peluqueria/tenant principal | `name`, `slug` (unique), `plan`, `subscriptionStatus`, `ownerUserId` |
| `SalonSettings` | Configuracion | `language`, `timezone`, `currency`, `primaryColor`, `openingHours` (JSON), `bookingSettings` (JSON) |
| `SalonUser` | Membership usuario-peluqueria | `salonId+userId`, `role`, `status`, `permissions`, `hourlyRate`, `commissionRate` |
| `Integration` | Integraciones de terceros | `provider`, `status`, `config` (cifrado) |

#### 4.2.3. Dominio: Mascotas

| Modelo | Descripcion | Campos Clave |
|--------|-------------|--------------|
| `Pet` | Mascota que atienden | `name`, `breed`, `size` (xs/s/m/l/xl), `sex`, `birthDate`, `coatType`, `notes`, `allergies`, `behaviorNotes`, `photoUrl`, `ownerCustomerId` |
| `PetPhoto` | Fotos antes/despues | `petId`, `type` (before/after), `url`, `appointmentId` |
| `PetServiceHistory` | Historial de servicios | `petId`, `appointmentId`, `serviceId`, `date`, `notes`, `groomerId` |

#### 4.2.4. Dominio: Clientes

| Modelo | Descripcion | Campos Clave |
|--------|-------------|--------------|
| `Customer` | Cliente/dueno | `fullName`, `email`, `phone`, `address`, `status` (active/inactive), `userId`, `loyaltyPoints` |
| `CustomerPet` | Relacion (un cliente puede tener varias mascotas) | `customerId`, `petId` |

#### 4.2.5. Dominio: Servicios

| Modelo | Descripcion | Campos Clave |
|--------|-------------|--------------|
| `Service` | Servicio ofrecido | `name`, `description`, `category` (bath/haircut/nails/deshedding/spa/other), `durationMinutes`, `price`, `variablePrice` (bool), `active`, `color` |
| `ServiceAddon` | Extra opcional | `serviceId`, `name`, `price`, `durationExtraMinutes` |
| `ServicePackage` | Pack de servicios | `name`, `description`, `services` (JSON), `totalPrice`, `validityDays`, `active` |

#### 4.2.6. Dominio: Citas (Core)

| Modelo | Descripcion | Campos Clave |
|--------|-------------|--------------|
| `Appointment` | Cita | `petId`, `customerId`, `groomerId`, `date`, `startTime`, `endTime`, `status` (pending/confirmed/in_progress/completed/cancelled/no_show), `totalPrice`, `notes`, `checkInAt`, `checkOutAt` |
| `AppointmentService` | Servicios de una cita | `appointmentId`, `serviceId`, `addonId`, `price`, `durationMinutes` |
| `GroomingSlot` | Franja horaria disponible | `groomerId`, `date`, `startTime`, `endTime`, `isAvailable`, `isBlocked` |
| `WaitlistEntry` | Lista de espera | `customerId`, `petId`, `preferredDate`, `preferredTimeRange`, `services` (JSON), `status` (waiting/contacted/converted/removed) |

#### 4.2.7. Dominio: Staff

| Modelo | Descripcion | Campos Clave |
|--------|-------------|--------------|
| `Groomer` | Peluquero | `userId`, `name`, `specialties` (JSON), `bio`, `photoUrl`, `active`, `maxDailyAppointments` |
| `GroomerSchedule` | Horario semanal | `groomerId`, `dayOfWeek`, `startTime`, `endTime`, `isWorking` |
| `GroomerTimeOff` | Ausencias | `groomerId`, `startDate`, `endDate`, `reason`, `type` (vacation/sick/other) |

#### 4.2.8. Dominio: Finanzas

| Modelo | Descripcion | Campos Clave |
|--------|-------------|--------------|
| `Invoice` | Factura | `number`, `appointmentId`, `customerId`, `amount`, `taxAmount`, `total`, `paidAmount`, `balanceDue`, `status` |
| `InvoiceLine` | Linea de factura | `invoiceId`, `description`, `quantity`, `unitPrice`, `total` |
| `Payment` | Pago recibido | `invoiceId`, `amount`, `method` (cash/card/transfer/stripe), `reference` |
| `Transaction` | Transaccion contable | `type` (in/out), `category`, `concept`, `amount` |
| `Expense` | Gasto | `category` (products/tools/staff/marketing/rent/other), `amount`, `date`, `description` |
| `InventoryItem` | Articulo de inventario | `name`, `sku`, `unitPrice`, `stock`, `category` (shampoo/conditioner/tools/treatments/other) |
| `StockMovement` | Movimiento de stock | `inventoryItemId`, `type`, `quantity`, `reference` |
| `Commission` | Comision de peluquero | `groomerId`, `appointmentId`, `amount`, `percentage`, `status` (pending/paid) |

#### 4.2.9. Dominio: Fidelizacion

| Modelo | Descripcion | Campos Clave |
|--------|-------------|--------------|
| `LoyaltyRule` | Reglas de puntos | `serviceCategory`, `pointsPerEuro`, `bonusMultiplier`, `active` |
| `LoyaltyTransaction` | Movimiento de puntos | `customerId`, `points`, `type` (earned/redeemed/expired), `appointmentId`, `reason` |
| `Coupon` | Cupon de descuento | `code`, `discountType` (fixed/percentage), `discountValue`, `minPurchase`, `validFrom`, `validUntil`, `usageLimit`, `usageCount` |
| `CustomerCoupon` | Cupon asignado a cliente | `customerId`, `couponId`, `usedAt` |

#### 4.2.10. Dominio: Comunicaciones

| Modelo | Descripcion | Campos Clave |
|--------|-------------|--------------|
| `Message` | Mensaje interno | `salonId`, `fromUserId`, `toUserId`, `body`, `readAt` |
| `Notification` | Notificacion | `salonId`, `userId`, `type`, `title`, `body`, `link`, `readAt` |
| `Reminder` | Recordatorio programado | `appointmentId`, `type` (confirmation/reminder/followup), `scheduledAt`, `sentAt`, `channel` (sms/email/push) |
| `Review` | Resena | `customerId`, `appointmentId`, `rating`, `body`, `status` |

#### 4.2.11. Auditoria

| Modelo | Descripcion | Campos Clave |
|--------|-------------|--------------|
| `AuditLog` | Log de auditoria | `salonId`, `userId`, `action`, `entity`, `entityId`, `meta`, `ip` |

---

## 5. Autenticacion y Seguridad

### 5.1. Estructura del JWT

```json
{
  "sub": "user-id-cuid",
  "email": "usuario@ejemplo.com",
  "isPlatformAdmin": false,
  "iat": 1715000000,
  "exp": 1715604800
}
```

### 5.2. Header de Tenant

`X-Salon-Id` identifica la peluqueria activa en cada request.

### 5.3. Rutas de Autenticacion

| Metodo | Ruta | Descripcion | Auth |
|--------|------|-------------|------|
| POST | `/api/v1/auth/register` | Registro de usuario | Publica |
| POST | `/api/v1/auth/login` | Login | Publica |
| POST | `/api/v1/auth/forgot-password` | Solicita reset | Publica |
| POST | `/api/v1/auth/reset-password` | Confirma reset | Publica |
| POST | `/api/v1/auth/verify-email` | Verifica email | Publica |

---

## 6. Roles y Permisos

### 6.1. Jerarquia de Roles

| Rol | Descripcion | Acceso |
|-----|-------------|--------|
| `OWNER` | Propietario de la peluqueria. Acceso total. | Todos los modulos. |
| `MANAGER` | Gerente. Acceso a citas, finanzas, clientes. | Segun permisos. |
| `GROOMER` | Peluquero. Acceso a sus citas y mascotas. | Lectura/escritura en sus citas. Lectura en mascotas asignadas. |
| `RECEPTIONIST` | Recepcionista. Citas, clientes, cobros. | Citas, clientes, facturas basicas. |
| `CUSTOMER` | Cliente/dueno. Solo portal. | Solo rutas `/portal/*` |

### 6.2. Permisos por Dominio

| Dominio | Permisos |
|---------|----------|
| Citas | `appointments:read`, `appointments:write` |
| Mascotas | `pets:read`, `pets:write` |
| Clientes | `customers:read`, `customers:write` |
| Servicios | `services:read`, `services:write` |
| Finanzas | `finance:read`, `finance:write` |
| Staff | `staff:read`, `staff:write` |
| Inventario | `inventory:read`, `inventory:write` |
| Configuracion | `settings:read`, `settings:write` |
| Reportes | `reports:read` |

---

## 7. Modulos y Endpoints

### 7.1. Modulos del Sistema

| Modulo | Ruta Base | Roles | Descripcion |
|--------|-----------|-------|-------------|
| Dashboard | `/api/v1/dashboard` | OWNER, MANAGER, GROOMER, RECEPTIONIST | KPIs y metricas |
| Pets | `/api/v1/pets` | Todos (staff) | Fichas de mascotas |
| Customers | `/api/v1/customers` | OWNER, MANAGER, RECEPTIONIST | CRM de clientes |
| Services | `/api/v1/services` | OWNER, MANAGER | Catalogo de servicios |
| Appointments | `/api/v1/appointments` | Todos (staff) | Calendario y citas |
| Groomers | `/api/v1/groomers` | OWNER, MANAGER | Gestion de peluqueros |
| Finance | `/api/v1/finance` | OWNER, MANAGER | Finanzas |
| Inventory | `/api/v1/inventory` | OWNER, MANAGER | Inventario |
| Communications | `/api/v1/communications` | Todos | Mensajes y notificaciones |
| Reviews | `/api/v1/reviews` | OWNER, MANAGER | Resenas |
| Loyalty | `/api/v1/loyalty` | OWNER, MANAGER | Fidelizacion |
| Waitlist | `/api/v1/waitlist` | OWNER, MANAGER, RECEPTIONIST | Lista de espera |
| Settings | `/api/v1/settings` | OWNER | Configuracion |
| Portal | `/api/v1/portal` | CUSTOMER | Portal del cliente |
| Platform | `/api/v1/platform` | PLATFORM_ADMIN | Admin de plataforma |

### 7.2. Endpoints de Citas (Core)

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | `/api/v1/appointments` | Listar citas (filtros: fecha, groomer, status) |
| POST | `/api/v1/appointments` | Crear cita |
| GET | `/api/v1/appointments/:id` | Obtener cita con servicios |
| PATCH | `/api/v1/appointments/:id` | Actualizar cita |
| PATCH | `/api/v1/appointments/:id/status` | Cambiar estado (check-in, completar, cancelar) |
| DELETE | `/api/v1/appointments/:id` | Cancelar cita |
| GET | `/api/v1/appointments/calendar` | Vista calendario (por dia/semana) |
| GET | `/api/v1/appointments/slots` | Slots disponibles (para reserva) |
| POST | `/api/v1/appointments/:id/photos` | Subir fotos antes/despues |

### 7.3. Endpoints del Portal del Cliente

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | `/api/v1/portal/me` | Perfil del cliente |
| GET | `/api/v1/portal/pets` | Mascotas del cliente |
| GET | `/api/v1/portal/appointments` | Citas del cliente |
| POST | `/api/v1/portal/appointments` | Solicitar cita online |
| GET | `/api/v1/portal/invoices` | Facturas del cliente |
| GET | `/api/v1/portal/loyalty` | Puntos de fidelidad |
| POST | `/api/v1/portal/reviews` | Dejar resena |

---

## 8. Flujos de Negocio

### 8.1. Flujo de Registro y Onboarding

```
1. Usuario visita /auth/register
   ↓
2. Completa: email, password, nombre, nombre de la peluqueria
   ↓
3. Backend crea User + Salon
   ↓
4. Se genera token de verificacion de email (24h)
   ↓
5. Usuario verifica email
   ↓
6. Onboarding: configurar horario de apertura, servicios base, primer peluquero
   ↓
7. Acceso al dashboard
```

### 8.2. Flujo de Cita Completo

```
1. Recepcionista/Cliente crea Appointment
   - Selecciona cliente (o crea nuevo)
   - Selecciona mascota (o crea nueva ficha)
   - Selecciona servicios
   - Elige fecha/hora segun disponibilidad del peluquero
   ↓
2. Sistema calcula duracion total y precio
   ↓
3. Cita queda en estado 'pending' o 'confirmed'
   ↓
4. Se envia recordatorio (SMS/email) 24h antes
   ↓
5. Cliente llega → check-in → status 'in_progress'
   ↓
6. Peluquero completa servicio → status 'completed'
   ↓
7. Se genera Invoice automaticamente (opcional)
   ↓
8. Cliente paga → se registra Payment
   ↓
9. Se acumulan puntos de fidelizacion
   ↓
10. Se envia email de follow-up para resena
```

### 8.3. Flujo de Solicitud Online (Portal Cliente)

```
1. Cliente logueado en /portal
   ↓
2. Selecciona mascota y servicios deseados
   ↓
3. Ve slots disponibles (proximos 14 dias)
   ↓
4. Elige fecha/hora
   ↓
5. Solicitud crea Appointment en estado 'pending'
   ↓
6. Staff recibe notificacion y confirma/rechaza
   ↓
7. Cliente recibe confirmacion
```

---

## 9. Portal del Cliente

### 9.1. Funcionalidades

- Ver proximas citas y historial
- Ver fichas de sus mascotas con historial de grooming
- Solicitar nueva cita online
- Ver facturas y pagar online
- Ver puntos de fidelizacion
- Dejar resenas
- Recibir recordatorios de proxima cita

### 9.2. Aislamiento

- Solo ve sus propias citas: `where: { salonId, customerId: me.id }`
- Solo ve sus mascotas: `where: { salonId, ownerCustomerId: me.id }`
- Solo puede resenar sus citas completadas

---

## 10. Facturacion y Suscripciones

### 10.1. Planes de Suscripcion (SaaS)

| Plan | Precio | Limites |
|------|--------|---------|
| Free | $0/mes | 50 citas/mes, 1 peluquero, sin portal |
| Starter | $19/mes | 200 citas/mes, 3 peluqueros, portal basico |
| Professional | $49/mes | Citas ilimitadas, 8 peluqueros, portal completo, fidelizacion |
| Business | $99/mes | Ilimitado, multi-sucursal, API, white-label |

### 10.2. Estados de Suscripcion

- `trial` — Periodo de prueba (14 dias)
- `active` — Suscripcion pagada
- `past_due` — Pago atrasado
- `canceled` — Cancelada

---

*Documento generado automaticamente. Groomly ERP — Sistema de Gestion para Peluquerias Caninas.*
