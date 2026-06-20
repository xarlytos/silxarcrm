import { getApi } from '../api/client';

export interface CommissionSummary {
  totals: {
    totalAmount: number;
    pendingAmount: number;
    groomerCount: number;
  };
  byGroomer: Array<{
    groomerId: string;
    groomerName: string;
    color: string | null;
    totalAmount: number;
    pendingAmount: number;
    paidAmount: number;
    cancelledAmount: number;
    appointments: number;
    revenue: number;
  }>;
}

export interface Commission {
  id: string;
  groomerId: string;
  appointmentId: string;
  baseAmount: number;
  percentage: number;
  amount: number;
  status: 'pending' | 'paid' | 'cancelled';
  paidAt: string | null;
  paymentMethod: string | null;
  paymentReference: string | null;
  irpfRate: number | null;
  irpfAmount: number | null;
  netAmount: number | null;
  notes: string | null;
  createdAt: string;
  groomer?: { id: string; name: string; color: string | null };
}

export interface PayCommissionPayload {
  notes?: string;
  paymentMethod?: string | null;
  paymentReference?: string | null;
  irpfRate?: number | null;
}

export interface PayBatchPayload {
  ids: string[];
  paymentMethod?: string | null;
  irpfRate?: number | null;
}

export async function getCommissionSummary(params: { from?: string; to?: string } = {}) {
  const { data } = await getApi().get<CommissionSummary>('/finance/commissions/summary', {
    params,
  });
  return data;
}

export async function listCommissions(params: {
  from?: string;
  to?: string;
  groomerId?: string;
  status?: string;
} = {}) {
  const { data } = await getApi().get<{ data: Commission[] }>('/finance/commissions', {
    params,
  });
  return data;
}

export async function getCommission(id: string) {
  const { data } = await getApi().get<{ commission: Commission }>(`/finance/commissions/${id}`);
  return data;
}

export async function payCommission(id: string, payload: PayCommissionPayload) {
  const { data } = await getApi().post<{ commission: Commission }>(
    `/finance/commissions/${id}/pay`,
    payload,
  );
  return data;
}

export async function payCommissionsBatch(payload: PayBatchPayload) {
  const { data } = await getApi().post<{ count: number }>('/finance/commissions/pay-batch', payload);
  return data;
}

export async function revertPayment(id: string) {
  const { data } = await getApi().post<{ commission: Commission }>(
    `/finance/commissions/${id}/revert-payment`,
  );
  return data;
}

export async function getGroomerCommissions(groomerId: string) {
  const { data } = await getApi().get<{ data: Commission[] }>(`/groomers/${groomerId}/commissions`);
  return data;
}
