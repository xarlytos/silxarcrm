import { Router } from 'express';
import { prisma } from '../config/database';
import { authMiddleware } from '../middleware/auth';
import { generateAssetProduct } from '../services/assets/assetGeneratorService';
import * as gumroadService from '../services/assets/gumroadService';
import * as previewService from '../services/assets/previewService';
import * as deliveryService from '../services/assets/assetDeliveryService';

const router = Router();

// ============================================================
// === ASSET PROJECTS ===
// ============================================================

// Listar proyectos
router.get('/projects', authMiddleware, async (_req, res) => {
  try {
    const projects = await prisma.assetProject.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { products: true, listings: true } },
      },
    });
    res.json({ projects });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener proyecto por ID
router.get('/projects/:id', authMiddleware, async (req, res) => {
  try {
    const project = await prisma.assetProject.findUnique({
      where: { id: req.params.id },
      include: {
        products: { orderBy: { createdAt: 'desc' } },
        listings: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' });
    res.json({ project });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Crear proyecto
router.post('/projects', authMiddleware, async (req, res) => {
  try {
    const { nombre, descripcion, nicho, keywords, aiPrompt, aiModel } = req.body;
    if (!nombre || !nicho) {
      return res.status(400).json({ error: 'Campos requeridos: nombre, nicho' });
    }

    const slug = await uniqueSlug(nombre.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''));

    const project = await prisma.assetProject.create({
      data: {
        nombre,
        slug,
        descripcion,
        nicho,
        keywords: keywords || [],
        aiPrompt,
        aiModel,
      },
    });
    res.status(201).json({ project });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Actualizar proyecto
router.put('/projects/:id', authMiddleware, async (req, res) => {
  try {
    const b = req.body;
    const data: any = {};
    for (const k of ['nombre', 'descripcion', 'nicho', 'keywords', 'aiPrompt', 'aiModel']) {
      if (b[k] !== undefined) data[k] = b[k];
    }
    const project = await prisma.assetProject.update({
      where: { id: req.params.id },
      data,
    });
    res.json({ project });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Eliminar proyecto
router.delete('/projects/:id', authMiddleware, async (req, res) => {
  try {
    await prisma.assetProject.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// === ASSET PRODUCTS ===
// ============================================================

// Listar productos
router.get('/products', authMiddleware, async (req, res) => {
  try {
    const { projectId, tipo, status } = req.query;
    const where: any = {};
    if (projectId) where.projectId = projectId as string;
    if (tipo) where.tipo = tipo as string;
    if (status) where.status = status as string;

    const products = await prisma.assetProduct.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { project: { select: { nombre: true, nicho: true } } },
    });
    res.json({ products });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener producto por ID
router.get('/products/:id', authMiddleware, async (req, res) => {
  try {
    const product = await prisma.assetProduct.findUnique({
      where: { id: req.params.id },
      include: {
        project: true,
        listings: true,
      },
    });
    if (!product) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json({ product });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Crear producto
router.post('/products', authMiddleware, async (req, res) => {
  try {
    const { projectId, nombre, descripcion, tipo, config, aiPrompt, aiModel } = req.body;
    if (!projectId || !nombre || !tipo) {
      return res.status(400).json({ error: 'Campos requeridos: projectId, nombre, tipo' });
    }

    const slug = await uniqueProductSlug(projectId, nombre.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''));

    const product = await prisma.assetProduct.create({
      data: {
        projectId,
        nombre,
        slug,
        descripcion,
        tipo,
        config: config || {},
        aiPrompt,
        aiModel,
      },
    });
    res.status(201).json({ product });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Actualizar producto
router.put('/products/:id', authMiddleware, async (req, res) => {
  try {
    const b = req.body;
    const data: any = {};
    for (const k of ['nombre', 'descripcion', 'tipo', 'status', 'files', 'previewUrl', 'thumbnailUrl', 'config', 'aiPrompt', 'aiModel']) {
      if (b[k] !== undefined) data[k] = b[k];
    }
    const product = await prisma.assetProduct.update({
      where: { id: req.params.id },
      data,
    });
    res.json({ product });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Generar producto
router.post('/products/:id/generate', authMiddleware, async (req, res) => {
  try {
    const product = await prisma.assetProduct.update({
      where: { id: req.params.id },
      data: { status: 'GENERATING' },
    });

    // Generar en background (fire-and-forget para no bloquear la respuesta)
    generateAssetProduct(req.params.id).catch((err) => {
      console.error('[Assets] Error en generación background:', err.message);
    });

    res.json({ product });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Eliminar producto
router.delete('/products/:id', authMiddleware, async (req, res) => {
  try {
    await prisma.assetProduct.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// === ASSET LISTINGS ===
// ============================================================

// Listar listings
router.get('/listings', authMiddleware, async (req, res) => {
  try {
    const { projectId, marketplace, status } = req.query;
    const where: any = {};
    if (projectId) where.projectId = projectId as string;
    if (marketplace) where.marketplace = marketplace as string;
    if (status) where.status = status as string;

    const listings = await prisma.assetListing.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        project: { select: { nombre: true, nicho: true } },
        product: { select: { nombre: true, tipo: true, previewUrl: true } },
      },
    });
    res.json({ listings });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener listing por ID
router.get('/listings/:id', authMiddleware, async (req, res) => {
  try {
    const listing = await prisma.assetListing.findUnique({
      where: { id: req.params.id },
      include: { project: true, product: true },
    });
    if (!listing) return res.status(404).json({ error: 'Listing no encontrado' });
    res.json({ listing });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Crear listing
router.post('/listings', authMiddleware, async (req, res) => {
  try {
    const { projectId, productId, marketplace, title, description, tags, priceCents, ...rest } = req.body;
    if (!projectId || !marketplace || !title) {
      return res.status(400).json({ error: 'Campos requeridos: projectId, marketplace, title' });
    }

    const listing = await prisma.assetListing.create({
      data: {
        projectId,
        productId,
        marketplace,
        title,
        description,
        tags: tags || [],
        priceCents: priceCents || 499,
        ...rest,
      },
    });
    res.status(201).json({ listing });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Actualizar listing
router.put('/listings/:id', authMiddleware, async (req, res) => {
  try {
    const b = req.body;
    const data: any = {};
    const fields = [
      'title', 'description', 'tags', 'priceCents', 'status',
      'etsyCategory', 'etsySubcategory', 'etsyListingId',
      'kdpTrimSize', 'kdpPageCount', 'kdpBleed', 'kdpPaperColor', 'kdpAsin',
      'gumroadProductId', 'gumroadUrl', 'gumroadIsPhysical', 'gumroadIsTiered',
      'gumroadIsRecurring', 'gumroadLicenseKeys',
      'externalId', 'externalUrl',
    ];
    for (const k of fields) {
      if (b[k] !== undefined) data[k] = b[k];
    }
    const listing = await prisma.assetListing.update({
      where: { id: req.params.id },
      data,
    });
    res.json({ listing });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Publicar listing
router.post('/listings/:id/publish', authMiddleware, async (req, res) => {
  try {
    const listing = await prisma.assetListing.findUnique({
      where: { id: req.params.id },
      include: { product: true },
    });

    if (!listing) return res.status(404).json({ error: 'Listing no encontrado' });

    // Gumroad: publicación real via API
    if (listing.marketplace === 'GUMROAD') {
      const result = await gumroadService.publishToGumroad(req.params.id);
      if (!result.success) {
        return res.status(500).json({ error: result.error || 'Error publicando en Gumroad' });
      }
      return res.json({ listing: await prisma.assetListing.findUnique({ where: { id: req.params.id } }) });
    }

    // Etsy / KDP: stub (integración real en fase posterior)
    const updated = await prisma.assetListing.update({
      where: { id: req.params.id },
      data: { status: 'PUBLISHED' },
    });
    res.json({ listing: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Eliminar listing
router.delete('/listings/:id', authMiddleware, async (req, res) => {
  try {
    await prisma.assetListing.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// === BULK GENERATE ===
// ============================================================

// Generar múltiples productos para un proyecto
router.post('/bulk-generate', authMiddleware, async (req, res) => {
  try {
    const { projectId, types } = req.body;
    if (!projectId || !Array.isArray(types) || types.length === 0) {
      return res.status(400).json({ error: 'Campos requeridos: projectId, types[]' });
    }

    const project = await prisma.assetProject.findUnique({ where: { id: projectId } });
    if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' });

    const created: any[] = [];
    for (const tipo of types) {
      const nombre = `${project.nicho} — ${tipo}`;
      const slug = await uniqueProductSlug(projectId, nombre.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''));
      const product = await prisma.assetProduct.create({
        data: {
          projectId,
          nombre,
          slug,
          tipo,
          status: 'DRAFT',
        },
      });
      created.push(product);
    }

    res.status(201).json({ products: created });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// === ASSET CATALOG (Tienda) ===
// ============================================================

// Listar items de catálogo
router.get('/catalog', authMiddleware, async (req, res) => {
  try {
    const { projectId, isPublished } = req.query;
    const where: any = {};
    if (projectId) where.projectId = projectId as string;
    if (isPublished !== undefined) where.isPublished = isPublished === 'true';

    const items = await prisma.assetCatalogItem.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { project: { select: { nombre: true, nicho: true } } },
    });
    res.json({ items });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener item de catálogo
router.get('/catalog/:id', authMiddleware, async (req, res) => {
  try {
    const item = await prisma.assetCatalogItem.findUnique({
      where: { id: req.params.id },
      include: { project: true },
    });
    if (!item) return res.status(404).json({ error: 'Item no encontrado' });
    res.json({ item });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Crear item de catálogo
router.post('/catalog', authMiddleware, async (req, res) => {
  try {
    const { projectId, title, description, nicho, assetType, config, priceCents, currency } = req.body;
    if (!projectId || !title || !assetType) {
      return res.status(400).json({ error: 'Campos requeridos: projectId, title, assetType' });
    }

    const slug = await uniqueCatalogSlug(title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''));

    const item = await prisma.assetCatalogItem.create({
      data: {
        projectId,
        title,
        slug,
        description: description || '',
        nicho: nicho || '',
        assetType,
        config: config || {},
        priceCents: priceCents || 499,
        currency: currency || 'USD',
        previewImage: '',
      },
    });
    res.status(201).json({ item });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Actualizar item de catálogo
router.put('/catalog/:id', authMiddleware, async (req, res) => {
  try {
    const b = req.body;
    const data: any = {};
    const fields = ['title', 'description', 'nicho', 'assetType', 'config', 'priceCents', 'currency', 'previewImage', 'mockupImages', 'gumroadProductId', 'gumroadUrl', 'isPublished'];
    for (const k of fields) {
      if (b[k] !== undefined) data[k] = b[k];
    }
    const item = await prisma.assetCatalogItem.update({
      where: { id: req.params.id },
      data,
    });
    res.json({ item });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Eliminar item de catálogo
router.delete('/catalog/:id', authMiddleware, async (req, res) => {
  try {
    await prisma.assetCatalogItem.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Generar preview AI para un item de catálogo
router.post('/catalog/:id/generate-preview', authMiddleware, async (req, res) => {
  try {
    const result = await previewService.generatePreview(req.params.id);
    res.json({ previewImage: result.previewImage, mockupImages: result.mockupImages });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Publicar en Gumroad con preview
router.post('/catalog/:id/publish-gumroad', authMiddleware, async (req, res) => {
  try {
    const item = await prisma.assetCatalogItem.findUnique({
      where: { id: req.params.id },
      include: { project: true },
    });

    if (!item) return res.status(404).json({ error: 'Item no encontrado' });

    // Crear producto en Gumroad
    const gumroadProduct: any = await gumroadService.createGumroadProduct({
      name: item.title,
      description: item.description || `Asset digital: ${item.title}`,
      price: item.priceCents,
      currency: item.currency,
      shown_on_profile: true,
    });

    const gumroadId = gumroadProduct.product?.id || gumroadProduct.id;
    const gumroadUrl = gumroadProduct.product?.short_url || gumroadProduct.short_url;

    // Actualizar item con datos de Gumroad
    const updated = await prisma.assetCatalogItem.update({
      where: { id: req.params.id },
      data: {
        gumroadProductId: gumroadId,
        gumroadUrl,
        isPublished: true,
      },
    });

    // También crear un listing vinculado
    const listing = await prisma.assetListing.create({
      data: {
        projectId: item.projectId,
        marketplace: 'GUMROAD',
        status: 'PUBLISHED',
        title: item.title,
        description: item.description,
        priceCents: item.priceCents,
        externalId: gumroadId,
        externalUrl: gumroadUrl,
        gumroadProductId: gumroadId,
        gumroadUrl,
      },
    });

    res.json({ item: updated, listing, gumroadProduct });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// === WEBHOOKS (públicos) ===
// ============================================================

// Webhook de Gumroad para ventas — SIN auth
router.post('/webhooks/gumroad', async (req, res) => {
  try {
    const payload = req.body;
    console.log('[Gumroad Webhook] Payload recibido:', JSON.stringify(payload, null, 2));

    const result = await deliveryService.handleGumroadSale(payload);
    res.json(result);
  } catch (error: any) {
    console.error('[Gumroad Webhook] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// === GUMROAD INTEGRATION ===
// ============================================================

// Obtener info del usuario de Gumroad
router.get('/gumroad/user', authMiddleware, async (_req, res) => {
  try {
    const user = await gumroadService.getGumroadUser();
    res.json({ user });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Listar productos de Gumroad
router.get('/gumroad/products', authMiddleware, async (_req, res) => {
  try {
    const products = await gumroadService.listGumroadProducts();
    res.json({ products });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener producto de Gumroad
router.get('/gumroad/products/:gumroadId', authMiddleware, async (req, res) => {
  try {
    const product = await gumroadService.getGumroadProduct(req.params.gumroadId);
    res.json({ product });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Crear producto en Gumroad
router.post('/gumroad/products', authMiddleware, async (req, res) => {
  try {
    const product = await gumroadService.createGumroadProduct(req.body);
    res.status(201).json({ product });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Actualizar producto en Gumroad
router.put('/gumroad/products/:gumroadId', authMiddleware, async (req, res) => {
  try {
    const product = await gumroadService.updateGumroadProduct(req.params.gumroadId, req.body);
    res.json({ product });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Eliminar producto en Gumroad
router.delete('/gumroad/products/:gumroadId', authMiddleware, async (req, res) => {
  try {
    await gumroadService.deleteGumroadProduct(req.params.gumroadId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Listar ventas de Gumroad
router.get('/gumroad/sales', authMiddleware, async (req, res) => {
  try {
    const sales = await gumroadService.listGumroadSales(req.query as any);
    res.json({ sales });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Sincronizar productos de Gumroad con listings locales
router.post('/gumroad/sync', authMiddleware, async (req, res) => {
  try {
    const gumroadData: any = await gumroadService.listGumroadProducts();
    const gumroadProducts = gumroadData.products || gumroadData || [];

    const synced = [];
    for (const gp of gumroadProducts) {
      const existing = await prisma.assetListing.findFirst({
        where: { gumroadProductId: gp.id },
      });

      if (!existing) {
        // Crear listing si no existe
        const listing = await prisma.assetListing.create({
          data: {
            projectId: req.body?.projectId || 'synced',
            marketplace: 'GUMROAD',
            status: 'PUBLISHED',
            title: gp.name,
            description: gp.description || '',
            priceCents: gp.price || 0,
            externalId: gp.id,
            externalUrl: gp.short_url || gp.url,
            gumroadProductId: gp.id,
            gumroadUrl: gp.short_url || gp.url,
            gumroadIsPhysical: gp.is_physical || false,
            gumroadIsRecurring: gp.is_recurring || false,
          },
        });
        synced.push(listing);
      }
    }

    res.json({ synced, total: gumroadProducts.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// === HELPERS ===
// ============================================================

async function uniqueSlug(base: string): Promise<string> {
  let slug = base || 'proyecto';
  let i = 1;
  while (await prisma.assetProject.findUnique({ where: { slug } })) {
    slug = `${base}-${i++}`;
  }
  return slug;
}

async function uniqueProductSlug(projectId: string, base: string): Promise<string> {
  let slug = base || 'producto';
  let i = 1;
  while (await prisma.assetProduct.findFirst({ where: { projectId, slug } })) {
    slug = `${base}-${i++}`;
  }
  return slug;
}

async function uniqueCatalogSlug(base: string): Promise<string> {
  let slug = base || 'producto';
  let i = 1;
  while (await prisma.assetCatalogItem.findUnique({ where: { slug } })) {
    slug = `${base}-${i++}`;
  }
  return slug;
}

export default router;
