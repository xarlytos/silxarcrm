# Sistema de Tracking de Eventos

Sistema centralizado de tracking tipo Segment/Mixpanel para CRM Maestro.

## Arquitectura

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  CRM #1     │────▶│              │     │             │
│  (Gym CRM)  │     │   /events    │────▶│   Events    │
└─────────────┘     │   Endpoint   │     │    DB       │
                    │              │     │             │
┌─────────────┐     │   Silxar     │     └──────┬──────┘
│  CRM #2     │────▶│   Central    │            │
│  (NutriApp) │     │              │            ▼
└─────────────┘     └──────────────┘     ┌─────────────┐
                                         │  Dashboard  │
                                         │  Analytics  │
                                         └─────────────┘
```

## Flujo de Datos

1. **Evento ocurre en CRM** → Usuario se registra
2. **SDK envía evento** → POST `/events` con API Key
3. **Validación** → API Key válida? CRM activo?
4. **Almacenamiento** → Evento guardado en DB
5. **Procesamiento** → Analytics, alertas, etc.
6. **Dashboard** → Visualización en tiempo real

## Instalación del SDK

```bash
npm install @silxar/tracker
```

## Uso Básico

```typescript
import { SilxarTracker } from '@silxar/tracker';

const tracker = new SilxarTracker({
  apiKey: 'sk_tu_api_key',
  crmId: 'tu_crm_id'
});

// Eventos simples
tracker.userRegistered('u_123', 'user@email.com');
tracker.paymentDone('u_123', 99.99, 'EUR');
tracker.featureUsed('u_123', 'export_pdf');

// Eventos personalizados
tracker.track('custom_event', {
  propiedad1: 'valor1',
  propiedad2: 123
});
```

## Configuración del Backend

### 1. Crear un CRM Client

```bash
cd backend
npx ts-node scripts/create-crm-client.ts --name="Mi CRM" --saas="entrenadores"
```

Esto genera:
- Un CRM Client en la base de datos
- Una API Key para autenticación

### 2. Endpoints Disponibles

#### Recibir Eventos
```http
POST /events
Authorization: Bearer sk_tu_api_key
Content-Type: application/json

{
  "event": "user_registered",
  "crm_id": "opcional",
  "timestamp": "2026-04-09T10:00:00Z",
  "event_id": "dedup_id",
  "user_id": "u_123",
  "email": "user@email.com",
  "data": { ... }
}
```

#### Batch de Eventos
```http
POST /events/batch
Authorization: Bearer sk_tu_api_key
Content-Type: application/json

{
  "events": [
    { "event": "user_registered", "data": {...} },
    { "event": "payment_done", "data": {...} }
  ]
}
```

#### Admin - Listar CRMs
```http
GET /api/admin/crm-clients
Authorization: Bearer tu_jwt_token
```

#### Admin - Crear API Key
```http
POST /api/admin/crm-clients/:id/api-keys
Authorization: Bearer tu_jwt_token

