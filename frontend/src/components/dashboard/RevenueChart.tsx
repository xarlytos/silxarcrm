'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '@/lib/utils';
import { TrendingUp } from 'lucide-react';

interface RevenueChartProps {
  data: { fecha: string; mrr: number; saas?: string }[];
  title?: string;
  subtitle?: string;
}

export default function RevenueChart({ data }: RevenueChartProps) {
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
      <div className="h-[320px] flex flex-col items-center justify-center text-expo-silver">
        <div className="w-16 h-16 rounded-2xl bg-violet-100 flex items-center justify-center mb-4">
          <TrendingUp className="w-8 h-8 text-violet-600" />
        </div>
        <p className="text-[15px] font-medium text-expo-near">Sin datos históricos</p>
        <p className="text-[13px] text-expo-silver mt-1 max-w-xs text-center">
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
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
            <stop offset="50%" stopColor="#6366f1" stopOpacity={0.1} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
        </defs>

        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />

        <XAxis
          dataKey="fecha"
          stroke="#9ca3af"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickMargin={12}
        />

        <YAxis
          stroke="#9ca3af"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={formatYAxis}
          domain={[yMin, yMax]}
          width={60}
        />

        <Tooltip
          content={({ active, payload, label }) => {
            if (active && payload && payload.length) {
              const value = Number(payload[0].value) || 0;
              return (
                <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-4">
                  <p className="text-xs text-gray-500 mb-1">{label}</p>
                  <p className="text-lg font-bold text-gray-900">
                    {formatCurrency(value)}
                  </p>
                  <p className="text-xs text-indigo-500 font-medium mt-1">MRR</p>
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
            fill: '#ffffff'
          }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
