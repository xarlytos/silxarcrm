'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { apiClient } from '@/lib/api';
import type { Landing, LandingEstado, LandingStats } from '@/types';
import {
  Globe,
  Plus,
  ExternalLink,
  Pencil,
  Trash2,
  Eye,
  MousePointerClick,
  Users,
  CheckCircle2,
  Inbox,
  X,
} from 'lucide-react';

type FormState = {
  id?: string;
  softwareId: string;
  nombre: string;
  slug: string;
  url: string;
  descripcion: string;
  estado: LandingEstado;
  visitas: number;
  conversiones: number;
  leadsGenerados: number;
};

const EMPTY_FORM: FormState = {
  softwareId: '',
  nombre: '',
  slug: '',
  url: '',
  descripcion: '',
  estado: 'BORRADOR',
  visitas: 0,
  conversiones: 0,
  leadsGenerados: 0,
};

export default function LandingsPage() {
  const [landings, setLandings] = useState<Landing[]>([]);
  const [stats, setStats] = useState<LandingStats>({
    total: 0,
    publicadas: 0,
    visitasTotales: 0,
    conversionesTotales: 0,
    leadsGenerados: 0,
  });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [listRes, statsRes] = await Promise.all([
        apiClient.getLandings({ limit: '100' }),
        apiClient.getLandingStats(),
      ]);
      setLandings(listRes.data.landings || []);
      setStats(statsRes.data || stats);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setError(null);
    setShowModal(true);
  };

  const openEdit = (l: Landing) => {
    setForm({
      id: l.id,
      softwareId: l.softwareId,
      nombre: l.nombre,
      slug: l.slug,
      url: l.url,
      descripcion: l.descripcion || '',
      estado: l.estado,
      visitas: l.visitas,
      conversiones: l.conversiones,
      leadsGenerados: l.leadsGenerados,
    });
    setError(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        softwareId: form.softwareId.trim(),
        nombre: form.nombre.trim(),
        slug: form.slug.trim(),
        url: form.url.trim(),
        descripcion: form.descripcion.trim() || undefined,
        estado: form.estado,
        visitas: Number(form.visitas) || 0,
        conversiones: Number(form.conversiones) || 0,
        leadsGenerados: Number(form.leadsGenerados) || 0,
      };
      if (form.id) {
        await apiClient.updateLanding(form.id, payload);
      } else {
        await apiClient.createLanding(payload);
      }
      setShowModal(false);
      await load();
    } catch (err) {
      setError((err as Error).message || 'Error guardando landing');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (l: Landing) => {
    if (!confirm(`¿Eliminar la landing "${l.nombre}"?`)) return;
    try {
      await apiClient.deleteLanding(l.id);
      await load();
    } catch (err) {
      alert((err as Error).message || 'Error eliminando');
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
              <Globe className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-[32px] font-bold tracking-tight text-[var(--text-primary)]">Landings</h1>
          </div>
          <p className="text-[15px] text-[var(--text-secondary)]">
            Catálogo de landing pages con tracking de visitas, conversiones y leads.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-violet-600 text-white rounded-xl text-[14px] font-medium hover:shadow-lg hover:shadow-violet-500/25 transition-all"
        >
          <Plus className="w-4 h-4" />
          Nueva landing
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KpiCard icon={Globe} label="Total landings" value={stats.total} color="blue" />
        <KpiCard icon={CheckCircle2} label="Publicadas" value={stats.publicadas} color="emerald" />
        <KpiCard icon={Eye} label="Visitas" value={stats.visitasTotales} color="violet" />
        <KpiCard icon={MousePointerClick} label="Conversiones" value={stats.conversionesTotales} color="orange" />
        <KpiCard icon={Users} label="Leads generados" value={stats.leadsGenerados} color="emerald" />
      </div>

      {/* Tabla */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-[var(--border-primary)] flex items-center justify-between">
          <h2 className="text-[18px] font-semibold text-[var(--text-primary)]">Listado</h2>
          <span className="text-[13px] text-[var(--text-tertiary)]">{landings.length}</span>
        </div>

        {loading ? (
          <div className="px-6 py-12 text-center text-[var(--text-tertiary)]">Cargando...</div>
        ) : landings.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[var(--bg-tertiary)] mx-auto mb-4 flex items-center justify-center">
              <Inbox className="w-8 h-8 text-[var(--text-tertiary)] opacity-50" />
            </div>
            <p className="text-[16px] text-[var(--text-secondary)] font-medium mb-1">Sin landings todavía</p>
            <p className="text-[13px] text-[var(--text-tertiary)] mb-4">
              Registra tu primera landing page para empezar a medir su rendimiento.
            </p>
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-violet-600 text-white rounded-lg text-[13px] font-medium"
            >
              <Plus className="w-4 h-4" />
              Crear landing
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border-primary)]">
                <Th>Nombre</Th>
                <Th>URL</Th>
                <Th>Software</Th>
                <Th>Estado</Th>
                <Th>Visitas</Th>
                <Th>Conversiones</Th>
                <Th>Leads</Th>
                <Th>Acciones</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-primary)]">
              {landings.map((l) => {
                const tasa = l.visitas > 0 ? ((l.conversiones / l.visitas) * 100).toFixed(1) : '–';
                return (
                  <tr key={l.id} className="hover:bg-[var(--bg-tertiary)]/30">
                    <td className="px-6 py-4">
                      <div className="text-[14px] font-medium text-[var(--text-primary)]">{l.nombre}</div>
                      <div className="text-[12px] text-[var(--text-tertiary)]">/{l.slug}</div>
                    </td>
                    <td className="px-6 py-4">
                      <a
                        href={l.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[13px] text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 max-w-[240px] truncate"
                      >
                        <span className="truncate">{l.url}</span>
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    </td>
                    <td className="px-6 py-4 text-[13px] text-[var(--text-secondary)]">{l.softwareId}</td>
                    <td className="px-6 py-4">
                      <EstadoBadge estado={l.estado} />
                    </td>
                    <td className="px-6 py-4 text-[14px] tabular-nums text-[var(--text-primary)]">{l.visitas}</td>
                    <td className="px-6 py-4 text-[14px] tabular-nums text-[var(--text-primary)]">
                      {l.conversiones}
                      <span className="ml-2 text-[11px] text-[var(--text-tertiary)]">{tasa !== '–' ? `${tasa}%` : ''}</span>
                    </td>
                    <td className="px-6 py-4 text-[14px] tabular-nums text-[var(--text-primary)]">{l.leadsGenerados}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEdit(l)}
                          className="p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                          title="Editar"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(l)}
                          className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <form
            onSubmit={handleSubmit}
            className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto"
          >
            <div className="px-6 py-4 border-b border-[var(--border-primary)] flex items-center justify-between">
              <h3 className="text-[18px] font-semibold text-[var(--text-primary)]">
                {form.id ? 'Editar landing' : 'Nueva landing'}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {error && (
                <div className="px-3 py-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-[13px] rounded-lg">
                  {error}
                </div>
              )}
              <Field label="Nombre" required>
                <input
                  required
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  className="input"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Slug" required>
                  <input
                    required
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value })}
                    className="input"
                    placeholder="mi-landing"
                  />
                </Field>
                <Field label="Software ID" required>
                  <input
                    required
                    value={form.softwareId}
                    onChange={(e) => setForm({ ...form, softwareId: e.target.value })}
                    className="input"
                    placeholder="ej: peluguau"
                  />
                </Field>
              </div>
              <Field label="URL" required>
                <input
                  required
                  type="url"
                  value={form.url}
                  onChange={(e) => setForm({ ...form, url: e.target.value })}
                  className="input"
                  placeholder="https://..."
                />
              </Field>
              <Field label="Descripción">
                <textarea
                  value={form.descripcion}
                  onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                  className="input min-h-[70px]"
                />
              </Field>
              <Field label="Estado">
                <select
                  value={form.estado}
                  onChange={(e) => setForm({ ...form, estado: e.target.value as LandingEstado })}
                  className="input"
                >
                  <option value="BORRADOR">Borrador</option>
                  <option value="PUBLICADA">Publicada</option>
                  <option value="PAUSADA">Pausada</option>
                </select>
              </Field>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Visitas">
                  <input
                    type="number"
                    min={0}
                    value={form.visitas}
                    onChange={(e) => setForm({ ...form, visitas: parseInt(e.target.value) || 0 })}
                    className="input"
                  />
                </Field>
                <Field label="Conversiones">
                  <input
                    type="number"
                    min={0}
                    value={form.conversiones}
                    onChange={(e) => setForm({ ...form, conversiones: parseInt(e.target.value) || 0 })}
                    className="input"
                  />
                </Field>
                <Field label="Leads">
                  <input
                    type="number"
                    min={0}
                    value={form.leadsGenerados}
                    onChange={(e) => setForm({ ...form, leadsGenerados: parseInt(e.target.value) || 0 })}
                    className="input"
                  />
                </Field>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-[var(--border-primary)] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-lg text-[13px] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-violet-600 text-white rounded-lg text-[13px] font-medium disabled:opacity-50"
              >
                {saving ? 'Guardando...' : form.id ? 'Guardar cambios' : 'Crear'}
              </button>
            </div>
          </form>
        </div>
      )}

      <style jsx>{`
        .input {
          width: 100%;
          padding: 8px 12px;
          border-radius: 8px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-primary);
          color: var(--text-primary);
          font-size: 13.5px;
          outline: none;
        }
        .input:focus {
          border-color: rgb(59 130 246 / 0.5);
          box-shadow: 0 0 0 3px rgb(59 130 246 / 0.1);
        }
      `}</style>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="text-left px-6 py-4 text-[13px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
      {children}
    </th>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[12px] font-medium text-[var(--text-secondary)] mb-1.5 block">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      {children}
    </label>
  );
}

function KpiCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    emerald: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
    violet: 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400',
    orange: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
    red: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
  };
  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl p-5">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colors[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <p className="text-[28px] font-bold text-[var(--text-primary)] leading-none tabular-nums">{value}</p>
          <p className="text-[13px] text-[var(--text-tertiary)] mt-1">{label}</p>
        </div>
      </div>
    </div>
  );
}

function EstadoBadge({ estado }: { estado: LandingEstado }) {
  const map: Record<LandingEstado, string> = {
    BORRADOR: 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]',
    PUBLICADA: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
    PAUSADA: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
  };
  const labels: Record<LandingEstado, string> = {
    BORRADOR: 'Borrador',
    PUBLICADA: 'Publicada',
    PAUSADA: 'Pausada',
  };
  return (
    <span className={`px-2.5 py-1 rounded-lg text-[12px] font-medium ${map[estado]}`}>{labels[estado]}</span>
  );
}
