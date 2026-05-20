'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Layers,
  Bell,
  BarChart3,
  Sparkles,
  LogOut,
  ChevronLeft,
  ChevronDown,
  Calendar,
  Users,
  Phone,
  Mail,
  MessageCircle,
  Search,
  PanelLeftOpen,
  Globe,
  Gift,
  Lightbulb,
  FileText,
  Swords,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useCommandPalette } from './CommandPalette';
import { useEffect, useRef, useState, type ComponentType } from 'react';

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  exact?: boolean;
  badge?: number | true;
  tag?: 'new' | 'beta';
};

type NavGroup = { title: string; items: NavItem[] };

const navGroups: NavGroup[] = [
  {
    title: 'Principal',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, exact: true },
      { href: '/dashboard/tareas', label: 'Tareas', icon: Swords, tag: 'new' },
    ],
  },
  {
    title: 'Operaciones',
    items: [
      { href: '/dashboard/leads', label: 'Leads', icon: Users },
      { href: '/dashboard/llamadas', label: 'Llamadas', icon: Phone },
      { href: '/dashboard/email', label: 'Email', icon: Mail },
      { href: '/dashboard/whatsapp', label: 'WhatsApp', icon: MessageCircle, tag: 'new' },
      { href: '/dashboard/calendario', label: 'Calendario', icon: Calendar },
      { href: '/dashboard/propuestas', label: 'Propuestas', icon: FileText, tag: 'new' },
      { href: '/dashboard/softwares', label: 'Softwares', icon: Layers },
    ],
  },
  {
    title: 'Marketing',
    items: [
      { href: '/dashboard/landings', label: 'Landings', icon: Globe, tag: 'new' },
      { href: '/dashboard/free-values', label: 'Free Values', icon: Gift, tag: 'new' },
    ],
  },
  {
    title: 'Análisis',
    items: [
      { href: '/dashboard/metricas', label: 'Métricas', icon: BarChart3 },
      { href: '/dashboard/eventos', label: 'Eventos', icon: Bell, badge: true },
    ],
  },
  {
    title: 'Herramientas',
    items: [
      { href: '/dashboard/ia', label: 'Asistente IA', icon: Sparkles, tag: 'new' },
      { href: '/dashboard/ia/propuestas', label: 'Propuestas IA', icon: Lightbulb, tag: 'new' },
    ],
  },
];

interface SidebarProps {
  /** When true, the sidebar slides off-screen and a floating expand button appears. */
  collapsed?: boolean;
  onToggle?: () => void;
}

