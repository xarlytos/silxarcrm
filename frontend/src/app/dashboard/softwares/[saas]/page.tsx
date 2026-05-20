'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import { Cliente, Pagination } from '@/types';
import { formatCurrency } from '@/lib/utils';
import ClientTable from '@/components/dashboard/ClientTable';
import EventFeed from '@/components/dashboard/EventFeed';
import { Layers, ArrowLeft, CreditCard, Users, Activity, TrendingUp, ArrowUpRight, ArrowDownRight, Minus, RefreshCw, Plus } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  change?: number | null;
  icon: React.ReactNode;
}

function StatCard({ title, value, change, icon }: StatCardProps) {
  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[13px] font-medium text-[var(--text-tertiary)] mb-1">{title}</p>
          <p className="text-[28px] font-bold text-[var(--text-primary)] tracking-tight">{value}</p>
          {change !== undefined && change !== null ? (
            <div className={`flex items-center gap-1 mt-2 ${change >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              {change >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
              <span className="text-[13px] font-semibold">{Math.abs(change).toFixed(1)}%</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 mt-2 text-[var(--text-tertiary)]">
              <Minus className="w-4 h-4" />
              <span className="text-[13px]">Sin datos</span>
            </div>
          )}
        </div>
        <div className="w-12 h-12 rounded-xl bg-[var(--bg-tertiary)] flex items-center justify-center">
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function SaasDetailPage() {
  const params = useParams();
  const saas = params.saas as string;
  const [dashboard, setDashboard] = useState<any>(null);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, pages: 0 });
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);

    try {
      const [dashboardRes, clientesRes] = await Promise.all([
        apiClient.getDashboard(saas),
        apiClient.getClientes({ page: '1', saas }),
      ]);
      setDashboard(dashboardRes.data);
      setClientes(clientesRes.data.clientes);
      setPagination(clientesRes.data.pagination);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setRefreshing(false);
    }
  }, [saas]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const fetchClientes = useCallback((page = 1, search = '') => {
    const p: Record<string, string> = { page: String(page), saas };
    if (search) p.search = search;
    apiClient.getClientes(p)
      .then((res) => { setClientes(res.data.clientes); setPagination(res.data.pagination); })
      .catch(() => {});
  }, [saas]);

  return (
    <div className="space-y-8 w-full">
      {/* Breadcrumb & Back */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/softwares"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-tertiary)] transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-[14px] font-medium">Volver</span>
        </Link>
        <div className="h-6 w-px bg-[var(--border-primary)]" />
        <span className="text-[14px] text-[var(--text-tertiary)] capitalize">{saas}</span>
      </div>

      {/* Header */}
      <div className="flex items-end justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] flex items-center justify-center">
            <span className="text-[20px] font-bold text-[var(--text-primary)] uppercase">
              {saas.slice(0, 2)}
            </span>
          </div>
          <div>
            <h1 className="text-[32px] font-bold tracking-tight text-[var(--text-primary)] capitalize">
              {saas}
            </h1>
            <p className="text-[15px] text-[var(--text-secondary)]">
              Métricas y clientes de este software
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/softwares/${saas}/buscar-leads`}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl text-[14px] font-medium hover:shadow-lg hover:shadow-violet-500/25 transition-all"
          >
            <Plus className="w-4 h-4" />
            Obtener leads
          </Link>
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-tertiary)] transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
          <a
            href={`https://${saas}.com`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-tertiary)] transition-all"
          >
            <span className="text-[14px] font-medium">Visitar {saas}</span>
            <ArrowUpRight className="w-4 h-4" />
          </a>
        </div>
      </div>

      {dashboard && (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            <StatCard
              title="MRR"
              value={formatCurrency(dashboard.kpis.mrr)}
              change={dashboard.changes?.mrr ?? null}
              icon={<CreditCard className="w-6 h-6 text-violet-500" />}
            />
            <StatCard
              title="Clientes"
              value={String(dashboard.kpis.totalClients)}
              change={dashboard.changes?.clientes ?? null}
              icon={<Users className="w-6 h-6 text-blue-500" />}
            />
            <StatCard
              title="Suscripciones"
              value={String(dashboard.kpis.activeSubs)}
              change={dashboard.changes?.suscripciones ?? null}
              icon={<Layers className="w-6 h-6 text-amber-500" />}
            />
            <StatCard
              title="Churn Rate"
              value={`${dashboard.kpis.churnRate.toFixed(1)}%`}
              change={dashboard.changes?.churn ?? null}
              icon={<Activity className="w-6 h-6 text-rose-500" />}
            />
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2">
              <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl overflow-hidden">
                <div className="px-6 py-5 border-b border-[var(--border-primary)] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-[var(--text-tertiary)]" />
                    <h3 className="text-[16px] font-semibold text-[var(--text-primary)]">Clientes</h3>
                  </div>
                  <span className="text-[13px] text-[var(--text-tertiary)]">
                    {pagination.total} total
                  </span>
                </div>
                <ClientTable
                  clientes={clientes}
                  pagination={pagination}
                  onPageChange={(p) => fetchClientes(p)}
                  onSearch={(q) => fetchClientes(1, q)}
                />
              </div>
            </div>
            <div>
              <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl overflow-hidden">
                <div className="px-6 py-5 border-b border-[var(--border-primary)] flex items-center gap-3">
                  <TrendingUp className="w-5 h-5 text-[var(--text-tertiary)]" />
                  <h3 className="text-[16px] font-semibold text-[var(--text-primary)]">Actividad reciente</h3>
                </div>
                <EventFeed initialEvents={dashboard.recentEvents || []} maxHeight="550px" />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
