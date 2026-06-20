'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api';
import {
  Skull,
  RefreshCw,
  Rocket,
  Eye,
  MessageCircle,
  Mail,
  Clock,
  Heart,
  Send,
  CheckCircle,
  XCircle,
  TrendingUp,
  Users,
  AlertTriangle,
  Activity,
} from 'lucide-react';

type Canal = 'whatsapp' | 'email' | 'ambos';

interface PreviewResult {
  totalLeads: number;
  conTelefono: number;
  conEmail: number;
  sinCanal: number;
  enviosWhatsapp: number;
  enviosEmail: number;
  totalEnvios: number;
  duracionEstimadaMin: number;
  muestra: Array<{
    id: string;
    nombre: string;
    empresa: string | null;
    estado: string;
    canal: string;
    diasInactivo: number | null;
  }>;
}

interface ResurrectionStats {
  launched: number;
  revived: number;
  convertidos: number;
  tasaResurreccion: number;
  envios: { pending: number; sent: number; failed: number };
}

const ESTADOS_DISPONIBLES = ['NO_RESPONDE', 'RECHAZADO', 'CONTACTADO', 'EN_SEGUIMIENTO'];

export default function ResurreccionPage() {
  const [softwareId, setSoftwareId] = useState('');
  const [softwares, setSoftwares] = useState<Array<{ id: string; nombre: string }>>([]);

  const [diasMin, setDiasMin] = useState(90);
  const [estados, setEstados] = useState<string[]>(['NO_RESPONDE', 'RECHAZADO']);
  const [canal, setCanal] = useState<Canal>('ambos');
  const [staggerMinutes, setStaggerMinutes] = useState(3);
  const [maxLeads, setMaxLeads] = useState(200);
  const [pretexto, setPretexto] = useState('');

  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [stats, setStats] = useState<ResurrectionStats | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [lastLaunch, setLastLaunch] = useState<any>(null);

  useEffect(() => {
    loadSoftwares();
  }, []);

  useEffect(() => {
    if (softwareId) {
      runPreview();
      loadStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [softwareId]);

  async function loadSoftwares() {
    try {
      const res = await apiClient.getSoftwares();
      const list = res?.data || [];
      setSoftwares(list);
      if (list.length > 0) setSoftwareId(list[0].id);
    } catch {
      setSoftwares([]);
    }
  }

  function buildOpts() {
    return { diasMin, estados, canal, staggerMinutes, maxLeads, pretexto: pretexto.trim() || undefined };
  }

  async function runPreview() {
    if (!softwareId) return;
    setLoadingPreview(true);
    try {
      const res = await apiClient.previewResurrection(softwareId, buildOpts());
      setPreview(res);
    } catch (err) {
      alert('Error en preview: ' + (err as Error).message);
    } finally {
      setLoadingPreview(false);
    }
  }

  async function loadStats() {
    if (!softwareId) return;
    try {
      const res = await apiClient.getResurrectionStats(softwareId);
      setStats(res);
    } catch {
      setStats(null);
    }
  }

  async function launch() {
    if (!preview || preview.totalEnvios === 0) return;
    if (
      !confirm(
        `Vas a lanzar la resurrección sobre ${preview.totalLeads} leads (${preview.totalEnvios} envíos escalonados). ¿Confirmas?`
      )
    )
      return;
    setLaunching(true);
    try {
      const res = await apiClient.launchResurrection(softwareId, buildOpts());
      setLastLaunch(res);
      await loadStats();
      await runPreview();
    } catch (err) {
      alert('Error lanzando campaña: ' + (err as Error).message);
    } finally {
      setLaunching(false);
    }
  }

  function toggleEstado(e: string) {
    setEstados((prev) => (prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e]));
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Skull className="w-6 h-6 text-purple-500" />
            Resurrección masiva
          </h1>
          <p className="text-muted-foreground mt-1">
            Reactiva el Cementerio en un click: la IA escribe un mensaje por lead y se lanza en cola escalonada por WhatsApp + email.
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
            onClick={() => { runPreview(); loadStats(); }}
            className="p-2 rounded-lg border hover:bg-muted transition-colors"
            title="Recargar"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats de campaña */}
      {stats && stats.launched > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="Leads lanzados" value={stats.launched} icon={Users} color="text-blue-500" />
          <StatCard title="Vueltos a la vida" value={stats.revived} icon={Heart} color="text-pink-500" />
          <StatCard title="Tasa resurrección" value={`${stats.tasaResurreccion}%`} icon={TrendingUp} color="text-emerald-500" />
          <StatCard title="Convertidos" value={stats.convertidos} icon={CheckCircle} color="text-green-600" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuración */}
        <div className="p-5 rounded-xl border bg-card space-y-4">
          <h2 className="font-semibold flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Define el segmento
          </h2>

          <div>
            <label className="text-sm font-medium">Días sin contacto (mínimo)</label>
            <input
              type="number"
              min={0}
              value={diasMin}
              onChange={(e) => setDiasMin(parseInt(e.target.value) || 0)}
              className="mt-1 w-full px-3 py-2 rounded-lg border bg-card"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Estados a incluir</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {ESTADOS_DISPONIBLES.map((e) => (
                <button
                  key={e}
                  onClick={() => toggleEstado(e)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    estados.includes(e)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card hover:bg-muted'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Canal</label>
            <select
              value={canal}
              onChange={(e) => setCanal(e.target.value as Canal)}
              className="mt-1 w-full px-3 py-2 rounded-lg border bg-card"
            >
              <option value="ambos">WhatsApp + Email</option>
              <option value="whatsapp">Solo WhatsApp</option>
              <option value="email">Solo Email</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Minutos entre envíos</label>
              <input
                type="number"
                min={0}
                max={240}
                value={staggerMinutes}
                onChange={(e) => setStaggerMinutes(parseInt(e.target.value) || 0)}
                className="mt-1 w-full px-3 py-2 rounded-lg border bg-card"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Máx. leads</label>
              <input
                type="number"
                min={1}
                max={1000}
                value={maxLeads}
                onChange={(e) => setMaxLeads(parseInt(e.target.value) || 1)}
                className="mt-1 w-full px-3 py-2 rounded-lg border bg-card"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Pretexto / ángulo (opcional)</label>
            <textarea
              value={pretexto}
              onChange={(e) => setPretexto(e.target.value)}
              placeholder="Ej: lanzamos nueva función de reservas; les pensé por X..."
              rows={2}
              className="mt-1 w-full px-3 py-2 rounded-lg border bg-card resize-none"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Si lo dejas vacío, la IA inventa un pretexto creíble por lead.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={runPreview}
              disabled={loadingPreview}
              className="flex-1 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
            >
              {loadingPreview ? 'Calculando...' : 'Previsualizar'}
            </button>
            <button
              onClick={launch}
              disabled={launching || !preview || preview.totalEnvios === 0}
              className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Rocket className="w-4 h-4" />
              {launching ? 'Lanzando...' : 'Lanzar resurrección'}
            </button>
          </div>

          {lastLaunch?.batchId && (
            <div className="p-3 rounded-lg border bg-emerald-500/10 border-emerald-500/20 text-sm flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
              <span>
                Campaña lanzada: <strong>{lastLaunch.totalLeads}</strong> leads, {lastLaunch.scheduled} envíos programados
                {lastLaunch.duracionEstimadaMin ? ` (se completa en ~${lastLaunch.duracionEstimadaMin} min)` : ''}.
              </span>
            </div>
          )}
        </div>

        {/* Preview */}
        <div className="p-5 rounded-xl border bg-card">
          <h2 className="font-semibold flex items-center gap-2 mb-4">
            <Send className="w-4 h-4" />
            Previsualización
          </h2>

          {!preview ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              Ajusta el segmento y pulsa Previsualizar.
            </div>
          ) : preview.totalLeads === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm flex flex-col items-center gap-2">
              <Skull className="w-8 h-8 opacity-40" />
              No hay leads que encajen con este segmento.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <MiniStat label="Leads" value={preview.totalLeads} />
                <MiniStat label="Envíos" value={preview.totalEnvios} />
                <MiniStat label="Duración" value={`~${preview.duracionEstimadaMin}m`} />
              </div>

              <div className="flex flex-wrap gap-3 text-xs mb-4">
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-green-500/10 text-green-600">
                  <MessageCircle className="w-3 h-3" /> {preview.enviosWhatsapp} WhatsApp
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-500/10 text-blue-600">
                  <Mail className="w-3 h-3" /> {preview.enviosEmail} Email
                </span>
                {preview.sinCanal > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-amber-500/10 text-amber-600">
                    <AlertTriangle className="w-3 h-3" /> {preview.sinCanal} sin canal
                  </span>
                )}
              </div>

              <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Muestra de leads
              </div>
              <div className="space-y-1 max-h-[280px] overflow-y-auto">
                {preview.muestra.map((l) => (
                  <div key={l.id} className="flex items-center justify-between p-2.5 rounded-lg border text-sm">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{l.nombre}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {l.empresa || 'Sin empresa'} · {l.estado}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {l.canal === 'whatsapp' ? (
                        <MessageCircle className="w-3.5 h-3.5 text-green-500" />
                      ) : (
                        <Mail className="w-3.5 h-3.5 text-blue-500" />
                      )}
                      <span className="text-xs text-muted-foreground">
                        {l.diasInactivo ? `${l.diasInactivo}d` : '—'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Estado de envíos */}
      {stats && (stats.envios.pending > 0 || stats.envios.sent > 0 || stats.envios.failed > 0) && (
        <div className="p-5 rounded-xl border bg-card">
          <h2 className="font-semibold flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4" />
            Estado de la cola
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <StatCard title="Pendientes" value={stats.envios.pending} icon={Clock} color="text-amber-500" />
            <StatCard title="Enviados" value={stats.envios.sent} icon={CheckCircle} color="text-green-500" />
            <StatCard title="Fallidos" value={stats.envios.failed} icon={XCircle} color="text-red-500" />
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color }: { title: string; value: string | number; icon: any; color: string }) {
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

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="p-3 rounded-lg border text-center">
      <div className="text-xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
