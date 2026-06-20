import { getApi } from '../api/client';
import type { FinanceDashboard, FinanceReport } from '../types/api';

export interface PeriodParams {
  from?: string;
  to?: string;
}

export interface DeltaInfo {
  value: number;
  percent: number | null;
}

export interface ReportCompareTotals {
  income: { current: number; previous: number; delta: DeltaInfo };
  expenses: { current: number; previous: number; delta: DeltaInfo };
  net: { current: number; previous: number; delta: DeltaInfo };
}

export interface ReportCompareCategoryRow {
  category: string;
  current: number;
  previous: number;
  delta: DeltaInfo;
}

export interface FinanceReportCompare {
  period: { start: string; end: string };
  previousPeriod: { start: string; end: string };
  totals: ReportCompareTotals;
  incomeByCategory: ReportCompareCategoryRow[];
  expensesByCategory: ReportCompareCategoryRow[];
}

export interface ByPeriodRow {
  period: string;
  income: number;
  expense: number;
  net: number;
}

export async function getFinanceDashboard(params: PeriodParams = {}) {
  const { data } = await getApi().get<FinanceDashboard>('/finance/dashboard', { params });
  return data;
}

export async function getFinanceReport(params: PeriodParams = {}) {
  const { data } = await getApi().get<FinanceReport>('/finance/reports', { params });
  return data;
}

export async function getFinanceReportCompare(params: PeriodParams = {}) {
  const { data } = await getApi().get<FinanceReportCompare>('/finance/reports/compare', {
    params,
  });
  return data;
}

export async function getFinanceReportByPeriod(
  params: PeriodParams & { granularity?: 'week' | 'month' } = {},
) {
  const { data } = await getApi().get<{
    granularity: 'week' | 'month';
    data: ByPeriodRow[];
  }>('/finance/reports/by-period', { params });
  return data;
}
