import { PrismaClient, ContentType, SocialPlatform, ContentStatus } from '@prisma/client';
import { openai } from '../../config/openai';

const prisma = new PrismaClient();

interface GenerateSocialPostInput {
  softwareId: string;
  platform: SocialPlatform;
  count?: number;
  topic?: string;
  tone?: string;
  contentFormat?: 'single' | 'carousel' | 'thread' | 'story';
}

interface GenerateMultiPlatformInput {
  softwareId: string;
  platforms: SocialPlatform[];
  countPerPlatform?: number;
  topic?: string;
  tone?: string;
}

interface GenerateSeoInput {
  softwareId: string;
  keyword: string;
  type: ContentType;
}

interface GenerateVideoScriptInput {
  softwareId: string;
  topic: string;
  duration?: number; // segundos
}

interface PostData {
  title: string;
  body: string;
  hashtags: string[];
  tone: string;
  cta: string;
  contentFormat?: string;
  slideCount?: number; // para carousels
  threadPosts?: string[]; // para threads de X
}

interface GeneratedHashtags {
  tags: string[];
  reach: 'high' | 'medium' | 'low';
}

/**
 * Prompts detallados por plataforma con ejemplos y restricciones
 */
function buildPlatformPrompt(platform: SocialPlatform, format: string = 'single'): string {
  const basePrompts: Record<string, string> = {
    LINKEDIN: `Plataforma: LinkedIn
- Audiencia: profesionales, dueños de negocio, tomadores de decisiones
- Estilo: storytelling profesional, insights de negocio, datos concretos
- Formato preferido: ${format === 'carousel' ? 'Carrusel de 5-10 slides con título, bullets y CTA final' : 'Post de texto con párrafos cortos'}
- Longitud: ${format === 'carousel' ? 'Cada slide máx 150 palabras' : '150-300 palabras'}
- Emojis: máximo 3 por post
- Hashtags: 3-5 relevantes (no genéricos como #business)
- CTA: sutil, preguntar opinión o invitar a comentar
- Hook: estadística sorprendente o contrarian opinion`,

    FACEBOOK: `Plataforma: Facebook
- Audiencia: comunidad local, pequeños negocios
- Estilo: cercano, conversacional, preguntas a la comunidad
- Formato: párrafos cortos, emojis moderados
- Longitud: 100-200 palabras
- Emojis: moderados
- Hashtags: 3-5 (mezcla de populares y nicho)
- CTA: preguntar experiencias, invitar a compartir
- Hook: pregunta directa o problema relatable`,

    INSTAGRAM: `Plataforma: Instagram
- Audiencia: millennials, Gen Z, dueños de negocios visuales
- Estilo: visual, storytelling corto, caption atractivo
- Formato: ${format === 'story' ? 'Story con encuestas/polls y CTA swipe-up' : 'Caption corto (máx 125 palabras visible) + hashtags'}
- Longitud: caption de 80-150 palabras
- Emojis: abundantes y relevantes
- Hashtags: 10-15 (mezcla popular + nicho + branded)
- CTA: guardar post, compartir, visitar link en bio
- Hook: frase impactante en primera línea`,

    X: `Plataforma: X (Twitter)
- Audiencia: profesionales técnicos, early adopters
- Estilo: directo, conciso, contrarian, threads educativos
- Formato: ${format === 'thread' ? 'Thread de 5-8 tweets conectados (cada uno máx 280 chars)' : 'Post único de máx 280 caracteres'}
- Longitud: máx 280 chars por post${format === 'thread' ? ', thread de 5-8 tweets' : ''}
- Emojis: mínimos (1-2)
- Hashtags: 1-2 máximo
- CTA: retweet, follow, visitar link
- Hook: hot take o dato sorprendente`,

    TIKTOK: `Plataforma: TikTok
- Audiencia: Gen Z, millennials, dueños de negocios jóvenes
- Estilo: divertido, hooks virales, lenguaje joven
- Formato: guion para video corto (15-60 seg)
- Longitud: script de 50-100 palabras (fácil de leer en voz alta rápido)
- Emojis: muchos, expresivos
- Hashtags: 3-5 virales + nicho
- CTA: seguir, comentar, visitar perfil
- Hook: frase impactante en los primeros 3 segundos
- Incluye indicaciones visuales entre [corchetes]`,
  };

  return basePrompts[platform] || basePrompts.LINKEDIN;
}

