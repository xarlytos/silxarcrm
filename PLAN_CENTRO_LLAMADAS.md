# Plan: Centro de Llamadas (Call Center) - SilxarCRM

> **Vision:** Una unica pagina desde la que gestionas todas las llamadas de todos tus negocios: guiones, practica con IA, llamadas reales a leads, y historial completo.

---

## 1. Resumen Ejecutivo

| Aspecto | Decision |
|---------|----------|
| **Nombre de la pagina** | `/dashboard/llamadas` - "Centro de Llamadas" |
| **Negocios soportados** | Todos los SaaS existentes (Atleevo, AgroGest, Prisma Dental, HelioWatt, CoMantek) |
| **Tipos de llamada** | 1) Prueba con IA (simulacion) / 2) Real a lead (Zadarma VoIP) |
| **Spechs** | Uno por negocio, editable en la misma pagina |
| **Estado del lead** | Se actualiza automaticamente tras llamada real |

---

## 2. Arquitectura de Datos

### 2.1 Modelos Prisma Nuevos

```prisma
model SpechLlamada {
  id          String   @id @default(cuid())
  softwareId  String
  titulo      String
  contenido   String   // El guion completo con marcadores {{nombre}}, {{empresa}}
  objetivo    String   // "Cierre", "Demo", "Informacion", "Seguimiento"
  orden       Int      @default(0)
  activo      Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model SesionPruebaIA {
  id          String   @id @default(cuid())
  softwareId  String
  spechId     String
  leadSimulado Json    // {nombre, empresa, situacion, personalidad}
  mensajes    Json     // Array de {rol: "agente"|"cliente", texto, timestamp}
  resultado   String?  // "exitoso", "fallido", "pendiente"
  notas       String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model LlamadaReal {
  id            String   @id @default(cuid())
  softwareId    String
  leadId        String
  spechId       String?
  agenteId      Int      // UsuarioCrm que hizo la llamada
  estado        String   // "programada", "iniciando", "en_curso", "completada", "fallida", "no_contesta"
  direccion     String   // "saliente" (click-to-call)
  telefono      String
  duracionSeg   Int?
  grabacionUrl  String?
  notasPost     String?
  leadEstadoPrev String? // Estado del lead antes de la llamada
  leadEstadoPost String? // Estado del lead despues (para revertir si es necesario)
  transcript    String?  // Transcripcion si disponible
  calificacion  Int?     // 1-5 valoracion del agente sobre como le fue
  metadata      Json?    // Respuestas del webhook Zadarma
  iniciadaAt    DateTime?
  terminadaAt   DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  lead Lead @relation(fields: [leadId], references: [id])
}
```

### 2.2 Relaciones a modificar

```prisma
model Lead {
  // ... campos existentes ...
  llamadas LlamadaReal[]
}
```

---

## 3. Estructura de la Pagina

### 3.1 Layout General (`/dashboard/llamadas`)

