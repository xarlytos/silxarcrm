'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import {
  Plus,
  Save,
  Send,
  Clock,
  CheckCircle,
  Trash2,
  FileText,
  Sparkles,
  Eye,
  MousePointerClick,
  Heart,
  Share2,
  Search,
  X,
  Calendar,
  ArrowLeft,
  Loader2,
  Edit3,
  LayoutTemplate,
  BarChart3,
  Tag,
  MoreHorizontal,
  Globe,
  BookOpen,
  Wand2,
} from 'lucide-react';
import Link from 'next/link';

interface ContentItem {
  id: string;
  title: string;
  body: string;
  type: string;
  status: string;
  platform: string | null;
  scheduledAt: string | null;
  publishedAt: string | null;
  keywords: string[];
  excerpt: string | null;
  coverImage: string | null;
  impressions: number;
  clicks: number;
  likes: number;
  shares: number;
  comments: number;
  leadsGenerated: number;
  createdAt: string;
}

type FilterStatus = 'ALL' | 'DRAFT' | 'SCHEDULED' | 'PUBLISHED';
type ViewMode = 'edit' | 'preview' | 'metrics';

const typeLabels: Record<string, string> = {
  ARTICLE: 'Articulo',
  FAQ: 'FAQ',
  CASE_STUDY: 'Caso de exito',
  COMPARISON: 'Comparativa',
  LANDING_PAGE: 'Landing',
  POST: 'Post social',
  VIDEO_SCRIPT: 'Video',
};

const typeIcons: Record<string, any> = {
  ARTICLE: BookOpen,
  FAQ: FileText,
  CASE_STUDY: FileText,
  COMPARISON: FileText,
  LANDING_PAGE: LayoutTemplate,
  POST: Share2,
  VIDEO_SCRIPT: FileText,
};

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  DRAFT: { label: 'Borrador', color: 'text-amber-600', bg: 'bg-amber-50', icon: Edit3 },
  SCHEDULED: { label: 'Programado', color: 'text-blue-600', bg: 'bg-blue-50', icon: Clock },
  PUBLISHED: { label: 'Publicado', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle },
  FAILED: { label: 'Fallido', color: 'text-red-600', bg: 'bg-red-50', icon: X },
};

