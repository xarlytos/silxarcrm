'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api';
import {
  ShoppingBag, Search, RefreshCw, ExternalLink, UserPlus, Star,
  Filter, Download, TrendingUp, BarChart3, CheckCircle, XCircle,
  AlertTriangle, Clock, Globe, ChevronDown, ChevronUp
} from 'lucide-react';

interface Opportunity {
  id: string;
  marketplace: string;
  title: string;
  description: string;
  url: string;
  category: string | null;
  rating: number | null;
  reviews: number | null;
  status: string;
  lead: { nombre: string } | null;
  createdAt: string;
}

interface Metrics {
  byMarketplace: Array<{ marketplace: string; _count: { id: number }; _avg: { rating: number | null } }>;
  byStatus: Array<{ status: string; _count: { id: number } }>;
  totalConverted: number;
}

const marketplaceColors: Record<string, string> = {
  shopify: 'bg-green-100 text-green-700',
  g2: 'bg-red-100 text-red-700',
  capterra: 'bg-blue-100 text-blue-700',
  hubspot: 'bg-orange-100 text-orange-700',
  wordpress: 'bg-indigo-100 text-indigo-700',
};

const marketplaceInitials: Record<string, string> = {
  shopify: 'Sh',
  g2: 'G2',
  capterra: 'Cp',
  hubspot: 'Hs',
  wordpress: 'Wp',
};

