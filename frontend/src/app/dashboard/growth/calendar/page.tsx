'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiClient } from '@/lib/api';
import Link from 'next/link';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle,
  CalendarDays,
  List,
  Megaphone,
  FileText,
  Mail,
  CalendarClock,
  Sparkles,
  TrendingUp,
} from 'lucide-react';

type ViewMode = 'month' | 'agenda';

interface CalItem {
  id: string;
  type: 'post' | 'content' | 'email' | 'event';
  title: string;
  date: string;
  status: string;
  platform?: string | null;
  accountName?: string | null;
  contentType?: string;
  campaignId?: string | null;
  brandId?: string | null;
  color: string;
}

const TYPE_META: Record<CalItem['type'], { label: string; icon: any; color: string }> = {
  post: { label: 'Posts', icon: Megaphone, color: '#ec4899' },
  content: { label: 'Contenido SEO', icon: FileText, color: '#10b981' },
  email: { label: 'Emails', icon: Mail, color: '#3b82f6' },
  event: { label: 'Eventos', icon: CalendarClock, color: '#f59e0b' },
};

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const PLATFORMS_FOR_BEST = ['INSTAGRAM', 'LINKEDIN', 'X', 'TIKTOK', 'FACEBOOK'];

export default function EditorialCalendar() {
  const [items, setItems] = useState<CalItem[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [softwareId, setSoftwareId] = useState('');
  const [softwares, setSoftwares] = useState<Array<{ id: string; nombre: string }>>([]);
  const [view, setView] = useState<ViewMode>('month');
  const [activeTypes, setActiveTypes] = useState<Set<CalItem['type']>>(new Set(['post', 'content', 'email', 'event']));
  const [loading, setLoading] = useState(true);
  const [dragId, setDragId] = useState<string | null>(null);
  const [bestTimes, setBestTimes] = useState<any>(null);
  const [bestPlatform, setBestPlatform] = useState('INSTAGRAM');
  const [showBest, setShowBest] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiClient.getSoftwares();
        const list = res?.data || [];
        setSoftwares(list);
        if (list.length > 0) setSoftwareId(list[0].id);
        else setLoading(false);
      } catch {
        setLoading(false);
      }
    })();
  }, []);

  const loadCalendar = useCallback(async () => {
    if (!softwareId) return;
    setLoading(true);
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const start = new Date(year, month - 1, 1).toISOString();
      const end = new Date(year, month + 2, 0, 23, 59, 59).toISOString();
      const data = await apiClient.getUnifiedCalendar({ softwareId, startDate: start, endDate: end });
      setItems(data?.items || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [softwareId, currentDate]);

  useEffect(() => {
    if (softwareId) loadCalendar();
  }, [softwareId, loadCalendar]);

  useEffect(() => {
    if (!softwareId || !showBest) return;
    apiClient.getBestTimes({ softwareId, platform: bestPlatform }).then(setBestTimes).catch(() => setBestTimes(null));
  }, [softwareId, bestPlatform, showBest]);

  function toggleType(t: CalItem['type']) {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  }

  const visibleItems = items.filter((i) => activeTypes.has(i.type));

  function itemsForDay(day: number): CalItem[] {
    const dateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();
    return visibleItems.filter((i) => i.date && new Date(i.date).toDateString() === dateStr);
  }

  async function handleDrop(day: number) {
    if (!dragId) return;
    const item = items.find((i) => i.id === dragId);
    setDragId(null);
    if (!item) return;
    const orig = new Date(item.date);
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day, orig.getHours(), orig.getMinutes());
    // Optimista
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, date: newDate.toISOString() } : i)));
    try {
      await apiClient.rescheduleCalendarItem({ type: item.type, id: item.id, date: newDate.toISOString() });
    } catch {
      loadCalendar();
    }
  }

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const leadingEmpty = firstDay === 0 ? 6 : firstDay - 1;
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border bg-card p-6">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 pointer-events-none" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <Link href="/dashboard/growth" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-3 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Growth Engine
            </Link>
            <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
              <CalendarDays className="w-7 h-7 text-primary" /> Calendario editorial
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">Posts, contenido SEO, emails y eventos en un solo lugar. Arrastra para reprogramar.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select value={softwareId} onChange={(e) => setSoftwareId(e.target.value)} className="px-3 py-2 rounded-lg border bg-card text-sm">
              {softwares.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
            <div className="flex items-center gap-1 p-1 rounded-lg border bg-card">
              <button onClick={() => setView('month')} className={`p-1.5 rounded ${view === 'month' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`} title="Mes">
                <CalendarDays className="w-4 h-4" />
              </button>
              <button onClick={() => setView('agenda')} className={`p-1.5 rounded ${view === 'agenda' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`} title="Agenda">
                <List className="w-4 h-4" />
              </button>
            </div>
            <button onClick={() => setShowBest((v) => !v)} className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium ${showBest ? 'bg-violet-500/10 text-violet-600 border-violet-500/30' : 'bg-card'}`}>
              <Sparkles className="w-4 h-4" /> Mejores horas
            </button>
          </div>
        </div>
      </div>

      {/* Best times panel */}
      {showBest && (
        <div className="rounded-2xl border bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold flex items-center gap-2"><TrendingUp className="w-4 h-4 text-violet-500" /> Mejores horas para publicar</h3>
            <select value={bestPlatform} onChange={(e) => setBestPlatform(e.target.value)} className="px-3 py-1.5 rounded-lg border bg-card text-sm">
              {PLATFORMS_FOR_BEST.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          {!bestTimes ? (
            <p className="text-sm text-muted-foreground">Cargando...</p>
          ) : (
            <div>
              <p className="text-xs text-muted-foreground mb-2">
                {bestTimes.hasData
                  ? `Basado en ${bestTimes.totalAnalyzed} posts publicados`
                  : 'Sin datos suficientes — recomendaciones de buenas prácticas'}
              </p>
              <div className="flex flex-wrap gap-2">
                {(bestTimes.hasData ? bestTimes.best : bestTimes.defaults).map((b: any, i: number) => (
                  <span key={i} className="px-3 py-1.5 rounded-lg bg-violet-500/10 text-violet-600 text-sm font-medium">
                    {DIAS[b.dia]} · {String(b.hora).padStart(2, '0')}:00
                    {b.avgEngagement != null && <span className="text-xs opacity-70 ml-1.5">~{Math.round(b.avgEngagement)} eng</span>}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filtros de tipo + navegación mes */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {(Object.keys(TYPE_META) as CalItem['type'][]).map((t) => {
            const meta = TYPE_META[t];
            const Icon = meta.icon;
            const on = activeTypes.has(t);
            return (
              <button
                key={t}
                onClick={() => toggleType(t)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${on ? 'text-white' : 'bg-card text-muted-foreground opacity-60'}`}
                style={on ? { backgroundColor: meta.color, borderColor: meta.color } : {}}
              >
                <Icon className="w-3.5 h-3.5" /> {meta.label}
              </button>
            );
          })}
        </div>
        {view === 'month' && (
          <div className="flex items-center gap-2">
            <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))} className="p-2 rounded-lg border hover:bg-muted"><ChevronLeft className="w-4 h-4" /></button>
            <span className="text-base font-semibold min-w-[170px] text-center">{MESES[currentDate.getMonth()]} {currentDate.getFullYear()}</span>
            <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))} className="p-2 rounded-lg border hover:bg-muted"><ChevronRight className="w-4 h-4" /></button>
          </div>
        )}
      </div>

      {/* Vista */}
      {loading ? (
        <div className="h-96 rounded-2xl border bg-card animate-pulse" />
      ) : view === 'month' ? (
        <div className="rounded-2xl border bg-card overflow-hidden">
          <div className="grid grid-cols-7 bg-muted/50">
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d) => (
              <div key={d} className="px-3 py-2 text-xs font-semibold text-center text-muted-foreground">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 divide-x divide-y">
            {Array.from({ length: leadingEmpty }).map((_, i) => (
              <div key={`e-${i}`} className="min-h-[110px] bg-muted/20" />
            ))}
            {days.map((day) => {
              const dayItems = itemsForDay(day);
              const isToday = new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();
              return (
                <div
                  key={day}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDrop(day)}
                  className={`min-h-[110px] p-1.5 ${isToday ? 'bg-primary/5' : ''} transition-colors`}
                >
                  <span className={`text-xs font-semibold ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>{day}</span>
                  <div className="mt-1 space-y-1">
                    {dayItems.slice(0, 4).map((item) => (
                      <div
                        key={`${item.type}-${item.id}`}
                        draggable
                        onDragStart={() => setDragId(item.id)}
                        onDragEnd={() => setDragId(null)}
                        title={item.title}
                        className="px-1.5 py-1 rounded text-[11px] truncate cursor-grab active:cursor-grabbing flex items-center gap-1"
                        style={{ backgroundColor: item.color + '20', borderLeft: `3px solid ${item.color}` }}
                      >
                        {item.status === 'PUBLISHED' || item.status === 'enviada' || item.status === 'COMPLETED' ? (
                          <CheckCircle className="w-2.5 h-2.5 shrink-0 text-emerald-500" />
                        ) : (
                          <Clock className="w-2.5 h-2.5 shrink-0 text-amber-500" />
                        )}
                        <span className="truncate">{item.title}</span>
                      </div>
                    ))}
                    {dayItems.length > 4 && (
                      <div className="text-[10px] text-muted-foreground pl-1">+{dayItems.length - 4} más</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <AgendaView items={visibleItems} />
      )}
    </div>
  );
}

function AgendaView({ items }: { items: CalItem[] }) {
  const upcoming = [...items].filter((i) => i.date).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (upcoming.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed bg-card p-12 text-center text-muted-foreground">
        No hay nada programado en este rango.
      </div>
    );
  }

  // Agrupar por fecha
  const groups: Record<string, CalItem[]> = {};
  for (const it of upcoming) {
    const key = new Date(it.date).toLocaleDateString('es-ES', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
    (groups[key] ||= []).push(it);
  }

  return (
    <div className="space-y-5">
      {Object.entries(groups).map(([fecha, group]) => (
        <div key={fecha}>
          <h3 className="text-sm font-bold capitalize mb-2">{fecha}</h3>
          <div className="space-y-2">
            {group.map((item) => {
              const meta = TYPE_META[item.type];
              const Icon = meta.icon;
              return (
                <div key={`${item.type}-${item.id}`} className="flex items-center gap-3 p-3 rounded-xl border bg-card">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: item.color + '20' }}>
                    <Icon className="w-4 h-4" style={{ color: item.color }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{item.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(item.date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                      {item.accountName && ` · ${item.accountName}`}
                      {item.platform && ` · ${item.platform}`}
                    </p>
                  </div>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted shrink-0">{item.status}</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
