'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiClient } from '@/lib/api';
import { getSocket, joinWhatsappRoom, leaveWhatsappRoom } from '@/lib/socket';
import type { Lead, LeadEstado } from '@/types';
import { formatRelativeTime } from '@/lib/utils';
import { detectPhoneType, type PhoneType } from '@/lib/phone';
import {
  MessageCircle,
  Send,
  Plus,
  Edit3,
  Trash2,
  Search,
  Sparkles,
  Loader2,
  X,
  History,
  Users,
  Wand2,
  AlertTriangle,
  Check,
  Phone,
  FlaskConical,
  BarChart3,
  Play,
  Pause,
  Trophy,
  ChevronLeft,
  ChevronRight,
  Inbox,
  ArrowDownLeft,
  Bot,
  ClipboardPaste,
  Skull,
  Swords,
  Film,
  Drama,
  Headphones,
  Slash,
  Crown,
  Zap,
  Lightbulb,
  Calendar,
  PhoneCall,
  Smartphone,
  Power,
  QrCode,
  Wifi,
  WifiOff,
  RefreshCw,
  Rocket,
} from 'lucide-react';

/* ============================================================
   Tipos y constantes
============================================================ */

type Plantilla = {
  id: string;
  softwareId: string;
  nombre: string;
  contenido: string;
  categoria: string;
  variables: string[];
  activa: boolean;
  orden: number;
  createdAt: string;
  updatedAt: string;
};

type Envio = {
  id: string;
  leadId: string;
  plantillaId: string | null;
  telefono: string;
  mensaje: string;
  enviadoAt: string;
  lead?: { id: string; nombre: string; empresa: string | null; telefono: string | null };
  plantilla?: { id: string; nombre: string; categoria: string };
};

type ABTest = {
  id: string;
  softwareId: string;
  nombre: string;
  descripcion: string | null;
  categoria: string;
  estado: 'ACTIVO' | 'PAUSADO' | 'COMPLETADO';
  enviosTotal: number;
  createdAt: string;
  variantes: ABTestVariante[];
};

type ABTestVariante = {
  id: string;
  testId: string;
  plantillaId: string;
  peso: number;
  envios: number;
  respuestas: number;
  plantilla: Plantilla;
};

type Tab = 'enviar' | 'chat' | 'cementerio' | 'arena' | 'plantillas' | 'historial' | 'ab_tests' | 'chatbot';

type WhatsappMensaje = {
  id: string;
  conversacionId: string;
  direccion: 'IN' | 'OUT';
  cuerpo: string;
  iaGenerado: boolean;
  usuarioId: number | null;
  createdAt: string;
};

type ConversacionLista = {
  id: string;
  leadId: string;
  softwareId: string;
  ultimaActividad: string;
  noLeidos: number;
  lead: { id: string; nombre: string; empresa: string | null; telefono: string | null; estado: string };
  mensajes: WhatsappMensaje[]; // último mensaje (take: 1)
};

type ConversacionHilo = {
  id: string;
  leadId: string;
  softwareId: string;
  ultimaActividad: string;
  noLeidos: number;
  mensajes: WhatsappMensaje[];
};

const CATEGORIAS = [
  { id: 'general', label: 'General', color: 'slate' },
  { id: 'bienvenida', label: 'Bienvenida', color: 'emerald' },
  { id: 'follow_up', label: 'Follow-up', color: 'blue' },
  { id: 'recordatorio', label: 'Recordatorio', color: 'amber' },
  { id: 'agradecimiento', label: 'Agradecimiento', color: 'violet' },
  { id: 'oferta', label: 'Oferta', color: 'rose' },
  { id: 'reactivacion', label: 'Reactivación', color: 'cyan' },
] as const;

const VARIABLES_DISPONIBLES = [
  { v: 'primer_nombre', desc: 'Primer nombre (Juan)' },
  { v: 'nombre', desc: 'Nombre completo' },
  { v: 'empresa', desc: 'Empresa del lead' },
  { v: 'cargo', desc: 'Cargo o puesto' },
  { v: 'email', desc: 'Email del lead' },
  { v: 'pais', desc: 'País' },
  { v: 'estado', desc: 'Estado del lead' },
];

const ESTADOS_LEAD: LeadEstado[] = [
  'NUEVO', 'CONTACTADO', 'INTERESADO', 'EN_SEGUIMIENTO',
  'CALIFICADO', 'NO_RESPONDE', 'RECHAZADO', 'CONVERTIDO',
];

function categoriaInfo(id: string) {
  return CATEGORIAS.find((c) => c.id === id) || CATEGORIAS[0];
}

const CAT_COLORS: Record<string, string> = {
  slate: 'bg-slate-500/10 text-slate-600 dark:text-slate-300 ring-slate-500/20',
  emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-emerald-500/20',
  blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 ring-blue-500/20',
  amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-amber-500/20',
  violet: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 ring-violet-500/20',
  rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 ring-rose-500/20',
  cyan: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 ring-cyan-500/20',
};

function CategoryPill({ categoria }: { categoria: string }) {
  const info = categoriaInfo(categoria);
  return (
    <span
      className={`inline-flex items-center px-1.5 h-[18px] rounded-md text-[10px] font-semibold uppercase tracking-wider ring-1 ${CAT_COLORS[info.color]}`}
    >
      {info.label}
    </span>
  );
}

/* Reemplaza variables localmente (preview en tiempo real) */
function renderLocal(contenido: string, lead: Partial<Lead> | null): string {
  if (!lead) return contenido;
  const nombre = (lead.nombre || '').trim();
  const vars: Record<string, string | undefined | null> = {
    nombre: nombre || undefined,
    primer_nombre: nombre.split(/\s+/)[0] || undefined,
    email: lead.email || undefined,
    empresa: lead.empresa,
    cargo: lead.cargo,
    pais: lead.pais,
    estado: lead.estado,
    telefono: lead.telefono,
  };
  return contenido.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, k) => {
    const v = vars[k];
    return v ? String(v) : `{{${k}}}`;
  });
}

/* ============================================================
   Página principal
============================================================ */

