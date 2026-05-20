# Integracion Completa Zadarma - Llamadas y Grabaciones

## 1. Arquitectura General

```
Usuario hace clic en "Llamar"
          |
          v
   Frontend: POST /api/zadarma/callback
          |
          v
   Backend Node.js llama a API Zadarma:
   GET /v1/request/callback/
   params: from=SIP, to=lead, sip=agente
          |
          v
   Zadarma llama al AGENTE primero
   El agente descuelga
          |
          v
   Zadarma conecta con el LEAD
   Grabacion activada automaticamente
          |
          v
   Zadarma envia webhook notify_end
   Zadarma envia webhook notify_record (con link)
          |
          v
   Backend recibe webhooks
   - Guarda duracion, estado
   - Descarga MP3 de la grabacion
   - Guarda en el historial del lead
```

---

## 2. Setup en Zadarma

### 2.1 Crear cuenta
1. Ir a [zadarma.com](https://zadarma.com)
2. Crear cuenta business
3. Verificar identidad (pasaporte/DNI)

### 2.2 Contratar numeros DID (Espana)
- Panel -> "Numeros" -> "Comprar numero"
- Seleccionar Espana, tipo "Para llamadas"
- Coste: ~2-4 EUR/mes por numero
- Contratar 1 numero (se usa como caller ID)

### 2.3 Crear extensiones SIP
- Panel -> "Extensiones / SIP" -> "Crear extension"
- Crear 2 extensiones (una para ti, otra para tu socio)
- Ejemplo: `101` y `102`
- Anotar para cada extension:
  - **Servidor SIP**: `sip.zadarma.com`
  - **Usuario**: `tu_numero_sip` (ej: `1234567_101`)
  - **Password**: la contrasena generada

### 2.4 Activar grabacion de llamadas
- Panel -> "PBX / Centralita" -> "Configuracion"
- Activar **"Grabacion de llamadas"** para todas las extensiones
- Configurar almacenamiento: "Guardar en servidor Zadarma" (gratis)
- Nota: Las grabaciones se guardan 30 dias. Debes descargarlas via API.

### 2.5 Configurar caller ID
- Panel -> "Numeros" -> "Configuracion de caller ID"
- Asignar tu numero DID como caller ID para las extensiones

### 2.6 Obtener claves API
- Panel -> "API" -> "Configuracion"
- Generar **Key** y **Secret**
- Anotar ambas (el Secret solo se muestra una vez)

### 2.7 Configurar Webhooks
- Panel -> "API" -> "Webhooks"
- URL de webhook: `https://tu-dominio.com/api/zadarma/webhook`
- Activar los siguientes eventos:
  - `notify_start` - inicio de llamada entrante
  - `notify_answer` - llamada respondida
  - `notify_end` - fin de llamada
  - `notify_out_start` - inicio llamada saliente
  - `notify_out_end` - fin llamada saliente
  - `notify_record` - grabacion disponible

---

## 3. Modelo de Datos (Prisma)

```prisma
model LeadLlamada {
  id            String    @id @default(cuid())
  leadId        String    @map("lead_id")
  agenteId      Int?      @map("agente_id")
  callId        String?   @map("call_id")        // ID de Zadarma
  pbxCallId     String?   @map("pbx_call_id")    // ID de PBX de Zadarma
  
  // Telefonos
  agenteSip     String?   @map("agente_sip")
  leadTelefono  String    @map("lead_telefono")
  callerId      String?   @map("caller_id")
  
  // Estados
  estado        String    @default("iniciando")  // iniciando, conectando, en_curso, completada, fallida, no_contesta
  direccion     String    @default("saliente")   // saliente, entrante
  
  // Tiempos
  iniciadoAt    DateTime? @map("iniciado_at")
  contestadoAt  DateTime? @map("contestado_at")
  terminadoAt   DateTime? @map("terminado_at")
  duracionTotal Int?      @map("duracion_total")  // segundos
  duracionHabla Int?      @map("duracion_habla")  // segundos reales de conversacion
  
  // Grabacion
  grabacionUrl  String?   @map("grabacion_url")   // URL temporal de Zadarma
  grabacionPath String?   @map("grabacion_path")  // Path local donde se guardo
  grabacionSize Int?      @map("grabacion_size")  // bytes
  
  // Metadata
  notas         String?
  calidad       Int?      // 1-5 estrellas post-llamada
  
  // Relaciones
  lead          Lead      @relation(fields: [leadId], references: [id])
  agente        UsuarioCrm? @relation(fields: [agenteId], references: [id])
  
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")
  
  @@index([leadId])
  @@index([callId])
  @@index([pbxCallId])
  @@index([estado])
  @@index([createdAt])
  @@map("lead_llamadas")
}

// Anadir relacion en Lead
model Lead {
  // ... campos existentes ...
  llamadas      LeadLlamada[]
}

// Anadir relacion en UsuarioCrm
model UsuarioCrm {
  // ... campos existentes ...
  llamadas      LeadLlamada[]
  zadarmaSip    String?   @map("zadarma_sip")    // Extension SIP del agente
}
```

---

## 4. Backend - Service de Zadarma

### 4.1 Configuracion de variables de entorno

```env
# .env
ZADARMA_API_KEY=tu_key_aqui
ZADARMA_API_SECRET=tu_secret_aqui
ZADARMA_SIP_USER=tu_numero_de_cuenta
PUBLIC_URL=https://tu-dominio.com
```

### 4.2 Service de Zadarma (`backend/src/services/zadarmaService.ts`)

```typescript
import crypto from 'crypto';
import axios from 'axios';
import FormData from 'form-data';
import { logger } from '../utils/logger';

const ZADARMA_API_URL = 'https://api.zadarma.com';
const API_KEY = process.env.ZADARMA_API_KEY!;
const API_SECRET = process.env.ZADARMA_API_SECRET!;

function generateSignature(method: string, params: Record<string, string>): string {
  // Ordenar parametros alfabeticamente
  const sortedParams = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('');
  
  const stringToSign = `${method}${sortedParams}${crypto.createHash('md5').update(sortedParams).digest('hex')}`;
  
  return crypto
    .createHmac('sha1', API_SECRET)
    .update(stringToSign)
    .digest('base64');
}

function getHeaders(method: string, params: Record<string, string> = {}) {
  const signature = generateSignature(method, params);
  return {
    Authorization: `${API_KEY}:${signature}`,
  };
}

interface CallbackParams {
  from: string;      // Tu numero o SIP
  to: string;        // Numero del lead
  sip?: string;      // Extension SIP del agente (opcional)
  predicted?: boolean; // Predictivo (llamar a lead primero)
}

export async function iniciarCallback(params: CallbackParams) {
  const queryParams: Record<string, string> = {
    from: params.from,
    to: params.to,
  };
  
  if (params.sip) queryParams.sip = params.sip;
  if (params.predicted) queryParams.predicted = 'true';
  
  const method = '/v1/request/callback/';
  const headers = getHeaders(method, queryParams);
  
  const queryString = new URLSearchParams(queryParams).toString();
  
  try {
    const response = await axios.get(`${ZADARMA_API_URL}${method}?${queryString}`, { headers });
    logger.info('Zadarma callback iniciado:', response.data);
    return response.data;
  } catch (error: any) {
    logger.error('Zadarma callback error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Error iniciando callback');
  }
}

export async function obtenerGrabacion(callId: string, lifetime: number = 1800) {
  const params: Record<string, string> = {
    call_id: callId,
    lifetime: String(lifetime),
  };
  
  const method = '/v1/pbx/record/request/';
  const headers = getHeaders(method, params);
  const queryString = new URLSearchParams(params).toString();
  
  try {
    const response = await axios.get(`${ZADARMA_API_URL}${method}?${queryString}`, { headers });
    logger.info('Zadarma grabacion URL:', response.data);
    return response.data.link as string;
  } catch (error: any) {
    logger.error('Zadarma grabacion error:', error.response?.data || error.message);
    throw new Error('Error obteniendo grabacion');
  }
}

export async function descargarGrabacion(url: string): Promise<Buffer> {
  const response = await axios.get(url, { responseType: 'arraybuffer' });
  return Buffer.from(response.data);
}

export async function obtenerEstadisticas(start: string, end: string, sip?: string) {
  const params: Record<string, string> = {
    start,
    end,
  };
  
  if (sip) params.sip = sip;
  
  const method = '/v1/statistics/';
  const headers = getHeaders(method, params);
  const queryString = new URLSearchParams(params).toString();
  
  const response = await axios.get(`${ZADARMA_API_URL}${method}?${queryString}`, { headers });
  return response.data;
}
```

### 4.3 Rutas de Zadarma (`backend/src/routes/zadarma.ts`)

```typescript
import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import {
  iniciarCallback,
  obtenerGrabacion,
  descargarGrabacion,
} from '../services/zadarmaService';
import path from 'path';
import fs from 'fs';

const router = Router();

// POST /api/zadarma/callback - Iniciar llamada
router.post('/callback', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { leadId, leadTelefono } = req.body;
    const agenteId = req.user?.userId;
    
    if (!leadId || !leadTelefono) {
      res.status(400).json({ error: 'Faltan datos del lead' });
      return;
    }
    
    // Obtener extension SIP del agente
    const agente = await prisma.usuarioCrm.findUnique({
      where: { id: agenteId },
      select: { zadarmaSip: true },
    });
    
    if (!agente?.zadarmaSip) {
      res.status(400).json({ error: 'Agente no tiene extension SIP configurada' });
      return;
    }
    
    // Crear registro de llamada
    const llamada = await prisma.leadLlamada.create({
      data: {
        leadId,
        agenteId,
        leadTelefono,
        agenteSip: agente.zadarmaSip,
        estado: 'iniciando',
        iniciadoAt: new Date(),
      },
    });
    
    // Iniciar callback via Zadarma
    // from: tu numero DID, to: telefono del lead, sip: extension del agente
    const zadarmaResponse = await iniciarCallback({
      from: process.env.ZADARMA_SIP_USER || agente.zadarmaSip,
      to: leadTelefono,
      sip: agente.zadarmaSip,
    });
    
    // Actualizar con call_id de Zadarma
    await prisma.leadLlamada.update({
      where: { id: llamada.id },
      data: {
        callId: zadarmaResponse.data?.call_id || zadarmaResponse.call_id,
        estado: 'conectando',
      },
    });
    
    // Agregar entrada al historial del lead
    await prisma.leadHistorial.create({
      data: {
        leadId,
        tipo: 'llamada',
        descripcion: `Llamada iniciada a ${leadTelefono}`,
        usuarioId: agenteId,
      },
    });
    
    res.json({ success: true, data: { llamadaId: llamada.id, zadarma: zadarmaResponse } });
  } catch (error) {
    logger.error('Zadarma callback error:', error);
    res.status(500).json({ error: 'Error iniciando llamada' });
  }
});

// POST /api/zadarma/webhook - Recibir webhooks de Zadarma
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const event = req.body;
    logger.info('Zadarma webhook recibido:', event);
    
    const eventType = event.event || req.query.event;
    
    switch (eventType) {
      case 'NOTIFY_OUT_START':
        await handleOutStart(event);
        break;
        
      case 'NOTIFY_START':
        await handleStart(event);
        break;
        
      case 'NOTIFY_ANSWER':
        await handleAnswer(event);
        break;
        
      case 'NOTIFY_END':
      case 'NOTIFY_OUT_END':
        await handleEnd(event);
        break;
        
      case 'NOTIFY_RECORD':
        await handleRecord(event);
        break;
        
      default:
        logger.info('Webhook no manejado:', eventType);
    }
    
    res.sendStatus(200);
  } catch (error) {
    logger.error('Zadarma webhook error:', error);
    res.sendStatus(200); // Siempre responder 200 para evitar reintentos
  }
});

async function handleOutStart(event: any) {
  // Llamada saliente iniciada
  const pbxCallId = event.pbx_call_id || event.call_id;
  
  await prisma.leadLlamada.updateMany({
    where: { pbxCallId: pbxCallId },
    data: {
      estado: 'en_curso',
      pbxCallId: pbxCallId,
    },
  });
}

async function handleStart(event: any) {
  // Llamada entrante iniciada (no usamos para outbound)
  logger.info('Llamada iniciada:', event);
}

async function handleAnswer(event: any) {
  // Llamada contestada
  const pbxCallId = event.pbx_call_id;
  
  await prisma.leadLlamada.updateMany({
    where: { pbxCallId: pbxCallId },
    data: {
      estado: 'contestada',
      contestadoAt: new Date(),
    },
  });
}

async function handleEnd(event: any) {
  // Llamada terminada
  const pbxCallId = event.pbx_call_id;
  const callId = event.call_id;
  const duration = parseInt(event.duration) || 0;
  const disposition = event.disposition; // answered, busy, no answer, etc.
  
  const estado = mapDisposition(disposition);
  
  await prisma.leadLlamada.updateMany({
    where: {
      OR: [
        { pbxCallId: pbxCallId },
        { callId: callId },
      ],
    },
    data: {
      estado,
      terminadoAt: new Date(),
      duracionTotal: duration,
    },
  });
}

async function handleRecord(event: any) {
  // Grabacion disponible
  const callId = event.call_id;
  const pbxCallId = event.pbx_call_id;
  const recordUrl = event.link; // URL de la grabacion
  
  logger.info('Grabacion disponible:', { callId, pbxCallId, recordUrl });
  
  // Buscar la llamada
  const llamada = await prisma.leadLlamada.findFirst({
    where: {
      OR: [
        { callId: callId },
        { pbxCallId: pbxCallId },
      ],
    },
  });
  
  if (!llamada) {
    logger.warn('Grabacion recibida pero llamada no encontrada:', callId);
    return;
  }
  
  // Descargar grabacion
  try {
    const audioBuffer = await descargarGrabacion(recordUrl);
    
    // Guardar archivo localmente
    const uploadsDir = path.join(process.cwd(), 'uploads', 'grabaciones');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    const filename = `${llamada.id}_${Date.now()}.mp3`;
    const filePath = path.join(uploadsDir, filename);
    
    fs.writeFileSync(filePath, audioBuffer);
    
    // Actualizar registro
    await prisma.leadLlamada.update({
      where: { id: llamada.id },
      data: {
        grabacionUrl: recordUrl,
        grabacionPath: filePath,
        grabacionSize: audioBuffer.length,
      },
    });
    
    // Agregar al historial del lead
    await prisma.leadHistorial.create({
      data: {
        leadId: llamada.leadId,
        tipo: 'grabacion',
        descripcion: `Llamada grabada (${(audioBuffer.length / 1024 / 1024).toFixed(2)} MB)`,
        usuarioId: llamada.agenteId,
      },
    });
    
    logger.info('Grabacion descargada y guardada:', filePath);
  } catch (error) {
    logger.error('Error descargando grabacion:', error);
  }
}

function mapDisposition(disposition: string): string {
  const map: Record<string, string> = {
    'answered': 'completada',
    'busy': 'ocupado',
    'no answer': 'no_contesta',
    'failed': 'fallida',
    'cancelled': 'cancelada',
  };
  return map[disposition] || 'desconocido';
}

// GET /api/zadarma/llamadas/:leadId - Obtener llamadas de un lead
router.get('/llamadas/:leadId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const llamadas = await prisma.leadLlamada.findMany({
      where: { leadId: req.params.leadId },
      include: {
        agente: { select: { id: true, nombre: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    
    res.json({ success: true, data: llamadas });
  } catch (error) {
    logger.error('Error obteniendo llamadas:', error);
    res.status(500).json({ error: 'Error obteniendo llamadas' });
  }
});

// GET /api/zadarma/llamadas/:id/audio - Descargar audio de grabacion
router.get('/llamadas/:id/audio', authMiddleware, async (req: Request, res: Response) => {
  try {
    const llamada = await prisma.leadLlamada.findUnique({
      where: { id: req.params.id },
    });
    
    if (!llamada?.grabacionPath || !fs.existsSync(llamada.grabacionPath)) {
      res.status(404).json({ error: 'Grabacion no encontrada' });
      return;
    }
    
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Disposition', `inline; filename="grabacion_${llamada.id}.mp3"`);
    fs.createReadStream(llamada.grabacionPath).pipe(res);
  } catch (error) {
    logger.error('Error sirviendo audio:', error);
    res.status(500).json({ error: 'Error sirviendo audio' });
  }
});

// PUT /api/zadarma/llamadas/:id/notas - Agregar notas post-llamada
router.put('/llamadas/:id/notas', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { notas, calidad } = req.body;
    
    const llamada = await prisma.leadLlamada.update({
      where: { id: req.params.id },
      data: { notas, calidad },
    });
    
    res.json({ success: true, data: llamada });
  } catch (error) {
    logger.error('Error actualizando notas:', error);
    res.status(500).json({ error: 'Error actualizando notas' });
  }
});

export default router;
```

### 4.4 Registro de rutas

```typescript
// backend/src/index.ts
import zadarmaRoutes from './routes/zadarma';

// ... otras rutas ...
app.use('/api/zadarma', zadarmaRoutes);
```

---

## 5. Frontend - Componente de Llamada

### 5.1 Boton de Llamar en la pagina de Lead

```tsx
// frontend/src/components/leads/LeadCallButton.tsx
'use client';

import { useState } from 'react';
import { apiClient } from '@/lib/api';
import { Phone, PhoneOff, Loader2, Mic } from 'lucide-react';

interface LeadCallButtonProps {
  leadId: string;
  leadTelefono: string;
  onCallStarted?: () => void;
}

export default function LeadCallButton({ leadId, leadTelefono, onCallStarted }: LeadCallButtonProps) {
  const [llamando, setLlamando] = useState(false);
  const [error, setError] = useState('');

  const handleLlamar = async () => {
    if (!leadTelefono) {
      setError('El lead no tiene telefono');
      return;
    }
    
    setLlamando(true);
    setError('');
    
    try {
      await apiClient.api('/api/zadarma/callback', {
        method: 'POST',
        body: { leadId, leadTelefono },
      });
      
      // La llamada se inicio. Zadarma llama al agente primero.
      onCallStarted?.();
    } catch (err: any) {
      setError(err.message || 'Error iniciando llamada');
    } finally {
      // No desactivamos setLlamando(false) inmediatamente
      // porque la llamada puede durar minutos
      // El agente contesta su telefono, habla, y cuelga
      setTimeout(() => setLlamando(false), 5000);
    }
  };

  return (
    <div className="space-y-2">
      <button
        onClick={handleLlamar}
        disabled={llamando}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[14px] font-medium transition-all ${
          llamando
            ? 'bg-emerald-100 text-emerald-700 cursor-wait'
            : 'bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-lg'
        }`}
      >
        {llamando ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Llamando...
          </>
        ) : (
          <>
            <Phone className="w-4 h-4" />
            Llamar
          </>
        )}
      </button>
      
      {error && (
        <p className="text-[13px] text-red-500">{error}</p>
      )}
      
      {llamando && (
        <p className="text-[13px] text-emerald-600">
          Tu telefono deberia sonar en unos segundos. Descuelga para hablar con el lead.
        </p>
      )}
    </div>
  );
}
```

### 5.2 Lista de llamadas en el detalle del Lead

```tsx
// frontend/src/components/leads/LeadLlamadas.tsx
'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api';
import { LeadLlamada } from '@/types';
import { formatDate } from '@/lib/utils';
import { Phone, Play, Clock, Star, Mic } from 'lucide-react';

