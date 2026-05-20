'use client';

export function rellenarVariablesSpech(
  contenido: string,
  vars: Record<string, string | null | undefined>
): string {
  return contenido.replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, key) => {
    const value = vars[key];
    if (value === null || value === undefined || value === '') return `{{${key}}}`;
    return String(value);
  });
}

export function highlightVariables(contenido: string): string {
  return contenido.replace(
    /\{\{\s*(\w+)\s*\}\}/g,
    '<span class="bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 px-1 rounded">{{$1}}</span>'
  );
}

export function formatDuracion(seg?: number | null): string {
  if (!seg || seg < 0) return '0:00';
  const m = Math.floor(seg / 60);
  const s = seg % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export const PERSONALIDADES = [
  { value: 'resistente', label: 'Resistente', desc: 'Pone objeciones (precio, tiempo, "ya tengo solucion")' },
  { value: 'interesado', label: 'Interesado', desc: 'Hace preguntas, abierto a escuchar' },
  { value: 'ocupado', label: 'Ocupado', desc: 'Cortante, "solo tengo 2 minutos"' },
  { value: 'curioso', label: 'Curioso', desc: 'Quiere entender pero se pierde en detalles' },
  { value: 'hostil', label: 'Hostil', desc: 'Molesto, "de donde sacaron mi numero"' },
] as const;

export const DIFICULTADES = [
  { value: 'facil', label: 'Facil', desc: 'Cede pronto si el agente lo hace bien' },
  { value: 'medio', label: 'Medio', desc: 'Necesita argumentos solidos' },
  { value: 'dificil', label: 'Dificil', desc: 'Pone varias objeciones antes de ceder' },
] as const;

export const ESTADO_LABELS: Record<string, string> = {
  iniciando: 'Iniciando...',
  esperando_agente: 'Llamando a tu telefono...',
  agente_descolgo: 'Descolgaste',
  llamando_lead: 'Llamando al lead...',
  en_curso: 'En llamada',
  completada: 'Completada',
  fallida: 'Fallida',
  no_contesta: 'No contesta',
  cancelada: 'Cancelada',
};

export const ESTADO_COLORS: Record<string, string> = {
  iniciando: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  esperando_agente: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  agente_descolgo: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  llamando_lead: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  en_curso: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  completada: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  fallida: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  no_contesta: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  cancelada: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
};
