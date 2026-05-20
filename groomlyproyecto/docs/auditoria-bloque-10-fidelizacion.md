# Auditoría Bloque 10 — Fidelización y marketing

> **Bloque:** 10 / 16 · **Páginas:** 4 (`LoyaltyPage`, `CouponsPage`, `PackagesPage`, `WaitlistPage`) + `WaitlistFormModal`
> **Auditado:** 2026-05-16
> **Estado del bloque:** 🟠 Funcional. **Bug ESLint conocido `confirm()` sigue sin resolver**. CRUD incompleto en TODAS las páginas (sin edición). Sin canjes ni matching automático.

---

## Resumen ejecutivo del bloque

Las 4 páginas implementan el motor de fidelización y marketing del producto:
- **LoyaltyPage**: KPIs + reglas (scope all/category/service) + ajuste manual de puntos + lista de transacciones.
- **CouponsPage**: tabla con tipo, valor, validez, uso, estado + toggle activar/desactivar inline.
- **PackagesPage**: grid de packs con cálculo de descuento + selector de servicios con +/-.
- **WaitlistPage**: cards filtrables + acciones (contactar / crear cita con prefill / eliminar) + flujo de conversión.

Lo bueno: cada página tiene UX cuidada en su propio terreno (toggle Power en cupones, cálculo automático de original price en packs, conversión a cita con AppointmentModal prefill en waitlist).

Lo malo:

1. **Bug ESLint `confirm()` nativo en `LoyaltyPage.tsx:263` SIGUE SIN RESOLVER** — flagged en `AUDITORIA-2026-05-13.md` § cross-cutting. Cuatro días en backlog.
2. **CRUD incompleto sistémico** — ninguna de las 4 páginas tiene **edición**. Sólo create + delete (o create + toggle). Si te equivocas en una regla, un cupón, un pack o una entrada de waitlist → eliminar + crear de nuevo.
3. **`validUntil` capturado en `LoyaltyPage` RuleFormModal pero NUNCA enviado al backend** (líneas 280, 446-453 capturan; línea 300-309 omite el campo en la mutation). **Bug funcional silencioso**: el usuario configura caducidad de regla y no se aplica.
4. **`ConfirmDialog` de PackagesPage dice "Desactivar pack" pero el endpoint se llama `deletePackage`** (línea 32, 112, 118) — ambigua: ¿desactiva o elimina? Backend decide pero la UI pretende ambas cosas.
5. **`KpiCard` local 7ª copia** en LoyaltyPage:221-248 (cross-cutting con Bloques 3, 8, 9).
6. **Catálogo de categorías de servicios duplicado por 3ª vez** con typo "Banios" en `LoyaltyPage:35-43` (vs "Bano" en ServicesListPage y ServiceForm del Bloque 6).
7. **Sin canjes** en LoyaltyPage — sólo gestión de generación de puntos. **Falta el bucle completo**: no hay UI para canjear los puntos por descuento al pagar.
8. **Sin matching automático waitlist ↔ huecos liberados** (cuando se cancela cita, no se avisa).

---

## Hallazgos cross-cutting (acumulado con bloques previos)

### 🐛 Bugs ESLint conocidos sin resolver

1. **`LoyaltyPage.tsx:263`** — `if (confirm("Eliminar regla "...?")) mutation.mutate()`. **`window.confirm()` nativo**. Flagged en `AUDITORIA-2026-05-13.md` (mencionado como cross-cutting patterns). **Sigue ahí**. Sustituir por `ConfirmDialog` del DS (ya existe y se usa en CouponsPage y PackagesPage del mismo bloque). **Inconsistencia interna además**: 3 de 4 páginas del bloque usan ConfirmDialog, sólo LoyaltyPage usa confirm() nativo.

2. **`WaitlistFormModal.tsx:34-43`** — `useEffect` con 6 `setState` para reset al cerrar. Mismo patrón ESLint que `MemberFormModal` (Bloque 7), `AppointmentModal` (Bloque 4), `QuickPetCreateModal` (Bloque 5). No flagged explícitamente en AUDITORIA-2026-05-13 pero idéntico. **Fix:** `key={open ? 'open' : 'closed'}` en Modal o callback `onOpen`.

