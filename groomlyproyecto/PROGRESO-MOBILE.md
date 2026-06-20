# Groomly Mobile — Progreso y Estado del Proyecto

> Actualizado: 2026-06-04
> Estado: MVP funcional con 10 módulos principales + notificaciones + 16 features añadidas

---

## ✅ Completado (100%)

### 1. Infraestructura del Monorepo

| Item | Estado | Detalle |
|------|--------|---------|
| npm workspaces | ✅ | Root con `apps/*` y `packages/*` |
| `apps/web/` | ✅ | SPA original migrada, compila sin problemas |
| `apps/mobile/` | ✅ | Expo SDK 56 + React Native 0.85 |
| `packages/shared/` | ✅ | Compila con TypeScript, barrel exports |

**Archivos clave:**
- `package.json` (root) — scripts para web, mobile, shared
- `pnpm-workspace.yaml` — configuración de workspaces
- `packages/shared/package.json` — exports condicionales
- `packages/shared/tsconfig.json` — TypeScript con `ignoreDeprecations: "6.0"`

---

### 2. Paquete `@groomly/shared`

| Servicio | Endpoints cubiertos | Tipos exportados |
|----------|---------------------|------------------|
| `authService` | login, register, forgot/reset password, verify email, magic link, accept invite | AuthResponse, User, Membership |
| `customersService` | CRUD clientes, pets por cliente, citas por cliente, facturas por cliente | Customer, PaginatedResponse |
| `petsService` | CRUD mascotas, historial, última cita | Pet, PetSize, PetSex, PetCoat |
| `appointmentsService` | CRUD citas, calendario, slots, recurring, recordatorios, timeline | Appointment, Slot, CalendarParams |
| `groomersService` | Listado, schedule summary, citas por groomer | Groomer, GroomerSchedule |
| `servicesService` | Listado, detalle | Service, ServiceAddon |
| `financeService` | Dashboard, reportes, comparativas, by-period | FinanceDashboard, FinanceReport |
| `invoicesService` | CRUD facturas, pagos, payment links, cancel | Invoice, Payment, PaginatedInvoicesResponse |
| `expensesService` | CRUD gastos, categorías, métodos de pago | Expense, ExpenseCategory, PaymentMethod |
| `notificationsService` | Listado, marcar leídas, unread summary, push token | Notification |

**Utilidades compartidas:**
- `lib/date.ts` — ymd(), parseYMD(), rangeForView(), spanishDate()
- `lib/pricing.ts` — priceForSize(), computeServiceTotals()
- `lib/petLabels.ts` — PET_SIZE_LABELS, PET_SEX_LABELS, PET_COAT_LABELS
- `lib/cn.ts` — merge de clases Tailwind
- `lib/queryClient.ts` — React Query config global

**Stores:**
- `stores/authStore.ts` — Zustand factory con storage configurable (localStorage / SecureStore)

**Hooks:**
- `hooks/useAuth.ts` — login/register/logout con navegación inyectable
- `hooks/useSalon.ts` — switch de salón con invalidación de queries

---

### 3. App Mobile — Navegación

**Modo Staff (6 tabs):**

| Tab | Stack interno | Pantallas |
|-----|--------------|-----------|
| 🏠 Inicio | — | Dashboard con citas del día, KPIs, notificaciones |
| 📅 Agenda | ✅ | index (listado por día), [id] (detalle), new (wizard 6 pasos) |
| 👥 Clientes | ✅ | index (listado + búsqueda), [id] (ficha con tabs), new (formulario) |
| 🐾 Mascotas | ✅ | index (listado + búsqueda), [id] (ficha + historial), new (formulario con selectores) |
| 🔔 Notis | — | Listado de notificaciones con badge de no leídas |
| ➕ Más | — | Menú: finanzas, perfil, switch de salón, logout |

**Modo Cliente (4 tabs):**

| Tab | Pantallas |
|-----|-----------|
| 🏠 Inicio | Dashboard con puntos de fidelidad |
| 📅 Citas | Mis citas (placeholder) |
| 🐾 Mascotas | Mis mascotas (placeholder) |
| 👤 Perfil | Perfil, configuración, logout |

**Auth (fuera de tabs):**
- `/login` — Login nativo con SecureStore
- `/register` — Registro nativo
- `/` — Splash con auto-redirección por rol

---

### 4. App Mobile — Pantallas detalladas

