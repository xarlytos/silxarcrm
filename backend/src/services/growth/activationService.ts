import { PrismaClient } from '@prisma/client';
import { openai } from '../../config/openai';
import { logger } from '../../utils/logger';
import { sendOne } from '../emailService';
import { enviarWhatsapp, renderPlantillaParaLead, generarMensajeResurreccion } from '../whatsappService';
import { iniciarLlamadaAI } from '../llamadaAiService';

const prisma = new PrismaClient();

// ============================================================
// Tipos
// ============================================================

export interface ActivationResult {
  leadId: string;
  score: number;
  category: 'HOT' | 'WARM' | 'COLD';
  actions: string[];
  activated: boolean;
  message?: string;
}

export interface InboundLeadInput {
  nombre: string;
  email?: string;
  telefono?: string;
  empresa?: string;
  cargo?: string;
  pais?: string;
  source: string;
  softwareId: string;
  metadata?: any;
  landingSlug?: string;
  referralCode?: string;
}

export interface ActivationLogEntry {
  id: string;
  leadId: string;
  action: string;
  status: 'PENDING' | 'EXECUTED' | 'FAILED' | 'CANCELLED';
  scheduledAt?: Date;
  executedAt?: Date;
  error?: string;
  metadata?: any;
}

// ============================================================
// Calificación IA + Heurística
// ============================================================

/**
 * Califica un lead con IA (0-100) basado en datos disponibles
 */
