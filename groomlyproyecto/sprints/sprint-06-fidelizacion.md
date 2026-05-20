# Sprint 6: Fidelizacion, Paquetes y Extras

**Duracion estimada:** 2 semanas  
**Objetivo:** Sistema de fidelizacion, paquetes de servicios, cupones, lista de espera y fotos antes/despues.

**Depende de:** Sprint 2 (citas), Sprint 5 (portal)

---

## 6.1 Schema Prisma — Fidelizacion

```prisma
model LoyaltyRule {
  id                String   @id @default(cuid())
  salonId           String
  name              String
  serviceCategory   String?  // null = todos los servicios
  serviceId         String?  // null = toda la categoria
  pointsPerEuro     Int      @default(1) // puntos por cada euro gastado
  bonusMultiplier   Decimal  @default(1) @db.Decimal(3, 2) // 2.00 = doble puntos
  minPurchase       Decimal? @db.Decimal(10, 2)
  active            Boolean  @default(true)
  validFrom         DateTime @default(now())
  validUntil        DateTime?
  createdAt         DateTime @default(now())

  salon             Salon    @relation(fields: [salonId], references: [id], onDelete: Cascade)

  @@index([salonId])
}

model LoyaltyTransaction {
  id            String   @id @default(cuid())
  customerId    String
  points        Int      // positivo = gana, negativo = gasta
  type          String   // earned, redeemed, expired, adjustment
  appointmentId String?
  reason        String
  expiresAt     DateTime? // para puntos ganados
  createdAt     DateTime @default(now())

  customer      Customer @relation(fields: [customerId], references: [id], onDelete: Cascade)

  @@index([customerId])
  @@index([customerId, createdAt])
}

model ServicePackage {
  id            String   @id @default(cuid())
  salonId       String
  name          String
  description   String?
  services      Json     // [{serviceId, quantity, serviceName}]
  totalPrice    Decimal  @db.Decimal(10, 2) // precio del pack (descuento incluido)
  originalPrice Decimal  @db.Decimal(10, 2) // precio sin descuento
  validityDays  Int      @default(365) // dias de validez desde compra
  active        Boolean  @default(true)
  createdAt     DateTime @default(now())

  salon         Salon    @relation(fields: [salonId], references: [id], onDelete: Cascade)
  purchases     CustomerPackage[]

  @@index([salonId])
}

model CustomerPackage {
  id              String   @id @default(cuid())
  customerId      String
  packageId       String
  purchaseDate    DateTime @default(now())
  validUntil      DateTime
  totalServices   Int      // cantidad total de servicios
  usedServices    Int      @default(0)
  remainingServices Int    // computed
  status          String   @default("active") // active, expired, consumed
  createdAt       DateTime @default(now())

  customer        Customer @relation(fields: [customerId], references: [id], onDelete: Cascade)
  package         ServicePackage @relation(fields: [packageId], references: [id], onDelete: Cascade)

  @@index([customerId])
}

model Coupon {
  id            String   @id @default(cuid())
  salonId       String
  code          String
  discountType  String   // fixed, percentage
  discountValue Decimal  @db.Decimal(10, 2)
  minPurchase   Decimal? @db.Decimal(10, 2)
  maxDiscount   Decimal? @db.Decimal(10, 2) // limite para porcentaje
  validFrom     DateTime @default(now())
  validUntil    DateTime
  usageLimit    Int?     // null = ilimitado
  usageCount    Int      @default(0)
  active        Boolean  @default(true)
  createdAt     DateTime @default(now())

  salon         Salon    @relation(fields: [salonId], references: [id], onDelete: Cascade)

  @@unique([salonId, code])
  @@index([salonId])
}

model CustomerCoupon {
  id          String    @id @default(cuid())
  customerId  String
  couponId    String
  usedAt      DateTime?
  createdAt   DateTime  @default(now())

  customer    Customer  @relation(fields: [customerId], references: [id], onDelete: Cascade)
  coupon      Coupon    @relation(fields: [couponId], references: [id], onDelete: Cascade)

  @@unique([customerId, couponId])
}

model WaitlistEntry {
  id                String   @id @default(cuid())
  salonId           String
  customerId        String
  petId             String?
  preferredDate     DateTime? @db.Date
  preferredTimeRange String?  // "morning", "afternoon", "evening", or "HH:mm-HH:mm"
  services          Json     // [{serviceId, serviceName}]
  notes             String?
  status            String   @default("waiting") // waiting, contacted, converted, removed
  contactedAt       DateTime?
  convertedToAppointmentId String?
  createdAt         DateTime @default(now())

  salon             Salon    @relation(fields: [salonId], references: [id], onDelete: Cascade)
  customer          Customer @relation(fields: [customerId], references: [id], onDelete: Cascade)

  @@index([salonId])
  @@index([salonId, status])
}
```

