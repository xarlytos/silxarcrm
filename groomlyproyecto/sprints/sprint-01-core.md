# Sprint 1: Core del Negocio — Mascotas, Clientes y Servicios

**Duracion estimada:** 2 semanas  
**Objetivo:** Tener el nucleo de datos de negocio funcional: mascotas, clientes y catalogo de servicios.

**Depende de:** Sprint 0 (autenticacion y tenant)

---

## 1.1 Schema Prisma — Nuevos Modelos

### Customer (Cliente/Dueno)

```prisma
model Customer {
  id            String   @id @default(cuid())
  salonId       String
  fullName      String
  email         String?
  phone         String?
  address       String?
  city          String?
  postalCode    String?
  notes         String?
  status        String   @default("active") // active, inactive, archived
  loyaltyPoints Int      @default(0)
  userId        String?  // si tiene cuenta en el portal
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  salon         Salon    @relation(fields: [salonId], references: [id], onDelete: Cascade)
  pets          Pet[]
  appointments  Appointment[]
  invoices      Invoice[]

  @@index([salonId])
  @@index([salonId, status])
}
```

### Pet (Mascota)

```prisma
model Pet {
  id              String   @id @default(cuid())
  salonId         String
  name            String
  breed           String?
  size            String   @default("m") // xs, s, m, l, xl
  sex             String?  // male, female
  birthDate       DateTime?
  coatType        String?  // short, medium, long, curly, wire
  weightKg        Decimal? @db.Decimal(5, 2)
  color           String?
  allergies       String?
  medicalNotes    String?
  behaviorNotes   String?
  groomingNotes   String?  // notas especificas de peluqueria
  photoUrl        String?
  ownerCustomerId String
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  salon           Salon    @relation(fields: [salonId], references: [id], onDelete: Cascade)
  owner           Customer @relation(fields: [ownerCustomerId], references: [id], onDelete: Cascade)
  appointments    Appointment[]
  photos          PetPhoto[]
  serviceHistory  PetServiceHistory[]

  @@index([salonId])
  @@index([salonId, ownerCustomerId])
}
```

### Service (Servicio)

```prisma
model Service {
  id               String   @id @default(cuid())
  salonId          String
  name             String
  description      String?
  category         String   // bath, haircut, nails, deshedding, spa, teeth, other
  durationMinutes  Int      // duracion estimada
  price            Decimal  @db.Decimal(10, 2)
  variablePrice    Boolean  @default(false) // si el precio varia por tamano
  priceSmall       Decimal? @db.Decimal(10, 2) // precio para size s
  priceMedium      Decimal? @db.Decimal(10, 2) // precio para size m
  priceLarge       Decimal? @db.Decimal(10, 2) // precio para size l
  priceXLarge      Decimal? @db.Decimal(10, 2) // precio para size xl
  color            String?  // color para el calendario
  active           Boolean  @default(true)
  order            Int      @default(0) // orden en la lista
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  salon            Salon    @relation(fields: [salonId], references: [id], onDelete: Cascade)
  addons           ServiceAddon[]
  appointmentServices AppointmentService[]

  @@index([salonId])
  @@index([salonId, category])
  @@index([salonId, active])
}

model ServiceAddon {
  id                 String   @id @default(cuid())
  serviceId          String
  name               String
  price              Decimal  @db.Decimal(10, 2)
  durationExtraMinutes Int   @default(0)
  active             Boolean  @default(true)
  createdAt          DateTime @default(now())

  service            Service  @relation(fields: [serviceId], references: [id], onDelete: Cascade)
}
```

### Tareas
- [ ] Agregar modelos al schema Prisma
- [ ] Crear migracion
- [ ] Seed con servicios por defecto (Bano, Corte, Unas, Deslanado)

---

## 1.2 Modulo Customers (Backend)

### Endpoints

