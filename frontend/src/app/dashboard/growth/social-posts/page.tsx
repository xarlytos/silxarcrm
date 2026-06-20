'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import {
  ArrowLeft,
  Plus,
  Search,
  Filter,
  LayoutGrid,
  List,
  Hash,
  Wand2,
  Copy,
  Check,
  Trash2,
  Edit3,
  X,
  ChevronDown,
  ChevronRight,
  MessageSquare,
  Clock,
  Megaphone,
  Sparkles,
  RefreshCw,
  Save,
  SquareCheck,
  Square,
  PenLine,
  TrendingUp,
  Users,
  Globe,
  Layers,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import PostPipeline from '@/components/growth/PostPipeline';

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
type ViewMode = 'grid' | 'list';
type PageView = 'accounts' | 'account-detail' | 'generate-batch';

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

const TONES = [
  { value: 'profesional', label: 'Profesional' },
  { value: 'casual', label: 'Casual' },
  { value: 'divertido', label: 'Divertido' },
  { value: 'inspirador', label: 'Inspirador' },
  { value: 'educativo', label: 'Educativo' },
  { value: 'provocador', label: 'Provocador' },
  { value: 'empatico', label: 'Empatico' },
  { value: 'ventas', label: 'Ventas' },
];

const FORMATOS = [
  { value: 'feed', label: 'Feed' },
  { value: 'reel', label: 'Reel' },
  { value: 'historia', label: 'Historia' },
  { value: 'carousel', label: 'Carousel' },
  { value: 'thread', label: 'Thread' },
  { value: 'articulo', label: 'Artículo' },
  { value: 'video', label: 'Video' },
  { value: 'encuesta', label: 'Encuesta' },
];

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

function getPlatformConfig(p: Platform) { return PLATFORMS.find((x) => x.id === p) || PLATFORMS[0]; }

