import crypto from 'crypto';
import { prisma } from '../config/database';
import { env } from '../config/env';
import { logger } from '../utils/logger';

/**
 * Verifica una firma Svix (formato que usa Resend para webhooks).
 *
 * Headers que envía Resend/Svix:
 *   svix-id: msg_XXXX
 *   svix-timestamp: 1234567890   (unix seconds)
 *   svix-signature: v1,base64sig v2,base64sig  (puede tener varias)
 *
 * Firma:
 *   secret = base64-decode("whsec_xxx" sin prefijo)
 *   signed = `${svix-id}.${svix-timestamp}.${raw_body}`
 *   expected = HMAC-SHA256(signed, secret) en base64
 *
 * Rechaza si timestamp > 5 min de skew (anti-replay).
 */
export function verifyResendSignature(
  rawBody: string,
  headers: {
    'svix-id'?: string | string[];
    'svix-timestamp'?: string | string[];
    'svix-signature'?: string | string[];
  },
): { ok: boolean; error?: string } {
  if (!env.RESEND_WEBHOOK_SECRET) {
    return { ok: false, error: 'RESEND_WEBHOOK_SECRET no configurado en el servidor' };
  }

  const id = String(headers['svix-id'] || '');
  const ts = String(headers['svix-timestamp'] || '');
  const sig = String(headers['svix-signature'] || '');

  if (!id || !ts || !sig) return { ok: false, error: 'Headers Svix ausentes' };

  // Anti-replay: timestamp dentro de 5 minutos
  const now = Math.floor(Date.now() / 1000);
  const tsNum = parseInt(ts, 10);
  if (isNaN(tsNum) || Math.abs(now - tsNum) > 300) {
    return { ok: false, error: 'Timestamp fuera de ventana de 5 min' };
  }

  const secret = env.RESEND_WEBHOOK_SECRET.replace(/^whsec_/, '');
  let secretBytes: Buffer;
  try {
    secretBytes = Buffer.from(secret, 'base64');
  } catch {
    return { ok: false, error: 'Secret malformado' };
  }

  const toSign = `${id}.${ts}.${rawBody}`;
  const expected = crypto.createHmac('sha256', secretBytes).update(toSign).digest('base64');

  // Header puede ser "v1,sigA v1,sigB" — separamos y comparamos cualquiera
  const sigs = sig.split(' ').map((s) => {
    const [version, value] = s.split(',');
    return { version, value };
  });

  const match = sigs.some((s) => {
    if (s.version !== 'v1' || !s.value) return false;
    try {
      return crypto.timingSafeEqual(Buffer.from(s.value), Buffer.from(expected));
    } catch {
      return false;
    }
  });

  return match ? { ok: true } : { ok: false, error: 'Firma inválida' };
}

interface ResendEvent {
  type: string; // email.sent | email.delivered | email.opened | email.clicked | email.bounced | email.complained | email.delivery_delayed | email.failed
  created_at?: string;
  data: {
    email_id?: string;
    from?: string;
    to?: string[];
    subject?: string;
    tags?: Array<{ name: string; value: string }>;
    click?: { link?: string; ipAddress?: string; userAgent?: string };
    bounce?: { type?: string; subType?: string; message?: string };
    [k: string]: any;
  };
}

/**
 * Encuentra el EmailEnvio asociado a un evento Resend.
 * Prefiere tag "envio" (id propio), cae a resend_id como fallback.
 */
async function findEnvio(event: ResendEvent) {
  const envioIdTag = event.data.tags?.find((t) => t.name === 'envio')?.value;
  if (envioIdTag) {
    const envio = await prisma.emailEnvio.findUnique({ where: { id: envioIdTag } });
    if (envio) return envio;
  }
  if (event.data.email_id) {
    return prisma.emailEnvio.findFirst({ where: { resendId: event.data.email_id } });
  }
  return null;
}

/**
 * Procesa un evento Resend e impacta tablas: EmailEnvio, EmailEvento, EmailCampana, LeadHistorial, EmailBaja.
 * Idempotente: el mismo evento entregado dos veces no debería duplicar contadores.
 */
