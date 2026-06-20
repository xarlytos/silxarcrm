import { getApi } from '../api/client';
import type { Invoice, InvoiceStatus, Payment, PaymentMethod } from '../types/api';

export interface ListInvoicesParams {
  status?: InvoiceStatus;
  customerId?: string;
  search?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedInvoicesResponse {
  data: Invoice[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  totals: {
    total: number;
    paidAmount: number;
    balanceDue: number;
  };
}

export interface CreateInvoiceLineInput {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
  discountPercent?: number | null;
  serviceId?: string | null;
  inventoryItemId?: string | null;
}

export interface CreateInvoicePayload {
  customerId: string;
  lines: CreateInvoiceLineInput[];
  taxRate?: number;
  discountPercent?: number | null;
  irpfRate?: number | null;
  dueDate?: string;
  notes?: string;
}

export interface UpdateInvoicePayload {
  notes?: string | null;
  dueDate?: string;
  status?: InvoiceStatus;
}

export interface RegisterPaymentPayload {
  amount: number;
  method: PaymentMethod;
  reference?: string | null;
  notes?: string | null;
  receivedAt?: string;
}

export async function listInvoices(params: ListInvoicesParams = {}) {
  const { data } = await getApi().get<PaginatedInvoicesResponse>('/finance/invoices', {
    params,
  });
  return data;
}

export async function getInvoice(id: string) {
  const { data } = await getApi().get<{ invoice: Invoice }>(`/finance/invoices/${id}`);
  return data.invoice;
}

export async function createInvoice(payload: CreateInvoicePayload) {
  const { data } = await getApi().post<{ invoice: Invoice }>('/finance/invoices', payload);
  return data.invoice;
}

export async function updateInvoice(id: string, payload: UpdateInvoicePayload) {
  const { data } = await getApi().patch<{ invoice: Invoice }>(`/finance/invoices/${id}`, payload);
  return data.invoice;
}

export async function cancelInvoice(id: string, reason: string) {
  const { data } = await getApi().patch<{ invoice: Invoice }>(
    `/finance/invoices/${id}/cancel`,
    { reason },
  );
  return data.invoice;
}

export async function registerPayment(invoiceId: string, payload: RegisterPaymentPayload) {
  const { data } = await getApi().post<{ payment: Payment; invoiceStatus: InvoiceStatus }>(
    `/finance/invoices/${invoiceId}/payments`,
    payload,
  );
  return data;
}

export async function createPaymentLink(invoiceId: string) {
  const { data } = await getApi().post<{ url: string; isMock: boolean }>(
    `/finance/invoices/${invoiceId}/payment-link`,
  );
  return data;
}
