# Guia de Grabacion de Llamadas con Click-to-Call

> **Alcance:** Solo para uso interno de mejora (tu y tu socio).  
> **Privacidad:** Nadie mas accede a estas grabaciones.  
> **Legal:** En Espana se debe informar al interlocutor de que la llamada se graba.

---

## 1. El Problema: Click-to-Call Basico

Cuando usas `tel:+34600123456` desde el CRM, la llamada ocurre **fuera del navegador**:

- En **movil**: se abre la app de telefono nativa
- En **PC**: se abre el softphone o app de telefono configurada

El navegador **no tiene acceso** a la llamada. No puede grabarla, ni saber cuando empieza ni cuando termina.

Por eso necesitas una solucion **externa** que grabe la llamada y luego suba el archivo al CRM.

---

## 2. Opciones Disponibles

### Opcion A: Softphone en PC con Grabacion Automatica (Recomendada)

Usas un programa de telefono en el ordenador que grabe automaticamente cada llamada. Luego un script pequeno sube los archivos al CRM.

**Proveedores de telefonia:**

| Proveedor | Coste/min | Grabacion | Numero ES | Setup |
|-----------|-----------|-----------|-----------|-------|
| **Zadarma** | ~0.018 EUR | Incluida | Si | 15 min |
| **Plivo** | ~0.028 EUR | 0.0025 USD/min | Si | 30 min |
| **Twilio** | ~0.036 EUR | 0.0025 USD/min | No | 30 min |

**Softphones recomendados:**

| Softphone | Sistema | Grabacion | Precio | Dificultad |
|-----------|---------|-----------|--------|------------|
| **Zoiper** | Windows/Mac/Linux | Si (Pro) | 49 EUR una vez | Facil |
| **MicroSIP** | Windows | Si (plugin) | Gratis | Media |
| **3CX** | Windows/Mac | Si (nativa) | Gratis (hasta 10 usuarios) | Media |
| **Linphone** | Todas | Manual | Gratis | Alta |

**Coste estimado mensual (Zadarma + Zoiper):**
- Llamadas: ~32 EUR (600 llamadas x 3 min a movil)
- Numeros DID (x2): ~6 EUR
- Zoiper Pro: 49 EUR una vez
- **Total: ~38 EUR/mes + 49 EUR una vez**

---

### Opcion B: Proveedor VoIP con API de Grabacion (Mas Integrada)

En vez de `tel:`, integras la llamada via API. El proveedor graba automaticamente y te da una URL del archivo.

**Flujo:**

```
Click en "Llamar"
  |
  v
Backend llama a API del proveedor (Plivo/Twilio)
  |
  v
Proveedor llama a tu telefono primero, luego al lead
  |
  v
Proveedor graba toda la conversacion
  |
  v
Cuando cuelgas, el proveedor sube el MP3 a tu servidor
  |
  v
Backend guarda la URL de la grabacion en el historial del lead
```

**Ventajas:**
- Todo automatico. Cero trabajo manual.
- La grabacion se asocia directamente al lead en el CRM.
- No necesitas softphone. Funciona con cualquier telefono.

**Desventajas:**
- Requiere 1-2 dias de desarrollo.
- Coste de grabacion: ~4.5 EUR/mes adicional.

**Coste estimado mensual (Plivo):**
- Llamadas: ~50 EUR
- Numeros DID (x2): ~8 EUR
- Grabacion (1.800 min): ~4.5 EUR
- **Total: ~62 EUR/mes**

---

### Opcion C: App de Android con Grabacion + Subida

Si haceis las llamadas desde movil, usais una app que grabe y suba automaticamente.

**Apps de grabacion:**

| App | Precio | Subida automatica | Notas |
|-----|--------|-------------------|-------|
| **Cube ACR** | Gratis / 6 EUR/año | Google Drive, Dropbox | Muy popular |
| **Call Recorder - ACR** | Gratis | Google Drive, FTP | Open source |
| **TapeACall** | 10 EUR/año | iCloud | Solo iOS |

**Flujo:**
1. App graba la llamada automaticamente
2. Al terminar, sube el MP3 a Google Drive
3. Script lee Google Drive periodicamente y sube al CRM
4. Asocia al lead por numero de telefono + fecha/hora

**Coste:**
- App: ~0-10 EUR/año
- Infraestructura: 0 EUR
- **Total: casi gratis**

**Desventajas:**
- Muy manual / fragil (depende de la app, del movil, de Google Drive)
- iOS es muy restrictivo con grabacion de llamadas
- Dificil automatizar la asociacion lead -> grabacion
- Android 10+ bloquea grabacion de llamadas en muchos dispositivos

---

## 3. Mi Recomendacion: Softphone en PC (Opcion A)

Para 2 personas haciendo llamadas comerciales desde un CRM, la opcion mas equilibrada es:

**Zadarma + Zoiper Pro en PC**