/**
 * Genera posts para redes sociales con IA optimizados por plataforma
 */
export async function generateSocialPosts({
  softwareId,
  platform,
  count = 5,
  topic,
  tone = 'profesional',
  contentFormat = 'single',
}: GenerateSocialPostInput) {
  const software = await prisma.software.findUnique({
    where: { id: softwareId },
  });

  if (!software) throw new Error('Software no encontrado');

  const nicho = software.nicho || 'negocios locales';
  const nombre = software.nombre || 'tu producto';
  const tagline = software.tagline || '';
  const problema = software.problemaPrincipal || 'gestionar su negocio';
  const promesa = software.promesaValor || 'ahorrar tiempo y dinero';
  const diferenciador = software.diferenciador || '';

  const platformPrompt = buildPlatformPrompt(platform, contentFormat);

  const toneInstructions: Record<string, string> = {
    profesional: 'Tono profesional, serio pero accesible. Usa datos y ejemplos concretos.',
    casual: 'Tono cercano, como hablar con un amigo. Humor ligero permitido.',
    divertido: 'Tono divertido, memes permitidos, no te tomes demasiado en serio.',
    técnico: 'Tono técnico, profundiza en detalles, asume conocimiento del lector.',
    inspirador: 'Tono motivacional, historias de superación, "tú puedes".',
    ventas: 'Tono persuasivo, enfocado en beneficios y resultados, CTA claro.',
  };

  const formatInstructions: Record<string, string> = {
    single: 'Genera posts individuales independientes.',
    carousel: 'Genera carruseles (conjunto de slides) donde cada post sea un carrusel completo. Cada carrusel tiene 5-10 slides con título, contenido y CTA final.',
    thread: 'Genera threads para X: una serie de tweets conectados que cuentan una historia o explican un concepto.',
    story: 'Genera guiones para Stories de Instagram con encuestas, preguntas y CTAs interactivos.',
  };

  const prompt = `Eres un especialista en marketing de contenidos para ${nicho} con años de experiencia creando contenido viral.

=== DATOS DEL PRODUCTO ===
Nombre: ${nombre}
${tagline ? `Tagline: ${tagline}` : ''}
Problema que resuelve: ${problema}
Promesa de valor: ${promesa}
${diferenciador ? `Diferenciador clave: ${diferenciador}` : ''}

=== TEMA ===
${topic ? `Tema específico a tratar: ${topic}` : `Tema: errores comunes en ${nicho}, beneficios de digitalización, o mitos sobre la gestión de ${nicho}`}

=== INSTRUCCIONES DE PLATAFORMA ===
${platformPrompt}

=== TONO ===
${toneInstructions[tone] || toneInstructions.profesional}

=== FORMATO ===
${formatInstructions[contentFormat] || formatInstructions.single}

=== REGLAS ===
- Cada post debe ser ÚNICO y diferente a los demás
- NO uses frases genéricas como "en el mundo actual" o "en la era digital"
- Incluye datos específicos (ficticios pero realistas)
- CTA sutil, nunca agresivo
- Hashtags relevantes al nicho, NO genéricos

Devuelve JSON exacto:
{
  "posts": [
    {
      "title": "Hook impactante (máx 60 chars)",
      "body": "Contenido completo optimizado para ${platform}",
      "hashtags": ["#hashtag1", "#hashtag2", "#hashtag3"],
      "tone": "${tone}",
      "cta": "Call to action sutil",
      "contentFormat": "${contentFormat}"
      ${contentFormat === 'carousel' ? ', "slideCount": 7' : ''}
      ${contentFormat === 'thread' ? ', "threadPosts": ["tweet 1", "tweet 2", "tweet 3"]' : ''}
    }
  ]
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
  const posts: PostData[] = parsed.posts || [];

  // Procesar variables dinámicas
  const processedPosts = posts.map((post) => ({
    ...post,
    body: replaceVariables(post.body, software),
    title: replaceVariables(post.title, software),
  }));

  // Guardar en DB
  const created = await Promise.all(
    processedPosts.map((post) =>
      prisma.contentPiece.create({
        data: {
          softwareId,
          type: 'POST',
          status: 'DRAFT',
          platform,
          title: post.title,
          body: post.body,
          keywords: post.hashtags,
          aiPrompt: prompt,
          aiModel: 'gpt-4o',
        },
      })
    )
  );

  return created;
}

/**
 * Reemplaza variables dinámicas en el contenido
 */
function replaceVariables(text: string, software: any): string {
  const variables: Record<string, string> = {
    '{{nombre_empresa}}': software.nombre || '',
    '{{nicho}}': software.nicho || 'negocios',
    '{{tagline}}': software.tagline || '',
    '{{problema}}': software.problemaPrincipal || 'gestionar su negocio',
    '{{promesa}}': software.promesaValor || 'ahorrar tiempo',
    '{{url}}': software.urlWebsite || '',
  };

  let result = text;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
  }
  return result;
}

/**
 * Genera hashtags inteligentes basados en un tema
 */
export async function generateHashtags(topic: string, nicho?: string, count: number = 10): Promise<string[]> {
  const prompt = `Genera ${count} hashtags relevantes para el tema "${topic}"${nicho ? ` en el nicho de ${nicho}` : ''}.

Reglas:
- Mezcla de hashtags populares (1M+ posts) y de nicho (10K-100K posts)
- Máximo 2 palabras por hashtag
- Sin espacios, sin acentos
- En español e inglés
- Ordenados de más popular a más nicho

Devuelve JSON:
{
  "hashtags": ["#hashtag1", "#hashtag2", ...]
}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const content = response.choices[0].message.content;
    if (!content) return [];

    const parsed = JSON.parse(content);
    return parsed.hashtags || [];
  } catch {
    return [];
  }
}

