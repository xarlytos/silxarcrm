# @silxar/tracker

SDK oficial de tracking para **CRM Maestro**. Envía eventos desde tu CRM al sistema central de Silxar para analytics centralizado, alertas y automatizaciones.

## Instalación

```bash
npm install @silxar/tracker
# o
yarn add @silxar/tracker
```

## Quick Start

```typescript
import { SilxarTracker } from '@silxar/tracker';

const tracker = new SilxarTracker({
  apiKey: 'sk_tu_api_key_aqui',
  crmId: 'mi_crm_123'
});

// Trackear un evento
tracker.track('user_registered', {
  user_id: 'u_456',
  email: 'usuario@ejemplo.com',
  plan: 'premium'
});
```

## Configuración

```typescript
const tracker = new SilxarTracker({
  apiKey: 'sk_xxx',                    // Requerido: Tu API Key
  endpoint: 'https://api.silxar.com/events',  // Opcional: URL del endpoint
  crmId: 'mi_crm',                     // Opcional: ID de tu CRM
  debug: true,                         // Opcional: Modo debug (logs)
  batch: true,                         // Opcional: Agrupar eventos (default: true)
  flushInterval: 5000,                 // Opcional: Intervalo de envío en ms
  batchSize: 20,                       // Opcional: Tamaño máximo del batch
  retries: 3,                          // Opcional: Reintentos en caso de fallo
});
```

## Eventos Predefinidos

El SDK incluye métodos helper para eventos comunes:

```typescript
// Usuario registrado
tracker.userRegistered('u_123', 'user@email.com', { plan: 'free' });

// Login
tracker.userLogin('u_123', 'user@email.com', { device: 'mobile' });

// Pago realizado
tracker.paymentDone('u_123', 99.99, 'EUR', { plan: 'premium' });

// Plan creado/suscrito
tracker.planCreated('u_123', 'premium', 99.99, { billing: 'annual' });

// Mensaje enviado
tracker.messageSent('u_123', 'welcome_email');

// Feature usada
tracker.featureUsed('u_123', 'export_pdf', { count: 5 });
```

## Eventos Personalizados

```typescript
tracker.track('mi_evento_custom', {
  campo1: 'valor1',
  campo2: 123,
  metadata: { ... }
}, {
  userId: 'u_123',
  email: 'user@email.com',
  sessionId: 'sess_456'
});
```

## Eventos Recomendados

Implementa estos eventos para obtener el máximo valor:

| Evento | Cuándo enviar | Datos útiles |
|--------|---------------|--------------|
| `user_registered` | Nuevo registro | email, plan, fuente |
| `user_login` | Cada login | device, location |
| `plan_created` | Nueva suscripción | plan_type, amount, billing |
| `payment_done` | Pago exitoso | amount, currency, method |
| `payment_failed` | Pago fallido | reason, retry_count |
| `message_sent` | Mensaje/alerta enviada | message_type, channel |
| `feature_used` | Función utilizada | feature_name, duration |
| `data_exported` | Exportación de datos | format, records_count |
| `settings_changed` | Configuración modificada | setting_key, old_value |

## Métodos Avanzados

### Flush manual

```typescript
// Enviar eventos pendientes inmediatamente
await tracker.flush();
```

### Ver eventos pendientes

```typescript
const pending = tracker.getQueueSize();
console.log(`Eventos pendientes: ${pending}`);
```

### Destruir tracker

```typescript
// Limpia recursos y envía eventos pendientes
tracker.destroy();
```

## Ejemplos por Framework

### React / Next.js

```typescript
// lib/tracker.ts
import { SilxarTracker } from '@silxar/tracker';

export const tracker = new SilxarTracker({
  apiKey: process.env.NEXT_PUBLIC_SILXAR_API_KEY!,
  crmId: 'mi_crm',
  batch: true,
});

// pages/register.tsx
import { tracker } from '@/lib/tracker';

function handleRegister(user: User) {
  // ... lógica de registro ...
  
  tracker.userRegistered(user.id, user.email, {
    plan: user.plan,
    source: 'organic'
  });
}
```

### Express.js (Backend)

```typescript
import { SilxarTracker } from '@silxar/tracker';

const tracker = new SilxarTracker({
  apiKey: process.env.SILXAR_API_KEY!,
  batch: false  // Enviar inmediatamente en backend
});

app.post('/register', async (req, res) => {
  const user = await createUser(req.body);
  
  tracker.userRegistered(user.id, user.email);
  
  res.json({ success: true });
});
```

### Vanilla JavaScript

```html
<script type="module">
  import { SilxarTracker } from 'https://unpkg.com/@silxar/tracker@latest/dist/index.js';
  
  const tracker = new SilxarTracker({
    apiKey: 'sk_xxx'
  });
  
  document.getElementById('register').addEventListener('click', () => {
    tracker.track('button_clicked', { button: 'register' });
  });
</script>
```

## API del Endpoint

Si prefieres usar el endpoint directamente sin el SDK:

```bash
curl -X POST https://api.silxar.com/events \
  -H "Authorization: Bearer sk_tu_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "user_registered",
    "crm_id": "mi_crm",
    "timestamp": "2026-04-09T10:00:00Z",
    "event_id": "unique_id_para_deduplicacion",
    "user_id": "u_123",
    "email": "user@email.com",
    "data": {
      "plan": "premium",
      "source": "google_ads"
    }
  }'
```

### Batch (múltiples eventos)

```bash
curl -X POST https://api.silxar.com/events/batch \
  -H "Authorization: Bearer sk_tu_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "events": [
      { "event": "user_registered", "data": {...} },
      { "event": "payment_done", "data": {...} }
    ]
  }'
```

## Respuestas HTTP

| Código | Significado |
|--------|-------------|
| 202 Accepted | Evento recibido y procesándose |
| 400 Bad Request | Datos inválidos |
| 401 Unauthorized | API Key inválida |
| 429 Too Many Requests | Rate limit excedido |

## Mejores Prácticas

1. **Usa event_id para deduplicación**: Genera IDs únicos para evitar contar el mismo evento 2 veces.

2. **No bloquees el hilo principal**: El SDK envía eventos asíncronamente por defecto.

3. **Maneja errores gracefully**: El SDK reintenta automáticamente, pero no dependas de él para lógica crítica.

4. **No envíes PII sensible**: Evita enviar contraseñas, tokens, o datos financieros sensibles.

5. **Usa batch en producción**: Reduce llamadas HTTP y mejora el rendimiento.

## Obtener API Key

1. Accede a tu dashboard en [https://app.silxar.com](https://app.silxar.com)
2. Ve a Configuración > API Keys
3. Genera una nueva key para tu CRM

## Soporte

- Documentación: [https://docs.silxar.com/tracker](https://docs.silxar.com/tracker)
- Soporte: soporte@silxar.com
- Issues: [GitHub Issues](https://github.com/silxar/crm-maestro/issues)

## Licencia

MIT © Silxar
