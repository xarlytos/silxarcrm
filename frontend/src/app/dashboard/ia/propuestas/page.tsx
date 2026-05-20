'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import {
  Check,
  X,
  Loader2,
  AlertCircle,
  RefreshCw,
  UserPlus,
  StickyNote,
  Calendar,
  MessageCircle,
  Clock,
  Filter,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ArrowLeft,
} from 'lucide-react';

interface Action {
  id: string;
  tipo: string;
  descripcion: string;
  estado: string;
  datosEntrada: any;
  error: string | null;
  ejecutadaAt: string | null;
  createdAt: string;
}

const estadoLabels: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  propuesta: { label: 'Pendiente', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: <Clock className="w-3 h-3" /> },
  confirmada: { label: 'Confirmada', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: <Check className="w-3 h-3" /> },
  ejecutada: { label: 'Completada', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: <Check className="w-3 h-3" /> },
  cancelada: { label: 'Cancelada', color: 'bg-gray-50 text-gray-600 border-gray-200', icon: <X className="w-3 h-3" /> },
  fallida: { label: 'Fallida', color: 'bg-red-50 text-red-700 border-red-200', icon: <AlertCircle className="w-3 h-3" /> },
};

const tipoLabels: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  create_lead: { label: 'Crear lead', icon: <UserPlus className="w-4 h-4" />, color: 'text-emerald-600 bg-emerald-50' },
  update_lead_status: { label: 'Cambiar estado', icon: <RefreshCw className="w-4 h-4" />, color: 'text-blue-600 bg-blue-50' },
  add_lead_note: { label: 'Añadir nota', icon: <StickyNote className="w-4 h-4" />, color: 'text-amber-600 bg-amber-50' },
  create_calendar_event: { label: 'Crear evento', icon: <Calendar className="w-4 h-4" />, color: 'text-purple-600 bg-purple-50' },
  send_whatsapp: { label: 'Enviar WhatsApp', icon: <MessageCircle className="w-4 h-4" />, color: 'text-green-600 bg-green-50' },
};

export default function PropuestasPage() {
  const router = useRouter();
  const [actions, setActions] = useState<Action[]>([]);
  const [loading, setLoading] = useState(true);
  const [estadoFilter, setEstadoFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [executingId, setExecutingId] = useState<string | null>(null);

  const fetchActions = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), limit: '15' };
      if (estadoFilter) params.estado = estadoFilter;
      const res = await apiClient.getActions(params);
      setActions(res.data.actions || []);
      setTotalPages(res.data.pagination?.pages || 1);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [estadoFilter, page]);

  useEffect(() => {
    fetchActions();
  }, [fetchActions]);

  const handleConfirm = async (id: string) => {
    setExecutingId(id);
    try {
      await apiClient.confirmAction(id);
      await fetchActions();
    } catch (err: any) {
      alert(err.message || 'Error');
    } finally {
      setExecutingId(null);
    }
  };

  const handleCancel = async (id: string) => {
    setExecutingId(id);
    try {
      await apiClient.cancelAction(id);
      await fetchActions();
    } catch (err: any) {
      alert(err.message || 'Error');
    } finally {
      setExecutingId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="max-w-5xl mx-auto py-6 px-4">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.push('/dashboard/ia')}
          className="p-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] hover:border-violet-500/30 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-[var(--text-secondary)]" />
        </button>
        <div>
          <h1 className="text-[22px] font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-violet-500" />
            Propuestas del Asistente IA
          </h1>
          <p className="text-[13px] text-[var(--text-tertiary)] mt-0.5">
            Gestiona las acciones propuestas por el asistente IA
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="flex items-center gap-1.5 text-[13px] text-[var(--text-secondary)] mr-2">
          <Filter className="w-3.5 h-3.5" />
          Filtrar:
        </div>
        {[
          { value: '', label: 'Todas' },
          { value: 'propuesta', label: 'Pendientes' },
          { value: 'ejecutada', label: 'Completadas' },
          { value: 'cancelada', label: 'Canceladas' },
          { value: 'fallida', label: 'Fallidas' },
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

      {/* List */}
      <div className="space-y-2">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-[var(--text-tertiary)]">
            <Loader2 className="w-6 h-6 animate-spin mb-3" />
            <span className="text-[14px]">Cargando propuestas...</span>
          </div>
        ) : actions.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-[var(--text-tertiary)]" />
            </div>
            <p className="text-[15px] text-[var(--text-secondary)] font-medium">
              {estadoFilter ? 'No hay propuestas con este filtro' : 'No hay propuestas aun'}
            </p>
            <p className="text-[13px] text-[var(--text-tertiary)] mt-1">
              Pidele al asistente IA que realice una accion para verla aqui
            </p>
          </div>
        ) : (
          actions.map((action) => {
            const estadoInfo = estadoLabels[action.estado] || estadoLabels.propuesta;
            const tipoInfo = tipoLabels[action.tipo] || { label: action.tipo, icon: <AlertCircle className="w-4 h-4" />, color: 'text-gray-600 bg-gray-50' };
            const isPending = action.estado === 'propuesta';

            return (
              <div
                key={action.id}
                className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${tipoInfo.color}`}>
                    {tipoInfo.icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[14px] font-semibold text-[var(--text-primary)]">
                        {tipoInfo.label}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border ${estadoInfo.color}`}>
                        {estadoInfo.icon}
                        {estadoInfo.label}
                      </span>
                    </div>

                    <p className="text-[13px] text-[var(--text-secondary)] mt-1 leading-relaxed">
                      {action.descripcion}
                    </p>

                    {/* Data preview */}
                    {action.datosEntrada && Object.keys(action.datosEntrada).length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {Object.entries(action.datosEntrada)
                          .filter(([k]) => !['leadId', 'nombreLead', 'estadoPrevio'].includes(k))
                          .slice(0, 4)
                          .map(([k, v]) => (
                            <span
                              key={k}
                              className="px-2 py-0.5 rounded-md bg-[var(--bg-tertiary)] text-[11px] text-[var(--text-tertiary)]"
                            >
                              {k}: {String(v).slice(0, 40)}
                            </span>
                          ))}
                      </div>
                    )}

                    {/* Error */}
                    {action.error && (
                      <p className="mt-2 text-[12px] text-red-600 bg-red-50 rounded-lg px-2.5 py-1.5">
                        {action.error}
                      </p>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-[11px] text-[var(--text-tertiary)]">
                        {formatDate(action.createdAt)}
                      </span>

                      {isPending && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleConfirm(action.id)}
                            disabled={executingId === action.id}
                            className="px-3 py-1.5 rounded-lg text-[12px] font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center gap-1.5"
                          >
                            {executingId === action.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Check className="w-3 h-3" />
                            )}
                            Confirmar
                          </button>
                          <button
                            onClick={() => handleCancel(action.id)}
                            disabled={executingId === action.id}
                            className="px-3 py-1.5 rounded-lg text-[12px] font-medium border border-[var(--border-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-50 transition-colors"
                          >
                            Cancelar
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
            className="p-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-primary)] hover:border-violet-500/30 disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-[13px] text-[var(--text-secondary)] px-3">
            Pagina {page} de {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || loading}
            className="p-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-primary)] hover:border-violet-500/30 disabled:opacity-30 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
