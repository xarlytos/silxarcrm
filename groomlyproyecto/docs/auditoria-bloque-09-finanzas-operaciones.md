# Auditoría Bloque 9 — Finanzas: operaciones

> **Bloque:** 9 / 16 · **Páginas:** 4 (`ExpensesPage`, `InventoryPage`, `CommissionsPage`, `FinanceReportsPage`)
> **Auditado:** 2026-05-16
> **Estado del bloque:** 🟠 Funcional. **El patrón de duplicación sistémica explota aquí**: 4ª copia de helpers de fecha, 6ª copia de `KpiCard` local, `<select>` nativos en 6 sitios más.

---

## Resumen ejecutivo del bloque

Las 4 páginas operativas funcionan y están razonablemente bien estructuradas:
- **ExpensesPage**: modal crear + tabla con totalizador + filtros + delete.
- **InventoryPage**: tabla con stock low highlight + modal crear artículo + modal movimiento (4 tipos: purchase/sale/use/adjustment).
- **CommissionsPage**: KPIs + bar chart + resumen por groomer + detalle con "Pagar" + export CSV.
- **FinanceReportsPage**: KPIs + 2 bar charts (ingresos / gastos por categoría) + export CSV.

Pero este bloque **revela 3 problemas sistémicos acumulados que ya pesan**:

1. **`KpiCard` local duplicado en 4 páginas distintas** (FinanceDashboardPage Bloque 8, CommissionsPage, FinanceReportsPage, todas reimplementan la variante con `tone` + badge). El DS tiene un `KpiCard` (`DashboardPage` Bloque 3 sí lo usa). Reconciliar.
2. **`firstDayOfMonth`/`lastDayOfMonth`** definido **4 veces** (FinanceDashboardPage, CommissionsPage, FinanceReportsPage inline + helpers de fecha de Bloques 4/6). Cluster ya inmanejable.
3. **`<select>` HTML nativo en 6 sitios más** este bloque (filter expenses, modal expense, filter inventory, modal item, modal movement, filter commissions). Total acumulado proyecto: **>15 `<select>` nativos**. Decisión DS pendiente urgente.

Además **gaps fiscales reales**:
- ExpensesPage no permite **adjuntar ticket/factura** ni captura **IVA del gasto** (deducible para autónomos).
- CommissionsPage no captura **método de pago** ni genera **comprobante PDF de liquidación** (necesario para que el peluquero firme).
- Inventario no tiene **caducidad/lote** (champús caducan) ni link al kit del Service (Bloque 6 lo pedía).
- ExpensesPage no permite **gastos recurrentes** (alquiler/luz/internet — hoy hay que registrarlos cada mes a mano).

---

## Hallazgos cross-cutting (acumulado con bloques previos)

### 🐛 Duplicación crítica (DRY)

1. **`KpiCard` local** — **6ª copia** ya en el proyecto:
   - DS oficial: `@/components/ui/KpiCard` (usado en DashboardPage Bloque 3).
   - Locales: FinanceDashboardPage:293-322 (Bloque 8), CommissionsPage:358-383, FinanceReportsPage:172-189, todas con misma estructura `tone + badge` o variante. **Extracción al DS es obligatoria.**
2. **`firstDayOfMonth`/`lastDayOfMonth`** — repetido en `FinanceDashboardPage` (Bloque 8), `CommissionsPage:31-39`, `FinanceReportsPage:25` (inline). Cluster con `startOfIsoWeek` (Dashboard), `rangeForView` (AppointmentsCalendarPage), `initialRange` (GroomerCalendarPage). **Crear `lib/date.ts` ya.**
3. **`<select>` HTML nativo** — 6 nuevas instancias en este bloque solo:
   - `ExpensesPage.tsx:80-92` (filtro categoría) y `:247-258` (modal create).
   - `InventoryPage.tsx:72-83` (filtro), `:247-258` (modal create), `:369-379` (modal movement).
   - `CommissionsPage.tsx:136-148` (filtro peluquero).
   - Total cross-cutting > 15 instancias en bloques 4-9. **Decisión DS:** crear `Select` component standard o aceptar `<select>` nativos para siempre.

### 🐛 Sin paginación / cursor (sistémico)

4. **ExpensesPage** y **InventoryPage** devuelven listas planas del backend (`{ data: Expense[] }` / `{ data: InventoryItem[] }`). Mismo problema que `InvoicesListPage` (Bloque 8), `GroomersListPage` (Bloque 6), `TeamPage` (Bloque 7). Para un salón con 1 año de uso real, esto explota.

### 🐛 Sin edición (CRUD incompleto)

