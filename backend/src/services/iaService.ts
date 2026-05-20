import OpenAI from 'openai';
import { env } from '../config/env';
import { prismaReadOnly, prisma } from '../config/database';
import { logger } from '../utils/logger';
import { getDashboardMetrics } from './metricsService';
import { getLeadStats, createLead, changeLeadStatus, addHistorial } from './leadService';
import { getStatsLlamadas } from './llamadaService';
import { LeadEstado } from '@prisma/client';

const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
  baseURL: env.OPENAI_BASE_URL || undefined,
});

const SYSTEM_PROMPT = `Eres un analista de negocio experto para un CRM llamado CRM Maestro. Tienes acceso SOLO LECTURA a una base de datos PostgreSQL con datos de leads, clientes, comunicaciones (email, WhatsApp, llamadas), suscripciones SaaS, calendario y tracking de eventos.

REGLAS ESTRICTAS:
- Solo generar SELECT, NUNCA UPDATE, DELETE, INSERT, DROP, ALTER, TRUNCATE, CREATE, GRANT
- Siempre incluir LIMIT 100 en las queries SQL
- No acceder a datos personales sensibles (password_hash, api_key)
- Si no hay datos suficientes, decirlo claramente
- Sugerir acciones concretas basadas en datos
- Priorizar funciones dedicadas (tools) sobre SQL raw cuando existan

CAPACIDADES DE ACCION (requieren confirmacion del usuario):
Puedes PROPOONER acciones sobre el CRM usando las tools "propose_*". NUNCA ejecutas directamente.
El usuario debe confirmar cada accion antes de que se ejecute.

Cuando propones una accion, incluye al final de tu respuesta un bloque JSON especial:
{"__action__":{"id":"<action_id>","type":"<tipo>","title":"<titulo>","description":"<descripcion>","data":{<datos>}}}

Tools de propuesta disponibles:
- propose_create_lead: Propone crear un nuevo lead
- propose_update_lead_status: Propone cambiar el estado de un lead existente
- propose_create_calendar_event: Propone crear un evento en el calendario
- propose_add_lead_note: Propone anadir una nota al historial de un lead
- propose_send_whatsapp: Propone enviar un WhatsApp a un lead

Instrucciones para proponer acciones:
1. SIEMPRE verifica que el lead/registro existe antes de proponer una modificacion
2. Busca por nombre o email si el usuario no proporciona ID exacto
3. Se especifico: que vas a hacer, a quien afecta, con que datos
4. Si hay ambiguedad (varios leads con el mismo nombre), pregunta al usuario cual es el correcto
5. NUNCA propongas una accion sin haber verificado la existencia del recurso

ESQUEMA COMPLETO DE BASE DE DATOS:

=== CLIENTES Y SUSCRIPCIONES SaaS ===
- clientes_global: id, email, nombre, telefono, pais, empresa, origen_saas (identificador del SaaS), estado ('activo'|'inactivo'), fecha_registro, fecha_ultimo_login, metadata (JSON), notas_internas
- suscripciones: id, cliente_id, saas, plan_tipo, estado ('activa'|'trial'|'cancelada'|'expirada'), monto, moneda, fecha_inicio, fecha_fin, fecha_cancelacion, dias_trial_total, dias_trial_restantes, metodo_pago, motivo_cancelacion
- pagos: id, suscripcion_id, cliente_id, monto, moneda, estado ('completado'|'fallido'|'pendiente'|'reembolsado'), metodo_pago, fecha_pago, fecha_reembolso, numero_factura
- metricas_diarias: id, fecha, saas, nuevos_registros, nuevos_pagos, cancelaciones, upgrades, downgrades, clientes_activos, trials_activos, trials_convertidos, trials_expirados, mrr, arr, ingresos_nuevos, ingresos_perdidos, churn_rate, conversion_rate, trial_to_paid_rate
- eventos: id, tipo, severidad, cliente_id, saas, datos (JSON), procesado, fecha
- webhooks_config: saas, webhook_secret, endpoint_url, activo

=== LEADS ===
- leads: id, nombre, email, telefono, empresa, cargo, pais, origen, software_id, estado, prioridad, notas, ultimo_contacto, asignado_a (usuario_id), convertido_a (cliente_id), metadata (JSON), created_at
  * Estados posibles: NUEVO, CONTACTADO, INTERESADO, EN_SEGUIMIENTO, CALIFICADO, RECHAZADO, NO_RESPONDE, CONVERTIDO
  * Prioridades posibles: BAJA, MEDIA, ALTA, URGENTE
- lead_historial: id, lead_id, tipo, descripcion, usuario_id, created_at
- lead_etiquetas: id, nombre, color

=== CENTRO DE LLAMADAS ===
- llamadas_reales: id, software_id, lead_id, spech_id, agente_id, estado, direccion, telefono_lead, telefono_agente, duracion_seg, grabacion_url, notas_post, lead_estado_prev, lead_estado_post, transcript, calificacion (1-5), proxima_accion, zadarma_call_id, iniciada_at, terminada_at
  * Estados: iniciando, esperando_agente, agente_descolgo, llamando_lead, en_curso, completada, fallida, no_contesta, cancelada
- spechs_llamada: id, software_id, titulo, contenido, objetivo, objeciones (JSON), orden, activo, es_default
- sesiones_prueba_ia: id, software_id, spech_id, usuario_id, lead_simulado (JSON), mensajes (JSON), resultado, feedback (JSON), notas

=== EMAIL OUTREACH ===
- email_accounts: id, software_id, proveedor, nombre, api_key, cuota_max, cuota_usada, activo
- email_senders: id, software_id, account_id, email, nombre, es_default, activo, verificado
- email_plantillas: id, software_id, nombre, asunto, cuerpo_html, cuerpo_texto, variables, tipo, activo
- email_campanas: id, software_id, nombre, sender_id, plantilla_id, asunto_snapshot, cuerpo_snapshot, estado ('borrador'|'enviando'|'enviada'|'cancelada'|'error'), es_ab_test, total_leads, enviados, abiertos, clicks, rebotes, bajas, programada_para, iniciada_en, completada_en
- email_variantes: id, campana_id, letra (A/B/C), asunto, cuerpo_html, porcentaje, es_ganadora, enviados, abiertos, clicks, rebotes
- email_envios: id, campana_id, variante_id, lead_id, sender_id, destinatario, asunto, cuerpo_html, estado ('pendiente'|'enviado'|'fallido'|'rebotado'|'reservado'), enviado_en, abierto_en, ultimo_click_en, error
- email_eventos: id, envio_id, tipo ('sent'|'delivered'|'opened'|'clicked'|'bounced'|'complained'|'unsubscribed'|'failed'), datos (JSON), fecha
- email_bajas: id, email, software_id, motivo, fecha

=== WHATSAPP ===
- whatsapp_plantillas: id, software_id, nombre, contenido, categoria, variables, activa, orden
- whatsapp_envios: id, lead_id, plantilla_id, telefono, mensaje, usuario_id, enviado_at

=== CALENDARIO ===
- calendario_eventos: id, titulo, descripcion, fecha_inicio, fecha_fin, todo_el_dia, asignado_a ('carlos'|'silviu'|'ambos'), color (blue|green|purple|orange|red|pink), completado, creado_por, created_at

=== USUARIOS ===
- usuarios_crm: id, email, nombre, rol, notificaciones_activas, ultimo_login, activo

=== TRACKING ===
- crm_clients: id, name, saas, descripcion, activo
- api_keys: id, crm_id, key_hash, key_prefix, nombre, activo, ultimo_uso
- tracked_events: id, crm_id, event_name, event_id, user_id, email, datos (JSON), timestamp, recibido_at, procesado

RELACIONES IMPORTANTES:
- leads.asignado_a -> usuarios_crm.id
- leads.id -> llamadas_reales.lead_id
- leads.id -> whatsapp_envios.lead_id
- leads.id -> lead_historial.lead_id
- email_campanas.id -> email_envios.campana_id
- email_campanas.id -> email_variantes.campana_id
- suscripciones.cliente_id -> clientes_global.id
- pagos.suscripcion_id -> suscripciones.id

CONTEXTO DE NEGOCIO:
- MRR = Monthly Recurring Revenue (ingresos recurrentes mensuales)
- ARR = MRR * 12
- Churn rate = cancelaciones / clientes activos
- Trial = periodo de prueba gratuito
- Lead = prospecto potencial antes de convertirse en cliente
- Tasa de apertura email = abiertos / enviados * 100
- Tasa de click email = clicks / enviados * 100
- software_id = identificador del SaaS/producto (ej: "groomly", "ervok")

CUANDO USAR CADA TOOL:
- get_dashboard_kpis: Para resumen general del negocio (MRR, churn, clientes)
- get_leads_summary: Para preguntas sobre leads, pipeline, estados
- get_calls_summary: Para métricas del centro de llamadas
- get_email_metrics: Para campañas de email, tasas de apertura/click
- get_whatsapp_summary: Para envíos de WhatsApp
- get_calendar_events: Para eventos próximos del calendario
- get_recommendations: Para insights y alertas automáticas
- query_database: Para consultas específicas no cubiertas por las tools anteriores

FORMATO DE RESPUESTA:
- Respuestas concisas pero informativas
- Listas con bullets para comparativas
- Tablas Markdown SIEMPRE para datos tabulares (usa | columna1 | columna2 |)
- Emojis para indicadores visuales (📈 📉 ⚠️ ✅ 🔴 🟡 🟢)
- Destacar números clave en negrita
- Sugerir acciones concretas al final`;

