'use client';

import { useState, useEffect, useCallback } from 'react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { apiClient } from '@/lib/api';
import StatsWidget from '@/components/dashboard/StatsWidget';
import WidgetCard from '@/components/dashboard/WidgetCard';
import RevenueChart from '@/components/dashboard/RevenueChart';
import {
  Layers,
  TrendingUp,
  Activity,
  Clock,
  ChevronRight,
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
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-[var(--border-primary)] border-t-[var(--text-primary)] rounded-full animate-spin" />
          <span className="text-[var(--text-tertiary)]">Cargando dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 w-full">
      {/* Header Section */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-[32px] font-bold tracking-tight text-[var(--text-primary)]">
            Command Center
          </h1>
          <p className="text-[15px] text-[var(--text-secondary)] mt-1">
            Visualiza y gestiona todo tu negocio SaaS desde un solo lugar
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-[var(--text-tertiary)]">
            <Clock className="w-4 h-4" />
            <span>Última actualización: {formatDate(lastUpdate.toISOString())}</span>
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
          <WidgetCard
            title="Evolución del MRR"
            subtitle="Tendencia de ingresos recurrentes mensuales"
            icon={TrendingUp}
            iconColor="text-violet-600"
            iconBg="bg-violet-100"
          >
            <RevenueChart
              data={data.metricasMensuales}
              title=""
              subtitle=""
            />
          </WidgetCard>

          {/* Softwares */}
          <WidgetCard
            title="Softwares Conectados"
            subtitle={`${data.bySaas.length} SaaS activos`}
            icon={Layers}
            iconColor="text-blue-600"
            iconBg="bg-blue-100"
          >
            {(data.bySaas?.length ?? 0) > 0 ? (
              <div className="divide-y divide-[var(--border-primary)]">
                {data.bySaas.slice(0, 2).map((saas: any, index: number) => (
                  <div key={index} className="flex items-center gap-4 py-4">
                    <div className="w-10 h-10 rounded-xl bg-[var(--bg-tertiary)] flex items-center justify-center">
                      <span className="text-[14px] font-bold text-[var(--text-primary)] uppercase">
                        {saas.name?.slice(0, 2) || 'S'}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="text-[15px] font-medium text-[var(--text-primary)] capitalize">
                        {saas.name}
                      </p>
                      <p className="text-[13px] text-[var(--text-tertiary)]">
                        {saas.clients || 0} clientes
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-[var(--text-tertiary)]">
                <div className="w-16 h-16 rounded-2xl bg-[var(--bg-tertiary)] mx-auto mb-4 flex items-center justify-center">
                  <Layers className="w-8 h-8 opacity-50" />
                </div>
                <p className="text-[16px] font-medium text-[var(--text-secondary)] mb-1">No hay softwares conectados</p>
                <p className="text-[14px]">Configura tus webhooks para empezar</p>
              </div>
            )}
          </WidgetCard>

          {/* Recent Payments */}
          <WidgetCard
            title="Pagos Recientes"
            subtitle="Últimas transacciones"
            icon={Activity}
            iconColor="text-emerald-600"
            iconBg="bg-emerald-100"
          >
            {(data.recentPayments?.length ?? 0) > 0 ? (
              <div className="divide-y divide-[var(--border-primary)]">
                {data.recentPayments.slice(0, 5).map((pago: any, index: number) => (
                  <div key={pago.id || index} className="flex items-center gap-4 py-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      pago.estado === 'completado' ? 'bg-emerald-100' : 'bg-red-100'
                    }`}>
                      <Activity className={`w-5 h-5 ${
                        pago.estado === 'completado' ? 'text-emerald-600' : 'text-red-600'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <p className="text-[15px] font-medium text-[var(--text-primary)]">
                        {pago.cliente?.nombre || 'Cliente'}
                      </p>
                      <p className="text-[13px] text-[var(--text-tertiary)]">
                        {formatDate(pago.fechaPago)}
                      </p>
                    </div>
                    <p className="text-[15px] font-bold text-[var(--text-primary)]">
                      {formatCurrency(Number(pago.monto))}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-[var(--text-tertiary)]">
                <div className="w-16 h-16 rounded-2xl bg-[var(--bg-tertiary)] mx-auto mb-4 flex items-center justify-center">
                  <Activity className="w-8 h-8 opacity-50" />
                </div>
                <p className="text-[16px] font-medium text-[var(--text-secondary)] mb-1">Sin pagos recientes</p>
                <p className="text-[14px]">Los pagos aparecerán aquí automáticamente</p>
              </div>
            )}
          </WidgetCard>
        </div>

        {/* Right Column - 1/3 */}
        <div className="space-y-6">
          {/* Recent Clients */}
          <WidgetCard
            title="Clientes Destacados"
            subtitle="Top por actividad"
            icon={Users}
            iconColor="text-amber-600"
            iconBg="bg-amber-100"
          >
            {(data.topClients?.length ?? 0) > 0 ? (
              <div className="divide-y divide-[var(--border-primary)]">
                {data.topClients.slice(0, 5).map((cliente: any, index: number) => (
                  <Link
                    key={cliente.id || index}
                    href={`/dashboard/clientes/${cliente.id}`}
                    className="flex items-center gap-4 py-4 group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center"
                    >
                      <span className="text-[14px] font-bold text-amber-700">
                        {cliente.nombre?.charAt(0).toUpperCase() || 'C'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] font-medium text-[var(--text-primary)] truncate group-hover:text-amber-600 transition-colors">
                        {cliente.nombre}
                      </p>
                      <p className="text-[13px] text-[var(--text-tertiary)] truncate">
                        {cliente.email}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[14px] font-semibold text-[var(--text-primary)]">
                        {formatCurrency(Number(cliente.totalPagado || 0))}
                      </p>
                      <p className="text-[12px] text-[var(--text-tertiary)]">
                        {cliente._count?.pagos || 0} pagos
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-[var(--text-tertiary)]">
                <div className="w-16 h-16 rounded-2xl bg-[var(--bg-tertiary)] mx-auto mb-4 flex items-center justify-center">
                  <Users className="w-8 h-8 opacity-50" />
                </div>
                <p className="text-[16px] font-medium text-[var(--text-secondary)] mb-1">Sin clientes</p>
                <p className="text-[14px]">Los clientes aparecerán aquí</p>
              </div>
            )}
          </WidgetCard>
        </div>
      </div>
    </div>
  );
}
