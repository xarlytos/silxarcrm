import { Client, LocalAuth } from 'whatsapp-web.js';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { getIO } from '../websocket/socket';
import { renderPlantillaParaLead, normalizarTelefono } from './whatsappService';
import { procesarMensajeEntrante } from './whatsappChatbotService';

export type WwebEstado =
  | 'desconectado'
  | 'iniciando'
  | 'qr'
  | 'autenticando'
  | 'listo'
  | 'error';

interface EstadoCliente {
  estado: WwebEstado;
  qrCode: string | null;
  error: string | null;
  info: {
    nombre: string | null;
    numero: string | null;
    plataforma: string | null;
  };
  mensajesEnviados: number;
  mensajesRecibidos: number;
  iniciadoEn: string | null;
}

interface TareaEnvio {
  telefono: string;
  mensaje: string;
  leadId?: string;
  plantillaId?: string;
  resolve: (value: boolean) => void;
  reject: (reason: Error) => void;
}

/* ============================================================
   Estado global: un cliente por softwareId
============================================================ */

const clientes = new Map<string, Client>();
const estados = new Map<string, EstadoCliente>();
const colasEnvios = new Map<string, TareaEnvio[]>();
const procesandoCola = new Map<string, boolean>();

const DELAY_ENTRE_ENVIOS_MS = 3500;
const DELAY_ENTRE_BLOQUES_MS = 15000;
const MAX_POR_BLOQUE = 10;

function getEstadoDefault(): EstadoCliente {
  return {
    estado: 'desconectado',
    qrCode: null,
    error: null,
    info: { nombre: null, numero: null, plataforma: null },
    mensajesEnviados: 0,
    mensajesRecibidos: 0,
    iniciadoEn: null,
  };
}

function getEstado(softwareId: string): EstadoCliente {
  return estados.get(softwareId) || getEstadoDefault();
}

function setEstado(softwareId: string, partial: Partial<EstadoCliente>) {
  const prev = getEstado(softwareId);
  const next = { ...prev, ...partial };
  estados.set(softwareId, next);
}

/* ============================================================
   Socket.io — eventos en tiempo real
============================================================ */

export function emitirEvento(softwareId: string, evento: string, datos?: any) {
  try {
    const io = getIO();
    io.to(`whatsapp:${softwareId}`).emit(evento, { softwareId, ...datos });
  } catch {
    // Socket.io no está inicializado aún (normal en arranque)
  }
}

/* ============================================================
   Reconexión automática
============================================================ */

const timersReconexion = new Map<string, NodeJS.Timeout>();
const intentosReconexion = new Map<string, number>();
const MAX_REINTENTOS = 20;
const DELAY_BASE_RECONEXION_MS = 30_000; // 30s
const DELAY_MAX_RECONEXION_MS = 300_000; // 5min

function calcularDelayReconexion(intentos: number): number {
  // Backoff exponencial: 30s, 60s, 120s, 240s, 300s, 300s...
  const delay = DELAY_BASE_RECONEXION_MS * Math.pow(2, Math.min(intentos, 4));
  return Math.min(delay, DELAY_MAX_RECONEXION_MS);
}

function cancelarReconexion(softwareId: string) {
  const timer = timersReconexion.get(softwareId);
  if (timer) {
    clearTimeout(timer);
    timersReconexion.delete(softwareId);
  }
  intentosReconexion.delete(softwareId);
}

function programarReconexion(softwareId: string) {
  cancelarReconexion(softwareId);
  const intentos = (intentosReconexion.get(softwareId) || 0) + 1;
  if (intentos > MAX_REINTENTOS) {
    logger.warn(`[${softwareId}] Máximo de reintentos (${MAX_REINTENTOS}) alcanzado. No se reintentará.`);
    setEstado(softwareId, { estado: 'error', error: `Máximo de reintentos alcanzado` });
    emitirEvento(softwareId, 'wweb:error', { error: 'Máximo de reintentos alcanzado' });
    return;
  }
  intentosReconexion.set(softwareId, intentos);
  const delay = calcularDelayReconexion(intentos);
  logger.info(`[${softwareId}] Reconexión programada en ${delay / 1000}s (intento ${intentos}/${MAX_REINTENTOS})`);
  emitirEvento(softwareId, 'wweb:reconectando', { intento: intentos, delayMs: delay });

  const timer = setTimeout(() => {
    timersReconexion.delete(softwareId);
    logger.info(`[${softwareId}] Reintentando conexión...`);
    void iniciarCliente(softwareId).catch((err) => {
      logger.error(`[${softwareId}] Fallo en reconexión automática:`, err);
    });
  }, delay);
  timersReconexion.set(softwareId, timer);
}

