import { openai } from '../../config/openai';
import { env } from '../../config/env';

/**
 * Genera una imagen con la API de OpenAI y la devuelve como base64 + data URL.
 * Soporta gpt-image-1 (devuelve b64_json) y dall-e-3 (puede devolver url).
 */
export async function generateImage(
  prompt: string,
  size: '1024x1024' | '1024x1536' | '1536x1024' = '1024x1024'
): Promise<{ base64: string; dataUrl: string }> {
  const result: any = await openai.images.generate({
    model: env.OPENAI_IMAGE_MODEL,
    prompt,
    size: size as any,
    n: 1,
  });

  const item = result?.data?.[0];
  if (!item) throw new Error('La generación de imagen no devolvió datos');

  let base64: string | undefined = item.b64_json;

  if (!base64 && item.url) {
    const res = await fetch(item.url);
    const buf = Buffer.from(await res.arrayBuffer());
    base64 = buf.toString('base64');
  }

  if (!base64) throw new Error('No se pudo obtener la imagen generada');

  return { base64, dataUrl: `data:image/png;base64,${base64}` };
}
