'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { Lead, LeadEstado, PrioridadLead, Pagination } from '@/types';
import LeadStatusBadge from '@/components/leads/LeadStatusBadge';
import LeadPriorityBadge from '@/components/leads/LeadPriorityBadge';
import LeadsKanban from '@/components/leads/LeadsKanban';
import { formatDate } from '@/lib/utils';
import {
  Users,
  Plus,
  Upload,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Trash2,
  BarChart3,
  LayoutGrid,
  Table2,
  Phone,
  Mail,
  MessageCircle,
  X,
  SlidersHorizontal,
  AlertTriangle,
  Check,
} from 'lucide-react';

type VistaTipo = 'tabla' | 'kanban';
type TelefonoFilter = '' | 'con' | 'sin' | 'movil' | 'fijo';
type EmailFilter = '' | 'con' | 'sin';

const ESTADOS: LeadEstado[] = [
  'NUEVO',
  'CONTACTADO',
  'INTERESADO',
  'EN_SEGUIMIENTO',
  'CALIFICADO',
  'RECHAZADO',
  'NO_RESPONDE',
  'CONVERTIDO',
];
const PRIORIDADES: PrioridadLead[] = ['BAJA', 'MEDIA', 'ALTA', 'URGENTE'];

const ESTADO_LABEL: Record<LeadEstado, string> = {
  NUEVO: 'Nuevo',
  CONTACTADO: 'Contactado',
  INTERESADO: 'Interesado',
  EN_SEGUIMIENTO: 'En seguimiento',
  CALIFICADO: 'Calificado',
  RECHAZADO: 'Rechazado',
  NO_RESPONDE: 'No responde',
  CONVERTIDO: 'Convertido',
};

const PRIORIDAD_LABEL: Record<PrioridadLead, string> = {
  BAJA: 'Baja',
  MEDIA: 'Media',
  ALTA: 'Alta',
  URGENTE: 'Urgente',
};

// Stable hashed gradient per name so avatars feel distinct.
const AVATAR_GRADIENTS = [
  'from-violet-500 to-fuchsia-500',
  'from-blue-500 to-cyan-500',
  'from-emerald-500 to-teal-500',
  'from-amber-500 to-orange-500',
  'from-rose-500 to-pink-500',
  'from-indigo-500 to-blue-500',
  'from-lime-500 to-emerald-500',
  'from-purple-500 to-violet-500',
];