| Metodo | Ruta | Auth | Descripcion |
|--------|------|------|-------------|
| GET | `/api/v1/customers` | OWNER, MANAGER, RECEPTIONIST, GROOMER | Listar con paginacion, busqueda |
| POST | `/api/v1/customers` | OWNER, MANAGER, RECEPTIONIST | Crear cliente |
| GET | `/api/v1/customers/:id` | OWNER, MANAGER, RECEPTIONIST, GROOMER | Obtener cliente |
| PATCH | `/api/v1/customers/:id` | OWNER, MANAGER, RECEPTIONIST | Actualizar |
| DELETE | `/api/v1/customers/:id` | OWNER, MANAGER | Eliminar (soft) |
| GET | `/api/v1/customers/:id/pets` | OWNER, MANAGER, RECEPTIONIST, GROOMER | Mascotas del cliente |
| GET | `/api/v1/customers/:id/appointments` | OWNER, MANAGER, RECEPTIONIST | Citas del cliente |
| GET | `/api/v1/customers/:id/invoices` | OWNER, MANAGER | Facturas del cliente |

### Validaciones Zod

```typescript
const createCustomerSchema = z.object({
  fullName: z.string().min(2).max(100),
  email: z.string().email().optional(),
  phone: z.string().max(50).optional(),
  address: z.string().max(255).optional(),
  city: z.string().max(100).optional(),
  postalCode: z.string().max(20).optional(),
  notes: z.string().max(1000).optional(),
});
```

### Tareas
- [ ] CRUD completo con filtros por salonId
- [ ] Busqueda por nombre, email, telefono
- [ ] Paginacion cursor-based
- [ ] Al crear cliente, loguear en AuditLog

---

## 1.3 Modulo Pets (Backend)

### Endpoints

| Metodo | Ruta | Auth | Descripcion |
|--------|------|------|-------------|
| GET | `/api/v1/pets` | Todos (staff) | Listar con filtros (raza, tamano, cliente) |
| POST | `/api/v1/pets` | OWNER, MANAGER, RECEPTIONIST | Crear mascota |
| GET | `/api/v1/pets/:id` | Todos (staff) | Obtener ficha completa |
| PATCH | `/api/v1/pets/:id` | OWNER, MANAGER, RECEPTIONIST, GROOMER | Actualizar |
| DELETE | `/api/v1/pets/:id` | OWNER, MANAGER | Eliminar (soft) |
| GET | `/api/v1/pets/:id/history` | Todos (staff) | Historial de servicios |

### Validaciones Zod

```typescript
const createPetSchema = z.object({
  name: z.string().min(1).max(50),
  breed: z.string().max(100).optional(),
  size: z.enum(["xs", "s", "m", "l", "xl"]).default("m"),
  sex: z.enum(["male", "female"]).optional(),
  birthDate: z.string().datetime().optional(),
  coatType: z.enum(["short", "medium", "long", "curly", "wire"]).optional(),
  weightKg: z.number().positive().optional(),
  color: z.string().max(50).optional(),
  allergies: z.string().max(500).optional(),
  medicalNotes: z.string().max(1000).optional(),
  behaviorNotes: z.string().max(1000).optional(),
  groomingNotes: z.string().max(1000).optional(),
  ownerCustomerId: z.string(),
});
```

### Reglas de negocio
- [ ] Al crear mascota, verificar que ownerCustomerId pertenezca al salon
- [ ] GROOMER puede editar groomingNotes y behaviorNotes de mascotas asignadas
- [ ] Historial de servicios ordenado por fecha descendente

---

## 1.4 Modulo Services (Backend)

### Endpoints

| Metodo | Ruta | Auth | Descripcion |
|--------|------|------|-------------|
| GET | `/api/v1/services` | Todos (staff) | Listar servicios activos |
| POST | `/api/v1/services` | OWNER, MANAGER | Crear servicio |
| GET | `/api/v1/services/:id` | Todos (staff) | Obtener servicio |
| PATCH | `/api/v1/services/:id` | OWNER, MANAGER | Actualizar |
| DELETE | `/api/v1/services/:id` | OWNER, MANAGER | Desactivar (soft delete) |
| POST | `/api/v1/services/:id/addons` | OWNER, MANAGER | Agregar addon |
| PATCH | `/api/v1/services/:id/addons/:addonId` | OWNER, MANAGER | Editar addon |
| DELETE | `/api/v1/services/:id/addons/:addonId` | OWNER, MANAGER | Eliminar addon |

