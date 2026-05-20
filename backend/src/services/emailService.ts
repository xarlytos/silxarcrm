import { Resend } from 'resend';
import { prisma } from '../config/database';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import crypto from 'crypto';

/**
 * Resuelve el cliente Resend a usar para un sender.
 * Prioridad: sender.account.apiKey → RESEND_API_KEY global (fallback legacy).
 * Lanza si no hay ninguna disponible.
 */
async function getResendForSender(senderId: string): Promise<{ client: Resend; accountId: string | null }> {
  const sender = await prisma.emailSender.findUnique({
    where: { id: senderId },
    include: { account: true },
  });
  if (!sender) throw new Error('Sender no encontrado');

  if (sender.account) {
    if (!sender.account.activo) throw new Error(`La cuenta "${sender.account.nombre}" está desactivada`);
    if (sender.account.cuotaMax && sender.account.cuotaUsada >= sender.account.cuotaMax) {
      throw new Error(`Cuota mensual agotada en cuenta "${sender.account.nombre}"`);
    }
    return { client: new Resend(sender.account.apiKey), accountId: sender.account.id };
  }

  if (!env.RESEND_API_KEY) {
    throw new Error('Sender sin cuenta asignada y RESEND_API_KEY no configurada');
  }
  return { client: new Resend(env.RESEND_API_KEY), accountId: null };
}

async function bumpAccountUsage(accountId: string | null) {
  if (!accountId) return;
  await prisma.emailAccount.update({
    where: { id: accountId },
    data: { cuotaUsada: { increment: 1 } },
  });
}

export interface SenderInput {
  softwareId: string;
  email: string;
  nombre: string;
  esDefault?: boolean;
  accountId?: string | null;
}

export interface PlantillaInput {
  softwareId: string;
  nombre: string;
  asunto: string;
  cuerpoHtml: string;
  cuerpoTexto?: string;
  variables?: string[];
  tipo?: string;
}

export interface RenderContext {
  nombre?: string | null;
  empresa?: string | null;
  email?: string | null;
  telefono?: string | null;
  municipio?: string | null;
  [key: string]: string | null | undefined;
}

/**
 * Renderiza un string con variables {{nombre}}, {{empresa}}, etc.
 * Variables no encontradas se reemplazan por '' para evitar mostrar {{nombre}} crudo al destinatario.
 */
export function renderTemplate(tpl: string, ctx: RenderContext): string {
  return tpl.replace(/\{\{\s*([a-zA-Z_][\w]*)\s*\}\}/g, (_m, key) => {
    const v = ctx[key];
    return v == null ? '' : String(v);
  });
}

/**
 * Construye un contexto de renderizado a partir de un Lead.
 */
export function contextFromLead(lead: {
  nombre: string;
  email?: string | null;
  telefono?: string | null;
  empresa?: string | null;
  metadata?: any;
}): RenderContext {
  const meta = (lead.metadata as any) || {};
  return {
    nombre: lead.nombre,
    empresa: lead.empresa,
    email: lead.email,
    telefono: lead.telefono,
    municipio: meta.municipio || null,
  };
}

/**
 * Genera un token firmado para el link de unsubscribe.
 * Formato: base64url(payload).hmac
 */
export function buildUnsubscribeToken(email: string, softwareId: string): string {
  const payload = Buffer.from(JSON.stringify({ e: email, s: softwareId })).toString('base64url');
  const hmac = crypto.createHmac('sha256', env.EMAIL_UNSUBSCRIBE_SECRET).update(payload).digest('base64url');
  return `${payload}.${hmac}`;
}

export function verifyUnsubscribeToken(token: string): { email: string; softwareId: string } | null {
  const [payload, hmac] = token.split('.');
  if (!payload || !hmac) return null;
  const expected = crypto.createHmac('sha256', env.EMAIL_UNSUBSCRIBE_SECRET).update(payload).digest('base64url');
  if (expected !== hmac) return null;
  try {
    const { e, s } = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return { email: e, softwareId: s };
  } catch {
    return null;
  }
}

