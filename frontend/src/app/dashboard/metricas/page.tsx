'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { apiClient } from '@/lib/api';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Area, AreaChart, PieChart, Pie, Cell,
} from 'recharts';
import {
  TrendingUp, Users, ArrowUpRight, ArrowDownRight, Calendar,
  RefreshCw, DollarSign, CreditCard, Activity, Zap, Package,
  ArrowUp, ArrowDown, MousePointerClick, Flame,
} from 'lucide-react';

const timeOptions = [
  { value: '7', label: '7 días', short: '7D' },
  { value: '30', label: '30 días', short: '30D' },
  { value: '90', label: '90 días', short: '90D' },
  { value: '365', label: '12 meses', short: '1A' },
];

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4'];

interface MetricaDiaria {
  id: number;
  fecha: string;
  saas: string;
  nuevosRegistros: number;
  nuevosPagos: number;
  cancelaciones: number;
  upgrades: number;
  downgrades: number;
  clientesActivos: number;
  trialsActivos: number;
  trialsConvertidos: number;
  trialsExpirados: number;
  mrr: number;
  arr: number;
  ingresosNuevos: number;
  ingresosPerdidos: number;
  churnRate: number;
  trialToPaidRate: number;
}

interface KpiData {
  mrr: number;
  arr: number;
  totalClients: number;
  activeSubs: number;
  totalTrials: number;
  cancelaciones30d: number;
  churnRate: number;
  totalPagos: number;
  ingresos30d: number;
}

interface SaasBreakdown {
  saas: string;
  descripcion: string;
  activo: boolean;
  mrr: number;
  suscripciones: number;
  clientes: number;
}

interface PagoReciente {
  id: string;
  monto: number;
  moneda: string;
  fechaPago: string;
  cliente: { nombre: string; email: string };
  suscripcion: { saas: string; planTipo: string };
}

