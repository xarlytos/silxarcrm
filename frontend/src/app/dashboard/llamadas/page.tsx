'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiClient } from '@/lib/api';
import {
  Lead,
  SpechLlamada,
  LlamadaReal,
  SesionPruebaIA,
  LeadSimulado,
  LlamadasStats,
  MensajeChatSimulacion,
  SimulacionFeedback,
} from '@/types';
import {
  Phone,
  Sparkles,
  FileText,
  History as HistoryIcon,
  Plus,
  Building2,
  AlertCircle,
} from 'lucide-react';

import LeadSelector from '@/components/llamadas/LeadSelector';
import SpechList from '@/components/llamadas/SpechList';
import SpechViewer from '@/components/llamadas/SpechViewer';
import SpechEditor from '@/components/llamadas/SpechEditor';
import SimulacionConfig from '@/components/llamadas/SimulacionConfig';
import SimulacionChat from '@/components/llamadas/SimulacionChat';
import SimulacionFeedbackView from '@/components/llamadas/SimulacionFeedback';
import LlamadaIniciarModal from '@/components/llamadas/LlamadaIniciarModal';
import LlamadaEnVivo from '@/components/llamadas/LlamadaEnVivo';
import HistorialLlamadas from '@/components/llamadas/HistorialLlamadas';
import LlamadaStats from '@/components/llamadas/LlamadaStats';
import AIMetricsDashboard from '@/components/llamadas/AIMetricsDashboard';

type TabId = 'llamar' | 'practicar' | 'spechs' | 'historial';

const TABS: { id: TabId; label: string; icon: any }[] = [
  { id: 'llamar', label: 'Llamar', icon: Phone },
  { id: 'practicar', label: 'Practicar', icon: Sparkles },
  { id: 'spechs', label: 'Spechs', icon: FileText },
  { id: 'historial', label: 'Historial', icon: HistoryIcon },
];

