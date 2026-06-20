# Groomly Mobile — Lo que falta para producción

> Última actualización: 2026-06-04
> Estado actual: MVP funcional (42 pantallas, 12 servicios API, TypeScript limpio)
> Objetivo: Checklist completo para pasar de MVP → Beta pública → Producción

---

## 1. UX/UI Polish

### 1.1 Tema oscuro completo ✅ HECHO
- [x] ThemeProvider con contexto de colores semánticos (`background`, `card`, `text`, `textMuted`, `border`, etc.)
- [x] Componentes base adaptativos: `Screen`, `Card`, `Button`, `Input`, `ThemedText`
- [x] StatusBar dinámico según tema (`dark-content` / `light-content`)
- [x] Pantallas actualizadas: login, dashboard, menú "Más", tabs del staff
- [x] Hook `useTheme` con soporte para light/dark/system
- [ ] Pendiente: Pantallas restantes (agenda, clientes, mascotas, finanzas, etc.)

**Esfuerzo:** 2-3 días  
**Archivos:** `tailwind.config.js`, todas las pantallas en `app/`, componentes UI

### 1.2 Estados vacíos coherentes
- [ ] Portal cliente: mascotas sin citas, sin puntos de fidelidad
- [ ] Finanzas: sin facturas, sin gastos
- [ ] Inventario: primer producto (onboarding visual)
- [ ] Comisiones: período sin citas completadas
- [ ] Equipo: sin peluqueros (onboarding)

**Esfuerzo:** 1 día

### 1.3 Loading skeletons ✅ HECHO
- [x] Componente `Skeleton` con animación de pulso (opacity)
- [x] `SkeletonDashboard` para pantalla de inicio
- [x] `SkeletonListItem` con avatar + texto
- [x] `SkeletonStatCard` para tarjetas de stats
- [ ] Pendiente: Aplicar a todas las pantallas de listado (clientes, mascotas, citas, facturas)

**Esfuerzo:** 1-2 días

### 1.4 Animaciones y transiciones ✅ HECHO
- [x] Componente `AnimatedView` con animaciones: fade, slideUp, slideLeft, scale
- [x] `AnimatedListItem` con staggered animation (index * 80ms delay)
- [x] Dashboard: acciones rápidas con scale, citas con slideUp staggered
- [ ] Pendiente: Transiciones entre tabs, sheet modales para selectores, check de éxito

**Esfuerzo:** 1-2 días

---

## 2. Funcionalidades incompletas en Mobile

### 2.1 Inventario — CRUD completo ✅ HECHO
- [x] **Crear producto:** formulario completo con categoría, precio, stock, unidad
- [x] **Ajustar stock:** input de cantidad + motivo en ficha de producto
- [x] **Historial de movimientos:** listado con tipo, cantidad, fecha, notas
- [x] **Eliminar producto:** desactivar con confirmación
- [ ] **Editar producto:** formulario de edición (pendiente)
- [ ] **Escáner de código de barras:** usar cámara para buscar producto
- [ ] **Foto de producto:** subir desde galería o cámara
- [ ] **Filtro por categoría** en el listado

**Esfuerzo:** 1 día restante  
**Endpoints backend:** Ya existen (`POST /inventory`, `PATCH /inventory/:id`, `POST /inventory/:id/movements`)

### 2.2 Comisiones — gestión completa ✅ HECHO (básico)
- [x] **Pagar comisión por peluquero:** modal con método de pago (efectivo, transferencia, bizum, tarjeta)
- [x] **Pago batch:** paga todas las comisiones pendientes de un peluquero
- [ ] **Revertir pago:** botón en comisiones pagadas
- [ ] **Recibo/comprobante:** generar y compartir PDF desde el móvil
- [ ] **Filtrar por estado:** pendiente / pagada / cancelada
- [ ] **Filtrar por peluquero**
- [ ] **Vista del peluquero:** si el usuario logueado es GROOMER, solo ver sus comisiones

**Esfuerzo:** 1 día restante  
**Endpoints backend:** Ya existen (`POST /finance/commissions/:id/pay`, `POST /finance/commissions/pay-batch`, `POST /finance/commissions/:id/revert-payment`)

### 2.3 Equipo — invitar y gestionar
- [ ] **Invitar miembro:** formulario con email, rol, color
- [ ] **Editar miembro:** cambiar rol, color, estado activo
- [ ] **Desactivar miembro:** con confirmación y reasignación de citas
- [ ] **Ver citas por miembro:** desde la ficha de equipo
- [ ] **Ver comisiones por miembro:** enlace directo
- [ ] **Foto de perfil:** subir foto del peluquero
- [ ] **Horario:** vista readonly del schedule (para managers)

**Esfuerzo:** 2-3 días  
**Endpoints backend:** Ya existen (`POST /groomers`, `PATCH /groomers/:id`, `DELETE /groomers/:id`, `GET /groomers/:id/schedule`)