function KpiCard({
  title, value, icon, trend, trendLabel, color = 'violet',
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  trend?: number;
  trendLabel?: string;
  color?: string;
}) {
  const colorMap: Record<string, string> = {
    violet: 'text-violet-500 bg-violet-100 dark:bg-violet-900/30',
    blue: 'text-blue-500 bg-blue-100 dark:bg-blue-900/30',
    emerald: 'text-emerald-500 bg-emerald-100 dark:bg-emerald-900/30',
    amber: 'text-amber-500 bg-amber-100 dark:bg-amber-900/30',
    red: 'text-red-500 bg-red-100 dark:bg-red-900/30',
    cyan: 'text-cyan-500 bg-cyan-100 dark:bg-cyan-900/30',
    rose: 'text-rose-500 bg-rose-100 dark:bg-rose-900/30',
  };
  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorMap[color] || colorMap.violet}`}>
          {icon}
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-[12px] font-medium ${trend >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {trend >= 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
            {Math.abs(trend).toFixed(1)}%
            {trendLabel && <span className="text-[var(--text-tertiary)] ml-0.5">{trendLabel}</span>}
          </div>
        )}
      </div>
      <p className="text-[24px] font-bold text-[var(--text-primary)] tracking-tight">{value}</p>
      <p className="text-[13px] text-[var(--text-tertiary)] mt-0.5">{title}</p>
    </div>
  );
}

export default function MetricasPage() {
  const [days, setDays] = useState('30');
  const [saasFilter, setSaasFilter] = useState('');
  const [saasList, setSaasList] = useState<{ saas: string; descripcion: string; activo: boolean }[]>([]);
  const [kpis, setKpis] = useState<KpiData | null>(null);
  const [metricas, setMetricas] = useState<MetricaDiaria[]>([]);
  const [bySaas, setBySaas] = useState<SaasBreakdown[]>([]);
  const [recentPayments, setRecentPayments] = useState<PagoReciente[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const metricasParams: Record<string, string> = { days };
      if (saasFilter) metricasParams.saas = saasFilter;

      const [dashboardRes, metricasRes] = await Promise.all([
        apiClient.getDashboard(saasFilter || undefined),
        apiClient.getMetricas(metricasParams),
      ]);
      const data = dashboardRes.data || {};
      setKpis(data.kpis || null);
      setMetricas(metricasRes.data || []);
      setBySaas(data.bySaas || []);
      setRecentPayments(data.recentPayments || []);
    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [days, saasFilter]);

  useEffect(() => {
    apiClient.getSaasList().then((r) => {
      const configs = r.data || [];
      setSaasList(configs);
    }).catch(() => setSaasList([]));
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calcular tendencias comparando primera mitad vs segunda mitad del período
  const trends = useMemo(() => {
    if (metricas.length < 4) return {};
    const mid = Math.floor(metricas.length / 2);
    const first = metricas.slice(0, mid);
    const second = metricas.slice(mid);

    const sum = (arr: MetricaDiaria[], key: keyof MetricaDiaria) =>
      arr.reduce((s, m) => s + (Number(m[key]) || 0), 0);

    const calcTrend = (key: keyof MetricaDiaria) => {
      const a = sum(first, key);
      const b = sum(second, key);
      return a > 0 ? ((b - a) / a) * 100 : 0;
    };

    return {
      mrr: calcTrend('mrr'),
      clientes: calcTrend('clientesActivos'),
      ingresos: calcTrend('ingresosNuevos'),
      cancelaciones: calcTrend('cancelaciones'),
      nuevosRegistros: calcTrend('nuevosRegistros'),
    };
  }, [metricas]);

  // Procesar datos para gráficos
  const chartData = useMemo(() => {
    return metricas.map((m) => ({
      fecha: new Date(m.fecha).toLocaleDateString('es-ES', {
        day: days === '365' ? undefined : '2-digit',
        month: 'short',
        year: days === '365' ? '2-digit' : undefined,
      }),
      mrr: Number(m.mrr) || 0,
      arr: Number(m.arr) || 0,
      clientesActivos: m.clientesActivos || 0,
      nuevosRegistros: m.nuevosRegistros || 0,
      nuevosPagos: m.nuevosPagos || 0,
      cancelaciones: m.cancelaciones || 0,
      upgrades: m.upgrades || 0,
      downgrades: m.downgrades || 0,
      ingresosNuevos: Number(m.ingresosNuevos) || 0,
      ingresosPerdidos: Number(m.ingresosPerdidos) || 0,
      churnRate: Number(m.churnRate) || 0,
      trialToPaidRate: Number(m.trialToPaidRate) || 0,
    }));
  }, [metricas, days]);

  // Totales del período
  const totales = useMemo(() => {
    return metricas.reduce(
      (acc, m) => ({
        nuevosRegistros: acc.nuevosRegistros + (m.nuevosRegistros || 0),
        nuevosPagos: acc.nuevosPagos + (m.nuevosPagos || 0),
        cancelaciones: acc.cancelaciones + (m.cancelaciones || 0),
        upgrades: acc.upgrades + (m.upgrades || 0),
        downgrades: acc.downgrades + (m.downgrades || 0),
        ingresosNuevos: acc.ingresosNuevos + Number(m.ingresosNuevos || 0),
        ingresosPerdidos: acc.ingresosPerdidos + Number(m.ingresosPerdidos || 0),
      }),
      { nuevosRegistros: 0, nuevosPagos: 0, cancelaciones: 0, upgrades: 0, downgrades: 0, ingresosNuevos: 0, ingresosPerdidos: 0 }
    );
  }, [metricas]);

  // Datos para pie chart de breakdown por SaaS
  const saasPieData = useMemo(() => {
    return bySaas
      .filter((s) => s.activo && s.mrr > 0)
      .map((s) => ({ name: s.saas, value: s.mrr }))
      .sort((a, b) => b.value - a.value);
  }, [bySaas]);

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

        <div className="flex items-center gap-3 flex-wrap">
          {/* SaaS Filter */}
          <select
            value={saasFilter}
            onChange={(e) => setSaasFilter(e.target.value)}
            className="px-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl text-[14px] font-medium text-[var(--text-secondary)]"
          >
            <option value="">Todos los SaaS</option>
            {saasList.map((s) => (
              <option key={s.saas} value={s.saas}>{s.saas}</option>
            ))}
          </select>

          {/* Refresh Button */}
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl text-[14px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-tertiary)] transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Actualizar
          </button>

          {/* Time Selector */}
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

      {/* KPIs Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="MRR"
          value={formatCurrency(kpis?.mrr || 0)}
          icon={<TrendingUp className="w-5 h-5" />}
          trend={trends.mrr}
          trendLabel="vs período ant."
          color="violet"
        />
        <KpiCard
          title="ARR"
          value={formatCurrency(kpis?.arr || 0)}
          icon={<DollarSign className="w-5 h-5" />}
          color="blue"
        />
        <KpiCard
          title="Ingresos 30d"
          value={formatCurrency(kpis?.ingresos30d || 0)}
          icon={<CreditCard className="w-5 h-5" />}
          trend={trends.ingresos}
          trendLabel="vs período ant."
          color="emerald"
        />
        <KpiCard
          title="Clientes Activos"
          value={String(kpis?.totalClients || 0)}
          icon={<Users className="w-5 h-5" />}
          trend={trends.clientes}
          trendLabel="vs período ant."
          color="amber"
        />
      </div>

      {/* Second Row KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Churn Rate"
          value={`${(kpis?.churnRate || 0).toFixed(2)}%`}
          icon={<ArrowDownRight className="w-5 h-5" />}
          trend={trends.cancelaciones}
          trendLabel="vs período ant."
          color="red"
        />
        <KpiCard
          title="Suscripciones Activas"
          value={String(kpis?.activeSubs || 0)}
          icon={<Package className="w-5 h-5" />}
          color="cyan"
        />
        <KpiCard
          title="Trials Activos"
          value={String(kpis?.totalTrials || 0)}
          icon={<Zap className="w-5 h-5" />}
          color="rose"
        />
        <KpiCard
          title="Total Pagos"
          value={String(kpis?.totalPagos || 0)}
          icon={<MousePointerClick className="w-5 h-5" />}
          color="violet"
        />
      </div>

      {/* Charts Row 1 */}
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
                <XAxis dataKey="fecha" stroke="var(--text-tertiary)" fontSize={12} tickLine={false} axisLine={false} tickMargin={12} />
                <YAxis stroke="var(--text-tertiary)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `€${v}`} width={50} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: '12px', padding: '12px' }}
                  formatter={(value) => [formatCurrency(Number(value) || 0), 'MRR']}
                />
                <Area type="monotone" dataKey="mrr" stroke="#8b5cf6" strokeWidth={2} fill="url(#mrrGradient)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-[var(--text-tertiary)]">Sin datos disponibles</div>
          )}
        </div>

        {/* Churn Rate Chart */}
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <Activity className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-[16px] font-semibold text-[var(--text-primary)]">Churn Rate</h3>
                <p className="text-[13px] text-[var(--text-tertiary)]">Tasa de cancelación en el tiempo</p>
              </div>
            </div>
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="churnGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" vertical={false} />
                <XAxis dataKey="fecha" stroke="var(--text-tertiary)" fontSize={12} tickLine={false} axisLine={false} tickMargin={12} />
                <YAxis stroke="var(--text-tertiary)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} width={45} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: '12px', padding: '12px' }}
                  formatter={(value) => [`${Number(value).toFixed(2)}%`, 'Churn Rate']}
                />
                <Area type="monotone" dataKey="churnRate" stroke="#ef4444" strokeWidth={2} fill="url(#churnGradient)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-[var(--text-tertiary)]">Sin datos disponibles</div>
          )}
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Activity Chart */}
        <div className="xl:col-span-2 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h3 className="text-[16px] font-semibold text-[var(--text-primary)]">Actividad Diaria</h3>
                <p className="text-[13px] text-[var(--text-tertiary)]">
                  {totales.nuevosRegistros} registros · {totales.nuevosPagos} pagos · {totales.cancelaciones} bajas · {totales.upgrades} upgrades · {totales.downgrades} downgrades
                </p>
              </div>
            </div>
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" vertical={false} />
                <XAxis dataKey="fecha" stroke="var(--text-tertiary)" fontSize={12} tickLine={false} axisLine={false} tickMargin={12} />
                <YAxis stroke="var(--text-tertiary)" fontSize={12} tickLine={false} axisLine={false} width={40} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: '12px', padding: '12px' }} />
                <Bar dataKey="nuevosRegistros" name="Registros" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="nuevosPagos" name="Pagos" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="cancelaciones" name="Bajas" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[260px] flex items-center justify-center text-[var(--text-tertiary)]">Sin datos disponibles</div>
          )}
        </div>

        {/* SaaS Breakdown */}
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Flame className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h3 className="text-[16px] font-semibold text-[var(--text-primary)]">MRR por SaaS</h3>
              <p className="text-[13px] text-[var(--text-tertiary)]">Distribución de ingresos</p>
            </div>
          </div>
          {saasPieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={saasPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {saasPieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any) => formatCurrency(Number(value) || 0)}
                  contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-[var(--text-tertiary)]">Sin datos</div>
          )}
          <div className="space-y-2 mt-4">
            {bySaas.filter((s) => s.activo).map((s, i) => (
              <div key={s.saas} className="flex items-center justify-between text-[13px]">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-[var(--text-secondary)]">{s.saas}</span>
                </div>
                <span className="font-medium text-[var(--text-primary)]">{formatCurrency(s.mrr)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts Row 3 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Revenue In/Out */}
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h3 className="text-[16px] font-semibold text-[var(--text-primary)]">Ingresos vs Pérdidas</h3>
              <p className="text-[13px] text-[var(--text-tertiary)]">
                +{formatCurrency(totales.ingresosNuevos)} ganado · -{formatCurrency(totales.ingresosPerdidos)} perdido
              </p>
            </div>
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" vertical={false} />
                <XAxis dataKey="fecha" stroke="var(--text-tertiary)" fontSize={12} tickLine={false} axisLine={false} tickMargin={12} />
                <YAxis stroke="var(--text-tertiary)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `€${v}`} width={50} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: '12px', padding: '12px' }}
                  formatter={(value) => formatCurrency(Number(value))}
                />
                <Bar dataKey="ingresosNuevos" name="Ingresos" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="ingresosPerdidos" name="Pérdidas" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-[var(--text-tertiary)]">Sin datos disponibles</div>
          )}
        </div>

        {/* Trial Conversion */}
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
              <Zap className="w-5 h-5 text-rose-600 dark:text-rose-400" />
            </div>
            <div>
              <h3 className="text-[16px] font-semibold text-[var(--text-primary)]">Trial to Paid</h3>
              <p className="text-[13px] text-[var(--text-tertiary)]">Tasa de conversión de trials</p>
            </div>
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" vertical={false} />
                <XAxis dataKey="fecha" stroke="var(--text-tertiary)" fontSize={12} tickLine={false} axisLine={false} tickMargin={12} />
                <YAxis stroke="var(--text-tertiary)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} width={45} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: '12px', padding: '12px' }}
                  formatter={(value) => [`${Number(value).toFixed(1)}%`, 'Conversión']}
                />
                <Line type="monotone" dataKey="trialToPaidRate" stroke="#ec4899" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-[var(--text-tertiary)]">Sin datos disponibles</div>
          )}
        </div>
      </div>

      {/* Recent Payments */}
      {recentPayments.length > 0 && (
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl overflow-hidden">
          <div className="px-6 py-5 border-b border-[var(--border-primary)] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CreditCard className="w-5 h-5 text-[var(--text-secondary)]" />
              <h3 className="text-[16px] font-semibold text-[var(--text-primary)]">Pagos Recientes</h3>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border-primary)] bg-[var(--bg-tertiary)]">
                  <th className="text-left px-6 py-3 text-[12px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">Cliente</th>
                  <th className="text-left px-6 py-3 text-[12px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">SaaS</th>
                  <th className="text-left px-6 py-3 text-[12px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">Plan</th>
                  <th className="text-right px-6 py-3 text-[12px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">Monto</th>
                  <th className="text-right px-6 py-3 text-[12px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-primary)]">
                {recentPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-[var(--bg-tertiary)]/50 transition-colors">
                    <td className="px-6 py-3 text-[14px] text-[var(--text-primary)]">
                      {p.cliente?.nombre || '—'}
                    </td>
                    <td className="px-6 py-3 text-[13px] text-[var(--text-secondary)]">
                      {p.suscripcion?.saas || '—'}
                    </td>
                    <td className="px-6 py-3 text-[13px] text-[var(--text-secondary)]">
                      {p.suscripcion?.planTipo || '—'}
                    </td>
                    <td className="px-6 py-3 text-[14px] text-emerald-600 text-right font-mono font-medium">
                      {formatCurrency(p.monto)}
                    </td>
                    <td className="px-6 py-3 text-[13px] text-[var(--text-tertiary)] text-right">
                      {p.fechaPago ? new Date(p.fechaPago).toLocaleDateString('es-ES') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detailed Table */}
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
                <th className="text-right px-6 py-4 text-[12px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">Up</th>
                <th className="text-right px-6 py-4 text-[12px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">Down</th>
                <th className="text-right px-6 py-4 text-[12px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">Activos</th>
                <th className="text-right px-6 py-4 text-[12px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">Churn</th>
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
                    <td className="px-6 py-4 text-[14px] text-violet-600 text-right">
                      {m.upgrades || 0}
                    </td>
                    <td className="px-6 py-4 text-[14px] text-amber-600 text-right">
                      {m.downgrades || 0}
                    </td>
                    <td className="px-6 py-4 text-[14px] text-[var(--text-primary)] text-right">
                      {m.clientesActivos || 0}
                    </td>
                    <td className="px-6 py-4 text-[14px] text-right">
                      <span className={`${Number(m.churnRate) > 5 ? 'text-red-600' : 'text-emerald-600'}`}>
                        {Number(m.churnRate).toFixed(2)}%
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-[var(--text-tertiary)]">
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
