import { prisma } from '../config/database';

/**
 * Catálogo de tareas, logros, weekly quests y boss challenges para la
 * página de Tareas (gamificación). Las definiciones viven aquí (backend)
 * pero el progreso del usuario (XP, gemas, items reclamados) se guarda
 * en localStorage del cliente.
 *
 * El cliente combina la `meta` con el valor del `source` en `stats`
 * para calcular el progreso.
 */

export type TareaTipo = 'achievement' | 'daily' | 'weekly' | 'boss';
export type Rareza = 'comun' | 'raro' | 'epico' | 'legendario' | 'mitico';
export type Categoria = 'comunicacion' | 'cazador' | 'ventas' | 'marketing' | 'productividad';

export interface TareaDef {
  id: string;
  tipo: TareaTipo;
  titulo: string;
  descripcion: string;
  icono: string;
  source: keyof TareaStats;
  meta: number;
  xp: number;
  /** Gemas que da al completar (moneda secundaria) */
  gemas?: number;
  rareza?: Rareza;
  categoria?: Categoria;
  /** Texto especial para bosses ("Saga", "Raid") */
  saga?: string;
}

export interface TareaStats {
  // Totales
  whatsappEnviosTotal: number;
  whatsappPlantillas: number;
  leadsTotal: number;
  leadsConvertidos: number;
  leadsContactados: number;
  leadsInteresados: number;
  llamadasTotal: number;
  llamadasLargas: number;
  emailEnviosTotal: number;
  emailEnviosAbiertos: number;
  emailPlantillas: number;
  propuestasTotal: number;
  propuestasEnviadas: number;
  propuestasAceptadas: number;
  landingsPublicadas: number;
  landingsConversiones: number;
  freeValuesTotal: number;
  freeValuesUsos: number;
  calendarioEventos: number;
  abTestsTotal: number;
  etiquetasTotal: number;

  // 💰 Ingresos
  ingresosTotal: number;       // suma de Propuesta.total con estado=ACEPTADA
  ingresosMes: number;         // últimos 30 días
  ingresosSemana: number;      // últimos 7 días
  ingresosHoy: number;
  mayorPropuesta: number;      // valor máximo de una propuesta aceptada
  ticketPromedio: number;      // promedio de propuestas aceptadas
  clientesUnicos: number;      // distinct clienteEmail con propuesta aceptada

  // Hoy
  whatsappEnviosHoy: number;
  leadsHoy: number;
  llamadasHoy: number;
  emailEnviosHoy: number;
  eventosHoy: number;
  propuestasHoy: number;
  conversionesHoy: number;

  // Últimos 7 días (rolling)
  whatsappEnviosSemana: number;
  leadsSemana: number;
  llamadasSemana: number;
  emailEnviosSemana: number;
  propuestasSemana: number;
  conversionesSemana: number;
  plantillasCreadasSemana: number;
  eventosSemana: number;
  propuestasAceptadasSemana: number;

  // Últimos 30 días (rolling)
  whatsappEnviosMes: number;
  leadsMes: number;
  llamadasMes: number;
  conversionesMes: number;
  emailEnviosMes: number;
  propuestasAceptadasMes: number;
}

/**
 * Cliente top — entidades reales del CRM, ordenadas por valor.
 * Se devuelven al frontend para construir el "Salón de Clientes".
 */
export interface ClienteTopEntry {
  nombre: string;
  email: string | null;
  totalFacturado: number;
  propuestasAceptadas: number;
  primeraAceptacion: string | null; // ISO
}

/* ============================================================
   ACHIEVEMENTS — logros permanentes (5 categorías / skill trees)
============================================================ */

