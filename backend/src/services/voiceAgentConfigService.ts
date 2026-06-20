import { prisma } from '../config/database';
import { logger } from '../utils/logger';

// ── Tipos ──

export interface ScriptsConfig {
  pattern_interrupt: string;
  problema: string;
  solucion: string;
  cierre: string;
  saludos: string[];
  problemas: string[];
  cierres: string[];
}

export interface SuccessCase {
  empresa: string;
  ciudad: string;
  resultado: string;
  metrica_destacada?: string;
  testimonial?: string;
  tiempo_a_resultado?: string;
}

export interface PainPoints {
  dolor_principal: string;
  ejemplos: string[];
  keywords: string[];
}

export interface CompetitorComparison {
  diferencias: string[];
  caso_exito: string;
}

export interface CompetitorComparisons {
  [key: string]: CompetitorComparison;
}

export interface WhatsAppTemplates {
  info: string;
  confirmacion_demo: string;
  despedida: string;
  auditoria_web: string;
}

export interface VoiceAgentConfigInput {
  agentName?: string;
  agentGender?: string;
  agentAccent?: string;
  agentTone?: string;
  agentExperienceYears?: number;
  elevenlabsVoiceId?: string;
  companyName?: string;
  productName?: string;
  productDescription?: string;
  targetVertical?: string;
  targetAudience?: string;
  currency?: string;
  currencySymbol?: string;
  marketCountry?: string;
  marketCityExamples?: string;
  priceMonthly?: number;
  scripts?: ScriptsConfig;
  successCases?: SuccessCase[];
  painPoints?: PainPoints;
  competitorComparisons?: CompetitorComparisons;
  freeValueOffer?: string;
  auditoriaBaseUrl?: string;
  auditoriaEnabled?: boolean;
  gatekeeperScript?: string;
  gatekeeperMaxTurns?: number;
  whatsappSenderName?: string;
  whatsappTemplates?: WhatsAppTemplates;
  followUpEmailSender?: string;
  followUpEmailSubject?: string;
  disclosureText?: string;
  callHourStart?: number;
  callHourEnd?: number;
  callDaysAllowed?: string;
  twilioCnamName?: string;
  twilioFromNumber?: string;
}

// ── Defaults por mercado ──

const DEFAULT_SCRIPTS: ScriptsConfig = {
  pattern_interrupt:
    '{{nombre}}? Sé que es un día ocupado en {{empresa}}. Llamo porque noté que muchos negocios en {{ciudad}} están perdiendo hasta 30% de ingresos por citas no-show. ¿Eso te resuena?',
  problema: '¿Cuántas citas les cancelan a la semana sin avisar?',
  solucion:
    'Negocios similares redujeron no-shows de 30% a menos de 8% con recordatorios automáticos.',
  cierre: '¿Le agendo una demo de 15 minutos para mostrarle exactamente cómo funciona?',
  saludos: [
    '{{nombre}}? Sé que le están interrumpiendo — le prometo que valdrá la pena. Me fijé que {{empresa}} en {{ciudad}} sigue usando agenda manual. ¿Cuántos clientes cree que pierden cada mes?',
  ],
  problemas: [
    '¿Cuántas citas les cancelan a la semana sin avisar?',
    '¿Y ahorita cómo le recuerdan a los clientes sus citas?',
  ],
  cierres: [
    '¿Le agendo una demo de 15 minutos? ¿Le va mejor mañana o pasado?',
  ],
};

const DEFAULT_WHATSAPP_TEMPLATES: WhatsAppTemplates = {
  info: '¡Hola! Soy {senderName} de {companyName}. Te envío la información que pediste sobre cómo organizar tu negocio. ¿Te gustaría agendar una demo de 15 min?',
  confirmacion_demo:
    '¡Hola {nombre}! Confirmo tu demo de {companyName} para el {fecha} a las {hora}. Te va a encantar ver cómo funciona. Link: {link}',
  despedida:
    '¡Hola {nombre}! Fue un gusto hablar contigo. Te envío el resumen de {companyName}. Quedo atento/a por si tienes alguna duda.',
  auditoria_web:
    '¡Hola {nombre}! He preparado una auditoría personalizada para {empresa}. Puedes verla aquí: {link} En 2 minutos verás cuánto podrías recuperar.',
};

// ── Generar config desde Software existente ──

