'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import {
  FileText,
  Sparkles,
  Search,
  MapPin,
  Hash,
  Loader2,
  Check,
  ArrowLeft,
  Plus,
  Globe,
  TrendingUp,
  Lightbulb,
} from 'lucide-react';
import Link from 'next/link';

interface KeywordSuggestion {
  keyword: string;
  volume: number;
  difficulty: number;
  intent: string;
  contentType: string;
}

export default function SeoEnginePage() {
  const router = useRouter();
  const [softwareId, setSoftwareId] = useState('');
  const [softwares, setSoftwares] = useState<Array<{ id: string; nombre: string }>>([]);
  const [activeTab, setActiveTab] = useState<'generate' | 'keywords' | 'landings'>('generate');
  const [generating, setGenerating] = useState(false);
  const [keywords, setKeywords] = useState<KeywordSuggestion[]>([]);
  const [keywordsLoading, setKeywordsLoading] = useState(false);

  // Generate form
  const [articleCount, setArticleCount] = useState(3);
  const [faqCount, setFaqCount] = useState(2);
  const [comparisonCount, setComparisonCount] = useState(1);
  const [caseStudyCount, setCaseStudyCount] = useState(1);
  const [baseKeyword, setBaseKeyword] = useState('');
  const [cities, setCities] = useState('');
  const [generated, setGenerated] = useState(false);

  useEffect(() => {
    loadSoftwares();
  }, []);

  async function loadSoftwares() {
    try {
      const res = await apiClient.getSoftwares();
      const list = res?.data || [];
      setSoftwares(list);
      if (list.length > 0) setSoftwareId(list[0].id);
    } catch { }
  }

  async function handleGenerate() {
    setGenerating(true);
    try {
      const options: any = {};

      if (articleCount > 0) {
        options.articles = Array.from({ length: articleCount }, (_, i) => ({
          keyword: `${baseKeyword || 'gestión'} ${i + 1}`,
        }));
      }
      if (faqCount > 0) {
        options.faqs = Array.from({ length: faqCount }, (_, i) => ({
          keyword: `${baseKeyword || 'pregunta'} ${i + 1}`,
        }));
      }
      if (comparisonCount > 0) {
        options.comparisons = [{ competitor: 'competidor principal' }];
      }
      if (caseStudyCount > 0) {
        options.caseStudies = [{ metric: 'resultados' }];
      }

      const cityList = cities.split(',').map((c) => c.trim()).filter(Boolean);
      if (cityList.length > 0 && baseKeyword) {
        options.programmaticLandings = [{
          baseKeyword,
          cities: cityList,
        }];
      }

      await apiClient.generateSeoBatch(softwareId, options);
      setGenerated(true);
      setTimeout(() => setGenerated(false), 3000);
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setGenerating(false);
    }
  }

  async function loadKeywords() {
    if (!softwareId) return;
    setKeywordsLoading(true);
    try {
      const data = await apiClient.getKeywordSuggestions(softwareId, baseKeyword || undefined);
      setKeywords(data);
    } catch {
      setKeywords([]);
    } finally {
      setKeywordsLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/growth" className="p-2 rounded-lg border hover:bg-muted">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Globe className="w-6 h-6 text-green-500" />
              SEO Engine
            </h1>
            <p className="text-muted-foreground mt-1">
              Genera contenido SEO masivo: artículos, FAQs, comparativas y landing pages programáticas.
            </p>
          </div>
        </div>
        <select
          value={softwareId}
          onChange={(e) => setSoftwareId(e.target.value)}
          className="px-3 py-2 rounded-lg border bg-card"
        >
          {softwares.map((s) => (
            <option key={s.id} value={s.id}>{s.nombre}</option>
          ))}
        </select>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {[
          { id: 'generate', label: 'Generar Contenido', icon: Sparkles },
          { id: 'keywords', label: 'Keyword Research', icon: Search },
          { id: 'landings', label: 'Landings Programáticas', icon: MapPin },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Generate Content Tab */}
      {activeTab === 'generate' && (
        <div className="space-y-6">
          <div className="p-6 rounded-xl border bg-card space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">Keyword base (opcional)</label>
              <input
                type="text"
                value={baseKeyword}
                onChange={(e) => setBaseKeyword(e.target.value)}
                placeholder="ej: software dental, gestión veterinaria..."
                className="w-full px-4 py-2.5 rounded-lg border bg-card"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <ContentTypeCard
                icon={FileText}
                title="Artículos"
                description="Posts de blog largos optimizados para SEO"
                count={articleCount}
                onChange={setArticleCount}
                color="text-blue-500"
              />
              <ContentTypeCard
                icon={Hash}
                title="FAQs"
                description="Preguntas frecuentes con schema markup"
                count={faqCount}
                onChange={setFaqCount}
                color="text-purple-500"
              />
              <ContentTypeCard
                icon={TrendingUp}
                title="Comparativas"
                description="Comparaciones con competidores"
                count={comparisonCount}
                onChange={setComparisonCount}
                color="text-orange-500"
              />
              <ContentTypeCard
                icon={Lightbulb}
                title="Casos de Éxito"
                description="Historias de clientes satisfechos"
                count={caseStudyCount}
                onChange={setCaseStudyCount}
                color="text-yellow-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Ciudades para landings programáticas (opcional)
              </label>
              <input
                type="text"
                value={cities}
                onChange={(e) => setCities(e.target.value)}
                placeholder="Madrid, Barcelona, Valencia, Sevilla..."
                className="w-full px-4 py-2.5 rounded-lg border bg-card"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Separa las ciudades con comas. Se generará una landing page por cada ciudad.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {generating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generando contenido SEO...
                </>
              ) : generated ? (
                <>
                  <Check className="w-5 h-5" />
                  ¡Generado!
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Generar contenido SEO
                </>
              )}
            </button>
            <button
              onClick={() => router.push('/dashboard/growth/content')}
              className="flex items-center gap-2 px-4 py-3 rounded-xl border hover:bg-muted"
            >
              Ver biblioteca
            </button>
          </div>
        </div>
      )}

      {/* Keywords Tab */}
      {activeTab === 'keywords' && (
        <div className="space-y-6">
          <div className="flex gap-3">
            <input
              type="text"
              value={baseKeyword}
              onChange={(e) => setBaseKeyword(e.target.value)}
              placeholder="Semilla de keyword..."
              className="flex-1 px-4 py-2.5 rounded-lg border bg-card"
            />
            <button
              onClick={loadKeywords}
              disabled={keywordsLoading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {keywordsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Buscar
            </button>
          </div>

          {keywords.length > 0 && (
            <div className="rounded-xl border bg-card overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium">Keyword</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Volumen</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Dificultad</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Intención</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Tipo</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {keywords.map((k, i) => (
                    <tr key={i} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{k.keyword}</td>
                      <td className="px-4 py-3 text-right">{k.volume.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          k.difficulty < 30 ? 'bg-green-100 text-green-700' :
                          k.difficulty < 60 ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {k.difficulty}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">{k.intent}</td>
                      <td className="px-4 py-3 text-sm">{k.contentType}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Landings Tab */}
      {activeTab === 'landings' && (
        <div className="space-y-6">
          <div className="p-6 rounded-xl border bg-card space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Keyword base</label>
              <input
                type="text"
                value={baseKeyword}
                onChange={(e) => setBaseKeyword(e.target.value)}
                placeholder="ej: software dental"
                className="w-full px-4 py-2.5 rounded-lg border bg-card"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Ciudades</label>
              <input
                type="text"
                value={cities}
                onChange={(e) => setCities(e.target.value)}
                placeholder="Madrid, Barcelona, Valencia, Sevilla, Bilbao..."
                className="w-full px-4 py-2.5 rounded-lg border bg-card"
              />
            </div>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 disabled:opacity-50"
            >
              {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <MapPin className="w-5 h-5" />}
              Generar Landing Pages
            </button>
          </div>

          <div className="p-4 rounded-xl border bg-muted/30">
            <h3 className="font-semibold mb-2">¿Qué son las landing pages programáticas?</h3>
            <p className="text-sm text-muted-foreground">
              Landing pages que se generan automáticamente combinando tu producto con ciudades.
              Cada página es única y optimizada para captar tráfico local.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {['software-dental-madrid', 'software-dental-barcelona', 'software-dental-valencia', 'gestion-peluqueria-sevilla', 'software-veterinario-bilbao'].map((slug) => (
                <span key={slug} className="px-2 py-1 rounded bg-card text-xs font-mono">/{slug}</span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ContentTypeCard({
  icon: Icon,
  title,
  description,
  count,
  onChange,
  color,
}: {
  icon: any;
  title: string;
  description: string;
  count: number;
  onChange: (n: number) => void;
  color: string;
}) {
  return (
    <div className="p-4 rounded-xl border bg-card">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-5 h-5 ${color}`} />
        <h3 className="font-semibold">{title}</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-3">{description}</p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(Math.max(0, count - 1))}
          className="w-8 h-8 rounded-lg border hover:bg-muted flex items-center justify-center"
        >
          -
        </button>
        <span className="w-8 text-center font-bold">{count}</span>
        <button
          onClick={() => onChange(count + 1)}
          className="w-8 h-8 rounded-lg border hover:bg-muted flex items-center justify-center"
        >
          +
        </button>
      </div>
    </div>
  );
}
