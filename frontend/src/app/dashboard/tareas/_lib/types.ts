/* ============================================================
   Tipos compartidos con el backend
============================================================ */

export type TareaTipo = 'achievement' | 'daily' | 'weekly' | 'boss';
export type Rareza = 'comun' | 'raro' | 'epico' | 'legendario' | 'mitico';
export type Categoria = 'comunicacion' | 'cazador' | 'ventas' | 'marketing' | 'productividad';

export interface TareaDef {
  id: string;
  tipo: TareaTipo;
  titulo: string;
  descripcion: string;
  icono: string;
  source: string;
  meta: number;
  xp: number;
  gemas?: number;
  rareza?: Rareza;
  categoria?: Categoria;
  saga?: string;
}

export type Stats = Record<string, number>;

export interface CatalogoData {
  achievements: TareaDef[];
  dailyPool: TareaDef[];
  weeklyPool: TareaDef[];
  bossPool: TareaDef[];
  stats: Stats;
  topClientes?: ClienteTopEntry[];
}

export interface ClienteTopEntry {
  nombre: string;
  email: string | null;
  totalFacturado: number;
  propuestasAceptadas: number;
  primeraAceptacion: string | null;
}
