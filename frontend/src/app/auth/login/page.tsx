'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Mail, Lock, Eye, EyeOff, Check, ArrowRight, Shield, Zap, BarChart3 } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const { login } = useAuth();
  const router = useRouter();

  // Cargar email guardado al iniciar
  useEffect(() => {
    const savedEmail = localStorage.getItem('remembered_email');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);

      // Guardar o eliminar email según "Recordarme"
      if (rememberMe) {
        localStorage.setItem('remembered_email', email);
      } else {
        localStorage.removeItem('remembered_email');
      }

      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4 font-inter relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-[var(--border-primary)]/20 to-transparent rounded-full" />
      </div>

      <div className="w-full max-w-[440px] relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-expo-black to-expo-near dark:from-white dark:to-gray-200 text-white dark:text-expo-black text-[24px] font-bold tracking-tight mb-6 shadow-xl shadow-black/10 dark:shadow-white/10 transform hover:scale-105 transition-transform duration-300">
            <div className="flex flex-col items-center leading-none">
              <span>CM</span>
            </div>
          </div>
          <h1 className="text-[36px] font-bold tracking-tight text-[var(--text-primary)]">
            CRM Maestro
          </h1>
          <p className="text-[16px] text-[var(--text-secondary)] mt-2">Panel de Control SaaS</p>
        </div>

        {/* Card */}
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl p-8 shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-[var(--bg-tertiary)] flex items-center justify-center">
              <Shield className="w-5 h-5 text-[var(--text-primary)]" />
            </div>
            <div>
              <h2 className="text-[18px] font-semibold text-[var(--text-primary)]">Iniciar sesión</h2>
              <p className="text-[13px] text-[var(--text-tertiary)]">Accede a tu cuenta</p>
            </div>
          </div>

          {error && (
            <div className="mb-5 p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-[14px] flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="w-5 h-5 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center shrink-0">
                <span className="text-red-600 dark:text-red-400 text-xs">!</span>
              </div>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Input */}
            <div>
              <label className="text-[13px] font-medium text-[var(--text-secondary)] block mb-2">
                Correo electrónico
              </label>
              <div className={`relative group transition-all duration-200 ${
                focusedInput === 'email' ? 'transform scale-[1.02]' : ''
              }`}>
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] group-focus-within:text-[var(--text-primary)] transition-colors">
                  <Mail className="w-5 h-5" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocusedInput('email')}
                  onBlur={() => setFocusedInput(null)}
                  placeholder="admin@crm-maestro.com"
                  required
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-tertiary)] text-[15px] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-expo-cobalt/30 focus:border-expo-cobalt/50 placeholder:text-[var(--text-tertiary)] transition-all duration-200"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="text-[13px] font-medium text-[var(--text-secondary)] block mb-2">
                Contraseña
              </label>
              <div className={`relative group transition-all duration-200 ${
                focusedInput === 'password' ? 'transform scale-[1.02]' : ''
              }`}>
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] group-focus-within:text-[var(--text-primary)] transition-colors">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedInput('password')}
                  onBlur={() => setFocusedInput(null)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-12 pr-12 py-3.5 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-tertiary)] text-[15px] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-expo-cobalt/30 focus:border-expo-cobalt/50 placeholder:text-[var(--text-tertiary)] transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`w-5 h-5 rounded-md border-2 transition-all duration-200 flex items-center justify-center ${
                    rememberMe
                      ? 'bg-expo-black dark:bg-white border-expo-black dark:border-white'
                      : 'border-[var(--border-primary)] bg-[var(--bg-tertiary)] group-hover:border-[var(--text-tertiary)]'
                  }`}>
                    {rememberMe && <Check className="w-3 h-3 text-white dark:text-expo-black" />}
                  </div>
                </div>
                <span className="text-[14px] text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
                  Recordarme
                </span>
              </label>

              <button
                type="button"
                className="text-[13px] text-expo-cobalt dark:text-blue-400 hover:underline font-medium"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-expo-black dark:bg-white text-white dark:text-expo-black rounded-xl text-[16px] font-semibold hover:bg-expo-near dark:hover:bg-gray-100 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group shadow-lg shadow-black/10 dark:shadow-white/10 hover:shadow-xl hover:shadow-black/20 dark:hover:shadow-white/20 hover:-translate-y-0.5"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white dark:border-expo-black/30 dark:border-t-expo-black rounded-full animate-spin" />
                  <span>Iniciando sesión...</span>
                </>
              ) : (
                <>
                  <span>Entrar</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-[var(--border-primary)]" />
            <span className="text-[12px] text-[var(--text-tertiary)] uppercase tracking-wider">o</span>
            <div className="flex-1 h-px bg-[var(--border-primary)]" />
          </div>

          {/* Quick Access Info */}
          <div className="bg-[var(--bg-tertiary)] rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-[13px] text-[var(--text-secondary)]">
              <Zap className="w-4 h-4 text-amber-500" />
              <span>Acceso rápido disponible</span>
            </div>
            <div className="flex items-center gap-2 text-[13px] text-[var(--text-secondary)]">
              <BarChart3 className="w-4 h-4 text-violet-500" />
              <span>Datos cifrados y seguros</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[13px] text-[var(--text-tertiary)] mt-6">
          CRM Maestro v1.0 — Panel Interno
        </p>
      </div>
    </div>
  );
}