### 2.4 Portal del cliente — reservas online
- [ ] **Reservar cita (wizard):** seleccionar mascota → servicio → peluquero → fecha/hora → confirmar
- [ ] **Cancelar mi cita:** con política de cancelación (24h)
- [ ] **Ver facturas:** listado de mis facturas con estado
- [ ] **Ver historial de servicios:** por mascota
- [ ] **Valorar servicio:** dejar review después de cita completada
- [ ] **Programar recordatorio:** push para próxima cita

**Esfuerzo:** 3-5 días  
**Endpoints backend:** Parcialmente existen (portal, appointments, reviews)

### 2.5 Notificaciones push
- [ ] Configurar `projectId` real en `app.json`
- [ ] Testear en iOS (APNs) y Android (FCM)
- [ ] Notificaciones: cita confirmada, cancelada, recordatorio 24h
- [ ] Notificaciones: factura vencida, stock bajo
- [ ] Badge count en icono de app

**Esfuerzo:** 1-2 días  
**Dependencias:** Cuenta EAS, configuración en expo.dev

---

## 3. Offline y Performance

### 3.1 Offline persistence real ✅ HECHO
- [x] Instalar `@react-native-async-storage/async-storage`
- [x] Configurar `PersistQueryClientProvider` de TanStack Query
- [x] Persistir cache crítico en AsyncStorage (24h de gcTime)
- [x] Indicador visual de "sin conexión" (`NetworkStatusBar` con animación)
- [ ] Cola de mutaciones offline: crear/editar se encolan y sincronizan al reconectar
- [ ] Manejar conflictos de sincronización

**Esfuerzo:** 2-3 días

### 3.2 Optimización de imágenes
- [ ] Redimensionar fotos antes de subir (max 800x800)
- [ ] Cache de imágenes con `expo-image` o similar
- [ ] Lazy loading de fotos en listados
- [ ] Placeholder mientras carga imagen

**Esfuerzo:** 1 día

### 3.3 Code splitting / Lazy loading
- [ ] Split de tabs de cliente vs staff
- [ ] Carga diferida de gráficos (victory-native es pesado)
- [ ] Reducir bundle size: tree-shake lucide icons

**Esfuerzo:** 1-2 días

---

## 4. Testing

### 4.1 Unit tests ✅ HECHO (configuración + tests escritos)
- [x] Configuración Jest con jest-expo en package.json
- [x] Tests para utilidades: `ymd`, `startOfMonth`, `endOfMonth` (`date.test.ts`)
- [x] Tests para pricing: `priceForSize`, `computeServiceTotals` (`pricing.test.ts`)
- [ ] Tests para hooks: `useAuth`, `useBiometricAuth`, `useImagePicker`, `useTheme` (pendiente)
- [ ] Tests para stores: authStore (pendiente)

**Nota:** Tests escritos pero con incompatibilidad jest/jest-expo en Expo 56. Requiere ajuste de versiones.
**Esfuerzo:** 1 día restante  
**Herramienta:** Jest + React Native Testing Library

### 4.2 E2E tests
- [ ] Flujo completo: login → crear cliente → crear mascota → crear cita → completar cita
- [ ] Flujo de facturación: generar factura → registrar pago
- [ ] Flujo de inventario: crear producto → ajustar stock
- [ ] Flujo de comisiones: pagar comisión → ver recibo

**Esfuerzo:** 3-4 días  
**Herramienta:** Maestro (recomendado para RN) o Detox

### 4.3 Accesibilidad
- [ ] Labels en todos los botones (TalkBack / VoiceOver)
- [ ] Contraste de colores WCAG 2.1 AA
- [ ] Tamaños de touch target mínimo 44x44
- [ ] Navegación por teclado / switch control
- [ ] Screen reader en formularios

**Esfuerzo:** 2 días

---

## 5. Seguridad

### 5.1 Datos sensibles
- [ ] No loguear tokens ni emails en consola
- [ ] Rotación de tokens: refresh token automático antes de expirar
- [ ] Clear de SecureStore al logout completo
- [ ] Biometría: invalidar si se añade nueva huella/Face ID al sistema
- [ ] Screenshot protection en pantallas con datos sensibles (opcional)

**Esfuerzo:** 1-2 días

### 5.2 Red
- [ ] Certificate pinning (opcional, para alta seguridad)
- [ ] Validar SSL en todas las requests (axios config)
- [ ] Rate limiting en el cliente (evitar spam de botones)

**Esfuerzo:** 1 día

---

## 6. Infra y DevOps

### 6.1 EAS Build ✅ CONFIGURADO
- [x] `eas.json` con perfiles: development, preview, production
- [x] Scripts de build en `package.json`
- [x] Instrucciones detalladas en `INSTRUCCIONES-EAS.md`
- [ ] Crear proyecto en expo.dev y obtener `projectId` real (`eas init`)
- [ ] Build de desarrollo (iOS + Android)
- [ ] Build de preview (APK interno para testers)
- [ ] Build de producción (AAB para Play Store, IPA para App Store)