// ===== Tool Handlers =====

async function handleQueryDatabase(args: { sql: string; explanation: string }) {
  if (!validateSQL(args.sql)) {
    throw new Error('Query no permitida: solo SELECT con LIMIT permitido');
  }
  const result = await prismaReadOnly.$queryRawUnsafe(args.sql);
  return { sql: args.sql, data: result };
}

async function handleGetDashboardKpis(args: { saas?: string }) {
  const metrics = await getDashboardMetrics(args.saas || undefined);
  return { type: 'dashboard_kpis', metrics };
}

async function handleGetLeadsSummary(args: { softwareId?: string }) {
  const stats = await getLeadStats(args.softwareId || undefined);
  return { type: 'leads_summary', stats };
}

async function handleGetCallsSummary(args: { softwareId?: string }) {
  const stats = await getStatsLlamadas(args.softwareId || undefined);
  return { type: 'calls_summary', stats };
}

async function handleGetEmailMetrics(args: { softwareId?: string; campanaId?: string }) {
  const where: any = {};
  if (args.softwareId) where.softwareId = args.softwareId;

  const [campanas, enviosStats, eventosStats, bajasRecientes] = await Promise.all([
    prisma.emailCampana.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        sender: { select: { email: true, nombre: true } },
        _count: { select: { envios: true } },
      },
    }),
    prisma.emailEnvio.groupBy({
      by: ['estado'],
      where,
      _count: { estado: true },
    }),
    prisma.emailEvento.groupBy({
      by: ['tipo'],
      where: { envio: { campana: args.campanaId ? { id: args.campanaId } : where } },
      _count: { tipo: true },
    }),
    prisma.emailBaja.count({
      where: args.softwareId ? { softwareId: args.softwareId } : {},
    }),
  ]);

  return {
    type: 'email_metrics',
    campanas: campanas.map(c => ({
      nombre: c.nombre,
      estado: c.estado,
      enviados: c.enviados,
      abiertos: c.abiertos,
      clicks: c.clicks,
      tasaApertura: c.enviados > 0 ? Math.round((c.abiertos / c.enviados) * 100) : 0,
      tasaClick: c.enviados > 0 ? Math.round((c.clicks / c.enviados) * 100) : 0,
      totalLeads: c.totalLeads,
    })),
    enviosPorEstado: enviosStats,
    eventosPorTipo: eventosStats,
    bajas: bajasRecientes,
  };
}

