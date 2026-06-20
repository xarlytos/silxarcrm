'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { Mail, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

const MOTIVOS = [
  { value: 'no_relevante', label: 'No me interesa el contenido' },
  { value: 'demasiados_emails', label: 'Recibo demasiados emails' },
  { value: 'no_solicitado', label: 'No solicité estos emails' },
  { value: 'otro', label: 'Otro' },
];

function BajaPageInner() {
  const search = useSearchParams();
  const token = search.get('token') || '';

  const [status, setStatus] = useState<'verifying' | 'ready' | 'invalid' | 'submitting' | 'done' | 'error'>('verifying');
  const [email, setEmail] = useState('');
  const [softwareId, setSoftwareId] = useState('');
  const [motivo, setMotivo] = useState('');
  const [motivoLibre, setMotivoLibre] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('invalid');
      setError('Falta el token de baja');
      return;
    }
    apiClient.verifyBajaToken(token)
      .then((res) => {
        setEmail(res.data.email);
        setSoftwareId(res.data.softwareId);
        setStatus('ready');
      })
      .catch((err) => {
        setStatus('invalid');
        setError(err.message || 'Token inválido o caducado');
      });
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    try {
      const motivoFinal = motivo === 'otro' ? motivoLibre : motivo;
      await apiClient.submitBaja(token, motivoFinal || undefined);
      setStatus('done');
    } catch (err: any) {
      setStatus('error');
      setError(err.message || 'Error procesando baja');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] p-4">
      <div className="w-full max-w-md">
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl p-8 shadow-xl">
          {/* Brand */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <span className="text-[15px] font-semibold text-[var(--text-primary)]">La Máquina del Dinero</span>
          </div>

          {status === 'verifying' && (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-violet-500 mx-auto mb-3" />
              <p className="text-[14px] text-[var(--text-tertiary)]">Verificando enlace...</p>
            </div>
          )}

          {status === 'invalid' && (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-6 h-6 text-red-500" />
              </div>
              <h1 className="text-[20px] font-semibold text-[var(--text-primary)] mb-2">Enlace inválido</h1>
              <p className="text-[14px] text-[var(--text-secondary)] mb-1">{error}</p>
              <p className="text-[12px] text-[var(--text-tertiary)] mt-4">
                Si quieres cancelar la suscripción, responde al último email recibido pidiendo la baja manual.
              </p>
            </div>
          )}

          {(status === 'ready' || status === 'submitting' || status === 'error') && (
            <>
              <h1 className="text-[22px] font-bold text-[var(--text-primary)] mb-2 tracking-tight">
                Cancelar suscripción
              </h1>
              <p className="text-[14px] text-[var(--text-secondary)] mb-1">
                Vas a dejar de recibir emails en:
              </p>
              <p className="text-[15px] font-semibold text-[var(--text-primary)] mb-6 font-mono break-all">
                {email}
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-2">
                    ¿Por qué? <span className="text-[var(--text-tertiary)]">(opcional)</span>
                  </label>
                  <div className="space-y-2">
                    {MOTIVOS.map((m) => (
                      <label key={m.value} className="flex items-center gap-2.5 cursor-pointer">
                        <input
                          type="radio"
                          name="motivo"
                          value={m.value}
                          checked={motivo === m.value}
                          onChange={(e) => setMotivo(e.target.value)}
                          className="w-4 h-4 accent-violet-500"
                        />
                        <span className="text-[13px] text-[var(--text-primary)]">{m.label}</span>
                      </label>
                    ))}
                  </div>
                  {motivo === 'otro' && (
                    <textarea
                      value={motivoLibre}
                      onChange={(e) => setMotivoLibre(e.target.value)}
                      placeholder="Cuéntanos brevemente..."
                      rows={2}
                      className="mt-2 w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl text-[13px]"
                    />
                  )}
                </div>

                {status === 'error' && (
                  <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-600 text-[13px] flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={status === 'submitting'}
                  className="w-full px-5 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl text-[14px] font-semibold disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {status === 'submitting' && <Loader2 className="w-4 h-4 animate-spin" />}
                  Confirmar baja
                </button>
              </form>

              <p className="text-[11px] text-[var(--text-tertiary)] mt-5 text-center">
                Procesamos tu baja inmediatamente. No volverás a recibir emails de la lista <code className="font-mono">{softwareId}</code>.
              </p>
            </>
          )}

          {status === 'done' && (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-7 h-7 text-emerald-500" />
              </div>
              <h1 className="text-[22px] font-bold text-[var(--text-primary)] mb-2 tracking-tight">
                Baja confirmada
              </h1>
              <p className="text-[14px] text-[var(--text-secondary)] mb-1">
                Has cancelado la suscripción.
              </p>
              <p className="text-[13px] text-[var(--text-tertiary)] mt-3">
                Ya no recibirás más emails en <span className="font-mono">{email}</span>.
              </p>
              {motivo && (
                <p className="text-[12px] text-[var(--text-tertiary)] mt-4 italic">
                  Gracias por el feedback — tomamos nota.
                </p>
              )}
            </div>
          )}
        </div>

        <p className="text-center text-[11px] text-[var(--text-tertiary)] mt-4">
          Si te has dado de baja por error, contacta con el remitente original.
        </p>
      </div>
    </div>
  );
}

export default function BajaPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    }>
      <BajaPageInner />
    </Suspense>
  );
}
