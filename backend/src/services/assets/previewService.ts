import { openai } from '../../config/openai';
import { prisma } from '../../config/database';
import fs from 'fs';
import path from 'path';

const PREVIEW_DIR = path.resolve(process.cwd(), 'uploads', 'assets', 'previews');
if (!fs.existsSync(PREVIEW_DIR)) {
  fs.mkdirSync(PREVIEW_DIR, { recursive: true });
}

// Templates de prompts por tipo de asset
const previewPrompts: Record<string, (title: string, nicho: string) => string> = {
  PDF_PLANNER: (title, nicho) =>
    `Professional flat-lay product photography of a printed ${nicho} weekly planner. ` +
    `The planner cover shows "${title}" in elegant modern typography. ` +
    `Lying open on a clean white marble desk with a gold pen, a cup of coffee, and a small succulent plant. ` +
    `Soft natural window light from the left. Minimal aesthetic, high-end stationery branding. ` +
    `The planner pages show clean weekly layout with sections for tasks and notes. ` +
    `Top-down 45-degree angle. 8K quality, photorealistic.`,

  PDF_JOURNAL: (title, nicho) =>
    `Elegant product mockup of a ${nicho} hardcover journal. ` +
    `The cover displays "${title}" in beautiful calligraphy on a textured linen cover in soft pastel tones. ` +
    `Placed on a light oak desk next to a lavender candle, reading glasses, and a dried flower bookmark. ` +
    `Warm cozy lighting, hygge aesthetic. The journal is slightly open showing lined pages with gentle shadows. ` +
    `Professional product photography, shallow depth of field.`,

  PDF_TRACKER: (title, nicho) =>
    `Clean product photo of a printed ${nicho} habit tracker on white paper. ` +
    `Header shows "${title}" in bold sans-serif typography. ` +
    `Grid layout with checkboxes, some checked with colorful highlighter marks. ` +
    `On a minimalist desk with colorful markers, washi tape, and a small plant. ` +
    `Bright natural lighting, flat-lay top-down view. Instagram-worthy aesthetic.`,

  PDF_COLORING_BOOK: (title, nicho) =>
    `Delightful product photo of a ${nicho} coloring book. ` +
    `Cover shows "${title}" with playful hand-drawn lettering and cute illustrations. ` +
    `The book is open showing a beautifully colored page on the left and a black-and-white outline page on the right. ` +
    `Colored pencils scattered around on a wooden table. Warm afternoon light. ` +
    `Kid-friendly, cheerful, inviting. Professional product photography.`,

  EXCEL_TRACKER: (title, nicho) =>
    `Sleek product screenshot of a ${nicho} spreadsheet displayed on a modern iMac screen. ` +
    `Dark mode Excel/Sheets UI with beautiful data visualization - colorful charts, progress bars, and clean tables. ` +
    `Header reads "${title}". The screen shows a dashboard with metrics, graphs, and calendar view. ` +
    `Minimalist desk setup, bokeh background. Tech product mockup style. Professional SaaS aesthetic.`,

  EXCEL_BUDGET: (title, nicho) =>
    `Professional screenshot of a budget spreadsheet on a MacBook Pro screen. ` +
    `Dark theme with elegant data tables, pie charts showing expense breakdown, and green/red conditional formatting. ` +
    `Title "${title}" at the top in clean typography. A cup of coffee sits next to the laptop. ` +
    `Clean workspace, soft ambient lighting. Finance app premium feel.`,

  EXCEL_PLANNER: (title, nicho) =>
    `Modern product screenshot of a digital planner spreadsheet on a tablet/iPad Pro. ` +
    `Clean white UI with color-coded sections, timeline view, and checklists. ` +
    `"${title}" header in bold. The screen shows a monthly overview with goals, habits, and events. ` +
    `On a clean desk with a stylus pen. Bright, productive, organized aesthetic.`,

  SVG_BUNDLE: (title, nicho) =>
    `Beautiful digital design product display showing a collection of ${nicho} SVG illustrations. ` +
    `9 icons arranged in a clean 3x3 grid on a dark navy gradient background. ` +
    `Neon accent colors - pink, cyan, yellow. Modern flat vector art style with subtle gradients. ` +
    `Each icon is distinct and professionally designed. Clean UI mockup with "${title}" header. ` +
    `App icon showcase style, dribbble/behance quality.`,

  STICKER_SHEET: (title, nicho) =>
    `Cute product photo of a printed ${nicho} sticker sheet on glossy white paper. ` +
    `Kiss-cut stickers in various shapes with adorable chibi-style illustrations. ` +
    `Pastel colors with holographic/iridescent finish catching the light. ` +
    `Title "${title}" on a small label. On a light pink desk with a planner and washi tape. ` +
    `Top-down view, bright studio lighting, Etsy product photo style.`,

  NOTION_TEMPLATE: (title, nicho) =>
    `Clean screenshot of a Notion workspace showing a ${nicho} dashboard template. ` +
    `"${title}" as the page title. Clean blocks with databases, kanban boards, and linked pages. ` +
    `Pastel-colored headers, emoji icons, organized sidebar. Dark/light mode toggle visible. ` +
    `On a modern laptop screen. Productivity aesthetic, minimal and organized.`,

  CANVA_TEMPLATE: (title, nicho) =>
    `Professional Canva-style template preview showing ${nicho} social media post designs. ` +
    `Multiple Instagram post layouts (1080x1080) in a gallery view. ` +
    `"${title}" branding. Modern typography, gradient backgrounds, stock photo placeholders. ` +
    `Canva editor UI visible around the canvas. Creative, trendy, social-media-ready aesthetic.`,
};

