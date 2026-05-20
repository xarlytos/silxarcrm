'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import {
  Sparkles,
  AlertTriangle,
  AlertCircle,
  Info,
  ChevronRight,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import Link from 'next/link';

interface InsightItem {
  tipo: string;
  mensaje: string;
  severidad: 'alta' | 'media' | 'baja';
  detalle?: string[];
}

interface InsightsData {
  type: string;
  insights: InsightItem[];
}

const severidadConfig = {
  alta: {
    icon: AlertTriangle,
    bg: 'bg-red-50 dark:bg-red-500/10',
    border: 'border-red-200 dark:border-red-500/20',
    iconColor: 'text-red-600 dark:text-red-400',
    dot: 'bg-red-500',
    hover: 'hover:bg-red-50/80 dark:hover:bg-red-500/5',
  },
  media: {
    icon: AlertCircle,
    bg: 'bg-amber-50 dark:bg-amber-500/10',
    border: 'border-amber-200 dark:border-amber-500/20',
    iconColor: 'text-amber-600 dark:text-amber-400',
    dot: 'bg-amber-500',
    hover: 'hover:bg-amber-50/80 dark:hover:bg-amber-500/5',
  },
  baja: {
    icon: Info,
    bg: 'bg-blue-50 dark:bg-blue-500/10',
    border: 'border-blue-200 dark:border-blue-500/20',
    iconColor: 'text-blue-600 dark:text-blue-400',
    dot: 'bg-blue-500',
    hover: 'hover:bg-blue-50/80 dark:hover:bg-blue-500/5',
  },
};

function InsightSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)]">
          <div className="dash-skeleton h-8 w-8 rounded-lg shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="dash-skeleton h-3 w-full" />
            <div className="dash-skeleton h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function InsightsWidget() {
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else if (!data) setLoading(true);

    try {
      const res = await apiClient.getIAInsights();
      setData(res.data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Error cargando insights');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, []);

  const handleInsightClick = (insight: InsightItem) => {
    // Store the insight message so ChatIA can pick it up
    const prompt = insight.detalle
      ? `${insight.mensaje}\nDetalles: ${insight.detalle.join(', ')}`
      : insight.mensaje;
    localStorage.setItem('ia_pending_message', `Ayúdame con esto: ${prompt}`);
  };

  if (loading) {
    return (
      <div className="rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border-secondary)] flex items-center gap-3">
          <div className="dash-skeleton h-10 w-10 rounded-xl" />
          <div className="flex-1">
            <div className="dash-skeleton h-3.5 w-40 mb-2" />
            <div className="dash-skeleton h-3 w-24" />
          </div>
        </div>
        <div className="p-5">
          <InsightSkeleton />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border-secondary)] flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-500/15 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h3 className="text-[14.5px] font-semibold text-[var(--text-primary)]">Insights Inteligentes</h3>
            <p className="text-[12.5px] text-[var(--text-tertiary)]">Alertas y recomendaciones</p>
          </div>
        </div>
        <div className="p-5 text-center">
          <p className="text-[13px] text-red-500 mb-3">{error}</p>
          <button
            onClick={() => fetchInsights(true)}
            className="text-[13px] text-violet-600 hover:text-violet-700 font-medium"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const insights = data?.insights || [];

  return (
    <div className="rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[var(--border-secondary)] flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-500/15 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h3 className="text-[14.5px] font-semibold text-[var(--text-primary)]">Insights Inteligentes</h3>
            <p className="text-[12.5px] text-[var(--text-tertiary)]">
              {insights.length > 0 ? `${insights.length} alertas y recomendaciones` : 'Sin alertas activas'}
            </p>
          </div>
        </div>
        <button
          onClick={() => fetchInsights(true)}
          disabled={refreshing}
          className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors disabled:opacity-50"
          title="Actualizar insights"
        >
          <RefreshCw className={`w-4 h-4 text-[var(--text-tertiary)] ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Insights List */}
      <div className="p-4 space-y-2 max-h-[420px] overflow-y-auto">
        {insights.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-500/15 mx-auto mb-3 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-[14px] font-medium text-[var(--text-secondary)] mb-1">Todo en orden</p>
            <p className="text-[12.5px] text-[var(--text-tertiary)]">No hay alertas ni recomendaciones pendientes</p>
          </div>
        ) : (
          insights.slice(0, 6).map((insight, index) => {
            const config = severidadConfig[insight.severidad] || severidadConfig.baja;
            const Icon = config.icon;
            return (
              <Link
                key={index}
                href="/dashboard/ia"
                onClick={() => handleInsightClick(insight)}
                className={`flex items-start gap-3 p-3 rounded-xl border transition-all duration-200 group cursor-pointer ${config.bg} ${config.border} ${config.hover}`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${config.bg} ${config.border} border`}>
                  <Icon className={`w-4 h-4 ${config.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13.5px] text-[var(--text-primary)] leading-snug">
                    {insight.mensaje}
                  </p>
                  {insight.detalle && insight.detalle.length > 0 && (
                    <p className="text-[11.5px] text-[var(--text-tertiary)] mt-1 truncate">
                      {insight.detalle.join(', ')}
                    </p>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-[var(--text-tertiary)] shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-[var(--border-secondary)]">
        <Link
          href="/dashboard/ia"
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 text-[13px] font-medium text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-500/20 transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Abrir Asistente IA
        </Link>
      </div>
    </div>
  );
}