### 🐛 Bugs funcionales silenciosos

3. **`LoyaltyPage` RuleFormModal — `validUntil` se captura pero no se envía**:
   - Líneas 280: `const [validUntil, setValidUntil] = useState('')`
   - Líneas 446-453: input fecha visible al usuario
   - Líneas 297, 300-309: `reset()` lo resetea pero la mutation `createLoyaltyRule` **omite el campo**.
   - El OWNER cree que configuró fecha de caducidad de la regla y no se aplica.
4. **`PackagesPage` ConfirmDialog ambiguo** (línea 112-118): `title="Desactivar pack"` pero `mutationFn: (id) => deletePackage(id)`. ¿Desactiva o elimina? El usuario espera desactivar (label) y backend probablemente elimina (endpoint). Inconsistencia destructiva.

### 🐛 Duplicación crítica (sigue acumulándose)

5. **`KpiCard` local en LoyaltyPage:221-248** — 7ª copia del proyecto. Variante con icono + label + value + sub (sin `tone`). Más variante que copia exacta, pero misma necesidad: extraer al DS.

6. **Categorías de servicios duplicadas con typos**: 
   - `LoyaltyPage:35-43` — `'Banios'` (típo, plural?), `'Unas'`, `'Deslanado'`
   - `ServicesListPage:37-45` (Bloque 6) — `'Bano'`, `'Unas'`, `'Deslanado'`
   - `ServiceForm:33-41` (Bloque 6) — `'Bano'`, `'Unas'`, `'Deslanado'`
   - 3 copias del mismo enum con label, dos coinciden y una difiere. Extraer a `src/lib/serviceCategories.ts`.

7. **`<select>` HTML nativos en este bloque**:
   - `LoyaltyPage:373` (categoría), `LoyaltyPage:392` (servicio)
   - `WaitlistFormModal:144-154` (franja horaria)
   - Acumulado proyecto > 18 instancias.

### 🐛 CRUD incompleto (4/4 páginas)

8. **LoyaltyPage rules**: create + delete. **Sin edit, sin desactivar** (toggle activate sería trivial). Cambiar `pointsPerEuro` = borrar + crear nuevo.
9. **CouponsPage**: create + toggle active + delete. **Sin edit**. Cambiar fecha de caducidad = borrar + crear nuevo con mismo código (¿permite el backend código duplicado tras delete?).
10. **PackagesPage**: create + delete (ambiguo desactiva vs elimina). **Sin edit**. Cambiar precio del pack = borrar + crear nuevo, perdiendo histórico.
11. **WaitlistPage**: create + contact + convert + delete. **Sin edit** entrada (cambiar fecha preferida = borrar + crear nuevo).

### 🌐 Branding / copy

12. Tildes sistémicas:
   - "Fidelizacion", "fidelizacion", "Banios" (typo), "Unas", "Deslanado" (LoyaltyPage).
   - "Codigo", "Codigos", "cupon", "Valido", "minima" (CouponsPage).
   - "Descripcion", "dias" (PackagesPage).
   - "Manana", "esta vacia", "accion" (WaitlistPage).
   - "Manana", "dias entre semana" (WaitlistFormModal).

13. **Inconsistencia categorías**: "Banios" (LoyaltyPage:36) vs "Bano" (ServicesListPage:38) — el mismo concepto con dos nombres. Si el backend espera enum `bath`, ambas funcionan, pero el OWNER ve labels distintos.

### 🎯 Gaps funcionales clave

