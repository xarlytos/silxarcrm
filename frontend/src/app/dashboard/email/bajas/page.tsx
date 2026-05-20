'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import { ArrowLeft, ShieldOff, Search, RotateCcw, Download, ChevronLeft, ChevronRight } from 'lucide-react';

interface Baja {
  id: string;
  email: string;
  softwareId: string;
  motivo: string | null;
  ipOrigen: string | null;
  fecha: string;
}

const MOTIVO_LABELS: Record<string, string> = {
  no_relevante: 'No interesa',
  demasiados_emails: 'Demasiados emails',
  no_solicitado: 'No solicitado',
  spam_complaint: 'Marcó como spam',
  otro: 'Otro',
};

export default function BajasPage() {
  const [bajas, setBajas] = useState<Baja[]>([]);
  const [softwares, setSoftwares] = useState<{ saas: string }[]>([]);
  const [softwareFilter, setSoftwareFilter] = useState('');
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, pages: 0 });
  const [totalGlobal, setTotalGlobal] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        page: String(pagination.page),
        limit: String(pagination.limit),
      };
      if (softwareFilter) params.softwareId = softwareFilter;
      if (search) params.search = search;
      const res = await apiClient.getEmailBajas(params);
      setBajas(res.data.bajas);
      setPagination(res.data.pagination);
      setTotalGlobal(res.data.totalGlobal);
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
  }, [softwareFilter, pagination.page]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination((p) => ({ ...p, page: 1 }));
    load();
  };

  const handleRestore = async (b: Baja) => {
    if (!confirm(`¿Restaurar ${b.email}? Volverá a recibir emails de ${b.softwareId}.`)) return;
    try {
      await apiClient.deleteEmailBaja(b.id);
      load();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleExport = () => {
    const headers = 'email,software,motivo,fecha\n';
    const rows = bajas
      .map((b) => `${b.email},${b.softwareId},${b.motivo || ''},${b.fecha}`)
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bajas-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard/email" className="inline-flex items-center gap-1 text-[13px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] mb-2">
            <ArrowLeft className="w-3.5 h-3.5" /> Volver
          </Link>
          <h1 className="text-[28px] font-bold tracking-tight text-[var(--text-primary)]">Bajas</h1>
          <p className="text-[14px] text-[var(--text-secondary)] mt-1">
            Contactos que han cancelado suscripción. Excluidos automáticamente de futuras campañas.
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={bajas.length === 0}
          className="flex items-center gap-2 px-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl text-[14px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          Exportar CSV
        </button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl p-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <ShieldOff className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <p className="text-[28px] font-bold text-[var(--text-primary)] leading-none tabular-nums">{totalGlobal}</p>
              <p className="text-[13px] text-[var(--text-tertiary)] mt-1">Bajas totales</p>
            </div>
          </div>
        </div>
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl p-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <ShieldOff className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <p className="text-[28px] font-bold text-[var(--text-primary)] leading-none tabular-nums">{pagination.total}</p>
              <p className="text-[13px] text-[var(--text-tertiary)] mt-1">
                {softwareFilter ? `Bajas en ${softwareFilter}` : 'Bajas filtradas'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <form onSubmit={handleSearch} className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por email..."
            className="w-full pl-10 pr-4 py-2.5 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl text-[14px]"
          />
        </div>
        <select
          value={softwareFilter}
          onChange={(e) => { setSoftwareFilter(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }}
          className="px-4 py-2.5 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl text-[14px]"
        >
          <option value="">Todos los softwares</option>
          {softwares.map((s) => (<option key={s.saas} value={s.saas}>{s.saas}</option>))}
        </select>
        <button type="submit" className="px-5 py-2.5 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-xl text-[14px] font-medium">
          Buscar
        </button>
      </form>

      {/* List */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl overflow-hidden">
        {loading ? (
          <div className="px-6 py-12 text-center text-[var(--text-tertiary)]">Cargando...</div>
        ) : bajas.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[var(--bg-tertiary)] mx-auto mb-4 flex items-center justify-center">
              <ShieldOff className="w-8 h-8 text-[var(--text-tertiary)] opacity-50" />
            </div>
            <p className="text-[16px] text-[var(--text-secondary)] font-medium mb-1">Sin bajas</p>
            <p className="text-[13px] text-[var(--text-tertiary)]">Nadie ha cancelado la suscripción todavía.</p>
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border-primary)]">
                  <th className="text-left px-6 py-3 text-[12px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider">Email</th>
                  <th className="text-left px-6 py-3 text-[12px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider">Software</th>
                  <th className="text-left px-6 py-3 text-[12px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider">Motivo</th>
                  <th className="text-left px-6 py-3 text-[12px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider">Fecha</th>
                  <th className="text-right px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-primary)]">
                {bajas.map((b) => (
                  <tr key={b.id} className="group hover:bg-[var(--bg-tertiary)]/30">
                    <td className="px-6 py-3 text-[13px] font-mono text-[var(--text-primary)]">{b.email}</td>
                    <td className="px-6 py-3 text-[12px] text-[var(--text-tertiary)] capitalize">{b.softwareId}</td>
                    <td className="px-6 py-3">
                      {b.motivo ? (
                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-medium ${
                          b.motivo === 'spam_complaint'
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                            : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
                        }`}>
                          {MOTIVO_LABELS[b.motivo] || b.motivo}
                        </span>
                      ) : (
                        <span className="text-[12px] text-[var(--text-tertiary)]">—</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-[12px] text-[var(--text-tertiary)]">
                      {new Date(b.fecha).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <button
                        onClick={() => handleRestore(b)}
                        title="Restaurar contacto"
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-[var(--text-tertiary)] hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {pagination.pages > 1 && (
              <div className="px-6 py-3 border-t border-[var(--border-primary)] flex items-center justify-between text-[12px]">
                <span className="text-[var(--text-tertiary)]">{pagination.total} bajas</span>
                <div className="flex gap-2 items-center">
                  <button
                    onClick={() => setPagination((p) => ({ ...p, page: Math.max(1, p.page - 1) }))}
                    disabled={pagination.page <= 1}
                    className="p-1.5 rounded-lg border border-[var(--border-primary)] disabled:opacity-30"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span>{pagination.page} / {pagination.pages}</span>
                  <button
                    onClick={() => setPagination((p) => ({ ...p, page: Math.min(p.pages, p.page + 1) }))}
                    disabled={pagination.page >= pagination.pages}
                    className="p-1.5 rounded-lg border border-[var(--border-primary)] disabled:opacity-30"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
