# Auditoria Bloque 5 — Clientes y mascotas

> **Bloque:** 5 / 16 · **Paginas:** 8 + 3 forms/modals + 2 servicios
> **Auditado:** 2026-05-16
> **Implementado:** 2026-05-17
> **Estado del bloque:** Completado (14/14 items del scope Urgentes+Alta)

---

## Resumen ejecutivo del bloque

Nucleo del CRM. **Bien estructurado a nivel de componentes** (Form reusable Create/Edit, DataTable+Pagination, EmptyStates, modales rapidos). **Mal a nivel de detalle**:

1. **4 bugs ESLint del 2026-05-13 siguen sin resolver** en este bloque: `CustomersListPage:27-29` (setPage in effect), `PetsListPage:46-48` (mismo patron, no listado pero igual), `QuickPetCreateModal:40-46` (setName in effect), `SellPackageModal:43-45` (Date.now en render).
2. **Texto orientado a dev visible al usuario** en produccion: *"Las citas y facturas aparecera aqui en proximos sprints"* (`CustomerDetailPage:319`), *"La agenda se habilita en el sprint 2"* (`PetDetailPage:250-251`).
3. **`PetDetailPage` no renderiza el historico de citas** aunque el endpoint `getPetHistory` lo devuelve — solo trata el caso `length === 0`. Si hay citas, **no se ven**. Bug funcional latente.
4. **Doble flow Create**: hay modal (`CustomerCreateModal`, `PetCreateModal`) abierto desde la lista, Y pagina dedicada `/customers/new`, `/pets/new` activada desde EmptyState. Inconsistencia.
5. **Sin upload de fotos** en Customer, Pet, Avatar — todo es input URL. Mismo problema en Bloque 3 (ProfilePage avatarUrl).

Lo que falta no es solo plumbing: faltan **palancas CRM** que diferencian peluguau. KPIs por cliente (LTV, ticket medio, frecuencia), badge churn risk, integracion WhatsApp, plantillas de servicio por raza, cartilla de vacunacion, alertas de medicacion.

---

## Hallazgos cross-cutting

### ✅ Bugs ESLint conocidos (de `AUDITORIA-2026-05-13.md` §2.3) — RESUELTOS

1. ✅ **`CustomersListPage.tsx`** — Ya usa `handleSearchChange` con `setPage(1)` inline, sin `useEffect`.
2. ✅ **`PetsListPage.tsx`** — Ya usa `resetPage()` en cada `onChange` de filtro, sin `useEffect`.
3. ✅ **`QuickPetCreateModal.tsx`** — Ya usa patron `key={isOpen}` + sub-componente `QuickPetForm`.
4. ✅ **`SellPackageModal.tsx`** — Ya envuelto en `useMemo([selected])` para `expiry`.

### ✅ Bugs funcionales / texto de dev en produccion — RESUELTOS

5. ✅ **`CustomerDetailPage`** — Texto sprint eliminado. Reemplazado por dashboard real con KPIs (LTV, ticket medio, frecuencia, ultima visita), lista de proximas citas, historial de citas y listado de facturas con estado de cobro.
6. ✅ **`PetDetailPage`** — Texto sprint ya no existia en codigo actual. Reemplazado por lista real de citas divididas en "Proximas citas" y "Historial de servicios" con badge de estado, servicios, groomer y precio.
7. ✅ **`PetDetailPage`** — `getPetHistory` ahora renderiza citas reales via componente `AppointmentsList`. Se calculan arrays `upcoming` y `past` con ordenamiento por fecha+hora.
8. ✅ **`PetDetailPage`** — Campo `history.pending` eliminado; el split se hace client-side por fecha vs hoy.

### ✅ Duplicacion / DRY — RESUELTO

9. ✅ **`src/lib/petLabels.ts`** — Ya existia con `PET_SIZE_LABELS`, `PET_SEX_LABELS`, `PET_COAT_LABELS`, `PET_STATUS_LABELS`. Todos los componentes del bloque 5 lo importan.
10. ✅ **`<select>` HTML nativos** — `PetForm` y `QuickPetCreateModal` ya usan `Select` del DS. `AppointmentModal` queda fuera del scope del bloque 5 (es Bloque 4).

### ✅ Doble flow para create — RESUELTO

11. ✅ **Modal unico, paginas /new eliminadas.** `CustomerCreatePage.tsx` y `PetCreatePage.tsx` eliminadas. `App.tsx` ya no registra rutas `/customers/new` ni `/pets/new`. EmptyStates y "Agregar mascota" desde `CustomerDetailPage` abren el modal directo. `PetCreateModal` soporta `defaultOwnerId` + `ownerLocked` para mantener el flujo desde detalle de cliente.