---

## 6.2 Backend: Fidelizacion

### Logica de puntos

```typescript
function calculateLoyaltyPoints(appointment: Appointment): number {
  // 1. Buscar reglas activas para el salon
  // 2. Para cada servicio de la cita:
  //    a. Buscar regla especifica del servicio
  //    b. Si no, buscar regla de la categoria
  //    c. Si no, usar regla default (1 punto por euro)
  // 3. Calcular: puntos = precio * pointsPerEuro * bonusMultiplier
  // 4. Crear LoyaltyTransaction
  // 5. Actualizar customer.loyaltyPoints
}
```

### Endpoints

| Metodo | Ruta | Auth | Descripcion |
|--------|------|------|-------------|
| GET | `/api/v1/loyalty/rules` | OWNER, MANAGER | Listar reglas |
| POST | `/api/v1/loyalty/rules` | OWNER, MANAGER | Crear regla |
| PATCH | `/api/v1/loyalty/rules/:id` | OWNER, MANAGER | Actualizar |
| DELETE | `/api/v1/loyalty/rules/:id` | OWNER, MANAGER | Eliminar |
| GET | `/api/v1/loyalty/transactions` | OWNER, MANAGER | Historial de puntos |
| POST | `/api/v1/loyalty/adjust` | OWNER, MANAGER | Ajustar puntos manualmente |
| GET | `/api/v1/loyalty/dashboard` | OWNER, MANAGER | Estadisticas de fidelizacion |

### Reglas
- [ ] Puntos se otorgan automaticamente al completar cita
- [ ] Puntos ganados expiran en 12 meses (configurable)
- [ ] Se pueden canjear puntos por descuentos en futuras citas
- [ ] 100 puntos = 1 euro de descuento (configurable)

---

## 6.3 Backend: Paquetes de Servicios

### Endpoints

| Metodo | Ruta | Auth | Descripcion |
|--------|------|------|-------------|
| GET | `/api/v1/packages` | Todos (staff) | Listar packs |
| POST | `/api/v1/packages` | OWNER, MANAGER | Crear pack |
| PATCH | `/api/v1/packages/:id` | OWNER, MANAGER | Actualizar |
| DELETE | `/api/v1/packages/:id` | OWNER, MANAGER | Desactivar |
| POST | `/api/v1/customers/:id/packages` | OWNER, MANAGER, RECEPTIONIST | Vender pack a cliente |
| GET | `/api/v1/customers/:id/packages` | OWNER, MANAGER, RECEPTIONIST | Packs del cliente |
| POST | `/api/v1/appointments/:id/use-package` | OWNER, MANAGER, RECEPTIONIST | Usar servicio de pack |

### Reglas
- [ ] Al vender pack: crear CustomerPackage, generar invoice
- [ ] Al crear cita, detectar si cliente tiene pack activo con el servicio
- [ ] Usar servicio de pack decrementa remainingServices
- [ ] Pack expira automaticamente al pasar validUntil

---

## 6.4 Backend: Cupones

### Endpoints

| Metodo | Ruta | Auth | Descripcion |
|--------|------|------|-------------|
| GET | `/api/v1/coupons` | OWNER, MANAGER | Listar cupones |
| POST | `/api/v1/coupons` | OWNER, MANAGER | Crear cupon |
| PATCH | `/api/v1/coupons/:id` | OWNER, MANAGER | Actualizar |
| DELETE | `/api/v1/coupons/:id` | OWNER, MANAGER | Eliminar |
| POST | `/api/v1/coupons/validate` | Todos (staff) | Validar cupon |

### Validacion de cupon