/**
 * Genera una preview de alta calidad para un asset usando OpenAI Image Generation.
 * Guarda la imagen y devuelve la URL pública.
 */
export async function generatePreview(
  catalogItemId: string
): Promise<{ previewImage: string; mockupImages: string[] }> {
  const item = await prisma.assetCatalogItem.findUnique({
    where: { id: catalogItemId },
    include: { project: true },
  });

  if (!item) throw new Error('Catalog item no encontrado');

  const promptFn = previewPrompts[item.assetType] || previewPrompts['PDF_PLANNER'];
  const prompt = promptFn(item.title, item.nicho || item.project?.nicho || 'digital');

  console.log(`[Preview] Generando preview para ${item.title} (${item.assetType})`);

  // Generar imagen principal con OpenAI
  const response = await openai.images.generate({
    model: process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1',
    prompt,
    n: 1,
    size: '1024x1024',
    quality: 'standard',
  });

  const imageUrl = response.data?.[0]?.url;
  if (!imageUrl) throw new Error('OpenAI no devolvió imagen');

  // Descargar y guardar la imagen
  const imageRes = await fetch(imageUrl);
  if (!imageRes.ok) throw new Error(`Error descargando preview: ${imageRes.status}`);
  const buffer = Buffer.from(await imageRes.arrayBuffer());

  const filename = `preview-${item.slug}.png`;
  const filepath = path.join(PREVIEW_DIR, filename);
  fs.writeFileSync(filepath, buffer);

  const publicUrl = `/uploads/assets/previews/${filename}`;

  // Generar 2 mockups adicionales con variaciones
  const mockupImages: string[] = [];

  for (let i = 0; i < 2; i++) {
    try {
      const variationPrompt = prompt + ` Alternative angle ${i === 0 ? 'close-up detail shot' : 'lifestyle in-use shot with hands'}.`;
      const varResponse = await openai.images.generate({
        model: process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1',
        prompt: variationPrompt,
        n: 1,
        size: '1024x1024',
        quality: 'standard',
      });

      const varUrl = varResponse.data?.[0]?.url;
      if (varUrl) {
        const varRes = await fetch(varUrl);
        if (varRes.ok) {
          const varBuffer = Buffer.from(await varRes.arrayBuffer());
          const varFilename = `preview-${item.slug}-${i + 1}.png`;
          const varFilepath = path.join(PREVIEW_DIR, varFilename);
          fs.writeFileSync(varFilepath, varBuffer);
          mockupImages.push(`/uploads/assets/previews/${varFilename}`);
        }
      }
    } catch (err: any) {
      console.warn(`[Preview] Error generando mockup ${i}:`, err.message);
    }
  }

  // Actualizar el item en la DB
  await prisma.assetCatalogItem.update({
    where: { id: catalogItemId },
    data: {
      previewImage: publicUrl,
      mockupImages,
      aiPrompt: prompt,
      aiModel: process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1',
    },
  });

  console.log(`[Preview] Preview generada: ${publicUrl}`);
  return { previewImage: publicUrl, mockupImages };
}

/**
 * Genera preview rápida sin guardar en DB (para testing)
 */
export async function generatePreviewQuick(assetType: string, title: string, nicho: string): Promise<string> {
  const promptFn = previewPrompts[assetType] || previewPrompts['PDF_PLANNER'];
  const prompt = promptFn(title, nicho);

  const response = await openai.images.generate({
    model: process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1',
    prompt,
    n: 1,
    size: '1024x1024',
    quality: 'standard',
  });

  return response.data?.[0]?.url || '';
}