```
+-------------------------------------------------------------+
|  CENTRO DE LLAMADAS                              [+] Nueva  |
+-------------------------------------------------------------+
|  Selector de Negocio: [Atleevo ▼]  |  Tabs: [Llamar] [Practicar] [Spechs] [Historial] |
+-------------------------------------------------------------+
|                                                             |
|  +------------------+  +----------------------------------+  |
|  | PANEL IZQUIERDO  |  |     PANEL PRINCIPAL              |  |
|  |                  |  |                                  |  |
|  |  Lista de Leads  |  |  CONTENIDO SEGUN TAB ACTIVO:     |  |
|  |  del negocio     |  |                                  |  |
|  |  seleccionado    |  |  TAB "Llamar":                   |  |
|  |                  |  |  + Spech actual (editable rapido)|  |
|  |  [Buscar...]     |  |  + Lead seleccionado (info)      |  |
|  |                  |  |  + Boton LLAMAR AHORA            |  |
|  |  Juan Perez      |  |  + Estado de la llamada en vivo  |  |
|  |  Maria Lopez     |  |                                  |  |
|  |  Carlos Ruiz     |  |  TAB "Practicar":                |  |
|  |  ...             |  |  + Configurar simulacion         |  |
|  |                  |  |  + Chat de llamada con IA        |  |
|  |                  |  |  + Feedback post-simulacion      |  |
|  |                  |  |                                  |  |
|  |                  |  |  TAB "Spechs":                   |  |
|  |                  |  |  + Lista de guiones del negocio  |  |
|  |                  |  |  + Editor del guion seleccionado |  |
|  |                  |  |  + Preview con variables         |  |
|  |                  |  |                                  |  |
|  |                  |  |  TAB "Historial":                |  |
|  |                  |  |  + Lista de llamadas reales      |  |
|  |                  |  |  + Filtros por fecha/estado      |  |
|  |                  |  |  + Reproductor de grabaciones    |  |
|  |                  |  |                                  |  |
|  +------------------+  +----------------------------------+  |
|                                                             |
+-------------------------------------------------------------+
```

### 3.2 Tabs Detallados

#### Tab "Llamar" (Llamadas Reales)

**Flujo:**
1. Seleccionas negocio en el dropdown superior
2. Seleccionas lead de la lista izquierda
3. Seleccionas spech (o usas el default del negocio)
4. El spech se muestra en el panel con las variables rellenas (`{{nombre}}` → "Juan Perez")
5. Click en "Llamar Ahora"
6. Backend inicia click-to-call via Zadarma
7. Tu telefono suena → descuelgas → suena el del lead
8. Durante la llamada: ver el spech, tomar notas en tiempo real
9. Al colgar: modal para resultado y siguiente estado del lead

**Estados en vivo:**
- "Iniciando... tu telefono sonara en breve"
- "Esperando que descuelgues..."
- "Llamando al lead..."
- "En llamada (0:42)"
- "Completada - Duracion: 3:15"

#### Tab "Practicar" (Simulacion con IA)

**Flujo:**
1. Seleccionas negocio y spech a practicar
2. Configuras el "cliente simulado":
   - Tipo de personalidad: "Resistente", "Interesado", "Ocupado", "Curioso", "Hostil"
   - Contexto: "Tiene un problema X, no sabe que existe tu solucion"
3. Click "Iniciar Simulacion"
4. La IA actua como el cliente, tu escribes lo que dirias (o usas dictado)
5. La IA responde como el cliente segun la personalidad y el contexto
6. Al finalizar: la IA te da feedback:
   - Que hiciste bien
   - Que podrias mejorar
   - Si seguiste el guion
   - Puntuacion del 1 al 10

**Prompt del sistema para la IA (cliente):**
```
Eres un cliente potencial de {negocio}. Tu personalidad es {personalidad}.
Contexto: {contexto}

El agente te esta llamando siguiendo este guion:
{spech}

Responde como un humano real. No seas cooperativo a menos que el agente te convenza.
Mantente en personaje. Responde en espanol.
```

**Prompt del sistema para la IA (feedback):**
```
Analiza esta simulacion de llamada comercial. El agente seguia este guion:
{spech}

Evalua:
1. ¿Siguio el guion? ¿Cubrio los puntos clave?
2. ¿Manejo objeciones bien?
3. ¿Cierre o dejo la conversacion abierta?
4. ¿Tono adecuado?

Da un feedback constructivo y una puntuacion del 1 al 10.
```

#### Tab "Spechs" (Editor de Guiones)

**Funcionalidad:**
- Lista de guiones del negocio seleccionado
- Editor de texto enriquecido simple (negrita, listas)
- Variables dinamicas: `{{nombre}}`, `{{empresa}}`, `{{cargo}}`, `{{telefono}}`
- Preview en tiempo real con datos de un lead de ejemplo
- Ordenar guiones (drag & drop)
- Activar/desactivar guiones
- Duplicar guion (para crear variantes)
- Un guion marcado como "default" se usa automaticamente al llamar