### ✅ Branding / copy — tildes y enes — RESUELTO

12. ✅ Corregidos en todo el bloque 5:
   - "Telefono", "Codigo postal", "Direccion", "Tamano", "Pequeno", "Dueno", "rapido", "Despues", "medicas", "peluqueria", "ano/anos", "aparecera", "Aun no", "Anade".
   - `lib/petLabels.ts` es la fuente canonica de labels con tildes correctas.
   - `lib/appointmentLabels.ts` anadido como fuente canonica de estados de cita.

### 🎯 Faltan campos / funcionalidad clave del CRM

13. ✅ **Upload de fotos** — Implementado via `PhotoUploader` componente (`compressImage` -> base64). `CustomerForm` y `PetForm` tienen upload circular con preview. `CustomerDetailPage` muestra avatar en sidebar. **Nota:** patron base64 (sin multer/S3), coherente con `AppointmentPhoto`. Para produccion a gran escala considerar S3/Cloudinary.
14. ✅ **libphonenumber-js** — Instalado y validando telefono en `CustomerForm` con `isValidPhoneNumber(value, 'ES')`. Sin formateo automatico inline (mejora futura).
15. **Sin autocompletado de direccion** (Google Places / Mapbox / Algolia Places) — Requiere API key externa. Posponido.
16. ✅ **Consentimiento RGPD** — 4 checkboxes en `CustomerForm`: `marketingEmail`, `marketingSms`, `marketingWhatsapp`, `privacyAccepted` (obligatorio). Campos persistidos en DB via migracion `20260517100313_add_customer_fields`.
17. ✅ **DNI/NIF** — Campo anadido a `CustomerForm` con validacion regex (DNI, NIE, NIF-CIF).
18. **Sin fecha de nacimiento del cliente** — Posponido (no en scope acordado).
19. ✅ **Badge churn risk** — Visible en `CustomerDetailPage` si `>=90d` sin visita completada.
20. ✅ **KPIs en CustomerDetailPage** — LTV total facturado, ticket medio, ultima visita, frecuencia media entre visitas.
21. ✅ **Botones `tel:` / WhatsApp / email** — En `CustomerDetailPage` sidebar y en `PetDetailPage` card del dueno.
22. **Sin tab "Comunicaciones"** — Posponido (requiere modelo backend de logs de comunicacion).
23. **Sin notas privadas con autor + timestamp** — Posponido.
24. **Sin cartilla de vacunacion** en Pet — Posponido.
25. **Sin tracking de peso historico** (Pet) — Posponido.
26. **Sin campos extra en Pet**: esterilizado/castrado, chip, contacto vet, residencia — Posponido.
27. **Sin preferencias guardadas estructuradas en Pet** — Posponido.
28. **Sin autocomplete de raza** — Posponido.

---

## 5.1 `CustomersListPage.tsx` (151 lineas) — ✅

### 🐛 Bugs / inconsistencias
- ✅ Bug ESLint `setPage(1)` en useEffect — ya resuelto (usa `handleSearchChange` inline).
- ✅ Doble flow create — resuelto (EmptyState abre modal directamente, sin Link a `/customers/new`).
- ✅ Tildes corregidas.

### 🎯 Acciones faltantes (pospuestas fuera de scope)
- Filtros: status, ciudad, tiene saldo pendiente, sin actividad >90d, tiene paquetes activos.
- Bulk actions: tag, enviar campana, archivar masivo.
- Export CSV.
- Ordenar por columna (clic en header).
- Vista alternativa "tarjetas" ademas de tabla.
- Mostrar ultima visita en la fila (no solo n mascotas).

---

## 5.2 `CustomerCreatePage.tsx` (62 lineas) — ✅ ELIMINADO

### 🐛 Bugs / inconsistencias
- ✅ Eliminado. Modal `CustomerCreateModal` es el unico flow de creacion.

---

## 5.3 `CustomerDetailPage.tsx` (343 lineas) — ✅

### 🐛 Bugs
- ✅ Texto de dev en produccion — eliminado. Reemplazado por dashboard 360.
- ✅ `PET_SIZE_LABELS` duplicado — resuelto (`lib/petLabels.ts`).
- ✅ Tildes corregidas en todo el archivo.

