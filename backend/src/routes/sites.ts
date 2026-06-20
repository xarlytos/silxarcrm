import { Router } from 'express';
import { prisma } from '../config/database';
import { normalizeDomain } from './adsense';

const router = Router();

/**
 * Resolución multi-tenant por dominio (host).
 * El middleware del frontend llama aquí para saber qué servir en un dominio:
 * un blog AdSense, una tienda de ropa, o nada (404).
 */
router.get('/resolve', async (req, res) => {
  try {
    const dom = normalizeDomain((req.query.domain as string) || '');
    if (!dom) return res.status(400).json({ error: 'domain requerido' });
    const alt = dom.startsWith('www.') ? dom.slice(4) : `www.${dom}`;
    const domains = [dom, alt];

    // 1) ¿Es un blog?
    const site = await prisma.adSite.findFirst({ where: { domain: { in: domains }, activo: true } });
    if (site) {
      const niches = await prisma.adNiche.findMany({
        where: { siteId: site.id, activo: true },
        select: { id: true, nombre: true, slug: true },
      });
      return res.json({
        type: 'blog',
        site: {
          id: site.id,
          nombre: site.nombre,
          domain: site.domain,
          descripcion: site.descripcion,
          logoUrl: site.logoUrl,
          colorPrimario: site.colorPrimario,
          adsenseClient: site.adsenseClient,
          adsenseSlots: site.adsenseSlots,
          gaMeasurementId: site.gaMeasurementId,
        },
        niches,
      });
    }

    // 2) ¿Es una tienda de ropa?
    const brand = await prisma.clothingBrand.findFirst({
      where: { domain: { in: domains }, status: 'PUBLISHED' },
      select: {
        id: true, nombre: true, slug: true, eslogan: true, descripcion: true,
        logoUrl: true, colorPrimario: true, colorSecundario: true,
      },
    });
    if (brand) {
      const products = await prisma.clothingProduct.findMany({
        where: { brandId: brand.id, published: true },
        select: { id: true, title: true, slug: true, priceCents: true, currency: true, mockups: true },
        orderBy: { createdAt: 'desc' },
      });
      return res.json({ type: 'store', brand, products });
    }

    return res.status(404).json({ type: 'none', error: 'Dominio no asignado' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