**Estructura de un Spech tipico:**
```
# Introduccion
Hola {{nombre}}, soy [Tu Nombre] de [Tu Empresa].
Te llamo porque vi que tienes {{empresa}} y creo que podemos ayudarte.

# Pregunta de Apertura
¿Tienes un minuto para hablar?

# Propuesta de Valor
Trabajamos con [tipo de negocio] para [beneficio principal].

# Cierre
¿Te parece si agendamos una demo de 15 minutos esta semana?
```

#### Tab "Historial" (Registro Completo)

**Vista:**
- Tabla de todas las llamadas reales con filtros
- Columnas: Fecha, Lead, Negocio, Duracion, Estado, Resultado, Notas, Grabacion
- Filtros: por negocio, por estado, por fecha, por agente
- Stats rapido: llamadas hoy, esta semana, tasa de contacto, duracion media

---

## 4. API Backend

### 4.1 Endpoints Nuevos

```typescript
// === SPECHS ===
GET    /api/spechs?softwareId=xxx           // Listar guiones por negocio
POST   /api/spechs                           // Crear guion
PUT    /api/spechs/:id                       // Actualizar guion
DELETE /api/spechs/:id                       // Eliminar guion
PUT    /api/spechs/:id/orden                 // Reordenar
PUT    /api/spechs/:id/default               // Marcar como default

// === SIMULACION IA ===
POST   /api/simulacion/iniciar               // Crear sesion de practica
POST   /api/simulacion/:id/mensaje           // Enviar mensaje del agente, recibir respuesta IA
POST   /api/simulacion/:id/finalizar         // Terminar y obtener feedback
GET    /api/simulacion?softwareId=xxx        // Historial de practicas

// === LLAMADAS REALES (Zadarma) ===
POST   /api/llamadas/iniciar                 // Iniciar click-to-call
POST   /api/llamadas/webhook/zadarma        // Webhook de Zadarma
GET    /api/llamadas?softwareId=xxx          // Listar llamadas reales
GET    /api/llamadas/:id                     // Detalle de llamada
PUT    /api/llamadas/:id/notas               // Guardar notas post-llamada
GET    /api/llamadas/:id/audio               // Stream/descargar grabacion
DELETE /api/llamadas/:id                     // Eliminar registro

// === ESTADISTICAS ===
GET    /api/llamadas/stats?softwareId=xxx    // Stats de llamadas por negocio
GET    /api/llamadas/stats/global            // Stats globales (todos los negocios)
```

### 4.2 Servicios Nuevos

```
backend/src/services/
├── spechService.ts           // CRUD de guiones
├── simulacionService.ts      // Logica de simulacion con OpenAI
├── llamadaService.ts         // Logica de llamadas reales + Zadarma
└── llamadaStatsService.ts    // Agregaciones y estadisticas
```

### 4.3 Flujo de Llamada Real

```
1. Frontend: POST /api/llamadas/iniciar
   Body: { leadId, spechId, telefonoAgente }

2. Backend:
   a. Obtiene lead y spech
   b. Guarda estado previo del lead
   c. Crea registro LlamadaReal con estado "iniciando"
   d. Llama a Zadarma API: click-to-call
      - from: numero DID
      - to: telefonoAgente (primero)
      - answer_url: webhook de bridge
      - record: true
      - custom_data: { llamadaRealId, leadTelefono, leadId }

3. Zadarma:
   a. Llama al agente
   b. Webhook notify_start → Backend actualiza a "iniciando"
   c. Agente descuelga → Zadarma pide answer_url
   d. Backend devuelve XML para bridge al lead
   e. Webhook notify_answer → Backend actualiza a "en_curso"
   f. Lead descuelga/bridge conectado
   g. Webhook notify_end → Backend actualiza a "completada" o "fallida"
   h. Webhook notify_record → Backend guarda URL de grabacion

4. Frontend:
   a. WebSocket recibe actualizaciones de estado en tiempo real
   b. Muestra timer en vivo
   c. Al colgar: modal para notas y siguiente accion
```

