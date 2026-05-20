'use client';

import { useEffect, useRef, useState } from 'react';
import { LlamadaReal, LeadEstado, SpechLlamada, Lead } from '@/types';
import { apiClient } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { ESTADO_LABELS, ESTADO_COLORS, formatDuracion } from './spechHelpers';
import { Phone, Star, FileText, Save, MessageCircleQuestion, ChevronDown } from 'lucide-react';
import SpechViewer from './SpechViewer';
import AudioPlayer from './AudioPlayer';

interface LlamadaEnVivoProps {
  llamada: LlamadaReal;
  spech?: SpechLlamada | null;
  lead?: Lead | null;
  onUpdated?: (llamada: LlamadaReal) => void;
  onClose?: () => void;
}

const ESTADOS_LEAD: LeadEstado[] = [
  'NUEVO',
  'CONTACTADO',
  'INTERESADO',
  'EN_SEGUIMIENTO',
  'CALIFICADO',
  'RECHAZADO',
  'NO_RESPONDE',
  'CONVERTIDO',
];

const ESTADOS_TERMINAL = ['completada', 'fallida', 'no_contesta', 'cancelada'];

export default function LlamadaEnVivo({ llamada: initial, spech, lead, onUpdated, onClose }: LlamadaEnVivoProps) {
  const [llamada, setLlamada] = useState<LlamadaReal>(initial);
  const [notas, setNotas] = useState(initial.notasPost || '');
  const [calificacion, setCalificacion] = useState<number>(initial.calificacion || 0);
  const [proximaAccion, setProximaAccion] = useState(initial.proximaAccion || '');
  const [nuevoEstadoLead, setNuevoEstadoLead] = useState<LeadEstado | ''>('');
  const [tick, setTick] = useState(0);
  const [saving, setSaving] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(initial.grabacionUrl || null);
  const [objecionExpandida, setObjecionExpandida] = useState<number | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isTerminal = ESTADOS_TERMINAL.includes(llamada.estado);
  const isEnCurso = llamada.estado === 'en_curso';

  useEffect(() => {
    setLlamada(initial);
    setNotas(initial.notasPost || '');
    setCalificacion(initial.calificacion || 0);
    setProximaAccion(initial.proximaAccion || '');
    setAudioUrl(initial.grabacionUrl || null);
  }, [initial.id]);

  useEffect(() => {
    const socket = getSocket();
    socket.emit('join_llamadas');

    const onUpdate = (payload: any) => {
      if (!payload || payload.id !== llamada.id) return;
      setLlamada((prev) => ({ ...prev, ...payload }));
      if (payload.grabacionUrl) setAudioUrl(payload.grabacionUrl);
      if (onUpdated) onUpdated({ ...llamada, ...payload });
    };

    socket.on('llamada:status_changed', onUpdate);
    socket.on('llamada:terminada', onUpdate);
    socket.on('llamada:webhook', onUpdate);
    socket.on('llamada:grabacion', onUpdate);

    return () => {
      socket.off('llamada:status_changed', onUpdate);
      socket.off('llamada:terminada', onUpdate);
      socket.off('llamada:webhook', onUpdate);
      socket.off('llamada:grabacion', onUpdate);
    };
  }, [llamada.id, onUpdated, llamada]);

  useEffect(() => {
    if (!isEnCurso) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [isEnCurso]);

  const duracion = (() => {
    void tick;
    if (llamada.duracionSeg) return llamada.duracionSeg;
    if (llamada.estado === 'en_curso' && llamada.iniciadaAt) {
      const start = new Date(llamada.iniciadaAt).getTime();
      return Math.floor((Date.now() - start) / 1000);
    }
    return 0;
  })();

  const fetchAudio = async () => {
    try {
      const res = await apiClient.getLlamadaAudio(llamada.id);
      if (res.data?.url) setAudioUrl(res.data.url);
    } catch {
      // pendiente
    }
  };

  useEffect(() => {
    if (isTerminal && !audioUrl && llamada.estado === 'completada') {
      fetchAudio();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTerminal, llamada.estado]);

  const guardar = async (overrides?: Partial<{ notas: string; calificacion: number; proximaAccion: string; cambiarEstadoLead: LeadEstado | '' }>) => {
    setSaving(true);
    try {
      const cambiarEstadoLead = overrides?.cambiarEstadoLead ?? nuevoEstadoLead;
      const res: any = await apiClient.actualizarNotasLlamada(llamada.id, {
        notasPost: overrides?.notas ?? notas,
        calificacion: (overrides?.calificacion ?? calificacion) || undefined,
        proximaAccion: overrides?.proximaAccion ?? proximaAccion,
        nuevoEstadoLead: cambiarEstadoLead || undefined,
      });
      if (res?.data) setLlamada((prev) => ({ ...prev, ...res.data }));
      if (cambiarEstadoLead) setNuevoEstadoLead('');
    } catch (e: any) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (notas === (llamada.notasPost || '')) return;
    debounceRef.current = setTimeout(() => guardar({ notas }), 1500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notas]);

  const estadoColor = ESTADO_COLORS[llamada.estado] || 'bg-slate-100 text-slate-700';
  const estadoLabel = ESTADO_LABELS[llamada.estado] || llamada.estado;

  return (
    <div className="space-y-4">
      {/* Status header */}
      <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isEnCurso ? 'bg-emerald-500 text-white animate-pulse' : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'}`}>
              <Phone className="w-6 h-6" />
            </div>
            <div>
              <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold uppercase tracking-wider ${estadoColor}`}>
                {estadoLabel}
              </span>
              <p className="text-[14px] text-[var(--text-secondary)] mt-1">
                {llamada.lead?.nombre || llamada.telefonoLead}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[36px] font-mono font-bold text-[var(--text-primary)] leading-none">
              {formatDuracion(duracion)}
            </p>
            <p className="text-[11px] text-[var(--text-tertiary)] mt-1">
              {isEnCurso ? 'Tiempo en curso' : 'Duracion'}
            </p>
          </div>
        </div>
      </div>

      {/* Spech */}
      {spech && (
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4 text-violet-600" />
            <h4 className="text-[13px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
              Guion
            </h4>
          </div>
          <div className="max-h-[300px] overflow-y-auto pr-2">
            <SpechViewer spech={spech} lead={lead} hideObjeciones />
          </div>
        </div>
      )}

      {/* Objeciones (chuleta rapida durante la llamada) */}
      {spech?.objeciones && spech.objeciones.length > 0 && (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200 dark:border-amber-800/60 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <MessageCircleQuestion className="w-4 h-4 text-amber-600" />
            <h4 className="text-[13px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              Objeciones - chuleta
            </h4>
            <span className="px-1.5 py-0.5 bg-amber-200 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 rounded text-[11px] font-medium">
              {spech.objeciones.length}
            </span>
          </div>
          <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
            {spech.objeciones.map((o, idx) => {
              const open = objecionExpandida === idx;
              return (
                <div
                  key={idx}
                  className="border border-amber-200 dark:border-amber-800/60 rounded-xl bg-white dark:bg-[var(--bg-primary)] overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setObjecionExpandida(open ? null : idx)}
                    className="w-full px-3 py-2.5 flex items-center justify-between gap-3 text-left hover:bg-amber-50 dark:hover:bg-amber-900/10 transition-colors"
                  >
                    <span className="text-[13px] font-medium text-[var(--text-primary)] flex-1">
                      {o.objecion}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-amber-600 flex-shrink-0 transition-transform ${
                        open ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {open && (
                    <div className="px-3 py-2.5 bg-emerald-50/60 dark:bg-emerald-950/20 border-t border-amber-100 dark:border-amber-900/40">
                      <p className="text-[11px] uppercase tracking-wider text-emerald-700 dark:text-emerald-400 font-medium mb-1">
                        Como rebatirla
                      </p>
                      <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
                        {o.respuesta}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Notas */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-[13px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
            Notas durante la llamada
          </h4>
          <span className="text-[11px] text-[var(--text-tertiary)]">
            {saving ? 'Guardando...' : 'Auto-guardado'}
          </span>
        </div>
        <textarea
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          rows={6}
          placeholder="Escribe lo que el lead dice, objeciones, datos importantes..."
          className="w-full px-4 py-3 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl text-[14px] text-[var(--text-primary)] resize-y"
        />
      </div>

      {/* Post-llamada */}
      {isTerminal && (
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl p-5 space-y-4">
          <h4 className="text-[13px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
            Despues de la llamada
          </h4>

          {/* Calificacion */}
          <div>
            <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-1.5">
              Calificacion del contacto
            </label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => {
                    setCalificacion(n);
                    guardar({ calificacion: n });
                  }}
                  className="p-1"
                >
                  <Star
                    className={`w-7 h-7 ${
                      n <= calificacion
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-[var(--border-primary)]'
                    }`}
                  />
                </button>
              ))}
              {calificacion > 0 && (
                <button
                  onClick={() => {
                    setCalificacion(0);
                    guardar({ calificacion: 0 });
                  }}
                  className="ml-2 text-[12px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                >
                  limpiar
                </button>
              )}
            </div>
          </div>

          {/* Estado lead */}
          <div>
            <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-1.5">
              Cambiar estado del lead
            </label>
            <div className="flex gap-2">
              <select
                value={nuevoEstadoLead}
                onChange={(e) => setNuevoEstadoLead(e.target.value as LeadEstado)}
                className="flex-1 px-4 py-2.5 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl text-[14px] text-[var(--text-primary)]"
              >
                <option value="">Sin cambio (actual: {llamada.leadEstadoPost || llamada.leadEstadoPrev || lead?.estado})</option>
                {ESTADOS_LEAD.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
              <button
                onClick={() => guardar({ cambiarEstadoLead: nuevoEstadoLead })}
                disabled={!nuevoEstadoLead || saving}
                className="px-4 py-2.5 bg-violet-600 text-white rounded-xl text-[13px] font-medium hover:bg-violet-700 transition-colors disabled:opacity-50"
              >
                Aplicar
              </button>
            </div>
            {llamada.leadEstadoPost && llamada.leadEstadoPost !== llamada.leadEstadoPrev && (
              <p className="text-[12px] text-emerald-600 mt-1.5">
                Cambiado: {llamada.leadEstadoPrev} → {llamada.leadEstadoPost}
              </p>
            )}
          </div>

          {/* Proxima accion */}
          <div>
            <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-1.5">
              Proxima accion
            </label>
            <input
              type="text"
              value={proximaAccion}
              onChange={(e) => setProximaAccion(e.target.value)}
              onBlur={() => guardar({ proximaAccion })}
              placeholder="Ej: Llamar el martes a las 10h, enviar demo por email..."
              className="w-full px-4 py-2.5 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl text-[14px] text-[var(--text-primary)]"
            />
          </div>

          {/* Audio player */}
          {audioUrl ? (
            <div>
              <p className="text-[13px] font-medium text-[var(--text-secondary)] mb-1.5">Grabacion</p>
              <AudioPlayer src={audioUrl} />
            </div>
          ) : llamada.estado === 'completada' ? (
            <div className="text-[12px] text-[var(--text-tertiary)] flex items-center gap-2">
              <span className="inline-block w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
              Esperando grabacion (puede tardar unos segundos)
              <button
                onClick={fetchAudio}
                className="text-violet-600 hover:underline ml-1"
              >
                comprobar
              </button>
            </div>
          ) : null}

          {onClose && (
            <div className="pt-2 border-t border-[var(--border-primary)]">
              <button
                onClick={onClose}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-primary)] border border-[var(--border-primary)] text-[var(--text-secondary)] rounded-xl text-[13px] font-medium hover:border-[var(--text-tertiary)] transition-colors"
              >
                <Save className="w-4 h-4" />
                Cerrar y volver
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