export async function qualifyLead(leadId: string): Promise<number> {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      historial: { orderBy: { createdAt: 'desc' }, take: 5 },
    },
  });

  if (!lead) throw new Error('Lead no encontrado');

  // Obtener software por separado (Lead no tiene relación directa)
  const software = lead.softwareId
    ? await prisma.software.findUnique({
        where: { id: lead.softwareId },
        select: { nombre: true, nicho: true, tagline: true },
      })
    : null;

  const prompt = `Analiza este lead y dale una puntuación de 0 a 100 según su potencial de conversión inmediata.

Datos del lead:
- Nombre: ${lead.nombre}
- Email: ${lead.email || 'No disponible'}
- Teléfono: ${lead.telefono ? 'Sí' : 'No'}
- Empresa: ${lead.empresa || 'No disponible'}
- Cargo: ${lead.cargo || 'No disponible'}
- País: ${lead.pais || 'No disponible'}
- Fuente: ${lead.origen}
- Sector: ${software?.nicho || 'General'}
- Estado actual: ${lead.estado}
- Prioridad: ${lead.prioridad}

Historial reciente:
${(lead as any).historial?.map((h: any) => `- ${h.tipo}: ${h.descripcion}`).join('\n') || 'Sin historial'}

REGLAS DE PUNTUACIÓN (aplica las que correspondan):
- +30 si tiene teléfono Y email (datos completos)
- +20 si viene de fuente de alta intención: SEO, referido, demo_request, calendly, landing page
- +20 si es de país objetivo (España, México, Colombia, Argentina, Chile, Perú, Uruguay)
- +15 si tiene cargo de decisor (CEO, Director, Gerente, Manager, Fundador, Owner, CTO)
- +10 si viene de LinkedIn o marketplace con buena reputación
- +10 por cada interacción previa positiva en el historial
- -15 si viene de listas genéricas, scraping masivo, bulk o CSV frio
- -20 si estado es RECHAZADO o NO_RESPONDE
- -10 si solo tiene email (sin teléfono)
- +5 si tiene empresa especificada

Devuelve SOLO un número del 0 al 100, sin explicaciones.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: prompt }],
      temperature: 0.2,
      max_tokens: 10,
    });

    const content = response.choices[0].message.content;
    if (!content) return heuristicScore(lead);

    const score = parseInt(content.replace(/\D/g, ''));
    return isNaN(score) ? heuristicScore(lead) : Math.max(0, Math.min(100, score));
  } catch (err) {
    logger.warn('[Activation] Error calificando con IA, usando heurística:', (err as Error).message);
    return heuristicScore(lead);
  }
}

/**
 * Scoring heurístico de fallback (sin llamadas a IA)
 */
function heuristicScore(lead: any): number {
  let score = 50;

  if (lead.telefono && lead.email) score += 30;
  else if (lead.email || lead.telefono) score += 15;

  if (lead.pais && ['ES', 'MX', 'CO', 'AR', 'CL', 'PE', 'UY'].includes(lead.pais.toUpperCase())) {
    score += 20;
  }

  const highIntentSources = ['seo', 'referral', 'referido', 'demo_request', 'calendly', 'landing', 'inbound'];
  if (highIntentSources.some((s) => lead.origen?.toLowerCase().includes(s))) {
    score += 20;
  }

  const decisionMakerTitles = ['ceo', 'director', 'gerente', 'manager', 'fundador', 'owner', 'cto', 'coo'];
  if (decisionMakerTitles.some((t) => lead.cargo?.toLowerCase().includes(t))) {
    score += 15;
  }

  const lowIntentSources = ['scraping', 'lista', 'bulk', 'csv', 'cold'];
  if (lowIntentSources.some((s) => lead.origen?.toLowerCase().includes(s))) {
    score -= 20;
  }

  if (lead.estado === 'RECHAZADO' || lead.estado === 'NO_RESPONDE') {
    score -= 20;
  }

  if (lead.prioridad === 'URGENTE') score += 10;
  if (lead.prioridad === 'ALTA') score += 5;
  if (lead.empresa) score += 5;

  return Math.max(0, Math.min(100, score));
}

// ============================================================
// Ejecución de acciones con servicios reales
// ============================================================

/**
 * Busca o crea un sender de email por defecto para un software
 */
async function getDefaultSender(softwareId: string) {
  const sender = await prisma.emailSender.findFirst({
    where: { softwareId, esDefault: true, activo: true },
  });
  if (sender) return sender;

  // Fallback: cualquier sender activo
  return prisma.emailSender.findFirst({
    where: { softwareId, activo: true },
    orderBy: { createdAt: 'asc' },
  });
}

/**
 * Busca una plantilla de WhatsApp por categoría
 */
async function getWhatsappPlantilla(softwareId: string, categoria: string) {
  return prisma.whatsappPlantilla.findFirst({
    where: { softwareId, categoria, activa: true },
    orderBy: { orden: 'asc' },
  });
}

/**
 * Envía email de bienvenida a un lead HOT
 */
async function sendWelcomeEmail(leadId: string, softwareId: string): Promise<boolean> {
  try {
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead || !lead.email) {
      logger.warn(`[Activation] No se puede enviar email: lead ${leadId} sin email`);
      return false;
    }

    const sender = await getDefaultSender(softwareId);
    if (!sender) {
      logger.warn(`[Activation] No hay sender de email configurado para ${softwareId}`);
      return false;
    }

    // Buscar plantilla de bienvenida o usar mensaje por defecto
    const software = await prisma.software.findUnique({
      where: { id: softwareId },
      select: { nombre: true, tagline: true, urlWebsite: true },
    });

    const asunto = `¡Bienvenido/a ${lead.nombre}! Descubre ${software?.nombre || 'nuestra solución'}`;

    const cuerpoHtml = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#333;">
  <h2 style="color:#6366F1;">¡Hola ${lead.nombre}!</h2>
  <p>Gracias por tu interés en <strong>${software?.nombre || 'nosotros'}</strong>.</p>
  <p>${software?.tagline || 'Te ayudamos a hacer crecer tu negocio.'}</p>
  <p>Veo que trabajas${lead.empresa ? ` en <strong>${lead.empresa}</strong>` : ''}. Me encantaría mostrarte en una demo de 15 minutos cómo podemos ayudarte específicamente.</p>
  <div style="text-align:center;margin:32px 0;">
    <a href="${software?.urlWebsite || '#'}?source=email_welcome&utm_campaign=growth_activation"
       style="background:#6366F1;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;">
      Agendar demo
    </a>
  </div>
  <p style="font-size:14px;color:#666;">¿Tienes alguna pregunta? Responde a este email o escríbenos por WhatsApp.</p>
  <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
  <p style="font-size:12px;color:#999;">${software?.nombre || ''} — Powered by peluguau.com</p>
</body>
</html>`;

    await sendOne({
      softwareId,
      leadId: lead.id,
      senderId: sender.id,
      destinatario: lead.email,
      asunto,
      cuerpoHtml,
    });

    logger.info(`[Activation] Email de bienvenida enviado a ${lead.email}`);
    return true;
  } catch (err) {
    logger.error(`[Activation] Error enviando email de bienvenida a ${leadId}:`, err);
    return false;
  }
}

