'use client';

import Link from 'next/link';
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
  ChevronRight,
  Calendar,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useState } from 'react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/softwares', label: 'Softwares', icon: Layers, exact: false },
  { href: '/dashboard/calendario', label: 'Calendario', icon: Calendar, exact: false },
  { href: '/dashboard/eventos', label: 'Eventos', icon: Bell, exact: false, badge: true },
  { href: '/dashboard/metricas', label: 'Métricas', icon: BarChart3, exact: false },
  { href: '/dashboard/ia', label: 'Asistente IA', icon: Sparkles, exact: false },
];

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

export default function Sidebar({ collapsed: controlledCollapsed, onToggle }: SidebarProps = {}) {
  const pathname = usePathname();
  const { logout, user } = useAuth();
  const [internalCollapsed, setInternalCollapsed] = useState(false);

  const collapsed = controlledCollapsed ?? internalCollapsed;
  const setCollapsed = onToggle ? () => onToggle() : () => setInternalCollapsed(!internalCollapsed);

  return (
    <aside
      className={cn(
        'h-screen fixed top-0 left-0 border-r border-[var(--border-primary)] bg-[var(--bg-secondary)] flex flex-col transition-all duration-300 ease-in-out z-50',
        collapsed ? 'w-[72px]' : 'w-[260px]'
      )}
    >
      {/* Logo */}
      <div className={cn(
        'border-b border-[var(--border-primary)] transition-all duration-300',
        collapsed ? 'px-3 py-4' : 'px-5 py-5'
      )}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20 shrink-0">
            <span className="text-white text-sm font-bold tracking-tight">CM</span>
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <h1 className="text-base font-semibold text-[var(--text-primary)] leading-none whitespace-nowrap">
                CRM Maestro
              </h1>
              <p className="text-xs text-[var(--text-tertiary)] mt-1 font-medium whitespace-nowrap">Command Center</p>
            </div>
          )}
        </div>
      </div>

      {/* Collapse Button */}
      <button
        onClick={setCollapsed}
        className={cn(
          'absolute -right-3 top-[72px] w-6 h-6 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] flex items-center justify-center shadow-sm hover:shadow-md hover:border-[var(--text-tertiary)] transition-all duration-200 group z-10',
          collapsed && 'top-[64px]'
        )}
        title={collapsed ? 'Expandir' : 'Colapsar'}
      >
        {collapsed ? (
          <ChevronRight className="w-3.5 h-3.5 text-[var(--text-tertiary)] group-hover:text-[var(--text-primary)]" />
        ) : (
          <ChevronLeft className="w-3.5 h-3.5 text-[var(--text-tertiary)] group-hover:text-[var(--text-primary)]" />
        )}
      </button>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-5 overflow-y-auto overflow-x-hidden">
        <div className="space-y-1">
          {!collapsed && (
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] px-3 mb-3">
              Principal
            </p>
          )}
          {navItems.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative',
                  isActive
                    ? 'bg-[var(--text-primary)] text-[var(--bg-primary)] shadow-lg shadow-black/10 dark:shadow-white/10'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]',
                  collapsed && 'justify-center'
                )}
              >
                <Icon className={cn(
                  'w-[20px] h-[20px] shrink-0 transition-colors',
                  isActive ? 'text-[var(--bg-primary)]' : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'
                )} />
                {!collapsed && (
                  <span className="whitespace-nowrap overflow-hidden">{item.label}</span>
                )}
                {item.badge && (
                  <span className={cn(
                    'w-2 h-2 rounded-full bg-red-500',
                    collapsed ? 'absolute top-2 right-2' : 'ml-auto'
                  )} />
                )}
                {/* Tooltip for collapsed state */}
                {collapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-[var(--text-primary)] text-[var(--bg-primary)] text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
                    {item.label}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* User Info */}
      {!collapsed && user && (
        <div className="px-4 py-3 mx-3 mb-2 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-bold">
                {user.nombre?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-[var(--text-primary)] truncate">{user.nombre}</p>
              <p className="text-xs text-[var(--text-tertiary)] truncate">{user.email}</p>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className={cn(
        'p-3 border-t border-[var(--border-primary)]',
        collapsed && 'px-2'
      )}>
        <button
          onClick={logout}
          title={collapsed ? 'Cerrar sesión' : undefined}
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all duration-200 group',
            collapsed && 'justify-center px-2'
          )}
        >
          <LogOut className="w-[20px] h-[20px] shrink-0" />
          {!collapsed && <span>Cerrar sesión</span>}
          {/* Tooltip for collapsed state */}
          {collapsed && (
            <div className="absolute left-full ml-2 px-2 py-1 bg-red-600 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
              Cerrar sesión
            </div>
          )}
        </button>
      </div>
    </aside>
  );
}
