'use client';

import { useEffect, useRef, useState } from 'react';
import { apiClient } from '@/lib/api';
import { Tag, Eye, Code2, Send, Save, AlertCircle } from 'lucide-react';

interface Plantilla {
  id?: string;
  softwareId: string;
  nombre: string;
  asunto: string;
  cuerpoHtml: string;
  cuerpoTexto?: string;
  variables?: string[];
  tipo?: string;
}

interface Sender {
  id: string;
  softwareId: string;
  email: string;
  nombre: string;
  esDefault: boolean;
  activo: boolean;
}

interface Props {
  initial?: Plantilla;
  onSaved?: (p: any) => void;
  onCancel?: () => void;
}

const TIPOS_PLANTILLA = [
  { value: 'cold_outreach', label: 'Cold Outreach' },
  { value: 'follow_up', label: 'Follow-up' },
  { value: 'newsletter', label: 'Newsletter' },
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'reengagement', label: 'Re-engagement' },
  { value: 'promotional', label: 'Promocional' },
  { value: 'custom', label: 'Personalizada' },
];

// Variables disponibles que llena emailService.contextFromLead
const AVAILABLE_VARS = [
  { key: 'nombre', desc: 'Nombre del lead/negocio' },
  { key: 'empresa', desc: 'Empresa' },
  { key: 'email', desc: 'Email del lead' },
  { key: 'telefono', desc: 'Teléfono del lead' },
  { key: 'municipio', desc: 'Municipio (metadata)' },
];

// Datos de muestra para el preview
const SAMPLE_CONTEXT: Record<string, string> = {
  nombre: 'Bub Bub S.C.P.',
  empresa: 'Bub Bub S.C.P.',
  email: 'contacto@bubbub.com',
  telefono: '934 41 71 48',
  municipio: 'Barcelona (Ciutat Vella – Raval)',
};

function renderTpl(tpl: string, ctx: Record<string, string>): string {
  return tpl.replace(/\{\{\s*([a-zA-Z_][\w]*)\s*\}\}/g, (_m, k) => ctx[k] ?? '');
}