export const ACHIEVEMENTS: TareaDef[] = [
  // ===== COMUNICACIÓN — WhatsApp + Email + Llamadas =====
  {
    id: 'wa_1', tipo: 'achievement', categoria: 'comunicacion',
    titulo: 'Primer Contacto', descripcion: 'Envía tu primer WhatsApp',
    icono: 'MessageCircle', source: 'whatsappEnviosTotal', meta: 1,
    xp: 50, gemas: 10, rareza: 'comun',
  },
  {
    id: 'wa_25', tipo: 'achievement', categoria: 'comunicacion',
    titulo: 'Mensajero Constante', descripcion: 'Envía 25 WhatsApp',
    icono: 'MessageCircle', source: 'whatsappEnviosTotal', meta: 25,
    xp: 200, gemas: 25, rareza: 'comun',
  },
  {
    id: 'wa_100', tipo: 'achievement', categoria: 'comunicacion',
    titulo: 'Maestro del WhatsApp', descripcion: 'Envía 100 WhatsApp',
    icono: 'MessageCircle', source: 'whatsappEnviosTotal', meta: 100,
    xp: 500, gemas: 60, rareza: 'raro',
  },
  {
    id: 'wa_500', tipo: 'achievement', categoria: 'comunicacion',
    titulo: 'Sensei del WhatsApp', descripcion: 'Envía 500 WhatsApp',
    icono: 'MessageCircle', source: 'whatsappEnviosTotal', meta: 500,
    xp: 1500, gemas: 200, rareza: 'epico',
  },
  {
    id: 'wa_2000', tipo: 'achievement', categoria: 'comunicacion',
    titulo: 'Avatar de los Mensajes', descripcion: 'Envía 2000 WhatsApp',
    icono: 'MessageCircle', source: 'whatsappEnviosTotal', meta: 2000,
    xp: 5000, gemas: 700, rareza: 'mitico',
  },
  {
    id: 'plantilla_1', tipo: 'achievement', categoria: 'comunicacion',
    titulo: 'Aprendiz de Escritor', descripcion: 'Crea tu primera plantilla WhatsApp',
    icono: 'FileText', source: 'whatsappPlantillas', meta: 1,
    xp: 40, gemas: 10, rareza: 'comun',
  },
  {
    id: 'plantilla_5', tipo: 'achievement', categoria: 'comunicacion',
    titulo: 'Biblioteca Viva', descripcion: 'Crea 5 plantillas WhatsApp',
    icono: 'FileText', source: 'whatsappPlantillas', meta: 5,
    xp: 150, gemas: 20, rareza: 'comun',
  },
  {
    id: 'plantilla_20', tipo: 'achievement', categoria: 'comunicacion',
    titulo: 'Escritor Prolífico', descripcion: 'Crea 20 plantillas WhatsApp',
    icono: 'FileText', source: 'whatsappPlantillas', meta: 20,
    xp: 600, gemas: 80, rareza: 'epico',
  },
  {
    id: 'email_50', tipo: 'achievement', categoria: 'comunicacion',
    titulo: 'Inbox Invader', descripcion: 'Envía 50 emails',
    icono: 'Mail', source: 'emailEnviosTotal', meta: 50,
    xp: 250, gemas: 30, rareza: 'comun',
  },
  {
    id: 'email_500', tipo: 'achievement', categoria: 'comunicacion',
    titulo: 'Email Wizard', descripcion: 'Envía 500 emails',
    icono: 'Mail', source: 'emailEnviosTotal', meta: 500,
    xp: 1200, gemas: 150, rareza: 'epico',
  },
  {
    id: 'email_abierto_50', tipo: 'achievement', categoria: 'comunicacion',
    titulo: 'Asunto Imán', descripcion: 'Consigue 50 aperturas de email',
    icono: 'Eye', source: 'emailEnviosAbiertos', meta: 50,
    xp: 400, gemas: 50, rareza: 'raro',
  },
  {
    id: 'llamada_1', tipo: 'achievement', categoria: 'comunicacion',
    titulo: 'La Voz', descripcion: 'Completa tu primera llamada',
    icono: 'Phone', source: 'llamadasTotal', meta: 1,
    xp: 60, gemas: 10, rareza: 'comun',
  },
  {
    id: 'llamada_10', tipo: 'achievement', categoria: 'comunicacion',
    titulo: 'Voz de Oro', descripcion: 'Completa 10 llamadas',
    icono: 'Phone', source: 'llamadasTotal', meta: 10,
    xp: 150, gemas: 20, rareza: 'comun',
  },
  {
    id: 'llamada_50', tipo: 'achievement', categoria: 'comunicacion',
    titulo: 'Telemarketer Pro', descripcion: 'Completa 50 llamadas',
    icono: 'Phone', source: 'llamadasTotal', meta: 50,
    xp: 500, gemas: 65, rareza: 'raro',
  },
  {
    id: 'llamada_200', tipo: 'achievement', categoria: 'comunicacion',
    titulo: 'Headset Legendario', descripcion: 'Completa 200 llamadas',
    icono: 'Phone', source: 'llamadasTotal', meta: 200,
    xp: 2000, gemas: 250, rareza: 'epico',
  },
  {
    id: 'llamada_larga_10', tipo: 'achievement', categoria: 'comunicacion',
    titulo: 'Conversador', descripcion: 'Completa 10 llamadas de +3 minutos',
    icono: 'Phone', source: 'llamadasLargas', meta: 10,
    xp: 350, gemas: 40, rareza: 'raro',
  },

  // ===== CAZADOR — Captación de leads =====
  {
    id: 'lead_1', tipo: 'achievement', categoria: 'cazador',
    titulo: 'Primera Presa', descripcion: 'Captura tu primer lead',
    icono: 'Target', source: 'leadsTotal', meta: 1,
    xp: 40, gemas: 10, rareza: 'comun',
  },
  {
    id: 'lead_10', tipo: 'achievement', categoria: 'cazador',
    titulo: 'Cazador Novato', descripcion: 'Reúne 10 leads',
    icono: 'Target', source: 'leadsTotal', meta: 10,
    xp: 120, gemas: 20, rareza: 'comun',
  },
  {
    id: 'lead_50', tipo: 'achievement', categoria: 'cazador',
    titulo: 'Cazador Veterano', descripcion: 'Reúne 50 leads',
    icono: 'Target', source: 'leadsTotal', meta: 50,
    xp: 400, gemas: 50, rareza: 'raro',
  },
  {
    id: 'lead_200', tipo: 'achievement', categoria: 'cazador',
    titulo: 'Maestro Cazador', descripcion: 'Reúne 200 leads',
    icono: 'Target', source: 'leadsTotal', meta: 200,
    xp: 1200, gemas: 150, rareza: 'epico',
  },
  {
    id: 'lead_1000', tipo: 'achievement', categoria: 'cazador',
    titulo: 'Apex Predator', descripcion: 'Reúne 1000 leads',
    icono: 'Target', source: 'leadsTotal', meta: 1000,
    xp: 5000, gemas: 800, rareza: 'mitico',
  },
  {
    id: 'lead_contactado_50', tipo: 'achievement', categoria: 'cazador',
    titulo: 'Cazador Activo', descripcion: 'Contacta a 50 leads',
    icono: 'Crosshair', source: 'leadsContactados', meta: 50,
    xp: 300, gemas: 40, rareza: 'raro',
  },
  {
    id: 'lead_interesado_25', tipo: 'achievement', categoria: 'cazador',
    titulo: 'Generador de Interés', descripcion: '25 leads marcados como interesados',
    icono: 'Sparkles', source: 'leadsInteresados', meta: 25,
    xp: 450, gemas: 60, rareza: 'raro',
  },
  {
    id: 'etiqueta_10', tipo: 'achievement', categoria: 'cazador',
    titulo: 'Bibliotecario', descripcion: 'Crea 10 etiquetas para clasificar leads',
    icono: 'Tag', source: 'etiquetasTotal', meta: 10,
    xp: 150, gemas: 20, rareza: 'comun',
  },

  // ===== VENTAS — Conversiones y propuestas =====
  {
    id: 'conv_1', tipo: 'achievement', categoria: 'ventas',
    titulo: '¡Primer Cliente!', descripcion: 'Convierte tu primer lead en cliente',
    icono: 'Trophy', source: 'leadsConvertidos', meta: 1,
    xp: 300, gemas: 50, rareza: 'raro',
  },
  {
    id: 'conv_10', tipo: 'achievement', categoria: 'ventas',
    titulo: 'Closer', descripcion: 'Convierte 10 leads',
    icono: 'Trophy', source: 'leadsConvertidos', meta: 10,
    xp: 1200, gemas: 150, rareza: 'epico',
  },
  {
    id: 'conv_25', tipo: 'achievement', categoria: 'ventas',
    titulo: 'Killer Closer', descripcion: 'Convierte 25 leads',
    icono: 'Trophy', source: 'leadsConvertidos', meta: 25,
    xp: 2500, gemas: 300, rareza: 'epico',
  },
  {
    id: 'conv_100', tipo: 'achievement', categoria: 'ventas',
    titulo: 'Leyenda de Ventas', descripcion: 'Convierte 100 leads',
    icono: 'Crown', source: 'leadsConvertidos', meta: 100,
    xp: 8000, gemas: 1000, rareza: 'mitico',
  },
  {
    id: 'propuesta_1', tipo: 'achievement', categoria: 'ventas',
    titulo: 'Comercial Junior', descripcion: 'Crea tu primera propuesta',
    icono: 'FileText', source: 'propuestasTotal', meta: 1,
    xp: 80, gemas: 15, rareza: 'comun',
  },
  {
    id: 'propuesta_enviada_10', tipo: 'achievement', categoria: 'ventas',
    titulo: 'Enviador de Propuestas', descripcion: 'Envía 10 propuestas',
    icono: 'Send', source: 'propuestasEnviadas', meta: 10,
    xp: 400, gemas: 50, rareza: 'raro',
  },
  {
    id: 'propuesta_aceptada_1', tipo: 'achievement', categoria: 'ventas',
    titulo: 'Trato Cerrado', descripcion: 'Consigue tu primera propuesta aceptada',
    icono: 'Handshake', source: 'propuestasAceptadas', meta: 1,
    xp: 500, gemas: 80, rareza: 'raro',
  },
  {
    id: 'propuesta_aceptada_10', tipo: 'achievement', categoria: 'ventas',
    titulo: 'Maquina de Cerrar', descripcion: '10 propuestas aceptadas',
    icono: 'Handshake', source: 'propuestasAceptadas', meta: 10,
    xp: 2500, gemas: 400, rareza: 'epico',
  },

  // ===== MARKETING — Landings, FreeValues, A/B =====
  {
    id: 'landing_1', tipo: 'achievement', categoria: 'marketing',
    titulo: 'Primera Línea', descripcion: 'Publica tu primera landing',
    icono: 'Globe', source: 'landingsPublicadas', meta: 1,
    xp: 200, gemas: 30, rareza: 'comun',
  },
  {
    id: 'landing_5', tipo: 'achievement', categoria: 'marketing',
    titulo: 'Constructor Digital', descripcion: 'Publica 5 landings',
    icono: 'Globe', source: 'landingsPublicadas', meta: 5,
    xp: 750, gemas: 100, rareza: 'raro',
  },
  {
    id: 'landing_conv_50', tipo: 'achievement', categoria: 'marketing',
    titulo: 'Embudo Mágico', descripcion: 'Consigue 50 conversiones desde landings',
    icono: 'TrendingUp', source: 'landingsConversiones', meta: 50,
    xp: 800, gemas: 100, rareza: 'epico',
  },
  {
    id: 'fv_1', tipo: 'achievement', categoria: 'marketing',
    titulo: 'Gancho Magnético', descripcion: 'Crea tu primer Free Value',
    icono: 'Gift', source: 'freeValuesTotal', meta: 1,
    xp: 150, gemas: 20, rareza: 'comun',
  },
  {
    id: 'fv_5', tipo: 'achievement', categoria: 'marketing',
    titulo: 'Imán de Leads', descripcion: 'Crea 5 Free Values',
    icono: 'Gift', source: 'freeValuesTotal', meta: 5,
    xp: 500, gemas: 60, rareza: 'raro',
  },
  {
    id: 'fv_usos_100', tipo: 'achievement', categoria: 'marketing',
    titulo: 'Contenido Viral', descripcion: '100 usos de tus Free Values',
    icono: 'Rocket', source: 'freeValuesUsos', meta: 100,
    xp: 700, gemas: 80, rareza: 'epico',
  },
  {
    id: 'ab_1', tipo: 'achievement', categoria: 'marketing',
    titulo: 'Científico del Marketing', descripcion: 'Lanza tu primer test A/B',
    icono: 'FlaskConical', source: 'abTestsTotal', meta: 1,
    xp: 200, gemas: 30, rareza: 'raro',
  },
  {
    id: 'ab_5', tipo: 'achievement', categoria: 'marketing',
    titulo: 'Optimizador', descripcion: 'Lanza 5 tests A/B',
    icono: 'FlaskConical', source: 'abTestsTotal', meta: 5,
    xp: 800, gemas: 100, rareza: 'epico',
  },

  // ===== PRODUCTIVIDAD — Calendario, organización =====
  {
    id: 'evento_1', tipo: 'achievement', categoria: 'productividad',
    titulo: 'Primera Cita', descripcion: 'Agenda tu primer evento',
    icono: 'Calendar', source: 'calendarioEventos', meta: 1,
    xp: 40, gemas: 10, rareza: 'comun',
  },
  {
    id: 'evento_10', tipo: 'achievement', categoria: 'productividad',
    titulo: 'Agendador Pro', descripcion: 'Agenda 10 eventos',
    icono: 'Calendar', source: 'calendarioEventos', meta: 10,
    xp: 200, gemas: 25, rareza: 'comun',
  },
  {
    id: 'evento_50', tipo: 'achievement', categoria: 'productividad',
    titulo: 'Maestro del Tiempo', descripcion: 'Agenda 50 eventos',
    icono: 'Calendar', source: 'calendarioEventos', meta: 50,
    xp: 700, gemas: 90, rareza: 'epico',
  },

  // ===== MEGA TIERS — escalada larga =====
  // Comunicación extendida
  { id: 'wa_5000',   tipo: 'achievement', categoria: 'comunicacion', titulo: 'Dios de los Mensajes',     descripcion: 'Envía 5.000 WhatsApp',     icono: 'MessageCircle', source: 'whatsappEnviosTotal', meta: 5000,   xp: 12000, gemas: 1800, rareza: 'mitico' },
  { id: 'wa_10000',  tipo: 'achievement', categoria: 'comunicacion', titulo: 'Omnipresente',             descripcion: 'Envía 10.000 WhatsApp',    icono: 'MessageCircle', source: 'whatsappEnviosTotal', meta: 10000,  xp: 25000, gemas: 4000, rareza: 'mitico' },
  { id: 'email_2000',tipo: 'achievement', categoria: 'comunicacion', titulo: 'Email Sage',               descripcion: 'Envía 2.000 emails',       icono: 'Mail',          source: 'emailEnviosTotal',    meta: 2000,   xp: 3000,  gemas: 400,  rareza: 'epico' },
  { id: 'email_10000',tipo:'achievement', categoria: 'comunicacion', titulo: 'Imperator del Inbox',      descripcion: 'Envía 10.000 emails',      icono: 'Mail',          source: 'emailEnviosTotal',    meta: 10000,  xp: 15000, gemas: 2500, rareza: 'legendario' },
  { id: 'llamada_500',tipo:'achievement', categoria: 'comunicacion', titulo: 'Reina del Headset',        descripcion: 'Completa 500 llamadas',    icono: 'Phone',         source: 'llamadasTotal',       meta: 500,    xp: 5000,  gemas: 700,  rareza: 'legendario' },
  { id: 'llamada_2000',tipo:'achievement',categoria: 'comunicacion', titulo: 'Voz Inmortal',             descripcion: 'Completa 2.000 llamadas',  icono: 'Phone',         source: 'llamadasTotal',       meta: 2000,   xp: 15000, gemas: 2500, rareza: 'mitico' },
  { id: 'plantilla_50',tipo:'achievement',categoria: 'comunicacion', titulo: 'Arquitecto del Verbo',     descripcion: 'Crea 50 plantillas WhatsApp', icono: 'FileText',   source: 'whatsappPlantillas',  meta: 50,     xp: 1800,  gemas: 250,  rareza: 'epico' },
  { id: 'email_abierto_500', tipo:'achievement', categoria:'comunicacion', titulo: 'Magnetismo del Asunto', descripcion: 'Consigue 500 aperturas de email', icono: 'Eye', source: 'emailEnviosAbiertos', meta: 500, xp: 2500, gemas: 300, rareza: 'epico' },

  // Cazador extendido
  { id: 'lead_500',   tipo: 'achievement', categoria: 'cazador', titulo: 'Gran Cazador',           descripcion: 'Reúne 500 leads',           icono: 'Target',    source: 'leadsTotal',       meta: 500,   xp: 2500,  gemas: 350,  rareza: 'epico' },
  { id: 'lead_2500',  tipo: 'achievement', categoria: 'cazador', titulo: 'Señor de los Leads',     descripcion: 'Reúne 2.500 leads',         icono: 'Target',    source: 'leadsTotal',       meta: 2500,  xp: 9000,  gemas: 1300, rareza: 'legendario' },
  { id: 'lead_5000',  tipo: 'achievement', categoria: 'cazador', titulo: 'Emperador del Pasto',    descripcion: 'Reúne 5.000 leads',         icono: 'Target',    source: 'leadsTotal',       meta: 5000,  xp: 20000, gemas: 3000, rareza: 'mitico' },
  { id: 'lead_10000', tipo: 'achievement', categoria: 'cazador', titulo: 'Mundo Conquistado',      descripcion: 'Reúne 10.000 leads',        icono: 'Target',    source: 'leadsTotal',       meta: 10000, xp: 50000, gemas: 8000, rareza: 'mitico' },
  { id: 'lead_contactado_200', tipo: 'achievement', categoria: 'cazador', titulo: 'Contactor Sereno', descripcion: 'Contacta a 200 leads', icono: 'Crosshair', source: 'leadsContactados', meta: 200, xp: 1200, gemas: 150, rareza: 'epico' },
  { id: 'lead_interesado_100', tipo: 'achievement', categoria: 'cazador', titulo: 'Maestro del Hype', descripcion: '100 leads interesados', icono: 'Sparkles', source: 'leadsInteresados', meta: 100, xp: 2000, gemas: 300, rareza: 'epico' },
  { id: 'etiqueta_50',tipo: 'achievement', categoria: 'cazador', titulo: 'El Taxónomo',            descripcion: 'Crea 50 etiquetas',         icono: 'Tag',       source: 'etiquetasTotal',   meta: 50,    xp: 800,   gemas: 100,  rareza: 'raro' },

  // Ventas — conversiones mega
  { id: 'conv_250',  tipo: 'achievement', categoria: 'ventas', titulo: 'Cazarrecompensas',           descripcion: 'Convierte 250 leads',     icono: 'Crown',     source: 'leadsConvertidos',  meta: 250,  xp: 25000, gemas: 4000, rareza: 'legendario' },
  { id: 'conv_500',  tipo: 'achievement', categoria: 'ventas', titulo: 'Demiurgo del Sí',            descripcion: 'Convierte 500 leads',     icono: 'Crown',     source: 'leadsConvertidos',  meta: 500,  xp: 60000, gemas: 9000, rareza: 'mitico' },
  { id: 'conv_1000', tipo: 'achievement', categoria: 'ventas', titulo: 'Avatar de las Ventas',       descripcion: 'Convierte 1.000 leads',   icono: 'Crown',     source: 'leadsConvertidos',  meta: 1000, xp: 150000,gemas: 25000,rareza: 'mitico' },
  { id: 'prop_enviada_50',  tipo: 'achievement', categoria: 'ventas', titulo: 'Lluvia de Tratos',  descripcion: 'Envía 50 propuestas',     icono: 'Send',      source: 'propuestasEnviadas',meta: 50,   xp: 1500,  gemas: 200,  rareza: 'epico' },
  { id: 'prop_aceptada_25', tipo: 'achievement', categoria: 'ventas', titulo: 'Cerrador en Serie',  descripcion: '25 propuestas aceptadas', icono: 'Handshake', source: 'propuestasAceptadas', meta: 25, xp: 6000, gemas: 900, rareza: 'epico' },
  { id: 'prop_aceptada_100',tipo: 'achievement', categoria: 'ventas', titulo: 'Maestro del Sí',     descripcion: '100 propuestas aceptadas',icono: 'Handshake', source: 'propuestasAceptadas', meta: 100,xp: 25000,gemas: 4000,rareza: 'legendario' },
  { id: 'prop_aceptada_500',tipo: 'achievement', categoria: 'ventas', titulo: 'Cierre Eterno',      descripcion: '500 propuestas aceptadas',icono: 'Handshake', source: 'propuestasAceptadas', meta: 500,xp: 100000,gemas: 16000,rareza: 'mitico' },

  // 💰 INGRESOS — la escalera hacia el millón
  { id: 'ing_500',    tipo: 'achievement', categoria: 'ventas', titulo: 'Primera Moneda',           descripcion: 'Factura 500 €',         icono: 'Coins',    source: 'ingresosTotal', meta: 500,    xp: 300,    gemas: 50,   rareza: 'comun' },
  { id: 'ing_1k',     tipo: 'achievement', categoria: 'ventas', titulo: 'Primer Sueldo',            descripcion: 'Factura 1.000 €',       icono: 'Coins',    source: 'ingresosTotal', meta: 1000,   xp: 800,    gemas: 120,  rareza: 'raro' },
  { id: 'ing_5k',     tipo: 'achievement', categoria: 'ventas', titulo: 'Cinco Mil',                descripcion: 'Factura 5.000 €',       icono: 'Banknote', source: 'ingresosTotal', meta: 5000,   xp: 2500,   gemas: 350,  rareza: 'raro' },
  { id: 'ing_10k',    tipo: 'achievement', categoria: 'ventas', titulo: 'Diez Mil',                 descripcion: 'Factura 10.000 €',      icono: 'Banknote', source: 'ingresosTotal', meta: 10000,  xp: 5000,   gemas: 700,  rareza: 'epico' },
  { id: 'ing_25k',    tipo: 'achievement', categoria: 'ventas', titulo: 'Veinticinco Mil',          descripcion: 'Factura 25.000 €',      icono: 'Banknote', source: 'ingresosTotal', meta: 25000,  xp: 10000,  gemas: 1500, rareza: 'epico' },
  { id: 'ing_50k',    tipo: 'achievement', categoria: 'ventas', titulo: 'El Quincenal',             descripcion: 'Factura 50.000 €',      icono: 'Banknote', source: 'ingresosTotal', meta: 50000,  xp: 20000,  gemas: 3000, rareza: 'legendario' },
  { id: 'ing_100k',   tipo: 'achievement', categoria: 'ventas', titulo: 'Seis Cifras',              descripcion: 'Factura 100.000 €',     icono: 'Coins',    source: 'ingresosTotal', meta: 100000, xp: 40000,  gemas: 6000, rareza: 'legendario' },
  { id: 'ing_250k',   tipo: 'achievement', categoria: 'ventas', titulo: 'Cuarto de Millón',         descripcion: 'Factura 250.000 €',     icono: 'Coins',    source: 'ingresosTotal', meta: 250000, xp: 100000, gemas: 15000,rareza: 'mitico' },
  { id: 'ing_500k',   tipo: 'achievement', categoria: 'ventas', titulo: 'Medio Millón',             descripcion: 'Factura 500.000 €',     icono: 'Diamond',  source: 'ingresosTotal', meta: 500000, xp: 200000, gemas: 30000,rareza: 'mitico' },
  { id: 'ing_1m',     tipo: 'achievement', categoria: 'ventas', titulo: 'Millonario',               descripcion: 'Factura 1.000.000 €',   icono: 'Diamond',  source: 'ingresosTotal', meta: 1000000,xp: 500000, gemas: 80000,rareza: 'mitico' },
  { id: 'ticket_alto',tipo: 'achievement', categoria: 'ventas', titulo: 'Trato de Oro',             descripcion: 'Una propuesta de 5.000 €+', icono: 'Trophy', source: 'mayorPropuesta', meta: 5000, xp: 2000, gemas: 250, rareza: 'epico' },
  { id: 'ticket_premium',tipo:'achievement',categoria: 'ventas', titulo: 'Whale Hunter',            descripcion: 'Una propuesta de 25.000 €+',icono: 'Trophy', source: 'mayorPropuesta', meta: 25000, xp: 8000, gemas: 1200, rareza: 'legendario' },

  // 👥 CLIENTES — número de clientes únicos
  { id: 'cli_5',    tipo: 'achievement', categoria: 'ventas', titulo: 'Primer Círculo',          descripcion: '5 clientes únicos',     icono: 'Users',  source: 'clientesUnicos', meta: 5,    xp: 1000,  gemas: 150,  rareza: 'raro' },
  { id: 'cli_25',   tipo: 'achievement', categoria: 'ventas', titulo: 'Reino Pequeño',           descripcion: '25 clientes únicos',    icono: 'Users',  source: 'clientesUnicos', meta: 25,   xp: 5000,  gemas: 700,  rareza: 'epico' },
  { id: 'cli_100',  tipo: 'achievement', categoria: 'ventas', titulo: 'Imperio Naciente',        descripcion: '100 clientes únicos',   icono: 'Users',  source: 'clientesUnicos', meta: 100,  xp: 20000, gemas: 3000, rareza: 'legendario' },
  { id: 'cli_500',  tipo: 'achievement', categoria: 'ventas', titulo: 'Soberano de Mercados',    descripcion: '500 clientes únicos',   icono: 'Crown',  source: 'clientesUnicos', meta: 500,  xp: 80000, gemas: 12000,rareza: 'mitico' },
  { id: 'cli_1000', tipo: 'achievement', categoria: 'ventas', titulo: 'Mil Vasallos',            descripcion: '1.000 clientes únicos', icono: 'Crown',  source: 'clientesUnicos', meta: 1000, xp: 200000,gemas: 30000,rareza: 'mitico' },

  // 🚀 MARKETING extendido
  { id: 'landing_25', tipo: 'achievement', categoria: 'marketing', titulo: 'Mago de Landings',     descripcion: 'Publica 25 landings',         icono: 'Globe',     source: 'landingsPublicadas',  meta: 25,  xp: 3000, gemas: 400, rareza: 'epico' },
  { id: 'landing_conv_500', tipo:'achievement',categoria:'marketing', titulo: 'Túnel Infinito',    descripcion: '500 conversiones desde landings', icono: 'TrendingUp', source: 'landingsConversiones', meta: 500, xp: 4000, gemas: 600, rareza: 'epico' },
  { id: 'fv_25',      tipo: 'achievement', categoria: 'marketing', titulo: 'Arsenal Magnético',    descripcion: 'Crea 25 Free Values',         icono: 'Gift',      source: 'freeValuesTotal',     meta: 25,  xp: 3000, gemas: 450, rareza: 'epico' },
  { id: 'fv_usos_1000', tipo:'achievement', categoria:'marketing', titulo: 'Distribución Viral',   descripcion: '1.000 usos de Free Values',   icono: 'Rocket',    source: 'freeValuesUsos',      meta: 1000,xp: 5000, gemas: 800, rareza: 'legendario' },
  { id: 'ab_20',      tipo: 'achievement', categoria: 'marketing', titulo: 'Físico del Marketing', descripcion: 'Lanza 20 tests A/B',          icono: 'FlaskConical',source:'abTestsTotal',       meta: 20,  xp: 4000, gemas: 600, rareza: 'legendario' },

  // 🧰 PRODUCTIVIDAD extendida
  { id: 'evento_200', tipo: 'achievement', categoria: 'productividad', titulo: 'Cronos',           descripcion: 'Agenda 200 eventos',          icono: 'Calendar',  source: 'calendarioEventos',   meta: 200, xp: 3000, gemas: 400, rareza: 'epico' },
  { id: 'evento_1000',tipo: 'achievement', categoria: 'productividad', titulo: 'Señor del Tiempo', descripcion: 'Agenda 1.000 eventos',        icono: 'Calendar',  source: 'calendarioEventos',   meta: 1000,xp: 12000,gemas: 1800,rareza: 'legendario' },
];