/**
 * Genera posts para múltiples plataformas en paralelo
 * Ideal para campañas omnicanal
 */
export async function generateMultiPlatformPosts({
  softwareId,
  platforms,
  countPerPlatform = 5,
  topic,
  tone = 'profesional',
}: GenerateMultiPlatformInput) {
  const results: Record<string, any[]> = {};

  // Generar para cada plataforma en paralelo
  const promises = platforms.map(async (platform) => {
    try {
      const posts = await generateSocialPosts({
        softwareId,
        platform,
        count: countPerPlatform,
        topic,
        tone,
      });
      results[platform] = posts;
    } catch (error: any) {
      results[platform] = [];
      console.error(`[Growth] Error generando posts para ${platform}:`, error.message);
    }
  });

  await Promise.all(promises);

  return results;
}

/**
 * Adapta un post existente a otra plataforma
 */
export async function repurposePost(
  contentPieceId: string,
  targetPlatform: SocialPlatform
) {
  const original = await prisma.contentPiece.findUnique({
    where: { id: contentPieceId },
    include: { software: true },
  });

  if (!original) throw new Error('Contenido no encontrado');

  const platformPrompt = buildPlatformPrompt(targetPlatform);

  const prompt = `Adapta el siguiente post para ${targetPlatform}.

POST ORIGINAL (${original.platform || 'genérico'}):
${original.body}

=== INSTRUCCIONES PARA ${targetPlatform} ===
${platformPrompt}

Reglas:
- Mantén la idea central pero adapta el formato y tono
- No copies literal, reescribe completamente
- Optimiza para la nueva plataforma

Devuelve JSON:
{
  "title": "Nuevo hook",
  "body": "Contenido adaptado",
  "hashtags": ["#hashtag1", "#hashtag2"],
  "cta": "Call to action adaptado"
}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'system', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.8,
  });

  const content = response.choices[0].message.content;
  if (!content) throw new Error('La IA no devolvió contenido');

  const parsed = JSON.parse(content);

  const adapted = await prisma.contentPiece.create({
    data: {
      softwareId: original.softwareId,
      type: 'POST',
      status: 'DRAFT',
      platform: targetPlatform,
      title: parsed.title || `Adaptado de: ${original.title}`,
      body: parsed.body,
      keywords: parsed.hashtags || [],
      aiPrompt: prompt,
      aiModel: 'gpt-4o',
    },
  });

  return adapted;
}

/**
 * Genera contenido SEO (artículos, FAQs, casos de éxito, comparativas)
 */
export async function generateSeoContent({
  softwareId,
  keyword,
  type,
}: GenerateSeoInput) {
  const software = await prisma.software.findUnique({
    where: { id: softwareId },
  });

  if (!software) throw new Error('Software no encontrado');

  const nicho = software.nicho || 'negocios locales';
  const nombre = software.nombre || 'tu producto';
  const problema = software.problemaPrincipal || 'gestionar su negocio';
  const promesa = software.promesaValor || 'ahorrar tiempo y dinero';

  const typePrompts: Record<string, string> = {
    ARTICLE: `Escribe un artículo SEO de 1200-1500 palabras optimizado para la keyword "${keyword}".

Estructura obligatoria:
- H1: Título con keyword
- Introducción (150 palabras): problema + promesa
- 3-4 H2 con subsecciones H3
- Bullet points y listas numeradas
- Datos/estadísticas ficticias pero realistas
- Conclusión con CTA
- Preguntas frecuentes (FAQ schema)

Tono: profesional pero cercano. Segunda persona ("tú").`,

    FAQ: `Genera 10 preguntas frecuentes sobre "${keyword}" para ${nicho}.

Cada respuesta debe:
- Ser de 80-120 palabras
- Responder directamente
- Mencionar ${nombre} de forma natural
- Incluir datos concretos

Devuelve JSON: { "faqs": [{ "question", "answer" }] }`,

    CASE_STUDY: `Escribe un caso de éxito de ${nicho} que implementó ${nombre}.

Estructura:
- Cliente ficticio pero realista (nombre, ubicación, tamaño)
- Problema antes de ${nombre}
- Solución implementada
- Resultados concretos (% mejora, tiempo ahorrado, € ganados)
- Testimonio ficticio de 2-3 líneas

Tono: inspirador, datos específicos.`,

    COMPARISON: `Compara ${nombre} con los 3 principales competidores de ${nicho}.

Tabla comparativa:
- Precio
- Funcionalidades clave
- Facilidad de uso
- Soporte
- Integraciones
- Escalabilidad

Sé honesto. Destaca donde ${nombre} gana. No mientas donde pierde.
Incluye una conclusión de "cuál elegir según tu situación".`,

    LANDING_PAGE: `Escribe una landing page de conversión para ${nombre} enfocada en "${keyword}".

Secciones:
1. Hero (headline + subheadline + CTA)
2. Problema (el dolor)
3. Solución (cómo ${nombre} lo resuelve)
4. Beneficios (3-4 con iconos)
5. Social proof (testimonios)
6. CTA final
7. FAQ

Tono: persuasivo pero no agresivo. Enfocado en resultados.`,
  };

  const prompt = typePrompts[type] || typePrompts.ARTICLE;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `Eres un redactor SEO especializado en ${nicho}. Contexto del producto:\n\nNombre: ${nombre}\nProblema que resuelve: ${problema}\nPromesa de valor: ${promesa}\nNicho: ${nicho}`,
      },
      { role: 'user', content: prompt },
    ],
    temperature: 0.7,
  });

  const content = response.choices[0].message.content;
  if (!content) throw new Error('La IA no devolvió contenido');

  // Extraer título del contenido
  const titleMatch = content.match(/^#?\s*(.+?)(?:\n|$)/);
  const title = titleMatch?.[1]?.trim() || `${type} sobre ${keyword}`;

  // Crear excerpt (primeras 200 chars)
  const excerpt = content.replace(/[#*_`]/g, '').slice(0, 200) + '...';

  const piece = await prisma.contentPiece.create({
    data: {
      softwareId,
      type,
      status: 'DRAFT',
      title,
      body: content,
      excerpt,
      keywords: [keyword],
      aiPrompt: prompt,
      aiModel: 'gpt-4o',
    },
  });

  return piece;
}

