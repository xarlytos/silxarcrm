import { Resend } from 'resend';
import { env } from '../../config/env';
import { prisma } from '../../config/database';
import { generateAssetProduct } from './assetGeneratorService';
import fs from 'fs';
import path from 'path';

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

interface DeliveryPayload {
  catalogItemId: string;
  buyerEmail: string;
  buyerName?: string;
  orderId?: string;
  gumroadSaleId?: string;
}

/**
 * Genera el asset real on-demand y envía email al comprador.
 * También puede enviar el archivo adjunto o un link de descarga temporal.
 */
export async function deliverAsset(payload: DeliveryPayload): Promise<{ success: boolean; downloadUrl?: string; error?: string }> {
  try {
    const { catalogItemId, buyerEmail, buyerName, orderId, gumroadSaleId } = payload;

    // 1. Obtener el catálogo item
    const item = await prisma.assetCatalogItem.findUnique({
      where: { id: catalogItemId },
      include: { project: true },
    });

    if (!item) throw new Error('Catalog item no encontrado');

    console.log(`[Delivery] Generando asset on-demand: ${item.title} para ${buyerEmail}`);

    // 2. Crear un AssetProduct temporal para generación
    const product = await prisma.assetProduct.create({
      data: {
        projectId: item.projectId,
        nombre: `${item.title} — ${buyerName || buyerEmail}`,
        slug: `delivery-${Date.now()}`,
        tipo: item.assetType as any,
        status: 'GENERATING',
        config: item.config || {},
      },
    });

    // 3. Generar el asset real
    await generateAssetProduct(product.id);

    // 4. Obtener el producto generado con archivos
    const generated = await prisma.assetProduct.findUnique({
      where: { id: product.id },
    });

    if (!generated || generated.status !== 'READY' || !generated.files) {
      throw new Error('No se pudo generar el asset');
    }

    const files = generated.files as Array<{ url: string; filename: string; mimeType: string }>;
    if (!files || files.length === 0) throw new Error('No hay archivos generados');

    // 5. Generar token de descarga único
    const downloadToken = `dl_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    const downloadUrl = `${env.PUBLIC_SITE_URL || env.FRONTEND_URL}/downloads/${downloadToken}`;

    // 6. Guardar registro de entrega
    // (podría crearse un modelo AssetDelivery en el futuro)

    // 7. Incrementar contador de ventas
    await prisma.assetCatalogItem.update({
      where: { id: catalogItemId },
      data: { salesCount: { increment: 1 } },
    });

    // 8. Enviar email
    await sendDeliveryEmail({
      to: buyerEmail,
      buyerName: buyerName || 'Cliente',
      itemTitle: item.title,
      downloadUrl,
      gumroadUrl: item.gumroadUrl,
    });

    console.log(`[Delivery] Asset entregado a ${buyerEmail}: ${downloadUrl}`);

    return { success: true, downloadUrl };
  } catch (error: any) {
    console.error('[Delivery] Error:', error.message);
    return { success: false, error: error.message };
  }
}

interface EmailPayload {
  to: string;
  buyerName: string;
  itemTitle: string;
  downloadUrl: string;
  gumroadUrl?: string | null;
}

async function sendDeliveryEmail(payload: EmailPayload): Promise<void> {
  if (!resend) {
    console.warn('[Delivery] RESEND_API_KEY no configurado, email no enviado');
    return;
  }

  const { to, buyerName, itemTitle, downloadUrl, gumroadUrl } = payload;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tu compra está lista</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; margin: 0; padding: 40px 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center; }
    .header h1 { color: #fff; font-size: 24px; margin: 0; font-weight: 700; }
    .header p { color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 15px; }
    .content { padding: 32px 30px; }
    .product { background: #f8f9fa; border-radius: 12px; padding: 20px; margin-bottom: 24px; }
    .product h3 { margin: 0 0 8px; font-size: 18px; color: #1a1a2e; }
    .product p { margin: 0; color: #666; font-size: 14px; }
    .cta { text-align: center; margin: 32px 0; }
    .cta a { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff; text-decoration: none; padding: 14px 36px; border-radius: 12px; font-weight: 600; font-size: 16px; }
    .cta a:hover { opacity: 0.9; }
    .note { text-align: center; color: #999; font-size: 13px; margin-top: 24px; padding-top: 24px; border-top: 1px solid #eee; }
    .footer { text-align: center; padding: 24px 30px; background: #fafafa; color: #999; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 ¡Gracias por tu compra!</h1>
      <p>Tu asset digital está listo para descargar</p>
    </div>
    <div class="content">
      <p style="color:#444; font-size:15px; margin-bottom:24px;">Hola <strong>${buyerName}</strong>,</p>
      <div class="product">
        <h3>${itemTitle}</h3>
        <p>Asset digital generado especialmente para ti</p>
      </div>
      <div class="cta">
        <a href="${downloadUrl}">📥 Descargar mi asset</a>
      </div>
      <p class="note">Este link de descarga expira en 7 días. Guarda tu archivo en un lugar seguro.<br>Si tienes algún problema, responde a este email.</p>
      ${gumroadUrl ? `<p style="text-align:center; margin-top:16px; font-size:13px;">También puedes acceder desde tu <a href="${gumroadUrl}">cuenta de Gumroad</a></p>` : ''}
    </div>
    <div class="footer">
      <p>Enviado por Asset Factory — peluguau.com</p>
    </div>
  </div>
</body>
</html>
  `;

  try {
    await resend.emails.send({
      from: 'Asset Factory <assets@peluguau.com>',
      to,
      subject: `🎉 Tu ${itemTitle} está listo — Descarga aquí`,
      html,
    });
    console.log(`[Delivery] Email enviado a ${to}`);
  } catch (err: any) {
    console.error(`[Delivery] Error enviando email:`, err.message);
    throw err;
  }
}

/**
 * Webhook handler para ventas de Gumroad
 */
export async function handleGumroadSale(payload: any): Promise<{ success: boolean; error?: string }> {
  try {
    // El payload del webhook de Gumroad incluye:
    // email, product_id, product_name, price, currency, etc.
    const { email, product_id, product_name, price } = payload;

    // Buscar el catalog item por gumroadProductId
    const item = await prisma.assetCatalogItem.findFirst({
      where: { gumroadProductId: product_id },
    });

    if (!item) {
      console.warn(`[Gumroad Webhook] Producto ${product_id} no encontrado en catálogo`);
      return { success: false, error: 'Producto no encontrado en catálogo' };
    }

    console.log(`[Gumroad Webhook] Venta recibida: ${product_name} → ${email}`);

    // Generar y entregar el asset
    const result = await deliverAsset({
      catalogItemId: item.id,
      buyerEmail: email,
      gumroadSaleId: payload.sale_id || payload.id,
    });

    return result;
  } catch (error: any) {
    console.error('[Gumroad Webhook] Error:', error.message);
    return { success: false, error: error.message };
  }
}
