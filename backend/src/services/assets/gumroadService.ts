import { prisma } from '../../config/database';

const GUMROAD_API_BASE = 'https://api.gumroad.com/v2';

function getAccessToken(): string {
  const token = process.env.GUMROAD_ACCESS_TOKEN;
  if (!token) throw new Error('GUMROAD_ACCESS_TOKEN no configurado');
  return token;
}

// ============================================================
// PRODUCTS
// ============================================================

export async function listGumroadProducts() {
  const res = await fetch(`${GUMROAD_API_BASE}/products`, {
    headers: { Authorization: `Bearer ${getAccessToken()}` },
  });
  if (!res.ok) throw new Error(`Gumroad list products failed: ${res.status}`);
  return res.json();
}

export async function getGumroadProduct(productId: string) {
  const res = await fetch(`${GUMROAD_API_BASE}/products/${productId}`, {
    headers: { Authorization: `Bearer ${getAccessToken()}` },
  });
  if (!res.ok) throw new Error(`Gumroad get product failed: ${res.status}`);
  return res.json();
}

export async function createGumroadProduct(data: {
  name: string;
  url?: string;
  description?: string;
  price: number; // cents
  currency?: string;
  is_physical?: boolean;
  is_recurring?: boolean;
  recurrence?: string; // monthly, yearly, etc.
  duration?: string;
  max_purchase_count?: number;
  require_shipping?: boolean;
  custom_receipt?: string;
  custom_summary?: string;
  custom_fields?: any[];
  offer_code?: string;
  shown_on_profile?: boolean;
  tribes_enabled?: boolean;
}) {
  const body = new URLSearchParams();
  body.append('name', data.name);
  body.append('price', String(data.price));
  if (data.url) body.append('url', data.url);
  if (data.description) body.append('description', data.description);
  if (data.currency) body.append('currency', data.currency);
  if (data.is_physical !== undefined) body.append('is_physical', String(data.is_physical));
  if (data.is_recurring !== undefined) body.append('is_recurring', String(data.is_recurring));
  if (data.recurrence) body.append('recurrence', data.recurrence);
  if (data.duration) body.append('duration', data.duration);
  if (data.max_purchase_count !== undefined) body.append('max_purchase_count', String(data.max_purchase_count));
  if (data.require_shipping !== undefined) body.append('require_shipping', String(data.require_shipping));
  if (data.custom_receipt) body.append('custom_receipt', data.custom_receipt);
  if (data.custom_summary) body.append('custom_summary', data.custom_summary);
  if (data.custom_fields) body.append('custom_fields', JSON.stringify(data.custom_fields));
  if (data.offer_code) body.append('offer_code', data.offer_code);
  if (data.shown_on_profile !== undefined) body.append('shown_on_profile', String(data.shown_on_profile));
  if (data.tribes_enabled !== undefined) body.append('tribes_enabled', String(data.tribes_enabled));

  const res = await fetch(`${GUMROAD_API_BASE}/products`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getAccessToken()}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gumroad create product failed: ${res.status} — ${err}`);
  }
  return res.json();
}

export async function updateGumroadProduct(
  productId: string,
  data: Partial<{
    name: string;
    url: string;
    description: string;
    price: number;
    currency: string;
    is_physical: boolean;
    is_recurring: boolean;
    recurrence: string;
    max_purchase_count: number;
    require_shipping: boolean;
    custom_receipt: string;
    custom_summary: string;
    shown_on_profile: boolean;
    tribes_enabled: boolean;
  }>
) {
  const body = new URLSearchParams();
  if (data.name !== undefined) body.append('name', data.name);
  if (data.url !== undefined) body.append('url', data.url);
  if (data.description !== undefined) body.append('description', data.description);
  if (data.price !== undefined) body.append('price', String(data.price));
  if (data.currency !== undefined) body.append('currency', data.currency);
  if (data.is_physical !== undefined) body.append('is_physical', String(data.is_physical));
  if (data.is_recurring !== undefined) body.append('is_recurring', String(data.is_recurring));
  if (data.recurrence !== undefined) body.append('recurrence', data.recurrence);
  if (data.max_purchase_count !== undefined) body.append('max_purchase_count', String(data.max_purchase_count));
  if (data.require_shipping !== undefined) body.append('require_shipping', String(data.require_shipping));
  if (data.custom_receipt !== undefined) body.append('custom_receipt', data.custom_receipt);
  if (data.custom_summary !== undefined) body.append('custom_summary', data.custom_summary);
  if (data.shown_on_profile !== undefined) body.append('shown_on_profile', String(data.shown_on_profile));
  if (data.tribes_enabled !== undefined) body.append('tribes_enabled', String(data.tribes_enabled));

  const res = await fetch(`${GUMROAD_API_BASE}/products/${productId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${getAccessToken()}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gumroad update product failed: ${res.status} — ${err}`);
  }
  return res.json();
}

export async function deleteGumroadProduct(productId: string) {
  const res = await fetch(`${GUMROAD_API_BASE}/products/${productId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${getAccessToken()}` },
  });
  if (!res.ok) throw new Error(`Gumroad delete product failed: ${res.status}`);
  return res.json();
}

// ============================================================
// PRODUCT FILES (Associate uploaded files with product)
// ============================================================

export async function associateFileWithProduct(productId: string, fileUrl: string, fileName: string) {
  // Gumroad's file upload flow:
  // 1. POST /v2/files to get a presigned S3 URL
  // 2. Upload file to S3
  // 3. PATCH /v2/products/:id to associate file
  const uploadRes = await fetch(`${GUMROAD_API_BASE}/files`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getAccessToken()}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ product_id: productId, file_name: fileName }).toString(),
  });

  if (!uploadRes.ok) throw new Error(`Gumroad file upload init failed: ${uploadRes.status}`);
  const uploadData = await uploadRes.json();

  // uploadData should contain presigned_url for S3 upload
  return uploadData;
}

// ============================================================
// SALES
// ============================================================

export async function listGumroadSales(params?: {
  after?: string;
  before?: string;
  product_id?: string;
  email?: string;
  page?: number;
}) {
  const qs = new URLSearchParams();
  if (params?.after) qs.append('after', params.after);
  if (params?.before) qs.append('before', params.before);
  if (params?.product_id) qs.append('product_id', params.product_id);
  if (params?.email) qs.append('email', params.email);
  if (params?.page) qs.append('page', String(params.page));

  const res = await fetch(`${GUMROAD_API_BASE}/sales?${qs.toString()}`, {
    headers: { Authorization: `Bearer ${getAccessToken()}` },
  });
  if (!res.ok) throw new Error(`Gumroad list sales failed: ${res.status}`);
  return res.json();
}

// ============================================================
// RESOURCE SUBSCRIPTIONS
// ============================================================

export async function listResourceSubscriptions(resourceName: string) {
  const res = await fetch(`${GUMROAD_API_BASE}/resource_subscriptions?resource_name=${resourceName}`, {
    headers: { Authorization: `Bearer ${getAccessToken()}` },
  });
  if (!res.ok) throw new Error(`Gumroad list subscriptions failed: ${res.status}`);
  return res.json();
}

export async function createResourceSubscription(resourceName: string, postUrl: string) {
  const res = await fetch(`${GUMROAD_API_BASE}/resource_subscriptions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getAccessToken()}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ resource_name: resourceName, post_url: postUrl }).toString(),
  });
  if (!res.ok) throw new Error(`Gumroad create subscription failed: ${res.status}`);
  return res.json();
}

