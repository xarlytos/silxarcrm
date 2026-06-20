import { getApi } from '../api/client';

export type InventoryCategory =
  | 'shampoo'
  | 'conditioner'
  | 'tools'
  | 'treatments'
  | 'perfume'
  | 'accessory'
  | 'other';

export type InventoryUnit = 'unit' | 'ml' | 'l' | 'kg' | 'g' | 'dosis';

export interface InventoryItem {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  description: string | null;
  category: InventoryCategory;
  unitPrice: number;
  purchasePrice: number | null;
  stock: number;
  minStock: number;
  unit: InventoryUnit;
  photoUrl: string | null;
  expiryDate: string | null;
  batchNumber: string | null;
  vendorId: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StockMovement {
  id: string;
  inventoryItemId: string;
  type: 'purchase' | 'sale' | 'adjustment' | 'use';
  quantity: number;
  unitPrice: number | null;
  reference: string | null;
  notes: string | null;
  expenseId: string | null;
  createdAt: string;
}

export interface CreateInventoryItemPayload {
  name: string;
  sku?: string;
  barcode?: string;
  description?: string;
  category: InventoryCategory;
  unitPrice: number;
  purchasePrice?: number | null;
  stock?: number;
  minStock?: number;
  unit?: InventoryUnit;
  photoUrl?: string;
  expiryDate?: string | null;
  batchNumber?: string;
  vendorId?: string | null;
}

export interface UpdateInventoryItemPayload {
  name?: string;
  sku?: string;
  barcode?: string;
  description?: string;
  category?: InventoryCategory;
  unitPrice?: number;
  purchasePrice?: number | null;
  stock?: number;
  minStock?: number;
  unit?: InventoryUnit;
  photoUrl?: string;
  expiryDate?: string | null;
  batchNumber?: string;
  vendorId?: string | null;
  active?: boolean;
}

export interface CreateMovementPayload {
  type: 'purchase' | 'sale' | 'adjustment' | 'use';
  quantity: number;
  unitPrice?: number;
  reference?: string;
  notes?: string;
  vendorId?: string | null;
  expiryDate?: string | null;
  batchNumber?: string;
}

export const INVENTORY_CATEGORY_LABELS: Record<InventoryCategory, string> = {
  shampoo: 'Champú',
  conditioner: 'Acondicionador',
  tools: 'Herramientas',
  treatments: 'Tratamientos',
  perfume: 'Perfume',
  accessory: 'Accesorios',
  other: 'Otros',
};

export async function listInventoryItems(params: {
  category?: string;
  search?: string;
  includeInactive?: boolean;
} = {}) {
  const { data } = await getApi().get<{ data: InventoryItem[] }>('/inventory', { params });
  return data;
}

export async function getInventoryAlerts() {
  const { data } = await getApi().get<{ data: InventoryItem[] }>('/inventory/alerts');
  return data;
}

export async function getInventoryItem(id: string) {
  const { data } = await getApi().get<{ item: InventoryItem }>(`/inventory/${id}`);
  return data;
}

export async function createInventoryItem(payload: CreateInventoryItemPayload) {
  const { data } = await getApi().post<{ item: InventoryItem }>('/inventory', payload);
  return data;
}

export async function updateInventoryItem(id: string, payload: UpdateInventoryItemPayload) {
  const { data } = await getApi().patch<{ item: InventoryItem }>(`/inventory/${id}`, payload);
  return data;
}

export async function deactivateInventoryItem(id: string) {
  const { data } = await getApi().delete<{ message: string; item: InventoryItem }>(`/inventory/${id}`);
  return data;
}

export async function listMovements(itemId: string) {
  const { data } = await getApi().get<{ data: StockMovement[] }>(`/inventory/${itemId}/movements`);
  return data;
}

export async function createMovement(itemId: string, payload: CreateMovementPayload) {
  const { data } = await getApi().post<{ movement: StockMovement; item: InventoryItem }>(
    `/inventory/${itemId}/movements`,
    payload,
  );
  return data;
}
