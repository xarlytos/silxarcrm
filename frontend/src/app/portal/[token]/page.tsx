'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiClient } from '@/lib/api';
import {
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Calendar,
  TrendingUp,
  MousePointerClick,
  Heart,
  Send,
  ExternalLink,
  Sparkles,
} from 'lucide-react';

interface PortalPost {
  id: string;
  content: string;
  hashtags: string[];
  mediaUrls: string[];
  title: string | null;
  formato: string | null;
  status: string;
  scheduledAt: string | null;
  publishedAt: string | null;
  externalUrl: string | null;
  metrics: {
    impressions: number;
    clicks: number;
    likes: number;
    shares: number;
    comments: number;
    reach: number;
    engagement: number;
  };
  account: { nombre: string; platform: string; avatarUrl?: string | null };
}

interface PortalData {
  brand: {
    nombre: string;
    logoUrl: string | null;
    colorPrimario: string;
    descripcion: string | null;
    website: string | null;
  };
  stats: {
    publicados30d: number;
    impressions: number;
    clicks: number;
    interacciones: number;
    reach: number;
    pendientesAprobacion: number;
    programados: number;
  };
  pendientes: PortalPost[];
  proximos: PortalPost[];
  publicados: PortalPost[];
}

const PLATFORM_LABEL: Record<string, string> = {
  INSTAGRAM: 'Instagram', LINKEDIN: 'LinkedIn', FACEBOOK: 'Facebook', X: 'X',
  TIKTOK: 'TikTok', REDDIT: 'Reddit', YOUTUBE: 'YouTube', PINTEREST: 'Pinterest', THREADS: 'Threads',
};

