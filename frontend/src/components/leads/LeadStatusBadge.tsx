'use client';

import { LeadEstado } from '@/types';

interface LeadStatusBadgeProps {
  estado: LeadEstado;
}

const estadoConfig: Record<LeadEstado, { label: string; classes: string }> = {
  NUEVO: {
    label: 'Nuevo',
    classes: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  },
  CONTACTADO: {
    label: 'Contactado',
    classes: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  },
  INTERESADO: {
    label: 'Interesado',
    classes: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  },
  EN_SEGUIMIENTO: {
    label: 'En seguimiento',
    classes: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  },
  CALIFICADO: {
    label: 'Calificado',
    classes: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  },
  RECHAZADO: {
    label: 'Rechazado',
    classes: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  },
  NO_RESPONDE: {
    label: 'No responde',
    classes: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  },
  CONVERTIDO: {
    label: 'Convertido',
    classes: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  },
};

export default function LeadStatusBadge({ estado }: LeadStatusBadgeProps) {
  const config = estadoConfig[estado];
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-[12px] font-semibold whitespace-nowrap ${config.classes}`}>
      {config.label}
    </span>
  );
}