/**
 * Genera guion de video con IA
 */
export async function generateVideoScript({
  softwareId,
  topic,
  duration = 60,
}: GenerateVideoScriptInput) {
  const software = await prisma.software.findUnique({
    where: { id: softwareId },
  });

  if (!software) throw new Error('Software no encontrado');

  const nombre = software.nombre || 'tu producto';
  const nicho = software.nicho || 'negocios';

  const prompt = `Escribe un guion de video de ${duration} segundos sobre "${topic}" para ${nicho}.

Producto: ${nombre}

Reglas:
- Hook en los primeros 3 segundos (frase impactante)
- Lenguaje conversacional y directo
- Incluye indicaciones visuales entre [corchetes]
- CTA claro al final (agendar demo, visitar web, etc.)
- Optimizado para TikTok / Reels / Shorts
- Frases cortas (fáciles de subtitular)
- Máximo ${Math.floor(duration / 2)} palabras

Formato: array de segmentos con timing
Devuelve JSON:
{
  "script": [
    {
      "time": "0-5",
      "voiceover": "Texto para narrar",
      "visual": "[Indicación visual]",
      "subtitle": "Texto para subtítulo"
    }
  ],
  "totalWords": 0,
  "cta": "Call to action final"
}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'system', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.8,
  });

  const content = response.choices[0].message.content;
  if (!content) throw new Error('La IA no devolvió contenido');

  const parsed = JSON.parse(content);

  const piece = await prisma.contentPiece.create({
    data: {
      softwareId,
      type: 'VIDEO_SCRIPT',
      status: 'DRAFT',
      title: topic,
      body: JSON.stringify(parsed.script, null, 2),
      excerpt: parsed.cta || topic,
      keywords: [topic, nicho],
      aiPrompt: prompt,
      aiModel: 'gpt-4o',
    },
  });

  return piece;
}

/**
 * Genera múltiples piezas de contenido en batch
 */
export async function generateContentBatch(
  softwareId: string,
  options: {
    posts?: { platform: SocialPlatform; count: number }[];
    articles?: { keyword: string }[];
    faqs?: { keyword: string }[];
    caseStudies?: { topic: string }[];
    comparisons?: { keyword: string }[];
  }
) {
  const results = {
    posts: [] as any[],
    articles: [] as any[],
    faqs: [] as any[],
    caseStudies: [] as any[],
    comparisons: [] as any[],
  };

  // Generar posts sociales en paralelo
  if (options.posts) {
    const postPromises = options.posts.map((p) =>
      generateSocialPosts({
        softwareId,
        platform: p.platform,
        count: p.count,
      })
    );
    results.posts = (await Promise.all(postPromises)).flat();
  }

  // Generar artículos SEO en paralelo
  if (options.articles) {
    const articlePromises = options.articles.map((a) =>
      generateSeoContent({ softwareId, keyword: a.keyword, type: 'ARTICLE' })
    );
    results.articles = await Promise.all(articlePromises);
  }

  // Generar FAQs en paralelo
  if (options.faqs) {
    const faqPromises = options.faqs.map((f) =>
      generateSeoContent({ softwareId, keyword: f.keyword, type: 'FAQ' })
    );
    results.faqs = await Promise.all(faqPromises);
  }

  // Generar casos de éxito en paralelo
  if (options.caseStudies) {
    const casePromises = options.caseStudies.map((c) =>
      generateSeoContent({ softwareId, keyword: c.topic, type: 'CASE_STUDY' })
    );
    results.caseStudies = await Promise.all(casePromises);
  }

  // Generar comparativas en paralelo
  if (options.comparisons) {
    const compPromises = options.comparisons.map((c) =>
      generateSeoContent({ softwareId, keyword: c.keyword, type: 'COMPARISON' })
    );
    results.comparisons = await Promise.all(compPromises);
  }

  return results;
}

/**
 * Re-genera una pieza de contenido existente
 */
export async function regenerateContent(contentId: string) {
  const existing = await prisma.contentPiece.findUnique({
    where: { id: contentId },
    include: { software: true },
  });

  if (!existing) throw new Error('Contenido no encontrado');

  // Eliminar y regenerar
  await prisma.contentPiece.delete({ where: { id: contentId } });

  if (existing.type === 'POST' && existing.platform) {
    return generateSocialPosts({
      softwareId: existing.softwareId,
      platform: existing.platform,
      count: 1,
      topic: existing.title,
    });
  }

  return generateSeoContent({
    softwareId: existing.softwareId,
    keyword: existing.keywords[0] || existing.title,
    type: existing.type,
  });
}

/**
 * Genera contenido SEO en batch (artículos, FAQs, comparativas, casos de éxito)
 * Ideal para poblar un blog completo en una sola operación
 */
export async function generateSeoBatch(
  softwareId: string,
  options: {
    articles?: { keyword: string; count?: number }[];
    faqs?: { keyword: string }[];
    comparisons?: { competitor: string }[];
    caseStudies?: { clientName?: string; metric?: string }[];
    programmaticLandings?: { baseKeyword: string; cities: string[] }[];
  }
) {
  const results = {
    articles: [] as any[],
    faqs: [] as any[],
    comparisons: [] as any[],
    caseStudies: [] as any[],
    programmaticLandings: [] as any[],
  };

  // Artículos en paralelo
  if (options.articles) {
    const promises = options.articles.map((a) =>
      generateSeoContent({ softwareId, keyword: a.keyword, type: 'ARTICLE' })
    );
    results.articles = await Promise.all(promises);
  }

  // FAQs en paralelo
  if (options.faqs) {
    const promises = options.faqs.map((f) =>
      generateSeoContent({ softwareId, keyword: f.keyword, type: 'FAQ' })
    );
    results.faqs = await Promise.all(promises);
  }

  // Comparativas en paralelo
  if (options.comparisons) {
    const promises = options.comparisons.map((c) =>
      generateSeoContent({ softwareId, keyword: c.competitor, type: 'COMPARISON' })
    );
    results.comparisons = await Promise.all(promises);
  }

  // Casos de éxito en paralelo
  if (options.caseStudies) {
    const promises = options.caseStudies.map((c) =>
      generateSeoContent({
        softwareId,
        keyword: c.metric || 'resultados',
        type: 'CASE_STUDY',
      })
    );
    results.caseStudies = await Promise.all(promises);
  }

  // Landing pages programáticas en paralelo
  if (options.programmaticLandings) {
    for (const landing of options.programmaticLandings) {
      const landingPromises = landing.cities.map((city) =>
        generateProgrammaticLanding(softwareId, landing.baseKeyword, city)
      );
      const landings = await Promise.all(landingPromises);
      results.programmaticLandings.push(...landings);
    }
  }

  return results;
}

/**
 * Genera una landing page programática por keyword + ciudad
 * Ejemplo: "software dental madrid", "software veterinario barcelona"
 */
export async function generateProgrammaticLanding(
  softwareId: string,
  baseKeyword: string,
  city: string
) {
  const software = await prisma.software.findUnique({ where: { id: softwareId } });
  if (!software) throw new Error('Software no encontrado');

  const nombre = software.nombre || 'tu producto';
  const nicho = software.nicho || 'negocios locales';

  const keyword = `${baseKeyword} ${city}`;
  const slug = slugify(`${baseKeyword}-${city}`);

  const prompt = `Escribe una landing page de conversión optimizada para SEO con la keyword "${keyword}".

Producto: ${nombre} (software para ${nicho})
Ciudad: ${city}

ESTRUCTURA OBLIGATORIA:
# H1: [Keyword] en ${city} — [Beneficio principal]

## Introducción (150 palabras)
- Mencionar la ciudad específicamente
- Problema local que resuelves
- Datos/fake stats realistas sobre el nicho en ${city}

## 3-4 H2 con contenido:
- "Por qué [nicho] en ${city} necesitan ${nombre}"
- "Beneficios de usar software de gestión"
- "Cómo funciona ${nombre}"
- "Opiniones de clientes en ${city}"

## Tabla comparativa
Compara ${nombre} vs hacerlo manual vs Excel

## CTA Final
- Formulario de contacto
- Teléfono
- Email

REGLAS:
- Longitud: 800-1200 palabras
- Menciona "${city}" al menos 8 veces
- Menciona "${keyword}" al menos 5 veces
- Incluye schema FAQ al final
- Tono: persuasivo pero honesto
- NO inventar datos reales de negocios, usar datos genéricos

Devuelve el contenido completo en Markdown.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'system', content: prompt }],
    temperature: 0.7,
  });

  const content = response.choices[0].message.content;
  if (!content) throw new Error('La IA no devolvió contenido');

  // Generar meta tags
  const meta = await generateMetaTags(content, keyword);

  const piece = await prisma.contentPiece.create({
    data: {
      softwareId,
      type: 'LANDING_PAGE',
      status: 'DRAFT',
      title: meta.title,
      body: content,
      excerpt: meta.description,
      keywords: [baseKeyword, city, keyword],
      aiPrompt: prompt,
      aiModel: 'gpt-4o',
    },
  });

  return { ...piece, slug };
}

