'use client';

import { useState, useCallback, useMemo } from 'react';
import { apiClient } from '@/lib/api';
import {
  Plus,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  PenTool,
  Video,
  Eye,
  RotateCcw,
  X,
  ChevronRight,
  Hash,
  Image,
  Link2,
  Music,
  MapPin,
  Users,
  Sparkles,
  Loader2,
  Send,
  Trash2,
  Copy,
  Check,
  GripVertical,
  MoreHorizontal,
  Library,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import LibraryPicker from './LibraryPicker';
import CollaborationPanel from './CollaborationPanel';

// ─── Types ──────────────────────────────────────────────────
type Platform = 'INSTAGRAM' | 'LINKEDIN' | 'FACEBOOK' | 'X' | 'TIKTOK' | 'REDDIT' | 'YOUTUBE' | 'PINTEREST' | 'THREADS';

type PostStatus =
  | 'IDEA'
  | 'PLANNED'
  | 'IN_PRODUCTION'
  | 'IN_REVIEW'
  | 'NEEDS_REVISION'
  | 'DRAFT'
  | 'SCHEDULED'
  | 'PUBLISHED'
  | 'FAILED';

interface SocialAccount {
  id: string;
  nombre: string;
  username: string;
  platform: Platform;
  tematica: string;
  tono: string;
  formato: string;
  softwareId: string;
  avatarUrl?: string;
}

interface SocialPost {
  id: string;
  accountId: string;
  content: string;
  hashtags: string[];
  mediaUrls: string[];
  cta?: string;
  title?: string;
  excerpt?: string;
  status: PostStatus;
  formato?: string;
  platformData?: Record<string, any>;
  scheduledAt?: string;
  publishedAt?: string;
  assignedTo?: number | null;
  likes: number;
  comments: number;
  shares: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Pipeline Config por Plataforma ─────────────────────────
interface StatusConfig {
  id: PostStatus;
  label: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
  border: string;
  description: string;
}

const PIPELINE_STATUSES: StatusConfig[] = [
  { id: 'IDEA', label: 'Idea', icon: <Lightbulb className="w-3.5 h-3.5" />, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', description: 'Solo el concepto' },
  { id: 'PLANNED', label: 'Planificado', icon: <Calendar className="w-3.5 h-3.5" />, color: 'text-sky-600', bg: 'bg-sky-50', border: 'border-sky-200', description: 'Fecha y formato decididos' },
  { id: 'IN_PRODUCTION', label: 'En producción', icon: <Video className="w-3.5 h-3.5" />, color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-200', description: 'Creando el contenido' },
  { id: 'IN_REVIEW', label: 'En revisión', icon: <Eye className="w-3.5 h-3.5" />, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200', description: 'Esperando aprobación' },
  { id: 'NEEDS_REVISION', label: 'Requiere cambios', icon: <RotateCcw className="w-3.5 h-3.5" />, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', description: 'Correcciones pendientes' },
  { id: 'DRAFT', label: 'Borrador', icon: <PenTool className="w-3.5 h-3.5" />, color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200', description: 'Listo para programar' },
  { id: 'SCHEDULED', label: 'Programado', icon: <Clock className="w-3.5 h-3.5" />, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', description: 'Publicación automática' },
  { id: 'PUBLISHED', label: 'Publicado', icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', description: 'Ya en la red social' },
  { id: 'FAILED', label: 'Fallido', icon: <AlertCircle className="w-3.5 h-3.5" />, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', description: 'Error al publicar' },
];

function getStatusConfig(status: PostStatus): StatusConfig {
  return PIPELINE_STATUSES.find((s) => s.id === status) || PIPELINE_STATUSES[5];
}

// ─── Platform-specific fields config ────────────────────────
interface PlatformField {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'multiselect' | 'url' | 'number' | 'toggle';
  options?: string[];
  placeholder?: string;
  description?: string;
  icon?: React.ReactNode;
}

const PLATFORM_FIELDS: Record<Platform, PlatformField[]> = {
  INSTAGRAM: [
    { key: 'aspectRatio', label: 'Ratio', type: 'select', options: ['1:1', '4:5', '9:16', '16:9'], description: 'Proporción de la imagen/video' },
    { key: 'musicTrack', label: 'Música / Audio', type: 'text', placeholder: 'Nombre de la canción o audio trend', icon: <Music className="w-3.5 h-3.5" /> },
    { key: 'locationTag', label: 'Ubicación', type: 'text', placeholder: 'Tag de ubicación', icon: <MapPin className="w-3.5 h-3.5" /> },
    { key: 'collaborators', label: 'Colaboradores', type: 'text', placeholder: '@usuario1, @usuario2', icon: <Users className="w-3.5 h-3.5" /> },
    { key: 'altText', label: 'Texto alternativo', type: 'textarea', placeholder: 'Descripción para accesibilidad', icon: <Eye className="w-3.5 h-3.5" /> },
    { key: 'hideLikes', label: 'Ocultar likes', type: 'toggle', description: 'No mostrar contador de likes' },
    { key: 'paidPartnership', label: 'Colaboración pagada', type: 'toggle' },
  ],
  TIKTOK: [
    { key: 'videoUrl', label: 'Video', type: 'url', placeholder: 'URL del video editado', icon: <Video className="w-3.5 h-3.5" /> },
    { key: 'musicTrack', label: 'Música', type: 'text', placeholder: 'Canción o sonido trend', icon: <Music className="w-3.5 h-3.5" /> },
    { key: 'effects', label: 'Efectos', type: 'text', placeholder: 'Filtros o efectos usados' },
    { key: 'duration', label: 'Duración (seg)', type: 'number', placeholder: '15, 30, 60...' },
    { key: 'stitchEnabled', label: 'Permitir Stitch', type: 'toggle', description: 'Otros pueden hacer stitch de tu video' },
    { key: 'duetEnabled', label: 'Permitir Duet', type: 'toggle' },
  ],
  LINKEDIN: [
    { key: 'articleUrl', label: 'URL del artículo', type: 'url', placeholder: 'https://...', icon: <Link2 className="w-3.5 h-3.5" /> },
    { key: 'documentUrl', label: 'Documento PDF', type: 'url', placeholder: 'URL del PDF', icon: <Link2 className="w-3.5 h-3.5" /> },
    { key: 'pollOptions', label: 'Opciones de encuesta', type: 'textarea', placeholder: 'Opción 1\nOpción 2\nOpción 3\nOpción 4', description: 'Máximo 4 opciones, una por línea' },
    { key: 'newsletterId', label: 'Newsletter', type: 'text', placeholder: 'ID de la newsletter' },
    { key: 'visibility', label: 'Visibilidad', type: 'select', options: ['public', 'connections', 'custom'] },
  ],
  X: [
    { key: 'replyTo', label: 'Responder a', type: 'text', placeholder: 'URL del tweet original', icon: <Link2 className="w-3.5 h-3.5" /> },
    { key: 'quoteTweet', label: 'Citar tweet', type: 'text', placeholder: 'URL del tweet a citar', icon: <Link2 className="w-3.5 h-3.5" /> },
    { key: 'mediaAltText', label: 'Alt text de imágenes', type: 'textarea', placeholder: 'Descripción de las imágenes para accesibilidad' },
    { key: 'sensitiveContent', label: 'Contenido sensible', type: 'toggle' },
  ],
  YOUTUBE: [
    { key: 'videoUrl', label: 'Video', type: 'url', placeholder: 'URL del video', icon: <Video className="w-3.5 h-3.5" /> },
    { key: 'thumbnailUrl', label: 'Miniatura', type: 'url', placeholder: 'URL de la miniatura', icon: <Image className="w-3.5 h-3.5" /> },
    { key: 'tags', label: 'Tags', type: 'text', placeholder: 'tag1, tag2, tag3...', icon: <Hash className="w-3.5 h-3.5" /> },
    { key: 'category', label: 'Categoría', type: 'select', options: ['Education', 'Entertainment', 'Film & Animation', 'Gaming', 'Howto & Style', 'Music', 'News & Politics', 'People & Blogs', 'Pets & Animals', 'Science & Technology', 'Sports', 'Travel & Events'] },
    { key: 'visibility', label: 'Visibilidad', type: 'select', options: ['public', 'unlisted', 'private', 'membersOnly'] },
    { key: 'chapters', label: 'Capítulos', type: 'textarea', placeholder: '00:00 Intro\n01:30 Tema 1\n05:00 Tema 2', description: 'Timestamps para capítulos del video' },
  ],
  FACEBOOK: [
    { key: 'postType', label: 'Tipo de post', type: 'select', options: ['status', 'photo', 'video', 'link', 'event', 'offer'] },
    { key: 'groupId', label: 'ID del grupo', type: 'text', placeholder: 'Si va a un grupo específico' },
    { key: 'feeling', label: 'Sentimiento/Actividad', type: 'text', placeholder: 'Ej: está celebrando' },
    { key: 'targetAudience', label: 'Audiencia objetivo', type: 'text', placeholder: 'Restricción de audiencia' },
  ],
  PINTEREST: [
    { key: 'pinUrl', label: 'URL del Pin', type: 'url', placeholder: 'https://...' },
    { key: 'boardName', label: 'Tablero', type: 'text', placeholder: 'Nombre del tablero' },
    { key: 'richPinType', label: 'Tipo de Rich Pin', type: 'select', options: ['article', 'product', 'recipe', 'app'] },
  ],
  THREADS: [
    { key: 'replyTo', label: 'Responder a', type: 'text', placeholder: 'URL del thread' },
    { key: 'crossPostInstagram', label: 'Cross-post a Instagram', type: 'toggle' },
  ],
  REDDIT: [
    { key: 'subreddit', label: 'Subreddit', type: 'text', placeholder: 'r/subreddit' },
    { key: 'flair', label: 'Flair', type: 'text', placeholder: 'Etiqueta del post' },
    { key: 'nsfw', label: 'NSFW', type: 'toggle' },
  ],
};

// ─── Formatos por plataforma ────────────────────────────────
const PLATFORM_FORMATS: Record<Platform, string[]> = {
  INSTAGRAM: ['feed', 'reel', 'historia', 'carousel', 'nota'],
  TIKTOK: ['video', 'duo', 'stitch', 'live', 'photo_carousel'],
  LINKEDIN: ['post', 'articulo', 'documento', 'encuesta', 'video', 'evento'],
  X: ['tweet', 'thread', 'reply', 'quote', ' Spaces'],
  YOUTUBE: ['short', 'video', 'live', 'community', 'podcast'],
  FACEBOOK: ['post', 'historia', 'reel', 'evento', 'oferta', 'live'],
  PINTEREST: ['pin', 'idea_pin', 'board'],
  THREADS: ['thread', 'reply'],
  REDDIT: ['text_post', 'link', 'image', 'video', 'poll'],
};

// ─── Componente Principal ───────────────────────────────────
interface PostPipelineProps {
  account: SocialAccount;
  posts: SocialPost[];
  onRefresh: () => void;
}

export default function PostPipeline({ account, posts, onRefresh }: PostPipelineProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPost, setEditingPost] = useState<SocialPost | null>(null);
  const [draggingPostId, setDraggingPostId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<PostStatus | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const platformFields = PLATFORM_FIELDS[account.platform] || [];
  const platformFormats = PLATFORM_FORMATS[account.platform] || [];

  // Agrupar posts por estado
  const postsByStatus = useMemo(() => {
    const map: Record<string, SocialPost[]> = {};
    for (const status of PIPELINE_STATUSES) {
      map[status.id] = posts.filter((p) => p.status === status.id);
    }
    return map;
  }, [posts]);

  // Contar posts por estado (solo los que tienen posts)
  const activeStatuses = useMemo(() => {
    return PIPELINE_STATUSES.filter((s) => postsByStatus[s.id]?.length > 0 || s.id !== 'PUBLISHED');
  }, [postsByStatus]);

  async function handleStatusChange(postId: string, newStatus: PostStatus) {
    setUpdatingStatus(postId);
    try {
      await apiClient.updateSocialAccountPost(postId, { status: newStatus });
      onRefresh();
    } catch (err) {
      console.error('Error cambiando estado:', err);
    } finally {
      setUpdatingStatus(null);
      setDraggingPostId(null);
      setDragOverStatus(null);
    }
  }

  async function handleCopyPost(post: SocialPost) {
    const text = post.hashtags.length > 0 ? `${post.content}\n\n${post.hashtags.join(' ')}` : post.content;
    await navigator.clipboard.writeText(text);
    setCopiedId(post.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function handleDeletePost(postId: string) {
    if (!confirm('¿Eliminar este post? No se puede deshacer.')) return;
    try {
      await apiClient.deleteSocialAccountPost(postId);
      onRefresh();
    } catch (err) {
      console.error('Error eliminando post:', err);
    }
  }

  // Drag & drop
  function handleDragStart(postId: string) {
    setDraggingPostId(postId);
  }

  function handleDragOver(status: PostStatus, e: React.DragEvent) {
    e.preventDefault();
    setDragOverStatus(status);
  }

  function handleDrop(status: PostStatus, e: React.DragEvent) {
    e.preventDefault();
    if (draggingPostId) {
      handleStatusChange(draggingPostId, status);
    }
  }

  function handleDragLeave() {
    setDragOverStatus(null);
  }

  // Movimiento rápido de estado (click en flechas)
  function getNextStatus(current: PostStatus): PostStatus | null {
    const idx = PIPELINE_STATUSES.findIndex((s) => s.id === current);
    if (idx < PIPELINE_STATUSES.length - 1) return PIPELINE_STATUSES[idx + 1].id;
    return null;
  }

  function getPrevStatus(current: PostStatus): PostStatus | null {
    const idx = PIPELINE_STATUSES.findIndex((s) => s.id === current);
    if (idx > 0) return PIPELINE_STATUSES[idx - 1].id;
    return null;
  }

  // Filtrar estados que no aplican a todas las plataformas
  // (ej: IN_PRODUCTION solo para plataformas visuales)
  const relevantStatuses = useMemo(() => {
    const visualPlatforms: Platform[] = ['INSTAGRAM', 'TIKTOK', 'YOUTUBE', 'PINTEREST'];
    const textPlatforms: Platform[] = ['X', 'THREADS', 'REDDIT', 'LINKEDIN', 'FACEBOOK'];

    if (textPlatforms.includes(account.platform)) {
      // Para plataformas de texto, ocultar IN_PRODUCTION o renombrar
      return PIPELINE_STATUSES.map((s) =>
        s.id === 'IN_PRODUCTION'
          ? { ...s, label: 'Redactando', description: 'Escribiendo el contenido' }
          : s
      );
    }
    return PIPELINE_STATUSES;
  }, [account.platform]);

  return (
    <div className="space-y-4">
      {/* Header del pipeline */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-[var(--text-secondary)]">Pipeline de contenido</h3>
          <span className="text-xs text-[var(--text-tertiary)]">{posts.length} posts</span>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-violet-600 text-white text-xs font-semibold hover:opacity-90 transition-opacity flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          Nuevo post
        </button>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-2 px-2" style={{ minHeight: '400px' }}>
        {relevantStatuses.map((status) => {
          const statusPosts = postsByStatus[status.id] || [];
          const isDragOver = dragOverStatus === status.id;
          const showColumn = statusPosts.length > 0 ||
            ['IDEA', 'PLANNED', 'IN_PRODUCTION', 'IN_REVIEW', 'NEEDS_REVISION', 'DRAFT'].includes(status.id);

          if (!showColumn) return null;

          return (
            <div
              key={status.id}
              className={cn(
                'flex-shrink-0 w-72 rounded-xl border transition-all duration-200',
                isDragOver
                  ? 'border-blue-400 bg-blue-50/50 ring-2 ring-blue-200'
                  : 'border-[var(--border-primary)] bg-[var(--bg-secondary)]'
              )}
              onDragOver={(e) => handleDragOver(status.id, e)}
              onDrop={(e) => handleDrop(status.id, e)}
              onDragLeave={handleDragLeave}
            >
              {/* Column Header */}
              <div className={cn('px-3 py-2.5 border-b rounded-t-xl flex items-center justify-between', status.bg, status.border)}>
                <div className="flex items-center gap-2">
                  <span className={status.color}>{status.icon}</span>
                  <div>
                    <span className={cn('text-xs font-semibold', status.color)}>{status.label}</span>
                    <p className="text-[10px] text-[var(--text-tertiary)]">{status.description}</p>
                  </div>
                </div>
                <span className={cn('text-xs font-bold px-1.5 py-0.5 rounded-full', status.bg, status.color)}>
                  {statusPosts.length}
                </span>
              </div>

              {/* Cards */}
              <div className="p-2 space-y-2 min-h-[100px]">
                {statusPosts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    account={account}
                    statusConfig={status}
                    isDragging={draggingPostId === post.id}
                    isUpdating={updatingStatus === post.id}
                    copiedId={copiedId}
                    onDragStart={() => handleDragStart(post.id)}
                    onEdit={() => setEditingPost(post)}
                    onCopy={() => handleCopyPost(post)}
                    onDelete={() => handleDeletePost(post.id)}
                    onAdvance={() => {
                      const next = getNextStatus(post.status);
                      if (next) handleStatusChange(post.id, next);
                    }}
                    onGoBack={() => {
                      const prev = getPrevStatus(post.status);
                      if (prev) handleStatusChange(post.id, prev);
                    }}
                  />
                ))}

                {statusPosts.length === 0 && (
                  <div className="text-center py-6 text-[var(--text-tertiary)] text-xs">
                    Arrastra posts aquí
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || editingPost) && (
        <PostEditorModal
          account={account}
          post={editingPost}
          platformFields={platformFields}
          platformFormats={platformFormats}
          onClose={() => { setShowCreateModal(false); setEditingPost(null); }}
          onSave={() => { onRefresh(); setShowCreateModal(false); setEditingPost(null); }}
        />
      )}
    </div>
  );
}

// ─── Post Card ──────────────────────────────────────────────
function PostCard({
  post,
  account,
  statusConfig,
  isDragging,
  isUpdating,
  copiedId,
  onDragStart,
  onEdit,
  onCopy,
  onDelete,
  onAdvance,
  onGoBack,
}: {
  post: SocialPost;
  account: SocialAccount;
  statusConfig: StatusConfig;
  isDragging: boolean;
  isUpdating: boolean;
  copiedId: string | null;
  onDragStart: () => void;
  onEdit: () => void;
  onCopy: () => void;
  onDelete: () => void;
  onAdvance: () => void;
  onGoBack: () => void;
}) {
  const [showActions, setShowActions] = useState(false);

  // Extraer datos de platformData
  const pd = post.platformData || {};
  const hasMedia = post.mediaUrls.length > 0;
  const hasPlatformData = Object.keys(pd).length > 0;

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className={cn(
        'group relative p-3 rounded-lg border bg-[var(--bg-primary)] cursor-grab active:cursor-grabbing transition-all',
        isDragging ? 'opacity-50 rotate-1 shadow-lg' : 'hover:shadow-md',
        isUpdating && 'opacity-60'
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Drag handle */}
      <div className="absolute top-1.5 left-1.5 opacity-0 group-hover:opacity-50 transition-opacity">
        <GripVertical className="w-3 h-3 text-[var(--text-tertiary)]" />
      </div>

      {/* Quick actions */}
      <div className={cn(
        'absolute top-1.5 right-1.5 flex items-center gap-0.5 transition-opacity',
        showActions ? 'opacity-100' : 'opacity-0'
      )}>
        <button onClick={onGoBack} className="p-1 rounded hover:bg-[var(--surface-hover)]" title="Retroceder estado">
          <ChevronRight className="w-3 h-3 rotate-180 text-[var(--text-tertiary)]" />
        </button>
        <button onClick={onAdvance} className="p-1 rounded hover:bg-[var(--surface-hover)]" title="Avanzar estado">
          <ChevronRight className="w-3 h-3 text-[var(--text-tertiary)]" />
        </button>
        <button onClick={onEdit} className="p-1 rounded hover:bg-[var(--surface-hover)]" title="Editar">
          <PenTool className="w-3 h-3 text-[var(--text-tertiary)]" />
        </button>
      </div>

      {/* Content */}
      <div className="pt-3" onClick={onEdit}>
        {/* Title or content preview */}
        {post.title ? (
          <p className="text-xs font-semibold text-[var(--text-primary)] line-clamp-2 mb-1">{post.title}</p>
        ) : (
          <p className="text-xs text-[var(--text-secondary)] line-clamp-3 mb-1">{post.content || '(Sin contenido)'}</p>
        )}

        {/* Format badge */}
        <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
          {post.formato && (
            <span className="px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] text-[10px] text-[var(--text-tertiary)]">
              {post.formato}
            </span>
          )}
          {hasMedia && (
            <span className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600 text-[10px] flex items-center gap-0.5">
              <Image className="w-2.5 h-2.5" /> {post.mediaUrls.length}
            </span>
          )}
          {post.hashtags.length > 0 && (
            <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 text-[10px] flex items-center gap-0.5">
              <Hash className="w-2.5 h-2.5" /> {post.hashtags.length}
            </span>
          )}
          {post.assignedTo != null && (
            <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 text-[10px] flex items-center gap-0.5" title="Post asignado">
              <Users className="w-2.5 h-2.5" /> asignado
            </span>
          )}
          {hasPlatformData && (
            <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 text-[10px]">
              ⚙️
            </span>
          )}
        </div>

        {/* Platform-specific indicators */}
        {pd.musicTrack && (
          <p className="text-[10px] text-[var(--text-tertiary)] flex items-center gap-0.5 truncate">
            <Music className="w-2.5 h-2.5" /> {pd.musicTrack}
          </p>
        )}
        {pd.locationTag && (
          <p className="text-[10px] text-[var(--text-tertiary)] flex items-center gap-0.5 truncate">
            <MapPin className="w-2.5 h-2.5" /> {pd.locationTag}
          </p>
        )}

        {/* Footer info */}
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-[var(--border-primary)]/50">
          <span className="text-[10px] text-[var(--text-tertiary)]">
            {new Date(post.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
          </span>
          <div className="flex items-center gap-1">
            <button onClick={(e) => { e.stopPropagation(); onCopy(); }} className="p-1 rounded hover:bg-[var(--surface-hover)]">
              {copiedId === post.id ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3 text-[var(--text-tertiary)]" />}
            </button>
            <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1 rounded hover:bg-red-500/10">
              <Trash2 className="w-3 h-3 text-red-400" />
            </button>
          </div>
        </div>
      </div>

      {isUpdating && (
        <div className="absolute inset-0 flex items-center justify-center bg-[var(--bg-primary)]/60 rounded-lg">
          <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
        </div>
      )}
    </div>
  );
}

// ─── Post Editor Modal ──────────────────────────────────────
function PostEditorModal({
  account,
  post,
  platformFields,
  platformFormats,
  onClose,
  onSave,
}: {
  account: SocialAccount;
  post: SocialPost | null;
  platformFields: PlatformField[];
  platformFormats: string[];
  onClose: () => void;
  onSave: () => void;
}) {
  const isEditing = !!post;
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [pickerMode, setPickerMode] = useState<'media' | 'copy' | null>(null);

  const [form, setForm] = useState({
    title: post?.title || '',
    content: post?.content || '',
    hashtags: post?.hashtags.join(', ') || '',
    mediaUrls: post?.mediaUrls.join('\n') || '',
    cta: post?.cta || '',
    status: (post?.status || 'IDEA') as PostStatus,
    formato: post?.formato || account.formato || platformFormats[0] || 'feed',
    scheduledAt: post?.scheduledAt ? new Date(post.scheduledAt).toISOString().slice(0, 16) : '',
    platformData: { ...(post?.platformData || {}) },
  });

  function updateForm(updates: Partial<typeof form>) {
    setForm((prev) => ({ ...prev, ...updates }));
  }

  function updatePlatformData(key: string, value: any) {
    setForm((prev) => ({
      ...prev,
      platformData: { ...prev.platformData, [key]: value },
    }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const hashtags = form.hashtags.split(',').map((h) => h.trim()).filter(Boolean);
      const mediaUrls = form.mediaUrls.split('\n').map((u) => u.trim()).filter(Boolean);

      const data = {
        title: form.title || undefined,
        content: form.content,
        hashtags,
        mediaUrls,
        cta: form.cta || undefined,
        status: form.status,
        formato: form.formato,
        platformData: Object.keys(form.platformData).length > 0 ? form.platformData : undefined,
        scheduledAt: form.scheduledAt || undefined,
      };

      if (isEditing && post) {
        await apiClient.updateSocialAccountPost(post.id, data);
      } else {
        await apiClient.createSocialAccountPost(account.id, data);
      }
      onSave();
    } catch (err) {
      console.error('Error guardando post:', err);
      alert('Error guardando el post');
    } finally {
      setSaving(false);
    }
  }

  async function handleGenerateWithAI() {
    if (!form.content.trim() && !form.title.trim()) {
      alert('Escribe un tema o idea para generar contenido');
      return;
    }
    setGenerating(true);
    try {
      const result = await apiClient.generateMultiPlatformPosts({
        softwareId: account.softwareId,
        platforms: [account.platform],
        topic: form.title || form.content || account.tematica,
        tone: account.tono,
        length: 'medio',
      });

      const generated = result.posts?.[0];
      if (generated) {
        setForm((prev) => ({
          ...prev,
          content: generated.content || prev.content,
          hashtags: (generated.hashtags || []).join(', '),
          cta: generated.cta || prev.cta,
        }));
      }
    } catch (err) {
      console.error('Error generando:', err);
      alert('Error generando con IA. Prueba de nuevo.');
    } finally {
      setGenerating(false);
    }
  }

  const statusConfig = getStatusConfig(form.status);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--border-primary)]">
          <div>
            <h3 className="text-lg font-bold">
              {isEditing ? 'Editar post' : 'Nuevo post'}
            </h3>
            <p className="text-xs text-[var(--text-tertiary)]">
              {account.nombre} · {account.platform}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-[var(--surface-hover)]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Estado */}
          <div>
            <label className="text-xs font-semibold text-[var(--text-tertiary)] mb-2 block">Estado del pipeline</label>
            <div className="flex flex-wrap gap-1.5">
              {PIPELINE_STATUSES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => updateForm({ status: s.id })}
                  className={cn(
                    'px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center gap-1.5',
                    form.status === s.id
                      ? `${s.bg} ${s.border} ${s.color} border-2`
                      : 'border-[var(--border-primary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
                  )}
                >
                  {s.icon}
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Format + Scheduled */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-[var(--text-tertiary)] mb-1.5 block">Formato</label>
              <select
                value={form.formato}
                onChange={(e) => updateForm({ formato: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-tertiary)] text-sm"
              >
                {platformFormats.map((f) => (
                  <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-[var(--text-tertiary)] mb-1.5 block">Programar para</label>
              <input
                type="datetime-local"
                value={form.scheduledAt}
                onChange={(e) => updateForm({ scheduledAt: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-tertiary)] text-sm"
              />
              {form.scheduledAt && (
                <button
                  onClick={() => updateForm({ scheduledAt: '', status: 'DRAFT' })}
                  className="text-[10px] text-red-500 hover:underline mt-1"
                >
                  Quitar programación
                </button>
              )}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="text-xs font-semibold text-[var(--text-tertiary)] mb-1.5 block">Título / Idea</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => updateForm({ title: e.target.value })}
              placeholder="Concepto o título del post..."
              className="w-full px-3 py-2 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-tertiary)] text-sm"
            />
          </div>

          {/* Content */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-[var(--text-tertiary)]">Contenido</label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setPickerMode('copy')}
                  className="text-xs text-blue-500 hover:text-blue-600 font-medium flex items-center gap-1 transition-colors"
                >
                  <Library className="w-3 h-3" /> Biblioteca
                </button>
                <button
                  onClick={handleGenerateWithAI}
                  disabled={generating}
                  className="text-xs text-violet-500 hover:text-violet-600 font-medium flex items-center gap-1 transition-colors"
                >
                  {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  {generating ? 'Generando...' : 'Generar con IA'}
                </button>
              </div>
            </div>
            <textarea
              value={form.content}
              onChange={(e) => updateForm({ content: e.target.value })}
              placeholder="Escribe el contenido del post..."
              rows={5}
              className="w-full px-3 py-2.5 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-tertiary)] text-sm resize-y focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
            <p className="text-[10px] text-[var(--text-tertiary)] mt-1">{form.content.length} caracteres</p>
          </div>

          {/* Hashtags */}
          <div>
            <label className="text-xs font-semibold text-[var(--text-tertiary)] mb-1.5 block">Hashtags (separados por coma)</label>
            <input
              type="text"
              value={form.hashtags}
              onChange={(e) => updateForm({ hashtags: e.target.value })}
              placeholder="#groomly, #petcare, #dogs..."
              className="w-full px-3 py-2 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-tertiary)] text-sm"
            />
          </div>

          {/* Media URLs */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-[var(--text-tertiary)]">URLs de media (una por línea)</label>
              <button
                onClick={() => setPickerMode('media')}
                className="text-xs text-blue-500 hover:text-blue-600 font-medium flex items-center gap-1 transition-colors"
              >
                <Library className="w-3 h-3" /> Biblioteca
              </button>
            </div>
            <textarea
              value={form.mediaUrls}
              onChange={(e) => updateForm({ mediaUrls: e.target.value })}
              placeholder="https://ejemplo.com/foto1.jpg&#10;https://ejemplo.com/foto2.jpg"
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-tertiary)] text-sm resize-none"
            />
          </div>

          {/* CTA */}
          <div>
            <label className="text-xs font-semibold text-[var(--text-tertiary)] mb-1.5 block">CTA / Enlace</label>
            <input
              type="text"
              value={form.cta}
              onChange={(e) => updateForm({ cta: e.target.value })}
              placeholder="Link en bio, swipe up, etc."
              className="w-full px-3 py-2 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-tertiary)] text-sm"
            />
          </div>

          {/* Platform-specific fields */}
          {platformFields.length > 0 && (
            <div className="pt-4 border-t border-[var(--border-primary)]">
              <h4 className="text-xs font-semibold text-[var(--text-secondary)] mb-3 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                Configuración específica de {account.platform}
              </h4>
              <div className="space-y-3">
                {platformFields.map((field) => (
                  <PlatformFieldInput
                    key={field.key}
                    field={field}
                    value={form.platformData[field.key]}
                    onChange={(val) => updatePlatformData(field.key, val)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Colaboración (solo en posts existentes) */}
          {isEditing && post && (
            <CollaborationPanel postId={post.id} assignedTo={post.assignedTo} />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-5 border-t border-[var(--border-primary)]">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-[var(--border-primary)] text-sm hover:bg-[var(--surface-hover)] transition-colors"
          >
            Cancelar
          </button>
          <div className="flex items-center gap-3">
            {form.scheduledAt && (
              <button
                onClick={() => updateForm({ status: 'SCHEDULED' })}
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-blue-500 text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center gap-2"
              >
                <Clock className="w-4 h-4" />
                Programar
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-violet-600 text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {isEditing ? 'Guardar cambios' : 'Crear post'}
            </button>
          </div>
        </div>
      </div>

      {pickerMode && (
        <LibraryPicker
          mode={pickerMode}
          softwareId={account.softwareId}
          onClose={() => setPickerMode(null)}
          onPickCopy={(snippet) =>
            updateForm({
              content: form.content ? `${form.content}\n\n${snippet.contenido}` : snippet.contenido,
            })
          }
          onPickMedia={(asset) =>
            updateForm({
              mediaUrls: form.mediaUrls ? `${form.mediaUrls}\n${asset.url}` : asset.url,
            })
          }
        />
      )}
    </div>
  );
}

// ─── Platform Field Input ───────────────────────────────────
function PlatformFieldInput({
  field,
  value,
  onChange,
}: {
  field: PlatformField;
  value: any;
  onChange: (val: any) => void;
}) {
  const id = `field-${field.key}`;

  switch (field.type) {
    case 'text':
    case 'url':
    case 'number':
      return (
        <div>
          <label htmlFor={id} className="text-xs font-medium text-[var(--text-tertiary)] mb-1 block flex items-center gap-1">
            {field.icon}
            {field.label}
          </label>
          <input
            id={id}
            type={field.type === 'number' ? 'number' : 'text'}
            value={value || ''}
            onChange={(e) => onChange(field.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
            placeholder={field.placeholder}
            className="w-full px-3 py-2 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-tertiary)] text-sm"
          />
          {field.description && <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">{field.description}</p>}
        </div>
      );

    case 'textarea':
      return (
        <div>
          <label htmlFor={id} className="text-xs font-medium text-[var(--text-tertiary)] mb-1 block flex items-center gap-1">
            {field.icon}
            {field.label}
          </label>
          <textarea
            id={id}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            rows={2}
            className="w-full px-3 py-2 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-tertiary)] text-sm resize-none"
          />
          {field.description && <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">{field.description}</p>}
        </div>
      );

    case 'select':
      return (
        <div>
          <label htmlFor={id} className="text-xs font-medium text-[var(--text-tertiary)] mb-1 block flex items-center gap-1">
            {field.icon}
            {field.label}
          </label>
          <select
            id={id}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-tertiary)] text-sm"
          >
            <option value="">Seleccionar...</option>
            {field.options?.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
          {field.description && <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">{field.description}</p>}
        </div>
      );

    case 'toggle':
      return (
        <div className="flex items-center justify-between py-1">
          <div>
            <label htmlFor={id} className="text-xs font-medium text-[var(--text-secondary)] flex items-center gap-1">
              {field.icon}
              {field.label}
            </label>
            {field.description && <p className="text-[10px] text-[var(--text-tertiary)]">{field.description}</p>}
          </div>
          <button
            id={id}
            onClick={() => onChange(!value)}
            className={cn(
              'w-10 h-5 rounded-full transition-colors relative',
              value ? 'bg-blue-500' : 'bg-[var(--bg-tertiary)] border border-[var(--border-primary)]'
            )}
          >
            <span className={cn(
              'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform',
              value ? 'left-5' : 'left-0.5'
            )} />
          </button>
        </div>
      );

    default:
      return null;
  }
}
