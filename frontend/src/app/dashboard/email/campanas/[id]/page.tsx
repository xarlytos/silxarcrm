'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import {
  ArrowLeft, Send, Eye, MousePointerClick, AlertCircle, X, Loader2, Rocket, CheckCircle2, ExternalLink,
  Activity, Inbox, ShieldAlert, FlaskConical, Trophy, Crown,
} from 'lucide-react';

interface Variante {
  id: string;
  letra: string;
  asunto: string;
  cuerpoHtml: string;
  porcentaje: number;
  esGanadora: boolean;
  enviados: number;
  abiertos: number;
  clicks: number;
  rebotes: number;
}

interface Campana {
  id: string;
  softwareId: string;
  nombre: string;
  estado: string;
  esAbTest: boolean;
  ganadoraPromovidaEn?: string | null;
  totalLeads: number;
  enviados: number;
  abiertos: number;
  clicks: number;
  rebotes: number;
  asuntoSnapshot: string;
  cuerpoSnapshot: string;
  filtros: any;
  iniciadaEn?: string | null;
  completadaEn?: string | null;
  createdAt: string;
  sender: { id: string; email: string; nombre: string };
  plantilla: { id: string; nombre: string } | null;
  variantes?: Variante[];
}

interface Envio {
  id: string;
  leadId: string | null;
  destinatario: string;
  asunto: string;
  estado: string;
  enviadoEn: string | null;
  abiertoEn: string | null;
  ultimoClickEn: string | null;
  error: string | null;
  createdAt: string;
}

interface Evento {
  id: string;
  tipo: string;
  fecha: string;
  datos: any;
  envio: {
    destinatario: string;
    asunto: string;
    leadId: string | null;
  };
}