---

## 5. Componentes Frontend

```
frontend/src/components/llamadas/
├── LlamadaLayout.tsx           // Layout principal de 2 columnas
├── LeadSelector.tsx            // Lista de leads del negocio (panel izq)
├── SpechViewer.tsx             // Visualizador de guion con variables rellenas
├── SpechEditor.tsx             // Editor de guiones
├── SpechList.tsx               // Lista de guiones del negocio
├── LlamadaEnVivo.tsx           // Panel de llamada activa (timer, notas, colgar)
├── LlamadaStats.tsx            // Stats rapidos
├── SimulacionConfig.tsx        // Configurar simulacion (personalidad, contexto)
├── SimulacionChat.tsx          // Chat de simulacion
├── SimulacionFeedback.tsx      // Feedback post-simulacion
├── HistorialLlamadas.tsx       // Tabla de historial con filtros
├── AudioPlayer.tsx             // Reproductor de grabaciones
└── LlamadaIniciarModal.tsx     // Modal para confirmar antes de llamar

frontend/src/app/dashboard/llamadas/
├── page.tsx                    // Pagina principal con tabs
└── layout.tsx                  // Layout especifico (opcional)
```

---

## 6. Flujos de Usuario

### 6.1 Flujo: Llamar a un Lead Real

```
Usuario entra a Centro de Llamadas
  |
  v
Selecciona negocio "Atleevo" en dropdown
  |
  v
Ve lista de leads de Atleevo (panel izquierdo)
  |
  v
Click en lead "Juan Perez" → se resalta
  |
  v
Panel principal muestra:
  - Info del lead (nombre, empresa, telefono, estado actual)
  - Spech default de Atleevo con variables rellenas
  - Boton "Llamar Ahora"
  |
  v
Click "Llamar Ahora" → Modal de confirmacion:
  - "Se llamara primero a tu telefono: +34600123456"
  - "Luego se conectara con: Juan Perez (+34600111111)"
  - Boton "Confirmar"
  |
  v
Backend inicia llamada via Zadarma
WebSocket envia actualizaciones:
  "Iniciando..." → "Llamando a tu telefono..." → "En llamada (0:12)"
  |
  v
Pantalla durante llamada:
  - Timer en grande
  - Spech visible para leer
  - Textarea para notas en tiempo real
  - Boton "Colgar"
  |
  v
Al colgar:
  Modal "Resultado de la llamada":
  - Estado resultante: [Interesado / No contesta / Rechazado / Seguimiento]
  - Notas post-llamada
  - Proxima accion: [Agendar demo / Enviar email / Llamar en X dias]
  - Calificacion de la llamada (1-5 estrellas)
  |
  v
Backend actualiza estado del lead + crea historial + guarda grabacion
```

### 6.2 Flujo: Practicar con IA

```
Usuario entra a tab "Practicar"
  |
  v
Selecciona negocio "AgroGest"
  |
  v
Selecciona spech "Primera llamada - Presentacion"
  |
  v
Configura simulacion:
  - Personalidad: "Resistente" (dropdown)
  - Contexto: "Tiene 50 hectareas, usa Excel, no sabe que existe software"
  - Nivel de dificultad: "Medio"
  |
  v
Click "Iniciar Simulacion"
  |
  v
Chat aparece:
  IA (como cliente): "¿Quien es? Estoy ocupado..."
  Usuario escribe: "Hola, soy Carlos de AgroGest, vi que tienes una explotacion..."
  IA responde: "Si, pero ya tengo mi sistema con Excel y me funciona..."
  ... (continua conversacion)
  |
  v
Usuario click "Finalizar Simulacion"
  |
  v
IA analiza y devuelve feedback:
  - Puntuacion: 7/10
  - "Bien: Identificaste el problema (Excel manual)."
  - "Mejorable: No manejaste la objecion del precio."
  - "Siguiente vez: Pregunta por el tiempo que pierden en Excel antes de hablar de precio."
  |
  v
Guardar simulacion para revisar luego
```

