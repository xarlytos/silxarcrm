import { getApi } from '../api/client';
import type { Appointment, Customer, PaginatedResponse, Pet } from '../types/api';

export interface ListCustomersParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

export interface ListCustomersCursorParams {
  cursor?: string;
  limit?: number;
  search?: string;
  status?: string;
}

export interface CursorResponse<T> {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface CreateCustomerPayload {
  fullName: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  notes?: string;
  avatarUrl?: string;
  dniNif?: string;
  marketingEmail?: boolean;
  marketingSms?: boolean;
  marketingWhatsapp?: boolean;
  privacyAccepted?: boolean;
}

export type UpdateCustomerPayload = Partial<CreateCustomerPayload> & {
  status?: 'active' | 'inactive' | 'archived';
};

export async function listCustomers(params: ListCustomersParams = {}) {
  const { data } = await getApi().get<PaginatedResponse<Customer>>('/customers', { params });
  return data;
}

export async function listCustomersCursor(params: ListCustomersCursorParams = {}) {
  const { data } = await getApi().get<CursorResponse<Customer>>('/customers', {
    params: { ...params, cursor: params.cursor ?? '' },
  });
  return data;
}

export async function getCustomer(id: string) {
  const { data } = await getApi().get<{ customer: Customer }>(`/customers/${id}`);
  return data.customer;
}

export async function createCustomer(payload: CreateCustomerPayload) {
  const { data } = await getApi().post<{ customer: Customer }>('/customers', payload);
  return data.customer;
}

export async function updateCustomer(id: string, payload: UpdateCustomerPayload) {
  const { data } = await getApi().patch<{ customer: Customer }>(`/customers/${id}`, payload);
  return data.customer;
}

export async function archiveCustomer(id: string) {
  const { data } = await getApi().delete<{ customer: Customer; message: string }>(
    `/customers/${id}`,
  );
  return data;
}

export async function getCustomerPets(id: string) {
  const { data } = await getApi().get<{ data: Pet[] }>(`/customers/${id}/pets`);
  return data.data;
}

export interface CustomerInvoiceListItem {
  id: string;
  number: string;
  issueDate: string;
  dueDate: string;
  total: number;
  paidAmount: number;
  balanceDue: number;
  status: string;
  appointmentId: string | null;
}

export async function getCustomerAppointments(id: string): Promise<Appointment[]> {
  const { data } = await getApi().get<{ data: Appointment[] }>(`/customers/${id}/appointments`);
  return data.data;
}

export async function getCustomerInvoices(id: string): Promise<CustomerInvoiceListItem[]> {
  const { data } = await getApi().get<{ data: CustomerInvoiceListItem[] }>(
    `/customers/${id}/invoices`,
  );
  return data.data;
}