export default function CampanaDetallePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [campana, setCampana] = useState<Campana | null>(null);
  const [envios, setEnvios] = useState<Envio[]>([]);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [enviosPagination, setEnviosPagination] = useState({ page: 1, total: 0, pages: 0 });
  const [estadoFilter, setEstadoFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [cRes, eRes, evRes] = await Promise.all([
        apiClient.getEmailCampana(params.id),
        apiClient.getEmailCampanaEnvios(params.id, {
          page: String(enviosPagination.page),
          limit: '25',
          ...(estadoFilter ? { estado: estadoFilter } : {}),
        }),
        apiClient.getEmailCampanaEventos(params.id, { limit: '30' }).catch(() => ({ data: [] })),
      ]);
      setCampana(cRes.data);
      setEnvios(eRes.data.envios);
      setEnviosPagination(eRes.data.pagination);
      setEventos(evRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id, estadoFilter, enviosPagination.page]);

  // Polling cada 3s si está enviando
  useEffect(() => {
    if (!campana || campana.estado !== 'enviando') return;
    const id = setInterval(() => load(true), 3000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campana?.estado]);

  const handleLaunch = async () => {
    if (!campana || !confirm(`¿Lanzar campaña a ${campana.totalLeads} destinatarios?`)) return;
    setActionLoading(true);
    try {
      await apiClient.lanzarEmailCampana(campana.id);
      load(true);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePromover = async (varianteId: string, letra: string) => {
    if (!confirm(`¿Promover la variante ${letra} como ganadora? El resto de la audiencia recibirá este contenido.`)) return;
    setActionLoading(true);
    try {
      await apiClient.promoverGanadora(params.id, varianteId);
      load(true);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!campana || !confirm('¿Cancelar la campaña? Los emails ya enviados no se pueden retirar.')) return;
    setActionLoading(true);
    try {
      await apiClient.cancelarEmailCampana(campana.id);
      load(true);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div className="text-center py-12 text-[var(--text-tertiary)]">Cargando...</div>;
  if (!campana) return <div className="text-center py-12">Campaña no encontrada</div>;

  const progress = campana.totalLeads > 0 ? Math.round((campana.enviados / campana.totalLeads) * 100) : 0;
  const openRate = campana.enviados > 0 ? Math.round((campana.abiertos / campana.enviados) * 100) : 0;
  const clickRate = campana.enviados > 0 ? Math.round((campana.clicks / campana.enviados) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/dashboard/email/campanas" className="inline-flex items-center gap-1 text-[13px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] mb-2">
            <ArrowLeft className="w-3.5 h-3.5" /> Volver a campañas
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-[28px] font-bold tracking-tight text-[var(--text-primary)]">{campana.nombre}</h1>
            <EstadoBadge estado={campana.estado} />
          </div>
          <p className="text-[13px] text-[var(--text-tertiary)] mt-1">
            {campana.sender.nombre} &lt;{campana.sender.email}&gt; · <span className="capitalize">{campana.softwareId}</span>
          </p>
        </div>
        <div className="flex gap-2">
          {campana.estado === 'borrador' && (
            <button
              onClick={handleLaunch}
              disabled={actionLoading}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl text-[14px] font-semibold disabled:opacity-50"
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
              Lanzar
            </button>
          )}
          {(campana.estado === 'borrador' || campana.estado === 'enviando') && (
            <button
              onClick={handleCancel}
              disabled={actionLoading}
              className="flex items-center gap-2 px-4 py-2.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-xl text-[14px] font-medium disabled:opacity-50"
            >
              <X className="w-4 h-4" />
              Cancelar
            </button>
          )}
        </div>
      </div>

      {/* Progress (si enviando) */}
      {campana.estado === 'enviando' && (
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-[13px] font-medium text-blue-700 dark:text-blue-300">
              <Loader2 className="w-4 h-4 animate-spin" />
              Enviando en tiempo real
            </div>
            <span className="text-[14px] font-bold text-blue-700 dark:text-blue-300 tabular-nums">
              {campana.enviados} / {campana.totalLeads}
            </span>
          </div>
          <div className="h-2 bg-blue-200/50 dark:bg-blue-900/50 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-violet-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard icon={Send} label="Enviados" value={`${campana.enviados}/${campana.totalLeads}`} sub={`${progress}%`} color="emerald" />
        <KpiCard icon={Eye} label="Aperturas" value={campana.abiertos} sub={`${openRate}% open rate`} color="violet" />
        <KpiCard icon={MousePointerClick} label="Clicks" value={campana.clicks} sub={`${clickRate}% CTR`} color="blue" />
        <KpiCard icon={AlertCircle} label="Rebotes/Fallidos" value={campana.rebotes} sub={campana.rebotes > 0 ? 'Revisar' : 'Sin fallos'} color="orange" />
      </div>

      {/* Comparativa A/B */}
      {campana.esAbTest && campana.variantes && campana.variantes.length > 0 && (
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--border-primary)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-violet-500" />
              <h2 className="text-[16px] font-semibold text-[var(--text-primary)]">A/B test — comparativa</h2>
            </div>
            {campana.ganadoraPromovidaEn && (
              <span className="text-[12px] text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1">
                <Crown className="w-3.5 h-3.5" />
                Ganadora promovida {new Date(campana.ganadoraPromovidaEn).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-[var(--border-primary)]">
            {campana.variantes.map((v) => {
              const open = v.enviados > 0 ? Math.round((v.abiertos / v.enviados) * 100) : 0;
              const ctr = v.enviados > 0 ? Math.round((v.clicks / v.enviados) * 100) : 0;
              // Detectar variante con mejor open rate para resaltar
              const bestOpen = Math.max(...campana.variantes!.map((x) => x.enviados > 0 ? x.abiertos / x.enviados : 0));
              const isBest = v.enviados > 0 && v.abiertos / v.enviados === bestOpen && bestOpen > 0;
              return (
                <div key={v.id} className={`bg-[var(--bg-secondary)] p-5 space-y-3 ${v.esGanadora ? 'ring-2 ring-inset ring-emerald-500' : ''}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-8 h-8 rounded-lg text-[14px] font-bold flex items-center justify-center ${
                        v.esGanadora
                          ? 'bg-gradient-to-br from-emerald-500 to-green-600 text-white'
                          : 'bg-gradient-to-br from-blue-500 to-violet-600 text-white'
                      }`}>{v.letra}</span>
                      <span className="text-[14px] font-semibold text-[var(--text-primary)]">Variante {v.letra}</span>
                      {v.esGanadora && <Crown className="w-4 h-4 text-emerald-500" />}
                      {!v.esGanadora && isBest && !campana.ganadoraPromovidaEn && (
                        <Trophy className="w-4 h-4 text-amber-500" />
                      )}
                    </div>
                    <span className="text-[11px] text-[var(--text-tertiary)]">{v.porcentaje}%</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-[18px] font-bold text-[var(--text-primary)] tabular-nums leading-none">{v.enviados}</p>
                      <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider mt-1">Env.</p>
                    </div>
                    <div>
                      <p className="text-[18px] font-bold text-violet-500 tabular-nums leading-none">{open}%</p>
                      <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider mt-1">Open</p>
                    </div>
                    <div>
                      <p className="text-[18px] font-bold text-blue-500 tabular-nums leading-none">{ctr}%</p>
                      <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider mt-1">CTR</p>
                    </div>
                  </div>
                  <div className="text-[11px] text-[var(--text-tertiary)] space-y-1">
                    <p><span className="font-medium">Abiertos:</span> {v.abiertos}</p>
                    <p><span className="font-medium">Clicks:</span> {v.clicks}</p>
                    <p><span className="font-medium">Rebotes:</span> {v.rebotes}</p>
                  </div>
                  <div className="pt-3 border-t border-[var(--border-primary)]">
                    <p className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] mb-1">Asunto</p>
                    <p className="text-[12px] font-mono text-[var(--text-secondary)] truncate" title={v.asunto}>{v.asunto}</p>
                  </div>
                  {!campana.ganadoraPromovidaEn && (
                    <button
                      onClick={() => handlePromover(v.id, v.letra)}
                      disabled={actionLoading || v.enviados === 0}
                      className={`w-full mt-2 px-3 py-2 rounded-lg text-[12px] font-medium transition-all disabled:opacity-40 ${
                        isBest
                          ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:shadow-lg'
                          : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      Promover {v.letra} como ganadora
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          {!campana.ganadoraPromovidaEn && (
            <div className="px-6 py-3 bg-[var(--bg-tertiary)]/30 border-t border-[var(--border-primary)] text-[12px] text-[var(--text-tertiary)]">
              <Trophy className="w-3.5 h-3.5 inline mr-1 text-amber-500" />
              Al promover la ganadora, el resto de la audiencia (reservada) recibirá el contenido de esa variante automáticamente.
            </div>
          )}
        </div>
      )}

      {/* Asunto + plantilla */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl p-5">
        <p className="text-[11px] uppercase tracking-wider text-[var(--text-tertiary)] mb-2">Asunto (snapshot)</p>
        <p className="text-[15px] font-mono text-[var(--text-primary)]">{campana.asuntoSnapshot}</p>
        {campana.plantilla && (
          <Link href={`/dashboard/email/plantillas/${campana.plantilla.id}`} className="inline-flex items-center gap-1 text-[12px] text-violet-500 mt-3">
            Ver plantilla &ldquo;{campana.plantilla.nombre}&rdquo; <ExternalLink className="w-3 h-3" />
          </Link>
        )}
      </div>

      {/* Timeline de eventos */}
      {eventos.length > 0 && (
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--border-primary)] flex items-center gap-2">
            <Activity className="w-4 h-4 text-violet-500" />
            <h2 className="text-[16px] font-semibold text-[var(--text-primary)]">Timeline reciente</h2>
            <span className="text-[12px] text-[var(--text-tertiary)]">{eventos.length} eventos</span>
          </div>
          <div className="max-h-[400px] overflow-y-auto">
            {eventos.map((e) => (
              <EventoRow key={e.id} evento={e} />
            ))}
          </div>
        </div>
      )}

      {/* Envíos */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--border-primary)] flex items-center justify-between">
          <h2 className="text-[16px] font-semibold text-[var(--text-primary)]">Envíos ({enviosPagination.total})</h2>
          <select
            value={estadoFilter}
            onChange={(e) => { setEstadoFilter(e.target.value); setEnviosPagination((p) => ({ ...p, page: 1 })); }}
            className="px-3 py-1.5 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg text-[12px]"
          >
            <option value="">Todos</option>
            <option value="pendiente">Pendientes</option>
            <option value="enviado">Enviados</option>
            <option value="fallido">Fallidos</option>
            <option value="rebotado">Rebotados</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border-primary)]">
                <th className="text-left px-6 py-3 text-[12px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider">Destinatario</th>
                <th className="text-left px-6 py-3 text-[12px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider">Estado</th>
                <th className="text-left px-6 py-3 text-[12px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider">Tracking</th>
                <th className="text-left px-6 py-3 text-[12px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-primary)]">
              {envios.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-[var(--text-tertiary)] text-[13px]">Sin envíos en este filtro</td>
                </tr>
              ) : (
                envios.map((e) => (
                  <tr key={e.id} className="hover:bg-[var(--bg-tertiary)]/30">
                    <td className="px-6 py-3 text-[13px] text-[var(--text-primary)]">
                      {e.leadId ? (
                        <Link href={`/dashboard/leads/${e.leadId}`} className="hover:text-violet-500">{e.destinatario}</Link>
                      ) : e.destinatario}
                    </td>
                    <td className="px-6 py-3"><EnvioEstadoBadge estado={e.estado} error={e.error} /></td>
                    <td className="px-6 py-3 text-[12px] text-[var(--text-tertiary)]">
                      <div className="flex items-center gap-2">
                        {e.abiertoEn && <span className="inline-flex items-center gap-1 text-violet-500"><Eye className="w-3 h-3" /> Abierto</span>}
                        {e.ultimoClickEn && <span className="inline-flex items-center gap-1 text-blue-500"><MousePointerClick className="w-3 h-3" /> Click</span>}
                        {!e.abiertoEn && !e.ultimoClickEn && '—'}
                      </div>
                    </td>
                    <td className="px-6 py-3 text-[12px] text-[var(--text-tertiary)]">
                      {e.enviadoEn ? new Date(e.enviadoEn).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {enviosPagination.pages > 1 && (
          <div className="px-6 py-3 border-t border-[var(--border-primary)] flex items-center justify-between text-[12px]">
            <span className="text-[var(--text-tertiary)]">{enviosPagination.total} envíos</span>
            <div className="flex gap-2 items-center">
              <button
                onClick={() => setEnviosPagination((p) => ({ ...p, page: Math.max(1, p.page - 1) }))}
                disabled={enviosPagination.page <= 1}
                className="px-3 py-1 rounded-lg border border-[var(--border-primary)] disabled:opacity-30"
              >
                Anterior
              </button>
              <span>{enviosPagination.page} / {enviosPagination.pages}</span>
              <button
                onClick={() => setEnviosPagination((p) => ({ ...p, page: Math.min(p.pages, p.page + 1) }))}
                disabled={enviosPagination.page >= enviosPagination.pages}
                className="px-3 py-1 rounded-lg border border-[var(--border-primary)] disabled:opacity-30"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, sub, color }: any) {
  const colors: Record<string, string> = {
    emerald: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600',
    violet: 'bg-violet-100 dark:bg-violet-900/30 text-violet-600',
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600',
    orange: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600',
  };
  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl p-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${colors[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-[24px] font-bold text-[var(--text-primary)] tabular-nums leading-none">{value}</p>
      <p className="text-[12px] text-[var(--text-tertiary)] mt-1">{label}</p>
      <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">{sub}</p>
    </div>
  );
}

function EstadoBadge({ estado }: { estado: string }) {
  const map: Record<string, { cls: string; icon: any }> = {
    borrador: { cls: 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]', icon: null },
    enviando: { cls: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300', icon: Loader2 },
    enviada: { cls: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300', icon: CheckCircle2 },
    ab_waiting: { cls: 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300', icon: FlaskConical },
    cancelada: { cls: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300', icon: X },
    error: { cls: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300', icon: AlertCircle },
  };
  const m = map[estado] || map.borrador;
  const Icon = m.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[12px] font-medium capitalize ${m.cls}`}>
      {Icon && <Icon className={`w-3 h-3 ${estado === 'enviando' ? 'animate-spin' : ''}`} />}
      {estado}
    </span>
  );
}

function EventoRow({ evento }: { evento: Evento }) {
  const config: Record<string, { icon: any; label: string; color: string }> = {
    sent: { icon: Send, label: 'Enviado', color: 'text-emerald-500' },
    delivered: { icon: Inbox, label: 'Entregado', color: 'text-emerald-600' },
    opened: { icon: Eye, label: 'Abierto', color: 'text-violet-500' },
    clicked: { icon: MousePointerClick, label: 'Click', color: 'text-blue-500' },
    bounced: { icon: AlertCircle, label: 'Rebotado', color: 'text-orange-500' },
    complained: { icon: ShieldAlert, label: 'Marcó como spam', color: 'text-red-500' },
    failed: { icon: X, label: 'Fallido', color: 'text-red-500' },
    delayed: { icon: Loader2, label: 'Demorado', color: 'text-amber-500' },
  };
  const c = config[evento.tipo] || { icon: Activity, label: evento.tipo, color: 'text-[var(--text-tertiary)]' };
  const Icon = c.icon;
  const url = evento.datos?.click?.link;
  return (
    <div className="px-6 py-3 border-b border-[var(--border-primary)] last:border-0 flex items-start gap-3 hover:bg-[var(--bg-tertiary)]/30">
      <Icon className={`w-4 h-4 ${c.color} mt-0.5 shrink-0`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-[13px] font-medium ${c.color}`}>{c.label}</span>
          <span className="text-[12px] text-[var(--text-secondary)] truncate">{evento.envio.destinatario}</span>
        </div>
        {url && (
          <p className="text-[11px] text-[var(--text-tertiary)] truncate mt-0.5">
            → <span className="font-mono">{url}</span>
          </p>
        )}
      </div>
      <span className="text-[11px] text-[var(--text-tertiary)] shrink-0 tabular-nums">
        {new Date(evento.fecha).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}
      </span>
    </div>
  );
}

function EnvioEstadoBadge({ estado, error }: { estado: string; error: string | null }) {
  const map: Record<string, string> = {
    pendiente: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
    enviado: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
    fallido: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
    rebotado: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
  };
  return (
    <span title={error || undefined} className={`px-2 py-0.5 rounded-md text-[11px] font-medium capitalize ${map[estado] || ''}`}>
      {estado}
    </span>
  );
}
