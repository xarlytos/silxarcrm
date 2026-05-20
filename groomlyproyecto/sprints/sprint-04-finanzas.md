# Sprint 4: Finanzas, Facturacion e Inventario

**Duracion estimada:** 2 semanas  
**Objetivo:** Sistema financiero completo: facturas, pagos, gastos, inventario y dashboard financiero.

**Depende de:** Sprint 2 (citas)

---

## 4.1 Schema Prisma — Finanzas e Inventario

```prisma
model Invoice {
  id            String   @id @default(cuid())
  salonId       String
  number        String   // numero de factura (unico por salon)
  appointmentId String?  @unique
  customerId    String
  issueDate     DateTime @default(now()) @db.Date
  dueDate       DateTime @db.Date
  subtotal      Decimal  @db.Decimal(10, 2)
  taxRate       Decimal  @default(21.00) @db.Decimal(5, 2) // IVA default 21%
  taxAmount     Decimal  @db.Decimal(10, 2)
  total         Decimal  @db.Decimal(10, 2)
  paidAmount    Decimal  @default(0) @db.Decimal(10, 2)
  balanceDue    Decimal  @db.Decimal(10, 2)
  status        String   @default("pending") // pending, paid, partial, overdue, cancelled
  notes         String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  salon         Salon    @relation(fields: [salonId], references: [id], onDelete: Cascade)
  customer      Customer @relation(fields: [customerId], references: [id], onDelete: Cascade)
  appointment   Appointment? @relation(fields: [appointmentId], references: [id], onDelete: SetNull)
  lines         InvoiceLine[]
  payments      Payment[]

  @@unique([salonId, number])
  @@index([salonId])
  @@index([salonId, status])
  @@index([salonId, customerId])
}

model InvoiceLine {
  id              String   @id @default(cuid())
  invoiceId       String
  description     String
  quantity        Int      @default(1)
  unitPrice       Decimal  @db.Decimal(10, 2)
  total           Decimal  @db.Decimal(10, 2)
  serviceId       String?  // referencia opcional
  inventoryItemId String?  // si es producto

  invoice         Invoice  @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
}

model Payment {
  id          String   @id @default(cuid())
  invoiceId   String
  amount      Decimal  @db.Decimal(10, 2)
  method      String   // cash, card, transfer, stripe
  reference   String?  // numero de transaccion, ref transferencia
  notes       String?
  createdAt   DateTime @default(now())

  invoice     Invoice  @relation(fields: [invoiceId], references: [id], onDelete: Cascade)

  @@index([invoiceId])
}

model Transaction {
  id          String   @id @default(cuid())
  salonId     String
  type        String   // in, out
  category    String   // service_sale, product_sale, expense, commission, other
  concept     String
  amount      Decimal  @db.Decimal(10, 2)
  date        DateTime @default(now()) @db.Date
  referenceId String?  // id de invoice, expense, etc.
  notes       String?
  createdAt   DateTime @default(now())

  salon       Salon    @relation(fields: [salonId], references: [id], onDelete: Cascade)

  @@index([salonId])
  @@index([salonId, date])
  @@index([salonId, category])
}

model Expense {
  id          String   @id @default(cuid())
  salonId     String
  category    String   // products, tools, staff, marketing, rent, utilities, other
  amount      Decimal  @db.Decimal(10, 2)
  date        DateTime @default(now()) @db.Date
  description String
  vendor      String?
  receiptUrl  String?
  createdAt   DateTime @default(now())

  salon       Salon    @relation(fields: [salonId], references: [id], onDelete: Cascade)

  @@index([salonId])
  @@index([salonId, date])
  @@index([salonId, category])
}

model InventoryItem {
  id          String   @id @default(cuid())
  salonId     String
  name        String
  sku         String?
  description String?
  category    String   // shampoo, conditioner, tools, treatments, perfume, accessory, other
  unitPrice   Decimal  @db.Decimal(10, 2)
  stock       Int      @default(0)
  minStock    Int      @default(5) // alerta cuando stock < minStock
  unit        String   @default("unit") // unit, ml, l, kg
  active      Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  salon       Salon    @relation(fields: [salonId], references: [id], onDelete: Cascade)
  movements   StockMovement[]

  @@index([salonId])
  @@index([salonId, category])
}

model StockMovement {
  id              String   @id @default(cuid())
  inventoryItemId String
  type            String   // purchase, sale, adjustment, use
  quantity        Int      // positivo = entra, negativo = sale
  unitPrice       Decimal? @db.Decimal(10, 2) // costo de compra (si aplica)
  reference       String?  // numero de invoice, nota
  notes           String?
  createdAt       DateTime @default(now())

  inventoryItem   InventoryItem @relation(fields: [inventoryItemId], references: [id], onDelete: Cascade)

  @@index([inventoryItemId])
}
```