/* ============================================================
   DAILY POOL — 3 misiones diarias rotando
============================================================ */

export const DAILY_POOL: TareaDef[] = [
  {
    id: 'daily_wa_3', tipo: 'daily',
    titulo: 'Despierta WhatsApp', descripcion: 'Envía 3 WhatsApp hoy',
    icono: 'MessageCircle', source: 'whatsappEnviosHoy', meta: 3, xp: 50, gemas: 10,
  },
  {
    id: 'daily_wa_10', tipo: 'daily',
    titulo: 'Maratón WhatsApp', descripcion: 'Envía 10 WhatsApp hoy',
    icono: 'MessageCircle', source: 'whatsappEnviosHoy', meta: 10, xp: 150, gemas: 25,
  },
  {
    id: 'daily_call_3', tipo: 'daily',
    titulo: 'Marca y conecta', descripcion: 'Completa 3 llamadas hoy',
    icono: 'Phone', source: 'llamadasHoy', meta: 3, xp: 80, gemas: 15,
  },
  {
    id: 'daily_call_7', tipo: 'daily',
    titulo: 'Sesión de calls', descripcion: 'Completa 7 llamadas hoy',
    icono: 'Phone', source: 'llamadasHoy', meta: 7, xp: 180, gemas: 30,
  },
  {
    id: 'daily_lead_2', tipo: 'daily',
    titulo: 'Pesca del día', descripcion: 'Captura 2 leads nuevos',
    icono: 'Target', source: 'leadsHoy', meta: 2, xp: 80, gemas: 15,
  },
  {
    id: 'daily_lead_5', tipo: 'daily',
    titulo: 'Día de cazador', descripcion: 'Captura 5 leads nuevos',
    icono: 'Target', source: 'leadsHoy', meta: 5, xp: 200, gemas: 35,
  },
  {
    id: 'daily_email_5', tipo: 'daily',
    titulo: 'Inbox tour', descripcion: 'Envía 5 emails hoy',
    icono: 'Mail', source: 'emailEnviosHoy', meta: 5, xp: 60, gemas: 10,
  },
  {
    id: 'daily_email_20', tipo: 'daily',
    titulo: 'Bombardeo email', descripcion: 'Envía 20 emails hoy',
    icono: 'Mail', source: 'emailEnviosHoy', meta: 20, xp: 200, gemas: 35,
  },
  {
    id: 'daily_evento_1', tipo: 'daily',
    titulo: 'Agenda llena', descripcion: 'Agenda 1 evento hoy',
    icono: 'Calendar', source: 'eventosHoy', meta: 1, xp: 50, gemas: 10,
  },
  {
    id: 'daily_propuesta_1', tipo: 'daily',
    titulo: 'Cazador de tratos', descripcion: 'Crea 1 propuesta hoy',
    icono: 'FileText', source: 'propuestasHoy', meta: 1, xp: 120, gemas: 20,
  },
  { id: 'daily_conv_1',  tipo: 'daily', titulo: 'Cerrador del Día',      descripcion: 'Convierte 1 lead hoy',                icono: 'Trophy',   source: 'conversionesHoy',   meta: 1,  xp: 350, gemas: 60 },
  { id: 'daily_ing_500', tipo: 'daily', titulo: 'Caja Registradora',     descripcion: 'Factura 500 € hoy',                   icono: 'Coins',    source: 'ingresosHoy',       meta: 500,xp: 250, gemas: 40 },
  { id: 'daily_ing_2k',  tipo: 'daily', titulo: 'Buen Día de Ventas',    descripcion: 'Factura 2.000 € hoy',                 icono: 'Banknote', source: 'ingresosHoy',       meta: 2000,xp: 700, gemas: 110 },
  { id: 'daily_wa_25',   tipo: 'daily', titulo: 'Ultra-mensajero',       descripcion: 'Envía 25 WhatsApp hoy',               icono: 'MessageCircle', source: 'whatsappEnviosHoy', meta: 25, xp: 350, gemas: 55 },
  { id: 'daily_call_15', tipo: 'daily', titulo: 'Operador de la Línea',  descripcion: 'Completa 15 llamadas hoy',            icono: 'Phone',    source: 'llamadasHoy',       meta: 15, xp: 400, gemas: 60 },
  { id: 'daily_lead_10', tipo: 'daily', titulo: 'Día de Inundación',     descripcion: 'Captura 10 leads nuevos hoy',         icono: 'Target',   source: 'leadsHoy',          meta: 10, xp: 450, gemas: 75 },
];

