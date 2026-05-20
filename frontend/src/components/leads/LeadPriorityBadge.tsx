'use client';

import { PrioridadLead } from '@/types';

interface LeadPriorityBadgeProps {
  prioridad: PrioridadLead;
}

const prioridadConfig: Record<PrioridadLead, { label: string; classes: string }> = {
  BAJA: {
    label: 'Baja',
    classes: 'bg-[var(--bg-tertiary)] text-[var(--text-tertiary)]',
  },
  MEDIA: {
    label: 'Media',
    classes: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  },
  ALTA: {
    label: 'Alta',
    classes: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  },
  URGENTE: {
    label: 'Urgente',
    classes: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  },
};

export default function LeadPriorityBadge({ prioridad }: LeadPriorityBadgeProps) {
  const config = prioridadConfig[prioridad];
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-[12px] font-semibold ${config.classes}`}>
      {config.label}
    </span>
  );
}
