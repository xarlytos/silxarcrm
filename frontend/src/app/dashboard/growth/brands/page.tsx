'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiClient } from '@/lib/api';
import Link from 'next/link';
import {
  ArrowLeft,
  Plus,
  Building2,
  Globe,
  Hash,
  Users,
  Megaphone,
  Edit3,
  Trash2,
  X,
  Save,
  Link2,
  Copy,
  CheckCircle,
  ExternalLink,
} from 'lucide-react';

interface Brand {
  id: string;
  softwareId: string;
  nombre: string;
  slug: string;
  logoUrl?: string;
  colorPrimario: string;
  descripcion?: string;
  industria?: string;
  website?: string;
  emailContacto?: string;
  brandVoice?: string;
  contentGuidelines?: string;
  hashtagsOficiales: string[];
  activo: boolean;
  createdAt: string;
  portalEnabled?: boolean;
  portalToken?: string | null;
  _count?: { socialAccounts: number; campaigns: number };
}

const inputClass =
  'w-full px-3 py-2.5 rounded-xl border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30';

const EMPTY_BRAND = {
  nombre: '',
  slug: '',
  logoUrl: '',
  colorPrimario: '#6366F1',
  descripcion: '',
  industria: '',
  website: '',
  emailContacto: '',
  brandVoice: '',
  contentGuidelines: '',
  hashtagsOficiales: [] as string[],
};