/* ============================================================
   WEEKLY POOL — misiones semanales (3 elegidas de 6)
============================================================ */

export const WEEKLY_POOL: TareaDef[] = [
  {
    id: 'weekly_wa_30', tipo: 'weekly',
    titulo: 'Semana del WhatsApp', descripcion: 'Envía 30 WhatsApp esta semana',
    icono: 'MessageCircle', source: 'whatsappEnviosSemana', meta: 30,
    xp: 400, gemas: 60, rareza: 'raro',
  },
  {
    id: 'weekly_leads_15', tipo: 'weekly',
    titulo: 'Semana de prospección', descripcion: 'Captura 15 leads nuevos',
    icono: 'Target', source: 'leadsSemana', meta: 15,
    xp: 500, gemas: 70, rareza: 'raro',
  },
  {
    id: 'weekly_calls_15', tipo: 'weekly',
    titulo: 'Maratón de calls', descripcion: 'Completa 15 llamadas esta semana',
    icono: 'Phone', source: 'llamadasSemana', meta: 15,
    xp: 450, gemas: 65, rareza: 'raro',
  },
  {
    id: 'weekly_email_50', tipo: 'weekly',
    titulo: 'Campaña masiva', descripcion: 'Envía 50 emails esta semana',
    icono: 'Mail', source: 'emailEnviosSemana', meta: 50,
    xp: 400, gemas: 55, rareza: 'raro',
  },
  {
    id: 'weekly_conv_3', tipo: 'weekly',
    titulo: 'Cerrador semanal', descripcion: 'Convierte 3 leads esta semana',
    icono: 'Trophy', source: 'conversionesSemana', meta: 3,
    xp: 1200, gemas: 200, rareza: 'epico',
  },
  {
    id: 'weekly_eventos_5', tipo: 'weekly',
    titulo: 'Agenda viva', descripcion: 'Agenda 5 eventos esta semana',
    icono: 'Calendar', source: 'eventosSemana', meta: 5,
    xp: 350, gemas: 45, rareza: 'raro',
  },
  {
    id: 'weekly_propuestas_3', tipo: 'weekly',
    titulo: 'Lluvia de propuestas', descripcion: 'Crea 3 propuestas esta semana',
    icono: 'FileText', source: 'propuestasSemana', meta: 3,
    xp: 600, gemas: 80, rareza: 'raro',
  },
  { id: 'weekly_ing_5k',       tipo: 'weekly', titulo: 'Semana en Verde',        descripcion: 'Factura 5.000 € esta semana',         icono: 'Banknote', source: 'ingresosSemana',           meta: 5000, xp: 2500, gemas: 400, rareza: 'epico' },
  { id: 'weekly_ing_20k',      tipo: 'weekly', titulo: 'Semana Memorable',       descripcion: 'Factura 20.000 € esta semana',        icono: 'Banknote', source: 'ingresosSemana',           meta: 20000,xp: 8000, gemas: 1500,rareza: 'epico' },
  { id: 'weekly_clientes_2',   tipo: 'weekly', titulo: 'Caza Mayor',             descripcion: 'Cierra 2 propuestas esta semana',     icono: 'Handshake',source: 'propuestasAceptadasSemana',meta: 2,    xp: 1500, gemas: 250, rareza: 'epico' },
  { id: 'weekly_clientes_5',   tipo: 'weekly', titulo: 'Maestro del Cierre',     descripcion: 'Cierra 5 propuestas esta semana',     icono: 'Handshake',source: 'propuestasAceptadasSemana',meta: 5,    xp: 4500, gemas: 700, rareza: 'legendario' },
  { id: 'weekly_leads_50',     tipo: 'weekly', titulo: 'Inundación Semanal',     descripcion: 'Captura 50 leads esta semana',        icono: 'Target',   source: 'leadsSemana',              meta: 50,   xp: 2000, gemas: 300, rareza: 'epico' },
];

