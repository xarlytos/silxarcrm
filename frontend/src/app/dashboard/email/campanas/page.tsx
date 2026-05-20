'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import { ArrowLeft, Plus, Send, Eye, MousePointerClick, AlertCircle, Loader2, Rocket } from 'lucide-react';

interface Campana {
  id: string;
  softwareId: string;
  nombre: string;
  estado: string;
  totalLeads: number;
  enviados: number;
  abiertos: number;
  clicks: number;
  rebotes: number;
  iniciadaEn?: string | null;
  completadaEn?: string | null;
  createdAt: string;
  sender: { email: string; nombre: string };
  plantilla: { nombre: string } | null;
}

const ESTADO_COLORS: Record<string, string> = {
  borrador: 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]',
  enviando: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  enviada: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
  cancelada: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
  error: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
};

export default function CampanasListPage() {
  const [campanas, setCampanas] = useState<Campana[]>([]);
  const [softwares, setSoftwares] = useState<{ saas: string }[]>([]);
  const [softwareFilter, setSoftwareFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiClient.getEmailCampanas(softwareFilter ? { softwareId: softwareFilter } : {});
      setCampanas(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    apiClient.getSaasList().then((r) => setSoftwares(r.data)).catch(() => undefined);
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [softwareFilter]);

  // Polling para campañas activas
  useEffect(() => {
    const hasActive = campanas.some((c) => c.estado === 'enviando');
    if (!hasActive) return;
    const id = setInterval(load, 3000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campanas]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard/email" className="inline-flex items-center gap-1 text-[13px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] mb-2">
            <ArrowLeft className="w-3.5 h-3.5" /> Volver
          </Link>
          <h1 className="text-[28px] font-bold tracking-tight text-[var(--text-primary)]">Campañas</h1>
          <p className="text-[14px] text-[var(--text-secondary)] mt-1">Envíos masivos con tracking de apertura y clicks.</p>
        </div>
        <Link
          href="/dashboard/email/campanas/nueva"
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-violet-600 text-white rounded-xl text-[14px] font-medium hover:shadow-lg"
        >
          <Plus className="w-4 h-4" />
          Nueva campaña
        </Link>
      </div>

      <select
        value={softwareFilter}
        onChange={(e) => setSoftwareFilter(e.target.value)}
        className="px-4 py-2.5 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl text-[14px]"
      >
        <option value="">Todos los softwares</option>
        {softwares.map((s) => (<option key={s.saas} value={s.saas}>{s.saas}</option>))}
      </select>

      {loading ? (
        <div className="text-center py-12 text-[var(--text-tertiary)]">Cargando...</div>
      ) : campanas.length === 0 ? (
        <div className="bg-[var(--bg-secondary)] border border-dashed border-[var(--border-primary)] rounded-2xl p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[var(--bg-tertiary)] mx-auto mb-4 flex items-center justify-center">
            <Rocket className="w-8 h-8 text-[var(--text-tertiary)] opacity-50" />
          </div>
          <p className="text-[16px] text-[var(--text-secondary)] font-medium mb-2">Sin campañas</p>
          <p className="text-[14px] text-[var(--text-tertiary)] mb-6">Lanza la primera para empezar con outreach masivo.</p>
          <Link
            href="/dashboard/email/campanas/nueva"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--text-primary)] text-[var(--bg-primary)] text-[13px] font-medium rounded-xl"
          >
            <Plus className="w-4 h-4" />
            Nueva campaña
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {campanas.map((c) => {
            const openRate = c.enviados > 0 ? Math.round((c.abiertos / c.enviados) * 100) : 0;
            const progress = c.totalLeads > 0 ? Math.round((c.enviados / c.totalLeads) * 100) : 0;
            return (
              <Link
                key={c.id}
                href={`/dashboard/email/campanas/${c.id}`}
                className="block bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl p-5 hover:border-[var(--text-tertiary)] transition-all"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-[16px] font-semibold text-[var(--text-primary)]">{c.nombre}</h3>
                      <span className={`px-2 py-0.5 rounded-md text-[11px] font-medium capitalize flex items-center gap-1 ${ESTADO_COLORS[c.estado] || ''}`}>
                        {c.estado === 'enviando' && <Loader2 className="w-3 h-3 animate-spin" />}
                        {c.estado}
                      </span>
                    </div>
                    <p className="text-[12px] text-[var(--text-tertiary)]">
                      {c.sender?.email} · {c.plantilla?.nombre || '—'} · <span className="capitalize">{c.softwareId}</span>
                    </p>
                  </div>
                  <span className="text-[11px] text-[var(--text-tertiary)]">
                    {new Date(c.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                  </span>
                </div>

                {/* Progress bar */}
                {c.estado === 'enviando' && (
                  <div className="mb-3">
                    <div className="h-1.5 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-blue-500 to-violet-500 transition-all" style={{ width: `${progress}%` }} />
                    </div>
                    <p className="text-[11px] text-[var(--text-tertiary)] mt-1">{c.enviados} / {c.totalLeads} ({progress}%)</p>
                  </div>
                )}

                {/* Metrics */}
                <div className="grid grid-cols-4 gap-3">
                  <Metric icon={Send} label="Enviados" value={`${c.enviados}/${c.totalLeads}`} />
                  <Metric icon={Eye} label="Aperturas" value={`${c.abiertos} (${openRate}%)`} />
                  <Metric icon={MousePointerClick} label="Clicks" value={c.clicks} />
                  <Metric icon={AlertCircle} label="Rebotes" value={c.rebotes} />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: any; label: string; value: any }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
      <div>
        <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider">{label}</p>
        <p className="text-[13px] font-semibold text-[var(--text-primary)] tabular-nums">{value}</p>
      </div>
    </div>
  );
}
