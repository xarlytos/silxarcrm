'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api';
import { useRouter } from 'next/navigation';
import {
  Layers, Save, Plus, Trash2, RefreshCw, ChevronDown, ChevronUp,
  Palette, Target, Users, MessageSquare, TrendingUp, Globe,
} from 'lucide-react';
import Link from 'next/link';

interface Software {
  id: string;
  slug: string;
  nombre: string;
  tagline?: string;
  descripcion?: string;
  urlWebsite?: string;
  logoUrl?: string;
  faviconUrl?: string;
  colorPrimario: string;
  colorSecundario?: string;
  dominioLanding?: string;
  categoria?: string;
  nicho?: string;
  problemaPrincipal?: string;
  promesaValor?: string;
  diferenciador?: string;
  icpTitulo?: string;
  icpDescripcion?: string;
  icpIngresosAnuales?: string;
  icpTamanoEquipo?: string;
  icpUbicacion?: string;
  icpDolorTop1?: string;
  icpDolorTop2?: string;
  icpDolorTop3?: string;
  activo: boolean;
  createdAt: string;
}

const INITIAL_FORM: Partial<Software> = {
  slug: '',
  nombre: '',
  tagline: '',
  descripcion: '',
  urlWebsite: '',
  logoUrl: '',
  faviconUrl: '',
  colorPrimario: '#6366F1',
  colorSecundario: '',
  dominioLanding: '',
  categoria: '',
  nicho: '',
  problemaPrincipal: '',
  promesaValor: '',
  diferenciador: '',
  icpTitulo: '',
  icpDescripcion: '',
  icpIngresosAnuales: '',
  icpTamanoEquipo: '',
  icpUbicacion: '',
  icpDolorTop1: '',
  icpDolorTop2: '',
  icpDolorTop3: '',
  activo: true,
};

const SECTIONS = [
  { key: 'general', label: 'General', icon: Globe },
  { key: 'posicionamiento', label: 'Posicionamiento', icon: Target },
  { key: 'icp', label: 'Audiencia (ICP)', icon: Users },
  { key: 'branding', label: 'Branding', icon: Palette },
];

