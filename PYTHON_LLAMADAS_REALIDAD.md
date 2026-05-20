# Realidad Tecnica: Python y las Llamadas desde `tel:`

## La respuesta corta

**No es posible.** Una herramienta Python no puede "recibir" una llamada que se inicia desde un `tel:` link.

`tel:+34600123456` no es una API. Es solo un enlace que le dice al sistema operativo: "abre la app de telefono".

```
Usuario hace clic en tel:+34600123456
          |
          v
   Navegador: "Ey OS, abre el telefono"
          |
          v
   Sistema Operativo abre la app nativa
          |
          v
   La llamada va directamente por la red
   de tu operadora (Movistar/Vodafone/etc)
          |
          v
   EL SERVIDOR Y PYTHON NO VEN NADA
```

Desde que el usuario hace clic hasta que cuelga, **tu servidor Python es ciego**. No sabe que se llamo, cuando empezo, cuando termino, ni puede escuchar nada.

---

## Por que no funciona

| Lo que piensas | Lo que realmente pasa |
|----------------|----------------------|
| "Python recibe la llamada" | Python no recibe nada. El `tel:` es un enlace, no una API |
| "Python escucha el audio" | El audio viaja por la red movil/fija, no por tu servidor |
| "Python sabe cuando empieza" | El navegador no emite ningun evento de "llamada iniciada" |
| "Python sabe cuando termina" | El navegador no sabe cuando cuelgas. El softphone/sistema si, pero no te lo dice |
| "Subo la grabacion al CRM" | No hay grabacion. Solo hay una llamada normal por la red de tu operadora |

**Es como si quisieras que Python escuche una conversacion que dos personas tienen en la calle.** Imposible a menos que uno de los dos use un microfono conectado a tu ordenador.

---

## Pero entonces, que SI puede hacer Python?

Python SI puede hacer la llamada por ti. En vez de que el usuario llame desde su telefono, **Python llama desde un servidor**.

Es decir: **reemplazas el `tel:` link por un boton que llama a tu API**.

```
Usuario hace clic en "Llamar" en el CRM
          |
          v
   Frontend: POST /api/leads/123/llamar
          |
          v
   Backend Python recibe la peticion
          |
          v
   Python llama a API de Twilio/Plivo/Zadarma:
   "Llama primero al agente, luego al lead"
          |
          v
   Twilio hace la llamada real
   Y graba todo
          |
          v
   Twilio sube el audio a tu servidor
   via webhook POST
          |
          v
   Python guarda el MP3 en el CRM
```

Ahi Python SI esta en control. Ahi SI puede grabar. Ahi SI puede subir.

Pero ya no es "recibir el tel: link". Es **reemplazarlo por un sistema VoIP completo**.

---

## Opciones reales que puedes hacer

### Opcion A: Backend Python + API de Twilio/Plivo (La realista)

Tu backend Python no "recibe" la llamada. La **inicia**.

**Codigo en Python (FastAPI/Flask):**

```python
from fastapi import APIRouter, Request
import httpx

router = APIRouter()

PLIVO_AUTH_ID = "tu_auth_id"
PLIVO_AUTH_TOKEN = "tu_token"

@router.post("/api/leads/{lead_id}/llamar")
async def llamar_lead(lead_id: str, request: Request):
    # 1. Obtener datos del lead
    lead = await get_lead_by_id(lead_id)
    agente = await get_agente_actual(request)
    
    # 2. Llamar al agente primero (click-to-dial)
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"https://api.plivo.com/v1/Account/{PLIVO_AUTH_ID}/Call/",
            auth=(PLIVO_AUTH_ID, PLIVO_AUTH_TOKEN),
            json={
                "from": "+34900123456",  # Tu numero
                "to": agente.telefono,    # Telefono del agente
                "answer_url": "https://tudominio.com/webhooks/plivo/bridge",
                "hangup_url": "https://tudominio.com/webhooks/plivo/hangup",
                "record": True,
                "record_url": "https://tudominio.com/webhooks/plivo/recording",
            }
        )
    
    return {"success": True, "message": "Llamando al agente..."}
```

**Coste:** ~62 EUR/mes (como ya calculamos)
**Desarrollo:** 1 dia
**Python hace:** Inicia la llamada, recibe el webhook de grabacion, guarda en DB

---

### Opcion B: Script Python local que monitorea archivos

No "recibe" el tel: link. Pero **ve lo que deja atras**.

Instalas un softphone (Zoiper) que grabe automaticamente. Configuras la carpeta de grabaciones.

Un script Python corre en tu PC y cada hora:
1. Mira si hay nuevos archivos MP3 en `C:\Llamadas\`
2. Sube los archivos a tu servidor
3. Los asocia al lead por numero de telefono

```python
# script_local.py - Corre en tu PC, no en el servidor
import os
import glob
import requests
from datetime import datetime

