'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import {
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Check,
  Share2,
  Facebook,
  Instagram,
  Twitter,
  Linkedin,
  Music,
  Loader2,
  Edit3,
  Calendar,
  Hash,
  Type,
  Palette,
  Wand2,
  X,
  Save,
  Briefcase,
  Coffee,
  Smile,
  Cpu,
  Lightbulb,
  Target,
  AlertCircle,
  CheckCircle2,
  Trash2,
  FileText,
} from 'lucide-react';

interface GeneratedPost {
  id?: string;
  title: string;
  body: string;
  hashtags: string[];
  tone: string;
  cta: string;
  platform: string;
  editing?: boolean;
  scheduledAt?: string;
}

interface PostGeneratorProps {
  softwareId: string;
}

const platforms = [
  { id: 'LINKEDIN', label: 'LinkedIn', icon: Linkedin, color: 'from-blue-600 to-blue-500', ring: 'ring-blue-500' },
  { id: 'FACEBOOK', label: 'Facebook', icon: Facebook, color: 'from-blue-500 to-indigo-500', ring: 'ring-blue-500' },
  { id: 'INSTAGRAM', label: 'Instagram', icon: Instagram, color: 'from-pink-500 to-rose-500', ring: 'ring-pink-500' },
  { id: 'X', label: 'X (Twitter)', icon: Twitter, color: 'from-zinc-700 to-zinc-600', ring: 'ring-zinc-500' },
  { id: 'TIKTOK', label: 'TikTok', icon: Music, color: 'from-red-500 to-fuchsia-500', ring: 'ring-red-500' },
];

const tones = [
  { id: 'profesional', label: 'Profesional', icon: Briefcase, color: 'from-slate-600 to-slate-500' },
  { id: 'casual', label: 'Casual', icon: Coffee, color: 'from-amber-500 to-orange-500' },
  { id: 'divertido', label: 'Divertido', icon: Smile, color: 'from-yellow-500 to-amber-400' },
  { id: 'tecnico', label: 'Tecnico', icon: Cpu, color: 'from-cyan-500 to-blue-500' },
  { id: 'inspirador', label: 'Inspirador', icon: Lightbulb, color: 'from-violet-500 to-purple-500' },
  { id: 'ventas', label: 'Ventas', icon: Target, color: 'from-red-500 to-rose-500' },
];

const contentFormats = [
  { id: 'single', label: 'Post simple', description: 'Un post unico por plataforma' },
  { id: 'carousel', label: 'Carrusel', description: 'Multiples slides (LinkedIn/Instagram)' },
  { id: 'thread', label: 'Thread', description: 'Serie de tweets conectados' },
  { id: 'story', label: 'Story', description: 'Story interactiva (Instagram)' },
];

const topics = [
  'Errores comunes que cometen los duenos de negocio',
  'Beneficios de digitalizar tu negocio',
  'Mitos sobre la gestion de negocios',
  'Como ahorrar tiempo en tareas repetitivas',
  'Casos de exito de negocios que escalaron',
  'Consejos para retener clientes',
  'Como mejorar la productividad del equipo',
  'Tendencias del sector para este ano',
  'Errores que cuestan dinero a tu negocio',
  'Como diferenciarte de la competencia',
];

