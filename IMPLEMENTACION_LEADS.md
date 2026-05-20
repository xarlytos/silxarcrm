# Plan de Implementacion - Gestion de Leads

## 1. Resumen

Feature de gestion de leads para captura y seguimiento de prospectos de software. Los leads viven en un ciclo propio (captura → contacto → calificacion → conversion/rechazo) antes de convertirse en clientes del CRM.

---

## 2. Modelo de Datos (Prisma)

```prisma
model Lead {
  id          String   @id @default(cuid())
  nombre      String
  email       String
  telefono    String?
  empresa     String?
  cargo       String?
  pais        String?
  origen      String   // web, referido, linkedin, evento, csv, manual
  softwareId  String   // a cual producto/software pertenece el lead
  estado      LeadEstado @default(NUEVO)
  prioridad   Prioridad @default(MEDIA)
  notas       String?
  ultimoContacto DateTime?
  asignadoA   String?  // usuario CRM que lo gestiona
  metadata    Json?    // campos flexibles segun origen
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relaciones
  historial   LeadHistorial[]
  etiquetas   LeadEtiqueta[]
}

model LeadHistorial {
  id        String   @id @default(cuid())
  leadId    String
  tipo      String   // cambio_estado, nota, llamada, email, reunion
  descripcion String
  usuarioId String
  createdAt DateTime @default(now())

  lead Lead @relation(fields: [leadId], references: [id], onDelete: Cascade)
}

model LeadEtiqueta {
  id     String @id @default(cuid())
  nombre String @unique
  color  String @default("#6B7280")
  leads  Lead[]
}

enum LeadEstado {
  NUEVO
  CONTACTADO
  INTERESADO
  EN_SEGUIMIENTO
  CALIFICADO
  RECHAZADO
  NO_RESPONDE
  CONVERTIDO
}

enum Prioridad {
  BAJA
  MEDIA
  ALTA
  URGENTE
}
```

---

## 3. Endpoints API (Express)

| Metodo | Endpoint | Descripcion |
|--------|----------|-------------|
| GET | `/api/leads` | Listar leads (paginado, filtros por estado/prioridad/origen, busqueda) |
| GET | `/api/leads/:id` | Detalle de lead con historial |
| POST | `/api/leads` | Crear lead manual |
| PUT | `/api/leads/:id` | Actualizar lead |
| DELETE | `/api/leads/:id` | Eliminar lead |
| POST | `/api/leads/:id/historial` | Agregar entrada al historial |
| PUT | `/api/leads/:id/estado` | Cambiar estado (registra automaticamente en historial) |
| POST | `/api/leads/importar-csv` | Subir y procesar CSV |
| GET | `/api/leads/plantilla-csv` | Descargar plantilla CSV |
| GET | `/api/leads/estadisticas` | KPIs: totales por estado, conversion rate, etc. |

### Filtros en GET /api/leads
- `?estado=INTERESADO`
- `?prioridad=ALTA`
- `?origen=web`
- `?search=juan`
- `?softwareId=saas-crm`
- `?asignadoA=user_123`
- `?desde=2026-01-01&hasta=2026-04-30`
- `?page=1&limit=25`

---

## 4. CSV Import

### Formato de plantilla
```csv
nombre,email,telefono,empresa,cargo,pais,origen,estado,prioridad,notas
Juan Perez,juan@empresa.com,+34600000000,Empresa SA,CEO,Espana,web,NUEVO,ALTA,Nota inicial
```

### Logica de importacion
1. Validar headers del CSV (rechazar si falta `nombre` o `email`)
2. Validar emails unicos por archivo
3. Verificar duplicados contra DB (por email)
4. Mapear estados/prioridad a enums (case-insensitive)
5. Crear leads en batch con transaccion Prisma
6. Retornar resumen: `creados`, `duplicados`, `errores`

---

## 5. Frontend - Paginas y Componentes

### 5.1 Paginas (Next.js App Router)

```
/frontend/src/app/dashboard/leads/
├── page.tsx              # Lista de leads (tabla + filtros)
├── [id]/
│   └── page.tsx          # Detalle del lead + historial
├── nuevo/
│   └── page.tsx          # Formulario crear lead manual
└── importar/
    └── page.tsx          # Subida de CSV con preview
```

### 5.2 Componentes

