'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Layers, ExternalLink, Activity, CreditCard, RefreshCw, Users, Plus } from 'lucide-react';
import Link from 'next/link';

export default function SoftwaresPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await apiClient.getDashboard();
      setData(res.data);
    } catch (error) {
      console.error('Error fetching softwares:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const bySaas = data?.bySaas || [];
  const kpis = data?.kpis || { mrr: 0 };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-[var(--border-primary)] border-t-[var(--text-primary)] rounded-full animate-spin" />
          <span className="text-[var(--text-tertiary)]">Cargando softwares...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 w-full">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Layers className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h1 className="text-[32px] font-bold tracking-tight text-[var(--text-primary)]">Softwares</h1>
          </div>
          <p className="text-[15px] text-[var(--text-secondary)]">
            Todos los SaaS conectados a tu CRM
          </p>
        </div>
        <button
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl text-[14px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-tertiary)] transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-medium uppercase tracking-wider text-white/60">Mensual</span>
          </div>
          <p className="text-[13px] font-medium text-white/70 mb-1">MRR Total</p>
          <p className="text-[28px] font-bold tracking-tight">{formatCurrency(kpis.mrr)}</p>
        </div>

        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-[var(--bg-tertiary)] flex items-center justify-center">
              <Layers className="w-5 h-5 text-[var(--text-primary)]" />
            </div>
            <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-tertiary)]">Activos</span>
          </div>
          <p className="text-[13px] font-medium text-[var(--text-secondary)] mb-1">Softwares conectados</p>
          <p className="text-[28px] font-bold text-[var(--text-primary)] tracking-tight">{bySaas.length}</p>
        </div>

        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <Activity className="w-5 h-5 text-emerald-600" />
            </div>
            <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-tertiary)]">Estado</span>
          </div>
          <p className="text-[13px] font-medium text-[var(--text-secondary)] mb-1">Conexiones</p>
          <p className="text-[28px] font-bold text-emerald-600 tracking-tight">{bySaas.length > 0 ? '100%' : '-'}</p>
        </div>
      </div>

      {/* Softwares List */}
      {bySaas.length > 0 ? (
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl overflow-hidden">
          <div className="px-6 py-5 border-b border-[var(--border-primary)] flex items-center justify-between">
            <h2 className="text-[18px] font-semibold text-[var(--text-primary)]">Softwares conectados</h2>
            <span className="text-[13px] text-[var(--text-tertiary)]">{bySaas.length} activos</span>
          </div>

          <div className="divide-y divide-[var(--border-primary)]">
            {bySaas.map((saas: any) => {
              const pct = kpis.mrr > 0 ? (saas.mrr / kpis.mrr) * 100 : 0;

              return (
                <Link
                  key={saas.saas}
                  href={`/dashboard/softwares/${saas.saas}`}
                  className="flex items-center gap-5 px-6 py-5 hover:bg-[var(--bg-tertiary)]/50 transition-colors group"
                >
                  {/* Icon */}
                  <div className="w-12 h-12 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] flex items-center justify-center shrink-0">
                    <span className="text-[14px] font-bold text-[var(--text-primary)] uppercase">
                      {saas.saas.slice(0, 2)}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-[16px] font-semibold text-[var(--text-primary)] capitalize">
                        {saas.saas}
                      </h3>
                    </div>
                    <p className="text-[13px] text-[var(--text-tertiary)]">
                      {saas.descripcion || 'Software conectado'}
                    </p>
                  </div>

                  {/* Stats */}
                  <div className="hidden md:flex items-center gap-8">
                    <div className="text-center">
                      <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-tertiary)]">Clientes</p>
                      <p className="text-[15px] font-semibold text-[var(--text-primary)]">{saas.clientes}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-tertiary)]">Suscripciones</p>
                      <p className="text-[15px] font-semibold text-[var(--text-primary)]">{saas.suscripciones}</p>
                    </div>
                  </div>

                  {/* MRR */}
                  <div className="text-right shrink-0">
                    <p className="text-[15px] font-semibold text-[var(--text-primary)]">
                      {formatCurrency(saas.mrr)}
                    </p>
                    <p className="text-[11px] text-[var(--text-tertiary)]">
                      {pct.toFixed(1)}% del total
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href={`/dashboard/leads?software=${saas.saas}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-lg text-[12px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-tertiary)] transition-all"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Users className="w-3.5 h-3.5" />
                      Ver leads
                    </Link>
                    <Link
                      href={`/dashboard/softwares/${saas.saas}/buscar-leads`}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-lg text-[12px] font-medium hover:shadow-lg hover:shadow-violet-500/25 transition-all"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Obtener leads
                    </Link>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-[var(--bg-secondary)] border border-dashed border-[var(--border-primary)] rounded-2xl p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[var(--bg-tertiary)] mx-auto mb-4 flex items-center justify-center">
            <Layers className="w-8 h-8 text-[var(--text-tertiary)]" />
          </div>
          <p className="text-[16px] text-[var(--text-secondary)] font-medium mb-2">No hay softwares conectados</p>
          <p className="text-[14px] text-[var(--text-tertiary)] mb-6">Configura tus webhooks para empezar a recibir datos</p>
          <Link
            href="#"
            className="inline-flex items-center gap-2 px-4 py-2 bg-expo-black dark:bg-white text-white dark:text-expo-black text-[13px] font-medium rounded-xl hover:bg-expo-near dark:hover:bg-gray-100 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Configurar webhooks
          </Link>
        </div>
      )}
    </div>
  );
}
