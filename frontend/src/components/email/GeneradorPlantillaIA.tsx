'use client';

import { useState } from 'react';
import { apiClient } from '@/lib/api';
import { Sparkles, Wand2, Loader2, Eye, Save, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';

interface Props {
  onSaved?: (p: any) => void;
  onCancel?: () => void;
}

const TIPOS = [
  { value: 'cold_outreach', label: 'Cold Outreach', desc: 'Primer contacto con leads fríos' },
  { value: 'follow_up', label: 'Follow-up', desc: 'Seguimiento tras primer contacto' },
  { value: 'newsletter', label: 'Newsletter', desc: 'Actualización mensual/semanal' },
  { value: 'onboarding', label: 'Onboarding', desc: 'Bienvenida a nuevos clientes' },
  { value: 'reengagement', label: 'Re-engagement', desc: 'Reactivar contactos inactivos' },
  { value: 'promotional', label: 'Promocional', desc: 'Ofertas y descuentos' },
];

const TONOS = [
  { value: 'profesional', label: 'Profesional' },
  { value: 'casual', label: 'Casual / Amigable' },
  { value: 'persuasivo', label: 'Persuasivo' },
  { value: 'directo', label: 'Directo / Conciso' },
  { value: 'empatico', label: 'Empático' },
  { value: 'creativo', label: 'Creativo / Original' },
];

export default function GeneradorPlantillaIA({ onSaved, onCancel }: Props) {
  const [softwares, setSoftwares] = useState<{ saas: string }[]>([]);
  const [step, setStep] = useState<'form' | 'generating' | 'preview' | 'saving'>('form');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    softwareId: '',
    tipo: 'cold_outreach',
    objetivo: '',
    tono: 'profesional',
    industria: '',
  });
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  // Cargar softwares al montar
  useState(() => {
    apiClient.getSaasList().then((r) => {
      setSoftwares(r.data);
      if (r.data.length > 0) {
        setForm((f) => ({ ...f, softwareId: r.data[0].saas }));
      }
    }).catch(() => setSoftwares([]));
  });

  const handleGenerate = async () => {
    if (!form.softwareId || !form.objetivo) {
      setError('Selecciona un software y describe el objetivo del email');
      return;
    }
    setError('');
    setStep('generating');
    try {
      const res = await apiClient.generateEmailPlantilla({
        tipo: form.tipo,
        objetivo: form.objetivo,
        tono: form.tono,
        industria: form.industria,
        softwareId: form.softwareId,
      });
      setResult(res.data);
      setStep('preview');
    } catch (err: any) {
      setError(err.message || 'Error generando plantilla');
      setStep('form');
    }
  };

  const handleSave = async () => {
    if (!result) return;
    setSaving(true);
    try {
      const res = await apiClient.createEmailPlantilla({
        softwareId: result.softwareId,
        tipo: result.tipo,
        nombre: result.nombre,
        asunto: result.asunto,
        cuerpoHtml: result.cuerpoHtml,
        cuerpoTexto: result.cuerpoTexto,
        variables: result.variables,
      });
      onSaved?.(res.data);
    } catch (err: any) {
      setError(err.message || 'Error guardando plantilla');
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerate = () => {
    setStep('form');
    setResult(null);
  };

  if (step === 'generating') {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="relative w-16 h-16"
        >
          <div className="absolute inset-0 rounded-full bg-violet-100 dark:bg-violet-900/30 animate-ping" />
          <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center"
          >
            <Sparkles className="w-8 h-8 text-white" />
          </div>
        </div>
        <p className="text-[16px] font-semibold text-[var(--text-primary)]"
        >Generando plantilla con IA...</p>
        <p className="text-[13px] text-[var(--text-tertiary)]"
        >Esto puede tardar unos segundos</p>
      </div>
    );
  }

  if (step === 'preview' && result) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 mb-4"
        >
          <CheckCircle className="w-5 h-5 text-emerald-500" />
          <h2 className="text-[18px] font-semibold text-[var(--text-primary)]"
          >Plantilla generada</h2>
        </div>

        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl p-5 space-y-4"
        >
          <div>
            <label className="text-[12px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider"
            >Nombre</label
            >
            <p className="text-[15px] font-medium text-[var(--text-primary)] mt-1"
            >{result.nombre}</p>
          </div>
          <div>
            <label className="text-[12px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider"
            >Asunto</label
            >
            <p className="text-[15px] text-[var(--text-primary)] mt-1 font-mono"
            >{result.asunto}</p>
          </div>
          <div>
            <label className="text-[12px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider"
            >Variables detectadas</label
            >
            <div className="flex flex-wrap gap-1 mt-1.5"
            >
              {result.variables?.map((v: string) => (
                <span key={v} className="px-1.5 py-0.5 rounded bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-[11px] font-mono"
                >
                  {'{{' + v + '}}'}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div>
          <label className="text-[12px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider mb-2 block"
          >Preview del email</label
          >
          <div className="bg-white text-black border border-[var(--border-primary)] rounded-2xl overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50"
            >
              <p className="text-[13px] text-gray-600"
              >
                <strong>Asunto:</strong> {result.asunto}
              </p>
            </div>
            <div className="px-6 py-6"
            >
              <div dangerouslySetInnerHTML={{ __html: result.cuerpoHtml }} />
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-[13px] flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-2"
        >
          <button
            onClick={handleRegenerate}
            className="flex items-center gap-2 px-4 py-2.5 bg-[var(--bg-tertiary)] text-[var(--text-secondary)] rounded-xl text-[14px] font-medium hover:text-[var(--text-primary)] transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Regenerar
          </button>
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-4 py-2.5 bg-[var(--bg-tertiary)] text-[var(--text-secondary)] rounded-xl text-[14px] font-medium hover:text-[var(--text-primary)] transition-colors"
            >
              Cancelar
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-violet-600 text-white rounded-xl text-[14px] font-medium hover:shadow-lg transition-all disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Guardar plantilla
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // Form step
  return (
    <div className="space-y-6"
    >
      <div className="flex items-center gap-3 mb-2"
      >
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center"
        >
          <Wand2 className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-[18px] font-semibold text-[var(--text-primary)]"
          >Generador de plantillas con IA</h2>
          <p className="text-[13px] text-[var(--text-secondary)]"
          >Describe tu objetivo y la IA creará una plantilla profesional</p>
        </div>
      </div>

      <div className="space-y-5"
      >
        <div>
          <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-1.5"
          >Software *</label
          >
          <select
            value={form.softwareId}
            onChange={(e) => setForm({ ...form, softwareId: e.target.value })}
            className="w-full px-3 py-2.5 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl text-[14px]"
          >
            <option value="" disabled
            >Selecciona un software...</option
            >
            {softwares.map((s) => (
              <option key={s.saas} value={s.saas}
              >{s.saas}</option
              >
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-1.5"
          >Tipo de email *</label
          >
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2"
          >
            {TIPOS.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setForm({ ...form, tipo: t.value })}
                className={`text-left px-3 py-2.5 rounded-xl border text-[13px] transition-all ${
                  form.tipo === t.value
                    ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300'
                    : 'border-[var(--border-primary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
                }`}
              >
                <div className="font-medium"
                >{t.label}</div
                >
                <div className="text-[11px] text-[var(--text-tertiary)] mt-0.5"
                >{t.desc}</div
                >
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-1.5"
          >Tono *</label
          >
          <div className="flex flex-wrap gap-2"
          >
            {TONOS.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setForm({ ...form, tono: t.value })}
                className={`px-3 py-1.5 rounded-full text-[13px] font-medium transition-all ${
                  form.tono === t.value
                    ? 'bg-violet-500 text-white'
                    : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-1.5"
          >Objetivo del email *</label
          >
          <textarea
            value={form.objetivo}
            onChange={(e) => setForm({ ...form, objetivo: e.target.value })}
            placeholder="Ej: Contactar a peluquerías caninas de Barcelona para ofrecerles una web profesional con reservas online"
            rows={3}
            className="w-full px-3 py-2.5 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl text-[14px] resize-none"
          />
        </div>

        <div>
          <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-1.5"
          >Industria / Nicho (opcional)</label
          >
          <input
            value={form.industria}
            onChange={(e) => setForm({ ...form, industria: e.target.value })}
            placeholder="Ej: Peluquerías caninas, Restauración, Fitness..."
            className="w-full px-3 py-2.5 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl text-[14px]"
          />
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-[13px] flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="flex gap-3"
      >
        {onCancel && (
          <button
            onClick={onCancel}
            className="px-5 py-2.5 bg-[var(--bg-tertiary)] text-[var(--text-secondary)] rounded-xl text-[14px] font-medium hover:text-[var(--text-primary)] transition-colors"
          >
            Cancelar
          </button>
        )}
        <button
          onClick={handleGenerate}
          disabled={!form.softwareId || !form.objetivo}
          className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl text-[14px] font-medium hover:shadow-lg hover:shadow-violet-500/25 transition-all disabled:opacity-50"
        >
          <Sparkles className="w-4 h-4" />
          Generar plantilla
        </button>
      </div>
    </div>
  );
}