/* ============================================================
   Cola de envíos con rate-limiting por software
============================================================ */

async function procesarCola(softwareId: string) {
  const key = softwareId;
  if (procesandoCola.get(key) || !clientes.has(key)) return;
  procesandoCola.set(key, true);

  const cola = colasEnvios.get(key) || [];
  let enviadosEnBloque = 0;

  while (cola.length > 0 && clientes.has(key)) {
    const tarea = cola.shift();
    if (!tarea) continue;

    try {
      const client = clientes.get(key)!;
      const numero = normalizarTelefono(tarea.telefono);
      const chatId = `${numero}@c.us`;

      const isRegistered = await client.isRegisteredUser(chatId);
      if (!isRegistered) {
        throw new Error(`El número ${numero} no está registrado en WhatsApp`);
      }

      await client.sendMessage(chatId, tarea.mensaje);
      setEstado(softwareId, {
        mensajesEnviados: getEstado(softwareId).mensajesEnviados + 1,
      });

      if (tarea.leadId) {
        await registrarEnvioDb(tarea.leadId, tarea.mensaje, tarea.plantillaId, numero, softwareId);
      }

      tarea.resolve(true);
      enviadosEnBloque++;
      emitirEvento(softwareId, 'wweb:envio_exito', {
        leadId: tarea.leadId,
        numero,
        mensaje: tarea.mensaje,
      });

      if (enviadosEnBloque >= MAX_POR_BLOQUE && cola.length > 0) {
        logger.info(
          `[${softwareId}] WhatsApp Web: pausa de ${DELAY_ENTRE_BLOQUES_MS}ms tras ${MAX_POR_BLOQUE} envíos`,
        );
        await sleep(DELAY_ENTRE_BLOQUES_MS);
        enviadosEnBloque = 0;
      } else {
        await sleep(DELAY_ENTRE_ENVIOS_MS);
      }
    } catch (error) {
      const errMsg = (error as Error).message;
      logger.error(`[${softwareId}] WhatsApp Web: error enviando mensaje:`, errMsg);
      tarea.reject(error as Error);
      emitirEvento(softwareId, 'wweb:envio_fallo', {
        leadId: tarea.leadId,
        numero: normalizarTelefono(tarea.telefono),
        error: errMsg,
      });
    }
  }

  procesandoCola.set(key, false);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function registrarEnvioDb(
  leadId: string,
  mensaje: string,
  plantillaId: string | undefined,
  telefono: string,
  softwareId: string,
) {
  try {
    await prisma.$transaction([
      prisma.whatsappEnvio.create({
        data: {
          leadId,
          plantillaId: plantillaId || null,
          telefono,
          mensaje,
          usuarioId: null,
          estado: 'enviado',
        },
      }),
      prisma.leadHistorial.create({
        data: {
          leadId,
          tipo: 'whatsapp',
          descripcion: `WhatsApp automático enviado al ${telefono}`,
          usuarioId: null,
        },
      }),
      prisma.lead.update({
        where: { id: leadId },
        data: { ultimoContacto: new Date() },
      }),
    ]);

    await prisma.whatsappMensaje.create({
      data: {
        conversacion: {
          connectOrCreate: {
            where: { leadId },
            create: { leadId, softwareId },
          },
        },
        direccion: 'OUT',
        cuerpo: mensaje,
        iaGenerado: false,
        usuarioId: null,
      },
    });
  } catch (e) {
    logger.warn(`[${softwareId}] No se pudo registrar envío en DB:`, (e as Error).message);
  }
}

/* ============================================================
   Gestión de múltiples clientes
============================================================ */

export function listarClientes(): Array<{ softwareId: string; estado: EstadoCliente }> {
  const resultado: Array<{ softwareId: string; estado: EstadoCliente }> = [];
  for (const [id] of estados) {
    resultado.push({ softwareId: id, estado: getEstado(id) });
  }
  // Si no hay estados, devolver array vacío
  return resultado;
}

export function getEstadoWweb(softwareId: string): EstadoCliente {
  return getEstado(softwareId);
}

export async function iniciarCliente(softwareId: string): Promise<void> {
  if (!softwareId?.trim()) throw new Error('softwareId obligatorio');

  const prev = clientes.get(softwareId);
  if (prev) {
    logger.info(`[${softwareId}] Reiniciando cliente...`);
    await detenerCliente(softwareId);
  }

  setEstado(softwareId, { estado: 'iniciando', error: null, qrCode: null });
  emitirEvento(softwareId, 'wweb:iniciando');

  if (!colasEnvios.has(softwareId)) {
    colasEnvios.set(softwareId, []);
  }

  const client = new Client({
    authStrategy: new LocalAuth({
      dataPath: './whatsapp-sessions',
      clientId: softwareId,
    }),
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1280x720',
      ],
      defaultViewport: { width: 1280, height: 720 },
    },
    qrMaxRetries: 3,
    takeoverOnConflict: true,
    takeoverTimeoutMs: 5000,
  });

  client.on('qr', (qr: string) => {
    logger.info(`[${softwareId}] QR generado, esperando escaneo...`);
    setEstado(softwareId, { estado: 'qr', qrCode: qr });
    emitirEvento(softwareId, 'wweb:qr', { qrCode: qr });
  });

  client.on('authenticated', () => {
    logger.info(`[${softwareId}] Sesión autenticada`);
    setEstado(softwareId, { estado: 'autenticando' });
    emitirEvento(softwareId, 'wweb:autenticando');
  });

  client.on('auth_failure', (msg: string) => {
    logger.error(`[${softwareId}] Fallo de autenticación:`, msg);
    setEstado(softwareId, { estado: 'error', error: `Auth failure: ${msg}` });
    emitirEvento(softwareId, 'wweb:error', { error: `Auth failure: ${msg}` });
    // No reintentar automáticamente en auth failure — requiere intervención manual (re-escanear QR)
    cancelarReconexion(softwareId);
  });

  client.on('ready', async () => {
    logger.info(`[${softwareId}] Cliente listo`);
    cancelarReconexion(softwareId); // Resetear contador de reintentos
    const me = client.info;
    setEstado(softwareId, {
      estado: 'listo',
      qrCode: null,
      iniciadoEn: new Date().toISOString(),
      info: {
        nombre: me?.pushname || me?.wid?.user || null,
        numero: me?.wid?.user || null,
        plataforma: me?.platform || null,
      },
    });
    emitirEvento(softwareId, 'wweb:ready', {
      info: {
        nombre: me?.pushname || me?.wid?.user || null,
        numero: me?.wid?.user || null,
      },
    });
    void procesarCola(softwareId);
  });

  client.on('disconnected', (reason: string) => {
    logger.warn(`[${softwareId}] Desconectado:`, reason);
    setEstado(softwareId, { estado: 'desconectado', error: `Desconectado: ${reason}` });
    clientes.delete(softwareId);
    emitirEvento(softwareId, 'wweb:disconnected', { reason });
    // Reconexión automática
    programarReconexion(softwareId);
  });

  client.on('message_create', (msg) => {
    const curr = getEstado(softwareId);
    if (msg.fromMe) {
      setEstado(softwareId, { mensajesEnviados: curr.mensajesEnviados + 1 });
      emitirEvento(softwareId, 'wweb:mensaje_enviado', {
        numero: msg.to.replace(/@c\.us$/, ''),
        mensaje: msg.body,
      });
    } else {
      setEstado(softwareId, { mensajesRecibidos: curr.mensajesRecibidos + 1 });
    }
  });

  client.on('message', async (msg) => {
    if (msg.fromMe) return;
    try {
      const numero = msg.from.replace(/@c\.us$/, '').replace(/@g\.us$/, '');
      const lead = await prisma.lead.findFirst({
        where: {
          softwareId,
          telefono: { contains: numero.slice(-9) },
        },
      });
      if (lead) {
        await prisma.whatsappMensaje.create({
          data: {
            conversacion: {
              connectOrCreate: {
                where: { leadId: lead.id },
                create: { leadId: lead.id, softwareId },
              },
            },
            direccion: 'IN',
            cuerpo: msg.body,
            iaGenerado: false,
            usuarioId: null,
          },
        });
        await prisma.whatsappConversacion.updateMany({
          where: { leadId: lead.id },
          data: { ultimaActividad: new Date(), noLeidos: { increment: 1 } },
        });
        emitirEvento(softwareId, 'wweb:mensaje_entrante', {
          leadId: lead.id,
          numero,
          mensaje: msg.body,
          leadNombre: lead.nombre,
        });
        // Activar chatbot (best-effort, no bloquea)
        void procesarMensajeEntrante(softwareId, numero, msg.body, lead.id);
      } else {
        emitirEvento(softwareId, 'wweb:mensaje_entrante_desconocido', {
          numero,
          mensaje: msg.body,
        });
      }
    } catch (e) {
      logger.warn(`[${softwareId}] Error registrando mensaje entrante:`, (e as Error).message);
    }
  });

  clientes.set(softwareId, client);
  await client.initialize();
}

