'use client';

import { useState } from 'react';
import { Lead, SpechLlamada } from '@/types';
import { Phone, X, FileText, AlertCircle } from 'lucide-react';
import SpechViewer from './SpechViewer';

interface LlamadaIniciarModalProps {
  lead: Lead;
  spechs: SpechLlamada[];
  defaultAgentPhone?: string;
  onCancel: () => void;
  onConfirm: (data: { spechId: string | null; telefonoAgente?: string }) => Promise<void>;
}

export default function LlamadaIniciarModal({
  lead,
  spechs,
  defaultAgentPhone,
  onCancel,
  onConfirm,
}: LlamadaIniciarModalProps) {
  const defaultSpech = spechs.find((s) => s.esDefault) || spechs[0];
  const [spechId, setSpechId] = useState<string | null>(defaultSpech?.id ?? null);
  const [telefonoAgente, setTelefonoAgente] = useState(defaultAgentPhone || '');
  const [submitting, setSubmitting] = useState(false);

  const spechSeleccionado = spechs.find((s) => s.id === spechId) || null;

  const handleConfirm = async () => {
    if (!lead.telefono) {
      alert('Este lead no tiene telefono');
      return;
    }
    setSubmitting(true);
    try {
      await onConfirm({
        spechId,
        telefonoAgente: telefonoAgente.trim() || undefined,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-[var(--bg-secondary)] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-[var(--border-primary)] flex items-center justify-between sticky top-0 bg-[var(--bg-secondary)] z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <Phone className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h3 className="text-[18px] font-semibold text-[var(--text-primary)]">
                Iniciar llamada
              </h3>
              <p className="text-[12px] text-[var(--text-tertiary)]">
                Tu telefono sonara primero, despues llamaremos al lead
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-2 rounded-lg text-[var(--text-tertiary)] hover:bg-[var(--bg-tertiary)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Lead info */}
          <div className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl p-4">
            <p className="text-[11px] text-[var(--text-tertiary)] uppercase tracking-wider mb-2">
              Llamando a
            </p>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-[16px] font-bold">
                {lead.nombre.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-semibold text-[var(--text-primary)]">
                  {lead.nombre}
                </p>
                {lead.empresa && (
                  <p className="text-[12px] text-[var(--text-tertiary)]">
                    {lead.empresa} {lead.cargo && `· ${lead.cargo}`}
                  </p>
                )}
              </div>
              <div className="text-right">
                {lead.telefono ? (
                  <p className="text-[15px] font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                    {lead.telefono}
                  </p>
                ) : (
                  <p className="text-[13px] text-amber-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Sin telefono
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Tu telefono */}
          <div>
            <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-1.5">
              Tu telefono <span className="text-[var(--text-tertiary)]">(opcional)</span>
            </label>
            <input
              type="tel"
              value={telefonoAgente}
              onChange={(e) => setTelefonoAgente(e.target.value)}
              placeholder="+34 600 000 000 (deja vacio para usar el default)"
              className="w-full px-4 py-2.5 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl text-[14px] text-[var(--text-primary)]"
            />
            <p className="text-[11px] text-[var(--text-tertiary)] mt-1">
              Recibiras la llamada en este numero. Cuando descuelgues, marcaremos al lead.
            </p>
          </div>

          {/* Spech */}
          <div>
            <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-1.5">
              Guion (spech) a usar
            </label>
            <select
              value={spechId || ''}
              onChange={(e) => setSpechId(e.target.value || null)}
              className="w-full px-4 py-2.5 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl text-[14px] text-[var(--text-primary)]"
            >
              <option value="">Sin guion (libre)</option>
              {spechs.filter((s) => s.activo).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.titulo} {s.esDefault ? '⭐' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Spech preview */}
          {spechSeleccionado && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-[var(--text-tertiary)]" />
                <p className="text-[13px] font-medium text-[var(--text-secondary)]">
                  Vista previa con datos del lead
                </p>
              </div>
              <div className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl p-4 max-h-[200px] overflow-y-auto">
                <SpechViewer spech={spechSeleccionado} lead={lead} />
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-[var(--border-primary)] flex items-center justify-end gap-2 sticky bottom-0 bg-[var(--bg-secondary)]">
          <button
            onClick={onCancel}
            disabled={submitting}
            className="px-4 py-2.5 rounded-xl text-[14px] font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={submitting || !lead.telefono}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl text-[14px] font-medium hover:shadow-lg hover:shadow-emerald-500/25 transition-all disabled:opacity-50"
          >
            <Phone className="w-4 h-4" />
            {submitting ? 'Iniciando...' : 'Llamar ahora'}
          </button>
        </div>
      </div>
    </div>
  );
}
