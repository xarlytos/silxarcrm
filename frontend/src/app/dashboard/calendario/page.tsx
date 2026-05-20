'use client';

import { useState, useEffect, useMemo } from 'react';
import { apiClient } from '@/lib/api';
import { CalendarioEvento } from '@/types';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  User,
  X,
  Trash2,
  Filter,
  CalendarDays,
  CheckSquare,
  List,
  LayoutGrid,
  Clock,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, isToday, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const COLORES = {
  blue: { bg: 'bg-blue-500', light: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
  green: { bg: 'bg-emerald-500', light: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' },
  purple: { bg: 'bg-violet-500', light: 'bg-violet-100', text: 'text-violet-700', border: 'border-violet-200' },
  orange: { bg: 'bg-orange-500', light: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' },
  red: { bg: 'bg-rose-500', light: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-200' },
  pink: { bg: 'bg-pink-500', light: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-200' },
};

const ASIGNADOS = [
  { value: 'carlos', label: 'Carlos', icon: User, color: 'text-blue-500' },
  { value: 'silviu', label: 'Silviu', icon: User, color: 'text-violet-500' },
  { value: 'ambos', label: 'Ambos', icon: User, color: 'text-emerald-500' },
];

interface EventoForm {
  titulo: string;
  descripcion: string;
  fechaInicio: string;
  fechaFin: string;
  todoElDia: boolean;
  asignadoA: 'carlos' | 'silviu' | 'ambos';
  color: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'pink';
}

const formVacio: EventoForm = {
  titulo: '',
  descripcion: '',
  fechaInicio: '',
  fechaFin: '',
  todoElDia: false,
  asignadoA: 'ambos',
  color: 'blue',
};

export default function CalendarioPage() {
  const [fechaActual, setFechaActual] = useState(new Date());
  const [eventos, setEventos] = useState<CalendarioEvento[]>([]);
  const [stats, setStats] = useState({ hoy: 0, pendientesCarlos: 0, pendientesSilviu: 0, completadosEsteMes: 0 });
  const [filtro, setFiltro] = useState<'todos' | 'carlos' | 'silviu'>('todos');
  const [vista, setVista] = useState<'calendario' | 'lista'>('calendario');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modalEliminar, setModalEliminar] = useState<CalendarioEvento | null>(null);
  const [eventoEditando, setEventoEditando] = useState<CalendarioEvento | null>(null);
  const [form, setForm] = useState<EventoForm>(formVacio);
  const [loading, setLoading] = useState(false);

  const diasSemana = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  const mesAnterior = () => setFechaActual(subMonths(fechaActual, 1));
  const mesSiguiente = () => setFechaActual(addMonths(fechaActual, 1));
  const irAHoy = () => setFechaActual(new Date());

  const diasDelMes = useMemo(() => {
    const inicio = startOfWeek(startOfMonth(fechaActual), { weekStartsOn: 1 });
    const fin = endOfWeek(endOfMonth(fechaActual), { weekStartsOn: 1 });
    return eachDayOfInterval({ start: inicio, end: fin });
  }, [fechaActual]);

  const fetchEventos = async () => {
    try {
      const inicio = format(startOfMonth(fechaActual), 'yyyy-MM-dd');
      const fin = format(endOfMonth(fechaActual), 'yyyy-MM-dd');
      const res = await apiClient.getCalendarioEventos({ inicio, fin, asignadoA: filtro });
      setEventos(res.data || []);
    } catch (error) {
      console.error('Error cargando eventos:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await apiClient.getCalendarioStats();
      setStats(res.data);
    } catch (error) {
      console.error('Error cargando stats:', error);
    }
  };

  useEffect(() => {
    fetchEventos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fechaActual, filtro]);

  useEffect(() => {
    fetchStats();
  }, []);

  const abrirModalCrear = (fecha?: Date) => {
    const fechaBase = fecha || new Date();
    const fechaStr = format(fechaBase, "yyyy-MM-dd'T'HH:mm");
    setForm({ ...formVacio, fechaInicio: fechaStr, fechaFin: fechaStr });
    setEventoEditando(null);
    setModalAbierto(true);
  };

  const abrirModalEditar = (evento: CalendarioEvento) => {
    setEventoEditando(evento);
    setForm({
      titulo: evento.titulo,
      descripcion: evento.descripcion || '',
      fechaInicio: format(parseISO(evento.fechaInicio), "yyyy-MM-dd'T'HH:mm"),
      fechaFin: format(parseISO(evento.fechaFin), "yyyy-MM-dd'T'HH:mm"),
      todoElDia: evento.todoElDia,
      asignadoA: evento.asignadoA,
      color: evento.color,
    });
    setModalAbierto(true);
  };

  const guardarEvento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.titulo || !form.fechaInicio) return;

    setLoading(true);
    try {
      const data = {
        ...form,
        fechaInicio: new Date(form.fechaInicio).toISOString(),
        fechaFin: new Date(form.fechaFin || form.fechaInicio).toISOString(),
      };

      if (eventoEditando) {
        await apiClient.updateCalendarioEvento(eventoEditando.id, data);
      } else {
        await apiClient.createCalendarioEvento(data);
      }

      setModalAbierto(false);
      setForm(formVacio);
      fetchEventos();
      fetchStats();
    } catch (error) {
      console.error('Error guardando evento:', error);
    } finally {
      setLoading(false);
    }
  };

  const eliminarEvento = async () => {
    if (!modalEliminar) return;

    try {
      await apiClient.deleteCalendarioEvento(modalEliminar.id);
      setModalEliminar(null);
      fetchEventos();
      fetchStats();
    } catch (error) {
      console.error('Error eliminando evento:', error);
    }
  };

  const eventosDelDia = (dia: Date) => {
    return eventos.filter(e => isSameDay(parseISO(e.fechaInicio), dia));
  };

  const eventosAgrupados = useMemo(() => {
    const ordenados = [...eventos].sort(
      (a, b) => parseISO(a.fechaInicio).getTime() - parseISO(b.fechaInicio).getTime()
    );
    const grupos = new Map<string, CalendarioEvento[]>();
    for (const ev of ordenados) {
      const key = format(parseISO(ev.fechaInicio), 'yyyy-MM-dd');
      const lista = grupos.get(key) || [];
      lista.push(ev);
      grupos.set(key, lista);
    }
    return Array.from(grupos.entries()).map(([key, items]) => ({
      fecha: parseISO(key + 'T00:00:00'),
      eventos: items,
    }));
  }, [eventos]);

  const toggleCompletado = async (evento: CalendarioEvento, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiClient.updateCalendarioEvento(evento.id, { completado: !evento.completado });
      fetchEventos();
      fetchStats();
    } catch (error) {
      console.error('Error actualizando evento:', error);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full xl:flex-1 xl:min-h-0">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <CalendarIcon className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-[32px] font-bold tracking-tight text-[var(--text-primary)]">
              Calendario
            </h1>
          </div>
          <p className="text-[15px] text-[var(--text-secondary)]">
            Gestiona eventos y tareas entre Carlos y Silviu
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => abrirModalCrear()}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl text-[14px] font-medium hover:shadow-lg hover:shadow-violet-500/25 transition-all"
          >
            <Plus className="w-4 h-4" />
            Nuevo Evento
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <CalendarDays className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-[13px] text-[var(--text-tertiary)]">Hoy</span>
          </div>
          <p className="text-[28px] font-bold text-[var(--text-primary)]">{stats.hoy}</p>
          <p className="text-[12px] text-[var(--text-tertiary)]">eventos</p>
        </div>

        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <User className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-[13px] text-[var(--text-tertiary)]">Pendientes Carlos</span>
          </div>
          <p className="text-[28px] font-bold text-blue-600">{stats.pendientesCarlos}</p>
          <p className="text-[12px] text-[var(--text-tertiary)]">tareas</p>
        </div>

        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
              <User className="w-5 h-5 text-violet-600" />
            </div>
            <span className="text-[13px] text-[var(--text-tertiary)]">Pendientes Silviu</span>
          </div>
          <p className="text-[28px] font-bold text-violet-600">{stats.pendientesSilviu}</p>
          <p className="text-[12px] text-[var(--text-tertiary)]">tareas</p>
        </div>

        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <CheckSquare className="w-5 h-5 text-emerald-600" />
            </div>
            <span className="text-[13px] text-[var(--text-tertiary)]">Completados</span>
          </div>
          <p className="text-[28px] font-bold text-emerald-600">{stats.completadosEsteMes}</p>
          <p className="text-[12px] text-[var(--text-tertiary)]">este mes</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col xl:flex-row gap-6 xl:flex-1 xl:min-h-0">
        {/* Sidebar */}
        <div className="w-full xl:w-80 space-y-6 xl:overflow-y-auto xl:pr-2">
          {/* Quick Add Form */}
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl p-5">
            <h3 className="text-[16px] font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Crear Evento Rápido
            </h3>
            <form onSubmit={guardarEvento} className="space-y-3">
              <input
                type="text"
                placeholder="Título del evento"
                value={form.titulo}
                onChange={e => setForm({ ...form, titulo: e.target.value })}
                className="w-full px-4 py-2.5 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl text-[14px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-violet-500/30"
              />
              <input
                type="datetime-local"
                value={form.fechaInicio}
                onChange={e => setForm({ ...form, fechaInicio: e.target.value, fechaFin: e.target.value })}
                className="w-full px-4 py-2.5 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl text-[14px] text-[var(--text-primary)]"
              />
              <select
                value={form.asignadoA}
                onChange={e => setForm({ ...form, asignadoA: e.target.value as any })}
                className="w-full px-4 py-2.5 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl text-[14px] text-[var(--text-primary)]"
              >
                {ASIGNADOS.map(a => (
                  <option key={a.value} value={a.value}>{a.label}</option>
                ))}
              </select>
              <div className="flex gap-2">
                {Object.keys(COLORES).map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setForm({ ...form, color: color as any })}
                    className={`w-8 h-8 rounded-full ${COLORES[color as keyof typeof COLORES].bg} ${
                      form.color === color ? 'ring-2 ring-offset-2 ring-[var(--text-primary)]' : ''
                    }`}
                  />
                ))}
              </div>
              <button
                type="submit"
                disabled={loading || !form.titulo}
                className="w-full py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl text-[14px] font-medium hover:shadow-lg transition-all disabled:opacity-50"
              >
                {loading ? 'Guardando...' : 'Crear Evento'}
              </button>
            </form>
          </div>

          {/* Filter */}
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl p-5">
            <h3 className="text-[14px] font-medium text-[var(--text-primary)] mb-3 flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filtrar por
            </h3>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'todos', label: 'Todos', color: 'bg-gray-500' },
                { value: 'carlos', label: 'Carlos', color: 'bg-blue-500' },
                { value: 'silviu', label: 'Silviu', color: 'bg-violet-500' },
              ].map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFiltro(f.value as any)}
                  className={`px-3 py-1.5 rounded-full text-[13px] font-medium transition-all ${
                    filtro === f.value
                      ? `${f.color} text-white`
                      : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Leyenda */}
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl p-5">
            <h3 className="text-[14px] font-medium text-[var(--text-primary)] mb-3">Categorías</h3>
            <div className="space-y-2">
              {ASIGNADOS.map((a) => (
                <div key={a.value} className="flex items-center gap-2 text-[13px] text-[var(--text-secondary)]">
                  <div className={`w-3 h-3 rounded-full ${a.color.replace('text-', 'bg-')}`} />
                  {a.label}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="xl:flex-1 xl:min-h-0 min-h-[500px] bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl overflow-hidden flex flex-col">
          {/* Calendar Header */}
          <div className="px-6 py-4 border-b border-[var(--border-primary)] flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h2 className="text-[20px] font-semibold text-[var(--text-primary)] capitalize">
                {format(fechaActual, 'MMMM yyyy', { locale: es })}
              </h2>
              <div className="flex items-center gap-1">
                <button
                  onClick={mesAnterior}
                  className="p-2 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-[var(--text-secondary)]" />
                </button>
                <button
                  onClick={irAHoy}
                  className="px-3 py-1.5 text-[13px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
                >
                  Hoy
                </button>
                <button
                  onClick={mesSiguiente}
                  className="p-2 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
                >
                  <ChevronRight className="w-5 h-5 text-[var(--text-secondary)]" />
                </button>
              </div>
            </div>

            <div className="inline-flex items-center gap-1 p-1 bg-[var(--bg-tertiary)] rounded-xl">
              <button
                onClick={() => setVista('calendario')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all ${
                  vista === 'calendario'
                    ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
                Calendario
              </button>
              <button
                onClick={() => setVista('lista')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all ${
                  vista === 'lista'
                    ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <List className="w-4 h-4" />
                Lista
              </button>
            </div>
          </div>

          {vista === 'calendario' && (
          <>
          {/* Days Header */}
          <div className="grid grid-cols-7 border-b border-[var(--border-primary)]">
            {diasSemana.map((dia) => (
              <div key={dia} className="px-2 py-3 text-center text-[13px] font-medium text-[var(--text-tertiary)]">
                {dia}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 grid-rows-[repeat(6,1fr)] flex-1 overflow-y-auto">
            {diasDelMes.map((dia, idx) => {
              const esHoy = isToday(dia);
              const esMesActual = isSameMonth(dia, fechaActual);
              const eventosDia = eventosDelDia(dia);

              return (
                <div
                  key={idx}
                  onClick={() => abrirModalCrear(dia)}
                  className={`min-h-0 p-2 border-b border-r border-[var(--border-primary)] cursor-pointer transition-colors hover:bg-[var(--bg-tertiary)]/50 overflow-hidden ${
                    !esMesActual ? 'bg-[var(--bg-tertiary)]/30' : ''
                  }`}
                >
                  <div className={`w-7 h-7 flex items-center justify-center text-[13px] font-medium rounded-full mb-1 ${
                    esHoy
                      ? 'bg-violet-500 text-white'
                      : 'text-[var(--text-secondary)]'
                  }`}>
                    {format(dia, 'd')}
                  </div>
                  <div className="space-y-1">
                    {eventosDia.slice(0, 3).map((evento) => (
                      <div
                        key={evento.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          abrirModalEditar(evento);
                        }}
                        className={`px-2 py-1 rounded-lg text-[11px] font-medium truncate cursor-pointer transition-all hover:opacity-80 ${
                          evento.completado
                            ? 'bg-gray-200 text-gray-500 line-through'
                            : `${COLORES[evento.color].light} ${COLORES[evento.color].text}`
                        }`}
                      >
                        {evento.todoElDia ? '' : format(parseISO(evento.fechaInicio), 'HH:mm') + ' '}
                        {evento.titulo}
                      </div>
                    ))}
                    {eventosDia.length > 3 && (
                      <div className="text-[11px] text-[var(--text-tertiary)] px-2">
                        +{eventosDia.length - 3} más
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          </>
          )}

          {vista === 'lista' && (
            <div className="flex-1 overflow-y-auto">
              {eventosAgrupados.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-16 gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-[var(--bg-tertiary)] flex items-center justify-center">
                    <CalendarDays className="w-7 h-7 text-[var(--text-tertiary)]" />
                  </div>
                  <p className="text-[14px] text-[var(--text-secondary)]">
                    No hay eventos este mes
                  </p>
                  <button
                    onClick={() => abrirModalCrear()}
                    className="text-[13px] text-violet-600 hover:text-violet-700 font-medium"
                  >
                    Crear evento
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-[var(--border-primary)]">
                  {eventosAgrupados.map((grupo) => {
                    const esHoyGrupo = isToday(grupo.fecha);
                    return (
                      <div key={grupo.fecha.toISOString()} className="px-6 py-4">
                        <div className="flex items-baseline gap-3 mb-3">
                          <div className={`text-[13px] font-semibold uppercase tracking-wide ${
                            esHoyGrupo ? 'text-violet-600' : 'text-[var(--text-tertiary)]'
                          }`}>
                            {esHoyGrupo ? 'Hoy · ' : ''}{format(grupo.fecha, "EEEE d 'de' MMMM", { locale: es })}
                          </div>
                          <span className="text-[12px] text-[var(--text-tertiary)]">
                            {grupo.eventos.length} {grupo.eventos.length === 1 ? 'evento' : 'eventos'}
                          </span>
                        </div>
                        <div className="space-y-2">
                          {grupo.eventos.map((evento) => {
                            const asignado = ASIGNADOS.find(a => a.value === evento.asignadoA);
                            return (
                              <div
                                key={evento.id}
                                onClick={() => abrirModalEditar(evento)}
                                className={`group flex items-center gap-3 px-4 py-3 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-primary)] cursor-pointer transition-all hover:shadow-sm hover:border-violet-200 ${
                                  evento.completado ? 'opacity-60' : ''
                                }`}
                              >
                                <button
                                  onClick={(e) => toggleCompletado(evento, e)}
                                  className={`flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                                    evento.completado
                                      ? 'bg-emerald-500 border-emerald-500'
                                      : 'border-[var(--border-primary)] hover:border-violet-400'
                                  }`}
                                  title={evento.completado ? 'Marcar como pendiente' : 'Marcar como completado'}
                                >
                                  {evento.completado && <CheckSquare className="w-3 h-3 text-white" />}
                                </button>

                                <div className={`flex-shrink-0 w-1 h-10 rounded-full ${COLORES[evento.color].bg}`} />

                                <div className="flex-shrink-0 flex items-center gap-1.5 min-w-[80px] text-[13px] text-[var(--text-secondary)]">
                                  <Clock className="w-3.5 h-3.5" />
                                  {evento.todoElDia ? 'Todo el día' : format(parseISO(evento.fechaInicio), 'HH:mm')}
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className={`text-[14px] font-medium text-[var(--text-primary)] truncate ${
                                    evento.completado ? 'line-through' : ''
                                  }`}>
                                    {evento.titulo}
                                  </div>
                                  {evento.descripcion && (
                                    <div className="text-[12px] text-[var(--text-tertiary)] truncate">
                                      {evento.descripcion}
                                    </div>
                                  )}
                                </div>

                                {asignado && (
                                  <div className={`flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium bg-[var(--bg-tertiary)] ${asignado.color}`}>
                                    <asignado.icon className="w-3 h-3" />
                                    {asignado.label}
                                  </div>
                                )}

                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setModalEliminar(evento);
                                  }}
                                  className="flex-shrink-0 p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                                  title="Eliminar"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal Crear/Editar */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-[var(--bg-secondary)] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-[var(--border-primary)] flex items-center justify-between">
              <h3 className="text-[18px] font-semibold text-[var(--text-primary)]">
                {eventoEditando ? 'Editar Evento' : 'Nuevo Evento'}
              </h3>
              <button
                onClick={() => setModalAbierto(false)}
                className="p-2 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-[var(--text-tertiary)]" />
              </button>
            </div>

            <form onSubmit={guardarEvento} className="p-6 space-y-4">
              <div>
                <label className="text-[13px] font-medium text-[var(--text-secondary)] block mb-1.5">
                  Título
                </label>
                <input
                  type="text"
                  value={form.titulo}
                  onChange={e => setForm({ ...form, titulo: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl text-[14px] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                  required
                />
              </div>

              <div>
                <label className="text-[13px] font-medium text-[var(--text-secondary)] block mb-1.5">
                  Descripción
                </label>
                <textarea
                  value={form.descripcion}
                  onChange={e => setForm({ ...form, descripcion: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2.5 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl text-[14px] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-violet-500/30 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[13px] font-medium text-[var(--text-secondary)] block mb-1.5">
                    Inicio
                  </label>
                  <input
                    type="datetime-local"
                    value={form.fechaInicio}
                    onChange={e => setForm({ ...form, fechaInicio: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl text-[14px] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                    required
                  />
                </div>
                <div>
                  <label className="text-[13px] font-medium text-[var(--text-secondary)] block mb-1.5">
                    Fin
                  </label>
                  <input
                    type="datetime-local"
                    value={form.fechaFin}
                    onChange={e => setForm({ ...form, fechaFin: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl text-[14px] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="todoElDia"
                  checked={form.todoElDia}
                  onChange={e => setForm({ ...form, todoElDia: e.target.checked })}
                  className="w-4 h-4 rounded border-[var(--border-primary)] text-violet-500 focus:ring-violet-500"
                />
                <label htmlFor="todoElDia" className="text-[14px] text-[var(--text-secondary)]">
                  Todo el día
                </label>
              </div>

              <div>
                <label className="text-[13px] font-medium text-[var(--text-secondary)] block mb-1.5">
                  Asignado a
                </label>
                <div className="flex gap-2">
                  {ASIGNADOS.map((a) => (
                    <button
                      key={a.value}
                      type="button"
                      onClick={() => setForm({ ...form, asignadoA: a.value as any })}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[14px] font-medium transition-all ${
                        form.asignadoA === a.value
                          ? 'bg-violet-500 text-white'
                          : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <a.icon className="w-4 h-4" />
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[13px] font-medium text-[var(--text-secondary)] block mb-1.5">
                  Color
                </label>
                <div className="flex gap-3">
                  {Object.keys(COLORES).map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setForm({ ...form, color: color as any })}
                      className={`w-10 h-10 rounded-xl ${COLORES[color as keyof typeof COLORES].bg} transition-all ${
                        form.color === color
                          ? 'ring-2 ring-offset-2 ring-[var(--text-primary)] scale-110'
                          : 'hover:scale-105'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                {eventoEditando && (
                  <button
                    type="button"
                    onClick={() => {
                      setModalEliminar(eventoEditando);
                      setModalAbierto(false);
                    }}
                    className="px-4 py-2.5 bg-red-100 text-red-600 rounded-xl text-[14px] font-medium hover:bg-red-200 transition-colors flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Eliminar
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setModalAbierto(false)}
                  className="flex-1 px-4 py-2.5 bg-[var(--bg-tertiary)] text-[var(--text-secondary)] rounded-xl text-[14px] font-medium hover:text-[var(--text-primary)] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl text-[14px] font-medium hover:shadow-lg transition-all disabled:opacity-50"
                >
                  {loading ? 'Guardando...' : eventoEditando ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Eliminar */}
      {modalEliminar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-[var(--bg-secondary)] rounded-2xl w-full max-w-sm p-6">
            <h3 className="text-[18px] font-semibold text-[var(--text-primary)] mb-2">
              Eliminar Evento
            </h3>
            <p className="text-[14px] text-[var(--text-secondary)] mb-6">
              ¿Estás seguro de que quieres eliminar &ldquo;{modalEliminar.titulo}&rdquo;? Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setModalEliminar(null)}
                className="flex-1 px-4 py-2.5 bg-[var(--bg-tertiary)] text-[var(--text-secondary)] rounded-xl text-[14px] font-medium hover:text-[var(--text-primary)] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={eliminarEvento}
                className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-xl text-[14px] font-medium hover:bg-red-600 transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
