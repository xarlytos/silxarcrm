import type { Stats } from './types';

/* ============================================================
   Reino del Marketer — pueblo visual que crece
============================================================ */

export interface KingdomBuilding {
  id: string;
  nombre: string;
  desc: string;
  icon: string; // lucide name
  iconColor: string;
  hasChimney?: boolean; // si emite humo
  /** Posición horizontal (0-1) en el panorama */
  x: number;
  /** Posición vertical (0-1) */
  y: number;
  /** Condición de desbloqueo */
  unlock: { source: string; meta: number };
  color: string; // tailwind gradient
}

export const KINGDOM_BUILDINGS: KingdomBuilding[] = [
  // FILA INFERIOR — comienzos
  { id: 'tienda_camp', nombre: 'Campamento',           desc: 'El primer refugio del viajero',                                 icon: 'Tent',         iconColor: 'text-stone-200',                       x: 0.05, y: 0.78, unlock: { source: 'level', meta: 1 },                color: 'from-stone-600/40 to-zinc-800/40' },
  { id: 'casa',        nombre: 'Casa del Aprendiz',    desc: 'Donde comenzó tu aventura',                                     icon: 'Home',         iconColor: 'text-amber-300',   hasChimney: true,   x: 0.13, y: 0.72, unlock: { source: 'level', meta: 1 },                color: 'from-amber-700/40 to-orange-800/40' },
  { id: 'tienda',      nombre: 'Tienda de Plantillas', desc: '5 plantillas creadas',                                          icon: 'Store',        iconColor: 'text-emerald-300', hasChimney: true,   x: 0.21, y: 0.76, unlock: { source: 'whatsappPlantillas', meta: 5 },   color: 'from-emerald-700/40 to-teal-800/40' },
  { id: 'granja',      nombre: 'Granja de Leads',      desc: '50 leads capturados',                                           icon: 'Wheat',        iconColor: 'text-yellow-300',                      x: 0.30, y: 0.80, unlock: { source: 'leadsTotal', meta: 50 },          color: 'from-yellow-700/40 to-amber-800/40' },
  { id: 'tractor',     nombre: 'Cooperativa Agrícola', desc: '500 leads — escala industrial de prospección',                  icon: 'Tractor',      iconColor: 'text-yellow-300',                      x: 0.39, y: 0.82, unlock: { source: 'leadsTotal', meta: 500 },         color: 'from-amber-700/40 to-yellow-900/40' },
  { id: 'bosque',      nombre: 'Bosque Sagrado',       desc: '100 leads — el bosque te respeta',                              icon: 'Trees',        iconColor: 'text-emerald-300',                     x: 0.48, y: 0.76, unlock: { source: 'leadsTotal', meta: 100 },         color: 'from-green-700/40 to-emerald-800/40' },
  { id: 'pinar',       nombre: 'Pinar Norte',          desc: '2.500 leads — bosque infinito',                                 icon: 'TreePine',     iconColor: 'text-emerald-200',                     x: 0.57, y: 0.78, unlock: { source: 'leadsTotal', meta: 2500 },        color: 'from-emerald-700/40 to-green-900/40' },
  // FILA MEDIA — comercio y conocimiento
  { id: 'mercado',     nombre: 'Mercado de Tratos',    desc: '25 propuestas aceptadas',                                       icon: 'Store',        iconColor: 'text-orange-300',                      x: 0.27, y: 0.55, unlock: { source: 'propuestasAceptadas', meta: 25 }, color: 'from-orange-700/40 to-rose-800/40' },
  { id: 'biblioteca',  nombre: 'Biblioteca de Sabios', desc: '20 plantillas creadas',                                         icon: 'Library',      iconColor: 'text-violet-200',                      x: 0.38, y: 0.50, unlock: { source: 'whatsappPlantillas', meta: 20 },  color: 'from-violet-700/40 to-purple-800/40' },
  { id: 'observatorio',nombre: 'Observatorio',         desc: '5 tests A/B — donde se miden las estrellas',                    icon: 'Telescope',    iconColor: 'text-cyan-200',                        x: 0.49, y: 0.45, unlock: { source: 'abTestsTotal', meta: 5 },         color: 'from-cyan-700/40 to-blue-800/40' },
  { id: 'puerto',      nombre: 'Puerto Comercial',     desc: '10 conversiones',                                               icon: 'Ship',         iconColor: 'text-cyan-300',                        x: 0.59, y: 0.50, unlock: { source: 'leadsConvertidos', meta: 10 },    color: 'from-blue-700/40 to-cyan-900/40' },
  { id: 'banco',       nombre: 'Banco del Reino',      desc: 'Factura 10.000 €',                                              icon: 'PiggyBank',    iconColor: 'text-emerald-200',                     x: 0.69, y: 0.55, unlock: { source: 'ingresosTotal', meta: 10000 },    color: 'from-emerald-700/40 to-green-900/40' },
  { id: 'almacen',     nombre: 'Almacén Real',         desc: '50 propuestas enviadas',                                        icon: 'Warehouse',    iconColor: 'text-stone-200',                       x: 0.80, y: 0.58, unlock: { source: 'propuestasEnviadas', meta: 50 },  color: 'from-zinc-700/40 to-stone-900/40' },
  // FILA ALTA — poder, templos, capital
  { id: 'templo',      nombre: 'Templo del Closer',    desc: '50 conversiones — bendito el cierre',                           icon: 'Landmark',     iconColor: 'text-stone-200',                       x: 0.18, y: 0.35, unlock: { source: 'leadsConvertidos', meta: 50 },    color: 'from-stone-600/40 to-zinc-800/40' },
  { id: 'academia',    nombre: 'Academia',             desc: 'Alcanza nivel 13',                                              icon: 'GraduationCap',iconColor: 'text-blue-200',                        x: 0.30, y: 0.32, unlock: { source: 'level', meta: 13 },               color: 'from-blue-700/40 to-indigo-800/40' },
  { id: 'torre',       nombre: 'Torre del Email',      desc: '2.000 emails enviados',                                         icon: 'Building2',    iconColor: 'text-cyan-300',                        x: 0.41, y: 0.28, unlock: { source: 'emailEnviosTotal', meta: 2000 },   color: 'from-cyan-700/40 to-blue-800/40' },
  { id: 'castillo',    nombre: 'Castillo del Maestro', desc: 'Alcanza nivel 10',                                              icon: 'Castle',       iconColor: 'text-violet-200',                      x: 0.52, y: 0.25, unlock: { source: 'level', meta: 10 },               color: 'from-violet-700/40 to-fuchsia-800/40' },
  { id: 'fabrica',     nombre: 'Fábrica Imperial',     desc: '5.000 WhatsApp enviados',                                       icon: 'Factory',      iconColor: 'text-slate-200', hasChimney: true,     x: 0.62, y: 0.30, unlock: { source: 'whatsappEnviosTotal', meta: 5000 },color: 'from-slate-700/40 to-zinc-900/40' },
  { id: 'forja',       nombre: 'Forja del Dragón',     desc: 'Alcanza nivel 16',                                              icon: 'Mountain',     iconColor: 'text-rose-300', hasChimney: true,      x: 0.72, y: 0.35, unlock: { source: 'level', meta: 16 },               color: 'from-rose-700/40 to-red-900/40' },
  { id: 'catedral',    nombre: 'Catedral del Avatar',  desc: 'Nivel 25 — el santuario supremo',                               icon: 'Church',       iconColor: 'text-amber-200',                       x: 0.83, y: 0.32, unlock: { source: 'level', meta: 25 },               color: 'from-amber-500/40 via-fuchsia-500/40 to-cyan-500/40' },
  // CAPSTONE — los más altos
  { id: 'trono',       nombre: 'Trono Imperial',       desc: 'Nivel 40 — los reyes te suplican',                              icon: 'Crown',        iconColor: 'text-amber-200',                       x: 0.92, y: 0.18, unlock: { source: 'level', meta: 40 },               color: 'from-amber-500/50 to-orange-700/40' },
  { id: 'faro',        nombre: 'Faro Eterno',          desc: 'Factura 500.000 € — guías a otros desde la cima',               icon: 'Sun',          iconColor: 'text-yellow-200',                      x: 0.50, y: 0.10, unlock: { source: 'ingresosTotal', meta: 500000 },   color: 'from-yellow-500/50 via-amber-500/40 to-orange-500/40' },
];

export function isBuildingUnlocked(b: KingdomBuilding, stats: Stats, level: number): boolean {
  if (b.unlock.source === 'level') return level >= b.unlock.meta;
  return (stats[b.unlock.source as string] ?? 0) >= b.unlock.meta;
}
