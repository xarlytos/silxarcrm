import { prisma } from '../../config/database';
import { generatePdfFromPython } from './pdfGenerator';
import { generateExcelFromPython } from './excelGenerator';
import path from 'path';
import fs from 'fs';

const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads', 'assets');

// Asegurar que existe el directorio
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

/**
 * Genera un asset product según su tipo.
 * Actualiza el producto con los archivos generados.
 */
export async function generateAssetProduct(productId: string): Promise<void> {
  const product = await prisma.assetProduct.findUnique({
    where: { id: productId },
    include: { project: true },
  });

  if (!product) throw new Error('Producto no encontrado');
  if (!product.project) throw new Error('Proyecto no encontrado');

  // Marcar como generando
  await prisma.assetProduct.update({
    where: { id: productId },
    data: { status: 'GENERATING' },
  });

  try {
    const nicho = product.project.nicho;
    const config = (product.config as Record<string, any>) || {};
    let files: { url: string; filename: string; mimeType: string }[] = [];

    switch (product.tipo) {
      case 'PDF_PLANNER': {
        const buffer = await generatePdfFromPython('planner', {
          title: product.nombre,
          nicho,
          pages: config.pages || 50,
        });
        const filename = `${product.slug}.pdf`;
        const filepath = saveBuffer(buffer, filename);
        files = [{ url: `/uploads/assets/${filename}`, filename, mimeType: 'application/pdf' }];
        break;
      }

      case 'PDF_JOURNAL': {
        const buffer = await generatePdfFromPython('journal', {
          title: product.nombre,
          nicho,
          pages: config.pages || 120,
        });
        const filename = `${product.slug}.pdf`;
        const filepath = saveBuffer(buffer, filename);
        files = [{ url: `/uploads/assets/${filename}`, filename, mimeType: 'application/pdf' }];
        break;
      }

      case 'PDF_TRACKER': {
        const buffer = await generatePdfFromPython('tracker', {
          title: product.nombre,
          nicho,
          trackerType: config.trackerType || 'habit',
        });
        const filename = `${product.slug}.pdf`;
        const filepath = saveBuffer(buffer, filename);
        files = [{ url: `/uploads/assets/${filename}`, filename, mimeType: 'application/pdf' }];
        break;
      }

      case 'EXCEL_TRACKER':
      case 'EXCEL_BUDGET':
      case 'EXCEL_PLANNER': {
        const excelType = product.tipo === 'EXCEL_BUDGET' ? 'budget' : product.tipo === 'EXCEL_PLANNER' ? 'planner' : 'tracker';
        const buffer = await generateExcelFromPython(excelType, {
          title: product.nombre,
          nicho,
        });
        const filename = `${product.slug}.xlsx`;
        const filepath = saveBuffer(buffer, filename);
        files = [{ url: `/uploads/assets/${filename}`, filename, mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }];
        break;
      }

      case 'PDF_COLORING_BOOK': {
        // Stub: en fase posterior implementar con edge detection
        const buffer = await generatePdfFromPython('coloring_book', {
          title: product.nombre,
          nicho,
          pages: config.pages || 30,
        });
        const filename = `${product.slug}.pdf`;
        const filepath = saveBuffer(buffer, filename);
        files = [{ url: `/uploads/assets/${filename}`, filename, mimeType: 'application/pdf' }];
        break;
      }

      case 'STICKER_SHEET': {
        const buffer = await generatePdfFromPython('sticker_sheet', {
          title: product.nombre,
          nicho,
        });
        const filename = `${product.slug}.pdf`;
        const filepath = saveBuffer(buffer, filename);
        files = [{ url: `/uploads/assets/${filename}`, filename, mimeType: 'application/pdf' }];
        break;
      }

      default:
        throw new Error(`Tipo de producto no soportado: ${product.tipo}`);
    }

    await prisma.assetProduct.update({
      where: { id: productId },
      data: {
        status: 'READY',
        files,
      },
    });
  } catch (error: any) {
    console.error(`[AssetGenerator] Error generando ${productId}:`, error.message);
    await prisma.assetProduct.update({
      where: { id: productId },
      data: { status: 'ERROR' },
    });
    throw error;
  }
}

function saveBuffer(buffer: Buffer, filename: string): string {
  const filepath = path.join(UPLOAD_DIR, filename);
  fs.writeFileSync(filepath, buffer);
  return filepath;
}
