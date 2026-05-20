'use client';

import {
  Award, Banknote, Calendar, Coins, Diamond, Gift, Globe, Handshake,
  Mail, MessageCircle, Medal, Phone, Sword, Target, Trophy,
  TrendingUp, Users, type LucideIcon,
} from 'lucide-react';
import type { Stats } from '../_lib/types';
import type { Progress } from '../_lib/storage';
import { BigStatCard, MiniStat, RatioCard, SectionHeader } from './SectionHeader';

/* ============================================================
   Tab: Récords
============================================================ */

export function TabRecords({ stats, progress }: { stats: Stats; progress: Progress }) {
  const cards: { key: string; label: string; icon: LucideIcon; color: string; bg: string; prefix?: string }[] = [
    { key: 'ingresosTotal', label: 'Ingresos totales', icon: Coins, color: 'text-amber-500', bg: 'from-amber-500/20 to-yellow-500/0', prefix: '€' },
    { key: 'clientesUnicos', label: 'Clientes únicos', icon: Users, color: 'text-rose-500', bg: 'from-rose-500/15 to-rose-500/0' },
    { key: 'mayorPropuesta', label: 'Mayor propuesta', icon: Diamond, color: 'text-cyan-500', bg: 'from-cyan-500/15 to-cyan-500/0', prefix: '€' },
    { key: 'leadsTotal', label: 'Leads capturados', icon: Target, color: 'text-blue-500', bg: 'from-blue-500/15 to-blue-500/0' },
    { key: 'leadsConvertidos', label: 'Conversiones', icon: Trophy, color: 'text-amber-500', bg: 'from-amber-500/15 to-amber-500/0' },
    { key: 'whatsappEnviosTotal', label: 'WhatsApp enviados', icon: MessageCircle, color: 'text-emerald-500', bg: 'from-emerald-500/15 to-emerald-500/0' },
    { key: 'emailEnviosTotal', label: 'Emails enviados', icon: Mail, color: 'text-cyan-500', bg: 'from-cyan-500/15 to-cyan-500/0' },
    { key: 'llamadasTotal', label: 'Llamadas hechas', icon: Phone, color: 'text-rose-500', bg: 'from-rose-500/15 to-rose-500/0' },
    { key: 'propuestasAceptadas', label: 'Propuestas cerradas', icon: Handshake, color: 'text-fuchsia-500', bg: 'from-fuchsia-500/15 to-fuchsia-500/0' },
    { key: 'ticketPromedio', label: 'Ticket promedio', icon: Banknote, color: 'text-emerald-500', bg: 'from-emerald-500/15 to-emerald-500/0', prefix: '€' },
    { key: 'landingsPublicadas', label: 'Landings activas', icon: Globe, color: 'text-violet-500', bg: 'from-violet-500/15 to-violet-500/0' },
    { key: 'freeValuesTotal', label: 'Free Values', icon: Gift, color: 'text-pink-500', bg: 'from-pink-500/15 to-pink-500/0' },
    { key: 'calendarioEventos', label: 'Eventos agendados', icon: Calendar, color: 'text-indigo-500', bg: 'from-indigo-500/15 to-indigo-500/0' },
  ];

  // Conversion rate
  const tasaConversion = stats.leadsTotal > 0 ? (stats.leadsConvertidos / stats.leadsTotal) * 100 : 0;
  // Email open rate
  const tasaApertura = stats.emailEnviosTotal > 0 ? (stats.emailEnviosAbiertos / stats.emailEnviosTotal) * 100 : 0;

  return (
    <div className="space-y-6">
      <section>
        <SectionHeader icon={Medal} iconColor="text-amber-400" title="Tus números" subtitle="El alcance total de tu trayectoria" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-3">
          {cards.map((c) => (
            <BigStatCard
              key={c.key}
              icon={c.icon}
              label={c.label}
              value={`${c.prefix ?? ''}${(stats[c.key] ?? 0).toLocaleString()}`}
              color={c.color}
              bg={c.bg}
            />
          ))}
        </div>
      </section>

      <section>
        <SectionHeader icon={TrendingUp} iconColor="text-emerald-400" title="Tasas y métricas" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <RatioCard
            label="Tasa de conversión de leads"
            value={tasaConversion}
            num={stats.leadsConvertidos ?? 0}
            den={stats.leadsTotal ?? 0}
            color="from-emerald-500 to-cyan-500"
          />
          <RatioCard
            label="Tasa de apertura de email"
            value={tasaApertura}
            num={stats.emailEnviosAbiertos ?? 0}
            den={stats.emailEnviosTotal ?? 0}
            color="from-fuchsia-500 to-violet-500"
          />
        </div>
      </section>

      <section>
        <SectionHeader icon={Sword} iconColor="text-rose-400" title="Actividad reciente" subtitle="Últimos 7 y 30 días" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MiniStat label="Leads / semana" value={stats.leadsSemana ?? 0} />
          <MiniStat label="WhatsApp / semana" value={stats.whatsappEnviosSemana ?? 0} />
          <MiniStat label="Llamadas / semana" value={stats.llamadasSemana ?? 0} />
          <MiniStat label="Emails / semana" value={stats.emailEnviosSemana ?? 0} />
          <MiniStat label="Leads / mes" value={stats.leadsMes ?? 0} />
          <MiniStat label="WhatsApp / mes" value={stats.whatsappEnviosMes ?? 0} />
          <MiniStat label="Llamadas / mes" value={stats.llamadasMes ?? 0} />
          <MiniStat label="Conv / mes" value={stats.conversionesMes ?? 0} />
        </div>
      </section>

      <section>
        <SectionHeader icon={Award} iconColor="text-violet-400" title="Personal" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MiniStat label="XP total" value={progress.totalXp.toLocaleString()} />
          <MiniStat label="Gemas" value={progress.totalGemas.toLocaleString()} />
          <MiniStat label="Racha actual" value={progress.streak.count} />
          <MiniStat label="Mejor racha" value={progress.streak.best} />
        </div>
      </section>
    </div>
  );
}
