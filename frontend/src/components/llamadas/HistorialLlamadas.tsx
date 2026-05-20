'use client';

import { useEffect, useState } from 'react';
import { LlamadaReal } from '@/types';
import { apiClient } from '@/lib/api';
import { ESTADO_LABELS, ESTADO_COLORS, formatDuracion } from './spechHelpers';
import { Search, ChevronDown, ChevronRight, Phone, Star, FileText, Calendar, ChevronLeft } from 'lucide-react';
import AudioPlayer from './AudioPlayer';
import { formatDate } from '@/lib/utils';

interface HistorialLlamadasProps {
  softwareId?: string;
  reloadKey?: number;
}

const ESTADOS_FILTRO = [
  { value: '', label: 'Todos' },
  { value: 'completada', label: 'Completadas' },
  { value: 'no_contesta', label: 'No contestadas' },
  { value: 'fallida', label: 'Fallidas' },
  { value: 'cancelada', label: 'Canceladas' },
];

export default function HistorialLlamadas({ softwareId, reloadKey }: HistorialLlamadasProps) {
  const [llamadas, setLlamadas] = useState<LlamadaReal[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [estado, setEstado] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetch = async (page = 1) => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        page: String(page),
        limit: '20',
      };
      if (estado) params.estado = estado;
      if (search) params.search = search;
      if (softwareId) params.softwareId = softwareId;
      const res: any = await apiClient.getLlamadas(params);
      setLlamadas(res.data?.items || []);
      setPagination(res.data?.pagination || { page: 1, limit: 20, total: 0, pages: 0 });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado, softwareId, reloadKey]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetch(1);
  };

  return (
    <div className="space-y-4">
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl p-4">
        <form onSubmit={handleSearch} className="flex flex-wrap gap-2">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por lead o telefono..."
              className="w-full pl-10 pr-4 py-2 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl text-[13px] text-[var(--text-primary)]"
            />
          </div>
          <select
            value={estado}
            onChange={(e) => setEstado(e.target.value)}
            className="px-4 py-2 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl text-[13px] text-[var(--text-primary)]"
          >
            {ESTADOS_FILTRO.map((e) => (
              <option key={e.value} value={e.value}>
                {e.label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="px-4 py-2 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-xl text-[13px] font-medium"
          >
            Buscar
          </button>
        </form>
      </div>

      {loading && llamadas.length === 0 && (
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl p-12 text-center text-[var(--text-tertiary)]">
          <div className="w-6 h-6 border-2 border-[var(--border-primary)] border-t-[var(--text-primary)] rounded-full animate-spin mx-auto mb-2" />
          Cargando historial...
        </div>
      )}

      {!loading && llamadas.length === 0 && (
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl p-12 text-center text-[var(--text-tertiary)]">
          <Phone className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-[14px] font-medium">Sin llamadas registradas</p>
          <p className="text-[12px] mt-1">Las llamadas que hagas apareceran aqui</p>
        </div>
      )}

      {llamadas.length > 0 && (
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl overflow-hidden">
          <div className="divide-y divide-[var(--border-primary)]">
            {llamadas.map((l) => {
              const isExpanded = expanded === l.id;
              const colorBadge = ESTADO_COLORS[l.estado] || 'bg-slate-100 text-slate-700';
              const labelEstado = ESTADO_LABELS[l.estado] || l.estado;
              return (
                <div key={l.id}>
                  <button
                    onClick={() => setExpanded(isExpanded ? null : l.id)}
                    className="w-full px-4 py-3 hover:bg-[var(--bg-tertiary)]/30 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-[var(--text-tertiary)] shrink-0">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </div>
                      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-[12px] font-bold shrink-0">
                        {l.lead?.nombre?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-[14px] font-medium text-[var(--text-primary)] truncate">
                            {l.lead?.nombre || l.telefonoLead}
                          </p>
                          {l.calificacion && l.calificacion > 0 && (
                            <div className="flex items-center gap-0.5">
                              {Array.from({ length: l.calificacion }).map((_, i) => (
                                <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                              ))}
                            </div>
                          )}
                        </div>
                        <p className="text-[11px] text-[var(--text-tertiary)] flex items-center gap-1.5">
                          <Calendar className="w-3 h-3" />
                          {formatDate(l.createdAt)}
                          {l.duracionSeg ? ` · ${formatDuracion(l.duracionSeg)}` : ''}
                          {l.spech ? ` · ${l.spech.titulo}` : ''}
                        </p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-md text-[11px] font-medium ${colorBadge}`}>
                        {labelEstado}
                      </span>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="bg-[var(--bg-tertiary)]/40 px-12 py-4 space-y-3 border-t border-[var(--border-primary)]">
                      {l.lead && (
                        <div className="flex items-start gap-3 text-[13px]">
                          <span className="text-[var(--text-tertiary)] w-24 shrink-0">Lead</span>
                          <div>
                            <p className="text-[var(--text-primary)]">{l.lead.nombre}</p>
                            <p className="text-[11px] text-[var(--text-tertiary)]">
                              {l.lead.email}
                              {l.lead.empresa && ` · ${l.lead.empresa}`}
                            </p>
                          </div>
                        </div>
                      )}
                      <div className="flex items-start gap-3 text-[13px]">
                        <span className="text-[var(--text-tertiary)] w-24 shrink-0">Telefono</span>
                        <span className="text-[var(--text-primary)] font-mono">{l.telefonoLead}</span>
                      </div>
                      {l.leadEstadoPrev && l.leadEstadoPost && l.leadEstadoPrev !== l.leadEstadoPost && (
                        <div className="flex items-start gap-3 text-[13px]">
                          <span className="text-[var(--text-tertiary)] w-24 shrink-0">Estado lead</span>
                          <span className="text-emerald-600 dark:text-emerald-400">
                            {l.leadEstadoPrev} → {l.leadEstadoPost}
                          </span>
                        </div>
                      )}
                      {l.notasPost && (
                        <div className="flex items-start gap-3 text-[13px]">
                          <span className="text-[var(--text-tertiary)] w-24 shrink-0">Notas</span>
                          <p className="text-[var(--text-primary)] whitespace-pre-wrap flex-1">
                            {l.notasPost}
                          </p>
                        </div>
                      )}
                      {l.proximaAccion && (
                        <div className="flex items-start gap-3 text-[13px]">
                          <span className="text-[var(--text-tertiary)] w-24 shrink-0">Proxima accion</span>
                          <p className="text-[var(--text-primary)] flex-1">{l.proximaAccion}</p>
                        </div>
                      )}
                      {l.transcript && (
                        <div className="flex items-start gap-3 text-[13px]">
                          <span className="text-[var(--text-tertiary)] w-24 shrink-0 flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            Transcript
                          </span>
                          <p className="text-[var(--text-primary)] whitespace-pre-wrap flex-1">
                            {l.transcript}
                          </p>
                        </div>
                      )}
                      {l.grabacionUrl && (
                        <div className="flex items-start gap-3 text-[13px]">
                          <span className="text-[var(--text-tertiary)] w-24 shrink-0">Grabacion</span>
                          <div className="flex-1">
                            <AudioPlayer src={l.grabacionUrl} />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {pagination.pages > 1 && (
            <div className="px-4 py-3 border-t border-[var(--border-primary)] flex items-center justify-between">
              <p className="text-[12px] text-[var(--text-tertiary)]">
                {pagination.total} llamadas
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetch(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="p-1.5 rounded-lg border border-[var(--border-primary)] text-[var(--text-secondary)] disabled:opacity-30 hover:bg-[var(--bg-tertiary)]"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="text-[12px] text-[var(--text-secondary)] px-2">
                  {pagination.page} / {pagination.pages}
                </span>
                <button
                  onClick={() => fetch(pagination.page + 1)}
                  disabled={pagination.page >= pagination.pages}
                  className="p-1.5 rounded-lg border border-[var(--border-primary)] text-[var(--text-secondary)] disabled:opacity-30 hover:bg-[var(--bg-tertiary)]"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