14. **Sin canjes de puntos** en LoyaltyPage — la página gestiona reglas de generación pero **no hay flow para canjear puntos** por descuento al facturar. Bucle de fidelización incompleto. Diferenciador que no diferencia.
15. **Sin matching automático waitlist ↔ huecos** — cuando se cancela cita, la lista de espera **no se notifica**. El OWNER tiene que abrir Waitlist a mano y contactar.
16. **`100 pts = 1€` hardcoded** en LoyaltyPage (línea 98 hint, línea 555 hint) — sin tasa configurable en Settings (Bloque 11). Si el OWNER decide otra ratio, no puede.
17. **Sin tiers/niveles** (bronce/plata/oro) — UX simple; siempre la misma tasa de puntos.
18. **Sin bulk generation de cupones** — para campañas (100 códigos únicos para clientes inactivos).
19. **Sin restricción de cupón** por cliente, por servicio, por primera compra.
20. **Sin tracking de redenciones** en CouponsPage (lista de "quién usó este cupón").
21. **Sin notificación automática** en waitlist contact (sólo marca interno).
22. **Sin priorización** waitlist (urgente/normal/flexible).
23. **Sin asignación a peluquero preferido** en waitlist.
24. **Sin duplicar pack** (atajo común).

---

## 10.1 `LoyaltyPage.tsx` (655 líneas)