/**
 * Añade footer obligatorio con link de baja al cuerpo HTML.
 */
function injectUnsubscribeFooter(html: string, email: string, softwareId: string): string {
  const token = buildUnsubscribeToken(email, softwareId);
  const url = `${env.FRONTEND_URL}/email/baja?token=${token}`;
  const footer = `
    <hr style="margin-top:32px;border:none;border-top:1px solid #e5e5e5" />
    <p style="font-size:12px;color:#999;margin-top:12px;text-align:center">
      ¿No te interesa? <a href="${url}" style="color:#666;text-decoration:underline">Cancelar suscripción</a>
    </p>
  `;
  return html.includes('{{unsubscribe_url}}')
    ? html.replace(/\{\{\s*unsubscribe_url\s*\}\}/g, url)
    : html + footer;
}

// ============= ACCOUNTS CRUD =============

export interface AccountInput {
  softwareId: string;
  proveedor?: string;
  nombre: string;
  apiKey: string;
  cuotaMax?: number | null;
}

/**
 * Devuelve la cuenta enmascarando la apiKey (solo prefijo) para no exponerla.
 */
function maskAccount<T extends { apiKey: string }>(a: T): T & { apiKey: string } {
  const masked = a.apiKey.length > 8 ? a.apiKey.slice(0, 8) + '…' + a.apiKey.slice(-4) : '***';
  return { ...a, apiKey: masked };
}

export async function listAccounts(softwareId?: string) {
  const items = await prisma.emailAccount.findMany({
    where: softwareId ? { softwareId } : undefined,
    orderBy: { createdAt: 'asc' },
    include: { _count: { select: { senders: true } } },
  });
  return items.map(maskAccount);
}

export async function createAccount(input: AccountInput) {
  if (!input.apiKey || input.apiKey.length < 10) {
    throw new Error('apiKey demasiado corta — pega la API key completa de Resend');
  }
  const created = await prisma.emailAccount.create({
    data: {
      softwareId: input.softwareId,
      proveedor: input.proveedor || 'resend',
      nombre: input.nombre,
      apiKey: input.apiKey,
      cuotaMax: input.cuotaMax ?? null,
    },
  });
  return maskAccount(created);
}

export async function updateAccount(id: string, input: Partial<AccountInput> & { activo?: boolean; cuotaUsada?: number }) {
  const data: any = {};
  if (input.nombre !== undefined) data.nombre = input.nombre;
  if (input.cuotaMax !== undefined) data.cuotaMax = input.cuotaMax;
  if (input.activo !== undefined) data.activo = input.activo;
  if (input.cuotaUsada !== undefined) data.cuotaUsada = input.cuotaUsada;
  if (input.apiKey && input.apiKey.length >= 10) data.apiKey = input.apiKey;
  const updated = await prisma.emailAccount.update({ where: { id }, data });
  return maskAccount(updated);
}

export async function deleteAccount(id: string) {
  return prisma.emailAccount.delete({ where: { id } });
}

// ============= SENDERS CRUD =============

export async function listSenders(softwareId?: string) {
  return prisma.emailSender.findMany({
    where: softwareId ? { softwareId } : undefined,
    orderBy: [{ esDefault: 'desc' }, { createdAt: 'asc' }],
    include: {
      account: { select: { id: true, nombre: true, proveedor: true, activo: true } },
    },
  });
}

export async function createSender(input: SenderInput) {
  if (input.esDefault) {
    await prisma.emailSender.updateMany({
      where: { softwareId: input.softwareId, esDefault: true },
      data: { esDefault: false },
    });
  }
  return prisma.emailSender.create({ data: input });
}

export async function updateSender(id: string, input: Partial<SenderInput>) {
  const existing = await prisma.emailSender.findUnique({ where: { id } });
  if (!existing) return null;
  if (input.esDefault) {
    await prisma.emailSender.updateMany({
      where: { softwareId: existing.softwareId, esDefault: true, id: { not: id } },
      data: { esDefault: false },
    });
  }
  return prisma.emailSender.update({ where: { id }, data: input });
}

