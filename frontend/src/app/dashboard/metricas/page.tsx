'use client';

import { useState, useEffect, useCallback } from 'react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { apiClient } from '@/lib/api';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { TrendingUp, Users, ArrowUpRight, ArrowDownRight, Calendar, RefreshCw } from 'lucide-react';

const timeOptions = [
  { value: '7', label: '7 días', short: '7D' },
  { value: '30', label: '30 días', short: '30D' },
  { value: '90', label: '90 días', short: '90D' },
  { value: '365', label: '12 meses', short: '1A' },
];

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
}

function StatCard({ title, value, icon }: StatCardProps) {
  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[13px] font-medium text-[var(--text-tertiary)] mb-1">{title}</p>
          <p className="text-[28px] font-bold text-[var(--text-primary)] tracking-tight">{value}</p>
        </div>
        <div className="w-12 h-12 rounded-xl bg-[var(--bg-tertiary)] flex items-center justify-center">
          {icon}
        </div>
      </div>
    </div>
  );
}

interface MetricaDiaria {
  id: number;
  fecha: string;
  saas: string;
  nuevosRegistros: number;
  nuevosPagos: number;
  cancelaciones: number;
  clientesActivos: number;
  mrr: number;
  arr: number;
  ingresosNuevos: number;
  churnRate: number;
}