/**
 * Envía WhatsApp de seguimiento
 */
async function sendWhatsappFollowup(
  leadId: string,
  softwareId: string,
  tipo: 'bienvenida_hot' | 'seguimiento_warm' | 'reengagement'
): Promise<boolean> {
  try {
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead || !lead.telefono) {
      logger.warn(`[Activation] No se puede enviar WhatsApp: lead ${leadId} sin teléfono`);
      return false;
    }

    // Mapeo de tipos a categorías de plantilla
    const categoriaMap: Record<string, string> = {
      bienvenida_hot: 'bienvenida',
      seguimiento_warm: 'follow_up',
      reengagement: 'reactivacion',
    };

    const categoria = categoriaMap[tipo] || 'general';
    const plantilla = await getWhatsappPlantilla(softwareId, categoria);

    let contenidoFinal: string | undefined;
    if (plantilla) {
      contenidoFinal = renderPlantillaParaLead(plantilla.contenido, lead);
    } else {
      // Mensaje por defecto según tipo
      const software = await prisma.software.findUnique({
        where: { id: softwareId },
        select: { nombre: true },
      });
      const nombre = (lead.nombre || '').split(/\s+/)[0] || 'Hola';

      if (tipo === 'bienvenida_hot') {
        contenidoFinal = `¡${nombre}! 👋 Vi que te interesa ${software?.nombre || 'nuestra solución'}. ¿Tienes 5 min ahora para una demo rápida? Te muestro cómo funciona en tu caso específico.`;
      } else if (tipo === 'seguimiento_warm') {
        contenidoFinal = `Hola ${nombre} 😊 Te escribo por ${software?.nombre || 'nuestro servicio'}. He preparado algo que puede interesarte para ${lead.empresa || 'tu negocio'}. ¿Tienes un momento?`;
      } else {
        contenidoFinal = `Hola ${nombre} 👋 Hace tiempo que no hablamos. ¿Sigues buscando una solución para ${lead.empresa || 'tu negocio'}? Tenemos novedades que te pueden interesar.`;
      }
    }

    await enviarWhatsapp({
      leadId: lead.id,
      plantillaId: plantilla?.id,
      contenidoFinal,
    });

    logger.info(`[Activation] WhatsApp ${tipo} enviado a ${lead.telefono}`);
    return true;
  } catch (err) {
    logger.error(`[Activation] Error enviando WhatsApp a ${leadId}:`, err);
    return false;
  }
}

/**
 * Inicia una llamada AI a un lead
 */
async function startAiCall(leadId: string, softwareId: string): Promise<boolean> {
  try {
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead || !lead.telefono) {
      logger.warn(`[Activation] No se puede llamar: lead ${leadId} sin teléfono`);
      return false;
    }

    // Buscar un usuario/agente por defecto
    const agente = await prisma.usuarioCrm.findFirst({
      where: { activo: true },
      orderBy: { id: 'asc' },
    });

    if (!agente) {
      logger.warn(`[Activation] No hay agente activo para iniciar llamada AI`);
      return false;
    }

    // Buscar spech por defecto
    const spech = await prisma.spechLlamada.findFirst({
      where: { softwareId, activo: true, esDefault: true },
    });

    await iniciarLlamadaAI({
      leadId: lead.id,
      spechId: spech?.id,
      agenteId: agente.id,
    });

    logger.info(`[Activation] Llamada AI iniciada a ${lead.nombre} (${lead.telefono})`);
    return true;
  } catch (err) {
    logger.error(`[Activation] Error iniciando llamada AI a ${leadId}:`, err);
    return false;
  }
}

/**
 * Envía un email de nurturing (drip campaign)
 */