export async function deleteSender(id: string) {
  return prisma.emailSender.delete({ where: { id } });
}

// ============= PLANTILLAS CRUD =============

export async function listPlantillas(softwareId?: string, tipo?: string) {
  const where: any = { activo: true };
  if (softwareId) where.softwareId = softwareId;
  if (tipo) where.tipo = tipo;
  return prisma.emailPlantilla.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
}

export async function getPlantilla(id: string) {
  return prisma.emailPlantilla.findUnique({ where: { id } });
}

export async function createPlantilla(input: PlantillaInput) {
  return prisma.emailPlantilla.create({
    data: {
      softwareId: input.softwareId,
      nombre: input.nombre,
      asunto: input.asunto,
      cuerpoHtml: input.cuerpoHtml,
      cuerpoTexto: input.cuerpoTexto,
      variables: input.variables || [],
      tipo: input.tipo || 'custom',
    },
  });
}

export async function updatePlantilla(id: string, input: Partial<PlantillaInput>) {
  return prisma.emailPlantilla.update({ where: { id }, data: input });
}

export async function deletePlantilla(id: string) {
  return prisma.emailPlantilla.update({ where: { id }, data: { activo: false } });
}

// ============= ENVÍO =============

export interface SendOneInput {
  senderId: string;
  destinatario: string;
  asunto: string;
  cuerpoHtml: string;
  leadId?: string;
  campanaId?: string;
  softwareId: string;
}

/**
 * Envía un EmailEnvio existente (creado previamente, p. ej. por una campaña).
 * Si tiene éxito actualiza el envío a estado=enviado y registra evento.
 * Si falla actualiza a estado=fallido. Nunca lanza — el worker procesa en lote.
 */
