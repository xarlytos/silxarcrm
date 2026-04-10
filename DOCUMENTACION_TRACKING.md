# 📊 Sistema de Tracking de Eventos - CRM Maestro

## Índice
1. [¿Qué es esto?](#qué-es-esto)
2. [Arquitectura General](#arquitectura-general)
3. [Flujo de Datos](#flujo-de-datos)
4. [Instalación y Configuración](#instalación-y-configuración)
5. [Uso desde el CRM Cliente](#uso-desde-el-crm-cliente)
6. [Gestión en el Dashboard](#gestión-en-el-dashboard)
7. [API Reference](#api-reference)
8. [Eventos Recomendados](#eventos-recomendados)
9. [Solución de Problemas](#solución-de-problemas)

---

## ¿Qué es esto?

Este es un **sistema de tracking de eventos centralizado** que permite a múltiples CRMs enviar datos sobre la actividad de sus usuarios a un sistema central (CRM Maestro).

### Casos de Uso

**Ejemplo práctico:**
- Tú vendes CRMs a entrenadores personales
- Cada entrenador tiene su propia instancia del CRM
- Quieres ver en tu dashboard central:
  - Cuántos usuarios se registraron hoy en TODOS los CRMs
  - Cuántos pagos se hicieron
  - Qué features se usan más
  - Alertas cuando alguien cancela

**Con este sistema:**
```
CRM del Entrenador Juan ──┐
CRM del Entrenador Ana ───┼──▶ CRM Maestro Central
CRM del Entrenador Luis ──┘        (tu dashboard)
```

---

## Arquitectura General

```
┌─────────────────────────────────────────────────────────────────┐
│                         CRM CLIENTE                              │
│  (La instancia que vendes a cada entrenador)                     │
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │ Usuario se   │───▶│ SDK Tracker  │───▶│ HTTP POST    │       │
│  │ registra     │    │ @silxar/     │    │ /events      │       │
│  └──────────────┘    │ tracker      │    └──────────────┘       │
│                      └──────────────┘                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      CRM MAESTRO (CENTRAL)                       │
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │ Validación   │───▶│ Guardar en   │───▶│ Procesar     │       │
│  │ API Key      │    │ Base de      │    │ (analytics,  │       │
│  │              │    │ Datos        │    │ alertas)     │       │
│  └──────────────┘    └──────────────┘    └──────────────┘       │
│         │                                            │           │
│         ▼                                            ▼           │
│  ┌──────────────┐                         ┌──────────────┐       │
│  │ 401/403 si   │                         │ Dashboard    │       │
│  │ key inválida │                         │ en tiempo    │       │
│  └──────────────┘                         │ real         │       │
│                                           └──────────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

### Componentes

| Componente | Descripción | Ubicación |
|------------|-------------|-----------|
| **SDK** | Librería que instalan los CRMs | `packages/tracker-sdk/` |
| **Endpoint /events** | API pública que recibe eventos | `backend/src/routes/events.ts` |
| **Admin API** | Gestión de CRMs y API Keys | `backend/src/routes/admin.ts` |
| **Base de Datos** | Almacena eventos y métricas | PostgreSQL |
| **Dashboard** | Visualización de datos | Frontend React |

---

## Flujo de Datos

### Paso a Paso

```
1. EVENTO OCURRE
   └─▶ Usuario se registra en el CRM de un entrenador

2. CRM LLAMA AL SDK
   └─▶ tracker.userRegistered('u_123', 'user@email.com')

3. SDK PREPARA EL EVENTO
   └─▶ {
         "event": "user_registered",
         "crm_id": "crm_entrenador_123",
         "timestamp": "2026-04-10T10:00:00Z",
         "event_id": "user_registered:u_123:1712743200000:abc123",
         "user_id": "u_123",
         "email": "user@email.com",
         "data": {}
       }

4. SDK ENVÍA AL BACKEND
   └─▶ POST https://api.tu-crm.com/events
       Authorization: Bearer sk_xxx

5. BACKEND VALIDA
   └─▶ ¿API Key existe y está activa? ✅
   └─▶ ¿CRM está activo? ✅

6. BACKEND GUARDA
   └─▶ INSERT INTO tracked_events (...)

7. BACKEND RESPONDE
   └─▶ 202 Accepted { "success": true, "eventId": "..." }

8. DASHBOARD MUESTRA
   └─▶ "Nuevo registro: user@email.com en Gym Pro"
```

### Diagrama de Secuencia

```
Usuario      CRM         SDK         Backend        DB       Dashboard
   │           │          │             │           │            │
   │──Registro▶│          │             │           │            │
   │           │──llama──▶│             │           │            │
   │           │          │───POST─────▶│           │            │
   │           │          │   /events   │           │            │
   │           │          │             │──validar──▶│           │
   │           │          │             │◀───key────│            │
   │           │          │             │──INSERT───▶│           │
   │           │          │             │◀──ok──────│            │
   │           │          │◀──202──────│           │            │
   │           │◀──ok─────│             │           │            │
   │           │          │             │           │            │◀──query
   │           │          │             │           │            │
```

---

## Instalación y Configuración

### Paso 1: Crear un CRM Client en el Sistema Central

**Desde la terminal del backend:**

```bash
cd backend

# Crear un nuevo CRM
npx ts-node scripts/create-crm-client.ts \
  --name="Gym Pro - Juan García" \
  --saas="entrenadores" \
  --desc="CRM para entrenador personal Juan García"
```

**Salida esperada:**
```
🚀 Creando CRM Client...

✅ CRM Client creado exitosamente

📋 Detalles:
   ID:          cl_abc123def456
   Nombre:      Gym Pro - Juan García
   SaaS:        entrenadores
   Descripción: CRM para entrenador personal Juan García
   Activo:      true

🔑 API Key (¡GUÁRDALA AHORA!):
   sk_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6

⚠️  Esta API Key no se mostrará de nuevo.
```

**⚠️ IMPORTANTE:** Guarda la API Key en un lugar seguro. No se puede recuperar.

### Paso 2: Instalar el SDK en el CRM Cliente

**Opción A: Como paquete local (desarrollo)**

```bash
cd tu-crm-cliente
npm install ../crm-maestro/packages/tracker-sdk
```

**Opción B: Copiar archivos compilados**

```bash
# Copiar dist/ a tu proyecto
cp -r packages/tracker-sdk/dist/ tu-crm/src/lib/tracker/

# Importar
import { SilxarTracker } from './lib/tracker';
```

**Opción C: Publicar en npm (producción)**

```bash
cd packages/tracker-sdk
npm publish --access public

# Luego en el CRM:
npm install @silxar/tracker
```

### Paso 3: Configurar el SDK

**En el código de tu CRM:**

```typescript
// lib/tracker.ts (o utils/tracker.ts)
import { SilxarTracker } from '@silxar/tracker';

export const tracker = new SilxarTracker({
  // Tu API Key (del paso 1)
  apiKey: 'sk_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6',
  
  // ID del CRM (del paso 1)
  crmId: 'cl_abc123def456',
  
  // Opcional: URL del endpoint (default: producción)
  endpoint: 'https://api.tu-crm.com/events',
  
  // Modo debug (logs en consola)
  debug: process.env.NODE_ENV === 'development',
  
  // Enviar en batch (más eficiente)
  batch: true,
  
  // Intervalo de envío (ms)
  flushInterval: 5000,
  
  // Tamaño máximo del batch
  batchSize: 20,
});
```

---

## Uso desde el CRM Cliente

### Eventos Predefinidos

El SDK incluye métodos para eventos comunes:

#### 1. Usuario Registrado

```typescript
// Cuando un usuario completa el registro
tracker.userRegistered(
  'u_123456',                    // user_id
  'usuario@email.com',           // email
  {                              // datos extra (opcional)
    plan: 'premium',
    source: 'google_ads',
    device: 'mobile'
  }
);
```

**Cuándo usar:** Después de que el usuario confirme su email o complete el onboarding.

#### 2. Login

```typescript
// Cuando un usuario inicia sesión
tracker.userLogin(
  'u_123456',
  'usuario@email.com',
  {
    device: 'desktop',
    location: 'Madrid, ES'
  }
);
```

**Cuándo usar:** En cada login exitoso (no en cada página, solo al autenticar).

#### 3. Pago Realizado

```typescript
// Cuando un usuario paga
tracker.paymentDone(
  'u_123456',          // user_id
  99.99,               // amount
  'EUR',               // currency
  {
    plan: 'annual',
    method: 'stripe',
    invoice_id: 'inv_789'
  }
);
```

**Cuándo usar:** Cuando se confirma el pago (webhook de Stripe/PayPal).

#### 4. Plan Creado/Suscrito

```typescript
// Cuando un usuario contrata un plan
tracker.planCreated(
  'u_123456',
  'premium',           // plan_type
  99.99,               // amount
  {
    billing: 'annual',
    trial: false
  }
);
```

#### 5. Mensaje Enviado

```typescript
// Cuando se envía una notificación
tracker.messageSent(
  'u_123456',
  'welcome_email',     // message_type
  {
    campaign: 'onboarding_v2'
  }
);
```

#### 6. Feature Usada

```typescript
// Cuando un usuario usa una función
tracker.featureUsed(
  'u_123456',
  'export_pdf',        // feature_name
  {
    duration_seconds: 45,
    pages: 5
  }
);
```

### Eventos Personalizados

Para cualquier otro evento:

```typescript
tracker.track(
  'workout_completed',     // nombre del evento
  {                        // datos
    workout_id: 'w_789',
    exercises_count: 8,
    duration_minutes: 45,
    calories_burned: 320
  },
  {                        // opciones adicionales
    userId: 'u_123456',
    email: 'user@email.com',
    sessionId: 'sess_abc123'
  }
);
```

### Ejemplos por Framework

#### React / Next.js

```typescript
// hooks/useTracking.ts
import { tracker } from '@/lib/tracker';

export function useTracking() {
  const trackRegistration = async (user: User) => {
    // Primero guardas el usuario en tu DB
    const savedUser = await api.createUser(user);
    
    // Luego trackeas el evento
    tracker.userRegistered(savedUser.id, savedUser.email, {
      plan: user.selectedPlan,
      source: document.referrer || 'direct'
    });
    
    return savedUser;
  };

  return { trackRegistration };
}

// pages/register.tsx
function RegisterPage() {
  const { trackRegistration } = useTracking();
  
  const handleSubmit = async (values) => {
    const user = await trackRegistration(values);
    router.push('/dashboard');
  };
  
  return <RegisterForm onSubmit={handleSubmit} />;
}
```

#### Express.js (Backend)

```typescript
// routes/auth.ts
import { tracker } from '../lib/tracker';

router.post('/register', async (req, res) => {
  try {
    // 1. Crear usuario en tu DB
    const user = await User.create(req.body);
    
    // 2. Trackear el registro
    tracker.userRegistered(user.id, user.email, {
      plan: req.body.plan,
      ip: req.ip
    });
    
    // 3. Responder al cliente
    res.json({ success: true, user });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/login', async (req, res) => {
  const user = await User.authenticate(req.body);
  
  if (user) {
    tracker.userLogin(user.id, user.email, {
      user_agent: req.headers['user-agent']
    });
    
    res.json({ success: true, token: generateToken(user) });
  }
});
```

#### Vue.js

```typescript
// composables/useTracker.ts
import { tracker } from '@/lib/tracker';

export function useTracker() {
  const trackEvent = (event: string, data: any) => {
    tracker.track(event, data);
  };
  
  return { trackEvent };
}

// Componente
<script setup>
import { useTracker } from '@/composables/useTracker';

const { trackEvent } = useTracker();

const completeWorkout = () => {
  // ... lógica
  
  trackEvent('workout_completed', {
    workout_id: workoutId.value,
    duration: duration.value
  });
};
</script>
```

---

## Gestión en el Dashboard

### Ver Todos los CRMs

**Endpoint:** `GET /api/admin/crm-clients`

**Respuesta:**
```json
{
  "success": true,
  "data": [
    {
      "id": "cl_abc123",
      "name": "Gym Pro - Juan",
      "saas": "entrenadores",
      "activo": true,
      "_count": {
        "trackedEvents": 1523
      },
      "apiKeys": [
        {
          "id": "key_123",
          "keyPrefix": "sk_a1b2c3d4",
          "nombre": "Default",
          "activo": true,
          "ultimoUso": "2026-04-10T10:00:00Z"
        }
      ]
    }
  ]
}
```

### Ver Métricas de un CRM

**Endpoint:** `GET /api/admin/crm-clients/:id/metrics?days=30`

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "totalEvents": 1523,
    "uniqueUsers": 89,
    "eventsByType": [
      { "name": "user_registered", "count": 45 },
      { "name": "payment_done", "count": 32 },
      { "name": "feature_used", "count": 1200 }
    ],
    "recentEvents": [
      {
        "id": "evt_xyz",
        "eventName": "payment_done",
        "userId": "u_123",
        "email": "user@email.com",
        "timestamp": "2026-04-10T10:00:00Z",
        "datos": { "amount": 99.99 }
      }
    ]
  }
}
```

### Crear Nueva API Key

**Endpoint:** `POST /api/admin/crm-clients/:id/api-keys`

**Body:**
```json
{
  "nombre": "Producción v2"
}
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "apiKey": "sk_nueva_key_aqui",
    "prefix": "sk_n3uv4k3y",
    "message": "Guarda esta API Key, no se mostrará de nuevo"
  }
}
```

### Revocar una API Key

**Endpoint:** `DELETE /api/admin/api-keys/:id`

El CRM que use esa key dejará de poder enviar eventos.

---

## API Reference

### Endpoint Público: POST /events

Recibe un evento de tracking.

**Headers:**
```
Authorization: Bearer sk_tu_api_key
Content-Type: application/json
```

**Body:**
```typescript
{
  event: string;           // Nombre del evento (requerido)
  crm_id?: string;         // ID del CRM (opcional, se infiere de la key)
  timestamp?: string;      // ISO 8601 (default: ahora)
  event_id?: string;       // Para deduplicación (opcional)
  user_id?: string;        // ID del usuario
  email?: string;          // Email del usuario
  session_id?: string;     // ID de sesión
  data?: object;           // Datos adicionales (requerido)
}
```

**Ejemplo:**
```bash
curl -X POST https://api.tu-crm.com/events \
  -H "Authorization: Bearer sk_xxx" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "user_registered",
    "timestamp": "2026-04-10T10:00:00Z",
    "event_id": "unique_id_123",
    "user_id": "u_456",
    "email": "user@email.com",
    "data": {
      "plan": "premium",
      "source": "google_ads"
    }
  }'
```

**Respuestas:**

| Código | Respuesta | Significado |
|--------|-----------|-------------|
| 202 | `{ "success": true, "eventId": "..." }` | Evento aceptado |
| 400 | `{ "error": "Event name required" }` | Datos inválidos |
| 401 | `{ "error": "API key required" }` | Falta autenticación |
| 401 | `{ "error": "Invalid API key" }` | Key inválida |
| 429 | `{ "error": "Rate limit exceeded" }` | Demasiadas peticiones |

### Endpoint Batch: POST /events/batch

Recibe múltiples eventos (máximo 100).

**Body:**
```typescript
{
  events: Array<{
    event: string;
    data: object;
    // ... mismos campos que /events
  }>
}
```

**Respuesta:**
```json
{
  "success": true,
  "processed": 50,
  "successful": 48,
  "failed": 2,
  "results": [
    { "index": 0, "success": true, "eventId": "..." },
    { "index": 1, "success": false, "error": "..." }
  ]
}
```

---

## Eventos Recomendados

### Para CRM de Entrenadores Personales

| Evento | Cuándo Enviar | Datos Útiles |
|--------|---------------|--------------|
| `user_registered` | Nuevo registro | email, plan, source, device |
| `plan_created` | Contrata plan | plan_type, amount, trial |
| `payment_done` | Pago exitoso | amount, currency, method |
| `payment_failed` | Pago fallido | reason, retry_count |
| `workout_created` | Crea rutina | exercises_count, difficulty |
| `workout_completed` | Completa rutina | duration, calories |
| `client_assigned` | Asigna cliente | trainer_id, client_id |
| `progress_photo_uploaded` | Sube foto | client_id, type |
| `message_sent` | Envía mensaje | message_type, channel |
| `appointment_scheduled` | Agenda cita | trainer_id, datetime |
| `feature_used` | Usa feature | feature_name, duration |

### Para CRM de Nutrición

| Evento | Cuándo Enviar | Datos Útiles |
|--------|---------------|--------------|
| `meal_plan_created` | Crea plan | meals_count, calories |
| `recipe_viewed` | Ve receta | recipe_id, time_spent |
| `grocery_list_generated` | Genera lista | items_count |
| `weight_logged` | Registra peso | weight, bmi_change |
| `water_intake_logged` | Toma agua | amount_ml |
| `meal_logged` | Registra comida | meal_type, calories |

---

## Solución de Problemas

### "401 Unauthorized"

**Causas:**
- API Key no proporcionada
- API Key inválida
- API Key revocada
- API Key expirada

**Solución:**
```typescript
// Verifica que la key esté configurada
console.log(tracker.config.apiKey); // debe mostrar sk_...

// Verifica el header Authorization
// Debe ser: Bearer sk_xxx (no solo sk_xxx)
```

### "400 Bad Request"

**Causas:**
- Falta campo `event`
- Falta campo `data`
- `data` no es un objeto

**Solución:**
```typescript
// ❌ Mal
tracker.track('evento', 'string');

// ✅ Bien
tracker.track('evento', { propiedad: 'valor' });
```

### Eventos duplicados

**Causa:** Se envía el mismo evento 2 veces.

**Solución:** Usa `event_id` único:
```typescript
const eventId = `${userId}:${Date.now()}`;

tracker.track('click', { button: 'buy' }, { eventId });
```

El SDK genera `event_id` automáticamente si no lo proporcionas.

### No llegan eventos al dashboard

**Checklist:**
1. ✅ SDK configurado con API Key correcta
2. ✅ Método `track()` llamado correctamente
3. ✅ Backend responde 202 (revisar Network tab)
4. ✅ No hay errores en consola
5. ✅ API Key está activa en el dashboard

**Debug:**
```typescript
const tracker = new SilxarTracker({
  apiKey: 'sk_xxx',
  debug: true, // Activa logs
});

// Verás en consola:
// [SilxarTracker] Event sent successfully
```

### Rate Limiting

**Límite:** 100 peticiones por minuto por API Key.

**Solución:**
- Usa batch mode (envía múltiples eventos juntos)
- Aumenta `flushInterval` si es necesario
- Contacta soporte para límites personalizados

---

## Mejores Prácticas

### ✅ Hacer
- Usa eventos descriptivos: `payment_done` mejor que `event_1`
- Incluye `user_id` siempre que sea posible
- Usa `event_id` para operaciones idempotentes
- Envía datos enriquecidos: no solo el evento, sino contexto
- Agrupa eventos relacionados en `data`

### ❌ No Hacer
- No envíes contraseñas ni tokens
- No hagas tracking síncrono (bloquea la UI)
- No envíes PII sensible (DNI, tarjetas, etc.)
- No crees eventos para cada click (satura el sistema)

### Ejemplo Bueno vs Malo

```typescript
// ❌ Malo
tracker.track('click', { x: 100, y: 200 });

// ✅ Bueno
tracker.track('subscription_upgraded', {
  user_id: 'u_123',
  from_plan: 'basic',
  to_plan: 'premium',
  amount: 99.99,
  source: 'email_campaign'
});
```

---

## Soporte

- **Documentación:** Este archivo
- **Email:** soporte@tu-crm.com
- **Issues:** GitHub Issues

---

**Última actualización:** 2026-04-10

**Versión del sistema:** 1.0.0
