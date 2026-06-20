'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiClient } from '@/lib/api';
import Link from 'next/link';
import {
  ArrowLeft,
  Plus,
  Megaphone,
  Calendar,
  Target,
  ChevronRight,
} from 'lucide-react';

type CampaignStatus = 'PLANNING' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'ARCHIVED';

interface Campaign {
  id: string;
  nombre: string;
  slug: string;
  descripcion?: string;
  objetivo: string;
  status: CampaignStatus;
  fechaInicio?: string;
  fechaFin?: string;
  presupuesto?: string;
  moneda: string;
  colorTag: string;
  brand?: { nombre: string; colorPrimario: string };
  _count?: { posts: number };
}

const STATUS_META: Record<CampaignStatus, { label: string; color: string }> = {
  PLANNING: { label: 'Planificación', color: 'bg-amber-500/10 text-amber-600 border-amber-500/30' },
  ACTIVE: { label: 'Activa', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' },
  PAUSED: { label: 'Pausada', color: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/30' },
  COMPLETED: { label: 'Completada', color: 'bg-blue-500/10 text-blue-600 border-blue-500/30' },
  ARCHIVED: { label: 'Archivada', color: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30' },
};

const OBJETIVO_LABEL: Record<string, string> = {
  AWARENESS: 'Awareness',
  ENGAGEMENT: 'Engagement',
  CONVERSION: 'Conversión',
  TRAFFIC: 'Tráfico',
  LEADS: 'Leads',
  SALES: 'Ventas',
  UGC: 'UGC',
  LAUNCH: 'Lanzamiento',
};

export default function CampanasPage() {
  const [softwares, setSoftwares] = useState<Array<{ id: string; nombre: string }>>([]);
  const [softwareId, setSoftwareId] = useState('');
  const [brands, setBrands] = useState<Array<{ id: string; nombre: string }>>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [brandFilter, setBrandFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

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

  useEffect(() => {
    if (!softwareId) return;
    apiClient.getBrands(softwareId).then((r) => setBrands(r?.brands || [])).catch(() => setBrands([]));
  }, [softwareId]);

  const loadCampaigns = useCallback(async () => {
    if (!softwareId) return;
    setLoading(true);
    try {
      const params: Record<string, string> = { softwareId };
      if (brandFilter) params.brandId = brandFilter;
      if (statusFilter) params.status = statusFilter;
      const res = await apiClient.getCampaigns(params);
      setCampaigns(res?.campaigns || []);
    } catch {
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  }, [softwareId, brandFilter, statusFilter]);

  useEffect(() => {
    if (softwareId) loadCampaigns();
  }, [softwareId, loadCampaigns]);

  function fmtDate(d?: string) {
    if (!d) return null;
    return new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border bg-card p-6 sm:p-8">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Link
              href="/dashboard/growth"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-3 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Growth Engine
            </Link>
            <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
              <Megaphone className="w-8 h-8 text-primary" /> Campañas
            </h1>
            <p className="text-muted-foreground mt-2 max-w-xl">
              Organiza tus posts en campañas con objetivos, brief, presupuesto y KPIs.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <select
              value={softwareId}
              onChange={(e) => setSoftwareId(e.target.value)}
              className="px-4 py-2.5 rounded-xl border bg-card text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {softwares.map((s) => (
                <option key={s.id} value={s.id}>{s.nombre}</option>
              ))}
            </select>
            <Link
              href={`/dashboard/growth/campanas/nueva${softwareId ? `?softwareId=${softwareId}` : ''}`}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-primary/20"
            >
              <Plus className="w-4 h-4" /> Nueva campaña
            </Link>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={brandFilter}
          onChange={(e) => setBrandFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="">Todos los brands</option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>{b.nombre}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="">Todos los estados</option>
          {Object.entries(STATUS_META).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-40 rounded-2xl border bg-card animate-pulse" />
          ))}
        </div>
      ) : campaigns.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-card p-12 text-center">
          <Megaphone className="w-12 h-12 mx-auto text-muted-foreground/40" />
          <h3 className="mt-4 text-lg font-bold">Sin campañas</h3>
          <p className="text-muted-foreground mt-1">Crea una campaña para agrupar y planificar tus posts.</p>
          <Link
            href={`/dashboard/growth/campanas/nueva${softwareId ? `?softwareId=${softwareId}` : ''}`}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90"
          >
            <Plus className="w-4 h-4" /> Nueva campaña
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {campaigns.map((c) => {
            const sm = STATUS_META[c.status];
            return (
              <Link
                key={c.id}
                href={`/dashboard/growth/campanas/${c.id}`}
                className="group relative p-5 rounded-2xl border bg-card transition-all duration-300 hover:-translate-y-1 hover:shadow-xl overflow-hidden"
              >
                <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: c.colorTag }} />
                <div className="relative flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-bold leading-tight truncate">{c.nombre}</h3>
                    {c.brand && (
                      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.brand.colorPrimario }} />
                        {c.brand.nombre}
                      </span>
                    )}
                  </div>
                  <span className={`shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${sm.color}`}>
                    {sm.label}
                  </span>
                </div>

                {c.descripcion && (
                  <p className="relative mt-2.5 text-sm text-muted-foreground line-clamp-2">{c.descripcion}</p>
                )}

                <div className="relative mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Target className="w-3.5 h-3.5" /> {OBJETIVO_LABEL[c.objetivo] || c.objetivo}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Megaphone className="w-3.5 h-3.5" /> {c._count?.posts ?? 0} posts
                  </span>
                  {(c.fechaInicio || c.fechaFin) && (
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {fmtDate(c.fechaInicio) || '?'} → {fmtDate(c.fechaFin) || '?'}
                    </span>
                  )}
                </div>

                <ChevronRight className="absolute bottom-4 right-4 w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
