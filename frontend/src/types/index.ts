export interface User {
  id: number;
  email: string;
  nombre: string;
  rol: string;
}

export interface AuthResponse {
  success: boolean;
  data: {
    accessToken: string;
    refreshToken: string;
    user: User;
  };
}

export interface Cliente {
  id: number;
  email: string;
  nombre: string;
  telefono?: string;
  pais?: string;
  empresa?: string;
  origenSaas: string;
  estado: string;
  fechaRegistro: string;
  fechaUltimoLogin?: string;
  metadata?: any;
  notasInternas?: string;
  suscripciones?: Suscripcion[];
  pagos?: Pago[];
  eventos?: Evento[];
  _count?: { pagos: number; eventos: number };
}

export interface Suscripcion {
  id: number;
  clienteId: number;
  saas: string;
  planTipo: string;
  estado: string;
  monto: number;
  moneda: string;
  fechaInicio: string;
  fechaFin?: string;
  fechaCancelacion?: string;
  diasTrialRestantes?: number;
}

export interface Pago {
  id: number;
  suscripcionId: number;
  clienteId: number;
  monto: number;
  moneda: string;
  estado: string;
  fechaPago: string;
  descripcion?: string;
}

export interface Evento {
  id: number;
  tipo: string;
  severidad: string;
  clienteId?: number;
  saas?: string;
  datos?: any;
  fecha: string;
  cliente?: { nombre: string; email: string };
}

export interface MetricaDiaria {
  id: number;
  fecha: string;
  saas: string;
  nuevosRegistros: number;
  nuevosPagos: number;
  cancelaciones: number;
  clientesActivos: number;
  mrr: number;
  arr: number;
  churnRate?: number;
  trialToPaidRate?: number;
}

export interface DashboardKpis {
  mrr: number;
  arr: number;
  totalClients: number;
  activeSubs: number;
  totalTrials: number;
  cancelaciones30d: number;
  churnRate: number;
  totalPagos: number;
  ingresos30d: number;
}

export interface SaasBreakdown {
  saas: string;
  descripcion?: string;
  activo: boolean;
  mrr: number;
  suscripciones: number;
  clientes: number;
}

