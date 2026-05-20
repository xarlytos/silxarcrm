'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import {
  Plus,
  FileText,
  Loader2,
  Send,
  Copy,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Filter,
  ExternalLink,
  Search,
} from 'lucide-react';

interface Propuesta {
  id: string;
  titulo: string;
  clienteNombre: string;
  clienteEmail: string | null;
  total: number;
  estado: string;
  urlToken: string;
  enviadaAt: string | null;
  aceptadaAt: string | null;
  createdAt: string;
}

const estadoConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  BORRADOR: { label: 'Borrador', color: 'bg-gray-100 text-gray-700 border-gray-200', icon: <FileText className="w-3.5 h-3.5" /> },
  ENVIADA: { label: 'Enviada', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: <Send className="w-3.5 h-3.5" /> },
  VISTA: { label: 'Vista', color: 'bg-purple-50 text-purple-700 border-purple-200', icon: <Eye className="w-3.5 h-3.5" /> },
  ACEPTADA: { label: 'Aceptada', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  RECHAZADA: { label: 'Rechazada', color: 'bg-red-50 text-red-700 border-red-200', icon: <XCircle className="w-3.5 h-3.5" /> },
  EXPIRADA: { label: 'Expirada', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: <Clock className="w-3.5 h-3.5" /> },
};

export default function PropuestasPage() {
  const router = useRouter();
  const [propuestas, setPropuestas] = useState<Propuesta[]>([]);
  const [loading, setLoading] = useState(true);
  const [estadoFilter, setEstadoFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionId, setActionId] = useState<string | null>(null);

  const fetchPropuestas = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), limit: '15' };
      if (estadoFilter) params.estado = estadoFilter;
      const res = await apiClient.getPropuestas(params);
      setPropuestas(res.data.propuestas || []);
      setTotalPages(res.data.pagination?.pages || 1);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [estadoFilter, page]);

  useEffect(() => {
    fetchPropuestas();
  }, [fetchPropuestas]);

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta propuesta?')) return;
    setActionId(id);
    try {
      await apiClient.deletePropuesta(id);
      await fetchPropuestas();
    } catch (err: any) {
      alert(err.message || 'Error');
    } finally {
      setActionId(null);
    }
  };

  const handleDuplicar = async (id: string) => {
    setActionId(id);
    try {
      await apiClient.duplicarPropuesta(id);
      await fetchPropuestas();
    } catch (err: any) {
      alert(err.message || 'Error');
    } finally {
      setActionId(null);
    }
  };

  const handleEnviar = async (id: string) => {
    setActionId(id);
    try {
      await apiClient.enviarPropuesta(id);
      await fetchPropuestas();
    } catch (err: any) {
      alert(err.message || 'Error');
    } finally {
      setActionId(null);
    }
  };

  const handleCopyLink = (token: string) => {
    const url = `${window.location.origin}/propuesta/${token}`;
    navigator.clipboard.writeText(url);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(Number(val));
  };

  const filtered = propuestas.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.titulo.toLowerCase().includes(q) ||
      p.clienteNombre.toLowerCase().includes(q) ||
      (p.clienteEmail?.toLowerCase() || '').includes(q)
    );
  });

  return (
    <div className="max-w-6xl mx-auto py-6 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <FileText className="w-5 h-5 text-violet-500" />
            Propuestas comerciales
          </h1>
          <p className="text-[13px] text-[var(--text-tertiary)] mt-0.5">
            Crea, envía y gestiona propuestas para tus clientes
          </p>
        </div>
        <button
          onClick={() => router.push('/dashboard/propuestas/nueva')}
          className="px-4 py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl text-[13px] font-medium hover:shadow-lg hover:shadow-violet-500/25 hover:opacity-90 transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nueva propuesta
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por titulo o cliente..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-violet-500/30"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
          {[
            { value: '', label: 'Todas' },
            { value: 'BORRADOR', label: 'Borradores' },
            { value: 'ENVIADA', label: 'Enviadas' },
            { value: 'VISTA', label: 'Vistas' },
            { value: 'ACEPTADA', label: 'Aceptadas' },
            { value: 'RECHAZADA', label: 'Rechazadas' },
          ].map((f) => (
            <button
              key={f.value}
              onClick={() => { setEstadoFilter(f.value); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-all ${
                estadoFilter === f.value
                  ? 'bg-violet-500 text-white border-violet-500'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-primary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-[var(--text-tertiary)]">
            <Loader2 className="w-6 h-6 animate-spin mb-3" />
            <span className="text-[14px]">Cargando propuestas...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] flex items-center justify-center mb-4">
              <FileText className="w-8 h-8 text-[var(--text-tertiary)]" />
            </div>
            <p className="text-[15px] text-[var(--text-secondary)] font-medium">
              {search || estadoFilter ? 'No hay propuestas con estos filtros' : 'No hay propuestas aun'}
            </p>
            <p className="text-[13px] text-[var(--text-tertiary)] mt-1">
              Crea tu primera propuesta comercial para un cliente
            </p>
            {!search && !estadoFilter && (
              <button
                onClick={() => router.push('/dashboard/propuestas/nueva')}
                className="mt-4 px-4 py-2 bg-violet-500 text-white rounded-xl text-[13px] font-medium hover:bg-violet-600 transition-colors"
              >
                Crear propuesta
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="divide-y divide-[var(--border-primary)]">
              {filtered.map((p) => {
                const cfg = estadoConfig[p.estado] || estadoConfig.BORRADOR;
                const isDraft = p.estado === 'BORRADOR';
                return (
                  <div key={p.id} className="px-5 py-4 hover:bg-[var(--bg-tertiary)]/40 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[15px] font-semibold text-[var(--text-primary)]">{p.titulo}</span>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border ${cfg.color}`}>
                            {cfg.icon}
                            {cfg.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-[12px] text-[var(--text-tertiary)]">
                          <span>{p.clienteNombre}</span>
                          {p.clienteEmail && <span>{p.clienteEmail}</span>}
                          <span>•</span>
                          <span className="font-semibold text-[var(--text-primary)]">{formatCurrency(p.total)}</span>
                          <span>•</span>
                          <span>{formatDate(p.createdAt)}</span>
                          {p.enviadaAt && (
                            <>
                              <span>•</span>
                              <span>Enviada {formatDate(p.enviadaAt)}</span>
                            </>
                          )}
                          {p.aceptadaAt && (
                            <>
                              <span>•</span>
                              <span className="text-emerald-600">Aceptada {formatDate(p.aceptadaAt)}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {isDraft && (
                          <>
                            <button
                              onClick={() => handleEnviar(p.id)}
                              disabled={actionId === p.id}
                              title="Enviar"
                              className="p-2 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
                            >
                              {actionId === p.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => router.push(`/dashboard/propuestas/${p.id}`)}
                              title="Editar"
                              className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {!isDraft && (
                          <>
                            <button
                              onClick={() => handleCopyLink(p.urlToken)}
                              title="Copiar enlace"
                              className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] transition-colors"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => router.push(`/dashboard/propuestas/${p.id}`)}
                              title="Ver"
                              className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleDuplicar(p.id)}
                          disabled={actionId === p.id}
                          title="Duplicar"
                          className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] transition-colors"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
                          disabled={actionId === p.id}
                          title="Eliminar"
                          className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 py-4 border-t border-[var(--border-primary)]">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-[13px] text-[var(--text-secondary)] px-3">
                  Pagina {page} de {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] disabled:opacity-30 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