export default function MetricasPage() {
  const [days, setDays] = useState('30');
  const [kpis, setKpis] = useState<any>(null);
  const [metricas, setMetricas] = useState<MetricaDiaria[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [dashboardRes, metricasRes] = await Promise.all([
        apiClient.getDashboard(),
        apiClient.getMetricas({ days }),
      ]);
      setKpis(dashboardRes.data?.kpis || null);
      setMetricas(metricasRes.data || []);
    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [days]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Procesar datos para gráficos
  const chartData = metricas.map((m) => ({
    fecha: new Date(m.fecha).toLocaleDateString('es-ES', {
      day: days === '365' ? undefined : '2-digit',
      month: 'short',
      year: days === '365' ? '2-digit' : undefined,
    }),
    mrr: Number(m.mrr) || 0,
    clientesActivos: m.clientesActivos || 0,
    nuevosRegistros: m.nuevosRegistros || 0,
    nuevosPagos: m.nuevosPagos || 0,
    cancelaciones: m.cancelaciones || 0,
  }));

  // Calcular totales del período
  const totalNuevosRegistros = metricas.reduce((sum, m) => sum + (m.nuevosRegistros || 0), 0);
  const totalNuevosPagos = metricas.reduce((sum, m) => sum + (m.nuevosPagos || 0), 0);
  const totalCancelaciones = metricas.reduce((sum, m) => sum + (m.cancelaciones || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-[var(--border-primary)] border-t-[var(--text-primary)] rounded-full animate-spin" />
          <span className="text-[var(--text-tertiary)]">Cargando métricas...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 w-full">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-[32px] font-bold tracking-tight text-[var(--text-primary)]">
            Métricas
          </h1>
          <p className="text-[15px] text-[var(--text-secondary)] mt-1">
            Análisis detallado del rendimiento de tu negocio
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Refresh Button */}
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl text-[14px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-tertiary)] transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Actualizar
          </button>

          {/* Time Selector Buttons */}
          <div className="flex items-center gap-2 bg-[var(--bg-secondary)] p-1.5 rounded-xl border border-[var(--border-primary)]">
            {timeOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setDays(option.value)}
                className={`px-4 py-2 rounded-lg text-[14px] font-medium transition-all duration-200 ${
                  days === option.value
                    ? 'bg-[var(--text-primary)] text-[var(--bg-primary)] shadow-md'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="MRR Total"
          value={formatCurrency(kpis?.mrr || 0)}
          icon={<TrendingUp className="w-6 h-6 text-violet-500" />}
        />
        <StatCard
          title="Clientes Activos"
          value={String(kpis?.totalClients || 0)}
          icon={<Users className="w-6 h-6 text-blue-500" />}
        />
        <StatCard
          title="Churn Rate"
          value={`${(kpis?.churnRate || 0).toFixed(1)}%`}
          icon={<ArrowDownRight className="w-6 h-6 text-emerald-500" />}
        />
        <StatCard
          title="Suscripciones"
          value={String(kpis?.activeSubs || 0)}
          icon={<ArrowUpRight className="w-6 h-6 text-amber-500" />}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* MRR Chart */}
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <h3 className="text-[16px] font-semibold text-[var(--text-primary)]">Evolución del MRR</h3>
                <p className="text-[13px] text-[var(--text-tertiary)]">Ingresos recurrentes mensuales</p>
              </div>
            </div>
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="mrrGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" vertical={false} />
                <XAxis
                  dataKey="fecha"
                  stroke="var(--text-tertiary)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={12}
                />
                <YAxis
                  stroke="var(--text-tertiary)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `€${v}`}
                  width={50}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-primary)',
                    borderRadius: '12px',
                    padding: '12px'
                  }}
                  formatter={(value) => [formatCurrency(Number(value) || 0), 'MRR']}
                />
                <Area
                  type="monotone"
                  dataKey="mrr"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  fill="url(#mrrGradient)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-[var(--text-tertiary)]">
              Sin datos disponibles para este período
            </div>
          )}
        </div>

        {/* Clients Chart */}
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-[16px] font-semibold text-[var(--text-primary)]">Crecimiento de Clientes</h3>
                <p className="text-[13px] text-[var(--text-tertiary)]">Evolución de la base de clientes</p>
              </div>
            </div>
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" vertical={false} />
                <XAxis
                  dataKey="fecha"
                  stroke="var(--text-tertiary)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={12}
                />
                <YAxis
                  stroke="var(--text-tertiary)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  width={40}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-primary)',
                    borderRadius: '12px',
                    padding: '12px'
                  }}
                  formatter={(value) => [String(value), 'Clientes']}
                />
                <Line
                  type="monotone"
                  dataKey="clientesActivos"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-[var(--text-tertiary)]">
              Sin datos disponibles para este período
            </div>
          )}
        </div>
      </div>

      {/* Activity Chart */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h3 className="text-[16px] font-semibold text-[var(--text-primary)]">Actividad Diaria</h3>
              <p className="text-[13px] text-[var(--text-tertiary)]">
                {totalNuevosRegistros} registros, {totalNuevosPagos} pagos, {totalCancelaciones} bajas en este período
              </p>
            </div>
          </div>
        </div>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" vertical={false} />
              <XAxis
                dataKey="fecha"
                stroke="var(--text-tertiary)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickMargin={12}
              />
              <YAxis
                stroke="var(--text-tertiary)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                width={40}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: '12px',
                  padding: '12px'
                }}
              />
              <Bar dataKey="nuevosRegistros" name="Registros" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="nuevosPagos" name="Pagos" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="cancelaciones" name="Bajas" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[250px] flex items-center justify-center text-[var(--text-tertiary)]">
            Sin datos disponibles para este período
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-[var(--border-primary)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-[var(--text-secondary)]" />
            <h3 className="text-[16px] font-semibold text-[var(--text-primary)]">Detalle Diario</h3>
          </div>
          <span className="text-[13px] text-[var(--text-tertiary)]">{metricas.length} días</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border-primary)] bg-[var(--bg-tertiary)]">
                <th className="text-left px-6 py-4 text-[12px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">Fecha</th>
                <th className="text-right px-6 py-4 text-[12px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">MRR</th>
                <th className="text-right px-6 py-4 text-[12px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">Registros</th>
                <th className="text-right px-6 py-4 text-[12px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">Pagos</th>
                <th className="text-right px-6 py-4 text-[12px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">Bajas</th>
                <th className="text-right px-6 py-4 text-[12px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">Activos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-primary)]">
              {metricas.length > 0 ? (
                metricas.map((m) => (
                  <tr key={m.id} className="hover:bg-[var(--bg-tertiary)]/50 transition-colors">
                    <td className="px-6 py-4 text-[14px] text-[var(--text-primary)]">
                      {formatDate(m.fecha)}
                    </td>
                    <td className="px-6 py-4 text-[14px] text-[var(--text-primary)] text-right font-mono">
                      {formatCurrency(Number(m.mrr))}
                    </td>
                    <td className="px-6 py-4 text-[14px] text-blue-600 text-right">
                      {m.nuevosRegistros || 0}
                    </td>
                    <td className="px-6 py-4 text-[14px] text-emerald-600 text-right">
                      {m.nuevosPagos || 0}
                    </td>
                    <td className="px-6 py-4 text-[14px] text-red-600 text-right">
                      {m.cancelaciones || 0}
                    </td>
                    <td className="px-6 py-4 text-[14px] text-[var(--text-primary)] text-right">
                      {m.clientesActivos || 0}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-[var(--text-tertiary)]">
                    Sin datos disponibles para este período
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
