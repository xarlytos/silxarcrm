import { getApi } from '../api/client';
import type { AuthResponse, AcceptInviteResponse, InvitePreview, Plan } from '../types/api';

export interface UtmPayload {
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  term?: string;
  referrer?: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  salonName?: string;
  plan?: Plan;
  acceptTerms: boolean;
  marketingConsent?: boolean;
  phone?: string;
  city?: string;
  staffCount?: number;
  utm?: UtmPayload;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AcceptInvitePayload {
  token: string;
  firstName?: string;
  lastName?: string;
  password?: string;
  acceptTerms?: boolean;
}

export async function register(payload: RegisterPayload): Promise<AuthResponse> {
  const { data } = await getApi().post<AuthResponse>('/auth/register', payload);
  return data;
}

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const { data } = await getApi().post<AuthResponse>('/auth/login', payload);
  return data;
}

export async function forgotPassword(email: string): Promise<{ message: string }> {
  const { data } = await getApi().post<{ message: string }>('/auth/forgot-password', { email });
  return data;
}

export async function resetPassword(token: string, password: string): Promise<{ message: string }> {
  const { data } = await getApi().post<{ message: string }>('/auth/reset-password', {
    token,
    password,
  });
  return data;
}

export async function verifyEmail(token: string): Promise<{ message: string }> {
  const { data } = await getApi().post<{ message: string }>('/auth/verify-email', { token });
  return data;
}

export async function resendVerification(email: string): Promise<{ message: string }> {
  const { data } = await getApi().post<{ message: string }>('/auth/resend-verification', {
    email,
  });
  return data;
}

export async function acceptInvite(payload: AcceptInvitePayload): Promise<AcceptInviteResponse> {
  const { data } = await getApi().post<AcceptInviteResponse>('/auth/accept-invite', payload);
  return data;
}

export async function getInvitePreview(token: string): Promise<InvitePreview> {
  const { data } = await getApi().get<InvitePreview>(
    `/auth/invite/${encodeURIComponent(token)}/preview`,
  );
  return data;
}

export async function requestMagicLink(email: string): Promise<{ message: string }> {
  const { data } = await getApi().post<{ message: string }>('/auth/magic-link', { email });
  return data;
}

export async function verifyMagicLogin(token: string): Promise<AuthResponse> {
  const { data } = await getApi().post<AuthResponse>('/auth/magic-login', { token });
  return data;
}