export async function detenerCliente(softwareId: string): Promise<void> {
  const client = clientes.get(softwareId);
  if (client) {
    try {
      await client.destroy();
    } catch (e) {
      logger.warn(`[${softwareId}] Error al destruir cliente:`, (e as Error).message);
    }
    clientes.delete(softwareId);
  }
  setEstado(softwareId, {
    estado: 'desconectado',
    qrCode: null,
    info: { nombre: null, numero: null, plataforma: null },
    iniciadoEn: null,
  });
  colasEnvios.delete(softwareId);
  procesandoCola.delete(softwareId);
}

export async function detenerTodos(): Promise<void> {
  const ids = Array.from(clientes.keys());
  for (const id of ids) {
    await detenerCliente(id);
  }
  estados.clear();
}

/* ============================================================
   Envío de mensajes
============================================================ */

export async function enviarMensajeDirecto(
  softwareId: string,
  telefono: string,
  mensaje: string,
  leadId?: string,
  plantillaId?: string,
): Promise<boolean> {
  const estado = getEstado(softwareId);
  if (!clientes.has(softwareId) || estado.estado !== 'listo') {
    throw new Error('WhatsApp Web no está listo para este software. Inicia el cliente primero.');
  }

  return new Promise((resolve, reject) => {
    const cola = colasEnvios.get(softwareId);
    if (!cola) {
      reject(new Error('Cola no inicializada'));
      return;
    }
    cola.push({ telefono, mensaje, leadId, plantillaId, resolve, reject });
    void procesarCola(softwareId);
  });
}