WATCH_FOLDER = "C:\\Llamadas\\"
CRM_API = "https://tu-crm.com/api/leads/grabacion"
TOKEN = "tu_token"

def subir_grabacion(filepath):
    # Extraer telefono del nombre del archivo
    # Ejemplo: 2024-01-15_14-30-22_+34600123456.mp3
    filename = os.path.basename(filepath)
    
    # Buscar numero de telefono en el filename
    import re
    match = re.search(r'(\+?\d{9,15})', filename)
    if not match:
        return
    
    telefono = match.group(1)
    
    # Subir al CRM
    with open(filepath, 'rb') as f:
        files = {'audio': (filename, f, 'audio/mpeg')}
        data = {'telefono': telefono, 'fecha': datetime.now().isoformat()}
        headers = {'Authorization': f'Bearer {TOKEN}'}
        
        r = requests.post(CRM_API, files=files, data=data, headers=headers)
        
        if r.status_code == 200:
            os.remove(filepath)  # Borrar local
            print(f"Subido: {telefono}")
        else:
            print(f"Error subiendo: {r.text}")

# Correr cada hora
for filepath in glob.glob(os.path.join(WATCH_FOLDER, "*.mp3")):
    subir_grabacion(filepath)
```

**Coste:** ~38 EUR/mes (Zadarma + Zoiper)
**Desarrollo:** 2-3 horas
**Python hace:** Mira archivos locales y los sube. No tiene nada que ver con el `tel:` link.

---

### Opcion C: Softphone completo en Python (La mas compleja)

Haces un programa Python que SEA el telefono. Un softphone completo.

Usas librerias como:
- **PJSIP** (via `pjsua` bindings)
- **Linphone** (bindings de Python)
- **`aiortc`** o **`twisted.protocols.sip`**

```python
# Concepto. Esto es MUY simplificado.
# Un softphone real requiere miles de lineas de codigo.

import asyncio
from pjsua import Lib, UAConfig, MediaConfig

lib = Lib()
lib.init(ua_config=UAConfig())
lib.create_transport(pjsua.TransportType.UDP, pjsua.TransportConfig(5060))
lib.start()

# Registrar cuenta SIP
cfg = pjsua.AccountConfig("sip.zadarma.com", "usuario", "password")
acc = lib.create_account(cfg)

# Hacer llamada
call = acc.make_call("sip:+34600123456@sip.zadarma.com")

# Grabar audio
# ... aqui necesitas manejar los streams de audio
# ... capturar el audio raw
# ... codificar a MP3
# ... guardar a disco
```

**Problemas de esta opcion:**
- Un softphone funcional es un proyecto de **meses**, no horas
- Manejo de codecs, NAT, STUN, RTP, jitter buffer, ecualizacion, eco
- Interfaz grafica (o al menos CLI usable)
- Diferentes sistemas operativos
- **No vale la pena reinventar la rueda.** Zoiper/MicroSIP ya existen y funcionan.

**Veredicto:** Descartable. No hagas esto.

---

### Opcion D: Extension del navegador (WebRTC)

Usar la API `getUserMedia()` del navegador para capturar microfono + WebRTC para hacer la llamada SIP directamente desde el navegador.

```javascript
// Frontend
const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
// Usar libreria como JsSIP para conectar via WebRTC
// JsSIP conecta via WebSocket a un servidor SIP
```

**Problemas:**
- WebRTC + SIP es complejo
- Necesitas un servidor SIP/WebSocket (Kamailio, Asterisk, etc.)
- Calidad de audio depende del microfono del PC
- El agente debe estar en el PC con cascos

**Veredicto:** Demasiado complejo para 2 personas.

---

## Mi recomendacion honesta

Para 2 personas y 600 llamadas/mes, **no inventes nada**.

| Si quieres... | Haz esto | No hagas esto |
|---------------|----------|---------------|
| Empezar ya, barato, sin dev | Zoiper + Zadarma + grabacion local | Script Python que "intercepte" tel: (imposible) |
| Todo integrado en el CRM | Plivo/Twilio API + backend Python | Softphone en Python (meses de trabajo) |
| Llamar desde el navegador | JsSIP + WebRTC (complejo) | Esperar que Python escuche tu telefono |

**La verdad sobre Python:**

Python no puede:
- Ver llamadas hechas desde tu telefono movil
- Escuchar audio que viaja por la red de Movistar/Vodafone
- Saber cuando alguien hace clic en `tel:`

Python puede:
- Llamar a una API de Twilio/Plivo para **iniciar** una llamada
- Recibir un webhook con la grabacion cuando la llamada termina
- Guardar el MP3 en tu base de datos

**El `tel:` link y la llamada VoIP son dos mundos diferentes.**

- `tel:` = llamada tradicional por la red telefonica
- VoIP API = llamada por internet controlada por software

Si quieres que Python grabe y suba, tienes que dejar de usar `tel:` y empezar a usar una **API de VoIP**.

---

## Codigo listo para usar (Opcion A realista)

Si decides ir por la via de la API (que es la unica donde Python realmente controla todo), aqui tienes un ejemplo funcional con Plivo:

```python
# backend/src/services/callService.py
import httpx
from datetime import datetime
from prisma import prisma

