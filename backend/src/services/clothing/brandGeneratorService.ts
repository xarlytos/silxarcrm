import { ClothingBrand } from '@prisma/client';
import { prisma } from '../../config/database';
import { openai } from '../../config/openai';
import { generateImage } from './aiImage';
import { slugify } from '../adsense/adContentService';

/**
 * Genera una marca de ropa completa con IA: identidad + logo.
 * El logo se genera con la API de imágenes y se guarda como data URL
 * (para MVP; migrable a almacenamiento de objetos más adelante).
 */

interface BrandIdentity {
  nombre: string;
  nicho: string;
  eslogan: string;
  descripcion: string;
  colorPrimario: string;
  colorSecundario: string;
  brandVoice: string;
  logoPrompt: string;
}

async function uniqueSlug(base: string): Promise<string> {
  let slug = base || 'marca';
  let i = 1;
  while (await prisma.clothingBrand.findUnique({ where: { slug } })) {
    slug = `${base}-${i++}`;
  }
  return slug;
}

export async function generateBrand(nichoSugerido?: string): Promise<ClothingBrand> {
  const prompt = `Eres un brand designer. Inventa una marca de ropa streetwear original y vendible${
    nichoSugerido ? ` para el nicho: "${nichoSugerido}"` : ''
  }.

Devuelve EXCLUSIVAMENTE un JSON:
{
  "nombre": "nombre de marca corto y memorable (1-2 palabras)",
  "nicho": "nicho/tribu objetivo (ej: gamers, gym, perros, café)",
  "eslogan": "eslogan corto y pegadizo",
  "descripcion": "descripción de marca de 2-3 frases",
  "colorPrimario": "#hex",
  "colorSecundario": "#hex",
  "brandVoice": "tono de comunicación de la marca en 1 frase",
  "logoPrompt": "prompt en inglés para generar un logo minimalista y moderno de la marca, fondo transparente o blanco, vector style, sin texto adicional"
}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'system', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.9,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('OpenAI no devolvió la identidad de marca');
  const identity = JSON.parse(content) as BrandIdentity;

  // Logo (best-effort: si falla la imagen, seguimos sin logo)
  let logoUrl: string | null = null;
  try {
    const { dataUrl } = await generateImage(
      `Minimalist modern clothing brand logo for "${identity.nombre}". ${identity.logoPrompt}. Flat vector, centered, white background.`
    );
    logoUrl = dataUrl;
  } catch (err: any) {
    console.error('[Clothing] Error generando logo:', err.message);
  }

  const slug = await uniqueSlug(slugify(identity.nombre));

  return prisma.clothingBrand.create({
    data: {
      nombre: identity.nombre,
      slug,
      nicho: identity.nicho || nichoSugerido || null,
      eslogan: identity.eslogan || null,
      descripcion: identity.descripcion || null,
      logoUrl,
      colorPrimario: identity.colorPrimario || '#111111',
      colorSecundario: identity.colorSecundario || '#FFFFFF',
      brandVoice: identity.brandVoice || null,
      status: 'DRAFT',
    },
  });
}

export default { generateBrand };
