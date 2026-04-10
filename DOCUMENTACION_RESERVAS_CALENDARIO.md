# 📅 Reservas de Citas en Calendario

## ¿Cómo funciona?

Cuando alguien reserva una cita desde uno de tus softwares (entrenadores, nutrición, etc.), la reserva aparece automáticamente en el calendario del CRM.

## Flujo de Datos

```
Usuario reserva cita
      ↓
Tu software envía webhook POST /webhooks/{saas}
      ↓
Backend recibe evento 'reserva_cita'
      ↓
Se crea evento automático en el calendario
      ↓
Aparece en /dashboard/calendario
```

## Formato del Webhook

### Endpoint
```
POST https://tu-crm.com/webhooks/{nombre_saas}
```

### Headers Requeridos
```
Content-Type: application/json
X-Webhook-Signature: {signature}
```

### Body
```json
{
  "event": "reserva_cita",
  "saas": "entrenadores",
  "timestamp": "2026-04-15T10:00:00Z",
  "webhook_id": "wh_abc123def456",
  "data": {
    "cliente": {
      "email": "cliente@email.com",
      "nombre": "Juan García",
      "telefono": "+34612345678",
      "pais": "España"
    },
    "reserva": {
      "fecha": "2026-04-20T15:30:00Z",
      "duracion_minutos": 60,
      "motivo": "Consulta inicial",
      "notas": "Primera sesión de valoración",
      "ubicacion": "online"
    },
    "metadata": {
      "fuente": "booking_widget",
      "dispositivo": "mobile",
      "navegador": "Chrome",
      "ip": "192.168.1.1",
      "user_agent": "Mozilla/5.0..."
    }
  }
}
```

## Campos de la Reserva

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `event` | string | ✅ | Siempre `"reserva_cita"` |
| `data.cliente.email` | string | ✅ | Email del cliente |
| `data.cliente.nombre` | string | ✅ | Nombre completo |
| `data.cliente.telefono` | string | ❌ | Teléfono de contacto |
| `data.reserva.fecha` | string | ✅ | Fecha y hora ISO 8601 |
| `data.reserva.duracion_minutos` | number | ✅ | Duración de la cita |
| `data.reserva.motivo` | string | ❌ | Título/motivo de la cita |
| `data.reserva.notas` | string | ❌ | Notas adicionales |
| `data.reserva.ubicacion` | string | ❌ | "online", "oficina", o dirección |

## Ejemplos por Tipo de Software

### CRM de Entrenadores
```json
{
  "event": "reserva_cita",
  "saas": "entrenadores",
  "data": {
    "cliente": {
      "email": "maria@email.com",
      "nombre": "María López",
      "telefono": "+34611222333"
    },
    "reserva": {
      "fecha": "2026-04-20T09:00:00Z",
      "duracion_minutos": 90,
      "motivo": "Primera sesión personalizada",
      "notas": "Quiere perder 5kg, tiene experiencia previa",
      "ubicacion": "Gimnasio Central"
    }
  }
}
```

### CRM de Nutrición
```json
{
  "event": "reserva_cita",
  "saas": "nutricion",
  "data": {
    "cliente": {
      "email": "carlos@email.com",
      "nombre": "Carlos Ruiz"
    },
    "reserva": {
      "fecha": "2026-04-22T16:00:00Z",
      "duracion_minutos": 45,
      "motivo": "Consulta nutricional",
      "notas": "Vegetariano, busca ganar masa muscular",
      "ubicacion": "online"
    }
  }
}
```

### Fisioterapia / Wellness
```json
{
  "event": "reserva_cita",
  "saas": "fisioterapia",
  "data": {
    "cliente": {
      "email": "ana@email.com",
      "nombre": "Ana Martínez",
      "telefono": "+34699888777"
    },
    "reserva": {
      "fecha": "2026-04-21T11:30:00Z",
      "duracion_minutos": 60,
      "motivo": "Recuperación lesion rodilla",
      "notas": "Trae informe médico",
      "ubicacion": "Clínica Principal"
    }
  }
}
```

## Cómo se ve en el Calendario

### Información que aparece:
- **Título**: El motivo de la cita o "Reserva - Nombre del Cliente"
- **Hora**: Fecha y hora de inicio y fin (calculado automáticamente)
- **Descripción**: Incluye:
  - 👤 Nombre del cliente
  - 📧 Email
  - 📞 Teléfono (si se proporcionó)
  - 🖥️ Software de origen
  - ⏱️ Duración
  - 📍 Ubicación
  - 📝 Notas adicionales
  - ID del webhook (para referencia)

### Color del Evento
El color se asigna automáticamente según el SaaS:
- `entrenadores` → 🔵 Azul
- `nutricion` → 🟢 Verde
- Otros → 🟣 Púrpura

### Asignación
Las reservas se asignan automáticamente a **"ambos"** socios para que ambos lo vean.

## Código de Ejemplo (JavaScript/TypeScript)

