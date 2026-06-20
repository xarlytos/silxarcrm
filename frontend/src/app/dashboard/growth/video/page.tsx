'use client';

import { useEffect, useState, useRef } from 'react';
import { apiClient } from '@/lib/api';
import {
  Video,
  Sparkles,
  ArrowLeft,
  Loader2,
  Play,
  Pause,
  Clock,
  Hash,
  Share2,
  Music,
  Image,
  Check,
  Download,
  Wand2,
  Type,
  Palette,
  Mic,
  Briefcase,
  Coffee,
  Smile,
  Lightbulb,
  Target,
} from 'lucide-react';
import Link from 'next/link';

interface VideoTemplate {
  id: string;
  name: string;
  description: string;
  structure: string;
  sceneCount: number;
  duration: number;
  musicStyle: string;
  visualStyle: string;
}

interface VideoScene {
  time: string;
  voiceover: string;
  visual: string;
  subtitle: string;
  imagePrompt?: string;
  bRoll?: string;
}

interface VideoScript {
  hook: string;
  scenes: VideoScene[];
  totalWords: number;
  estimatedDuration: number;
  cta: string;
  musicStyle: string;
  suggestedImages: string[];
}

interface VideoKit {
  script: VideoScript;
  storyboard: VideoScene[];
  suggestedHashtags: string[];
  suggestedCaptions: string[];
}