PLIVO_AUTH_ID = "tu_auth_id"
PLIVO_AUTH_TOKEN = "tu_auth_token"
PLIVO_NUMBER = "+34900123456"  # Tu numero DID

async def iniciar_llamada(lead_id: str, agente_telefono: str, lead_telefono: str):
    """Inicia click-to-dial: primero llama al agente, luego al lead."""
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"https://api.plivo.com/v1/Account/{PLIVO_AUTH_ID}/Call/",
            auth=(PLIVO_AUTH_ID, PLIVO_AUTH_TOKEN),
            json={
                "from": PLIVO_NUMBER,
                "to": agente_telefono,
                "answer_url": "https://tu-crm.com/webhooks/plivo/bridge",
                "answer_method": "POST",
                "hangup_url": "https://tu-crm.com/webhooks/plivo/hangup",
                "record": True,
                "record_url": "https://tu-crm.com/webhooks/plivo/recording",
                "machine_detection": False,
            }
        )
        data = response.json()
        
        # Guardar la llamada en curso
        await prisma.leadLlamada.create({
            data={
                "lead_id": lead_id,
                "call_uuid": data["request_uuid"],
                "agente_telefono": agente_telefono,
                "lead_telefono": lead_telefono,
                "estado": "iniciando",
                "iniciado_at": datetime.now(),
            }
        })
        
        return data

# Webhook: cuando el agente descuelga, conectar con el lead
async def handle_bridge(lead_telefono: str):
    """Plivo pide que hacer cuando el agente descuelga."""
    return f"""
    <Response>
        <Speak>Conectando con el lead...</Speak>
        <Dial>
            <Number>{lead_telefono}</Number>
        </Dial>
    </Response>
    """

# Webhook: cuando la llamada termina, actualizar estado
async def handle_hangup(call_uuid: str, duracion: int):
    await prisma.leadLlamada.update(
        where={"call_uuid": call_uuid},
        data={
            "estado": "completada",
            "duracion_segundos": duracion,
            "terminado_at": datetime.now(),
        }
    )

# Webhook: cuando llega la grabacion
async def handle_recording(call_uuid: str, recording_url: str):
    # Descargar el audio
    async with httpx.AsyncClient() as client:
        response = await client.get(recording_url)
        audio_bytes = response.content
    
    # Subir a tu storage (S3, local, etc.)
    file_path = f"/grabaciones/{call_uuid}.mp3"
    with open(file_path, "wb") as f:
        f.write(audio_bytes)
    
    # Guardar en el historial del lead
    await prisma.leadLlamada.update(
        where={"call_uuid": call_uuid},
        data={"grabacion_url": file_path}
    )
```

**Frontend (React):**

```tsx
function BotonLlamar({ leadId, leadTelefono }) {
  const [llamando, setLlamando] = useState(false);
  
  const handleLlamar = async () => {
    setLlamando(true);
    try {
      await api.post(`/api/leads/${leadId}/llamar`, {
        agente_telefono: "+34600111111"  // Tu telefono
      });
      // Tu telefono suena en 3-5 segundos
    } finally {
      setLlamando(false);
    }
  };
  
  return (
    <button 
      onClick={handleLlamar} 
      disabled={llamando}
      className="..."
    >
      {llamando ? 'Llamando a tu telefono...' : 'Llamar'}
    </button>
  );
}
```

---

## Conclusion

**Python no puede "recibir" un `tel:` link.**

Eso no es una limitacion de Python. Es una limitacion de como funciona internet, los navegadores y las redes telefonicas. El `tel:` link es solo un enlace que abre una app externa. Desde que abre la app, el navegador se desentiende.

**Lo que SI puedes hacer:**

1. **Empezar hoy**: Zoiper + Zadarma + script Python local que suba archivos (38 EUR/mes)
2. **Integrar en el CRM**: API Plivo/Twilio + backend Python que inicie la llamada y reciba la grabacion (62 EUR/mes)
3. **No hacer**: Intentar que Python intercepte una llamada que haces desde tu telefono movil

**600 llamadas/mes con la Opcion A realista (Plivo API):**
- Coste: ~62 EUR/mes
- Desarrollo: 1 dia
- Python controla: inicio de llamada, grabacion, webhook, almacenamiento
- Tu telefono: suena como un telefono normal, no necesitas cascos ni softphone

Eso si es posible. Pero deja de pensar en "recibir el tel:" y empieza a pensar en "Python hace la llamada por mi".