### Por que:
1. **Barato**: ~38 EUR/mes en total
2. **Simple**: Configuras 2 cuentas SIP, instalas Zoiper, y listo
3. **Grabacion automatica**: Zoiper Pro graba todas las llamadas a una carpeta
4. **Privado**: Los archivos estan en vuestros PCs, no en servidores de terceros
5. **Sin desarrollo complejo**: No hace falta tocar el backend
6. **Escalable**: Si luego quereis mas integracion, podeis migrar a la Opcion B sin problema

---

## 4. Setup Paso a Paso (Opcion A)

### Paso 1: Crear cuenta en Zadarma
1. Entra en [zadarma.com](https://zadarma.com)
2. Crea cuenta y verifica identidad
3. Contrata 2 numeros DID espanoles (~3 EUR/mes cada uno)
4. Recarga saldo (~20 EUR para empezar)

### Paso 2: Crear extensiones SIP
1. En el panel de Zadarma, ve a "Extensiones / SIP"
2. Crea 2 extensiones (una para ti, otra para tu socio)
3. Anota: servidor SIP, usuario, contrasena

### Paso 3: Instalar y configurar Zoiper
1. Descarga [Zoiper](https://www.zoiper.com) (version Pro para grabacion)
2. Configura la cuenta SIP con los datos de Zadarma
3. En preferencias -> **Grabacion**:
   - Activar "Grabar todas las llamadas automaticamente"
   - Seleccionar carpeta: `C:\Llamadas\`
   - Formato: MP3
   - Calidad: 32 kbps (suficiente para voz, archivo pequeno)

### Paso 4: Enlazar numero DID con extension
1. En Zadarma: ir a "Numeros" -> "Reglas de entrada"
2. Asigna cada numero DID a su extension SIP
3. Ahora cuando llamen a tu numero, suena en tu Zoiper

### Paso 5: Script de subida al CRM (opcional)

Si quereis que las grabaciones aparezcan en el CRM, podeis usar este script de Python que corre cada hora:

```python
# upload_calls.py - Script de ejemplo
import os
import glob
import requests
from datetime import datetime

CRM_API = "http://localhost:5000/api/leads/historial"
CRM_TOKEN = "tu_token_aqui"
CALLS_FOLDER = "C:\\Llamadas\\"

def parse_filename(filename):
    # Zoiper nombra los archivos: YYYY-MM-DD_HH-MM-SS_600123456.mp3
    basename = os.path.basename(filename)
    parts = basename.replace('.mp3', '').split('_')
    if len(parts) >= 3:
        date_str = f"{parts[0]} {parts[1].replace('-', ':')}"
        phone = parts[2] if len(parts) > 2 else None
        return datetime.strptime(date_str, "%Y-%m-%d %H:%M:%S"), phone
    return None, None

def upload_call(filepath):
    dt, phone = parse_filename(filepath)
    if not phone:
        return
    
    # Buscar lead por telefono en la base de datos
    # (esto requiere endpoint en el backend)
    
    # O simplemente guardar en carpeta compartida:
    print(f"Subiendo {filepath} - Telefono: {phone} - Fecha: {dt}")
    
    # Subir archivo a tu servidor
    with open(filepath, 'rb') as f:
        files = {'audio': f}
        data = {
            'telefono': phone,
            'fecha': dt.isoformat() if dt else None,
            'tipo': 'grabacion_llamada'
        }
        headers = {'Authorization': f'Bearer {CRM_TOKEN}'}
        # requests.post(CRM_API, files=files, data=data, headers=headers)

# Procesar archivos nuevos
for filepath in glob.glob(os.path.join(CALLS_FOLDER, "*.mp3")):
    upload_call(filepath)
```

**Programar en Windows:**
1. Abrir "Programador de tareas"
2. Crear tarea que ejecute `python upload_calls.py` cada hora
3. O cada noche a las 20:00

---

## 5. Setup Paso a Paso (Opcion B - Recomendada a Largo Plazo)

Si preferis todo integrado en el CRM:

### Arquitectura Tecnica

**Backend - Nuevo endpoint:**
```typescript
// backend/src/routes/leads.ts

// POST /api/leads/:id/llamar
router.post('/:id/llamar', async (req, res) => {
  const lead = await getLeadById(req.params.id);
  
  // Llamar a Plivo/Twilio para iniciar click-to-dial
  const call = await plivoClient.calls.create({
    from: '+34900123456',  // tu numero DID
    to: '+34600123456',     // telefono del agente (PRIMERO)
    answer_url: 'https://tudominio.com/plivo/bridge',
    answer_method: 'POST',
    hangup_url: 'https://tudominio.com/plivo/hangup',
    hangup_method: 'POST',
    record: true,
    record_url: 'https://tudominio.com/plivo/recording',
  });
  
  res.json({ success: true, callId: call.callUuid });
});
```

**Webhook - Bridge (conectar agente con lead):**
```xml
<!-- Cuando el agente descuelga, Plivo pide instrucciones -->
<Response>
  <Speak>Conectando con el lead...</Speak>
  <Dial callbackUrl="https://tudominio.com/plivo/dial-status">
    <Number>+34600123456</Number>
  </Dial>
</Response>
```

**Webhook - Grabacion recibida:**
```typescript
// POST /plivo/recording
router.post('/plivo/recording', async (req, res) => {
  const { RecordingUrl, From, To, CallUUID } = req.body;
  
  // Guardar URL de grabacion en el historial del lead
  await prisma.leadHistorial.create({
    data: {
      leadId: leadId,
      tipo: 'llamada',
      descripcion: `Llamada grabada (${duration} seg)`,
      // Guardar URL de la grabacion en metadata
    }
  });
  
  res.sendStatus(200);
});
```

**Frontend - Boton de llamar:**
```tsx
<button
  onClick={async () => {
    setLlamando(true);
    await apiClient.llamarLead(lead.id);
    // El telefono del agente suena enseguida
  }}
  disabled={llamando}
>
  {llamando ? 'Llamando...' : 'Llamar'}
</button>
```

**Estimacion de desarrollo:**
- Backend (endpoints + webhooks): 4-6 horas
- Frontend (boton + estado): 1-2 horas
- Testing: 2 horas
- **Total: ~1 dia de trabajo**

---

## 6. Consideraciones Legales en Espana

### Informar al interlocutor

En Espana, la grabacion de llamadas comerciales requiere **informar** al destinatario. No necesariamente su consentimiento expreso, pero si que se le avisa.

**Mensaje recomendado (al inicio de la llamada):**

> "Le informamos de que esta llamada esta siendo grabada con fines de calidad y mejora de nuestro servicio."

**Como implementarlo:**

- **Opcion A (Zoiper/Zadarma)**: Configurar un mensaje automatico en la centralita que suene al descolgar.
- **Opcion B (API Plivo/Twilio)**: Añadir `<Speak>` al inicio del XML de bridge.

### Proteccion de datos (LOPD/GDPR)

- **Finalidad legitima**: Mejora de la calidad comercial (base legal: interes legitimo)
- **Plazo de conservacion**: Recomendable 6-12 meses, luego borrar
- **Acceso**: Solo tu y tu socio (responsables del tratamiento)
- **Derecho de oposicion**: Si alguien pide que no se le grabe, debes poder excluirlo

### Implementacion practica de privacidad

```typescript
// En el modelo Lead, anadir:
model Lead {
  // ... campos existentes ...
  noGrabar Boolean @default(false)  // Opt-out de grabacion
}

// Antes de iniciar grabacion:
if (lead.noGrabar) {
  callConfig.record = false;
}
```

---

## 7. Comparativa de Espacio de Almacenamiento

| Duracion | Tamaño MP3 (32kbps) | Tamaño MP3 (64kbps) |
|----------|---------------------|---------------------|
| 1 minuto | ~240 KB | ~480 KB |
| 3 minutos (media) | ~720 KB | ~1.4 MB |
| 600 llamadas/mes | ~432 MB | ~864 MB |
| 1 año | ~5.2 GB | ~10.4 GB |

**Coste de almacenamiento:**
- Disco duro local: 0 EUR
- Google Drive (15 GB gratis): 0 EUR (durante ~2.5 años)
- Servidor propio: insignificante

---

## 8. Recomendacion Final

### Para empezar YA (esta semana):
1. Implementa `tel:` links en el CRM (5 minutos)
2. Baja Zoiper + crea cuenta Zadarma (30 minutos)
3. Configura grabacion automatica (15 minutos)
4. **Coste: ~38 EUR/mes. Setup: 1 hora.**

### Para integrar en el CRM (proximo sprint):
1. Desarrolla la Opcion B con Plivo
2. Boton "Llamar" que inicia click-to-dial
3. Grabacion automatica vinculada al lead
4. **Coste: ~62 EUR/mes. Desarrollo: 1 dia.**

### Tabla de decision:

| Si quieres... | Elige | Tiempo | Coste/mes |
|---------------|-------|--------|-----------|
| Empezar hoy sin desarrollo | Zoiper + Zadarma | 1 hora | 38 EUR |
| Todo integrado en el CRM | Plivo API | 1 dia | 62 EUR |
| Llamar solo desde movil | App Android + Drive | 2 horas | 0 EUR |
| Maxima calidad + features | Twilio + numero ES externo | 1-2 dias | 66 EUR |

---

## 9. Notas Finales

- **Las grabaciones son solo para aprender y mejorar**. Nunca las uses para otro proposito.
- **Borra periodicamente**. No acumules anos de grabaciones sin necesidad.
- **Se transparente**. Si algun lead pregunta, explica que es para mejora interna.
- **Considera preguntar feedback**. A veces un simple "le parecio util la llamada?" aporta mas que 100 grabaciones.

**600 llamadas/mes a 38-62 EUR es una inversion minima para el valor que aporta saber que funciona y que no en vuestras llamadas comerciales.**