export default function PostGenerator({ softwareId }: PostGeneratorProps) {
  const [step, setStep] = useState(1);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['LINKEDIN']);
  const [selectedTone, setSelectedTone] = useState('profesional');
  const [selectedFormat, setSelectedFormat] = useState('single');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [customTopic, setCustomTopic] = useState('');
  const [countPerPlatform, setCountPerPlatform] = useState(5);
  const [generating, setGenerating] = useState(false);
  const [generatedPosts, setGeneratedPosts] = useState<GeneratedPost[]>([]);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);

  const topic = customTopic || selectedTopic;

  async function handleGenerate() {
    if (selectedPlatforms.length === 0) {
      alert('Selecciona al menos una plataforma');
      return;
    }
    if (!topic) {
      alert('Selecciona o escribe un tema');
      return;
    }

    setGenerating(true);
    setProgress(0);

    const progressInterval = setInterval(() => {
      setProgress((p) => {
        if (p >= 90) return p;
        return p + Math.random() * 15;
      });
    }, 300);

    try {
      const result = await apiClient.generateMultiPlatformPosts({
        softwareId,
        platforms: selectedPlatforms,
        countPerPlatform,
        topic,
        tone: selectedTone,
      });

      clearInterval(progressInterval);
      setProgress(100);

      const posts: GeneratedPost[] = [];
      for (const [platform, platformPosts] of Object.entries(result)) {
        if (Array.isArray(platformPosts)) {
          platformPosts.forEach((post: any) => {
            posts.push({
              ...post,
              platform,
              scheduledAt: '',
            });
          });
        }
      }
      setGeneratedPosts(posts);

      setTimeout(() => {
        setGenerating(false);
        setStep(2);
      }, 500);
    } catch (err: any) {
      clearInterval(progressInterval);
      setGenerating(false);
      alert('Error generando posts: ' + err.message);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const toSchedule = generatedPosts.filter((p) => p.scheduledAt);
      for (const post of toSchedule) {
        if (post.id && post.scheduledAt) {
          await apiClient.scheduleGrowthContent(post.id, post.scheduledAt);
        }
      }
      alert(`${generatedPosts.length} posts guardados correctamente`);
      setStep(3);
    } catch (err: any) {
      alert('Error guardando: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  function togglePlatform(id: string) {
    setSelectedPlatforms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  }

  function updatePost(index: number, field: string, value: string) {
    setGeneratedPosts((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }

  function removePost(index: number) {
    setGeneratedPosts((prev) => prev.filter((_, i) => i !== index));
  }

  function getPlatformLabel(id: string) {
    return platforms.find((p) => p.id === id)?.label || id;
  }

  function getPlatformColor(id: string) {
    return platforms.find((p) => p.id === id)?.color || 'from-gray-500 to-gray-400';
  }

  const stepLabels = ['Configurar', 'Revisar', 'Listo'];

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-1 sm:gap-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-1 sm:gap-2">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-500 ${
                  s === step
                    ? 'bg-primary text-primary-foreground scale-110 shadow-lg shadow-primary/30'
                    : s < step
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {s < step ? <Check className="w-5 h-5" /> : s}
              </div>
              <span className={`text-[10px] font-semibold uppercase tracking-wider ${
                s === step ? 'text-primary' : s < step ? 'text-emerald-500' : 'text-muted-foreground'
              }`}>
                {stepLabels[s - 1]}
              </span>
            </div>
            {s < 3 && (
              <div className="w-8 sm:w-16 h-1 rounded-full overflow-hidden bg-muted mb-5">
                <div
                  className={`h-full rounded-full transition-all duration-700 ease-out ${
                    s < step ? 'bg-emerald-500 w-full' : 'w-0'
                  }`}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Generating Overlay */}
      {generating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-card border rounded-2xl p-8 max-w-md w-full mx-4 text-center shadow-2xl">
            <div className="relative w-16 h-16 mx-auto mb-5">
              <div className="absolute inset-0 rounded-full border-4 border-muted" />
              <div
                className="absolute inset-0 rounded-full border-4 border-t-primary border-r-transparent border-b-transparent border-l-transparent animate-spin"
                style={{ animationDuration: '1s' }}
              />
              <Sparkles className="absolute inset-0 m-auto w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-bold mb-2">Generando contenido...</h3>
            <p className="text-sm text-muted-foreground mb-5">
              {selectedPlatforms.length * countPerPlatform} posts en proceso
            </p>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground mt-2 inline-block">
              {Math.round(Math.min(progress, 100))}%
            </span>
          </div>
        </div>
      )}

      {/* Steps */}
      <div className="min-h-[400px]">
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="p-6 sm:p-8 rounded-2xl border bg-card space-y-8">
              {/* Platforms */}
              <div>
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-md">
                    <Share2 className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[15px]">1. Selecciona las plataformas</h3>
                    <p className="text-xs text-muted-foreground">{selectedPlatforms.length} seleccionada{selectedPlatforms.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {platforms.map((p) => {
                    const isSelected = selectedPlatforms.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        onClick={() => togglePlatform(p.id)}
                        className={`relative flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all duration-300 ${
                          isSelected
                            ? `${p.ring} ring-2 bg-card shadow-lg scale-[1.02]`
                            : 'bg-card hover:bg-muted/60 border-border hover:border-muted-foreground/30'
                        }`}
                      >
                        <div className={`p-3 rounded-xl bg-gradient-to-br ${p.color} shadow-md transition-transform duration-300 ${isSelected ? 'scale-110' : ''}`}>
                          <p.icon className="w-5 h-5 text-white" />
                        </div>
                        <span className={`text-sm font-semibold ${isSelected ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {p.label}
                        </span>
                        {isSelected && (
                          <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shadow-sm">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

              {/* Topic */}
              <div>
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-md">
                    <Type className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="font-bold text-[15px]">2. Elige el tema</h3>
                </div>
                <div className="flex flex-wrap gap-2 mb-4">
                  {topics.map((t) => (
                    <button
                      key={t}
                      onClick={() => { setSelectedTopic(t); setCustomTopic(''); }}
                      className={`px-4 py-2.5 rounded-xl text-sm border-2 transition-all duration-200 ${
                        selectedTopic === t && !customTopic
                          ? 'bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20 font-semibold'
                          : 'bg-card hover:bg-muted/60 border-border hover:border-primary/30'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={customTopic}
                    onChange={(e) => { setCustomTopic(e.target.value); setSelectedTopic(''); }}
                    placeholder="O escribe tu propio tema..."
                    className="w-full px-4 py-3.5 rounded-xl border-2 bg-card text-sm font-medium focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-muted-foreground/60"
                  />
                  {customTopic && (
                    <button
                      onClick={() => setCustomTopic('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-muted transition-colors"
                    >
                      <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                  )}
                </div>
              </div>

              <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

              {/* Tone & Format */}
              <div>
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-md">
                    <Palette className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="font-bold text-[15px]">3. Tono y formato</h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-5">
                  {tones.map((t) => {
                    const isSelected = selectedTone === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => setSelectedTone(t.id)}
                        className={`flex items-center gap-2.5 p-3 rounded-xl border-2 transition-all duration-200 ${
                          isSelected
                            ? 'border-primary bg-primary/5 shadow-md'
                            : 'border-border bg-card hover:bg-muted/60'
                        }`}
                      >
                        <div className={`p-1.5 rounded-lg bg-gradient-to-br ${t.color} ${isSelected ? 'scale-110' : ''} transition-transform`}>
                          <t.icon className="w-3.5 h-3.5 text-white" />
                        </div>
                        <span className={`text-sm font-semibold ${isSelected ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {t.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="relative">
                  <select
                    value={selectedFormat}
                    onChange={(e) => setSelectedFormat(e.target.value)}
                    className="w-full px-4 py-3.5 rounded-xl border-2 bg-card text-sm font-medium focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all appearance-none cursor-pointer"
                  >
                    {contentFormats.map((f) => (
                      <option key={f.id} value={f.id}>{f.label} — {f.description}</option>
                    ))}
                  </select>
                  <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground rotate-90 pointer-events-none" />
                </div>
              </div>

              <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

              {/* Count */}
              <div>
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-md">
                    <Hash className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="font-bold text-[15px]">4. Cantidad</h3>
                </div>
                <div className="flex items-center gap-5">
                  <input
                    type="range"
                    min="1"
                    max="30"
                    value={countPerPlatform}
                    onChange={(e) => setCountPerPlatform(parseInt(e.target.value))}
                    className="flex-1 accent-primary h-2 rounded-full appearance-none bg-muted cursor-pointer"
                  />
                  <div className="flex items-center gap-2 bg-muted rounded-xl px-4 py-2">
                    <span className="text-2xl font-extrabold tabular-nums">{countPerPlatform}</span>
                    <span className="text-sm text-muted-foreground font-medium">posts/plataforma</span>
                  </div>
                </div>
                <div className="mt-3 text-center">
                  <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-bold">
                    <Sparkles className="w-4 h-4" />
                    Total: {selectedPlatforms.length * countPerPlatform} posts
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="flex items-center gap-2.5 px-8 py-4 rounded-2xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground text-base font-bold hover:opacity-90 transition-all disabled:opacity-50 shadow-xl shadow-primary/25 hover:shadow-2xl hover:shadow-primary/30 hover:-translate-y-0.5"
              >
                <Sparkles className="w-5 h-5" />
                Generar posts con IA
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Revisa y edita tus posts</h2>
                <p className="text-muted-foreground text-sm">{generatedPosts.length} posts generados por IA</p>
              </div>
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 hover:bg-muted transition-all text-sm font-semibold"
              >
                <ChevronLeft className="w-4 h-4" />
                Volver
              </button>
            </div>

            <div className="space-y-4">
              {generatedPosts.map((post, index) => (
                <div
                  key={index}
                  className="group p-5 rounded-2xl border-2 bg-card hover:border-primary/30 transition-all duration-300"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                      <span className={`px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r ${getPlatformColor(post.platform)} shadow-md`}>
                        {getPlatformLabel(post.platform)}
                      </span>
                      <span className="text-xs text-muted-foreground font-medium">
                        {post.body.length} chars
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          const updated = [...generatedPosts];
                          updated[index].editing = !updated[index].editing;
                          setGeneratedPosts(updated);
                        }}
                        className="p-2 rounded-xl hover:bg-muted transition-colors"
                        title="Editar"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => removePost(index)}
                        className="p-2 rounded-xl hover:bg-red-100 text-red-500 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {post.editing ? (
                    <div className="space-y-3">
                      <input
                        value={post.title}
                        onChange={(e) => updatePost(index, 'title', e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border-2 bg-card text-sm font-bold focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all"
                        placeholder="Titulo/Hook"
                      />
                      <textarea
                        value={post.body}
                        onChange={(e) => updatePost(index, 'body', e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border-2 bg-card text-sm min-h-[140px] focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all resize-y leading-relaxed"
                        placeholder="Contenido del post"
                      />
                      <input
                        value={post.hashtags.join(' ')}
                        onChange={(e) => updatePost(index, 'hashtags', e.target.value.split(' '))}
                        className="w-full px-4 py-3 rounded-xl border-2 bg-card text-sm focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all"
                        placeholder="#hashtags"
                      />
                    </div>
                  ) : (
                    <div>
                      <p className="font-bold text-sm mb-3">{post.title}</p>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{post.body}</p>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {post.hashtags.map((h, i) => (
                          <span key={i} className="px-2 py-1 rounded-lg bg-primary/10 text-primary text-xs font-bold">{h}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3 mt-4 pt-4 border-t border-border/60">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <input
                      type="datetime-local"
                      value={post.scheduledAt || ''}
                      onChange={(e) => updatePost(index, 'scheduledAt', e.target.value)}
                      className="px-3 py-2 rounded-xl border-2 bg-card text-sm focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all"
                    />
                    {post.scheduledAt && (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-bold px-2 py-1 rounded-lg bg-emerald-500/10">
                        <CheckCircle2 className="w-3 h-3" />
                        Programado
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between pt-2">
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-2 px-5 py-3 rounded-xl border-2 hover:bg-muted transition-all text-sm font-semibold"
              >
                <ChevronLeft className="w-4 h-4" />
                Atras
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2.5 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold hover:opacity-90 transition-all disabled:opacity-50 shadow-xl shadow-emerald-500/25 hover:shadow-2xl hover:shadow-emerald-500/30 hover:-translate-y-0.5"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Guardar posts
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="text-center py-20 animate-in zoom-in fade-in duration-500">
            <div className="relative w-24 h-24 mx-auto mb-6">
              <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
              <div className="absolute inset-2 rounded-full bg-emerald-500/10 animate-pulse" />
              <div className="relative w-full h-full rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-xl shadow-emerald-500/30">
                <Check className="w-10 h-10 text-white" strokeWidth={3} />
              </div>
            </div>
            <h2 className="text-3xl font-extrabold mb-3">Posts guardados</h2>
            <p className="text-muted-foreground mb-2 max-w-md mx-auto text-lg">
              {generatedPosts.length} posts guardados en tu biblioteca.
            </p>
            {generatedPosts.filter((p) => p.scheduledAt).length > 0 && (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 text-emerald-600 text-sm font-bold mb-8">
                <Calendar className="w-4 h-4" />
                {generatedPosts.filter((p) => p.scheduledAt).length} posts programados
              </div>
            )}
            <div className="flex justify-center gap-3">
              <button
                onClick={() => { setStep(1); setGeneratedPosts([]); }}
                className="px-6 py-3 rounded-xl border-2 hover:bg-muted transition-all text-sm font-bold"
              >
                Generar mas
              </button>
              <a
                href="/dashboard/growth/calendar"
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:opacity-90 transition-all text-sm font-bold shadow-lg shadow-primary/25"
              >
                Ver calendario
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