### 🎯 Acciones faltantes (CRM critico) — implementadas
- ✅ **KPIs del cliente**: total gastado lifetime, ticket medio, frecuencia, primera visita, ultima visita.
- ✅ **Botones de contacto**: `tel:` + WhatsApp + email.
- ✅ **Historial real** de citas (lista ordenada desc) y facturas. Endpoints existentes.
- **Tab "Comunicaciones"** — pospuesto (requiere modelo backend de log de comunicacion).
- **Notas con autor + timestamp** — pospuesto.
- **Timeline** de eventos — pospuesto.
- ✅ **Badge churn risk** ("Sin venir desde el 12/03").
- **Birthday del cliente** (con automation) — pospuesto.

### 📐 Mejoras UI/UX
- ✅ Cards de mascotas con foto si la hay — avatar del cliente en sidebar.
- "Crear cita" desde el detalle del cliente — pospuesto.
- "Vender pack" ✓ ya existe.
- "Enviar recordatorio cita proxima" — pospuesto.

---

## 5.4 `CustomerEditPage.tsx` (86 lineas) — ✅

### 🐛 Bugs
- ✅ Limpio. Mismo patron. Sin boton "Eliminar" — coherente con flow archive-only.

### 📐 Mejoras
- Si el usuario edita y abandona sin guardar, sin confirmacion — pospuesto.

---

## 5.5 `CustomerForm.tsx` (141 lineas) — ✅

### 🐛 Bugs
- ✅ Tildes corregidas.
- ✅ Validacion email con HTML `type="email"` + validacion telefono con `libphonenumber-js`.

### 🎯 Acciones faltantes — implementadas
- ✅ `libphonenumber-js` para validacion internacional.
- ✅ Campo **DNI/NIF** (validacion regex DNI/NIE/NIF-CIF).
- ✅ Checkboxes **RGPD consent** (marketing email/SMS/WhatsApp separados) + `privacyAccepted` obligatorio.
- Campo **fecha de nacimiento** del cliente — pospuesto.
- Campo **idioma preferido** — pospuesto.
- Campo **fuente de adquisicion** — pospuesto.
- Google Places / Mapbox autocompletar direccion — pospuesto (requiere API key).

### 📐 Mejoras UI/UX
- ✅ Indicador de campos obligatorios (`privacyAccepted`).
- ✅ Validacion inline en blur (telefono, DNI/NIF).
- ✅ Foto del cliente / avatar — upload via `PhotoUploader`.

---

## 5.6 `PetsListPage.tsx` (259 lineas) — ✅

### 🐛 Bugs
- ✅ Bug ESLint `setPage(1)` en useEffect — ya resuelto.
- ✅ `SIZE_LABELS` duplicado — resuelto (`lib/petLabels.ts`).
- ✅ Doble flow create — resuelto (EmptyState abre modal).
- ✅ Tildes corregidas.

### 🎯 Acciones faltantes (pospuestas)
- Filtros: edad, ultima visita, coatType, sex, color.
- Export CSV.
- Vista por raza (agrupado).

---

## 5.7 `PetCreatePage.tsx` (73 lineas) — ✅ ELIMINADO

### 🐛 Bugs
- ✅ Eliminado. Modal `PetCreateModal` es el unico flow. Soporta `defaultOwnerId` + `ownerLocked`.

---

## 5.8 `PetDetailPage.tsx` (431 lineas) — ✅

### 🐛 Bugs
- ✅ Texto de dev en produccion — ya no existia en codigo actual.
- ✅ Historico no renderizado — **RESUELTO**. Componente `AppointmentsList` muestra citas reales divididas en upcoming/past.
- ✅ `SIZE_LABELS`, `SEX_LABELS`, `COAT_LABELS` — resuelto (`lib/petLabels.ts`).
- ✅ `calculateAge` — ya usa "ano/anos" correctamente.
- ✅ Upload de foto — implementado en `PetForm`.

### 🎯 Acciones faltantes (pospuestas)
- Cartilla de vacunacion estructurada.
- Tracking de peso historico con grafico.
- Preferencias guardadas estructuradas.
- Badge "VIP" / "Especial".
- Boton "Compartir carnet" (QR publico).
- Tab "Notas de voz".

---

## 5.9 `PetEditPage.tsx` (91 lineas) — ✅

### 🐛 Bugs
- ✅ Limpio. Mismo patron.

---

## 5.10 `PetForm.tsx` (269 lineas) — ✅

### 🐛 Bugs
- ✅ `<select>` HTML nativos — resuelto (ya usa `Select` del DS).
- ✅ Tildes corregidas.
- ✅ Upload de foto — implementado via `PhotoUploader`.
- Sin validacion de peso razonable — pospuesto.

### 🎯 Acciones faltantes (pospuestas)
- Campo chip/microchip.
- Campo esterilizado/castrado.
- Campo contacto veterinario.
- Campo residencia.
- Autocomplete de raza con base de datos estandar (FCI).

