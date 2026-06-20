'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api';
import {
  Phone,
  CheckCircle2,
  Target,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Smile,
  Frown,
  Meh,
  CalendarCheck,
  Users,
  XCircle,
  Zap,
} from 'lucide-react';

interface AIMetrics {
  total: number;
  conectadas: number;
  demos: number;
  transferidos: number;
  rechazados: number;
  answerRatePct: number;
  conversionRatePct: number;
  avgEngagement: number;
  avgFrustration: number;
  avgBant: {
    budget: number;
    authority: number;
    need: number;
    timeline: number;
    total: number;
  } | null;
  emotions: Record<string, number>;
  periodoDias: number;
}

interface Props {
  softwareId: string;
}

const COLOR_CLASSES: Record<string, string> = {
  emerald: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
  blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
  amber: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
  rose: 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400',
  violet: 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400',
  cyan: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400',
};

export default function AIMetricsDashboard({ softwareId }: Props) {
  const [metrics, setMetrics] = useState<AIMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [dias, setDias] = useState(30);

  useEffect(() => {
    if (!softwareId) return;
    setLoading(true);
    apiClient
      .getLlamadasAIMetrics(softwareId, dias)
      .then((res: any) => {
        setMetrics(res.data);
      })
      .catch(() => setMetrics(null))
      .finally(() => setLoading(false));
  }, [softwareId, dias]);

  if (loading) {
    return (
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-4 h-4 text-violet-500" />
          <h3 className="text-[14px] font-semibold text-[var(--text-primary)]">Métricas AI</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-[var(--bg-primary)] rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!metrics || metrics.total === 0) {
    return (
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-4 h-4 text-violet-500" />
          <h3 className="text-[14px] font-semibold text-[var(--text-primary)]">Métricas AI</h3>
        </div>
        <p className="text-[13px] text-[var(--text-tertiary)] text-center py-8">
          Sin llamadas AI en los últimos {dias} días
        </p>
      </div>
    );
  }

  const statCards = [
    {
      label: 'Answer Rate',
      value: `${metrics.answerRatePct}%`,
      icon: Phone,
      color: 'blue',
      sub: `${metrics.conectadas}/${metrics.total} conectadas`,
    },
    {
      label: 'Conversión',
      value: `${metrics.conversionRatePct}%`,
      icon: Target,
      color: 'emerald',
      sub: `${metrics.demos} demos agendadas`,
    },
    {
      label: 'Engagement',
      value: `${metrics.avgEngagement}%`,
      icon: BarChart3,
      color: 'violet',
      sub: `Frustración: ${metrics.avgFrustration}/10`,
    },
    {
      label: 'BANT Score',
      value: metrics.avgBant ? `${metrics.avgBant.total}/100` : 'N/A',
      icon: TrendingUp,
      color: 'amber',
      sub: metrics.avgBant
        ? `N${metrics.avgBant.need} · A${metrics.avgBant.authority}`
        : 'Sin datos',
    },
  ];

  const funnelCards = [
    {
      label: 'Demos',
      value: metrics.demos,
      icon: CalendarCheck,
      color: 'emerald',
    },
    {
      label: 'Transferidos',
      value: metrics.transferidos,
      icon: Users,
      color: 'cyan',
    },
    {
      label: 'Rechazados',
      value: metrics.rechazados,
      icon: XCircle,
      color: 'rose',
    },
  ];

  const emotionIcons: Record<string, any> = {
    interesado: Smile,
    neutro: Meh,
    desinteresado: Frown,
    molesto: TrendingDown,
  };

  const emotionColors: Record<string, string> = {
    interesado: 'text-emerald-500',
    neutro: 'text-amber-500',
    desinteresado: 'text-gray-400',
    molesto: 'text-rose-500',
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-violet-500" />
          <h3 className="text-[14px] font-semibold text-[var(--text-primary)]">
            Métricas AI — Últimos {metrics.periodoDias} días
          </h3>
        </div>
        <div className="flex bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg p-0.5">
          {[7, 14, 30].map((d) => (
            <button
              key={d}
              onClick={() => setDias(d)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                dias === d
                  ? 'bg-violet-600 text-white'
                  : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Stats principales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statCards.map(({ label, value, icon: Icon, color, sub }) => (
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
            <p className="text-[20px] font-bold text-[var(--text-primary)] leading-none">{value}</p>
            <p className="text-[10px] text-[var(--text-tertiary)] mt-1">{sub}</p>
          </div>
        ))}
      </div>

      {/* Funnel + Emociones */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Funnel */}
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl p-4">
          <p className="text-[11px] uppercase tracking-wider text-[var(--text-tertiary)] font-medium mb-3">
            Embudo de llamadas
          </p>
          <div className="space-y-2">
            {/* Total */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                <Phone className="w-3.5 h-3.5 text-violet-600" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between text-[12px]">
                  <span className="text-[var(--text-secondary)]">Total llamadas</span>
                  <span className="font-semibold text-[var(--text-primary)]">{metrics.total}</span>
                </div>
                <div className="h-1.5 bg-[var(--bg-primary)] rounded-full mt-1">
                  <div className="h-full bg-violet-500 rounded-full" style={{ width: '100%' }} />
                </div>
              </div>
            </div>
            {/* Conectadas */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between text-[12px]">
                  <span className="text-[var(--text-secondary)]">Conectadas</span>
                  <span className="font-semibold text-[var(--text-primary)]">{metrics.conectadas}</span>
                </div>
                <div className="h-1.5 bg-[var(--bg-primary)] rounded-full mt-1">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${metrics.total > 0 ? (metrics.conectadas / metrics.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
            {/* Resultados */}
            {funnelCards.map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg ${COLOR_CLASSES[color]} flex items-center justify-center`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between text-[12px]">
                    <span className="text-[var(--text-secondary)]">{label}</span>
                    <span className="font-semibold text-[var(--text-primary)]">{value}</span>
                  </div>
                  <div className="h-1.5 bg-[var(--bg-primary)] rounded-full mt-1">
                    <div
                      className={`h-full rounded-full ${color === 'emerald' ? 'bg-emerald-500' : color === 'cyan' ? 'bg-cyan-500' : 'bg-rose-500'}`}
                      style={{ width: `${metrics.conectadas > 0 ? (value / metrics.conectadas) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Emociones */}
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl p-4">
          <p className="text-[11px] uppercase tracking-wider text-[var(--text-tertiary)] font-medium mb-3">
            Emociones detectadas
          </p>
          {Object.entries(metrics.emotions).length === 0 ? (
            <p className="text-[12px] text-[var(--text-tertiary)] text-center py-4">
              Sin datos de emociones
            </p>
          ) : (
            <div className="space-y-2">
              {Object.entries(metrics.emotions)
                .sort(([, a], [, b]) => b - a)
                .map(([emotion, count]) => {
                  const Icon = emotionIcons[emotion] || Meh;
                  const totalEmotions = Object.values(metrics.emotions).reduce((a, b) => a + b, 0);
                  const pct = totalEmotions > 0 ? Math.round((count / totalEmotions) * 100) : 0;
                  return (
                    <div key={emotion} className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${emotionColors[emotion] || 'text-gray-400'}`} />
                      <div className="flex-1">
                        <div className="flex justify-between text-[12px]">
                          <span className="capitalize text-[var(--text-secondary)]">{emotion}</span>
                          <span className="font-medium text-[var(--text-primary)]">{count} ({pct}%)</span>
                        </div>
                        <div className="h-1.5 bg-[var(--bg-primary)] rounded-full mt-1">
                          <div
                            className={`h-full rounded-full ${
                              emotion === 'interesado'
                                ? 'bg-emerald-500'
                                : emotion === 'molesto'
                                  ? 'bg-rose-500'
                                  : emotion === 'desinteresado'
                                    ? 'bg-gray-400'
                                    : 'bg-amber-500'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}

          {/* BANT Breakdown */}
          {metrics.avgBant && (
            <div className="mt-4 pt-3 border-t border-[var(--border-primary)]">
              <p className="text-[11px] uppercase tracking-wider text-[var(--text-tertiary)] font-medium mb-2">
                BANT Score Promedio
              </p>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'Need', value: metrics.avgBant.need, color: 'bg-emerald-500' },
                  { label: 'Auth', value: metrics.avgBant.authority, color: 'bg-blue-500' },
                  { label: 'Budg', value: metrics.avgBant.budget, color: 'bg-amber-500' },
                  { label: 'Time', value: metrics.avgBant.timeline, color: 'bg-violet-500' },
                ].map((item) => (
                  <div key={item.label} className="text-center">
                    <div className="text-[16px] font-bold text-[var(--text-primary)]">{item.value}</div>
                    <div className="text-[9px] text-[var(--text-tertiary)] uppercase">{item.label}</div>
                    <div className="h-1 bg-[var(--bg-primary)] rounded-full mt-1">
                      <div
                        className={`h-full rounded-full ${item.color}`}
                        style={{ width: `${(item.value / 25) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