async function sendDripEmail(
  leadId: string,
  softwareId: string,
  dripType: 'warm_1' | 'warm_2' | 'warm_3' | 'cold_1' | 'cold_2'
): Promise<boolean> {
  try {
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead || !lead.email) return false;

    const sender = await getDefaultSender(softwareId);
    if (!sender) return false;

    const software = await prisma.software.findUnique({
      where: { id: softwareId },
      select: { nombre: true, nicho: true, tagline: true, urlWebsite: true, problemaPrincipal: true, promesaValor: true },
    });

    const nicho = software?.nicho || 'tu sector';
    const nombre = (lead.nombre || '').split(/\s+/)[0] || 'Hola';

    const dripContent: Record<string, { asunto: string; cuerpo: string }> = {
      warm_1: {
        asunto: `${nombre}, esto es lo que le funciona a otros ${nicho}`,
        cuerpo: `<p>Hola ${nombre},</p><p>Veo que trabajas${lead.empresa ? ` en <strong>${lead.empresa}</strong>` : ''}. Quería compartirte un dato: los ${nicho} que usan ${software?.nombre || 'nuestra solución'} ahorran en promedio 8 horas semanales en tareas administrativas.</p><p><a href="${software?.urlWebsite || '#'}?source=drip&utm_campaign=growth_warm">Ver cómo funciona →</a></p>`,
      },
      warm_2: {
        asunto: `Caso real: cómo un ${nicho} creció un 40%`,
        cuerpo: `<p>Hola ${nombre},</p><p>Te cuento un caso real: un ${nicho} similar al tuyo implementó ${software?.nombre || 'nuestro sistema'} y en 3 meses:</p><ul><li>Redujo cancelaciones un 35%</li><li>Aumentó reservas un 40%</li><li>Ahorró 12h/semana en admin</li></ul><p><a href="${software?.urlWebsite || '#'}?source=drip&utm_campaign=growth_warm">Quiero saber más →</a></p>`,
      },
      warm_3: {
        asunto: `¿Todavía interesado, ${nombre}?`,
        cuerpo: `<p>Hola ${nombre},</p><p>Sé que tienes mucho en la cabeza. Solo quería recordarte que estoy aquí si quieres hablar sobre cómo mejorar ${lead.empresa || 'tu negocio'}.</p><p>Una demo de 10 minutos basta para que veas si encaja. Sin compromiso.</p><p><a href="${software?.urlWebsite || '#'}?source=drip&utm_campaign=growth_warm">Agendar demo →</a></p>`,
      },
      cold_1: {
        asunto: `Un recurso gratuito para ${nicho}`,
        cuerpo: `<p>Hola ${nombre},</p><p>Sé que ahora mismo no es el mejor momento. Pero te dejo aquí una guía gratuita que preparé para ${nicho}: <em>"5 errores que cuestan dinero y cómo evitarlos"</em>.</p><p><a href="${software?.urlWebsite || '#'}?source=drip&utm_campaign=growth_cold">Descargar guía gratis →</a></p><p>Sin spam, prometido.</p>`,
      },
      cold_2: {
        asunto: `Último mensaje, ${nombre}`,
        cuerpo: `<p>Hola ${nombre},</p><p>Este será mi último email. No quiero molestar.</p><p>Si en algún momento necesitas ayuda con ${software?.promesaValor || 'tu negocio'}, ya sabes dónde encontrarme.</p><p>Un saludo,<br>El equipo de ${software?.nombre || 'peluguau.com'}</p>`,
      },
    };

    const content = dripContent[dripType];
    if (!content) return false;

    const cuerpoHtml = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#333;">
  ${content.cuerpo}
  <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
  <p style="font-size:12px;color:#999;">${software?.nombre || ''} — Powered by peluguau.com</p>
</body>
</html>`;

    await sendOne({
      softwareId,
      leadId: lead.id,
      senderId: sender.id,
      destinatario: lead.email,
      asunto: content.asunto,
      cuerpoHtml,
    });

    logger.info(`[Activation] Drip email ${dripType} enviado a ${lead.email}`);
    return true;
  } catch (err) {
    logger.error(`[Activation] Error enviando drip email a ${leadId}:`, err);
    return false;
  }
}

/**
 * Envía un mensaje de resurrección por WhatsApp.
 * Usa el mensaje pre-generado de metadata si existe; si no, lo genera con IA
 * en el momento del envío (lazy) reutilizando el pretexto de la campaña.
 */
async function sendResurreccionWhatsapp(leadId: string, metadata?: any): Promise<boolean> {
  try {
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead || !lead.telefono) {
      logger.warn(`[Resurreccion] Lead ${leadId} sin teléfono, se omite WhatsApp`);
      return false;
    }

    let mensaje: string | undefined = metadata?.mensaje;
    if (!mensaje) {
      const gen = await generarMensajeResurreccion(leadId, metadata?.pretexto);
      mensaje = gen.mensaje;
    }
    if (!mensaje?.trim()) return false;

    await enviarWhatsapp({ leadId, contenidoFinal: mensaje });
    logger.info(`[Resurreccion] WhatsApp de resurrección enviado a ${lead.telefono}`);
    return true;
  } catch (err) {
    logger.error(`[Resurreccion] Error enviando WhatsApp a ${leadId}:`, err);
    return false;
  }
}

/**
 * Envía un mensaje de resurrección por email.
 */
async function sendResurreccionEmail(leadId: string, metadata?: any): Promise<boolean> {
  try {
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead || !lead.email) {
      logger.warn(`[Resurreccion] Lead ${leadId} sin email, se omite email`);
      return false;
    }

    const sender = await getDefaultSender(lead.softwareId);
    if (!sender) {
      logger.warn(`[Resurreccion] No hay sender de email configurado para ${lead.softwareId}`);
      return false;
    }

    let mensaje: string | undefined = metadata?.mensaje;
    if (!mensaje) {
      const gen = await generarMensajeResurreccion(leadId, metadata?.pretexto);
      mensaje = gen.mensaje;
    }
    if (!mensaje?.trim()) return false;

    const software = await prisma.software.findUnique({
      where: { id: lead.softwareId },
      select: { nombre: true },
    });
    const nombre = (lead.nombre || '').split(/\s+/)[0] || 'Hola';
    const asunto = metadata?.asunto || `${nombre}, te escribo de nuevo`;

    // El mensaje de IA viene en texto plano: lo pasamos a párrafos HTML
    const cuerpoParrafos = mensaje
      .split(/\n+/)
      .filter((l) => l.trim())
      .map((l) => `<p>${l.trim()}</p>`)
      .join('');

    const cuerpoHtml = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#333;">
  ${cuerpoParrafos}
  <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
  <p style="font-size:12px;color:#999;">${software?.nombre || ''} — Powered by peluguau.com</p>
</body>
</html>`;

    await sendOne({
      softwareId: lead.softwareId,
      leadId: lead.id,
      senderId: sender.id,
      destinatario: lead.email,
      asunto,
      cuerpoHtml,
    });

    logger.info(`[Resurreccion] Email de resurrección enviado a ${lead.email}`);
    return true;
  } catch (err) {
    logger.error(`[Resurreccion] Error enviando email a ${leadId}:`, err);
    return false;
  }
}

