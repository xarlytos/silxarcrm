'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { CommandPaletteProvider } from '@/components/layout/CommandPalette';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/auth/login');
    }
  }, [user, loading, router]);

  // Restore sidebar state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    if (saved) {
      setSidebarCollapsed(saved === 'true');
    }
  }, []);

  const handleToggleSidebar = () => {
    const newState = !sidebarCollapsed;
    setSidebarCollapsed(newState);
    localStorage.setItem('sidebarCollapsed', String(newState));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-[var(--border-primary)] border-t-[var(--text-primary)] rounded-full animate-spin" />
          <span className="text-[var(--text-tertiary)] text-[13px]">Cargando...</span>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <CommandPaletteProvider>
      <div className="flex min-h-screen bg-[var(--bg-primary)]">
        <Sidebar collapsed={sidebarCollapsed} onToggle={handleToggleSidebar} />
        <div
          className={cn(
            'ease-luxe flex-1 flex flex-col min-w-0 transition-[padding-left] duration-[460ms]',
            sidebarCollapsed ? 'pl-[64px]' : 'pl-[260px]',
          )}
        >
          <Header />
          <main className="flex-1 flex flex-col p-8 bg-[var(--bg-primary)] min-h-[calc(100vh-72px)]">
            <div className="max-w-[1600px] mx-auto w-full flex-1 flex flex-col">
              {children}
            </div>
          </main>
        </div>
      </div>
    </CommandPaletteProvider>
  );
}
