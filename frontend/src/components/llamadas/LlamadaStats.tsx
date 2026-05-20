'use client';

import { LlamadasStats } from '@/types';
import { Phone, CheckCircle2, Clock, Target, Calendar, TrendingUp } from 'lucide-react';
import { formatDuracion } from './spechHelpers';

interface LlamadaStatsProps {
  stats: LlamadasStats | null;
  loading?: boolean;
}

const COLOR_CLASSES: Record<string, string> = {
  violet: 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400',
  blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
  indigo: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400',
  emerald: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
  amber: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
  pink: 'bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400',
};

export default function LlamadaStats({ stats, loading }: LlamadaStatsProps) {
  const items = [
    { label: 'Total', value: stats?.total ?? 0, icon: Phone, color: 'violet' },
    { label: 'Hoy', value: stats?.hoy ?? 0, icon: Calendar, color: 'blue' },
    { label: 'Esta semana', value: stats?.semana ?? 0, icon: TrendingUp, color: 'indigo' },
    { label: 'Completadas', value: stats?.completadas ?? 0, icon: CheckCircle2, color: 'emerald' },
    { label: 'Duracion media', value: formatDuracion(stats?.duracionMediaSeg ?? 0), icon: Clock, color: 'amber' },
    { label: 'Tasa contacto', value: `${stats?.tasaContactoPct ?? 0}%`, icon: Target, color: 'pink' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {items.map(({ label, value, icon: Icon, color }) => (
        <div
          key={label}
          className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl p-3"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${COLOR_CLASSES[color]}`}>
              <Icon className="w-3.5 h-3.5" />
            </div>
            <p className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] font-medium">
              {label}
            </p>
          </div>
          <p className="text-[20px] font-bold text-[var(--text-primary)] leading-none">
            {loading ? '—' : value}
          </p>
        </div>
      ))}
    </div>
  );
}
