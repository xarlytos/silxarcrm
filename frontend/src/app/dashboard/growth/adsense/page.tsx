'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import { Newspaper, Plus, Sparkles, Send, Eye, Trash2, ExternalLink, Loader2, Globe, Settings } from 'lucide-react';

interface Site {
  id: string;
  nombre: string;
  domain: string;
  tema?: string;
  adsenseClient?: string;
  activo: boolean;
  _count?: { articles: number; niches: number };
}
interface Niche {
  id: string;
  nombre: string;
  keywordsSemilla: string[];
  _count?: { articles: number };
}
interface Article {
  id: string;
  title: string;
  slug: string;
  status: string;
  views: number;
  niche?: { nombre: string };
}

export default function AdsenseNetwork() {
  const [sites, setSites] = useState<Site[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [selected, setSelected] = useState<Site | null>(null);
  const [niches, setNiches] = useState<Niche[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [showNewSite, setShowNewSite] = useState(false);

  // form nuevo sitio
  const [f, setF] = useState({ nombre: '', domain: '', tema: '', adsenseClient: '' });
  // form nuevo nicho
  const [nNombre, setNNombre] = useState('');
  const [nKw, setNKw] = useState('');

  async function loadSites() {
    const [s, st]: any[] = await Promise.all([apiClient.getAdSites(), apiClient.getAdStats()]);
    setSites(s.sites || []);
    setStats(st);
  }
  useEffect(() => {
    loadSites();
  }, []);

  async function selectSite(site: Site) {
    setSelected(site);
    const [n, a]: any[] = await Promise.all([
      apiClient.getAdNiches(site.id),
      apiClient.getAdArticles({ siteId: site.id, limit: '50' }),
    ]);
    setNiches(n.niches || []);
    setArticles(a.articles || []);
  }

  async function refreshSelected() {
    if (selected) await selectSite(selected);
    await loadSites();
  }

  async function createSite() {
    if (!f.nombre || !f.domain) return;
    setBusy('site');
    try {
      await apiClient.createAdSite(f);
      setF({ nombre: '', domain: '', tema: '', adsenseClient: '' });
      setShowNewSite(false);
      await loadSites();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusy(null);
    }
  }

  async function createNiche() {
    if (!selected || !nNombre.trim()) return;
    setBusy('niche');
    try {
      await apiClient.createAdNiche({
        siteId: selected.id,
        nombre: nNombre.trim(),
        keywordsSemilla: nKw.split(',').map((k) => k.trim()).filter(Boolean),
      });
      setNNombre('');
      setNKw('');
      await refreshSelected();
    } finally {
      setBusy(null);
    }
  }

  async function generate(nicheId?: string) {
    if (!selected) return;
    setBusy(nicheId || 'batch');
    try {
      if (nicheId) await apiClient.generateAdArticle({ siteId: selected.id, nicheId });
      else await apiClient.generateAdBatch(selected.id, 3);
      await refreshSelected();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusy(null);
    }
  }

  async function togglePublish(a: Article) {
    setBusy(a.id);
    try {
      if (a.status === 'PUBLISHED') await apiClient.unpublishAdArticle(a.id);
      else await apiClient.publishAdArticle(a.id);
      await refreshSelected();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Newspaper className="w-6 h-6 text-indigo-600" /> Red AdSense
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gestiona múltiples blogs, cada uno en su dominio. El CRM es el panel central.
          </p>
        </div>
        <button
          onClick={() => setShowNewSite((v) => !v)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
        >
          <Plus className="w-4 h-4" /> Nuevo blog
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Sitios', value: stats.sites },
            { label: 'Artículos', value: stats.totalArticles },
            { label: 'Publicados', value: stats.published },
            { label: 'Visitas', value: stats.totalViews },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border bg-card p-4">
              <div className="text-2xl font-bold">{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Form nuevo sitio */}
      {showNewSite && (
        <div className="rounded-xl border bg-card p-4 mb-6 grid md:grid-cols-2 gap-3">
          <input className="px-3 py-2 rounded-lg border bg-card text-sm" placeholder="Nombre del blog"
            value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} />
          <input className="px-3 py-2 rounded-lg border bg-card text-sm" placeholder="Dominio (ej: finanzas-hoy.com)"
            value={f.domain} onChange={(e) => setF({ ...f, domain: e.target.value })} />
          <input className="px-3 py-2 rounded-lg border bg-card text-sm md:col-span-2" placeholder="Tema editorial (opcional)"
            value={f.tema} onChange={(e) => setF({ ...f, tema: e.target.value })} />
          <input className="px-3 py-2 rounded-lg border bg-card text-sm md:col-span-2" placeholder="AdSense client (ca-pub-...) opcional"
            value={f.adsenseClient} onChange={(e) => setF({ ...f, adsenseClient: e.target.value })} />
          <button onClick={createSite} disabled={busy === 'site'}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
            {busy === 'site' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Crear blog
          </button>
        </div>
      )}

      {/* Lista de sitios */}
      <div className="grid md:grid-cols-2 gap-3 mb-8">
        {sites.map((site) => (
          <button key={site.id} onClick={() => selectSite(site)}
            className={`text-left rounded-xl border bg-card p-4 hover:border-indigo-400 transition ${selected?.id === site.id ? 'border-indigo-500 ring-1 ring-indigo-500' : ''}`}>
            <div className="flex items-center justify-between">
              <div className="font-semibold flex items-center gap-2">
                <Globe className="w-4 h-4 text-indigo-500" /> {site.nombre}
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${site.adsenseClient ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                {site.adsenseClient ? 'AdSense ✓' : 'Sin AdSense'}
              </span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">{site.domain}</div>
            <div className="text-xs text-muted-foreground mt-2">
              {site._count?.articles || 0} artículos · {site._count?.niches || 0} nichos
            </div>
          </button>
        ))}
      </div>

      {/* Detalle del sitio seleccionado */}
      {selected && (
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2">
              <Settings className="w-4 h-4" /> {selected.nombre}
              <Link href={`/s/${selected.domain}`} target="_blank" className="text-indigo-600 inline-flex items-center gap-1 text-sm font-normal">
                ver <ExternalLink className="w-3 h-3" />
              </Link>
            </h2>
            <button onClick={() => generate()} disabled={busy === 'batch'}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700 disabled:opacity-50">
              {busy === 'batch' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Generar lote (3)
            </button>
          </div>

          {/* Nichos */}
          <h3 className="text-sm font-medium mb-2">Nichos del sitio</h3>
          <div className="flex flex-wrap gap-2 mb-3">
            <input className="px-3 py-2 rounded-lg border bg-card text-sm" placeholder="Nicho"
              value={nNombre} onChange={(e) => setNNombre(e.target.value)} />
            <input className="px-3 py-2 rounded-lg border bg-card text-sm flex-1 min-w-[180px]" placeholder="keywords (coma)"
              value={nKw} onChange={(e) => setNKw(e.target.value)} />
            <button onClick={createNiche} disabled={busy === 'niche'}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border text-sm hover:bg-gray-50 disabled:opacity-50">
              <Plus className="w-4 h-4" /> Añadir
            </button>
          </div>
          <div className="grid gap-2 mb-6">
            {niches.map((n) => (
              <div key={n.id} className="flex items-center justify-between rounded-lg border bg-background px-3 py-2">
                <span className="text-sm">{n.nombre} <span className="text-xs text-muted-foreground">· {n._count?.articles || 0} art.</span></span>
                <button onClick={() => generate(n.id)} disabled={busy === n.id}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs hover:bg-indigo-100 disabled:opacity-50">
                  {busy === n.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />} Generar
                </button>
              </div>
            ))}
          </div>

          {/* Artículos */}
          <h3 className="text-sm font-medium mb-2">Artículos</h3>
          {articles.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4 text-center">Aún no hay artículos en este sitio.</p>
          ) : (
            <div className="grid gap-2">
              {articles.map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded-lg border bg-background px-3 py-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{a.title}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <span className={a.status === 'PUBLISHED' ? 'text-green-600' : 'text-amber-600'}>
                        {a.status === 'PUBLISHED' ? 'Publicado' : 'Borrador'}
                      </span>
                      {a.niche && <span>· {a.niche.nombre}</span>}
                      <span className="inline-flex items-center gap-1"><Eye className="w-3 h-3" /> {a.views}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {a.status === 'PUBLISHED' && (
                      <Link href={`/s/${selected.domain}/${a.slug}`} target="_blank" className="p-1.5 text-gray-400 hover:text-gray-700">
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                    )}
                    <button onClick={() => togglePublish(a)} disabled={busy === a.id}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs hover:bg-gray-50 disabled:opacity-50">
                      <Send className="w-3 h-3" /> {a.status === 'PUBLISHED' ? 'Despublicar' : 'Publicar'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
