'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  useMemo,
  type ReactNode,
  type ComponentType,
} from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Layers,
  Bell,
  BarChart3,
  Sparkles,
  LogOut,
  Calendar,
  Users,
  Phone,
  Mail,
  MessageCircle,
  Search,
  Command,
  Sun,
  Moon,
  ArrowRight,
  CornerDownLeft,
  ArrowDown,
  ArrowUp,
} from 'lucide-react';

type CommandGroup = 'Páginas' | 'Acciones';

type CommandAction = {
  id: string;
  label: string;
  hint?: string;
  icon: ComponentType<{ className?: string }>;
  group: CommandGroup;
  keywords?: string[];
  action: () => void | Promise<void>;
};

interface CommandPaletteContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(null);

export function useCommandPalette() {
  const ctx = useContext(CommandPaletteContext);
  if (!ctx) throw new Error('useCommandPalette must be used within CommandPaletteProvider');
  return ctx;
}

/* ============================================================ */
/*  Provider                                                    */
/* ============================================================ */
export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const { logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((o) => !o), []);

  /* Ctrl+K / ⌘+K shortcut */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [toggle]);

  /* Lock body scroll while open */
  useEffect(() => {
    if (!isOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [isOpen]);

  /* Build action catalog */
  const actions: CommandAction[] = useMemo(
    () => [
      // ----- Pages -----
      { id: 'p-dashboard',  label: 'Dashboard',     icon: LayoutDashboard, group: 'Páginas', keywords: ['inicio', 'home', 'panel'],             action: () => router.push('/dashboard') },
      { id: 'p-leads',      label: 'Leads',         icon: Users,           group: 'Páginas', keywords: ['clientes', 'prospectos', 'oportunidades'], action: () => router.push('/dashboard/leads') },
      { id: 'p-llamadas',   label: 'Llamadas',      icon: Phone,           group: 'Páginas', keywords: ['zadarma', 'telefono', 'calls'],         action: () => router.push('/dashboard/llamadas') },
      { id: 'p-email',      label: 'Email',         icon: Mail,            group: 'Páginas', keywords: ['correo', 'mail', 'mensajes', 'bandeja'], action: () => router.push('/dashboard/email') },
      { id: 'p-whatsapp',   label: 'WhatsApp',      icon: MessageCircle,   group: 'Páginas', keywords: ['wa', 'whats', 'chat', 'plantillas', 'mensaje'], action: () => router.push('/dashboard/whatsapp') },
      { id: 'p-calendario', label: 'Calendario',    icon: Calendar,        group: 'Páginas', keywords: ['agenda', 'eventos', 'fecha'],           action: () => router.push('/dashboard/calendario') },
      { id: 'p-softwares',  label: 'Softwares',     icon: Layers,          group: 'Páginas', keywords: ['saas', 'apps', 'integraciones'],        action: () => router.push('/dashboard/softwares') },
      { id: 'p-metricas',   label: 'Métricas',      icon: BarChart3,       group: 'Páginas', keywords: ['analytics', 'kpi', 'estadisticas'],     action: () => router.push('/dashboard/metricas') },
      { id: 'p-eventos',    label: 'Eventos',       icon: Bell,            group: 'Páginas', keywords: ['notificaciones', 'alertas'],            action: () => router.push('/dashboard/eventos') },
      { id: 'p-ia',         label: 'Asistente IA',  icon: Sparkles,        group: 'Páginas', keywords: ['ai', 'inteligencia artificial', 'chat'], action: () => router.push('/dashboard/ia') },

      // ----- Actions -----
      {
        id: 'a-theme',
        label: theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro',
        hint: 'Tema',
        icon: theme === 'dark' ? Sun : Moon,
        group: 'Acciones',
        keywords: ['theme', 'dark', 'light', 'claro', 'oscuro', 'modo'],
        action: () => toggleTheme(),
      },
      {
        id: 'a-logout',
        label: 'Cerrar sesión',
        icon: LogOut,
        group: 'Acciones',
        keywords: ['salir', 'logout', 'exit', 'desconectar'],
        action: () => logout(),
      },
    ],
    [router, logout, theme, toggleTheme],
  );

  const value = useMemo(() => ({ isOpen, open, close, toggle }), [isOpen, open, close, toggle]);

  return (
    <CommandPaletteContext.Provider value={value}>
      {children}
      <CommandPaletteUI isOpen={isOpen} onClose={close} actions={actions} />
    </CommandPaletteContext.Provider>
  );
}

/* ============================================================ */
/*  UI                                                          */
/* ============================================================ */
function CommandPaletteUI({
  isOpen,
  onClose,
  actions,
}: {
  isOpen: boolean;
  onClose: () => void;
  actions: CommandAction[];
}) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  /* Reset state when reopened */
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      const t = setTimeout(() => inputRef.current?.focus(), 30);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  /* Fuzzy/substring filter */
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return actions;

    return actions
      .map((a) => {
        const haystack = [a.label, ...(a.keywords ?? [])].join(' ').toLowerCase();
        let score = 0;
        if (a.label.toLowerCase().startsWith(q)) score += 100;
        if (haystack.includes(q)) score += 50;
        // Subsequence match
        let i = 0;
        for (const ch of haystack) {
          if (ch === q[i]) {
            i++;
            score += 1;
          }
          if (i === q.length) break;
        }
        const matched = i === q.length || haystack.includes(q);
        return { a, score, matched };
      })
      .filter((x) => x.matched)
      .sort((x, y) => y.score - x.score)
      .map((x) => x.a);
  }, [actions, query]);

  /* Reset selection when filter changes */
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  /* Scroll selected item into view */
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-cmd-idx="${selectedIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  /* Group items preserving order */
  const grouped = useMemo(() => {
    const groups = new Map<string, { items: CommandAction[]; startIdx: number }>();
    let idx = 0;
    for (const action of filtered) {
      if (!groups.has(action.group)) {
        groups.set(action.group, { items: [], startIdx: idx });
      }
      groups.get(action.group)!.items.push(action);
      idx++;
    }
    return Array.from(groups.entries());
  }, [filtered]);

  const runAction = useCallback(
    (action: CommandAction) => {
      onClose();
      // Defer so the modal closes before navigation/logout
      setTimeout(() => {
        void action.action();
      }, 0);
    },
    [onClose],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(filtered.length - 1, i + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(0, i - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const action = filtered[selectedIndex];
        if (action) runAction(action);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    },
    [filtered, selectedIndex, runAction, onClose],
  );

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-[14vh] sm:pt-[18vh] font-inter"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[6px] cmd-backdrop-rise" />

      {/* Card */}
      <div
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        role="dialog"
        aria-label="Paleta de comandos"
        className="relative w-full max-w-[600px] rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] shadow-2xl shadow-black/30 dark:shadow-black/60 overflow-hidden cmd-rise"
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 h-14 border-b border-[var(--border-primary)]">
          <Search className="w-[18px] h-[18px] text-[var(--text-tertiary)] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Escribe un comando o busca una página..."
            className="flex-1 bg-transparent outline-none text-[15px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
          />
          <kbd className="hidden sm:inline-flex items-center px-2 h-6 rounded-md bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[11px] font-medium text-[var(--text-tertiary)]">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[60vh] overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] mb-3">
                <Search className="w-5 h-5 text-[var(--text-tertiary)]" />
              </div>
              <p className="text-[14px] font-medium text-[var(--text-primary)]">Sin resultados</p>
              <p className="text-[12.5px] text-[var(--text-tertiary)] mt-1">
                Prueba con otro término —{' '}
                <span className="font-mono text-[12px] text-[var(--text-secondary)]">{query}</span>
              </p>
            </div>
          ) : (
            grouped.map(([group, { items, startIdx }]) => (
              <div key={group} className="mb-1 last:mb-0">
                <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
                  {group}
                </p>
                {items.map((action, i) => {
                  const idx = startIdx + i;
                  const isSelected = idx === selectedIndex;
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.id}
                      type="button"
                      data-cmd-idx={idx}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      onClick={() => runAction(action)}
                      className={cn(
                        'group w-full flex items-center gap-3 px-3 h-11 rounded-lg text-left transition-colors duration-100',
                        isSelected
                          ? 'bg-[var(--bg-tertiary)]'
                          : 'hover:bg-[var(--surface-hover)]',
                      )}
                    >
                      <span
                        className={cn(
                          'shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-colors',
                          isSelected
                            ? 'bg-gradient-to-br from-blue-500/15 to-violet-500/15 ring-1 ring-blue-500/20'
                            : 'bg-[var(--bg-tertiary)]',
                        )}
                      >
                        <Icon
                          className={cn(
                            'w-[16px] h-[16px] transition-colors',
                            isSelected
                              ? 'text-expo-cobalt dark:text-blue-400'
                              : 'text-[var(--text-secondary)]',
                          )}
                        />
                      </span>
                      <span className="flex-1 text-[13.5px] font-medium text-[var(--text-primary)] truncate">
                        {action.label}
                      </span>
                      {action.hint && (
                        <span className="text-[11px] text-[var(--text-tertiary)] uppercase tracking-wider">
                          {action.hint}
                        </span>
                      )}
                      <ArrowRight
                        className={cn(
                          'w-3.5 h-3.5 text-[var(--text-tertiary)] transition-all duration-150',
                          isSelected ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-1',
                        )}
                      />
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 h-10 border-t border-[var(--border-primary)] bg-[var(--bg-tertiary)]/60 text-[11px] text-[var(--text-tertiary)]">
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-flex w-5 h-5 items-center justify-center rounded bg-[var(--bg-secondary)] border border-[var(--border-primary)]">
                <ArrowUp className="w-2.5 h-2.5" />
              </span>
              <span className="inline-flex w-5 h-5 items-center justify-center rounded bg-[var(--bg-secondary)] border border-[var(--border-primary)]">
                <ArrowDown className="w-2.5 h-2.5" />
              </span>
              navegar
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-flex h-5 px-1.5 items-center justify-center rounded bg-[var(--bg-secondary)] border border-[var(--border-primary)]">
                <CornerDownLeft className="w-2.5 h-2.5" />
              </span>
              elegir
            </span>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1">
            <span className="inline-flex items-center px-1.5 h-5 rounded bg-[var(--bg-secondary)] border border-[var(--border-primary)] gap-0.5">
              <Command className="w-2.5 h-2.5" />K
            </span>
            <span className="ml-1">para alternar</span>
          </span>
        </div>
      </div>
    </div>
  );
}
