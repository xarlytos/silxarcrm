'use client';

/* ============================================================
   Fondo animado + estilos globales
============================================================ */

export function AnimatedBackground() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden tareas-deep-bg">
      {/* Base del tema */}
      <div className="absolute inset-0 bg-[var(--bg-primary)]" />
      {/* Ambient blobs gigantes (10% highlight rule) */}
      <div className="absolute -top-[300px] -left-[200px] w-[900px] h-[900px] rounded-full bg-violet-600/[0.10] blur-[140px] animate-ambient-1" />
      <div className="absolute top-[20%] -right-[300px] w-[800px] h-[800px] rounded-full bg-orange-500/[0.08] blur-[140px] animate-ambient-2" />
      <div className="absolute bottom-[-200px] left-[20%] w-[700px] h-[700px] rounded-full bg-blue-500/[0.07] blur-[140px] animate-ambient-3" />
      {/* Noise overlay sutil */}
      <div className="absolute inset-0 opacity-[0.025] mix-blend-overlay" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
      }} />
      {/* Vignette - adaptable al tema */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,color-mix(in_srgb,var(--bg-primary)_60%,transparent))]" />
      {/* Top gradient */}
      <div className="absolute inset-x-0 top-0 h-[400px] bg-[radial-gradient(ellipse_at_top,rgba(167,139,250,0.08),transparent_70%)]" />
    </div>
  );
}