```
/frontend/src/components/leads/
├── LeadsTable.tsx        # Tabla con sort, select, acciones bulk
├── LeadsFilters.tsx      # Filtros por estado, prioridad, origen, fecha
├── LeadStatusBadge.tsx   # Badge visual por estado
├── LeadPriorityBadge.tsx # Badge por prioridad
├── LeadForm.tsx          # Formulario crear/editar
├── LeadDetailCard.tsx    # Tarjeta de info en pagina detalle
├── LeadTimeline.tsx      # Historial de actividad (timeline)
├── LeadStats.tsx         # KPIs en la pagina de lista
├── CSVUploadZone.tsx     # Drag & drop para CSV
├── CSVPreviewTable.tsx   # Preview antes de confirmar import
└── LeadsBulkActions.tsx  # Acciones masivas (cambiar estado, asignar, eliminar)
```

### 5.3 Estados visuales

| Estado | Color |
|--------|-------|
| NUEVO | gris |
| CONTACTADO | azul |
| INTERESADO | verde |
| EN_SEGUIMIENTO | amarillo |
| CALIFICADO | indigo |
| RECHAZADO | rojo |
| NO_RESPONDE | naranja |
| CONVERTIDO | emerald |

---

## 6. Flujos de Usuario

### 6.1 Crear lead manual
1. Usuario va a `/dashboard/leads/nuevo`
2. Completa formulario (nombre, email obligatorios)
3. Selecciona software al que pertenece
4. Opcional: asigna a un gestor, agrega notas
5. Guardar → redirige a lista con toast de exito

### 6.2 Importar CSV
1. Usuario va a `/dashboard/leads/importar`
2. Arrastra o selecciona archivo CSV
3. Sistema valida y muestra preview con filas validas/invalidas
4. Usuario confirma importacion
5. Sistema procesa y muestra resumen (creados, duplicados, errores)
6. Redirige a lista de leads

### 6.3 Gestionar lead
1. Desde la tabla, usuario hace click en un lead
2. Ve pagina de detalle con toda la info y timeline de actividad
3. Puede cambiar estado (dropdown) → se registra en historial
4. Puede agregar notas o registrar llamadas/emails
5. Puede asignar a otro gestor
6. Puede convertir a cliente (mueve datos a `ClienteGlobal`)

### 6.4 Cambio de estado
- Cada cambio de estado registra automaticamente entrada en `LeadHistorial`
- Estado `CONVERTIDO` desencadena flujo de creacion de `ClienteGlobal`
- Estado `RECHAZADO` permite agregar motivo (guardado en notas/historial)

---

## 7. Autorizacion

- Solo usuarios con rol `ADMIN` o `COMERCIAL` acceden a leads
- Los leads pueden estar asignados a un gestor especifico
- Un gestor solo ve leads asignados a el (a menos que sea ADMIN)
- El campo `asignadoA` controla esta visibilidad

---

## 8. Migracion y Setup

### Paso 1 - Schema
```bash
cd backend
npx prisma migrate dev --name add_leads
npx prisma generate
```

### Paso 2 - Seed inicial
- Crear etiquetas por defecto: `Hot Lead`, `Referido`, `Evento`, `Freemium`

### Paso 3 - Backend
- Crear `backend/src/routes/leads.ts`
- Registrar ruta en `backend/src/index.ts`
- Crear `backend/src/services/leadService.ts` (logica de negocio)

### Paso 4 - Frontend
- Agregar ruta en sidebar: "Leads" con icono `Users`
- Crear paginas y componentes
- Agregar tipos en `frontend/src/types/index.ts`

---

## 9. Consideraciones

### Duplicados
- Email es unico por lead dentro del mismo software
- Al importar CSV, se detectan duplicados y se muestran sin bloquear el resto

### Performance
- Paginacion de 25/50/100 items
- Busqueda por nombre/email con `ILIKE` + indice en DB
- Historial cargado por separado en pagina de detalle

### Conversion a Cliente
- Estado `CONVERTIDO` crea un `ClienteGlobal` copiando datos del lead
- El lead se mantiene en DB con referencia al cliente creado (campo `convertidoA` opcional)
- Esto permite trazabilidad completa del funnel

### Notificaciones (futuro)
- Notificar al gestor cuando se le asigna un lead
- Recordatorio de seguimiento si un lead lleva X dias sin contacto
- Alerta cuando un lead de prioridad ALTA/URGENTe lleva sin contacto
