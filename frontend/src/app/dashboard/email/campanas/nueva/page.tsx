'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import {
  ArrowLeft, ArrowRight, Check, Send, Users, AtSign, FileText,
  AlertCircle, Eye, Filter, Rocket, Loader2, FlaskConical, Plus, Trash2,
} from 'lucide-react';

interface Sender { id: string; email: string; nombre: string; esDefault: boolean; activo: boolean; }
interface Plantilla { id: string; nombre: string; asunto: string; cuerpoHtml: string; variables: string[]; }
interface LeadSample { id: string; nombre: string; email: string | null; empresa: string | null; telefono: string | null; metadata: any; }

const ESTADOS = ['NUEVO', 'CONTACTADO', 'INTERESADO', 'EN_SEGUIMIENTO', 'CALIFICADO'];
const PRIORIDADES = ['BAJA', 'MEDIA', 'ALTA', 'URGENTE'];

function renderTpl(tpl: string, ctx: Record<string, string | null | undefined>): string {
  return tpl.replace(/\{\{\s*([a-zA-Z_][\w]*)\s*\}\}/g, (_m, k) => (ctx[k] as string) ?? '');
}

function ctxFromLead(l: LeadSample): Record<string, string> {
  const meta = l.metadata || {};
  return {
    nombre: l.nombre,
    empresa: l.empresa || '',
    email: l.email || '',
    telefono: l.telefono || '',
    municipio: meta.municipio || '',
  };
}

