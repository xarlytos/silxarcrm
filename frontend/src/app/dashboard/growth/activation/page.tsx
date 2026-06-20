'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api';
import {
  Zap,
  Settings,
  Play,
  Eye,
  Flame,
  Thermometer,
  Snowflake,
  Mail,
  MessageCircle,
  Phone,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Users,
  Activity,
} from 'lucide-react';

interface ActivationConfig {
  autoActivate: boolean;
  activationChannel: string;
}

interface ActivationStats {
  total: number;
  executed: number;
  failed: number;
  pending: number;
  byCategory: { hot: number; warm: number; cold: number };
  successRate: number;
}

interface ActivationLog {
  id: string;
  leadId: string;
  action: string;
  status: 'PENDING' | 'EXECUTED' | 'FAILED' | 'CANCELLED';
  scheduledAt: string;
  executedAt: string | null;
  error: string | null;
  createdAt: string;
  lead?: { nombre: string; email: string | null; empresa: string | null };
}

interface ActivatedLead {
  id: string;
  nombre: string;
  email: string | null;
  telefono: string | null;
  empresa: string | null;
  estado: string;
  metadata: any;
  createdAt: string;
}

interface PreviewResult {
  leadId: string;
  score: number;
  category: 'HOT' | 'WARM' | 'COLD';
  actions: string[];
  message: string;
}

const actionLabels: Record<string, { label: string; icon: any; color: string }> = {
  email_welcome: { label: 'Email de bienvenida', icon: Mail, color: 'text-blue-500' },
  whatsapp_followup: { label: 'WhatsApp seguimiento', icon: MessageCircle, color: 'text-green-500' },
  whatsapp_warm: { label: 'WhatsApp nurturing', icon: MessageCircle, color: 'text-green-500' },
  ai_call: { label: 'Llamada IA', icon: Phone, color: 'text-purple-500' },
  drip_warm_1: { label: 'Drip email #1', icon: Mail, color: 'text-blue-400' },
  drip_warm_2: { label: 'Drip email #2', icon: Mail, color: 'text-blue-400' },
  drip_warm_3: { label: 'Drip email #3', icon: Mail, color: 'text-blue-400' },
  drip_cold_1: { label: 'Drip nurturing #1', icon: Mail, color: 'text-gray-400' },
  drip_cold_2: { label: 'Drip nurturing #2', icon: Mail, color: 'text-gray-400' },
  reengagement: { label: 'Re-engagement', icon: RefreshCw, color: 'text-orange-500' },
  resurreccion_whatsapp: { label: 'Resurrección WhatsApp', icon: MessageCircle, color: 'text-fuchsia-500' },
  resurreccion_email: { label: 'Resurrección Email', icon: Mail, color: 'text-fuchsia-500' },
};