export default function PlantillaEditor({ initial, onSaved, onCancel }: Props) {
  const [softwares, setSoftwares] = useState<{ saas: string }[]>([]);
  const [senders, setSenders] = useState<Sender[]>([]);
  const [form, setForm] = useState<Plantilla>({
    softwareId: initial?.softwareId || '',
    nombre: initial?.nombre || '',
    asunto: initial?.asunto || '',
    cuerpoHtml: initial?.cuerpoHtml || '<p>Hola {{nombre}},</p>\n<p>Soy [tu nombre] de PeluGuau. Vi que en {{municipio}} todavía no tenéis web propia y…</p>\n<p>¿Te vendría bien una llamada de 10 min?</p>\n<p>Un saludo</p>',
    variables: initial?.variables || [],
    tipo: initial?.tipo || 'custom',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [view, setView] = useState<'html' | 'preview'>('html');
  const [testEmail, setTestEmail] = useState('');
  const [testSenderId, setTestSenderId] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const subjectRef = useRef<HTMLInputElement>(null);
  const lastFocusedRef = useRef<'asunto' | 'cuerpo'>('cuerpo');

  useEffect(() => {
    apiClient.getSaasList().then((r) => setSoftwares(r.data)).catch(() => setSoftwares([]));
  }, []);

  useEffect(() => {
    if (form.softwareId) {
      apiClient.getEmailSenders(form.softwareId).then((r) => {
        setSenders(r.data);
        const def = r.data.find((s: Sender) => s.esDefault && s.activo);
        if (def) setTestSenderId(def.id);
        else if (r.data.length > 0) setTestSenderId(r.data[0].id);
      }).catch(() => setSenders([]));
    }
  }, [form.softwareId]);

  // Auto-extract variables used in template
  useEffect(() => {
    const found = new Set<string>();
    const re = /\{\{\s*([a-zA-Z_][\w]*)\s*\}\}/g;
    let m: RegExpExecArray | null;
    [form.asunto, form.cuerpoHtml].forEach((t) => {
      while ((m = re.exec(t)) !== null) found.add(m[1]);
    });
    setForm((f) => ({ ...f, variables: Array.from(found) }));
  }, [form.asunto, form.cuerpoHtml]);

  const insertVar = (key: string) => {
    const token = `{{${key}}}`;
    if (lastFocusedRef.current === 'asunto' && subjectRef.current) {
      const el = subjectRef.current;
      const start = el.selectionStart ?? form.asunto.length;
      const end = el.selectionEnd ?? form.asunto.length;
      const next = form.asunto.slice(0, start) + token + form.asunto.slice(end);
      setForm({ ...form, asunto: next });
      setTimeout(() => { el.focus(); el.setSelectionRange(start + token.length, start + token.length); }, 0);
    } else if (bodyRef.current) {
      const el = bodyRef.current;
      const start = el.selectionStart ?? form.cuerpoHtml.length;
      const end = el.selectionEnd ?? form.cuerpoHtml.length;
      const next = form.cuerpoHtml.slice(0, start) + token + form.cuerpoHtml.slice(end);
      setForm({ ...form, cuerpoHtml: next });
      setTimeout(() => { el.focus(); el.setSelectionRange(start + token.length, start + token.length); }, 0);
    }
  };

  const handleSave = async () => {
    setError('');
    if (!form.softwareId || !form.nombre || !form.asunto || !form.cuerpoHtml) {
      setError('Software, nombre, asunto y cuerpo son obligatorios');
      return;
    }
    setSaving(true);
    try {
      let result;
      if (initial?.id) {
        result = await apiClient.updateEmailPlantilla(initial.id, form);
      } else {
        result = await apiClient.createEmailPlantilla(form);
      }
      onSaved?.(result.data);
    } catch (err: any) {
      setError(err.message || 'Error guardando');
    } finally {
      setSaving(false);
    }
  };

  const handleTestSend = async () => {
    setTestResult(null);
    if (!testEmail || !testSenderId) {
      setTestResult({ ok: false, msg: 'Selecciona un sender y un email de prueba' });
      return;
    }
    setTesting(true);
    try {
      // Renderizamos en cliente con el sample context para el envío de prueba
      const asuntoRendered = renderTpl(form.asunto, SAMPLE_CONTEXT);
      const cuerpoRendered = renderTpl(form.cuerpoHtml, SAMPLE_CONTEXT);
      await apiClient.sendEmail({
        senderId: testSenderId,
        destinatario: testEmail,
        asunto: `[PRUEBA] ${asuntoRendered}`,
        cuerpoHtml: cuerpoRendered,
        softwareId: form.softwareId,
      });
      setTestResult({ ok: true, msg: `Email de prueba enviado a ${testEmail}` });
    } catch (err: any) {
      setTestResult({ ok: false, msg: err.message || 'Error enviando prueba' });
    } finally {
      setTesting(false);
    }
  };

  const previewAsunto = renderTpl(form.asunto, SAMPLE_CONTEXT);
  const previewBody = renderTpl(form.cuerpoHtml, SAMPLE_CONTEXT);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
      {/* Editor */}
      <div className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-1.5">Software *</label>
            <select
              required
              value={form.softwareId}
              onChange={(e) => setForm({ ...form, softwareId: e.target.value })}
              disabled={!!initial?.id}
              className="w-full px-3 py-2.5 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl text-[14px] disabled:opacity-60"
            >
              <option value="" disabled>Selecciona...</option>
              {softwares.map((s) => (
                <option key={s.saas} value={s.saas}>{s.saas}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-1.5">Nombre interno *</label>
            <input
              required
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              placeholder="Cold outreach v1"
              className="w-full px-3 py-2.5 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl text-[14px]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-1.5">Tipo de plantilla</label>
            <select
              value={form.tipo}
              onChange={(e) => setForm({ ...form, tipo: e.target.value })}
              className="w-full px-3 py-2.5 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl text-[14px]"
            >
              {TIPOS_PLANTILLA.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-1.5">Asunto *</label>
          <input
            ref={subjectRef}
            required
            value={form.asunto}
            onChange={(e) => setForm({ ...form, asunto: e.target.value })}
            onFocus={() => { lastFocusedRef.current = 'asunto'; }}
            placeholder="Hola {{nombre}}, una idea para {{empresa}}"
            className="w-full px-3 py-2.5 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl text-[14px] font-mono"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[13px] font-medium text-[var(--text-secondary)]">Cuerpo (HTML) *</label>
            <div className="flex items-center bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => setView('html')}
                className={`px-2.5 py-1 rounded text-[12px] font-medium flex items-center gap-1 ${
                  view === 'html' ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]'
                }`}
              >
                <Code2 className="w-3 h-3" /> HTML
              </button>
              <button
                type="button"
                onClick={() => setView('preview')}
                className={`px-2.5 py-1 rounded text-[12px] font-medium flex items-center gap-1 ${
                  view === 'preview' ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]'
                }`}
              >
                <Eye className="w-3 h-3" /> Preview
              </button>
            </div>
          </div>
          {view === 'html' ? (
            <textarea
              ref={bodyRef}
              required
              value={form.cuerpoHtml}
              onChange={(e) => setForm({ ...form, cuerpoHtml: e.target.value })}
              onFocus={() => { lastFocusedRef.current = 'cuerpo'; }}
              rows={16}
              className="w-full px-3 py-2.5 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl text-[13px] font-mono resize-y"
            />
          ) : (
            <div className="bg-white text-black border border-[var(--border-primary)] rounded-xl p-6 min-h-[400px]">
              <div className="text-[12px] text-gray-500 mb-4 pb-3 border-b border-gray-200">
                <strong>Asunto:</strong> {previewAsunto || <em className="text-gray-400">(vacío)</em>}
              </div>
              <div dangerouslySetInnerHTML={{ __html: previewBody }} />
              <hr className="mt-8 border-gray-200" />
              <p className="text-[11px] text-gray-400 mt-3 text-center">
                ¿No te interesa? <span className="underline">Cancelar suscripción</span>
              </p>
            </div>
          )}
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-[13px] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-500 to-violet-600 text-white rounded-xl text-[14px] font-medium hover:shadow-lg disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Guardando...' : initial?.id ? 'Actualizar plantilla' : 'Crear plantilla'}
          </button>
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-5 py-2.5 bg-[var(--bg-tertiary)] text-[var(--text-secondary)] rounded-xl text-[14px] font-medium"
            >
              Cancelar
            </button>
          )}
        </div>
      </div>

      {/* Right rail: variables + test send */}
      <div className="space-y-5">
        {/* Variables */}
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Tag className="w-4 h-4 text-violet-500" />
            <h3 className="text-[14px] font-semibold text-[var(--text-primary)]">Variables</h3>
          </div>
          <p className="text-[12px] text-[var(--text-tertiary)] mb-3">Click para insertar en el último campo enfocado.</p>
          <div className="space-y-1.5">
            {AVAILABLE_VARS.map((v) => {
              const used = form.variables?.includes(v.key);
              return (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => insertVar(v.key)}
                  className={`w-full text-left px-3 py-2 rounded-lg border text-[12px] transition-colors ${
                    used
                      ? 'border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/30'
                      : 'border-[var(--border-primary)] hover:bg-[var(--bg-tertiary)]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <code className="font-mono text-[12px] text-violet-700 dark:text-violet-300">{`{{${v.key}}}`}</code>
                    {used && <span className="text-[10px] text-violet-500">usado</span>}
                  </div>
                  <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">{v.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Test send */}
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Send className="w-4 h-4 text-emerald-500" />
            <h3 className="text-[14px] font-semibold text-[var(--text-primary)]">Enviar prueba</h3>
          </div>
          <p className="text-[12px] text-[var(--text-tertiary)] mb-3">Renderiza con datos de ejemplo y envía a un email tuyo.</p>
          <div className="space-y-2">
            <select
              value={testSenderId}
              onChange={(e) => setTestSenderId(e.target.value)}
              className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg text-[12px]"
            >
              <option value="" disabled>Sender...</option>
              {senders.filter((s) => s.activo).map((s) => (
                <option key={s.id} value={s.id}>{s.nombre} &lt;{s.email}&gt;</option>
              ))}
            </select>
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="tu@email.com"
              className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg text-[12px]"
            />
            <button
              type="button"
              onClick={handleTestSend}
              disabled={testing || !testEmail || !testSenderId}
              className="w-full px-3 py-2 bg-emerald-600 text-white rounded-lg text-[12px] font-medium hover:bg-emerald-700 disabled:opacity-50"
            >
              {testing ? 'Enviando...' : 'Enviar prueba'}
            </button>
            {testResult && (
              <div className={`p-2 rounded-lg text-[12px] ${
                testResult.ok
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300'
                  : 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300'
              }`}>
                {testResult.msg}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