export default function MarketplacesPage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [monitoring, setMonitoring] = useState(false);
  const [softwareId, setSoftwareId] = useState('');
  const [softwares, setSoftwares] = useState<Array<{ id: string; nombre: string }>>([]);
  const [filterMarketplace, setFilterMarketplace] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    loadSoftwares();
  }, []);

  useEffect(() => {
    if (softwareId) {
      loadOpportunities();
      loadMetrics();
    }
  }, [softwareId, filterMarketplace, filterStatus]);

  async function loadSoftwares() {
    try {
      const res = await apiClient.getSoftwares();
      const list = res?.data || [];
      setSoftwares(list);
      if (list.length > 0) {
        setSoftwareId(list[0].id);
      } else {
        setLoading(false);
      }
    } catch {
      setLoading(false);
    }
  }

  async function loadOpportunities() {
    setLoading(true);
    try {
      const params: Record<string, string> = { softwareId };
      if (filterMarketplace) params.marketplace = filterMarketplace;
      if (filterStatus) params.status = filterStatus;

      const data = await apiClient.getMarketplaceOpportunities(params);
      setOpportunities(data || []);
    } catch {
      setOpportunities([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadMetrics() {
    try {
      const data = await apiClient.getMarketplaceMetrics(softwareId);
      setMetrics(data);
    } catch {
      setMetrics(null);
    }
  }

  async function handleMonitor() {
    setMonitoring(true);
    try {
      await apiClient.monitorMarketplaces(softwareId);
      await loadOpportunities();
      await loadMetrics();
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setMonitoring(false);
    }
  }

  async function handleConvert(id: string) {
    const nombre = prompt('Nombre del lead:');
    if (!nombre) return;

    try {
      await apiClient.convertMarketplaceOpportunity(id, {
        nombre,
        email: prompt('Email (opcional):') || undefined,
        telefono: prompt('Teléfono (opcional):') || undefined,
        empresa: prompt('Empresa (opcional):') || undefined,
      });
      await loadOpportunities();
      await loadMetrics();
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  }

  async function handleStatusChange(id: string, status: string) {
    // En producción, llamar a API para cambiar status
    await loadOpportunities();
  }

  const statusColors: Record<string, string> = {
    NEW: 'bg-yellow-100 text-yellow-700',
    CONTACTED: 'bg-blue-100 text-blue-700',
    CONVERTED: 'bg-green-100 text-green-700',
    DISMISSED: 'bg-gray-100 text-gray-700',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Marketplaces</h1>
          <p className="text-muted-foreground mt-1">
            Oportunidades detectadas en Shopify, G2, Capterra y más.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={softwareId}
            onChange={(e) => setSoftwareId(e.target.value)}
            className="px-3 py-2 rounded-lg border bg-card"
          >
            {softwares.map((s) => (
              <option key={s.id} value={s.id}>{s.nombre}</option>
            ))}
          </select>
          <button
            onClick={handleMonitor}
            disabled={monitoring}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${monitoring ? 'animate-spin' : ''}`} />
            {monitoring ? 'Escaneando...' : 'Escanear'}
          </button>
        </div>
      </div>

      {/* Métricas */}
      {metrics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl border bg-card">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total oportunidades</span>
              <Globe className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="mt-2 text-2xl font-bold">
              {metrics.byStatus.reduce((sum, s) => sum + s._count.id, 0)}
            </div>
          </div>
          <div className="p-4 rounded-xl border bg-card">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Convertidas</span>
              <CheckCircle className="w-4 h-4 text-green-500" />
            </div>
            <div className="mt-2 text-2xl font-bold">{metrics.totalConverted}</div>
          </div>
          <div className="p-4 rounded-xl border bg-card">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Marketplaces</span>
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="mt-2 text-2xl font-bold">{metrics.byMarketplace.length}</div>
          </div>
          <div className="p-4 rounded-xl border bg-card">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Rating medio</span>
              <Star className="w-4 h-4 text-yellow-500" />
            </div>
            <div className="mt-2 text-2xl font-bold">
              {(metrics.byMarketplace.reduce((sum, m) => sum + (m._avg.rating || 0), 0) /
                Math.max(metrics.byMarketplace.length, 1)).toFixed(1)}
            </div>
          </div>
        </div>
      )}

      {/* Distribución por marketplace */}
      {metrics?.byMarketplace && metrics.byMarketplace.length > 0 && (
        <div className="p-5 rounded-xl border bg-card">
          <h3 className="font-semibold mb-4">Distribución por marketplace</h3>
          <div className="flex flex-wrap gap-3">
            {metrics.byMarketplace.map((m) => (
              <div key={m.marketplace} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted">
                <span className="text-lg">{marketplaceInitials[m.marketplace] || 'Mp'}</span>
                <span className="text-sm font-medium capitalize">{m.marketplace}</span>
                <span className="text-sm text-muted-foreground">{m._count.id}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <select
            value={filterMarketplace}
            onChange={(e) => setFilterMarketplace(e.target.value)}
            className="px-3 py-1.5 rounded-lg border bg-card text-sm"
          >
            <option value="">Todos los marketplaces</option>
            <option value="shopify">Shopify</option>
            <option value="g2">G2</option>
            <option value="capterra">Capterra</option>
            <option value="wordpress">WordPress</option>
            <option value="hubspot">HubSpot</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-1.5 rounded-lg border bg-card text-sm"
          >
            <option value="">Todos los estados</option>
            <option value="NEW">Nuevo</option>
            <option value="CONTACTED">Contactado</option>
            <option value="CONVERTED">Convertido</option>
            <option value="DISMISSED">Descartado</option>
          </select>
        </div>
      </div>

      {/* Lista */}
      <div className="rounded-xl border bg-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Cargando oportunidades...</div>
        ) : opportunities.length === 0 ? (
          <div className="p-8 text-center">
            <ShoppingBag className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No hay oportunidades detectadas.</p>
            <button
              onClick={handleMonitor}
              className="mt-4 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm"
            >
              Escanear marketplaces
            </button>
          </div>
        ) : (
          <div className="divide-y">
            {opportunities.map((opp) => (
              <div key={opp.id} className="p-4 hover:bg-muted/30">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${marketplaceColors[opp.marketplace] || 'bg-gray-100'}`}>
                        {marketplaceInitials[opp.marketplace] || 'Mp'} {opp.marketplace}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[opp.status] || 'bg-gray-100'}`}>
                        {opp.status}
                      </span>
                      {opp.rating && (
                        <span className="flex items-center gap-1 text-xs">
                          <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                          {opp.rating}
                        </span>
                      )}
                      {opp.reviews && (
                        <span className="text-xs text-muted-foreground">({opp.reviews} reviews)</span>
                      )}
                    </div>
                    <h3 className="font-medium">{opp.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{opp.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Detectado: {new Date(opp.createdAt).toLocaleDateString('es-ES')}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => setExpandedId(expandedId === opp.id ? null : opp.id)}
                      className="p-2 rounded-lg border hover:bg-muted"
                    >
                      {expandedId === opp.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    <a
                      href={opp.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg border hover:bg-muted"
                      title="Ver en marketplace"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                    {opp.status === 'NEW' && (
                      <button
                        onClick={() => handleConvert(opp.id)}
                        className="flex items-center gap-1 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:opacity-90"
                      >
                        <UserPlus className="w-4 h-4" />
                        Convertir
                      </button>
                    )}
                  </div>
                </div>

                {expandedId === opp.id && (
                  <div className="mt-3 pt-3 border-t pl-4 space-y-2">
                    <p className="text-sm"><span className="font-medium">URL:</span> <a href={opp.url} target="_blank" className="text-primary hover:underline">{opp.url}</a></p>
                    {opp.category && <p className="text-sm"><span className="font-medium">Categoría:</span> {opp.category}</p>}
                    {opp.lead && <p className="text-sm"><span className="font-medium">Lead:</span> {opp.lead.nombre}</p>}
                    <div className="flex gap-2 mt-2">
                      {['NEW', 'CONTACTED', 'CONVERTED', 'DISMISSED'].map((s) => (
                        <button
                          key={s}
                          onClick={() => handleStatusChange(opp.id, s)}
                          className={`px-2 py-1 rounded text-xs ${opp.status === s ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
