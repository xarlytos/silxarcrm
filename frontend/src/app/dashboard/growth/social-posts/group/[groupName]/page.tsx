'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import {
  ArrowLeft,
  Layers,
  Users,
  PenLine,
  TrendingUp,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  Trash2,
  Edit3,
  Globe,
  Plus,
  Megaphone,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

// ─── Types (sync with main page) ────────────────────────────
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
  groupName?: string;
  username: string;
  platform: Platform;
  avatarUrl?: string;
  profileUrl?: string;
  tematica: string;
  tono: string;
  formato: string;
  longitud: string;
  idioma: string;
  hashtagsDefault: string[];
  isActive: boolean;
  followersCount: number;
  postsCount: number;
  softwareId: string;
  notas?: string;
  createdAt: string;
  _count?: { posts: number };
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
  likes: number;
  comments: number;
  shares: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Platform Configs ───────────────────────────────────────
const PLATFORMS: { id: Platform; name: string; icon: React.ReactNode; color: string; bg: string; border: string }[] = [
  { id: 'INSTAGRAM', name: 'Instagram', icon: <InstaIcon />, color: 'text-pink-500', bg: 'bg-pink-500/10', border: 'border-pink-500/30' },
  { id: 'LINKEDIN', name: 'LinkedIn', icon: <LinkedInIcon />, color: 'text-blue-600', bg: 'bg-blue-600/10', border: 'border-blue-600/30' },
  { id: 'FACEBOOK', name: 'Facebook', icon: <FbIcon />, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
  { id: 'X', name: 'X / Twitter', icon: <XIcon />, color: 'text-zinc-800 dark:text-zinc-200', bg: 'bg-zinc-500/10', border: 'border-zinc-500/30' },
  { id: 'TIKTOK', name: 'TikTok', icon: <TikTokIcon />, color: 'text-fuchsia-500', bg: 'bg-fuchsia-500/10', border: 'border-fuchsia-500/30' },
  { id: 'REDDIT', name: 'Reddit', icon: <RedditIcon />, color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/30' },
  { id: 'YOUTUBE', name: 'YouTube', icon: <YoutubeIcon />, color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/30' },
  { id: 'PINTEREST', name: 'Pinterest', icon: <PinIcon />, color: 'text-red-600', bg: 'bg-red-600/10', border: 'border-red-600/30' },
  { id: 'THREADS', name: 'Threads', icon: <ThreadsIcon />, color: 'text-zinc-700 dark:text-zinc-300', bg: 'bg-zinc-500/10', border: 'border-zinc-500/30' },
];

function getPlatformConfig(p: Platform) { return PLATFORMS.find((x) => x.id === p) || PLATFORMS[0]; }

// ─── SVG Icons ──────────────────────────────────────────────
function InstaIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></svg>; }
function LinkedInIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" /><rect x="2" y="9" width="4" height="12" /><circle cx="4" cy="4" r="2" /></svg>; }
function FbIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /></svg>; }
function XIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M4 4l11.5 16h4L8.5 4H4z" /><path d="M4 20l6.5-8.5M13.5 12.5L20 4" /></svg>; }
function TikTokIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" /></svg>; }
function RedditIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><circle cx="12" cy="12" r="10" /><path d="M16.5 12c0 2.5-2 4.5-4.5 4.5S7.5 14.5 7.5 12" /><circle cx="9" cy="9" r="1" fill="currentColor" /><circle cx="15" cy="9" r="1" fill="currentColor" /><path d="M17 7l2-1M7 7L5 6" /></svg>; }
function PinIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><line x1="12" y1="5" x2="12" y2="19" /><path d="M19 12l-7 7-7-7" /><circle cx="12" cy="12" r="9" /></svg>; }
function ThreadsIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" /><path d="M8 12h8" /><path d="M12 8v8" /></svg>; }
function YoutubeIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" /><path d="m10 15 5-3-5-3z" /></svg>; }

