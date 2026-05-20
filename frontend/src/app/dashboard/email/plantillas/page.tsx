'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { ArrowLeft, FileText, Plus, Copy, Trash2, Edit3, Search, Sparkles, Wand2 } from 'lucide-react';

interface Plantilla {
  id: string;
  softwareId: string;
  nombre: string;
  asunto: string;
  cuerpoHtml: string;
  variables: string[];
  tipo: string;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

const TIPOS_PLANTILLA: { value: string; label: string; color: string }[] = [
  { value: 'cold_outreach', label: 'Cold Outreach', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  { value: 'follow_up', label: 'Follow-up', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  { value: 'newsletter', label: 'Newsletter', color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300' },
  { value: 'onboarding', label: 'Onboarding', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  { value: 'reengagement', label: 'Re-engagement', color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300' },
  { value: 'promotional', label: 'Promocional', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
  { value: 'custom', label: 'Personalizada', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
];

export default function PlantillasPage() {
  const router = useRouter();
  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
  const [softwares, setSoftwares] = useState<{ saas: string }[]>([]);
  const [softwareFilter, setSoftwareFilter] = useState('');
  const [tipoFilter, setTipoFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiClient.getEmailPlantillas(softwareFilter || undefined, tipoFilter || undefined);
      setPlantillas(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    apiClient.getSaasList().then((r) => setSoftwares(r.data)).catch(() => setSoftwares([]));
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [softwareFilter, tipoFilter]);

  const handleDelete = async (id: string, nombre: string) => {
    if (!confirm(`¿Archivar plantilla "${nombre}"?`)) return;
    try {
      await apiClient.deleteEmailPlantilla(id);
      load();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDuplicate = async (p: Plantilla) => {
    try {
      const res = await apiClient.createEmailPlantilla({
        softwareId: p.softwareId,
        nombre: `${p.nombre} (copia)`,
        asunto: p.asunto,
        cuerpoHtml: p.cuerpoHtml,
        variables: p.variables,
        tipo: p.tipo,
      });
      router.push(`/dashboard/email/plantillas/${res.data.id}`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  let filtered = plantillas;
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter((p) =>
      p.nombre.toLowerCase().includes(q) ||
      p.asunto.toLowerCase().includes(q) ||
      p.tipo.toLowerCase().includes(q)
    );
  }

  const tipoBadge = (tipo: string) => {
    const t = TIPOS_PLANTILLA.find((x) => x.value === tipo);
    return t || { label: tipo, color: 'bg-gray-100 text-gray-700' };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard/email" className="inline-flex items-center gap-1 text-[13px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] mb-2">
            <ArrowLeft className="w-3.5 h-3.5" /> Volver
          </Link>
          <h1 className="text-[28px] font-bold tracking-tight text-[var(--text-primary)]">Plantillas</h1>
          <p className="text-[14px] text-[var(--text-secondary)] mt-1">
            Reutiliza asuntos y cuerpos con variables. Genera automáticamente con IA.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/email/plantillas/nueva?generar=ia"
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl text-[14px] font-medium hover:shadow-lg transition-all"
          >
            <Wand2 className="w-4 h-4" />
            Generar con IA
          </Link>
          <Link
            href="/dashboard/email/plantillas/nueva"
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-violet-600 text-white rounded-xl text-[14px] font-medium hover:shadow-lg transition-all"
          >
            <Plus className="w-4 h-4" />
            Nueva plantilla
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, asunto o tipo..."
            className="w-full pl-10 pr-4 py-2.5 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl text-[14px]"
          />
        </div>
        <select
          value={softwareFilter}
          onChange={(e) => setSoftwareFilter(e.target.value)}
          className="px-4 py-2.5 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl text-[14px]"
        >
          <option value="">Todos los softwares</option>
          {softwares.map((s) => (
            <option key={s.saas} value={s.saas}>{s.saas}</option>
          ))}
        </select>
        <select
          value={tipoFilter}
          onChange={(e) => setTipoFilter(e.target.value)}
          className="px-4 py-2.5 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl text-[14px]"
        >
          <option value="">Todos los tipos</option>
          {TIPOS_PLANTILLA.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      {/* Count */}
      <div className="flex items-baseline gap-3">
        <span className="text-[20px] font-bold text-[var(--text-primary)] tabular-nums">{filtered.length}</span>
        <span className="text-[13px] text-[var(--text-secondary)]">
          {filtered.length === 1 ? 'plantilla' : 'plantillas'}
        </span>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl px-6 py-12 text-center text-[var(--text-tertiary)]">
          Cargando...
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-[var(--bg-secondary)] border border-dashed border-[var(--border-primary)] rounded-2xl p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[var(--bg-tertiary)] mx-auto mb-4 flex items-center justify-center">
            <FileText className="w-8 h-8 text-[var(--text-tertiary)] opacity-50" />
          </div>
          <p className="text-[16px] text-[var(--text-secondary)] font-medium mb-2">Sin plantillas</p>
          <p className="text-[14px] text-[var(--text-tertiary)] mb-6">Crea la primera para reutilizarla en campañas.</p>
          <Link
            href="/dashboard/email/plantillas/nueva"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--text-primary)] text-[var(--bg-primary)] text-[13px] font-medium rounded-xl"
          >
            <Plus className="w-4 h-4" />
            Crear plantilla
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <div
              key={p.id}
              className="group bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl p-5 hover:border-[var(--text-tertiary)] transition-all"
            >
              <Link href={`/dashboard/email/plantillas/${p.id}`} className="block">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/10 to-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-violet-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[15px] font-semibold text-[var(--text-primary)] truncate">{p.nombre}</h3>
                    <p className="text-[12px] text-[var(--text-tertiary)] capitalize">{p.softwareId}</p>
                  </div>
                </div>
                <div className="mb-2">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${tipoBadge(p.tipo).color}`}>
                    {tipoBadge(p.tipo).label}
                  </span>
                </div>
                <p className="text-[13px] text-[var(--text-secondary)] line-clamp-2 mb-3 font-mono">{p.asunto}</p>
                {p.variables && p.variables.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {p.variables.slice(0, 4).map((v) => (
                      <span key={v} className="px-1.5 py-0.5 rounded bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-[10px] font-mono">
                        {`{{${v}}}`}
                      </span>
                    ))}
                    {p.variables.length > 4 && (
                      <span className="px-1.5 py-0.5 text-[10px] text-[var(--text-tertiary)]">+{p.variables.length - 4}</span>
                    )}
                  </div>
                )}
              </Link>
              <div className="flex items-center justify-between pt-3 border-t border-[var(--border-primary)]">
                <span className="text-[11px] text-[var(--text-tertiary)]">
                  {new Date(p.updatedAt).toLocaleDateString('es-ES')}
                </span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Link
                    href={`/dashboard/email/plantillas/${p.id}`}
                    title="Editar"
                    className="p-1.5 text-[var(--text-tertiary)] hover:text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-900/30 rounded-lg"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </Link>
                  <button
                    onClick={() => handleDuplicate(p)}
                    title="Duplicar"
                    className="p-1.5 text-[var(--text-tertiary)] hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(p.id, p.nombre)}
                    title="Archivar"
                    className="p-1.5 text-[var(--text-tertiary)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
