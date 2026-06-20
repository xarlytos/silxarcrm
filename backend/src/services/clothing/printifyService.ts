import { env } from '../../config/env';

/**
 * Wrapper de la API REST de Printify (https://api.printify.com/v1).
 * Print-on-demand: subimos diseños, creamos productos y, al recibir un pago,
 * enviamos la orden para que Printify imprima y envíe (sin stock propio).
 */

const BASE = 'https://api.printify.com/v1';

function headers(): Record<string, string> {
  return {
    Authorization: `Bearer ${env.PRINTIFY_API_KEY}`,
    'Content-Type': 'application/json',
    'User-Agent': 'CRM-Maestro-Clothing/1.0',
  };
}

async function request<T = any>(path: string, init?: RequestInit): Promise<T> {
  if (!env.PRINTIFY_API_KEY) {
    throw new Error('PRINTIFY_API_KEY no configurada');
  }
  const res = await fetch(`${BASE}${path}`, { ...init, headers: { ...headers(), ...(init?.headers || {}) } });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Printify ${res.status}: ${text}`);
  }
  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

export const isPrintifyConfigured = (): boolean =>
  Boolean(env.PRINTIFY_API_KEY && env.PRINTIFY_SHOP_ID);

/** Sube una imagen a Printify por URL. Devuelve el id de imagen de Printify. */
export async function uploadImage(fileName: string, imageUrl: string): Promise<string> {
  const data = await request<{ id: string }>(`/uploads/images.json`, {
    method: 'POST',
    body: JSON.stringify({ file_name: fileName, url: imageUrl }),
  });
  return data.id;
}

/** Lista blueprints (tipos de prenda). Útil para configurar productos. */
export async function listBlueprints(): Promise<any[]> {
  return request(`/catalog/blueprints.json`);
}

/** Lista proveedores de impresión para un blueprint. */
export async function listPrintProviders(blueprintId: number): Promise<any[]> {
  return request(`/catalog/blueprints/${blueprintId}/print_providers.json`);
}

/** Obtiene las variantes (tallas/colores) de un blueprint + proveedor. */
export async function listVariants(blueprintId: number, printProviderId: number): Promise<any> {
  return request(`/catalog/blueprints/${blueprintId}/print_providers/${printProviderId}/variants.json`);
}

interface CreateProductInput {
  title: string;
  description: string;
  blueprintId: number;
  printProviderId: number;
  printifyImageId: string;
  variants: Array<{ id: number; price: number; is_enabled?: boolean }>; // price en centavos
}

/** Crea un producto en la shop de Printify. Devuelve el producto (con mockups). */
export async function createProduct(input: CreateProductInput): Promise<any> {
  const shopId = env.PRINTIFY_SHOP_ID;
  const body = {
    title: input.title,
    description: input.description,
    blueprint_id: input.blueprintId,
    print_provider_id: input.printProviderId,
    variants: input.variants.map((v) => ({
      id: v.id,
      price: v.price,
      is_enabled: v.is_enabled !== false,
    })),
    print_areas: [
      {
        variant_ids: input.variants.map((v) => v.id),
        placeholders: [
          {
            position: 'front',
            images: [
              { id: input.printifyImageId, x: 0.5, y: 0.5, scale: 1, angle: 0 },
            ],
          },
        ],
      },
    ],
  };

  return request(`/shops/${shopId}/products.json`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/** Publica un producto (lo marca como publicado en la shop). */
export async function publishProduct(productId: string): Promise<void> {
  const shopId = env.PRINTIFY_SHOP_ID;
  await request(`/shops/${shopId}/products/${productId}/publish.json`, {
    method: 'POST',
    body: JSON.stringify({
      title: true,
      description: true,
      images: true,
      variants: true,
      tags: true,
    }),
  });
}

/** Recupera un producto (para leer mockups e info de variantes). */
export async function getProduct(productId: string): Promise<any> {
  const shopId = env.PRINTIFY_SHOP_ID;
  return request(`/shops/${shopId}/products/${productId}.json`);
}

interface CreateOrderInput {
  externalId: string; // nuestro ClothingOrder.id
  printifyProductId: string;
  variantId: number;
  quantity: number;
  address: {
    first_name: string;
    last_name: string;
    email: string;
    country: string;
    region?: string;
    address1: string;
    address2?: string;
    city: string;
    zip: string;
    phone?: string;
  };
}

/** Crea una orden de fulfillment en Printify tras el pago. */
export async function createOrder(input: CreateOrderInput): Promise<any> {
  const shopId = env.PRINTIFY_SHOP_ID;
  const body = {
    external_id: input.externalId,
    line_items: [
      {
        product_id: input.printifyProductId,
        variant_id: input.variantId,
        quantity: input.quantity,
      },
    ],
    shipping_method: 1,
    send_shipping_notification: true,
    address_to: input.address,
  };

  return request(`/shops/${shopId}/orders.json`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export default {
  isPrintifyConfigured,
  uploadImage,
  listBlueprints,
  listPrintProviders,
  listVariants,
  createProduct,
  publishProduct,
  getProduct,
  createOrder,
};
