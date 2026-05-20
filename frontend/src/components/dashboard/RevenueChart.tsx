'use client';

import { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '@/lib/utils';
import { TrendingUp } from 'lucide-react';

interface RevenueChartProps {
  data: { fecha: string; mrr: number; saas?: string }[];
  title?: string;
  subtitle?: string;
}

function useIsDark() {
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const html = document.documentElement;
    const update = () => setIsDark(html.classList.contains('dark'));
    update();
    const obs = new MutationObserver(update);
    obs.observe(html, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);
  return isDark;
}

export default function RevenueChart({ data }: RevenueChartProps) {
  const isDark = useIsDark();
  const gridStroke = isDark ? '#2a2a2a' : '#eef0f4';
  const axisStroke = isDark ? '#6b7280' : '#9ca3af';
  const tooltipBg = isDark ? '#1f1f1f' : '#ffffff';
  const tooltipBorder = isDark ? '#2a2a2a' : '#e5e7eb';
  const tooltipTitle = isDark ? '#9ca3af' : '#6b7280';
  const tooltipValue = isDark ? '#f3f4f6' : '#111827';

  // Procesar datos reales
  const chartData = data?.length > 0
    ? data.map((d) => ({
        fecha: d.fecha
          ? new Date(d.fecha).toLocaleDateString('es-ES', { month: 'short' })
          : '',
        mrr: Number(d.mrr) || 0,
      }))
    : [];

  // Si no hay datos válidos, mostrar mensaje con el MRR actual
  if (chartData.length === 0 || chartData.every(d => d.mrr === 0)) {
    return (
      <div className="h-[320px] flex flex-col items-center justify-center">
        <div className="w-16 h-16 rounded-2xl bg-violet-100 dark:bg-violet-500/15 flex items-center justify-center mb-4 ring-1 ring-inset ring-violet-200/60 dark:ring-violet-400/20">
          <TrendingUp className="w-8 h-8 text-violet-600 dark:text-violet-400" />
        </div>
        <p className="text-[15px] font-medium text-[var(--text-primary)]">Sin datos históricos</p>
        <p className="text-[13px] text-[var(--text-tertiary)] mt-1 max-w-xs text-center">
          El gráfico mostrará la evolución cuando se acumulen datos de varios meses
        </p>
      </div>
    );
  }

  // Calcular min/max para el eje Y
  const mrrValues = chartData.map(d => d.mrr);
  const maxMrr = Math.max(...mrrValues);
  const minMrr = Math.min(...mrrValues);
  const range = maxMrr - minMrr || maxMrr; // Evitar división por cero

  // Asegurar que el mínimo sea 0 o un valor cercano
  const yMin = 0;
  const yMax = maxMrr + range * 0.15;

  // Formateador para el eje Y - mostrar valores reales
  const formatYAxis = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M€`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}k€`;
    return `${value.toFixed(0)}€`;
  };

  return (
    <ResponsiveContainer width="100%" height={320}>
      <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="mrrGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={isDark ? 0.45 : 0.3} />
            <stop offset="50%" stopColor="#6366f1" stopOpacity={isDark ? 0.18 : 0.12} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
        </defs>

        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />

        <XAxis
          dataKey="fecha"
          stroke={axisStroke}
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickMargin={12}
        />

        <YAxis
          stroke={axisStroke}
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={formatYAxis}
          domain={[yMin, yMax]}
          width={60}
        />

        <Tooltip
          cursor={{ stroke: isDark ? '#3a3a3a' : '#d1d5db', strokeWidth: 1, strokeDasharray: '4 4' }}
          content={({ active, payload, label }) => {
            if (active && payload && payload.length) {
              const value = Number(payload[0].value) || 0;
              return (
                <div
                  className="rounded-xl shadow-xl px-4 py-3 backdrop-blur-sm"
                  style={{
                    background: tooltipBg,
                    borderWidth: 1,
                    borderStyle: 'solid',
                    borderColor: tooltipBorder,
                  }}
                >
                  <p className="text-[11px] uppercase tracking-wider mb-1" style={{ color: tooltipTitle }}>
                    {label}
                  </p>
                  <p className="text-[18px] font-bold" style={{ color: tooltipValue }}>
                    {formatCurrency(value)}
                  </p>
                  <p className="text-[11px] font-medium mt-1 text-indigo-500 dark:text-indigo-400">
                    MRR
                  </p>
                </div>
              );
            }
            return null;
          }}
        />

        <Area
          type="monotone"
          dataKey="mrr"
          stroke="#6366f1"
          strokeWidth={2.5}
          fill="url(#mrrGradient)"
          dot={false}
          activeDot={{
            r: 5,
            stroke: '#6366f1',
            strokeWidth: 2,
            fill: isDark ? '#0a0a0a' : '#ffffff'
          }}
          isAnimationActive
          animationDuration={900}
          animationEasing="ease-out"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