export async function generateFromSoftware(softwareId: string): Promise<VoiceAgentConfigInput> {
  const software = await prisma.software.findUnique({
    where: { id: softwareId },
  });

  if (!software) {
    throw new Error(`Software ${softwareId} no encontrado`);
  }

  const dolores: string[] = [];
  if (software.icpDolorTop1) dolores.push(software.icpDolorTop1);
  if (software.icpDolorTop2) dolores.push(software.icpDolorTop2);
  if (software.icpDolorTop3) dolores.push(software.icpDolorTop3);

  const painPoints: PainPoints = {
    dolor_principal: software.problemaPrincipal || 'citas perdidas y recordatorios manuales',
    ejemplos: dolores.length > 0 ? dolores : ['citas que se cancelan sin avisar', 'clientes que no vuelven'],
    keywords: [
      'agenda',
      'citas',
      'cancelaciones',
      'no-show',
      'recordatorios',
      'whatsapp',
    ],
  };

  // Detectar moneda/país por el dominioLanding o slug
  const esMexico =
    software.dominioLanding?.includes('.mx') ||
    software.slug?.includes('peluguau') ||
    software.slug?.includes('mex');
  const currency = esMexico ? 'MXN' : 'EUR';
  const currencySymbol = esMexico ? '$' : '€';
  const marketCountry = esMexico ? 'mx' : 'es';
  const marketCityExamples = esMexico
    ? 'CDMX, Guadalajara, Monterrey'
    : 'Madrid, Barcelona, Valencia';

  // Precio default por nicho
  const nicho = (software.nicho || '').toLowerCase();
  let priceMonthly = 39;
  if (nicho.includes('dental') || nicho.includes('dentista')) priceMonthly = 59;
  else if (nicho.includes('gimnasio') || nicho.includes('fitness')) priceMonthly = 59;
  else if (nicho.includes('veterinaria')) priceMonthly = 49;
  else if (nicho.includes('peluqueria') || nicho.includes('spa')) priceMonthly = 29;

  // Nombre del agente por nicho/país
  let agentName = 'Carlos';
  let agentAccent = 'es-ES';
  if (esMexico) {
    agentName = nicho.includes('peluqueria') ? 'Laura' : 'Miguel';
    agentAccent = 'es-MX';
  }

  return {
    agentName,
    agentGender: 'masculino',
    agentAccent,
    agentTone: 'profesional_cercano',
    agentExperienceYears: 4,
    companyName: software.nombre,
    productName: software.nombre,
    productDescription:
      software.promesaValor ||
      software.descripcion ||
      `Software de gestión para ${software.nicho || 'negocios'}`,
    targetVertical: software.nicho || 'negocios de servicios',
    targetAudience: software.icpTitulo || `dueños de ${software.nicho || 'negocios'}`,
    currency,
    currencySymbol,
    marketCountry,
    marketCityExamples,
    priceMonthly,
    scripts: DEFAULT_SCRIPTS,
    successCases: [
      {
        empresa: `Cliente destacado de ${software.nombre}`,
        ciudad: marketCityExamples.split(',')[0].trim(),
        resultado: 'redujeron citas perdidas y organizaron su agenda',
        metrica_destacada: 'aumento de productividad del 40%',
        tiempo_a_resultado: '2 meses',
      },
    ],
    painPoints,
    competitorComparisons: {
      calendly: {
        diferencias: [
          'Calendly solo agenda. Nuestro sistema además manda recordatorios por WhatsApp, cobra y da seguimiento.',
          'Nuestro sistema guarda el historial de cada cliente como un CRM.',
        ],
        caso_exito: `Varios clientes de ${software.nombre} migraron de Calendly y ahora tienen todo integrado.`,
      },
      excel: {
        diferencias: [
          'Excel no recuerda nada al cliente; nuestro sistema manda recordatorios automáticos.',
          'Con Excel no hay reservas online ni cobros; nuestro sistema sí.',
        ],
        caso_exito: `Negocios que dejaron Excel por ${software.nombre} recuperan citas la primera semana.`,
      },
      papel: {
        diferencias: [
          'La agenda de papel se pierde y no avisa a nadie; nuestro sistema recuerda solo.',
          'Nuestro sistema permite reservar online 24/7 sin que usted conteste.',
        ],
        caso_exito: `Negocios que dejaron el papel por ${software.nombre} llenaron huecos que antes ni veían.`,
      },
    },
    freeValueOffer: `Análisis gratuito de cuánto pierde al mes por citas no-show y cancelaciones. Auditoría personalizada con datos de su zona.`,
    auditoriaBaseUrl: software.dominioLanding
      ? `${software.dominioLanding}/auditoria`
      : `https://auditoria.${software.slug}.com`,
    auditoriaEnabled: true,
    gatekeeperScript: `Perfecto, no se preocupe. Justamente por eso le envío el análisis por email — así el dueño lo ve cuando tenga un momento. Es gratis y sin compromiso. ¿Me confirma el email de la empresa?`,
    gatekeeperMaxTurns: 2,
    whatsappSenderName: esMexico ? 'Sofia' : 'Mariana',
    whatsappTemplates: DEFAULT_WHATSAPP_TEMPLATES,
    disclosureText: `Soy un asistente virtual de {companyName}. ¿Le parece si seguimos?`,
    callHourStart: esMexico ? 9 : 9,
    callHourEnd: esMexico ? 19 : 20,
    callDaysAllowed: '1,2,3,4,5,6',
    twilioCnamName: software.slug.slice(0, 15),
  };
}

