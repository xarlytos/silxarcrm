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
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/auth/login');
    }
  }, [user, loading, router]);

  // Restore desktop sidebar state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    if (saved) {
      setDesktopCollapsed(saved === 'true');
    }
  }, []);

  // Close mobile drawer when crossing into desktop breakpoint
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const handle = (e: MediaQueryListEvent) => {
      if (e.matches) setMobileOpen(false);
    };
    mq.addEventListener('change', handle);
    return () => mq.removeEventListener('change', handle);
  }, []);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileOpen) {
      const original = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = original;
      };
    }
  }, [mobileOpen]);

  const handleDesktopToggle = () => {
    const newState = !desktopCollapsed;
    setDesktopCollapsed(newState);
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
        <Sidebar
          desktopCollapsed={desktopCollapsed}
          onDesktopToggle={handleDesktopToggle}
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
        />
        <div
          className={cn(
            'ease-luxe flex-1 flex flex-col min-w-0 transition-[padding-left] duration-[460ms] pl-0',
            desktopCollapsed ? 'lg:pl-[64px]' : 'lg:pl-[260px]',
          )}
        >
          <Header onMobileMenuClick={() => setMobileOpen(true)} />
          <main className="flex-1 flex flex-col p-4 sm:p-6 lg:p-8 bg-[var(--bg-primary)] min-h-[calc(100vh-56px)] sm:min-h-[calc(100vh-72px)]">
            <div className="max-w-[1600px] mx-auto w-full flex-1 flex flex-col">
              {children}
            </div>
          </main>
        </div>
      </div>
    </CommandPaletteProvider>
  );
}