export default function BlogStudio() {
  const router = useRouter();
  const [posts, setPosts] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [softwareId, setSoftwareId] = useState('');
  const [softwares, setSoftwares] = useState<Array<{ id: string; nombre: string }>>([]);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('edit');
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Editor form
  const [editForm, setEditForm] = useState({
    title: '',
    body: '',
    excerpt: '',
    keywords: [] as string[],
    type: 'ARTICLE',
    coverImage: '',
  });
  const [hasChanges, setHasChanges] = useState(false);

  // Modals
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiType, setAiType] = useState('ARTICLE');

  const keywordInputRef = useRef<HTMLInputElement>(null);
  const [keywordInput, setKeywordInput] = useState('');

  const selectedPost = posts.find((p) => p.id === selectedPostId);

  const filteredPosts = posts.filter((p) => {
    const matchesStatus = filterStatus === 'ALL' || p.status === filterStatus;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      p.title.toLowerCase().includes(q) ||
      p.body.toLowerCase().includes(q) ||
      p.keywords.some((k) => k.toLowerCase().includes(q));
    return matchesStatus && matchesSearch;
  });

  const statusCounts = {
    ALL: posts.length,
    DRAFT: posts.filter((p) => p.status === 'DRAFT').length,
    SCHEDULED: posts.filter((p) => p.status === 'SCHEDULED').length,
    PUBLISHED: posts.filter((p) => p.status === 'PUBLISHED').length,
  };

  useEffect(() => {
    loadSoftwares();
  }, []);

  useEffect(() => {
    if (softwareId) loadContent();
  }, [softwareId]);

  useEffect(() => {
    if (selectedPost) {
      setEditForm({
        title: selectedPost.title,
        body: selectedPost.body,
        excerpt: selectedPost.excerpt || '',
        keywords: [...selectedPost.keywords],
        type: 'ARTICLE',
        coverImage: selectedPost.coverImage || '',
      });
      setHasChanges(false);
    }
  }, [selectedPostId]);

  async function loadSoftwares() {
    try {
      const res = await apiClient.getSoftwares();
      const list = Array.isArray(res) ? res : res?.data || [];
      setSoftwares(list);
      if (list.length > 0) {
        setSoftwareId(list[0].id);
      }
    } catch {
      setSoftwares([]);
    }
  }

  async function loadContent() {
    setLoading(true);
    try {
      const data = await apiClient.getGrowthContent({ softwareId, limit: '100' });
      const loaded = data.content || [];
      setPosts(loaded);
      if (loaded.length > 0 && !selectedPostId) {
        setSelectedPostId(loaded[0].id);
      }
    } catch {
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }

  function handleFormChange(updates: Partial<typeof editForm>) {
    setEditForm((prev) => ({ ...prev, ...updates }));
    setHasChanges(true);
  }

  function addKeyword() {
    const k = keywordInput.trim().toLowerCase();
    if (k && !editForm.keywords.includes(k)) {
      handleFormChange({ keywords: [...editForm.keywords, k] });
    }
    setKeywordInput('');
  }

  function removeKeyword(index: number) {
    handleFormChange({
      keywords: editForm.keywords.filter((_, i) => i !== index),
    });
  }

  async function handleSave() {
    if (!selectedPostId) return;
    setSaving(true);
    try {
      await apiClient.updateGrowthContent(selectedPostId, editForm);
      setPosts((prev) =>
        prev.map((p) =>
          p.id === selectedPostId
            ? { ...p, ...editForm }
            : p
        )
      );
      setHasChanges(false);
    } catch (err: any) {
      alert('Error guardando: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish() {
    if (!selectedPostId) return;
    if (hasChanges) {
      await handleSave();
    }
    setPublishing(true);
    try {
      await apiClient.publishGrowthContent(selectedPostId);
      await loadContent();
    } catch (err: any) {
      alert('Error publicando: ' + err.message);
    } finally {
      setPublishing(false);
    }
  }

  async function handleSchedule() {
    if (!selectedPostId || !scheduleDate) return;
    if (hasChanges) {
      await handleSave();
    }
    try {
      await apiClient.scheduleGrowthContent(selectedPostId, scheduleDate);
      setShowScheduleModal(false);
      await loadContent();
    } catch (err: any) {
      alert('Error programando: ' + err.message);
    }
  }

  async function handleGenerateWithAi() {
    if (!aiTopic.trim()) return;
    if (!softwareId) {
      alert('Selecciona un software primero');
      return;
    }
    setGenerating(true);
    try {
      await apiClient.generateGrowthContent(softwareId, {
        type: aiType,
        keyword: aiTopic,
      });
      setShowAiModal(false);
      setAiTopic('');
      await loadContent();
    } catch (err: any) {
      alert('Error generando: ' + err.message);
    } finally {
      setGenerating(false);
    }
  }

  async function handleDelete() {
    if (!selectedPostId) return;
    if (!confirm('Eliminar este contenido permanentemente?')) return;
    setDeleting(true);
    try {
      await apiClient.deleteGrowthContent(selectedPostId);
      setPosts((prev) => prev.filter((p) => p.id !== selectedPostId));
      setSelectedPostId(null);
    } catch (err: any) {
      alert('Error eliminando: ' + err.message);
    } finally {
      setDeleting(false);
    }
  }

  async function handleCreateNew() {
    if (!softwareId) {
      alert('Selecciona un software primero');
      return;
    }
    const title = 'Nuevo articulo sin titulo';
    try {
      const created = await apiClient.createGrowthContent({
        softwareId,
        title,
        body: '',
        type: 'ARTICLE',
      });
      const newPost = { ...created, keywords: created.keywords || [] } as ContentItem;
      setPosts((prev) => [newPost, ...prev]);
      setSelectedPostId(newPost.id);
      setFilterStatus('ALL');
    } catch (err: any) {
      alert('Error creando: ' + err.message);
    }
  }

  const wordCount = editForm.body.trim().split(/\s+/).filter(Boolean).length;
  const readTime = Math.max(1, Math.ceil(wordCount / 200));

  return (
    <div className="h-[calc(100vh-4rem)] flex -mx-6 -mt-6"
    >
      {/* Sidebar */}
      <aside className="w-80 border-r bg-card flex flex-col shrink-0"
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b"
        >
          <div className="flex items-center justify-between mb-3"
          >
            <div className="flex items-center gap-2"
            >
              <Link href="/dashboard/growth" className="p-1.5 rounded-lg hover:bg-muted transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <h1 className="font-bold text-lg"
              >Blog Studio</h1>
            </div>
            <button
              onClick={handleCreateNew}
              className="p-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
              title="Nuevo articulo"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <select
            value={softwareId}
            onChange={(e) => setSoftwareId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
          >
            {softwares.length === 0 && (
              <option value="" disabled>Cargando softwares...</option>
            )}
            {softwares.map((s) => (
              <option key={s.id} value={s.id}>{s.nombre}</option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b"
        >
          <div className="relative"
          >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar articulos..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border bg-background text-sm"
            />
          </div>
        </div>

        {/* Status Filters */}
        <div className="px-4 py-2 border-b flex gap-1 overflow-x-auto"
        >
          {(['ALL', 'DRAFT', 'SCHEDULED', 'PUBLISHED'] as FilterStatus[]).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                filterStatus === s
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {s === 'ALL' ? 'Todos' : statusConfig[s]?.label || s}
              <span className="ml-1.5 opacity-70"
              >{statusCounts[s]}</span>
            </button>
          ))}
        </div>

        {/* Post List */}
        <div className="flex-1 overflow-y-auto"
        >
          {loading ? (
            <div className="p-8 text-center text-muted-foreground"
            >
              <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
              Cargando...
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="p-8 text-center"
            >
              <p className="text-muted-foreground text-sm"
              >No hay articulos.</p>
              <button
                onClick={handleCreateNew}
                className="mt-3 text-sm text-primary font-medium hover:underline"
              >
                Crear el primero
              </button>
            </div>
          ) : (
            <div className="divide-y"
            >
              {filteredPosts.map((post) => {
                const cfg = statusConfig[post.status] || statusConfig.DRAFT;
                const TypeIcon = typeIcons[post.type] || FileText;
                return (
                  <button
                    key={post.id}
                    onClick={() => { setSelectedPostId(post.id); setViewMode('edit'); }}
                    className={`w-full text-left p-4 transition-colors ${
                      selectedPostId === post.id
                        ? 'bg-primary/5 border-l-4 border-l-primary'
                        : 'hover:bg-muted/50 border-l-4 border-l-transparent'
                    }`}
                  >
                    <div className="flex items-start gap-2.5"
                    >
                      <TypeIcon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="min-w-0 flex-1"
                      >
                        <p className={`text-sm font-semibold truncate ${selectedPostId === post.id ? 'text-primary' : ''}`}
                        >
                          {post.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5"
                        >
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold ${cfg.bg} ${cfg.color}`}
                          >
                            <cfg.icon className="w-3 h-3" />
                            {cfg.label}
                          </span>
                          <span className="text-[10px] text-muted-foreground"
                          >
                            {new Date(post.createdAt).toLocaleDateString('es-ES')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </aside>

      {/* Main Editor Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-background overflow-hidden"
      >
        {!selectedPost ? (
          <EmptyState onCreate={handleCreateNew} onGenerate={() => setShowAiModal(true)} />
        ) : (
          <>
            {/* Editor Toolbar */}
            <div className="flex items-center justify-between px-6 py-3 border-b shrink-0"
            >
              <div className="flex items-center gap-3"
              >
                <StatusBadge status={selectedPost.status} />
                {selectedPost.publishedAt && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1"
                  >
                    <Globe className="w-3 h-3" />
                    {new Date(selectedPost.publishedAt).toLocaleDateString('es-ES')}
                  </span>
                )}
                {selectedPost.scheduledAt && (
                  <span className="text-xs text-blue-600 flex items-center gap-1"
                  >
                    <Clock className="w-3 h-3" />
                    {new Date(selectedPost.scheduledAt).toLocaleDateString('es-ES')}
                  </span>
                )}
                {hasChanges && (
                  <span className="text-xs text-amber-600 font-semibold"
                  >Sin guardar</span>
                )}
              </div>

              <div className="flex items-center gap-2"
              >
                {/* View tabs */}
                <div className="flex items-center bg-muted rounded-lg p-0.5 mr-2"
                >
                  {[
                    { id: 'edit' as ViewMode, label: 'Editar', icon: Edit3 },
                    { id: 'preview' as ViewMode, label: 'Vista previa', icon: Eye },
                    { id: 'metrics' as ViewMode, label: 'Metricas', icon: BarChart3 },
                  ].map((v) => (
                    <button
                      key={v.id}
                      onClick={() => setViewMode(v.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                        viewMode === v.id
                          ? 'bg-card text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <v.icon className="w-3.5 h-3.5" />
                      {v.label}
                    </button>
                  ))}
                </div>

                {selectedPost.status !== 'PUBLISHED' && (
                  <>
                    <button
                      onClick={() => setShowScheduleModal(true)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold hover:bg-muted transition-colors"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      Programar
                    </button>
                    <button
                      onClick={handlePublish}
                      disabled={publishing}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500 text-white text-xs font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      {publishing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      Publicar
                    </button>
                  </>
                )}

                <button
                  onClick={handleSave}
                  disabled={saving || !hasChanges}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Guardar
                </button>

                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="p-2 rounded-lg hover:bg-red-100 text-red-500 transition-colors"
                  title="Eliminar"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto"
            >
              {viewMode === 'edit' && (
                <div className="max-w-3xl mx-auto px-8 py-8 space-y-6"
                >
                  {/* Title */}
                  <input
                    type="text"
                    value={editForm.title}
                    onChange={(e) => handleFormChange({ title: e.target.value })}
                    placeholder="Titulo del articulo..."
                    className="w-full text-3xl font-extrabold bg-transparent border-none outline-none placeholder:text-muted-foreground/40 focus:ring-0"
                  />

                  {/* Meta bar */}
                  <div className="flex items-center gap-4 flex-wrap"
                  >
                    <div className="flex items-center gap-2"
                    >
                      <span className="text-xs text-muted-foreground font-medium"
                      >{wordCount} palabras</span>
                      <span className="text-xs text-muted-foreground"
                      >·</span>
                      <span className="text-xs text-muted-foreground font-medium"
                      >{readTime} min lectura</span>
                    </div>

                    <button
                      onClick={() => setShowAiModal(true)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-violet-500/10 text-violet-600 text-xs font-bold hover:bg-violet-500/20 transition-colors"
                    >
                      <Wand2 className="w-3 h-3" />
                      Reescribir con IA
                    </button>
                  </div>

                  {/* Cover Image */}
                  <div className="space-y-2"
                  >
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                    >Imagen de portada (URL)</label>
                    <div className="flex gap-2"
                    >
                      <input
                        type="text"
                        value={editForm.coverImage}
                        onChange={(e) => handleFormChange({ coverImage: e.target.value })}
                        placeholder="https://ejemplo.com/imagen.jpg"
                        className="flex-1 px-4 py-2.5 rounded-xl border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                      {editForm.coverImage && (
                        <button
                          onClick={() => handleFormChange({ coverImage: '' })}
                          className="px-3 py-2.5 rounded-xl border hover:bg-muted transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    {editForm.coverImage && (
                      <div className="relative w-full h-48 rounded-xl overflow-hidden border bg-muted"
                      >
                        <img
                          src={editForm.coverImage}
                          alt="Portada"
                          className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Keywords */}
                  <div className="space-y-2"
                  >
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                    >Keywords SEO</label>
                    <div className="flex flex-wrap gap-1.5"
                    >
                      {editForm.keywords.map((k, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-xs font-bold"
                        >
                          {k}
                          <button
                            onClick={() => removeKeyword(i)}
                            className="hover:text-primary/70"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                      <input
                        ref={keywordInputRef}
                        type="text"
                        value={keywordInput}
                        onChange={(e) => setKeywordInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ',') {
                            e.preventDefault();
                            addKeyword();
                          }
                        }}
                        onBlur={addKeyword}
                        placeholder="+ Add keyword"
                        className="px-2 py-1 rounded-lg border bg-card text-xs min-w-[120px] focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>

                  {/* Excerpt */}
                  <div className="space-y-2"
                  >
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                    >Extracto / Meta description</label>
                    <textarea
                      value={editForm.excerpt}
                      onChange={(e) => handleFormChange({ excerpt: e.target.value })}
                      placeholder="Breve resumen del articulo para SEO y previews..."
                      rows={2}
                      className="w-full px-4 py-3 rounded-xl border bg-card text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <p className="text-[10px] text-muted-foreground"
                    >{editForm.excerpt.length}/160 caracteres recomendados</p>
                  </div>

                  {/* Body */}
                  <div className="space-y-2"
                  >
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                    >Contenido</label>
                    <textarea
                      value={editForm.body}
                      onChange={(e) => handleFormChange({ body: e.target.value })}
                      placeholder="Escribe el contenido de tu articulo aqui..."
                      className="w-full px-4 py-4 rounded-xl border bg-card text-sm leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-primary/20"
                      style={{ minHeight: '400px' }}
                    />
                  </div>
                </div>
              )}

              {viewMode === 'preview' && (
                <div className="max-w-3xl mx-auto px-8 py-8"
                >
                  <article className="prose prose-lg max-w-none dark:prose-invert"
                  >
                    {editForm.coverImage && (
                      <div className="w-full h-64 rounded-2xl overflow-hidden mb-8"
                      >
                        <img
                          src={editForm.coverImage}
                          alt={editForm.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="flex items-center gap-2 mb-4"
                    >
                      <span className="px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold"
                      >Articulo</span>
                      <span className="text-sm text-muted-foreground"
                      >{readTime} min de lectura</span>
                    </div>
                    <h1 className="text-4xl font-extrabold mb-4"
                    >{editForm.title || 'Sin titulo'}</h1>
                    {editForm.excerpt && (
                      <p className="text-xl text-muted-foreground mb-8 leading-relaxed"
                      >{editForm.excerpt}</p>
                    )}
                    <div className="whitespace-pre-wrap leading-relaxed"
                    >{editForm.body}</div>
                  </article>

                  {editForm.keywords.length > 0 && (
                    <div className="mt-8 pt-8 border-t"
                    >
                      <div className="flex items-center gap-2 mb-3"
                      >
                        <Tag className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-semibold"
                        >Tags</span>
                      </div>
                      <div className="flex flex-wrap gap-2"
                      >
                        {editForm.keywords.map((k, i) => (
                          <span key={i} className="px-3 py-1 rounded-full bg-muted text-sm"
                          >{k}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {viewMode === 'metrics' && selectedPost && (
                <div className="max-w-3xl mx-auto px-8 py-8"
                >
                  <h2 className="text-lg font-bold mb-6"
                  >Metricas del articulo</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4"
                  >
                    <MetricCard label="Impresiones" value={selectedPost.impressions} icon={Eye} />
                    <MetricCard label="Clics" value={selectedPost.clicks} icon={MousePointerClick} />
                    <MetricCard label="Likes" value={selectedPost.likes} icon={Heart} />
                    <MetricCard label="Compartidos" value={selectedPost.shares} icon={Share2} />
                    <MetricCard label="Comentarios" value={selectedPost.comments} icon={FileText} />
                    <MetricCard label="Leads generados" value={selectedPost.leadsGenerated} icon={CheckCircle} color="text-emerald-500" />
                  </div>

                  {selectedPost.status === 'PUBLISHED' && (
                    <div className="mt-8 p-4 rounded-xl border bg-card"
                    >
                      <h3 className="font-semibold mb-2"
                      >URL publica</h3>
                      <div className="flex items-center gap-2"
                      >
                        <code className="flex-1 px-3 py-2 rounded-lg bg-muted text-sm"
                        >/blog/{slugify(selectedPost.title)}</code>
                        <button
                          onClick={() => {
                            const url = `${window.location.origin}/blog/${slugify(selectedPost.title)}`;
                            navigator.clipboard.writeText(url);
                          }}
                          className="px-3 py-2 rounded-lg border text-sm font-medium hover:bg-muted"
                        >
                          Copiar
                        </button>
                        <a
                          href={`/blog/${slugify(selectedPost.title)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
                        >
                          Ver
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        >
          <div className="bg-card border rounded-2xl p-6 w-full max-w-sm shadow-2xl"
          >
            <h3 className="text-lg font-bold mb-1"
            >Programar publicacion</h3>
            <p className="text-sm text-muted-foreground mb-4"
            >Selecciona fecha y hora</p>
            <input
              type="datetime-local"
              value={scheduleDate}
              onChange={(e) => setScheduleDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border bg-card text-sm mb-4"
            />
            <div className="flex gap-2"
            >
              <button
                onClick={() => setShowScheduleModal(false)}
                className="flex-1 py-2.5 rounded-xl border text-sm font-semibold hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                onClick={handleSchedule}
                disabled={!scheduleDate}
                className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 disabled:opacity-50"
              >
                Programar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Generate Modal */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        >
          <div className="bg-card border rounded-2xl p-6 w-full max-w-md shadow-2xl"
          >
            <h3 className="text-lg font-bold mb-1 flex items-center gap-2"
            >
              <Sparkles className="w-5 h-5 text-violet-500" />
              Generar con IA
            </h3>
            <p className="text-sm text-muted-foreground mb-4"
            >La IA creara un borrador completo que luego puedes editar.</p>

            <div className="space-y-4 mb-6"
            >
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block"
                >Tema o keyword</label>
                <input
                  type="text"
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                  placeholder="ej: software dental, gestion veterinaria..."
                  className="w-full px-4 py-3 rounded-xl border bg-card text-sm"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block"
                >Tipo de contenido</label>
                <select
                  value={aiType}
                  onChange={(e) => setAiType(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border bg-card text-sm"
                >
                  <option value="ARTICLE">Articulo de blog</option>
                  <option value="FAQ">FAQ / Preguntas frecuentes</option>
                  <option value="CASE_STUDY">Caso de exito</option>
                  <option value="COMPARISON">Comparativa</option>
                  <option value="LANDING_PAGE">Landing page</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2"
            >
              <button
                onClick={() => setShowAiModal(false)}
                className="flex-1 py-2.5 rounded-xl border text-sm font-semibold hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                onClick={handleGenerateWithAi}
                disabled={generating || !aiTopic.trim()}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 text-white text-sm font-bold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generando...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cfg = statusConfig[status] || statusConfig.DRAFT;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold ${cfg.bg} ${cfg.color}`}
    >
      <cfg.icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

function MetricCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: any; color?: string }) {
  return (
    <div className="p-4 rounded-xl border bg-card"
    >
      <div className="flex items-center justify-between mb-2"
      >
        <span className="text-xs text-muted-foreground font-medium"
        >{label}</span>
        <Icon className={`w-4 h-4 ${color || 'text-muted-foreground'}`} />
      </div>
      <p className="text-2xl font-extrabold tabular-nums"
      >{value.toLocaleString()}</p>
    </div>
  );
}

function EmptyState({ onCreate, onGenerate }: { onCreate: () => void; onGenerate: () => void }) {
  return (
    <div className="flex-1 flex items-center justify-center"
    >
      <div className="text-center max-w-md px-6"
      >
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-violet-500/20 flex items-center justify-center mx-auto mb-5"
        >
          <BookOpen className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-xl font-bold mb-2"
        >Tu Blog Studio</h2>
        <p className="text-muted-foreground text-sm mb-6"
        >
          Crea articulos SEO, genera contenido con IA, programa publicaciones y mide el rendimiento. Todo desde un solo lugar.
        </p>
        <div className="flex justify-center gap-3"
        >
          <button
            onClick={onCreate}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 shadow-lg shadow-primary/20"
          >
            <Plus className="w-4 h-4" />
            Nuevo articulo
          </button>
          <button
            onClick={onGenerate}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border text-sm font-bold hover:bg-muted transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            Generar con IA
          </button>
        </div>
      </div>
    </div>
  );
}

function slugify(text: string): string {
  return text
    .toString()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
}