### Tareas
- [ ] Seed con servicios por defecto al crear salon:
  - Bano basico (30 min, precio variable)
  - Bano y corte (60-90 min, precio variable)
  - Corte de unas (15 min)
  - Limpieza de oidos (15 min)
  - Deslanado (45 min, precio variable)
  - Spa/Tratamiento (30 min)
- [ ] Servicios con variablePrice muestran precio segun tamano de mascota
- [ ] Solo OWNER y MANAGER pueden crear/editar/eliminar servicios

---

## 1.5 Frontend: Pantallas de Clientes

### Pantallas

| Ruta | Componente |
|------|------------|
| `/customers` | CustomersListPage |
| `/customers/new` | CustomerCreatePage |
| `/customers/:id` | CustomerDetailPage |
| `/customers/:id/edit` | CustomerEditPage |

### Tareas
- [ ] Tabla de clientes con: nombre, telefono, email, mascotas (conteo), estado
- [ ] Busqueda en tiempo real
- [ ] Paginacion
- [ ] Modal/drawer para crear cliente rapido
- [ ] Ficha de cliente:
  - Datos personales
  - Lista de mascotas (tarjetas)
  - Historial de citas
  - Facturas
  - Notas
- [ ] Boton "Agregar mascota" desde ficha de cliente

---

## 1.6 Frontend: Pantallas de Mascotas

### Pantallas

| Ruta | Componente |
|------|------------|
| `/pets` | PetsListPage |
| `/pets/new` | PetCreatePage |
| `/pets/:id` | PetDetailPage |
| `/pets/:id/edit` | PetEditPage |

### Tareas
- [ ] Tabla de mascotas con: nombre, raza, tamano, dueno, foto
- [ ] Filtros por tamano, raza, dueno
- [ ] Ficha de mascota:
  - Foto principal
  - Datos basicos (raza, tamano, edad calculada)
  - Notas medicas, alergias, comportamiento
  - Notas de peluqueria (editable por groomers)
  - Historial de servicios (tabla cronologica)
  - Proximas citas
  - Fotos antes/despues (placeholder)
- [ ] Selector de cliente al crear mascota (searchable)

---

## 1.7 Frontend: Pantallas de Servicios

### Pantallas

| Ruta | Componente |
|------|------------|
| `/services` | ServicesListPage |
| `/services/new` | ServiceCreatePage |
| `/services/:id/edit` | ServiceEditPage |

### Tareas
- [ ] Lista de servicios agrupados por categoria
- [ ] Tarjeta por servicio: nombre, categoria, duracion, precio, color
- [ ] Formulario de creacion:
  - Nombre, descripcion
  - Categoria (select)
  - Duracion (minutos)
  - Precio fijo o variable por tamano
  - Color para calendario
- [ ] Gestion de addons dentro de cada servicio
- [ ] Toggle activo/inactivo

---

## 1.8 Componentes Reutilizables

### Tareas
- [ ] `<SearchInput />` — input con icono de lupa, debounce
- [ ] `<StatusBadge />` — badge de estado con colores
- [ ] `<EmptyState />` — estado vacio con icono y CTA
- [ ] `<ConfirmDialog />` — dialogo de confirmacion
- [ ] `<CustomerSelect />` — searchable select de clientes
- [ ] `<PetSelect />` — searchable select de mascotas por cliente
- [ ] `<DataTable />` — tabla generica con sorting, paginacion

---

## Criterios de Aceptacion

- [ ] CRUD completo de Clientes funciona (backend + frontend)
- [ ] CRUD completo de Mascotas funciona
- [ ] CRUD completo de Servicios funciona
- [ ] Al crear mascota se valida que el cliente pertenezca al salon
- [ ] Ficha de mascota muestra historial de servicios (vacio por ahora)
- [ ] Seed crea servicios por defecto al registrar un salon
- [ ] Tests de integracion de los 3 modulos pasan