export async function enviarMensajeALead(
  softwareId: string,
  leadId: string,
  opciones: { plantillaId?: string; contenidoFinal?: string },
): Promise<{ enviado: boolean; mensaje: string; telefono: string }> {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) throw new Error('Lead no encontrado');
  if (!lead.telefono?.trim()) throw new Error('El lead no tiene teléfono');
  if (lead.softwareId !== softwareId) {
    throw new Error('El lead no pertenece a este software');
  }

  const telefono = normalizarTelefono(lead.telefono);
  if (telefono.length < 7) throw new Error('Teléfono inválido');

  let mensajeFinal = opciones.contenidoFinal;
  let plantillaIdFinal = opciones.plantillaId;

  if (!mensajeFinal && plantillaIdFinal) {
    const plantilla = await prisma.whatsappPlantilla.findUnique({
      where: { id: plantillaIdFinal },
    });
    if (!plantilla) throw new Error('Plantilla no encontrada');
    if (!plantilla.activa) throw new Error('Plantilla inactiva');
    mensajeFinal = renderPlantillaParaLead(plantilla.contenido, lead);
    plantillaIdFinal = plantilla.id;
  }

  if (!mensajeFinal?.trim()) {
    throw new Error('Se requiere mensaje o plantilla');
  }

  await enviarMensajeDirecto(softwareId, telefono, mensajeFinal, leadId, plantillaIdFinal);

  return { enviado: true, mensaje: mensajeFinal, telefono };
}