export interface DashboardData {
  kpis: DashboardKpis;
  bySaas: SaasBreakdown[];
  recentEvents: Evento[];
  recentPayments: any[];
  topClients: any[];
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface CalendarioEvento {
  id: string;
  titulo: string;
  descripcion: string;
  fechaInicio: string;
  fechaFin: string;
  todoElDia: boolean;
  asignadoA: 'carlos' | 'silviu' | 'ambos';
  color: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'pink';
  completado: boolean;
  creadoPor: string;
  createdAt: string;
  updatedAt: string;
}

export type LeadEstado = 'NUEVO' | 'CONTACTADO' | 'INTERESADO' | 'EN_SEGUIMIENTO' | 'CALIFICADO' | 'RECHAZADO' | 'NO_RESPONDE' | 'CONVERTIDO';
export type PrioridadLead = 'BAJA' | 'MEDIA' | 'ALTA' | 'URGENTE';

export interface LeadEtiqueta {
  id: string;
  nombre: string;
  color: string;
}

export interface LeadGestor {
  id: number;
  nombre: string;
  email: string;
}

export interface Lead {
  id: string;
  nombre: string;
  email?: string | null;
  telefono?: string;
  empresa?: string;
  cargo?: string;
  pais?: string;
  origen: string;
  softwareId: string;
  estado: LeadEstado;
  prioridad: PrioridadLead;
  notas?: string;
  ultimoContacto?: string;
  asignadoA?: number;
  convertidoA?: number;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
  etiquetas: LeadEtiqueta[];
  gestor?: LeadGestor;
  _count?: { historial: number };
}

export interface LeadHistorial {
  id: string;
  leadId: string;
  tipo: string;
  descripcion: string;
  usuarioId?: number;
  createdAt: string;
}

export interface LeadWithDetail extends Lead {
  historial: LeadHistorial[];
}

export interface LeadStats {
  total: number;
  porEstado: { estado: LeadEstado; _count: { estado: number } }[];
  porPrioridad: { prioridad: PrioridadLead; _count: { prioridad: number } }[];
  recientes7d: number;
}

// === Centro de Llamadas ===

export interface ObjecionRespuesta {
  objecion: string;
  respuesta: string;
}

export interface SpechLlamada {
  id: string;
  softwareId: string;
  titulo: string;
  contenido: string;
  objetivo: string;
  objeciones?: ObjecionRespuesta[] | null;
  orden: number;
  activo: boolean;
  esDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export type Personalidad = 'resistente' | 'interesado' | 'ocupado' | 'curioso' | 'hostil';
export type Dificultad = 'facil' | 'medio' | 'dificil';

export interface LeadSimulado {
  nombre: string;
  empresa?: string;
  cargo?: string;
  personalidad: Personalidad;
  contexto: string;
  dificultad?: Dificultad;
}

export interface MensajeChatSimulacion {
  rol: 'agente' | 'cliente';
  texto: string;
  timestamp: string;
}

export interface SimulacionFeedback {
  puntuacionGlobal?: number;
  puntuaciones?: {
    apertura?: number;
    guion?: number;
    escucha?: number;
    objeciones?: number;
    cierre?: number;
    tono?: number;
  };
  puntosFuertes?: string[];
  puntosMejorar?: string[];
  feedback?: string;
  proximoPaso?: string;
}

export interface SesionPruebaIA {
  id: string;
  softwareId: string;
  spechId?: string | null;
  usuarioId?: number | null;
  leadSimulado: LeadSimulado;
  mensajes: MensajeChatSimulacion[];
  resultado?: 'pendiente' | 'exitoso' | 'fallido' | null;
  feedback?: SimulacionFeedback | null;
  notas?: string | null;
  createdAt: string;
  updatedAt: string;
  spech?: { id: string; titulo: string } | null;
}

export type LlamadaEstado =
  | 'iniciando'
  | 'esperando_agente'
  | 'agente_descolgo'
  | 'llamando_lead'
  | 'en_curso'
  | 'completada'
  | 'fallida'
  | 'no_contesta'
  | 'cancelada';

export interface LlamadaReal {
  id: string;
  softwareId: string;
  leadId: string;
  spechId?: string | null;
  agenteId: number;
  estado: LlamadaEstado;
  direccion: string;
  telefonoLead: string;
  telefonoAgente?: string | null;
  duracionSeg?: number | null;
  grabacionUrl?: string | null;
  notasPost?: string | null;
  leadEstadoPrev?: string | null;
  leadEstadoPost?: string | null;
  transcript?: string | null;
  calificacion?: number | null;
  proximaAccion?: string | null;
  zadarmaCallId?: string | null;
  iniciadaAt?: string | null;
  terminadaAt?: string | null;
  createdAt: string;
  updatedAt: string;
  lead?: {
    id: string;
    nombre: string;
    email?: string | null;
    empresa?: string | null;
    telefono?: string | null;
  };
  spech?: { id: string; titulo: string } | null;
  agente?: { id: number; nombre: string };
}

export interface LlamadasStats {
  total: number;
  hoy: number;
  semana: number;
  completadas: number;
  porEstado: { estado: string; _count: { estado: number } }[];
  duracionMediaSeg: number;
  tasaContactoPct: number;
}

// === Marketing: Landings & Free Values ===

export type LandingEstado = 'BORRADOR' | 'PUBLICADA' | 'PAUSADA';
export type FreeValueEstado = 'BORRADOR' | 'PUBLICADO' | 'PAUSADO';

export interface Landing {
  id: string;
  softwareId: string;
  nombre: string;
  slug: string;
  url: string;
  descripcion?: string | null;
  estado: LandingEstado;
  visitas: number;
  conversiones: number;
  leadsGenerados: number;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
}

export interface LandingStats {
  total: number;
  publicadas: number;
  visitasTotales: number;
  conversionesTotales: number;
  leadsGenerados: number;
}

export interface FreeValue {
  id: string;
  softwareId: string;
  nombre: string;
  slug: string;
  url: string;
  tipo: string;
  descripcion?: string | null;
  estado: FreeValueEstado;
  usos: number;
  leadsGenerados: number;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
}

export interface FreeValueStats {
  total: number;
  publicados: number;
  usosTotales: number;
  leadsGenerados: number;
  porTipo: { tipo: string; _count: { tipo: number } }[];
}