/**
 * Genera meta title y description optimizados para SEO
 */
export async function generateMetaTags(content: string, keyword: string) {
  const prompt = `Genera un meta title y meta description optimizados para SEO.

Keyword principal: "${keyword}"
Contenido del artículo (primeros 500 chars):
${content.slice(0, 500)}

REGLAS:
- Meta title: máx 60 caracteres, incluir keyword al inicio
- Meta description: máx 160 caracteres, incluir keyword, CTA sutil
- Atractivo para clicks (CTR)

Devuelve JSON:
{
  "title": "Meta title",
  "description": "Meta description"
}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.5,
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return {
      title: result.title || `${keyword} | Guía 2026`,
      description: result.description || `Descubre todo sobre ${keyword}. Guía completa con datos y consejos prácticos.`,
    };
  } catch {
    return {
      title: `${keyword} | Guía Completa 2026`,
      description: `Descubre todo sobre ${keyword}. Guía completa con datos actualizados y consejos prácticos.`,
    };
  }
}

/**
 * Genera schema markup (JSON-LD) para el contenido
 */
export async function generateSchemaMarkup(
  content: string,
  type: 'Article' | 'FAQPage' | 'Product' | 'LocalBusiness'
) {
  const prompts: Record<string, string> = {
    Article: `Genera schema markup JSON-LD para un Article.
Extrae el título, autor, fecha de publicación y categoría del contenido.

Devuelve solo el JSON-LD válido.`,

    FAQPage: `Genera schema markup JSON-LD para una página de FAQ.
Extrae las preguntas y respuestas del contenido.

Devuelve solo el JSON-LD válido en formato:
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Pregunta",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Respuesta"
      }
    }
  ]
}`,

    Product: `Genera schema markup JSON-LD para un SoftwareApplication.
