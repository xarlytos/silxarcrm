'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import {
  Bell,
  Filter,
  AlertCircle,
  UserPlus,
  CreditCard,
  XCircle,
  TrendingUp,
  RefreshCw
} from 'lucide-react';

// Botones de filtro para tipos
const tipoFilters = [
  { value: '', label: 'Todos', icon: <Filter className="w-4 h-4" /> },
  { value: 'pago_exitoso', label: 'Pagos', icon: <CreditCard className="w-4 h-4" /> },
  { value: 'nuevo_registro', label: 'Registros', icon: <UserPlus className="w-4 h-4" /> },
  { value: 'cancelacion', label: 'Bajas', icon: <XCircle className="w-4 h-4" /> },
  { value: 'upgrade_plan', label: 'Upgrades', icon: <TrendingUp className="w-4 h-4" /> },
];

export default function EventosPage() {
  const [filter, setFilter] = useState({ tipo: '', severidad: '' });
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await apiClient.getDashboard();
      setData(res.data);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Datos calculados
  const recentEvents = data?.recentEvents || [];
  const eventosHoy = recentEvents.length;
  const pagosExitosos = recentEvents.filter((e: any) => e.tipo === 'pago_exitoso').length;
  const nuevosRegistros = recentEvents.filter((e: any) => e.tipo === 'nuevo_registro').length;
  const cancelaciones = recentEvents.filter((e: any) => e.tipo === 'cancelacion').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-[var(--border-primary)] border-t-[var(--text-primary)] rounded-full animate-spin" />
          <span className="text-[var(--text-tertiary)]">Cargando eventos...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 w-full">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Bell className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <h1 className="text-[32px] font-bold tracking-tight text-[var(--text-primary)]">
              Eventos
            </h1>
          </div>
          <p className="text-[15px] text-[var(--text-secondary)]">
            Feed de actividad en tiempo real de todos los softwares
          </p>
        </div>
        <button
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl text-[14px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-tertiary)] transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[13px] text-[var(--text-tertiary)]">Hoy</span>
            <Bell className="w-4 h-4 text-[var(--text-tertiary)]" />
          </div>
          <p className="text-[24px] font-bold text-[var(--text-primary)]">{eventosHoy}</p>
          <p className="text-[12px] text-[var(--text-tertiary)]">eventos</p>
        </div>

        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[13px] text-[var(--text-tertiary)]">Pagos</span>
            <CreditCard className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-[24px] font-bold text-emerald-600">{pagosExitosos}</p>
          <p className="text-[12px] text-[var(--text-tertiary)]">exitosos</p>
        </div>

        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[13px] text-[var(--text-tertiary)]">Registros</span>
            <UserPlus className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-[24px] font-bold text-blue-600">{nuevosRegistros}</p>
          <p className="text-[12px] text-[var(--text-tertiary)]">nuevos</p>
        </div>

        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[13px] text-[var(--text-tertiary)]">Bajas</span>
            <XCircle className="w-4 h-4 text-red-500" />
          </div>
          <p className="text-[24px] font-bold text-red-600">{cancelaciones}</p>
          <p className="text-[12px] text-[var(--text-tertiary)]">cancelaciones</p>
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[13px] text-[var(--text-tertiary)] mr-2">Filtrar por:</span>
        {tipoFilters.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(prev => ({ ...prev, tipo: f.value }))}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-medium transition-all ${
              filter.tipo === f.value
                ? 'bg-[var(--text-primary)] text-[var(--bg-primary)] shadow-md'
                : 'bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-tertiary)]'
            }`}
          >
            {f.icon}
            {f.label}
          </button>
        ))}

        <div className="h-6 w-px bg-[var(--border-primary)] mx-2" />

        <button
          onClick={() => setFilter(prev => ({ ...prev, severidad: prev.severidad === 'critico' ? '' : 'critico' }))}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-medium transition-all ${
            filter.severidad === 'critico'
              ? 'bg-red-500 text-white shadow-md'
              : 'bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-secondary)] hover:text-red-500 hover:border-red-200'
          }`}
        >
          <AlertCircle className="w-4 h-4" />
          Solo críticos
        </button>
      </div>

      {/* Events List */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--border-primary)] flex items-center justify-between">
          <h3 className="text-[16px] font-semibold text-[var(--text-primary)]">
            Actividad reciente
          </h3>
          <span className="text-[13px] text-[var(--text-tertiary)]">
            {recentEvents.length} eventos totales
          </span>
        </div>

        {recentEvents.length > 0 ? (
          <div className="divide-y divide-[var(--border-primary)]">
            {recentEvents.map((event: any) => (
              <div key={event.id} className="px-6 py-4 flex items-center gap-4">
                <div className={`w-2 h-2 rounded-full ${
                  event.severidad === 'critico' ? 'bg-red-500' : 'bg-blue-500'
                }`} />
                <div className="flex-1">
                  <p className="text-[15px] font-medium text-[var(--text-primary)] capitalize">
                    {event.tipo?.replace(/_/g, ' ')}
                  </p>
                  {event.descripcion && (
                    <p className="text-[13px] text-[var(--text-secondary)]">{event.descripcion}</p>
                  )}
                </div>
                <span className="text-[13px] text-[var(--text-tertiary)]">
                  {formatDate(event.fecha)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[var(--bg-tertiary)] mx-auto mb-4 flex items-center justify-center">
              <Bell className="w-8 h-8 text-[var(--text-tertiary)]" />
            </div>
            <p className="text-[16px] font-medium text-[var(--text-secondary)] mb-1">No hay eventos</p>
            <p className="text-[14px] text-[var(--text-tertiary)]">Los eventos aparecerán cuando los softwares envíen datos</p>
          </div>
        )}
      </div>
    </div>
  );
}
