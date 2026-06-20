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
  iniciarLlamadaAI: (data: { leadId: string; spechId?: string }) =>
    api('/api/llamadas/iniciar-ai', { method: 'POST', body: data }),
  iniciarSimulacionAI: (data: { softwareId: string; leadId: string; spechId?: string }) =>
    api('/api/llamadas/simular-ai/start', { method: 'POST', body: data }),
  enviarMensajeSimulacionAI: (sid: string, text: string) =>
    api(`/api/llamadas/simular-ai/${sid}/mensaje`, { method: 'POST', body: { text } }),
  actualizarNotasLlamada: (id: string, data: any) =>
    api(`/api/llamadas/${id}/notas`, { method: 'PUT', body: data }),
  getLlamadaAudio: (id: string) => api(`/api/llamadas/${id}/audio`),
  deleteLlamada: (id: string) => api(`/api/llamadas/${id}`, { method: 'DELETE' }),
  getLlamadasStats: (softwareId?: string) =>
    api(`/api/llamadas/stats${softwareId ? `?softwareId=${softwareId}` : ''}`),
  getLlamadasAIMetrics: (softwareId?: string, dias?: number) =>
    api(`/api/llamadas/ai-metrics${softwareId ? `?softwareId=${softwareId}${dias ? `&dias=${dias}` : ''}` : ''}`),

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

  // ===== GROWTH ENGINE =====

  // Configuración
  getGrowthConfig: (softwareId: string) => api(`/api/growth/config/${softwareId}`),
  updateGrowthConfig: (softwareId: string, data: Record<string, any>) =>
    api(`/api/growth/config/${softwareId}`, { method: 'PUT', body: data }),

  // Contenido
  getGrowthContent: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return api(`/api/growth/content${qs ? `?${qs}` : ''}`);
  },
  createGrowthContent: (data: Record<string, any>) =>
    api('/api/growth/content', { method: 'POST', body: data }),
  updateGrowthContent: (id: string, data: Record<string, any>) =>
    api(`/api/growth/content/${id}`, { method: 'PUT', body: data }),
  generateGrowthContent: (softwareId: string, data: Record<string, any>) =>
    api(`/api/growth/content/${softwareId}/generate`, { method: 'POST', body: data }),
  scheduleGrowthContent: (id: string, scheduledAt: string) =>
    api(`/api/growth/content/${id}/schedule`, { method: 'POST', body: { scheduledAt } }),
  publishGrowthContent: (id: string) =>
    api(`/api/growth/content/${id}/publish`, { method: 'POST' }),
  regenerateGrowthContent: (id: string) =>
    api(`/api/growth/content/${id}/regenerate`, { method: 'POST' }),
  deleteGrowthContent: (id: string) =>
    api(`/api/growth/content/${id}`, { method: 'DELETE' }),

  // Calendario editorial
  getGrowthCalendar: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return api(`/api/growth/calendar${qs ? `?${qs}` : ''}`);
  },

  // Métricas
  getGrowthMetrics: (params: Record<string, string>) => {
    const qs = new URLSearchParams(params).toString();
    return api(`/api/growth/metrics${qs ? `?${qs}` : ''}`);
  },
  calculateGrowthMetrics: (softwareId?: string) =>
    api('/api/growth/metrics/calculate', { method: 'POST', body: softwareId ? { softwareId } : {} }),

  // Referidos
  getGrowthReferrals: (softwareId: string) =>
    api(`/api/growth/referrals?softwareId=${softwareId}`),
  createReferralLink: (data: { clienteId: number; softwareId: string }) =>
    api('/api/growth/referrals', { method: 'POST', body: data }),
  getClientReferrals: (clienteId: number, softwareId?: string) =>
    api(`/api/growth/referrals/client/${clienteId}${softwareId ? `?softwareId=${softwareId}` : ''}`),
  getReferralLeaderboard: (softwareId?: string) =>
    api(`/api/growth/referrals/leaderboard${softwareId ? `?softwareId=${softwareId}` : ''}`),
  processReferralReward: (id: string) =>
    api(`/api/growth/referrals/${id}/process-reward`, { method: 'POST' }),
  getReferralWidgetData: (code: string) =>
    api(`/api/growth/referrals/widget/${code}`),
  getPublicReferralData: (code: string) =>
    api(`/api/growth/referral/${code}/public`),

  // Marketplaces
  getMarketplaceOpportunities: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return api(`/api/growth/marketplaces${qs ? `?${qs}` : ''}`);
  },
  getMarketplaceMetrics: (softwareId: string) =>
    api(`/api/growth/marketplaces/metrics?softwareId=${softwareId}`),
  monitorMarketplaces: (softwareId?: string) =>
    api('/api/growth/marketplaces/monitor', { method: 'POST', body: softwareId ? { softwareId } : {} }),
  convertMarketplaceOpportunity: (id: string, data: Record<string, any>) =>
    api(`/api/growth/marketplaces/${id}/convert`, { method: 'POST', body: data }),

  // Activación
  getGrowthActivation: (softwareId: string) =>
    api(`/api/growth/activation/${softwareId}`),
  updateGrowthActivation: (softwareId: string, data: Record<string, any>) =>
    api(`/api/growth/activation/${softwareId}`, { method: 'PUT', body: data }),
  activateLead: (leadId: string) =>
    api(`/api/growth/activate/${leadId}`, { method: 'POST' }),

  // Inbound lead (público)
  createInboundLead: (data: Record<string, any>) =>
    api('/api/growth/inbound-lead', { method: 'POST', body: data }),

  // Activation — preview, logs, stats
  previewActivation: (leadId: string) =>
    api(`/api/growth/activation/preview/${leadId}`, { method: 'POST' }),
  getActivationLogs: (softwareId: string, params?: Record<string, string>) => {
    const qs = new URLSearchParams(params).toString();
    return api(`/api/growth/activation/logs/${softwareId}${qs ? `?${qs}` : ''}`);
  },
  getActivationStats: (softwareId: string, days?: number) =>
    api(`/api/growth/activation/stats/${softwareId}${days ? `?days=${days}` : ''}`),
  getRecentActivatedLeads: (softwareId: string, limit?: number) =>
    api(`/api/growth/activation/recent/${softwareId}${limit ? `?limit=${limit}` : ''}`),
  processPendingActivations: () =>
    api('/api/growth/activation/process-pending', { method: 'POST' }),

  // Resurrección masiva (Cementerio → campaña de 1 click)
  previewResurrection: (softwareId: string, opts: Record<string, any> = {}) =>
    api('/api/growth/resurrection/preview', { method: 'POST', body: { softwareId, ...opts } }),
  launchResurrection: (softwareId: string, opts: Record<string, any> = {}) =>
    api('/api/growth/resurrection/launch', { method: 'POST', body: { softwareId, ...opts } }),
  getResurrectionStats: (softwareId: string) =>
    api(`/api/growth/resurrection/stats/${softwareId}`),

  // Radar (cazador de leads automático por ICP)
  getRadar: (softwareId: string) =>
    api(`/api/growth/radar/${softwareId}`),
  updateRadar: (softwareId: string, data: Record<string, any>) =>
    api(`/api/growth/radar/${softwareId}`, { method: 'PUT', body: data }),
  runRadar: (softwareId: string, dryRun = false) =>
    api(`/api/growth/radar/${softwareId}/run`, { method: 'POST', body: { dryRun } }),
  getRadarRuns: (softwareId: string, limit = 20) =>
    api(`/api/growth/radar/${softwareId}/runs?limit=${limit}`),

  // Auditoría gratis (lead magnet)
  runAudit: (data: { softwareSlug?: string; softwareId?: string; negocio: string; url?: string; nombre?: string; email?: string; telefono?: string; ciudad?: string }) =>
    api('/api/growth/audit', { method: 'POST', body: data }),
  getAudit: (id: string) => api(`/api/growth/audit/${id}`),
  getAudits: (softwareId: string, limit = 50) =>
    api(`/api/growth/audits/${softwareId}?limit=${limit}`),

  // Portal del cliente ("Sala de cristal")
  enableBrandPortal: (brandId: string, regenerate = false) =>
    api(`/api/growth/brands/${brandId}/portal`, { method: 'POST', body: { regenerate } }),
  disableBrandPortal: (brandId: string) =>
    api(`/api/growth/brands/${brandId}/portal`, { method: 'DELETE' }),
  getPortal: (token: string) => api(`/api/growth/portal/${token}`),
  reviewPortalPost: (token: string, postId: string, decision: 'approve' | 'reject', comentario?: string) =>
    api(`/api/growth/portal/${token}/posts/${postId}/review`, { method: 'POST', body: { decision, comentario } }),

  // Casos de éxito automáticos
  getCaseStudies: (softwareId: string) =>
    api(`/api/growth/case-studies/${softwareId}`),
  generateCaseStudy: (data: { leadId?: string; softwareId?: string; umbral?: number }) =>
    api('/api/growth/case-studies/generate', { method: 'POST', body: data }),
  autoGenerateCaseStudies: () =>
    api('/api/growth/case-studies/auto-generate', { method: 'POST', body: {} }),

  // Batch
  generateGrowthBatch: (softwareId: string, options: Record<string, any>) =>
    api('/api/growth/generate-batch', { method: 'POST', body: { softwareId, options } }),

  // Multi-plataforma
  generateMultiPlatformPosts: (data: { softwareId: string; platforms: string[]; countPerPlatform?: number; topic?: string; tone?: string; includeHashtags?: boolean; includeCta?: boolean; length?: string }) =>
    api('/api/growth/generate-multi', { method: 'POST', body: data }),

  // Hashtags
  generateHashtags: (data: { topic: string; nicho?: string; count?: number }) =>
    api('/api/growth/hashtags', { method: 'POST', body: data }),

  // Repurpose
  repurposePost: (id: string, targetPlatform: string) =>
    api(`/api/growth/content/${id}/repurpose`, { method: 'POST', body: { targetPlatform } }),

  // SEO Engine
  generateSeoBatch: (softwareId: string, options: Record<string, any>) =>
    api('/api/growth/seo/batch', { method: 'POST', body: { softwareId, options } }),
  generateLandingPage: (softwareId: string, baseKeyword: string, city: string) =>
    api('/api/growth/seo/landing', { method: 'POST', body: { softwareId, baseKeyword, city } }),
  getKeywordSuggestions: (softwareId: string, seedKeyword?: string) =>
    api('/api/growth/seo/keywords', { method: 'POST', body: { softwareId, seedKeyword } }),
  generateMetaTags: (content: string, keyword: string) =>
    api('/api/growth/seo/meta-tags', { method: 'POST', body: { content, keyword } }),
  generateSchemaMarkup: (content: string, type: string) =>
    api('/api/growth/seo/schema', { method: 'POST', body: { content, type } }),

  // Blog público
  getPublicBlogPosts: (params?: Record<string, string>) => {
    const qs = new URLSearchParams(params).toString();
    return api(`/api/growth/blog${qs ? `?${qs}` : ''}`);
  },
  getPublicBlogPost: (slug: string) =>
    api(`/api/growth/blog/${slug}`),

  // Video Engine
  getVideoTemplates: () => api('/api/growth/video/templates'),
  generateVideoKit: (data: { softwareId: string; topic: string; template?: string; tone?: string; voiceId?: string; generateAudio?: boolean }) =>
    api('/api/growth/video/generate', { method: 'POST', body: data }),
  generateVideoVoice: (id: string, voiceId?: string) =>
    api(`/api/growth/video/${id}/voice`, { method: 'POST', body: { voiceId } }),

  // Publicación programada
  publishScheduledGrowth: () =>
    api('/api/growth/publish-scheduled', { method: 'POST' }),

  // ===== SOCIAL ACCOUNTS =====
  getSocialAccounts: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return api(`/api/growth/social-accounts${qs ? `?${qs}` : ''}`);
  },
  getSocialAccount: (id: string) => api(`/api/growth/social-accounts/${id}`),
  createSocialAccount: (data: any) =>
    api('/api/growth/social-accounts', { method: 'POST', body: data }),
  createSocialAccountsBatch: (data: {
    softwareId: string;
    platforms: string[];
    nombre: string;
    username: string;
    tematica?: string;
    tono?: string;
    formato?: string;
    longitud?: string;
    idioma?: string;
    hashtagsDefault?: string[];
    notas?: string;
  }) => api('/api/growth/social-accounts/batch', { method: 'POST', body: data }),
  updateSocialAccount: (id: string, data: any) =>
    api(`/api/growth/social-accounts/${id}`, { method: 'PUT', body: data }),
  deleteSocialAccount: (id: string) =>
    api(`/api/growth/social-accounts/${id}`, { method: 'DELETE' }),

  getSocialAccountPosts: (id: string, params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return api(`/api/growth/social-accounts/${id}/posts${qs ? `?${qs}` : ''}`);
  },
  createSocialAccountPost: (id: string, data: any) =>
    api(`/api/growth/social-accounts/${id}/posts`, { method: 'POST', body: data }),
  updateSocialAccountPost: (postId: string, data: any) =>
    api(`/api/growth/social-accounts/posts/${postId}`, { method: 'PUT', body: data }),
  deleteSocialAccountPost: (postId: string) =>
    api(`/api/growth/social-accounts/posts/${postId}`, { method: 'DELETE' }),

  generateSocialBatch: (data: { accountIds: string[]; topic?: string; tone?: string; includeHashtags?: boolean; includeCta?: boolean }) =>
    api('/api/growth/social-accounts/generate-batch', { method: 'POST', body: data }),

  // ===== BRANDS =====
  getBrands: (softwareId?: string) =>
    api(`/api/growth/brands${softwareId ? `?softwareId=${softwareId}` : ''}`),
  getBrand: (id: string) => api(`/api/growth/brands/${id}`),
  createBrand: (data: Record<string, any>) =>
    api('/api/growth/brands', { method: 'POST', body: data }),
  updateBrand: (id: string, data: Record<string, any>) =>
    api(`/api/growth/brands/${id}`, { method: 'PUT', body: data }),
  deleteBrand: (id: string) =>
    api(`/api/growth/brands/${id}`, { method: 'DELETE' }),

  // ===== CAMPAIGNS =====
  getCampaigns: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return api(`/api/growth/campaigns${qs ? `?${qs}` : ''}`);
  },
  getCampaign: (id: string) => api(`/api/growth/campaigns/${id}`),
  createCampaign: (data: Record<string, any>) =>
    api('/api/growth/campaigns', { method: 'POST', body: data }),
  updateCampaign: (id: string, data: Record<string, any>) =>
    api(`/api/growth/campaigns/${id}`, { method: 'PUT', body: data }),
  deleteCampaign: (id: string) =>
    api(`/api/growth/campaigns/${id}`, { method: 'DELETE' }),

  // ===== CONTENT THEMES =====
  getContentThemes: (accountId?: string) =>
    api(`/api/growth/content-themes${accountId ? `?accountId=${accountId}` : ''}`),
  createContentTheme: (data: Record<string, any>) =>
    api('/api/growth/content-themes', { method: 'POST', body: data }),
  updateContentTheme: (id: string, data: Record<string, any>) =>
    api(`/api/growth/content-themes/${id}`, { method: 'PUT', body: data }),
  deleteContentTheme: (id: string) =>
    api(`/api/growth/content-themes/${id}`, { method: 'DELETE' }),

  // ===== CONTENT HUB — Media Assets =====
  getMediaAssets: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return api(`/api/growth/media-assets${qs ? `?${qs}` : ''}`);
  },
  createMediaAsset: (data: Record<string, any>) =>
    api('/api/growth/media-assets', { method: 'POST', body: data }),
  updateMediaAsset: (id: string, data: Record<string, any>) =>
    api(`/api/growth/media-assets/${id}`, { method: 'PUT', body: data }),
  useMediaAsset: (id: string) =>
    api(`/api/growth/media-assets/${id}/use`, { method: 'POST' }),
  deleteMediaAsset: (id: string) =>
    api(`/api/growth/media-assets/${id}`, { method: 'DELETE' }),

  // ===== CONTENT HUB — Copy Snippets =====
  getCopySnippets: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return api(`/api/growth/copy-snippets${qs ? `?${qs}` : ''}`);
  },
  createCopySnippet: (data: Record<string, any>) =>
    api('/api/growth/copy-snippets', { method: 'POST', body: data }),
  updateCopySnippet: (id: string, data: Record<string, any>) =>
    api(`/api/growth/copy-snippets/${id}`, { method: 'PUT', body: data }),
  useCopySnippet: (id: string) =>
    api(`/api/growth/copy-snippets/${id}/use`, { method: 'POST' }),
  deleteCopySnippet: (id: string) =>
    api(`/api/growth/copy-snippets/${id}`, { method: 'DELETE' }),

  // ===== WORKFLOW & COLABORACIÓN =====
  getGrowthTeam: () => api('/api/growth/team'),
  getPostApprovals: (postId: string) => api(`/api/growth/posts/${postId}/approvals`),
  createPostApproval: (postId: string, data: Record<string, any>) =>
    api(`/api/growth/posts/${postId}/approvals`, { method: 'POST', body: data }),
  getPostComments: (postId: string) => api(`/api/growth/posts/${postId}/comments`),
  createPostComment: (postId: string, data: Record<string, any>) =>
    api(`/api/growth/posts/${postId}/comments`, { method: 'POST', body: data }),
  resolvePostComment: (id: string, resuelto: boolean) =>
    api(`/api/growth/comments/${id}/resolve`, { method: 'PUT', body: { resuelto } }),
  deletePostComment: (id: string) =>
    api(`/api/growth/comments/${id}`, { method: 'DELETE' }),
  assignPost: (postId: string, assignedTo: number | null) =>
    api(`/api/growth/posts/${postId}/assign`, { method: 'PUT', body: { assignedTo } }),
  getReviewQueue: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return api(`/api/growth/review-queue${qs ? `?${qs}` : ''}`);
  },

  // ===== CALENDARIO UNIFICADO =====
  getUnifiedCalendar: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return api(`/api/growth/calendar/unified${qs ? `?${qs}` : ''}`);
  },
  rescheduleCalendarItem: (data: { type: string; id: string; date: string }) =>
    api('/api/growth/calendar/reschedule', { method: 'PUT', body: data }),
  getBestTimes: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return api(`/api/growth/calendar/best-times${qs ? `?${qs}` : ''}`);
  },

  // ===== ANALYTICS SOCIAL & REPORTING =====
  getSocialAnalytics: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return api(`/api/growth/analytics/social${qs ? `?${qs}` : ''}`);
  },
  snapshotSocialMetrics: (softwareId: string) =>
    api('/api/growth/analytics/social/snapshot', { method: 'POST', body: { softwareId } }),
  generateSocialReport: (data: Record<string, any>) =>
    api('/api/growth/analytics/social/report', { method: 'POST', body: data }),

  // ===== ADSENSE — Red multi-sitio de blogs monetizados =====
  // Sitios (cada uno = 1 dominio)
  getAdSites: () => api('/api/adsense/sites'),
  getAdSite: (id: string) => api(`/api/adsense/sites/${id}`),
  createAdSite: (data: Record<string, any>) =>
    api('/api/adsense/sites', { method: 'POST', body: data }),
  updateAdSite: (id: string, data: Record<string, any>) =>
    api(`/api/adsense/sites/${id}`, { method: 'PUT', body: data }),
  deleteAdSite: (id: string) =>
    api(`/api/adsense/sites/${id}`, { method: 'DELETE' }),
  // Nichos (de un sitio)
  getAdNiches: (siteId?: string) =>
    api(`/api/adsense/niches${siteId ? `?siteId=${siteId}` : ''}`),
  createAdNiche: (data: Record<string, any>) =>
    api('/api/adsense/niches', { method: 'POST', body: data }),
  deleteAdNiche: (id: string) =>
    api(`/api/adsense/niches/${id}`, { method: 'DELETE' }),
  // Artículos
  getAdArticles: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return api(`/api/adsense/articles${qs ? `?${qs}` : ''}`);
  },
  getAdArticle: (id: string) => api(`/api/adsense/articles/${id}`),
  generateAdArticle: (data: Record<string, any>) =>
    api('/api/adsense/articles/generate', { method: 'POST', body: data }),
  generateAdBatch: (siteId: string, count: number) =>
    api('/api/adsense/articles/generate-batch', { method: 'POST', body: { siteId, count } }),
  publishAdArticle: (id: string) =>
    api(`/api/adsense/articles/${id}/publish`, { method: 'POST' }),
  unpublishAdArticle: (id: string) =>
    api(`/api/adsense/articles/${id}/unpublish`, { method: 'POST' }),
  deleteAdArticle: (id: string) =>
    api(`/api/adsense/articles/${id}`, { method: 'DELETE' }),
  getAdStats: () => api('/api/adsense/stats'),

  // ===== CLOTHING — Marcas de ropa POD =====
  // Panel (auth)
  getClothingBrands: () => api('/api/clothing/brands'),
  getClothingBrand: (id: string) => api(`/api/clothing/brands/${id}`),
  generateClothingBrand: (nicho?: string) =>
    api('/api/clothing/brands/generate', { method: 'POST', body: { nicho } }),
  updateClothingBrand: (id: string, data: Record<string, any>) =>
    api(`/api/clothing/brands/${id}`, { method: 'PUT', body: data }),
  deleteClothingBrand: (id: string) =>
    api(`/api/clothing/brands/${id}`, { method: 'DELETE' }),
  getClothingDesigns: (brandId?: string) =>
    api(`/api/clothing/designs${brandId ? `?brandId=${brandId}` : ''}`),
  generateClothingDesigns: (brandId: string, count: number) =>
    api(`/api/clothing/brands/${brandId}/designs/generate`, { method: 'POST', body: { count } }),
  getClothingProducts: (brandId?: string) =>
    api(`/api/clothing/products${brandId ? `?brandId=${brandId}` : ''}`),
  createClothingProduct: (data: Record<string, any>) =>
    api('/api/clothing/products', { method: 'POST', body: data }),
  publishClothingProduct: (id: string) =>
    api(`/api/clothing/products/${id}/publish`, { method: 'POST' }),
  getClothingOrders: () => api('/api/clothing/orders'),
  getClothingStats: () => api('/api/clothing/stats'),
  // Público (tienda)
  getPublicClothingBrand: (slug: string) => api(`/api/clothing/public/brands/${slug}`),
  getPublicClothingProduct: (slug: string) => api(`/api/clothing/public/products/${slug}`),
  createClothingCheckout: (data: Record<string, any>) =>
    api('/api/clothing/public/checkout', { method: 'POST', body: data }),

  // ===== ASSET FACTORY =====
  getAssetProjects: () => api('/api/assets/projects'),
  getAssetProject: (id: string) => api(`/api/assets/projects/${id}`),
  createAssetProject: (data: { nombre: string; nicho: string; descripcion?: string; keywords?: string[]; aiPrompt?: string; aiModel?: string }) =>
    api('/api/assets/projects', { method: 'POST', body: data }),
  updateAssetProject: (id: string, data: Record<string, any>) =>
    api(`/api/assets/projects/${id}`, { method: 'PUT', body: data }),
  deleteAssetProject: (id: string) => api(`/api/assets/projects/${id}`, { method: 'DELETE' }),

  getAssetProducts: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return api(`/api/assets/products${qs ? `?${qs}` : ''}`);
  },
  getAssetProduct: (id: string) => api(`/api/assets/products/${id}`),
  createAssetProduct: (data: { projectId: string; nombre: string; tipo: string; descripcion?: string; config?: any; aiPrompt?: string; aiModel?: string }) =>
    api('/api/assets/products', { method: 'POST', body: data }),
  updateAssetProduct: (id: string, data: Record<string, any>) =>
    api(`/api/assets/products/${id}`, { method: 'PUT', body: data }),
  generateAssetProduct: (id: string) =>
    api(`/api/assets/products/${id}/generate`, { method: 'POST' }),
  deleteAssetProduct: (id: string) => api(`/api/assets/products/${id}`, { method: 'DELETE' }),
  bulkGenerateAssets: (projectId: string, types: string[]) =>
    api('/api/assets/bulk-generate', { method: 'POST', body: { projectId, types } }),

  getAssetListings: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return api(`/api/assets/listings${qs ? `?${qs}` : ''}`);
  },
  getAssetListing: (id: string) => api(`/api/assets/listings/${id}`),
  createAssetListing: (data: Record<string, any>) =>
    api('/api/assets/listings', { method: 'POST', body: data }),
  updateAssetListing: (id: string, data: Record<string, any>) =>
    api(`/api/assets/listings/${id}`, { method: 'PUT', body: data }),
  publishAssetListing: (id: string) =>
    api(`/api/assets/listings/${id}/publish`, { method: 'POST' }),
  deleteAssetListing: (id: string) => api(`/api/assets/listings/${id}`, { method: 'DELETE' }),

  // ===== ASSET CATALOG (Tienda) =====
  getAssetCatalog: (params?: Record<string, string>) => {
    const qs = new URLSearchParams(params).toString();
    return api(`/api/assets/catalog${qs ? `?${qs}` : ''}`);
  },
  getAssetCatalogItem: (id: string) => api(`/api/assets/catalog/${id}`),
  createAssetCatalogItem: (data: { projectId: string; title: string; description?: string; nicho?: string; assetType: string; config?: any; priceCents?: number; currency?: string }) =>
    api('/api/assets/catalog', { method: 'POST', body: data }),
  updateAssetCatalogItem: (id: string, data: Record<string, any>) =>
    api(`/api/assets/catalog/${id}`, { method: 'PUT', body: data }),
  deleteAssetCatalogItem: (id: string) => api(`/api/assets/catalog/${id}`, { method: 'DELETE' }),
  generatePreview: (id: string) =>
    api(`/api/assets/catalog/${id}/generate-preview`, { method: 'POST' }),
  publishCatalogToGumroad: (id: string) =>
    api(`/api/assets/catalog/${id}/publish-gumroad`, { method: 'POST' }),

  // ===== GUMROAD =====
  getGumroadUser: () => api('/api/assets/gumroad/user'),
  getGumroadProducts: () => api('/api/assets/gumroad/products'),
  getGumroadProduct: (id: string) => api(`/api/assets/gumroad/products/${id}`),
  createGumroadProduct: (data: Record<string, any>) =>
    api('/api/assets/gumroad/products', { method: 'POST', body: data }),
  updateGumroadProduct: (id: string, data: Record<string, any>) =>
    api(`/api/assets/gumroad/products/${id}`, { method: 'PUT', body: data }),
  deleteGumroadProduct: (id: string) =>
    api(`/api/assets/gumroad/products/${id}`, { method: 'DELETE' }),
  getGumroadSales: (params?: Record<string, string>) => {
    const qs = new URLSearchParams(params).toString();
    return api(`/api/assets/gumroad/sales${qs ? `?${qs}` : ''}`);
  },
  syncGumroad: (projectId?: string) =>
    api('/api/assets/gumroad/sync', { method: 'POST', body: { projectId } }),
};