Incluye: nombre, descripción, categoría, aggregateRating, offers.

Devuelve solo el JSON-LD válido.`,

    LocalBusiness: `Genera schema markup JSON-LD para un LocalBusiness.
Incluye: nombre, dirección, teléfono, horario, geo coordenadas.

Devuelve solo el JSON-LD válido.`,
  };

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: prompts[type] },
        { role: 'user', content: content.slice(0, 2000) },
      ],
      temperature: 0.3,
    });

    const result = response.choices[0].message.content || '{}';
    // Extraer JSON del resultado
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      JSON.parse(jsonMatch[0]); // Validar que es JSON válido
      return jsonMatch[0];
    }
    return '{}';
  } catch {
    return '{}';
  }
}

/**
 * Genera keywords programáticas combinando producto + intención + variación
 */
export function generateKeywordVariations(
  productName: string,
  nicho: string,
  intentions: string[] = ['mejor', 'software', 'gestión', 'precio', 'opiniones']
): string[] {
  const variations: string[] = [];

  for (const intention of intentions) {
    variations.push(
      `${intention} ${nicho}`,
      `${intention} ${nicho} software`,
      `software ${intention} ${nicho}`,
      `${productName} ${intention}`,
      `${intention} ${productName}`,
      `${nicho} ${intention}`,
    );
  }

  // Añadir long-tail keywords
  variations.push(
    `cómo gestionar un ${nicho}`,
    `mejorar la gestión de mi ${nicho}`,
    `software para ${nicho} opiniones`,
    `${nicho} digitalización`,
    `gestionar citas ${nicho}`,
  );

  return [...new Set(variations)];
}

/**
 * Genera sugerencias de keywords con volumen estimado (simulado)
 */
export async function generateKeywordSuggestions(
  softwareId: string,
  seedKeyword?: string
) {
  const software = await prisma.software.findUnique({ where: { id: softwareId } });
  if (!software) throw new Error('Software no encontrado');

  const nicho = software.nicho || 'negocios';
  const nombre = software.nombre || 'software';

  const prompt = `Genera 20 keywords relacionadas con "${seedKeyword || nicho}" para un software de gestión.

