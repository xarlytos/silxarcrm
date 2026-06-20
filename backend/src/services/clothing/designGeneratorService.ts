import { ClothingDesign } from '@prisma/client';
import { prisma } from '../../config/database';
import { openai } from '../../config/openai';
import { generateImage } from './aiImage';
import printifyService from './printifyService';

/**
 * Genera diseños print-ready coherentes con una marca y, si Printify está
 * configurado, los sube para poder convertirlos en productos.
 */

interface DesignIdea {
  tema: string;
  prompt: string; // prompt en inglés para la imagen
}

export async function generateDesigns(
  brandId: string,
  count: number = 3
): Promise<ClothingDesign[]> {
  const brand = await prisma.clothingBrand.findUnique({ where: { id: brandId } });
  if (!brand) throw new Error('Marca no encontrada');

  // 1. Generar ideas de diseño coherentes con la marca
  const ideasPrompt = `Eres director creativo de la marca de ropa "${brand.nombre}" (nicho: ${
    brand.nicho || 'general'
  }, tono: ${brand.brandVoice || 'moderno'}).

Propón ${count} diseños de camiseta originales y vendibles.

Devuelve EXCLUSIVAMENTE un JSON:
{
  "designs": [
    {
      "tema": "nombre corto del diseño",
      "prompt": "prompt detallado EN INGLÉS para generar el gráfico: bold graphic print, centered, transparent or white background, high contrast, t-shirt design, no mockup, no text watermark"
    }
  ]
}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'system', content: ideasPrompt }],
    response_format: { type: 'json_object' },
    temperature: 0.9,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('OpenAI no devolvió ideas de diseño');
  const ideas = (JSON.parse(content).designs || []) as DesignIdea[];

  const printifyReady = printifyService.isPrintifyConfigured();
  const created: ClothingDesign[] = [];

  // 2. Para cada idea: generar imagen, subir a Printify, guardar
  for (const idea of ideas.slice(0, count)) {
    try {
      const { dataUrl, base64 } = await generateImage(idea.prompt);

      let printifyImageId: string | null = null;
      if (printifyReady) {
        try {
          // Printify acepta subir por base64 (campo contents) o url.
          printifyImageId = await uploadBase64ToPrintify(idea.tema, base64);
        } catch (err: any) {
          console.error('[Clothing] Error subiendo diseño a Printify:', err.message);
        }
      }

      const design = await prisma.clothingDesign.create({
        data: {
          brandId: brand.id,
          tema: idea.tema,
          prompt: idea.prompt,
          imageUrl: dataUrl,
          printifyImageId,
          status: 'DRAFT',
        },
      });
      created.push(design);
    } catch (err: any) {
      console.error(`[Clothing] Error generando diseño "${idea.tema}":`, err.message);
    }
  }

  return created;
}

/** Sube una imagen base64 a Printify usando el campo contents. */
async function uploadBase64ToPrintify(name: string, base64: string): Promise<string> {
  // printifyService.uploadImage usa url; aquí usamos contents directamente.
  const { env } = await import('../../config/env');
  const res = await fetch('https://api.printify.com/v1/uploads/images.json', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.PRINTIFY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ file_name: `${name}.png`, contents: base64 }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Printify upload ${res.status}: ${text}`);
  }
  const data = (await res.json()) as { id: string };
  return data.id;
}

export default { generateDesigns };
