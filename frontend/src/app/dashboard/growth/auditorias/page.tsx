'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api';
import {
  ClipboardCheck,
  RefreshCw,
  ExternalLink,
  Copy,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  TrendingUp,
  Mail,
  Phone,
  Globe,
} from 'lucide-react';

interface Audit {
  id: string;
  negocio: string;
  url: string | null;
  nombre: string | null;
  email: string | null;
  telefono: string | null;
  status: string;
  score: number | null;
  leadId: string | null;
  createdAt: string;
}

export default function AuditoriasPage() {
  const [softwareId, setSoftwareId] = useState('');
  const [softwares, setSoftwares] = useState<Array<{ id: string; nombre: string; slug: string }>>([]);
  const [audits, setAudits] = useState<Audit[]>([]);
  const [stats, setStats] = useState<{ total: number; conLead: number; tasaConversion: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

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
      const res = await apiClient.getAudits(softwareId, 100);
      setAudits(res.audits || []);
      setStats({ total: res.total, conLead: res.conLead, tasaConversion: res.tasaConversion });
    } catch {
      setAudits([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }

  const currentSoftware = softwares.find((s) => s.id === softwareId);
  const landingUrl = currentSoftware
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/auditoria/${currentSoftware.slug}`
    : '';

  function copyLanding() {
    if (!landingUrl) return;
    navigator.clipboard.writeText(landingUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const scoreColor = (s: number | null) =>
    s == null ? 'text-gray-400' : s >= 70 ? 'text-emerald-500' : s >= 40 ? 'text-amber-500' : 'text-red-500';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardCheck className="w-6 h-6 text-indigo-500" />
            Auditoría gratis
          </h1>
          <p className="text-muted-foreground mt-1">
            Lead magnet: el prospecto audita su negocio gratis y tú te llevas su email y teléfono ya calientes.
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

      {/* URL pública */}
      {currentSoftware && (
        <div className="p-4 rounded-xl border bg-card flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-medium flex-shrink-0">
            <Globe className="w-4 h-4 text-indigo-500" /> Tu landing pública:
          </div>
          <code className="flex-1 px-3 py-2 rounded-lg bg-muted text-sm truncate">{landingUrl}</code>
          <div className="flex gap-2">
            <button
              onClick={copyLanding}
              className="px-3 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors flex items-center gap-1.5"
            >
              {copied ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copiado' : 'Copiar'}
            </button>
            <a
              href={landingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-1.5"
            >
              <ExternalLink className="w-4 h-4" /> Abrir
            </a>
          </div>
        </div>
      )}

      {/* KPIs */}
      {stats && (
        <div className="grid grid-cols-3 gap-4">
          <StatCard title="Auditorías hechas" value={stats.total} icon={ClipboardCheck} color="text-indigo-500" />
          <StatCard title="Con contacto (leads)" value={stats.conLead} icon={Users} color="text-emerald-500" />
          <StatCard title="Tasa de conversión" value={`${stats.tasaConversion}%`} icon={TrendingUp} color="text-violet-500" />
        </div>
      )}

      {/* Lista */}
      <div className="p-5 rounded-xl border bg-card">
        <h2 className="font-semibold mb-4">Últimas auditorías</h2>
        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Cargando...
          </div>
        ) : audits.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            Aún no hay auditorías. Comparte la landing pública para empezar a captar.
          </div>
        ) : (
          <div className="space-y-1">
            {audits.map((a) => (
              <div key={a.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate flex items-center gap-2">
                    {a.negocio}
                    {a.status === 'error' && <XCircle className="w-3.5 h-3.5 text-red-500" />}
                    {a.status === 'pending' && <Clock className="w-3.5 h-3.5 text-amber-500" />}
                  </div>
                  <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                    {a.email && <span className="inline-flex items-center gap-1"><Mail className="w-3 h-3" /> {a.email}</span>}
                    {a.telefono && <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3" /> {a.telefono}</span>}
                    {a.url && <span className="inline-flex items-center gap-1"><Globe className="w-3 h-3" /> {a.url.replace(/^https?:\/\//, '').split('/')[0]}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {a.leadId && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600">
                      Lead ✓
                    </span>
                  )}
                  <span className={`text-lg font-bold tabular-nums ${scoreColor(a.score)}`}>
                    {a.score ?? '—'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(a.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
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