export default function SoftwaresConfigPage() {
  const router = useRouter();
  const [softwares, setSoftwares] = useState<Software[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Software>>(INITIAL_FORM);
  const [isNew, setIsNew] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    general: true,
    posicionamiento: true,
    icp: true,
    branding: true,
  });

  const fetchSoftwares = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.getSoftwares();
      setSoftwares(res.data || []);
      if (res.data?.length > 0 && !selectedId) {
        selectSoftware(res.data[0]);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    fetchSoftwares();
  }, [fetchSoftwares]);

  const selectSoftware = (s: Software) => {
    setSelectedId(s.id);
    setForm({ ...s });
    setIsNew(false);
    setError('');
  };

  const handleNew = () => {
    setSelectedId(null);
    setForm(INITIAL_FORM);
    setIsNew(true);
    setError('');
  };

  const handleChange = (field: keyof Software, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!form.slug || !form.nombre) {
      setError('Slug y nombre son obligatorios');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (isNew) {
        await apiClient.createSoftware(form);
      } else if (selectedId) {
        await apiClient.updateSoftware(selectedId, form);
      }
      await fetchSoftwares();
      setIsNew(false);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminar este software?')) return;
    try {
      await apiClient.deleteSoftware(id);
      setSelectedId(null);
      setForm(INITIAL_FORM);
      await fetchSoftwares();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (loading && softwares.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-2 border-[var(--border-primary)] border-t-[var(--text-primary)] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Layers className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h1 className="text-[32px] font-bold tracking-tight text-[var(--text-primary)]">Configuracion de Softwares</h1>
          </div>
          <p className="text-[15px] text-[var(--text-secondary)]">
            Gestiona branding, posicionamiento e ICP de cada SaaS
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchSoftwares()}
            className="flex items-center gap-2 px-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl text-[14px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            Actualizar
          </button>
          <button
            onClick={handleNew}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl text-[14px] font-medium hover:shadow-lg hover:shadow-violet-500/25 transition-all"
          >
            <Plus className="w-4 h-4" />
            Nuevo software
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-[13px]">
          {error}
        </div>
      )}

      <div className="grid grid-cols-12 gap-6">
        {/* Sidebar */}
        <div className="col-span-12 lg:col-span-3">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--border-primary)]">
              <p className="text-[12px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)]">
                Softwares ({softwares.length})
              </p>
            </div>
            <div className="divide-y divide-[var(--border-primary)]">
              {softwares.map((s) => (
                <button
                  key={s.id}
                  onClick={() => selectSoftware(s)}
                  className={`w-full text-left px-4 py-3 transition-colors ${
                    selectedId === s.id
                      ? 'bg-blue-500/5 border-l-2 border-blue-500'
                      : 'hover:bg-[var(--bg-tertiary)]/50 border-l-2 border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[14px] font-semibold text-[var(--text-primary)]">{s.nombre}</p>
                      <p className="text-[11px] text-[var(--text-tertiary)]">{s.slug}</p>
                    </div>
                    {!s.activo && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600">Inactivo</span>
                    )}
                  </div>
                </button>
              ))}
              {softwares.length === 0 && (
                <div className="px-4 py-8 text-center">
                  <p className="text-[13px] text-[var(--text-tertiary)]">No hay softwares configurados</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="col-span-12 lg:col-span-9">
          {(selectedId || isNew) ? (
            <div className="space-y-4">
              {/* Actions bar */}
              <div className="flex items-center justify-between">
                <h2 className="text-[18px] font-semibold text-[var(--text-primary)]">
                  {isNew ? 'Nuevo software' : form.nombre}
                </h2>
                <div className="flex items-center gap-2">
                  {!isNew && selectedId && (
                    <button
                      onClick={() => handleDelete(selectedId)}
                      className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-600 rounded-xl text-[13px] font-medium hover:bg-red-500/20 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                      Eliminar
                    </button>
                  )}
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl text-[13px] font-medium hover:shadow-lg hover:shadow-violet-500/25 transition-all disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    {saving ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </div>

              {/* General */}
              <Section title="General" sectionKey="general" icon={Globe} expanded={expandedSections} onToggle={toggleSection}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Slug *" value={form.slug || ''} onChange={(v) => handleChange('slug', v)} disabled={!isNew} placeholder="groomly" />
                  <Field label="Nombre *" value={form.nombre || ''} onChange={(v) => handleChange('nombre', v)} placeholder="Groomly Pro" />
                  <Field label="Tagline" value={form.tagline || ''} onChange={(v) => handleChange('tagline', v)} placeholder="One-liner para ads y meta description" className="md:col-span-2" />
                  <TextArea label="Descripcion" value={form.descripcion || ''} onChange={(v) => handleChange('descripcion', v)} placeholder="Pitch largo para landing pages" className="md:col-span-2" />
                  <Field label="URL Website" value={form.urlWebsite || ''} onChange={(v) => handleChange('urlWebsite', v)} placeholder="https://..." />
                  <Field label="Dominio Landing" value={form.dominioLanding || ''} onChange={(v) => handleChange('dominioLanding', v)} placeholder="app.tudominio.com" />
                  <Field label="Categoria" value={form.categoria || ''} onChange={(v) => handleChange('categoria', v)} placeholder="SaaS, Agencia, Consultoria..." />
                  <Field label="Nicho" value={form.nicho || ''} onChange={(v) => handleChange('nicho', v)} placeholder="peluquerias caninas, clinicas dentales..." />
                  <div className="flex items-center gap-3 md:col-span-2">
                    <input
                      type="checkbox"
                      checked={form.activo}
                      onChange={(e) => handleChange('activo', e.target.checked)}
                      className="w-4 h-4 rounded border-[var(--border-primary)]"
                    />
                    <label className="text-[13px] text-[var(--text-secondary)]">Activo</label>
                  </div>
                </div>
              </Section>

              {/* Posicionamiento */}
              <Section title="Posicionamiento" sectionKey="posicionamiento" icon={Target} expanded={expandedSections} onToggle={toggleSection}>
                <div className="space-y-4">
                  <TextArea label="Problema principal" value={form.problemaPrincipal || ''} onChange={(v) => handleChange('problemaPrincipal', v)} placeholder="Pain point que resolvemos para el cliente" />
                  <TextArea label="Promesa de valor" value={form.promesaValor || ''} onChange={(v) => handleChange('promesaValor', v)} placeholder="Value proposition principal" />
                  <TextArea label="Diferenciador" value={form.diferenciador || ''} onChange={(v) => handleChange('diferenciador', v)} placeholder="Por que nos eligen vs la competencia" />
                </div>
              </Section>

              {/* ICP */}
              <Section title="Audiencia objetivo (ICP)" sectionKey="icp" icon={Users} expanded={expandedSections} onToggle={toggleSection}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Titulo ICP" value={form.icpTitulo || ''} onChange={(v) => handleChange('icpTitulo', v)} placeholder="Duenos de peluqueria canina" />
                  <Field label="Ingresos anuales" value={form.icpIngresosAnuales || ''} onChange={(v) => handleChange('icpIngresosAnuales', v)} placeholder="50k-200k" />
                  <Field label="Tamano equipo" value={form.icpTamanoEquipo || ''} onChange={(v) => handleChange('icpTamanoEquipo', v)} placeholder="1-5 empleados" />
                  <Field label="Ubicacion" value={form.icpUbicacion || ''} onChange={(v) => handleChange('icpUbicacion', v)} placeholder="Espana, Mexico, Colombia" />
                  <TextArea label="Descripcion ICP" value={form.icpDescripcion || ''} onChange={(v) => handleChange('icpDescripcion', v)} placeholder="Descripcion detallada del perfil ideal" className="md:col-span-2" />
                  <Field label="Dolor #1" value={form.icpDolorTop1 || ''} onChange={(v) => handleChange('icpDolorTop1', v)} placeholder="Dolor principal" />
                  <Field label="Dolor #2" value={form.icpDolorTop2 || ''} onChange={(v) => handleChange('icpDolorTop2', v)} placeholder="Segundo dolor" />
                  <Field label="Dolor #3" value={form.icpDolorTop3 || ''} onChange={(v) => handleChange('icpDolorTop3', v)} placeholder="Tercer dolor" className="md:col-span-2" />
                </div>
              </Section>

              {/* Branding */}
              <Section title="Branding" sectionKey="branding" icon={Palette} expanded={expandedSections} onToggle={toggleSection}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Logo URL" value={form.logoUrl || ''} onChange={(v) => handleChange('logoUrl', v)} placeholder="https://..." />
                  <Field label="Favicon URL" value={form.faviconUrl || ''} onChange={(v) => handleChange('faviconUrl', v)} placeholder="https://..." />
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)] mb-1.5">Color primario</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={form.colorPrimario || '#6366F1'}
                        onChange={(e) => handleChange('colorPrimario', e.target.value)}
                        className="w-10 h-10 rounded-lg border border-[var(--border-primary)] cursor-pointer"
                      />
                      <input
                        type="text"
                        value={form.colorPrimario || ''}
                        onChange={(e) => handleChange('colorPrimario', e.target.value)}
                        className="flex-1 h-10 px-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[13px] text-[var(--text-primary)]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)] mb-1.5">Color secundario</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={form.colorSecundario || '#ffffff'}
                        onChange={(e) => handleChange('colorSecundario', e.target.value)}
                        className="w-10 h-10 rounded-lg border border-[var(--border-primary)] cursor-pointer"
                      />
                      <input
                        type="text"
                        value={form.colorSecundario || ''}
                        onChange={(e) => handleChange('colorSecundario', e.target.value)}
                        className="flex-1 h-10 px-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[13px] text-[var(--text-primary)]"
                        placeholder="Opcional"
                      />
                    </div>
                  </div>
                </div>
              </Section>
            </div>
          ) : (
            <div className="bg-[var(--bg-secondary)] border border-dashed border-[var(--border-primary)] rounded-2xl p-16 text-center">
              <Layers className="w-10 h-10 text-[var(--text-tertiary)] mx-auto mb-4" />
              <p className="text-[16px] text-[var(--text-secondary)] font-medium mb-2">Selecciona un software o crea uno nuevo</p>
              <p className="text-[14px] text-[var(--text-tertiary)] mb-6">Configura branding, posicionamiento y perfil de cliente ideal</p>
              <button
                onClick={handleNew}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl text-[13px] font-medium hover:shadow-lg hover:shadow-violet-500/25 transition-all"
              >
                <Plus className="w-4 h-4" />
                Crear software
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  sectionKey,
  icon: Icon,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  sectionKey: string;
  icon: React.ElementType;
  expanded: Record<string, boolean>;
  onToggle: (key: string) => void;
  children: React.ReactNode;
}) {
  const isOpen = expanded[sectionKey] ?? true;
  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl overflow-hidden">
      <button
        onClick={() => onToggle(sectionKey)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-[var(--bg-tertiary)]/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-[var(--text-tertiary)]" />
          <h3 className="text-[14px] font-semibold text-[var(--text-primary)]">{title}</h3>
        </div>
        {isOpen ? <ChevronUp className="w-4 h-4 text-[var(--text-tertiary)]" /> : <ChevronDown className="w-4 h-4 text-[var(--text-tertiary)]" />}
      </button>
      {isOpen && <div className="px-5 pb-5">{children}</div>}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  disabled,
  className = '',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-[11px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)] mb-1.5">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        className="w-full h-10 px-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]/50 focus:outline-none focus:ring-2 focus:ring-violet-500/30 disabled:opacity-50"
      />
    </div>
  );
}

function TextArea({
  label,
  value,
  onChange,
  placeholder,
  className = '',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-[11px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)] mb-1.5">
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full px-3 py-2 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]/50 focus:outline-none focus:ring-2 focus:ring-violet-500/30 resize-y"
      />
    </div>
  );
}
