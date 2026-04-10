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
