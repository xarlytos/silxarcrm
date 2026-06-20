'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import { useLiveAudioSimulation } from '@/hooks/useLiveAudioSimulation';
import { Lead, SpechLlamada } from '@/types';
import {
  Mic,
  PhoneOff,
  PhoneCall,
  Bot,
  User,
  Loader2,
  AlertCircle,
  Activity,
  Download,
  Music,
  Clock,
} from 'lucide-react';

export default function ProbarAIPage() {
  const [softwares, setSoftwares] = useState<{ saas: string; descripcion?: string }[]>([]);
  const [softwareId, setSoftwareId] = useState('');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [spechs, setSpechs] = useState<SpechLlamada[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [selectedSpech, setSelectedSpech] = useState<SpechLlamada | null>(null);
  const [loadingLeads, setLoadingLeads] = useState(false);

  const {
    status,
    error,
    transcripts,
    isAISpeaking,
    isUserSpeaking,
    recording,
    start,
    stop,
    downloadWav,
  } = useLiveAudioSimulation();

  const isConnected = status === 'connected';
  const isConnecting = status === 'connecting';

  useEffect(() => {
    apiClient.getSaasList().then((res: any) => {
      const list = res.data || [];
      setSoftwares(list);
      if (list.length > 0 && !softwareId) setSoftwareId(list[0].saas);
    });
  }, []);

  useEffect(() => {
    if (!softwareId) return;
    cargarLeads();
    cargarSpechs();
    setSelectedLead(null);
    setSelectedSpech(null);
  }, [softwareId]);

  const cargarLeads = async () => {
    setLoadingLeads(true);
    try {
      const res: any = await apiClient.getLeads({ softwareId, limit: '200' });
      setLeads(res.data.leads);
    } catch {
      setLeads([]);
    } finally {
      setLoadingLeads(false);
    }
  };

  const cargarSpechs = async () => {
    try {
      const res: any = await apiClient.getSpechs(softwareId);
      setSpechs(res.data || []);
    } catch {
      setSpechs([]);
    }
  };

  const handleStart = async () => {
    if (!selectedLead) return;
    await start({
      softwareId,
      leadId: selectedLead.id,
      spechId: selectedSpech?.id,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-[24px] sm:text-[28px] lg:text-[32px] font-bold tracking-tight text-[var(--text-primary)]">
          Probar Agente AI
        </h1>
        <p className="text-[13px] sm:text-[15px] text-[var(--text-secondary)] mt-1">
          Habla por microfono y escucha la respuesta de Mariana (AI) en tiempo real
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Panel izquierdo: configuracion */}
        <div className="lg:col-span-4 space-y-4">
          {/* Software selector */}
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl p-4">
            <label className="block text-[12px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-2">
              Negocio
            </label>
            <select
              value={softwareId}
              onChange={(e) => setSoftwareId(e.target.value)}
              disabled={isConnected || isConnecting}
              className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl text-[13px] text-[var(--text-primary)] disabled:opacity-50"
            >
              {softwares.map((s) => (
                <option key={s.saas} value={s.saas}>
                  {s.descripcion || s.saas}
                </option>
              ))}
            </select>
          </div>

          {/* Lead selector */}
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl p-4">
            <label className="block text-[12px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-2">
              Lead (tu actuas como el)
            </label>
            {loadingLeads ? (
              <div className="py-8 text-center text-[var(--text-tertiary)] text-[13px]">Cargando...</div>
            ) : (
              <div className="space-y-1 max-h-[200px] overflow-y-auto pr-1">
                {leads.map((lead) => (
                  <button
                    key={lead.id}
                    onClick={() => !isConnected && !isConnecting && setSelectedLead(lead)}
                    disabled={isConnected || isConnecting}
                    className={`w-full text-left px-3 py-2 rounded-xl text-[13px] transition-colors disabled:opacity-50 ${
                      selectedLead?.id === lead.id
                        ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300'
                        : 'hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
                    }`}
                  >
                    <div className="font-medium truncate">{lead.nombre}</div>
                    <div className="text-[11px] text-[var(--text-tertiary)] truncate">
                      {lead.empresa || 'Sin empresa'}
                      {lead.telefono && ` · ${lead.telefono}`}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Spech selector */}
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl p-4">
            <label className="block text-[12px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-2">
              Spech (opcional)
            </label>
            <select
              value={selectedSpech?.id || ''}
              onChange={(e) => {
                const s = spechs.find((x) => x.id === e.target.value);
                setSelectedSpech(s || null);
              }}
              disabled={isConnected || isConnecting}
              className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl text-[13px] text-[var(--text-primary)] disabled:opacity-50"
            >
              <option value="">Sin spech (prompt generico)</option>
              {spechs.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.titulo}
                </option>
              ))}
            </select>
          </div>

          {/* Botones de control */}
          <div className="space-y-2">
            {!isConnected ? (
              <button
                onClick={handleStart}
                disabled={!selectedLead || isConnecting}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl text-[14px] font-medium hover:shadow-lg hover:shadow-emerald-500/25 transition-all disabled:opacity-40"
              >
                {isConnecting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <PhoneCall className="w-4 h-4" />
                )}
                {isConnecting ? 'Conectando...' : 'Iniciar llamada simulada'}
              </button>
            ) : (
              <button
                onClick={stop}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl text-[14px] font-medium hover:shadow-lg hover:shadow-red-500/25 transition-all"
              >
                <PhoneOff className="w-4 h-4" />
                Colgar llamada
              </button>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
              <p className="text-[13px] text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Grabacion disponible */}
          {recording && (
            <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Music className="w-4 h-4 text-violet-500" />
                <h4 className="text-[12px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                  Grabacion guardada
                </h4>
              </div>
              <div className="flex items-center gap-2 text-[12px] text-[var(--text-secondary)]">
                <Clock className="w-3.5 h-3.5" />
                {recording.duration.toFixed(1)}s
              </div>
              <div className="space-y-2">
                <button
                  onClick={() => downloadWav('user')}
                  className="w-full flex items-center gap-2 px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl text-[12px] text-[var(--text-secondary)] hover:border-violet-400 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Descargar tu voz (WAV)
                </button>
                <button
                  onClick={() => downloadWav('ai')}
                  className="w-full flex items-center gap-2 px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl text-[12px] text-[var(--text-secondary)] hover:border-violet-400 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Descargar voz IA (WAV)
                </button>
                <button
                  onClick={() => downloadWav('both')}
                  className="w-full flex items-center gap-2 px-3 py-2 bg-violet-600 text-white rounded-xl text-[12px] font-medium hover:bg-violet-700 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Descargar ambos
                </button>
              </div>
            </div>
          )}

          {/* Indicadores de habla */}
          {isConnected && (
            <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl p-4 space-y-3">
              <h4 className="text-[12px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                Actividad de voz
              </h4>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    isAISpeaking
                      ? 'bg-violet-500 text-white animate-pulse'
                      : 'bg-[var(--bg-tertiary)] text-[var(--text-tertiary)]'
                  }`}>
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[13px] font-medium text-[var(--text-primary)]">Mariana (AI)</p>
                    <p className="text-[11px] text-[var(--text-tertiary)]">
                      {isAISpeaking ? 'Hablando...' : 'Escuchando'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    isUserSpeaking
                      ? 'bg-emerald-500 text-white animate-pulse'
                      : 'bg-[var(--bg-tertiary)] text-[var(--text-tertiary)]'
                  }`}>
                    <User className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[13px] font-medium text-[var(--text-primary)]">Tu (lead)</p>
                    <p className="text-[11px] text-[var(--text-tertiary)]">
                      {isUserSpeaking ? 'Hablando...' : 'En silencio'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Panel derecho: transcripciones y visualizacion */}
        <div className="lg:col-span-8">
          {!isConnected && !isConnecting ? (
            <div className="bg-[var(--bg-secondary)] border border-dashed border-[var(--border-primary)] rounded-2xl h-[500px] flex flex-col items-center justify-center text-center p-8">
              <Activity className="w-16 h-16 text-[var(--text-tertiary)] opacity-40 mb-4" />
              <p className="text-[16px] font-medium text-[var(--text-secondary)]">
                Selecciona un lead y haz clic en "Iniciar llamada simulada"
              </p>
              <p className="text-[13px] text-[var(--text-tertiary)] mt-2 max-w-md">
                Permitira acceso al microfono cuando el navegador lo solicite. La IA usara el mismo prompt,
                spech y pipeline de audio que en llamadas reales con Twilio.
              </p>
            </div>
          ) : (
            <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl h-[500px] flex flex-col">
              {/* Header del chat */}
              <div className="px-4 py-3 border-b border-[var(--border-primary)] flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  isAISpeaking
                    ? 'bg-violet-500 text-white animate-pulse'
                    : 'bg-[var(--bg-tertiary)] text-[var(--text-tertiary)]'
                }`}>
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-[var(--text-primary)]">Mariana (AI)</p>
                  <p className="text-[11px] text-[var(--text-tertiary)]">
                    {isConnecting
                      ? 'Conectando con Gemini Live...'
                      : isAISpeaking
                      ? 'Hablando'
                      : isUserSpeaking
                      ? 'Escuchandote'
                      : 'En espera'}
                  </p>
                </div>
                <div className="ml-auto flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${
                    isConnecting ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'
                  }`} />
                  <span className="text-[11px] text-[var(--text-tertiary)]">
                    {isConnecting ? 'Conectando' : 'Conectado'}
                  </span>
                </div>
              </div>

              {/* Transcripciones */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {transcripts.length === 0 && (
                  <div className="text-center py-12 text-[var(--text-tertiary)]">
                    <p className="text-[13px]">Esperando a que la IA hable...</p>
                    <p className="text-[11px] mt-1">Las transcripciones apareceran aqui</p>
                  </div>
                )}
                {transcripts.map((t, i) => (
                  <div
                    key={i}
                    className={`flex gap-2.5 ${t.role === 'prospecto' ? 'flex-row-reverse' : ''}`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-[10px] font-bold ${
                        t.role === 'agente'
                          ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-600'
                          : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600'
                      }`}
                    >
                      {t.role === 'agente' ? 'IA' : 'TU'}
                    </div>
                    <div
                      className={`max-w-[80%] px-3 py-2 rounded-2xl text-[13px] leading-relaxed ${
                        t.role === 'agente'
                          ? 'bg-[var(--bg-primary)] border border-[var(--border-primary)] text-[var(--text-primary)] rounded-tl-sm'
                          : 'bg-emerald-500 text-white rounded-tr-sm'
                      }`}
                    >
                      {t.text}
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="px-4 py-3 border-t border-[var(--border-primary)]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isUserSpeaking ? (
                      <Mic className="w-4 h-4 text-emerald-500 animate-pulse" />
                    ) : (
                      <Mic className="w-4 h-4 text-[var(--text-tertiary)]" />
                    )}
                    <span className="text-[12px] text-[var(--text-tertiary)]">
                      {isUserSpeaking
                        ? 'Detectando voz...'
                        : isAISpeaking
                        ? 'IA hablando - puedes interrumpir'
                        : 'Habla para iniciar la conversacion'}
                    </span>
                  </div>
                  <button
                    onClick={stop}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg text-[12px] font-medium hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                  >
                    <PhoneOff className="w-3.5 h-3.5" />
                    Colgar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