### 6.3 Flujo: Gestionar Spechs

```
Usuario entra a tab "Spechs"
  |
  v
Ve lista de guiones del negocio seleccionado:
  - [DEFAULT] Primera llamada - Presentacion
  - Seguimiento post-demo
  - Llamada de cierre
  - Reactivacion de lead frio
  |
  v
Click en un guion → se abre editor:
  - Campo titulo
  - Textarea del contenido
  - Preview con variables rellenas (usando lead de ejemplo)
  |
  v
Puede:
  - Editar texto
  - Insertar variables con dropdown
  - Guardar
  - Duplicar (crear copia)
  - Eliminar
  - Marcar como default
  - Cambiar orden (drag & drop en la lista)
```

---

## 7. Prompts de IA para Simulacion

### 7.1 Sistema del Cliente Simulado

```
Eres un cliente potencial de {nombreNegocio}.

**TU PERFIL:**
- Nombre: {nombreSimulado}
- Empresa: {empresaSimulada}
- Personalidad: {personalidad} (resistente/interesado/ocupado/curioso/hostil)
- Contexto: {contexto}

**REGLAS:**
1. Responde SIEMPRE en espanol, como hablaria una persona real por telefono.
2. Mantente fiel a tu personalidad durante toda la conversacion.
3. Si eres "resistente": pon objeciones (precio, tiempo, "ya tengo solucion").
4. Si eres "interesado": haz preguntas sobre funcionalidades y precio.
5. Si eres "ocupado": cortante, "solo tengo 2 minutos", pide rapidez.
6. Si eres "hostil": molesto por la llamada, "¿de donde sacaron mi numero?".
7. No seas un cliente perfecto. El agente debe trabajar para convencerte.
8. Solo cede o acepta una demo si el agente realmente te convence.
9. No reveles toda tu informacion de golpe. Responde lo justo.
10. Maximo 2-3 frases por respuesta.

**INICIO:**
El agente acaba de llamarte. Tu primera respuesta debe ser la de alguien que recibe una llamada comercial inesperada.
```

### 7.2 Sistema del Feedback

```
Eres un coach de ventas con 20 anos de experiencia.

Analiza esta simulacion de llamada comercial entre un agente y un cliente simulado.

**EL GUION QUE DEBIA SEGUIR:**
{spech}

**EVALUA ESTOS ASPECTOS (1-10 cada uno):**
1. Apertura: ¿Saludo profesional? ¿Dijo su nombre y empresa?
2. Guion: ¿Cubrio los puntos clave del guion?
3. Escucha: ¿Hizo preguntas abiertas? ¿Escucho las respuestas?
4. Objeciones: ¿Manejo bien las objeciones? ¿No se rindio facil?
5. Cierre: ¿Pidio la siguiente accion? (demo, reunion, etc.)
6. Tono: ¿Fue amable pero firme? ¿No fue agresivo ni pasivo?

**FORMATO DE RESPUESTA (JSON):**
{
  "puntuacionGlobal": 7,
  "puntuaciones": {
    "apertura": 8,
    "guion": 7,
    "escucha": 6,
    "objeciones": 7,
    "cierre": 5,
    "tono": 8
  },
  "puntosFuertes": ["...", "..."],
  "puntosMejorar": ["...", "..."],
  "feedback": "Texto explicativo con consejos concretos...",
  "proximoPaso": "Lo que deberia practicar la siguiente vez"
}
```

---

## 8. Integracion Zadarma (Llamadas Reales)

### 8.1 Configuracion

```typescript
// backend/src/config/env.ts
ZADARMA_USER_KEY: string
ZADARMA_SECRET_KEY: string
ZADARMA_NUMBER_DID: string  // Numero de salida
```