// ── CRUD ──

export async function getVoiceAgentConfig(softwareId: string) {
  return prisma.voiceAgentConfig.findUnique({
    where: { softwareId },
  });
}

export async function getVoiceAgentConfigBySlug(slug: string) {
  const software = await prisma.software.findUnique({
    where: { slug },
    include: { voiceAgentConfig: true },
  });
  return software?.voiceAgentConfig || null;
}

export async function createVoiceAgentConfig(
  softwareId: string,
  data: VoiceAgentConfigInput
) {
  const existing = await prisma.voiceAgentConfig.findUnique({
    where: { softwareId },
  });
  if (existing) {
    throw new Error(`VoiceAgentConfig ya existe para software ${softwareId}`);
  }

  return prisma.voiceAgentConfig.create({
    data: {
      softwareId,
      ...data,
    } as any,
  });
}

export async function updateVoiceAgentConfig(
  softwareId: string,
  data: VoiceAgentConfigInput
) {
  return prisma.voiceAgentConfig.update({
    where: { softwareId },
    data: data as any,
  });
}

export async function upsertVoiceAgentConfig(
  softwareId: string,
  data: VoiceAgentConfigInput
) {
  return prisma.voiceAgentConfig.upsert({
    where: { softwareId },
    create: {
      softwareId,
      ...data,
    } as any,
    update: data as any,
  });
}

export async function deleteVoiceAgentConfig(softwareId: string) {
  return prisma.voiceAgentConfig.delete({
    where: { softwareId },
  });
}

// ── Seed / Auto-generar ──

export async function seedVoiceAgentConfigs() {
  const softwares = await prisma.software.findMany({
    include: { voiceAgentConfig: true },
  });

  let created = 0;
  let skipped = 0;

  for (const software of softwares) {
    if (software.voiceAgentConfig) {
      skipped++;
      continue;
    }

    try {
      const config = await generateFromSoftware(software.id);
      await prisma.voiceAgentConfig.create({
        data: {
          softwareId: software.id,
          ...config,
        } as any,
      });
      created++;
      logger.info(`VoiceAgentConfig creada para ${software.slug}`);
    } catch (err) {
      logger.error(`Error creando VoiceAgentConfig para ${software.slug}:`, err);
    }
  }

  return { created, skipped, total: softwares.length };
}

// ── Clonar config de un software a otro ──

export async function cloneVoiceAgentConfig(
  sourceSoftwareId: string,
  targetSoftwareId: string
) {
  const source = await prisma.voiceAgentConfig.findUnique({
    where: { softwareId: sourceSoftwareId },
  });
  if (!source) {
    throw new Error(`Software fuente ${sourceSoftwareId} no tiene VoiceAgentConfig`);
  }

  const targetSoftware = await prisma.software.findUnique({
    where: { id: targetSoftwareId },
  });
  if (!targetSoftware) {
    throw new Error(`Software destino ${targetSoftwareId} no encontrado`);
  }

  // Extraer datos limpios (sin id, softwareId, timestamps)
  const {
    id: _id,
    softwareId: _sid,
    createdAt: _ca,
    updatedAt: _ua,
    ...configData
  } = source;

  return prisma.voiceAgentConfig.upsert({
    where: { softwareId: targetSoftwareId },
    create: {
      softwareId: targetSoftwareId,
      ...configData,
    } as any,
    update: configData as any,
  });
}
