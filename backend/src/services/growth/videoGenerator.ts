import { PrismaClient } from '@prisma/client';
import { openai } from '../../config/openai';

const prisma = new PrismaClient();

interface VideoScene {
  time: string;        // ej: "0-5"
  voiceover: string;   // Texto a narrar
  visual: string;      // Descripción visual
  subtitle: string;    // Texto en pantalla
  imagePrompt?: string; // Prompt para generar imagen
  bRoll?: string;      // Sugerencia de footage
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
  audioBuffer?: Buffer;
  storyboard: VideoScene[];
  suggestedHashtags: string[];
  suggestedCaptions: string[];
}

interface VideoGenerationResult {
  success: boolean;
  kit?: VideoKit;
  contentPieceId?: string;
  error?: string;
}

// ============================================================
// TEMPLATES DE VIDEO
// ============================================================

const videoTemplates: Record<string, {
  name: string;
  description: string;
  structure: string;
  sceneCount: number;
  duration: number;
  musicStyle: string;
  visualStyle: string;
}> = {
  hook_fact_cta: {
    name: 'Hook + Dato + CTA',
    description: 'Video educativo rápido. Ideal para tips y datos curiosos.',
    structure: 'Hook impactante (3s) → Dato/Explicación (20s) → CTA (5s)',
    sceneCount: 3,
    duration: 30,
    musicStyle: 'Upbeat, energético, ritmo rápido',
    visualStyle: 'Texto animado sobre fondos degradados. Transiciones rápidas.',
  },
  problem_solution: {
    name: 'Problema + Solución + Prueba',
    description: 'Estructura clásica de ventas. Ideal para conversión.',
    structure: 'Problema (5s) → Agitación (10s) → Solución (15s) → Prueba (10s) → CTA (5s)',
    sceneCount: 5,
    duration: 45,
    musicStyle: 'Tensión inicial, luego épico/triumphant',
    visualStyle: 'Split screen antes/después. Screenshots del producto.',
  },
  myth_reality: {
    name: 'Mito vs Realidad',
    description: 'Contrarian content. Ideal para engagement y shares.',
    structure: 'Mito común (5s) → Realidad sorprendente (15s) → Explicación (15s) → CTA (5s)',
    sceneCount: 4,
    duration: 40,
    musicStyle: 'Dramático en el reveal, luego optimista',
    visualStyle: 'Efecto de "cruzada" o "cambio". Rojo → Verde.',
  },
  three_tips: {
    name: '3 Tips en 60 segundos',
    description: 'Lista rápida. Alto valor, fácil de consumir.',
    structure: 'Hook (3s) → Tip 1 (15s) → Tip 2 (15s) → Tip 3 (15s) → CTA (5s)',
    sceneCount: 5,
    duration: 60,
    musicStyle: 'Upbeat, motivacional',
    visualStyle: 'Números grandes en pantalla. Bullet points animados.',
  },
  transformation: {
    name: 'Antes y Después',
    description: 'Transformación visual. Ideal para resultados concretos.',
    structure: 'Antes (8s) → Proceso (15s) → Después (15s) → Testimonio (8s) → CTA (5s)',
    sceneCount: 5,
    duration: 50,
    musicStyle: 'Emotivo, inspiracional',
    visualStyle: 'Side-by-side comparison. Progress bars animadas.',
  },
  day_in_life: {
    name: 'Día en la vida',
    description: 'Behind-the-scenes. Humaniza tu marca.',
    structure: 'Mañana (10s) → Trabajo (15s) → Reunión (10s) → Resultado (10s) → CTA (5s)',
    sceneCount: 5,
    duration: 50,
    musicStyle: 'Chill, lo-fi, relajado',
    visualStyle: 'Footage real o simulado. Estética auténtica.',
  },
  testimonial: {
    name: 'Testimonial Rápido',
    description: 'Story de cliente. Construye confianza.',
    structure: 'Cliente presentándose (5s) → Problema (10s) → Solución (15s) → Resultado (10s) → CTA (5s)',
    sceneCount: 5,
    duration: 45,
    musicStyle: 'Warm, emotivo, trustworthy',
    visualStyle: 'Foto de perfil + quotes animados. Fotos del negocio.',
  },
};