// ============================================================
// Scheduling y ejecución
// ============================================================

/**
 * Programa una acción para ejecución futura usando la tabla ActivationLog
 */
export async function scheduleAction(
  leadId: string,
  actionType: string,
  delayMs: number,
  metadata?: any
): Promise<string> {
  const scheduledAt = new Date(Date.now() + delayMs);

  const log = await prisma.activationLog.create({
    data: {
      leadId,
      action: actionType,
      status: 'PENDING',
      scheduledAt,
      metadata: metadata || {},
    },
  });

  logger.info(`[Activation] Acción ${actionType} programada para lead ${leadId} a las ${scheduledAt.toISOString()}`);
  return log.id;
}

/**
 * Ejecuta una acción programada
 */
export async function executeAction(leadId: string, actionType: string, metadata?: any): Promise<boolean> {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
  });

  if (!lead) {
    logger.warn(`[Activation] Lead ${leadId} no encontrado al ejecutar acción ${actionType}`);
    return false;
  }

  const softwareId = lead.softwareId;

  switch (actionType) {
    case 'resurreccion_whatsapp':
      return sendResurreccionWhatsapp(leadId, metadata);

    case 'resurreccion_email':
      return sendResurreccionEmail(leadId, metadata);

    case 'email_welcome':
      return sendWelcomeEmail(leadId, softwareId);

    case 'whatsapp_followup':
      return sendWhatsappFollowup(leadId, softwareId, 'bienvenida_hot');

    case 'whatsapp_warm':
      return sendWhatsappFollowup(leadId, softwareId, 'seguimiento_warm');

    case 'ai_call':
      return startAiCall(leadId, softwareId);

    case 'drip_warm_1':
      return sendDripEmail(leadId, softwareId, 'warm_1');

    case 'drip_warm_2':
      return sendDripEmail(leadId, softwareId, 'warm_2');

    case 'drip_warm_3':
      return sendDripEmail(leadId, softwareId, 'warm_3');

    case 'drip_cold_1':
      return sendDripEmail(leadId, softwareId, 'cold_1');

    case 'drip_cold_2':
      return sendDripEmail(leadId, softwareId, 'cold_2');

    case 'reengagement':
      return sendWhatsappFollowup(leadId, softwareId, 'reengagement');

    default:
      logger.warn(`[Activation] Tipo de acción desconocido: ${actionType}`);
      return false;
  }
}