export async function processResendEvent(event: ResendEvent): Promise<void> {
  const envio = await findEnvio(event);
  if (!envio) {
    logger.warn(`[webhook] Evento ${event.type} sin envío matched: ${event.data.email_id}`);
    return;
  }

  const fecha = event.created_at ? new Date(event.created_at) : new Date();

  // Registrar SIEMPRE el evento crudo (audit log)
  const tipoMap: Record<string, string> = {
    'email.sent': 'sent',
    'email.delivered': 'delivered',
    'email.opened': 'opened',
    'email.clicked': 'clicked',
    'email.bounced': 'bounced',
    'email.complained': 'complained',
    'email.failed': 'failed',
    'email.delivery_delayed': 'delayed',
  };
  const tipo = tipoMap[event.type] || event.type;

  await prisma.emailEvento.create({
    data: {
      envioId: envio.id,
      tipo,
      datos: event.data as any,
      fecha,
    },
  });

  // Determinar el softwareId vía la campaña (si tiene) o el sender
  const softwareId = await (async () => {
    if (envio.campanaId) {
      const c = await prisma.emailCampana.findUnique({ where: { id: envio.campanaId } });
      return c?.softwareId;
    }
    const s = await prisma.emailSender.findUnique({ where: { id: envio.senderId } });
    return s?.softwareId;
  })();

  switch (event.type) {
    case 'email.opened': {
      // Primer open: actualizar envío + incrementar contador de campaña y variante
      if (!envio.abiertoEn) {
        await prisma.emailEnvio.update({
          where: { id: envio.id },
          data: { abiertoEn: fecha },
        });
        if (envio.campanaId) {
          await prisma.emailCampana.update({
            where: { id: envio.campanaId },
            data: { abiertos: { increment: 1 } },
          });
        }
        if (envio.varianteId) {
          await prisma.emailVariante.update({
            where: { id: envio.varianteId },
            data: { abiertos: { increment: 1 } },
          });
        }
        if (envio.leadId) {
          await prisma.leadHistorial.create({
            data: {
              leadId: envio.leadId,
              tipo: 'email_abierto',
              descripcion: `Email abierto: "${envio.asunto}"`,
            },
          });
        }
      }
      break;
    }

    case 'email.clicked': {
      const isFirstClick = !envio.ultimoClickEn;
      await prisma.emailEnvio.update({
        where: { id: envio.id },
        data: { ultimoClickEn: fecha },
      });
      if (isFirstClick && envio.campanaId) {
        await prisma.emailCampana.update({
          where: { id: envio.campanaId },
          data: { clicks: { increment: 1 } },
        });
      }
      if (isFirstClick && envio.varianteId) {
        await prisma.emailVariante.update({
          where: { id: envio.varianteId },
          data: { clicks: { increment: 1 } },
        });
      }
      if (isFirstClick && envio.leadId) {
        const url = event.data.click?.link;
        await prisma.leadHistorial.create({
          data: {
            leadId: envio.leadId,
            tipo: 'email_click',
            descripcion: `Click en email: "${envio.asunto}"${url ? ` (${url})` : ''}`,
          },
        });
      }
      break;
    }

    case 'email.bounced': {
      if (envio.estado !== 'rebotado') {
        await prisma.emailEnvio.update({
          where: { id: envio.id },
          data: {
            estado: 'rebotado',
            error: event.data.bounce?.message || `${event.data.bounce?.type || ''} ${event.data.bounce?.subType || ''}`.trim() || 'Bounced',
          },
        });
        if (envio.campanaId) {
          await prisma.emailCampana.update({
            where: { id: envio.campanaId },
            data: { rebotes: { increment: 1 } },
          });
        }
        if (envio.varianteId) {
          await prisma.emailVariante.update({
            where: { id: envio.varianteId },
            data: { rebotes: { increment: 1 } },
          });
        }
      }
      break;
    }

    case 'email.complained': {
      // Spam complaint: dar de baja al destinatario y contar
      if (softwareId) {
        await prisma.emailBaja.upsert({
          where: { email_softwareId: { email: envio.destinatario.toLowerCase(), softwareId } },
          update: { motivo: 'spam_complaint' },
          create: {
            email: envio.destinatario.toLowerCase(),
            softwareId,
            motivo: 'spam_complaint',
          },
        });
      }
      if (envio.campanaId) {
        await prisma.emailCampana.update({
          where: { id: envio.campanaId },
          data: { bajas: { increment: 1 } },
        });
      }
      if (envio.leadId) {
        await prisma.leadHistorial.create({
          data: {
            leadId: envio.leadId,
            tipo: 'email_spam_complaint',
            descripcion: 'Destinatario marcó como spam — dado de baja automáticamente',
          },
        });
      }
      break;
    }

    case 'email.delivered':
    case 'email.sent':
    case 'email.failed':
    case 'email.delivery_delayed':
      // Solo audit log, sin side effects de momento
      break;
  }
}
