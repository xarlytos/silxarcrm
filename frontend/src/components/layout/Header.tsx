'use client';

import { useTheme } from '@/hooks/useTheme';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import {
  Search,
  Command,
  Sun,
  Moon,
  X,
  Menu,
  Users,
  Layers,
  BarChart3,
  Bell,
  ArrowRight,
  User,
  Settings,
  ChevronDown,
  Sparkles,
  CreditCard,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';

interface SearchResult {
  id: string;
  type: 'cliente' | 'software' | 'page';
  title: string;
  subtitle?: string;
  href: string;
}

interface HeaderProps {
  onMobileMenuClick?: () => void;
}

export default function Header({ onMobileMenuClick }: HeaderProps = {}) {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Get current page title
  const getCurrentPageTitle = () => {
    if (pathname === '/dashboard') return 'Dashboard';
    if (pathname.startsWith('/dashboard/softwares/')) return 'Detalle Software';
    if (pathname.startsWith('/dashboard/softwares')) return 'Softwares';
    if (pathname.startsWith('/dashboard/eventos')) return 'Eventos';
    if (pathname.startsWith('/dashboard/metricas')) return 'Métricas';
    if (pathname.startsWith('/dashboard/ia')) return 'Asistente IA';
    if (pathname.startsWith('/dashboard/clientes/')) return 'Detalle Cliente';
    return 'La Máquina del Dinero';
  };

  // Páginas disponibles para búsqueda - memoizado para evitar re-renders
  const pages = useMemo(() => [
    { id: 'page-dashboard', type: 'page' as const, title: 'Dashboard', subtitle: 'Vista general', href: '/dashboard' },
    { id: 'page-softwares', type: 'page' as const, title: 'Softwares', subtitle: 'SaaS conectados', href: '/dashboard/softwares' },
    { id: 'page-eventos', type: 'page' as const, title: 'Eventos', subtitle: 'Actividad en tiempo real', href: '/dashboard/eventos' },
    { id: 'page-metricas', type: 'page' as const, title: 'Métricas', subtitle: 'Análisis detallado', href: '/dashboard/metricas' },
    { id: 'page-ia', type: 'page' as const, title: 'Asistente IA', subtitle: 'Chat con inteligencia artificial', href: '/dashboard/ia' },
  ], []);

  // Buscar resultados
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults(pages);
      return;
    }

    setLoading(true);
    const lowerQuery = searchQuery.toLowerCase();

    try {
      const clientesRes = await apiClient.getClientes({ search: searchQuery });
      const clientes: SearchResult[] = (clientesRes.clientes || []).slice(0, 5).map((c: any) => ({
        id: `cliente-${c.id}`,
        type: 'cliente' as const,
        title: c.nombre,
        subtitle: c.email,
        href: `/dashboard/clientes/${c.id}`,
      }));

      const matchingPages = pages.filter(p =>
        p.title.toLowerCase().includes(lowerQuery) ||
        (p.subtitle && p.subtitle.toLowerCase().includes(lowerQuery))
      );

      setResults([...clientes, ...matchingPages]);
    } catch {
      const matchingPages = pages.filter(p =>
        p.title.toLowerCase().includes(lowerQuery) ||
        (p.subtitle && p.subtitle.toLowerCase().includes(lowerQuery))
      );
      setResults(matchingPages);
    } finally {
      setLoading(false);
    }
  }, [pages]);

  // Debounce para la búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query);
    }, 200);
    return () => clearTimeout(timer);
  }, [query, performSearch]);

  // Abrir búsqueda con Cmd+K o Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === 'Escape') {
        setSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Cargar eventos cuando se abre el dropdown de notificaciones
  useEffect(() => {
    if (notificationsOpen) {
      setEventsLoading(true);
      apiClient.getDashboard()
        .then((res) => {
          const recentEvents = res.data?.recentEvents || [];
          setEvents(recentEvents.slice(0, 5));
        })
        .catch(() => setEvents([]))
        .finally(() => setEventsLoading(false));
    }
  }, [notificationsOpen]);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus input cuando se abre
  useEffect(() => {
    if (searchOpen && inputRef.current) {
      inputRef.current.focus();
      setResults(pages);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [searchOpen, pages]);

  // Navegación con teclado
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = results[selectedIndex];
      if (selected) {
        router.push(selected.href);
        setSearchOpen(false);
      }
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'cliente': return <Users className="w-5 h-5" />;
      case 'software': return <Layers className="w-5 h-5" />;
      case 'page': return <BarChart3 className="w-5 h-5" />;
      default: return <Bell className="w-5 h-5" />;
    }
  };

  const getEventIconAndColor = (eventType: string) => {
    switch (eventType) {
      case 'pago_exitoso':
        return { icon: <CreditCard className="w-4 h-4" />, bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-600' };
      case 'nuevo_registro':
        return { icon: <Users className="w-4 h-4" />, bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600' };
      case 'upgrade_plan':
        return { icon: <TrendingUp className="w-4 h-4" />, bg: 'bg-violet-100 dark:bg-violet-900/30', text: 'text-violet-600' };
      case 'cancelacion':
        return { icon: <AlertCircle className="w-4 h-4" />, bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-600' };
      default:
        return { icon: <Sparkles className="w-4 h-4" />, bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-600' };
    }
  };

  const formatEventTitle = (eventType: string) => {
    return eventType?.replace(/_/g, ' ') || 'Evento';
  };

  return (
    <>
      <header className="h-14 sm:h-[72px] border-b border-[var(--border-primary)] bg-[var(--bg-secondary)] sticky top-0 z-40 flex items-center justify-between px-3 sm:px-6 gap-2">
        {/* Left - Hamburger (mobile) + Page Title */}
        <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1 sm:flex-initial">
          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={onMobileMenuClick}
            className="lg:hidden shrink-0 p-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-95"
            aria-label="Abrir menú"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="hidden sm:flex w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/10 to-purple-600/10 items-center justify-center shrink-0">
              <BarChart3 className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div className="min-w-0">
              <h1 className="text-[15px] sm:text-lg font-semibold text-[var(--text-primary)] truncate">{getCurrentPageTitle()}</h1>
              <p className="hidden sm:block text-xs text-[var(--text-tertiary)]">La Máquina del Dinero</p>
            </div>
          </div>
        </div>

        {/* Center - Search (desktop only) */}
        <div className="hidden md:block flex-1 max-w-md mx-4 lg:mx-8">
          <button
            onClick={() => setSearchOpen(true)}
            className="w-full flex items-center gap-3 px-4 py-2.5 bg-[var(--bg-tertiary)] hover:bg-[var(--surface-hover)] rounded-xl border border-[var(--border-primary)] transition-all duration-200 group"
          >
            <Search className="w-[18px] h-[18px] text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors" />
            <span className="text-sm text-[var(--text-tertiary)]">Buscar clientes, páginas...</span>
            <div className="ml-auto flex items-center gap-1 px-2 py-0.5 bg-[var(--bg-secondary)] rounded-md border border-[var(--border-primary)]">
              <Command className="w-3 h-3 text-[var(--text-secondary)]" />
              <span className="text-xs text-[var(--text-secondary)] font-medium">K</span>
            </div>
          </button>
        </div>

        {/* Right - Actions */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Search icon (mobile) */}
          <button
            onClick={() => setSearchOpen(true)}
            className="md:hidden p-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors text-[var(--text-secondary)]"
            aria-label="Buscar"
          >
            <Search className="w-5 h-5" />
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl hover:bg-[var(--bg-tertiary)] transition-all duration-200 border border-transparent hover:border-[var(--border-primary)]"
            aria-label={theme === 'light' ? 'Activar modo oscuro' : 'Activar modo claro'}
          >
            {theme === 'light' ? (
              <Moon className="w-5 h-5 sm:w-[20px] sm:h-[20px] text-[var(--text-secondary)]" />
            ) : (
              <Sun className="w-5 h-5 sm:w-[20px] sm:h-[20px] text-[var(--text-secondary)]" />
            )}
          </button>

          {/* Notifications */}
          <div className="relative" ref={notificationsRef}>
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="relative p-2 sm:p-2.5 rounded-lg sm:rounded-xl hover:bg-[var(--bg-tertiary)] transition-all duration-200 border border-transparent hover:border-[var(--border-primary)]"
            >
              <Bell className="w-5 h-5 sm:w-[20px] sm:h-[20px] text-[var(--text-secondary)]" />
              <span className="absolute top-1 right-1 sm:top-1.5 sm:right-1.5 w-2 h-2 rounded-full bg-red-500 border-2 border-[var(--bg-secondary)]" />
            </button>

            {/* Notifications Dropdown */}
            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-[calc(100vw-1.5rem)] max-w-[20rem] sm:w-80 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-primary)] shadow-xl z-50"
              onClick={(e) => e.stopPropagation()}
              >
                <div className="px-4 py-3 border-b border-[var(--border-primary)] flex items-center justify-between">
                  <h3 className="font-semibold text-[var(--text-primary)]">Notificaciones</h3>
                  <span className="text-xs text-[var(--text-tertiary)]">{events.length} eventos</span>
                </div>
                <div className="py-2 max-h-[320px] overflow-y-auto">
                  {eventsLoading ? (
                    <div className="px-4 py-8 text-center text-[var(--text-tertiary)]">
                      <div className="w-6 h-6 border-2 border-[var(--border-primary)] border-t-[var(--text-primary)] rounded-full animate-spin mx-auto" />
                    </div>
                  ) : events.length > 0 ? (
                    events.map((event) => {
                      const { icon, bg, text } = getEventIconAndColor(event.tipo);
                      return (
                        <Link
                          key={event.id}
                          href="/dashboard/eventos"
                          onClick={() => setNotificationsOpen(false)}
                          className="block px-4 py-3 hover:bg-[var(--bg-tertiary)] transition-colors"
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
                              <span className={text}>{icon}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-[var(--text-primary)] capitalize">
                                {formatEventTitle(event.tipo)}
                              </p>
                              {event.descripcion && (
                                <p className="text-xs text-[var(--text-tertiary)] truncate">{event.descripcion}</p>
                              )}
                              <p className="text-[11px] text-[var(--text-tertiary)] mt-1">
                                {new Date(event.fecha).toLocaleDateString('es-ES', {
                                  day: 'numeric',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </p>
                            </div>
                          </div>
                        </Link>
                      );
                    })
                  ) : (
                    <div className="px-4 py-8 text-center">
                      <Bell className="w-8 h-8 text-[var(--text-tertiary)] mx-auto mb-2" />
                      <p className="text-sm text-[var(--text-secondary)]">Sin notificaciones</p>
                      <p className="text-xs text-[var(--text-tertiary)] mt-1">Los eventos aparecerán aquí</p>
                    </div>
                  )}
                </div>
                {events.length > 0 && (
                  <div className="px-4 py-2 border-t border-[var(--border-primary)]">
                    <Link
                      href="/dashboard/eventos"
                      onClick={() => setNotificationsOpen(false)}
                      className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors flex items-center justify-center gap-1"
                    >
                      Ver todos los eventos
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* User Menu */}
          <div className="relative ml-1 sm:ml-2" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-1.5 sm:gap-2 pl-1.5 pr-2 sm:pl-2 sm:pr-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl hover:bg-[var(--bg-tertiary)] transition-all duration-200 border border-transparent hover:border-[var(--border-primary)]"
            >
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center">
                <span className="text-white text-xs sm:text-sm font-bold">
                  {user?.nombre?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <ChevronDown className="hidden sm:block w-4 h-4 text-[var(--text-secondary)]" />
            </button>

            {/* User Dropdown */}
            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-[calc(100vw-1.5rem)] max-w-[16rem] sm:w-64 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-primary)] shadow-xl z-50">
                <div className="px-4 py-3 border-b border-[var(--border-primary)]">
                  <p className="font-semibold text-[var(--text-primary)]">{user?.nombre}</p>
                  <p className="text-xs text-[var(--text-tertiary)]">{user?.email}</p>
                </div>
                <div className="py-1">
                  <Link
                    href="/dashboard"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--bg-tertiary)] transition-colors text-[var(--text-secondary)]"
                  >
                    <User className="w-4 h-4" />
                    <span className="text-sm">Mi cuenta</span>
                  </Link>
                  <button
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--bg-tertiary)] transition-colors text-[var(--text-secondary)]"
                  >
                    <Settings className="w-4 h-4" />
                    <span className="text-sm">Configuración</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Search Modal */}
      {searchOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]" onClick={() => setSearchOpen(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-[640px] bg-[var(--bg-secondary)] rounded-2xl shadow-2xl border border-[var(--border-primary)] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search Input */}
            <div className="flex items-center gap-3 px-4 py-4 border-b border-[var(--border-primary)]">
              <Search className="w-5 h-5 text-[var(--text-tertiary)]" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Buscar clientes, páginas..."
                className="flex-1 bg-transparent text-[16px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none"
              />
              {loading && (
                <div className="w-4 h-4 border-2 border-[var(--border-primary)] border-t-[var(--text-primary)] rounded-full animate-spin" />
              )}
              <button
                onClick={() => setSearchOpen(false)}
                className="p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-tertiary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Results */}
            <div className="max-h-[400px] overflow-y-auto py-2">
              {results.length === 0 ? (
                <div className="px-4 py-8 text-center text-[var(--text-tertiary)]">
                  No se encontraron resultados
                </div>
              ) : (
                <>
                  {query && (
                    <div className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                      Resultados
                    </div>
                  )}
                  {results.map((result, index) => (
                    <Link
                      key={result.id}
                      href={result.href}
                      onClick={() => setSearchOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 mx-2 rounded-xl transition-all duration-150 ${
                        index === selectedIndex
                          ? 'bg-[var(--bg-tertiary)]'
                          : 'hover:bg-[var(--bg-tertiary)]'
                      }`}
                    >
                      <div className="w-9 h-9 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--text-secondary)]">
                        {getIcon(result.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-medium text-[var(--text-primary)] truncate">
                          {result.title}
                        </p>
                        {result.subtitle && (
                          <p className="text-[12px] text-[var(--text-tertiary)] truncate">
                            {result.subtitle}
                          </p>
                        )}
                      </div>
                      <ArrowRight className={`w-4 h-4 text-[var(--text-tertiary)] transition-opacity ${
                        index === selectedIndex ? 'opacity-100' : 'opacity-0'
                      }`} />
                    </Link>
                  ))}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 bg-[var(--bg-tertiary)] border-t border-[var(--border-primary)] flex items-center justify-between text-[12px] text-[var(--text-tertiary)]">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-secondary)] border border-[var(--border-primary)] font-sans">↑↓</kbd>
                  <span>para navegar</span>
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-secondary)] border border-[var(--border-primary)] font-sans">↵</kbd>
                  <span>para seleccionar</span>
                </span>
              </div>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-secondary)] border border-[var(--border-primary)] font-sans">Esc</kbd>
                <span>para cerrar</span>
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
