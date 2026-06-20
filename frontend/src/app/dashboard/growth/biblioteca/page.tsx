'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiClient } from '@/lib/api';
import Link from 'next/link';
import {
  ArrowLeft,
  Plus,
  Library,
  Search,
  Image as ImageIcon,
  Video,
  FileText,
  Music,
  Layers,
  Film,
  Edit3,
  Trash2,
  X,
  Save,
  Hash,
  Copy,
  Check,
  TrendingUp,
} from 'lucide-react';

const inputClass =
  'w-full px-3 py-2.5 rounded-xl border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30';

type Tab = 'media' | 'copy';

const ASSET_TYPES = [
  { value: 'IMAGE', label: 'Imagen', icon: ImageIcon },
  { value: 'VIDEO', label: 'Video', icon: Video },
  { value: 'GIF', label: 'GIF', icon: Film },
  { value: 'CAROUSEL', label: 'Carousel', icon: Layers },
  { value: 'DOCUMENT', label: 'Documento', icon: FileText },
  { value: 'AUDIO', label: 'Audio', icon: Music },
] as const;

const SNIPPET_TYPES = [
  { value: 'CAPTION', label: 'Caption' },
  { value: 'CTA', label: 'CTA' },
  { value: 'HASHTAG_SET', label: 'Set de hashtags' },
  { value: 'BIO', label: 'Bio' },
  { value: 'RESPONSE', label: 'Respuesta' },
  { value: 'HOOK', label: 'Hook' },
] as const;

interface MediaAsset {
  id: string;
  nombre: string;
  descripcion?: string;
  tipo: string;
  url: string;
  thumbnailUrl?: string;
  tags: string[];
  usoCount: number;
  brand?: { nombre: string; colorPrimario: string };
}

interface CopySnippet {
  id: string;
  nombre: string;
  contenido: string;
  tipo: string;
  plataformas: string[];
  tags: string[];
  usoCount: number;
  brand?: { nombre: string; colorPrimario: string };
}

