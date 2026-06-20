'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api';
import { BarChart3, TrendingUp, Users, DollarSign, MousePointer } from 'lucide-react';

export default function GrowthAnalytics() {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [softwareId, setSoftwareId] = useState('');
  const [softwares, setSoftwares] = useState<Array<{ id: string; nombre: string }>>([]);
  const [range, setRange] = useState('30');

  useEffect(() => {
    loadSoftwares();
  }, []);

  useEffect(() => {
    if (softwareId) loadMetrics();
  }, [softwareId, range]);

  async function loadSoftwares() {
    try {
      const res = await apiClient.getSoftwares();
      const list = res?.data || [];
      setSoftwares(list);
      if (list.length > 0) {
        setSoftwareId(list[0].id);
      } else {
        setLoading(false);
      }
    } catch {
      setLoading(false);
    }
  }

  async function loadMetrics() {
    setLoading(true);
    try {
      const days = parseInt(range);
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - days);

      const data = await apiClient.getGrowthMetrics({
        softwareId,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      });
      setMetrics(data);
    } catch {
      setMetrics(null);
    } finally {
      setLoading(false);
    }
  }

  const kpiCards = metrics ? [
    { title: 'Impresiones', value: metrics.totals?.impressions || 0, icon: BarChart3, color: 'text-blue-500' },
    { title: 'Clicks', value: metrics.totals?.clicks || 0, icon: MousePointer, color: 'text-green-500' },
    { title: 'Leads', value: metrics.totals?.leads || 0, icon: Users, color: 'text-purple-500' },
    { title: 'CTR', value: `${metrics.avgCtr || 0}%`, icon: TrendingUp, color: 'text-orange-500' },
  ] : [];

  const channelData = metrics ? [
    { name: 'Social', value: metrics.totals?.socialLeads || 0, color: 'bg-blue-500' },
    { name: 'SEO', value: metrics.totals?.seoLeads || 0, color: 'bg-green-500' },
    { name: 'Video', value: metrics.totals?.videoLeads || 0, color: 'bg-red-500' },
    { name: 'Referidos', value: metrics.totals?.referralLeads || 0, color: 'bg-purple-500' },
    { name: 'Marketplaces', value: metrics.totals?.marketplaceLeads || 0, color: 'bg-orange-500' },
  ] : [];

  const maxValue = Math.max(...channelData.map((d) => d.value), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Analytics del Growth Engine</h1>
          <p className="text-muted-foreground mt-1">Métricas del embudo de adquisición.</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={range}
            onChange={(e) => setRange(e.target.value)}
            className="px-3 py-2 rounded-lg border bg-card"
          >
            <option value="7">Últimos 7 días</option>
            <option value="30">Últimos 30 días</option>
            <option value="90">Últimos 90 días</option>
          </select>
          <select
            value={softwareId}
            onChange={(e) => setSoftwareId(e.target.value)}
            className="px-3 py-2 rounded-lg border bg-card"
          >
            {softwares.map((s) => (
              <option key={s.id} value={s.id}>{s.nombre}</option>
            ))}
          </select>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((kpi) => (
          <div key={kpi.title} className="p-4 rounded-xl border bg-card">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{kpi.title}</span>
              <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
            </div>
            <div className="mt-2 text-2xl font-bold">
              {loading ? '—' : kpi.value}
            </div>
          </div>
        ))}
      </div>

      {/* Leads por canal */}
      <div className="p-5 rounded-xl border bg-card">
        <h3 className="font-semibold mb-4">Leads por canal</h3>
        <div className="space-y-3">
          {channelData.map((channel) => (
            <div key={channel.name}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">{channel.name}</span>
                <span className="text-sm text-muted-foreground">{channel.value}</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full ${channel.color} transition-all`}
                  style={{ width: `${(channel.value / maxValue) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Métricas diarias */}
      {metrics?.daily && metrics.daily.length > 0 && (
        <div className="p-5 rounded-xl border bg-card">
          <h3 className="font-semibold mb-4">Evolución diaria</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Fecha</th>
                  <th className="text-right py-2">Impresiones</th>
                  <th className="text-right py-2">Clicks</th>
                  <th className="text-right py-2">Leads</th>
                  <th className="text-right py-2">Gasto estimado</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {metrics.daily.slice(-14).map((day: any) => (
                  <tr key={day.id}>
                    <td className="py-2">{new Date(day.date).toLocaleDateString('es-ES')}</td>
                    <td className="text-right py-2">{day.impressions}</td>
                    <td className="text-right py-2">{day.clicks}</td>
                    <td className="text-right py-2 font-medium">{day.leads}</td>
                    <td className="text-right py-2">€{day.estimatedSpend.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
