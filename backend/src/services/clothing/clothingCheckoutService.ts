import { prisma } from '../../config/database';
import { stripe, isStripeConfigured } from '../../config/stripe';
import { env } from '../../config/env';
import printifyService from './printifyService';

/**
 * Checkout con Stripe + fulfillment automático en Printify.
 */

interface CheckoutInput {
  productId: string;
  variantId?: string; // variante elegida (talla/color)
  quantity?: number;
}

/** Crea una sesión de Stripe Checkout y un ClothingOrder en estado PENDING. */
export async function createCheckoutSession(input: CheckoutInput): Promise<{ url: string; sessionId: string }> {
  if (!isStripeConfigured()) throw new Error('Stripe no está configurado (STRIPE_SECRET_KEY)');

  const product = await prisma.clothingProduct.findUnique({
    where: { id: input.productId },
    include: { brand: true },
  });
  if (!product || !product.published) throw new Error('Producto no disponible');

  const quantity = input.quantity || 1;
  // Cada marca tiene su propio dominio; volvemos a su storefront tras el pago
  const baseUrl = product.brand.domain
    ? `https://${product.brand.domain.replace(/^https?:\/\//, '').replace(/\/$/, '')}`
    : env.PUBLIC_SITE_URL.replace(/\/$/, '');

  // Creamos primero el pedido PENDING para enlazarlo con la sesión
  const order = await prisma.clothingOrder.create({
    data: {
      productId: product.id,
      variantId: input.variantId || null,
      quantity,
      amountCents: product.priceCents * quantity,
      currency: product.currency,
      status: 'PENDING',
    },
  });

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        quantity,
        price_data: {
          currency: product.currency.toLowerCase(),
          unit_amount: product.priceCents,
          product_data: {
            name: product.title,
            images: product.mockups.slice(0, 1),
          },
        },
      },
    ],
    shipping_address_collection: { allowed_countries: ['ES', 'PT', 'FR', 'IT', 'DE'] },
    success_url: `${baseUrl}/?success=1`,
    cancel_url: `${baseUrl}/${product.slug}?canceled=1`,
    metadata: { orderId: order.id, productId: product.id, variantId: input.variantId || '' },
  });

  await prisma.clothingOrder.update({
    where: { id: order.id },
    data: { stripeSessionId: session.id },
  });

  return { url: session.url!, sessionId: session.id };
}

/** Verifica la firma del webhook usando el raw body capturado en index.ts */
export function constructEvent(rawBody: string, signature: string) {
  return stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
}

/** Maneja el evento checkout.session.completed → marca PAID y dispara fulfillment. */
export async function handleCheckoutCompleted(session: any): Promise<void> {
  const orderId = session.metadata?.orderId;
  if (!orderId) return;

  const order = await prisma.clothingOrder.findUnique({
    where: { id: orderId },
    include: { product: true },
  });
  if (!order) return;

  const customer = session.customer_details;
  const shipping = (session as any).shipping_details || (session as any).shipping;

  await prisma.clothingOrder.update({
    where: { id: order.id },
    data: {
      status: 'PAID',
      email: customer?.email || null,
      amountCents: session.amount_total ?? order.amountCents,
      shippingJson: shipping || null,
    },
  });

  // Fulfillment en Printify (best-effort)
  try {
    if (
      printifyService.isPrintifyConfigured() &&
      order.product.printifyProductId &&
      order.variantId &&
      shipping?.address
    ) {
      const addr = shipping.address;
      const name = (shipping.name || customer?.name || '').split(' ');
      const printifyOrder = await printifyService.createOrder({
        externalId: order.id,
        printifyProductId: order.product.printifyProductId,
        variantId: parseInt(order.variantId, 10),
        quantity: order.quantity,
        address: {
          first_name: name[0] || 'Cliente',
          last_name: name.slice(1).join(' ') || '-',
          email: customer?.email || '',
          country: addr.country,
          region: addr.state || '',
          address1: addr.line1,
          address2: addr.line2 || '',
          city: addr.city,
          zip: addr.postal_code,
        },
      });

      await prisma.clothingOrder.update({
        where: { id: order.id },
        data: { status: 'FULFILLED', printifyOrderId: printifyOrder.id },
      });
    }
  } catch (err: any) {
    console.error('[Clothing] Error en fulfillment Printify:', err.message);
    await prisma.clothingOrder.update({
      where: { id: order.id },
      data: { status: 'FAILED' },
    });
  }
}

export default { createCheckoutSession, constructEvent, handleCheckoutCompleted };