// ============================================================
// GENERACIÓN DE GUIONES
// ============================================================

/**
 * Genera un guion de video completo con storyboard usando un template
 */
export async function generateVideoScript(
  softwareId: string,
  topic: string,
  template: string = 'hook_fact_cta',
  tone: string = 'profesional'
): Promise<VideoKit> {
  const software = await prisma.software.findUnique({
    where: { id: softwareId },
  });

  if (!software) throw new Error('Software no encontrado');

  const nombre = software.nombre || 'tu producto';
  const nicho = software.nicho || 'negocios';
  const templateConfig = videoTemplates[template] || videoTemplates.hook_fact_cta;

  const prompt = `Eres un guionista de videos virales para TikTok, Reels y Shorts.

PRODUCTO: ${nombre} (software para ${nicho})
TEMA: ${topic}
TEMPLATE: ${templateConfig.name}
TONO: ${tone}
DURACIÓN: ${templateConfig.duration} segundos

ESTRUCTURA DEL TEMPLATE:
${templateConfig.structure}

ESTILO VISUAL:
${templateConfig.visualStyle}

ESTILO MUSICAL:
${templateConfig.musicStyle}

REGLAS:
- Cada escena debe tener un timing específico (ej: "0-5", "5-15")
- Voiceover: frases cortas, fáciles de leer en voz alta rápido
- Visual: descripción detallada de qué se ve en pantalla
- Subtitle: texto que aparece en pantalla (máx 5 palabras por línea)
- ImagePrompt: prompt para generar una imagen con IA
- El hook debe ser IMPACTANTE (primeros 3 segundos deciden si se quedan)
- La CTA debe ser clara y directa
- Total de palabras: máximo ${Math.floor(templateConfig.duration / 1.5)} palabras

Devuelve JSON exacto:
{
  "hook": "Frase de hook",
  "scenes": [
    {
      "time": "0-5",
      "voiceover": "Texto a narrar",
      "visual": "Descripción visual detallada",
      "subtitle": "Texto en pantalla",
      "imagePrompt": "Prompt para generar imagen",
      "bRoll": "Sugerencia de footage"
    }
  ],
  "totalWords": 0,
  "estimatedDuration": ${templateConfig.duration},
  "cta": "Call to action final",
  "musicStyle": "Descripción de música",
  "suggestedImages": ["prompt imagen 1", "prompt imagen 2", "prompt imagen 3"]
}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'system', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.85,
  });

  const content = response.choices[0].message.content;
  if (!content) throw new Error('La IA no devolvió contenido');

  const parsed = JSON.parse(content);

  return {
    script: {
      hook: parsed.hook,
      scenes: parsed.scenes || [],
      totalWords: parsed.totalWords || 0,
      estimatedDuration: parsed.estimatedDuration || templateConfig.duration,
      cta: parsed.cta,
      musicStyle: parsed.musicStyle || templateConfig.musicStyle,
      suggestedImages: parsed.suggestedImages || [],
    },
    storyboard: parsed.scenes || [],
    suggestedHashtags: generateVideoHashtags(nicho, topic),
    suggestedCaptions: generateVideoCaptions(nombre, topic, parsed.cta),
  };
}

/**
 * Genera audio (voz) a partir de un guion usando ElevenLabs
 */
export async function generateVoiceover(
  script: string,
  apiKey: string,
  voiceId: string = 'premade/Adam'
): Promise<Buffer> {
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: script,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.3,
          use_speaker_boost: true,
        },
      }),
    }
  );

  if (!response.ok) {
    const error: any = await response.json();
    throw new Error(error.detail || 'Error de ElevenLabs');
  }

  return Buffer.from(await response.arrayBuffer());
}

/**
 * Genera un kit de video completo: guion + voz + storyboard
 */
export async function generateVideoKit(
  softwareId: string,
  topic: string,
  template: string = 'hook_fact_cta',
  tone: string = 'profesional',
  options?: {
    voiceId?: string;
    generateAudio?: boolean;
  }
): Promise<VideoGenerationResult> {
  try {
    // 1. Generar guion
    const kit = await generateVideoScript(softwareId, topic, template, tone);

    // 2. Obtener config para ElevenLabs
    const software = await prisma.software.findUnique({
      where: { id: softwareId },
      include: { growthConfig: true },
    });

    const apiKey = software?.growthConfig?.elevenLabsKey;

    // 3. Generar audio si hay API key y se solicita
    if (apiKey && options?.generateAudio !== false) {
      const fullScript = kit.script.scenes.map((s) => s.voiceover).join(' ');
      try {
        const audio = await generateVoiceover(fullScript, apiKey, options?.voiceId);
        kit.audioBuffer = audio;
      } catch {
        // Audio falló pero continuamos con el resto
      }
    }

    // 4. Guardar en DB
    const contentPiece = await prisma.contentPiece.create({
      data: {
        softwareId,
        type: 'VIDEO_SCRIPT',
        status: 'DRAFT',
        title: `${kit.script.hook.slice(0, 60)}...`,
        body: JSON.stringify(kit, null, 2),
        excerpt: kit.script.cta,
        keywords: kit.suggestedHashtags,
        aiPrompt: topic,
        aiModel: 'gpt-4o',
      },
    });

    return {
      success: true,
      kit,
      contentPieceId: contentPiece.id,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Genera hashtags para videos
 */
function generateVideoHashtags(nicho: string, topic: string): string[] {
  const baseTags = [
    `#${nicho.replace(/\s+/g, '')}`,
    '#negocio',
    '#emprendedor',
    '#tips',
    '#viral',
    '#fyp',
    '#parati',
    '#tutorial',
    '#consejos',
    '#marketingdigital',
  ];

  const topicTags = topic
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .map((w) => `#${w}`);

  return [...new Set([...baseTags, ...topicTags])].slice(0, 15);
}