### En tu CRM Cliente
```typescript
async function enviarReservaCita(datosReserva: any) {
  const webhookUrl = 'https://api.tu-crm.com/webhooks/entrenadores';
  const webhookSecret = 'whsec_tu_secreto';

  const payload = {
    event: 'reserva_cita',
    saas: 'entrenadores',
    timestamp: new Date().toISOString(),
    webhook_id: `reserva_${Date.now()}`,
    data: {
      cliente: {
        email: datosReserva.email,
        nombre: datosReserva.nombre,
        telefono: datosReserva.telefono,
      },
      reserva: {
        fecha: datosReserva.fecha.toISOString(),
        duracion_minutos: datosReserva.duracion,
        motivo: datosReserva.motivo,
        notas: datosReserva.notas,
        ubicacion: datosReserva.ubicacion,
      },
      metadata: {
        fuente: 'booking_widget',
        dispositivo: 'web',
        navegador: navigator.userAgent,
        ip: await obtenerIP(),
        user_agent: navigator.userAgent,
      },
    },
  };

  // Generar firma
  const firma = generarFirmaWebhook(payload, webhookSecret);

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Webhook-Signature': firma,
    },
    body: JSON.stringify(payload),
  });

  if (response.ok) {
    console.log('✅ Reserva enviada al calendario');
  } else {
    console.error('❌ Error enviando reserva:', await response.text());
  }
}

// Función auxiliar para generar firma
function generarFirmaWebhook(payload: any, secret: string): string {
  const crypto = require('crypto');
  const payloadString = JSON.stringify(payload);
  return crypto
    .createHmac('sha256', secret)
    .update(payloadString)
    .digest('hex');
}
```

### Formulario de Reserva HTML
```html
<form id="form-reserva" onsubmit="handleSubmit(event)">
  <input type="text" name="nombre" placeholder="Nombre completo" required />
  <input type="email" name="email" placeholder="Email" required />
  <input type="tel" name="telefono" placeholder="Teléfono" />
  
  <input type="datetime-local" name="fecha" required />
  
  <select name="duracion" required>
    <option value="30">30 minutos</option>
    <option value="60" selected>1 hora</option>
    <option value="90">1 hora 30 min</option>
    <option value="120">2 horas</option>
  </select>
  
  <input type="text" name="motivo" placeholder="Motivo de la consulta" />
  <textarea name="notas" placeholder="Notas adicionales"></textarea>
  
  <select name="ubicacion">
    <option value="online">Videollamada</option>
    <option value="oficina">Oficina Central</option>
  </select>
  
  <button type="submit">Reservar Cita</button>
</form>

<script>
async function handleSubmit(e) {
  e.preventDefault();
  const formData = new FormData(e.target);
  
  await enviarReservaCita({
    nombre: formData.get('nombre'),
    email: formData.get('email'),
    telefono: formData.get('telefono'),
    fecha: new Date(formData.get('fecha')),
    duracion: parseInt(formData.get('duracion')),
    motivo: formData.get('motivo'),
    notas: formData.get('notas'),
    ubicacion: formData.get('ubicacion'),
  });
}
</script>
```

## Respuestas del Webhook

### Éxito
```json
{
  "success": true,
  "status": "processed",
  "data": {
    "cliente_id": 123,
    "evento_id": 456,
    "evento_calendario_id": "cl_abc123"
  }
}
```

### Error
```json
{
  "error": "Firma inválida",
  "retry": false
}
```

## Notas Importantes

1. **Hora**: Las fechas deben enviarse en formato UTC (ISO 8601). El calendario las mostrará en tu zona horaria local.

2. **ID único**: Cada webhook debe tener un `webhook_id` único. Esto permite rastrear la reserva en caso de problemas.

3. **Actualizaciones**: Si necesitas modificar una reserva existente, envía un nuevo webhook con el mismo `webhook_id` y el sistema actualizará el evento en el calendario.

4. **Cancelaciones**: Para cancelar, envía un webhook con evento `cancelacion` y se eliminará el evento del calendario.

5. **Notificaciones**: Las reservas generan notificaciones push automáticamente para ambos socios.

## Testing

### Prueba con cURL
```bash
curl -X POST https://api.tu-crm.com/webhooks/entrenadores \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: tu_firma_aqui" \
  -d '{
    "event": "reserva_cita",
    "saas": "entrenadores",
    "timestamp": "2026-04-15T10:00:00Z",
    "webhook_id": "test_123",
    "data": {
      "cliente": {
        "email": "test@test.com",
        "nombre": "Test User"
      },
      "reserva": {
        "fecha": "2026-04-20T15:00:00Z",
        "duracion_minutos": 60,
        "motivo": "Test de reserva"
      },
      "metadata": {
        "fuente": "test",
        "dispositivo": "test",
        "navegador": "test",
        "ip": "127.0.0.1",
        "user_agent": "test"
      }
    }
  }'
```

## Solución de Problemas

### La reserva no aparece en el calendario
1. Verifica que el webhook responda 200
2. Revisa los logs del backend
3. Confirma que `data.reserva.fecha` sea una fecha válida en el futuro
4. Verifica que el `event` sea exactamente `"reserva_cita"`

### La hora es incorrecta
- Asegúrate de enviar la fecha en formato ISO 8601 UTC
- Ejemplo correcto: `"2026-04-20T15:30:00Z"`
- El sistema convierte automáticamente a tu zona horaria local

### No se envía el webhook
- Verifica que la firma (signature) sea correcta
- Confirma que el `saas` coincida con el configurado en tu webhook
- Revisa que la URL del webhook sea correcta