export default function BibliotecaPage() {
  const [softwares, setSoftwares] = useState<Array<{ id: string; nombre: string }>>([]);
  const [softwareId, setSoftwareId] = useState('');
  const [brands, setBrands] = useState<Array<{ id: string; nombre: string }>>([]);
  const [tab, setTab] = useState<Tab>('media');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [snippets, setSnippets] = useState<CopySnippet[]>([]);
  const [loading, setLoading] = useState(true);

  const [assetModal, setAssetModal] = useState(false);
  const [snippetModal, setSnippetModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState<MediaAsset | null>(null);
  const [editingSnippet, setEditingSnippet] = useState<CopySnippet | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  useEffect(() => {
    if (!softwareId) return;
    apiClient.getBrands(softwareId).then((r) => setBrands(r?.brands || [])).catch(() => setBrands([]));
  }, [softwareId]);

  const load = useCallback(async () => {
    if (!softwareId) return;
    setLoading(true);
    try {
      if (tab === 'media') {
        const params: Record<string, string> = { softwareId };
        if (search) params.search = search;
        if (typeFilter) params.tipo = typeFilter;
        const res = await apiClient.getMediaAssets(params);
        setAssets(res?.assets || []);
      } else {
        const params: Record<string, string> = { softwareId };
        if (search) params.search = search;
        if (typeFilter) params.tipo = typeFilter;
        const res = await apiClient.getCopySnippets(params);
        setSnippets(res?.snippets || []);
      }
    } catch {
      setAssets([]);
      setSnippets([]);
    } finally {
      setLoading(false);
    }
  }, [softwareId, tab, search, typeFilter]);

  useEffect(() => {
    if (softwareId) {
      const t = setTimeout(load, search ? 300 : 0);
      return () => clearTimeout(t);
    }
  }, [softwareId, load, search]);

  function switchTab(t: Tab) {
    setTab(t);
    setTypeFilter('');
    setSearch('');
  }

  async function copyToClipboard(s: CopySnippet) {
    try {
      await navigator.clipboard.writeText(s.contenido);
      setCopiedId(s.id);
      apiClient.useCopySnippet(s.id).catch(() => {});
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      /* noop */
    }
  }

  async function handleDeleteAsset(a: MediaAsset) {
    if (!confirm(`¿Eliminar "${a.nombre}" de la biblioteca?`)) return;
    await apiClient.deleteMediaAsset(a.id).catch(() => {});
    load();
  }

  async function handleDeleteSnippet(s: CopySnippet) {
    if (!confirm(`¿Eliminar "${s.nombre}"?`)) return;
    await apiClient.deleteCopySnippet(s.id).catch(() => {});
    load();
  }

  const typeFilters = tab === 'media' ? ASSET_TYPES : SNIPPET_TYPES;

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
              <Library className="w-8 h-8 text-primary" /> Biblioteca de contenido
            </h1>
            <p className="text-muted-foreground mt-2 max-w-xl">
              Catálogo central de media y copys reutilizables. Etiqueta, busca e inserta en tus posts.
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
              onClick={() => (tab === 'media' ? (setEditingAsset(null), setAssetModal(true)) : (setEditingSnippet(null), setSnippetModal(true)))}
              disabled={!softwareId}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-primary/20 disabled:opacity-40"
            >
              <Plus className="w-4 h-4" /> {tab === 'media' ? 'Añadir media' : 'Añadir copy'}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-xl border bg-card w-fit">
        <TabButton active={tab === 'media'} onClick={() => switchTab('media')} icon={ImageIcon} label="Media" />
        <TabButton active={tab === 'copy'} onClick={() => switchTab('copy')} icon={FileText} label="Copy" />
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Buscar ${tab === 'media' ? 'assets' : 'copys'}...`}
            className="w-full pl-9 pr-3 py-2 rounded-lg border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="">Todos los tipos</option>
          {typeFilters.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-48 rounded-2xl border bg-card animate-pulse" />
          ))}
        </div>
      ) : tab === 'media' ? (
        assets.length === 0 ? (
          <EmptyState icon={ImageIcon} title="Sin media" desc="Añade imágenes, videos o documentos reutilizables." />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {assets.map((a) => {
              const TypeIcon = ASSET_TYPES.find((t) => t.value === a.tipo)?.icon || ImageIcon;
              const isImage = a.tipo === 'IMAGE' || a.tipo === 'GIF';
              return (
                <div key={a.id} className="group relative rounded-2xl border bg-card overflow-hidden hover:shadow-xl transition-all">
                  <div className="relative aspect-square bg-muted flex items-center justify-center overflow-hidden">
                    {isImage && (a.thumbnailUrl || a.url) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={a.thumbnailUrl || a.url} alt={a.nombre} className="w-full h-full object-cover" />
                    ) : (
                      <TypeIcon className="w-10 h-10 text-muted-foreground/40" />
                    )}
                    <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-black/60 text-white text-[10px] font-semibold uppercase flex items-center gap-1">
                      <TypeIcon className="w-3 h-3" /> {a.tipo}
                    </div>
                    <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => { setEditingAsset(a); setAssetModal(true); }}
                        className="p-1.5 rounded-lg bg-black/60 text-white hover:bg-black/80"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteAsset(a)}
                        className="p-1.5 rounded-lg bg-black/60 text-white hover:bg-red-500"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="p-3">
                    <h3 className="font-semibold text-sm truncate" title={a.nombre}>{a.nombre}</h3>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {a.tags.slice(0, 3).map((t) => (
                        <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">#{t}</span>
                      ))}
                    </div>
                    <div className="flex items-center gap-1 mt-2 text-[11px] text-muted-foreground">
                      <TrendingUp className="w-3 h-3" /> {a.usoCount} usos
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : snippets.length === 0 ? (
        <EmptyState icon={FileText} title="Sin copys" desc="Guarda captions, CTAs, hooks y sets de hashtags." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {snippets.map((s) => (
            <div key={s.id} className="group relative p-4 rounded-2xl border bg-card hover:shadow-xl transition-all">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                    {SNIPPET_TYPES.find((t) => t.value === s.tipo)?.label || s.tipo}
                  </span>
                  <h3 className="font-semibold text-sm mt-1.5 truncate" title={s.nombre}>{s.nombre}</h3>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button onClick={() => { setEditingSnippet(s); setSnippetModal(true); }} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDeleteSnippet(s)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <p className="mt-2 text-sm text-muted-foreground line-clamp-4 whitespace-pre-wrap">{s.contenido}</p>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> {s.usoCount} usos
                </span>
                <button
                  onClick={() => copyToClipboard(s)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold hover:bg-muted"
                >
                  {copiedId === s.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedId === s.id ? 'Copiado' : 'Copiar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {assetModal && (
        <AssetModal
          softwareId={softwareId}
          brands={brands}
          editing={editingAsset}
          onClose={() => setAssetModal(false)}
          onSaved={() => { setAssetModal(false); load(); }}
        />
      )}
      {snippetModal && (
        <SnippetModal
          softwareId={softwareId}
          brands={brands}
          editing={editingSnippet}
          onClose={() => setSnippetModal(false)}
          onSaved={() => { setSnippetModal(false); load(); }}
        />
      )}
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: any; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
        active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
      }`}
    >
      <Icon className="w-4 h-4" /> {label}
    </button>
  );
}

function EmptyState({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-dashed bg-card p-12 text-center">
      <Icon className="w-12 h-12 mx-auto text-muted-foreground/40" />
      <h3 className="mt-4 text-lg font-bold">{title}</h3>
      <p className="text-muted-foreground mt-1">{desc}</p>
    </div>
  );
}