5. **ExpensesPage**: solo create + delete. **Falta update.** Si te equivocas en el monto, hay que eliminar + crear nuevo (con re-ingresar fecha, categoría, vendor, descripción). UX dura.
6. **InventoryPage**: solo create + movements. **Falta update del propio artículo** (cambiar nombre, precio, mínimo). También falta desactivar.

### 🌐 Branding / copy — tildes y eñes

7. Sistémico igual que bloques previos:
   - "Categoria", "Descripcion", "transaccion", "Articulo", "Champu", "minimo", "automaticamente", "numeros", "Comision", "categoria", "Periodo".

### 🎯 Compliance fiscal España

8. **Sin IVA en gastos** — autónomos pueden deducir el IVA soportado. ExpensesPage sólo guarda `amount` (importe total). Falta `subtotal + taxRate + taxAmount + total`.
9. **Sin upload de ticket/factura** del gasto — sin documento adjunto, la gestoría no acepta el gasto. **Bloqueante real**.
10. **Sin retención IRPF en CommissionsPage** — si el peluquero es freelance autónomo, las comisiones llevan retención. Coherente con Bloque 8 (facturas) que también lo pedía.
11. **Sin comprobante PDF de liquidación de comisión** — necesario para que el peluquero firme y conservar como justificante.

### 🎯 Falta gastos recurrentes

12. Alquiler, luz, agua, internet, gestoría, software (incluido peluguau) — son gastos que se repiten cada mes. ExpensesPage no tiene "recurring expense template" que auto-genere mensualmente. El OWNER tiene que crear el mismo gasto 12 veces al año.

### 🎯 Inventario sin vinculación con servicios (Bloque 6)

13. Bloque 6 (`ServiceForm`) pedía **kit consumido**: qué productos del Inventario se gastan al hacer un servicio (champú X ml, etc.). Inventario aquí tiene `unit` (ml, unidad, etc.) pero **no hay UI** para vincular `Service.kit ↔ InventoryItem`. Sin esto, el descuento automático de stock al completar cita no es posible.

---

## 9.1 `ExpensesPage.tsx` (304 líneas)