/**
 * Procesa todas las activaciones pendientes que ya deberían ejecutarse
 * Llamado por el cron job
 */
export async function processPendingActivations(): Promise<{ processed: number; failed: number }> {
  const now = new Date();

  const pending = await prisma.activationLog.findMany({
    where: {
      status: 'PENDING',
      scheduledAt: { lte: now },
    },
    take: 100,
    orderBy: { scheduledAt: 'asc' },
  });

  let processed = 0;
  let failed = 0;

  for (const log of pending) {
    try {
      const success = await executeAction(log.leadId, log.action, log.metadata);

      await prisma.activationLog.update({
        where: { id: log.id },
        data: {
          status: success ? 'EXECUTED' : 'FAILED',
          executedAt: new Date(),
          ...(success ? {} : { error: 'La acción retornó fallo' }),
        },
      });

      if (success) processed++;
      else failed++;
    } catch (err) {
      logger.error(`[Activation] Error procesando activación ${log.id}:`, err);
      await prisma.activationLog.update({
        where: { id: log.id },
        data: {
          status: 'FAILED',
          executedAt: new Date(),
          error: (err as Error).message,
        },
      });
      failed++;
    }
  }

  return { processed, failed };
}

// ============================================================
// Activación principal
// ============================================================

/**
 * Activa la secuencia de follow-up automática para un lead
 * El LOOP DE ORO del Growth Engine
 */
