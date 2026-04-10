import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000';

interface ApiOptions {
  method?: string;
  body?: any;
}

export async function api<T = any>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body } = options;
  const token = await AsyncStorage.getItem('crm_token');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Error de red' }));
    throw new Error(error.error || `HTTP ${res.status}`);
  }

  return res.json();
}

export const mobileApi = {
  login: (email: string, password: string) =>
    api('/api/auth/login', { method: 'POST', body: { email, password } }),
  me: () => api('/api/auth/me'),
  registerFcm: (fcmToken: string) =>
    api('/api/auth/register-fcm', { method: 'POST', body: { fcmToken } }),
  getDashboard: (saas?: string) =>
    api(`/api/dashboard${saas ? `?saas=${saas}` : ''}`),
  getEventos: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return api(`/api/dashboard/eventos${qs ? `?${qs}` : ''}`);
  },
  getCliente: (id: number) => api(`/api/dashboard/clientes/${id}`),
  chatIA: (message: string) =>
    api('/api/ia/chat', { method: 'POST', body: { message } }),
  getIASuggestions: () => api('/api/ia/suggestions'),
};