export default function PortalClientePage() {
  const params = useParams();
  const token = params.token as string;

  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [comentario, setComentario] = useState('');

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function load() {
    try {
      const res = await apiClient.getPortal(token);
      setData(res);
    } catch {
      setError('Este portal no existe o ha sido desactivado.');
    } finally {
      setLoading(false);
    }
  }

  async function review(postId: string, decision: 'approve' | 'reject', comment?: string) {
    setReviewing(postId);
    try {
      await apiClient.reviewPortalPost(token, postId, decision, comment);
      setRejectingId(null);
      setComentario('');
      await load();
    } catch (err) {
      alert('Error: ' + (err as Error).message);
    } finally {
      setReviewing(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-400">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Cargando tu portal...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-400 px-4 text-center">
        <div>
          <XCircle className="w-10 h-10 mx-auto mb-3 text-red-400" />
          {error || 'Portal no disponible'}
        </div>
      </div>
    );
  }

  const color = data.brand.colorPrimario || '#6366F1';

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header con branding del cliente */}
      <div className="border-b border-gray-800" style={{ background: `linear-gradient(135deg, ${color}22, transparent)` }}>
        <div className="max-w-4xl mx-auto px-4 py-8 flex items-center gap-4">
          {data.brand.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.brand.logoUrl} alt={data.brand.nombre} className="w-14 h-14 rounded-2xl object-cover border border-gray-800" />
          ) : (
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-extrabold" style={{ backgroundColor: color }}>
              {data.brand.nombre.charAt(0)}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-extrabold">{data.brand.nombre}</h1>
            <p className="text-sm text-gray-400">Tu sala de cristal — esto es lo que estamos haciendo por ti</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* KPIs 30 días */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Kpi label="Publicaciones (30d)" value={data.stats.publicados30d} icon={Send} color={color} />
          <Kpi label="Alcance" value={formatNum(data.stats.reach || data.stats.impressions)} icon={Eye} color={color} />
          <Kpi label="Interacciones" value={formatNum(data.stats.interacciones)} icon={Heart} color={color} />
          <Kpi label="Clicks" value={formatNum(data.stats.clicks)} icon={MousePointerClick} color={color} />
        </div>

        {/* Pendiente de tu aprobación */}
        {data.pendientes.length > 0 && (
          <section>
            <SectionTitle icon={Sparkles} color={color}>
              Pendiente de tu aprobación <span className="text-amber-400">({data.pendientes.length})</span>
            </SectionTitle>
            <div className="space-y-3">
              {data.pendientes.map((p) => (
                <div key={p.id} className="bg-gray-900 border border-amber-500/30 rounded-2xl p-5">
                  <PostHeader post={p} />
                  <p className="text-sm text-gray-200 mt-3 whitespace-pre-wrap">{p.content}</p>
                  {p.hashtags.length > 0 && (
                    <p className="text-xs text-indigo-300 mt-2">{p.hashtags.map((h) => (h.startsWith('#') ? h : `#${h}`)).join(' ')}</p>
                  )}
                  {p.scheduledAt && (
                    <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Saldría el {new Date(p.scheduledAt).toLocaleString('es-ES', { day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}

                  {rejectingId === p.id ? (
                    <div className="mt-4 space-y-2">
                      <textarea
                        value={comentario}
                        onChange={(e) => setComentario(e.target.value)}
                        placeholder="¿Qué cambiarías? (opcional)"
                        rows={2}
                        className="w-full px-3 py-2 rounded-xl bg-gray-950 border border-gray-800 text-sm focus:border-red-400 focus:outline-none placeholder:text-gray-600"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => review(p.id, 'reject', comentario)}
                          disabled={reviewing === p.id}
                          className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-sm font-bold disabled:opacity-50"
                        >
                          {reviewing === p.id ? 'Enviando...' : 'Confirmar cambios solicitados'}
                        </button>
                        <button
                          onClick={() => { setRejectingId(null); setComentario(''); }}
                          className="px-4 py-2 rounded-xl border border-gray-800 text-sm text-gray-400 hover:bg-gray-800"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() => review(p.id, 'approve')}
                        disabled={reviewing === p.id}
                        className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {reviewing === p.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <ThumbsUp className="w-4 h-4" />}
                        Aprobar
                      </button>
                      <button
                        onClick={() => setRejectingId(p.id)}
                        disabled={reviewing === p.id}
                        className="flex-1 py-2.5 rounded-xl border border-gray-700 hover:border-red-400/50 hover:bg-red-500/10 text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2 text-gray-300"
                      >
                        <ThumbsDown className="w-4 h-4" /> Pedir cambios
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Próximas publicaciones */}
        <section>
          <SectionTitle icon={Calendar} color={color}>Próximas publicaciones</SectionTitle>
          {data.proximos.length === 0 ? (
            <EmptyMsg>No hay publicaciones programadas ahora mismo.</EmptyMsg>
          ) : (
            <div className="space-y-2">
              {data.proximos.map((p) => (
                <div key={p.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <PostHeader post={p} small />
                    <p className="text-sm text-gray-300 mt-1.5 line-clamp-2">{p.content}</p>
                  </div>
                  <span className="flex-shrink-0 text-xs text-gray-400 flex items-center gap-1 mt-1">
                    <Clock className="w-3 h-3" />
                    {p.scheduledAt && new Date(p.scheduledAt).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Último contenido publicado */}
        <section>
          <SectionTitle icon={TrendingUp} color={color}>Publicado recientemente</SectionTitle>
          {data.publicados.length === 0 ? (
            <EmptyMsg>Aún no hay contenido publicado.</EmptyMsg>
          ) : (
            <div className="space-y-2">
              {data.publicados.map((p) => (
                <div key={p.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <PostHeader post={p} small />
                      <p className="text-sm text-gray-300 mt-1.5 line-clamp-2">{p.content}</p>
                    </div>
                    {p.externalUrl && (
                      <a href={p.externalUrl} target="_blank" rel="noopener noreferrer" className="flex-shrink-0 p-2 rounded-lg hover:bg-gray-800 text-gray-400">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-3 mt-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {formatNum(p.metrics.impressions)}</span>
                    <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> {formatNum(p.metrics.likes)}</span>
                    <span className="flex items-center gap-1"><MousePointerClick className="w-3 h-3" /> {formatNum(p.metrics.clicks)}</span>
                    {p.publishedAt && (
                      <span className="ml-auto">{new Date(p.publishedAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <p className="text-center text-xs text-gray-700 pt-4">Powered by peluguau.com</p>
      </div>
    </div>
  );
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function Kpi({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: any; color: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">{label}</span>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <div className="text-2xl font-extrabold mt-1.5">{value}</div>
    </div>
  );
}

function SectionTitle({ children, icon: Icon, color }: { children: React.ReactNode; icon: any; color: string }) {
  return (
    <h2 className="font-bold flex items-center gap-2 mb-3">
      <Icon className="w-4 h-4" style={{ color }} /> {children}
    </h2>
  );
}

function PostHeader({ post, small }: { post: PortalPost; small?: boolean }) {
  return (
    <div className={`flex items-center gap-2 ${small ? 'text-xs' : 'text-sm'}`}>
      <span className="px-2 py-0.5 rounded-md bg-gray-800 text-gray-300 font-medium">
        {PLATFORM_LABEL[post.account.platform] || post.account.platform}
      </span>
      <span className="text-gray-500 truncate">{post.account.nombre}</span>
      {post.formato && <span className="text-gray-600">· {post.formato}</span>}
    </div>
  );
}

function EmptyMsg({ children }: { children: React.ReactNode }) {
  return <div className="text-center py-8 text-gray-600 text-sm bg-gray-900/50 border border-gray-800/50 rounded-xl">{children}</div>;
}