---

## 4.2 Backend: Modulo Finance

### Endpoints

| Metodo | Ruta | Auth | Descripcion |
|--------|------|------|-------------|
| GET | `/api/v1/finance/dashboard` | OWNER, MANAGER | KPIs financieros |
| GET | `/api/v1/finance/invoices` | OWNER, MANAGER, RECEPTIONIST | Listar facturas |
| POST | `/api/v1/finance/invoices` | OWNER, MANAGER, RECEPTIONIST | Crear factura |
| GET | `/api/v1/finance/invoices/:id` | OWNER, MANAGER, RECEPTIONIST | Detalle |
| PATCH | `/api/v1/finance/invoices/:id` | OWNER, MANAGER | Actualizar |
| POST | `/api/v1/finance/invoices/:id/payments` | OWNER, MANAGER, RECEPTIONIST | Registrar pago |
| GET | `/api/v1/finance/invoices/:id/payments` | OWNER, MANAGER, RECEPTIONIST | Pagos |
| POST | `/api/v1/finance/invoices/:id/payment-link` | OWNER, MANAGER | Link Stripe Connect |
| GET | `/api/v1/finance/transactions` | OWNER, MANAGER | Transacciones |
| POST | `/api/v1/finance/transactions` | OWNER, MANAGER | Crear transaccion |
| GET | `/api/v1/finance/expenses` | OWNER, MANAGER | Gastos |
| POST | `/api/v1/finance/expenses` | OWNER, MANAGER | Crear gasto |
| PATCH | `/api/v1/finance/expenses/:id` | OWNER, MANAGER | Actualizar gasto |
| DELETE | `/api/v1/finance/expenses/:id` | OWNER, MANAGER | Eliminar gasto |
| GET | `/api/v1/finance/reports` | OWNER, MANAGER | Reporte financiero |

### Generacion automatica de factura

```typescript
// Al completar una cita, opcionalmente generar factura
function generateInvoiceFromAppointment(appointment: Appointment) {
  // 1. Crear Invoice con:
  //    - number: secuencial por salon (FAC-2026-0001)
  //    - lines: un line item por cada AppointmentService
  //    - subtotal: suma de line items
  //    - taxAmount: subtotal * (taxRate / 100)
  //    - total: subtotal + taxAmount
  //    - dueDate: hoy + 7 dias
  // 2. Crear Transaction tipo 'in' category 'service_sale'
  // 3. Si hay productos de inventario usados, decrementar stock
}
```

### Numero de factura secuencial

```typescript
// Formato: {PREFIX}{YEAR}-{SECUENCIAL}
// Ejemplo: F-2026-0001
// Se calcula: max(number) del salon para el año actual + 1
```

### Dashboard financiero

```typescript
interface FinanceDashboard {
  period: { start: Date; end: Date };
  revenue: {
    total: number;
    services: number;
    products: number;
    vsPreviousPeriod: number; // % cambio
  };
  pendingAmount: number; // facturas pendientes
  expenses: {
    total: number;
    byCategory: { category: string; amount: number }[];
  };
  profit: number; // revenue - expenses
  dailyRevenue: { date: string; amount: number }[]; // ultimos 30 dias
  topServices: { name: string; revenue: number; count: number }[];
  recentInvoices: Invoice[];
}
```

---

## 4.3 Backend: Modulo Inventario

### Endpoints

