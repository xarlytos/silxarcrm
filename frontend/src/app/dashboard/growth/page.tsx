'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import {
  TrendingUp,
  Users,
  Share2,
  FileText,
  Video,
  Gift,
  ShoppingBag,
  BarChart3,
  Zap,
  Calendar,
  Plus,
  Flame,
  Activity,
  Rocket,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Sparkles,
  Target,
  Skull,
  Radar as RadarIcon,
  Library,
  ClipboardCheck,
  Trophy,
} from 'lucide-react';
import Link from 'next/link';

interface GrowthStats {
  totalContent: number;
  publishedContent: number;
  scheduledContent: number;
  totalLeads: number;
  socialLeads: number;
  seoLeads: number;
  referralLeads: number;
  marketplaceOpportunities: number;
  referralsActive: number;
}

export default function GrowthDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<GrowthStats | null>(null);
  const [activationStats, setActivationStats] = useState<any>(null);
  const [resurrectionStats, setResurrectionStats] = useState<any>(null);
  const [radarSummary, setRadarSummary] = useState<any>(null);
  const [auditStats, setAuditStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [softwareId, setSoftwareId] = useState('');
  const [softwares, setSoftwares] = useState<Array<{ id: string; nombre: string }>>([]);
  const [animatedValues, setAnimatedValues] = useState<Record<string, number>>({});

  useEffect(() => {
    loadSoftwares();
  }, []);

  useEffect(() => {
    if (softwareId) {
      loadStats();
    }
  }, [softwareId]);

  useEffect(() => {
    if (!stats || loading) return;
    const targets: Record<string, number> = {
      totalLeads: stats.totalLeads,
      executed: activationStats?.executed || 0,
      published: stats.publishedContent,
      hot: activationStats?.byCategory?.hot || 0,
    };

    const duration = 800;
    const steps = 30;
    const stepDuration = duration / steps;

    let step = 0;
    const interval = setInterval(() => {
      step++;
      const progress = step / steps;
      const eased = 1 - Math.pow(1 - progress, 3);

      const next: Record<string, number> = {};
      Object.entries(targets).forEach(([key, target]) => {
        next[key] = Math.round(target * eased);
      });
      setAnimatedValues(next);

      if (step >= steps) clearInterval(interval);
    }, stepDuration);

    return () => clearInterval(interval);
  }, [stats, activationStats, loading]);

  async function loadSoftwares() {
    try {
      const res = await apiClient.getSoftwares();
      const list = res?.data || [];
      setSoftwares(list);
      if (list.length > 0) {
        setSoftwareId(list[0].id);
      } else {
        setLoading(false);
      }
    } catch {
      setLoading(false);
    }
  }

  async function loadStats() {
    setLoading(true);
    try {
      const [content, leads, opportunities, referrals, metrics, actStats] = await Promise.all([
        apiClient.getGrowthContent({ softwareId, limit: '1' }).catch(() => ({ total: 0 })),
        apiClient.getLeads({ softwareId, limit: '1' }).catch(() => ({ total: 0 })),
        apiClient.getMarketplaceOpportunities({ softwareId }).catch(() => []),
        apiClient.getGrowthReferrals(softwareId).catch(() => ({ totalReferrals: 0 })),
        apiClient.getGrowthMetrics({ softwareId, startDate: get30DaysAgo() }).catch(() => ({
          totals: { leads: 0, socialLeads: 0, seoLeads: 0, referralLeads: 0 },
        })),
        apiClient.getActivationStats(softwareId, 30).catch(() => null),
      ]);

      apiClient.getResurrectionStats(softwareId).then(setResurrectionStats).catch(() => setResurrectionStats(null));
      apiClient.getRadar(softwareId).then(setRadarSummary).catch(() => setRadarSummary(null));
      apiClient.getAudits(softwareId, 1).then(setAuditStats).catch(() => setAuditStats(null));

      const contentData = await apiClient.getGrowthContent({ softwareId, limit: '1000' }).catch(() => ({ content: [], total: 0 }));
      const published = contentData.content?.filter((c: any) => c.status === 'PUBLISHED').length || 0;
      const scheduled = contentData.content?.filter((c: any) => c.status === 'SCHEDULED').length || 0;

      setStats({
        totalContent: contentData.total || 0,
        publishedContent: published,
        scheduledContent: scheduled,
        totalLeads: metrics?.totals?.leads || 0,
        socialLeads: metrics?.totals?.socialLeads || 0,
        seoLeads: metrics?.totals?.seoLeads || 0,
        referralLeads: metrics?.totals?.referralLeads || 0,
        marketplaceOpportunities: opportunities.length || 0,
        referralsActive: referrals?.totalReferrals || 0,
      });
      setActivationStats(actStats);
    } catch {
      setStats({
        totalContent: 0,
        publishedContent: 0,
        scheduledContent: 0,
        totalLeads: 0,
        socialLeads: 0,
        seoLeads: 0,
        referralLeads: 0,
        marketplaceOpportunities: 0,
        referralsActive: 0,
      });
      setActivationStats(null);
    } finally {
      setLoading(false);
    }
  }

  function get30DaysAgo() {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  }

  const modules = [
    {
      title: 'Social Posts',
      description: 'Crea posts para Instagram, LinkedIn, X, TikTok y mas',
      icon: Share2,
      href: '/dashboard/growth/social-posts',
      gradient: 'from-pink-500 to-rose-400',
      bgGlow: 'group-hover:shadow-pink-500/20',
      borderGlow: 'group-hover:border-pink-400/50',
      stat: stats?.totalContent || 0,
      statLabel: 'piezas generadas',
    },
    {
      title: 'Brands',
      description: 'Gestiona clientes: cuentas, guidelines y voz de marca',
      icon: Users,
      href: '/dashboard/growth/brands',
      gradient: 'from-indigo-500 to-blue-400',
      bgGlow: 'group-hover:shadow-indigo-500/20',
      borderGlow: 'group-hover:border-indigo-400/50',
      stat: 0,
      statLabel: 'clientes',
    },
    {
      title: 'Campañas',
      description: 'Planifica campañas con objetivos, brief y KPIs',
      icon: Target,
      href: '/dashboard/growth/campanas',
      gradient: 'from-fuchsia-500 to-pink-400',
      bgGlow: 'group-hover:shadow-fuchsia-500/20',
      borderGlow: 'group-hover:border-fuchsia-400/50',
      stat: 0,
      statLabel: 'campañas',
    },
    {
      title: 'Biblioteca',
      description: 'Media y copys reutilizables con tags y búsqueda',
      icon: Library,
      href: '/dashboard/growth/biblioteca',
      gradient: 'from-teal-500 to-cyan-400',
      bgGlow: 'group-hover:shadow-teal-500/20',
      borderGlow: 'group-hover:border-teal-400/50',
      stat: 0,
      statLabel: 'recursos',
    },
    {
      title: 'SEO Engine',
      description: 'Articulos, FAQs y comparativas',
      icon: FileText,
      href: '/dashboard/growth/content',
      gradient: 'from-emerald-500 to-teal-400',
      bgGlow: 'group-hover:shadow-emerald-500/20',
      borderGlow: 'group-hover:border-emerald-400/50',
      stat: stats?.seoLeads || 0,
      statLabel: 'leads organicos',
    },
    {
      title: 'Video Engine',
      description: 'Guiones IA + voz + storyboard',
      icon: Video,
      href: '/dashboard/growth/video',
      gradient: 'from-red-500 to-orange-400',
      bgGlow: 'group-hover:shadow-red-500/20',
      borderGlow: 'group-hover:border-red-400/50',
      stat: 0,
      statLabel: 'videos generados',
    },
    {
      title: 'Referidos',
      description: 'Programa de referidos automatico',
      icon: Gift,
      href: '/dashboard/growth/referrals',
      gradient: 'from-violet-500 to-purple-400',
      bgGlow: 'group-hover:shadow-violet-500/20',
      borderGlow: 'group-hover:border-violet-400/50',
      stat: stats?.referralsActive || 0,
      statLabel: 'referidos activos',
    },
    {
      title: 'Marketplaces',
      description: 'Oportunidades en Shopify, G2, etc.',
      icon: ShoppingBag,
      href: '/dashboard/growth/marketplaces',
      gradient: 'from-amber-500 to-orange-400',
      bgGlow: 'group-hover:shadow-amber-500/20',
      borderGlow: 'group-hover:border-amber-400/50',
      stat: stats?.marketplaceOpportunities || 0,
      statLabel: 'oportunidades',
    },
    {
      title: 'Radar de leads',
      description: 'Rastrea negocios que encajan con tu ICP cada noche',
      icon: RadarIcon,
      href: '/dashboard/growth/radar',
      gradient: 'from-cyan-500 to-teal-400',
      bgGlow: 'group-hover:shadow-cyan-500/20',
      borderGlow: 'group-hover:border-cyan-400/50',
      stat: radarSummary?.totalLeads || 0,
      statLabel: 'leads captados',
    },
    {
      title: 'Auditoria gratis',
      description: 'Lead magnet: informe automatico a cambio del contacto',
      icon: ClipboardCheck,
      href: '/dashboard/growth/auditorias',
      gradient: 'from-indigo-500 to-violet-400',
      bgGlow: 'group-hover:shadow-indigo-500/20',
      borderGlow: 'group-hover:border-indigo-400/50',
      stat: auditStats?.conLead || 0,
      statLabel: 'leads captados',
    },
    {
      title: 'Casos de exito',
      description: 'Cada conversion se convierte en prueba social automatica',
      icon: Trophy,
      href: '/dashboard/growth/casos-exito',
      gradient: 'from-amber-500 to-yellow-400',
      bgGlow: 'group-hover:shadow-amber-500/20',
      borderGlow: 'group-hover:border-amber-400/50',
      stat: 0,
      statLabel: 'casos generados',
    },
    {
      title: 'Activacion',
      description: 'Loop de Oro: califica con IA y activa automaticamente',
      icon: Zap,
      href: '/dashboard/growth/activation',
      gradient: 'from-yellow-500 to-amber-400',
      bgGlow: 'group-hover:shadow-yellow-500/20',
      borderGlow: 'group-hover:border-yellow-400/50',
      stat: activationStats?.executed || 0,
      statLabel: 'acciones ejecutadas',
    },
    {
      title: 'Resurreccion masiva',
      description: 'Reactiva el cementerio de leads en un click',
      icon: Skull,
      href: '/dashboard/growth/resurreccion',
      gradient: 'from-fuchsia-500 to-purple-500',
      bgGlow: 'group-hover:shadow-fuchsia-500/20',
      borderGlow: 'group-hover:border-fuchsia-400/50',
      stat: resurrectionStats?.revived || 0,
      statLabel: 'vueltos a la vida',
    },
    {
      title: 'Analytics',
      description: 'Metricas del embudo de adquisicion',
      icon: BarChart3,
      href: '/dashboard/growth/analytics',
      gradient: 'from-cyan-500 to-sky-400',
      bgGlow: 'group-hover:shadow-cyan-500/20',
      borderGlow: 'group-hover:border-cyan-400/50',
      stat: stats?.totalLeads || 0,
      statLabel: 'leads totales',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl border bg-card p-6 sm:p-8">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 pointer-events-none" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                Motor Activo
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
              Growth Engine
            </h1>
            <p className="text-muted-foreground mt-2 max-w-xl">
              Motor de adquisicion autonoma. Genera contenido, atrae leads y activalos automaticamente.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <select
              value={softwareId}
              onChange={(e) => setSoftwareId(e.target.value)}
              className="px-4 py-2.5 rounded-xl border bg-card text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow"
            >
              {softwares.map((s) => (
                <option key={s.id} value={s.id}>{s.nombre}</option>
              ))}
            </select>
            <Link
              href="/dashboard/growth/config"
              className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-primary/20"
            >
              Configurar
            </Link>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Leads totales"
          value={animatedValues.totalLeads ?? 0}
          rawValue={stats?.totalLeads || 0}
          icon={Users}
          trend="+12%"
          trendDir="up"
          loading={loading}
          color="from-blue-500 to-indigo-500"
        />
        <KpiCard
          title="Activaciones"
          value={animatedValues.executed ?? 0}
          rawValue={activationStats?.executed || 0}
          icon={Activity}
          trend={`${activationStats?.successRate || 0}% exito`}
          trendDir="up"
          loading={loading}
          color="from-violet-500 to-purple-500"
        />
        <KpiCard
          title="Contenido publicado"
          value={animatedValues.published ?? 0}
          rawValue={stats?.publishedContent || 0}
          icon={TrendingUp}
          trend="+8%"
          trendDir="up"
          loading={loading}
          color="from-emerald-500 to-teal-500"
        />
        <KpiCard
          title="Leads HOT"
          value={animatedValues.hot ?? 0}
          rawValue={activationStats?.byCategory?.hot || 0}
          icon={Flame}
          trend="Prioritarios"
          trendDir="neutral"
          loading={loading}
          color="from-orange-500 to-red-500"
        />
      </div>

      {/* Modulos */}
      <div>
        <div className="flex items-center gap-3 mb-5">
          <Sparkles className="w-5 h-5 text-primary" />
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Modulos</h2>
          <div className="flex-1 h-px bg-gradient-to-r from-border to-transparent" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map((module) => (
            <Link
              key={module.title}
              href={module.href}
              className={`group relative p-6 rounded-2xl border bg-card transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${module.bgGlow} ${module.borderGlow} overflow-hidden`}
            >
              {/* Glow effect */}
              <div className={`absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br ${module.gradient} opacity-0 group-hover:opacity-10 rounded-full blur-2xl transition-opacity duration-500`} />

              <div className="relative flex items-start justify-between">
                <div className={`p-3 rounded-2xl bg-gradient-to-br ${module.gradient} shadow-lg`}>
                  <module.icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex items-center gap-1 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                  <span className="text-xs font-semibold">Abrir</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
              <h3 className="relative mt-4 text-lg font-bold">{module.title}</h3>
              <p className="relative text-sm text-muted-foreground mt-1 leading-relaxed">
                {module.description}
              </p>
              <div className="relative mt-4 flex items-center gap-2.5 pt-4 border-t border-border/60">
                <span className="text-2xl font-extrabold tabular-nums tracking-tight">
                  {module.stat}
                </span>
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                  {module.statLabel}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="relative overflow-hidden rounded-2xl border bg-card p-6">
        <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-primary/5 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-5">
            <Target className="w-5 h-5 text-primary" />
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Acciones rapidas</h3>
            <div className="flex-1 h-px bg-gradient-to-r from-border to-transparent" />
          </div>
          <div className="flex flex-wrap gap-3">
            <QuickActionButton
              onClick={() => router.push('/dashboard/growth/generar')}
              icon={Plus}
              label="Generar contenido"
              gradient="from-primary to-primary/80"
            />
            <QuickActionButton
              onClick={() => router.push('/dashboard/growth/calendar')}
              icon={Calendar}
              label="Ver calendario"
              variant="secondary"
            />
            <QuickActionButton
              onClick={() => router.push('/dashboard/growth/analytics')}
              icon={BarChart3}
              label="Ver metricas"
              variant="secondary"
            />
            <QuickActionButton
              onClick={() => router.push('/dashboard/growth/activation')}
              icon={Zap}
              label="Activar leads"
              variant="secondary"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  title,
  value,
  rawValue,
  icon: Icon,
  trend,
  trendDir,
  loading,
  color,
}: {
  title: string;
  value: number;
  rawValue: number;
  icon: any;
  trend: string;
  trendDir: 'up' | 'down' | 'neutral';
  loading: boolean;
  color: string;
}) {
  const TrendIcon = trendDir === 'up' ? ArrowUpRight : trendDir === 'down' ? ArrowDownRight : Minus;
  const trendColor = trendDir === 'up' ? 'text-emerald-500' : trendDir === 'down' ? 'text-red-500' : 'text-amber-500';

  return (
    <div className="relative overflow-hidden p-5 rounded-2xl border bg-card hover:border-primary/20 transition-all duration-300 group">
      <div className={`absolute -top-6 -right-6 w-24 h-24 bg-gradient-to-br ${color} opacity-0 group-hover:opacity-10 rounded-full blur-2xl transition-opacity duration-500`} />
      <div className="relative">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-muted-foreground">{title}</span>
          <div className={`p-2 rounded-xl bg-gradient-to-br ${color} shadow-md`}>
            <Icon className="w-4 h-4 text-white" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-3">
          <span className="text-3xl font-extrabold tabular-nums tracking-tight">
            {loading ? '—' : value}
          </span>
          {!loading && (
            <span className={`inline-flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-full bg-muted ${trendColor}`}>
              <TrendIcon className="w-3 h-3" />
              {trend}
            </span>
          )}
        </div>
        {!loading && rawValue > 0 && (
          <div className="mt-2 h-1.5 w-full bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-1000 ease-out`}
              style={{ width: `${Math.min((rawValue / Math.max(rawValue * 1.3, 10)) * 100, 100)}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function QuickActionButton({
  onClick,
  icon: Icon,
  label,
  variant = 'primary',
  gradient,
}: {
  onClick: () => void;
  icon: any;
  label: string;
  variant?: 'primary' | 'secondary';
  gradient?: string;
}) {
  if (variant === 'primary') {
    return (
      <button
        onClick={onClick}
        className={`flex items-center gap-2.5 px-5 py-3 rounded-xl bg-gradient-to-r ${gradient || 'from-primary to-primary/80'} text-primary-foreground text-sm font-bold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 transition-all duration-300`}
      >
        <Icon className="w-4 h-4" />
        {label}
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2.5 px-5 py-3 rounded-xl border bg-card hover:bg-muted text-sm font-semibold transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}