export default function WhatsappPage() {
  const [tab, setTab] = useState<Tab>('enviar');
  const [softwares, setSoftwares] = useState<{ saas: string; descripcion?: string }[]>([]);
  const [softwareId, setSoftwareId] = useState<string>('');

  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
  const [plantillaSel, setPlantillaSel] = useState<string | null>(null);

  const [leads, setLeads] = useState<Lead[]>([]);
  const [search, setSearch] = useState('');
  const [estadoFilter, setEstadoFilter] = useState<LeadEstado | ''>('');
  const [onlyMobiles, setOnlyMobiles] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [pagination, setPagination] = useState<{ page: number; limit: number; total: number; pages: number } | null>(null);
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());

  const leadsConTipo = useMemo(
    () => leads.map((l) => ({ lead: l, phoneType: detectPhoneType(l.telefono) as PhoneType })),
    [leads],
  );
  const leadsVisibles = useMemo(
    () => (onlyMobiles ? leadsConTipo.filter((x) => x.phoneType !== 'fixed') : leadsConTipo),
    [leadsConTipo, onlyMobiles],
  );

  const [envios, setEnvios] = useState<Envio[]>([]);

  const [abTests, setAbTests] = useState<ABTest[]>([]);
  const [abTestMetrics, setAbTestMetrics] = useState<Record<string, any>>({});
  const [abEditorOpen, setAbEditorOpen] = useState(false);
  const [abMetricsOpen, setAbMetricsOpen] = useState<string | null>(null);

  // Chat (modo manual / híbrido)
  const [conversaciones, setConversaciones] = useState<ConversacionLista[]>([]);
  const [chatLeadId, setChatLeadId] = useState<string | null>(null);
  const [chatHilo, setChatHilo] = useState<ConversacionHilo | null>(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [composerText, setComposerText] = useState('');
  const [askingMinimax, setAskingMinimax] = useState(false);
  const [pegandoIn, setPegandoIn] = useState(false);
  const [inboundText, setInboundText] = useState('');
  const [chatSearch, setChatSearch] = useState('');
  const [iniciarChatOpen, setIniciarChatOpen] = useState(false);

  // Modales secundarios desde el Chat
  const [sparringLeadId, setSparringLeadId] = useState<string | null>(null);
  const [storyboardLeadId, setStoryboardLeadId] = useState<string | null>(null);

  // Cementerio
  const [cementerioLeads, setCementerioLeads] = useState<any[]>([]);
  const [cementerioDias, setCementerioDias] = useState(30);
  const [cementerioLoading, setCementerioLoading] = useState(false);
  const [resurrecciones, setResurrecciones] = useState<Record<string, string>>({});

  // Hiperpersonalización (modal lanzado desde Enviar)
  const [masaOpen, setMasaOpen] = useState(false);

  const [loadingLeads, setLoadingLeads] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Plantilla | null>(null);
  const [toast, setToast] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null);

  // WhatsApp Web.js automatización (uno por software)
  const [wwebEstados, setWwebEstados] = useState<Record<string, any>>({});
  const [wwebLoading, setWwebLoading] = useState(false);
  const [wwebQrOpen, setWwebQrOpen] = useState(false);
  const wwebEstado = softwareId ? wwebEstados[softwareId] : null;

  // Chatbot
  const [chatbotReglas, setChatbotReglas] = useState<any[]>([]);
  const [chatbotEditorOpen, setChatbotEditorOpen] = useState(false);
  const [chatbotEditing, setChatbotEditing] = useState<any | null>(null);

  // Programación de envíos
  const [programarOpen, setProgramarOpen] = useState(false);
  const [programarLead, setProgramarLead] = useState<Lead | null>(null);
  const [programarFecha, setProgramarFecha] = useState('');
  const [programarHora, setProgramarHora] = useState('');

  /* Init: cargar softwares */
  useEffect(() => {
    apiClient
      .getSaasList()
      .then((res: any) => {
        const list = res.data || [];
        setSoftwares(list);
        if (list[0]?.saas) setSoftwareId(list[0].saas);
      })
      .catch(() => setSoftwares([]));
  }, []);

  /* Cargar plantillas / envíos / ab-tests / conversaciones cuando cambia softwareId */
  useEffect(() => {
    if (!softwareId) return;
    void loadPlantillas();
    void loadEnvios();
    void loadABTests();
    void loadConversaciones();
    void loadChatbotReglas();
  }, [softwareId]);

  /* Auto-recarga lista de conversaciones cada 30s mientras el tab Chat esté abierto */
  useEffect(() => {
    if (tab !== 'chat' || !softwareId) return;
    const id = setInterval(() => void loadConversaciones(), 30_000);
    return () => clearInterval(id);
  }, [tab, softwareId]);

  /* Cuando se selecciona un lead en el chat, cargar su hilo y marcar como leído */
  useEffect(() => {
    if (!chatLeadId) {
      setChatHilo(null);
      return;
    }
    void loadHilo(chatLeadId);
  }, [chatLeadId]);

  /* Cargar cementerio cuando se entra al tab o cambian los días */
  useEffect(() => {
    if (tab !== 'cementerio' || !softwareId) return;
    void loadCementerio();
  }, [tab, softwareId, cementerioDias]);

  /* Socket.io: unirse a room de WhatsApp y escuchar eventos en tiempo real */
  useEffect(() => {
    if (!softwareId) return;
    const socket = getSocket();
    joinWhatsappRoom(softwareId);

    const handleQr = (data: any) => {
      setWwebEstados((prev) => ({ ...prev, [data.softwareId]: { ...prev[data.softwareId], estado: 'qr', qrCode: data.qrCode } }));
      setWwebQrOpen(true);
    };
    const handleReady = (data: any) => {
      setWwebEstados((prev) => ({
        ...prev,
        [data.softwareId]: { ...prev[data.softwareId], estado: 'listo', qrCode: null, info: data.info },
      }));
      showToast('ok', 'WhatsApp Web conectado');
    };
    const handleDisconnected = (data: any) => {
      setWwebEstados((prev) => ({
        ...prev,
        [data.softwareId]: { ...prev[data.softwareId], estado: 'desconectado', qrCode: null },
      }));
      showToast('err', `WhatsApp Web desconectado: ${data.reason}`);
    };
    const handleMensajeEntrante = (data: any) => {
      showToast('ok', `${data.leadNombre || data.numero}: mensaje recibido`);
      void loadConversaciones();
      if (chatLeadId === data.leadId) {
        void loadHilo(data.leadId);
      }
    };
    const handleMensajeEnviado = (data: any) => {
      void loadEnvios();
      if (chatLeadId) {
        void loadHilo(chatLeadId);
      }
    };
    const handleError = (data: any) => {
      showToast('err', data.error || 'Error de WhatsApp Web');
    };
    const handleReconectando = (data: any) => {
      showToast('ok', `Reconectando en ${data.delayMs / 1000}s (intento ${data.intento})`);
    };

    socket.on('wweb:qr', handleQr);
    socket.on('wweb:ready', handleReady);
    socket.on('wweb:disconnected', handleDisconnected);
    socket.on('wweb:mensaje_entrante', handleMensajeEntrante);
    socket.on('wweb:mensaje_enviado', handleMensajeEnviado);
    socket.on('wweb:error', handleError);
    socket.on('wweb:reconectando', handleReconectando);

    return () => {
      leaveWhatsappRoom(softwareId);
      socket.off('wweb:qr', handleQr);
      socket.off('wweb:ready', handleReady);
      socket.off('wweb:disconnected', handleDisconnected);
      socket.off('wweb:mensaje_entrante', handleMensajeEntrante);
      socket.off('wweb:mensaje_enviado', handleMensajeEnviado);
      socket.off('wweb:error', handleError);
      socket.off('wweb:reconectando', handleReconectando);
    };
  }, [softwareId, chatLeadId]);

  /* Consultar estado inicial de WhatsApp Web.js al cargar/cambiar software */
  useEffect(() => {
    if (!softwareId) return;
    void loadWwebEstado();
  }, [softwareId]);

  /* Reset a página 1 cuando cambian filtros (no cuando solo cambia la página) */
  useEffect(() => {
    setPage(1);
  }, [softwareId, search, estadoFilter, onlyMobiles, pageSize]);

  /* Cargar leads cuando cambian filtros o página */
  useEffect(() => {
    if (!softwareId) return;
    const t = setTimeout(() => void loadLeads(), 250);
    return () => clearTimeout(t);
  }, [softwareId, search, estadoFilter, onlyMobiles, page, pageSize]);

  const loadPlantillas = async () => {
    try {
      const res: any = await apiClient.getWhatsappPlantillas(softwareId);
      const data: Plantilla[] = res.data || [];
      setPlantillas(data);
      setPlantillaSel((curr) => (curr && data.find((p) => p.id === curr) ? curr : data[0]?.id ?? null));
    } catch (e: any) {
      setToast({ kind: 'err', msg: e.message });
    }
  };

  const loadLeads = async () => {
    setLoadingLeads(true);
    try {
      const params: Record<string, string> = {
        softwareId,
        hasTelefono: 'true',
        page: String(page),
        limit: String(pageSize),
      };
      if (estadoFilter) params.estado = estadoFilter;
      if (search) params.search = search;
      if (onlyMobiles) params.tipoTelefono = 'movil';
      const res: any = await apiClient.getLeads(params);
      setLeads(res.data?.leads || []);
      setPagination(res.data?.pagination || null);
    } catch (e: any) {
      setToast({ kind: 'err', msg: e.message });
    } finally {
      setLoadingLeads(false);
    }
  };

  const loadEnvios = async () => {
    try {
      const res: any = await apiClient.getWhatsappEnvios({ softwareId, limit: '100' });
      setEnvios(res.data || []);
    } catch {
      /* silent */
    }
  };

  const loadABTests = async () => {
    try {
      const res: any = await apiClient.getWhatsappABTests(softwareId);
      setAbTests(res.data || []);
    } catch {
      setAbTests([]);
    }
  };

  const loadABMetrics = async (testId: string) => {
    try {
      const res: any = await apiClient.getWhatsappABTestMetrics(testId);
      setAbTestMetrics((prev) => ({ ...prev, [testId]: res.data }));
    } catch {
      /* silent */
    }
  };

  const loadConversaciones = async () => {
    if (!softwareId) return;
    try {
      const res: any = await apiClient.getWhatsappConversaciones(softwareId);
      setConversaciones(res.data || []);
    } catch {
      setConversaciones([]);
    }
  };

  const loadChatbotReglas = async () => {
    if (!softwareId) return;
    try {
      const res: any = await apiClient.getWhatsappChatbotReglas(softwareId);
      setChatbotReglas(res.data || []);
    } catch {
      setChatbotReglas([]);
    }
  };

  const loadHilo = async (leadId: string) => {
    setChatLoading(true);
    try {
      const res: any = await apiClient.getWhatsappConversacion(leadId);
      setChatHilo(res.data);
      // Marcar como leída en background
      void apiClient.marcarWhatsappLeida(leadId).then(() => void loadConversaciones());
    } catch (e: any) {
      showToast('err', e.message || 'No se pudo cargar el hilo');
      setChatHilo(null);
    } finally {
      setChatLoading(false);
    }
  };

  const handleSendChat = async () => {
    if (!chatLeadId || !composerText.trim()) return;
    const lead = chatHilo
      ? conversaciones.find((c) => c.leadId === chatLeadId)?.lead
      : null;
    const telefono = lead?.telefono;
    if (telefono && detectPhoneType(telefono) === 'fixed') {
      showToast('err', 'Este lead tiene un número fijo, no puede recibir WhatsApp');
      return;
    }
    try {
      // Usa enviarWhatsapp (con contenidoFinal libre) — registra envío + historial + hilo
      const res: any = await apiClient.enviarWhatsapp({
        leadId: chatLeadId,
        contenidoFinal: composerText.trim(),
      });
      window.open(res.data.url, '_blank', 'noopener,noreferrer');
      setComposerText('');
      await loadHilo(chatLeadId);
      void loadConversaciones();
      void loadEnvios();
    } catch (e: any) {
      showToast('err', e.message || 'Error enviando mensaje');
    }
  };

  const handleAddInbound = async () => {
    if (!chatLeadId || !inboundText.trim()) return;
    try {
      await apiClient.addWhatsappMensaje(chatLeadId, {
        direccion: 'IN',
        cuerpo: inboundText.trim(),
      });
      setInboundText('');
      setPegandoIn(false);
      await loadHilo(chatLeadId);
      void loadConversaciones();
    } catch (e: any) {
      showToast('err', e.message || 'Error guardando respuesta del lead');
    }
  };

  const handleAskMinimax = async () => {
    if (!chatLeadId) return;
    setAskingMinimax(true);
    try {
      const res: any = await apiClient.sugerirWhatsappRespuesta(
        chatLeadId,
        composerText.trim() || undefined, // si hay algo escrito, lo pasa como instrucción
      );
      setComposerText(res.data.sugerencia);
      showToast('ok', `Sugerencia de ${res.data.modelo}`);
    } catch (e: any) {
      showToast('err', e.message || 'Error pidiendo sugerencia');
    } finally {
      setAskingMinimax(false);
    }
  };

  const handleIniciarChatConLead = async (lead: Lead) => {
    setIniciarChatOpen(false);
    setChatLeadId(lead.id);
    // Crea la conversación (vacía) si no existe — getWhatsappConversacion ya hace getOrCreate
    await loadHilo(lead.id);
    void loadConversaciones();
  };

  const loadCementerio = async () => {
    if (!softwareId) return;
    setCementerioLoading(true);
    try {
      const res: any = await apiClient.getWhatsappCementerio(softwareId, cementerioDias);
      setCementerioLeads(res.data || []);
    } catch (e: any) {
      showToast('err', e.message || 'Error cargando cementerio');
    } finally {
      setCementerioLoading(false);
    }
  };

  const handleGenerarResurreccion = async (leadId: string, pretexto?: string) => {
    try {
      const res: any = await apiClient.generarResurreccion(leadId, pretexto);
      setResurrecciones((prev) => ({ ...prev, [leadId]: res.data.mensaje }));
      showToast('ok', 'Mensaje de resurrección generado');
    } catch (e: any) {
      showToast('err', e.message || 'Error generando mensaje');
    }
  };

  const handleEnviarResurreccion = async (leadId: string) => {
    const mensaje = resurrecciones[leadId];
    if (!mensaje) return;
    try {
      const res: any = await apiClient.enviarWhatsapp({ leadId, contenidoFinal: mensaje });
      window.open(res.data.url, '_blank', 'noopener,noreferrer');
      showToast('ok', 'WhatsApp abierto');
      void loadConversaciones();
      void loadEnvios();
    } catch (e: any) {
      showToast('err', e.message || 'Error enviando');
    }
  };

  const plantillaActual = plantillas.find((p) => p.id === plantillaSel);

  const showToast = (kind: 'ok' | 'err', msg: string) => {
    setToast({ kind, msg });
    setTimeout(() => setToast(null), 3500);
  };

  /* ===== WhatsApp Web.js ===== */

  const loadWwebEstado = async () => {
    try {
      const res: any = await apiClient.wwebEstado(softwareId);
      if (softwareId) {
        setWwebEstados((prev) => ({
          ...prev,
          [softwareId]: res.data || null,
        }));
        // Abrir modal QR automáticamente si hay QR nuevo para este software
        if (res.data?.estado === 'qr' && res.data?.qrCode) {
          setWwebQrOpen(true);
        }
      }
    } catch {
      if (softwareId) {
        setWwebEstados((prev) => ({ ...prev, [softwareId]: null }));
      }
    }
  };

  const handleWwebIniciar = async () => {
    if (!softwareId) return;
    setWwebLoading(true);
    try {
      await apiClient.wwebIniciar(softwareId);
      showToast('ok', 'WhatsApp Web iniciándose...');
      setWwebQrOpen(true);
    } catch (e: any) {
      showToast('err', e.message || 'Error iniciando');
    } finally {
      setWwebLoading(false);
    }
  };

  const handleWwebDetener = async () => {
    if (!softwareId) return;
    setWwebLoading(true);
    try {
      await apiClient.wwebDetener(softwareId);
      showToast('ok', 'WhatsApp Web detenido');
    } catch (e: any) {
      showToast('err', e.message || 'Error deteniendo');
    } finally {
      setWwebLoading(false);
    }
  };

  const sendOneAuto = async (lead: Lead) => {
    if (!softwareId) return;
    if (!plantillaActual) {
      showToast('err', 'Selecciona una plantilla primero');
      return;
    }
    if (!lead.telefono) {
      showToast('err', `${lead.nombre} no tiene teléfono`);
      return;
    }
    if (detectPhoneType(lead.telefono) === 'fixed') {
      showToast('err', `${lead.nombre} tiene número fijo`);
      return;
    }
    if (wwebEstado?.estado !== 'listo') {
      showToast('err', 'WhatsApp Web no está listo. Inícialo primero.');
      return;
    }
    try {
      await apiClient.wwebEnviarLead({ softwareId, leadId: lead.id, plantillaId: plantillaActual.id });
      showToast('ok', `Mensaje enviado a ${lead.nombre}`);
      void loadEnvios();
      void loadConversaciones();
    } catch (e: any) {
      showToast('err', e.message || 'Error enviando automáticamente');
    }
  };

  const sendBulkAuto = async () => {
    if (!softwareId) return;
    if (!plantillaActual) {
      showToast('err', 'Selecciona una plantilla primero');
      return;
    }
    if (seleccionados.size === 0) return;
    if (wwebEstado?.estado !== 'listo') {
      showToast('err', 'WhatsApp Web no está listo. Inícialo primero.');
      return;
    }
    const all = leads.filter((l) => seleccionados.has(l.id));
    const targets = all.filter((l) => detectPhoneType(l.telefono) !== 'fixed');
    if (targets.length === 0) {
      showToast('err', 'Todos los seleccionados son fijos');
      return;
    }
    if (!confirm(`Se enviarán ${targets.length} mensajes automáticamente vía WhatsApp Web (con delays de ~3.5s). ¿Continuar?`)) return;

    let ok = 0;
    let fail = 0;
    for (const lead of targets) {
      try {
        await apiClient.wwebEnviarLead({ softwareId, leadId: lead.id, plantillaId: plantillaActual.id });
        ok++;
        await new Promise((r) => setTimeout(r, 500));
      } catch {
        fail++;
      }
    }
    setSeleccionados(new Set());
    void loadEnvios();
    void loadConversaciones();
    showToast('ok', `${ok} enviados${fail ? `, ${fail} con error` : ''}`);
  };

  const handleSendChatAuto = async () => {
    if (!softwareId || !chatLeadId || !composerText.trim()) return;
    const lead = chatHilo ? conversaciones.find((c) => c.leadId === chatLeadId)?.lead : null;
    if (lead?.telefono && detectPhoneType(lead.telefono) === 'fixed') {
      showToast('err', 'Este lead tiene un número fijo');
      return;
    }
    if (wwebEstado?.estado !== 'listo') {
      showToast('err', 'WhatsApp Web no está listo. Inícialo primero.');
      return;
    }
    try {
      await apiClient.wwebEnviarLead({ softwareId, leadId: chatLeadId, contenidoFinal: composerText.trim() });
      setComposerText('');
      await loadHilo(chatLeadId);
      void loadConversaciones();
      void loadEnvios();
      showToast('ok', 'Mensaje enviado automáticamente');
    } catch (e: any) {
      showToast('err', e.message || 'Error enviando');
    }
  };

  /* ===== Envíos ===== */

  const sendOne = async (lead: Lead) => {
    if (!plantillaActual) {
      showToast('err', 'Selecciona una plantilla primero');
      return;
    }
    if (!lead.telefono) {
      showToast('err', `${lead.nombre} no tiene teléfono`);
      return;
    }
    if (detectPhoneType(lead.telefono) === 'fixed') {
      showToast('err', `${lead.nombre} tiene un número fijo, no puede recibir WhatsApp`);
      return;
    }
    try {
      const res: any = await apiClient.enviarWhatsapp({
        leadId: lead.id,
        plantillaId: plantillaActual.id,
      });
      window.open(res.data.url, '_blank', 'noopener,noreferrer');
      void loadEnvios();
    } catch (e: any) {
      showToast('err', e.message || 'Error generando envío');
    }
  };

  const sendBulk = async () => {
    if (!plantillaActual) {
      showToast('err', 'Selecciona una plantilla primero');
      return;
    }
    if (seleccionados.size === 0) return;
    const all = leads.filter((l) => seleccionados.has(l.id));
    const targets = all.filter((l) => detectPhoneType(l.telefono) !== 'fixed');
    const omitidos = all.length - targets.length;
    if (targets.length === 0) {
      showToast('err', 'Todos los seleccionados son fijos — no se puede enviar WhatsApp');
      return;
    }
    const omitMsg = omitidos > 0 ? ` (${omitidos} fijo${omitidos === 1 ? '' : 's'} omitido${omitidos === 1 ? '' : 's'})` : '';
    if (!confirm(`Se abrirán ${targets.length} ventanas de WhatsApp Web (una por lead)${omitMsg}. ¿Continuar?`)) return;

    let ok = 0;
    let fail = 0;
    for (const lead of targets) {
      try {
        const res: any = await apiClient.enviarWhatsapp({
          leadId: lead.id,
          plantillaId: plantillaActual.id,
        });
        window.open(res.data.url, '_blank', 'noopener,noreferrer');
        ok++;
        await new Promise((r) => setTimeout(r, 350));
      } catch {
        fail++;
      }
    }
    setSeleccionados(new Set());
    void loadEnvios();
    showToast('ok', `${ok} enviados${fail ? `, ${fail} con error` : ''}`);
  };

  /* ===== Plantillas CRUD ===== */

  const openEditor = (p?: Plantilla) => {
    setEditing(p || null);
    setEditorOpen(true);
  };

  const handleSavePlantilla = async (input: {
    id?: string;
    nombre: string;
    contenido: string;
    categoria: string;
    activa: boolean;
  }) => {
    try {
      if (input.id) {
        await apiClient.updateWhatsappPlantilla(input.id, {
          nombre: input.nombre,
          contenido: input.contenido,
          categoria: input.categoria,
          activa: input.activa,
        });
        showToast('ok', 'Plantilla actualizada');
      } else {
        await apiClient.createWhatsappPlantilla({
          softwareId,
          nombre: input.nombre,
          contenido: input.contenido,
          categoria: input.categoria,
          activa: input.activa,
        });
        showToast('ok', 'Plantilla creada');
      }
      setEditorOpen(false);
      setEditing(null);
      void loadPlantillas();
    } catch (e: any) {
      showToast('err', e.message || 'Error guardando plantilla');
    }
  };

  const handleDeletePlantilla = async (id: string) => {
    if (!confirm('¿Eliminar esta plantilla? Los envíos pasados se conservan.')) return;
    try {
      await apiClient.deleteWhatsappPlantilla(id);
      showToast('ok', 'Plantilla eliminada');
      void loadPlantillas();
    } catch (e: any) {
      showToast('err', e.message);
    }
  };

  const handleSeed = async () => {
    if (!softwareId) return;
    try {
      await apiClient.seedWhatsappPlantillas(softwareId);
      showToast('ok', 'Plantillas iniciales creadas');
      void loadPlantillas();
    } catch (e: any) {
      showToast('err', e.message);
    }
  };

  /* ===== A/B Tests CRUD ===== */

  const handleCreateABTest = async (input: {
    nombre: string;
    descripcion: string;
    categoria: string;
    variantes: { plantillaId: string; peso: number }[];
  }) => {
    try {
      await apiClient.createWhatsappABTest({
        softwareId,
        ...input,
      });
      showToast('ok', 'Test A/B creado');
      setAbEditorOpen(false);
      void loadABTests();
    } catch (e: any) {
      showToast('err', e.message || 'Error creando test A/B');
    }
  };

  const handleUpdateABTestEstado = async (id: string, estado: string) => {
    try {
      await apiClient.updateWhatsappABTest(id, { estado });
      showToast('ok', `Test ${estado.toLowerCase()}`);
      void loadABTests();
    } catch (e: any) {
      showToast('err', e.message);
    }
  };

  const handleDeleteABTest = async (id: string) => {
    if (!confirm('¿Eliminar este test A/B? Las variantes se mantendrán como plantillas normales.')) return;
    try {
      await apiClient.deleteWhatsappABTest(id);
      showToast('ok', 'Test A/B eliminado');
      void loadABTests();
    } catch (e: any) {
      showToast('err', e.message);
    }
  };

  const toggleSelect = (id: string) => {
    setSeleccionados((s) => {
      const n = new Set(s);
      if (n.has(id)) { n.delete(id); } else { n.add(id); }
      return n;
    });
  };
  const toggleSelectAll = () => {
    if (seleccionados.size === leadsVisibles.length) setSeleccionados(new Set());
    else setSeleccionados(new Set(leadsVisibles.map((x) => x.lead.id)));
  };

  /* ============================================================
     Render
  ============================================================ */

  if (!softwareId && softwares.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--text-tertiary)] mx-auto mb-3" />
          <p className="text-[13px] text-[var(--text-tertiary)]">Cargando workspaces...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col gap-6">
      {/* ===== Header ===== */}
      <header className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 ring-1 ring-emerald-500/30 flex items-center justify-center shadow-sm">
            <MessageCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h1 className="text-[26px] font-bold tracking-tight text-[var(--text-primary)] leading-tight">
              WhatsApp
            </h1>
            <p className="text-[13px] text-[var(--text-tertiary)]">
              Click-to-chat con plantillas y variables · sin Cloud API
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Estado WhatsApp Web.js */}
          <WwebStatusPanel
            softwareId={softwareId}
            softwareName={softwares.find((s) => s.saas === softwareId)?.descripcion || softwareId}
            estado={wwebEstado}
            loading={wwebLoading}
            onIniciar={handleWwebIniciar}
            onDetener={handleWwebDetener}
            onVerQr={() => setWwebQrOpen(true)}
          />

          {softwares.length > 1 && (
            <select
              value={softwareId}
              onChange={(e) => setSoftwareId(e.target.value)}
              className="h-10 px-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[13px] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            >
              {softwares.map((s) => (
                <option key={s.saas} value={s.saas}>
                  {s.descripcion || s.saas}
                </option>
              ))}
            </select>
          )}
        </div>
      </header>

      {/* ===== Tabs ===== */}
      <div className="flex items-center gap-1 border-b border-[var(--border-primary)]">
        {(
          [
            { id: 'enviar', label: 'Enviar', icon: Send, count: leads.length },
            { id: 'chat', label: 'Chat', icon: MessageCircle, count: conversaciones.reduce((s, c) => s + (c.noLeidos || 0), 0) || conversaciones.length },
            { id: 'cementerio', label: 'Cementerio', icon: Skull, count: 0 },
            { id: 'arena', label: 'Arena', icon: Swords, count: 0 },
            { id: 'plantillas', label: 'Plantillas', icon: Sparkles, count: plantillas.length },
            { id: 'historial', label: 'Historial', icon: History, count: envios.length },
            { id: 'ab_tests', label: 'A/B Tests', icon: FlaskConical, count: abTests.length },
            { id: 'chatbot', label: 'Chatbot', icon: Bot, count: chatbotReglas.length },
          ] as const
        ).map((t) => {
          const Active = t.id === tab;
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`relative flex items-center gap-2 px-4 h-11 text-[13.5px] font-medium transition-colors ${
                Active
                  ? 'text-[var(--text-primary)]'
                  : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
              <span
                className={`inline-flex items-center justify-center min-w-[20px] h-[18px] px-1.5 rounded-md text-[10.5px] font-semibold tabular-nums ${
                  Active
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                    : 'bg-[var(--bg-tertiary)] text-[var(--text-tertiary)]'
                }`}
              >
                {t.count}
              </span>
              {Active && (
                <span className="absolute -bottom-px left-2 right-2 h-[2px] rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400" />
              )}
            </button>
          );
        })}
      </div>

      {/* ===== Tab: Enviar ===== */}
      {tab === 'enviar' && (
        <div className="grid grid-cols-12 gap-6 flex-1">
          {/* Sidebar plantillas */}
          <aside className="col-span-12 lg:col-span-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)] px-1">
                Plantillas
              </p>
              <button
                type="button"
                onClick={() => openEditor()}
                className="p-1 rounded-md hover:bg-[var(--surface-hover)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                title="Nueva plantilla"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {plantillas.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-[var(--border-primary)] text-center">
                <Sparkles className="w-5 h-5 text-[var(--text-tertiary)] mx-auto mb-2" />
                <p className="text-[12.5px] text-[var(--text-secondary)] mb-3">Aún no tienes plantillas</p>
                <button
                  type="button"
                  onClick={handleSeed}
                  className="text-[12px] font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  Crear las predefinidas →
                </button>
              </div>
            ) : (
              <div className="space-y-1.5">
                {plantillas.map((p) => {
                  const active = p.id === plantillaSel;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPlantillaSel(p.id)}
                      className={`w-full text-left p-3 rounded-xl border transition-all duration-200 ${
                        active
                          ? 'bg-gradient-to-br from-emerald-500/[0.08] to-emerald-500/[0.02] border-emerald-500/40 shadow-[0_0_18px_-8px_rgba(16,185,129,0.4)]'
                          : 'bg-[var(--bg-secondary)] border-[var(--border-primary)] hover:border-[var(--text-tertiary)]'
                      } ${!p.activa ? 'opacity-60' : ''}`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <CategoryPill categoria={p.categoria} />
                        {!p.activa && (
                          <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                            Inactiva
                          </span>
                        )}
                      </div>
                      <p className="text-[13px] font-semibold text-[var(--text-primary)] truncate">
                        {p.nombre}
                      </p>
                      <p className="text-[11.5px] text-[var(--text-tertiary)] line-clamp-2 mt-1">
                        {p.contenido}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </aside>

          {/* Center + Leads */}
          <div className="col-span-12 lg:col-span-9 space-y-4">
            {/* Preview de plantilla */}
            {plantillaActual ? (
              <div className="p-5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] space-y-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <CategoryPill categoria={plantillaActual.categoria} />
                    <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">
                      {plantillaActual.nombre}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => openEditor(plantillaActual)}
                    className="inline-flex items-center gap-1.5 px-2.5 h-8 rounded-lg text-[12px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Editar
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-500/15 text-[13.5px] text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed font-mono">
                  {plantillaActual.contenido}
                </div>

                {plantillaActual.variables.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    <span className="text-[11px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)] mr-1">
                      Variables:
                    </span>
                    {plantillaActual.variables.map((v) => (
                      <span
                        key={v}
                        className="inline-flex items-center gap-1 px-2 h-[20px] rounded-md bg-violet-500/10 text-violet-700 dark:text-violet-400 text-[11px] font-mono ring-1 ring-violet-500/20"
                      >
                        <Wand2 className="w-3 h-3" />
                        {`{{${v}}}`}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 rounded-2xl bg-[var(--bg-secondary)] border border-dashed border-[var(--border-primary)] text-center">
                <Sparkles className="w-8 h-8 text-[var(--text-tertiary)] mx-auto mb-2" />
                <p className="text-[13.5px] text-[var(--text-secondary)]">
                  Selecciona una plantilla o crea una nueva
                </p>
              </div>
            )}

            {/* Filtros + acción bulk */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-[15px] h-[15px] text-[var(--text-tertiary)]" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por nombre, email o empresa..."
                  className="w-full h-10 pl-10 pr-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[13px] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>
              <select
                value={estadoFilter}
                onChange={(e) => setEstadoFilter(e.target.value as LeadEstado | '')}
                className="h-10 px-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[13px] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              >
                <option value="">Todos los estados</option>
                {ESTADOS_LEAD.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
              <label
                title="Oculta números fijos que no pueden recibir WhatsApp"
                className={`inline-flex items-center gap-2 h-10 px-3 rounded-xl border text-[12.5px] font-medium cursor-pointer transition-colors ${
                  onlyMobiles
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
                    : 'bg-[var(--bg-secondary)] border-[var(--border-primary)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
                }`}
              >
                <input
                  type="checkbox"
                  checked={onlyMobiles}
                  onChange={(e) => setOnlyMobiles(e.target.checked)}
                  className="w-3.5 h-3.5 rounded accent-emerald-500"
                />
                Solo móviles
              </label>
              <button
                type="button"
                disabled={seleccionados.size === 0}
                onClick={() => setMasaOpen(true)}
                title="Genera un mensaje ÚNICO para cada lead con MiniMax (hiperpersonalización)"
                className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white text-[13px] font-semibold hover:shadow-lg hover:shadow-violet-500/25 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <Wand2 className="w-4 h-4" />
                Hiperpersonalizar ({seleccionados.size})
              </button>
              <button
                type="button"
                disabled={seleccionados.size === 0}
                onClick={sendBulk}
                className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-emerald-600 text-white text-[13px] font-semibold hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm shadow-emerald-600/20"
              >
                <Send className="w-4 h-4" />
                Enviar a {seleccionados.size}
              </button>
              <button
                type="button"
                disabled={seleccionados.size === 0 || wwebEstado?.estado !== 'listo'}
                onClick={sendBulkAuto}
                title={wwebEstado?.estado !== 'listo' ? 'Inicia WhatsApp Web primero' : 'Envío automático vía WhatsApp Web'}
                className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-violet-600 text-white text-[13px] font-semibold hover:bg-violet-700 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm shadow-violet-600/20"
              >
                <Rocket className="w-4 h-4" />
                Auto ({seleccionados.size})
              </button>
            </div>

            {/* Tabla de leads */}
            <div className="rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] overflow-hidden">
              <div className="flex items-center gap-3 px-4 h-11 border-b border-[var(--border-primary)] text-[11px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)]">
                <input
                  type="checkbox"
                  checked={seleccionados.size > 0 && seleccionados.size === leadsVisibles.length}
                  ref={(el) => {
                    if (el) el.indeterminate = seleccionados.size > 0 && seleccionados.size < leadsVisibles.length;
                  }}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded accent-emerald-500"
                />
                <span className="flex-1">Lead</span>
                <span className="hidden md:block w-32">Estado</span>
                <span className="hidden md:block w-32">Teléfono</span>
                <span className="hidden lg:block w-32">Último contacto</span>
                <span className="w-24 text-right">Acción</span>
              </div>

              {loadingLeads ? (
                <div className="px-4 py-12 text-center">
                  <Loader2 className="w-5 h-5 animate-spin text-[var(--text-tertiary)] mx-auto" />
                </div>
              ) : leadsVisibles.length === 0 ? (
                <div className="px-4 py-16 text-center">
                  <Users className="w-8 h-8 text-[var(--text-tertiary)] mx-auto mb-2" />
                  <p className="text-[13.5px] font-medium text-[var(--text-primary)]">
                    {onlyMobiles && leads.length > 0 ? 'Todos los leads tienen número fijo' : 'Sin leads con teléfono'}
                  </p>
                  <p className="text-[12px] text-[var(--text-tertiary)] mt-1">
                    {onlyMobiles && leads.length > 0
                      ? 'Desactiva "Solo móviles" para verlos, o añade teléfonos móviles a tus leads.'
                      : 'Ajusta los filtros o añade teléfono a tus leads existentes.'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-[var(--border-primary)]">
                  {leadsVisibles.map(({ lead, phoneType }) => {
                    const sel = seleccionados.has(lead.id);
                    const isFixed = phoneType === 'fixed';
                    return (
                      <div
                        key={lead.id}
                        className={`group flex items-center gap-3 px-4 h-14 transition-colors ${
                          sel ? 'bg-emerald-500/[0.04]' : 'hover:bg-[var(--surface-hover)]'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={sel}
                          onChange={() => toggleSelect(lead.id)}
                          className="w-4 h-4 rounded accent-emerald-500"
                        />
                        <div className="flex-1 min-w-0 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shrink-0">
                            <span className="text-white text-[12px] font-bold">
                              {lead.nombre.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-[13.5px] font-medium text-[var(--text-primary)] truncate">
                              {lead.nombre}
                            </p>
                            <p className="text-[11.5px] text-[var(--text-tertiary)] truncate">
                              {lead.empresa || lead.email || '—'}
                            </p>
                          </div>
                        </div>
                        <div className="hidden md:block w-32">
                          <span className="text-[11px] font-mono text-[var(--text-secondary)]">{lead.estado}</span>
                        </div>
                        <div className="hidden md:flex items-center gap-1.5 w-32 text-[12px] font-mono">
                          <Phone className={`w-3 h-3 ${isFixed ? 'text-rose-500' : 'text-[var(--text-tertiary)]'}`} />
                          <span className={isFixed ? 'text-[var(--text-tertiary)] line-through' : 'text-[var(--text-secondary)]'}>
                            {lead.telefono}
                          </span>
                          {isFixed && (
                            <span
                              title="Número fijo — no puede recibir WhatsApp"
                              className="inline-flex items-center px-1.5 h-[16px] rounded-md text-[9.5px] font-semibold uppercase tracking-wider bg-rose-500/10 text-rose-600 dark:text-rose-400 ring-1 ring-rose-500/20"
                            >
                              Fijo
                            </span>
                          )}
                        </div>
                        <div className="hidden lg:block w-32 text-[11.5px] text-[var(--text-tertiary)]">
                          {lead.ultimoContacto ? formatRelativeTime(lead.ultimoContacto) : '—'}
                        </div>
                        <div className="w-24 text-right flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => sendOne(lead)}
                            disabled={!plantillaActual || isFixed}
                            title={isFixed ? 'Número fijo — no puede recibir WhatsApp' : 'Abrir WhatsApp Web'}
                            className="inline-flex items-center gap-1 px-2 h-7 rounded-lg bg-emerald-600/10 text-emerald-700 dark:text-emerald-400 text-[11px] font-semibold hover:bg-emerald-600 hover:text-white active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                          >
                            <Send className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => sendOneAuto(lead)}
                            disabled={!plantillaActual || isFixed || wwebEstado?.estado !== 'listo'}
                            title={wwebEstado?.estado !== 'listo' ? 'Inicia WhatsApp Web primero' : 'Enviar automáticamente'}
                            className="inline-flex items-center gap-1 px-2 h-7 rounded-lg bg-violet-600/10 text-violet-700 dark:text-violet-400 text-[11px] font-semibold hover:bg-violet-600 hover:text-white active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                          >
                            <Rocket className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => { setProgramarLead(lead); setProgramarOpen(true); }}
                            disabled={!plantillaActual || isFixed}
                            title="Programar envío"
                            className="inline-flex items-center gap-1 px-2 h-7 rounded-lg bg-amber-600/10 text-amber-700 dark:text-amber-400 text-[11px] font-semibold hover:bg-amber-600 hover:text-white active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                          >
                            <Calendar className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Paginación */}
              {pagination && pagination.total > 0 && (
                <div className="flex items-center justify-between gap-3 px-4 h-12 border-t border-[var(--border-primary)] text-[12px] text-[var(--text-secondary)] flex-wrap">
                  <div className="flex items-center gap-2">
                    <span>
                      Mostrando <span className="font-mono text-[var(--text-primary)]">{(pagination.page - 1) * pagination.limit + 1}</span>
                      –
                      <span className="font-mono text-[var(--text-primary)]">
                        {Math.min(pagination.page * pagination.limit, pagination.total)}
                      </span>{' '}
                      de <span className="font-mono text-[var(--text-primary)]">{pagination.total}</span>
                    </span>
                    <select
                      value={pageSize}
                      onChange={(e) => setPageSize(Number(e.target.value))}
                      className="h-7 px-2 rounded-md bg-[var(--bg-primary)] border border-[var(--border-primary)] text-[11.5px] focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    >
                      {[25, 50, 100, 200].map((n) => (
                        <option key={n} value={n}>
                          {n}/página
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={pagination.page <= 1 || loadingLeads}
                      className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-primary)] text-[12px] font-medium hover:bg-[var(--surface-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      Anterior
                    </button>
                    <span className="px-2 font-mono text-[11.5px] text-[var(--text-tertiary)]">
                      {pagination.page} / {pagination.pages || 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.min(pagination.pages || 1, p + 1))}
                      disabled={pagination.page >= (pagination.pages || 1) || loadingLeads}
                      className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-primary)] text-[12px] font-medium hover:bg-[var(--surface-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      Siguiente
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Aviso */}
            <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-[12px] text-amber-700 dark:text-amber-400">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <p>
                Cada clic abre WhatsApp Web/móvil con el mensaje pre-rellenado. Debes pulsar enviar tú mismo —
                esta vista NO envía automáticamente. El log queda registrado al pulsar &quot;Enviar&quot;.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ===== Tab: Chat ===== */}
      {tab === 'chat' && (
        <ChatTab
          conversaciones={conversaciones.filter((c) => {
            const q = chatSearch.trim().toLowerCase();
            if (!q) return true;
            return (
              c.lead.nombre.toLowerCase().includes(q) ||
              (c.lead.empresa || '').toLowerCase().includes(q) ||
              (c.lead.telefono || '').includes(q)
            );
          })}
          chatSearch={chatSearch}
          setChatSearch={setChatSearch}
          chatLeadId={chatLeadId}
          setChatLeadId={setChatLeadId}
          chatHilo={chatHilo}
          chatLoading={chatLoading}
          composerText={composerText}
          setComposerText={setComposerText}
          askingMinimax={askingMinimax}
          pegandoIn={pegandoIn}
          setPegandoIn={setPegandoIn}
          inboundText={inboundText}
          setInboundText={setInboundText}
          onSend={handleSendChat}
          onSendAuto={handleSendChatAuto}
          onAddInbound={handleAddInbound}
          onAskMinimax={handleAskMinimax}
          onNuevoChat={() => setIniciarChatOpen(true)}
          onOpenSparring={(id) => setSparringLeadId(id)}
          onOpenStoryboard={(id) => setStoryboardLeadId(id)}
          leadActual={
            conversaciones.find((c) => c.leadId === chatLeadId)?.lead || null
          }
          wwebListo={wwebEstado?.estado === 'listo'}
        />
      )}

      {/* ===== Tab: Cementerio ===== */}
      {tab === 'cementerio' && (
        <CementerioTab
          leads={cementerioLeads}
          dias={cementerioDias}
          setDias={setCementerioDias}
          loading={cementerioLoading}
          resurrecciones={resurrecciones}
          onGenerar={handleGenerarResurreccion}
          onEnviar={handleEnviarResurreccion}
          setResurrecciones={setResurrecciones}
        />
      )}

      {/* ===== Tab: Arena ===== */}
      {tab === 'arena' && (
        <ArenaTab
          plantillas={plantillas}
          softwareId={softwareId}
          showToast={showToast}
        />
      )}

      {/* Modales Sparring / Storyboard / Masa */}
      {sparringLeadId && (
        <SparringModal
          leadId={sparringLeadId}
          lead={
            conversaciones.find((c) => c.leadId === sparringLeadId)?.lead || null
          }
          onClose={() => setSparringLeadId(null)}
          showToast={showToast}
        />
      )}
      {storyboardLeadId && (
        <StoryboardModal
          leadId={storyboardLeadId}
          onClose={() => setStoryboardLeadId(null)}
          showToast={showToast}
        />
      )}
      {masaOpen && (
        <HiperpersonalizarModal
          leads={leads.filter((l) => seleccionados.has(l.id))}
          onClose={() => setMasaOpen(false)}
          showToast={showToast}
          onTrasEnviar={() => {
            setSeleccionados(new Set());
            void loadEnvios();
            void loadConversaciones();
          }}
        />
      )}

      {/* Modal selector para iniciar chat con un lead */}
      {iniciarChatOpen && (
        <IniciarChatModal
          softwareId={softwareId}
          onPick={handleIniciarChatConLead}
          onClose={() => setIniciarChatOpen(false)}
        />
      )}

      {/* ===== Tab: Plantillas ===== */}
      {tab === 'plantillas' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[13px] text-[var(--text-secondary)]">
              {plantillas.length} plantilla{plantillas.length !== 1 && 's'} en este workspace
            </p>
            <button
              type="button"
              onClick={() => openEditor()}
              className="inline-flex items-center gap-2 px-4 h-10 rounded-xl bg-[var(--text-primary)] text-[var(--bg-secondary)] text-[13px] font-semibold hover:opacity-90 transition-opacity"
            >
              <Plus className="w-4 h-4" />
              Nueva plantilla
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {plantillas.map((p) => (
              <div
                key={p.id}
                className={`p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] hover:border-[var(--text-tertiary)] transition-colors group ${
                  !p.activa ? 'opacity-60' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <CategoryPill categoria={p.categoria} />
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => openEditor(p)}
                      className="p-1.5 rounded-md hover:bg-[var(--surface-hover)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                      title="Editar"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeletePlantilla(p.id)}
                      className="p-1.5 rounded-md hover:bg-red-500/10 text-[var(--text-tertiary)] hover:text-red-500"
                      title="Eliminar"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <p className="text-[14px] font-semibold text-[var(--text-primary)] mb-1.5">{p.nombre}</p>
                <p className="text-[12.5px] text-[var(--text-secondary)] line-clamp-3 font-mono leading-relaxed whitespace-pre-wrap">
                  {p.contenido}
                </p>
                {p.variables.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-[var(--border-primary)]">
                    {p.variables.map((v) => (
                      <span
                        key={v}
                        className="inline-flex items-center px-1.5 h-[16px] rounded-md bg-violet-500/10 text-violet-700 dark:text-violet-400 text-[10px] font-mono ring-1 ring-violet-500/15"
                      >
                        {`{{${v}}}`}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Card "+ Nueva" */}
            <button
              type="button"
              onClick={() => openEditor()}
              className="p-4 rounded-2xl bg-[var(--bg-tertiary)] border border-dashed border-[var(--border-primary)] hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all flex flex-col items-center justify-center gap-2 text-[var(--text-tertiary)] hover:text-emerald-600 dark:hover:text-emerald-400 min-h-[180px]"
            >
              <Plus className="w-6 h-6" />
              <span className="text-[13px] font-medium">Nueva plantilla</span>
            </button>
          </div>
        </div>
      )}

      {/* ===== Tab: Historial ===== */}
      {tab === 'historial' && (
        <div className="rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] overflow-hidden">
          {envios.length === 0 ? (
            <div className="px-4 py-20 text-center">
              <History className="w-10 h-10 text-[var(--text-tertiary)] mx-auto mb-3" />
              <p className="text-[14px] font-medium text-[var(--text-primary)]">Aún no has enviado nada</p>
              <p className="text-[12.5px] text-[var(--text-tertiary)] mt-1">
                Cuando uses &quot;Enviar&quot;, aparecerá aquí el log de envíos.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-primary)]">
              {envios.map((e) => (
                <div key={e.id} className="px-4 py-3 hover:bg-[var(--surface-hover)] transition-colors">
                  <div className="flex items-center gap-3 mb-1.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 ring-1 ring-emerald-500/20 flex items-center justify-center shrink-0">
                      <MessageCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                      <span className="text-[13.5px] font-medium text-[var(--text-primary)]">
                        {e.lead?.nombre || 'Lead'}
                      </span>
                      <span className="text-[11.5px] text-[var(--text-tertiary)] font-mono">
                        {e.telefono}
                      </span>
                      {e.plantilla && (
                        <>
                          <span className="text-[var(--text-tertiary)]">·</span>
                          <CategoryPill categoria={e.plantilla.categoria} />
                          <span className="text-[12px] text-[var(--text-secondary)]">{e.plantilla.nombre}</span>
                        </>
                      )}
                    </div>
                    <span className="text-[11.5px] text-[var(--text-tertiary)] tabular-nums">
                      {formatRelativeTime(e.enviadoAt)}
                    </span>
                  </div>
                  <p className="text-[12.5px] text-[var(--text-secondary)] line-clamp-2 pl-11">
                    {e.mensaje}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== Tab: A/B Tests ===== */}
      {tab === 'ab_tests' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[13px] text-[var(--text-secondary)]">
              {abTests.length} test{abTests.length !== 1 && 's'} A/B en este workspace
            </p>
            <button
              type="button"
              onClick={() => setAbEditorOpen(true)}
              className="inline-flex items-center gap-2 px-4 h-10 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white text-[13px] font-semibold hover:shadow-lg hover:shadow-violet-500/25 transition-all"
            >
              <Plus className="w-4 h-4" />
              Nuevo test A/B
            </button>
          </div>

          {abTests.length === 0 ? (
            <div className="p-12 rounded-2xl bg-[var(--bg-secondary)] border border-dashed border-[var(--border-primary)] text-center">
              <FlaskConical className="w-10 h-10 text-[var(--text-tertiary)] mx-auto mb-3" />
              <p className="text-[14px] font-medium text-[var(--text-primary)]">Sin tests A/B</p>
              <p className="text-[12.5px] text-[var(--text-tertiary)] mt-1">
                Crea un test para comparar diferentes versiones de una plantilla.
              </p>
              <button
                type="button"
                onClick={() => setAbEditorOpen(true)}
                className="mt-4 inline-flex items-center gap-2 px-4 h-9 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white text-[13px] font-semibold hover:shadow-lg hover:shadow-violet-500/25 transition-all"
              >
                <Plus className="w-4 h-4" />
                Crear primer test
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {abTests.map((test) => {
                const metrics = abTestMetrics[test.id];
                const totalEnvios = test.variantes.reduce((s, v) => s + v.envios, 0);
                return (
                  <div
                    key={test.id}
                    className="p-5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] hover:border-[var(--text-tertiary)] transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`inline-flex items-center px-2 h-5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                              test.estado === 'ACTIVO'
                                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-500/20'
                                : test.estado === 'PAUSADO'
                                ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 ring-1 ring-amber-500/20'
                                : 'bg-slate-500/10 text-slate-700 dark:text-slate-400 ring-1 ring-slate-500/20'
                            }`}
                          >
                            {test.estado}
                          </span>
                          <CategoryPill categoria={test.categoria} />
                        </div>
                        <h3 className="text-[15px] font-semibold text-[var(--text-primary)] truncate">{test.nombre}</h3>
                        {test.descripcion && (
                          <p className="text-[12px] text-[var(--text-tertiary)] mt-0.5">{test.descripcion}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {test.estado === 'ACTIVO' ? (
                          <button
                            type="button"
                            onClick={() => handleUpdateABTestEstado(test.id, 'PAUSADO')}
                            className="p-1.5 rounded-md hover:bg-amber-500/10 text-[var(--text-tertiary)] hover:text-amber-600"
                            title="Pausar"
                          >
                            <Pause className="w-3.5 h-3.5" />
                          </button>
                        ) : test.estado === 'PAUSADO' ? (
                          <button
                            type="button"
                            onClick={() => handleUpdateABTestEstado(test.id, 'ACTIVO')}
                            className="p-1.5 rounded-md hover:bg-emerald-500/10 text-[var(--text-tertiary)] hover:text-emerald-600"
                            title="Activar"
                          >
                            <Play className="w-3.5 h-3.5" />
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => handleDeleteABTest(test.id)}
                          className="p-1.5 rounded-md hover:bg-red-500/10 text-[var(--text-tertiary)] hover:text-red-500"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Variantes */}
                    <div className="space-y-2">
                      {test.variantes.map((v) => (
                        <div
                          key={v.id}
                          className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-tertiary)]/40 border border-[var(--border-primary)]"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-medium text-[var(--text-primary)] truncate">
                              {v.plantilla.nombre}
                            </p>
                            <p className="text-[11px] text-[var(--text-tertiary)] line-clamp-1 font-mono">
                              {v.plantilla.contenido.slice(0, 80)}...
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-medium text-violet-600 dark:text-violet-400">{v.peso}%</span>
                              <div className="w-16 h-1.5 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-violet-500"
                                  style={{ width: `${v.peso}%` }}
                                />
                              </div>
                            </div>
                            <p className="text-[11px] text-[var(--text-tertiary)] mt-1">
                              {v.envios} envíos
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Métricas */}
                    <div className="mt-4 pt-4 border-t border-[var(--border-primary)]">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="text-center">
                            <p className="text-[18px] font-bold text-[var(--text-primary)]">{totalEnvios}</p>
                            <p className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">Envíos</p>
                          </div>
                          {metrics?.metricas?.map((m: any) => (
                            <div key={m.varianteId} className="text-center">
                              <p className="text-[18px] font-bold text-[var(--text-primary)]">{m.tasaRespuesta}%</p>
                              <p className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">{m.plantillaNombre.slice(0, 12)}</p>
                            </div>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            void loadABMetrics(test.id);
                            setAbMetricsOpen(test.id);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[12px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-tertiary)] transition-all"
                        >
                          <BarChart3 className="w-3.5 h-3.5" />
                          Métricas
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===== Tab: Chatbot ===== */}
      {tab === 'chatbot' && (
        <ChatbotTab
          reglas={chatbotReglas}
          onRecargar={loadChatbotReglas}
          onNueva={() => { setChatbotEditing(null); setChatbotEditorOpen(true); }}
          onEditar={(r: any) => { setChatbotEditing(r); setChatbotEditorOpen(true); }}
          onEliminar={async (id: string) => {
            if (!confirm('¿Eliminar esta regla?')) return;
            try {
              await apiClient.deleteWhatsappChatbotRegla(id);
              showToast('ok', 'Regla eliminada');
              void loadChatbotReglas();
            } catch (e: any) {
              showToast('err', e.message);
            }
          }}
        />
      )}

      {/* ===== Editor modal ===== */}
      {editorOpen && (
        <PlantillaEditor
          initial={editing}
          onClose={() => {
            setEditorOpen(false);
            setEditing(null);
          }}
          onSave={handleSavePlantilla}
        />
      )}

      {/* ===== A/B Test Editor modal ===== */}
      {abEditorOpen && (
        <ABTestEditor
          plantillas={plantillas}
          onClose={() => setAbEditorOpen(false)}
          onSave={handleCreateABTest}
        />
      )}

      {/* ===== A/B Test Metrics modal ===== */}
      {abMetricsOpen && abTestMetrics[abMetricsOpen] && (
        <ABTestMetricsModal
          metrics={abTestMetrics[abMetricsOpen]}
          onClose={() => setAbMetricsOpen(null)}
        />
      )}

      {/* ===== Modal QR WhatsApp Web.js ===== */}
      {wwebQrOpen && wwebEstado?.qrCode && (
        <WwebQrModal
          qrCode={wwebEstado.qrCode}
          estado={wwebEstado.estado}
          onClose={() => setWwebQrOpen(false)}
        />
      )}

      {/* ===== Modal QR WhatsApp Web.js ===== */}
      {wwebQrOpen && wwebEstado?.qrCode && (
        <WwebQrModal
          qrCode={wwebEstado.qrCode}
          estado={wwebEstado.estado}
          onClose={() => setWwebQrOpen(false)}
        />
      )}

      {/* ===== Chatbot Editor Modal ===== */}
      {chatbotEditorOpen && (
        <ChatbotEditorModal
          initial={chatbotEditing}
          onClose={() => {
            setChatbotEditorOpen(false);
            setChatbotEditing(null);
          }}
          onSave={async (input) => {
            try {
              if (input.id) {
                await apiClient.updateWhatsappChatbotRegla(input.id, { ...input, softwareId });
                showToast('ok', 'Regla actualizada');
              } else {
                await apiClient.createWhatsappChatbotRegla({ ...input, softwareId });
                showToast('ok', 'Regla creada');
              }
              setChatbotEditorOpen(false);
              setChatbotEditing(null);
              void loadChatbotReglas();
            } catch (e: any) {
              showToast('err', e.message || 'Error guardando regla');
            }
          }}
        />
      )}

      {/* ===== Programar Envío Modal ===== */}
      {programarOpen && programarLead && (
        <ProgramarEnvioModal
          lead={programarLead}
          plantilla={plantillaActual}
          onClose={() => { setProgramarOpen(false); setProgramarLead(null); }}
          onProgramar={async (fecha, hora) => {
            if (!softwareId || !plantillaActual) return;
            try {
              const programadoPara = new Date(`${fecha}T${hora}`);
              if (isNaN(programadoPara.getTime()) || programadoPara <= new Date()) {
                showToast('err', 'Fecha/hora inválida o en el pasado');
                return;
              }
              await apiClient.wwebProgramar({
                softwareId,
                leadId: programarLead.id,
                plantillaId: plantillaActual.id,
                programadoPara: programadoPara.toISOString(),
              });
              showToast('ok', `Envío programado para ${programadoPara.toLocaleString()}`);
              setProgramarOpen(false);
              setProgramarLead(null);
              void loadEnvios();
            } catch (e: any) {
              showToast('err', e.message || 'Error programando envío');
            }
          }}
        />
      )}

      {/* ===== Toast ===== */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl border text-[13px] font-medium animate-in slide-in-from-bottom-2 fade-in duration-200 ${
            toast.kind === 'ok'
              ? 'bg-emerald-500 text-white border-emerald-600'
              : 'bg-red-500 text-white border-red-600'
          }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   Panel de estado WhatsApp Web.js
============================================================ */

function WwebStatusPanel({
  softwareId,
  softwareName,
  estado,
  loading,
  onIniciar,
  onDetener,
  onVerQr,
}: {
  softwareId: string;
  softwareName: string;
  estado: any;
  loading: boolean;
  onIniciar: () => void;
  onDetener: () => void;
  onVerQr: () => void;
}) {
  const esListo = estado?.estado === 'listo';
  const esQr = estado?.estado === 'qr';
  const esIniciando = estado?.estado === 'iniciando' || estado?.estado === 'autenticando';
  const esError = estado?.estado === 'error';

  if (!estado || estado.estado === 'desconectado') {
    return (
      <button
        type="button"
        onClick={onIniciar}
        disabled={loading}
        className="inline-flex items-center gap-2 h-10 px-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[12px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-emerald-500/40 transition-all"
      >
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Smartphone className="w-3.5 h-3.5" />}
        Conectar WhatsApp
      </button>
    );
  }

  return (
    <div className="inline-flex items-center gap-2 h-10 px-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)]">
      {esListo ? (
        <>
          <Wifi className="w-3.5 h-3.5 text-emerald-500" />
          <span className="text-[12px] font-medium text-emerald-600 dark:text-emerald-400 truncate max-w-[120px]">
            {estado.info?.nombre || softwareName || 'Conectado'}
          </span>
          <span className="text-[11px] text-[var(--text-tertiary)]">
            {estado.mensajesEnviados} enviados
          </span>
          <button
            type="button"
            onClick={onDetener}
            disabled={loading}
            title="Desconectar"
            className="p-1 rounded-md hover:bg-red-500/10 text-[var(--text-tertiary)] hover:text-red-500 transition-colors"
          >
            <Power className="w-3.5 h-3.5" />
          </button>
        </>
      ) : esQr ? (
        <>
          <QrCode className="w-3.5 h-3.5 text-amber-500" />
          <span className="text-[12px] font-medium text-amber-600 dark:text-amber-400">Escanea QR</span>
          <button
            type="button"
            onClick={onVerQr}
            className="text-[11px] font-medium text-amber-600 dark:text-amber-400 hover:underline"
          >
            Ver QR
          </button>
          <button
            type="button"
            onClick={onDetener}
            disabled={loading}
            className="p-1 rounded-md hover:bg-red-500/10 text-[var(--text-tertiary)] hover:text-red-500 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </>
      ) : esIniciando ? (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--text-tertiary)]" />
          <span className="text-[12px] font-medium text-[var(--text-secondary)]">Conectando...</span>
          <button
            type="button"
            onClick={onDetener}
            disabled={loading}
            className="p-1 rounded-md hover:bg-red-500/10 text-[var(--text-tertiary)] hover:text-red-500 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </>
      ) : esError ? (
        <>
          <WifiOff className="w-3.5 h-3.5 text-red-500" />
          <span className="text-[12px] font-medium text-red-600">Error</span>
          <button
            type="button"
            onClick={onIniciar}
            disabled={loading}
            className="text-[11px] font-medium text-[var(--text-secondary)] hover:underline"
          >
            Reintentar
          </button>
          <button
            type="button"
            onClick={onDetener}
            disabled={loading}
            className="p-1 rounded-md hover:bg-red-500/10 text-[var(--text-tertiary)] hover:text-red-500 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </>
      ) : (
        <span className="text-[12px] text-[var(--text-tertiary)]">{estado.estado}</span>
      )}
    </div>
  );
}

/* ============================================================
   Modal QR WhatsApp Web.js
============================================================ */

function WwebQrModal({
  qrCode,
  estado,
  onClose,
}: {
  qrCode: string;
  estado: string;
  onClose: () => void;
}) {
  const [qrUrl, setQrUrl] = useState('');

  useEffect(() => {
    // Generar QR code como data URL usando una API pública
    // El qrCode de whatsapp-web.js es un string que puede ser usado con qrcode
    // Como no tenemos qrcode en frontend, usamos una API de generación
    setQrUrl(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrCode)}`);
  }, [qrCode]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[400px] bg-[var(--bg-secondary)] rounded-2xl shadow-2xl border border-[var(--border-primary)] p-6 text-center animate-in zoom-in-95 duration-200"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-md hover:bg-[var(--surface-hover)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
        >
          <X className="w-4 h-4" />
        </button>

        <Smartphone className="w-8 h-8 text-emerald-500 mx-auto mb-3" />
        <h2 className="text-[16px] font-semibold text-[var(--text-primary)] mb-1">
          Conectar WhatsApp Web
        </h2>
        <p className="text-[13px] text-[var(--text-secondary)] mb-5">
          Abre WhatsApp en tu móvil, ve a <b>Más opciones {'>'} Dispositivos vinculados {'>'} Vincular dispositivo</b> y escanea el código.
        </p>

        {estado === 'qr' ? (
          qrUrl ? (
            <img
              src={qrUrl}
              alt="QR Code"
              className="w-[260px] h-[260px] mx-auto rounded-xl border border-[var(--border-primary)]"
            />
          ) : (
            <div className="w-[260px] h-[260px] mx-auto rounded-xl border border-[var(--border-primary)] bg-[var(--bg-tertiary)] flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-[var(--text-tertiary)]" />
            </div>
          )
        ) : estado === 'listo' ? (
          <div className="w-[260px] h-[260px] mx-auto rounded-xl border border-emerald-500/30 bg-emerald-500/5 flex flex-col items-center justify-center">
            <Check className="w-12 h-12 text-emerald-500 mb-2" />
            <p className="text-[14px] font-medium text-emerald-600 dark:text-emerald-400">¡Conectado!</p>
          </div>
        ) : (
          <div className="w-[260px] h-[260px] mx-auto rounded-xl border border-[var(--border-primary)] bg-[var(--bg-tertiary)] flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-[var(--text-tertiary)]" />
          </div>
        )}

        <p className="text-[11px] text-[var(--text-tertiary)] mt-4">
          La sesión se guarda automáticamente. No necesitarás escanear de nuevo.
        </p>
      </div>
    </div>
  );
}

/* ============================================================
   Editor modal de plantilla
============================================================ */

function PlantillaEditor({
  initial,
  onClose,
  onSave,
}: {
  initial: Plantilla | null;
  onClose: () => void;
  onSave: (input: {
    id?: string;
    nombre: string;
    contenido: string;
    categoria: string;
    activa: boolean;
  }) => Promise<void>;
}) {
  const [nombre, setNombre] = useState(initial?.nombre || '');
  const [contenido, setContenido] = useState(initial?.contenido || '');
  const [categoria, setCategoria] = useState(initial?.categoria || 'general');
  const [activa, setActiva] = useState(initial?.activa ?? true);
  const [saving, setSaving] = useState(false);

  const variables = useMemo(() => {
    const set = new Set<string>();
    let m: RegExpExecArray | null;
    const re = /\{\{\s*(\w+)\s*\}\}/g;
    while ((m = re.exec(contenido)) !== null) set.add(m[1]);
    return Array.from(set);
  }, [contenido]);

  const insertVar = (v: string) => {
    setContenido((c) => c + `{{${v}}}`);
  };

  const handleSave = async () => {
    if (!nombre.trim() || !contenido.trim()) return;
    setSaving(true);
    try {
      await onSave({
        id: initial?.id,
        nombre: nombre.trim(),
        contenido,
        categoria,
        activa,
      });
    } finally {
      setSaving(false);
    }
  };

  const sampleLead: Partial<Lead> = {
    nombre: 'Ana García',
    empresa: 'Acme SL',
    cargo: 'Marketing Manager',
    email: 'ana@acme.com',
    pais: 'España',
    estado: 'CONTACTADO',
    telefono: '+34 666 12 34 56',
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[820px] max-h-[90vh] overflow-y-auto bg-[var(--bg-secondary)] rounded-2xl shadow-2xl border border-[var(--border-primary)] animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="sticky top-0 bg-[var(--bg-secondary)] flex items-center justify-between px-6 h-14 border-b border-[var(--border-primary)] z-10">
          <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">
            {initial ? 'Editar plantilla' : 'Nueva plantilla'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-[var(--surface-hover)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Nombre + categoria */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="text-[11px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)]">
                Nombre
              </label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="ej. Bienvenida lead nuevo"
                className="mt-1 w-full h-10 px-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[14px] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)]">
                Categoría
              </label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="mt-1 w-full h-10 px-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[14px] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              >
                {CATEGORIAS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Contenido */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)]">
                Mensaje
              </label>
              <span className="text-[11px] text-[var(--text-tertiary)]">
                {contenido.length} caracteres
              </span>
            </div>
            <textarea
              value={contenido}
              onChange={(e) => setContenido(e.target.value)}
              rows={6}
              placeholder="Hola {{primer_nombre}}, gracias por tu interés en {{empresa}}..."
              className="w-full p-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[14px] text-[var(--text-primary)] font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
            <p className="text-[11px] text-[var(--text-tertiary)] mt-1.5">
              Usa <code className="font-mono text-[var(--text-secondary)]">{`{{nombre}}`}</code> para insertar variables.
            </p>
          </div>

          {/* Variables disponibles */}
          <div>
            <label className="text-[11px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)]">
              Variables disponibles (clic para insertar)
            </label>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {VARIABLES_DISPONIBLES.map((v) => (
                <button
                  key={v.v}
                  type="button"
                  onClick={() => insertVar(v.v)}
                  className="inline-flex items-center gap-1.5 px-2.5 h-7 rounded-md bg-violet-500/10 text-violet-700 dark:text-violet-400 text-[12px] font-mono ring-1 ring-violet-500/20 hover:bg-violet-500/20 transition-colors"
                  title={v.desc}
                >
                  <Plus className="w-3 h-3" />
                  {`{{${v.v}}}`}
                </button>
              ))}
            </div>
          </div>

          {/* Preview con lead de ejemplo */}
          <div>
            <label className="text-[11px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)]">
              Preview con datos de ejemplo
            </label>
            <div className="mt-1.5 p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-500/15 text-[13.5px] text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">
              {renderLocal(contenido, sampleLead) || (
                <span className="text-[var(--text-tertiary)] italic">
                  El preview aparecerá aquí mientras escribes...
                </span>
              )}
            </div>
            {variables.length > 0 && (
              <p className="text-[11px] text-[var(--text-tertiary)] mt-1.5">
                Variables detectadas: {variables.map((v) => `{{${v}}}`).join(', ')}
              </p>
            )}
          </div>

          {/* Activa */}
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={activa}
              onChange={(e) => setActiva(e.target.checked)}
              className="w-4 h-4 rounded accent-emerald-500"
            />
            <span className="text-[13px] text-[var(--text-primary)]">Plantilla activa</span>
            <span className="text-[11.5px] text-[var(--text-tertiary)] ml-1">
              (si no, no aparecerá en el selector de envío)
            </span>
          </label>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-[var(--bg-secondary)] flex items-center justify-end gap-2 px-6 h-14 border-t border-[var(--border-primary)]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 h-9 rounded-xl text-[13px] font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !nombre.trim() || !contenido.trim()}
            className="inline-flex items-center gap-2 px-4 h-9 rounded-xl bg-emerald-600 text-white text-[13px] font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {initial ? 'Guardar cambios' : 'Crear plantilla'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   A/B Test Editor modal
============================================================ */

function ABTestEditor({
  plantillas,
  onClose,
  onSave,
}: {
  plantillas: Plantilla[];
  onClose: () => void;
  onSave: (input: {
    nombre: string;
    descripcion: string;
    categoria: string;
    variantes: { plantillaId: string; peso: number }[];
  }) => Promise<void>;
}) {
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [categoria, setCategoria] = useState('general');
  const [variantes, setVariantes] = useState<{ plantillaId: string; peso: number }[]>([
    { plantillaId: '', peso: 50 },
    { plantillaId: '', peso: 50 },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const plantillasFiltradas = plantillas.filter((p) => p.categoria === categoria && p.activa);

  const updateVariante = (idx: number, field: 'plantillaId' | 'peso', value: string | number) => {
    setVariantes((prev) =>
      prev.map((v, i) => (i === idx ? { ...v, [field]: value } : v))
    );
  };

  const addVariante = () => {
    const count = variantes.length + 1;
    const peso = Math.floor(100 / count);
    const resto = 100 - peso * count;
    setVariantes(
      variantes.map(() => ({ plantillaId: '', peso: peso + (resto > 0 ? 1 : 0) })).concat(
        resto > 0 ? Array(resto).fill({ plantillaId: '', peso: peso + 1 }) : []
      )
    );
  };

  const removeVariante = (idx: number) => {
    if (variantes.length <= 2) return;
    const next = variantes.filter((_, i) => i !== idx);
    const total = next.reduce((s, v) => s + v.peso, 0);
    if (total !== 100) {
      const diff = 100 - total;
      next[0].peso += diff;
    }
    setVariantes(next);
  };

  const handleSave = async () => {
    setError('');
    if (!nombre.trim()) { setError('El nombre es obligatorio'); return; }
    const validas = variantes.filter((v) => v.plantillaId);
    if (validas.length < 2) { setError('Selecciona al menos 2 plantillas'); return; }
    const totalPeso = variantes.reduce((s, v) => s + v.peso, 0);
    if (totalPeso !== 100) { setError(`La suma de pesos debe ser 100%, actual: ${totalPeso}%`); return; }

    setSaving(true);
    try {
      await onSave({ nombre, descripcion, categoria, variantes: validas });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[640px] max-h-[90vh] overflow-y-auto bg-[var(--bg-secondary)] rounded-2xl shadow-2xl border border-[var(--border-primary)] animate-in zoom-in-95 duration-200"
      >
        <div className="sticky top-0 bg-[var(--bg-secondary)] flex items-center justify-between px-6 h-14 border-b border-[var(--border-primary)] z-10">
          <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">Nuevo test A/B</h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-md hover:bg-[var(--surface-hover)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-[13px] font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="text-[11px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)]">Nombre del test</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="ej. Test bienvenida - formal vs casual"
              className="mt-1 w-full h-10 px-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[14px] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-violet-500/30"
            />
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)]">Descripción (opcional)</label>
            <input
              type="text"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="¿Qué estás probando?"
              className="mt-1 w-full h-10 px-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[14px] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-violet-500/30"
            />
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)]">Categoría</label>
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className="mt-1 w-full h-10 px-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[14px] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-violet-500/30"
            >
              {CATEGORIAS.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)]">Variantes</label>
            <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5 mb-2">
              Selecciona plantillas y define el % de tráfico para cada una.
            </p>
            <div className="space-y-2">
              {variantes.map((v, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <select
                    value={v.plantillaId}
                    onChange={(e) => updateVariante(idx, 'plantillaId', e.target.value)}
                    className="flex-1 h-10 px-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[13px] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                  >
                    <option value="">Seleccionar plantilla...</option>
                    {plantillasFiltradas.map((p) => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                  <div className="w-24">
                    <input
                      type="number"
                      min={1}
                      max={99}
                      value={v.peso}
                      onChange={(e) => updateVariante(idx, 'peso', parseInt(e.target.value) || 0)}
                      className="w-full h-10 px-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[14px] text-[var(--text-primary)] text-center focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                    />
                  </div>
                  <span className="text-[12px] text-[var(--text-tertiary)]">%</span>
                  {variantes.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeVariante(idx)}
                      className="p-2 rounded-md hover:bg-red-500/10 text-[var(--text-tertiary)] hover:text-red-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {plantillasFiltradas.length > variantes.length && (
              <button
                type="button"
                onClick={addVariante}
                className="mt-2 inline-flex items-center gap-1.5 px-3 h-8 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[12px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-tertiary)] transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                Añadir variante
              </button>
            )}
          </div>
        </div>

        <div className="sticky bottom-0 bg-[var(--bg-secondary)] flex items-center justify-end gap-2 px-6 h-14 border-t border-[var(--border-primary)]">
          <button type="button" onClick={onClose} className="px-4 h-9 rounded-xl text-[13px] font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]">
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 h-9 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white text-[13px] font-semibold hover:shadow-lg hover:shadow-violet-500/25 disabled:opacity-50 transition-all"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <FlaskConical className="w-4 h-4" />}
            Crear test A/B
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   A/B Test Metrics modal
============================================================ */

function ABTestMetricsModal({
  metrics,
  onClose,
}: {
  metrics: any;
  onClose: () => void;
}) {
  const maxEnvios = Math.max(...(metrics.metricas?.map((m: any) => m.envios) || [0]));

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[560px] max-h-[90vh] overflow-y-auto bg-[var(--bg-secondary)] rounded-2xl shadow-2xl border border-[var(--border-primary)] animate-in zoom-in-95 duration-200"
      >
        <div className="sticky top-0 bg-[var(--bg-secondary)] flex items-center justify-between px-6 h-14 border-b border-[var(--border-primary)] z-10">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-violet-600" />
            <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">Métricas del test</h2>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-md hover:bg-[var(--surface-hover)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[13px] font-semibold text-[var(--text-primary)]">{metrics.nombre}</span>
            <span className={`inline-flex items-center px-2 h-5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
              metrics.estado === 'ACTIVO'
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-500/20'
                : 'bg-slate-500/10 text-slate-700 dark:text-slate-400 ring-1 ring-slate-500/20'
            }`}>
              {metrics.estado}
            </span>
          </div>

          {metrics.metricas?.map((m: any, idx: number) => {
            const isWinner = m.envios === maxEnvios && maxEnvios > 0;
            return (
              <div key={m.varianteId} className={`p-4 rounded-xl border ${isWinner ? 'border-violet-500/30 bg-violet-500/5' : 'border-[var(--border-primary)] bg-[var(--bg-tertiary)]/30'}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-[11px] font-bold">
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span className="text-[14px] font-semibold text-[var(--text-primary)]">{m.plantillaNombre}</span>
                    {isWinner && (
                      <span className="inline-flex items-center gap-1 px-1.5 h-5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[10px] font-bold ring-1 ring-amber-500/20">
                        <Trophy className="w-3 h-3" />
                        Líder
                      </span>
                    )}
                  </div>
                  <span className="text-[13px] font-bold text-violet-600 dark:text-violet-400">{m.peso}% tráfico</span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-primary)]">
                    <p className="text-[20px] font-bold text-[var(--text-primary)]">{m.envios}</p>
                    <p className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">Envíos</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-primary)]">
                    <p className="text-[20px] font-bold text-[var(--text-primary)]">{m.respuestas}</p>
                    <p className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">Respuestas</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-primary)]">
                    <p className="text-[20px] font-bold text-emerald-600">{m.tasaRespuesta}%</p>
                    <p className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">Tasa</p>
                  </div>
                </div>

                {/* Barra de progreso comparativa */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-[11px] text-[var(--text-tertiary)] mb-1">
                    <span>Participación</span>
                    <span>{m.porcentajeTráfico}% del tráfico total</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-violet-500 transition-all"
                      style={{ width: `${Math.max(parseFloat(m.porcentajeTráfico) || 0, 5)}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}

          {!metrics.metricas?.length && (
            <div className="text-center py-8">
              <BarChart3 className="w-8 h-8 text-[var(--text-tertiary)] mx-auto mb-2" />
              <p className="text-[13px] text-[var(--text-secondary)]">Aún no hay métricas disponibles</p>
              <p className="text-[12px] text-[var(--text-tertiary)] mt-1">Los datos aparecerán cuando se realicen envíos</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Chat Tab — vista de conversaciones (modo manual / híbrido)
============================================================ */

function ChatTab({
  conversaciones,
  chatSearch,
  setChatSearch,
  chatLeadId,
  setChatLeadId,
  chatHilo,
  chatLoading,
  composerText,
  setComposerText,
  askingMinimax,
  pegandoIn,
  setPegandoIn,
  inboundText,
  setInboundText,
  onSend,
  onSendAuto,
  onAddInbound,
  onAskMinimax,
  onNuevoChat,
  onOpenSparring,
  onOpenStoryboard,
  leadActual,
  wwebListo,
}: {
  conversaciones: ConversacionLista[];
  chatSearch: string;
  setChatSearch: (s: string) => void;
  chatLeadId: string | null;
  setChatLeadId: (id: string | null) => void;
  chatHilo: ConversacionHilo | null;
  chatLoading: boolean;
  composerText: string;
  setComposerText: (s: string) => void;
  askingMinimax: boolean;
  pegandoIn: boolean;
  setPegandoIn: (b: boolean) => void;
  inboundText: string;
  setInboundText: (s: string) => void;
  onSend: () => void;
  onSendAuto: () => void;
  onAddInbound: () => void;
  onAskMinimax: () => void;
  onNuevoChat: () => void;
  onOpenSparring: (leadId: string) => void;
  onOpenStoryboard: (leadId: string) => void;
  leadActual: { id: string; nombre: string; empresa: string | null; telefono: string | null; estado: string } | null;
  wwebListo: boolean;
}) {
  // Whisper Mode
  const [whisperOn, setWhisperOn] = useState(false);
  const [whisperData, setWhisperData] = useState<{ tips: any[]; puntuacionBorrador?: number; resumen?: string } | null>(null);
  const [whisperLoading, setWhisperLoading] = useState(false);

  // Snippets autocomplete
  const [snippetMenu, setSnippetMenu] = useState<{ open: boolean; query: string }>({ open: false, query: '' });
  const [snippetsList, setSnippetsList] = useState<{ comando: string; descripcion: string }[]>([]);

  useEffect(() => {
    apiClient
      .getWhatsappSnippets()
      .then((res: any) => setSnippetsList(res.data || []))
      .catch(() => setSnippetsList([]));
  }, []);

  // Debounce de Whisper: cuando el borrador cambia, espera 1.2s y consulta
  useEffect(() => {
    if (!whisperOn || !chatLeadId) {
      setWhisperData(null);
      return;
    }
    const t = setTimeout(async () => {
      setWhisperLoading(true);
      try {
        const res: any = await apiClient.whatsappWhisper({
          leadId: chatLeadId,
          borrador: composerText,
        });
        setWhisperData(res.data);
      } catch {
        /* silent */
      } finally {
        setWhisperLoading(false);
      }
    }, 1200);
    return () => clearTimeout(t);
  }, [whisperOn, chatLeadId, composerText]);

  const insertSnippet = async (cmd: string) => {
    try {
      const res: any = await apiClient.resolverWhatsappSnippet({
        comando: cmd,
        leadId: chatLeadId || undefined,
        borrador: composerText,
      });
      const { texto, reemplazaBorrador } = res.data;
      if (reemplazaBorrador) {
        setComposerText(texto);
      } else {
        // Reemplaza la coincidencia /xxx por el texto resuelto
        const re = new RegExp(`\\/${cmd}\\b`);
        if (re.test(composerText)) {
          setComposerText(composerText.replace(re, texto));
        } else {
          setComposerText((composerText.trimEnd() + (composerText ? ' ' : '') + texto).trim());
        }
      }
      setSnippetMenu({ open: false, query: '' });
    } catch (e: any) {
      // Mostrar como toast via alert simple; el componente padre tiene su propio toast
      alert(e.message || 'No se pudo resolver el snippet');
    }
  };

  const onComposerChange = (val: string) => {
    setComposerText(val);
    // Detectar slash al final del texto: "/xxx" sin espacio detrás
    const m = val.match(/\/(\w*)$/);
    if (m) setSnippetMenu({ open: true, query: m[1] });
    else setSnippetMenu({ open: false, query: '' });
  };

  const snippetsFiltrados = snippetsList.filter((s) =>
    s.comando.toLowerCase().startsWith(snippetMenu.query.toLowerCase()),
  );
  const bottomRef = (el: HTMLDivElement | null) => {
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'end' });
  };

  return (
    <div className="grid grid-cols-12 gap-4 flex-1 min-h-[600px]">
      {/* === Lista de conversaciones === */}
      <aside className="col-span-12 lg:col-span-4 xl:col-span-3 flex flex-col rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] overflow-hidden">
        <div className="p-3 border-b border-[var(--border-primary)] space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)]">
              Chats ({conversaciones.length})
            </p>
            <button
              type="button"
              onClick={onNuevoChat}
              className="inline-flex items-center gap-1 px-2.5 h-7 rounded-md bg-emerald-600 text-white text-[11.5px] font-semibold hover:bg-emerald-700 active:scale-95 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              Nuevo
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-tertiary)]" />
            <input
              type="text"
              value={chatSearch}
              onChange={(e) => setChatSearch(e.target.value)}
              placeholder="Buscar en chats..."
              className="w-full h-8 pl-8 pr-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[12.5px] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversaciones.length === 0 ? (
            <div className="p-6 text-center">
              <Inbox className="w-8 h-8 text-[var(--text-tertiary)] mx-auto mb-2" />
              <p className="text-[12.5px] text-[var(--text-secondary)]">Aún no hay chats abiertos</p>
              <p className="text-[11px] text-[var(--text-tertiary)] mt-1">
                Envía un WhatsApp desde la pestaña &quot;Enviar&quot; o crea uno nuevo.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-primary)]">
              {conversaciones.map((c) => {
                const active = c.leadId === chatLeadId;
                const ultimo = c.mensajes?.[0];
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setChatLeadId(c.leadId)}
                    className={`w-full text-left flex items-start gap-3 px-3 py-3 transition-colors ${
                      active
                        ? 'bg-emerald-500/[0.08] border-l-2 border-emerald-500'
                        : 'hover:bg-[var(--surface-hover)] border-l-2 border-transparent'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shrink-0">
                      <span className="text-white text-[13px] font-bold">
                        {c.lead.nombre.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-[13px] font-semibold text-[var(--text-primary)] truncate">
                          {c.lead.nombre}
                        </p>
                        <span className="text-[10.5px] text-[var(--text-tertiary)] tabular-nums shrink-0">
                          {formatRelativeTime(c.ultimaActividad)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-1 mt-0.5">
                        <p className="text-[11.5px] text-[var(--text-tertiary)] truncate flex items-center gap-1">
                          {ultimo?.direccion === 'IN' && (
                            <ArrowDownLeft className="w-3 h-3 text-emerald-500 shrink-0" />
                          )}
                          {ultimo?.direccion === 'OUT' && (
                            <Check className="w-3 h-3 text-blue-500 shrink-0" />
                          )}
                          {ultimo?.cuerpo || c.lead.empresa || 'Sin mensajes aún'}
                        </p>
                        {c.noLeidos > 0 && (
                          <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-emerald-500 text-white text-[10px] font-bold shrink-0">
                            {c.noLeidos}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </aside>

      {/* === Panel del chat === */}
      <section className="col-span-12 lg:col-span-8 xl:col-span-9 flex flex-col rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] overflow-hidden">
        {!chatLeadId ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center">
              <MessageCircle className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-3" />
              <p className="text-[14px] font-medium text-[var(--text-primary)]">Selecciona un chat</p>
              <p className="text-[12.5px] text-[var(--text-tertiary)] mt-1">
                Elige una conversación de la izquierda o crea una nueva.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Header del chat */}
            <div className="flex items-center gap-3 px-4 h-14 border-b border-[var(--border-primary)] shrink-0">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shrink-0">
                <span className="text-white text-[13px] font-bold">
                  {(leadActual?.nombre || '?').charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold text-[var(--text-primary)] truncate">
                  {leadActual?.nombre || '...'}
                </p>
                <p className="text-[11.5px] text-[var(--text-tertiary)] truncate font-mono">
                  {leadActual?.telefono || '—'}
                  {leadActual?.empresa ? ` · ${leadActual.empresa}` : ''}
                  {leadActual?.estado ? ` · ${leadActual.estado}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  title="Storyboard del lead — journey completo"
                  onClick={() => chatLeadId && onOpenStoryboard(chatLeadId)}
                  className="inline-flex items-center gap-1 px-2 h-8 rounded-md text-[11.5px] font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-colors"
                >
                  <Film className="w-3.5 h-3.5" />
                  Storyboard
                </button>
                <button
                  type="button"
                  title="Ensayar conversación con un clon IA del lead"
                  onClick={() => chatLeadId && onOpenSparring(chatLeadId)}
                  className="inline-flex items-center gap-1 px-2 h-8 rounded-md text-[11.5px] font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-colors"
                >
                  <Drama className="w-3.5 h-3.5" />
                  Sparring
                </button>
                <button
                  type="button"
                  title="Activar coach proactivo (Whisper)"
                  onClick={() => setWhisperOn((v) => !v)}
                  className={`inline-flex items-center gap-1 px-2 h-8 rounded-md text-[11.5px] font-medium transition-colors ${
                    whisperOn
                      ? 'bg-violet-500/15 text-violet-700 dark:text-violet-300'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Headphones className="w-3.5 h-3.5" />
                  Whisper
                </button>
              </div>
            </div>

            {/* Hilo */}
            <div className="flex-1 overflow-y-auto p-4 bg-[var(--bg-primary)]">
              {chatLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-5 h-5 animate-spin text-[var(--text-tertiary)]" />
                </div>
              ) : !chatHilo || chatHilo.mensajes.length === 0 ? (
                <div className="flex items-center justify-center py-12 text-center">
                  <div>
                    <MessageCircle className="w-10 h-10 text-[var(--text-tertiary)] mx-auto mb-2" />
                    <p className="text-[13px] text-[var(--text-secondary)]">Sin mensajes todavía</p>
                    <p className="text-[11.5px] text-[var(--text-tertiary)] mt-1">
                      Escribe abajo y pulsa &quot;Enviar por WhatsApp&quot; para iniciar el hilo.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 max-w-[720px] mx-auto">
                  {chatHilo.mensajes.map((m) => {
                    const out = m.direccion === 'OUT';
                    return (
                      <div
                        key={m.id}
                        className={`flex ${out ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] px-3 py-2 rounded-2xl text-[13.5px] leading-relaxed whitespace-pre-wrap shadow-sm ${
                            out
                              ? 'bg-emerald-500 text-white rounded-br-md'
                              : 'bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-primary)] rounded-bl-md'
                          }`}
                        >
                          {m.iaGenerado && out && (
                            <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold opacity-80 mb-1">
                              <Bot className="w-3 h-3" />
                              IA
                            </div>
                          )}
                          {m.cuerpo}
                          <div
                            className={`text-[10px] mt-1 tabular-nums ${
                              out ? 'text-emerald-50/80 text-right' : 'text-[var(--text-tertiary)]'
                            }`}
                          >
                            {formatRelativeTime(m.createdAt)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>
              )}
            </div>

            {/* Pegar respuesta del lead (inline) */}
            {pegandoIn && (
              <div className="px-4 py-3 border-t border-[var(--border-primary)] bg-amber-500/5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11.5px] uppercase tracking-wider font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                    <ArrowDownLeft className="w-3.5 h-3.5" />
                    Pega aquí lo que te ha respondido el lead
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setPegandoIn(false);
                      setInboundText('');
                    }}
                    className="p-1 rounded-md hover:bg-[var(--surface-hover)] text-[var(--text-tertiary)]"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <textarea
                  value={inboundText}
                  onChange={(e) => setInboundText(e.target.value)}
                  rows={3}
                  placeholder="Copia el mensaje del lead desde WhatsApp y pégalo aquí..."
                  className="w-full p-2.5 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[13px] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                  autoFocus
                />
                <div className="flex justify-end mt-2">
                  <button
                    type="button"
                    disabled={!inboundText.trim()}
                    onClick={onAddInbound}
                    className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg bg-amber-600 text-white text-[12.5px] font-semibold hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Guardar respuesta
                  </button>
                </div>
              </div>
            )}

            {/* Whisper Mode panel (entre hilo y composer) */}
            {whisperOn && (
              <div className="border-t border-[var(--border-primary)] px-4 py-2.5 bg-violet-500/5 shrink-0">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <Headphones className="w-3.5 h-3.5 text-violet-600" />
                    <span className="text-[11px] uppercase tracking-wider font-semibold text-violet-700 dark:text-violet-300">
                      Whisper · coach en vivo
                    </span>
                    {whisperLoading && <Loader2 className="w-3 h-3 animate-spin text-violet-600" />}
                    {whisperData?.puntuacionBorrador !== undefined && (
                      <span className="ml-2 text-[10.5px] tabular-nums font-mono text-violet-600 dark:text-violet-300">
                        Borrador: {whisperData.puntuacionBorrador}/100
                      </span>
                    )}
                  </div>
                </div>
                {whisperData?.tips && whisperData.tips.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {whisperData.tips.map((t: any, i: number) => {
                      const color =
                        t.tipo === 'warning'
                          ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300 ring-rose-500/20'
                          : t.tipo === 'opportunity'
                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-emerald-500/20'
                            : t.tipo === 'improvement'
                              ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-amber-500/20'
                              : 'bg-sky-500/10 text-sky-700 dark:text-sky-300 ring-sky-500/20';
                      const Icon =
                        t.tipo === 'warning' ? AlertTriangle : t.tipo === 'opportunity' ? Zap : Lightbulb;
                      return (
                        <div
                          key={i}
                          title={t.detalle}
                          className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] ring-1 ${color}`}
                        >
                          <Icon className="w-3 h-3" />
                          <span className="font-semibold">{t.titulo}:</span>
                          <span className="opacity-90">{t.detalle}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-[11px] text-[var(--text-tertiary)] italic">
                    {whisperLoading ? 'Analizando…' : 'Escribe algo o espera nueva actividad del lead para recibir tips.'}
                  </p>
                )}
              </div>
            )}

            {/* Composer */}
            <div className="border-t border-[var(--border-primary)] p-3 shrink-0 bg-[var(--bg-secondary)]">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <button
                  type="button"
                  onClick={onAskMinimax}
                  disabled={askingMinimax}
                  title="Pide a MiniMax que sugiera la siguiente respuesta usando todo el hilo como contexto. Si escribes algo arriba, lo usa como instrucción extra."
                  className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg bg-gradient-to-r from-violet-500 to-purple-600 text-white text-[12px] font-semibold hover:shadow-md hover:shadow-violet-500/25 active:scale-95 disabled:opacity-50 transition-all"
                >
                  {askingMinimax ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  {askingMinimax ? 'Pensando...' : 'Pedir opinión a MiniMax'}
                </button>
                <button
                  type="button"
                  onClick={() => setPegandoIn(true)}
                  className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[12px] font-semibold ring-1 ring-amber-500/20 hover:bg-amber-500/20 transition-all"
                >
                  <ClipboardPaste className="w-3.5 h-3.5" />
                  Pegar respuesta del lead
                </button>
                <span className="text-[10.5px] text-[var(--text-tertiary)] ml-auto">
                  Escribe <kbd className="px-1 rounded bg-[var(--bg-tertiary)] border border-[var(--border-primary)] font-mono">/</kbd> para insertar snippets
                </span>
              </div>
              <div className="relative flex items-end gap-2">
                {/* Snippets dropdown */}
                {snippetMenu.open && snippetsFiltrados.length > 0 && (
                  <div className="absolute bottom-full left-0 mb-1 w-[320px] max-h-[220px] overflow-y-auto rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] shadow-2xl z-50">
                    <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)] border-b border-[var(--border-primary)] flex items-center gap-1">
                      <Slash className="w-3 h-3" />
                      Snippets
                    </div>
                    {snippetsFiltrados.map((s) => (
                      <button
                        key={s.comando}
                        type="button"
                        onClick={() => insertSnippet(s.comando)}
                        className="w-full text-left px-3 py-2 hover:bg-[var(--surface-hover)] transition-colors flex items-center gap-2"
                      >
                        <code className="text-[12px] font-mono text-emerald-600 dark:text-emerald-400">/{s.comando}</code>
                        <span className="text-[11.5px] text-[var(--text-secondary)] flex-1 truncate">
                          {s.descripcion}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                <textarea
                  value={composerText}
                  onChange={(e) => onComposerChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape' && snippetMenu.open) {
                      e.preventDefault();
                      setSnippetMenu({ open: false, query: '' });
                      return;
                    }
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      onSend();
                    }
                    if (e.key === 'Enter' && e.altKey) {
                      e.preventDefault();
                      onSendAuto();
                    }
                  }}
                  rows={3}
                  placeholder="Escribe el mensaje (Ctrl+Enter para abrir WA · Alt+Enter para auto-envío · / para snippets)..."
                  className="flex-1 p-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[13.5px] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-emerald-500/30 resize-none"
                />
                <button
                  type="button"
                  onClick={onSend}
                  disabled={!composerText.trim()}
                  className="inline-flex items-center gap-2 h-10 px-3 rounded-xl bg-emerald-600 text-white text-[13px] font-semibold hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm shadow-emerald-600/20"
                >
                  <Send className="w-4 h-4" />
                  Abrir
                </button>
                <button
                  type="button"
                  onClick={onSendAuto}
                  disabled={!composerText.trim() || !wwebListo}
                  title={!wwebListo ? 'Inicia WhatsApp Web primero' : 'Enviar automáticamente'}
                  className="inline-flex items-center gap-2 h-10 px-3 rounded-xl bg-violet-600 text-white text-[13px] font-semibold hover:bg-violet-700 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm shadow-violet-600/20"
                >
                  <Rocket className="w-4 h-4" />
                  Auto
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

/* ============================================================
   Modal para iniciar un nuevo chat con un lead
============================================================ */

function IniciarChatModal({
  softwareId,
  onPick,
  onClose,
}: {
  softwareId: string;
  onPick: (lead: Lead) => void;
  onClose: () => void;
}) {
  const [busqueda, setBusqueda] = useState('');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!softwareId) return;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const params: Record<string, string> = {
          softwareId,
          hasTelefono: 'true',
          tipoTelefono: 'movil',
          limit: '40',
          page: '1',
        };
        if (busqueda.trim()) params.search = busqueda.trim();
        const res: any = await apiClient.getLeads(params);
        setLeads(res.data?.leads || []);
      } catch {
        setLeads([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [softwareId, busqueda]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[520px] max-h-[80vh] flex flex-col bg-[var(--bg-secondary)] rounded-2xl shadow-2xl border border-[var(--border-primary)] animate-in zoom-in-95 duration-200"
      >
        <div className="flex items-center justify-between px-5 h-12 border-b border-[var(--border-primary)] shrink-0">
          <h2 className="text-[14px] font-semibold text-[var(--text-primary)]">Iniciar chat con lead</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-[var(--surface-hover)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3 border-b border-[var(--border-primary)] shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-tertiary)]" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar lead por nombre, email o empresa..."
              autoFocus
              className="w-full h-9 pl-9 pr-3 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[13px] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-8 flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-[var(--text-tertiary)]" />
            </div>
          ) : leads.length === 0 ? (
            <div className="p-8 text-center">
              <Users className="w-8 h-8 text-[var(--text-tertiary)] mx-auto mb-2" />
              <p className="text-[13px] text-[var(--text-secondary)]">Sin leads con móvil</p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-primary)]">
              {leads.map((lead) => (
                <button
                  key={lead.id}
                  type="button"
                  onClick={() => onPick(lead)}
                  className="w-full text-left flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--surface-hover)] transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shrink-0">
                    <span className="text-white text-[12px] font-bold">
                      {lead.nombre.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-[var(--text-primary)] truncate">{lead.nombre}</p>
                    <p className="text-[11.5px] text-[var(--text-tertiary)] truncate font-mono">
                      {lead.telefono} {lead.empresa ? `· ${lead.empresa}` : ''}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   CEMENTERIO — leads inactivos y resurrección
============================================================ */

function CementerioTab({
  leads,
  dias,
  setDias,
  loading,
  resurrecciones,
  setResurrecciones,
  onGenerar,
  onEnviar,
}: {
  leads: any[];
  dias: number;
  setDias: (n: number) => void;
  loading: boolean;
  resurrecciones: Record<string, string>;
  setResurrecciones: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onGenerar: (leadId: string, pretexto?: string) => Promise<void>;
  onEnviar: (leadId: string) => Promise<void>;
}) {
  const [pretextoGlobal, setPretextoGlobal] = useState('');
  const [generandoTodos, setGenerandoTodos] = useState(false);

  const generarTodos = async () => {
    setGenerandoTodos(true);
    try {
      for (const lead of leads) {
        await onGenerar(lead.id, pretextoGlobal || undefined);
      }
    } finally {
      setGenerandoTodos(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap p-5 rounded-2xl bg-gradient-to-br from-slate-900/5 to-slate-900/[0.02] dark:from-slate-100/5 dark:to-transparent border border-[var(--border-primary)]">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-slate-900 dark:bg-slate-100/10 flex items-center justify-center">
            <Skull className="w-6 h-6 text-white dark:text-slate-100" />
          </div>
          <div>
            <h2 className="text-[18px] font-bold text-[var(--text-primary)]">Cementerio</h2>
            <p className="text-[12.5px] text-[var(--text-tertiary)]">
              Leads NO_RESPONDE / RECHAZADO sin movimiento — MiniMax escribe el mensaje de resurrección por ti.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <label className="text-[12px] text-[var(--text-secondary)]">Inactivos hace ≥</label>
          <select
            value={dias}
            onChange={(e) => setDias(Number(e.target.value))}
            className="h-9 px-2.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[12.5px] text-[var(--text-primary)]"
          >
            {[15, 30, 60, 90, 180, 365].map((d) => (
              <option key={d} value={d}>
                {d} días
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Pretexto global + acción masiva */}
      <div className="p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-primary)]">
        <label className="text-[11px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)]">
          Pretexto global (opcional)
        </label>
        <div className="flex gap-2 mt-2">
          <input
            type="text"
            value={pretextoGlobal}
            onChange={(e) => setPretextoGlobal(e.target.value)}
            placeholder="ej. Nuevo módulo de IA que automatiza propuestas — útil para ti porque..."
            className="flex-1 h-10 px-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[13px] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          />
          <button
            type="button"
            disabled={leads.length === 0 || generandoTodos}
            onClick={generarTodos}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-[13px] font-semibold hover:shadow-md disabled:opacity-50 transition-all"
          >
            {generandoTodos ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
            Resucitar todos ({leads.length})
          </button>
        </div>
        <p className="text-[10.5px] text-[var(--text-tertiary)] mt-1.5">
          Si lo dejas vacío, MiniMax inventa un pretexto distinto por cada lead.
        </p>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="p-12 text-center">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--text-tertiary)] mx-auto" />
        </div>
      ) : leads.length === 0 ? (
        <div className="p-12 rounded-2xl bg-[var(--bg-secondary)] border border-dashed border-[var(--border-primary)] text-center">
          <Skull className="w-10 h-10 text-[var(--text-tertiary)] mx-auto mb-3" />
          <p className="text-[14px] font-medium text-[var(--text-primary)]">El cementerio está vacío</p>
          <p className="text-[12.5px] text-[var(--text-tertiary)] mt-1">
            No hay leads NO_RESPONDE/RECHAZADO con más de {dias} días sin contacto.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {leads.map((lead) => {
            const mensaje = resurrecciones[lead.id];
            return (
              <div
                key={lead.id}
                className="p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] hover:border-[var(--text-tertiary)] transition-colors flex flex-col"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center shrink-0">
                    <span className="text-white text-[13px] font-bold">
                      {lead.nombre.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13.5px] font-semibold text-[var(--text-primary)] truncate">{lead.nombre}</p>
                    <p className="text-[11px] text-[var(--text-tertiary)] truncate">
                      {lead.empresa || lead.email || '—'}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-mono px-1.5 h-[16px] rounded bg-slate-500/10 text-slate-700 dark:text-slate-300 ring-1 ring-slate-500/20 inline-flex items-center">
                        {lead.estado}
                      </span>
                      <span className="text-[10px] text-[var(--text-tertiary)]">
                        {lead.diasInactivo ? `${lead.diasInactivo}d sin contacto` : 'nunca contactado'}
                      </span>
                    </div>
                  </div>
                </div>

                {mensaje ? (
                  <textarea
                    value={mensaje}
                    onChange={(e) => setResurrecciones((prev) => ({ ...prev, [lead.id]: e.target.value }))}
                    rows={4}
                    className="w-full p-2.5 rounded-lg bg-[var(--bg-tertiary)] border border-emerald-500/30 text-[12.5px] text-[var(--text-primary)] font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-emerald-500/30 resize-none flex-1"
                  />
                ) : (
                  <div className="flex-1 p-2.5 rounded-lg bg-[var(--bg-tertiary)] border border-dashed border-[var(--border-primary)] text-[12px] text-[var(--text-tertiary)] italic flex items-center justify-center min-h-[100px]">
                    Pulsa &quot;Generar&quot; para que MiniMax escriba el mensaje.
                  </div>
                )}

                <div className="flex items-center gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => onGenerar(lead.id, pretextoGlobal || undefined)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 h-8 rounded-lg bg-violet-500/10 text-violet-700 dark:text-violet-300 text-[12px] font-semibold ring-1 ring-violet-500/20 hover:bg-violet-500/20 transition-all"
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                    {mensaje ? 'Regenerar' : 'Generar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => onEnviar(lead.id)}
                    disabled={!mensaje}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 h-8 rounded-lg bg-emerald-600 text-white text-[12px] font-semibold hover:bg-emerald-700 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Enviar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   ARENA — battle de plantillas vs perfiles sintéticos
============================================================ */

function ArenaTab({
  plantillas,
  softwareId,
  showToast,
}: {
  plantillas: Plantilla[];
  softwareId: string;
  showToast: (k: 'ok' | 'err', m: string) => void;
}) {
  const [vista, setVista] = useState<'nueva' | 'historial'>('nueva');
  const [plantillaAId, setPlantillaAId] = useState('');
  const [plantillaBId, setPlantillaBId] = useState('');
  const [perfiles, setPerfiles] = useState<{ nombre: string; descripcion: string }[]>([]);
  const [resultado, setResultado] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [cantidadPerfiles, setCantidadPerfiles] = useState(5);
  const [generandoPerfiles, setGenerandoPerfiles] = useState(false);
  const [battles, setBattles] = useState<any[]>([]);
  const [battleAbierta, setBattleAbierta] = useState<any | null>(null);
  const [loadingBattles, setLoadingBattles] = useState(false);

  const cargarBattles = async () => {
    if (!softwareId) return;
    setLoadingBattles(true);
    try {
      const res: any = await apiClient.getWhatsappArenaBattles(softwareId);
      setBattles(res.data || []);
    } catch (e: any) {
      showToast('err', e.message || 'Error cargando historial');
    } finally {
      setLoadingBattles(false);
    }
  };

  useEffect(() => {
    if (vista === 'historial') void cargarBattles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vista, softwareId]);

  const generarPerfilesIA = async (modo: 'replace' | 'append') => {
    if (!softwareId) {
      showToast('err', 'Selecciona un workspace primero');
      return;
    }
    setGenerandoPerfiles(true);
    try {
      const res: any = await apiClient.whatsappArenaPerfiles({ softwareId, cantidad: cantidadPerfiles });
      const nuevos = res.data.perfiles || [];
      setPerfiles((prev) => (modo === 'replace' ? nuevos : [...prev, ...nuevos]));
      showToast('ok', `${nuevos.length} perfiles generados por ${res.data.modelo}`);
    } catch (e: any) {
      showToast('err', e.message || 'Error generando perfiles');
    } finally {
      setGenerandoPerfiles(false);
    }
  };

  const eliminarBattle = async (id: string) => {
    if (!confirm('¿Eliminar esta batalla del historial?')) return;
    try {
      await apiClient.deleteWhatsappArenaBattle(id);
      showToast('ok', 'Batalla eliminada');
      setBattleAbierta(null);
      void cargarBattles();
    } catch (e: any) {
      showToast('err', e.message || 'Error eliminando');
    }
  };

  const cargarBattleEnNueva = (b: any) => {
    setPlantillaAId(b.plantillaAId);
    setPlantillaBId(b.plantillaBId);
    setPerfiles((b.perfiles as any) || []);
    setResultado(null);
    setVista('nueva');
  };

  const runBatalla = async () => {
    if (!plantillaAId || !plantillaBId) {
      showToast('err', 'Selecciona ambas plantillas');
      return;
    }
    if (plantillaAId === plantillaBId) {
      showToast('err', 'Las plantillas A y B deben ser diferentes');
      return;
    }
    if (perfiles.length === 0) {
      showToast('err', 'Define al menos 1 perfil');
      return;
    }
    setLoading(true);
    setResultado(null);
    try {
      const res: any = await apiClient.whatsappArena({ plantillaAId, plantillaBId, perfiles });
      setResultado(res.data);
      if (res.data?.guardada) {
        showToast('ok', 'Batalla guardada en el historial');
      }
    } catch (e: any) {
      showToast('err', e.message || 'Error en la batalla');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap p-5 rounded-2xl bg-gradient-to-br from-rose-500/10 to-orange-500/5 border border-rose-500/20">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-500 to-orange-600 flex items-center justify-center">
            <Swords className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-[18px] font-bold text-[var(--text-primary)]">Arena</h2>
            <p className="text-[12.5px] text-[var(--text-tertiary)]">
              Enfrenta 2 plantillas contra N perfiles de lead simulados. MiniMax dice cuál gana en cada perfil — sin gastar envíos reales.
            </p>
          </div>
        </div>
        {/* Switch Nueva | Historial */}
        <div className="inline-flex rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-primary)] p-0.5">
          <button
            type="button"
            onClick={() => setVista('nueva')}
            className={`inline-flex items-center gap-1.5 px-3 h-8 rounded-md text-[12px] font-semibold transition-all ${
              vista === 'nueva' ? 'bg-gradient-to-r from-rose-500 to-orange-600 text-white shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Swords className="w-3.5 h-3.5" />
            Nueva batalla
          </button>
          <button
            type="button"
            onClick={() => setVista('historial')}
            className={`inline-flex items-center gap-1.5 px-3 h-8 rounded-md text-[12px] font-semibold transition-all ${
              vista === 'historial' ? 'bg-gradient-to-r from-rose-500 to-orange-600 text-white shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Historial ({battles.length || '—'})
          </button>
        </div>
      </div>

      {vista === 'historial' && (
        <ArenaHistorial
          loading={loadingBattles}
          battles={battles}
          plantillas={plantillas}
          onAbrir={(b) => setBattleAbierta(b)}
          onEliminar={eliminarBattle}
          onReejecutar={cargarBattleEnNueva}
        />
      )}

      {battleAbierta && (
        <BattleDetailModal
          battle={battleAbierta}
          onClose={() => setBattleAbierta(null)}
          onEliminar={eliminarBattle}
          showToast={showToast}
        />
      )}

      {vista === 'nueva' && (<>

      {/* Setup */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="p-4 rounded-2xl bg-[var(--bg-secondary)] border-2 border-blue-500/30">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-blue-500 text-white text-[12px] font-bold">A</span>
            <label className="text-[11px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)]">Plantilla A</label>
          </div>
          <select
            value={plantillaAId}
            onChange={(e) => setPlantillaAId(e.target.value)}
            className="w-full h-10 px-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[13px]"
          >
            <option value="">— Selecciona —</option>
            {plantillas.map((p) => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>
          {plantillaAId && (
            <p className="mt-2 p-2.5 rounded-lg bg-blue-500/5 text-[11.5px] font-mono text-[var(--text-secondary)] whitespace-pre-wrap line-clamp-5">
              {plantillas.find((p) => p.id === plantillaAId)?.contenido}
            </p>
          )}
        </div>
        <div className="p-4 rounded-2xl bg-[var(--bg-secondary)] border-2 border-rose-500/30">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-rose-500 text-white text-[12px] font-bold">B</span>
            <label className="text-[11px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)]">Plantilla B</label>
          </div>
          <select
            value={plantillaBId}
            onChange={(e) => setPlantillaBId(e.target.value)}
            className="w-full h-10 px-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[13px]"
          >
            <option value="">— Selecciona —</option>
            {plantillas.map((p) => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>
          {plantillaBId && (
            <p className="mt-2 p-2.5 rounded-lg bg-rose-500/5 text-[11.5px] font-mono text-[var(--text-secondary)] whitespace-pre-wrap line-clamp-5">
              {plantillas.find((p) => p.id === plantillaBId)?.contenido}
            </p>
          )}
        </div>
      </div>

      {/* Perfiles */}
      <div className="p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-primary)]">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <div>
            <label className="text-[11px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)]">
              Perfiles de lead a testear
            </label>
            <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">
              {perfiles.length} perfil{perfiles.length === 1 ? '' : 'es'} cargado{perfiles.length === 1 ? '' : 's'}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 px-2.5 h-9 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-primary)]">
              <label className="text-[11.5px] text-[var(--text-secondary)]">Generar</label>
              <select
                value={cantidadPerfiles}
                onChange={(e) => setCantidadPerfiles(Number(e.target.value))}
                className="h-7 px-1 rounded-md bg-transparent text-[12.5px] font-mono text-[var(--text-primary)] focus:outline-none"
              >
                {[3, 5, 8, 10, 15, 20].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              <label className="text-[11.5px] text-[var(--text-secondary)]">perfiles</label>
            </div>
            <button
              type="button"
              onClick={() => generarPerfilesIA('replace')}
              disabled={generandoPerfiles || !softwareId}
              title="Genera nuevos perfiles con IA usando la info del SaaS + tus leads reales"
              className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white text-[12.5px] font-semibold hover:shadow-md hover:shadow-violet-500/25 active:scale-95 disabled:opacity-50 transition-all"
            >
              {generandoPerfiles ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
              Generar con IA
            </button>
            {perfiles.length > 0 && (
              <button
                type="button"
                onClick={() => generarPerfilesIA('append')}
                disabled={generandoPerfiles}
                title="Añade más perfiles sin borrar los actuales"
                className="inline-flex items-center gap-1 px-2.5 h-9 rounded-lg bg-violet-500/10 text-violet-700 dark:text-violet-300 text-[12px] font-semibold ring-1 ring-violet-500/20 hover:bg-violet-500/20 disabled:opacity-50 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                Añadir
              </button>
            )}
            <button
              type="button"
              onClick={() => setPerfiles([...perfiles, { nombre: '', descripcion: '' }])}
              className="inline-flex items-center gap-1 px-2.5 h-9 rounded-lg bg-[var(--bg-tertiary)] text-[12px] font-medium hover:bg-[var(--surface-hover)] transition-colors"
              title="Añadir perfil manual"
            >
              <Plus className="w-3.5 h-3.5" />
              Manual
            </button>
          </div>
        </div>

        {perfiles.length === 0 ? (
          <div className="p-8 rounded-xl border border-dashed border-[var(--border-primary)] text-center bg-[var(--bg-tertiary)]/40">
            <Wand2 className="w-8 h-8 text-violet-500/60 mx-auto mb-2" />
            <p className="text-[13px] font-semibold text-[var(--text-primary)]">Sin perfiles</p>
            <p className="text-[11.5px] text-[var(--text-tertiary)] mt-1 mb-3">
              Pulsa &quot;Generar con IA&quot; para que MiniMax cree perfiles realistas usando la descripción de tu SaaS y tus leads.
            </p>
            <button
              type="button"
              onClick={() => generarPerfilesIA('replace')}
              disabled={generandoPerfiles || !softwareId}
              className="inline-flex items-center gap-2 px-4 h-9 rounded-lg bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white text-[12.5px] font-semibold disabled:opacity-50 transition-all"
            >
              {generandoPerfiles ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
              Generar {cantidadPerfiles} perfiles ahora
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {perfiles.map((p, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <input
                  type="text"
                  value={p.nombre}
                  onChange={(e) => {
                    const next = [...perfiles];
                    next[idx] = { ...next[idx], nombre: e.target.value };
                    setPerfiles(next);
                  }}
                  placeholder="Nombre del perfil"
                  className="w-44 h-9 px-2.5 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[12.5px] shrink-0"
                />
                <textarea
                  value={p.descripcion}
                  onChange={(e) => {
                    const next = [...perfiles];
                    next[idx] = { ...next[idx], descripcion: e.target.value };
                    setPerfiles(next);
                  }}
                  rows={1}
                  placeholder="Descripción detallada (cómo es esta persona, qué le importa, su contexto)"
                  className="flex-1 px-2.5 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[12.5px] resize-y min-h-[36px]"
                />
                <button
                  type="button"
                  onClick={() => setPerfiles(perfiles.filter((_, i) => i !== idx))}
                  className="p-1.5 rounded-md hover:bg-rose-500/10 text-[var(--text-tertiary)] hover:text-rose-500 shrink-0 mt-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={runBatalla}
        disabled={loading}
        className="inline-flex items-center gap-2 px-6 h-11 rounded-xl bg-gradient-to-r from-rose-500 to-orange-600 text-white text-[14px] font-bold hover:shadow-xl hover:shadow-rose-500/30 disabled:opacity-50 transition-all"
      >
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Swords className="w-5 h-5" />}
        ¡Iniciar batalla!
      </button>

      {/* Resultado */}
      {resultado && (
        <div className="p-5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] space-y-4">
          <div className="flex items-center gap-3">
            <Crown className="w-6 h-6 text-amber-500" />
            <div>
              <p className="text-[15px] font-bold text-[var(--text-primary)]">
                Ganadora global:{' '}
                <span className={resultado.ganadorGlobal === 'A' ? 'text-blue-600' : resultado.ganadorGlobal === 'B' ? 'text-rose-600' : 'text-amber-600'}>
                  {resultado.ganadorGlobal}
                </span>
              </p>
              <p className="text-[12.5px] text-[var(--text-tertiary)]">{resultado.resumen}</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-[var(--text-tertiary)] border-b border-[var(--border-primary)]">
                  <th className="py-2 pr-4">Perfil</th>
                  <th className="py-2 pr-4 text-center">A</th>
                  <th className="py-2 pr-4 text-center">B</th>
                  <th className="py-2 pr-4">Ganadora</th>
                  <th className="py-2">Razón</th>
                </tr>
              </thead>
              <tbody>
                {resultado.resultados?.map((r: any, i: number) => (
                  <tr key={i} className="border-b border-[var(--border-primary)]/50">
                    <td className="py-2.5 pr-4 font-medium text-[var(--text-primary)]">{r.perfil}</td>
                    <td className="py-2.5 pr-4 text-center font-mono text-blue-600">{r.puntuacionA}</td>
                    <td className="py-2.5 pr-4 text-center font-mono text-rose-600">{r.puntuacionB}</td>
                    <td className="py-2.5 pr-4">
                      <span className={`inline-flex items-center px-2 h-5 rounded-md text-[10.5px] font-bold ${
                        r.ganadora === 'A' ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400' :
                        r.ganadora === 'B' ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400' :
                        'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                      }`}>{r.ganadora}</span>
                    </td>
                    <td className="py-2.5 text-[var(--text-secondary)]">{r.razon}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      </>)}
    </div>
  );
}

/* ============================================================
   ARENA HISTORIAL — lista de batallas guardadas
============================================================ */

function ArenaHistorial({
  loading,
  battles,
  plantillas,
  onAbrir,
  onEliminar,
  onReejecutar,
}: {
  loading: boolean;
  battles: any[];
  plantillas: Plantilla[];
  onAbrir: (b: any) => void;
  onEliminar: (id: string) => void;
  onReejecutar: (b: any) => void;
}) {
  if (loading) {
    return (
      <div className="p-12 text-center">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--text-tertiary)] mx-auto" />
      </div>
    );
  }
  if (battles.length === 0) {
    return (
      <div className="p-12 rounded-2xl bg-[var(--bg-secondary)] border border-dashed border-[var(--border-primary)] text-center">
        <History className="w-10 h-10 text-[var(--text-tertiary)] mx-auto mb-3" />
        <p className="text-[14px] font-medium text-[var(--text-primary)]">Sin batallas guardadas</p>
        <p className="text-[12.5px] text-[var(--text-tertiary)] mt-1">
          Cada vez que ejecutas una batalla en &quot;Nueva&quot;, queda registrada aquí automáticamente.
        </p>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      {battles.map((b: any) => {
        const numPerfiles = Array.isArray(b.perfiles) ? b.perfiles.length : 0;
        const r = b.resultado || {};
        const aWins = r.resultados?.filter((x: any) => x.ganadora === 'A').length || 0;
        const bWins = r.resultados?.filter((x: any) => x.ganadora === 'B').length || 0;
        const empates = r.resultados?.filter((x: any) => x.ganadora === 'EMPATE').length || 0;
        return (
          <div
            key={b.id}
            className="p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] hover:border-[var(--text-tertiary)] transition-colors"
          >
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`inline-flex items-center gap-1 px-2 h-5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                      b.ganadorGlobal === 'A'
                        ? 'bg-blue-500/10 text-blue-700 dark:text-blue-300 ring-1 ring-blue-500/20'
                        : b.ganadorGlobal === 'B'
                          ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300 ring-1 ring-rose-500/20'
                          : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-1 ring-amber-500/20'
                    }`}
                  >
                    <Crown className="w-3 h-3" />
                    Ganó {b.ganadorGlobal}
                  </span>
                  <span className="text-[10.5px] text-[var(--text-tertiary)] tabular-nums">
                    {formatRelativeTime(b.createdAt)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[12.5px] mb-1 flex-wrap">
                  <span className="inline-flex items-center gap-1 px-1.5 h-5 rounded bg-blue-500/10 text-blue-700 dark:text-blue-300 font-semibold">
                    A
                  </span>
                  <span className="text-[var(--text-primary)] font-medium truncate max-w-[140px]">
                    {b.plantillaA?.nombre || '(plantilla eliminada)'}
                  </span>
                  <span className="text-[var(--text-tertiary)]">vs</span>
                  <span className="inline-flex items-center gap-1 px-1.5 h-5 rounded bg-rose-500/10 text-rose-700 dark:text-rose-300 font-semibold">
                    B
                  </span>
                  <span className="text-[var(--text-primary)] font-medium truncate max-w-[140px]">
                    {b.plantillaB?.nombre || '(plantilla eliminada)'}
                  </span>
                </div>
                <p className="text-[11.5px] text-[var(--text-tertiary)] line-clamp-2 mt-1">
                  {r.resumen}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 mb-3 text-[11.5px]">
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-[var(--bg-tertiary)]">
                <Users className="w-3 h-3 text-[var(--text-tertiary)]" />
                <span className="font-mono tabular-nums">{numPerfiles} perfiles</span>
              </div>
              <div className="flex items-center gap-1 text-[11px]">
                <span className="font-mono text-blue-600 tabular-nums">{aWins}</span>
                <span className="text-[var(--text-tertiary)]">·</span>
                <span className="font-mono text-amber-600 tabular-nums">{empates}</span>
                <span className="text-[var(--text-tertiary)]">·</span>
                <span className="font-mono text-rose-600 tabular-nums">{bWins}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onAbrir(b)}
                className="flex-1 inline-flex items-center justify-center gap-1.5 h-8 rounded-lg bg-[var(--text-primary)] text-[var(--bg-secondary)] text-[12px] font-semibold hover:opacity-90 transition-opacity"
              >
                <BarChart3 className="w-3.5 h-3.5" />
                Ver detalle
              </button>
              <button
                type="button"
                onClick={() => onReejecutar(b)}
                title="Cargar esta configuración en Nueva (puedes reejecutarla o ajustarla)"
                className="inline-flex items-center gap-1 px-2.5 h-8 rounded-lg bg-[var(--bg-tertiary)] text-[11.5px] font-semibold hover:bg-[var(--surface-hover)] transition-colors"
              >
                <Swords className="w-3.5 h-3.5" />
                Reusar
              </button>
              <button
                type="button"
                onClick={() => onEliminar(b.id)}
                className="p-1.5 rounded-md hover:bg-rose-500/10 text-[var(--text-tertiary)] hover:text-rose-500"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ============================================================
   BATTLE DETAIL — modal con detalle completo de una batalla
============================================================ */

function BattleDetailModal({
  battle,
  onClose,
  onEliminar,
  showToast,
}: {
  battle: any;
  onClose: () => void;
  onEliminar: (id: string) => void;
  showToast: (k: 'ok' | 'err', m: string) => void;
}) {
  const [nota, setNota] = useState<string>(battle.nota || '');
  const [savingNota, setSavingNota] = useState(false);

  const r = battle.resultado || {};
  const guardarNota = async () => {
    setSavingNota(true);
    try {
      await apiClient.updateWhatsappArenaBattle(battle.id, { nota });
      showToast('ok', 'Nota guardada');
    } catch (e: any) {
      showToast('err', e.message || 'Error guardando');
    } finally {
      setSavingNota(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[920px] max-h-[92vh] flex flex-col bg-[var(--bg-secondary)] rounded-2xl shadow-2xl border border-[var(--border-primary)]"
      >
        <div className="flex items-center justify-between px-5 h-14 border-b border-[var(--border-primary)] shrink-0">
          <div className="flex items-center gap-2.5">
            <Crown className="w-5 h-5 text-amber-500" />
            <div>
              <h2 className="text-[14.5px] font-semibold text-[var(--text-primary)]">
                Batalla · ganó{' '}
                <span className={
                  battle.ganadorGlobal === 'A' ? 'text-blue-600' :
                  battle.ganadorGlobal === 'B' ? 'text-rose-600' : 'text-amber-600'
                }>{battle.ganadorGlobal}</span>
              </h2>
              <p className="text-[11px] text-[var(--text-tertiary)]">
                {new Date(battle.createdAt).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onEliminar(battle.id)}
              className="p-1.5 rounded-md hover:bg-rose-500/10 text-[var(--text-tertiary)] hover:text-rose-500"
              title="Eliminar batalla"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button type="button" onClick={onClose} className="p-1.5 rounded-md hover:bg-[var(--surface-hover)]">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Plantillas enfrentadas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-blue-500/5 border-2 border-blue-500/30">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-blue-500 text-white text-[11px] font-bold">A</span>
                <p className="text-[12.5px] font-semibold text-[var(--text-primary)] truncate">
                  {battle.plantillaA?.nombre || '(plantilla eliminada)'}
                </p>
              </div>
              <p className="text-[11.5px] font-mono text-[var(--text-secondary)] whitespace-pre-wrap line-clamp-6">
                {battle.plantillaA?.contenido || '—'}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-rose-500/5 border-2 border-rose-500/30">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-rose-500 text-white text-[11px] font-bold">B</span>
                <p className="text-[12.5px] font-semibold text-[var(--text-primary)] truncate">
                  {battle.plantillaB?.nombre || '(plantilla eliminada)'}
                </p>
              </div>
              <p className="text-[11.5px] font-mono text-[var(--text-secondary)] whitespace-pre-wrap line-clamp-6">
                {battle.plantillaB?.contenido || '—'}
              </p>
            </div>
          </div>

          {/* Resumen */}
          {r.resumen && (
            <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 flex items-start gap-2">
              <Crown className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-[12.5px] text-[var(--text-primary)] italic">{r.resumen}</p>
            </div>
          )}

          {/* Tabla de resultados */}
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-[var(--text-tertiary)] border-b border-[var(--border-primary)]">
                  <th className="py-2 pr-4">Perfil</th>
                  <th className="py-2 pr-4 text-center">A</th>
                  <th className="py-2 pr-4 text-center">B</th>
                  <th className="py-2 pr-4">Gana</th>
                  <th className="py-2">Razón</th>
                </tr>
              </thead>
              <tbody>
                {(r.resultados || []).map((row: any, i: number) => (
                  <tr key={i} className="border-b border-[var(--border-primary)]/50">
                    <td className="py-2.5 pr-4 font-medium text-[var(--text-primary)]">{row.perfil}</td>
                    <td className="py-2.5 pr-4 text-center font-mono text-blue-600">{row.puntuacionA}</td>
                    <td className="py-2.5 pr-4 text-center font-mono text-rose-600">{row.puntuacionB}</td>
                    <td className="py-2.5 pr-4">
                      <span className={`inline-flex items-center px-2 h-5 rounded-md text-[10.5px] font-bold ${
                        row.ganadora === 'A' ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400' :
                        row.ganadora === 'B' ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400' :
                        'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                      }`}>{row.ganadora}</span>
                    </td>
                    <td className="py-2.5 text-[var(--text-secondary)]">{row.razon}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Perfiles testeados */}
          <details className="rounded-xl border border-[var(--border-primary)] overflow-hidden">
            <summary className="px-3 py-2 cursor-pointer text-[12px] font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] flex items-center gap-2">
              <Users className="w-3.5 h-3.5" />
              Perfiles usados ({(battle.perfiles || []).length})
            </summary>
            <div className="p-3 space-y-2 bg-[var(--bg-tertiary)]/40">
              {(battle.perfiles || []).map((p: any, i: number) => (
                <div key={i} className="p-2.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-primary)]">
                  <p className="text-[12.5px] font-semibold text-[var(--text-primary)]">{p.nombre}</p>
                  <p className="text-[11.5px] text-[var(--text-secondary)] mt-0.5">{p.descripcion}</p>
                </div>
              ))}
            </div>
          </details>

          {/* Nota del usuario */}
          <div>
            <label className="text-[11px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)]">
              Nota personal
            </label>
            <div className="flex gap-2 mt-1">
              <textarea
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                rows={2}
                placeholder="Añade una nota (decisión que tomaste, qué probar después, etc.)..."
                className="flex-1 p-2.5 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[12.5px] resize-none focus:outline-none focus:ring-2 focus:ring-rose-500/30"
              />
              <button
                type="button"
                onClick={guardarNota}
                disabled={savingNota}
                className="inline-flex items-center gap-1.5 px-3 h-9 self-start rounded-lg bg-[var(--text-primary)] text-[var(--bg-secondary)] text-[12px] font-semibold disabled:opacity-50"
              >
                {savingNota ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Guardar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Chatbot Tab
============================================================ */

function ChatbotTab({
  reglas,
  onRecargar,
  onNueva,
  onEditar,
  onEliminar,
}: {
  reglas: any[];
  onRecargar: () => void;
  onNueva: () => void;
  onEditar: (r: any) => void;
  onEliminar: (id: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[13px] text-[var(--text-secondary)]">
            {reglas.length} regla{reglas.length !== 1 && 's'} de respuesta automática
          </p>
          <p className="text-[11.5px] text-[var(--text-tertiary)]">
            El chatbot responde automáticamente a mensajes entrantes según palabras clave o IA.
          </p>
        </div>
        <button
          type="button"
          onClick={onNueva}
          className="inline-flex items-center gap-2 px-4 h-10 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-[13px] font-semibold hover:shadow-lg hover:shadow-cyan-500/25 transition-all"
        >
          <Plus className="w-4 h-4" />
          Nueva regla
        </button>
      </div>

      {reglas.length === 0 ? (
        <div className="p-12 rounded-2xl bg-[var(--bg-secondary)] border border-dashed border-[var(--border-primary)] text-center">
          <Bot className="w-10 h-10 text-[var(--text-tertiary)] mx-auto mb-3" />
          <p className="text-[14px] font-medium text-[var(--text-primary)]">Sin reglas de chatbot</p>
          <p className="text-[12.5px] text-[var(--text-tertiary)] mt-1">
            Crea reglas para que el bot responda automáticamente cuando un lead escriba.
          </p>
          <button
            type="button"
            onClick={onNueva}
            className="mt-4 inline-flex items-center gap-2 px-4 h-9 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-[13px] font-semibold hover:shadow-lg hover:shadow-cyan-500/25 transition-all"
          >
            <Plus className="w-4 h-4" />
            Crear primera regla
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {reglas.map((r) => (
            <div
              key={r.id}
              className={`p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] hover:border-[var(--text-tertiary)] transition-colors ${
                !r.activa ? 'opacity-60' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center px-2 h-5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                      r.tipo === 'ia'
                        ? 'bg-violet-500/10 text-violet-700 dark:text-violet-400 ring-1 ring-violet-500/20'
                        : 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 ring-1 ring-cyan-500/20'
                    }`}
                  >
                    {r.tipo === 'ia' ? 'IA' : 'Palabra clave'}
                  </span>
                  {!r.activa && (
                    <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                      Inactiva
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onEditar(r)}
                    className="p-1.5 rounded-md hover:bg-[var(--surface-hover)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                    title="Editar"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onEliminar(r.id)}
                    className="p-1.5 rounded-md hover:bg-red-500/10 text-[var(--text-tertiary)] hover:text-red-500"
                    title="Eliminar"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <p className="text-[14px] font-semibold text-[var(--text-primary)] mb-1">{r.nombre}</p>
              {r.tipo === 'keyword' && r.palabrasClave?.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {r.palabrasClave.map((pk: string) => (
                    <span
                      key={pk}
                      className="inline-flex items-center px-1.5 h-[18px] rounded-md bg-slate-500/10 text-slate-600 dark:text-slate-400 text-[10px] font-mono ring-1 ring-slate-500/20"
                    >
                      {pk}
                    </span>
                  ))}
                </div>
              )}
              <p className="text-[12.5px] text-[var(--text-secondary)] line-clamp-3 font-mono leading-relaxed whitespace-pre-wrap">
                {r.respuesta}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   Chatbot Editor Modal
============================================================ */

function ChatbotEditorModal({
  initial,
  onClose,
  onSave,
}: {
  initial: any | null;
  onClose: () => void;
  onSave: (input: any) => Promise<void>;
}) {
  const [nombre, setNombre] = useState(initial?.nombre || '');
  const [tipo, setTipo] = useState(initial?.tipo || 'keyword');
  const [palabrasClave, setPalabrasClave] = useState(initial?.palabrasClave?.join(', ') || '');
  const [respuesta, setRespuesta] = useState(initial?.respuesta || '');
  const [activa, setActiva] = useState(initial?.activa ?? true);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!nombre.trim() || !respuesta.trim()) return;
    if (tipo === 'keyword' && !palabrasClave.trim()) return;
    setSaving(true);
    try {
      await onSave({
        id: initial?.id,
        nombre: nombre.trim(),
        tipo,
        palabrasClave: tipo === 'keyword'
          ? palabrasClave.split(',').map((p: string) => p.trim()).filter(Boolean)
          : [],
        respuesta: respuesta.trim(),
        activa,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[560px] max-h-[90vh] overflow-y-auto bg-[var(--bg-secondary)] rounded-2xl shadow-2xl border border-[var(--border-primary)] animate-in zoom-in-95 duration-200"
      >
        <div className="sticky top-0 bg-[var(--bg-secondary)] flex items-center justify-between px-6 h-14 border-b border-[var(--border-primary)] z-10">
          <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">
            {initial ? 'Editar regla' : 'Nueva regla de chatbot'}
          </h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-md hover:bg-[var(--surface-hover)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <label className="text-[11px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)]">Nombre</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="ej. Respuesta a preguntas de precio"
              className="mt-1 w-full h-10 px-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[14px] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
            />
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)]">Tipo</label>
            <div className="mt-1.5 flex gap-2">
              <button
                type="button"
                onClick={() => setTipo('keyword')}
                className={`flex-1 h-10 rounded-xl border text-[13px] font-medium transition-colors ${
                  tipo === 'keyword'
                    ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-700 dark:text-cyan-400'
                    : 'bg-[var(--bg-tertiary)] border-[var(--border-primary)] text-[var(--text-secondary)]'
                }`}
              >
                Palabra clave
              </button>
              <button
                type="button"
                onClick={() => setTipo('ia')}
                className={`flex-1 h-10 rounded-xl border text-[13px] font-medium transition-colors ${
                  tipo === 'ia'
                    ? 'bg-violet-500/10 border-violet-500/30 text-violet-700 dark:text-violet-400'
                    : 'bg-[var(--bg-tertiary)] border-[var(--border-primary)] text-[var(--text-secondary)]'
                }`}
              >
                Inteligencia artificial
              </button>
            </div>
            <p className="text-[11px] text-[var(--text-tertiary)] mt-1.5">
              {tipo === 'keyword'
                ? 'El bot responde cuando el mensaje del lead contiene alguna de las palabras clave.'
                : 'El bot usa IA para generar una respuesta personalizada basada en el contexto del negocio.'}
            </p>
          </div>

          {tipo === 'keyword' && (
            <div>
              <label className="text-[11px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)]">Palabras clave</label>
              <input
                type="text"
                value={palabrasClave}
                onChange={(e) => setPalabrasClave(e.target.value)}
                placeholder="precio, coste, tarifa, cuánto vale"
                className="mt-1 w-full h-10 px-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[14px] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
              />
              <p className="text-[11px] text-[var(--text-tertiary)] mt-1">Separa por comas. No importan mayúsculas/minúsculas.</p>
            </div>
          )}

          {tipo === 'ia' && (
            <div className="p-3 rounded-xl bg-violet-500/5 border border-violet-500/15 text-[12px] text-violet-700 dark:text-violet-400">
              <p className="font-medium mb-1">Instrucciones para la IA</p>
              <p>Escribe el contexto del negocio y cómo debe responder el bot. La IA usará esto como prompt de sistema.</p>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)]">
                {tipo === 'keyword' ? 'Respuesta' : 'Instrucciones / Contexto'}
              </label>
              <span className="text-[11px] text-[var(--text-tertiary)]">{respuesta.length} caracteres</span>
            </div>
            <textarea
              value={respuesta}
              onChange={(e) => setRespuesta(e.target.value)}
              rows={5}
              placeholder={tipo === 'keyword'
                ? 'Hola {{primer_nombre}}, nuestros planes empiezan desde 49€/mes. ¿Te gustaría que charlemos?'
                : 'Eres el asistente de ventas de una agencia de marketing digital. Responde preguntas sobre servicios, precios y agenda demos. Sé breve y profesional.'
              }
              className="w-full p-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[14px] text-[var(--text-primary)] font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-cyan-500/30 resize-none"
            />
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={activa}
              onChange={(e) => setActiva(e.target.checked)}
              className="w-4 h-4 rounded accent-cyan-500"
            />
            <span className="text-[13px] text-[var(--text-primary)]">Regla activa</span>
          </label>
        </div>

        <div className="sticky bottom-0 bg-[var(--bg-secondary)] flex items-center justify-end gap-2 px-6 h-14 border-t border-[var(--border-primary)]">
          <button type="button" onClick={onClose} className="px-4 h-9 rounded-xl text-[13px] font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]">
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !nombre.trim() || !respuesta.trim() || (tipo === 'keyword' && !palabrasClave.trim())}
            className="inline-flex items-center gap-2 px-4 h-9 rounded-xl bg-cyan-600 text-white text-[13px] font-semibold hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {initial ? 'Guardar cambios' : 'Crear regla'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   SPARRING — modal para ensayar conversación con clon IA del lead
============================================================ */

function SparringModal({
  leadId,
  lead,
  onClose,
  showToast,
}: {
  leadId: string;
  lead: { id: string; nombre: string; empresa: string | null; telefono: string | null; estado: string } | null;
  onClose: () => void;
  showToast: (k: 'ok' | 'err', m: string) => void;
}) {
  const [hilo, setHilo] = useState<{ role: 'tu' | 'lead'; texto: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const enviar = async () => {
    if (!input.trim()) return;
    const nuevoHilo = [...hilo, { role: 'tu' as const, texto: input.trim() }];
    setHilo(nuevoHilo);
    setInput('');
    setLoading(true);
    try {
      const res: any = await apiClient.whatsappSparring({ leadId, hilo: nuevoHilo });
      setHilo([...nuevoHilo, { role: 'lead', texto: res.data.mensaje }]);
    } catch (e: any) {
      showToast('err', e.message || 'Error en sparring');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[640px] h-[80vh] flex flex-col bg-[var(--bg-secondary)] rounded-2xl shadow-2xl border border-[var(--border-primary)]"
      >
        <div className="flex items-center justify-between px-5 h-14 border-b border-[var(--border-primary)] shrink-0">
          <div className="flex items-center gap-2.5">
            <Drama className="w-5 h-5 text-fuchsia-600" />
            <div>
              <h2 className="text-[14.5px] font-semibold text-[var(--text-primary)]">
                Sparring · {lead?.nombre || 'lead'}
              </h2>
              <p className="text-[11px] text-[var(--text-tertiary)]">
                MiniMax interpreta al lead. Practica sin riesgo.
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-md hover:bg-[var(--surface-hover)]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 bg-[var(--bg-primary)] space-y-2">
          {hilo.length === 0 ? (
            <div className="h-full flex items-center justify-center text-center">
              <div>
                <Drama className="w-10 h-10 text-[var(--text-tertiary)] mx-auto mb-2" />
                <p className="text-[13px] text-[var(--text-secondary)]">Empieza tú escribiendo el primer mensaje</p>
                <p className="text-[11px] text-[var(--text-tertiary)] mt-1">
                  El &quot;lead&quot; IA te contestará en función de su perfil.
                </p>
              </div>
            </div>
          ) : (
            hilo.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'tu' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-[13px] whitespace-pre-wrap ${
                  m.role === 'tu' ? 'bg-emerald-500 text-white rounded-br-md' : 'bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-primary)] rounded-bl-md'
                }`}>
                  {m.texto}
                </div>
              </div>
            ))
          )}
          {loading && (
            <div className="flex justify-start">
              <div className="px-3 py-2 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-primary)]">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--text-tertiary)]" />
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-[var(--border-primary)] p-3 flex items-end gap-2 shrink-0">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                void enviar();
              }
            }}
            rows={2}
            placeholder="Escribe tu mensaje al lead (Ctrl+Enter)..."
            className="flex-1 p-2.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[13px] focus:outline-none focus:ring-2 focus:ring-fuchsia-500/30 resize-none"
          />
          <button
            type="button"
            onClick={enviar}
            disabled={!input.trim() || loading}
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-fuchsia-600 text-white text-[13px] font-semibold hover:bg-fuchsia-700 disabled:opacity-40"
          >
            <Send className="w-4 h-4" />
            Enviar
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   STORYBOARD — modal con journey visual del lead
============================================================ */

function StoryboardModal({
  leadId,
  onClose,
  showToast,
}: {
  leadId: string;
  onClose: () => void;
  showToast: (k: 'ok' | 'err', m: string) => void;
}) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState<Set<string>>(new Set());
  const [seleccionado, setSeleccionado] = useState<any>(null);

  useEffect(() => {
    apiClient
      .whatsappStoryboard(leadId)
      .then((res: any) => setData(res.data))
      .catch((e) => showToast('err', e.message || 'Error cargando storyboard'))
      .finally(() => setLoading(false));
  }, [leadId, showToast]);

  // Catálogo visual por tipo
  const TIPOS: Record<string, { label: string; color: string; ring: string; bg: string; icon: any }> = {
    creacion:        { label: 'Creación',     color: 'text-violet-700 dark:text-violet-300', ring: 'ring-violet-500/40', bg: 'bg-violet-500',  icon: Sparkles },
    whatsapp_out:    { label: 'WhatsApp →',   color: 'text-emerald-700 dark:text-emerald-300', ring: 'ring-emerald-500/40', bg: 'bg-emerald-500', icon: Send },
    whatsapp_in:    { label: 'WhatsApp ←',    color: 'text-amber-700 dark:text-amber-300', ring: 'ring-amber-500/40', bg: 'bg-amber-500', icon: ArrowDownLeft },
    llamada:         { label: 'Llamada',       color: 'text-blue-700 dark:text-blue-300', ring: 'ring-blue-500/40', bg: 'bg-blue-500', icon: PhoneCall },
    cambio_estado:   { label: 'Cambio estado', color: 'text-fuchsia-700 dark:text-fuchsia-300', ring: 'ring-fuchsia-500/40', bg: 'bg-fuchsia-500', icon: Crown },
    email_enviado:   { label: 'Email →',       color: 'text-sky-700 dark:text-sky-300', ring: 'ring-sky-500/40', bg: 'bg-sky-500', icon: Send },
    email_abierto:   { label: 'Email abierto', color: 'text-cyan-700 dark:text-cyan-300', ring: 'ring-cyan-500/40', bg: 'bg-cyan-500', icon: Inbox },
    email_click:     { label: 'Email click',   color: 'text-teal-700 dark:text-teal-300', ring: 'ring-teal-500/40', bg: 'bg-teal-500', icon: Zap },
    email_rebotado:  { label: 'Rebote',        color: 'text-rose-700 dark:text-rose-300', ring: 'ring-rose-500/40', bg: 'bg-rose-500', icon: AlertTriangle },
    web_visita:      { label: 'Visita web',    color: 'text-orange-700 dark:text-orange-300', ring: 'ring-orange-500/40', bg: 'bg-orange-500', icon: Film },
    web_evento:      { label: 'Evento web',    color: 'text-yellow-700 dark:text-yellow-300', ring: 'ring-yellow-500/40', bg: 'bg-yellow-500', icon: Lightbulb },
    historial:       { label: 'Nota',          color: 'text-slate-700 dark:text-slate-300', ring: 'ring-slate-500/40', bg: 'bg-slate-500', icon: Calendar },
  };

  const meta = (tipo: string) => TIPOS[tipo] || TIPOS.historial;

  const eventosFiltrados: any[] = !data
    ? []
    : (data.eventos as any[]).filter((e) => filtros.size === 0 || filtros.has(e.tipo));

  // Agrupar por mes para etiquetas en la cinta
  const grupos: { label: string; eventos: any[] }[] = [];
  for (const e of eventosFiltrados) {
    const d = new Date(e.fecha);
    const label = d.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' });
    if (grupos.length === 0 || grupos[grupos.length - 1].label !== label) {
      grupos.push({ label, eventos: [e] });
    } else {
      grupos[grupos.length - 1].eventos.push(e);
    }
  }

  const heatmapColor = (n: number) => {
    if (n === 0) return 'bg-[var(--bg-tertiary)]';
    if (n === 1) return 'bg-emerald-200 dark:bg-emerald-900';
    if (n <= 3) return 'bg-emerald-400 dark:bg-emerald-700';
    if (n <= 6) return 'bg-emerald-500 dark:bg-emerald-500';
    return 'bg-emerald-600 dark:bg-emerald-400';
  };

  const toggleFiltro = (tipo: string) => {
    setFiltros((prev) => {
      const n = new Set(prev);
      if (n.has(tipo)) n.delete(tipo);
      else n.add(tipo);
      return n;
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[1280px] max-h-[92vh] flex flex-col bg-[var(--bg-secondary)] rounded-2xl shadow-2xl border border-[var(--border-primary)]"
      >
        <div className="flex items-center justify-between px-5 h-14 border-b border-[var(--border-primary)] shrink-0">
          <div className="flex items-center gap-2.5">
            <Film className="w-5 h-5 text-sky-600" />
            <div>
              <h2 className="text-[14.5px] font-semibold text-[var(--text-primary)]">
                Storyboard{data?.lead ? ` · ${data.lead.nombre}` : ''}
              </h2>
              <p className="text-[11px] text-[var(--text-tertiary)]">
                Cinta cinematográfica · scroll horizontal · clic en un evento para verlo
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-md hover:bg-[var(--surface-hover)]">
            <X className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-[var(--text-tertiary)]" />
          </div>
        ) : !data ? (
          <p className="text-center text-[var(--text-tertiary)] py-20">Sin datos</p>
        ) : (
          <>
            {/* KPIs */}
            <div className="px-5 pt-4 pb-3 grid grid-cols-3 md:grid-cols-7 gap-2 shrink-0">
              {[
                { label: 'Días', val: data.kpis.diasEnPipeline },
                { label: 'WA →', val: data.kpis.mensajesEnviados },
                { label: 'WA ←', val: data.kpis.mensajesRecibidos },
                { label: 'Llamadas', val: data.kpis.llamadasTotal },
                { label: 'Emails', val: data.kpis.emailsEnviados },
                { label: 'Aperturas', val: data.kpis.emailsAbiertos },
                { label: 'Webs', val: data.kpis.webVisitas },
              ].map((k) => (
                <div key={k.label} className="p-2.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-center">
                  <p className="text-[17px] font-bold text-[var(--text-primary)] tabular-nums leading-tight">{k.val}</p>
                  <p className="text-[9.5px] uppercase tracking-wider text-[var(--text-tertiary)]">{k.label}</p>
                </div>
              ))}
            </div>

            {/* Heatmap GitHub-style últimos 90 días */}
            <div className="px-5 pb-3 shrink-0">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[10.5px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)]">
                  Actividad — últimos 90 días
                </p>
                <div className="flex items-center gap-1 text-[10.5px] text-[var(--text-tertiary)]">
                  <span>menos</span>
                  {[0, 1, 3, 6, 9].map((n) => (
                    <div key={n} className={`w-3 h-3 rounded-sm ${heatmapColor(n)}`} />
                  ))}
                  <span>más</span>
                </div>
              </div>
              <div className="grid grid-rows-7 grid-flow-col gap-[3px] auto-cols-[14px]" style={{ gridAutoFlow: 'column' }}>
                {data.heatmap?.map((h: any) => (
                  <div
                    key={h.fecha}
                    title={`${h.fecha}: ${h.count} evento${h.count === 1 ? '' : 's'}`}
                    className={`w-[14px] h-[14px] rounded-sm ${heatmapColor(h.count)}`}
                  />
                ))}
              </div>
            </div>

            {/* Filtros por tipo */}
            <div className="px-5 pb-3 shrink-0 flex flex-wrap gap-1.5">
              {Array.from(new Set((data.eventos as any[]).map((e) => e.tipo))).map((tipo) => {
                const m = meta(tipo as string);
                const Icon = m.icon;
                const active = filtros.size === 0 || filtros.has(tipo as string);
                return (
                  <button
                    key={tipo as string}
                    type="button"
                    onClick={() => toggleFiltro(tipo as string)}
                    className={`inline-flex items-center gap-1 px-2 h-6 rounded-md text-[10.5px] font-semibold ring-1 transition-all ${
                      active
                        ? `${m.color} ${m.ring} bg-[var(--bg-tertiary)]`
                        : 'text-[var(--text-tertiary)] ring-[var(--border-primary)] opacity-50'
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    {m.label}
                  </button>
                );
              })}
            </div>

            {/* Cinta horizontal */}
            <div className="flex-1 overflow-x-auto overflow-y-hidden border-t border-[var(--border-primary)] bg-gradient-to-b from-[var(--bg-primary)] to-[var(--bg-secondary)]">
              {eventosFiltrados.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <p className="text-[13px] text-[var(--text-tertiary)]">Sin eventos para los filtros seleccionados</p>
                </div>
              ) : (
                <div className="relative h-full min-h-[260px] flex items-center">
                  {/* Línea central */}
                  <div className="absolute left-0 right-0 top-1/2 h-[2px] bg-gradient-to-r from-transparent via-[var(--border-primary)] to-transparent" />

                  <div className="relative flex items-center gap-1 px-6 py-4 min-w-full">
                    {grupos.map((g, gi) => (
                      <div key={gi} className="flex items-center">
                        {/* Etiqueta de mes */}
                        <div className="flex flex-col items-center gap-1 mr-2 shrink-0">
                          <span className="text-[10px] uppercase tracking-wider font-bold text-[var(--text-tertiary)] bg-[var(--bg-secondary)] px-2 py-0.5 rounded-md border border-[var(--border-primary)]">
                            {g.label}
                          </span>
                          <div className="w-px h-12 bg-[var(--border-primary)]" />
                        </div>
                        {g.eventos.map((e, i) => {
                          const m = meta(e.tipo);
                          const Icon = m.icon;
                          const isSel = seleccionado === e;
                          const out =
                            e.tipo === 'whatsapp_out' ||
                            e.tipo === 'email_enviado' ||
                            e.tipo === 'creacion';
                          const above = i % 2 === 0; // alterna arriba/abajo de la línea
                          return (
                            <button
                              key={i}
                              type="button"
                              onClick={() => setSeleccionado(isSel ? null : e)}
                              title={`${m.label} · ${new Date(e.fecha).toLocaleString('es-ES')}`}
                              className={`group relative flex flex-col items-center shrink-0 mx-1 transition-transform ${
                                isSel ? 'scale-110 z-10' : 'hover:scale-105'
                              }`}
                              style={{ minWidth: 72 }}
                            >
                              {/* Tile arriba o abajo de la línea */}
                              <div className={`${above ? 'order-1 mb-1' : 'order-3 mt-1'}`}>
                                <div
                                  className={`px-2 py-1 rounded-lg text-[10px] font-semibold ${m.color} bg-[var(--bg-secondary)] border ${
                                    isSel ? `ring-2 ${m.ring}` : 'border-[var(--border-primary)]'
                                  } max-w-[120px] truncate`}
                                >
                                  {e.titulo}
                                </div>
                              </div>
                              {/* Conector vertical */}
                              <div className={`${above ? 'order-2' : 'order-2'} w-[2px] h-3 bg-[var(--border-primary)]`} />
                              {/* Punto en la línea */}
                              <div className={`${above ? 'order-3' : 'order-1'} relative`}>
                                <div
                                  className={`w-9 h-9 rounded-full flex items-center justify-center shadow-md ring-4 ring-[var(--bg-primary)] ${m.bg} text-white`}
                                >
                                  <Icon className="w-4 h-4" />
                                </div>
                                {/* Fecha bajo el punto */}
                                <span
                                  className={`absolute ${above ? '-bottom-5' : '-top-5'} left-1/2 -translate-x-1/2 text-[9.5px] text-[var(--text-tertiary)] tabular-nums whitespace-nowrap`}
                                >
                                  {new Date(e.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    ))}
                    {/* Marca de "ahora" al final */}
                    <div className="flex flex-col items-center ml-3 shrink-0">
                      <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                      <span className="text-[9.5px] uppercase tracking-wider text-rose-500 font-bold mt-1">Ahora</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Panel inferior con el evento seleccionado */}
            <div className="border-t border-[var(--border-primary)] px-5 py-3 shrink-0 min-h-[80px] bg-[var(--bg-secondary)]">
              {seleccionado ? (
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-white ${meta(seleccionado.tipo).bg}`}>
                    {(() => {
                      const Icon = meta(seleccionado.tipo).icon;
                      return <Icon className="w-4 h-4" />;
                    })()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] uppercase tracking-wider font-bold ${meta(seleccionado.tipo).color}`}>
                        {meta(seleccionado.tipo).label}
                      </span>
                      <span className="text-[10.5px] text-[var(--text-tertiary)]">
                        {new Date(seleccionado.fecha).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })}
                      </span>
                    </div>
                    <p className="text-[13.5px] font-semibold text-[var(--text-primary)] mt-0.5">{seleccionado.titulo}</p>
                    {seleccionado.detalle && (
                      <p className="text-[12.5px] text-[var(--text-secondary)] whitespace-pre-wrap mt-1 line-clamp-3">
                        {seleccionado.detalle}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-[12px] text-[var(--text-tertiary)] italic">
                  Haz clic en cualquier evento de la cinta para ver el detalle.
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   HIPERPERSONALIZAR — modal masa, N mensajes únicos
============================================================ */

function HiperpersonalizarModal({
  leads,
  onClose,
  showToast,
  onTrasEnviar,
}: {
  leads: Lead[];
  onClose: () => void;
  showToast: (k: 'ok' | 'err', m: string) => void;
  onTrasEnviar: () => void;
}) {
  const [objetivo, setObjetivo] = useState('');
  const [toneRef, setToneRef] = useState('');
  const [loading, setLoading] = useState(false);
  const [mensajes, setMensajes] = useState<Record<string, string>>({});

  const generar = async () => {
    if (!objetivo.trim()) {
      showToast('err', 'Indica el objetivo de la campaña');
      return;
    }
    setLoading(true);
    try {
      const res: any = await apiClient.whatsappPersonalizarMasa({
        leadIds: leads.map((l) => l.id),
        objetivo: objetivo.trim(),
        toneRef: toneRef.trim() || undefined,
      });
      const map: Record<string, string> = {};
      for (const m of res.data.mensajes || []) map[m.leadId] = m.texto;
      setMensajes(map);
      showToast('ok', `${Object.keys(map).length} mensajes generados`);
    } catch (e: any) {
      showToast('err', e.message || 'Error generando');
    } finally {
      setLoading(false);
    }
  };

  const abrirTodos = async () => {
    const entries = Object.entries(mensajes);
    if (entries.length === 0) return;
    if (!confirm(`Se abrirán ${entries.length} ventanas de WhatsApp Web. ¿Continuar?`)) return;
    let ok = 0;
    for (const [leadId, texto] of entries) {
      try {
        const res: any = await apiClient.enviarWhatsapp({ leadId, contenidoFinal: texto });
        window.open(res.data.url, '_blank', 'noopener,noreferrer');
        ok++;
        await new Promise((r) => setTimeout(r, 350));
      } catch {
        /* skip */
      }
    }
    showToast('ok', `${ok} ventanas abiertas`);
    onTrasEnviar();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[860px] max-h-[90vh] flex flex-col bg-[var(--bg-secondary)] rounded-2xl shadow-2xl border border-[var(--border-primary)]"
      >
        <div className="flex items-center justify-between px-5 h-14 border-b border-[var(--border-primary)] shrink-0">
          <div className="flex items-center gap-2.5">
            <Wand2 className="w-5 h-5 text-violet-600" />
            <h2 className="text-[14.5px] font-semibold text-[var(--text-primary)]">
              Hiperpersonalizar — {leads.length} leads
            </h2>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-md hover:bg-[var(--surface-hover)]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 border-b border-[var(--border-primary)] shrink-0">
          <div>
            <label className="text-[11px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)]">
              Objetivo de la campaña
            </label>
            <input
              type="text"
              value={objetivo}
              onChange={(e) => setObjetivo(e.target.value)}
              placeholder="ej. Invitar a una demo del nuevo módulo X, agendar llamada de descubrimiento, etc."
              className="mt-1 w-full h-10 px-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[13px]"
            />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)]">
              Referencia de tono (opcional)
            </label>
            <textarea
              value={toneRef}
              onChange={(e) => setToneRef(e.target.value)}
              rows={2}
              placeholder="Pega aquí un mensaje de ejemplo cuyo tono quieres que se respete..."
              className="mt-1 w-full p-2.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[13px] resize-none"
            />
          </div>
          <button
            type="button"
            onClick={generar}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 h-10 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white text-[13px] font-semibold disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
            Generar {leads.length} mensajes únicos
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-2">
          {leads.map((l) => (
            <div key={l.id} className="p-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)]">
              <div className="flex items-center gap-2 mb-1.5">
                <p className="text-[12.5px] font-semibold text-[var(--text-primary)]">{l.nombre}</p>
                <span className="text-[11px] text-[var(--text-tertiary)]">
                  {l.empresa || ''} {l.cargo ? `· ${l.cargo}` : ''}
                </span>
              </div>
              {mensajes[l.id] ? (
                <textarea
                  value={mensajes[l.id]}
                  onChange={(e) => setMensajes({ ...mensajes, [l.id]: e.target.value })}
                  rows={3}
                  className="w-full p-2 rounded-lg bg-[var(--bg-secondary)] border border-emerald-500/30 text-[12.5px] font-mono resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              ) : (
                <p className="text-[12px] text-[var(--text-tertiary)] italic">— pendiente de generar —</p>
              )}
            </div>
          ))}
        </div>

        {Object.keys(mensajes).length > 0 && (
          <div className="border-t border-[var(--border-primary)] p-3 flex justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-3 h-9 rounded-lg text-[12.5px] font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={abrirTodos}
              className="inline-flex items-center gap-2 px-4 h-9 rounded-lg bg-emerald-600 text-white text-[12.5px] font-semibold hover:bg-emerald-700"
            >
              <Send className="w-3.5 h-3.5" />
              Abrir los {Object.keys(mensajes).length} en WhatsApp
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   Programar Envío Modal
============================================================ */

function ProgramarEnvioModal({
  lead,
  plantilla,
  onClose,
  onProgramar,
}: {
  lead: Lead;
  plantilla: any;
  onClose: () => void;
  onProgramar: (fecha: string, hora: string) => void;
}) {
  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState('');

  const hoy = new Date().toISOString().split('T')[0];

  const handleSubmit = () => {
    if (!fecha || !hora) return;
    onProgramar(fecha, hora);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[400px] bg-[var(--bg-secondary)] rounded-2xl shadow-2xl border border-[var(--border-primary)] p-6 animate-in zoom-in-95 duration-200"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">Programar envío</h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-md hover:bg-[var(--surface-hover)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/15 text-[12.5px] text-[var(--text-secondary)]">
            <p className="font-medium text-[var(--text-primary)]">{lead.nombre}</p>
            <p className="text-[11px] text-[var(--text-tertiary)]">{lead.telefono}</p>
            {plantilla && (
              <p className="mt-1.5 text-[11px] font-mono text-amber-700 dark:text-amber-400">
                Plantilla: {plantilla.nombre}
              </p>
            )}
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)]">Fecha</label>
            <input
              type="date"
              min={hoy}
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="mt-1 w-full h-10 px-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[14px] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-amber-500/30"
            />
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)]">Hora</label>
            <input
              type="time"
              value={hora}
              onChange={(e) => setHora(e.target.value)}
              className="mt-1 w-full h-10 px-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[14px] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-amber-500/30"
            />
          </div>

          <div className="flex items-start gap-2 p-2 rounded-lg bg-[var(--bg-tertiary)] text-[11px] text-[var(--text-tertiary)]">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <p>El envío se procesará automáticamente si WhatsApp Web está conectado. Si no, se reintentará cada minuto.</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 mt-6">
          <button type="button" onClick={onClose} className="px-4 h-9 rounded-xl text-[13px] font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]">
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!fecha || !hora}
            className="inline-flex items-center gap-2 px-4 h-9 rounded-xl bg-amber-600 text-white text-[13px] font-semibold hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <Calendar className="w-3.5 h-3.5" />
            Programar
          </button>
        </div>
      </div>
    </div>
  );
}