| Metodo | Ruta | Auth | Descripcion |
|--------|------|------|-------------|
| GET | `/api/v1/inventory` | OWNER, MANAGER | Listar articulos |
| POST | `/api/v1/inventory` | OWNER, MANAGER | Crear articulo |
| GET | `/api/v1/inventory/:id` | OWNER, MANAGER | Detalle |
| PATCH | `/api/v1/inventory/:id` | OWNER, MANAGER | Actualizar |
| DELETE | `/api/v1/inventory/:id` | OWNER, MANAGER | Eliminar |
| POST | `/api/v1/inventory/:id/movements` | OWNER, MANAGER | Registrar movimiento |
| GET | `/api/v1/inventory/:id/movements` | OWNER, MANAGER | Historial de movimientos |
| GET | `/api/v1/inventory/alerts` | OWNER, MANAGER | Alertas de stock bajo |

### Reglas
- [ ] Movimiento tipo 'purchase': incrementa stock
- [ ] Movimiento tipo 'sale': decrementa stock (validar que haya suficiente)
- [ ] Movimiento tipo 'adjustment': ajuste de inventario
- [ ] Movimiento tipo 'use': uso interno (ej: producto usado en grooming)
- [ ] Alerta cuando stock < minStock

---

## 4.4 Frontend: Dashboard Financiero

### Pantalla: `/finance`

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  Finanzas                                                   │
├─────────────────────────────────────────────────────────────┤
│  Periodo: [Este mes ▼]                                      │
├─────────────────────────────────────────────────────────────┤
│  KPIs:                                                      │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌────────┐ │
│  │ €3,240.00   │ │ €890.00     │ │ €1,850.00   │ │€1,390  │ │
│  │ Ingresos    │ │ Pendiente   │ │ Gastos      │ │Beneficio│ │
│  │ ↑ 12%       │ │             │ │             │ │        │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └────────┘ │
│                                                             │
│  [Grafico: Ingresos vs Gastos - ultimos 30 dias]            │
│                                                             │
│  [Grafico: Ingresos por categoria - dona]                   │
│                                                             │
│  [Tabla: Top servicios por ingresos]                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Sub-pantallas

| Ruta | Descripcion |
|------|-------------|
| `/finance/invoices` | Listado de facturas |
| `/finance/invoices/new` | Crear factura manual |
| `/finance/invoices/:id` | Detalle de factura |
| `/finance/expenses` | Gastos |
| `/finance/inventory` | Inventario |
| `/finance/reports` | Reportes detallados |

---

## 4.5 Frontend: Facturas

### Pantalla: `/finance/invoices`

**Tabla:**
- Numero, Cliente, Fecha, Total, Estado, Acciones
- Filtros: estado, fecha, cliente
- Acciones: ver, editar, registrar pago, enviar por email

### Pantalla: `/finance/invoices/:id`

**Detalle:**
- Datos de factura (numero, fecha, cliente)
- Line items (descripcion, cantidad, precio, total)
- Totales (subtotal, impuestos, total)
- Pagos recibidos
- Balance pendiente
- Botones: registrar pago, descargar PDF (placeholder), enviar email

### Modal: Registrar pago

- Monto (default = balance pendiente)
- Metodo: Efectivo, Tarjeta, Transferencia, Stripe
- Referencia
- Fecha

---

## 4.6 Frontend: Inventario

### Pantalla: `/finance/inventory`

**Tabla:**
- Nombre, SKU, Categoria, Stock, Stock Minimo, Precio, Estado
- Alerta visual (rojo) cuando stock < minStock
- Filtros por categoria, estado

### Modal: Movimiento de stock

- Tipo: Compra, Ajuste, Uso
- Cantidad
- Precio unitario (solo compra)
- Referencia/Notas

---

## Criterios de Aceptacion

- [ ] Al completar cita se puede generar factura automatica
- [ ] Factura tiene numero secuencial unico por salon
- [ ] Se puede registrar pago en efectivo, tarjeta, transferencia
- [ ] Dashboard financiero muestra KPIs reales
- [ ] Grafico de ingresos vs gastos por dia
- [ ] Inventario con alertas de stock bajo
- [ ] Movimientos de stock actualizan cantidad correctamente
- [ ] Gastos se registran y aparecen en dashboard
- [ ] Balance de facturas se calcula correctamente
- [ ] Reporte financiero exportable a CSV