export async function sendEnvioById(envioId: string, softwareId: string): Promise<{ ok: boolean; error?: string }> {
  const envio = await prisma.emailEnvio.findUnique({
    where: { id: envioId },
    include: { sender: true },
  });
  if (!envio) return { ok: false, error: 'Envío no encontrado' };
  if (envio.estado !== 'pendiente') return { ok: false, error: `Envío en estado ${envio.estado}` };

  // Comprobar baja (puede haber llegado entre creación y envío)
  const baja = await prisma.emailBaja.findUnique({
    where: { email_softwareId: { email: envio.destinatario.toLowerCase(), softwareId } },
  });
  if (baja) {
    await prisma.emailEnvio.update({
      where: { id: envioId },
      data: { estado: 'fallido', error: 'Destinatario dado de baja' },
    });
    return { ok: false, error: 'dado de baja' };
  }

  let resend: Resend, accountId: string | null;
  try {
    const resolved = await getResendForSender(envio.senderId);
    resend = resolved.client;
    accountId = resolved.accountId;
  } catch (err) {
    const msg = (err as Error).message;
    await prisma.emailEnvio.update({ where: { id: envioId }, data: { estado: 'fallido', error: msg } });
    return { ok: false, error: msg };
  }

  const htmlConFooter = injectUnsubscribeFooter(envio.cuerpoHtml, envio.destinatario, softwareId);

  try {
    const { data, error } = await resend.emails.send({
      from: `${envio.sender.nombre} <${envio.sender.email}>`,
      to: envio.destinatario,
      subject: envio.asunto,
      html: htmlConFooter,
      headers: {
        'List-Unsubscribe': `<${env.FRONTEND_URL}/email/baja?token=${buildUnsubscribeToken(envio.destinatario, softwareId)}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
      tags: [
        { name: 'software', value: softwareId },
        ...(envio.campanaId ? [{ name: 'campana', value: envio.campanaId }] : []),
        { name: 'envio', value: envio.id },
      ],
    });
    if (error) throw new Error(error.message);

    await prisma.emailEnvio.update({
      where: { id: envioId },
      data: { resendId: data?.id, estado: 'enviado', enviadoEn: new Date(), cuerpoHtml: htmlConFooter },
    });
    await prisma.emailEvento.create({
      data: { envioId, tipo: 'sent', datos: { resendId: data?.id, accountId } },
    });
    await bumpAccountUsage(accountId);
    if (envio.varianteId) {
      await prisma.emailVariante.update({
        where: { id: envio.varianteId },
        data: { enviados: { increment: 1 } },
      });
    }
    if (envio.leadId) {
      await prisma.leadHistorial.create({
        data: { leadId: envio.leadId, tipo: 'email_enviado', descripcion: `Email enviado: "${envio.asunto}"` },
      });
    }
    return { ok: true };
  } catch (err) {
    const msg = (err as Error).message;
    await prisma.emailEnvio.update({
      where: { id: envioId },
      data: { estado: 'fallido', error: msg },
    });
    await prisma.emailEvento.create({
      data: { envioId, tipo: 'failed', datos: { error: msg } },
    });
    return { ok: false, error: msg };
  }
}

/**
 * Envía un email a través de Resend y registra el envío en DB.
 * Devuelve el EmailEnvio creado.
 */
export async function sendOne(input: SendOneInput) {
  // Verificar que el destinatario no esté dado de baja
  const baja = await prisma.emailBaja.findUnique({
    where: { email_softwareId: { email: input.destinatario.toLowerCase(), softwareId: input.softwareId } },
  });
  if (baja) {
    throw new Error('Destinatario dado de baja para este software');
  }

  const sender = await prisma.emailSender.findUnique({ where: { id: input.senderId } });
  if (!sender) throw new Error('Sender no encontrado');
  if (!sender.activo) throw new Error('Sender desactivado');

  const { client: resend, accountId } = await getResendForSender(input.senderId);

  const htmlConFooter = injectUnsubscribeFooter(input.cuerpoHtml, input.destinatario, input.softwareId);

  // Crear el registro de envío en estado pendiente
  const envio = await prisma.emailEnvio.create({
    data: {
      campanaId: input.campanaId || null,
      leadId: input.leadId || null,
      senderId: input.senderId,
      destinatario: input.destinatario,
      asunto: input.asunto,
      cuerpoHtml: htmlConFooter,
    },
  });

  try {
    const { data, error } = await resend.emails.send({
      from: `${sender.nombre} <${sender.email}>`,
      to: input.destinatario,
      subject: input.asunto,
      html: htmlConFooter,
      headers: {
        'List-Unsubscribe': `<${env.FRONTEND_URL}/email/baja?token=${buildUnsubscribeToken(input.destinatario, input.softwareId)}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
      tags: [
        { name: 'software', value: input.softwareId },
        ...(input.campanaId ? [{ name: 'campana', value: input.campanaId }] : []),
        { name: 'envio', value: envio.id },
      ],
    });

    if (error) throw new Error(error.message);

    await prisma.emailEnvio.update({
      where: { id: envio.id },
      data: { resendId: data?.id, estado: 'enviado', enviadoEn: new Date() },
    });

    await prisma.emailEvento.create({
      data: { envioId: envio.id, tipo: 'sent', datos: { resendId: data?.id, accountId } },
    });

    await bumpAccountUsage(accountId);

    // Registrar en historial del lead
    if (input.leadId) {
      await prisma.leadHistorial.create({
        data: {
          leadId: input.leadId,
          tipo: 'email_enviado',
          descripcion: `Email enviado: "${input.asunto}" a ${input.destinatario}`,
        },
      });
    }

    return { ...envio, resendId: data?.id, estado: 'enviado' };
  } catch (err) {
    const msg = (err as Error).message;
    await prisma.emailEnvio.update({
      where: { id: envio.id },
      data: { estado: 'fallido', error: msg },
    });
    await prisma.emailEvento.create({
      data: { envioId: envio.id, tipo: 'failed', datos: { error: msg } },
    });
    logger.error('sendOne failed:', err);
    throw err;
  }
}