/**
 * Genera captions sugeridos para el video
 */
function generateVideoCaptions(productName: string, topic: string, cta: string): string[] {
  return [
    `${cta} 🔗 Link en bio`,
    `¿Sabías esto sobre ${topic}? 😱 ${cta}`,
    `Guarda esto para después 💾 ${cta}`,
    `Etiqueta a alguien que necesite ver esto 👇 ${cta}`,
    `${cta} 🚀 Comenta "INFO" para más detalles`,
  ];
}

// ============================================================
// PUBLICACIÓN
// ============================================================

/**
 * Programa la publicación de un video en múltiples plataformas
 */
export async function scheduleVideoPublish(
  contentPieceId: string,
  platforms: ('tiktok' | 'instagram' | 'youtube')[]
): Promise<{ platform: string; scheduled: boolean; error?: string }[]> {
  const results = await Promise.all(
    platforms.map(async (platform) => {
      try {
        // Placeholder: en producción integrar con APIs oficiales
        return {
          platform,
          scheduled: false,
          error: 'Integración con API pendiente',
        };
      } catch (error: any) {
        return {
          platform,
          scheduled: false,
          error: error.message,
        };
      }
    })
  );

  return results;
}

// ============================================================
// EXPORTS
// ============================================================

export function getVideoTemplates() {
  return Object.entries(videoTemplates).map(([id, config]) => ({
    id,
    ...config,
  }));
}

export function getVideoTemplate(id: string) {
  return videoTemplates[id];
}

export default {
  generateVideoScript,
  generateVoiceover,
  generateVideoKit,
  generateShortVideo: generateVideoKit, // Alias para compatibilidad
  scheduleVideoPublish,
  getVideoTemplates,
  getVideoTemplate,
};
