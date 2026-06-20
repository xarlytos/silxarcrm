import { Router } from 'express';
import { prisma } from '../config/database';
import { authMiddleware } from '../middleware/auth';
import brandGeneratorService from '../services/clothing/brandGeneratorService';
import designGeneratorService from '../services/clothing/designGeneratorService';
import productService from '../services/clothing/productService';
import clothingCheckoutService from '../services/clothing/clothingCheckoutService';
import printifyService from '../services/clothing/printifyService';
import { normalizeDomain } from './adsense';

const router = Router();

// ============================================================
// === RUTAS AUTENTICADAS (panel) ===
// ============================================================

// --- Marcas ---
router.get('/brands', authMiddleware, async (_req, res) => {
  try {
    const brands = await prisma.clothingBrand.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { designs: true, products: true } } },
    });
    res.json({ brands });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/brands/:id', authMiddleware, async (req, res) => {
  try {
    const brand = await prisma.clothingBrand.findUnique({
      where: { id: req.params.id },
      include: { designs: true, products: true },
    });
    if (!brand) return res.status(404).json({ error: 'Marca no encontrada' });
    res.json({ brand });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/brands/generate', authMiddleware, async (req, res) => {
  try {
    const brand = await brandGeneratorService.generateBrand(req.body?.nicho);
    res.json({ brand });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Actualizar marca (incl. asignar su propio dominio)
router.put('/brands/:id', authMiddleware, async (req, res) => {
  try {
    const b = req.body;
    const data: any = {};
    for (const k of ['nombre', 'nicho', 'eslogan', 'descripcion', 'logoUrl', 'colorPrimario', 'colorSecundario', 'brandVoice', 'status']) {
      if (b[k] !== undefined) data[k] = b[k];
    }
    if (b.domain !== undefined) {
      const dom = b.domain ? normalizeDomain(b.domain) : null;
      if (dom) {
        const clash = await prisma.clothingBrand.findFirst({ where: { domain: dom, NOT: { id: req.params.id } } });
        if (clash) return res.status(409).json({ error: 'Ese dominio ya está en uso por otra marca' });
      }
      data.domain = dom;
    }
    const brand = await prisma.clothingBrand.update({ where: { id: req.params.id }, data });
    res.json({ brand });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/brands/:id', authMiddleware, async (req, res) => {
  try {
    await prisma.clothingBrand.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- Diseños ---
router.get('/designs', authMiddleware, async (req, res) => {
  try {
    const where: any = {};
    if (req.query.brandId) where.brandId = req.query.brandId as string;
    const designs = await prisma.clothingDesign.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { brand: { select: { nombre: true, slug: true } } },
    });
    res.json({ designs });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/brands/:id/designs/generate', authMiddleware, async (req, res) => {
  try {
    const count = parseInt(req.body?.count) || 3;
    const designs = await designGeneratorService.generateDesigns(req.params.id, count);
    res.json({ designs, generated: designs.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- Productos ---
router.get('/products', authMiddleware, async (req, res) => {
  try {
    const where: any = {};
    if (req.query.brandId) where.brandId = req.query.brandId as string;
    const products = await prisma.clothingProduct.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { brand: { select: { nombre: true, slug: true } } },
    });
    res.json({ products });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/products', authMiddleware, async (req, res) => {
  try {
    const product = await productService.createProductFromDesign(req.body);
    res.json({ product });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/products/:id/publish', authMiddleware, async (req, res) => {
  try {
    const product = await productService.publishProduct(req.params.id);
    res.json({ product });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Catálogo Printify (para configurar productos)
router.get('/printify/blueprints', authMiddleware, async (_req, res) => {
  try {
    res.json({ blueprints: await printifyService.listBlueprints() });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- Pedidos / Stats ---
router.get('/orders', authMiddleware, async (_req, res) => {
  try {
    const orders = await prisma.clothingOrder.findMany({
      orderBy: { createdAt: 'desc' },
      include: { product: { select: { title: true, brand: { select: { nombre: true } } } } },
    });
    res.json({ orders });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/stats', authMiddleware, async (_req, res) => {
  try {
    const [brands, products, published, paidOrders, revenue] = await Promise.all([
      prisma.clothingBrand.count(),
      prisma.clothingProduct.count(),
      prisma.clothingProduct.count({ where: { published: true } }),
      prisma.clothingOrder.count({ where: { status: { in: ['PAID', 'FULFILLED'] } } }),
      prisma.clothingOrder.aggregate({
        _sum: { amountCents: true },
        where: { status: { in: ['PAID', 'FULFILLED'] } },
      }),
    ]);
    res.json({
      brands,
      products,
      published,
      paidOrders,
      revenueCents: revenue._sum.amountCents || 0,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// === RUTAS PÚBLICAS (tienda /tienda, sin auth) ===
// ============================================================

// Resolver una marca por su dominio propio (multi-tenant storefront)
router.get('/public/brand-by-domain', async (req, res) => {
  try {
    const dom = normalizeDomain((req.query.domain as string) || '');
    const alt = dom.startsWith('www.') ? dom.slice(4) : `www.${dom}`;
    const brand = await prisma.clothingBrand.findFirst({
      where: { domain: { in: [dom, alt] }, status: 'PUBLISHED' },
      select: {
        id: true, nombre: true, slug: true, nicho: true, eslogan: true,
        descripcion: true, logoUrl: true, colorPrimario: true, colorSecundario: true,
      },
    });
    if (!brand) return res.status(404).json({ error: 'Marca no encontrada' });
    const products = await prisma.clothingProduct.findMany({
      where: { brandId: brand.id, published: true },
      select: { id: true, title: true, slug: true, priceCents: true, currency: true, mockups: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ brand, products });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/public/brands/:slug', async (req, res) => {
  try {
    const brand = await prisma.clothingBrand.findFirst({
      where: { slug: req.params.slug, status: 'PUBLISHED' },
      select: {
        id: true, nombre: true, slug: true, nicho: true, eslogan: true,
        descripcion: true, logoUrl: true, colorPrimario: true, colorSecundario: true,
      },
    });
    if (!brand) return res.status(404).json({ error: 'Marca no encontrada' });

    const products = await prisma.clothingProduct.findMany({
      where: { brandId: brand.id, published: true },
      select: { id: true, title: true, slug: true, priceCents: true, currency: true, mockups: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ brand, products });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/public/products/:slug', async (req, res) => {
  try {
    const product = await prisma.clothingProduct.findFirst({
      where: { slug: req.params.slug, published: true },
      include: { brand: { select: { nombre: true, slug: true, colorPrimario: true } } },
    });
    if (!product) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json({ product });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/public/checkout', async (req, res) => {
  try {
    const { productId, variantId, quantity } = req.body;
    if (!productId) return res.status(400).json({ error: 'productId es obligatorio' });
    const result = await clothingCheckoutService.createCheckoutSession({ productId, variantId, quantity });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- Webhook de Stripe (raw body capturado en index.ts como req.rawBody) ---
router.post('/webhook/stripe', async (req: any, res) => {
  const signature = req.headers['stripe-signature'] as string;
  try {
    const event = clothingCheckoutService.constructEvent(req.rawBody, signature);
    if (event.type === 'checkout.session.completed') {
      await clothingCheckoutService.handleCheckoutCompleted(event.data.object as any);
    }
    res.json({ received: true });
  } catch (error: any) {
    console.error('[Clothing] Webhook error:', error.message);
    res.status(400).json({ error: `Webhook Error: ${error.message}` });
  }
});

export default router;