export default function Sidebar({ collapsed: controlledCollapsed, onToggle }: SidebarProps = {}) {
  const pathname = usePathname();
  const { logout, user } = useAuth();
  const { open: openCommandPalette } = useCommandPalette();
  const [internalCollapsed, setInternalCollapsed] = useState(false);

  const hidden = controlledCollapsed ?? internalCollapsed;
  const toggle = onToggle ? () => onToggle() : () => setInternalCollapsed((p) => !p);

  const isItemActive = (item: NavItem) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem('sidebar:collapsedGroups');
      if (raw) setCollapsedGroups(JSON.parse(raw));
    } catch {}
  }, []);

  const toggleGroup = (title: string) => {
    setCollapsedGroups((prev) => {
      const next = { ...prev, [title]: !prev[title] };
      try {
        localStorage.setItem('sidebar:collapsedGroups', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const workspaceLabel = user?.email?.split('@')[1]?.split('.')[0] ?? 'workspace';

  // Refs + state for sliding pill and cursor glow
  const asideRef = useRef<HTMLElement | null>(null);
  const navRef = useRef<HTMLElement | null>(null);
  const [pillStyle, setPillStyle] = useState<{ top: number; height: number } | null>(null);

  const handleCursorMove = (e: React.MouseEvent<HTMLElement>) => {
    const el = asideRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--cursor-x', `${e.clientX - r.left}px`);
    el.style.setProperty('--cursor-y', `${e.clientY - r.top}px`);
  };
  const handleCursorLeave = () => {
    const el = asideRef.current;
    if (!el) return;
    el.style.setProperty('--cursor-x', '-300px');
    el.style.setProperty('--cursor-y', '-300px');
  };

  useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    const measure = () => {
      const active = el.querySelector<HTMLElement>('[data-active="true"]');
      if (!active) {
        setPillStyle(null);
        return;
      }
      const navRect = el.getBoundingClientRect();
      const itemRect = active.getBoundingClientRect();
      setPillStyle({
        top: itemRect.top - navRect.top + el.scrollTop,
        height: itemRect.height,
      });
    };
    const raf = requestAnimationFrame(measure);
    window.addEventListener('resize', measure);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', measure);
    };
  }, [pathname, collapsedGroups]);

  return (
    <>
      {/* ===== Floating expand button — only visible when sidebar is hidden ===== */}
      <button
        type="button"
        onClick={toggle}
        aria-label="Mostrar menú"
        title="Mostrar menú"
        style={{ transitionDelay: hidden ? '180ms' : '0ms' }}
        className={cn(
          'ease-luxe group fixed top-4 left-4 z-[51] w-10 h-10 rounded-xl bg-[var(--bg-secondary)]/90 backdrop-blur border border-[var(--border-primary)] flex items-center justify-center shadow-md hover:shadow-xl hover:border-blue-500/40 hover:scale-[1.06] active:scale-95 transition-[opacity,transform,box-shadow,border-color] duration-[380ms]',
          hidden
            ? 'opacity-100 translate-x-0 pointer-events-auto'
            : 'opacity-0 -translate-x-4 pointer-events-none',
        )}
      >
        <span className="pointer-events-none absolute -inset-1 rounded-2xl bg-gradient-to-br from-blue-500/30 via-violet-500/30 to-fuchsia-500/30 blur-lg opacity-0 group-hover:opacity-60 transition-opacity duration-500" />
        <PanelLeftOpen
          className="ease-luxe relative w-[18px] h-[18px] text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-[color,transform] duration-[420ms] group-hover:translate-x-0.5"
        />
      </button>

      {/* ===== Sidebar ===== */}
      <aside
        ref={asideRef}
        onMouseMove={handleCursorMove}
        onMouseLeave={handleCursorLeave}
        className={cn(
          'ease-luxe h-screen fixed top-0 left-0 w-[260px] border-r border-[var(--border-primary)] bg-[var(--bg-secondary)] flex flex-col transition-transform duration-[460ms] z-50',
          hidden && '-translate-x-full',
        )}
        aria-hidden={hidden}
      >
        {/* Ambient decoration (clipped) */}
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
          <div className="absolute top-0 left-0 right-0 h-px overflow-hidden">
            <div className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-violet-400/60 to-transparent sidebar-shimmer" />
          </div>
          <div className="absolute -bottom-32 -left-16 w-[260px] h-[260px] rounded-full bg-blue-500/[0.06] blur-3xl sidebar-blob-a" />
          <div className="absolute -top-20 -right-10 w-[180px] h-[180px] rounded-full bg-violet-500/[0.05] blur-3xl sidebar-blob-b" />
        </div>

        {/* Cursor-following ambient glow */}
        <div className="pointer-events-none absolute inset-0 z-0 sidebar-cursor-glow" aria-hidden="true" />

        {/* Content */}
        <div className="relative z-10 flex flex-col h-full">
          {/* ===== Logo ===== */}
          <div className="border-b border-[var(--border-primary)]/70 shrink-0 px-4 py-4">
            <Link href="/dashboard" className="flex items-center gap-3 group">
              <div className="relative w-10 h-10 shrink-0 sidebar-bob">
                <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-blue-500/30 via-violet-500/30 to-fuchsia-500/30 blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="ease-luxe relative w-10 h-10 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] flex items-center justify-center overflow-hidden group-hover:border-blue-500/40 transition-all duration-500 group-hover:scale-105 group-hover:rotate-[-3deg] group-active:scale-95">
                  <Image
                    src="/logo.png"
                    alt="CRM Maestro"
                    width={28}
                    height={28}
                    className="ease-luxe object-contain transition-transform duration-500 group-hover:scale-110"
                    priority
                  />
                </div>
              </div>
              <div className="overflow-hidden min-w-0 flex-1">
                <h1 className="text-[15px] font-semibold text-[var(--text-primary)] leading-none whitespace-nowrap tracking-tight">
                  CRM Maestro
                </h1>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-tertiary)]">
                    {workspaceLabel}
                  </span>
                  <span className="w-0.5 h-0.5 rounded-full bg-[var(--text-tertiary)] opacity-50" />
                  <span className="text-[10px] font-medium uppercase tracking-wider text-blue-500 dark:text-blue-400">
                    {user?.rol || 'user'}
                  </span>
                </div>
              </div>
            </Link>
          </div>

          {/* ===== Search (Ctrl+K) ===== */}
          <div className="px-4 pt-4 pb-2 shrink-0">
            <button
              type="button"
              onClick={openCommandPalette}
              className="ease-luxe relative w-full flex items-center gap-2.5 h-9 px-3 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[13px] text-[var(--text-tertiary)] hover:border-blue-500/40 hover:text-[var(--text-secondary)] hover:shadow-[0_0_0_3px_rgba(13,116,206,0.06)] hover:scale-[1.012] active:scale-[0.985] transition-[background-color,border-color,color,box-shadow,transform] duration-[280ms] group overflow-hidden"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/[0.04] to-violet-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <Search className="ease-luxe w-[15px] h-[15px] shrink-0 relative transition-transform duration-[420ms] group-hover:rotate-[-6deg]" />
              <span className="flex-1 text-left relative">Buscar...</span>
              <kbd className="relative flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[10px] font-medium text-[var(--text-tertiary)]">
                <span>Ctrl</span>
                <span>K</span>
              </kbd>
            </button>
          </div>

          {/* ===== Collapse pill button — hides the sidebar ===== */}
          <button
            type="button"
            onClick={toggle}
            className="ease-luxe absolute -right-3 top-[60px] w-6 h-6 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] flex items-center justify-center shadow-md hover:shadow-lg hover:bg-[var(--bg-tertiary)] hover:border-blue-500/40 hover:scale-110 active:scale-90 transition-all duration-[320ms] group z-20"
            title="Ocultar menú"
            aria-label="Ocultar menú"
          >
            <ChevronLeft className="ease-luxe w-3.5 h-3.5 text-[var(--text-tertiary)] group-hover:text-[var(--text-primary)] transition-all duration-[520ms]" />
          </button>

          {/* ===== Navigation ===== */}
          <nav ref={navRef} className="relative flex-1 px-3 py-3 overflow-y-auto overflow-x-hidden">
            {/* Sliding pill — spring physics */}
            {pillStyle && (
              <div
                className="ease-spring pointer-events-none absolute left-3 right-3 z-0 transition-[top,height] duration-[700ms]"
                style={{ top: pillStyle.top, height: pillStyle.height }}
                aria-hidden="true"
              >
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/[0.10] via-violet-500/[0.06] to-transparent sidebar-pulse-glow" />
                <span className="absolute -left-3 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-gradient-to-b from-blue-500 via-violet-500 to-fuchsia-500 shadow-[0_0_8px_rgba(13,116,206,0.55)]" />
              </div>
            )}

            {(() => {
              let animIdx = 0;
              return navGroups.map((group, gi) => {
                const isCollapsed = !!collapsedGroups[group.title];
                return (
                <div key={group.title} className={cn('relative space-y-0.5', gi > 0 && 'mt-5')}>
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.title)}
                    aria-expanded={!isCollapsed}
                    className="ease-luxe w-full flex items-center gap-2 px-3 mb-2 sidebar-item-enter group/title hover:opacity-100 transition-opacity duration-300"
                    style={{ animationDelay: `${gi * 60}ms` }}
                  >
                    <span className="w-1 h-1 rounded-full bg-gradient-to-r from-blue-500 to-violet-500 opacity-60" />
                    <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-tertiary)] group-hover/title:text-[var(--text-secondary)] transition-colors">
                      {group.title}
                    </p>
                    <span className="flex-1 h-px bg-gradient-to-r from-[var(--border-primary)] to-transparent" />
                    <ChevronDown
                      className={cn(
                        'ease-luxe w-3 h-3 text-[var(--text-tertiary)] group-hover/title:text-[var(--text-secondary)] transition-transform duration-[320ms]',
                        isCollapsed && '-rotate-90',
                      )}
                    />
                  </button>
                  <div
                    className={cn(
                      'grid transition-[grid-template-rows,opacity] duration-[360ms] ease-out',
                      isCollapsed ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100',
                    )}
                  >
                    <div className="overflow-hidden space-y-0.5">
                  {group.items.map((item) => {
                    const isActive = isItemActive(item);
                    const Icon = item.icon;
                    const myAnimIdx = animIdx++;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        data-active={isActive ? 'true' : undefined}
                        style={{ animationDelay: `${60 + myAnimIdx * 35}ms` }}
                        className={cn(
                          'sidebar-item-enter sidebar-hover-grace group relative z-10 flex items-center gap-3 h-10 px-2.5 rounded-xl text-[13.5px] font-medium',
                          isActive
                            ? 'text-[var(--text-primary)]'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]',
                        )}
                      >
                        {/* Icon tile */}
                        <span
                          className={cn(
                            'relative shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-500 overflow-hidden',
                            isActive
                              ? 'bg-gradient-to-br from-blue-500/20 via-violet-500/15 to-fuchsia-500/10 ring-1 ring-blue-500/30'
                              : 'group-hover:bg-[var(--bg-tertiary)] group-hover:ring-1 group-hover:ring-[var(--border-primary)]',
                          )}
                        >
                          <span
                            className={cn(
                              'absolute inset-0 bg-gradient-to-br from-blue-500/0 via-violet-500/0 to-fuchsia-500/0 group-hover:from-blue-500/10 group-hover:via-violet-500/8 group-hover:to-fuchsia-500/5 transition-all duration-500',
                              isActive && 'opacity-0',
                            )}
                          />
                          <Icon
                            className={cn(
                              'ease-luxe relative w-[17px] h-[17px] transition-[transform,color,filter] duration-[500ms] group-hover:scale-[1.08] group-hover:rotate-[-2deg] group-active:scale-95 group-active:rotate-0',
                              isActive
                                ? 'text-blue-600 dark:text-blue-400 drop-shadow-[0_0_4px_rgba(59,130,246,0.4)]'
                                : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]',
                            )}
                          />
                        </span>

                        {/* Label */}
                        <span className="whitespace-nowrap overflow-hidden flex-1 flex items-center gap-2">
                          <span className="transition-transform duration-300 ease-out group-hover:translate-x-0.5">
                            {item.label}
                          </span>
                          {item.tag === 'new' && (
                            <span className="inline-flex items-center px-1.5 h-[15px] rounded-md bg-gradient-to-r from-amber-400/15 to-orange-500/15 border border-amber-500/30 text-[9px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                              Nuevo
                            </span>
                          )}
                          {item.tag === 'beta' && (
                            <span className="inline-flex items-center px-1.5 h-[15px] rounded-md bg-violet-500/15 border border-violet-500/30 text-[9px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">
                              Beta
                            </span>
                          )}
                        </span>
                        {item.badge &&
                          (typeof item.badge === 'number' ? (
                            <span className="ml-auto inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold tabular-nums">
                              {item.badge}
                            </span>
                          ) : (
                            <span className="relative ml-auto flex w-2 h-2">
                              <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-60 animate-ping" />
                              <span className="relative inline-flex w-2 h-2 rounded-full bg-red-500" />
                            </span>
                          ))}
                      </Link>
                    );
                  })}
                    </div>
                  </div>
                </div>
                );
              });
            })()}
          </nav>

          {/* ===== Footer ===== */}
          <div className="shrink-0 border-t border-[var(--border-primary)]/70 p-3 space-y-2 backdrop-blur-sm">
            {/* Logout */}
            <button
              type="button"
              onClick={logout}
              className="sidebar-hover-grace group relative w-full flex items-center gap-3 h-10 px-2.5 rounded-xl text-[13.5px] font-medium text-red-600 dark:text-red-400 hover:bg-gradient-to-r hover:from-red-500/[0.08] hover:to-red-500/[0.03] dark:hover:from-red-950/40 dark:hover:to-red-950/10 overflow-hidden"
            >
              <span className="ease-luxe shrink-0 w-7 h-7 rounded-lg flex items-center justify-center group-hover:bg-red-500/10 dark:group-hover:bg-red-500/15 transition-colors duration-[280ms]">
                <LogOut className="ease-luxe w-[17px] h-[17px] transition-transform duration-[420ms] group-hover:-translate-x-1 group-hover:scale-[1.06] group-active:scale-95" />
              </span>
              <span className="relative">Cerrar sesión</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
