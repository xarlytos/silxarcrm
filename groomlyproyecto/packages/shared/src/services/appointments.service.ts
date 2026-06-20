import { getApi } from '../api/client';
import type {
  Appointment,
  AppointmentStatus,
  PaginatedResponse,
  Slot,
} from '../types/api';

export interface ListAppointmentsParams {
  page?: number;
  limit?: number;
  date?: string;
  groomerId?: string;
  customerId?: string;
  petId?: string;
  status?: AppointmentStatus;
  search?: string;
}

export interface ListSlotsParams {
  date: string;
  durationMinutes: number;
  groomerId?: string;
}

export interface CalendarParams {
  from: string;
  to: string;
  groomerId?: string;
  status?: AppointmentStatus;
}

export interface CreateAppointmentPayload {
  customerId: string;
  petId: string;
  groomerId?: string;
  date: string;
  startTime: string;
  services: { serviceId: string; addonId?: string }[];
  notes?: string;
  internalNotes?: string;
  source?: 'manual' | 'portal' | 'walkin';
}

export interface CreateRecurringPayload extends CreateAppointmentPayload {
  intervalWeeks: number;
  occurrences: number;
}

export interface CreateRecurringResponse {
  series: { id: string; count: number };
  created: { date: string; id: string }[];
  skipped: { date: string; reason: string }[];
}

export interface UpdateAppointmentPayload {
  groomerId?: string | null;
  date?: string;
  startTime?: string;
  services?: { serviceId: string; addonId?: string }[];
  notes?: string;
  internalNotes?: string;
}

export async function listAppointments(params: ListAppointmentsParams = {}) {
  const { data } = await getApi().get<PaginatedResponse<Appointment>>('/appointments', {
    params,
  });
  return data;
}

export async function getCalendar(params: CalendarParams) {
  const { data } = await getApi().get<{ data: Appointment[] }>('/appointments/calendar', {
    params,
  });
  return data.data;
}

export async function listSlots(params: ListSlotsParams) {
  const { data } = await getApi().get<{ data: Slot[] }>('/appointments/slots', { params });
  return data.data;
}

export async function getAppointment(id: string) {
  const { data } = await getApi().get<{ appointment: Appointment }>(`/appointments/${id}`);
  return data.appointment;
}

export async function createAppointment(payload: CreateAppointmentPayload) {
  const { data } = await getApi().post<{ appointment: Appointment }>('/appointments', payload);
  return data.appointment;
}

export async function updateAppointment(id: string, payload: UpdateAppointmentPayload) {
  const { data } = await getApi().patch<{ appointment: Appointment }>(
    `/appointments/${id}`,
    payload,
  );
  return data.appointment;
}

export async function updateAppointmentStatus(
  id: string,
  status: AppointmentStatus,
  reason?: string,
) {
  const { data } = await getApi().patch<{ appointment: Appointment }>(
    `/appointments/${id}/status`,
    { status, reason },
  );
  return data.appointment;
}

export async function cancelAppointment(id: string, reason?: string) {
  const { data } = await getApi().delete<{ appointment: Appointment }>(`/appointments/${id}`, {
    data: { reason },
  });
  return data.appointment;
}

export async function listCustomerAppointments(customerId: string) {
  const { data } = await getApi().get<{ data: Appointment[] }>(
    `/customers/${customerId}/appointments`,
  );
  return data.data;
}

export async function listPetHistory(petId: string) {
  const { data } = await getApi().get<{ data: Appointment[] }>(`/pets/${petId}/history`);
  return data.data;
}

export interface AppointmentTimelineEntry {
  kind: 'audit' | 'reminder';
  action: string;
  userName?: string | null;
  createdAt: string;
  meta?: Record<string, unknown> | null;
  channel?: string;
  status?: string;
  scheduledAt?: string;
  sentAt?: string | null;
}

export async function getAppointmentTimeline(id: string) {
  const { data } = await getApi().get<{ data: AppointmentTimelineEntry[] }>(
    `/appointments/${id}/timeline`,
  );
  return data.data;
}