export async function activateLead(leadId: string, source?: string): Promise<ActivationResult> {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
  });

  if (!lead) throw new Error('Lead no encontrado');

  // Obtener config del software
  const growthConfig = lead.softwareId
    ? await prisma.growthConfig.findUnique({
        where: { softwareId: lead.softwareId },
      })
    : null;

  // Si la activación automática está desactivada, salir
  if (!growthConfig?.autoActivate) {
    return {
      leadId,
      score: 0,
      category: 'COLD',
      actions: ['Activación automática desactivada'],
      activated: false,
      message: 'La activación automática está desactivada en la configuración',
    };
  }

  // Calificar
  const score = await qualifyLead(leadId);

  let category: 'HOT' | 'WARM' | 'COLD';
  if (score >= 80) category = 'HOT';
  else if (score >= 50) category = 'WARM';
  else category = 'COLD';

  // Actualizar lead con score y estado
  await prisma.lead.update({
    where: { id: leadId },
    data: {
      estado: lead.estado === 'NUEVO' ? 'CONTACTADO' : lead.estado,
      prioridad: score >= 80 ? 'URGENTE' : score >= 50 ? 'ALTA' : 'MEDIA',
      metadata: {
        ...(typeof lead.metadata === 'object' && lead.metadata !== null ? lead.metadata : {}),
        growthScore: score,
        growthCategory: category,
        growthActivatedAt: new Date().toISOString(),
        growthSource: source || lead.origen,
      },
    },
  });

  const actions: string[] = [];
  const channel = growthConfig?.activationChannel || 'email';

  if (category === 'HOT') {
    // HOT: Email inmediato + WhatsApp en 30min + Llamada IA en 2h
    actions.push('Email de bienvenida personalizado');
    await scheduleAction(leadId, 'email_welcome', 0, { category, score });

    actions.push('WhatsApp de seguimiento en 30 minutos');
    await scheduleAction(leadId, 'whatsapp_followup', 30 * 60 * 1000, { category, score });

    if (channel === 'llamada' || channel === 'email') {
      actions.push('Llamada IA programada en 2 horas');
      await scheduleAction(leadId, 'ai_call', 2 * 60 * 60 * 1000, { category, score });
    }
  } else if (category === 'WARM') {
    // WARM: Drip campaign de 3 emails + WhatsApp en 3 días
    actions.push('Drip campaign de nurturing (3 emails)');
    await scheduleAction(leadId, 'drip_warm_1', 0, { category, score, dripIndex: 1 });
    await scheduleAction(leadId, 'drip_warm_2', 3 * 24 * 60 * 60 * 1000, { category, score, dripIndex: 2 });
    await scheduleAction(leadId, 'drip_warm_3', 7 * 24 * 60 * 60 * 1000, { category, score, dripIndex: 3 });

    actions.push('WhatsApp de seguimiento en 3 días');
    await scheduleAction(leadId, 'whatsapp_warm', 3 * 24 * 60 * 60 * 1000, { category, score });
  } else {
    // COLD: Nurturing lento
    actions.push('Drip campaign de nurturing lento');
    await scheduleAction(leadId, 'drip_cold_1', 0, { category, score });
    await scheduleAction(leadId, 'drip_cold_2', 14 * 24 * 60 * 60 * 1000, { category, score });

    actions.push('Re-engagement en 30 días');
    await scheduleAction(leadId, 'reengagement', 30 * 24 * 60 * 60 * 1000, { category, score });
  }

  // Log en historial del lead
  await prisma.leadHistorial.create({
    data: {
      leadId,
      tipo: 'ACTIVACIÓN_GROWTH',
      descripcion: `Lead activado automáticamente. Score: ${score}/100 (${category}). Canal: ${channel}. Acciones: ${actions.join(', ')}`,
    },
  });

  logger.info(`[Activation] Lead ${leadId} activado. Score: ${score}, Categoría: ${category}, Acciones: ${actions.join(', ')}`);

  return {
    leadId,
    score,
    category,
    actions,
    activated: true,
    message: `Lead calificado como ${category} (${score}/100). ${actions.length} acciones programadas.`,
  };
}

// ============================================================
// Inbound Lead Processing
// ============================================================

/**
 * Procesa un lead que entró por inbound (formulario, landing, etc.)
 * El punto de entrada principal del Growth Engine
 */
export async function processInboundLead(data: InboundLeadInput): Promise<ActivationResult> {
  // Verificar si ya existe lead con ese email en el mismo software
  let lead;

  if (data.email) {
    const existing = await prisma.lead.findUnique({
      where: { email_softwareId: { email: data.email, softwareId: data.softwareId } },
    });

    if (existing) {
      // Actualizar lead existente con nueva información
      lead = await prisma.lead.update({
        where: { id: existing.id },
        data: {
          nombre: data.nombre || existing.nombre,
          telefono: data.telefono || existing.telefono,
          empresa: data.empresa || existing.empresa,
          cargo: data.cargo || existing.cargo,
          pais: data.pais || existing.pais,
          estado: existing.estado === 'RECHAZADO' ? 'NUEVO' : existing.estado,
          metadata: {
            ...(typeof existing.metadata === 'object' && existing.metadata !== null ? existing.metadata : {}),
            ...data.metadata,
            inboundAt: new Date().toISOString(),
            landingSlug: data.landingSlug,
            referralCode: data.referralCode,
          },
        },
      });

      logger.info(`[Activation] Lead existente actualizado por inbound: ${lead.id}`);
    }
  }

  if (!lead) {
    // Crear nuevo lead
    lead = await prisma.lead.create({
      data: {
        nombre: data.nombre,
        email: data.email,
        telefono: data.telefono,
        empresa: data.empresa,
        cargo: data.cargo,
        pais: data.pais,
        origen: data.source,
        softwareId: data.softwareId,
        estado: 'NUEVO',
        metadata: {
          ...data.metadata,
          inboundAt: new Date().toISOString(),
          landingSlug: data.landingSlug,
          referralCode: data.referralCode,
        },
      },
    });

    logger.info(`[Activation] Nuevo lead inbound creado: ${lead.id} (${data.source})`);
  }

  // Pequeño delay antes de activar (5 minutos como dice el plan)
  // En producción esto se maneja con el schedule, pero para inbound inmediato
  // podemos activar directamente y el schedule maneja los delays
  return activateLead(lead.id, data.source);
}