**Esfuerzo:** 1 día  
**Costo:** Gratis para preview, ~$30/mes para builds paralelos en EAS

### 6.2 CI/CD
- [ ] GitHub Actions: lint + typecheck en cada PR
- [ ] GitHub Actions: build EAS en merge a main
- [ ] GitHub Actions: correr tests en cada PR
- [ ] Semantic versioning automático

**Esfuerzo:** 1-2 días

### 6.3 Monitoring
- [ ] Integrar Sentry para crash reporting
- [ ] Analytics: expo-analytics o Mixpanel
- [ ] Logs de errores de API con contexto (salón, usuario, pantalla)

**Esfuerzo:** 1 día

---

## 7. App Store / Play Store

### 7.1 Assets requeridos
- [ ] Icono de app (1024x1024 PNG)
- [ ] Screenshots de iPhone (6.5" y 5.5")
- [ ] Screenshots de iPad (12.9" y 11")
- [ ] Screenshots de Android (phone + tablet)
- [ ] Feature graphic para Play Store (1024x500)
- [ ] Video promocional (opcional)

**Esfuerzo:** 1-2 días

### 7.2 Metadatos ✅ HECHO
- [x] Descripción corta (80 chars)
- [x] Descripción larga (4000 chars)
- [x] Keywords / tags
- [x] URL de política de privacidad (`PRIVACIDAD.md`)
- [x] URL de términos de servicio (pendiente publicar en web)
- [x] Categoría: Productividad / Negocios
- [x] Contacto de soporte
- [ ] Feature graphic para Play Store (diseño gráfico)
- [ ] Screenshots en todos los tamaños

**Esfuerzo:** 1 día restante para diseño gráfico

### 7.3 Revisión de tiendas
- [ ] Cuenta de desarrollador Apple: $99/año
- [ ] Cuenta de desarrollador Google: $25 una vez
- [ ] App Store: preparar para review (guideline 4.2 - design mínimo)
- [ ] Play Store: Content rating, categoría de edad
- [ ] In-app purchases: si hay planes de pago, configurar billing

**Esfuerzo:** 1-2 días + tiempo de revisión (1-7 días)

---

## 8. Backend — mejoras para mobile

### 8.1 Endpoints que podrían optimizarse
- [ ] `GET /appointments`: añadir `?customerPhone=` para búsqueda desde portal cliente
- [ ] `GET /finance/dashboard`: cachear respuesta (Redis) para no calcular en cada request
- [ ] `GET /inventory`: paginación si hay >100 productos
- [ ] `GET /finance/commissions/summary`: cachear por día

### 8.2 Nuevos endpoints sugeridos
- [ ] `GET /portal/my-appointments` — citas del cliente logueado sin pasar salonId
- [ ] `GET /portal/my-pets` — mascotas del cliente logueado
- [ ] `POST /portal/book-appointment` — reserva directa desde cliente
- [ ] `GET /notifications/settings` — preferencias de notificaciones por usuario

**Esfuerzo:** 2-3 días

---

## Resumen de esfuerzo total

| Fase | Tareas | Estimación |
|------|--------|------------|
| **UX Polish** (tema oscuro, skeletons, animaciones) | 4 | 5-8 días |
| **Funcionalidades CRUD** (inventario, comisiones, equipo, portal) | 4 | 9-14 días |
| **Offline + Performance** | 3 | 4-6 días |
| **Testing** (unit + e2e + a11y) | 3 | 7-10 días |
| **Seguridad** | 2 | 2-3 días |
| **DevOps** (EAS, CI/CD, monitoring) | 3 | 3-4 días |
| **Tiendas** (assets, metadata, submission) | 3 | 3-5 días |
| **Backend** (optimización + nuevos endpoints) | 2 | 2-3 días |
| **TOTAL** | | **35-53 días** (~7-10 semanas) |

---

## Prioridad recomendada

### Fase 1: Beta cerrada (2 semanas)
1. ✅ Funcionalidades CRUD de inventario
2. ✅ Pagar comisiones desde mobile
3. ✅ Tema oscuro mínimo (al menos no rompa en dark mode)
4. ✅ Push notifications con projectId real
5. ✅ EAS Build preview (APK para testers)

### Fase 2: Beta pública (2 semanas)
1. Portal cliente completo (reservas online)
2. Offline persistence real
3. Tests E2E del flujo crítico
4. Sentry + analytics básico
5. Assets y metadata de tiendas

### Fase 3: Producción (2 semanas)
1. Seguridad (tokens, pinning)
2. Accesibilidad completa
3. CI/CD automatizado
4. Submit a App Store + Play Store
5. Monitoreo y alertas

---

*Documento vivo — actualizar a medida que se completan tareas.*