Para cada keyword indica:
- Volumen de búsqueda mensual estimado (ES)
- Dificultad SEO (1-100)
- Intención (informacional, transaccional, navegacional)
- Tipo de contenido recomendado (artículo, comparativa, landing, FAQ)

Devuelve JSON:
{
  "keywords": [
    {
      "keyword": "...",
      "volume": 1200,
      "difficulty": 45,
      "intent": "transaccional",
      "contentType": "comparativa"
    }
  ]
}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return result.keywords || [];
  } catch {
    // Fallback: generar variaciones locales
    return generateKeywordVariations(nombre, nicho).map((k) => ({
      keyword: k,
      volume: Math.floor(Math.random() * 5000) + 100,
      difficulty: Math.floor(Math.random() * 60) + 20,
      intent: 'informacional',
      contentType: 'artículo',
    }));
  }
}

/**
 * Crea un slug URL-friendly a partir de texto
 */
function slugify(text: string): string {
  return text
    .toString()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
}

export default {
  generateSocialPosts,
  generateSeoContent,
  generateVideoScript,
  generateContentBatch,
  regenerateContent,
  generateMultiPlatformPosts,
  generateHashtags,
  repurposePost,
  generateSeoBatch,
  generateProgrammaticLanding,
  generateMetaTags,
  generateSchemaMarkup,
  generateKeywordVariations,
  generateKeywordSuggestions,
};