### 8.2 Click-to-Call

```typescript
// Iniciar llamada
const response = await zadarmaApi.post('/v1/request/callback/', {
  from: TELEFONO_AGENTE,
  to: TELEFONO_LEAD,
  sip: '',
  predicted: false,
});
```

### 8.3 Webhooks Zadarma

| Evento | Accion Backend |
|--------|---------------|
| `notify_start` | Actualizar LlamadaReal a "iniciando", notificar via WebSocket |
| `notify_answer` | Actualizar a "en_curso", iniciar timer, notificar WebSocket |
| `notify_end` | Actualizar a "completada"/"fallida", guardar duracion, notificar |
| `notify_record` | Guardar URL de grabacion en LlamadaReal |

### 8.4 Descarga de Grabaciones

```typescript
// GET /api/llamadas/:id/audio
// 1. Obtener URL de grabacion de Zadarma
// 2. Descargar con auth HMAC
// 3. Stream al frontend o guardar en storage local
```

---

## 9. Fase de Implementacion

### Fase 1: Spechs y Simulacion IA (Sin telefonia)
**Tiempo estimado:** 1 dia
- [ ] Migracion Prisma (SpechLlamada, SesionPruebaIA)
- [ ] Backend: CRUD de spechs
- [ ] Backend: Simulacion con OpenAI
- [ ] Frontend: Tab Spechs (editor)
- [ ] Frontend: Tab Practicar (chat con IA)
- [ ] Sidebar: nuevo item "Llamadas"

### Fase 2: Llamadas Reales (Zadarma)
**Tiempo estimado:** 1 dia
- [ ] Migracion Prisma (LlamadaReal)
- [ ] Backend: Integracion Zadarma API
- [ ] Backend: Webhooks Zadarma
- [ ] Backend: WebSocket para estados en vivo
- [ ] Frontend: Tab Llamar (click-to-call)
- [ ] Frontend: Llamada en vivo (timer, notas)
- [ ] Frontend: Modal post-llamada

### Fase 3: Historial y Estadisticas
**Tiempo estimado:** 0.5 dia
- [ ] Backend: Stats de llamadas
- [ ] Frontend: Tab Historial
- [ ] Frontend: Reproductor de audio
- [ ] Frontend: Stats globales

### Fase 4: Pulido
**Tiempo estimado:** 0.5 dia
- [ ] Testing de flujos completos
- [ ] Ajustes de UI/UX
- [ ] Manejo de errores

**Total: ~3 dias de desarrollo**

---

## 10. Costes Operativos

| Concepto | Coste |
|----------|-------|
| Zadarma - Numero DID (x1 compartido) | ~3 EUR/mes |
| Zadarma - Llamadas (600 x 3min a movil) | ~32 EUR/mes |
| OpenAI API (simulaciones) | ~5-10 EUR/mes |
| **Total mensual** | **~40-45 EUR/mes** |

---

## 11. Consideraciones Legales

- **Grabacion de llamadas:** En Espana, informar al interlocutor. El spech puede incluir: *"Le informamos de que esta llamada puede ser grabada para fines de calidad."*
- **Proteccion de datos:** Las grabaciones son solo para mejora interna. Plazo de retencion: 6-12 meses.
- **Opt-out:** Posibilidad de marcar lead como "no llamar" o "no grabar".

---

## 12. Futuras Mejoras (Post-MVP)

1. **Calendly integrado:** Al cerrar una demo, crear evento directamente
2. **Transcripcion automatica:** Whisper de OpenAI para transcribir grabaciones
3. **Scorecards:** Comparar llamadas entre agentes, ranking de mejores
4. **Scripts dinamicos:** El spech se adapta segun respuestas del lead
5. **Llamadas automaticas:** IA que llama a leads frios y califica interes
6. **Integracion con Email:** Tras llamada, enviar email de seguimiento con 1 click
