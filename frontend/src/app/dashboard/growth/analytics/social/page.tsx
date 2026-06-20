'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiClient } from '@/lib/api';
import Link from 'next/link';
import {
  ArrowLeft,
  BarChart3,
  TrendingUp,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Camera,
  FileText,
  Sparkles,
  Loader2,
  Download,
  RefreshCw,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';

const PRESETS = [
  { label: '7 días', days: 7 },
  { label: '30 días', days: 30 },
  { label: '90 días', days: 90 },
];

const PLATFORM_COLORS: Record<string, string> = {
  INSTAGRAM: '#ec4899', LINKEDIN: '#2563eb', FACEBOOK: '#3b82f6', X: '#52525b',
  TIKTOK: '#d946ef', YOUTUBE: '#ef4444', PINTEREST: '#dc2626', THREADS: '#71717a', REDDIT: '#f97316',
};

export default function SocialAnalyticsPage() {
  const [softwares, setSoftwares] = useState<Array<{ id: string; nombre: string }>>([]);
  const [softwareId, setSoftwareId] = useState('');
  const [days, setDays] = useState(30);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<any>(null);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [snapshotting, setSnapshotting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiClient.getSoftwares();
        const list = res?.data || [];
        setSoftwares(list);
        if (list.length > 0) setSoftwareId(list[0].id);
        else setLoading(false);
      } catch {
        setLoading(false);
      }
    })();
  }, []);

  const rangeParams = useCallback(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    return { startDate: start.toISOString(), endDate: end.toISOString() };
  }, [days]);

  const load = useCallback(async () => {
    if (!softwareId) return;
    setLoading(true);
    try {
      const res = await apiClient.getSocialAnalytics({ softwareId, ...rangeParams() });
      setData(res);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [softwareId, rangeParams]);

  useEffect(() => {
    if (softwareId) load();
  }, [softwareId, load]);

  async function handleSnapshot() {
    setSnapshotting(true);
    try {
      const r = await apiClient.snapshotSocialMetrics(softwareId);
      alert(`Snapshot guardado: ${r.snapshotted} posts.`);
    } catch (e: any) {
      alert(e?.message || 'Error');
    } finally {
      setSnapshotting(false);
    }
  }

  async function handleReport() {
    setGeneratingReport(true);
    setReport(null);
    try {
      const r = await apiClient.generateSocialReport({ softwareId, ...rangeParams() });
      setReport(r);
    } catch (e: any) {
      alert(e?.message || 'Error generando el reporte');
    } finally {
      setGeneratingReport(false);
    }
  }

  const kpis = data?.kpis;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border bg-card p-6 print:hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 pointer-events-none" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <Link href="/dashboard/growth" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-3 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Growth Engine
            </Link>
            <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
              <BarChart3 className="w-7 h-7 text-primary" /> Analytics social
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">Rendimiento de tus publicaciones por plataforma, formato y tiempo.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select value={softwareId} onChange={(e) => setSoftwareId(e.target.value)} className="px-3 py-2 rounded-lg border bg-card text-sm">
              {softwares.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
            <div className="flex items-center gap-1 p-1 rounded-lg border bg-card">
              {PRESETS.map((p) => (
                <button key={p.days} onClick={() => setDays(p.days)} className={`px-3 py-1.5 rounded text-sm font-medium ${days === p.days ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>
                  {p.label}
                </button>
              ))}
            </div>
            <button onClick={handleSnapshot} disabled={snapshotting} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border bg-card text-sm font-medium hover:bg-muted disabled:opacity-50" title="Guardar snapshot histórico">
              {snapshotting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Snapshot
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 rounded-2xl border bg-card animate-pulse" />)}
        </div>
      ) : !kpis || kpis.totalPosts === 0 ? (
        <div className="rounded-2xl border border-dashed bg-card p-12 text-center text-muted-foreground">
          No hay posts publicados con métricas en este periodo.
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Kpi icon={Eye} label="Alcance total" value={kpis.totalReach} color="from-blue-500 to-indigo-500" />
            <Kpi icon={TrendingUp} label="Engagement" value={kpis.totalEngagement} color="from-pink-500 to-rose-500" />
            <Kpi icon={BarChart3} label="Engagement rate" value={kpis.avgEngagementRate} suffix="%" color="from-violet-500 to-purple-500" />
            <Kpi icon={FileText} label="Posts publicados" value={kpis.totalPosts} color="from-emerald-500 to-teal-500" />
          </div>

          {/* Secondary KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <MiniKpi icon={Heart} label="Likes" value={kpis.totalLikes} />
            <MiniKpi icon={MessageCircle} label="Comentarios" value={kpis.totalComments} />
            <MiniKpi icon={Share2} label="Compartidos" value={kpis.totalShares} />
            <MiniKpi icon={Eye} label="Impresiones" value={kpis.totalImpressions} />
          </div>

          {/* Engagement over time */}
          <div className="rounded-2xl border bg-card p-5">
            <h3 className="font-bold mb-4">Engagement en el tiempo</h3>
            {data.engagementOverTime.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin datos.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={data.engagementOverTime}>
                  <defs>
                    <linearGradient id="engGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ec4899" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="engagement" stroke="#ec4899" fill="url(#engGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* By platform */}
            <div className="rounded-2xl border bg-card p-5">
              <h3 className="font-bold mb-4">Engagement por plataforma</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data.byPlatform}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="platform" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="engagement" radius={[6, 6, 0, 0]}>
                    {data.byPlatform.map((p: any, i: number) => (
                      <Cell key={i} fill={PLATFORM_COLORS[p.platform] || '#6366f1'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* By content type */}
            <div className="rounded-2xl border bg-card p-5">
              <h3 className="font-bold mb-4">Mejores formatos</h3>
              <div className="space-y-2">
                {data.byContentType.slice(0, 6).map((c: any) => {
                  const max = data.byContentType[0]?.avgEngagement || 1;
                  return (
                    <div key={c.formato}>
                      <div className="flex items-center justify-between text-sm mb-0.5">
                        <span className="font-medium capitalize">{c.formato}</span>
                        <span className="text-muted-foreground">{Math.round(c.avgEngagement)} eng/post · {c.posts}</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500" style={{ width: `${Math.min((c.avgEngagement / max) * 100, 100)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Top posts */}
          <div className="rounded-2xl border bg-card p-5">
            <h3 className="font-bold mb-4 flex items-center gap-2"><Camera className="w-4 h-4" /> Top posts</h3>
            <div className="space-y-2">
              {data.topPosts.map((p: any, i: number) => (
                <div key={p.id} className="flex items-center gap-3 p-2.5 rounded-lg border">
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.title}</p>
                    <p className="text-xs text-muted-foreground">{p.platform} · {p.accountName}</p>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                    <span className="inline-flex items-center gap-1"><TrendingUp className="w-3 h-3" /> {p.engagement}</span>
                    <span className="inline-flex items-center gap-1"><Eye className="w-3 h-3" /> {p.reach}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Report generator */}
          <div className="rounded-2xl border bg-card p-5">
            <div className="flex items-center justify-between mb-4 print:hidden">
              <h3 className="font-bold flex items-center gap-2"><Sparkles className="w-4 h-4 text-violet-500" /> Reporte ejecutivo</h3>
              <div className="flex items-center gap-2">
                <button onClick={handleReport} disabled={generatingReport} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-violet-500 text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50">
                  {generatingReport ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {generatingReport ? 'Generando...' : 'Generar con IA'}
                </button>
                {report && (
                  <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border bg-card text-sm font-medium hover:bg-muted">
                    <Download className="w-4 h-4" /> PDF
                  </button>
                )}
              </div>
            </div>
            {report ? (
              <div className="prose prose-sm max-w-none">
                <p className="text-xs text-muted-foreground print:hidden">Generado el {new Date(report.generatedAt).toLocaleString('es-ES')}</p>
                <div className="whitespace-pre-wrap text-sm leading-relaxed mt-2">{report.resumenEjecutivo}</div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground print:hidden">Genera un resumen ejecutivo con IA del periodo seleccionado y expórtalo a PDF.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Kpi({ icon: Icon, label, value, suffix, color }: { icon: any; label: string; value: number; suffix?: string; color: string }) {
  return (
    <div className="relative overflow-hidden p-5 rounded-2xl border bg-card">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-muted-foreground">{label}</span>
        <div className={`p-2 rounded-xl bg-gradient-to-br ${color} shadow-md`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
      </div>
      <div className="mt-3 text-3xl font-extrabold tabular-nums tracking-tight">
        {value.toLocaleString('es-ES')}{suffix || ''}
      </div>
    </div>
  );
}

function MiniKpi({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <div className="p-4 rounded-xl border bg-card flex items-center gap-3">
      <Icon className="w-5 h-5 text-muted-foreground" />
      <div>
        <div className="text-lg font-bold tabular-nums">{value.toLocaleString('es-ES')}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}
