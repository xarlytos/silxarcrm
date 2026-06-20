import { getApi } from '../api/client';
import type { Groomer, GroomerSchedule, GroomerTimeOff, Appointment } from '../types/api';

export interface ListGroomersParams {
  includeInactive?: boolean;
}

export async function listGroomers(params: ListGroomersParams = {}) {
  const { data } = await getApi().get<{ data: Groomer[] }>('/groomers', { params });
  return data.data;
}

export async function getGroomer(id: string) {
  const { data } = await getApi().get<{ groomer: Groomer }>(`/groomers/${id}`);
  return data.groomer;
}

export async function getScheduleSummary(date: string) {
  const { data } = await getApi().get<{ date: string; data: Array<{
    id: string;
    name: string;
    color: string | null;
    isWorking: boolean;
    startTime: string | null;
    endTime: string | null;
  }> }>('/groomers/schedule-summary', { params: { date } });
  return data.data;
}

export async function getGroomerAppointments(
  id: string,
  range: { from?: string; to?: string } = {},
) {
  const { data } = await getApi().get<{ data: Appointment[] }>(`/groomers/${id}/appointments`, {
    params: range,
  });
  return data.data;
}
