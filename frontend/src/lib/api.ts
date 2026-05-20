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

  // Tareas (gamificación)
  getTareas: () => api('/api/tareas'),

  // IA
  chatIA: (message: string) =>
    api('/api/ia/chat', { method: 'POST', body: { message } }),
  chatIAStream: async (
    message: string,
    callbacks: {
      onToken: (token: string) => void;
      onError: (error: string) => void;
      onComplete: (result: { response: string; sql?: string; data?: any; time: number }) => void;
    }
  ) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('crm_token') : null;
    const res = await fetch(`${API_URL}/api/ia/chat-stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ message }),
    });

    if (!res.ok || !res.body) {
      const error = await res.json().catch(() => ({ error: 'Error de red' }));
      callbacks.onError(error.error || `HTTP ${res.status}`);
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const event = JSON.parse(line);
          if (event.type === 'token' && event.data?.content) {
            callbacks.onToken(event.data.content);
          } else if (event.type === 'error') {
            callbacks.onError(event.data?.message || 'Error desconocido');
          } else if (event.type === 'complete') {
            callbacks.onComplete(event.data);
          }
        } catch {
          // Ignore malformed lines
        }
      }
    }
  },
  getIAHistory: (page = 1) => api(`/api/ia/history?page=${page}`),
  getIASuggestions: () => api('/api/ia/suggestions'),
  getIAInsights: (softwareId?: string) =>
    api(`/api/ia/insights${softwareId ? `?softwareId=${softwareId}` : ''}`),
  generateEmailPlantilla: (data: { tipo: string; objetivo: string; tono: string; industria: string; softwareId: string }) =>
    api('/api/ia/generate-plantilla', { method: 'POST', body: data }),

  // IA Actions
  confirmAction: (actionId: string) =>
    api(`/api/ia/actions/${actionId}/confirm`, { method: 'POST' }),
  cancelAction: (actionId: string) =>
    api(`/api/ia/actions/${actionId}/cancel`, { method: 'POST' }),
  getPendingActions: () => api('/api/ia/actions/pending'),
  getActions: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return api(`/api/ia/actions${qs ? `?${qs}` : ''}`);
  },

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

  // Leads
  getLeads: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return api(`/api/leads${qs ? `?${qs}` : ''}`);
  },
  getLead: (id: string) => api(`/api/leads/${id}`),
  createLead: (data: any) => api('/api/leads', { method: 'POST', body: data }),
  updateLead: (id: string, data: any) => api(`/api/leads/${id}`, { method: 'PUT', body: data }),
  deleteLead: (id: string) => api(`/api/leads/${id}`, { method: 'DELETE' }),
  changeLeadStatus: (id: string, estado: string, motivo?: string) =>
    api(`/api/leads/${id}/estado`, { method: 'PUT', body: { estado, motivo } }),
  addLeadHistorial: (id: string, tipo: string, descripcion: string) =>
    api(`/api/leads/${id}/historial`, { method: 'POST', body: { tipo, descripcion } }),
  getLeadStats: (softwareId?: string, opts?: { excludeTags?: string; includeTags?: string }) => {
    const q: Record<string, string> = {};
    if (softwareId) q.softwareId = softwareId;
    if (opts?.excludeTags) q.excludeTags = opts.excludeTags;
    if (opts?.includeTags) q.includeTags = opts.includeTags;
    const qs = new URLSearchParams(q).toString();
    return api(`/api/leads/stats${qs ? `?${qs}` : ''}`);
  },
  getLeadSectores: (softwareId?: string) =>
    api(`/api/leads/sectores${softwareId ? `?softwareId=${softwareId}` : ''}`),
  importLeadsCSV: (contenido: string, softwareId: string) =>
    api('/api/leads/importar-csv', { method: 'POST', body: { contenido, softwareId } }),
  convertLead: (id: string) => api(`/api/leads/${id}/convertir`, { method: 'POST' }),
  buscarLeads: (q: string, ciudad?: string, fuente?: string) => {
    const params = new URLSearchParams({ q });
    if (ciudad) params.append('ciudad', ciudad);
    if (fuente) params.append('fuente', fuente);
    return api(`/api/leads/buscar?${params.toString()}`);
  },
  getBuscarLeadsUrls: (q: string, ciudad?: string) => {
    const params = new URLSearchParams({ q });
    if (ciudad) params.append('ciudad', ciudad);
    return api(`/api/leads/buscar-urls?${params.toString()}`);
  },

  // WhatsApp
  getWhatsappPlantillas: (softwareId?: string) =>
    api(`/api/whatsapp/plantillas${softwareId ? `?softwareId=${softwareId}` : ''}`),
  getWhatsappPlantilla: (id: string) => api(`/api/whatsapp/plantillas/${id}`),
  createWhatsappPlantilla: (data: { softwareId: string; nombre: string; contenido: string; categoria?: string; activa?: boolean }) =>
    api('/api/whatsapp/plantillas', { method: 'POST', body: data }),
  updateWhatsappPlantilla: (id: string, data: any) =>
    api(`/api/whatsapp/plantillas/${id}`, { method: 'PUT', body: data }),
  deleteWhatsappPlantilla: (id: string) =>
    api(`/api/whatsapp/plantillas/${id}`, { method: 'DELETE' }),
  seedWhatsappPlantillas: (softwareId: string) =>
    api('/api/whatsapp/plantillas/seed', { method: 'POST', body: { softwareId } }),
  generarWhatsappPlantillaIA: (data: { softwareId: string; categoria?: string; objetivo: string; tono?: string; longitud?: string }) =>
    api('/api/whatsapp/plantillas/generar-ia', { method: 'POST', body: data }),
  enviarWhatsapp: (data: { leadId: string; plantillaId?: string; contenidoFinal?: string }) =>
    api('/api/whatsapp/enviar', { method: 'POST', body: data }),
  previewWhatsapp: (plantillaId: string, leadId: string) =>
    api('/api/whatsapp/preview', { method: 'POST', body: { plantillaId, leadId } }),
  getWhatsappEnvios: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return api(`/api/whatsapp/envios${qs ? `?${qs}` : ''}`);
  },

  // WhatsApp A/B Tests
  getWhatsappABTests: (softwareId?: string) =>
    api(`/api/whatsapp/ab-tests${softwareId ? `?softwareId=${softwareId}` : ''}`),
  getWhatsappABTest: (id: string) => api(`/api/whatsapp/ab-tests/${id}`),
  getWhatsappABTestMetrics: (id: string) => api(`/api/whatsapp/ab-tests/${id}/metrics`),
  createWhatsappABTest: (data: any) =>
    api('/api/whatsapp/ab-tests', { method: 'POST', body: data }),
  updateWhatsappABTest: (id: string, data: any) =>
    api(`/api/whatsapp/ab-tests/${id}`, { method: 'PUT', body: data }),
  deleteWhatsappABTest: (id: string) =>
    api(`/api/whatsapp/ab-tests/${id}`, { method: 'DELETE' }),

  // WhatsApp Conversaciones (chat manual / híbrido)
  getWhatsappConversaciones: (softwareId: string) =>
    api(`/api/whatsapp/conversaciones?softwareId=${encodeURIComponent(softwareId)}`),
  getWhatsappConversacion: (leadId: string) =>
    api(`/api/whatsapp/conversaciones/${leadId}`),
  addWhatsappMensaje: (leadId: string, data: { direccion: 'IN' | 'OUT'; cuerpo: string; iaGenerado?: boolean }) =>
    api(`/api/whatsapp/conversaciones/${leadId}/mensajes`, { method: 'POST', body: data }),
  marcarWhatsappLeida: (leadId: string) =>
    api(`/api/whatsapp/conversaciones/${leadId}/leida`, { method: 'POST' }),
  sugerirWhatsappRespuesta: (leadId: string, instrucciones?: string) =>
    api(`/api/whatsapp/conversaciones/${leadId}/sugerir`, {
      method: 'POST',
      body: instrucciones ? { instrucciones } : {},
    }),

  // WhatsApp — secciones creativas
  getWhatsappCementerio: (softwareId: string, dias: number = 30) =>
    api(`/api/whatsapp/cementerio?softwareId=${encodeURIComponent(softwareId)}&dias=${dias}`),
  generarResurreccion: (leadId: string, pretexto?: string) =>
    api('/api/whatsapp/cementerio/resurrect', { method: 'POST', body: { leadId, pretexto } }),

  whatsappArena: (data: { plantillaAId: string; plantillaBId: string; perfiles: { nombre: string; descripcion: string }[] }) =>
    api('/api/whatsapp/arena', { method: 'POST', body: data }),
  whatsappArenaPerfiles: (data: { softwareId: string; cantidad: number }) =>
    api('/api/whatsapp/arena/perfiles', { method: 'POST', body: data }),
  getWhatsappArenaBattles: (softwareId: string) =>
    api(`/api/whatsapp/arena/battles?softwareId=${encodeURIComponent(softwareId)}`),
  getWhatsappArenaBattle: (id: string) => api(`/api/whatsapp/arena/battles/${id}`),
  updateWhatsappArenaBattle: (id: string, data: { nota?: string }) =>
    api(`/api/whatsapp/arena/battles/${id}`, { method: 'PATCH', body: data }),
  deleteWhatsappArenaBattle: (id: string) =>
    api(`/api/whatsapp/arena/battles/${id}`, { method: 'DELETE' }),

  whatsappSparring: (data: { leadId: string; hilo: { role: 'tu' | 'lead'; texto: string }[] }) =>
    api('/api/whatsapp/sparring', { method: 'POST', body: data }),

  whatsappWhisper: (data: { leadId: string; borrador: string }) =>
    api('/api/whatsapp/whisper', { method: 'POST', body: data }),

  whatsappStoryboard: (leadId: string) =>
    api(`/api/whatsapp/storyboard/${leadId}`),

  whatsappPersonalizarMasa: (data: { leadIds: string[]; objetivo: string; toneRef?: string }) =>
    api('/api/whatsapp/personalizar-masa', { method: 'POST', body: data }),

  getWhatsappSnippets: () => api('/api/whatsapp/snippets'),
  resolverWhatsappSnippet: (data: { comando: string; leadId?: string; borrador?: string }) =>
    api('/api/whatsapp/snippet', { method: 'POST', body: data }),

  // WhatsApp Web.js (automatización)
  wwebEstado: (softwareId?: string) =>
    api(`/api/whatsapp-wweb/estado${softwareId ? `?softwareId=${softwareId}` : ''}`),
  wwebIniciar: (softwareId: string) =>
    api('/api/whatsapp-wweb/iniciar', { method: 'POST', body: { softwareId } }),
  wwebDetener: (softwareId: string) =>
    api('/api/whatsapp-wweb/detener', { method: 'POST', body: { softwareId } }),
  wwebDetenerTodos: () => api('/api/whatsapp-wweb/detener-todos', { method: 'POST' }),
  wwebEnviar: (data: { softwareId: string; telefono: string; mensaje: string }) =>
    api('/api/whatsapp-wweb/enviar', { method: 'POST', body: data }),
  wwebEnviarLead: (data: { softwareId: string; leadId: string; plantillaId?: string; contenidoFinal?: string }) =>
    api('/api/whatsapp-wweb/enviar-lead', { method: 'POST', body: data }),
  wwebEnviarBulk: (data: { softwareId: string; leadIds: string[]; mensaje: string }) =>
    api('/api/whatsapp-wweb/enviar-bulk', { method: 'POST', body: data }),
  wwebProgramar: (data: { softwareId: string; leadId: string; plantillaId?: string; contenidoFinal?: string; programadoPara: string }) =>
    api('/api/whatsapp-wweb/programar', { method: 'POST', body: data }),

  // WhatsApp Chatbot
  getWhatsappChatbotReglas: (softwareId?: string) =>
    api(`/api/whatsapp-chatbot/reglas${softwareId ? `?softwareId=${softwareId}` : ''}`),
  getWhatsappChatbotRegla: (id: string) => api(`/api/whatsapp-chatbot/reglas/${id}`),
  createWhatsappChatbotRegla: (data: any) =>
    api('/api/whatsapp-chatbot/reglas', { method: 'POST', body: data }),
  updateWhatsappChatbotRegla: (id: string, data: any) =>
    api(`/api/whatsapp-chatbot/reglas/${id}`, { method: 'PUT', body: data }),
  deleteWhatsappChatbotRegla: (id: string) =>
    api(`/api/whatsapp-chatbot/reglas/${id}`, { method: 'DELETE' }),

  // Spechs (Centro de Llamadas)
  getSpechs: (softwareId?: string) =>
    api(`/api/spechs${softwareId ? `?softwareId=${softwareId}` : ''}`),
  getSpech: (id: string) => api(`/api/spechs/${id}`),
  createSpech: (data: any) => api('/api/spechs', { method: 'POST', body: data }),
  updateSpech: (id: string, data: any) => api(`/api/spechs/${id}`, { method: 'PUT', body: data }),
  deleteSpech: (id: string) => api(`/api/spechs/${id}`, { method: 'DELETE' }),
  setDefaultSpech: (id: string) => api(`/api/spechs/${id}/default`, { method: 'PUT' }),
  duplicateSpech: (id: string) => api(`/api/spechs/${id}/duplicar`, { method: 'POST' }),
  reorderSpechs: (softwareId: string, ids: string[]) =>
    api('/api/spechs/orden/reordenar', { method: 'PUT', body: { softwareId, ids } }),

  // Simulacion IA
  iniciarSimulacion: (data: { softwareId: string; spechId?: string; leadSimulado: any }) =>
    api('/api/simulacion/iniciar', { method: 'POST', body: data }),
  enviarMensajeSimulacion: (id: string, texto: string) =>
    api(`/api/simulacion/${id}/mensaje`, { method: 'POST', body: { texto } }),
  finalizarSimulacion: (id: string) =>
    api(`/api/simulacion/${id}/finalizar`, { method: 'POST' }),
  getSimulaciones: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return api(`/api/simulacion${qs ? `?${qs}` : ''}`);
  },
  getSimulacion: (id: string) => api(`/api/simulacion/${id}`),
  deleteSimulacion: (id: string) => api(`/api/simulacion/${id}`, { method: 'DELETE' }),

  // Llamadas Reales
  getLlamadas: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return api(`/api/llamadas${qs ? `?${qs}` : ''}`);
  },
  getLlamada: (id: string) => api(`/api/llamadas/${id}`),
  iniciarLlamada: (data: { leadId: string; spechId?: string; telefonoAgente?: string }) =>
    api('/api/llamadas/iniciar', { method: 'POST', body: data }),
  actualizarNotasLlamada: (id: string, data: any) =>
    api(`/api/llamadas/${id}/notas`, { method: 'PUT', body: data }),
  getLlamadaAudio: (id: string) => api(`/api/llamadas/${id}/audio`),
  deleteLlamada: (id: string) => api(`/api/llamadas/${id}`, { method: 'DELETE' }),
  getLlamadasStats: (softwareId?: string) =>
    api(`/api/llamadas/stats${softwareId ? `?softwareId=${softwareId}` : ''}`),

  // Email accounts
  getEmailAccounts: (softwareId?: string) =>
    api(`/api/email/accounts${softwareId ? `?softwareId=${softwareId}` : ''}`),
  createEmailAccount: (data: { softwareId: string; proveedor?: string; nombre: string; apiKey: string; cuotaMax?: number | null }) =>
    api('/api/email/accounts', { method: 'POST', body: data }),
  updateEmailAccount: (id: string, data: any) =>
    api(`/api/email/accounts/${id}`, { method: 'PUT', body: data }),
  deleteEmailAccount: (id: string) =>
    api(`/api/email/accounts/${id}`, { method: 'DELETE' }),

  // Email
  getEmailSenders: (softwareId?: string) =>
    api(`/api/email/senders${softwareId ? `?softwareId=${softwareId}` : ''}`),
  createEmailSender: (data: { softwareId: string; email: string; nombre: string; esDefault?: boolean; accountId?: string | null }) =>
    api('/api/email/senders', { method: 'POST', body: data }),
  updateEmailSender: (id: string, data: any) =>
    api(`/api/email/senders/${id}`, { method: 'PUT', body: data }),
  deleteEmailSender: (id: string) =>
    api(`/api/email/senders/${id}`, { method: 'DELETE' }),
  getEmailPlantillas: (softwareId?: string, tipo?: string) => {
    const qs = new URLSearchParams();
    if (softwareId) qs.set('softwareId', softwareId);
    if (tipo) qs.set('tipo', tipo);
    const qstr = qs.toString();
    return api(`/api/email/plantillas${qstr ? `?${qstr}` : ''}`);
  },
  getEmailPlantilla: (id: string) => api(`/api/email/plantillas/${id}`),
  createEmailPlantilla: (data: any) =>
    api('/api/email/plantillas', { method: 'POST', body: data }),
  updateEmailPlantilla: (id: string, data: any) =>
    api(`/api/email/plantillas/${id}`, { method: 'PUT', body: data }),
  deleteEmailPlantilla: (id: string) =>
    api(`/api/email/plantillas/${id}`, { method: 'DELETE' }),
  sendEmail: (data: {
    senderId: string;
    destinatario: string;
    asunto?: string;
    cuerpoHtml?: string;
    leadId?: string;
    plantillaId?: string;
    softwareId: string;
  }) => api('/api/email/send', { method: 'POST', body: data }),
  getEmailEnvios: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return api(`/api/email/envios${qs ? `?${qs}` : ''}`);
  },

  // Email Campañas
  getEmailCampanas: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return api(`/api/email/campanas${qs ? `?${qs}` : ''}`);
  },
  getEmailCampana: (id: string) => api(`/api/email/campanas/${id}`),
  previewAudiencia: (data: { softwareId: string; estado?: string; prioridad?: string; origen?: string }) =>
    api('/api/email/campanas/preview', { method: 'POST', body: data }),
  createEmailCampana: (data: {
    softwareId: string;
    nombre: string;
    senderId: string;
    plantillaId: string;
    audiencia: { softwareId: string; estado?: string; prioridad?: string; origen?: string };
    programadaPara?: string | null;
    variantes?: Array<{ letra: string; asunto: string; cuerpoHtml: string; porcentaje: number }>;
  }) => api('/api/email/campanas', { method: 'POST', body: data }),
  promoverGanadora: (campanaId: string, varianteId: string) =>
    api(`/api/email/campanas/${campanaId}/promover/${varianteId}`, { method: 'POST' }),
  lanzarEmailCampana: (id: string) =>
    api(`/api/email/campanas/${id}/enviar`, { method: 'POST' }),
  cancelarEmailCampana: (id: string) =>
    api(`/api/email/campanas/${id}/cancelar`, { method: 'POST' }),
  getEmailCampanaEnvios: (id: string, params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return api(`/api/email/campanas/${id}/envios${qs ? `?${qs}` : ''}`);
  },
  getEmailCampanaEventos: (id: string, params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return api(`/api/email/campanas/${id}/eventos${qs ? `?${qs}` : ''}`);
  },

  // Bajas (admin)
  getEmailBajas: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return api(`/api/email/bajas${qs ? `?${qs}` : ''}`);
  },
  deleteEmailBaja: (id: string) =>
    api(`/api/email/bajas/${id}`, { method: 'DELETE' }),

  // Unsubscribe público (no requiere auth)
  verifyBajaToken: (token: string) => api(`/api/email/baja?token=${encodeURIComponent(token)}`),
  submitBaja: (token: string, motivo?: string) =>
    api('/api/email/baja', { method: 'POST', body: { token, motivo } }),

  // Propuestas
  getPropuestas: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return api(`/api/propuestas${qs ? `?${qs}` : ''}`);
  },
  getPropuesta: (id: string) => api(`/api/propuestas/${id}`),
  createPropuesta: (data: any) => api('/api/propuestas', { method: 'POST', body: data }),
  updatePropuesta: (id: string, data: any) => api(`/api/propuestas/${id}`, { method: 'PUT', body: data }),
  deletePropuesta: (id: string) => api(`/api/propuestas/${id}`, { method: 'DELETE' }),
  enviarPropuesta: (id: string) => api(`/api/propuestas/${id}/enviar`, { method: 'POST' }),
  duplicarPropuesta: (id: string) => api(`/api/propuestas/${id}/duplicar`, { method: 'POST' }),
  getPropuestaPublica: (token: string) => api(`/api/propuestas/publica/${token}`),
  aceptarPropuesta: (token: string) => api(`/api/propuestas/publica/${token}/aceptar`, { method: 'POST' }),
  rechazarPropuesta: (token: string, notas?: string) => api(`/api/propuestas/publica/${token}/rechazar`, { method: 'POST', body: { notas } }),

  // Landings
  getLandings: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return api(`/api/landings${qs ? `?${qs}` : ''}`);
  },
  getLandingStats: (softwareId?: string) =>
    api(`/api/landings/stats${softwareId ? `?softwareId=${encodeURIComponent(softwareId)}` : ''}`),
  getLanding: (id: string) => api(`/api/landings/${id}`),
  createLanding: (data: {
    softwareId: string;
    nombre: string;
    slug: string;
    url: string;
    descripcion?: string;
    estado?: string;
    visitas?: number;
    conversiones?: number;
    leadsGenerados?: number;
  }) => api('/api/landings', { method: 'POST', body: data }),
  updateLanding: (id: string, data: Record<string, any>) =>
    api(`/api/landings/${id}`, { method: 'PUT', body: data }),
  deleteLanding: (id: string) => api(`/api/landings/${id}`, { method: 'DELETE' }),

  // Free Values
  getFreeValues: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return api(`/api/free-values${qs ? `?${qs}` : ''}`);
  },
  getFreeValueStats: (softwareId?: string) =>
    api(`/api/free-values/stats${softwareId ? `?softwareId=${encodeURIComponent(softwareId)}` : ''}`),
  getFreeValue: (id: string) => api(`/api/free-values/${id}`),
  createFreeValue: (data: {
    softwareId: string;
    nombre: string;
    slug: string;
    url: string;
    tipo: string;
    descripcion?: string;
    estado?: string;
    usos?: number;
    leadsGenerados?: number;
  }) => api('/api/free-values', { method: 'POST', body: data }),
  updateFreeValue: (id: string, data: Record<string, any>) =>
    api(`/api/free-values/${id}`, { method: 'PUT', body: data }),
  deleteFreeValue: (id: string) => api(`/api/free-values/${id}`, { method: 'DELETE' }),

  // Softwares (configuracion y marketing)
  getSoftwares: () => api('/api/softwares'),
  getSoftware: (slug: string) => api(`/api/softwares/${slug}`),
  createSoftware: (data: Record<string, any>) => api('/api/softwares', { method: 'POST', body: data }),
  updateSoftware: (id: string, data: Record<string, any>) => api(`/api/softwares/${id}`, { method: 'PUT', body: data }),
  deleteSoftware: (id: string) => api(`/api/softwares/${id}`, { method: 'DELETE' }),
};