export default function NuevaCampanaPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [softwares, setSoftwares] = useState<{ saas: string }[]>([]);
  const [senders, setSenders] = useState<Sender[]>([]);
  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
  const [audience, setAudience] = useState<{ total: number; sample: LeadSample[] }>({ total: 0, sample: [] });
  const [loadingAudience, setLoadingAudience] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    softwareId: '',
    senderId: '',
    plantillaId: '',
    nombre: '',
    filtroEstado: '',
    filtroPrioridad: '',
    filtroOrigen: '',
    programadaPara: '',
  });

  const [abMode, setAbMode] = useState(false);
  const [variantes, setVariantes] = useState<Array<{ letra: string; asunto: string; cuerpoHtml: string; porcentaje: number }>>([]);

  // Cargas iniciales
  useEffect(() => {
    apiClient.getSaasList().then((r) => setSoftwares(r.data)).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (form.softwareId) {
      apiClient.getEmailSenders(form.softwareId).then((r) => setSenders(r.data)).catch(() => setSenders([]));
      apiClient.getEmailPlantillas(form.softwareId).then((r) => setPlantillas(r.data)).catch(() => setPlantillas([]));
      setForm((f) => ({ ...f, senderId: '', plantillaId: '' }));
    }
  }, [form.softwareId]);

  // Auto-seleccionar sender default
  useEffect(() => {
    if (senders.length && !form.senderId) {
      const def = senders.find((s) => s.esDefault && s.activo) || senders.find((s) => s.activo);
      if (def) setForm((f) => ({ ...f, senderId: def.id }));
    }
  }, [senders, form.senderId]);

  // Preview audiencia cuando estamos en el paso 'audiencia'
  useEffect(() => {
    if (!isStep('audiencia') || !form.softwareId) return;
    setLoadingAudience(true);
    apiClient.previewAudiencia({
      softwareId: form.softwareId,
      estado: form.filtroEstado || undefined,
      prioridad: form.filtroPrioridad || undefined,
      origen: form.filtroOrigen || undefined,
    })
      .then((r) => setAudience(r.data))
      .catch(() => setAudience({ total: 0, sample: [] }))
      .finally(() => setLoadingAudience(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, abMode, form.softwareId, form.filtroEstado, form.filtroPrioridad, form.filtroOrigen]);

  const plantilla = plantillas.find((p) => p.id === form.plantillaId);
  const sender = senders.find((s) => s.id === form.senderId);

  // Inicializar 2 variantes cuando se activa A/B, partiendo de la plantilla
  useEffect(() => {
    if (abMode && variantes.length === 0 && plantilla) {
      setVariantes([
        { letra: 'A', asunto: plantilla.asunto, cuerpoHtml: plantilla.cuerpoHtml, porcentaje: 20 },
        { letra: 'B', asunto: plantilla.asunto, cuerpoHtml: plantilla.cuerpoHtml, porcentaje: 20 },
      ]);
    }
    if (!abMode) setVariantes([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abMode, plantilla]);

  const varSum = variantes.reduce((s, v) => s + (v.porcentaje || 0), 0);
  const varValid = abMode
    ? variantes.length >= 2 && varSum > 0 && varSum <= 100 && variantes.every((v) => v.asunto && v.cuerpoHtml)
    : true;
  const firstLead = audience.sample[0];
  const renderedAsunto = plantilla && firstLead ? renderTpl(plantilla.asunto, ctxFromLead(firstLead)) : plantilla?.asunto || '';
  const renderedHtml = plantilla && firstLead ? renderTpl(plantilla.cuerpoHtml, ctxFromLead(firstLead)) : plantilla?.cuerpoHtml || '';

  // Steps dinámicos: si A/B insertamos paso "variantes" entre setup y audiencia
  const STEPS = abMode
    ? ['Setup', 'Variantes', 'Audiencia', 'Revisar', 'Lanzar']
    : ['Setup', 'Audiencia', 'Revisar', 'Lanzar'];

  const isStep = (kind: 'setup' | 'variantes' | 'audiencia' | 'revisar' | 'lanzar') => {
    if (!abMode) {
      if (kind === 'setup') return step === 0;
      if (kind === 'audiencia') return step === 1;
      if (kind === 'revisar') return step === 2;
      if (kind === 'lanzar') return step === 3;
      return false;
    }
    if (kind === 'setup') return step === 0;
    if (kind === 'variantes') return step === 1;
    if (kind === 'audiencia') return step === 2;
    if (kind === 'revisar') return step === 3;
    if (kind === 'lanzar') return step === 4;
    return false;
  };

  const canGoNext = () => {
    if (isStep('setup')) return form.softwareId && form.senderId && form.plantillaId;
    if (isStep('variantes')) return varValid;
    if (isStep('audiencia')) return audience.total > 0;
    if (isStep('revisar')) return true;
    return false;
  };

  const addVariante = () => {
    if (variantes.length >= 4) return;
    const nextLetra = String.fromCharCode(65 + variantes.length); // A, B, C, D
    setVariantes([...variantes, {
      letra: nextLetra,
      asunto: plantilla?.asunto || '',
      cuerpoHtml: plantilla?.cuerpoHtml || '',
      porcentaje: 10,
    }]);
  };
  const removeVariante = (idx: number) => {
    if (variantes.length <= 2) return;
    const next = variantes.filter((_, i) => i !== idx)
      .map((v, i) => ({ ...v, letra: String.fromCharCode(65 + i) }));
    setVariantes(next);
  };
  const updateVariante = (idx: number, patch: Partial<typeof variantes[0]>) => {
    setVariantes(variantes.map((v, i) => (i === idx ? { ...v, ...patch } : v)));
  };

  const handleLaunch = async (justSave: boolean) => {
    setError('');
    setLaunching(true);
    try {
      const created = await apiClient.createEmailCampana({
        softwareId: form.softwareId,
        nombre: form.nombre || `Campaña ${new Date().toLocaleDateString('es-ES')}`,
        senderId: form.senderId,
        plantillaId: form.plantillaId,
        audiencia: {
          softwareId: form.softwareId,
          estado: form.filtroEstado || undefined,
          prioridad: form.filtroPrioridad || undefined,
          origen: form.filtroOrigen || undefined,
        },
        programadaPara: form.programadaPara || null,
        ...(abMode && variantes.length >= 2 ? { variantes } : {}),
      });

      if (!justSave) {
        await apiClient.lanzarEmailCampana(created.data.id);
      }
      router.push(`/dashboard/email/campanas/${created.data.id}`);
    } catch (err: any) {
      setError(err.message || 'Error creando campaña');
    } finally {
      setLaunching(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <Link href="/dashboard/email/campanas" className="inline-flex items-center gap-1 text-[13px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] mb-2">
          <ArrowLeft className="w-3.5 h-3.5" /> Volver
        </Link>
        <h1 className="text-[28px] font-bold tracking-tight text-[var(--text-primary)]">Nueva campaña</h1>
        <p className="text-[14px] text-[var(--text-secondary)] mt-1">Envío masivo a leads filtrados, con tracking de apertura/click.</p>
      </div>

      {/* Stepper */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl p-5">
        <div className="flex items-center justify-between">
          {STEPS.map((label, i) => {
            const active = i === step;
            const done = i < step;
            return (
              <div key={label} className="flex items-center flex-1">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-[12px] ${
                    done ? 'bg-emerald-500 text-white' : active ? 'bg-gradient-to-br from-blue-500 to-violet-600 text-white' : 'bg-[var(--bg-tertiary)] text-[var(--text-tertiary)]'
                  }`}>
                    {done ? <Check className="w-4 h-4" /> : i + 1}
                  </div>
                  <span className={`text-[13px] font-medium ${active ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]'}`}>
                    {label}
                  </span>
                </div>
                {i < STEPS.length - 1 && <div className={`flex-1 h-px mx-3 ${done ? 'bg-emerald-500' : 'bg-[var(--border-primary)]'}`} />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step content */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl p-6">
        {isStep('setup') && (
          <div className="space-y-5">
            <h2 className="text-[18px] font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <AtSign className="w-5 h-5 text-blue-500" /> Setup
            </h2>
            <div>
              <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-1.5">Software *</label>
              <select
                value={form.softwareId}
                onChange={(e) => setForm({ ...form, softwareId: e.target.value })}
                className="w-full px-3 py-2.5 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl text-[14px]"
              >
                <option value="">Selecciona...</option>
                {softwares.map((s) => (<option key={s.saas} value={s.saas}>{s.saas}</option>))}
              </select>
            </div>

            {form.softwareId && (
              <>
                <div>
                  <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-1.5">Sender *</label>
                  {senders.length === 0 ? (
                    <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-[13px] text-amber-700 dark:text-amber-300">
                      Este software no tiene senders.{' '}
                      <Link href="/dashboard/email/senders" className="underline">Crear uno</Link>
                    </div>
                  ) : (
                    <select
                      value={form.senderId}
                      onChange={(e) => setForm({ ...form, senderId: e.target.value })}
                      className="w-full px-3 py-2.5 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl text-[14px]"
                    >
                      <option value="">Selecciona...</option>
                      {senders.filter((s) => s.activo).map((s) => (
                        <option key={s.id} value={s.id}>{s.nombre} &lt;{s.email}&gt; {s.esDefault ? '⭐' : ''}</option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-1.5">Plantilla *</label>
                  {plantillas.length === 0 ? (
                    <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-[13px] text-amber-700 dark:text-amber-300">
                      Este software no tiene plantillas.{' '}
                      <Link href="/dashboard/email/plantillas/nueva" className="underline">Crear una</Link>
                    </div>
                  ) : (
                    <select
                      value={form.plantillaId}
                      onChange={(e) => setForm({ ...form, plantillaId: e.target.value })}
                      className="w-full px-3 py-2.5 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl text-[14px]"
                    >
                      <option value="">Selecciona...</option>
                      {plantillas.map((p) => (<option key={p.id} value={p.id}>{p.nombre}</option>))}
                    </select>
                  )}
                </div>

                {/* A/B toggle */}
                {form.plantillaId && (
                  <div className="border border-[var(--border-primary)] rounded-xl p-4 bg-[var(--bg-primary)]">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={abMode}
                        onChange={(e) => setAbMode(e.target.checked)}
                        className="mt-0.5 w-4 h-4 accent-violet-500"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <FlaskConical className="w-4 h-4 text-violet-500" />
                          <span className="text-[14px] font-medium text-[var(--text-primary)]">A/B test</span>
                        </div>
                        <p className="text-[12px] text-[var(--text-tertiary)] mt-1">
                          Manda 2-4 variantes a una muestra. Después comparas métricas y promueves la ganadora al resto de la audiencia.
                        </p>
                      </div>
                    </label>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {isStep('variantes') && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-[18px] font-semibold text-[var(--text-primary)] flex items-center gap-2">
                <FlaskConical className="w-5 h-5 text-violet-500" /> Variantes ({variantes.length})
              </h2>
              {variantes.length < 4 && (
                <button onClick={addVariante} className="flex items-center gap-1 px-3 py-1.5 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded-lg text-[12px] font-medium">
                  <Plus className="w-3.5 h-3.5" /> Añadir variante
                </button>
              )}
            </div>

            <div className={`flex items-center gap-3 p-3 rounded-xl ${
              varSum > 100 || varSum === 0
                ? 'bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
                : 'bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
            } text-[13px]`}>
              <span className="font-semibold tabular-nums">{varSum}% muestra</span>
              <span>·</span>
              <span>{100 - varSum}% reservado para la ganadora</span>
              {varSum > 100 && <span className="ml-auto font-medium">Excede 100% — ajusta los %</span>}
            </div>

            <div className="space-y-3">
              {variantes.map((v, i) => (
                <div key={i} className="border border-[var(--border-primary)] rounded-xl p-4 bg-[var(--bg-primary)] space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 text-white text-[13px] font-bold flex items-center justify-center">{v.letra}</span>
                      <span className="text-[13px] font-medium text-[var(--text-primary)]">Variante {v.letra}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        max={50}
                        value={v.porcentaje}
                        onChange={(e) => updateVariante(i, { porcentaje: parseInt(e.target.value) || 0 })}
                        className="w-16 px-2 py-1 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg text-[12px] text-right tabular-nums"
                      />
                      <span className="text-[12px] text-[var(--text-tertiary)]">% audiencia</span>
                      {variantes.length > 2 && (
                        <button onClick={() => removeVariante(i)} className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1">Asunto</label>
                    <input
                      value={v.asunto}
                      onChange={(e) => updateVariante(i, { asunto: e.target.value })}
                      className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg text-[13px] font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1">Cuerpo HTML</label>
                    <textarea
                      value={v.cuerpoHtml}
                      onChange={(e) => updateVariante(i, { cuerpoHtml: e.target.value })}
                      rows={6}
                      className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg text-[12px] font-mono resize-y"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {isStep('audiencia') && (
          <div className="space-y-5">
            <h2 className="text-[18px] font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <Filter className="w-5 h-5 text-violet-500" /> Audiencia
            </h2>
            <p className="text-[13px] text-[var(--text-tertiary)]">
              Filtra los leads de <strong>{form.softwareId}</strong> que tengan email y no estén dados de baja.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-1.5">Estado</label>
                <select
                  value={form.filtroEstado}
                  onChange={(e) => setForm({ ...form, filtroEstado: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl text-[13px]"
                >
                  <option value="">Cualquiera</option>
                  {ESTADOS.map((e) => (<option key={e} value={e}>{e}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-1.5">Prioridad</label>
                <select
                  value={form.filtroPrioridad}
                  onChange={(e) => setForm({ ...form, filtroPrioridad: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl text-[13px]"
                >
                  <option value="">Cualquiera</option>
                  {PRIORIDADES.map((p) => (<option key={p} value={p}>{p}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-1.5">Origen</label>
                <input
                  value={form.filtroOrigen}
                  onChange={(e) => setForm({ ...form, filtroOrigen: e.target.value })}
                  placeholder="ej: prospeccion-bcn"
                  className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl text-[13px]"
                />
              </div>
            </div>

            {/* Preview */}
            <div className="border border-[var(--border-primary)] rounded-xl p-5 bg-[var(--bg-primary)]">
              {loadingAudience ? (
                <div className="flex items-center gap-2 text-[var(--text-tertiary)] text-[13px]">
                  <Loader2 className="w-4 h-4 animate-spin" /> Calculando audiencia...
                </div>
              ) : (
                <>
                  <div className="flex items-baseline gap-3 mb-4">
                    <span className="text-[32px] font-bold text-[var(--text-primary)] tabular-nums">{audience.total}</span>
                    <span className="text-[14px] text-[var(--text-secondary)]">leads coinciden</span>
                  </div>
                  {audience.total === 0 ? (
                    <p className="text-[13px] text-amber-700 dark:text-amber-400">Sin leads — ajusta los filtros.</p>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-[11px] uppercase tracking-wider text-[var(--text-tertiary)] font-semibold">Muestra</p>
                      {audience.sample.map((l) => (
                        <div key={l.id} className="flex items-center justify-between py-1.5 border-b border-[var(--border-primary)] last:border-0">
                          <div>
                            <p className="text-[13px] font-medium text-[var(--text-primary)]">{l.nombre}</p>
                            <p className="text-[11px] text-[var(--text-tertiary)]">{l.email}</p>
                          </div>
                          <p className="text-[11px] text-[var(--text-tertiary)]">{l.metadata?.municipio || ''}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {isStep('revisar') && plantilla && (
          <div className="space-y-5">
            <h2 className="text-[18px] font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <Eye className="w-5 h-5 text-emerald-500" /> Revisar
            </h2>
            {abMode && (
              <div className="p-3 rounded-xl bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800 text-[13px] text-violet-700 dark:text-violet-300 flex items-center gap-2">
                <FlaskConical className="w-4 h-4" />
                <span>A/B con {variantes.length} variantes ({varSum}% audiencia muestra, {100 - varSum}% reservado para ganadora)</span>
              </div>
            )}
            <p className="text-[13px] text-[var(--text-tertiary)]">
              Preview renderizado con datos del primer lead{firstLead ? ` (${firstLead.nombre})` : ''}.
            </p>

            <div className="grid grid-cols-2 gap-4 text-[13px]">
              <div className="p-3 rounded-xl bg-[var(--bg-tertiary)]">
                <p className="text-[11px] uppercase tracking-wider text-[var(--text-tertiary)] mb-1">Sender</p>
                <p className="text-[var(--text-primary)] font-medium">{sender?.nombre}</p>
                <p className="text-[12px] text-[var(--text-tertiary)]">{sender?.email}</p>
              </div>
              <div className="p-3 rounded-xl bg-[var(--bg-tertiary)]">
                <p className="text-[11px] uppercase tracking-wider text-[var(--text-tertiary)] mb-1">Audiencia</p>
                <p className="text-[var(--text-primary)] font-medium tabular-nums">{audience.total} leads</p>
                <p className="text-[12px] text-[var(--text-tertiary)]">{form.softwareId}</p>
              </div>
            </div>

            <div className="bg-white text-black border border-[var(--border-primary)] rounded-xl p-6">
              <div className="text-[12px] text-gray-500 mb-4 pb-3 border-b border-gray-200">
                <strong>De:</strong> {sender?.nombre} &lt;{sender?.email}&gt;<br />
                <strong>Para:</strong> {firstLead?.email}<br />
                <strong>Asunto:</strong> {renderedAsunto}
              </div>
              <div dangerouslySetInnerHTML={{ __html: renderedHtml }} />
              <hr className="mt-8 border-gray-200" />
              <p className="text-[11px] text-gray-400 mt-3 text-center">
                ¿No te interesa? <span className="underline">Cancelar suscripción</span>
              </p>
            </div>
          </div>
        )}

        {isStep('lanzar') && (
          <div className="space-y-5">
            <h2 className="text-[18px] font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <Rocket className="w-5 h-5 text-orange-500" /> Lanzar
            </h2>
            <div>
              <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-1.5">Nombre de la campaña</label>
              <input
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                placeholder={`Campaña ${new Date().toLocaleDateString('es-ES')}`}
                className="w-full px-3 py-2.5 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl text-[14px]"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-center">
              <div className="p-4 rounded-xl bg-[var(--bg-tertiary)]">
                <p className="text-[24px] font-bold text-[var(--text-primary)] tabular-nums">{audience.total}</p>
                <p className="text-[11px] text-[var(--text-tertiary)] uppercase tracking-wider">Destinatarios</p>
              </div>
              <div className="p-4 rounded-xl bg-[var(--bg-tertiary)]">
                <p className="text-[24px] font-bold text-[var(--text-primary)] tabular-nums">~{Math.ceil(audience.total / 6)}s</p>
                <p className="text-[11px] text-[var(--text-tertiary)] uppercase tracking-wider">Duración (6/seg)</p>
              </div>
              <div className="p-4 rounded-xl bg-[var(--bg-tertiary)]">
                <p className="text-[24px] font-bold text-[var(--text-primary)]">Resend</p>
                <p className="text-[11px] text-[var(--text-tertiary)] uppercase tracking-wider">Proveedor</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-[13px] text-amber-800 dark:text-amber-300 flex gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold mb-1">Antes de lanzar:</p>
                <ul className="list-disc list-inside space-y-0.5 text-[12px]">
                  <li>Dominio del sender verificado en Resend (SPF/DKIM/DMARC).</li>
                  <li>Has hecho un envío de prueba con la plantilla.</li>
                  <li>El contenido cumple normativa (incluye baja, identifica al remitente).</li>
                </ul>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-600 text-[13px]">{error}</div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => handleLaunch(true)}
                disabled={launching}
                className="px-5 py-2.5 bg-[var(--bg-tertiary)] text-[var(--text-secondary)] rounded-xl text-[14px] font-medium disabled:opacity-50"
              >
                Guardar como borrador
              </button>
              <button
                onClick={() => handleLaunch(false)}
                disabled={launching}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl text-[14px] font-semibold hover:shadow-lg disabled:opacity-50"
              >
                {launching ? <><Loader2 className="w-4 h-4 animate-spin" /> Lanzando...</> : <><Send className="w-4 h-4" /> Lanzar a {audience.total} leads</>}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Nav buttons */}
      {step < STEPS.length - 1 && (
        <div className="flex justify-between">
          <button
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0}
            className="flex items-center gap-2 px-4 py-2.5 text-[var(--text-secondary)] disabled:opacity-30 text-[14px]"
          >
            <ArrowLeft className="w-4 h-4" /> Atrás
          </button>
          <button
            onClick={() => setStep(step + 1)}
            disabled={!canGoNext()}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-500 to-violet-600 text-white rounded-xl text-[14px] font-medium disabled:opacity-40"
          >
            Siguiente <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
