'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Check,
  ArrowRight,
  Shield,
  PhoneCall,
  Users,
  CalendarClock,
  Activity,
  Sun,
  Moon,
  Sparkles,
  AlertCircle,
} from 'lucide-react';

const FEATURES = [
  {
    icon: PhoneCall,
    title: 'Centro de llamadas Zadarma',
    desc: 'Click-to-call, grabación y métricas en tiempo real.',
  },
  {
    icon: Users,
    title: 'Leads y oportunidades',
    desc: 'Pipeline visual con seguimiento y scoring automático.',
  },
  {
    icon: CalendarClock,
    title: 'Calendario sincronizado',
    desc: 'Eventos compartidos con webhooks instantáneos.',
  },
  {
    icon: Activity,
    title: 'Tiempo real multi-tenant',
    desc: 'WebSockets nativos sobre arquitectura SaaS aislada.',
  },
];

const STATS = [
  { value: 12480, suffix: '+', label: 'Llamadas/día' },
  { value: 98.7, suffix: '%', label: 'Uptime', decimals: 1 },
  { value: 42, suffix: 'ms', label: 'Latencia p50' },
];

/* ---------- Counter (cuenta hasta el valor con easing) ---------- */
function useCountUp(target: number, durationMs = 1400, decimals = 0) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(target * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);
  return decimals > 0
    ? value.toFixed(decimals)
    : Math.round(value).toLocaleString('es-ES');
}

function StatCounter({ value, suffix, label, decimals }: { value: number; suffix: string; label: string; decimals?: number }) {
  const display = useCountUp(value, 1500, decimals ?? 0);
  return (
    <div className="auth-tick">
      <p className="text-[26px] font-bold tracking-tight text-white tabular-nums leading-none">
        {display}
        <span className="text-white/60 ml-0.5 text-[18px] font-semibold">{suffix}</span>
      </p>
      <p className="text-[11.5px] text-white/50 mt-1 uppercase tracking-wider">{label}</p>
    </div>
  );
}

