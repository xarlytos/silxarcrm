'use client';

import { useState, useEffect, useCallback } from 'react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { apiClient } from '@/lib/api';
import StatsWidget from '@/components/dashboard/StatsWidget';
import WidgetCard from '@/components/dashboard/WidgetCard';
import RevenueChart from '@/components/dashboard/RevenueChart';
import InsightsWidget from '@/components/dashboard/InsightsWidget';
import {
  Layers,
  TrendingUp,
  Activity,
  Clock,
  Users,
  RefreshCw,
} from 'lucide-react';
import Link from 'next/link';

// Datos vacíos por defecto
const emptyData = {
  kpis: {
    mrr: 0,
    arr: 0,
    totalClients: 0,
    activeSubs: 0,
    churnRate: 0,
    ingresos30d: 0,
  },
  bySaas: [],
  recentPayments: [],
  topClients: [],
  metricasMensuales: [],
};

function StatSkeleton() {
  return (
    <div className="rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="dash-skeleton h-3 w-24 mb-3" />
          <div className="dash-skeleton h-8 w-36 mb-3" />
          <div className="dash-skeleton h-4 w-28" />
        </div>
        <div className="dash-skeleton h-12 w-12 rounded-xl" />
      </div>
    </div>
  );
}

function WidgetSkeleton({ height = 220 }: { height?: number }) {
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
        <div className="dash-skeleton w-full" style={{ height }} />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<any>(emptyData);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await apiClient.getDashboard();
      setData(res.data);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="space-y-8 w-full">
        <div className="flex items-end justify-between">
          <div className="flex-1">
            <div className="dash-skeleton h-9 w-72 mb-3" />
            <div className="dash-skeleton h-4 w-96" />
          </div>
          <div className="dash-skeleton h-11 w-32 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <StatSkeleton key={i} />)}
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-6">
            <WidgetSkeleton height={320} />
            <WidgetSkeleton height={140} />
            <WidgetSkeleton height={220} />
          </div>
          <div className="space-y-6">
            <WidgetSkeleton height={300} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 w-full">
      {/* Header Section */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between dash-rise">
        <div>
          <div className="inline-flex items-center gap-2 mb-3 px-2.5 py-1 rounded-full bg-emerald-500/10 ring-1 ring-inset ring-emerald-500/20">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 dash-live-dot" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-[11.5px] font-semibold tracking-wide text-emerald-700 dark:text-emerald-400 uppercase">
              En vivo
            </span>
          </div>
          <h1 className="text-[24px] sm:text-[28px] lg:text-[32px] font-bold tracking-tight text-[var(--text-primary)] leading-[1.1]">
            Command Center
          </h1>
          <p className="text-[13px] sm:text-[14.5px] text-[var(--text-secondary)] mt-1.5 max-w-xl">
            Visualiza y gestiona todo tu negocio SaaS desde un solo lugar
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-[12.5px] text-[var(--text-tertiary)]">
            <Clock className="w-3.5 h-3.5" />
            <span>
              Actualizado <span className="text-[var(--text-secondary)] font-medium">{formatDate(lastUpdate.toISOString())}</span>
            </span>
          </div>
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="dash-btn-shine inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl text-[13.5px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-tertiary)] transition-all duration-300 ease-luxe-out disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : 'transition-transform duration-500 ease-luxe group-hover:rotate-180'}`} />
            {refreshing ? 'Actualizando…' : 'Actualizar'}
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <StatsWidget
        mrr={data.kpis.mrr}
        arr={data.kpis.arr}
        totalClients={data.kpis.totalClients}
        activeSubs={data.kpis.activeSubs}
        churnRate={data.kpis.churnRate}
        ingresos30d={data.kpis.ingresos30d}
        changes={data.changes}
      />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column - 2/3 */}
        <div className="xl:col-span-2 space-y-6">
          {/* Revenue Chart */}
          <div className="dash-rise dash-rise-delay-7">
            <WidgetCard
              title="Evolución del MRR"
              subtitle="Tendencia de ingresos recurrentes mensuales"
              icon={TrendingUp}
              iconColor="text-violet-600 dark:text-violet-400"
              iconBg="bg-violet-100 dark:bg-violet-500/15"
            >
              <RevenueChart data={data.metricasMensuales} />
            </WidgetCard>
          </div>

          {/* Softwares */}
          <div className="dash-rise dash-rise-delay-8">
            <WidgetCard
              title="Softwares Conectados"
              subtitle={`${data.bySaas.length} SaaS activos`}
              icon={Layers}
              iconColor="text-blue-600 dark:text-blue-400"
              iconBg="bg-blue-100 dark:bg-blue-500/15"
            >
              {(data.bySaas?.length ?? 0) > 0 ? (
                <div className="divide-y divide-[var(--border-secondary)]">
                  {data.bySaas.slice(0, 2).map((saas: any, index: number) => (
                    <div key={index} className="flex items-center gap-4 py-3.5 first:pt-0 last:pb-0 group/row -mx-1 px-1 rounded-lg hover:bg-[var(--surface-hover)] transition-colors">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--bg-tertiary)] to-[var(--surface-hover)] flex items-center justify-center ring-1 ring-inset ring-black/[0.04] dark:ring-white/[0.05]">
                        <span className="text-[13px] font-bold text-[var(--text-primary)] uppercase">
                          {saas.name?.slice(0, 2) || 'S'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14.5px] font-medium text-[var(--text-primary)] capitalize truncate">
                          {saas.name}
                        </p>
                        <p className="text-[12.5px] text-[var(--text-tertiary)]">
                          {saas.clients || 0} clientes
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-[var(--text-tertiary)]">
                  <div className="w-14 h-14 rounded-2xl bg-[var(--bg-tertiary)] mx-auto mb-3 flex items-center justify-center ring-1 ring-inset ring-black/[0.04] dark:ring-white/[0.05]">
                    <Layers className="w-7 h-7 opacity-50" />
                  </div>
                  <p className="text-[15px] font-medium text-[var(--text-secondary)] mb-0.5">No hay softwares conectados</p>
                  <p className="text-[13px]">Configura tus webhooks para empezar</p>
                </div>
              )}
            </WidgetCard>
          </div>

          {/* Recent Payments */}
          <div className="dash-rise dash-rise-delay-8">
            <WidgetCard
              title="Pagos Recientes"
              subtitle="Últimas transacciones"
              icon={Activity}
              iconColor="text-emerald-600 dark:text-emerald-400"
              iconBg="bg-emerald-100 dark:bg-emerald-500/15"
            >
              {(data.recentPayments?.length ?? 0) > 0 ? (
                <div className="divide-y divide-[var(--border-secondary)]">
                  {data.recentPayments.slice(0, 5).map((pago: any, index: number) => {
                    const ok = pago.estado === 'completado';
                    return (
                      <div key={pago.id || index} className="flex items-center gap-4 py-3.5 first:pt-0 last:pb-0 -mx-1 px-1 rounded-lg hover:bg-[var(--surface-hover)] transition-colors">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ring-1 ring-inset ${
                          ok
                            ? 'bg-emerald-100 dark:bg-emerald-500/15 ring-emerald-200/60 dark:ring-emerald-400/20'
                            : 'bg-red-100 dark:bg-red-500/15 ring-red-200/60 dark:ring-red-400/20'
                        }`}>
                          <Activity className={`w-5 h-5 ${
                            ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                          }`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[14.5px] font-medium text-[var(--text-primary)] truncate">
                            {pago.cliente?.nombre || 'Cliente'}
                          </p>
                          <p className="text-[12.5px] text-[var(--text-tertiary)]">
                            {formatDate(pago.fechaPago)}
                          </p>
                        </div>
                        <p className="text-[15px] font-bold text-[var(--text-primary)] tabular-nums">
                          {formatCurrency(Number(pago.monto))}
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-10 text-[var(--text-tertiary)]">
                  <div className="w-14 h-14 rounded-2xl bg-[var(--bg-tertiary)] mx-auto mb-3 flex items-center justify-center ring-1 ring-inset ring-black/[0.04] dark:ring-white/[0.05]">
                    <Activity className="w-7 h-7 opacity-50" />
                  </div>
                  <p className="text-[15px] font-medium text-[var(--text-secondary)] mb-0.5">Sin pagos recientes</p>
                  <p className="text-[13px]">Los pagos aparecerán aquí automáticamente</p>
                </div>
              )}
            </WidgetCard>
          </div>
        </div>

        {/* Right Column - 1/3 */}
        <div className="space-y-6">
          {/* AI Insights */}
          <div className="dash-rise dash-rise-delay-6">
            <InsightsWidget />
          </div>

          {/* Recent Clients */}
          <div className="dash-rise dash-rise-delay-7">
            <WidgetCard
              title="Clientes Destacados"
              subtitle="Top por actividad"
              icon={Users}
              iconColor="text-amber-600 dark:text-amber-400"
              iconBg="bg-amber-100 dark:bg-amber-500/15"
            >
              {(data.topClients?.length ?? 0) > 0 ? (
                <div className="divide-y divide-[var(--border-secondary)]">
                  {data.topClients.slice(0, 5).map((cliente: any, index: number) => (
                    <Link
                      key={cliente.id || index}
                      href={`/dashboard/clientes/${cliente.id}`}
                      className="flex items-center gap-3 py-3.5 first:pt-0 last:pb-0 group/row -mx-1 px-1 rounded-lg hover:bg-[var(--surface-hover)] transition-colors"
                    >
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-500/20 dark:to-orange-500/20 flex items-center justify-center ring-1 ring-inset ring-amber-200/50 dark:ring-amber-400/20 shrink-0">
                        <span className="text-[14px] font-bold text-amber-700 dark:text-amber-300">
                          {cliente.nombre?.charAt(0).toUpperCase() || 'C'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14.5px] font-medium text-[var(--text-primary)] truncate group-hover/row:text-amber-600 dark:group-hover/row:text-amber-400 transition-colors">
                          {cliente.nombre}
                        </p>
                        <p className="text-[12.5px] text-[var(--text-tertiary)] truncate">
                          {cliente.email}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[14px] font-semibold text-[var(--text-primary)] tabular-nums">
                          {formatCurrency(Number(cliente.totalPagado || 0))}
                        </p>
                        <p className="text-[11.5px] text-[var(--text-tertiary)]">
                          {cliente._count?.pagos || 0} pagos
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-[var(--text-tertiary)]">
                  <div className="w-14 h-14 rounded-2xl bg-[var(--bg-tertiary)] mx-auto mb-3 flex items-center justify-center ring-1 ring-inset ring-black/[0.04] dark:ring-white/[0.05]">
                    <Users className="w-7 h-7 opacity-50" />
                  </div>
                  <p className="text-[15px] font-medium text-[var(--text-secondary)] mb-0.5">Sin clientes</p>
                  <p className="text-[13px]">Los clientes aparecerán aquí</p>
                </div>
              )}
            </WidgetCard>
          </div>
        </div>
      </div>
    </div>
  );
}