/* ============================================================
   BOSS CHALLENGES — desafíos mensuales (1 elegido de 4)
============================================================ */

export const BOSS_POOL: TareaDef[] = [
  {
    id: 'boss_coloso_leads', tipo: 'boss', saga: 'El Coloso',
    titulo: 'El Coloso de los 100 Leads',
    descripcion: 'Reúne 100 leads nuevos en los últimos 30 días',
    icono: 'Crown', source: 'leadsMes', meta: 100,
    xp: 5000, gemas: 800, rareza: 'legendario',
  },
  {
    id: 'boss_apex_conversor', tipo: 'boss', saga: 'El Apex',
    titulo: 'Master Conversor',
    descripcion: 'Convierte 15 leads en los últimos 30 días',
    icono: 'Crown', source: 'conversionesMes', meta: 15,
    xp: 8000, gemas: 1200, rareza: 'mitico',
  },
  {
    id: 'boss_tornado_wa', tipo: 'boss', saga: 'La Tormenta',
    titulo: 'Tornado de WhatsApp',
    descripcion: 'Envía 500 WhatsApp en los últimos 30 días',
    icono: 'Zap', source: 'whatsappEnviosMes', meta: 500,
    xp: 3500, gemas: 500, rareza: 'legendario',
  },
  {
    id: 'boss_inferno_calls', tipo: 'boss', saga: 'El Infierno',
    titulo: 'Inferno de Llamadas',
    descripcion: 'Completa 100 llamadas en los últimos 30 días',
    icono: 'Flame', source: 'llamadasMes', meta: 100,
    xp: 4000, gemas: 600, rareza: 'legendario',
  },
  { id: 'boss_caja_fuerte', tipo: 'boss', saga: 'La Caja Fuerte',
    titulo: 'El Cofre de Oro Mensual',
    descripcion: 'Factura 10.000 € en los últimos 30 días',
    icono: 'Banknote', source: 'ingresosMes', meta: 10000,
    xp: 12000, gemas: 2000, rareza: 'legendario',
  },
  { id: 'boss_mecenas', tipo: 'boss', saga: 'El Mecenas',
    titulo: 'El Mes del Mecenas',
    descripcion: 'Factura 50.000 € en los últimos 30 días',
    icono: 'Diamond', source: 'ingresosMes', meta: 50000,
    xp: 50000, gemas: 8000, rareza: 'mitico',
  },
  { id: 'boss_olimpo', tipo: 'boss', saga: 'El Olimpo',
    titulo: 'El Mes del Olimpo',
    descripcion: 'Factura 100.000 € en los últimos 30 días',
    icono: 'Crown', source: 'ingresosMes', meta: 100000,
    xp: 150000, gemas: 25000, rareza: 'mitico',
  },
  { id: 'boss_recolector', tipo: 'boss', saga: 'El Recolector',
    titulo: 'Cosecha del Mes',
    descripcion: 'Cierra 10 propuestas en los últimos 30 días',
    icono: 'Handshake', source: 'propuestasAceptadasMes', meta: 10,
    xp: 15000, gemas: 2500, rareza: 'legendario',
  },
];