{ "nombre": "Producción" }
```

#### Admin - Ver Métricas
```http
GET /api/admin/crm-clients/:id/metrics?days=30
Authorization: Bearer tu_jwt_token
```

## Modelos de Datos

### CRM Client
```typescript
{
  id: string;           // CUID
  name: string;         // Nombre del CRM
  saas: string;         // Identificador (entrenadores, nutricion)
  activo: boolean;      // Estado
  apiKeys: ApiKey[];    // Keys asociadas
}
```

### API Key
```typescript
{
  id: string;
  crmId: string;        // Relación con CRM
  keyHash: string;      // Hash SHA256 (nunca guardamos plain text)
  keyPrefix: string;    // Primeros 12 chars para identificación
  nombre: string;       // "Producción", "Desarrollo"
  activo: boolean;
  ultimoUso: Date;
}
```

### Tracked Event
```typescript
{
  id: string;
  crmId: string;
  eventName: string;    // user_registered, payment_done, etc.
  eventId: string;      // Para deduplicación
  userId?: string;
  email?: string;
  sessionId?: string;
  datos: Json;          // Payload flexible
  timestamp: Date;      // Momento del evento
  recibidoAt: Date;     // Cuándo llegó a nuestro sistema
  ipOrigen?: string;
  userAgent?: string;
  procesado: boolean;   // Para cola de procesamiento
}
```

## Seguridad

1. **API Keys**: Cada CRM tiene sus propias keys
2. **Hash**: Nunca guardamos la key en plain text, solo SHA256
3. **Prefijo**: Primeros 12 caracteres para identificar en logs
4. **Expiración**: Keys pueden tener fecha de expiración
5. **Revocación**: Keys pueden desactivarse inmediatamente
6. **Rate Limiting**: 100 req/min por API Key

## Deduplicación

Cada evento puede tener un `event_id` único:

```typescript
// Si envías el mismo event_id 2 veces, solo se guarda 1
tracker.track('user_registered', data, {
  eventId: 'unique_id_aqui'
});
```

Si no proporcionas `event_id`, el SDK genera uno automáticamente.

## Eventos Recomendados

### SaaS de Entrenadores

| Evento | Cuándo | Datos útiles |
|--------|--------|--------------|
| `user_registered` | Nuevo registro | email, plan, fuente |
| `plan_created` | Nueva suscripción | plan_type, amount |
| `payment_done` | Pago exitoso | amount, method |
| `payment_failed` | Pago fallido | reason, retry |
| `workout_created` | Rutina creada | exercises_count |
| `client_assigned` | Cliente asignado | trainer_id |
| `progress_photo_uploaded` | Foto de progreso | client_id |
| `message_sent` | Mensaje enviado | message_type |

### SaaS de Nutrición

| Evento | Cuándo | Datos útiles |
|--------|--------|--------------|
| `meal_plan_created` | Plan creado | meals_count, calories |
| `recipe_viewed` | Receta vista | recipe_id, time_spent |
| `grocery_list_generated` | Lista compras | items_count |
| `weight_logged` | Peso registrado | weight, bmi_change |

## Desarrollo

### Compilar SDK

```bash
cd packages/tracker-sdk
npm run build
```

### Publicar SDK

```bash
cd packages/tracker-sdk
npm publish --access public
```

### Ejecutar script de creación

```bash
cd backend
npx ts-node scripts/create-crm-client.ts \
  --name="Gym Pro CRM" \
  --saas="entrenadores" \
  --desc="CRM para gimnasios profesionales"
```

## Integración con Dashboard

Los eventos trackeados aparecerán en:

1. **Dashboard principal** → Feed de actividad en tiempo real
2. **Página de Eventos** → Listado completo con filtros
3. **Métricas** → Gráficos por tipo de evento
4. **CRM Client detail** → Métricas específicas del CRM

## Próximas Mejoras

- [ ] Webhooks: Notificar a sistemas externos cuando ocurran eventos
- [ ] Cola de mensajes: RabbitMQ/SQS para procesamiento asíncrono
- [ ] Reglas: "Si X eventos en Y tiempo → alerta"
- [ ] Funnels: Análisis de embudos de conversión
- [ ] Cohorts: Análisis de cohortes de usuarios
- [ ] Real-time: WebSocket para actualizaciones en vivo

## Troubleshooting

### 401 Unauthorized
- Verifica que la API Key sea correcta
- Asegúrate de usar `Authorization: Bearer sk_...`

### 400 Bad Request
- El campo `event` es obligatorio
- El campo `data` debe ser un objeto

### Eventos duplicados
- Usa `event_id` para deduplicación
- El SDK lo genera automáticamente si no lo proporcionas

### No llegan eventos
- Verifica `debug: true` en el SDK para logs
- Comprueba que el endpoint sea correcto
- Revisa el estado de la API Key en el dashboard