interface LeadLlamadasProps {
  leadId: string;
}

export default function LeadLlamadas({ leadId }: LeadLlamadasProps) {
  const [llamadas, setLlamadas] = useState<LeadLlamada[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);

  useEffect(() => {
    apiClient.api(`/api/zadarma/llamadas/${leadId}`)
      .then((res) => setLlamadas(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [leadId]);

  if (loading) return <p>Cargando llamadas...</p>;
  if (llamadas.length === 0) return <p className="text-[var(--text-tertiary)]">Sin llamadas</p>;

  return (
    <div className="space-y-3">
      {llamadas.map((llamada) => (
        <div
          key={llamada.id}
          className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Phone className={`w-4 h-4 ${
                llamada.estado === 'completada' ? 'text-emerald-500' : 'text-red-500'
              }`} />
              <span className="text-[14px] font-medium text-[var(--text-primary)]">
                {llamada.estado === 'completada' ? 'Completada' : llamada.estado}
              </span>
              {llamada.duracionTotal && (
                <span className="text-[12px] text-[var(--text-tertiary)] flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {Math.floor(llamada.duracionTotal / 60)}m {llamada.duracionTotal % 60}s
                </span>
              )}
            </div>
            <span className="text-[12px] text-[var(--text-tertiary)]">
              {formatDate(llamada.createdAt)}
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="text-[13px] text-[var(--text-secondary)]">
              {llamada.leadTelefono}
            </span>
            
            {llamada.grabacionPath && (
              <>
                <button
                  onClick={() => setPlayingId(playingId === llamada.id ? null : llamada.id)}
                  className="flex items-center gap-1 text-[13px] text-violet-600 dark:text-violet-400 hover:underline"
                >
                  <Mic className="w-3.5 h-3.5" />
                  {playingId === llamada.id ? 'Pausar' : 'Escuchar grabacion'}
                </button>
                
                {llamada.calidad && (
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3 h-3 ${
                          i < llamada.calidad
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-[var(--text-tertiary)]'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
          
          {playingId === llamada.id && llamada.grabacionPath && (
            <audio
              controls
              autoPlay
              className="w-full mt-3"
              src={`/api/zadarma/llamadas/${llamada.id}/audio`}
              onEnded={() => setPlayingId(null)}
            />
          )}
          
          {llamada.notas && (
            <p className="text-[13px] text-[var(--text-secondary)] mt-2 italic">
              {llamada.notas}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
```

---

## 6. Configuracion del Agente (UsuarioCrm)

### 6.1 Extender el modelo de usuario

```prisma
model UsuarioCrm {
  // ... campos existentes ...
  zadarmaSip    String?   @map("zadarma_sip")     // Extension SIP (ej: "1234567_101")
  zadarmaNumero String?   @map("zadarma_numero")  // Numero DID asignado
}
```

### 6.2 Endpoint para configurar extension

```typescript
// backend/src/routes/auth.ts o un nuevo admin route

// PUT /api/auth/me/zadarma - Configurar extension SIP
router.put('/me/zadarma', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { zadarmaSip } = req.body;
    
    const user = await prisma.usuarioCrm.update({
      where: { id: req.user?.userId },
      data: { zadarmaSip },
    });
    
    res.json({ success: true, data: { zadarmaSip: user.zadarmaSip } });
  } catch (error) {
    res.status(500).json({ error: 'Error actualizando configuracion' });
  }
});
```

### 6.3 Formulario en el frontend

```tsx
// Selector de extension en perfil de usuario
function ConfiguracionZadarma() {
  const { user } = useAuth();
  const [sip, setSip] = useState(user?.zadarmaSip || '');
  
  const guardar = async () => {
    await apiClient.api('/api/auth/me/zadarma', {
      method: 'PUT',
      body: { zadarmaSip: sip },
    });
  };
  
  return (
    <div>
      <label>Extension Zadarma SIP</label>
      <input
        value={sip}
        onChange={(e) => setSip(e.target.value)}
        placeholder="1234567_101"
      />
      <button onClick={guardar}>Guardar</button>
    </div>
  );
}
```

---

## 7. Notificaciones en Tiempo Real

Para que el agente vea el estado de la llamada en el CRM mientras habla:

### 7.1 Usando WebSockets (si tienes Socket.io configurado)

```typescript
// En el webhook handler de Zadarma
import { io } from '../websocket/socket'; // tu instancia de Socket.io

async function handleAnswer(event: any) {
  const llamada = await prisma.leadLlamada.findFirst({
    where: { pbxCallId: event.pbx_call_id },
    include: { agente: true },
  });
  
  if (llamada?.agente?.id) {
    // Notificar al agente via WebSocket
    io.to(`user_${llamada.agente.id}`).emit('llamada_contestada', {
      llamadaId: llamada.id,
      leadId: llamada.leadId,
      duracion: event.duration,
    });
  }
}

async function handleEnd(event: any) {
  const llamada = await prisma.leadLlamada.findFirst({
    where: { pbxCallId: event.pbx_call_id },
    include: { agente: true },
  });
  
  if (llamada?.agente?.id) {
    io.to(`user_${llamada.agente.id}`).emit('llamada_terminada', {
      llamadaId: llamada.id,
      duracion: event.duration,
      estado: mapDisposition(event.disposition),
    });
  }
}
```

### 7.2 Frontend - Escuchar eventos

```tsx
// En la pagina de detalle del lead
useEffect(() => {
  const socket = getSocket(); // tu funcion de conexion
  
  socket.on('llamada_contestada', (data) => {
    if (data.leadId === leadId) {
      toast.success('Llamada en curso...');
    }
  });
  
  socket.on('llamada_terminada', (data) => {
    if (data.leadId === leadId) {
      toast.info(`Llamada finalizada: ${data.duracion}s`);
      // Refrescar lista de llamadas
      fetchLlamadas();
    }
  });
  
  return () => {
    socket.off('llamada_contestada');
    socket.off('llamada_terminada');
  };
}, [leadId]);
```

---

## 8. Costes Mensuales (Zadarma)

| Concepto | Coste |
|----------|-------|
| Numero DID Espana | 2-4 EUR/mes |
| Llamada a fijo Espana | ~0.004 EUR/min |
| Llamada a movil Espana | ~0.018 EUR/min |
| Grabacion | Incluida |
| Almacenamiento grabaciones | Gratis (30 dias en Zadarma) |
| API | Gratis |
| 
**Escenario: 600 llamadas x 3 min a movil:**
- Llamadas: 600 x 3 x 0.018 = 32.4 EUR
- Numero DID: ~3 EUR
- **Total: ~35-40 EUR/mes**

---

## 9. Checklist de Implementacion

### Fase 1: Setup Zadarma (30 min)
- [ ] Crear cuenta en Zadarma
- [ ] Verificar identidad
- [ ] Contratar numero DID Espana
- [ ] Crear 2 extensiones SIP
- [ ] Activar grabacion de llamadas en PBX
- [ ] Obtener Key y Secret de API
- [ ] Configurar URL de webhook

### Fase 2: Backend (2-3 horas)
- [ ] Migrar Prisma (anadir modelos LeadLlamada, campos a UsuarioCrm)
- [ ] Crear `zadarmaService.ts` (autenticacion, callback, descarga)
- [ ] Crear `routes/zadarma.ts` (endpoints y webhooks)
- [ ] Registrar rutas en `index.ts`
- [ ] Probar callback con Postman/curl
- [ ] Verificar webhooks llegan correctamente

### Fase 3: Frontend (1-2 horas)
- [ ] Crear componente `LeadCallButton.tsx`
- [ ] Crear componente `LeadLlamadas.tsx`
- [ ] Integrar en pagina de detalle del lead
- [ ] Crear formulario de configuracion SIP en perfil

### Fase 4: Testing (1 hora)
- [ ] Hacer llamada de prueba
- [ ] Verificar que llega webhook de grabacion
- [ ] Verificar que se descarga el MP3
- [ ] Verificar que se reproduce en el navegador
- [ ] Probar desde movil y desde PC

---

## 10. Consideraciones Legales

### Grabacion de llamadas en Espana
- **Obligatorio informar**: "Le informamos de que esta llamada puede ser grabada..."
- **Como hacerlo en Zadarma**: Configurar IVR/mensaje automatico que suene al inicio de cada llamada

### Configurar mensaje automatico en Zadarma PBX
1. Panel -> "PBX / Centralita" -> "Escenarios"
2. Crear escenario con mensaje: "Le informamos de que esta llamada esta siendo grabada..."
3. Aplicar a todas las llamadas salientes

### Privacidad
- Las grabaciones son solo para ti y tu socio
- Implementar borrado automatico despues de 6-12 meses
- Respetar peticiones de no grabar (campo `noGrabar` en Lead)

---

## 11. Flujo Completo de una Llamada

```
1. Agente abre lead en CRM y hace clic en "Llamar"
   → Frontend: POST /api/zadarma/callback

2. Backend valida, crea registro LeadLlamada (estado: iniciando)
   → Backend: GET /v1/request/callback/ a Zadarma

3. Zadarma llama al AGENTE en su telefono/SIP
   → Agente descuelga

4. Zadarma conecta con el LEAD
   → Empieza grabacion automatica
   → Webhook: NOTIFY_ANSWER
   → Backend actualiza estado a "contestada"

5. Conversacion en curso
   → Agentes hablan (30 segundos, 2 minutos, etc.)
   → Agente cuelga o lead cuelga

6. Zadarma envia webhook: NOTIFY_END
   → Backend actualiza estado, duracion

7. Zadarma procesa grabacion y envia: NOTIFY_RECORD
   → Backend descarga MP3
   → Backend guarda archivo local
   → Backend actualiza LeadLlamada con path del audio
   → Backend crea entrada en LeadHistorial

8. Agente ve en CRM:
   → "Llamada completada - 3m 42s"
   → Boton "Escuchar grabacion"
   → Input para notas post-llamada
```

---

## 12. Ventajas de esta integracion

| Caracteristica | Como funciona |
|----------------|---------------|
| **Click-to-call** | Agente hace clic, suena su telefono |
| **Grabacion automatica** | Sin intervencion del agente |
| **Almacenamiento propio** | Tu servidor guarda los MP3 |
| **Historial integrado** | Cada llamada aparece en el timeline del lead |
| **Reproduccion en CRM** | Escuchar grabaciones sin salir del navegador |
| **Notas post-llamada** | Agente anota feedback inmediatamente |
| **Calificacion** | 1-5 estrellas por llamada |
| **Estadisticas** | Cuantas llamadas, duracion media, tasa de contestacion |
| **Coste** | ~35-40 EUR/mes para 600 llamadas |

---

## 13. Proximos pasos

1. **Hoy**: Crear cuenta en Zadarma y configurar extensiones
2. **Mañana**: Implementar backend (service + routes + webhooks)
3. **Pasado**: Implementar frontend (boton + lista de llamadas + reproductor)
4. **Fin de semana**: Testing con llamadas reales

**Tiempo total estimado: 1 dia de desarrollo + 2 horas de setup**

**Coste: ~35-40 EUR/mes + 2 numeros DID (~6 EUR)**
