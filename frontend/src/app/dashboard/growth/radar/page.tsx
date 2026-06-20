'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api';
import {
  Radar,
  RefreshCw,
  Play,
  Settings,
  Globe,
  MapPin,
  Zap,
  CheckCircle,
  XCircle,
  Clock,
  Target,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';

interface RadarConfig {
  id: string;
  enabled: boolean;
  sector: string | null;
  keywords: string[];
  ciudades: string[];
  pais: string;
  soloSinWeb: boolean;
  ratingMax: number | null;
  ratingMin: number | null;
  minResenas: number | null;
  maxResenas: number | null;
  excluirCerrados: boolean;
  maxLeadsPorRun: number;
  autoSecuencia: boolean;
  ultimoRun: string | null;
}

interface RadarRun {
  id: string;
  status: string;
  trigger: string;
  scanned: number;
  matched: number;
  created: number;
  skipped: number;
  error: string | null;
  startedAt: string;
  finishedAt: string | null;
}

const TAG_COLORS: Record<string, string> = {
  'sin-web': 'bg-amber-500/10 text-amber-600',
  'web-caida': 'bg-red-500/10 text-red-600',
  'resenas-malas': 'bg-orange-500/10 text-orange-600',
  'negocio-nuevo': 'bg-blue-500/10 text-blue-600',
  'contactable': 'bg-emerald-500/10 text-emerald-600',
};

export default function RadarPage() {
  const [softwareId, setSoftwareId] = useState('');
  const [softwares, setSoftwares] = useState<Array<{ id: string; nombre: string }>>([]);
  const [config, setConfig] = useState<RadarConfig | null>(null);
  const [runs, setRuns] = useState<RadarRun[]>([]);
  const [totalLeads, setTotalLeads] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);

  // campos de texto auxiliares (listas separadas por comas)
  const [keywordsText, setKeywordsText] = useState('');
  const [ciudadesText, setCiudadesText] = useState('');

  useEffect(() => {
    loadSoftwares();
  }, []);

  useEffect(() => {
    if (softwareId) loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [softwareId]);

  async function loadSoftwares() {
    try {
      const res = await apiClient.getSoftwares();
      const list = res?.data || [];
      setSoftwares(list);
      if (list.length > 0) setSoftwareId(list[0].id);
      else setLoading(false);
    } catch {
      setLoading(false);
    }
  }

  async function loadData() {
    setLoading(true);
    try {
      const [summary, runsRes] = await Promise.all([
        apiClient.getRadar(softwareId),
        apiClient.getRadarRuns(softwareId, 10).catch(() => []),
      ]);
      setConfig(summary.config);
      setTotalLeads(summary.totalLeads || 0);
      setKeywordsText((summary.config.keywords || []).join(', '));
      setCiudadesText((summary.config.ciudades || []).join(', '));
      setRuns(runsRes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function patch(p: Partial<RadarConfig>) {
    setConfig((c) => (c ? { ...c, ...p } : c));
  }

  async function save() {
    if (!config) return;
    setSaving(true);
    try {
      const payload = {
        ...config,
        keywords: keywordsText.split(',').map((s) => s.trim()).filter(Boolean),
        ciudades: ciudadesText.split(',').map((s) => s.trim()).filter(Boolean),
      };
      const updated = await apiClient.updateRadar(softwareId, payload);
      setConfig(updated);
    } catch (err) {
      alert('Error guardando: ' + (err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function run(dryRun: boolean) {
    setRunning(true);
    setLastResult(null);
    try {
      // guardar antes de rastrear para usar el ICP actual
      await save();
      const result = await apiClient.runRadar(softwareId, dryRun);
      setLastResult({ ...result, dryRun });
      await loadData();
    } catch (err) {
      alert('Error rastreando: ' + (err as Error).message);
    } finally {
      setRunning(false);
    }
  }

  if (loading || !config) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Cargando Radar...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Radar className="w-6 h-6 text-cyan-500" />
            Radar de leads
          </h1>
          <p className="text-muted-foreground mt-1">
            Define tu cliente ideal y el Radar rastrea negocios que encajan cada noche, puntuados por señales de compra.
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
          <button onClick={loadData} className="p-2 rounded-lg border hover:bg-muted transition-colors" title="Recargar">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Leads del Radar" value={totalLeads} icon={Target} color="text-cyan-500" />
        <StatCard title="Estado" value={config.enabled ? 'Activo' : 'Pausado'} icon={Zap} color={config.enabled ? 'text-emerald-500' : 'text-gray-400'} />
        <StatCard title="Máx. por noche" value={config.maxLeadsPorRun} icon={Sparkles} color="text-violet-500" />
        <StatCard
          title="Último rastreo"
          value={config.ultimoRun ? new Date(config.ultimoRun).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) : '—'}
          icon={Clock}
          color="text-amber-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ICP */}
        <div className="p-5 rounded-xl border bg-card space-y-4">
          <h2 className="font-semibold flex items-center gap-2">
            <Settings className="w-4 h-4" /> Perfil de cliente ideal (ICP)
          </h2>

          <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50">
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={(e) => patch({ enabled: e.target.checked })}
              className="w-5 h-5 rounded"
            />
            <div>
              <div className="font-medium">Radar activado</div>
              <div className="text-xs text-muted-foreground">Rastrea automáticamente cada noche (3:30 AM)</div>
            </div>
          </label>

          <div>
            <label className="text-sm font-medium">Sector / búsqueda principal *</label>
            <input
              type="text"
              value={config.sector || ''}
              onChange={(e) => patch({ sector: e.target.value })}
              placeholder="Ej: peluquería canina, clínica dental, gimnasio..."
              className="mt-1 w-full px-3 py-2 rounded-lg border bg-card"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Zonas / ciudades (separadas por comas)</label>
            <input
              type="text"
              value={ciudadesText}
              onChange={(e) => setCiudadesText(e.target.value)}
              placeholder="Vacío = grandes ciudades de España"
              className="mt-1 w-full px-3 py-2 rounded-lg border bg-card"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Palabras clave extra (opcional)</label>
            <input
              type="text"
              value={keywordsText}
              onChange={(e) => setKeywordsText(e.target.value)}
              placeholder="variantes del sector"
              className="mt-1 w-full px-3 py-2 rounded-lg border bg-card"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Rating máximo</label>
              <input
                type="number" step="0.1" min={0} max={5}
                value={config.ratingMax ?? ''}
                onChange={(e) => patch({ ratingMax: e.target.value === '' ? null : parseFloat(e.target.value) })}
                placeholder="ej. 3.5 (reseñas malas)"
                className="mt-1 w-full px-3 py-2 rounded-lg border bg-card"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Máx. reseñas</label>
              <input
                type="number" min={0}
                value={config.maxResenas ?? ''}
                onChange={(e) => patch({ maxResenas: e.target.value === '' ? null : parseInt(e.target.value) })}
                placeholder="ej. 15 (negocio nuevo)"
                className="mt-1 w-full px-3 py-2 rounded-lg border bg-card"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={config.soloSinWeb} onChange={(e) => patch({ soloSinWeb: e.target.checked })} className="w-4 h-4 rounded" />
              Solo sin web
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={config.excluirCerrados} onChange={(e) => patch({ excluirCerrados: e.target.checked })} className="w-4 h-4 rounded" />
              Excluir cerrados
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={config.autoSecuencia} onChange={(e) => patch({ autoSecuencia: e.target.checked })} className="w-4 h-4 rounded" />
              Lanzar secuencia al captar
            </label>
          </div>

          <div>
            <label className="text-sm font-medium">Máx. leads por rastreo</label>
            <input
              type="number" min={1} max={1000}
              value={config.maxLeadsPorRun}
              onChange={(e) => patch({ maxLeadsPorRun: parseInt(e.target.value) || 1 })}
              className="mt-1 w-full px-3 py-2 rounded-lg border bg-card"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={save}
              disabled={saving}
              className="flex-1 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar ICP'}
            </button>
            <button
              onClick={() => run(true)}
              disabled={running || !config.sector?.trim()}
              className="flex-1 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Globe className="w-4 h-4" /> {running ? '...' : 'Probar (dry-run)'}
            </button>
            <button
              onClick={() => run(false)}
              disabled={running || !config.sector?.trim()}
              className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4" /> {running ? 'Rastreando...' : 'Rastrear ahora'}
            </button>
          </div>
        </div>

        {/* Resultado + historial */}
        <div className="space-y-6">
          {lastResult && (
            <div className="p-5 rounded-xl border bg-card">
              <h2 className="font-semibold flex items-center gap-2 mb-3">
                {lastResult.dryRun ? <Globe className="w-4 h-4" /> : <CheckCircle className="w-4 h-4 text-emerald-500" />}
                {lastResult.dryRun ? 'Previsualización' : 'Rastreo completado'}
              </h2>
              <div className="grid grid-cols-4 gap-2 mb-3 text-center">
                <MiniStat label="Escaneados" value={lastResult.scanned} />
                <MiniStat label="ICP" value={lastResult.matched} />
                <MiniStat label={lastResult.dryRun ? 'Candidatos' : 'Creados'} value={lastResult.created} />
                <MiniStat label="Descartados" value={lastResult.skipped} />
              </div>
              <div className="space-y-1 max-h-[220px] overflow-y-auto">
                {(lastResult.leads || []).map((l: any, i: number) => (
                  <div key={l.id || i} className="flex items-center justify-between p-2.5 rounded-lg border text-sm">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{l.nombre}</div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(l.tags || []).map((t: string) => (
                          <span key={t} className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${TAG_COLORS[t] || 'bg-muted text-muted-foreground'}`}>
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
                        <MapPin className="w-3 h-3" /> {l.ciudad}
                      </span>
                      <span className="text-sm font-bold tabular-nums">{l.score}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="p-5 rounded-xl border bg-card">
            <h2 className="font-semibold flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4" /> Historial de rastreos
            </h2>
            {runs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">Aún no se ha ejecutado el Radar.</div>
            ) : (
              <div className="space-y-1">
                {runs.map((r) => (
                  <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      {r.status === 'done' ? (
                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                      ) : r.status === 'error' ? (
                        <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                      ) : (
                        <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />
                      )}
                      <span className="truncate">
                        <strong>{r.created}</strong> leads · {r.matched} ICP / {r.scanned} escaneados
                      </span>
                      <span className="text-xs text-muted-foreground">({r.trigger})</span>
                    </div>
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {new Date(r.startedAt).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 rounded-xl border bg-muted/30 text-xs text-muted-foreground flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            El Radar usa la API de Google Places (necesita <code>GOOGLE_PLACES_API_KEY</code>). Los leads caen en el Kanban en estado NUEVO con tags y score. Usa el botón “lanzar secuencia” desde el lead, o activa “Lanzar secuencia al captar”.
          </div>
        </div>
      </div>
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
    <div className="p-2 rounded-lg border">
      <div className="text-lg font-bold">{value}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}