/* ---------- Floating particles ---------- */
function Particles({ count = 18 }: { count?: number }) {
  const particles = useMemo(
    () =>
      Array.from({ length: count }).map(() => ({
        left: Math.random() * 100,
        size: 2 + Math.random() * 4,
        duration: 14 + Math.random() * 16,
        delay: Math.random() * 18,
        opacity: 0.3 + Math.random() * 0.6,
      })),
    [count],
  );
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p, i) => (
        <span
          key={i}
          className="auth-particle"
          style={{
            left: `${p.left}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
            opacity: p.opacity,
          }}
        />
      ))}
    </div>
  );
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [errorKey, setErrorKey] = useState(0); // re-trigger shake
  const [loading, setLoading] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();

  const spotlightRef = useRef<HTMLDivElement>(null);
  const submitBtnRef = useRef<HTMLButtonElement>(null);

  /* Cycle "active" feature */
  useEffect(() => {
    const id = setInterval(() => {
      setActiveFeature((p) => (p + 1) % FEATURES.length);
    }, 2800);
    return () => clearInterval(id);
  }, []);

  /* Restore remembered email */
  useEffect(() => {
    const savedEmail = localStorage.getItem('remembered_email');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  /* Cursor spotlight on left panel */
  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const el = spotlightRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${e.clientX - r.left}px`);
    el.style.setProperty('--my', `${e.clientY - r.top}px`);
  };

  /* Magnetic submit button */
  const handleBtnMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const btn = submitBtnRef.current;
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    const x = e.clientX - (r.left + r.width / 2);
    const y = e.clientY - (r.top + r.height / 2);
    btn.style.transform = `translate(${x * 0.08}px, ${y * 0.12}px)`;
  };
  const handleBtnLeave = () => {
    const btn = submitBtnRef.current;
    if (btn) btn.style.transform = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      if (rememberMe) localStorage.setItem('remembered_email', email);
      else localStorage.removeItem('remembered_email');
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
      setErrorKey((k) => k + 1);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyEvent = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (typeof e.getModifierState === 'function') {
      setCapsLock(e.getModifierState('CapsLock'));
    }
  };

  return (
    <div className="min-h-screen flex bg-[var(--bg-primary)] font-inter relative overflow-hidden">
      {/* Theme toggle */}
      <button
        type="button"
        onClick={toggleTheme}
        aria-label="Cambiar tema"
        className="absolute top-5 right-5 z-30 w-10 h-10 rounded-full bg-[var(--bg-secondary)]/80 backdrop-blur border border-[var(--border-primary)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:scale-110 hover:rotate-12 active:scale-95 transition-all duration-300 shadow-sm"
      >
        {theme === 'dark' ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
      </button>

      {/* ===== LEFT — Branding panel ===== */}
      <aside
        onMouseMove={handleMouseMove}
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-[#070709] text-white"
      >
        {/* Aurora blobs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="aurora-blob aurora-blob-1 w-[560px] h-[560px] -top-40 -left-32 bg-[#0d74ce]/50" />
          <div className="aurora-blob aurora-blob-2 w-[480px] h-[480px] top-1/3 -right-24 bg-violet-500/45" />
          <div className="aurora-blob aurora-blob-3 w-[440px] h-[440px] -bottom-28 left-1/4 bg-fuchsia-500/35" />
        </div>

        {/* Grid overlay */}
        <div className="absolute inset-0 auth-grid pointer-events-none" />

        {/* Floating particles */}
        <Particles count={22} />

        {/* Cursor spotlight */}
        <div ref={spotlightRef} className="absolute inset-0 auth-spotlight pointer-events-none" />

        {/* Vignette */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/70 pointer-events-none" />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between w-full px-12 py-12 xl:px-16 xl:py-14">
          {/* Brand */}
          <div className="flex items-center gap-3 auth-rise">
            <div className="relative w-11 h-11">
              <div className="absolute inset-0 rounded-xl auth-logo-ring opacity-80" />
              <div className="absolute inset-[2px] rounded-[10px] bg-[#070709] flex items-center justify-center">
                <Image
                  src="/logo.png"
                  alt="CRM Maestro"
                  width={26}
                  height={26}
                  className="object-contain"
                  priority
                />
              </div>
            </div>
            <span className="text-[17px] font-semibold tracking-tight">CRM Maestro</span>
          </div>

          {/* Headline + features */}
          <div className="space-y-10">
            <div className="space-y-4 auth-rise auth-rise-delay-1">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/8 border border-white/12 text-[12px] font-medium text-white/90 backdrop-blur">
                <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                Plataforma SaaS · v1.0
              </div>
              <h2 className="text-[44px] xl:text-[52px] leading-[1.05] font-bold tracking-tight text-balance">
                Gestiona tu CRM<br />
                <span className="auth-shimmer">desde un solo lugar.</span>
              </h2>
              <p className="text-[15px] xl:text-[16px] text-white/65 max-w-md leading-relaxed">
                Llamadas, leads y calendarios sincronizados en tiempo real. Construido para
                equipos que necesitan velocidad sin perder control.
              </p>
            </div>

            {/* Feature list */}
            <ul className="space-y-2.5 max-w-md">
              {FEATURES.map((f, i) => {
                const isActive = i === activeFeature;
                return (
                  <li
                    key={f.title}
                    onMouseEnter={() => setActiveFeature(i)}
                    className={`flex items-start gap-3.5 p-3 rounded-xl border border-transparent transition-all duration-500 cursor-default auth-rise auth-rise-delay-${Math.min(i + 2, 5)} ${
                      isActive ? 'feature-active' : 'hover:bg-white/5'
                    }`}
                  >
                    <div
                      className={`feature-icon shrink-0 w-9 h-9 rounded-lg bg-white/8 border border-white/10 backdrop-blur flex items-center justify-center transition-all duration-500 ${
                        isActive ? 'scale-110' : ''
                      }`}
                    >
                      <f.icon className="w-[18px] h-[18px] text-white/95" />
                    </div>
                    <div className="pt-0.5 min-w-0">
                      <p className="text-[14px] font-semibold text-white/95 leading-tight">{f.title}</p>
                      <p
                        className={`text-[13px] mt-0.5 leading-snug transition-colors duration-500 ${
                          isActive ? 'text-white/75' : 'text-white/50'
                        }`}
                      >
                        {f.desc}
                      </p>
                    </div>
                    {/* Active indicator */}
                    <div
                      className={`shrink-0 w-1 self-stretch rounded-full bg-gradient-to-b from-blue-400 to-violet-400 transition-all duration-500 ${
                        isActive ? 'opacity-100' : 'opacity-0'
                      }`}
                    />
                  </li>
                );
              })}
            </ul>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 max-w-md pt-2 auth-rise auth-rise-delay-6">
              {STATS.map((s) => (
                <StatCounter key={s.label} {...s} />
              ))}
            </div>
          </div>

          {/* Footer mini */}
          <div className="flex items-center justify-between text-[12px] text-white/45 auth-rise auth-rise-delay-7">
            <div className="flex items-center gap-2">
              <span className="relative flex w-2 h-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
              </span>
              Sistemas operativos
            </div>
            <span>© {new Date().getFullYear()} CRM Maestro</span>
          </div>
        </div>
      </aside>

      {/* ===== RIGHT — Form panel ===== */}
      <main className="flex-1 flex items-center justify-center px-5 py-10 sm:px-8 relative">
        {/* Mobile background decor */}
        <div className="lg:hidden absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -right-16 w-72 h-72 rounded-full bg-blue-500/10 blur-3xl aurora-blob-1" />
          <div className="absolute -bottom-24 -left-16 w-72 h-72 rounded-full bg-violet-500/10 blur-3xl aurora-blob-2" />
        </div>

        <div className="w-full max-w-[420px] relative z-10">
          {/* Mobile brand */}
          <div className="flex lg:hidden items-center gap-3 mb-10 auth-rise">
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 rounded-xl auth-logo-ring opacity-60" />
              <div className="absolute inset-[2px] rounded-[10px] bg-[var(--bg-secondary)] flex items-center justify-center">
                <Image src="/logo.png" alt="CRM Maestro" width={28} height={28} className="object-contain" priority />
              </div>
            </div>
            <div>
              <p className="text-[16px] font-semibold text-[var(--text-primary)] leading-tight">CRM Maestro</p>
              <p className="text-[12px] text-[var(--text-tertiary)]">Panel de Control SaaS</p>
            </div>
          </div>

          {/* Header */}
          <div className="mb-8 auth-rise auth-rise-delay-1">
            <h1 className="text-[30px] font-bold tracking-tight text-[var(--text-primary)]">
              Bienvenido de nuevo
            </h1>
            <p className="text-[14px] text-[var(--text-secondary)] mt-1.5">
              Introduce tus credenciales para acceder al panel.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div
              key={errorKey}
              className="mb-5 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 text-[13.5px] flex items-start gap-2.5 auth-shake"
            >
              <AlertCircle className="w-[18px] h-[18px] shrink-0 mt-px" />
              <span className="leading-snug">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5 auth-rise auth-rise-delay-2">
            {/* Email — floating label */}
            <div className="auth-field relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[var(--text-tertiary)] z-10" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder=" "
                autoComplete="email"
                required
                className="peer w-full pl-11 pr-4 h-14 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] text-[14.5px] text-[var(--text-primary)] focus:outline-none focus:ring-[3px] focus:ring-expo-cobalt/20 focus:border-expo-cobalt placeholder:text-transparent transition-all"
              />
              <label htmlFor="email">Correo electrónico</label>
            </div>

            {/* Password — floating label */}
            <div>
              <div className="auth-field relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[var(--text-tertiary)] z-10" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={handleKeyEvent}
                  onKeyUp={handleKeyEvent}
                  placeholder=" "
                  autoComplete="current-password"
                  required
                  className="peer w-full pl-11 pr-11 h-14 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] text-[14.5px] text-[var(--text-primary)] focus:outline-none focus:ring-[3px] focus:ring-expo-cobalt/20 focus:border-expo-cobalt placeholder:text-transparent transition-all"
                />
                <label htmlFor="password">Contraseña</label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:scale-110 transition-all z-10"
                >
                  {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                </button>
              </div>
              <div className="flex items-center justify-between mt-2 px-1">
                <p
                  className={`text-[12px] text-amber-600 dark:text-amber-400 flex items-center gap-1.5 transition-opacity duration-200 ${
                    capsLock ? 'opacity-100' : 'opacity-0 pointer-events-none'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  Bloq Mayús está activado
                </p>
                <button
                  type="button"
                  className="text-[12px] text-expo-cobalt dark:text-blue-400 hover:underline font-medium ml-auto"
                >
                  ¿La olvidaste?
                </button>
              </div>
            </div>

            {/* Remember me */}
            <label className="flex items-center gap-2.5 cursor-pointer group select-none">
              <span className="relative">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="sr-only peer"
                />
                <span
                  className={`block w-[18px] h-[18px] rounded-[6px] border-[1.5px] transition-all duration-200 flex items-center justify-center ${
                    rememberMe
                      ? 'bg-expo-black dark:bg-white border-expo-black dark:border-white scale-105'
                      : 'border-[var(--border-primary)] bg-[var(--bg-secondary)] group-hover:border-[var(--text-tertiary)]'
                  }`}
                >
                  {rememberMe && (
                    <Check className="w-3 h-3 text-white dark:text-expo-black auth-tick" strokeWidth={3} />
                  )}
                </span>
              </span>
              <span className="text-[13.5px] text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
                Mantener sesión iniciada
              </span>
            </label>

            {/* Submit — magnetic + shine */}
            <button
              ref={submitBtnRef}
              type="submit"
              disabled={loading}
              onMouseMove={handleBtnMove}
              onMouseLeave={handleBtnLeave}
              className="auth-btn-shine relative overflow-hidden w-full h-12 mt-1 bg-expo-black dark:bg-white text-white dark:text-expo-black rounded-xl text-[15px] font-semibold hover:bg-expo-near dark:hover:bg-gray-100 transition-[background-color,box-shadow,transform] duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 group shadow-lg shadow-black/10 dark:shadow-white/5 hover:shadow-2xl hover:shadow-expo-cobalt/20"
            >
              {loading ? (
                <>
                  <span className="w-[18px] h-[18px] border-2 border-white/30 border-t-white dark:border-expo-black/30 dark:border-t-expo-black rounded-full animate-spin" />
                  <span>Iniciando sesión…</span>
                </>
              ) : (
                <>
                  <span>Entrar</span>
                  <ArrowRight className="w-[18px] h-[18px] group-hover:translate-x-1 transition-transform duration-300" />
                </>
              )}
            </button>
          </form>

          {/* Security strip */}
          <div className="mt-7 flex items-center gap-2 text-[12px] text-[var(--text-tertiary)] auth-rise auth-rise-delay-3">
            <Shield className="w-3.5 h-3.5" />
            <span>Conexión cifrada · Tu información permanece en tu workspace.</span>
          </div>

          {/* Footer */}
          <p className="mt-10 text-center text-[12px] text-[var(--text-tertiary)] auth-rise auth-rise-delay-4">
            CRM Maestro v1.0 — Panel Interno
          </p>
        </div>
      </main>
    </div>
  );
}