async function handleGetWhatsappSummary(args: { softwareId?: string; leadId?: string }) {
  const where: any = {};
  if (args.softwareId) {
    where.lead = { softwareId: args.softwareId };
  }
  if (args.leadId) where.leadId = args.leadId;

  const [total, recientes, porPlantilla] = await Promise.all([
    prisma.whatsappEnvio.count({ where }),
    prisma.whatsappEnvio.count({
      where: { ...where, enviadoAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
    }),
    prisma.whatsappEnvio.groupBy({
      by: ['plantillaId'],
      where,
      _count: { plantillaId: true },
    }),
  ]);

  return {
    type: 'whatsapp_summary',
    total,
    recientes7d: recientes,
    porPlantilla,
  };
}

async function handleGetCalendarEvents(args: { desde?: string; hasta?: string; asignadoA?: string }) {
  const where: any = {};
  if (args.desde || args.hasta) {
    where.fechaInicio = {};
    if (args.desde) where.fechaInicio.gte = new Date(args.desde);
    if (args.hasta) where.fechaInicio.lte = new Date(args.hasta);
  }
  if (args.asignadoA) where.asignadoA = args.asignadoA;

  // Default: próximos 30 días
  if (!args.desde && !args.hasta) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    where.fechaInicio = { gte: hoy };
  }

  const eventos = await prisma.calendarioEvento.findMany({
    where,
    orderBy: { fechaInicio: 'asc' },
    take: 50,
  });

  return { type: 'calendar_events', eventos };
}

async function handleGetRecommendations(args: { softwareId?: string }) {
  const whereLead: any = {};
  if (args.softwareId) whereLead.softwareId = args.softwareId;

  const sieteDiasAtras = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    leadsSinContactar,
    leadsNuevosHoy,
    leadsNoResponden,
    campanasBajaApertura,
    suscripcionesPorExpirar,
    leadsSinAsignar,
  ] = await Promise.all([
    // Leads sin contactar >7 días
    prisma.lead.count({
      where: {
        ...whereLead,
        estado: { not: 'CONVERTIDO' },
        OR: [
          { ultimoContacto: { lt: sieteDiasAtras } },
          { ultimoContacto: null },
        ],
      },
    }),
    // Leads nuevos hoy
    prisma.lead.count({
      where: {
        ...whereLead,
        createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
    }),
    // Leads en estado NO_RESPONDE
    prisma.lead.count({
      where: { ...whereLead, estado: 'NO_RESPONDE' },
    }),
    // Campañas con tasa de apertura <10%
    prisma.emailCampana.findMany({
      where: {
        ...whereLead,
        estado: 'enviada',
        enviados: { gt: 0 },
      },
      select: { nombre: true, enviados: true, abiertos: true },
    }).then(campanas =>
      campanas.filter(c => c.enviados > 50 && (c.abiertos / c.enviados) < 0.1)
    ),
    // Suscripciones que expiran en 7 días
    prisma.suscripcion.count({
      where: {
        estado: 'trial',
        fechaFin: { lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), gte: new Date() },
      },
    }),
    // Leads sin asignar
    prisma.lead.count({
      where: { ...whereLead, asignadoA: null, estado: { not: 'CONVERTIDO' } },
    }),
  ]);

  return {
    type: 'recommendations',
    insights: [
      { tipo: 'alerta', mensaje: `${leadsSinContactar} leads sin contactar en más de 7 días`, severidad: leadsSinContactar > 10 ? 'alta' : leadsSinContactar > 0 ? 'media' : 'baja' },
      { tipo: 'info', mensaje: `${leadsNuevosHoy} leads nuevos hoy`, severidad: 'baja' },
      { tipo: 'alerta', mensaje: `${leadsNoResponden} leads en estado "No responde"`, severidad: leadsNoResponden > 5 ? 'media' : 'baja' },
      { tipo: 'info', mensaje: `${suscripcionesPorExpirar} suscripciones trial expiran esta semana`, severidad: suscripcionesPorExpirar > 0 ? 'media' : 'baja' },
      { tipo: 'alerta', mensaje: `${leadsSinAsignar} leads sin asignar a ningún agente`, severidad: leadsSinAsignar > 5 ? 'alta' : leadsSinAsignar > 0 ? 'media' : 'baja' },
      ...(campanasBajaApertura.length > 0 ? [{
        tipo: 'alerta' as const,
        mensaje: `${campanasBajaApertura.length} campaña(s) con tasa de apertura <10%`,
        severidad: 'media' as const,
        detalle: campanasBajaApertura.map(c => c.nombre),
      }] : []),
    ],
  };
}

// ===== Action Proposal Handlers =====

// Helper: busca un lead por nombre o email (coincidencia parcial)
async function findLeadByNameOrEmail(query: string, softwareId?: string) {
  const where: any = {
    OR: [
      { nombre: { contains: query, mode: 'insensitive' } },
      ...(query.includes('@') ? [{ email: { equals: query, mode: 'insensitive' } }] : []),
    ],
  };
  if (softwareId) where.AND = [{ softwareId }];

  const leads = await prisma.lead.findMany({
    where,
    take: 10,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, nombre: true, email: true, telefono: true,
      empresa: true, estado: true, softwareId: true,
    },
  });
  return leads;
}

// Helper: crea registro de AccionIa en BD
async function createActionProposal(
  usuarioId: number,
  tipo: string,
  descripcion: string,
  datosEntrada: any,
  conversacionId?: number
) {
  const accion = await prisma.accionIa.create({
    data: {
      usuarioId,
      conversacionId: conversacionId || null,
      tipo,
      descripcion,
      datosEntrada,
    },
  });
  return accion;
}

async function handleProposeCreateLead(
  usuarioId: number,
  args: { nombre: string; email?: string; telefono?: string; empresa?: string; softwareId: string; notas?: string; prioridad?: string }
) {
  // Verificar duplicado por email+softwareId
  if (args.email) {
    const existing = await prisma.lead.findUnique({
      where: { email_softwareId: { email: args.email, softwareId: args.softwareId } },
    });
    if (existing) {
      return {
        action_proposal: null,
        error: `Ya existe un lead con email "${args.email}" en este software. ID: ${existing.id}`,
        existingLead: { id: existing.id, nombre: existing.nombre, estado: existing.estado },
      };
    }
  }

  const accion = await createActionProposal(usuarioId, 'create_lead',
    `Crear lead: ${args.nombre}${args.email ? ` (${args.email})` : ''}`,
    args
  );

  return {
    action_proposal: {
      id: accion.id,
      type: 'create_lead',
      title: 'Crear nuevo lead',
      description: `Se va a crear el lead "${args.nombre}"${args.email ? ` con email ${args.email}` : ''}${args.empresa ? ` de la empresa ${args.empresa}` : ''}`,
      data: args,
    },
  };
}