// ─── Main Page ──────────────────────────────────────────────
export default function GroupDetailPage() {
  const params = useParams();
  const router = useRouter();
  const groupName = decodeURIComponent(params.groupName as string);

  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [softwares, setSoftwares] = useState<Array<{ id: string; nombre: string }>>([]);
  const [softwareId, setSoftwareId] = useState('');

  useEffect(() => { loadSoftwares(); }, []);
  useEffect(() => { if (softwareId) loadGroupAccounts(); }, [softwareId]);

  async function loadSoftwares() {
    try {
      const res = await apiClient.getSoftwares();
      const list = Array.isArray(res) ? res : res?.data || [];
      setSoftwares(list);
      if (list.length > 0 && !softwareId) setSoftwareId(list[0].id);
    } catch { }
  }

  async function loadGroupAccounts() {
    setLoading(true);
    try {
      const data = await apiClient.getSocialAccounts({ softwareId });
      const groupAccounts = (data.accounts || []).filter(
        (a: SocialAccount) => a.groupName === groupName
      );
      setAccounts(groupAccounts);
      // Load posts for all accounts
      const allPosts: SocialPost[] = [];
      for (const account of groupAccounts) {
        try {
          const postData = await apiClient.getSocialAccountPosts(account.id, { limit: '20' });
          allPosts.push(...(postData.posts || []).map((p: SocialPost) => ({ ...p, accountId: account.id })));
        } catch { }
      }
      setPosts(allPosts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch { } finally { setLoading(false); }
  }

  async function handleGenerateForAll() {
    if (accounts.length === 0) return;
    setGenerating(true);
    try {
      const result = await apiClient.generateSocialBatch({
        accountIds: accounts.map((a) => a.id),
        topic: accounts[0]?.tematica,
        tone: accounts[0]?.tono,
      });
      await loadGroupAccounts();
    } catch { } finally { setGenerating(false); }
  }

  async function handleCopyPost(post: SocialPost) {
    const text = post.hashtags.length > 0 ? `${post.content}\n\n${post.hashtags.join(' ')}` : post.content;
    await navigator.clipboard.writeText(text);
    setCopiedId(post.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function handleDeletePost(postId: string) {
    try {
      await apiClient.deleteSocialAccountPost(postId);
      await loadGroupAccounts();
    } catch { }
  }

  const totalFollowers = accounts.reduce((s, a) => s + a.followersCount, 0);
  const totalPosts = posts.length;
  const draftPosts = posts.filter((p) => p.status === 'DRAFT');
  const scheduledPosts = posts.filter((p) => p.status === 'SCHEDULED');
  const publishedPosts = posts.filter((p) => p.status === 'PUBLISHED');

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/growth/social-posts" className="p-2 rounded-lg border border-[var(--border-primary)] hover:bg-[var(--surface-hover)] transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Layers className="w-6 h-6 text-blue-500" />
              {groupName}
            </h1>
            <p className="text-[var(--text-tertiary)] mt-1">
              Grupo con {accounts.length} plataforma{accounts.length > 1 ? 's' : ''} · @{accounts[0]?.username}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={softwareId}
            onChange={(e) => setSoftwareId(e.target.value)}
            className="px-3 py-2 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] text-sm"
          >
            {softwares.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
          <button
            onClick={handleGenerateForAll}
            disabled={generating || accounts.length === 0}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-violet-600 text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center gap-2"
          >
            {generating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Generar para todas
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Plataformas" value={accounts.length} icon={Globe} />
        <StatCard label="Followers" value={totalFollowers} icon={Users} />
        <StatCard label="Posts totales" value={totalPosts} icon={PenLine} />
        <StatCard label="Activas" value={accounts.filter((a) => a.isActive).length} icon={TrendingUp} />
      </div>

      {/* Accounts Grid */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Cuentas del grupo</h2>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-5 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] animate-pulse">
                <div className="h-12 w-12 rounded-full bg-[var(--bg-tertiary)] mb-3" />
                <div className="h-4 w-3/4 bg-[var(--bg-tertiary)] rounded mb-2" />
              </div>
            ))}
          </div>
        ) : accounts.length === 0 ? (
          <div className="text-center py-12 rounded-xl border border-dashed border-[var(--border-primary)]">
            <Megaphone className="w-10 h-10 text-[var(--text-tertiary)] mx-auto mb-3" />
            <p className="text-sm text-[var(--text-tertiary)]">No hay cuentas en este grupo.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {accounts.map((account) => {
              const cfg = getPlatformConfig(account.platform);
              return (
                <div
                  key={account.id}
                  onClick={() => router.push(`/dashboard/growth/social-posts?account=${account.id}`)}
                  className="group relative p-5 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] cursor-pointer transition-all hover:shadow-lg hover:border-blue-500/30"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', cfg.bg)}>
                      <span className={cfg.color}>{cfg.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-[var(--text-primary)] truncate">{account.nombre}</h3>
                      <p className="text-xs text-[var(--text-tertiary)]">@{account.username}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <PlatformBadge platform={account.platform} />
                    {!account.isActive && (
                      <span className="px-2 py-0.5 rounded-md bg-zinc-500/10 text-zinc-500 text-[10px] font-medium">Inactiva</span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] line-clamp-1 mb-2">
                    <span className="text-[var(--text-tertiary)]">Tema:</span> {account.tematica}
                  </p>
                  <div className="flex items-center gap-3 pt-2 border-t border-[var(--border-primary)]/50">
                    <span className="text-xs text-[var(--text-tertiary)] flex items-center gap-1">
                      <Users className="w-3 h-3" /> {account.followersCount.toLocaleString()}
                    </span>
                    <span className="text-xs text-[var(--text-tertiary)] flex items-center gap-1">
                      <PenLine className="w-3 h-3" /> {account._count?.posts || 0}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Posts */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Posts del grupo</h2>
        {posts.length === 0 ? (
          <div className="text-center py-12 rounded-xl border border-dashed border-[var(--border-primary)]">
            <PenLine className="w-10 h-10 text-[var(--text-tertiary)] mx-auto mb-3" />
            <p className="text-sm text-[var(--text-tertiary)]">Sin posts aún. Genera contenido para empezar.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Post stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard label="Borradores" value={draftPosts.length} icon={PenLine} />
              <StatCard label="Programados" value={scheduledPosts.length} icon={Clock} />
              <StatCard label="Publicados" value={publishedPosts.length} icon={Check} />
              <StatCard label="Total likes" value={posts.reduce((s, p) => s + p.likes, 0)} icon={TrendingUp} />
            </div>
            {posts.map((post) => {
              const account = accounts.find((a) => a.id === post.accountId);
              const cfg = account ? getPlatformConfig(account.platform) : PLATFORMS[0];
              return (
                <div key={post.id} className="p-4 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-secondary)]">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={post.status} />
                      {account && (
                        <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border', cfg.bg, cfg.border, cfg.color)}>
                          {cfg.icon} {cfg.name}
                        </span>
                      )}
                      <span className="text-xs text-[var(--text-tertiary)]">{new Date(post.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleCopyPost(post)} className="p-1.5 rounded hover:bg-[var(--surface-hover)]" title="Copiar">
                        {copiedId === post.id ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={() => handleDeletePost(post.id)} className="p-1.5 rounded hover:bg-red-500/10 text-red-500" title="Eliminar">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">{post.content}</p>
                  {post.hashtags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {post.hashtags.map((h, i) => (
                        <span key={i} className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 text-xs">{h}</span>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[var(--border-primary)]/50">
                    <span className="text-xs text-[var(--text-tertiary)] flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" /> {post.likes}
                    </span>
                    <span className="text-xs text-[var(--text-tertiary)] flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" /> {post.comments}
                    </span>
                    <span className="text-xs text-[var(--text-tertiary)] flex items-center gap-1">
                      <RefreshCw className="w-3 h-3" /> {post.shares}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────
function StatCard({ label, value, icon: Icon }: { label: string; value: number; icon: any }) {
  return (
    <div className="p-4 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-secondary)]">
      <div className="flex items-center justify-between">
        <span className="text-sm text-[var(--text-tertiary)]">{label}</span>
        <Icon className="w-4 h-4 text-[var(--text-tertiary)]" />
      </div>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}

function PlatformBadge({ platform }: { platform: Platform }) {
  const cfg = getPlatformConfig(platform);
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border', cfg.bg, cfg.border, cfg.color)}>
      {cfg.icon}
      {cfg.name}
    </span>
  );
}

function StatusBadge({ status }: { status: PostStatus }) {
  const map: Record<PostStatus, { label: string; class: string }> = {
    IDEA: { label: 'Idea', class: 'bg-amber-500/10 text-amber-600' },
    PLANNED: { label: 'Planificado', class: 'bg-sky-500/10 text-sky-600' },
    IN_PRODUCTION: { label: 'En producción', class: 'bg-violet-500/10 text-violet-600' },
    IN_REVIEW: { label: 'En revisión', class: 'bg-indigo-500/10 text-indigo-600' },
    NEEDS_REVISION: { label: 'Requiere cambios', class: 'bg-orange-500/10 text-orange-600' },
    DRAFT: { label: 'Borrador', class: 'bg-slate-500/10 text-slate-600' },
    SCHEDULED: { label: 'Programado', class: 'bg-blue-500/10 text-blue-600' },
    PUBLISHED: { label: 'Publicado', class: 'bg-green-500/10 text-green-600' },
    FAILED: { label: 'Fallido', class: 'bg-red-500/10 text-red-500' },
  };
  const s = map[status];
  return <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-medium', s.class)}>{s.label}</span>;
}
