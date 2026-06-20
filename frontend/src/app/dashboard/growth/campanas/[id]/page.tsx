'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import Link from 'next/link';
import {
  ArrowLeft,
  Megaphone,
  Target,
  Calendar,
  Wallet,
  FileText,
  Trash2,
  ExternalLink,
} from 'lucide-react';

type CampaignStatus = 'PLANNING' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'ARCHIVED';

interface CampaignPost {
  id: string;
  content: string;
  status: string;
  scheduledAt?: string;
  publishedAt?: string;
  account?: { nombre: string; platform: string; avatarUrl?: string };
}

interface Campaign {
  id: string;
  nombre: string;
  descripcion?: string;
  objetivo: string;
  status: CampaignStatus;
  fechaInicio?: string;
  fechaFin?: string;
  presupuesto?: string;
  moneda: string;
  briefCreativo?: string;
  kpisObjetivo?: Record<string, number>;
  colorTag: string;
  brand?: { nombre: string; colorPrimario: string; logoUrl?: string };
  posts?: CampaignPost[];
}

const STATUS_META: Record<CampaignStatus, { label: string; color: string }> = {
  PLANNING: { label: 'Planificación', color: 'bg-amber-500/10 text-amber-600 border-amber-500/30' },
  ACTIVE: { label: 'Activa', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' },
  PAUSED: { label: 'Pausada', color: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/30' },
  COMPLETED: { label: 'Completada', color: 'bg-blue-500/10 text-blue-600 border-blue-500/30' },
  ARCHIVED: { label: 'Archivada', color: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30' },
};

const OBJETIVO_LABEL: Record<string, string> = {
  AWARENESS: 'Awareness', ENGAGEMENT: 'Engagement', CONVERSION: 'Conversión',
  TRAFFIC: 'Tráfico', LEADS: 'Leads', SALES: 'Ventas', UGC: 'UGC', LAUNCH: 'Lanzamiento',
};

const KPI_LABEL: Record<string, string> = {
  alcance: 'Alcance', engagement: 'Engagement %', clicks: 'Clicks', conversiones: 'Conversiones',
};

const POST_STATUS_LABEL: Record<string, string> = {
  IDEA: 'Idea', PLANNED: 'Planificado', IN_PRODUCTION: 'Producción', IN_REVIEW: 'Revisión',
  NEEDS_REVISION: 'Cambios', DRAFT: 'Borrador', SCHEDULED: 'Programado', PUBLISHED: 'Publicado', FAILED: 'Fallido',
};

export default function CampanaDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.getCampaign(id);
      setCampaign(res);
    } catch {
      setCampaign(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function changeStatus(status: CampaignStatus) {
    if (!campaign) return;
    setUpdating(true);
    try {
      await apiClient.updateCampaign(campaign.id, { ...campaign, status });
      setCampaign({ ...campaign, status });
    } catch (e: any) {
      alert(e?.message || 'Error al actualizar estado');
    } finally {
      setUpdating(false);
    }
  }

  async function handleDelete() {
    if (!campaign) return;
    if (!confirm(`¿Eliminar la campaña "${campaign.nombre}"? Los posts se conservan pero pierden la asociación.`)) return;
    try {
      await apiClient.deleteCampaign(campaign.id);
      router.push('/dashboard/growth/campanas');
    } catch (e: any) {
      alert(e?.message || 'Error al eliminar');
    }
  }

  function fmtDate(d?: string) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-32 rounded-2xl border bg-card animate-pulse" />
        <div className="h-64 rounded-2xl border bg-card animate-pulse" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="rounded-2xl border border-dashed bg-card p-12 text-center">
        <h3 className="text-lg font-bold">Campaña no encontrada</h3>
        <Link href="/dashboard/growth/campanas" className="mt-3 inline-flex items-center gap-1.5 text-sm text-primary">
          <ArrowLeft className="w-4 h-4" /> Volver a campañas
        </Link>
      </div>
    );
  }

  const sm = STATUS_META[campaign.status];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border bg-card p-6 sm:p-8">
        <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: campaign.colorTag }} />
        <Link
          href="/dashboard/growth/campanas"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-3 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Campañas
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">{campaign.nombre}</h1>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
              {campaign.brand && (
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: campaign.brand.colorPrimario }} />
                  {campaign.brand.nombre}
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <Target className="w-4 h-4" /> {OBJETIVO_LABEL[campaign.objetivo] || campaign.objetivo}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <select
              value={campaign.status}
              disabled={updating}
              onChange={(e) => changeStatus(e.target.value as CampaignStatus)}
              className={`px-3 py-2 rounded-xl border text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30 ${sm.color}`}
            >
              {Object.entries(STATUS_META).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
            <button
              onClick={handleDelete}
              className="p-2.5 rounded-xl border bg-card hover:bg-red-500/10 text-muted-foreground hover:text-red-500"
              title="Eliminar campaña"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <InfoCard icon={Calendar} label="Inicio" value={fmtDate(campaign.fechaInicio)} />
        <InfoCard icon={Calendar} label="Fin" value={fmtDate(campaign.fechaFin)} />
        <InfoCard
          icon={Wallet}
          label="Presupuesto"
          value={campaign.presupuesto ? `${campaign.presupuesto} ${campaign.moneda}` : '—'}
        />
        <InfoCard icon={Megaphone} label="Posts" value={String(campaign.posts?.length ?? 0)} />
      </div>

      {/* KPIs */}
      {campaign.kpisObjetivo && Object.keys(campaign.kpisObjetivo).length > 0 && (
        <div className="rounded-2xl border bg-card p-6">
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-4">KPIs objetivo</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Object.entries(campaign.kpisObjetivo).map(([k, v]) => (
              <div key={k} className="text-center p-4 rounded-xl bg-muted/40">
                <div className="text-2xl font-extrabold tabular-nums">{v.toLocaleString('es-ES')}</div>
                <div className="text-xs text-muted-foreground mt-1">{KPI_LABEL[k] || k}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Brief */}
      {campaign.descripcion || campaign.briefCreativo ? (
        <div className="rounded-2xl border bg-card p-6 space-y-4">
          {campaign.descripcion && (
            <div>
              <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-2">Descripción</h2>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{campaign.descripcion}</p>
            </div>
          )}
          {campaign.briefCreativo && (
            <div>
              <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4" /> Brief creativo
              </h2>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{campaign.briefCreativo}</p>
            </div>
          )}
        </div>
      ) : null}

      {/* Posts */}
      <div className="rounded-2xl border bg-card p-6">
        <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-4">
          Posts de la campaña ({campaign.posts?.length ?? 0})
        </h2>
        {!campaign.posts || campaign.posts.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            Aún no hay posts en esta campaña. Asígnalos desde el pipeline de Social Posts.
            <div className="mt-3">
              <Link href="/dashboard/growth/social-posts" className="inline-flex items-center gap-1.5 text-primary text-sm font-semibold">
                Ir a Social Posts <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {campaign.posts.map((p) => (
              <div key={p.id} className="flex items-start gap-3 p-3 rounded-xl border hover:bg-muted/40 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm line-clamp-2">{p.content || <span className="italic text-muted-foreground">Sin contenido</span>}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                    {p.account && (
                      <span>{p.account.nombre} · {p.account.platform}</span>
                    )}
                    {p.scheduledAt && <span>· {fmtDate(p.scheduledAt)}</span>}
                  </div>
                </div>
                <span className="shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-muted">
                  {POST_STATUS_LABEL[p.status] || p.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function InfoCard({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="p-4 rounded-2xl border bg-card">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="w-3.5 h-3.5" /> {label}
      </div>
      <div className="mt-1.5 font-bold truncate">{value}</div>
    </div>
  );
}