export default function LlamadasPage() {
  const [tab, setTab] = useState<TabId>('llamar');

  // Negocios
  const [softwares, setSoftwares] = useState<{ saas: string; descripcion?: string }[]>([]);
  const [softwareId, setSoftwareId] = useState<string>('');

  // Leads
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  // Spechs
  const [spechs, setSpechs] = useState<SpechLlamada[]>([]);
  const [loadingSpechs, setLoadingSpechs] = useState(false);
  const [selectedSpech, setSelectedSpech] = useState<SpechLlamada | null>(null);
  const [editingSpech, setEditingSpech] = useState<SpechLlamada | null>(null);
  const [creatingSpech, setCreatingSpech] = useState(false);

  // Llamada real
  const [llamadaActiva, setLlamadaActiva] = useState<LlamadaReal | null>(null);
  const [showIniciarModal, setShowIniciarModal] = useState(false);
  const [modoLlamada, setModoLlamada] = useState<'HUMANO' | 'AI'>('HUMANO');
  const [stats, setStats] = useState<LlamadasStats | null>(null);
  const [reloadHistorial, setReloadHistorial] = useState(0);

  // Simulacion
  const [simulacionActiva, setSimulacionActiva] = useState<SesionPruebaIA | null>(null);
  const [mensajesSim, setMensajesSim] = useState<MensajeChatSimulacion[]>([]);
  const [feedbackSim, setFeedbackSim] = useState<SimulacionFeedback | null>(null);
  const [loadingSim, setLoadingSim] = useState(false);

  // Cargar negocios al montar
  useEffect(() => {
    apiClient
      .getSaasList()
      .then((res: any) => {
        const list = res.data || [];
        setSoftwares(list);
        if (list.length > 0 && !softwareId) {
          setSoftwareId(list[0].saas);
        }
      })
      .catch(() => setSoftwares([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cargar leads y spechs cuando cambia el negocio
  useEffect(() => {
    if (!softwareId) return;
    cargarLeads();
    cargarSpechs();
    cargarStats();
    setSelectedLead(null);
    setSelectedSpech(null);
    setEditingSpech(null);
    setCreatingSpech(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    setLoadingSpechs(true);
    try {
      const res: any = await apiClient.getSpechs(softwareId);
      setSpechs(res.data || []);
    } catch {
      setSpechs([]);
    } finally {
      setLoadingSpechs(false);
    }
  };

  const cargarStats = async () => {
    try {
      const res: any = await apiClient.getLlamadasStats(softwareId);
      setStats(res.data);
    } catch {
      setStats(null);
    }
  };

  const defaultSpech = useMemo(
    () => spechs.find((s) => s.esDefault) || spechs[0] || null,
    [spechs]
  );

  // === SPECHS handlers ===
  const handleSaveSpech = async (data: any) => {
    try {
      if (editingSpech) {
        const res: any = await apiClient.updateSpech(editingSpech.id, data);
        setSpechs((prev) =>
          prev.map((s) => (s.id === editingSpech.id ? res.data : s))
        );
        setEditingSpech(null);
        setSelectedSpech(res.data);
      } else {
        const res: any = await apiClient.createSpech({ ...data, softwareId });
        setSpechs((prev) => [...prev, res.data]);
        setCreatingSpech(false);
        setSelectedSpech(res.data);
      }
    } catch (e: any) {
      alert(e.message || 'Error guardando spech');
    }
  };

  const handleDeleteSpech = async (id: string) => {
    try {
      await apiClient.deleteSpech(id);
      setSpechs((prev) => prev.filter((s) => s.id !== id));
      if (selectedSpech?.id === id) setSelectedSpech(null);
      if (editingSpech?.id === id) setEditingSpech(null);
    } catch (e: any) {
      alert(e.message || 'Error eliminando');
    }
  };

  const handleDuplicateSpech = async (id: string) => {
    try {
      const res: any = await apiClient.duplicateSpech(id);
      setSpechs((prev) => [...prev, res.data]);
      setSelectedSpech(res.data);
    } catch (e: any) {
      alert(e.message || 'Error duplicando');
    }
  };

  const handleSetDefaultSpech = async (id: string) => {
    try {
      await apiClient.setDefaultSpech(id);
      await cargarSpechs();
    } catch (e: any) {
      alert(e.message || 'Error');
    }
  };

  // === LLAMADA handlers ===
  const handleIniciarLlamada = async (data: { spechId: string | null; telefonoAgente?: string }) => {
    if (!selectedLead) return;
    try {
      if (modoLlamada === 'AI') {
        const res: any = await apiClient.iniciarLlamadaAI({
          leadId: selectedLead.id,
          spechId: data.spechId || undefined,
        });
        setLlamadaActiva(res.data);
      } else {
        const res: any = await apiClient.iniciarLlamada({
          leadId: selectedLead.id,
          spechId: data.spechId || undefined,
          telefonoAgente: data.telefonoAgente,
        });
        setLlamadaActiva(res.data);
      }
      setShowIniciarModal(false);
    } catch (e: any) {
      alert(e.message || 'Error iniciando llamada');
    }
  };

  const handleCerrarLlamada = () => {
    setLlamadaActiva(null);
    setReloadHistorial((k) => k + 1);
    cargarStats();
  };

  // === SIMULACION handlers ===
  const handleStartSimulacion = async (spechId: string | null, leadSimulado: LeadSimulado) => {
    setLoadingSim(true);
    setFeedbackSim(null);
    setMensajesSim([]);
    try {
      const res: any = await apiClient.iniciarSimulacion({
        softwareId,
        spechId: spechId || undefined,
        leadSimulado,
      });
      setSimulacionActiva(res.data.sesion);
      setMensajesSim(res.data.mensajes || []);
    } catch (e: any) {
      alert(e.message || 'Error iniciando simulacion');
    } finally {
      setLoadingSim(false);
    }
  };

  const handleSendSim = async (texto: string) => {
    if (!simulacionActiva) return;
    setMensajesSim((prev) => [
      ...prev,
      { rol: 'agente', texto, timestamp: new Date().toISOString() },
    ]);
    setLoadingSim(true);
    try {
      const res: any = await apiClient.enviarMensajeSimulacion(simulacionActiva.id, texto);
      setMensajesSim(res.data.mensajes || []);
    } catch (e: any) {
      alert(e.message || 'Error enviando mensaje');
    } finally {
      setLoadingSim(false);
    }
  };

  const handleFinalizarSim = async () => {
    if (!simulacionActiva) return;
    setLoadingSim(true);
    try {
      const res: any = await apiClient.finalizarSimulacion(simulacionActiva.id);
      setFeedbackSim(res.data.feedback);
    } catch (e: any) {
      alert(e.message || 'Error finalizando');
    } finally {
      setLoadingSim(false);
    }
  };

  const handleNuevaSim = () => {
    setSimulacionActiva(null);
    setMensajesSim([]);
    setFeedbackSim(null);
  };

  const negocioActual = softwares.find((s) => s.saas === softwareId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-[24px] sm:text-[28px] lg:text-[32px] font-bold tracking-tight text-[var(--text-primary)]">
            Centro de Llamadas
          </h1>
          <p className="text-[13px] sm:text-[15px] text-[var(--text-secondary)] mt-1">
            Llama a tus leads, practica con IA y gestiona tus guiones
          </p>
        </div>
        <div className="flex items-center gap-2 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl px-3 py-2 shrink-0">
          <Building2 className="w-4 h-4 text-[var(--text-tertiary)]" />
          <select
            value={softwareId}
            onChange={(e) => setSoftwareId(e.target.value)}
            className="bg-transparent text-[13px] sm:text-[14px] font-medium text-[var(--text-primary)] focus:outline-none cursor-pointer pr-2 max-w-[160px] sm:max-w-none truncate"
          >
            {softwares.map((s) => (
              <option key={s.saas} value={s.saas}>
                {s.descripcion || s.saas}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats */}
      <LlamadaStats stats={stats} loading={!stats} />

      {/* AI Metrics Dashboard */}
      {softwareId && <AIMetricsDashboard softwareId={softwareId} />}

      {/* Tabs */}
      <div className="border-b border-[var(--border-primary)] -mx-2 px-2 sm:mx-0 sm:px-0 overflow-x-auto scrollbar-hide">
        <div className="flex gap-1 min-w-max">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-[13px] sm:text-[14px] font-medium border-b-2 transition-colors -mb-px ${
                tab === id
                  ? 'border-violet-500 text-[var(--text-primary)]'
                  : 'border-transparent text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* === LLAMAR === */}
      {tab === 'llamar' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl p-4 max-h-[700px] flex flex-col">
            <h3 className="text-[14px] font-semibold text-[var(--text-primary)] mb-3">
              Tus leads ({leads.filter((l) => l.telefono).length} con telefono)
            </h3>
            <LeadSelector
              leads={leads}
              selectedId={selectedLead?.id}
              onSelect={setSelectedLead}
              loading={loadingLeads}
              showOnlyWithPhone
            />
          </div>

          <div className="lg:col-span-8 space-y-4">
            {llamadaActiva ? (
              <LlamadaEnVivo
                llamada={llamadaActiva}
                spech={
                  llamadaActiva.spechId
                    ? spechs.find((s) => s.id === llamadaActiva.spechId) || null
                    : null
                }
                lead={selectedLead || undefined}
                onClose={handleCerrarLlamada}
                onUpdated={(l) => setLlamadaActiva(l)}
              />
            ) : selectedLead ? (
              <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl p-4 sm:p-6 space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-[18px] sm:text-[20px] font-bold shrink-0">
                    {selectedLead.nombre.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-[18px] sm:text-[20px] font-bold text-[var(--text-primary)] truncate">
                      {selectedLead.nombre}
                    </h2>
                    <p className="text-[12px] sm:text-[13px] text-[var(--text-tertiary)] truncate">
                      {selectedLead.empresa || 'Sin empresa'}
                      {selectedLead.cargo && ` · ${selectedLead.cargo}`}
                      {selectedLead.email && ` · ${selectedLead.email}`}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0 w-full sm:w-auto">
                    {/* Selector de modo */}
                    <div className="flex bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg p-0.5">
                      <button
                        onClick={() => setModoLlamada('HUMANO')}
                        className={`flex-1 px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors ${
                          modoLlamada === 'HUMANO'
                            ? 'bg-violet-600 text-white'
                            : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
                        }`}
                      >
                        Humano
                      </button>
                      <button
                        onClick={() => setModoLlamada('AI')}
                        className={`flex-1 px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors ${
                          modoLlamada === 'AI'
                            ? 'bg-violet-600 text-white'
                            : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
                        }`}
                      >
                        AI
                      </button>
                    </div>
                    <button
                      disabled={!selectedLead.telefono}
                      onClick={() => setShowIniciarModal(true)}
                      className="flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl text-[13px] sm:text-[14px] font-medium hover:shadow-lg hover:shadow-emerald-500/25 transition-all disabled:opacity-40 justify-center"
                    >
                      <Phone className="w-4 h-4" />
                      {selectedLead.telefono
                        ? modoLlamada === 'AI'
                          ? 'Llamar con AI'
                          : 'Llamar ahora'
                        : 'Sin telefono'}
                    </button>
                  </div>
                </div>

                {!selectedLead.telefono && (
                  <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-3 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                    <p className="text-[13px] text-amber-700 dark:text-amber-400">
                      Este lead no tiene telefono. Editalo desde la seccion de Leads para añadirselo.
                    </p>
                  </div>
                )}

                {defaultSpech && (
                  <div className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl p-4 max-h-[400px] overflow-y-auto">
                    <div className="flex items-center justify-between mb-2 pb-2 border-b border-[var(--border-primary)]">
                      <p className="text-[12px] uppercase tracking-wider text-[var(--text-tertiary)] font-semibold">
                        Spech default
                      </p>
                      <button
                        onClick={() => setTab('spechs')}
                        className="text-[12px] text-violet-600 hover:underline"
                      >
                        Editar spechs →
                      </button>
                    </div>
                    <SpechViewer spech={defaultSpech} lead={selectedLead} />
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-[var(--bg-secondary)] border border-dashed border-[var(--border-primary)] rounded-2xl p-12 text-center">
                <Phone className="w-12 h-12 text-[var(--text-tertiary)] opacity-40 mx-auto mb-3" />
                <p className="text-[16px] font-medium text-[var(--text-secondary)]">
                  Selecciona un lead para llamar
                </p>
                <p className="text-[13px] text-[var(--text-tertiary)] mt-1">
                  Elige uno de la lista de la izquierda
                </p>
              </div>
            )}
          </div>

          {showIniciarModal && selectedLead && (
            <LlamadaIniciarModal
              lead={selectedLead}
              spechs={spechs.filter((s) => s.activo)}
              onCancel={() => setShowIniciarModal(false)}
              onConfirm={handleIniciarLlamada}
            />
          )}
        </div>
      )}

      {/* === PRACTICAR === */}
      {tab === 'practicar' && (
        <div className="space-y-4">
          {!simulacionActiva && !feedbackSim && (
            <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl p-6">
              <SimulacionConfig
                spechs={spechs.filter((s) => s.activo)}
                onStart={handleStartSimulacion}
              />
            </div>
          )}

          {simulacionActiva && !feedbackSim && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-7">
                <SimulacionChat
                  mensajes={mensajesSim}
                  clienteNombre={simulacionActiva.leadSimulado.nombre}
                  loading={loadingSim}
                  onSend={handleSendSim}
                  onFinalizar={handleFinalizarSim}
                />
              </div>
              <div className="lg:col-span-5 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl p-5">
                <h4 className="text-[12px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-3">
                  Tu guion
                </h4>
                <div className="max-h-[500px] overflow-y-auto pr-2">
                  {simulacionActiva.spechId ? (
                    <SpechViewer
                      spech={spechs.find((s) => s.id === simulacionActiva.spechId) || null}
                    />
                  ) : (
                    <p className="text-[13px] text-[var(--text-tertiary)]">
                      Sin guion seleccionado. Esta es una conversacion libre.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {feedbackSim && (
            <SimulacionFeedbackView feedback={feedbackSim} onReintentar={handleNuevaSim} />
          )}
        </div>
      )}

      {/* === SPECHS === */}
      {tab === 'spechs' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[14px] font-semibold text-[var(--text-primary)]">
                Spechs de {negocioActual?.descripcion || softwareId}
              </h3>
              <button
                onClick={() => {
                  setCreatingSpech(true);
                  setEditingSpech(null);
                  setSelectedSpech(null);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-violet-600 text-white rounded-lg text-[12px] font-medium hover:bg-violet-700 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Nuevo
              </button>
            </div>
            {loadingSpechs ? (
              <div className="text-center py-12 text-[var(--text-tertiary)] text-[13px]">
                Cargando...
              </div>
            ) : (
              <SpechList
                spechs={spechs}
                selectedId={selectedSpech?.id || editingSpech?.id}
                onSelect={(s) => {
                  setSelectedSpech(s);
                  setEditingSpech(null);
                  setCreatingSpech(false);
                }}
                onSetDefault={handleSetDefaultSpech}
                onDuplicate={handleDuplicateSpech}
                onDelete={handleDeleteSpech}
              />
            )}
          </div>

          <div className="lg:col-span-8 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl p-6">
            {creatingSpech ? (
              <>
                <h3 className="text-[18px] font-semibold text-[var(--text-primary)] mb-4">
                  Nuevo spech
                </h3>
                <SpechEditor
                  softwareId={softwareId}
                  onSave={handleSaveSpech}
                  onCancel={() => setCreatingSpech(false)}
                />
              </>
            ) : editingSpech ? (
              <>
                <h3 className="text-[18px] font-semibold text-[var(--text-primary)] mb-4">
                  Editar: {editingSpech.titulo}
                </h3>
                <SpechEditor
                  spech={editingSpech}
                  softwareId={softwareId}
                  onSave={handleSaveSpech}
                  onCancel={() => setEditingSpech(null)}
                />
              </>
            ) : selectedSpech ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-[18px] font-semibold text-[var(--text-primary)]">
                    Vista previa
                  </h3>
                  <button
                    onClick={() => setEditingSpech(selectedSpech)}
                    className="px-3 py-1.5 bg-violet-600 text-white rounded-lg text-[12px] font-medium hover:bg-violet-700 transition-colors"
                  >
                    Editar
                  </button>
                </div>
                <div className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl p-4">
                  <SpechViewer spech={selectedSpech} showHighlight />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center text-[var(--text-tertiary)]">
                <FileText className="w-12 h-12 mb-3 opacity-40" />
                <p className="text-[15px] font-medium">Selecciona o crea un spech</p>
                <p className="text-[13px] mt-1">
                  Los spechs son guiones reutilizables con variables de leads
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* === HISTORIAL === */}
      {tab === 'historial' && (
        <HistorialLlamadas softwareId={softwareId} reloadKey={reloadHistorial} />
      )}
    </div>
  );
}
