'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api';
import {
  Gift,
  Link2,
  Users,
  TrendingUp,
  Copy,
  CheckCircle,
  Trophy,
  Crown,
  Medal,
  Award,
  Loader2,
  Download,
} from 'lucide-react';

interface LeaderboardEntry {
  referrerId: number;
  nombre: string;
  email?: string;
  conversions: number;
}

export default function ReferralsPage() {
  const [softwareId, setSoftwareId] = useState('');
  const [softwares, setSoftwares] = useState<Array<{ id: string; nombre: string }>>([]);
  const [stats, setStats] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadSoftwares();
  }, []);

  useEffect(() => {
    if (softwareId) loadData();
  }, [softwareId]);

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

  async function loadData() {
    setLoading(true);
    try {
      const [statsData, leaderboardData] = await Promise.all([
        apiClient.getGrowthReferrals(softwareId),
        apiClient.getReferralLeaderboard(softwareId),
      ]);
      setStats(statsData);
      setLeaderboard(leaderboardData);
    } catch {
      setStats(null);
      setLeaderboard([]);
    } finally {
      setLoading(false);
    }
  }

  function copyToClipboard() {
    const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/r/DEMO123`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Programa de Referidos</h1>
          <p className="text-muted-foreground mt-1">Tus clientes traen clientes. Automático.</p>
        </div>
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Referidos totales" value={stats?.totalReferrals || 0} icon={Users} loading={loading} />
        <StatCard title="Clicks totales" value={stats?.totalClicks || 0} icon={Link2} loading={loading} />
        <StatCard title="Convertidos" value={stats?.converted || 0} icon={CheckCircle} loading={loading} />
        <StatCard title="Tasa de conversión" value={`${stats?.conversionRate || 0}%`} icon={TrendingUp} loading={loading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div className="p-5 rounded-xl border bg-card">
            <div className="flex items-center gap-2 mb-4">
              <Gift className="w-5 h-5 text-purple-500" />
              <h3 className="font-semibold">Preview del enlace</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Así es como tus clientes verán su enlace de referido.
            </p>
            <div className="flex items-center gap-3">
              <div className="flex-1 px-4 py-2.5 rounded-lg bg-muted font-mono text-sm truncate">
                {typeof window !== 'undefined' ? `${window.location.origin}/r/DEMO123` : '/r/DEMO123'}
              </div>
              <button
                onClick={copyToClipboard}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg border hover:bg-muted transition-colors"
              >
                {copied ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="p-5 rounded-xl border bg-card">
            <h3 className="font-semibold mb-4">Niveles de Referidores</h3>
            <div className="space-y-3">
              {[
                { name: 'Bronce', min: 0, icon: Award, color: 'text-amber-600 bg-amber-50', multiplier: '1x' },
                { name: 'Plata', min: 3, icon: Medal, color: 'text-slate-500 bg-slate-100', multiplier: '1.5x' },
                { name: 'Oro', min: 10, icon: Trophy, color: 'text-yellow-500 bg-yellow-50', multiplier: '2x' },
                { name: 'Platino', min: 25, icon: Crown, color: 'text-violet-500 bg-violet-50', multiplier: '3x' },
              ].map((tier) => (
                <div key={tier.name} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <div className={`p-2 rounded-lg ${tier.color}`}>
                    <tier.icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{tier.name}</p>
                    <p className="text-xs text-muted-foreground">{tier.min}+ referidos convertidos</p>
                  </div>
                  <span className="text-sm font-bold text-primary">{tier.multiplier}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="p-5 rounded-xl border bg-card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                <h3 className="font-semibold">Top Referidores</h3>
              </div>
              <button
                onClick={() => {
                  const csv = leaderboard.map((l) => `${l.nombre},${l.email},${l.conversions}`).join('\n');
                  const blob = new Blob(['Nombre,Email,Conversiones\n' + csv], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'leaderboard.csv';
                  a.click();
                }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm hover:bg-muted"
              >
                <Download className="w-4 h-4" />
                Exportar
              </button>
            </div>

            {leaderboard.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay datos de referidos aún.
              </div>
            ) : (
              <div className="space-y-2">
                {leaderboard.map((entry, index) => (
                  <div
                    key={entry.referrerId}
                    className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      index === 0 ? 'bg-yellow-100 text-yellow-700' :
                      index === 1 ? 'bg-gray-100 text-gray-700' :
                      index === 2 ? 'bg-orange-100 text-orange-700' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{entry.nombre}</p>
                      <p className="text-xs text-muted-foreground">{entry.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{entry.conversions}</p>
                      <p className="text-xs text-muted-foreground">conversiones</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  loading,
}: {
  title: string;
  value: string | number;
  icon: any;
  loading: boolean;
}) {
  return (
    <div className="p-4 rounded-xl border bg-card">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{title}</span>
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="mt-2 text-2xl font-bold">{loading ? '—' : value}</div>
    </div>
  );
}