export async function deleteResourceSubscription(subscriptionId: string) {
  const res = await fetch(`${GUMROAD_API_BASE}/resource_subscriptions/${subscriptionId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${getAccessToken()}` },
  });
  if (!res.ok) throw new Error(`Gumroad delete subscription failed: ${res.status}`);
  return res.json();
}

// ============================================================
// USER INFO
// ============================================================

export async function getGumroadUser() {
  const res = await fetch(`${GUMROAD_API_BASE}/user`, {
    headers: { Authorization: `Bearer ${getAccessToken()}` },
  });
  if (!res.ok) throw new Error(`Gumroad get user failed: ${res.status}`);
  return res.json();
}

// ============================================================
// PUBLISH FLOW — Asset Factory → Gumroad
// ============================================================

export async function publishToGumroad(listingId: string): Promise<{ success: boolean; productId?: string; url?: string; error?: string }> {
  try {
    const listing = await prisma.assetListing.findUnique({
      where: { id: listingId },
      include: { product: true },
    });

    if (!listing) throw new Error('Listing no encontrado');
    if (!listing.product) throw new Error('Producto no encontrado');

    // 1. Create product on Gumroad
    const gumroadProduct: any = await createGumroadProduct({
      name: listing.title,
      description: listing.description || listing.product?.nombre || '',
      price: listing.priceCents,
      currency: 'USD',
      is_physical: listing.gumroadIsPhysical || false,
      is_recurring: listing.gumroadIsRecurring || false,
      shown_on_profile: true,
    });

    const productId = gumroadProduct.product?.id || gumroadProduct.id;
    const productUrl = gumroadProduct.product?.short_url || gumroadProduct.short_url;

    // 2. Associate file if product has generated files
    const files = listing.product?.files;
    if (files && Array.isArray(files) && files.length > 0) {
      const file = files[0] as { url: string; filename: string };
      try {
        await associateFileWithProduct(productId, file.url, file.filename);
      } catch (fileErr: any) {
        console.warn('[Gumroad] File association warning:', fileErr.message);
      }
    }

    // 3. Update listing with Gumroad data
    await prisma.assetListing.update({
      where: { id: listingId },
      data: {
        status: 'PUBLISHED',
        externalId: productId,
        externalUrl: productUrl,
        gumroadProductId: productId,
        gumroadUrl: productUrl,
      },
    });

    return { success: true, productId, url: productUrl };
  } catch (error: any) {
    console.error('[Gumroad] Publish error:', error.message);
    await prisma.assetListing.update({
      where: { id: listingId },
      data: { status: 'ERROR' },
    });
    return { success: false, error: error.message };
  }
}