/* ============================================================
   Stats aggregator
============================================================ */

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};
const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
};

export async function getTareaStats(): Promise<TareaStats> {
  const hoy = startOfToday();
  const hace7 = daysAgo(7);
  const hace30 = daysAgo(30);

  const [
    whatsappEnviosTotal,
    whatsappEnviosHoy,
    whatsappEnviosSemana,
    whatsappEnviosMes,
    whatsappPlantillas,
    plantillasCreadasSemana,
    leadsTotal,
    leadsHoy,
    leadsSemana,
    leadsMes,
    leadsConvertidos,
    leadsContactados,
    leadsInteresados,
    conversionesSemana,
    conversionesMes,
    llamadasTotal,
    llamadasHoy,
    llamadasSemana,
    llamadasMes,
    llamadasLargas,
    emailEnviosTotal,
    emailEnviosHoy,
    emailEnviosSemana,
    emailEnviosMes,
    emailEnviosAbiertos,
    emailPlantillas,
    propuestasTotal,
    propuestasHoy,
    propuestasSemana,
    propuestasEnviadas,
    propuestasAceptadas,
    landingsPublicadas,
    landings,
    freeValuesTotal,
    freeValues,
    calendarioEventos,
    eventosHoy,
    eventosSemana,
    abTestsTotal,
    etiquetasTotal,
    conversionesHoy,
    propuestasAceptadasSemana,
    propuestasAceptadasMes,
    ingresosTotalAgg,
    ingresosMesAgg,
    ingresosSemanaAgg,
    ingresosHoyAgg,
    mayorPropuestaAgg,
    clientesUnicosRaw,
  ] = await Promise.all([
    prisma.whatsappEnvio.count(),
    prisma.whatsappEnvio.count({ where: { enviadoAt: { gte: hoy } } }),
    prisma.whatsappEnvio.count({ where: { enviadoAt: { gte: hace7 } } }),
    prisma.whatsappEnvio.count({ where: { enviadoAt: { gte: hace30 } } }),
    prisma.whatsappPlantilla.count(),
    prisma.whatsappPlantilla.count({ where: { createdAt: { gte: hace7 } } }),
    prisma.lead.count(),
    prisma.lead.count({ where: { createdAt: { gte: hoy } } }),
    prisma.lead.count({ where: { createdAt: { gte: hace7 } } }),
    prisma.lead.count({ where: { createdAt: { gte: hace30 } } }),
    prisma.lead.count({ where: { estado: 'CONVERTIDO' } }),
    prisma.lead.count({ where: { estado: 'CONTACTADO' } }),
    prisma.lead.count({ where: { estado: 'INTERESADO' } }),
    prisma.lead.count({ where: { estado: 'CONVERTIDO', updatedAt: { gte: hace7 } } }),
    prisma.lead.count({ where: { estado: 'CONVERTIDO', updatedAt: { gte: hace30 } } }),
    prisma.llamadaReal.count(),
    prisma.llamadaReal.count({ where: { createdAt: { gte: hoy } } }),
    prisma.llamadaReal.count({ where: { createdAt: { gte: hace7 } } }),
    prisma.llamadaReal.count({ where: { createdAt: { gte: hace30 } } }),
    prisma.llamadaReal.count({ where: { duracionSeg: { gte: 180 } } }),
    prisma.emailEnvio.count({ where: { estado: 'enviado' } }),
    prisma.emailEnvio.count({ where: { estado: 'enviado', enviadoEn: { gte: hoy } } }),
    prisma.emailEnvio.count({ where: { estado: 'enviado', enviadoEn: { gte: hace7 } } }),
    prisma.emailEnvio.count({ where: { estado: 'enviado', enviadoEn: { gte: hace30 } } }),
    prisma.emailEnvio.count({ where: { abiertoEn: { not: null } } }),
    prisma.emailPlantilla.count(),
    prisma.propuesta.count(),
    prisma.propuesta.count({ where: { createdAt: { gte: hoy } } }),
    prisma.propuesta.count({ where: { createdAt: { gte: hace7 } } }),
    prisma.propuesta.count({ where: { estado: { in: ['ENVIADA', 'VISTA', 'ACEPTADA'] } } }),
    prisma.propuesta.count({ where: { estado: 'ACEPTADA' } }),
    prisma.landing.count({ where: { estado: 'PUBLICADA' } }),
    prisma.landing.aggregate({ _sum: { conversiones: true } }),
    prisma.freeValue.count(),
    prisma.freeValue.aggregate({ _sum: { usos: true } }),
    prisma.calendarioEvento.count(),
    prisma.calendarioEvento.count({ where: { createdAt: { gte: hoy } } }),
    prisma.calendarioEvento.count({ where: { createdAt: { gte: hace7 } } }),
    prisma.whatsappABTest.count(),
    prisma.leadEtiqueta.count(),
    prisma.lead.count({ where: { estado: 'CONVERTIDO', updatedAt: { gte: hoy } } }),
    prisma.propuesta.count({ where: { estado: 'ACEPTADA', updatedAt: { gte: hace7 } } }),
    prisma.propuesta.count({ where: { estado: 'ACEPTADA', updatedAt: { gte: hace30 } } }),
    prisma.propuesta.aggregate({ where: { estado: 'ACEPTADA' }, _sum: { total: true } }),
    prisma.propuesta.aggregate({ where: { estado: 'ACEPTADA', updatedAt: { gte: hace30 } }, _sum: { total: true } }),
    prisma.propuesta.aggregate({ where: { estado: 'ACEPTADA', updatedAt: { gte: hace7 } }, _sum: { total: true } }),
    prisma.propuesta.aggregate({ where: { estado: 'ACEPTADA', updatedAt: { gte: hoy } }, _sum: { total: true } }),
    prisma.propuesta.aggregate({ where: { estado: 'ACEPTADA' }, _max: { total: true } }),
    prisma.propuesta.findMany({
      where: { estado: 'ACEPTADA', clienteEmail: { not: null } },
      distinct: ['clienteEmail'],
      select: { clienteEmail: true },
    }),
  ]);

  return {
    whatsappEnviosTotal,
    whatsappEnviosHoy,
    whatsappEnviosSemana,
    whatsappEnviosMes,
    whatsappPlantillas,
    plantillasCreadasSemana,
    leadsTotal,
    leadsHoy,
    leadsSemana,
    leadsMes,
    leadsConvertidos,
    leadsContactados,
    leadsInteresados,
    conversionesSemana,
    conversionesMes,
    llamadasTotal,
    llamadasHoy,
    llamadasSemana,
    llamadasMes,
    llamadasLargas,
    emailEnviosTotal,
    emailEnviosHoy,
    emailEnviosSemana,
    emailEnviosMes,
    emailEnviosAbiertos,
    emailPlantillas,
    propuestasTotal,
    propuestasHoy,
    propuestasSemana,
    propuestasEnviadas,
    propuestasAceptadas,
    landingsPublicadas,
    landingsConversiones: landings._sum.conversiones ?? 0,
    freeValuesTotal,
    freeValuesUsos: freeValues._sum.usos ?? 0,
    calendarioEventos,
    eventosHoy,
    eventosSemana,
    abTestsTotal,
    etiquetasTotal,
    conversionesHoy,
    propuestasAceptadasSemana,
    propuestasAceptadasMes,
    ingresosTotal: Number(ingresosTotalAgg._sum.total ?? 0),
    ingresosMes: Number(ingresosMesAgg._sum.total ?? 0),
    ingresosSemana: Number(ingresosSemanaAgg._sum.total ?? 0),
    ingresosHoy: Number(ingresosHoyAgg._sum.total ?? 0),
    mayorPropuesta: Number(mayorPropuestaAgg._max.total ?? 0),
    ticketPromedio: propuestasAceptadas > 0 ? Math.round(Number(ingresosTotalAgg._sum.total ?? 0) / propuestasAceptadas) : 0,
    clientesUnicos: clientesUnicosRaw.length,
  };
}

