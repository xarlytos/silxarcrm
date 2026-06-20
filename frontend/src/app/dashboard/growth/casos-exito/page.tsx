'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api';
import Link from 'next/link';
import {
  Trophy,
  RefreshCw,
  Sparkles,
  CheckCircle,
  Clock,
  FileText,
  Send,
  Loader2,
  Users,
  PartyPopper,
  AlertTriangle,
} from 'lucide-react';

interface CaseStudyPiece {
  id: string;
  title: string;
  excerpt: string | null;
  status: string;
  keywords: string[];
  publishedAt: string | null;
  createdAt: string;
}

interface MilestoneLead {
  leadId: string;
  nombre: string;
  empresa: string | null;
  convertidoHaceDias: number;
}

interface MilestoneAggregate {
  total: number;
  umbral: number;
}

const STATUS_UI: Record<string, { label: string; cls: string }> = {
  DRAFT: { label: 'Borrador', cls: 'bg-amber-500/10 text-amber-600' },
  SCHEDULED: { label: 'Programado', cls: 'bg-blue-500/10 text-blue-600' },
  PUBLISHED: { label: 'Publicado', cls: 'bg-emerald-500/10 text-emerald-600' },
  FAILED: { label: 'Fallido', cls: 'bg-red-500/10 text-red-600' },
};

export default function CasosExitoPage() {
  const [softwareId, setSoftwareId] = useState('');
  const [softwares, setSoftwares] = useState<Array<{ id: string; nombre: string }>>([]);
  const [caseStudies, setCaseStudies] = useState<CaseStudyPiece[]>([]);
  const [leadsPendientes, setLeadsPendientes] = useState<MilestoneLead[]>([]);
  const [hitosAgregados, setHitosAgregados] = useState<MilestoneAggregate[]>([]);
  const [totalConvertidos, setTotalConvertidos] = useState(0);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);

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
      const res = await apiClient.getCaseStudies(softwareId);
      setCaseStudies(res.caseStudies || []);
      setLeadsPendientes(res.leadsPendientes || []);
      setHitosAgregados(res.hitosAgregados || []);
      setTotalConvertidos(res.totalConvertidos || 0);
    } catch {
      setCaseStudies([]);
    } finally {
      setLoading(false);
    }
  }

  async function generateForLead(leadId: string) {
    setGenerating(leadId);
    try {
      await apiClient.generateCaseStudy({ leadId });
      await loadData();
    } catch (err) {
      alert('Error generando: ' + (err as Error).message);
    } finally {
      setGenerating(null);
    }
  }

  async function generateMilestone(umbral: number) {
    setGenerating(`hito-${umbral}`);
    try {
      await apiClient.generateCaseStudy({ softwareId, umbral });
      await loadData();
    } catch (err) {
      alert('Error generando: ' + (err as Error).message);
    } finally {
      setGenerating(null);
    }
  }

  const publicados = caseStudies.filter((c) => c.status === 'PUBLISHED').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Trophy className="w-6 h-6 text-amber-500" />
            Casos de éxito automáticos
          </h1>
          <p className="text-muted-foreground mt-1">
            Cada cliente convertido es prueba social: la IA genera el case study con sus datos reales y lo deja listo para publicar.
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
        <StatCard title="Clientes convertidos" value={totalConvertidos} icon={Users} color="text-blue-500" />
        <StatCard title="Hitos pendientes" value={leadsPendientes.length + hitosAgregados.length} icon={Sparkles} color="text-amber-500" />
        <StatCard title="Casos generados" value={caseStudies.length} icon={FileText} color="text-violet-500" />
        <StatCard title="Publicados" value={publicados} icon={Send} color="text-emerald-500" />
      </div>

      {/* Hitos agregados */}
      {hitosAgregados.length > 0 && (
        <div className="p-5 rounded-xl border border-amber-500/30 bg-amber-500/5">
          <h2 className="font-semibold flex items-center gap-2 mb-3">
            <PartyPopper className="w-4 h-4 text-amber-500" /> ¡Hito alcanzado!
          </h2>
          <div className="space-y-2">
            {hitosAgregados.map((h) => (
              <div key={h.umbral} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                <span className="text-sm">
                  Has superado los <strong>{h.umbral} clientes convertidos</strong> ({h.total} totales) — esto merece su propia historia.
                </span>
                <button
                  onClick={() => generateMilestone(h.umbral)}
                  disabled={generating !== null}
                  className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5 flex-shrink-0"
                >
                  {generating === `hito-${h.umbral}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  Generar historia
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leads convertidos sin caso */}
        <div className="p-5 rounded-xl border bg-card">
          <h2 className="font-semibold flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4" /> Conversiones sin caso de éxito
          </h2>
          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Cargando...
            </div>
          ) : leadsPendientes.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">
              {totalConvertidos === 0
                ? 'Cuando conviertas tu primer cliente, su caso de éxito se generará aquí.'
                : 'Todas las conversiones tienen ya su caso de éxito. 👏'}
            </div>
          ) : (
            <div className="space-y-2">
              {leadsPendientes.map((l) => (
                <div key={l.leadId} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{l.empresa || l.nombre}</div>
                    <div className="text-xs text-muted-foreground">
                      Convertido hace {l.convertidoHaceDias} día{l.convertidoHaceDias !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <button
                    onClick={() => generateForLead(l.leadId)}
                    disabled={generating !== null}
                    className="px-3 py-1.5 rounded-lg border text-sm font-medium hover:bg-muted disabled:opacity-50 flex items-center gap-1.5 flex-shrink-0"
                  >
                    {generating === l.leadId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    Generar
                  </button>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-4 flex items-start gap-1.5">
            <Clock className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            El cron de las 6:00 genera borradores automáticamente (máx. 3 por noche y producto).
          </p>
        </div>

        {/* Casos generados */}
        <div className="p-5 rounded-xl border bg-card">
          <h2 className="font-semibold flex items-center gap-2 mb-4">
            <FileText className="w-4 h-4" /> Casos generados
          </h2>
          {caseStudies.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">Aún no hay casos de éxito generados.</div>
          ) : (
            <div className="space-y-2">
              {caseStudies.map((c) => {
                const st = STATUS_UI[c.status] || { label: c.status, cls: 'bg-muted text-muted-foreground' };
                return (
                  <Link
                    key={c.id}
                    href={`/dashboard/growth/content?id=${c.id}`}
                    className="block p-3 rounded-lg border hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium truncate">{c.title}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${st.cls}`}>{st.label}</span>
                    </div>
                    {c.excerpt && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{c.excerpt}</p>}
                    <div className="text-xs text-muted-foreground mt-1.5">
                      {new Date(c.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                      {c.keywords.some((k) => k.startsWith('hito-')) && ' · 🏆 hito'}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-4 flex items-start gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            Los borradores llevan marcadores [DATO A CONFIRMAR]: revisa y valida con el cliente antes de publicar. Publica y reutiliza en redes desde el editor de contenido.
          </p>
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