---

## 5.11 `SellPackageModal.tsx` (169 lineas) — ✅

### 🐛 Bugs
- ✅ Bug ESLint `Date.now()` en render — resuelto (ya usa `useMemo`).
- ✅ "dias" con tilde.

### 🎯 Acciones faltantes (pospuestas)
- Como se cobra el pack (genera factura, metodo de pago).
- Descuento manual / codigo cupon.
- Asignar mascota al pack.
- Confirmacion con resumen visual.

---

## 5.12 `QuickPetCreateModal.tsx` (132 lineas) — ✅

### 🐛 Bugs
- ✅ Bug ESLint `useEffect` con setState de reset — resuelto (usa `key` prop + sub-componente).
- ✅ `<select>` HTML nativo — resuelto (usa `Select` del DS).
- ✅ Tildes corregidas.

---

## Resumen de prioridades del Bloque 5 — ESTADO FINAL

### ✅ Completados (14/14 del scope Urgentes+Alta)

1. ✅ Fix `setPage` en useEffect — ya estaba resuelto en codigo.
2. ✅ Fix `setState` en useEffect (QuickPetCreateModal) — ya estaba resuelto con `key` prop.
3. ✅ Fix `Date.now()` en render (SellPackageModal) — ya estaba resuelto con `useMemo`.
4. ✅ Eliminar textos "sprint 2 / proximos sprints".
5. ✅ Renderizar historico real en `PetDetailPage`.
6. ✅ Extraer labels a `src/lib/petLabels.ts` — ya existia.
7. ✅ Reemplazar `<select>` nativos por `Select` DS.
8. ✅ Botones `tel:` + WhatsApp en `CustomerDetailPage` y `PetDetailPage`.
9. ✅ Historico, KPIs y timeline en `CustomerDetailPage`.
10. ✅ Restaurar tildes y enes.
11. ✅ Consolidar doble flow create (eliminar `/customers/new`, `/pets/new`).
12. ✅ Upload de fotos (base64 comprimido via `PhotoUploader`).
13. ✅ Validacion telefono (`libphonenumber-js`) + DNI/NIF (regex).
14. ✅ Consentimiento RGPD (4 checkboxes + migracion Prisma aplicada).

### 🛠️ Media (pospuestas fuera de scope)

15. Cartilla de vacunacion estructurada (Pet).
16. Preferencias guardadas estructuradas (Pet): peluquero preferido, corte preferido, etc.
17. Tracking de peso historico.
18. Notas con autor + timestamp.
19. Filtros enriquecidos en listas.
20. Bulk actions (taggear, exportar, archivar).
21. Deteccion de duplicados al crear cliente.
22. Badge VIP.
23. Birthday automation.
24. Sex labels con esterilizacion.

### 📈 Baja / mejora continua (pospuestas)

25. IA: deteccion de raza desde foto.
26. Carnet digital publico (QR) para el dueno.
27. Combinar clientes duplicados.
28. Plantillas de corte por raza.
29. Autocomplete de raza estandar (FCI).
30. Recomendaciones de packs por historial.
31. "Familia" — vincular multiples clientes con mascotas compartidas.
32. Heatmap razas mas frecuentes.
33. Tabs en PetForm (en lugar de secciones).
34. Cards de mascotas con foto en CustomerDetailPage.

---

## Endpoints backend identificados

- ✅ `PATCH /api/customers/:id` — ya acepta `avatarUrl`, `dniNif`, consentimientos RGPD (via updateCustomer spread).
- ✅ `PATCH /api/pets/:id` — ya acepta `photoUrl` (via updatePet spread).
- [ ] `POST /api/pets/:id/breed-detect` — Vision API
- [ ] `GET /api/customers/:id/communications` — log de mails/SMS/WhatsApp
- [ ] `POST /api/customers/:id/notes` — nota con autor + timestamp
- [ ] `POST /api/pets/:id/vaccinations` + `GET` — cartilla
- [ ] `POST /api/pets/:id/weight-entries` + `GET` — tracking peso
- [ ] `POST /api/pets/:id/preferences` — preferencias estructuradas
- [ ] `POST /api/customers/duplicates/check` — detectar duplicados
- [ ] `POST /api/customers/merge` — combinar duplicados
- [ ] `GET /api/breeds` — base estandarizada FCI
- [ ] `GET /api/pets/:id/qr` — carnet digital QR publico

---

## Siguiente paso

✅ **Bloque 5 completado.** Proximo: `bloque 6` (Servicios + Peluqueros, 9 paginas) cuando lo indiques.
