'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { apiClient } from '@/lib/api';
import {
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  Loader2,
  AlertTriangle,
  Check,
  Euro,
  ShieldCheck,
} from 'lucide-react';

interface PropuestaData {
  id: string;
  titulo: string;
  descripcion: string | null;
  clienteNombre: string;
  clienteEmail: string | null;
  items: Array<{ servicio: string; descripcion: string; cantidad: number; precioUnitario: number }>;
  subtotal: number;
  impuestos: number | null;
  total: number;
  condiciones: string | null;
  validezDias: number;
  estado: string;
  createdAt: string;
  expirada: boolean;
  fechaExpiracion: string;
}

export default function PropuestaPublicaPage() {
  const params = useParams();
  const token = params.token as string;
  const [propuesta, setPropuesta] = useState<PropuestaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [result, setResult] = useState<'aceptada' | 'rechazada' | null>(null);
  const [notasRechazo, setNotasRechazo] = useState('');
  const [showRechazarForm, setShowRechazarForm] = useState(false);

  useEffect(() => {
    if (!token) return;
    apiClient.getPropuestaPublica(token)
      .then((res) => setPropuesta(res.data))
      .catch((err) => setError(err.message || 'Error cargando la propuesta'))
      .finally(() => setLoading(false));
  }, [token]);

  const handleAceptar = async () => {
    setActionLoading(true);
    try {
      await apiClient.aceptarPropuesta(token);
      setResult('aceptada');
    } catch (err: any) {
      setError(err.message || 'Error al aceptar');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRechazar = async () => {
    setActionLoading(true);
    try {
      await apiClient.rechazarPropuesta(token, notasRechazo);
      setResult('rechazada');
    } catch (err: any) {
      setError(err.message || 'Error al rechazar');
    } finally {
      setActionLoading(false);
    }
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(Number(val));

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  if (error || !propuesta) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-[20px] font-semibold text-gray-800">Propuesta no encontrada</h1>
          <p className="text-[14px] text-gray-500 mt-2">{error || 'El enlace puede haber expirado o no ser valido.'}</p>
        </div>
      </div>
    );
  }

  if (result === 'aceptada') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
          </div>
          <h1 className="text-[24px] font-bold text-gray-800">¡Propuesta aceptada!</h1>
          <p className="text-[15px] text-gray-500 mt-3">
            Gracias, {propuesta.clienteNombre}. Hemos recibido tu aceptacion y nos pondremos en contacto contigo pronto.
          </p>
        </div>
      </div>
    );
  }

  if (result === 'rechazada') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-10 h-10 text-gray-500" />
          </div>
          <h1 className="text-[24px] font-bold text-gray-800">Propuesta rechazada</h1>
          <p className="text-[15px] text-gray-500 mt-3">
            Gracias por tu tiempo. Si cambias de opinion, no dudes en contactarnos.
          </p>
        </div>
      </div>
    );
  }

  const canAct = propuesta.estado !== 'ACEPTADA' && propuesta.estado !== 'RECHAZADA' && !propuesta.expirada;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-1 rounded-md bg-violet-100 text-violet-700 text-[11px] font-bold uppercase tracking-wider">
                  Propuesta comercial
                </span>
                {propuesta.expirada && (
                  <span className="px-2.5 py-1 rounded-md bg-red-100 text-red-700 text-[11px] font-bold uppercase tracking-wider">
                    Expirada
                  </span>
                )}
                {propuesta.estado === 'ACEPTADA' && (
                  <span className="px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-700 text-[11px] font-bold uppercase tracking-wider">
                    Aceptada
                  </span>
                )}
              </div>
              <h1 className="text-[26px] font-bold text-gray-900">{propuesta.titulo}</h1>
              <p className="text-[14px] text-gray-500 mt-1">
                Para: <span className="font-medium text-gray-700">{propuesta.clienteNombre}</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-[12px] text-gray-400">Fecha: {formatDate(propuesta.createdAt)}</p>
              <p className="text-[12px] text-gray-400">Validez: {propuesta.validezDias} dias</p>
              {propuesta.expirada ? (
                <p className="text-[12px] text-red-500 font-medium mt-1">Expirada</p>
              ) : (
                <p className="text-[12px] text-gray-400">Expira: {formatDate(propuesta.fechaExpiracion)}</p>
              )}
            </div>
          </div>

          {propuesta.descripcion && (
            <p className="text-[14px] text-gray-600 mt-4 leading-relaxed">{propuesta.descripcion}</p>
          )}
        </div>

        {/* Servicios */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-4">
          <h2 className="text-[18px] font-bold text-gray-900 mb-6">Servicios incluidos</h2>
          <div className="space-y-4">
            {propuesta.items.map((item, i) => (
              <div key={i} className="flex items-start justify-between gap-4 py-4 border-b border-gray-100 last:border-0">
                <div className="flex-1">
                  <p className="text-[15px] font-semibold text-gray-800">{item.servicio}</p>
                  {item.descripcion && <p className="text-[13px] text-gray-500 mt-1">{item.descripcion}</p>}
                  <p className="text-[13px] text-gray-400 mt-1">
                    {item.cantidad} x {formatCurrency(item.precioUnitario)}
                  </p>
                </div>
                <p className="text-[15px] font-bold text-gray-800">{formatCurrency(item.cantidad * item.precioUnitario)}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex justify-between text-[14px] text-gray-600">
              <span>Subtotal</span>
              <span>{formatCurrency(propuesta.subtotal)}</span>
            </div>
            {propuesta.impuestos !== null && (
              <div className="flex justify-between text-[14px] text-gray-600 mt-2">
                <span>IVA (21%)</span>
                <span>{formatCurrency(propuesta.impuestos)}</span>
              </div>
            )}
            <div className="flex justify-between text-[22px] font-bold text-gray-900 mt-4 pt-4 border-t border-gray-200">
              <span>Total</span>
              <span>{formatCurrency(propuesta.total)}</span>
            </div>
          </div>
        </div>

        {/* Condiciones */}
        {propuesta.condiciones && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-4">
            <h2 className="text-[18px] font-bold text-gray-900 mb-4">Condiciones</h2>
            <p className="text-[14px] text-gray-600 whitespace-pre-wrap leading-relaxed">{propuesta.condiciones}</p>
          </div>
        )}

        {/* Actions */}
        {canAct && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            {!showRechazarForm ? (
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleAceptar}
                  disabled={actionLoading}
                  className="flex-1 py-3.5 bg-emerald-600 text-white rounded-xl text-[15px] font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                  Aceptar propuesta
                </button>
                <button
                  onClick={() => setShowRechazarForm(true)}
                  className="px-6 py-3.5 border border-gray-300 text-gray-600 rounded-xl text-[15px] font-semibold hover:bg-gray-50 transition-colors"
                >
                  Rechazar
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <textarea
                  value={notasRechazo}
                  onChange={(e) => setNotasRechazo(e.target.value)}
                  placeholder="¿Por que rechazas la propuesta? (opcional)"
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 text-[14px] focus:outline-none focus:ring-2 focus:ring-violet-500/30 resize-none"
                />
                <div className="flex gap-3">
                  <button
                    onClick={handleRechazar}
                    disabled={actionLoading}
                    className="px-6 py-2.5 bg-red-600 text-white rounded-xl text-[14px] font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
                  >
                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar rechazo'}
                  </button>
                  <button
                    onClick={() => setShowRechazarForm(false)}
                    className="px-6 py-2.5 border border-gray-300 text-gray-600 rounded-xl text-[14px] font-medium hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="text-center py-8">
          <div className="flex items-center justify-center gap-2 text-[12px] text-gray-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            Propuesta generada con CRM Maestro
          </div>
        </div>
      </div>
    </div>
  );
}
