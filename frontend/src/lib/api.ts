const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

interface ApiOptions {
  method?: string;
  body?: any;
  token?: string;
}

export async function api<T = any>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, token } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  } else if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('crm_token');
    if (stored) headers['Authorization'] = `Bearer ${stored}`;
  }

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

export const apiClient = {
  // Auth
  login: (email: string, password: string) =>
    api('/api/auth/login', { method: 'POST', body: { email, password } }),
  refresh: (refreshToken: string) =>
    api('/api/auth/refresh', { method: 'POST', body: { refreshToken } }),
  me: () => api('/api/auth/me'),
  registerFcm: (fcmToken: string) =>
    api('/api/auth/register-fcm', { method: 'POST', body: { fcmToken } }),

  // Dashboard
  getDashboard: (saas?: string) =>
    api(`/api/dashboard${saas ? `?saas=${saas}` : ''}`),
  getClientes: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return api(`/api/dashboard/clientes${qs ? `?${qs}` : ''}`);
  },
  getCliente: (id: number) => api(`/api/dashboard/clientes/${id}`),
  getEventos: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return api(`/api/dashboard/eventos${qs ? `?${qs}` : ''}`);
  },
  getMetricas: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return api(`/api/dashboard/metricas${qs ? `?${qs}` : ''}`);
  },
  getSaasList: () => api('/api/dashboard/saas'),

  // IA
  chatIA: (message: string) =>
    api('/api/ia/chat', { method: 'POST', body: { message } }),
  getIAHistory: (page = 1) => api(`/api/ia/history?page=${page}`),
  getIASuggestions: () => api('/api/ia/suggestions'),

  // Calendario
  getCalendarioEventos: (params: { inicio: string; fin: string; asignadoA?: string }) => {
    const qs = new URLSearchParams(params).toString();
    return api(`/api/calendario/events?${qs}`);
  },
  getCalendarioEvento: (id: string) => api(`/api/calendario/events/${id}`),
  createCalendarioEvento: (data: any) =>
    api('/api/calendario/events', { method: 'POST', body: data }),
  updateCalendarioEvento: (id: string, data: any) =>
    api(`/api/calendario/events/${id}`, { method: 'PUT', body: data }),
  deleteCalendarioEvento: (id: string) =>
    api(`/api/calendario/events/${id}`, { method: 'DELETE' }),
  getCalendarioStats: () => api('/api/calendario/stats'),
};
