'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { apiClient } from '@/lib/api';
import {
  ArrowLeft,
  FileText,
  Loader2,
  Send,
  Copy,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  Trash2,
  Euro,
} from 'lucide-react';

interface Propuesta {
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
  urlToken: string;
  enviadaAt: string | null;
  aceptadaAt: string | null;
  rechazadaAt: string | null;
  notasRechazo: string | null;
  createdAt: string;
}

export default function PropuestaDetallePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [propuesta, setPropuesta] = useState<Propuesta | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    apiClient.getPropuesta(id)
      .then((res) => setPropuesta(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const handleEnviar = async () => {
    if (!propuesta) return;
    setActionLoading(true);
    try {
      await apiClient.enviarPropuesta(propuesta.id);
      const res = await apiClient.getPropuesta(propuesta.id);
      setPropuesta(res.data);
    } catch (err: any) {
      alert(err.message || 'Error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (!propuesta) return;
    const url = `${window.location.origin}/propuesta/${propuesta.urlToken}`;
    navigator.clipboard.writeText(url);
  };

  const handleDelete = async () => {
    if (!propuesta) return;
    if (!confirm('¿Eliminar esta propuesta?')) return;
    setActionLoading(true);
    try {
      await apiClient.deletePropuesta(propuesta.id);
      router.push('/dashboard/propuestas');
    } catch (err: any) {
      alert(err.message || 'Error');
    } finally {
      setActionLoading(false);
    }
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(Number(val));

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  const estadoBadge = (estado: string) => {
    const map: Record<string, string> = {
      BORRADOR: 'bg-gray-100 text-gray-700',
      ENVIADA: 'bg-blue-50 text-blue-700',
      VISTA: 'bg-purple-50 text-purple-700',
      ACEPTADA: 'bg-emerald-50 text-emerald-700',
      RECHAZADA: 'bg-red-50 text-red-700',
      EXPIRADA: 'bg-amber-50 text-amber-700',
    };
    return map[estado] || map.BORRADOR;
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-20 flex flex-col items-center justify-center text-[var(--text-tertiary)]">
        <Loader2 className="w-6 h-6 animate-spin mb-3" />
        <span className="text-[14px]">Cargando propuesta...</span>
      </div>
    );
  }

  if (!propuesta) {
    return (
      <div className="max-w-4xl mx-auto py-20 flex flex-col items-center justify-center">
        <p className="text-[15px] text-[var(--text-secondary)]">Propuesta no encontrada</p>
        <button onClick={() => router.push('/dashboard/propuestas')} className="mt-4 text-violet-500 text-[13px]">Volver</button>
      </div>
    );
  }

  const isDraft = propuesta.estado === 'BORRADOR';
  const publicUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/propuesta/${propuesta.urlToken}`;

  return (
    <div className="max-w-4xl mx-auto py-6 px-4">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.push('/dashboard/propuestas')} className="p-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] hover:border-violet-500/30 transition-colors">
          <ArrowLeft className="w-4 h-4 text-[var(--text-secondary)]" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-[22px] font-semibold text-[var(--text-primary)]">{propuesta.titulo}</h1>
            <span className={`px-2.5 py-0.5 rounded-md text-[12px] font-medium ${estadoBadge(propuesta.estado)}`}>
              {propuesta.estado}
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        {isDraft && (
          <button onClick={handleEnviar} disabled={actionLoading} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-[13px] font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2">
            {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Marcar como enviada
          </button>
        )}
        {!isDraft && (
          <button onClick={handleCopyLink} className="px-4 py-2 bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-secondary)] rounded-xl text-[13px] font-medium hover:text-[var(--text-primary)] transition-colors flex items-center gap-2">
            <Copy className="w-4 h-4" />
            Copiar enlace
          </button>
        )}
        <button onClick={() => router.push(`/propuesta/${propuesta.urlToken}`)} className="px-4 py-2 bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-secondary)] rounded-xl text-[13px] font-medium hover:text-[var(--text-primary)] transition-colors flex items-center gap-2">
          <ExternalLink className="w-4 h-4" />
          Ver publica
        </button>
        <button onClick={handleDelete} disabled={actionLoading} className="px-4 py-2 bg-red-50 border border-red-200 text-red-600 rounded-xl text-[13px] font-medium hover:bg-red-100 disabled:opacity-50 transition-colors flex items-center gap-2">
          <Trash2 className="w-4 h-4" />
          Eliminar
        </button>
      </div>

      {/* Content */}
      <div className="space-y-4">
        {/* Cliente */}
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl p-5">
          <h2 className="text-[15px] font-semibold text-[var(--text-primary)] mb-3">Cliente</h2>
          <p className="text-[14px] text-[var(--text-primary)] font-medium">{propuesta.clienteNombre}</p>
          {propuesta.clienteEmail && <p className="text-[13px] text-[var(--text-tertiary)] mt-0.5">{propuesta.clienteEmail}</p>}
        </div>

        {/* Servicios */}
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl p-5">
          <h2 className="text-[15px] font-semibold text-[var(--text-primary)] mb-4">Servicios</h2>
          <div className="space-y-3">
            {propuesta.items.map((item, i) => (
              <div key={i} className="flex items-start justify-between gap-4 py-3 border-b border-[var(--border-primary)] last:border-0">
                <div className="flex-1">
                  <p className="text-[14px] font-medium text-[var(--text-primary)]">{item.servicio}</p>
                  {item.descripcion && <p className="text-[12px] text-[var(--text-tertiary)] mt-0.5">{item.descripcion}</p>}
                  <p className="text-[12px] text-[var(--text-secondary)] mt-1">{item.cantidad} x {formatCurrency(item.precioUnitario)}</p>
                </div>
                <p className="text-[14px] font-semibold text-[var(--text-primary)]">{formatCurrency(item.cantidad * item.precioUnitario)}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-[var(--border-primary)]">
            <div className="flex justify-between text-[13px] text-[var(--text-secondary)]">
              <span>Subtotal</span>
              <span>{formatCurrency(propuesta.subtotal)}</span>
            </div>
            {propuesta.impuestos !== null && (
              <div className="flex justify-between text-[13px] text-[var(--text-secondary)] mt-1">
                <span>IVA (21%)</span>
                <span>{formatCurrency(propuesta.impuestos)}</span>
              </div>
            )}
            <div className="flex justify-between text-[18px] font-bold text-[var(--text-primary)] mt-3 pt-3 border-t border-[var(--border-primary)]">
              <span>Total</span>
              <span>{formatCurrency(propuesta.total)}</span>
            </div>
          </div>
        </div>

        {/* Condiciones */}
        {propuesta.condiciones && (
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl p-5">
            <h2 className="text-[15px] font-semibold text-[var(--text-primary)] mb-2">Condiciones</h2>
            <p className="text-[13px] text-[var(--text-secondary)] whitespace-pre-wrap">{propuesta.condiciones}</p>
          </div>
        )}

        {/* Fechas */}
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl p-5">
          <h2 className="text-[15px] font-semibold text-[var(--text-primary)] mb-3">Historial</h2>
          <div className="space-y-2 text-[13px]">
            <div className="flex items-center gap-2 text-[var(--text-secondary)]">
              <Clock className="w-3.5 h-3.5" />
              Creada: {formatDate(propuesta.createdAt)}
            </div>
            {propuesta.enviadaAt && (
              <div className="flex items-center gap-2 text-blue-600">
                <Send className="w-3.5 h-3.5" />
                Enviada: {formatDate(propuesta.enviadaAt)}
              </div>
            )}
            {propuesta.aceptadaAt && (
              <div className="flex items-center gap-2 text-emerald-600">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Aceptada: {formatDate(propuesta.aceptadaAt)}
              </div>
            )}
            {propuesta.rechazadaAt && (
              <div className="flex items-center gap-2 text-red-600">
                <XCircle className="w-3.5 h-3.5" />
                Rechazada: {formatDate(propuesta.rechazadaAt)}
                {propuesta.notasRechazo && <span className="text-[var(--text-tertiary)]">— {propuesta.notasRechazo}</span>}
              </div>
            )}
          </div>
        </div>

        {/* Link */}
        {!isDraft && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
            <h2 className="text-[14px] font-semibold text-blue-800 mb-2">Enlace publico</h2>
            <p className="text-[13px] text-blue-700 mb-2">Comparte este enlace con el cliente para que vea la propuesta.</p>
            <div className="flex gap-2">
              <input readOnly value={publicUrl} className="flex-1 px-3 py-2 rounded-lg border border-blue-200 bg-white text-[13px] text-blue-800" />
              <button onClick={handleCopyLink} className="px-3 py-2 bg-blue-600 text-white rounded-lg text-[13px] font-medium hover:bg-blue-700 transition-colors">
                Copiar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