export default function BrandsPage() {
  const [softwares, setSoftwares] = useState<Array<{ id: string; nombre: string }>>([]);
  const [softwareId, setSoftwareId] = useState('');
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Brand | null>(null);
  const [form, setForm] = useState<typeof EMPTY_BRAND>(EMPTY_BRAND);
  const [hashtagInput, setHashtagInput] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiClient.getSoftwares();
        const list = res?.data || [];
        setSoftwares(list);
        if (list.length > 0) setSoftwareId(list[0].id);
        else setLoading(false);
      } catch {
        setLoading(false);
      }
    })();
  }, []);

  const loadBrands = useCallback(async () => {
    if (!softwareId) return;
    setLoading(true);
    try {
      const res = await apiClient.getBrands(softwareId);
      setBrands(res?.brands || []);
    } catch {
      setBrands([]);
    } finally {
      setLoading(false);
    }
  }, [softwareId]);

  useEffect(() => {
    if (softwareId) loadBrands();
  }, [softwareId, loadBrands]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_BRAND);
    setHashtagInput('');
    setModalOpen(true);
  }

  function openEdit(brand: Brand) {
    setEditing(brand);
    setForm({
      nombre: brand.nombre,
      slug: brand.slug,
      logoUrl: brand.logoUrl || '',
      colorPrimario: brand.colorPrimario || '#6366F1',
      descripcion: brand.descripcion || '',
      industria: brand.industria || '',
      website: brand.website || '',
      emailContacto: brand.emailContacto || '',
      brandVoice: brand.brandVoice || '',
      contentGuidelines: brand.contentGuidelines || '',
      hashtagsOficiales: brand.hashtagsOficiales || [],
    });
    setHashtagInput('');
    setModalOpen(true);
  }

  function addHashtag() {
    const tag = hashtagInput.trim().replace(/^#/, '');
    if (tag && !form.hashtagsOficiales.includes(tag)) {
      setForm((f) => ({ ...f, hashtagsOficiales: [...f.hashtagsOficiales, tag] }));
    }
    setHashtagInput('');
  }

  async function handleSave() {
    if (!form.nombre.trim()) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        softwareId,
        slug: form.slug.trim() || form.nombre.toLowerCase().replace(/\s+/g, '-'),
      };
      if (editing) {
        await apiClient.updateBrand(editing.id, payload);
      } else {
        await apiClient.createBrand(payload);
      }
      setModalOpen(false);
      await loadBrands();
    } catch (e: any) {
      alert(e?.message || 'Error al guardar el brand');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(brand: Brand) {
    if (!confirm(`¿Eliminar el brand "${brand.nombre}"? Esto desvincula sus cuentas y elimina sus campañas.`)) return;
    try {
      await apiClient.deleteBrand(brand.id);
      await loadBrands();
    } catch (e: any) {
      alert(e?.message || 'Error al eliminar');
    }
  }

  // --- Portal del cliente ---
  const [copiedPortal, setCopiedPortal] = useState<string | null>(null);

  function portalUrl(token: string) {
    return `${typeof window !== 'undefined' ? window.location.origin : ''}/portal/${token}`;
  }

  async function activatePortal(brand: Brand) {
    try {
      await apiClient.enableBrandPortal(brand.id);
      await loadBrands();
    } catch (e: any) {
      alert(e?.message || 'Error activando el portal');
    }
  }

  async function deactivatePortal(brand: Brand) {
    if (!confirm(`¿Desactivar el portal de "${brand.nombre}"? El enlace dejará de funcionar.`)) return;
    try {
      await apiClient.disableBrandPortal(brand.id);
      await loadBrands();
    } catch (e: any) {
      alert(e?.message || 'Error desactivando el portal');
    }
  }

  function copyPortal(brand: Brand) {
    if (!brand.portalToken) return;
    navigator.clipboard.writeText(portalUrl(brand.portalToken));
    setCopiedPortal(brand.id);
    setTimeout(() => setCopiedPortal(null), 2000);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border bg-card p-6 sm:p-8">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Link
              href="/dashboard/growth"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-3 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Growth Engine
            </Link>
            <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
              <Building2 className="w-8 h-8 text-primary" /> Brands
            </h1>
            <p className="text-muted-foreground mt-2 max-w-xl">
              Gestiona tus clientes (marcas) dentro de un software. Cada brand agrupa cuentas, campañas y guidelines.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <select
              value={softwareId}
              onChange={(e) => setSoftwareId(e.target.value)}
              className="px-4 py-2.5 rounded-xl border bg-card text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {softwares.map((s) => (
                <option key={s.id} value={s.id}>{s.nombre}</option>
              ))}
            </select>
            <button
              onClick={openCreate}
              disabled={!softwareId}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-primary/20 disabled:opacity-40"
            >
              <Plus className="w-4 h-4" /> Nuevo brand
            </button>
          </div>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-44 rounded-2xl border bg-card animate-pulse" />
          ))}
        </div>
      ) : brands.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-card p-12 text-center">
          <Building2 className="w-12 h-12 mx-auto text-muted-foreground/40" />
          <h3 className="mt-4 text-lg font-bold">Sin brands todavía</h3>
          <p className="text-muted-foreground mt-1">Crea tu primer cliente para organizar cuentas y campañas.</p>
          <button
            onClick={openCreate}
            disabled={!softwareId}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-40"
          >
            <Plus className="w-4 h-4" /> Crear brand
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {brands.map((brand) => (
            <div
              key={brand.id}
              className="group relative p-5 rounded-2xl border bg-card transition-all duration-300 hover:-translate-y-1 hover:shadow-xl overflow-hidden"
            >
              <div
                className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-2xl opacity-10 group-hover:opacity-20 transition-opacity"
                style={{ backgroundColor: brand.colorPrimario }}
              />
              <div className="relative flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {brand.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={brand.logoUrl} alt={brand.nombre} className="w-12 h-12 rounded-xl object-cover border" />
                  ) : (
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg"
                      style={{ backgroundColor: brand.colorPrimario }}
                    >
                      {brand.nombre.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h3 className="font-bold leading-tight">{brand.nombre}</h3>
                    {brand.industria && (
                      <span className="text-xs text-muted-foreground">{brand.industria}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openEdit(brand)}
                    className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
                    title="Editar"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(brand)}
                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {brand.descripcion && (
                <p className="relative mt-3 text-sm text-muted-foreground line-clamp-2">{brand.descripcion}</p>
              )}

              <div className="relative mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" /> {brand._count?.socialAccounts ?? 0} cuentas
                </span>
                <span className="inline-flex items-center gap-1">
                  <Megaphone className="w-3.5 h-3.5" /> {brand._count?.campaigns ?? 0} campañas
                </span>
                {brand.website && (
                  <a
                    href={brand.website}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 hover:text-primary"
                  >
                    <Globe className="w-3.5 h-3.5" /> web
                  </a>
                )}
              </div>

              {/* Portal del cliente */}
              <div className="relative mt-4 pt-3 border-t border-border/60 flex items-center justify-between gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                  <Link2 className="w-3.5 h-3.5" />
                  Portal del cliente
                  {brand.portalEnabled && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                </span>
                {brand.portalEnabled && brand.portalToken ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => copyPortal(brand)}
                      className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
                      title="Copiar enlace del portal"
                    >
                      {copiedPortal === brand.id ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <a
                      href={portalUrl(brand.portalToken)}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
                      title="Abrir portal"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <button
                      onClick={() => deactivatePortal(brand)}
                      className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500"
                      title="Desactivar portal"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => activatePortal(brand)}
                    className="px-2.5 py-1 rounded-lg border text-xs font-medium hover:bg-muted transition-colors"
                  >
                    Activar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border bg-card shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between p-5 border-b bg-card z-10">
              <h2 className="text-lg font-bold">{editing ? 'Editar brand' : 'Nuevo brand'}</h2>
              <button onClick={() => setModalOpen(false)} className="p-1.5 rounded-lg hover:bg-muted">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Nombre *">
                  <input
                    value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                    className={inputClass}
                    placeholder="Atleevo"
                  />
                </Field>
                <Field label="Slug">
                  <input
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value })}
                    className={inputClass}
                    placeholder="atleevo (auto si vacío)"
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Industria">
                  <input
                    value={form.industria}
                    onChange={(e) => setForm({ ...form, industria: e.target.value })}
                    className={inputClass}
                    placeholder="Deporte / Fitness"
                  />
                </Field>
                <Field label="Color de marca">
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={form.colorPrimario}
                      onChange={(e) => setForm({ ...form, colorPrimario: e.target.value })}
                      className="w-10 h-10 rounded-lg border cursor-pointer bg-transparent"
                    />
                    <input
                      value={form.colorPrimario}
                      onChange={(e) => setForm({ ...form, colorPrimario: e.target.value })}
                      className={`${inputClass} flex-1`}
                    />
                  </div>
                </Field>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Website">
                  <input
                    value={form.website}
                    onChange={(e) => setForm({ ...form, website: e.target.value })}
                    className={inputClass}
                    placeholder="https://..."
                  />
                </Field>
                <Field label="Email de contacto">
                  <input
                    value={form.emailContacto}
                    onChange={(e) => setForm({ ...form, emailContacto: e.target.value })}
                    className={inputClass}
                    placeholder="hola@cliente.com"
                  />
                </Field>
              </div>

              <Field label="Logo URL">
                <input
                  value={form.logoUrl}
                  onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
                  className={inputClass}
                  placeholder="https://.../logo.png"
                />
              </Field>

              <Field label="Descripción">
                <textarea
                  value={form.descripcion}
                  onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                  className={`${inputClass} min-h-[70px] resize-y`}
                  placeholder="¿Quién es este cliente?"
                />
              </Field>

              <Field label="Brand voice (tono de marca)">
                <textarea
                  value={form.brandVoice}
                  onChange={(e) => setForm({ ...form, brandVoice: e.target.value })}
                  className={`${inputClass} min-h-[70px] resize-y`}
                  placeholder="Cercano, directo, sin tecnicismos..."
                />
              </Field>

              <Field label="Content guidelines">
                <textarea
                  value={form.contentGuidelines}
                  onChange={(e) => setForm({ ...form, contentGuidelines: e.target.value })}
                  className={`${inputClass} min-h-[70px] resize-y`}
                  placeholder="Reglas de contenido, qué evitar, formatos preferidos..."
                />
              </Field>

              <Field label="Hashtags oficiales">
                <div className="flex flex-wrap gap-2 mb-2">
                  {form.hashtagsOficiales.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium"
                    >
                      #{tag}
                      <button
                        onClick={() =>
                          setForm((f) => ({
                            ...f,
                            hashtagsOficiales: f.hashtagsOficiales.filter((t) => t !== tag),
                          }))
                        }
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      value={hashtagInput}
                      onChange={(e) => setHashtagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addHashtag();
                        }
                      }}
                      className={`${inputClass} pl-9`}
                      placeholder="atleevo y Enter"
                    />
                  </div>
                  <button onClick={addHashtag} className="px-3 py-2 rounded-lg border bg-card hover:bg-muted text-sm">
                    Añadir
                  </button>
                </div>
              </Field>
            </div>

            <div className="sticky bottom-0 flex items-center justify-end gap-3 p-5 border-t bg-card">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border bg-card hover:bg-muted text-sm font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.nombre.trim()}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-40"
              >
                <Save className="w-4 h-4" /> {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        :global(.input) {
          width: 100%;
          padding: 0.6rem 0.75rem;
          border-radius: 0.65rem;
          border: 1px solid hsl(var(--border));
          background: hsl(var(--background));
          font-size: 0.875rem;
          outline: none;
        }
        :global(.input:focus) {
          box-shadow: 0 0 0 2px hsl(var(--primary) / 0.3);
        }
      `}</style>
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