// ============================================================
// Logs y Analytics
// ============================================================

/**
 * Obtiene el log de activaciones para un lead
 */
export async function getActivationLogs(leadId: string) {
  return prisma.activationLog.findMany({
    where: { leadId },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Obtiene estadísticas de activación para un software
 */
export async function getActivationStats(softwareId: string, days: number = 30) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [total, executed, failed, pending, hot, warm, cold] = await Promise.all([
    prisma.activationLog.count({
      where: { lead: { softwareId }, createdAt: { gte: since } },
    }),
    prisma.activationLog.count({
      where: { lead: { softwareId }, status: 'EXECUTED', createdAt: { gte: since } },
    }),
    prisma.activationLog.count({
      where: { lead: { softwareId }, status: 'FAILED', createdAt: { gte: since } },
    }),
    prisma.activationLog.count({
      where: { lead: { softwareId }, status: 'PENDING', createdAt: { gte: since } },
    }),
    prisma.lead.count({
      where: {
        softwareId,
        metadata: { path: ['growthCategory'], equals: 'HOT' },
        createdAt: { gte: since },
      },
    }),
    prisma.lead.count({
      where: {
        softwareId,
        metadata: { path: ['growthCategory'], equals: 'WARM' },
        createdAt: { gte: since },
      },
    }),
    prisma.lead.count({
      where: {
        softwareId,
        metadata: { path: ['growthCategory'], equals: 'COLD' },
        createdAt: { gte: since },
      },
    }),
  ]);

  return {
    total,
    executed,
    failed,
    pending,
    byCategory: { hot, warm, cold },
    successRate: total > 0 ? Math.round((executed / total) * 100) : 0,
  };
}

/**
 * Obtiene leads recientes activados para un software
 */
export async function getRecentActivatedLeads(softwareId: string, limit: number = 20) {
  return prisma.lead.findMany({
    where: {
      softwareId,
      metadata: { path: ['growthScore'], not: { equals: null } },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      nombre: true,
      email: true,
      telefono: true,
      empresa: true,
      estado: true,
      metadata: true,
      createdAt: true,
    },
  });
}

// ============================================================
// Preview / Simulación
// ============================================================

/**
 * Simula la calificación de un lead sin guardar nada
 */
export async function previewActivation(leadId: string): Promise<ActivationResult> {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) throw new Error('Lead no encontrado');

  const score = await qualifyLead(leadId);

  let category: 'HOT' | 'WARM' | 'COLD';
  if (score >= 80) category = 'HOT';
  else if (score >= 50) category = 'WARM';
  else category = 'COLD';

  const actions: string[] = [];

  if (category === 'HOT') {
    actions.push('Email de bienvenida personalizado');
    actions.push('WhatsApp de seguimiento en 30 minutos');
    actions.push('Llamada IA programada en 2 horas');
  } else if (category === 'WARM') {
    actions.push('Drip campaign de nurturing (3 emails en 7 días)');
    actions.push('WhatsApp de seguimiento en 3 días');
  } else {
    actions.push('Drip campaign de nurturing lento (2 emails en 14 días)');
    actions.push('Re-engagement por WhatsApp en 30 días');
  }

  return {
    leadId,
    score,
    category,
    actions,
    activated: false,
    message: `PREVIEW: Lead calificado como ${category} (${score}/100). No se ejecutaron acciones.`,
  };
}

export default {
  qualifyLead,
  activateLead,
  processInboundLead,
  processPendingActivations,
  executeAction,
  scheduleAction,
  getActivationLogs,
  getActivationStats,
  getRecentActivatedLeads,
  previewActivation,
  sendWelcomeEmail,
  sendWhatsappFollowup,
  startAiCall,
  sendDripEmail,
};