export default function VideoEnginePage() {
  const [softwareId, setSoftwareId] = useState('');
  const [softwares, setSoftwares] = useState<Array<{ id: string; nombre: string }>>([]);
  const [templates, setTemplates] = useState<VideoTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState('hook_fact_cta');
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState('profesional');
  const [generating, setGenerating] = useState(false);
  const [kit, setKit] = useState<VideoKit | null>(null);
  const [contentPieceId, setContentPieceId] = useState('');
  const [activeScene, setActiveScene] = useState(0);
  const [audioUrl, setAudioUrl] = useState('');
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    loadSoftwares();
    loadTemplates();
  }, []);

  async function loadSoftwares() {
    try {
      const res = await apiClient.getSoftwares();
      const list = res?.data || [];
      setSoftwares(list);
      if (list.length > 0) setSoftwareId(list[0].id);
    } catch {}
  }

  async function loadTemplates() {
    try {
      const data = await apiClient.getVideoTemplates();
      setTemplates(data);
    } catch {}
  }

  async function handleGenerate() {
    if (!topic) return;
    setGenerating(true);
    try {
      const result = await apiClient.generateVideoKit({
        softwareId,
        topic,
        template: selectedTemplate,
        tone,
        generateAudio: true,
      });

      if (result.kit) {
        setKit(result.kit);
        setContentPieceId(result.contentPieceId || '');

        // Si hay audio, cargarlo
        if (result.contentPieceId) {
          try {
            const audioRes = await fetch(`/api/growth/video/${result.contentPieceId}/voice`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
            });
            if (audioRes.ok) {
              const blob = await audioRes.blob();
              setAudioUrl(URL.createObjectURL(blob));
            }
          } catch {}
        }
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setGenerating(false);
    }
  }

  function toggleAudio() {
    if (audioRef.current) {
      if (playing) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setPlaying(!playing);
    }
  }

  const tones = [
    { id: 'profesional', label: 'Profesional', icon: Briefcase },
    { id: 'casual', label: 'Casual', icon: Coffee },
    { id: 'divertido', label: 'Divertido', icon: Smile },
    { id: 'inspirador', label: 'Inspirador', icon: Lightbulb },
    { id: 'ventas', label: 'Ventas', icon: Target },
  ];

  const topics = [
    'Cómo ahorrar 10 horas semanales en tu negocio',
    'El error #1 que cometen los dueños de negocio',
    '3 herramientas que cambiarán tu negocio',
    'Por qué tu competencia te está ganando clientes',
    'Antes vs Después: digitalizar mi negocio',
    'Mito: "Mi negocio es too small para software"',
    'Un día en la vida de un negocio organizado',
    'Cómo retener clientes sin esfuerzo',
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/growth" className="p-2 rounded-lg border hover:bg-muted">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Video className="w-6 h-6 text-red-500" />
              Video Engine
            </h1>
            <p className="text-muted-foreground mt-1">
              Genera guiones, voz y storyboard para videos cortos.
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

      {!kit ? (
        <div className="space-y-6">
          {/* Template Selection */}
          <div className="p-6 rounded-xl border bg-card space-y-4">
            <div className="flex items-center gap-2">
              <Wand2 className="w-5 h-5" />
              <h3 className="font-semibold">1. Selecciona un template</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {templates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTemplate(t.id)}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    selectedTemplate === t.id
                      ? 'ring-2 ring-red-500 bg-card'
                      : 'bg-card hover:bg-muted'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-sm">{t.name}</span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {t.duration}s
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{t.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {Array.from({ length: t.sceneCount }).map((_, i) => (
                      <div
                        key={i}
                        className={`w-6 h-1 rounded-full ${
                          selectedTemplate === t.id ? 'bg-red-500' : 'bg-muted'
                        }`}
                      />
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Topic */}
          <div className="p-6 rounded-xl border bg-card space-y-4">
            <div className="flex items-center gap-2">
              <Type className="w-5 h-5" />
              <h3 className="font-semibold">2. Elige el tema</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {topics.map((t) => (
                <button
                  key={t}
                  onClick={() => setTopic(t)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                    topic === t
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card hover:bg-muted'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="O escribe tu propio tema..."
              className="w-full px-4 py-2.5 rounded-lg border bg-card"
            />
          </div>

          {/* Tone */}
          <div className="p-6 rounded-xl border bg-card space-y-4">
            <div className="flex items-center gap-2">
              <Palette className="w-5 h-5" />
              <h3 className="font-semibold">3. Tono</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {tones.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTone(t.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                    tone === t.id
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card hover:bg-muted'
                  }`}
                >
                  <t.icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleGenerate}
              disabled={generating || !topic}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-red-500 text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {generating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generando kit de video...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Generar video
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Kit Results */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Kit de Video Generado</h2>
              <p className="text-muted-foreground">
                {kit.script.scenes.length} escenas • {kit.script.totalWords} palabras • ~{kit.script.estimatedDuration}s
              </p>
            </div>
            <div className="flex gap-2">
              {audioUrl && (
                <button
                  onClick={toggleAudio}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border hover:bg-muted"
                >
                  {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  {playing ? 'Pausar' : 'Escuchar voz'}
                </button>
              )}
              <button
                onClick={() => { setKit(null); setAudioUrl(''); }}
                className="px-4 py-2 rounded-lg border hover:bg-muted"
              >
                Nuevo video
              </button>
            </div>
          </div>

          {audioUrl && (
            <audio
              ref={audioRef}
              src={audioUrl}
              onEnded={() => setPlaying(false)}
              className="hidden"
            />
          )}

          {/* Hook */}
          <div className="p-4 rounded-xl border bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-red-500" />
              <span className="text-sm font-semibold text-red-600">Hook (primeros 3 segundos)</span>
            </div>
            <p className="text-lg font-bold">{kit.script.hook}</p>
          </div>

          {/* Storyboard */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Image className="w-4 h-4" />
              Storyboard
            </h3>
            {kit.script.scenes.map((scene, index) => (
              <div
                key={index}
                onClick={() => setActiveScene(index)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  activeScene === index
                    ? 'ring-2 ring-red-500 bg-card'
                    : 'bg-card hover:bg-muted'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center text-sm font-bold text-red-600">
                    {index + 1}
                  </span>
                  <span className="text-sm font-medium">{scene.time}</span>
                  <span className="text-xs text-muted-foreground flex-1 truncate">
                    {scene.visual.slice(0, 60)}...
                  </span>
                </div>

                {activeScene === index && (
                  <div className="mt-3 space-y-3 pl-11">
                    <div>
                      <span className="text-xs font-medium text-muted-foreground">Voiceover</span>
                      <p className="text-sm">{scene.voiceover}</p>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-muted-foreground">Visual</span>
                      <p className="text-sm text-muted-foreground">{scene.visual}</p>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-muted-foreground">Subtitle</span>
                      <p className="text-sm font-bold">{scene.subtitle}</p>
                    </div>
                    {scene.imagePrompt && (
                      <div>
                        <span className="text-xs font-medium text-muted-foreground">Image Prompt</span>
                        <p className="text-xs text-muted-foreground bg-muted p-2 rounded mt-1">
                          {scene.imagePrompt}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="p-4 rounded-xl border bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
            <div className="flex items-center gap-2 mb-2">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-sm font-semibold text-green-600">CTA Final</span>
            </div>
            <p className="font-bold">{kit.script.cta}</p>
          </div>

          {/* Hashtags & Captions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border bg-card">
              <div className="flex items-center gap-2 mb-3">
                <Hash className="w-4 h-4" />
                <span className="font-semibold">Hashtags sugeridos</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {kit.suggestedHashtags.map((h, i) => (
                  <span key={i} className="px-2 py-1 rounded-full bg-muted text-xs">
                    {h}
                  </span>
                ))}
              </div>
            </div>
            <div className="p-4 rounded-xl border bg-card">
              <div className="flex items-center gap-2 mb-3">
                <Share2 className="w-4 h-4" />
                <span className="font-semibold">Captions sugeridos</span>
              </div>
              <div className="space-y-2">
                {kit.suggestedCaptions.map((c, i) => (
                  <p key={i} className="text-xs text-muted-foreground">{c}</p>
                ))}
              </div>
            </div>
          </div>

          {/* Music & Visuals */}
          <div className="p-4 rounded-xl border bg-card">
            <div className="flex items-center gap-2 mb-3">
              <Music className="w-4 h-4" />
              <span className="font-semibold">Estilo musical</span>
            </div>
            <p className="text-sm text-muted-foreground">{kit.script.musicStyle}</p>
          </div>

          {/* Image Prompts */}
          {kit.script.suggestedImages.length > 0 && (
            <div className="p-4 rounded-xl border bg-card">
              <div className="flex items-center gap-2 mb-3">
                <Image className="w-4 h-4" />
                <span className="font-semibold">Imágenes sugeridas</span>
              </div>
              <div className="space-y-2">
                {kit.script.suggestedImages.map((img, i) => (
                  <p key={i} className="text-xs text-muted-foreground bg-muted p-2 rounded">
                    {img}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Download */}
          <div className="flex gap-3">
            <button
              onClick={() => {
                const data = JSON.stringify(kit, null, 2);
                const blob = new Blob([data], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `video-kit-${Date.now()}.json`;
                a.click();
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border hover:bg-muted"
            >
              <Download className="w-4 h-4" />
              Descargar kit JSON
            </button>
            {audioUrl && (
              <a
                href={audioUrl}
                download={`voiceover-${Date.now()}.mp3`}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border hover:bg-muted"
              >
                <Mic className="w-4 h-4" />
                Descargar voz MP3
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