function avatarGradient(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

function digitsOnly(s?: string | null) {
  return (s ?? '').replace(/\D+/g, '');
}

export default function LeadsPage() {
  const searchParams = useSearchParams();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 25, total: 0, pages: 0 });

  // Filters
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [estadoFilter, setEstadoFilter] = useState<LeadEstado | ''>('');
  const [prioridadFilter, setPrioridadFilter] = useState<PrioridadLead | ''>('');
  const [softwareFilter, setSoftwareFilter] = useState('');
  const [telefonoFilter, setTelefonoFilter] = useState<TelefonoFilter>('');
  const [emailFilter, setEmailFilter] = useState<EmailFilter>('');
  const [sectorFilter, setSectorFilter] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  // Por defecto ocultamos leads etiquetados como 'revisar-manualmente'
  const [showTagged, setShowTagged] = useState(false);

  const [softwares, setSoftwares] = useState<{ saas: string; descripcion?: string }[]>([]);
  const [sectores, setSectores] = useState<string[]>([]);
  const [vista, setVista] = useState<VistaTipo>('tabla');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ total: 0, recientes7d: 0 });

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // Confirm modal: list of leads to remove, optional label override
  const [confirmDelete, setConfirmDelete] = useState<Lead[] | null>(null);
  // Bulk status menu
  const [bulkMenuOpen, setBulkMenuOpen] = useState(false);
  const bulkMenuRef = useRef<HTMLDivElement | null>(null);

  // Read software from URL query param
  useEffect(() => {
    const sw = searchParams.get('software');
    if (sw) setSoftwareFilter(sw);
  }, [searchParams]);

  // Initial load: softwares
  useEffect(() => {
    apiClient.getSaasList()
      .then((res) => setSoftwares(res.data))
      .catch(() => setSoftwares([]));
  }, []);

  // Sectores disponibles (dependen del software seleccionado)
  useEffect(() => {
    apiClient.getLeadSectores(softwareFilter || undefined)
      .then((res) => setSectores(Array.isArray(res.data) ? res.data : []))
      .catch(() => setSectores([]));
  }, [softwareFilter]);

  // Debounce search input (300ms)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Close bulk menu when clicking outside
  useEffect(() => {
    if (!bulkMenuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (!bulkMenuRef.current?.contains(e.target as Node)) setBulkMenuOpen(false);
    };
    window.addEventListener('mousedown', onClick);
    return () => window.removeEventListener('mousedown', onClick);
  }, [bulkMenuOpen]);

  const fetchLeads = async (page = 1) => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        page: String(page),
        limit: vista === 'kanban' ? '200' : '25',
      };
      if (debouncedSearch) params.search = debouncedSearch;
      if (estadoFilter) params.estado = estadoFilter;
      if (prioridadFilter) params.prioridad = prioridadFilter;
      if (softwareFilter) params.softwareId = softwareFilter;
      if (telefonoFilter === 'con') params.hasTelefono = 'true';
      else if (telefonoFilter === 'sin') params.hasTelefono = 'false';
      else if (telefonoFilter === 'movil') params.tipoTelefono = 'movil';
      else if (telefonoFilter === 'fijo') params.tipoTelefono = 'fijo';
      if (emailFilter === 'con') params.hasEmail = 'true';
      else if (emailFilter === 'sin') params.hasEmail = 'false';
      if (sectorFilter) params.sector = sectorFilter;
      if (!showTagged) params.excludeTags = 'revisar-manualmente';
      const res = await apiClient.getLeads(params);
      setLeads(res.data.leads);
      setPagination(res.data.pagination);
      // drop selections for ids that vanished
      setSelectedIds((prev) => {
        const next = new Set<string>();
        const ids = new Set(res.data.leads.map((l: Lead) => l.id));
        prev.forEach((id) => { if (ids.has(id)) next.add(id); });
        return next;
      });
    } catch {
      console.error('Error fetching leads');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await apiClient.getLeadStats(
        softwareFilter || undefined,
        showTagged ? undefined : { excludeTags: 'revisar-manualmente' },
      );
      setStats({ total: res.data.total, recientes7d: res.data.recientes7d });
    } catch {
      console.error('Error fetching stats');
    }
  };

  useEffect(() => {
    fetchLeads(1);
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, estadoFilter, prioridadFilter, softwareFilter, telefonoFilter, emailFilter, sectorFilter, vista, showTagged]);

  const activeFilters = useMemo(() => {
    const list: { key: string; label: string; clear: () => void }[] = [];
    if (debouncedSearch) list.push({ key: 'q', label: `"${debouncedSearch}"`, clear: () => setSearch('') });
    if (softwareFilter) list.push({ key: 'sw', label: softwareFilter, clear: () => setSoftwareFilter('') });
    if (estadoFilter) list.push({ key: 'est', label: ESTADO_LABEL[estadoFilter], clear: () => setEstadoFilter('') });
    if (prioridadFilter) list.push({ key: 'pri', label: `Prioridad ${PRIORIDAD_LABEL[prioridadFilter]}`, clear: () => setPrioridadFilter('') });
    if (telefonoFilter) {
      const map: Record<Exclude<TelefonoFilter, ''>, string> = {
        con: 'Con teléfono', sin: 'Sin teléfono', movil: 'Solo móvil', fijo: 'Solo fijo',
      };
      list.push({ key: 'tel', label: map[telefonoFilter], clear: () => setTelefonoFilter('') });
    }
    if (emailFilter) {
      list.push({ key: 'em', label: emailFilter === 'con' ? 'Con email' : 'Sin email', clear: () => setEmailFilter('') });
    }
    if (sectorFilter) {
      list.push({ key: 'sec', label: `Sector: ${sectorFilter}`, clear: () => setSectorFilter('') });
    }
    return list;
  }, [debouncedSearch, softwareFilter, estadoFilter, prioridadFilter, telefonoFilter, emailFilter, sectorFilter]);

  const hasFilters = activeFilters.length > 0;

  const clearAllFilters = () => {
    setSearch('');
    setSoftwareFilter('');
    setEstadoFilter('');
    setPrioridadFilter('');
    setTelefonoFilter('');
    setEmailFilter('');
    setSectorFilter('');
  };

  // Selection helpers
  const allOnPageSelected = leads.length > 0 && leads.every((l) => selectedIds.has(l.id));
  const someOnPageSelected = leads.some((l) => selectedIds.has(l.id));
  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) leads.forEach((l) => next.delete(l.id));
      else leads.forEach((l) => next.add(l.id));
      return next;
    });
  };
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const clearSelection = () => setSelectedIds(new Set());

  // Mutations
  const deleteLeads = async (targets: Lead[]) => {
    try {
      await Promise.all(targets.map((l) => apiClient.deleteLead(l.id)));
      setConfirmDelete(null);
      clearSelection();
      fetchLeads(pagination.page);
      fetchStats();
    } catch {
      alert('Error eliminando leads');
    }
  };

  const handleStatusChange = async (id: string, estado: LeadEstado) => {
    try {
      await apiClient.changeLeadStatus(id, estado);
      fetchLeads(pagination.page);
    } catch {
      alert('Error cambiando estado');
    }
  };

  const bulkChangeStatus = async (estado: LeadEstado) => {
    const ids = Array.from(selectedIds);
    setBulkMenuOpen(false);
    try {
      await Promise.all(ids.map((id) => apiClient.changeLeadStatus(id, estado)));
      clearSelection();
      fetchLeads(pagination.page);
    } catch {
      alert('Error cambiando estado en lote');
    }
  };

  const selectedLeads = useMemo(
    () => leads.filter((l) => selectedIds.has(l.id)),
    [leads, selectedIds]
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] sm:text-[32px] font-bold tracking-tight text-[var(--text-primary)]">
            Leads
          </h1>
          <p className="text-[14px] text-[var(--text-secondary)] mt-1">
            Gestiona tus prospectos y seguimientos
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/leads/importar"
            className="flex items-center gap-2 px-3.5 py-2 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg text-[13px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-tertiary)] transition-all"
          >
            <Upload className="w-4 h-4" />
            Importar CSV
          </Link>
          <Link
            href="/dashboard/leads/nuevo"
            className="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-lg text-[13px] font-medium hover:shadow-lg hover:shadow-violet-500/25 transition-all"
          >
            <Plus className="w-4 h-4" />
            Nuevo lead
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard
          icon={<Users className="w-5 h-5 text-violet-600 dark:text-violet-400" />}
          iconBg="bg-violet-100 dark:bg-violet-900/30"
          value={stats.total}
          label="Leads totales"
        />
        <StatCard
          icon={<BarChart3 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
          iconBg="bg-emerald-100 dark:bg-emerald-900/30"
          value={stats.recientes7d}
          label="Nuevos (7 días)"
        />
        <StatCard
          icon={<SlidersHorizontal className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
          iconBg="bg-blue-100 dark:bg-blue-900/30"
          value={pagination.total}
          label={hasFilters ? 'Resultado filtrado' : 'En vista actual'}
          hint={hasFilters && stats.total > 0 ? `${Math.round((pagination.total / stats.total) * 100)}% del total` : undefined}
        />
      </div>

      {/* Sticky toolbar: search + quick chips + view toggle */}
      <div className="sticky top-[72px] z-20 -mx-2 px-2 py-2 bg-[var(--bg-primary)]/95 backdrop-blur-sm border-b border-transparent has-[:focus]:border-[var(--border-primary)]">
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl p-3 flex flex-wrap items-center gap-2 shadow-sm">
          {/* Search */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, email, empresa o teléfono..."
              className="w-full pl-9 pr-9 py-2 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg text-[14px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-violet-500/30"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] rounded"
                aria-label="Limpiar búsqueda"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick chip: con teléfono */}
          <ChipToggle
            active={telefonoFilter === 'con'}
            onClick={() => setTelefonoFilter(telefonoFilter === 'con' ? '' : 'con')}
            icon={<Phone className="w-3.5 h-3.5" />}
            label="Con tel."
          />
          {/* Quick chip: con email */}
          <ChipToggle
            active={emailFilter === 'con'}
            onClick={() => setEmailFilter(emailFilter === 'con' ? '' : 'con')}
            icon={<Mail className="w-3.5 h-3.5" />}
            label="Con email"
          />
          {/* Quick chip: mostrar/ocultar etiquetados como revisar-manualmente */}
          <ChipToggle
            active={showTagged}
            onClick={() => setShowTagged((v) => !v)}
            icon={<AlertTriangle className="w-3.5 h-3.5" />}
            label={showTagged ? 'Incluye revisar' : 'Solo PT (MiniMax)'}
          />

          {/* Estado select (compact) */}
          <SelectChip
            value={estadoFilter}
            onChange={(v) => setEstadoFilter(v as LeadEstado | '')}
            placeholder="Estado"
          >
            <option value="">Todos los estados</option>
            {ESTADOS.map((e) => (<option key={e} value={e}>{ESTADO_LABEL[e]}</option>))}
          </SelectChip>

          {/* Software select */}
          <SelectChip
            value={softwareFilter}
            onChange={setSoftwareFilter}
            placeholder="Software"
          >
            <option value="">Todos los softwares</option>
            {softwares.map((s) => (<option key={s.saas} value={s.saas}>{s.saas}</option>))}
          </SelectChip>

          {/* Sector select */}
          <SelectChip
            value={sectorFilter}
            onChange={setSectorFilter}
            placeholder="Sector"
          >
            <option value="">Todos los sectores</option>
            {sectores.map((s) => (<option key={s} value={s}>{s}</option>))}
          </SelectChip>

          {/* Más filtros (collapse) */}
          <button
            onClick={() => setShowAdvanced((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-medium border transition-all ${
              showAdvanced
                ? 'bg-violet-500/10 border-violet-500/30 text-violet-700 dark:text-violet-300'
                : 'bg-[var(--bg-primary)] border-[var(--border-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Más filtros
            {(prioridadFilter || (telefonoFilter && telefonoFilter !== 'con') || (emailFilter && emailFilter !== 'con')) && (
              <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
            )}
          </button>

          <div className="ml-auto flex items-center gap-2">
            {hasFilters && (
              <button
                onClick={clearAllFilters}
                className="text-[12px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] underline underline-offset-2"
              >
                Limpiar
              </button>
            )}

            {/* View toggle */}
            <div className="flex items-center bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg p-0.5">
              <button
                onClick={() => setVista('tabla')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[12px] font-medium transition-all ${
                  vista === 'tabla'
                    ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-sm'
                    : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
                }`}
              >
                <Table2 className="w-3.5 h-3.5" />
                Tabla
              </button>
              <button
                onClick={() => setVista('kanban')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[12px] font-medium transition-all ${
                  vista === 'kanban'
                    ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-sm'
                    : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                Kanban
              </button>
            </div>
          </div>
        </div>

        {/* Advanced filters drawer */}
        {showAdvanced && (
          <div className="mt-2 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl p-3 flex flex-wrap items-center gap-2">
            <span className="text-[12px] font-medium text-[var(--text-tertiary)] mr-1">Prioridad</span>
            <ChipToggle
              active={!prioridadFilter}
              onClick={() => setPrioridadFilter('')}
              label="Todas"
            />
            {PRIORIDADES.map((p) => (
              <ChipToggle
                key={p}
                active={prioridadFilter === p}
                onClick={() => setPrioridadFilter(prioridadFilter === p ? '' : p)}
                label={PRIORIDAD_LABEL[p]}
              />
            ))}
            <div className="w-px h-5 bg-[var(--border-primary)] mx-1" />
            <span className="text-[12px] font-medium text-[var(--text-tertiary)] mr-1">Teléfono</span>
            {([
              ['', 'Todos'],
              ['con', 'Con'],
              ['sin', 'Sin'],
              ['movil', 'Móvil'],
              ['fijo', 'Fijo'],
            ] as const).map(([val, lbl]) => (
              <ChipToggle
                key={val || 'all-tel'}
                active={telefonoFilter === val}
                onClick={() => setTelefonoFilter(val)}
                label={lbl}
              />
            ))}
            <div className="w-px h-5 bg-[var(--border-primary)] mx-1" />
            <span className="text-[12px] font-medium text-[var(--text-tertiary)] mr-1">Email</span>
            {([
              ['', 'Todos'],
              ['con', 'Con'],
              ['sin', 'Sin'],
            ] as const).map(([val, lbl]) => (
              <ChipToggle
                key={val || 'all-em'}
                active={emailFilter === val}
                onClick={() => setEmailFilter(val)}
                label={lbl}
              />
            ))}
          </div>
        )}
      </div>

      {/* Result count + active filter chips */}
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
        <span className="text-[22px] font-bold text-[var(--text-primary)] tabular-nums">
          {pagination.total}
        </span>
        <span className="text-[13px] text-[var(--text-secondary)]">
          {pagination.total === 1 ? 'lead' : 'leads'}
          {hasFilters ? ' filtrados' : ' totales'}
        </span>
        {hasFilters && stats.total > 0 && (
          <span className="text-[12px] text-[var(--text-tertiary)]">de {stats.total}</span>
        )}
        {hasFilters && (
          <div className="flex flex-wrap items-center gap-1.5 ml-auto sm:ml-2">
            {activeFilters.map((f) => (
              <button
                key={f.key}
                onClick={f.clear}
                className="group flex items-center gap-1 px-2 py-0.5 rounded-md bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-[11px] font-medium hover:bg-violet-200 dark:hover:bg-violet-900/50 transition-colors"
              >
                {f.label}
                <X className="w-3 h-3 opacity-60 group-hover:opacity-100" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      {vista === 'kanban' ? (
        <LeadsKanban
          leads={leads}
          onDelete={(id) => {
            const lead = leads.find((l) => l.id === id);
            if (lead) setConfirmDelete([lead]);
          }}
          onStatusChange={handleStatusChange}
        />
      ) : (
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl overflow-hidden">
          {/* Bulk action bar */}
          {selectedIds.size > 0 && (
            <div className="px-4 py-2.5 bg-violet-50 dark:bg-violet-900/20 border-b border-violet-200 dark:border-violet-900/40 flex flex-wrap items-center gap-3">
              <span className="text-[13px] font-medium text-violet-800 dark:text-violet-200">
                {selectedIds.size} seleccionado{selectedIds.size === 1 ? '' : 's'}
              </span>
              <div className="relative" ref={bulkMenuRef}>
                <button
                  onClick={() => setBulkMenuOpen((v) => !v)}
                  className="px-2.5 py-1 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-md text-[12px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                >
                  Cambiar estado…
                </button>
                {bulkMenuOpen && (
                  <div className="absolute left-0 top-[calc(100%+4px)] z-30 min-w-[180px] bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg shadow-xl py-1">
                    {ESTADOS.map((e) => (
                      <button
                        key={e}
                        onClick={() => bulkChangeStatus(e)}
                        className="w-full text-left px-3 py-1.5 text-[13px] text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                      >
                        {ESTADO_LABEL[e]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={() => setConfirmDelete(selectedLeads)}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 rounded-md text-[12px] font-medium hover:bg-red-500/20 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Eliminar
              </button>
              <button
                onClick={clearSelection}
                className="ml-auto text-[12px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] underline underline-offset-2"
              >
                Deseleccionar
              </button>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border-primary)] bg-[var(--bg-tertiary)]/40">
                  <th className="w-10 px-3 py-2.5">
                    <Checkbox
                      checked={allOnPageSelected}
                      indeterminate={!allOnPageSelected && someOnPageSelected}
                      onChange={toggleSelectAll}
                      aria-label="Seleccionar todos"
                    />
                  </th>
                  <th className="text-left px-3 py-2.5 text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Lead</th>
                  <th className="text-left px-3 py-2.5 text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider hidden md:table-cell">Sector</th>
                  <th className="text-left px-3 py-2.5 text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider hidden md:table-cell">Software</th>
                  <th className="text-left px-3 py-2.5 text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider hidden lg:table-cell">Contacto</th>
                  <th className="text-left px-3 py-2.5 text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Estado</th>
                  <th className="text-left px-3 py-2.5 text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider hidden md:table-cell">Prioridad</th>
                  <th className="text-left px-3 py-2.5 text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider hidden xl:table-cell">Origen</th>
                  <th className="text-left px-3 py-2.5 text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider hidden lg:table-cell">Fecha</th>
                  <th className="text-right px-3 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-primary)]">
                {loading && leads.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-6 py-12 text-center text-[var(--text-tertiary)]">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-2 border-[var(--border-primary)] border-t-[var(--text-primary)] rounded-full animate-spin" />
                        <span>Cargando leads…</span>
                      </div>
                    </td>
                  </tr>
                )}
                {!loading && leads.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-6 py-14 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-14 h-14 rounded-2xl bg-[var(--bg-tertiary)] flex items-center justify-center">
                          <Users className="w-7 h-7 text-[var(--text-tertiary)] opacity-50" />
                        </div>
                        <p className="text-[15px] font-medium text-[var(--text-secondary)]">
                          {hasFilters ? 'Ningún lead coincide con los filtros' : 'Sin leads todavía'}
                        </p>
                        <p className="text-[13px] text-[var(--text-tertiary)]">
                          {hasFilters ? 'Prueba a relajar los filtros o limpiarlos.' : 'Crea uno nuevo o importa desde CSV.'}
                        </p>
                        {hasFilters && (
                          <button
                            onClick={clearAllFilters}
                            className="mt-1 px-3 py-1.5 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-lg text-[12px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-primary)] transition-colors"
                          >
                            Limpiar filtros
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
                {leads.map((lead) => {
                  const selected = selectedIds.has(lead.id);
                  const tel = digitsOnly(lead.telefono);
                  return (
                    <tr
                      key={lead.id}
                      className={`group transition-colors ${
                        selected
                          ? 'bg-violet-50/60 dark:bg-violet-900/20'
                          : 'hover:bg-[var(--bg-tertiary)]/40'
                      }`}
                    >
                      <td className="px-3 py-2.5">
                        <Checkbox
                          checked={selected}
                          onChange={() => toggleSelect(lead.id)}
                          aria-label={`Seleccionar ${lead.nombre}`}
                        />
                      </td>
                      <td className="px-3 py-2.5 min-w-[220px]">
                        <Link href={`/dashboard/leads/${lead.id}`} className="flex items-center gap-3 group/link">
                          <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${avatarGradient(lead.nombre)} flex items-center justify-center text-white text-[13px] font-bold shadow-sm`}>
                            {lead.nombre.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[14px] font-medium text-[var(--text-primary)] truncate group-hover/link:text-violet-600 dark:group-hover/link:text-violet-400 transition-colors">
                              {lead.nombre}
                            </p>
                            {lead.empresa ? (
                              <p className="text-[12px] text-[var(--text-tertiary)] truncate">{lead.empresa}</p>
                            ) : lead.email ? (
                              <p className="text-[12px] text-[var(--text-tertiary)] truncate">{lead.email}</p>
                            ) : null}
                          </div>
                        </Link>
                      </td>
                      <td className="px-3 py-2.5 hidden md:table-cell">
                        {(() => {
                          const ia = lead.metadata?.iaClassification;
                          if (!ia?.sector && !ia?.subsector) return <span className="text-[12px] text-[var(--text-tertiary)]">—</span>;
                          return (
                            <div className="flex flex-wrap gap-1">
                              {ia.subsector && (
                                <span className="px-1.5 py-0.5 rounded-md bg-violet-500/10 text-violet-600 text-[11px] font-medium truncate max-w-[120px]">
                                  {ia.subsector}
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                      <td className="px-3 py-2.5 text-[13px] text-[var(--text-secondary)] hidden md:table-cell">{lead.softwareId}</td>
                      <td className="px-3 py-2.5 hidden lg:table-cell">
                        <div className="flex items-center gap-1.5">
                          {lead.telefono ? (
                            <a
                              href={`tel:${lead.telefono}`}
                              className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-emerald-100 hover:text-emerald-700 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-400 transition-colors"
                              title={`Llamar ${lead.telefono}`}
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </a>
                          ) : (
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-[var(--bg-tertiary)]/50 text-[var(--text-tertiary)] opacity-40">
                              <Phone className="w-3.5 h-3.5" />
                            </span>
                          )}
                          {lead.telefono && tel ? (
                            <a
                              href={`https://wa.me/${tel}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-emerald-100 hover:text-emerald-700 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-400 transition-colors"
                              title="Abrir WhatsApp"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </a>
                          ) : (
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-[var(--bg-tertiary)]/50 text-[var(--text-tertiary)] opacity-40">
                              <MessageCircle className="w-3.5 h-3.5" />
                            </span>
                          )}
                          {lead.email ? (
                            <a
                              href={`mailto:${lead.email}`}
                              className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-blue-100 hover:text-blue-700 dark:hover:bg-blue-900/30 dark:hover:text-blue-400 transition-colors"
                              title={`Enviar email a ${lead.email}`}
                            >
                              <Mail className="w-3.5 h-3.5" />
                            </a>
                          ) : (
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-[var(--bg-tertiary)]/50 text-[var(--text-tertiary)] opacity-40">
                              <Mail className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2.5"><LeadStatusBadge estado={lead.estado} /></td>
                      <td className="px-3 py-2.5 hidden md:table-cell"><LeadPriorityBadge prioridad={lead.prioridad} /></td>
                      <td className="px-3 py-2.5 text-[13px] text-[var(--text-secondary)] capitalize hidden xl:table-cell">{lead.origen}</td>
                      <td className="px-3 py-2.5 text-[13px] text-[var(--text-tertiary)] hidden lg:table-cell whitespace-nowrap">{formatDate(lead.createdAt)}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center justify-end gap-1 md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100 transition-opacity">
                          <Link
                            href={`/dashboard/leads/${lead.id}`}
                            className="flex items-center gap-1 text-[12px] font-medium text-violet-600 dark:text-violet-400 hover:underline px-1.5"
                          >
                            Ver <ArrowRight className="w-3 h-3" />
                          </Link>
                          <button
                            onClick={() => setConfirmDelete([lead])}
                            className="p-1.5 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-md transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {pagination.pages > 1 && (
            <div className="px-4 py-3 border-t border-[var(--border-primary)] flex items-center justify-between">
              <p className="text-[13px] text-[var(--text-tertiary)]">
                Página {pagination.page} de {pagination.pages} · {pagination.total} leads
              </p>
              <div className="flex gap-1 items-center">
                <button
                  onClick={() => fetchLeads(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="p-1.5 rounded-lg border border-[var(--border-primary)] text-[var(--text-secondary)] disabled:opacity-30 hover:bg-[var(--bg-tertiary)] transition-colors"
                  aria-label="Página anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-[13px] text-[var(--text-secondary)] px-2 tabular-nums">{pagination.page} / {pagination.pages}</span>
                <button
                  onClick={() => fetchLeads(pagination.page + 1)}
                  disabled={pagination.page >= pagination.pages}
                  className="p-1.5 rounded-lg border border-[var(--border-primary)] text-[var(--text-secondary)] disabled:opacity-30 hover:bg-[var(--bg-tertiary)] transition-colors"
                  aria-label="Página siguiente"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Confirm delete modal */}
      {confirmDelete && (
        <ConfirmDeleteModal
          leads={confirmDelete}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => deleteLeads(confirmDelete)}
        />
      )}
    </div>
  );
}

/* -------------------- Sub-components -------------------- */

function StatCard({
  icon,
  iconBg,
  value,
  label,
  hint,
}: {
  icon: React.ReactNode;
  iconBg: string;
  value: number;
  label: string;
  hint?: string;
}) {
  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl p-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${iconBg}`}>{icon}</div>
        <div className="min-w-0">
          <p className="text-[22px] font-bold text-[var(--text-primary)] leading-none tabular-nums">{value}</p>
          <p className="text-[12px] text-[var(--text-tertiary)] mt-1 truncate">{label}</p>
          {hint && <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">{hint}</p>}
        </div>
      </div>
    </div>
  );
}

function ChipToggle({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-medium border transition-all ${
        active
          ? 'bg-violet-500/10 border-violet-500/30 text-violet-700 dark:text-violet-300'
          : 'bg-[var(--bg-primary)] border-[var(--border-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-tertiary)]'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function SelectChip({
  value,
  onChange,
  placeholder,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  children: React.ReactNode;
}) {
  const active = value !== '';
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`appearance-none pl-3 pr-7 py-2 rounded-lg text-[13px] font-medium border focus:outline-none focus:ring-2 focus:ring-violet-500/30 transition-colors ${
          active
            ? 'bg-violet-500/10 border-violet-500/30 text-violet-700 dark:text-violet-300'
            : 'bg-[var(--bg-primary)] border-[var(--border-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
        }`}
        aria-label={placeholder}
      >
        {children}
      </select>
      <ChevronRight className={`pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 rotate-90 ${active ? 'text-violet-500' : 'text-[var(--text-tertiary)]'}`} />
    </div>
  );
}

function Checkbox({
  checked,
  indeterminate,
  onChange,
  ...rest
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  const ref = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = !!indeterminate;
  }, [indeterminate]);
  return (
    <label className="inline-flex items-center cursor-pointer select-none">
      <input
        ref={ref}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="peer sr-only"
        {...rest}
      />
      <span
        className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
          checked || indeterminate
            ? 'bg-violet-600 border-violet-600 text-white'
            : 'bg-[var(--bg-secondary)] border-[var(--border-primary)] peer-hover:border-[var(--text-tertiary)]'
        }`}
      >
        {indeterminate ? (
          <span className="w-2 h-0.5 bg-white rounded" />
        ) : checked ? (
          <Check className="w-3 h-3" strokeWidth={3} />
        ) : null}
      </span>
    </label>
  );
}

function ConfirmDeleteModal({
  leads,
  onCancel,
  onConfirm,
}: {
  leads: Lead[];
  onCancel: () => void;
  onConfirm: () => void;
}) {
  // ESC closes
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  const multiple = leads.length > 1;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <div className="min-w-0">
            <h3 className="text-[16px] font-semibold text-[var(--text-primary)]">
              {multiple ? `Eliminar ${leads.length} leads` : 'Eliminar lead'}
            </h3>
            <p className="text-[13px] text-[var(--text-secondary)] mt-1">
              {multiple
                ? 'Esta acción no se puede deshacer. Se eliminarán los siguientes leads:'
                : `Esta acción no se puede deshacer. ${leads[0].nombre} será eliminado permanentemente.`}
            </p>
            {multiple && (
              <ul className="mt-3 max-h-32 overflow-y-auto text-[12px] text-[var(--text-tertiary)] space-y-0.5">
                {leads.slice(0, 8).map((l) => (
                  <li key={l.id}>• {l.nombre}{l.empresa ? ` — ${l.empresa}` : ''}</li>
                ))}
                {leads.length > 8 && <li>+ {leads.length - 8} más…</li>}
              </ul>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-lg text-[13px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-primary)] transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded-lg text-[13px] font-medium hover:bg-red-700 transition-colors"
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}
