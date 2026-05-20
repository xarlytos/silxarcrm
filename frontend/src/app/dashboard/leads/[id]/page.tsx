'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { LeadWithDetail, LeadEstado } from '@/types';
import LeadStatusBadge from '@/components/leads/LeadStatusBadge';
import LeadPriorityBadge from '@/components/leads/LeadPriorityBadge';
import LeadIAAnalysis from '@/components/leads/LeadIAAnalysis';
import { formatDate, formatRelativeTime } from '@/lib/utils';
import {
  ArrowLeft,
  Mail,
  Phone,
  Building2,
  MapPin,
  Calendar,
  Tag,
  MessageSquare,
  CheckCircle,
  Clock,
  Edit3,
  Send,
  User,
  Users,
} from 'lucide-react';

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [lead, setLead] = useState<LeadWithDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [nota, setNota] = useState('');
  const [nuevoEstado, setNuevoEstado] = useState<LeadEstado>();
  const [motivo, setMotivo] = useState('');
  const [showEstadoModal, setShowEstadoModal] = useState(false);
  const [converting, setConverting] = useState(false);

  const fetchLead = async () => {
    try {
      const res = await apiClient.getLead(id);
      setLead(res.data);
    } catch {
      console.error('Error fetching lead');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLead();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleAddNota = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nota.trim()) return;
    try {
      await apiClient.addLeadHistorial(id, 'nota', nota.trim());
      setNota('');
      fetchLead();
    } catch {
      alert('Error agregando nota');
    }
  };

  const handleChangeEstado = async () => {
    if (!nuevoEstado) return;
    try {
      await apiClient.changeLeadStatus(id, nuevoEstado, motivo || undefined);
      setShowEstadoModal(false);
      setMotivo('');
      setNuevoEstado(undefined);
      fetchLead();
    } catch {
      alert('Error cambiando estado');
    }
  };

  const handleConvertir = async () => {
    if (!confirm('¿Convertir este lead a cliente?')) return;
    setConverting(true);
    try {
      await apiClient.convertLead(id);
      fetchLead();
    } catch {
      alert('Error convirtiendo lead');
    } finally {
      setConverting(false);
    }
  };

  const estados: LeadEstado[] = ['NUEVO', 'CONTACTADO', 'INTERESADO', 'EN_SEGUIMIENTO', 'CALIFICADO', 'RECHAZADO', 'NO_RESPONDE', 'CONVERTIDO'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-[var(--border-primary)] border-t-[var(--text-primary)] rounded-full animate-spin" />
          <span className="text-[var(--text-tertiary)]">Cargando lead...</span>
        </div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-[var(--bg-tertiary)] flex items-center justify-center">
            <Users className="w-8 h-8 text-[var(--text-tertiary)] opacity-50" />
          </div>
          <p className="text-[16px] font-medium text-[var(--text-secondary)]">Lead no encontrado</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/dashboard/leads')}
            className="p-2.5 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-[var(--text-secondary)]" />
          </button>
          <div>
            <h1 className="text-[32px] font-bold tracking-tight text-[var(--text-primary)]">
              {lead.nombre}
            </h1>
            <div className="flex items-center gap-2 mt-2">
              <LeadStatusBadge estado={lead.estado} />
              <LeadPriorityBadge prioridad={lead.prioridad} />
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowEstadoModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl text-[14px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-tertiary)] transition-all"
          >
            <Edit3 className="w-4 h-4" />
            Cambiar estado
          </button>
          {lead.estado !== 'CONVERTIDO' && (
            <button
              onClick={handleConvertir}
              disabled={converting}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl text-[14px] font-medium hover:shadow-lg hover:shadow-emerald-500/25 transition-all disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" />
              {converting ? 'Convirtiendo...' : 'Convertir a cliente'}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Info Card */}
        <div className="xl:col-span-1 space-y-6">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--border-primary)]">
              <h3 className="text-[16px] font-semibold text-[var(--text-primary)]">
                Información de contacto
              </h3>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-[var(--text-tertiary)]" />
                <span className="text-[14px] text-[var(--text-primary)]">{lead.email}</span>
              </div>
              {lead.telefono && (
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-[var(--text-tertiary)]" />
                  <span className="text-[14px] text-[var(--text-primary)]">{lead.telefono}</span>
                </div>
              )}
              {lead.empresa && (
                <div className="flex items-center gap-3">
                  <Building2 className="w-4 h-4 text-[var(--text-tertiary)]" />
                  <span className="text-[14px] text-[var(--text-primary)]">{lead.empresa}</span>
                </div>
              )}
              {lead.cargo && (
                <div className="flex items-center gap-3">
                  <Tag className="w-4 h-4 text-[var(--text-tertiary)]" />
                  <span className="text-[14px] text-[var(--text-primary)]">{lead.cargo}</span>
                </div>
              )}
              {lead.pais && (
                <div className="flex items-center gap-3">
                  <MapPin className="w-4 h-4 text-[var(--text-tertiary)]" />
                  <span className="text-[14px] text-[var(--text-primary)]">{lead.pais}</span>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-[var(--text-tertiary)]" />
                <span className="text-[14px] text-[var(--text-primary)]">Creado {formatDate(lead.createdAt)}</span>
              </div>
              {lead.ultimoContacto && (
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-[var(--text-tertiary)]" />
                  <span className="text-[14px] text-[var(--text-primary)]">Último contacto {formatDate(lead.ultimoContacto)}</span>
                </div>
              )}
              {lead.gestor && (
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-[var(--text-tertiary)]" />
                  <span className="text-[14px] text-[var(--text-primary)]">Asignado a {lead.gestor.nombre}</span>
                </div>
              )}
            </div>
          </div>

          {lead.notas && (
            <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-[var(--border-primary)]">
                <h3 className="text-[16px] font-semibold text-[var(--text-primary)]">Notas</h3>
              </div>
              <div className="p-5">
                <p className="text-[14px] text-[var(--text-secondary)] whitespace-pre-wrap">{lead.notas}</p>
              </div>
            </div>
          )}

          {/* Análisis IA */}
          <LeadIAAnalysis iaData={lead.metadata?.iaClassification} />
        </div>

        {/* Timeline */}
        <div className="xl:col-span-2 space-y-6">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--border-primary)]">
              <h3 className="text-[16px] font-semibold text-[var(--text-primary)]">Historial de actividad</h3>
            </div>
            <div className="p-5">
              {/* Add note */}
              <form onSubmit={handleAddNota} className="flex gap-3 mb-6">
                <input
                  value={nota}
                  onChange={(e) => setNota(e.target.value)}
                  placeholder="Agregar nota o registro..."
                  className="flex-1 px-4 py-2.5 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl text-[14px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-xl text-[14px] font-medium flex items-center gap-2 hover:opacity-90 transition-opacity"
                >
                  <Send className="w-4 h-4" />
                  Agregar
                </button>
              </form>

              <div className="space-y-4">
                {lead.historial.length === 0 && (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 rounded-2xl bg-[var(--bg-tertiary)] mx-auto mb-3 flex items-center justify-center">
                      <MessageSquare className="w-8 h-8 text-[var(--text-tertiary)] opacity-50" />
                    </div>
                    <p className="text-[16px] font-medium text-[var(--text-secondary)]">Sin actividad</p>
                    <p className="text-[14px] text-[var(--text-tertiary)]">Aún no hay registros para este lead</p>
                  </div>
                )}
                {lead.historial.map((h) => (
                  <div key={h.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-9 h-9 rounded-xl bg-[var(--bg-tertiary)] flex items-center justify-center">
                        <MessageSquare className="w-4 h-4 text-[var(--text-tertiary)]" />
                      </div>
                      <div className="w-px flex-1 bg-[var(--border-primary)] mt-2" />
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[13px] font-medium text-[var(--text-primary)] capitalize">
                          {h.tipo.replace('_', ' ')}
                        </span>
                        <span className="text-[12px] text-[var(--text-tertiary)]">
                          {formatRelativeTime(h.createdAt)}
                        </span>
                      </div>
                      <p className="text-[14px] text-[var(--text-secondary)]">{h.descripcion}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Estado Modal */}
      {showEstadoModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl p-6 w-full max-w-md space-y-4">
            <h3 className="text-[20px] font-semibold text-[var(--text-primary)]">Cambiar estado</h3>
            <select
              value={nuevoEstado || ''}
              onChange={(e) => setNuevoEstado(e.target.value as LeadEstado)}
              className="w-full px-4 py-2.5 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl text-[14px] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-violet-500/30"
            >
              <option value="">Seleccionar estado...</option>
              {estados.map((e) => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Motivo (opcional)..."
              rows={3}
              className="w-full px-4 py-2.5 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl text-[14px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-violet-500/30 resize-none"
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowEstadoModal(false)}
                className="px-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl text-[14px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-tertiary)] transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleChangeEstado}
                disabled={!nuevoEstado}
                className="px-4 py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl text-[14px] font-medium disabled:opacity-50 hover:shadow-lg hover:shadow-violet-500/25 transition-all"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