async function handleProposeUpdateLeadStatus(
  usuarioId: number,
  args: { leadId?: string; busqueda?: string; nuevoEstado: string; motivo?: string; softwareId?: string }
) {
  let lead: any = null;

  if (args.leadId) {
    lead = await prisma.lead.findUnique({
      where: { id: args.leadId },
      select: { id: true, nombre: true, email: true, estado: true, softwareId: true },
    });
  } else if (args.busqueda) {
    const leads = await findLeadByNameOrEmail(args.busqueda, args.softwareId);
    if (leads.length === 1) lead = leads[0];
    else if (leads.length > 1) {
      return {
        action_proposal: null,
        ambiguous: true,
        matches: leads.map(l => ({ id: l.id, nombre: l.nombre, email: l.email, estado: l.estado })),
        message: `Hay ${leads.length} leads que coinciden con "${args.busqueda}". Pide al usuario que especifique el ID o un nombre mas exacto.`,
      };
    }
  }

  if (!lead) {
    return { action_proposal: null, error: 'No se encontro el lead especificado.' };
  }

  // Validar estado
  const estadosValidos = Object.values(LeadEstado);
  if (!estadosValidos.includes(args.nuevoEstado as LeadEstado)) {
    return { action_proposal: null, error: `Estado no valido: ${args.nuevoEstado}. Estados validos: ${estadosValidos.join(', ')}` };
  }

  if (lead.estado === args.nuevoEstado) {
    return { action_proposal: null, error: `El lead ya esta en estado "${lead.estado}".` };
  }

  const accion = await createActionProposal(usuarioId, 'update_lead_status',
    `Cambiar estado de "${lead.nombre}" de ${lead.estado} a ${args.nuevoEstado}`,
    { leadId: lead.id, nombreLead: lead.nombre, estadoPrevio: lead.estado, nuevoEstado: args.nuevoEstado, motivo: args.motivo }
  );

  return {
    action_proposal: {
      id: accion.id,
      type: 'update_lead_status',
      title: 'Cambiar estado de lead',
      description: `Voy a cambiar el estado del lead "${lead.nombre}" (${lead.email || 'sin email'}) de "${lead.estado}" a "${args.nuevoEstado}".`,
      data: { leadId: lead.id, nombreLead: lead.nombre, estadoPrevio: lead.estado, nuevoEstado: args.nuevoEstado, motivo: args.motivo },
    },
  };
}

async function handleProposeAddLeadNote(
  usuarioId: number,
  args: { leadId?: string; busqueda?: string; nota: string; softwareId?: string }
) {
  let lead: any = null;

  if (args.leadId) {
    lead = await prisma.lead.findUnique({
      where: { id: args.leadId },
      select: { id: true, nombre: true, email: true, estado: true },
    });
  } else if (args.busqueda) {
    const leads = await findLeadByNameOrEmail(args.busqueda, args.softwareId);
    if (leads.length === 1) lead = leads[0];
    else if (leads.length > 1) {
      return {
        action_proposal: null,
        ambiguous: true,
        matches: leads.map(l => ({ id: l.id, nombre: l.nombre, email: l.email, estado: l.estado })),
        message: `Hay ${leads.length} leads que coinciden con "${args.busqueda}". Pide al usuario que especifique el ID o un nombre mas exacto.`,
      };
    }
  }

  if (!lead) {
    return { action_proposal: null, error: 'No se encontro el lead especificado.' };
  }

  const accion = await createActionProposal(usuarioId, 'add_lead_note',
    `Anadir nota a "${lead.nombre}"`,
    { leadId: lead.id, nombreLead: lead.nombre, nota: args.nota }
  );

  return {
    action_proposal: {
      id: accion.id,
      type: 'add_lead_note',
      title: 'Anadir nota a lead',
      description: `Voy a anadir una nota al historial del lead "${lead.nombre}" (${lead.email || 'sin email'}).`,
      data: { leadId: lead.id, nombreLead: lead.nombre, nota: args.nota },
    },
  };
}

async function handleProposeCreateCalendarEvent(
  usuarioId: number,
  args: { titulo: string; descripcion?: string; fechaInicio: string; fechaFin?: string; todoElDia?: boolean; asignadoA?: string; color?: string }
) {
  const asignadosValidos = ['carlos', 'silviu', 'ambos'];
  const asignado = args.asignadoA && asignadosValidos.includes(args.asignadoA.toLowerCase())
    ? args.asignadoA.toLowerCase()
    : 'ambos';

  const coloresValidos = ['blue', 'green', 'purple', 'orange', 'red', 'pink'];
  const color = args.color && coloresValidos.includes(args.color.toLowerCase())
    ? args.color.toLowerCase()
    : 'blue';

  const accion = await createActionProposal(usuarioId, 'create_calendar_event',
    `Crear evento: ${args.titulo}`,
    { ...args, asignadoA: asignado, color }
  );

  return {
    action_proposal: {
      id: accion.id,
      type: 'create_calendar_event',
      title: 'Crear evento en calendario',
      description: `Voy a crear el evento "${args.titulo}"${args.descripcion ? `: ${args.descripcion}` : ''} para el ${args.fechaInicio}${asignado !== 'ambos' ? ` asignado a ${asignado}` : ''}.`,
      data: { ...args, asignadoA: asignado, color },
    },
  };
}