```typescript
function validateCoupon(code: string, customerId: string, total: number) {
  // 1. Buscar cupon por code + salonId
  // 2. Verificar que este activo
  // 3. Verificar que no haya expirado
  // 4. Verificar que no haya excedido usageLimit
  // 5. Verificar que total >= minPurchase
  // 6. Verificar que el cliente no haya usado este cupon (si es personal)
  // 7. Calcular descuento
  // 8. Aplicar maxDiscount si es porcentaje
}
```

---

## 6.5 Backend: Lista de Espera

### Endpoints

| Metodo | Ruta | Auth | Descripcion |
|--------|------|------|-------------|
| GET | `/api/v1/waitlist` | OWNER, MANAGER, RECEPTIONIST | Listar |
| POST | `/api/v1/waitlist` | OWNER, MANAGER, RECEPTIONIST | Agregar |
| PATCH | `/api/v1/waitlist/:id` | OWNER, MANAGER, RECEPTIONIST | Actualizar |
| PATCH | `/api/v1/waitlist/:id/contact` | OWNER, MANAGER, RECEPTIONIST | Marcar como contactado |
| PATCH | `/api/v1/waitlist/:id/convert` | OWNER, MANAGER, RECEPTIONIST | Convertir a cita |
| DELETE | `/api/v1/waitlist/:id` | OWNER, MANAGER, RECEPTIONIST | Eliminar |

### Flujo

```
1. Cliente pide cita pero no hay slots disponibles
   ↓
2. Staff/cliente agrega a lista de espera
   ↓
3. Cuando hay cancelacion o nuevo slot:
   a. Sistema muestra entries de waitlist para esa fecha
   b. Staff contacta al cliente
   ↓
4. Si cliente confirma → convertir a cita
   ↓
5. Entry pasa a status 'converted'
```

---

## 6.6 Backend: Fotos Antes/Despues

### Endpoints

| Metodo | Ruta | Auth | Descripcion |
|--------|------|------|-------------|
| POST | `/api/v1/appointments/:id/photos` | Todos (staff) | Subir foto |
| DELETE | `/api/v1/appointments/:id/photos/:photoId` | OWNER, MANAGER, GROOMER | Eliminar foto |
| GET | `/api/v1/pets/:id/photos` | Todos (staff) | Fotos de mascota |

### Tareas
- [ ] Subida de imagenes (almacenamiento local en dev, S3/cloud en prod)
- [ ] Compresion de imagenes
- [ ] Etiquetado automatico: before (check-in), after (completada)

---

## 6.7 Frontend: Fidelizacion

### Pantalla: `/loyalty`

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  Programa de Fidelizacion                                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Estadisticas:                                              │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │ 12,450      │ │ 45          │ │ €124.50     │           │
│  │ Puntos      │ │ Clientes    │ │ Valor       │           │
│  │ totales     │ │ activos     │ │ en puntos   │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
│                                                             │
│  [Grafico: Puntos otorgados por mes]                        │
│                                                             │
│  Reglas:                                                    │
│  [Tabla de reglas con condiciones y puntos]                 │
│  [+ Nueva regla]                                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Pantalla: `/packages`

- Lista de packs de servicios
- Formulario de creacion
- Venta de pack a cliente

---

## 6.8 Frontend: Lista de Espera

### Pantalla: `/waitlist`

**Tabla:**
- Cliente, Mascota, Servicios, Fecha preferida, Franja horaria, Estado
- Acciones: contactar, convertir a cita, eliminar
- Filtros por estado, fecha

---

## 6.9 Frontend: Fotos en Ficha de Cita

### Componente: PhotoGallery

- Grid de fotos antes/despues
- Upload drag & drop
- Comparativa lado a lado (before/after)
- Lightbox para ver a tamano completo

---

## Criterios de Aceptacion

- [ ] Puntos se otorgan automaticamente al completar cita
- [ ] Cliente ve sus puntos en el portal
- [ ] Se pueden crear reglas de fidelizacion por categoria/servicio
- [ ] Se pueden vender packs de servicios
- [ ] Al crear cita se detecta si cliente tiene pack activo
- [ ] Cupones con validacion de fecha, uso minimo, limite
- [ ] Lista de espera con conversion a cita
- [ ] Fotos antes/despues se suben desde ficha de cita
- [ ] Galeria de fotos en ficha de mascota
