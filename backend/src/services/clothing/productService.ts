import { ClothingProduct } from '@prisma/client';
import { prisma } from '../../config/database';
import printifyService from './printifyService';
import { slugify } from '../adsense/adContentService';

/**
 * Crea un ClothingProduct a partir de un diseño.
 * Si Printify está configurado y se pasan blueprint/proveedor/variantes,
 * crea también el producto real en Printify y guarda mockups.
 * Si no, crea un producto DRAFT local (modo demo/MVP).
 */

interface CreateProductInput {
  designId: string;
  title?: string;
  description?: string;
  productType?: string;
  priceCents?: number;
  // Config Printify (opcional)
  blueprintId?: number;
  printProviderId?: number;
  variants?: Array<{ id: number; price: number; is_enabled?: boolean }>;
}

async function uniqueSlug(base: string): Promise<string> {
  let slug = base || 'producto';
  let i = 1;
  while (await prisma.clothingProduct.findUnique({ where: { slug } })) {
    slug = `${base}-${i++}`;
  }
  return slug;
}

export async function createProductFromDesign(input: CreateProductInput): Promise<ClothingProduct> {
  const design = await prisma.clothingDesign.findUnique({
    where: { id: input.designId },
    include: { brand: true },
  });
  if (!design) throw new Error('Diseño no encontrado');

  const title = input.title || `${design.brand.nombre} — ${design.tema || 'Camiseta'}`;
  const priceCents = input.priceCents || 2499;
  const slug = await uniqueSlug(slugify(title));

  let printifyProductId: string | null = null;
  let mockups: string[] = [];
  let variantsJson: any = input.variants || null;

  const canCreateInPrintify =
    printifyService.isPrintifyConfigured() &&
    design.printifyImageId &&
    input.blueprintId &&
    input.printProviderId &&
    input.variants &&
    input.variants.length > 0;

  if (canCreateInPrintify) {
    const product = await printifyService.createProduct({
      title,
      description: input.description || design.brand.descripcion || title,
      blueprintId: input.blueprintId!,
      printProviderId: input.printProviderId!,
      printifyImageId: design.printifyImageId!,
      variants: input.variants!,
    });
    printifyProductId = product.id;
    mockups = (product.images || []).map((img: any) => img.src).filter(Boolean);
    variantsJson = product.variants || input.variants;
  } else if (design.imageUrl) {
    // Modo demo: usamos el propio diseño como "mockup"
    mockups = [design.imageUrl];
  }

  return prisma.clothingProduct.create({
    data: {
      brandId: design.brandId,
      designId: design.id,
      title,
      slug,
      description: input.description || design.brand.descripcion || null,
      productType: input.productType || 'camiseta',
      printifyProductId,
      blueprintId: input.blueprintId || null,
      printProviderId: input.printProviderId || null,
      priceCents,
      mockups,
      variants: variantsJson,
      status: 'DRAFT',
      published: false,
    },
  });
}

/** Publica el producto en la tienda (y en Printify si corresponde). */
export async function publishProduct(productId: string): Promise<ClothingProduct> {
  const product = await prisma.clothingProduct.findUnique({ where: { id: productId } });
  if (!product) throw new Error('Producto no encontrado');

  if (product.printifyProductId && printifyService.isPrintifyConfigured()) {
    try {
      await printifyService.publishProduct(product.printifyProductId);
    } catch (err: any) {
      console.error('[Clothing] Error publicando en Printify:', err.message);
    }
  }

  return prisma.clothingProduct.update({
    where: { id: productId },
    data: { status: 'PUBLISHED', published: true },
  });
}

export default { createProductFromDesign, publishProduct };
