'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import { Cliente } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ArrowLeft, User, CreditCard, Calendar, Clock, CheckCircle2, XCircle, AlertCircle, Package, Activity, RefreshCw } from 'lucide-react';

export default function ClienteDetailPage() {
  const params = useParams();
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await apiClient.getCliente(parseInt(params.id as string));
      setCliente(res.data);
    } catch (error) {
      console.error('Error fetching cliente:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-[var(--border-primary)] border-t-[var(--text-primary)] rounded-full animate-spin" />
          <span className="text-[var(--text-tertiary)]">Cargando cliente...</span>
        </div>
      </div>
    );
  }

  if (!cliente) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <User className="w-16 h-16 text-[var(--text-tertiary)] mx-auto mb-4" />
          <p className="text-[18px] font-medium text-[var(--text-primary)]">Cliente no encontrado</p>
        </div>
      </div>
    );
  }

  const totalPagado = cliente.pagos?.reduce((sum, p) => sum + Number(p.monto), 0) || 0;
  const ultimoPago = cliente.pagos?.[0];

  return (
    <div className="space-y-8 w-full">
      {/* Breadcrumb */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-tertiary)] transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-[14px] font-medium">Volver</span>
          </Link>
          <div className="h-6 w-px bg-[var(--border-primary)]" />
          <span className="text-[14px] text-[var(--text-tertiary)]">{cliente.nombre}</span>
        </div>
        <button
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-tertiary)] transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      {/* Header Card */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl p-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[var(--text-primary)] to-[var(--text-secondary)] flex items-center justify-center text-[var(--bg-primary)] text-[28px] font-bold">
              {cliente.nombre.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-[32px] font-bold tracking-tight text-[var(--text-primary)]">
                {cliente.nombre}
              </h1>
              <p className="text-[16px] text-[var(--text-secondary)]">{cliente.email}</p>
              <div className="flex items-center gap-2 mt-3">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-semibold ${
                  cliente.estado === 'activo'
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                }`}>
                  {cliente.estado === 'activo' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                  {cliente.estado}
                </span>
                <span className="px-3 py-1.5 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-secondary)] text-[13px] font-medium capitalize">
                  {cliente.origenSaas}
                </span>
                {cliente.pais && (
                  <span className="px-3 py-1.5 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] text-[13px]">
                    {cliente.pais}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-[13px] font-medium text-[var(--text-tertiary)] mb-1">Total pagado</p>
              <p className="text-[32px] font-bold text-[var(--text-primary)] font-mono tracking-tight">
                {formatCurrency(totalPagado)}
              </p>
            </div>
            <div className="h-12 w-px bg-[var(--border-primary)]" />
            <div className="text-right">
              <p className="text-[13px] font-medium text-[var(--text-tertiary)] mb-1">Cliente desde</p>
              <p className="text-[18px] font-semibold text-[var(--text-primary)]">
                {formatDate(cliente.fechaRegistro)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <Package className="w-4 h-4 text-[var(--text-tertiary)]" />
            <span className="text-[13px] text-[var(--text-tertiary)]">Suscripciones</span>
          </div>
          <p className="text-[24px] font-bold text-[var(--text-primary)]">
            {cliente.suscripciones?.length || 0}
          </p>
        </div>

        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <CreditCard className="w-4 h-4 text-[var(--text-tertiary)]" />
            <span className="text-[13px] text-[var(--text-tertiary)]">Pagos</span>
          </div>
          <p className="text-[24px] font-bold text-[var(--text-primary)]">
            {cliente.pagos?.length || 0}
          </p>
        </div>

        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <Activity className="w-4 h-4 text-[var(--text-tertiary)]" />
            <span className="text-[13px] text-[var(--text-tertiary)]">Eventos</span>
          </div>
          <p className="text-[24px] font-bold text-[var(--text-primary)]">
            {cliente.eventos?.length || 0}
          </p>
        </div>

        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="w-4 h-4 text-[var(--text-tertiary)]" />
            <span className="text-[13px] text-[var(--text-tertiary)]">Último pago</span>
          </div>
          <p className="text-[18px] font-bold text-[var(--text-primary)]">
            {ultimoPago ? formatDate(ultimoPago.fechaPago) : 'N/A'}
          </p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Subscriptions */}
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl overflow-hidden">
          <div className="px-6 py-5 border-b border-[var(--border-primary)] flex items-center gap-3">
            <Package className="w-5 h-5 text-[var(--text-tertiary)]" />
            <h3 className="text-[16px] font-semibold text-[var(--text-primary)]">Suscripciones</h3>
          </div>
          <div className="divide-y divide-[var(--border-primary)]">
            {(cliente.suscripciones?.length ?? 0) > 0 ? (
              cliente.suscripciones?.map((sub) => (
                <div key={sub.id} className="px-6 py-5">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-[16px] font-semibold text-[var(--text-primary)] capitalize">
                        {sub.planTipo}
                      </p>
                      <p className="text-[13px] text-[var(--text-tertiary)] capitalize">
                        {sub.saas}
                      </p>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold ${
                      sub.estado === 'activa'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                        : sub.estado === 'trial'
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {sub.estado === 'activa' && <CheckCircle2 className="w-3 h-3" />}
                      {sub.estado === 'trial' && <Clock className="w-3 h-3" />}
                      {sub.estado === 'cancelada' && <XCircle className="w-3 h-3" />}
                      {sub.estado}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-3">
                    <div className="flex items-center gap-2 text-[13px] text-[var(--text-secondary)]">
                      <Calendar className="w-4 h-4" />
                      Desde {formatDate(sub.fechaInicio)}
                    </div>
                    <div className="flex-1" />
                    <p className="text-[18px] font-bold text-[var(--text-primary)] font-mono">
                      {formatCurrency(Number(sub.monto))}
                      <span className="text-[13px] font-normal text-[var(--text-tertiary)]">/mes</span>
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-6 py-12 text-center">
                <Package className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-3" />
                <p className="text-[var(--text-secondary)]">Sin suscripciones</p>
              </div>
            )}
          </div>
        </div>

        {/* Payments */}
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl overflow-hidden">
          <div className="px-6 py-5 border-b border-[var(--border-primary)] flex items-center gap-3">
            <CreditCard className="w-5 h-5 text-[var(--text-tertiary)]" />
            <h3 className="text-[16px] font-semibold text-[var(--text-primary)]">Historial de pagos</h3>
          </div>
          <div className="divide-y divide-[var(--border-primary)] max-h-[400px] overflow-y-auto">
            {(cliente.pagos?.length ?? 0) > 0 ? (
              cliente.pagos?.map((pago) => (
                <div key={pago.id} className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      pago.estado === 'completado'
                        ? 'bg-emerald-100 dark:bg-emerald-900/30'
                        : 'bg-red-100 dark:bg-red-900/30'
                    }`}>
                      {pago.estado === 'completado' ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-600" />
                      )}
                    </div>
                    <div>
                      <p className="text-[15px] font-semibold text-[var(--text-primary)] font-mono">
                        {formatCurrency(Number(pago.monto))}
                      </p>
                      <p className="text-[12px] text-[var(--text-tertiary)]">
                        {formatDate(pago.fechaPago)}
                      </p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-[12px] font-semibold ${
                    pago.estado === 'completado'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  }`}>
                    {pago.estado}
                  </span>
                </div>
              ))
            ) : (
              <div className="px-6 py-12 text-center">
                <CreditCard className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-3" />
                <p className="text-[var(--text-secondary)]">Sin pagos registrados</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-[var(--border-primary)] flex items-center gap-3">
          <Clock className="w-5 h-5 text-[var(--text-tertiary)]" />
          <h3 className="text-[16px] font-semibold text-[var(--text-primary)]">Timeline de actividad</h3>
        </div>
        <div className="divide-y divide-[var(--border-primary)] max-h-[400px] overflow-y-auto">
          {(cliente.eventos?.length ?? 0) > 0 ? (
            cliente.eventos?.map((event, index) => (
              <div key={event.id} className="px-6 py-4 flex items-center gap-4">
                <div className={`w-2 h-2 rounded-full ${
                  event.severidad === 'critico' ? 'bg-red-500' : 'bg-blue-500'
                }`} />
                <div className="flex-1">
                  <p className="text-[15px] font-medium text-[var(--text-primary)] capitalize">
                    {event.tipo.replace(/_/g, ' ')}
                  </p>
                  {(event as any).descripcion && (
                    <p className="text-[13px] text-[var(--text-secondary)]">{(event as any).descripcion}</p>
                  )}
                </div>
                <span className="text-[13px] text-[var(--text-tertiary)]">
                  {formatDate(event.fecha)}
                </span>
              </div>
            ))
          ) : (
            <div className="px-6 py-12 text-center">
              <Clock className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-3" />
              <p className="text-[var(--text-secondary)]">Sin eventos registrados</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
