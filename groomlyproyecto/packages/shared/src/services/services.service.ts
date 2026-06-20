import { getApi } from '../api/client';
import type { Service } from '../types/api';

export interface ListServicesParams {
  category?: string;
  includeInactive?: boolean;
}

export async function listServices(params: ListServicesParams = {}) {
  const { data } = await getApi().get<{ data: Service[] }>('/services', { params });
  return data.data;
}

export async function getService(id: string) {
  const { data } = await getApi().get<{ service: Service }>(`/services/${id}`);
  return data.service;
}