async function handleProposeSendWhatsapp(
  usuarioId: number,
  args: { leadId?: string; busqueda?: string; plantillaId?: string; mensajePersonalizado?: string; softwareId?: string }
) {
  let lead: any = null;

  if (args.leadId) {
    lead = await prisma.lead.findUnique({
      where: { id: args.leadId },
      select: { id: true, nombre: true, telefono: true, email: true, softwareId: true },
    });
  } else if (args.busqueda) {
    const leads = await findLeadByNameOrEmail(args.busqueda, args.softwareId);
    if (leads.length === 1) lead = leads[0];
    else if (leads.length > 1) {
      return {
        action_proposal: null,
        ambiguous: true,
        matches: leads.map(l => ({ id: l.id, nombre: l.nombre, email: l.email })),
        message: `Hay ${leads.length} leads que coinciden con "${args.busqueda}". Pide al usuario que especifique el ID o un nombre mas exacto.`,
      };
    }
  }

  if (!lead) {
    return { action_proposal: null, error: 'No se encontro el lead especificado.' };
  }

  if (!lead.telefono) {
    return { action_proposal: null, error: `El lead "${lead.nombre}" no tiene numero de telefono.` };
  }

  let plantillaNombre = 'Mensaje personalizado';
  if (args.plantillaId) {
    const plantilla = await prisma.whatsappPlantilla.findUnique({
      where: { id: args.plantillaId },
      select: { nombre: true },
    });
    if (plantilla) plantillaNombre = plantilla.nombre;
  }

  const accion = await createActionProposal(usuarioId, 'send_whatsapp',
    `Enviar WhatsApp a "${lead.nombre}"`,
    { leadId: lead.id, nombreLead: lead.nombre, telefono: lead.telefono, plantillaId: args.plantillaId, mensajePersonalizado: args.mensajePersonalizado }
  );

  return {
    action_proposal: {
      id: accion.id,
      type: 'send_whatsapp',
      title: 'Enviar WhatsApp',
      description: `Voy a enviar un WhatsApp al lead "${lead.nombre}" (${lead.telefono})${plantillaNombre !== 'Mensaje personalizado' ? ` usando la plantilla "${plantillaNombre}"` : ''}.`,
      data: { leadId: lead.id, nombreLead: lead.nombre, telefono: lead.telefono, plantillaId: args.plantillaId, mensajePersonalizado: args.mensajePersonalizado },
    },
  };
}

// ===== Tool Definitions =====

const TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'query_database',
      description: 'Ejecuta una consulta SQL SELECT de solo lectura para preguntas específicas no cubiertas por otras tools',
      parameters: {
        type: 'object',
        properties: {
          sql: { type: 'string', description: 'Consulta SQL SELECT (solo lectura, debe incluir LIMIT)' },
          explanation: { type: 'string', description: 'Explicación breve de qué busca la query' },
        },
        required: ['sql', 'explanation'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_dashboard_kpis',
      description: 'Obtiene KPIs consolidados del dashboard: MRR, ARR, churn, clientes activos, ingresos, etc.',
      parameters: {
        type: 'object',
        properties: {
          saas: { type: 'string', description: 'Nombre del SaaS (opcional, todos si no se especifica)' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_leads_summary',
      description: 'Obtiene resumen de leads: total, por estado, por prioridad, recientes (7 días)',
      parameters: {
        type: 'object',
        properties: {
          softwareId: { type: 'string', description: 'ID del software/SaaS (opcional)' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_calls_summary',
      description: 'Obtiene métricas del centro de llamadas: total, hoy, semana, completadas, tasa de contacto, duración media',
      parameters: {
        type: 'object',
        properties: {
          softwareId: { type: 'string', description: 'ID del software/SaaS (opcional)' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_email_metrics',
      description: 'Obtiene métricas de campañas de email: enviados, abiertos, clicks, tasas, bajas',
      parameters: {
        type: 'object',
        properties: {
          softwareId: { type: 'string', description: 'ID del software/SaaS (opcional)' },
          campanaId: { type: 'string', description: 'ID específico de campaña (opcional)' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_whatsapp_summary',
      description: 'Obtiene métricas de envíos de WhatsApp',
      parameters: {
        type: 'object',
        properties: {
          softwareId: { type: 'string', description: 'ID del software/SaaS (opcional)' },
          leadId: { type: 'string', description: 'ID específico de lead (opcional)' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_calendar_events',
      description: 'Obtiene eventos del calendario (por defecto próximos 30 días)',
      parameters: {
        type: 'object',
        properties: {
          desde: { type: 'string', description: 'Fecha inicio (ISO 8601, opcional)' },
          hasta: { type: 'string', description: 'Fecha fin (ISO 8601, opcional)' },
          asignadoA: { type: 'string', enum: ['carlos', 'silviu', 'ambos'], description: 'Filtrar por asignado (opcional)' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_recommendations',
      description: 'Genera insights y alertas proactivas: leads sin contactar, campañas con bajo rendimiento, suscripciones por expirar, leads sin asignar',
      parameters: {
        type: 'object',
        properties: {
          softwareId: { type: 'string', description: 'ID del software/SaaS (opcional)' },
        },
        required: [],
      },
    },
  },
  // ===== Action Proposal Tools =====
  {
    type: 'function',
    function: {
      name: 'propose_create_lead',
      description: 'Propone crear un nuevo lead en el CRM. NUNCA ejecuta directamente, solo crea una propuesta para confirmacion del usuario.',
      parameters: {
        type: 'object',
        properties: {
          nombre: { type: 'string', description: 'Nombre completo del lead' },
          email: { type: 'string', description: 'Email del lead (opcional)' },
          telefono: { type: 'string', description: 'Telefono del lead (opcional)' },
          empresa: { type: 'string', description: 'Empresa del lead (opcional)' },
          softwareId: { type: 'string', description: 'ID del software/SaaS (obligatorio)' },
          notas: { type: 'string', description: 'Notas iniciales (opcional)' },
          prioridad: { type: 'string', enum: ['BAJA', 'MEDIA', 'ALTA', 'URGENTE'], description: 'Prioridad del lead (opcional, default MEDIA)' },
        },
        required: ['nombre', 'softwareId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'propose_update_lead_status',
      description: 'Propone cambiar el estado de un lead existente. Busca el lead por ID o por nombre/email si no se proporciona ID. NUNCA ejecuta directamente.',
      parameters: {
        type: 'object',
        properties: {
          leadId: { type: 'string', description: 'ID exacto del lead (opcional, preferido)' },
          busqueda: { type: 'string', description: 'Nombre o email para buscar el lead (si no se proporciona leadId)' },
          nuevoEstado: { type: 'string', enum: ['NUEVO', 'CONTACTADO', 'INTERESADO', 'EN_SEGUIMIENTO', 'CALIFICADO', 'RECHAZADO', 'NO_RESPONDE', 'CONVERTIDO'], description: 'Nuevo estado' },
          motivo: { type: 'string', description: 'Motivo del cambio (opcional)' },
          softwareId: { type: 'string', description: 'ID del software para filtrar busqueda (opcional)' },
        },
        required: ['nuevoEstado'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'propose_add_lead_note',
      description: 'Propone anadir una nota al historial de un lead. Busca el lead por ID o por nombre/email. NUNCA ejecuta directamente.',
      parameters: {
        type: 'object',
        properties: {
          leadId: { type: 'string', description: 'ID exacto del lead (opcional, preferido)' },
          busqueda: { type: 'string', description: 'Nombre o email para buscar el lead (si no se proporciona leadId)' },
          nota: { type: 'string', description: 'Texto de la nota a anadir' },
          softwareId: { type: 'string', description: 'ID del software para filtrar busqueda (opcional)' },
        },
        required: ['nota'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'propose_create_calendar_event',
      description: 'Propone crear un evento en el calendario. NUNCA ejecuta directamente.',
      parameters: {
        type: 'object',
        properties: {
          titulo: { type: 'string', description: 'Titulo del evento' },
          descripcion: { type: 'string', description: 'Descripcion (opcional)' },
          fechaInicio: { type: 'string', description: 'Fecha/hora de inicio en formato ISO 8601' },
          fechaFin: { type: 'string', description: 'Fecha/hora de fin en formato ISO 8601 (opcional)' },
          todoElDia: { type: 'boolean', description: 'Evento de todo el dia (opcional)' },
          asignadoA: { type: 'string', enum: ['carlos', 'silviu', 'ambos'], description: 'A quien se asigna (opcional, default ambos)' },
          color: { type: 'string', enum: ['blue', 'green', 'purple', 'orange', 'red', 'pink'], description: 'Color del evento (opcional, default blue)' },
        },
        required: ['titulo', 'fechaInicio'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'propose_send_whatsapp',
      description: 'Propone enviar un WhatsApp a un lead. Busca el lead por ID o por nombre. El lead debe tener telefono. NUNCA ejecuta directamente.',
      parameters: {
        type: 'object',
        properties: {
          leadId: { type: 'string', description: 'ID exacto del lead (opcional, preferido)' },
          busqueda: { type: 'string', description: 'Nombre o email para buscar el lead' },
          plantillaId: { type: 'string', description: 'ID de la plantilla de WhatsApp a usar (opcional)' },
          mensajePersonalizado: { type: 'string', description: 'Mensaje personalizado si no se usa plantilla (opcional)' },
          softwareId: { type: 'string', description: 'ID del software para filtrar busqueda (opcional)' },
        },
        required: [],
      },
    },
  },
];

function validateSQL(sql: string): boolean {
  const normalized = sql.toUpperCase().trim();
  const forbidden = ['UPDATE', 'DELETE', 'INSERT', 'DROP', 'ALTER', 'TRUNCATE', 'CREATE', 'GRANT', 'REVOKE', 'EXEC'];
  for (const keyword of forbidden) {
    if (normalized.includes(keyword)) return false;
  }
  if (!normalized.startsWith('SELECT')) return false;
  if (!normalized.includes('LIMIT')) return false;
  if (normalized.includes('PASSWORD') || normalized.includes('SECRET') || normalized.includes('TOKEN') || normalized.includes('API_KEY')) return false;
  return true;
}

async function executeReadOnlyQuery(sql: string): Promise<any[]> {
  if (!validateSQL(sql)) {
    throw new Error('Query no permitida: solo SELECT con LIMIT permitido');
  }
  const result = await prismaReadOnly.$queryRawUnsafe(sql);
  return result as any[];
}

// ===== Main Chat Function =====

export async function chatWithIA(
  userId: number,
  message: string
): Promise<{ response: string; sql?: string; data?: any; time: number }> {
  const start = Date.now();

  try {
    // Get extended conversation context (10 instead of 5)
    const recentConversations = await prisma.conversacionIa.findMany({
      where: { usuarioId: userId },
      orderBy: { fecha: 'desc' },
      take: 10,
    });

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...recentConversations.reverse().flatMap((c) => [
        { role: 'user' as const, content: c.mensajeUsuario },
        { role: 'assistant' as const, content: c.respuestaIa },
      ]),
      { role: 'user', content: message },
    ];

    let completion;
    try {
      completion = await openai.chat.completions.create({
        model: env.OPENAI_MODEL,
        messages,
        tools: TOOLS,
        tool_choice: 'auto',
        temperature: 0.1,
        max_tokens: 2000,
      });
    } catch (err: any) {
      const errMsg = String(err?.message || err).toLowerCase();
      const toolsUnsupported =
        err?.status === 400 ||
        errMsg.includes('tool') ||
        errMsg.includes('function') ||
        errMsg.includes('unsupported');
      if (!toolsUnsupported) throw err;
      logger.warn('IA: proveedor rechazó tools, reintentando sin function-calling');
      completion = await openai.chat.completions.create({
        model: env.OPENAI_MODEL,
        messages,
        temperature: 0.1,
        max_tokens: 2000,
      });
    }

    let responseText = '';
    let sqlGenerated: string | undefined;
    let queryData: any;
    let actionProposals: any[] = [];

    const choice = completion.choices[0];

    if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
      // Build messages with tool results for follow-up
      const toolMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

      for (const toolCall of choice.message.tool_calls) {
        const args = JSON.parse(toolCall.function.arguments);
        let toolResult: any;

        try {
          switch (toolCall.function.name) {
            case 'query_database':
              sqlGenerated = args.sql;
              toolResult = await handleQueryDatabase(args);
              break;
            case 'get_dashboard_kpis':
              toolResult = await handleGetDashboardKpis(args);
              break;
            case 'get_leads_summary':
              toolResult = await handleGetLeadsSummary(args);
              break;
            case 'get_calls_summary':
              toolResult = await handleGetCallsSummary(args);
              break;
            case 'get_email_metrics':
              toolResult = await handleGetEmailMetrics(args);
              break;
            case 'get_whatsapp_summary':
              toolResult = await handleGetWhatsappSummary(args);
              break;
            case 'get_calendar_events':
              toolResult = await handleGetCalendarEvents(args);
              break;
            case 'get_recommendations':
              toolResult = await handleGetRecommendations(args);
              break;
            case 'propose_create_lead':
              toolResult = await handleProposeCreateLead(userId, args);
              break;
            case 'propose_update_lead_status':
              toolResult = await handleProposeUpdateLeadStatus(userId, args);
              break;
            case 'propose_add_lead_note':
              toolResult = await handleProposeAddLeadNote(userId, args);
              break;
            case 'propose_create_calendar_event':
              toolResult = await handleProposeCreateCalendarEvent(userId, args);
              break;
            case 'propose_send_whatsapp':
              toolResult = await handleProposeSendWhatsapp(userId, args);
              break;
            default:
              toolResult = { error: `Tool desconocida: ${toolCall.function.name}` };
          }
        } catch (err: any) {
          toolResult = { error: err.message };
          logger.error(`IA tool error (${toolCall.function.name}):`, err);
        }

        // Collect action proposals from tool results
        if (toolResult?.action_proposal) {
          actionProposals.push(toolResult.action_proposal);
        }

        toolMessages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(toolResult),
        });
      }

      // Get natural language response with all tool results
      const followUp = await openai.chat.completions.create({
        model: env.OPENAI_MODEL,
        messages: [
          ...messages,
          choice.message,
          ...toolMessages,
        ],
        temperature: 0.3,
        max_tokens: 2000,
      });

      responseText = followUp.choices[0].message.content || 'No pude generar una respuesta.';

      // Append action proposal JSON block if any proposals were made
      if (actionProposals.length > 0) {
        for (const proposal of actionProposals) {
          if (!responseText.includes(proposal.id)) {
            responseText += `\n{"__action__":${JSON.stringify(proposal)}}\n`;
          }
        }
      }
    } else {
      responseText = choice.message.content || 'No pude procesar tu consulta.';
    }

    const time = Date.now() - start;

    // Save conversation
    const conv = await prisma.conversacionIa.create({
      data: {
        usuarioId: userId,
        mensajeUsuario: message,
        respuestaIa: responseText,
        sqlGenerado: sqlGenerated,
        datosConsulta: queryData,
        tiempoRespuesta: time,
      },
    });

    // Link actions to conversation
    if (actionProposals.length > 0) {
      await prisma.accionIa.updateMany({
        where: { id: { in: actionProposals.map((p: any) => p.id) } },
        data: { conversacionId: conv.id },
      });
    }

    return { response: responseText, sql: sqlGenerated, data: queryData, time };
  } catch (error) {
    logger.error('IA chat error:', error);
    const time = Date.now() - start;
    return { response: 'Error al procesar tu consulta. Inténtalo de nuevo.', time };
  }
}

// ===== Streaming Chat Function =====

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onError: (error: string) => void;
  onComplete: (result: { response: string; sql?: string; data?: any; time: number }) => void;
}

export async function chatWithIAStream(
  userId: number,
  message: string,
  callbacks: StreamCallbacks
): Promise<void> {
  const start = Date.now();

  try {
    // Same context building as non-streaming
    const recentConversations = await prisma.conversacionIa.findMany({
      where: { usuarioId: userId },
      orderBy: { fecha: 'desc' },
      take: 10,
    });

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...recentConversations.reverse().flatMap((c) => [
        { role: 'user' as const, content: c.mensajeUsuario },
        { role: 'assistant' as const, content: c.respuestaIa },
      ]),
      { role: 'user', content: message },
    ];

    // Step 1: Tool decision (non-streaming)
    let completion;
    try {
      completion = await openai.chat.completions.create({
        model: env.OPENAI_MODEL,
        messages,
        tools: TOOLS,
        tool_choice: 'auto',
        temperature: 0.1,
        max_tokens: 2000,
      });
    } catch (err: any) {
      const errMsg = String(err?.message || err).toLowerCase();
      const toolsUnsupported =
        err?.status === 400 ||
        errMsg.includes('tool') ||
        errMsg.includes('function') ||
        errMsg.includes('unsupported');
      if (!toolsUnsupported) throw err;
      logger.warn('IA: proveedor rechazó tools en stream, reintentando sin function-calling');
      completion = await openai.chat.completions.create({
        model: env.OPENAI_MODEL,
        messages,
        temperature: 0.1,
        max_tokens: 2000,
      });
    }

    let responseText = '';
    let sqlGenerated: string | undefined;
    let queryData: any;
    let actionProposals: any[] = [];
    const choice = completion.choices[0];

    // Step 2: Execute tools if needed (same as non-streaming)
    if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
      const toolMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

      for (const toolCall of choice.message.tool_calls) {
        const args = JSON.parse(toolCall.function.arguments);
        let toolResult: any;

        try {
          switch (toolCall.function.name) {
            case 'query_database':
              sqlGenerated = args.sql;
              toolResult = await handleQueryDatabase(args);
              break;
            case 'get_dashboard_kpis':
              toolResult = await handleGetDashboardKpis(args);
              break;
            case 'get_leads_summary':
              toolResult = await handleGetLeadsSummary(args);
              break;
            case 'get_calls_summary':
              toolResult = await handleGetCallsSummary(args);
              break;
            case 'get_email_metrics':
              toolResult = await handleGetEmailMetrics(args);
              break;
            case 'get_whatsapp_summary':
              toolResult = await handleGetWhatsappSummary(args);
              break;
            case 'get_calendar_events':
              toolResult = await handleGetCalendarEvents(args);
              break;
            case 'get_recommendations':
              toolResult = await handleGetRecommendations(args);
              break;
            case 'propose_create_lead':
              toolResult = await handleProposeCreateLead(userId, args);
              break;
            case 'propose_update_lead_status':
              toolResult = await handleProposeUpdateLeadStatus(userId, args);
              break;
            case 'propose_add_lead_note':
              toolResult = await handleProposeAddLeadNote(userId, args);
              break;
            case 'propose_create_calendar_event':
              toolResult = await handleProposeCreateCalendarEvent(userId, args);
              break;
            case 'propose_send_whatsapp':
              toolResult = await handleProposeSendWhatsapp(userId, args);
              break;
            default:
              toolResult = { error: `Tool desconocida: ${toolCall.function.name}` };
          }
        } catch (err: any) {
          toolResult = { error: err.message };
          logger.error(`IA tool error (${toolCall.function.name}):`, err);
        }

        if (toolResult?.action_proposal) {
          actionProposals.push(toolResult.action_proposal);
        }

        toolMessages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(toolResult),
        });
      }

      // Step 3: Stream the final response
      const followUpMessages = [
        ...messages,
        choice.message,
        ...toolMessages,
      ];

      const stream = await openai.chat.completions.create({
        model: env.OPENAI_MODEL,
        messages: followUpMessages,
        temperature: 0.3,
        max_tokens: 2000,
        stream: true,
      });

      for await (const chunk of stream) {
        const token = chunk.choices[0]?.delta?.content || '';
        if (token) {
          responseText += token;
          callbacks.onToken(token);
        }
      }

      // Append action proposal JSON blocks after streaming
      if (actionProposals.length > 0) {
        for (const proposal of actionProposals) {
          if (!responseText.includes(proposal.id)) {
            const block = `\n{"__action__":${JSON.stringify(proposal)}}\n`;
            responseText += block;
            callbacks.onToken(block);
          }
        }
      }
    } else {
      // No tools needed — stream directly
      const stream = await openai.chat.completions.create({
        model: env.OPENAI_MODEL,
        messages,
        temperature: 0.1,
        max_tokens: 2000,
        stream: true,
      });

      for await (const chunk of stream) {
        const token = chunk.choices[0]?.delta?.content || '';
        if (token) {
          responseText += token;
          callbacks.onToken(token);
        }
      }
    }

    const time = Date.now() - start;

    // Save conversation
    const conv = await prisma.conversacionIa.create({
      data: {
        usuarioId: userId,
        mensajeUsuario: message,
        respuestaIa: responseText,
        sqlGenerado: sqlGenerated,
        datosConsulta: queryData,
        tiempoRespuesta: time,
      },
    });

    // Link actions to conversation
    if (actionProposals.length > 0) {
      await prisma.accionIa.updateMany({
        where: { id: { in: actionProposals.map((p: any) => p.id) } },
        data: { conversacionId: conv.id },
      });
    }

    callbacks.onComplete({ response: responseText, sql: sqlGenerated, data: queryData, time });
  } catch (error: any) {
    logger.error('IA stream error:', error);
    callbacks.onError(error.message || 'Error al procesar tu consulta');
  }
}

// ===== Insights Endpoint Helper =====

export async function getInsights(softwareId?: string) {
  const recs = await handleGetRecommendations({ softwareId });
  return recs;
}

// ===== Action Execution =====

export async function executeAction(actionId: string, confirmadoPor: number) {
  const action = await prisma.accionIa.findUnique({ where: { id: actionId } });
  if (!action) throw new Error('Accion no encontrada');
  if (action.estado !== 'propuesta' && action.estado !== 'confirmada') {
    throw new Error(`La accion ya no esta pendiente (estado: ${action.estado})`);
  }

  const datos = action.datosEntrada as any;
  let resultado: any;

  try {
    switch (action.tipo) {
      case 'create_lead':
        resultado = await createLead({
          nombre: datos.nombre,
          email: datos.email,
          telefono: datos.telefono,
          empresa: datos.empresa,
          softwareId: datos.softwareId,
          notas: datos.notas,
          prioridad: datos.prioridad,
          origen: 'ia',
        }, confirmadoPor);
        break;

      case 'update_lead_status': {
        const lead = await changeLeadStatus(
          datos.leadId,
          datos.nuevoEstado as LeadEstado,
          confirmadoPor,
          datos.motivo
        );
        if (!lead) throw new Error('Lead no encontrado');
        resultado = lead;
        break;
      }

      case 'add_lead_note': {
        const entry = await addHistorial(
          datos.leadId,
          'nota_ia',
          datos.nota,
          confirmadoPor
        );
        if (!entry) throw new Error('Lead no encontrado');
        resultado = entry;
        break;
      }

      case 'create_calendar_event':
        resultado = await prisma.calendarioEvento.create({
          data: {
            titulo: datos.titulo,
            descripcion: datos.descripcion || null,
            fechaInicio: new Date(datos.fechaInicio),
            fechaFin: datos.fechaFin ? new Date(datos.fechaFin) : new Date(datos.fechaInicio),
            todoElDia: datos.todoElDia || false,
            asignadoA: datos.asignadoA || 'ambos',
            color: datos.color || 'blue',
            creadoPor: String(confirmadoPor),
          },
        });
        break;

      case 'send_whatsapp': {
        const plantilla = datos.plantillaId
          ? await prisma.whatsappPlantilla.findUnique({ where: { id: datos.plantillaId } })
          : null;

        const mensaje = plantilla
          ? plantilla.contenido
          : (datos.mensajePersonalizado || 'Mensaje desde CRM Maestro');

        const envio = await prisma.whatsappEnvio.create({
          data: {
            leadId: datos.leadId,
            plantillaId: datos.plantillaId || null,
            telefono: datos.telefono,
            mensaje,
            usuarioId: confirmadoPor,
          },
        });
        resultado = envio;
        break;
      }

      default:
        throw new Error(`Tipo de accion no soportado: ${action.tipo}`);
    }

    await prisma.accionIa.update({
      where: { id: actionId },
      data: {
        estado: 'ejecutada',
        confirmadoPor,
        ejecutadaAt: new Date(),
        datosSalida: resultado,
      },
    });

    return { success: true, result: resultado };
  } catch (error: any) {
    await prisma.accionIa.update({
      where: { id: actionId },
      data: {
        estado: 'fallida',
        confirmadoPor,
        ejecutadaAt: new Date(),
        error: error.message,
      },
    });
    throw error;
  }
}

export async function cancelAction(actionId: string, usuarioId: number) {
  const action = await prisma.accionIa.findUnique({ where: { id: actionId } });
  if (!action) throw new Error('Accion no encontrada');
  if (action.estado !== 'propuesta' && action.estado !== 'confirmada') {
    throw new Error(`La accion ya no se puede cancelar (estado: ${action.estado})`);
  }

  await prisma.accionIa.update({
    where: { id: actionId },
    data: { estado: 'cancelada', confirmadoPor: usuarioId, ejecutadaAt: new Date() },
  });

  return { success: true };
}

export async function getPendingActions(usuarioId: number) {
  return prisma.accionIa.findMany({
    where: { usuarioId, estado: { in: ['propuesta', 'confirmada'] } },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getActions(
  usuarioId: number,
  options: { estado?: string; tipo?: string; page?: number; limit?: number } = {}
) {
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(50, Math.max(1, options.limit || 20));

  const where: any = { usuarioId };
  if (options.estado) where.estado = options.estado;
  if (options.tipo) where.tipo = options.tipo;

  const [actions, total] = await Promise.all([
    prisma.accionIa.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.accionIa.count({ where }),
  ]);

  return {
    actions,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
}
