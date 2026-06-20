import { getApi } from '../api/client';
import type { Expense, ExpenseCategory, PaymentMethod } from '../types/api';

export interface ListExpensesParams {
  category?: ExpenseCategory;
  vendorId?: string;
  paymentMethod?: PaymentMethod;
  from?: string;
  to?: string;
  cursor?: string;
  limit?: number;
}

export interface CreateExpensePayload {
  category: ExpenseCategory;
  amount: number;
  subtotal?: number | null;
  taxRate?: number | null;
  taxAmount?: number | null;
  paymentMethod?: PaymentMethod | null;
  description: string;
  vendor?: string | null;
  vendorId?: string | null;
  receiptUrl?: string | null;
  date?: string;
  notes?: string | null;
}

export type UpdateExpensePayload = Partial<CreateExpensePayload>;

export async function listExpenses(params: ListExpensesParams = {}) {
  const { data } = await getApi().get<{ data: Expense[]; nextCursor: string | null }>(
    '/finance/expenses',
    { params },
  );
  return data;
}

export async function createExpense(payload: CreateExpensePayload) {
  const { data } = await getApi().post<{ expense: Expense }>('/finance/expenses', payload);
  return data.expense;
}

export async function updateExpense(id: string, payload: UpdateExpensePayload) {
  const { data } = await getApi().patch<{ expense: Expense }>(`/finance/expenses/${id}`, payload);
  return data.expense;
}

export async function deleteExpense(id: string) {
  const { data } = await getApi().delete<{ message: string }>(`/finance/expenses/${id}`);
  return data;
}

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  products: 'Productos',
  tools: 'Herramientas',
  staff: 'Personal',
  marketing: 'Marketing',
  rent: 'Alquiler',
  utilities: 'Servicios',
  supplies: 'Suministros',
  accounting: 'Contabilidad',
  software: 'Software',
  insurance: 'Seguros',
  other: 'Otros',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
  stripe: 'Stripe',
  bizum: 'Bizum',
  other: 'Otro',
};