/**
 * Devuelve los clientes top del CRM ordenados por total facturado.
 * Usado para el "Salón de Clientes" del jugador.
 */
export async function getTopClientes(limit = 12): Promise<ClienteTopEntry[]> {
  // Agrupamos propuestas aceptadas por clienteEmail (cuando exista) y por clienteNombre.
  const propuestas = await prisma.propuesta.findMany({
    where: { estado: 'ACEPTADA' },
    select: { clienteNombre: true, clienteEmail: true, total: true, updatedAt: true },
  });
  const map = new Map<string, ClienteTopEntry>();
  for (const p of propuestas) {
    const key = (p.clienteEmail || p.clienteNombre).toLowerCase();
    const total = Number(p.total ?? 0);
    const existing = map.get(key);
    if (existing) {
      existing.totalFacturado += total;
      existing.propuestasAceptadas += 1;
      if (!existing.primeraAceptacion || (p.updatedAt && p.updatedAt.toISOString() < existing.primeraAceptacion)) {
        existing.primeraAceptacion = p.updatedAt?.toISOString() ?? existing.primeraAceptacion;
      }
    } else {
      map.set(key, {
        nombre: p.clienteNombre,
        email: p.clienteEmail,
        totalFacturado: total,
        propuestasAceptadas: 1,
        primeraAceptacion: p.updatedAt?.toISOString() ?? null,
      });
    }
  }
  return [...map.values()].sort((a, b) => b.totalFacturado - a.totalFacturado).slice(0, limit);
}