#### Dashboard Staff (`app/(staff)/index.tsx`)
- [x] Header con nombre de usuario + botón logout + campana con badge
- [x] Nombre del salón activo
- [x] 4 acciones rápidas (nueva cita, cliente, mascota, finanzas)
- [x] KPIs del día: citas pendientes + ingresos
- [x] Listado de citas de hoy con estado visual
- [x] Preview de notificaciones sin leer

#### Agenda (`app/(staff)/agenda/`)
- [x] Listado de citas por día con navegación de fechas (← →)
- [x] Estadísticas: total, hechas, pendientes
- [x] Detalle de cita: status badge, cliente, mascota, servicios, peluquero, notas
- [x] Acciones: confirmar, completar, cancelar
- [x] **Wizard de 6 pasos para crear cita:**
  1. Seleccionar cliente (listado)
  2. Seleccionar mascota (pets del cliente)
  3. Seleccionar servicios + addons (toggle con precio según tamaño)
  4. Seleccionar peluquero (opcional)
  5. Seleccionar fecha + slot disponible
  6. Confirmar con resumen y notas
- [x] **Recordatorio local automático** al crear cita (1 hora antes)

#### Clientes (`app/(staff)/clientes/`)
- [x] Listado con búsqueda en tiempo real (debounce 300ms)
- [x] Ficha con tabs: Info, Mascotas, Citas
- [x] Crear cliente: formulario completo (nombre, email, teléfono, DNI, dirección, ciudad, CP, notas)
- [x] Archivar cliente con confirmación

#### Mascotas (`app/(staff)/mascotas/`)
- [x] Listado con búsqueda
- [x] Ficha con tabs: Info, Historial de citas
- [x] Crear mascota: formulario con selectores de tamaño, sexo, pelaje
- [x] Selector de dueño desde listado de clientes
- [x] Archivar mascota

#### Finanzas (`app/(staff)/finanzas/`)
- [x] Dashboard con KPIs del mes: ingresos, gastos, beneficio, pendiente
- [x] Acceso rápido a facturas y gastos
- [x] Top servicios más vendidos
- [x] Facturas recientes
- [x] Gastos recientes

#### Facturas (`app/(staff)/finanzas/invoices.tsx`)
- [x] Listado con filtros: todas, pendientes, pagadas, vencidas
- [x] Totales: total, pagado, pendiente
- [x] Detalle: conceptos, IVA, IRPF, descuentos, pagos recibidos
- [x] Registrar pago (importe + método de pago)
- [x] Cancelar factura

#### Gastos (`app/(staff)/finanzas/expenses.tsx`)
- [x] Listado con filtros por categoría
- [x] Total de gastos
- [x] Crear gasto: descripción, importe, categoría, método de pago, proveedor, fecha, notas

#### Notificaciones (`app/(staff)/notificaciones/index.tsx`)
- [x] Listado con no leídas destacadas
- [x] Marcar como leída al tocar
- [x] Marcar todas como leídas
- [x] Badge en tab bar con contador (refresca cada 30s)

---

### 5. Sistema de Notificaciones

| Feature | Implementación |
|---------|---------------|
| Permisos | `expo-notifications` con request automático |
| Push token | Registrado en backend vía `/communications/push-token` |
| Badge | Tab bar con contador de no leídas |
| Locales | Recordatorio de cita 1 hora antes (programado al crear cita) |
| Config | `app.json` con plugin de notificaciones + canal Android |
| Hook | `useNotifications.ts` con register, schedule, cancel |

---

### 6. Componentes UI Reutilizables

| Componente | Props | Uso |
|------------|-------|-----|
| `Button` | variant (primary/secondary/outline/ghost), size (sm/md/lg), isLoading | Todo el proyecto |
| `Input` | label, error, icon, multiline | Formularios |
| `Card` | children, className | Contenedores de información |
| `Screen` | safeArea, scroll | Layout base de pantallas |

---

## ✅ Completado reciente (16 tareas)

### Prioridad Alta — Completado

| # | Tarea | Archivos modificados |
|---|-------|----------------------|
| 1 | **Biometría para login** | `useBiometricAuth.ts`, `login.tsx` — token seguro en SecureStore |
| 2 | **Calendario mensual** | `agenda/index.tsx` — vista mes con `react-native-calendars` ya activa |
| 3 | **EAS Build** | `eas.json`, `package.json` — scripts `build:android`, `build:preview` |
| 4 | **Deep linking** | `app/_layout.tsx` — listener `peluguau://agenda/123`, `invoice/456`, etc. |

### Prioridad Media — Completado