### 🐛 Bugs / inconsistencias
- `<select>` nativos (cross-cutting #3).
- Sin paginación (cross-cutting #4).
- Sin edición (cross-cutting #5).
- Tildes (cross-cutting #7).

### 🎯 Acciones faltantes (compliance + UX)

- **Adjuntar ticket/factura** (PDF/imagen) — bloqueante fiscal.
- **IVA del gasto** (cross-cutting #8) — subtotal, IVA, total.
- **Gastos recurrentes** (cross-cutting #12) — plantillas con frecuencia.
- **Método de pago del gasto** (cash/card/transfer/bizum) — para conciliación bancaria.
- **Proveedor del catálogo** — hoy texto libre, cada compra al mismo Mercadona crea entradas separadas. Necesita entidad `Vendor` con histórico.
- **Edición del gasto** — bug crítico de CRUD incompleto.
- **Categorías personalizables** — hoy hardcoded 7 (products/tools/staff/marketing/rent/utilities/other). En España hay más (suministros desglosados, gestoría, asesoría, etc.).
- **Export CSV** (contraste con CommissionsPage / FinanceReportsPage que sí lo tienen).
- **Filtro por proveedor / método de pago**.

### 📐 Mejoras UI/UX
- Total en footer ✓ existe. Añadir desglose por categoría inline.
- Sumatorio por mes en heatmap o mini-chart.
- Acción rápida "Duplicar gasto" para gastos recurrentes manuales.

### 💡 Funcionalidades extra
- OCR del ticket (subir foto, extraer monto + vendor + fecha automáticamente).
- Importar movimientos desde extracto bancario (CSV BBVA/Santander/etc.).
- Categorización automática por keywords del proveedor (machine learning ligero).
- Vincular gasto a una factura del cliente (gasto directamente atribuible).

---

## 9.2 `InventoryPage.tsx` (432 líneas)

### 🐛 Bugs / inconsistencias
- `<select>` nativos (cross-cutting #3).
- Sin paginación (cross-cutting #4).
- Sin edición del artículo ni desactivar (cross-cutting #5).
- Tildes (cross-cutting #7).
- `item.unit` se muestra (línea 151 `{item.stock} {item.unit}`) pero **no se configura** en el modal create (no veo input `unit`). ¿Default "unidad" implícito? Bug latente.

### 🎯 Acciones faltantes

- **Vincular `Service.kit ↔ InventoryItem`** (cross-cutting #13) — diferenciador real.
- **Historial de movimientos visible** del artículo (hoy sólo veo stock actual, no de dónde viene).
- **Foto del producto**.
- **Caducidad/lote** — champús, perfumes caducan. Modelo necesita `expiryDate`, `batchNumber`.
- **Proveedor del artículo** — coherente con catálogo de vendors (cross-cutting #9.1).
- **Pedido sugerido** cuando stock bajo (export orden a proveedor en PDF/CSV).
- **Alertas email** cuando stock bajo.
- **Inventario físico** — tomar inventario con cantidad real y registrar ajuste masivo.
- **Código de barras / escaneo** — flujo móvil para venta directa.
- **Unidad de medida configurable** (ml, unidad, kg, l, dosis).

### 📐 Mejoras UI/UX

- Comentario "Si lo indicas, se registra como gasto automaticamente" (línea 406) está bien — pero falta **link al gasto generado** desde el movimiento (drill-down).
- En tabla, sort por stock (mostrar bajos arriba).
- Filtrar "sólo bajo mínimo" con un click.
- Stock value total visible: "Inventario actual: 1.250€ (300 artículos)".

### 💡 Funcionalidades extra

- Margen por producto (precio venta - precio compra promedio).
- Top productos más vendidos (cuando se vincule con facturas).
- Detección de obsoletos (no se mueve hace 6 meses).

---

## 9.3 `CommissionsPage.tsx` (384 líneas)

### 🐛 Bugs / inconsistencias
- `<select>` nativo (cross-cutting #3).
- `firstDayOfMonth`/`lastDayOfMonth` duplicado (cross-cutting #2).
- `KpiCard` local (cross-cutting #1) — variante con `Periodo seleccionado` hardcoded en badge.
- Tildes (cross-cutting #7).
- Sin paginación en "Detalle de comisiones" — si hay 500 comisiones del mes, lista plana.

### 🎯 Acciones faltantes (compliance + funcionalidad)

- **Comprobante PDF** de liquidación por peluquero (cross-cutting #11) — necesario en España como justificante.
- **Pagar en bulk** — botón "Pagar todas las pendientes de X" o "Marcar todo Mayo como pagado".
- **Método de pago** de la comisión (transferencia / efectivo / Bizum).
- **Retención IRPF** (cross-cutting #10) si el peluquero es autónomo freelance.
- **Revertir pago** (si se pagó por error).
- **Link a la cita** desde la fila (`c.appointmentId` está disponible).
- **Saldo histórico** del peluquero (total pagado este año).
- **Filtros adicionales**: estado (pendiente/pagada/cancelada), método de cálculo.
- **Comisión sobre productos vendidos** (no solo servicios) — si el peluquero vende un champú, ¿lleva comisión?

### 📐 Mejoras UI/UX

- Resumen por peluquero y detalle de comisiones en **misma vista colapsable** — hoy son dos cards separadas, mucho scroll.
- Loading per-row ✓ bien implementado (línea 336-338).
- Selector rápido de periodo "Este mes / Mes pasado / Año".

### 💡 Funcionalidades extra

- Wizard "Cierre mensual de comisiones" (revisar todas → confirmar → marcar pagado en bulk → generar comprobantes).
- Comparativa MoM por peluquero.
- Detección de outliers (peluquero con comisión 3x mayor que su media — verificar).

---

## 9.4 `FinanceReportsPage.tsx` (190 líneas)

### 🐛 Bugs / inconsistencias
- Helper `firstDay` inline (línea 25) — variante distinta del cluster (cross-cutting #2).
- `Kpi` local pequeño (línea 172-189) — sexta copia (cross-cutting #1).
- Sólo 2 bar charts horizontales — escueto.
- Tildes (cross-cutting #7).

### 🎯 Acciones faltantes

- **Comparativa periodo anterior** (FinanceDashboardPage Bloque 8 sí la tiene, ésta no).
- **Net por categoría** (income - expense) — qué actividades son rentables.
- **Desglose temporal** dentro del rango (sparkline por semana o mes).
- **Drill-down**: click en categoría → lista de facturas/gastos que la componen.
- **Pie chart** o stacked bar además del horizontal bar.
- **Export PDF** (no sólo CSV).
- **Enviar reporte a gestoría** por email auto.
- **Selector rápido** de periodo (Este mes / Mes pasado / Trimestre / Año).
- **Solapamiento conceptual con FinanceDashboardPage** (Bloque 8) — ambas muestran KPIs ingresos+gastos+balance. ¿Una es "executive dashboard" y otra "reporte exportable"? Aclarar y diferenciar.

### 📐 Mejoras UI/UX

- Indicador visual de balance positivo/negativo más claro (verde grande / rojo grande con icono).
- Linked dates con el Dashboard del Bloque 8 (recordar el último rango usado entre páginas).

---

## Resumen de prioridades del Bloque 9

### 🚨 Urgente (DRY crítico + bloqueante fiscal)

1. **Extraer `lib/date.ts`** con `firstDayOfMonth`, `lastDayOfMonth`, `startOfIsoWeek`, `rangeForView`, `initialRange` — ya son 6+ sitios.
2. **Extraer `KpiCard` único al DS** y migrar las 6 variantes locales — ya no es deuda menor.
3. **Decisión DS sobre `<select>`** — crear `Select` component standard y migrar las 15+ instancias.
4. **ExpensesPage: upload de ticket/factura** + **IVA del gasto** (compliance fiscal bloqueante).
5. **ExpensesPage: edición** del gasto (CRUD incompleto).
6. **InventoryPage: edición** del artículo y desactivar (CRUD incompleto).

### 🔥 Alta (funcionalidad real)

7. **Comprobante PDF** de liquidación de comisión.
8. **Retención IRPF** en comisiones (si peluquero es freelance).
9. **Método de pago** en gastos y comisiones.
10. **Gastos recurrentes** con plantilla mensual.
11. **Vincular `Service.kit ↔ InventoryItem`** (resolver pendiente del Bloque 6).
12. **Catálogo de proveedores** — entidad `Vendor` reutilizable en ExpensesPage e InventoryPage.
13. **Paginación** en ExpensesPage e InventoryPage.
14. **Pagar comisiones en bulk** (cerrar mes con un wizard).
15. **Caducidad/lote** en Inventory (productos químicos caducan).
16. **Restaurar tildes y eñes** (cross-cutting #7).

### 🛠️ Media

17. Historial de movimientos visible por artículo.
18. Foto del producto.
19. Alertas email stock bajo + pedido sugerido.
20. Comparativa periodo anterior en FinanceReportsPage.
21. Drill-down en gráficos del reporte.
22. Selector rápido de periodo (Hoy/Mes/Año).
23. Sync rango entre FinanceDashboardPage y FinanceReportsPage.
24. Export PDF del reporte completo.
25. Link a cita desde fila de comisión.
26. Inventario físico (toma + ajuste masivo).
27. Margen por producto vendido.

### 📈 Baja / mejora continua

28. OCR de tickets (subir foto, extraer datos).
29. Importar extracto bancario (CSV).
30. Categorización automática de gastos por proveedor.
31. Código de barras / escaneo en inventario.
32. Top productos vendidos.
33. Detección de productos obsoletos (sin movimiento 6m).
34. Heatmap mensual de gastos.
35. Email auto del reporte a gestoría.
36. Detección de outliers en comisiones (anomalías).

---

## Endpoints backend identificados (faltan / mejorar)

- [ ] `POST /api/finance/expenses/:id/receipt` — upload ticket/factura
- [ ] `PATCH /api/finance/expenses/:id` — edición
- [ ] `POST /api/finance/expenses/recurring` — plantillas recurrentes
- [ ] `GET /api/finance/expenses/recurring/generate` — cron mensual auto-generar
- [ ] `PATCH /api/inventory/items/:id` — edición artículo
- [ ] `DELETE /api/inventory/items/:id` (o deactivate)
- [ ] `GET /api/inventory/items/:id/movements` — historial visible
- [ ] `POST /api/inventory/items/:id/photo` — upload foto
- [ ] `POST /api/inventory/physical-count` — inventario físico masivo
- [ ] `GET /api/inventory/items/low-stock?suggest-order=true` — pedido sugerido
- [ ] `GET /api/vendors` + `POST` — catálogo de proveedores
- [ ] `POST /api/commissions/bulk-pay` — pagar varias de una vez
- [ ] `POST /api/commissions/:id/receipt-pdf` — generar comprobante PDF
- [ ] `POST /api/commissions/:id/revert-payment` — deshacer pago
- [ ] `GET /api/finance/reports/by-period?granularity=week|month` — desglose temporal
- [ ] `GET /api/finance/reports/category/:cat/details?from&to` — drill-down
- [ ] `POST /api/finance/reports/send-to-accountant` — email auto

---

## Siguiente paso sugerido

Antes del Bloque 10, **abordar la extracción a `lib/` (urgentes #1-3)** — esto cierra deuda técnica acumulada de Bloques 3, 4, 6, 8, 9. Un solo PR con:
- `lib/date.ts` (5 helpers).
- `ui/KpiCard` unificado en DS (variant=brand/warning/success/info/danger).
- `ui/Select` standardizado y migrar 15+ `<select>` nativos.

Tras ese refactor base, el Bloque 9 vuelve a tener foco real:
- **ExpensesPage: upload + IVA + edición** son bloqueantes para autónomos.
- **Comprobante PDF de comisiones** es bloqueante para peluqueros freelance.
- **Vincular kit Service↔Inventory** desbloquea el descuento automático de stock al completar cita (palanca operativa).

Cuando me digas, vamos con `bloque 10` (Fidelización y marketing — LoyaltyPage, CouponsPage, PackagesPage, WaitlistPage).