export default function ActivationPage() {
  const [softwareId, setSoftwareId] = useState('');
  const [softwares, setSoftwares] = useState<Array<{ id: string; nombre: string }>>([]);
  const [config, setConfig] = useState<ActivationConfig>({ autoActivate: true, activationChannel: 'email' });
  const [stats, setStats] = useState<ActivationStats | null>(null);
  const [logs, setLogs] = useState<ActivationLog[]>([]);
  const [recentLeads, setRecentLeads] = useState<ActivatedLead[]>([]);
  const [previewLeadId, setPreviewLeadId] = useState('');
  const [previewResult, setPreviewResult] = useState<PreviewResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  useEffect(() => {
    loadSoftwares();
  }, []);

  useEffect(() => {
    if (softwareId) {
      loadData();
    }
  }, [softwareId]);

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
      setSoftwares([]);
      setLoading(false);
    }
  }

  async function loadData() {
    setLoading(true);
    try {
      const [cfg, st, lg, rl] = await Promise.all([
        apiClient.getGrowthActivation(softwareId).catch(() => ({ autoActivate: true, activationChannel: 'email' })),
        apiClient.getActivationStats(softwareId, 30).catch(() => null),
        apiClient.getActivationLogs(softwareId, { limit: '20' }).catch(() => []),
        apiClient.getRecentActivatedLeads(softwareId, 10).catch(() => []),
      ]);
      setConfig(cfg);
      setStats(st);
      setLogs(lg);
      setRecentLeads(rl);
    } catch {
      // error silencioso
    } finally {
      setLoading(false);
    }
  }

  async function saveConfig() {
    setSaving(true);
    try {
      await apiClient.updateGrowthActivation(softwareId, config);
    } catch (err) {
      alert('Error guardando configuración: ' + (err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function runPreview() {
    if (!previewLeadId.trim()) return;
    try {
      const result = await apiClient.previewActivation(previewLeadId.trim());
      setPreviewResult(result);
    } catch (err) {
      alert('Error en preview: ' + (err as Error).message);
    }
  }

  async function forceActivate(leadId: string) {
    if (!confirm('¿Activar secuencia para este lead ahora?')) return;
    try {
      await apiClient.activateLead(leadId);
      await loadData();
    } catch (err) {
      alert('Error activando: ' + (err as Error).message);
    }
  }

  async function processPending() {
    setProcessing(true);
    try {
      const result = await apiClient.processPendingActivations();
      alert(`Procesado: ${result.processed} ejecutadas, ${result.failed} fallidas`);
      await loadData();
    } catch (err) {
      alert('Error: ' + (err as Error).message);
    } finally {
      setProcessing(false);
    }
  }

  function getCategoryColor(category: string) {
    switch (category) {
      case 'HOT': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'WARM': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'COLD': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      default: return 'bg-gray-500/10 text-gray-500';
    }
  }

  function getCategoryIcon(category: string) {
    switch (category) {
      case 'HOT': return Flame;
      case 'WARM': return Thermometer;
      case 'COLD': return Snowflake;
      default: return Activity;
    }
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case 'EXECUTED': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'FAILED': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'PENDING': return <Clock className="w-4 h-4 text-amber-500" />;
      case 'CANCELLED': return <AlertTriangle className="w-4 h-4 text-gray-400" />;
      default: return null;
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="w-6 h-6 text-yellow-500" />
            Activación Automática
          </h1>
          <p className="text-muted-foreground mt-1">
            El Loop de Oro: califica leads con IA y activa secuencias automáticas
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
            onClick={loadData}
            className="p-2 rounded-lg border hover:bg-muted transition-colors"
            title="Recargar"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Configuración */}
      <div className="p-5 rounded-xl border bg-card">
        <h2 className="font-semibold flex items-center gap-2 mb-4">
          <Settings className="w-4 h-4" />
          Configuración del Loop de Oro
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label className="flex items-center gap-3 p-4 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors">
            <input
              type="checkbox"
              checked={config.autoActivate}
              onChange={(e) => setConfig({ ...config, autoActivate: e.target.checked })}
              className="w-5 h-5 rounded"
            />
            <div>
              <div className="font-medium">Activación automática</div>
              <div className="text-xs text-muted-foreground">
                Calificar y activar leads inbound automáticamente
              </div>
            </div>
          </label>

          <div className="p-4 rounded-lg border">
            <div className="text-sm font-medium mb-2">Canal principal</div>
            <select
              value={config.activationChannel}
              onChange={(e) => setConfig({ ...config, activationChannel: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border bg-card text-sm"
            >
              <option value="email">Email (bienvenida + drip)</option>
              <option value="whatsapp">WhatsApp (prioridad mensajería)</option>
              <option value="llamada">Llamada IA (agresivo)</option>
            </select>
            <div className="text-xs text-muted-foreground mt-1">
              Define el canal principal para leads HOT
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={saveConfig}
              disabled={saving}
              className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar configuración'}
            </button>
            <button
              onClick={processPending}
              disabled={processing}
              className="flex-1 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
            >
              {processing ? 'Procesando...' : 'Ejecutar pendientes'}
            </button>
          </div>
        </div>
      </div>

      {/* KPIs */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard title="Total activaciones" value={stats.total} icon={Activity} color="text-blue-500" />
          <KpiCard title="Ejecutadas" value={stats.executed} icon={CheckCircle} color="text-green-500" />
          <KpiCard title="Pendientes" value={stats.pending} icon={Clock} color="text-amber-500" />
          <KpiCard title="Tasa éxito" value={`${stats.successRate}%`} icon={BarChart3} color="text-purple-500" />
        </div>
      )}

      {/* Categorías */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <CategoryCard
            category="HOT"
            count={stats.byCategory.hot}
            description="Score ≥ 80. Email + WhatsApp + Llamada IA"
            icon={Flame}
            color="red"
          />
          <CategoryCard
            category="WARM"
            count={stats.byCategory.warm}
            description="Score 50-79. Drip 3 emails + WhatsApp día 3"
            icon={Thermometer}
            color="amber"
          />
          <CategoryCard
            category="COLD"
            count={stats.byCategory.cold}
            description="Score &lt; 50. Drip lento + re-engagement 30d"
            icon={Snowflake}
            color="blue"
          />
        </div>
      )}

      {/* Preview / Simulación */}
      <div className="p-5 rounded-xl border bg-card">
        <h2 className="font-semibold flex items-center gap-2 mb-4">
          <Eye className="w-4 h-4" />
          Simular activación
        </h2>
        <div className="flex gap-3">
          <input
            type="text"
            value={previewLeadId}
            onChange={(e) => setPreviewLeadId(e.target.value)}
            placeholder="ID del lead a simular"
            className="flex-1 px-3 py-2 rounded-lg border bg-card"
          />
          <button
            onClick={runPreview}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Eye className="w-4 h-4 inline mr-1" />
            Preview
          </button>
        </div>

        {previewResult && (
          <div className="mt-4 p-4 rounded-lg border bg-muted/30">
            <div className="flex items-center gap-3 mb-3">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getCategoryColor(previewResult.category)}`}>
                {previewResult.category}
              </span>
              <span className="text-lg font-bold">{previewResult.score}/100</span>
              <span className="text-sm text-muted-foreground">{previewResult.message}</span>
            </div>
            <div className="space-y-2">
              {previewResult.actions.map((action, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <Play className="w-3 h-3 text-primary" />
                  {action}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leads recientes activados */}
        <div className="p-5 rounded-xl border bg-card">
          <h2 className="font-semibold flex items-center gap-2 mb-4">
            <Users className="w-4 h-4" />
            Leads recientes activados
          </h2>
          {recentLeads.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No hay leads activados recientemente
            </div>
          ) : (
            <div className="space-y-2">
              {recentLeads.map((lead) => {
                const category = lead.metadata?.growthCategory;
                const score = lead.metadata?.growthScore;
                const CatIcon = getCategoryIcon(category);

                return (
                  <div key={lead.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{lead.nombre}</div>
                      <div className="text-xs text-muted-foreground">
                        {lead.empresa || lead.email || 'Sin empresa/email'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {category && (
                        <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${getCategoryColor(category)}`}>
                          <CatIcon className="w-3 h-3" />
                          {score}
                        </span>
                      )}
                      <button
                        onClick={() => forceActivate(lead.id)}
                        className="p-1.5 rounded hover:bg-primary/10 text-primary transition-colors"
                        title="Forzar activación"
                      >
                        <Play className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Logs de activación */}
        <div className="p-5 rounded-xl border bg-card">
          <h2 className="font-semibold flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4" />
            Log de activaciones
          </h2>
          {logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No hay logs de activación
            </div>
          ) : (
            <div className="space-y-1 max-h-[400px] overflow-y-auto">
              {logs.map((log) => {
                const actionInfo = actionLabels[log.action] || { label: log.action, icon: Activity, color: 'text-gray-500' };
                const ActionIcon = actionInfo.icon;
                const isExpanded = expandedLog === log.id;

                return (
                  <div key={log.id} className="border rounded-lg overflow-hidden">
                    <button
                      onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                      className="w-full flex items-center justify-between p-3 hover:bg-muted/30 transition-colors text-left"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {getStatusIcon(log.status)}
                        <ActionIcon className={`w-4 h-4 ${actionInfo.color} flex-shrink-0`} />
                        <span className="text-sm font-medium truncate">{actionInfo.label}</span>
                        {log.lead && (
                          <span className="text-xs text-muted-foreground truncate">
                            — {log.lead.nombre}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-muted-foreground">
                          {new Date(log.createdAt).toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="px-3 pb-3 text-xs space-y-1 border-t bg-muted/20">
                        <div className="pt-2"><strong>Lead ID:</strong> {log.leadId}</div>
                        {log.scheduledAt && (
                          <div><strong>Programado:</strong> {new Date(log.scheduledAt).toLocaleString('es-ES')}</div>
                        )}
                        {log.executedAt && (
                          <div><strong>Ejecutado:</strong> {new Date(log.executedAt).toLocaleString('es-ES')}</div>
                        )}
                        {log.error && (
                          <div className="text-red-500"><strong>Error:</strong> {log.error}</div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function KpiCard({ title, value, icon: Icon, color }: { title: string; value: string | number; icon: any; color: string }) {
  return (
    <div className="p-4 rounded-xl border bg-card">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{title}</span>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <div className="mt-2">
        <span className="text-2xl font-bold">{value}</span>
      </div>
    </div>
  );
}

function CategoryCard({
  category,
  count,
  description,
  icon: Icon,
  color,
}: {
  category: string;
  count: number;
  description: string;
  icon: any;
  color: string;
}) {
  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    red: { bg: 'bg-red-500/10', text: 'text-red-500', border: 'border-red-500/20' },
    amber: { bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-500/20' },
    blue: { bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500/20' },
  };
  const c = colorMap[color];

  return (
    <div className={`p-4 rounded-xl border ${c.border} ${c.bg}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-5 h-5 ${c.text}`} />
        <span className={`font-semibold ${c.text}`}>{category}</span>
        <span className="ml-auto text-2xl font-bold">{count}</span>
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}