### 🐛 Bugs / críticos
- **`confirm()` nativo línea 263** (cross-cutting #1) — bug ESLint conocido, sigue ahí. **Inconsistencia interna**: las otras 3 páginas del bloque usan ConfirmDialog.
- **`validUntil` no se envía al backend** (cross-cutting #3) — bug funcional silencioso.
- `KpiCard` local (cross-cutting #5).
- `<select>` nativos (cross-cutting #7).
- Typo "Banios" línea 36 (cross-cutting #6).
- Tildes (cross-cutting #12).

### 🎯 Acciones faltantes (críticas)

- **Flow de canje de puntos** (cross-cutting #14) — al facturar, opción "aplicar X puntos = Y€ de descuento". Backend probablemente lo soporta; UI no.
- **Edición** de reglas.
- **Toggle activar/desactivar** regla (hoy solo delete).
- **Caducidad real** de regla (campo capturado pero ignorado).
- **Tiers/niveles** (Bronce/Plata/Oro) según puntos acumulados.
- **Ratio puntos↔€ configurable** desde Settings.

### 📐 Mejoras UI/UX
- Paginación en transacciones (modal AllTransactionsModal — hoy plana).
- Filtros: tipo de transacción, rango fecha, cliente específico.
- Categorías de scope ya correctas en cards, pero typo "Banios" desconcierta.

### 💡 Funcionalidades extra
- Reglas por horario (doble puntos sábado por la mañana).
- Reglas por cliente segmento (más puntos para VIPs).
- Reglas por raza/tamaño.
- Cashback equivalente (puntos = saldo reusable).
- Leaderboard interno para el equipo (qué peluquero genera más puntos).

---

## 10.2 `CouponsPage.tsx` (348 líneas)

### 🐛 Bugs / inconsistencias
- Tildes (cross-cutting #12).
- CRUD incompleto (cross-cutting #9).
- Sin paginación.

### 🎯 Acciones faltantes (funcionalidad real)

- **Edición** del cupón (cambiar fecha caducidad / límite uso sin borrar).
- **Bulk generation** — generar 100 códigos únicos para campañas.
- **Restricciones**:
  - Por cliente (lista permitida o cliente único).
  - Por primera compra solo.
  - Por servicio/categoría aplicable.
  - "Single use per customer" (un cupón × cliente).
- **Lista de redenciones** — quién usó cada cupón.
- **Link copiable** del cupón (`https://app.peluguau.es/?coupon=VERANO20`).
- **Test/validar** un cupón (vista previa como cliente).
- **Análisis ROI**: cuántos cupones se generaron, cuántos se canjearon, cuánto revenue atribuible.

### 📐 Mejoras UI/UX
- Filtros: estado (activos/expirados/sin usos), tipo (fijo/%), rango fecha.
- Búsqueda por código.
- Ordenar columnas (más usados, próximos a expirar).
- Indicador visual de cupones expirando este mes.

### 💡 Funcionalidades extra
- Compartir cupón con QR generado.
- Envío masivo automático del cupón a segmento de clientes (cruza con marketing).
- Cupones encadenados ("usa A para conseguir B").

---

## 10.3 `PackagesPage.tsx` (315 líneas)

### 🐛 Bugs / inconsistencias
- **`ConfirmDialog` ambiguo "Desactivar" vs `deletePackage`** (cross-cutting #4).
- CRUD incompleto (cross-cutting #10).
- Tildes (cross-cutting #12).
- Sin paginación.

### 🎯 Acciones faltantes

- **Edición** del pack (cambiar servicios incluidos, precio, validez).
- **Duplicar** pack como base para crear uno similar.
- **Pack para mascota específica** vs **pack transferible entre mascotas del mismo cliente** (decisión de modelo + UI).
- **Límite de cantidad vendible** (oferta lanzamiento: "solo 50 packs").
- **Filtros**: activos/inactivos.
- **Ver packs vendidos** desde aquí (hoy solo se ve en CustomerDetailPage Bloque 5).

### 📐 Mejoras UI/UX
- Descuento más prominente (hoy chip pequeño "-30%"). Hero del card.
- Resumen del valor ahorrado: "Te ahorras 45€".
- Búsqueda por nombre.
- Indicador "más vendido" / "nuevo".

### 💡 Funcionalidades extra
- Suscripción mensual ("Pack Pro mensual auto-renovable").
- Pack regalo (con código de canjeo para tercer mascota).
- Análisis: cuántos packs se venden por mes, % consumido, churn de quienes lo compraron.

---

## 10.4 `WaitlistPage.tsx` + `WaitlistFormModal.tsx` (264 + 193 líneas)

### 🐛 Bugs / inconsistencias
- **`useEffect` con 6 setState** en `WaitlistFormModal:34-43` (cross-cutting #2).
- `<select>` nativo en WaitlistFormModal:144-154.
- Tildes (cross-cutting #12).
- CRUD incompleto (cross-cutting #11): sin edit.

### 🎯 Acciones faltantes (críticas)

- **Matching automático** con huecos liberados (cross-cutting #15) — diferenciador real.
- **Notificación automática al contactar** (email/SMS/WhatsApp) — hoy solo marca interno.
- **Edición de entrada** (cambiar fecha preferida, servicios deseados).
- **Priorización**: urgente / normal / flexible.
- **Asignación a peluquero preferido**.
- **Múltiples fechas preferidas** (no sólo una) — "estos tres lunes, en cualquier franja".
- **Auto-expiración** de entrada si no se contacta en X días.
- **Acción "Sugerir cita"**: el sistema propone un hueco coincidente desde la card.

### 📐 Mejoras UI/UX
- Sort by created date / fecha preferida más cercana.
- Filtros adicionales: peluquero preferido, servicios.
- Búsqueda por nombre del cliente.
- Drag-and-drop a la agenda (hueco específico) → conversión inline.
- Mostrar "X días esperando" en cada card.

### 💡 Funcionalidades extra
- Auto-matching periódico (cron) que sugiere matches al OWNER cada mañana.
- Notificación push al cliente cuando hueco match aparece ("¿te interesa este jueves 11h?").
- Métricas: cuántos se convirtieron vs cuántos se perdieron.

---

## Resumen de prioridades del Bloque 10

### 🚨 Urgente (bugs + funcional crítico)

1. **Fix `LoyaltyPage:263` `confirm()` nativo** → ConfirmDialog (bug ESLint conocido).
2. **Fix `WaitlistFormModal:34-43`** `setState in useEffect` → `key` prop o callback.
3. **Fix `LoyaltyPage` RuleFormModal `validUntil`** — incluir en mutation o eliminar el campo del UI.
4. **Resolver ambigüedad `PackagesPage` ConfirmDialog "Desactivar" vs `deletePackage`** — decidir y alinear (label vs endpoint).
5. **Edición en las 4 páginas** (CRUD incompleto sistémico).

### 🔥 Alta (funcionalidad real + diferenciador)

6. **Canje de puntos** en LoyaltyPage — cierra el bucle de fidelización.
7. **Matching automático waitlist ↔ huecos liberados** — diferenciador real.
8. **Notificación automática** al contactar waitlist (email/SMS/WhatsApp).
9. **Ratio puntos↔€ configurable** desde Settings (Bloque 11).
10. **Bulk generation de cupones** + restricciones (por cliente, primera compra, servicio).
11. **Lista de redenciones de cupón** (quién usó qué).
12. **Caducidad real de regla loyalty** (fix #3).
13. **Sustituir `<select>` por DS** (acumulado > 18 instancias).
14. **Extraer `KpiCard` único al DS** (7ª copia).
15. **Extraer `serviceCategories` a `lib/`** (3ª copia con typo).
16. **Restaurar tildes y eñes** (cross-cutting #12) — coherente bloques previos.

### 🛠️ Media

17. Paginación en transactions de loyalty.
18. Tiers/niveles bronce/plata/oro.
19. Duplicar pack.
20. Pack mascota-específica vs transferible.
21. Múltiples fechas preferidas en waitlist.
22. Priorización en waitlist.
23. Filtros enriquecidos en CouponsPage (estado, tipo, fecha).
24. Test/validar cupón como cliente.
25. Link copiable cupón.
26. Análisis ROI cupones.

### 📈 Baja / mejora continua

27. Reglas por horario, cliente segmento, raza/tamaño.
28. Cashback equivalente a puntos.
29. Leaderboard equipo.
30. Compartir cupón con QR.
31. Envío masivo a segmento.
32. Cupones encadenados.
33. Suscripción mensual de pack.
34. Pack regalo.
35. Drag-and-drop waitlist → agenda.
36. Auto-expiración entradas waitlist.
37. Análisis "convertido vs perdido" en waitlist.

---

## Endpoints backend identificados (faltan / mejorar)

- [ ] `POST /api/loyalty/redeem` — canjear puntos por descuento
- [ ] `PATCH /api/loyalty/rules/:id` — edición
- [ ] `PATCH /api/loyalty/rules/:id/toggle` — activar/desactivar
- [ ] `POST /api/loyalty/rules` con `validUntil` (verificar si backend ya lo acepta)
- [ ] `PATCH /api/coupons/:id` — edición
- [ ] `POST /api/coupons/bulk-generate` — generar N códigos únicos
- [ ] `GET /api/coupons/:id/redemptions` — lista de quién usó
- [ ] `POST /api/coupons/:id/test-validate` — vista previa
- [ ] `PATCH /api/packages/:id` — edición
- [ ] `POST /api/packages/:id/duplicate` — duplicar como base
- [ ] `PATCH /api/waitlist/:id` — edición
- [ ] `POST /api/waitlist/:id/notify` — disparar notificación (email/SMS/WhatsApp)
- [ ] `POST /api/waitlist/match-available-slots` — cron / endpoint que sugiere matches
- [ ] `GET /api/loyalty/transactions?cursor` — paginación
- [ ] `GET /api/coupons/:id/analytics` — generados / canjeados / revenue atribuible

---

## Siguiente paso sugerido

Antes del Bloque 11, 3 fixes mínimos con altísimo ROI/esfuerzo:

1. **`LoyaltyPage:263`** → ConfirmDialog (1 línea de cambio, cierra bug ESLint flagged).
2. **`LoyaltyPage` RuleFormModal validUntil** → incluir en mutation (3 líneas, bug funcional silencioso).
3. **PackagesPage ConfirmDialog label** → consistente con endpoint (decisión: ¿deactivate o delete?).

Luego decidir **el flow de canje de puntos** con producto — sin esto, LoyaltyPage es solo un "contador bonito". Y decidir **matching automático waitlist↔huecos**, el otro diferenciador real del bloque (los OWNERs lo piden contra MoeGo).

Cuando me digas, vamos con `bloque 11` (Reportes y configuración — ReportsPage, SettingsLayout, SettingsBillingPage, ProfilePage).