| # | Tarea | Archivos modificados |
|---|-------|----------------------|
| 5 | **Editar cliente/mascota** | `[id].tsx` (3 fichas) — botón "Editar" + navegación a `/edit` |
| 6 | **Editar cita** | `agenda/[id].tsx` — botón "Editar cita" visible si editable |
| 7 | **Filtros avanzados en agenda** | `agenda/index.tsx` — filtros por estado + peluquero, contadores actualizados |
| 8 | **Gráficos en dashboard** | `(staff)/index.tsx` — PieChart (citas por estado) + BarChart (finanzas mensual) |
| 9 | **Exportar factura a PDF** | `invoices/[id].tsx` — HTML→PDF con `expo-print` + share con `expo-sharing` |
| 10 | **Subida de fotos** | `useImagePicker.ts`, `mascotas/[id].tsx`, `mascotas/new.tsx` — picker + preview |

### Prioridad Baja — Completado

| # | Tarea | Archivos modificados |
|---|-------|----------------------|
| 11 | **Tema oscuro** | `useTheme.ts`, `mas.tsx` (toggle), `app.json` `userInterfaceStyle: automatic` |
| 12 | **Offline mode** | `queryClient.ts` — `networkMode: 'offlineFirst'`, `gcTime: 10min`, `staleTime: 2min` |
| 13 | **Portal del cliente completo** | `(client)/index.tsx`, `citas.tsx`, `mascotas.tsx` — datos reales, navegación funcional |
| 14 | **Comisiones de peluqueros** | `comisiones.tsx` (nuevo) — cálculo por % configurable, ranking |
| 15 | **Inventario** | `inventario.tsx` (nuevo) — stock, alertas bajo, valor total |
| 16 | **Equipo/permisos** | `equipo.tsx` (nuevo) — listado con roles/colores, invitar miembro |

---

## 🔧 Configuración técnica

### Dependencias mobile
```
expo: ~56.0.8
expo-router: ^56.2.8
react-native: 0.85.3
nativewind: ^4.2.4
tailwindcss: ^3.4.19
@tanstack/react-query: ^5.101.0
zustand: ^5.0.14
axios: ^1.17.0
expo-secure-store: ^56.0.4
expo-local-authentication: ^56.0.4
expo-notifications: ^0.29.14
expo-print: ^56.0.3
expo-sharing: ^56.0.15
expo-image-picker: ^56.0.15
expo-device: ^7.1.4
lucide-react-native: ^1.17.0
react-native-calendars: ^1.1314.0
react-native-chart-kit: ^6.12.3
victory-native: ^41.24.0
```

### Variables de entorno mobile
```
EXPO_PUBLIC_API_URL=http://localhost:3000/api/v1
EXPO_PUBLIC_PROJECT_ID=     # Necesario para Expo Push
```

### Backend requerido
- API REST en `localhost:3000/api/v1` (o producción)
- Endpoint `/communications/push-token` para registrar tokens
- Endpoints de notificaciones: `/communications/notifications/*`
- Todos los demás endpoints ya existen en el backend actual

---

## 🧪 Verificación

Para verificar que todo funciona:

```bash
# 1. Compilar shared
cd packages/shared && npm run build

# 2. Compilar web
cd apps/web && npm run build

# 3. Verificar TypeScript mobile
cd apps/mobile && npx tsc --noEmit

# 4. Iniciar mobile
cd apps/mobile && npx expo start
```

**Resultado esperado:**
- [x] Web compila sin errores
- [x] Mobile: TypeScript 0 errores
- [x] Mobile arranca en Expo Go

---

## 📊 Métricas del proyecto

| Métrica | Valor |
|---------|-------|
| Archivos TypeScript (mobile) | ~42 pantallas |
| Servicios API compartidos | 10 |
| Componentes UI base | 4 (Button, Input, Card, Screen) |
| Hooks reutilizables | 6 (useAuth, useSalon, useBiometricAuth, useImagePicker, useNotifications, useTheme) |
| Tabs navegación (staff) | 6 |
| Tabs navegación (cliente) | 4 |
| Pantallas con React Query | 30+ |
| Pantallas con mutaciones | 10+ |
| Líneas de código (mobile) | ~5,500+ |

---

## 🎯 Próximo milestone recomendado

**"Beta cerrada"** — 1-2 semanas
1. Biometría + login rápido
2. Calendario mensual en agenda
3. EAS Build (APK para testing interno)
4. Bug fixing y pulido de UX

**"Publicación v1.0"** — 3-4 semanas
1. Portal del cliente completo (reservas online)
2. Notificaciones push configuradas en producción
3. App Store / Play Store
4. Analytics con expo-analytics