// ─── Main Page ──────────────────────────────────────────────
export default function SocialPostsPage() {
  const router = useRouter();
  const [view, setView] = useState<PageView>('accounts');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [filteredAccounts, setFilteredAccounts] = useState<SocialAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [softwares, setSoftwares] = useState<Array<{ id: string; nombre: string }>>([]);
  const [softwareId, setSoftwareId] = useState('');
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [platformFilter, setPlatformFilter] = useState<Platform | ''>('');
  const [showFilters, setShowFilters] = useState(false);

  // Modal states
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<SocialAccount | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<SocialAccount | null>(null);

  // Generate batch states
  const [batchTopic, setBatchTopic] = useState('');
  const [batchTone, setBatchTone] = useState('');
  const [generating, setGenerating] = useState(false);
  const [batchResults, setBatchResults] = useState<any[]>([]);

  useEffect(() => { loadSoftwares(); }, []);
  useEffect(() => { if (softwareId) loadAccounts(); }, [softwareId]);
  useEffect(() => { applyFilters(); }, [accounts, search, platformFilter]);

  async function loadSoftwares() {
    try {
      const res = await apiClient.getSoftwares();
      const list = Array.isArray(res) ? res : res?.data || [];
      setSoftwares(list);
      if (list.length > 0 && !softwareId) setSoftwareId(list[0].id);
    } catch { }
  }

  async function loadAccounts() {
    setLoading(true);
    try {
      const data = await apiClient.getSocialAccounts({ softwareId });
      setAccounts(data.accounts || []);
    } catch { } finally { setLoading(false); }
  }

  function applyFilters() {
    let filtered = [...accounts];
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter((a) =>
        a.nombre.toLowerCase().includes(q) ||
        a.username.toLowerCase().includes(q) ||
        a.tematica.toLowerCase().includes(q)
      );
    }
    if (platformFilter) {
      filtered = filtered.filter((a) => a.platform === platformFilter);
    }
    setFilteredAccounts(filtered);
  }

  // ─── Group accounts by groupName ────────────────────────────
  const { grouped, singles } = useMemo(() => {
    const groups: Record<string, SocialAccount[]> = {};
    const singleAccounts: SocialAccount[] = [];

    filteredAccounts.forEach((account) => {
      if (account.groupName) {
        if (!groups[account.groupName]) groups[account.groupName] = [];
        groups[account.groupName].push(account);
      } else {
        singleAccounts.push(account);
      }
    });

    // Only treat as "group" if 2+ accounts share groupName
    const realGroups: Record<string, SocialAccount[]> = {};
    Object.entries(groups).forEach(([name, accs]) => {
      if (accs.length >= 2) {
        realGroups[name] = accs;
      } else {
        singleAccounts.push(...accs);
      }
    });

    return { grouped: realGroups, singles: singleAccounts };
  }, [filteredAccounts]);

  async function loadPosts(accountId: string) {
    try {
      const data = await apiClient.getSocialAccountPosts(accountId, { limit: '50' });
      setPosts(data.posts || []);
    } catch { }
  }

  function handleSelectAccount(account: SocialAccount) {
    setSelectedAccountId(account.id);
    loadPosts(account.id);
    setView('account-detail');
  }

  function toggleAccountSelection(id: string) {
    setSelectedAccountIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function selectAllVisible() {
    const ids = filteredAccounts.map((a) => a.id);
    const allSelected = ids.every((id) => selectedAccountIds.includes(id));
    if (allSelected) {
      setSelectedAccountIds((prev) => prev.filter((id) => !ids.includes(id)));
    } else {
      setSelectedAccountIds((prev) => Array.from(new Set([...prev, ...ids])));
    }
  }

  async function handleGenerateBatch() {
    if (selectedAccountIds.length === 0 || !batchTopic.trim()) return;
    setGenerating(true);
    try {
      const result = await apiClient.generateSocialBatch({
        accountIds: selectedAccountIds,
        topic: batchTopic,
        tone: batchTone || undefined,
      });
      setBatchResults(result.results || []);
      loadAccounts();
    } catch { } finally { setGenerating(false); }
  }

  async function handleDeleteAccount() {
    if (!accountToDelete) return;
    try {
      await apiClient.deleteSocialAccount(accountToDelete.id);
      setAccounts((prev) => prev.filter((a) => a.id !== accountToDelete.id));
      setShowDeleteModal(false);
      setAccountToDelete(null);
    } catch { }
  }

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/growth" className="p-2 rounded-lg border border-[var(--border-primary)] hover:bg-[var(--surface-hover)] transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Megaphone className="w-6 h-6 text-pink-500" />
              Social Accounts
            </h1>
            <p className="text-[var(--text-tertiary)] mt-1">
              Gestiona todas tus cuentas sociales en un solo lugar.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={softwareId}
            onChange={(e) => { setSoftwareId(e.target.value); setView('accounts'); }}
            className="px-3 py-2 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] text-sm"
          >
            {softwares.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
          {view === 'accounts' && (
            <>
              <button
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                className="p-2 rounded-lg border border-[var(--border-primary)] hover:bg-[var(--surface-hover)] transition-colors"
                title={viewMode === 'grid' ? 'Vista lista' : 'Vista grid'}
              >
                {viewMode === 'grid' ? <List className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
              </button>
              <button
                onClick={() => { setEditingAccount(null); setShowAccountModal(true); }}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-violet-600 text-white text-sm font-semibold hover:opacity-90 transition-opacity flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Nueva cuenta
              </button>
            </>
          )}
        </div>
      </div>

      {/* Stats bar */}
      {view === 'accounts' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Cuentas" value={accounts.length} icon={Users} />
          <StatCard label="Activas" value={accounts.filter((a) => a.isActive).length} icon={SquareCheck} />
          <StatCard label="Plataformas" value={new Set(accounts.map((a) => a.platform)).size} icon={Globe} />
          <StatCard label="Posts totales" value={accounts.reduce((sum, a) => sum + (a._count?.posts || 0), 0)} icon={TrendingUp} />
        </div>
      )}

      {/* Main content */}
      {view === 'accounts' && (
        <>
          {/* Toolbar */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar cuenta, tema, username..."
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                'px-3 py-2 rounded-lg border text-sm font-medium transition-colors flex items-center gap-2',
                showFilters ? 'bg-blue-500/10 border-blue-500/40 text-blue-600' : 'border-[var(--border-primary)] hover:bg-[var(--surface-hover)]'
              )}
            >
              <Filter className="w-4 h-4" />
              Filtros
            </button>
            {selectedAccountIds.length > 0 && (
              <button
                onClick={() => { setBatchTopic(''); setBatchTone(''); setBatchResults([]); setView('generate-batch'); }}
                className="px-3 py-2 rounded-lg bg-gradient-to-r from-pink-500 to-violet-500 text-white text-sm font-semibold hover:opacity-90 transition-opacity flex items-center gap-2 animate-pulse"
              >
                <Sparkles className="w-4 h-4" />
                Generar para {selectedAccountIds.length} cuenta{selectedAccountIds.length > 1 ? 's' : ''}
              </button>
            )}
            <button
              onClick={selectAllVisible}
              className="px-3 py-2 rounded-lg border border-[var(--border-primary)] text-sm hover:bg-[var(--surface-hover)] transition-colors flex items-center gap-2"
            >
              {filteredAccounts.length > 0 && filteredAccounts.every((a) => selectedAccountIds.includes(a.id))
                ? <SquareCheck className="w-4 h-4" />
                : <Square className="w-4 h-4" />
              }
              Seleccionar visibles
            </button>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="flex items-center gap-2 flex-wrap p-3 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)]">
              <span className="text-xs text-[var(--text-tertiary)]">Plataforma:</span>
              <button
                onClick={() => setPlatformFilter('')}
                className={cn('px-2 py-1 rounded-md text-xs font-medium border transition-colors', !platformFilter ? 'bg-blue-500/15 border-blue-500/40 text-blue-600' : 'border-[var(--border-primary)] hover:bg-[var(--bg-tertiary)]')}
              >
                Todas
              </button>
              {PLATFORMS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPlatformFilter(platformFilter === p.id ? '' : p.id)}
                  className={cn(
                    'px-2 py-1 rounded-md text-xs font-medium border transition-colors flex items-center gap-1',
                    platformFilter === p.id ? `${p.bg} ${p.border} ${p.color}` : 'border-[var(--border-primary)] hover:bg-[var(--bg-tertiary)]'
                  )}
                >
                  {p.icon}
                  {p.name}
                </button>
              ))}
            </div>
          )}

          {/* Accounts Grid/List */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="p-5 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] animate-pulse">
                  <div className="h-12 w-12 rounded-full bg-[var(--bg-tertiary)] mb-3" />
                  <div className="h-4 w-3/4 bg-[var(--bg-tertiary)] rounded mb-2" />
                  <div className="h-3 w-1/2 bg-[var(--bg-tertiary)] rounded" />
                </div>
              ))}
            </div>
          ) : filteredAccounts.length === 0 ? (
            <EmptyState onCreate={() => { setEditingAccount(null); setShowAccountModal(true); }} />
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {/* Groups first */}
              {Object.entries(grouped).map(([groupName, groupAccounts]) => (
                <AccountGroupCard
                  key={groupName}
                  groupName={groupName}
                  accounts={groupAccounts}
                  isSelected={groupAccounts.every((a) => selectedAccountIds.includes(a.id))}
                  onSelect={() => {
                    const ids = groupAccounts.map((a) => a.id);
                    const allSelected = ids.every((id) => selectedAccountIds.includes(id));
                    if (allSelected) {
                      setSelectedAccountIds((prev) => prev.filter((id) => !ids.includes(id)));
                    } else {
                      setSelectedAccountIds((prev) => Array.from(new Set([...prev, ...ids])));
                    }
                  }}
                  onClick={() => router.push(`/dashboard/growth/social-posts/group/${encodeURIComponent(groupName)}`)}
                />
              ))}
              {/* Individual accounts */}
              {singles.map((account) => (
                <AccountCard
                  key={account.id}
                  account={account}
                  isSelected={selectedAccountIds.includes(account.id)}
                  onSelect={() => toggleAccountSelection(account.id)}
                  onClick={() => handleSelectAccount(account)}
                  onEdit={(e) => { e.stopPropagation(); setEditingAccount(account); setShowAccountModal(true); }}
                  onDelete={(e) => { e.stopPropagation(); setAccountToDelete(account); setShowDeleteModal(true); }}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] overflow-hidden">
              <table className="w-full text-sm">
                <thead className="border-b border-[var(--border-primary)] bg-[var(--bg-tertiary)]">
                  <tr>
                    <th className="px-4 py-3 text-left w-8"></th>
                    <th className="px-4 py-3 text-left">Cuenta</th>
                    <th className="px-4 py-3 text-left">Plataforma</th>
                    <th className="px-4 py-3 text-left">Temática</th>
                    <th className="px-4 py-3 text-left">Tono</th>
                    <th className="px-4 py-3 text-left">Posts</th>
                    <th className="px-4 py-3 text-left">Estado</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Groups in list view */}
                  {Object.entries(grouped).map(([groupName, groupAccounts]) => (
                    <tr
                      key={groupName}
                      onClick={() => router.push(`/dashboard/growth/social-posts/group/${encodeURIComponent(groupName)}`)}
                      className="border-b border-[var(--border-primary)]/50 hover:bg-[var(--surface-hover)] transition-colors cursor-pointer bg-blue-500/5"
                    >
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => {
                          const ids = groupAccounts.map((a) => a.id);
                          const allSelected = ids.every((id) => selectedAccountIds.includes(id));
                          if (allSelected) {
                            setSelectedAccountIds((prev) => prev.filter((id) => !ids.includes(id)));
                          } else {
                            setSelectedAccountIds((prev) => Array.from(new Set([...prev, ...ids])));
                          }
                        }}>
                          {groupAccounts.every((a) => selectedAccountIds.includes(a.id))
                            ? <SquareCheck className="w-4 h-4 text-blue-500" />
                            : <Square className="w-4 h-4 text-[var(--text-tertiary)]" />
                          }
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white text-xs font-bold">
                            <Layers className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-medium flex items-center gap-1">
                              {groupName}
                              <span className="px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 text-[10px]">{groupAccounts.length}</span>
                            </p>
                            <p className="text-xs text-[var(--text-tertiary)]">@{groupAccounts[0]?.username}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {groupAccounts.slice(0, 4).map((a) => {
                            const cfg = getPlatformConfig(a.platform);
                            return <span key={a.id} className={cn('w-5 h-5 rounded flex items-center justify-center text-[10px]', cfg.bg, cfg.color)}>{cfg.icon}</span>;
                          })}
                          {groupAccounts.length > 4 && <span className="text-[10px] text-[var(--text-tertiary)]">+{groupAccounts.length - 4}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[var(--text-secondary)]">{groupAccounts[0]?.tematica}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-md bg-[var(--bg-tertiary)] text-xs">{groupAccounts[0]?.tono}</span>
                      </td>
                      <td className="px-4 py-3">{groupAccounts.reduce((s, a) => s + (a._count?.posts || 0), 0)}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-600">
                          Grupo
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <ExternalLink className="w-3.5 h-3.5 text-[var(--text-tertiary)] inline" />
                      </td>
                    </tr>
                  ))}
                  {/* Individual accounts */}
                  {singles.map((account) => (
                    <tr
                      key={account.id}
                      onClick={() => handleSelectAccount(account)}
                      className="border-b border-[var(--border-primary)]/50 hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => toggleAccountSelection(account.id)}>
                          {selectedAccountIds.includes(account.id)
                            ? <SquareCheck className="w-4 h-4 text-blue-500" />
                            : <Square className="w-4 h-4 text-[var(--text-tertiary)]" />
                          }
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center text-xs font-bold">
                            {account.nombre[0]}
                          </div>
                          <div>
                            <p className="font-medium">{account.nombre}</p>
                            <p className="text-xs text-[var(--text-tertiary)]">@{account.username}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <PlatformBadge platform={account.platform} />
                      </td>
                      <td className="px-4 py-3 text-[var(--text-secondary)]">{account.tematica}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-md bg-[var(--bg-tertiary)] text-xs">{account.tono}</span>
                      </td>
                      <td className="px-4 py-3">{account._count?.posts || 0}</td>
                      <td className="px-4 py-3">
                        <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', account.isActive ? 'bg-green-500/10 text-green-600' : 'bg-zinc-500/10 text-zinc-500')}>
                          {account.isActive ? 'Activa' : 'Inactiva'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={(e) => { e.stopPropagation(); setEditingAccount(account); setShowAccountModal(true); }} className="p-1.5 rounded hover:bg-[var(--surface-hover)]">
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); setAccountToDelete(account); setShowDeleteModal(true); }} className="p-1.5 rounded hover:bg-red-500/10 text-red-500">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {view === 'account-detail' && selectedAccount && (
        <AccountDetail
          account={selectedAccount}
          posts={posts}
          onBack={() => setView('accounts')}
          onRefresh={() => loadPosts(selectedAccount.id)}
          onRefreshAccounts={loadAccounts}
        />
      )}

      {view === 'generate-batch' && (
        <GenerateBatchView
          accounts={accounts.filter((a) => selectedAccountIds.includes(a.id))}
          topic={batchTopic}
          setTopic={setBatchTopic}
          tone={batchTone}
          setTone={setBatchTone}
          generating={generating}
          results={batchResults}
          onGenerate={handleGenerateBatch}
          onBack={() => setView('accounts')}
        />
      )}

      {/* Modals */}
      {showAccountModal && (
        <AccountModal
          account={editingAccount}
          softwareId={softwareId}
          onClose={() => setShowAccountModal(false)}
          onSave={(accounts) => {
            if (editingAccount) {
              // Editing: single account returned as array
              const account = accounts[0];
              setAccounts((prev) => prev.map((a) => (a.id === account.id ? account : a)));
            } else {
              // Creating: could be multiple
              setAccounts((prev) => [...accounts, ...prev]);
            }
            setShowAccountModal(false);
            setEditingAccount(null);
          }}
        />
      )}

      {showDeleteModal && accountToDelete && (
        <DeleteModal
          account={accountToDelete}
          onClose={() => { setShowDeleteModal(false); setAccountToDelete(null); }}
          onConfirm={handleDeleteAccount}
        />
      )}
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

function AccountCard({ account, isSelected, onSelect, onClick, onEdit, onDelete }: {
  account: SocialAccount;
  isSelected: boolean;
  onSelect: () => void;
  onClick: () => void;
  onEdit: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
}) {
  const cfg = getPlatformConfig(account.platform);
  return (
    <div
      onClick={onClick}
      className={cn(
        'group relative p-5 rounded-xl border bg-[var(--bg-secondary)] cursor-pointer transition-all duration-200 hover:shadow-lg',
        isSelected ? `${cfg.border} border-2 ring-1 ring-blue-500/20` : 'border-[var(--border-primary)] hover:border-blue-500/30'
      )}
    >
      {/* Checkbox */}
      <button
        onClick={(e) => { e.stopPropagation(); onSelect(); }}
        className="absolute top-3 left-3 z-10"
      >
        {isSelected
          ? <SquareCheck className="w-5 h-5 text-blue-500" />
          : <Square className="w-5 h-5 text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)]" />
        }
      </button>

      {/* Actions */}
      <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={onEdit} className="p-1.5 rounded hover:bg-[var(--surface-hover)]">
          <Edit3 className="w-3.5 h-3.5" />
        </button>
        <button onClick={onDelete} className="p-1.5 rounded hover:bg-red-500/10 text-red-500">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Content */}
      <div className="mt-6">
        <div className="flex items-center gap-3 mb-3">
          <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', cfg.bg)}>
            <span className={cfg.color}>{cfg.icon}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-[var(--text-primary)] truncate">{account.nombre}</h3>
            <p className="text-xs text-[var(--text-tertiary)]">@{account.username}</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border', cfg.bg, cfg.border, cfg.color)}>
              {cfg.icon}
              {cfg.name}
            </span>
            {!account.isActive && (
              <span className="px-2 py-0.5 rounded-md bg-zinc-500/10 text-zinc-500 text-[10px] font-medium">Inactiva</span>
            )}
          </div>

          <p className="text-xs text-[var(--text-secondary)] line-clamp-1">
            <span className="text-[var(--text-tertiary)]">Tema:</span> {account.tematica}
          </p>
          <p className="text-xs text-[var(--text-secondary)]">
            <span className="text-[var(--text-tertiary)]">Tono:</span> {account.tono} · <span className="text-[var(--text-tertiary)]">Formato:</span> {account.formato}
          </p>

          <div className="flex items-center gap-3 pt-2 border-t border-[var(--border-primary)]/50">
            <span className="text-xs text-[var(--text-tertiary)] flex items-center gap-1">
              <Users className="w-3 h-3" />
              {account.followersCount.toLocaleString()}
            </span>
            <span className="text-xs text-[var(--text-tertiary)] flex items-center gap-1">
              <PenLine className="w-3 h-3" />
              {account._count?.posts || 0}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Account Group Card ─────────────────────────────────────
function AccountGroupCard({ groupName, accounts, isSelected, onSelect, onClick }: {
  groupName: string;
  accounts: SocialAccount[];
  isSelected: boolean;
  onSelect: () => void;
  onClick: () => void;
}) {
  const totalFollowers = accounts.reduce((s, a) => s + a.followersCount, 0);
  const totalPosts = accounts.reduce((s, a) => s + (a._count?.posts || 0), 0);
  const allActive = accounts.every((a) => a.isActive);

  return (
    <div
      onClick={onClick}
      className={cn(
        'group relative p-5 rounded-xl border bg-[var(--bg-secondary)] cursor-pointer transition-all duration-200 hover:shadow-lg',
        isSelected ? 'border-blue-500/50 border-2 ring-1 ring-blue-500/20' : 'border-[var(--border-primary)] hover:border-blue-500/30'
      )}
    >
      {/* Checkbox */}
      <button
        onClick={(e) => { e.stopPropagation(); onSelect(); }}
        className="absolute top-3 left-3 z-10"
      >
        {isSelected
          ? <SquareCheck className="w-5 h-5 text-blue-500" />
          : <Square className="w-5 h-5 text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)]" />
        }
      </button>

      {/* Badge de grupo */}
      <div className="absolute top-3 right-3">
        <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-blue-500/10 to-violet-500/10 text-blue-600 text-[10px] font-semibold border border-blue-500/20">
          Grupo
        </span>
      </div>

      {/* Content */}
      <div className="mt-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white">
            <Layers className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-[var(--text-primary)] truncate">{groupName}</h3>
            <p className="text-xs text-[var(--text-tertiary)]">@{accounts[0]?.username}</p>
          </div>
        </div>

        {/* Plataformas */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {accounts.map((account) => {
            const cfg = getPlatformConfig(account.platform);
            return (
              <span key={account.id} className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border', cfg.bg, cfg.border, cfg.color)}>
                {cfg.icon}
                {cfg.name}
              </span>
            );
          })}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 pt-2 border-t border-[var(--border-primary)]/50">
          <span className="text-xs text-[var(--text-tertiary)] flex items-center gap-1">
            <Globe className="w-3 h-3" />
            {accounts.length} plataformas
          </span>
          <span className="text-xs text-[var(--text-tertiary)] flex items-center gap-1">
            <Users className="w-3 h-3" />
            {totalFollowers.toLocaleString()}
          </span>
          <span className="text-xs text-[var(--text-tertiary)] flex items-center gap-1">
            <PenLine className="w-3 h-3" />
            {totalPosts}
          </span>
        </div>

        {!allActive && (
          <p className="text-[10px] text-zinc-500 mt-2">Algunas cuentas inactivas</p>
        )}
      </div>
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 rounded-xl border border-dashed border-[var(--border-primary)] bg-[var(--bg-secondary)]/50">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-violet-500/20 flex items-center justify-center mb-4">
        <Megaphone className="w-8 h-8 text-blue-500" />
      </div>
      <h3 className="text-lg font-semibold">Sin cuentas aún</h3>
      <p className="text-sm text-[var(--text-tertiary)] mt-1 text-center max-w-sm mb-4">
        Crea tu primera cuenta social para empezar a generar contenido con IA.
      </p>
      <button
        onClick={onCreate}
        className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-violet-600 text-white text-sm font-semibold hover:opacity-90 transition-opacity flex items-center gap-2"
      >
        <Plus className="w-4 h-4" />
        Crear cuenta
      </button>
    </div>
  );
}

// ─── Account Detail ─────────────────────────────────────────
function AccountDetail({ account, posts, onBack, onRefresh, onRefreshAccounts }: {
  account: SocialAccount;
  posts: SocialPost[];
  onBack: () => void;
  onRefresh: () => void;
  onRefreshAccounts: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'posts' | 'settings' | 'new-post' | 'themes'>('posts');
  const [newPostContent, setNewPostContent] = useState('');
  const [generating, setGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const cfg = getPlatformConfig(account.platform);

  async function handleGeneratePost() {
    setGenerating(true);
    try {
      const result = await apiClient.generateMultiPlatformPosts({
        softwareId: account.softwareId,
        platforms: [account.platform],
        topic: account.tematica,
        tone: account.tono,
        length: account.longitud,
      });

      const postData = result.posts?.[0];
      if (postData) {
        await apiClient.createSocialAccountPost(account.id, {
          content: postData.content,
          hashtags: postData.hashtags || [],
          title: `Post para ${account.nombre}`,
        });
        onRefresh();
      }
    } catch { } finally { setGenerating(false); }
  }

  async function handleCreateManualPost() {
    if (!newPostContent.trim()) return;
    try {
      await apiClient.createSocialAccountPost(account.id, {
        content: newPostContent,
        title: `Post manual - ${account.nombre}`,
      });
      setNewPostContent('');
      setActiveTab('posts');
      onRefresh();
    } catch { }
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
      onRefresh();
    } catch { }
  }

  const inProductionPosts = posts.filter((p) => p.status === 'IN_PRODUCTION');
  const inReviewPosts = posts.filter((p) => p.status === 'IN_REVIEW');
  const needsRevisionPosts = posts.filter((p) => p.status === 'NEEDS_REVISION');
  const draftPosts = posts.filter((p) => p.status === 'DRAFT');
  const scheduledPosts = posts.filter((p) => p.status === 'SCHEDULED');
  const publishedPosts = posts.filter((p) => p.status === 'PUBLISHED');

  return (
    <div className="space-y-6">
      {/* Breadcrumb + header */}
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 rounded-lg border border-[var(--border-primary)] hover:bg-[var(--surface-hover)] transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-3 flex-1">
          <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', cfg.bg)}>
            <span className={cfg.color}>{cfg.icon}</span>
          </div>
          <div>
            <h2 className="text-xl font-bold">{account.nombre}</h2>
            <p className="text-sm text-[var(--text-tertiary)]">@{account.username} · {cfg.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleGeneratePost}
            disabled={generating}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-violet-600 text-white text-sm font-semibold hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50"
          >
            {generating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Generar post
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-[var(--border-primary)]">
        {[
          { key: 'posts' as const, label: 'Posts', count: posts.length },
          { key: 'new-post' as const, label: 'Nuevo post', count: null },
          { key: 'themes' as const, label: 'Temas', count: null },
          { key: 'settings' as const, label: 'Configuración', count: null },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
              activeTab === tab.key
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
            )}
          >
            {tab.label}
            {tab.count !== null && <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-[var(--bg-tertiary)] text-xs">{tab.count}</span>}
          </button>
        ))}
      </div>

      {activeTab === 'posts' && (
        <PostPipeline
          account={account}
          posts={posts}
          onRefresh={onRefresh}
        />
      )}

      {activeTab === 'new-post' && (
        <div className="max-w-2xl">
          <div className="p-5 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] space-y-4">
            <div>
              <label className="text-sm font-semibold mb-2 block">Contenido del post</label>
              <textarea
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                placeholder="Escribe tu post aquí..."
                className="w-full px-3 py-2.5 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-tertiary)] text-sm resize-y min-h-[150px] focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
              <p className="text-xs text-[var(--text-tertiary)] mt-1">{newPostContent.length} caracteres</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleCreateManualPost}
                disabled={!newPostContent.trim()}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-violet-600 text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Guardar borrador
              </button>
              <button
                onClick={() => setNewPostContent('')}
                className="px-4 py-2 rounded-lg border border-[var(--border-primary)] text-sm hover:bg-[var(--surface-hover)] transition-colors"
              >
                Limpiar
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'themes' && <ContentThemes account={account} />}

      {activeTab === 'settings' && (
        <AccountSettings account={account} onUpdate={onRefreshAccounts} />
      )}
    </div>
  );
}

// ─── Content Themes — temas de contenido recurrentes ────────
interface ContentTheme {
  id: string;
  nombre: string;
  descripcion?: string;
  frecuencia: string;
  diaPreferido?: string;
  formatoPreferido?: string;
  activo: boolean;
}

const FRECUENCIAS = ['diaria', 'semanal', 'quincenal', 'mensual'];
const DIAS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];

function ContentThemes({ account }: { account: SocialAccount }) {
  const [themes, setThemes] = useState<ContentTheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ContentTheme | null>(null);
  const [form, setForm] = useState({ nombre: '', descripcion: '', frecuencia: 'semanal', diaPreferido: '', formatoPreferido: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.getContentThemes(account.id);
      setThemes(res?.themes || []);
    } catch {
      setThemes([]);
    } finally {
      setLoading(false);
    }
  }, [account.id]);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setEditing(null);
    setForm({ nombre: '', descripcion: '', frecuencia: 'semanal', diaPreferido: '', formatoPreferido: '' });
    setShowForm(true);
  }

  function openEdit(t: ContentTheme) {
    setEditing(t);
    setForm({
      nombre: t.nombre,
      descripcion: t.descripcion || '',
      frecuencia: t.frecuencia,
      diaPreferido: t.diaPreferido || '',
      formatoPreferido: t.formatoPreferido || '',
    });
    setShowForm(true);
  }

  async function save() {
    if (!form.nombre.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        await apiClient.updateContentTheme(editing.id, form);
      } else {
        await apiClient.createContentTheme({ ...form, accountId: account.id });
      }
      setShowForm(false);
      await load();
    } catch (e: any) {
      alert(e?.message || 'Error al guardar el tema');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(t: ContentTheme) {
    await apiClient.updateContentTheme(t.id, { ...t, activo: !t.activo }).catch(() => {});
    load();
  }

  async function remove(t: ContentTheme) {
    if (!confirm(`¿Eliminar el tema "${t.nombre}"?`)) return;
    await apiClient.deleteContentTheme(t.id).catch(() => {});
    load();
  }

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold">Temas de contenido recurrentes</h3>
          <p className="text-sm text-[var(--text-tertiary)]">Pilares editoriales de esta cuenta (ej: "Tip del lunes", "UGC viernes").</p>
        </div>
        <button
          onClick={openCreate}
          className="px-3 py-2 rounded-lg bg-blue-500 text-white text-sm font-semibold hover:opacity-90 flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> Nuevo tema
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(2)].map((_, i) => <div key={i} className="h-16 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] animate-pulse" />)}
        </div>
      ) : themes.length === 0 ? (
        <div className="p-8 text-center rounded-xl border border-dashed border-[var(--border-primary)] text-sm text-[var(--text-tertiary)]">
          Sin temas definidos. Crea pilares editoriales para planificar tu contenido.
        </div>
      ) : (
        <div className="space-y-2">
          {themes.map((t) => (
            <div key={t.id} className={cn('p-4 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-secondary)]', !t.activo && 'opacity-60')}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold">{t.nombre}</h4>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-500 capitalize">{t.frecuencia}</span>
                    {t.diaPreferido && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--bg-tertiary)] capitalize">{t.diaPreferido}</span>}
                    {t.formatoPreferido && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--bg-tertiary)]">{t.formatoPreferido}</span>}
                  </div>
                  {t.descripcion && <p className="text-sm text-[var(--text-tertiary)] mt-1">{t.descripcion}</p>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => toggleActive(t)} className="px-2 py-1 rounded-lg border border-[var(--border-primary)] text-xs hover:bg-[var(--surface-hover)]">
                    {t.activo ? 'Activo' : 'Inactivo'}
                  </button>
                  <button onClick={() => openEdit(t)} className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)]"><Edit3 className="w-4 h-4" /></button>
                  <button onClick={() => remove(t)} className="p-1.5 rounded-lg hover:bg-red-500/10 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-md rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-[var(--border-primary)]">
              <h3 className="font-bold">{editing ? 'Editar tema' : 'Nuevo tema'}</h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded hover:bg-[var(--surface-hover)]"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-[var(--text-tertiary)] mb-1.5 block">Nombre *</label>
                <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Tip del lunes" className="w-full px-3 py-2 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-tertiary)] text-sm" />
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--text-tertiary)] mb-1.5 block">Descripción</label>
                <textarea value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-tertiary)] text-sm resize-y min-h-[60px]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[var(--text-tertiary)] mb-1.5 block">Frecuencia</label>
                  <select value={form.frecuencia} onChange={(e) => setForm({ ...form, frecuencia: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-tertiary)] text-sm capitalize">
                    {FRECUENCIAS.map((f) => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-[var(--text-tertiary)] mb-1.5 block">Día preferido</label>
                  <select value={form.diaPreferido} onChange={(e) => setForm({ ...form, diaPreferido: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-tertiary)] text-sm capitalize">
                    <option value="">—</option>
                    {DIAS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--text-tertiary)] mb-1.5 block">Formato preferido</label>
                <input value={form.formatoPreferido} onChange={(e) => setForm({ ...form, formatoPreferido: e.target.value })} placeholder="reel, carousel, feed..." className="w-full px-3 py-2 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-tertiary)] text-sm" />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-5 border-t border-[var(--border-primary)]">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border border-[var(--border-primary)] text-sm hover:bg-[var(--surface-hover)]">Cancelar</button>
              <button onClick={save} disabled={saving || !form.nombre.trim()} className="px-4 py-2 rounded-lg bg-blue-500 text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
                <Save className="w-4 h-4" /> {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
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

// ─── Generate Batch View ────────────────────────────────────
function GenerateBatchView({
  accounts, topic, setTopic, tone, setTone, generating, results, onGenerate, onBack,
}: {
  accounts: SocialAccount[];
  topic: string;
  setTopic: (v: string) => void;
  tone: string;
  setTone: (v: string) => void;
  generating: boolean;
  results: any[];
  onGenerate: () => void;
  onBack: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 rounded-lg border border-[var(--border-primary)] hover:bg-[var(--surface-hover)] transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h2 className="text-xl font-bold">Generación masiva</h2>
          <p className="text-sm text-[var(--text-tertiary)]">
            {accounts.length} cuenta{accounts.length > 1 ? 's' : ''} seleccionada{accounts.length > 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Selected accounts */}
      <div className="p-4 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-secondary)]">
        <h3 className="text-sm font-semibold mb-3">Cuentas seleccionadas</h3>
        <div className="flex flex-wrap gap-2">
          {accounts.map((a) => {
            const cfg = getPlatformConfig(a.platform);
            return (
              <span key={a.id} className={cn('inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border', cfg.bg, cfg.border, cfg.color)}>
                {cfg.icon}
                {a.nombre}
              </span>
            );
          })}
        </div>
      </div>

      {/* Form */}
      <div className="p-5 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] space-y-4 max-w-2xl">
        <div>
          <label className="text-sm font-semibold mb-1.5 block">Tema o idea</label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Ej: Tips de marketing para peluquerías..."
            className="w-full px-3 py-2.5 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-tertiary)] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          />
        </div>
        <div>
          <label className="text-sm font-semibold mb-2 block">Tono (opcional — usa el de cada cuenta por defecto)</label>
          <div className="flex flex-wrap gap-2">
            {TONES.map((t) => (
              <button
                key={t.value}
                onClick={() => setTone(tone === t.value ? '' : t.value)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                  tone === t.value ? 'bg-blue-500/15 border-blue-500/40 text-blue-600' : 'border-[var(--border-primary)] hover:bg-[var(--bg-tertiary)]'
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={onGenerate}
          disabled={generating || !topic.trim()}
          className="w-full py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-violet-600 text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
        >
          {generating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
          {generating ? 'Generando...' : 'Generar posts'}
        </button>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Resultados</h3>
          {results.map((r, i) => {
            const cfg = getPlatformConfig(r.platform);
            return (
              <div key={i} className={cn(
                'p-4 rounded-xl border bg-[var(--bg-secondary)]',
                r.success ? 'border-green-500/30' : 'border-red-500/30'
              )}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border', cfg.bg, cfg.border, cfg.color)}>
                    {cfg.icon}
                    {r.account}
                  </span>
                  {r.success ? (
                    <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium">
                      <Check className="w-3 h-3" /> Generado
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-red-500 font-medium">
                      <X className="w-3 h-3" /> Error: {r.error}
                    </span>
                  )}
                </div>
                {r.success && r.post && (
                  <p className="text-sm text-[var(--text-secondary)] line-clamp-3">{r.post.content}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Account Modal (Create/Edit) ────────────────────────────
function AccountModal({ account, softwareId, onClose, onSave }: {
  account: SocialAccount | null;
  softwareId: string;
  onClose: () => void;
  onSave: (accounts: SocialAccount[]) => void;
}) {
  const isEditing = !!account;
  const [form, setForm] = useState({
    nombre: account?.nombre || '',
    username: account?.username || '',
    platforms: account ? [account.platform] : [] as Platform[],
    avatarUrl: account?.avatarUrl || '',
    profileUrl: account?.profileUrl || '',
    tematica: account?.tematica || '',
    tono: account?.tono || 'profesional',
    formato: account?.formato || 'feed',
    longitud: account?.longitud || 'medio',
    idioma: account?.idioma || 'es',
    hashtagsDefault: account?.hashtagsDefault?.join(', ') || '',
    notas: account?.notas || '',
  });
  const [saving, setSaving] = useState(false);

  function togglePlatform(p: Platform) {
    setForm((prev) => {
      if (isEditing) {
        // Editing: only one platform allowed
        return { ...prev, platforms: [p] };
      }
      // Creating: multiple platforms allowed
      const has = prev.platforms.includes(p);
      return {
        ...prev,
        platforms: has ? prev.platforms.filter((x) => x !== p) : [...prev.platforms, p],
      };
    });
  }

  function selectAllPlatforms() {
    if (isEditing) return;
    setForm((prev) => ({
      ...prev,
      platforms: prev.platforms.length === PLATFORMS.length ? [] : PLATFORMS.map((p) => p.id),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.platforms.length === 0) return;
    setSaving(true);
    try {
      const hashtagsDefault = form.hashtagsDefault.split(',').map((h) => h.trim()).filter(Boolean);

      if (isEditing) {
        // Single account update
        const data = {
          ...form,
          platform: form.platforms[0],
          softwareId,
          hashtagsDefault,
        };
        const result = await apiClient.updateSocialAccount(account!.id, data);
        onSave([result]);
      } else if (form.platforms.length === 1) {
        // Single account create (backward compat)
        const data = {
          ...form,
          platform: form.platforms[0],
          softwareId,
          hashtagsDefault,
        };
        const result = await apiClient.createSocialAccount(data);
        onSave([result]);
      } else {
        // Multiple accounts — batch create
        const result = await apiClient.createSocialAccountsBatch({
          softwareId,
          platforms: form.platforms,
          nombre: form.nombre,
          username: form.username,
          tematica: form.tematica,
          tono: form.tono,
          formato: form.formato,
          longitud: form.longitud,
          idioma: form.idioma,
          hashtagsDefault,
          notas: form.notas,
        });
        onSave(result.accounts || []);
      }
    } catch { } finally { setSaving(false); }
  }

  const selectedCount = form.platforms.length;
  const allSelected = selectedCount === PLATFORMS.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-[var(--border-primary)]">
          <h3 className="text-lg font-bold">
            {account ? 'Editar cuenta' : selectedCount > 1 ? `Nuevas cuentas (${selectedCount})` : 'Nueva cuenta social'}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-[var(--surface-hover)]">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-[var(--text-tertiary)] mb-1 block">Nombre base</label>
              <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required className="w-full px-3 py-2 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-tertiary)] text-sm" placeholder="Groomly" />
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--text-tertiary)] mb-1 block">Username</label>
              <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required className="w-full px-3 py-2 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-tertiary)] text-sm" placeholder="@groomly" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-[var(--text-tertiary)] block">
                Plataformas {selectedCount > 0 && <span className="text-blue-500 font-semibold">({selectedCount})</span>}
              </label>
              {!isEditing && (
                <button
                  type="button"
                  onClick={selectAllPlatforms}
                  className="text-xs text-blue-500 hover:text-blue-600 font-medium transition-colors"
                >
                  {allSelected ? 'Desmarcar todas' : 'Seleccionar todas'}
                </button>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {PLATFORMS.map((p) => {
                const isSelected = form.platforms.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => togglePlatform(p.id)}
                    className={cn(
                      'relative flex flex-col items-center gap-1 p-3 rounded-lg border text-xs transition-all',
                      isSelected
                        ? `${p.bg} ${p.border} ${p.color} border-2 ring-1 ring-blue-500/20`
                        : 'border-[var(--border-primary)] hover:bg-[var(--bg-tertiary)]'
                    )}
                  >
                    {isSelected && (
                      <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-white" />
                      </span>
                    )}
                    <span className={cn('w-6 h-6', isSelected ? p.color : 'text-[var(--text-tertiary)]')}>
                      {p.icon}
                    </span>
                    <span className="text-[10px] font-medium">{p.name}</span>
                  </button>
                );
              })}
            </div>
            {selectedCount === 0 && (
              <p className="text-xs text-red-500 mt-1">Selecciona al menos una plataforma</p>
            )}
            {!isEditing && selectedCount > 1 && (
              <p className="text-xs text-[var(--text-tertiary)] mt-1">
                Se creará una cuenta por cada plataforma seleccionada: <strong>{form.nombre || 'Groomly'} Instagram</strong>, <strong>{form.nombre || 'Groomly'} TikTok</strong>...
              </p>
            )}
          </div>

          <div>
            <label className="text-xs font-medium text-[var(--text-tertiary)] mb-1 block">Temática</label>
            <input value={form.tematica} onChange={(e) => setForm({ ...form, tematica: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-tertiary)] text-sm" placeholder="Ej: tips de peluquería canina" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-[var(--text-tertiary)] mb-1 block">Tono</label>
              <select value={form.tono} onChange={(e) => setForm({ ...form, tono: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-tertiary)] text-sm">
                {TONES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--text-tertiary)] mb-1 block">Formato</label>
              <select value={form.formato} onChange={(e) => setForm({ ...form, formato: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-tertiary)] text-sm">
                {FORMATOS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-[var(--text-tertiary)] mb-1 block">Longitud</label>
              <select value={form.longitud} onChange={(e) => setForm({ ...form, longitud: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-tertiary)] text-sm">
                <option value="corto">Corto</option>
                <option value="medio">Medio</option>
                <option value="largo">Largo</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--text-tertiary)] mb-1 block">Idioma</label>
              <select value={form.idioma} onChange={(e) => setForm({ ...form, idioma: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-tertiary)] text-sm">
                <option value="es">Español</option>
                <option value="en">English</option>
                <option value="ca">Català</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-[var(--text-tertiary)] mb-1 block">Hashtags por defecto (separados por coma)</label>
            <input value={form.hashtagsDefault} onChange={(e) => setForm({ ...form, hashtagsDefault: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-tertiary)] text-sm" placeholder="#groomly, #petcare, #dogs" />
          </div>

          <div>
            <label className="text-xs font-medium text-[var(--text-tertiary)] mb-1 block">Notas</label>
            <textarea value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} rows={2} className="w-full px-3 py-2 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-tertiary)] text-sm resize-none" />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button type="submit" disabled={saving || selectedCount === 0} className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-violet-600 text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2">
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {account
                ? 'Guardar cambios'
                : selectedCount > 1
                  ? `Crear ${selectedCount} cuentas`
                  : 'Crear cuenta'}
            </button>
            <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-lg border border-[var(--border-primary)] text-sm hover:bg-[var(--surface-hover)] transition-colors">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Delete Modal ───────────────────────────────────────────
function DeleteModal({ account, onClose, onConfirm }: {
  account: SocialAccount;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] shadow-2xl p-6">
        <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
          <Trash2 className="w-6 h-6 text-red-500" />
        </div>
        <h3 className="text-lg font-bold text-center">¿Eliminar cuenta?</h3>
        <p className="text-sm text-[var(--text-tertiary)] text-center mt-2">
          Vas a eliminar <strong>{account.nombre}</strong> (@{account.username}). Esta acción no se puede deshacer.
        </p>
        <div className="flex items-center gap-3 mt-6">
          <button onClick={onConfirm} className="flex-1 py-2.5 rounded-lg bg-red-500 text-white text-sm font-semibold hover:opacity-90 transition-opacity">
            Eliminar
          </button>
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-[var(--border-primary)] text-sm hover:bg-[var(--surface-hover)] transition-colors">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Account Settings (inline edit) ─────────────────────────
function AccountSettings({ account, onUpdate }: { account: SocialAccount; onUpdate: () => void }) {
  const [form, setForm] = useState({
    tematica: account.tematica,
    tono: account.tono,
    formato: account.formato,
    longitud: account.longitud,
    hashtagsDefault: account.hashtagsDefault.join(', '),
    notas: account.notas || '',
  });
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await apiClient.updateSocialAccount(account.id, {
        tematica: form.tematica,
        tono: form.tono,
        formato: form.formato,
        longitud: form.longitud,
        hashtagsDefault: form.hashtagsDefault.split(',').map((h) => h.trim()).filter(Boolean),
        notas: form.notas,
      });
      onUpdate();
    } catch { } finally { setSaving(false); }
  }

  return (
    <div className="max-w-2xl space-y-4">
      <div className="p-5 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] space-y-4">
        <h3 className="font-semibold">Configuración de contenido</h3>

        <div>
          <label className="text-xs font-medium text-[var(--text-tertiary)] mb-1 block">Temática</label>
          <input value={form.tematica} onChange={(e) => setForm({ ...form, tematica: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-tertiary)] text-sm" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-[var(--text-tertiary)] mb-1 block">Tono</label>
            <select value={form.tono} onChange={(e) => setForm({ ...form, tono: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-tertiary)] text-sm">
              {TONES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-[var(--text-tertiary)] mb-1 block">Formato</label>
            <select value={form.formato} onChange={(e) => setForm({ ...form, formato: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-tertiary)] text-sm">
              {FORMATOS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-[var(--text-tertiary)] mb-1 block">Longitud</label>
            <select value={form.longitud} onChange={(e) => setForm({ ...form, longitud: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-tertiary)] text-sm">
              <option value="corto">Corto</option>
              <option value="medio">Medio</option>
              <option value="largo">Largo</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-[var(--text-tertiary)] mb-1 block">Hashtags por defecto</label>
            <input value={form.hashtagsDefault} onChange={(e) => setForm({ ...form, hashtagsDefault: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-tertiary)] text-sm" />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-[var(--text-tertiary)] mb-1 block">Notas internas</label>
          <textarea value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} rows={3} className="w-full px-3 py-2 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-tertiary)] text-sm resize-none" />
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-violet-600 text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center gap-2"
        >
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Guardar cambios
        </button>
      </div>
    </div>
  );
}
