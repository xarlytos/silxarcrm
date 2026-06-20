'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { apiClient } from '@/lib/api';
import {
  Search,
  Loader2,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Globe,
  Star,
  MapPin,
  Zap,
  ArrowRight,
  Phone,
  Sparkles,
} from 'lucide-react';

interface Area {
  area: string;
  score: number;
  estado: 'bien' | 'mejorable' | 'mal';
  detalle: string;
}

interface AuditResult {
  id: string;
  negocio: string;
  url: string | null;
  score: number;
  status: string;
  resultado: {
    señales: { web: any; ficha: any };
    areas: Area[];
    resumen: string;
    problemas: string[];
    quickWins: string[];
  };
}

const ESTADO_UI = {
  bien: { icon: CheckCircle, color: 'text-emerald-400', bar: 'bg-emerald-500' },
  mejorable: { icon: AlertTriangle, color: 'text-amber-400', bar: 'bg-amber-500' },
  mal: { icon: XCircle, color: 'text-red-400', bar: 'bg-red-500' },
};

export default function AuditoriaPublicaPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [negocio, setNegocio] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');

  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<AuditResult | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!negocio.trim() || !email.trim()) return;
    setRunning(true);
    setError('');
    try {
      const res = await apiClient.runAudit({
        softwareSlug: slug,
        negocio: negocio.trim(),
        ciudad: ciudad.trim() || undefined,
        nombre: nombre.trim() || undefined,
        email: email.trim(),
        telefono: telefono.trim() || undefined,
      });
      setResult(res);
    } catch (err) {
      setError((err as Error).message || 'No hemos podido completar la auditoría. Inténtalo de nuevo.');
    } finally {
      setRunning(false);
    }
  }

  const scoreColor = (s: number) => (s >= 70 ? 'text-emerald-400' : s >= 40 ? 'text-amber-400' : 'text-red-400');

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-3xl mx-auto px-4 py-12 sm:py-16">
        {/* Hero */}
        <div className="text-center mb-10">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 text-indigo-300 text-xs font-bold uppercase tracking-widest mb-4">
            <Sparkles className="w-3.5 h-3.5" /> Auditoría gratuita
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            ¿Cómo está tu negocio en internet?
          </h1>
          <p className="text-gray-400 mt-3 max-w-xl mx-auto">
            Dinos tu negocio o tu web y en menos de un minuto te decimos qué está bien, qué te está costando
            clientes y qué arreglar primero. Gratis y al instante.
          </p>
        </div>

        {!result ? (
          /* ===== Formulario ===== */
          <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 sm:p-8 space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-300">Tu negocio o tu web *</label>
              <div className="relative mt-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  value={negocio}
                  onChange={(e) => setNegocio(e.target.value)}
                  placeholder="Ej: Peluquería Canina Max — o minegocio.com"
                  required
                  className="w-full pl-10 pr-3 py-3 rounded-xl bg-gray-950 border border-gray-800 focus:border-indigo-500 focus:outline-none placeholder:text-gray-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-300">Ciudad</label>
                <input
                  type="text"
                  value={ciudad}
                  onChange={(e) => setCiudad(e.target.value)}
                  placeholder="Ayuda a encontrar tu ficha de Google"
                  className="mt-1 w-full px-3 py-3 rounded-xl bg-gray-950 border border-gray-800 focus:border-indigo-500 focus:outline-none placeholder:text-gray-600"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-300">Tu nombre</label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="¿Cómo te llamas?"
                  className="mt-1 w-full px-3 py-3 rounded-xl bg-gray-950 border border-gray-800 focus:border-indigo-500 focus:outline-none placeholder:text-gray-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-300">Email *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Para enviarte el informe"
                  required
                  className="mt-1 w-full px-3 py-3 rounded-xl bg-gray-950 border border-gray-800 focus:border-indigo-500 focus:outline-none placeholder:text-gray-600"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-300">Teléfono</label>
                <input
                  type="tel"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="Opcional"
                  className="mt-1 w-full px-3 py-3 rounded-xl bg-gray-950 border border-gray-800 focus:border-indigo-500 focus:outline-none placeholder:text-gray-600"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm flex items-start gap-2">
                <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> {error}
              </div>
            )}

            <button
              type="submit"
              disabled={running || !negocio.trim() || !email.trim()}
              className="w-full py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 font-bold text-lg transition-colors flex items-center justify-center gap-2"
            >
              {running ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" /> Analizando tu negocio...
                </>
              ) : (
                <>
                  Auditar gratis <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
            <p className="text-xs text-gray-600 text-center">
              Sin compromiso. El informe se genera al instante con datos reales de tu web y tu ficha de Google.
            </p>
          </form>
        ) : (
          /* ===== Informe ===== */
          <div className="space-y-6">
            {/* Score global */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 sm:p-8 text-center">
              <p className="text-sm text-gray-400 uppercase tracking-widest font-bold mb-2">Resultado de {result.negocio}</p>
              <div className={`text-6xl font-extrabold ${scoreColor(result.score)}`}>{result.score}<span className="text-2xl text-gray-500">/100</span></div>
              <p className="text-gray-300 mt-4 max-w-lg mx-auto">{result.resultado.resumen}</p>
            </div>

            {/* Áreas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {result.resultado.areas.map((a) => {
                const ui = ESTADO_UI[a.estado] || ESTADO_UI.mejorable;
                const Icon = ui.icon;
                return (
                  <div key={a.area} className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold flex items-center gap-2">
                        <Icon className={`w-4 h-4 ${ui.color}`} /> {a.area}
                      </span>
                      <span className={`font-extrabold tabular-nums ${scoreColor(a.score)}`}>{a.score}</span>
                    </div>
                    <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden mb-3">
                      <div className={`h-full rounded-full ${ui.bar}`} style={{ width: `${a.score}%` }} />
                    </div>
                    <p className="text-sm text-gray-400">{a.detalle}</p>
                  </div>
                );
              })}
            </div>

            {/* Problemas y quick wins */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <h3 className="font-bold flex items-center gap-2 mb-3 text-red-300">
                  <XCircle className="w-4 h-4" /> Qué te está costando clientes
                </h3>
                <ul className="space-y-2">
                  {result.resultado.problemas.map((p, i) => (
                    <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                      <span className="text-red-400 font-bold flex-shrink-0">{i + 1}.</span> {p}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <h3 className="font-bold flex items-center gap-2 mb-3 text-emerald-300">
                  <Zap className="w-4 h-4" /> Qué hacer esta semana
                </h3>
                <ul className="space-y-2">
                  {result.resultado.quickWins.map((q, i) => (
                    <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" /> {q}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Datos detectados */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <h3 className="font-bold mb-3 text-gray-300">Lo que hemos encontrado</h3>
              <div className="flex flex-wrap gap-3 text-sm">
                {result.resultado.señales?.web?.url && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 text-gray-300">
                    <Globe className="w-3.5 h-3.5" /> {result.resultado.señales.web.url.replace(/^https?:\/\//, '').split('/')[0]}
                    {result.resultado.señales.web.tiempoMs != null && ` · ${(result.resultado.señales.web.tiempoMs / 1000).toFixed(1)}s`}
                  </span>
                )}
                {result.resultado.señales?.ficha?.encontrada && (
                  <>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 text-gray-300">
                      <Star className="w-3.5 h-3.5 text-amber-400" /> {result.resultado.señales.ficha.rating ?? '—'}★ ({result.resultado.señales.ficha.resenas ?? 0} reseñas)
                    </span>
                    {result.resultado.señales.ficha.direccion && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 text-gray-300">
                        <MapPin className="w-3.5 h-3.5" /> {result.resultado.señales.ficha.direccion}
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* CTA */}
            <div className="bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl p-6 sm:p-8 text-center">
              <h3 className="text-2xl font-extrabold">¿Quieres el plan completo para arreglarlo?</h3>
              <p className="text-indigo-200 mt-2 max-w-md mx-auto">
                Te llamamos, te contamos punto por punto cómo recuperar esos clientes y te decimos exactamente por
                dónde empezar. Gratis, 15 minutos.
              </p>
              <div className="mt-5 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-indigo-700 font-bold">
                <Phone className="w-4 h-4" /> Te contactamos en breve a {email || 'tu email'}
              </div>
            </div>

            <button
              onClick={() => { setResult(null); setNegocio(''); }}
              className="w-full py-3 rounded-xl border border-gray-800 text-gray-400 hover:bg-gray-900 transition-colors text-sm"
            >
              Auditar otro negocio
            </button>
          </div>
        )}

        <p className="text-center text-xs text-gray-700 mt-10">Powered by peluguau.com</p>
      </div>
    </div>
  );
}
