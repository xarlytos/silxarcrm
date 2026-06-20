'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiClient } from '@/lib/api';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Megaphone,
  Target,
  Calendar,
  FileText,
  Save,
} from 'lucide-react';

const inputClass =
  'w-full px-3 py-2.5 rounded-xl border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30';

const OBJETIVOS = [
  { value: 'AWARENESS', label: 'Awareness', desc: 'Dar a conocer la marca' },
  { value: 'ENGAGEMENT', label: 'Engagement', desc: 'Generar interacción' },
  { value: 'CONVERSION', label: 'Conversión', desc: 'Convertir seguidores en acción' },
  { value: 'TRAFFIC', label: 'Tráfico', desc: 'Llevar visitas a la web' },
  { value: 'LEADS', label: 'Leads', desc: 'Captar contactos' },
  { value: 'SALES', label: 'Ventas', desc: 'Vender producto/servicio' },
  { value: 'UGC', label: 'UGC', desc: 'Contenido de usuarios' },
  { value: 'LAUNCH', label: 'Lanzamiento', desc: 'Lanzar algo nuevo' },
];

const STEPS = ['Básicos', 'Objetivo', 'Fechas y presupuesto', 'Brief y KPIs'];

export default function NuevaCampanaPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetSoftware = searchParams.get('softwareId') || '';

  const [softwares, setSoftwares] = useState<Array<{ id: string; nombre: string }>>([]);
  const [brands, setBrands] = useState<Array<{ id: string; nombre: string; colorPrimario: string }>>([]);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    softwareId: presetSoftware,
    brandId: '',
    nombre: '',
    descripcion: '',
    objetivo: 'AWARENESS',
    fechaInicio: '',
    fechaFin: '',
    presupuesto: '',
    moneda: 'EUR',
    colorTag: '#6366F1',
    briefCreativo: '',
    kpiAlcance: '',
    kpiEngagement: '',
    kpiClicks: '',
    kpiConversiones: '',
  });

  useEffect(() => {
    (async () => {
      try {
        const res = await apiClient.getSoftwares();
        const list = res?.data || [];
        setSoftwares(list);
        if (!presetSoftware && list.length > 0) {
          setForm((f) => ({ ...f, softwareId: list[0].id }));
        }
      } catch {
        /* noop */
      }
    })();
  }, [presetSoftware]);

  useEffect(() => {
    if (!form.softwareId) return;
    apiClient
      .getBrands(form.softwareId)
      .then((r) => {
        const list = r?.brands || [];
        setBrands(list);
        setForm((f) => ({ ...f, brandId: f.brandId || list[0]?.id || '' }));
      })
      .catch(() => setBrands([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.softwareId]);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const canNext = () => {
    if (step === 0) return form.softwareId && form.brandId && form.nombre.trim();
    return true;
  };

  async function handleCreate() {
    setSaving(true);
    try {
      const kpisObjetivo: Record<string, number> = {};
      if (form.kpiAlcance) kpisObjetivo.alcance = Number(form.kpiAlcance);
      if (form.kpiEngagement) kpisObjetivo.engagement = Number(form.kpiEngagement);
      if (form.kpiClicks) kpisObjetivo.clicks = Number(form.kpiClicks);
      if (form.kpiConversiones) kpisObjetivo.conversiones = Number(form.kpiConversiones);

      const payload = {
        softwareId: form.softwareId,
        brandId: form.brandId,
        nombre: form.nombre,
        descripcion: form.descripcion || undefined,
        objetivo: form.objetivo,
        fechaInicio: form.fechaInicio || undefined,
        fechaFin: form.fechaFin || undefined,
        presupuesto: form.presupuesto || undefined,
        moneda: form.moneda,
        colorTag: form.colorTag,
        briefCreativo: form.briefCreativo || undefined,
        kpisObjetivo: Object.keys(kpisObjetivo).length ? kpisObjetivo : undefined,
      };

      const created = await apiClient.createCampaign(payload);
      router.push(`/dashboard/growth/campanas/${created.id}`);
    } catch (e: any) {
      alert(e?.message || 'Error al crear la campaña');
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link
          href="/dashboard/growth/campanas"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-3 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Campañas
        </Link>
        <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
          <Megaphone className="w-8 h-8 text-primary" /> Nueva campaña
        </h1>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2 flex-1">
            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-colors ${
                  i < step
                    ? 'bg-primary text-primary-foreground'
                    : i === step
                    ? 'bg-primary/20 text-primary border-2 border-primary'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {i < step ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              <span className={`text-sm hidden sm:block ${i === step ? 'font-semibold' : 'text-muted-foreground'}`}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && <div className="flex-1 h-px bg-border" />}
          </div>
        ))}
      </div>

      <div className="rounded-2xl border bg-card p-6 space-y-5">
        {step === 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Software *">
                <select value={form.softwareId} onChange={(e) => set('softwareId', e.target.value)} className={inputClass}>
                  <option value="">Selecciona...</option>
                  {softwares.map((s) => (
                    <option key={s.id} value={s.id}>{s.nombre}</option>
                  ))}
                </select>
              </Field>
              <Field label="Brand (cliente) *">
                <select value={form.brandId} onChange={(e) => set('brandId', e.target.value)} className={inputClass}>
                  <option value="">Selecciona...</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>{b.nombre}</option>
                  ))}
                </select>
                {brands.length === 0 && form.softwareId && (
                  <p className="text-xs text-amber-600 mt-1">
                    Este software no tiene brands.{' '}
                    <Link href="/dashboard/growth/brands" className="underline">Crea uno primero</Link>.
                  </p>
                )}
              </Field>
            </div>
            <Field label="Nombre de la campaña *">
              <input value={form.nombre} onChange={(e) => set('nombre', e.target.value)} className={inputClass} placeholder="Black Friday 2026" />
            </Field>
            <Field label="Descripción">
              <textarea
                value={form.descripcion}
                onChange={(e) => set('descripcion', e.target.value)}
                className={`${inputClass} min-h-[80px] resize-y`}
                placeholder="Resumen breve de la campaña"
              />
            </Field>
            <Field label="Color identificativo">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.colorTag}
                  onChange={(e) => set('colorTag', e.target.value)}
                  className="w-10 h-10 rounded-lg border cursor-pointer bg-transparent"
                />
                <input value={form.colorTag} onChange={(e) => set('colorTag', e.target.value)} className={`${inputClass} flex-1`} />
              </div>
            </Field>
          </>
        )}

        {step === 1 && (
          <>
            <div className="flex items-center gap-2 text-sm font-semibold mb-1">
              <Target className="w-4 h-4 text-primary" /> ¿Cuál es el objetivo principal?
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {OBJETIVOS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => set('objetivo', o.value)}
                  className={`text-left p-4 rounded-xl border transition-all ${
                    form.objetivo === o.value
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                      : 'hover:border-primary/40 hover:bg-muted/50'
                  }`}
                >
                  <div className="font-semibold">{o.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{o.desc}</div>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="flex items-center gap-2 text-sm font-semibold mb-1">
              <Calendar className="w-4 h-4 text-primary" /> Fechas y presupuesto
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Fecha de inicio">
                <input type="date" value={form.fechaInicio} onChange={(e) => set('fechaInicio', e.target.value)} className={inputClass} />
              </Field>
              <Field label="Fecha de fin">
                <input type="date" value={form.fechaFin} onChange={(e) => set('fechaFin', e.target.value)} className={inputClass} />
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Presupuesto">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.presupuesto}
                  onChange={(e) => set('presupuesto', e.target.value)}
                  className={inputClass}
                  placeholder="0.00"
                />
              </Field>
              <Field label="Moneda">
                <select value={form.moneda} onChange={(e) => set('moneda', e.target.value)} className={inputClass}>
                  <option value="EUR">EUR (€)</option>
                  <option value="USD">USD ($)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="MXN">MXN</option>
                </select>
              </Field>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <div className="flex items-center gap-2 text-sm font-semibold mb-1">
              <FileText className="w-4 h-4 text-primary" /> Brief creativo y KPIs objetivo
            </div>
            <Field label="Brief creativo">
              <textarea
                value={form.briefCreativo}
                onChange={(e) => set('briefCreativo', e.target.value)}
                className={`${inputClass} min-h-[120px] resize-y`}
                placeholder="Concepto, tono, mensajes clave, referencias visuales, do's & don'ts..."
              />
            </Field>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Field label="Alcance">
                <input type="number" value={form.kpiAlcance} onChange={(e) => set('kpiAlcance', e.target.value)} className={inputClass} placeholder="10000" />
              </Field>
              <Field label="Engagement %">
                <input type="number" value={form.kpiEngagement} onChange={(e) => set('kpiEngagement', e.target.value)} className={inputClass} placeholder="5" />
              </Field>
              <Field label="Clicks">
                <input type="number" value={form.kpiClicks} onChange={(e) => set('kpiClicks', e.target.value)} className={inputClass} placeholder="500" />
              </Field>
              <Field label="Conversiones">
                <input type="number" value={form.kpiConversiones} onChange={(e) => set('kpiConversiones', e.target.value)} className={inputClass} placeholder="50" />
              </Field>
            </div>
          </>
        )}
      </div>

      {/* Footer nav */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => (step === 0 ? router.push('/dashboard/growth/campanas') : setStep(step - 1))}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border bg-card hover:bg-muted text-sm font-semibold"
        >
          <ArrowLeft className="w-4 h-4" /> {step === 0 ? 'Cancelar' : 'Atrás'}
        </button>

        {step < STEPS.length - 1 ? (
          <button
            onClick={() => canNext() && setStep(step + 1)}
            disabled={!canNext()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-40"
          >
            Siguiente <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleCreate}
            disabled={saving || !form.nombre.trim() || !form.brandId}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-40"
          >
            <Save className="w-4 h-4" /> {saving ? 'Creando...' : 'Crear campaña'}
          </button>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium mb-1.5">{label}</span>
      {children}
    </label>
  );
}