export async function enviarBulk(
  softwareId: string,
  leads: Array<{ id: string; telefono?: string | null }>,
  mensaje: string,
): Promise<{
  ok: number;
  fail: number;
  errores: Array<{ leadId: string; error: string }>;
}> {
  const resultados = { ok: 0, fail: 0, errores: [] as Array<{ leadId: string; error: string }> };

  for (const lead of leads) {
    if (!lead.telefono) {
      resultados.fail++;
      resultados.errores.push({ leadId: lead.id, error: 'Sin teléfono' });
      continue;
    }
    try {
      await enviarMensajeDirecto(softwareId, lead.telefono, mensaje, lead.id);
      resultados.ok++;
    } catch (error) {
      resultados.fail++;
      resultados.errores.push({ leadId: lead.id, error: (error as Error).message });
    }
  }

  return resultados;
}

/* ============================================================
   Programación de envíos
============================================================ */

export async function programarEnvio(
  softwareId: string,
  leadId: string,
  opciones: { plantillaId?: string; contenidoFinal?: string; programadoPara: Date },
): Promise<{ id: string; mensaje: string; telefono: string; programadoPara: Date }> {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) throw new Error('Lead no encontrado');
  if (!lead.telefono?.trim()) throw new Error('El lead no tiene teléfono');
  if (lead.softwareId !== softwareId) {
    throw new Error('El lead no pertenece a este software');
  }

  const telefono = normalizarTelefono(lead.telefono);
  if (telefono.length < 7) throw new Error('Teléfono inválido');

  let mensajeFinal = opciones.contenidoFinal;
  let plantillaIdFinal = opciones.plantillaId;

  if (!mensajeFinal && plantillaIdFinal) {
    const plantilla = await prisma.whatsappPlantilla.findUnique({
      where: { id: plantillaIdFinal },
    });
    if (!plantilla) throw new Error('Plantilla no encontrada');
    if (!plantilla.activa) throw new Error('Plantilla inactiva');
    mensajeFinal = renderPlantillaParaLead(plantilla.contenido, lead);
    plantillaIdFinal = plantilla.id;
  }

  if (!mensajeFinal?.trim()) {
    throw new Error('Se requiere mensaje o plantilla');
  }

  const envio = await prisma.whatsappEnvio.create({
    data: {
      leadId,
      plantillaId: plantillaIdFinal || null,
      telefono,
      mensaje: mensajeFinal,
      usuarioId: null,
      programadoPara: opciones.programadoPara,
      estado: 'programado',
    },
  });

  // Registrar en historial como programado
  await prisma.leadHistorial.create({
    data: {
      leadId,
      tipo: 'whatsapp',
      descripcion: `WhatsApp programado para el ${telefono} — ${opciones.programadoPara.toLocaleString()}`,
      usuarioId: null,
    },
  });

  return { id: envio.id, mensaje: mensajeFinal, telefono, programadoPara: opciones.programadoPara };
}

/** Procesa envíos programados cuya fecha ya pasó */
export async function procesarEnviosProgramados(): Promise<void> {
  const ahora = new Date();
  const pendientes = await prisma.whatsappEnvio.findMany({
    where: {
      estado: 'programado',
      programadoPara: { lte: ahora },
    },
    include: {
      lead: { select: { softwareId: true, id: true, nombre: true } },
    },
    take: 50,
  });

  if (pendientes.length === 0) return;

  logger.info(`Procesando ${pendientes.length} envíos programados...`);

  for (const envio of pendientes) {
    const softwareId = envio.lead?.softwareId;
    if (!softwareId) continue;

    const estado = getEstado(softwareId);
    if (!clientes.has(softwareId) || estado.estado !== 'listo') {
      logger.warn(`[${softwareId}] WhatsApp no listo, envío ${envio.id} aplazado`);
      continue; // Se reintentará en la siguiente ejecución del cron
    }

    try {
      await enviarMensajeDirecto(softwareId, envio.telefono, envio.mensaje, envio.leadId, envio.plantillaId || undefined);
      await prisma.whatsappEnvio.update({
        where: { id: envio.id },
        data: { estado: 'enviado', enviadoAt: new Date() },
      });
      logger.info(`[${softwareId}] Envío programado ${envio.id} completado`);
    } catch (error) {
      logger.error(`[${softwareId}] Envío programado ${envio.id} fallido:`, (error as Error).message);
      await prisma.whatsappEnvio.update({
        where: { id: envio.id },
        data: { estado: 'fallido' },
      });
    }

    // Rate limiting entre envíos programados
    await new Promise((r) => setTimeout(r, 3500));
  }
}