function TagEditor({ tags, onChange }: { tags: string[]; onChange: (tags: string[]) => void }) {
  const [input, setInput] = useState('');
  function add() {
    const t = input.trim().replace(/^#/, '');
    if (t && !tags.includes(t)) onChange([...tags, t]);
    setInput('');
  }
  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-2">
        {tags.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
            #{t}
            <button onClick={() => onChange(tags.filter((x) => x !== t))}><X className="w-3 h-3" /></button>
          </span>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
            className={`${inputClass} pl-9`}
            placeholder="tag y Enter"
          />
        </div>
        <button onClick={add} className="px-3 py-2 rounded-lg border bg-card hover:bg-muted text-sm">Añadir</button>
      </div>
    </div>
  );
}

function ModalShell({ title, onClose, children, onSave, saving, canSave }: { title: string; onClose: () => void; children: React.ReactNode; onSave: () => void; saving: boolean; canSave: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border bg-card shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between p-5 border-b bg-card z-10">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">{children}</div>
        <div className="sticky bottom-0 flex items-center justify-end gap-3 p-5 border-t bg-card">
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl border bg-card hover:bg-muted text-sm font-semibold">Cancelar</button>
          <button onClick={onSave} disabled={saving || !canSave} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-40">
            <Save className="w-4 h-4" /> {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
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

function AssetModal({ softwareId, brands, editing, onClose, onSaved }: { softwareId: string; brands: Array<{ id: string; nombre: string }>; editing: MediaAsset | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    nombre: editing?.nombre || '',
    descripcion: editing?.descripcion || '',
    tipo: editing?.tipo || 'IMAGE',
    url: editing?.url || '',
    thumbnailUrl: editing?.thumbnailUrl || '',
    brandId: editing?.brand ? '' : '',
    tags: editing?.tags || [],
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const payload = { ...form, softwareId, brandId: form.brandId || null };
      if (editing) await apiClient.updateMediaAsset(editing.id, payload);
      else await apiClient.createMediaAsset(payload);
      onSaved();
    } catch (e: any) {
      alert(e?.message || 'Error al guardar');
      setSaving(false);
    }
  }

  return (
    <ModalShell title={editing ? 'Editar media' : 'Añadir media'} onClose={onClose} onSave={save} saving={saving} canSave={!!form.nombre.trim() && !!form.url.trim()}>
      <Field label="Nombre *">
        <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className={inputClass} placeholder="Banner verano" />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Tipo">
          <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} className={inputClass}>
            {ASSET_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </Field>
        <Field label="Brand">
          <select value={form.brandId} onChange={(e) => setForm({ ...form, brandId: e.target.value })} className={inputClass}>
            <option value="">Sin brand</option>
            {brands.map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}
          </select>
        </Field>
      </div>
      <Field label="URL del archivo *">
        <input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} className={inputClass} placeholder="https://.../media.jpg" />
      </Field>
      <Field label="Thumbnail URL (opcional)">
        <input value={form.thumbnailUrl} onChange={(e) => setForm({ ...form, thumbnailUrl: e.target.value })} className={inputClass} placeholder="https://.../thumb.jpg" />
      </Field>
      <Field label="Descripción">
        <textarea value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} className={`${inputClass} min-h-[60px] resize-y`} />
      </Field>
      <Field label="Tags">
        <TagEditor tags={form.tags} onChange={(tags) => setForm({ ...form, tags })} />
      </Field>
    </ModalShell>
  );
}

function SnippetModal({ softwareId, brands, editing, onClose, onSaved }: { softwareId: string; brands: Array<{ id: string; nombre: string }>; editing: CopySnippet | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    nombre: editing?.nombre || '',
    contenido: editing?.contenido || '',
    tipo: editing?.tipo || 'CAPTION',
    brandId: '',
    tags: editing?.tags || [],
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const payload = { ...form, softwareId, brandId: form.brandId || null };
      if (editing) await apiClient.updateCopySnippet(editing.id, payload);
      else await apiClient.createCopySnippet(payload);
      onSaved();
    } catch (e: any) {
      alert(e?.message || 'Error al guardar');
      setSaving(false);
    }
  }

  return (
    <ModalShell title={editing ? 'Editar copy' : 'Añadir copy'} onClose={onClose} onSave={save} saving={saving} canSave={!!form.nombre.trim() && !!form.contenido.trim()}>
      <Field label="Nombre *">
        <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className={inputClass} placeholder="CTA reserva" />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Tipo">
          <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} className={inputClass}>
            {SNIPPET_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </Field>
        <Field label="Brand">
          <select value={form.brandId} onChange={(e) => setForm({ ...form, brandId: e.target.value })} className={inputClass}>
            <option value="">Sin brand</option>
            {brands.map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Contenido *">
        <textarea value={form.contenido} onChange={(e) => setForm({ ...form, contenido: e.target.value })} className={`${inputClass} min-h-[140px] resize-y`} placeholder="El texto reutilizable..." />
      </Field>
      <Field label="Tags">
        <TagEditor tags={form.tags} onChange={(tags) => setForm({ ...form, tags })} />
      </Field>
    </ModalShell>
  );
}
