'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import { Mail, Users, Send, Eye, MousePointerClick, Plus, FileText, AtSign, Inbox, ShieldOff, KeyRound } from 'lucide-react';

interface EmailSender {
  id: string;
  softwareId: string;
  email: string;
  nombre: string;
  esDefault: boolean;
  activo: boolean;
  verificado: boolean;
}

interface EmailEnvio {
  id: string;
  destinatario: string;
  asunto: string;
  estado: string;
  enviadoEn?: string | null;
  abiertoEn?: string | null;
  createdAt: string;
  sender: { nombre: string; email: string };
}

export default function EmailDashboardPage() {
  const [senders, setSenders] = useState<EmailSender[]>([]);
  const [envios, setEnvios] = useState<EmailEnvio[]>([]);
  const [plantillasCount, setPlantillasCount] = useState(0);
  const [campanasCount, setCampanasCount] = useState(0);
  const [campanasEnviando, setCampanasEnviando] = useState(0);
  const [bajasCount, setBajasCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiClient.getEmailSenders().then((r) => setSenders(r.data)).catch(() => setSenders([])),
      apiClient.getEmailEnvios({ limit: '10' }).then((r) => setEnvios(r.data.envios)).catch(() => setEnvios([])),
      apiClient.getEmailPlantillas().then((r) => setPlantillasCount(r.data.length)).catch(() => setPlantillasCount(0)),
      apiClient.getEmailCampanas().then((r) => {
        setCampanasCount(r.data.length);
        setCampanasEnviando(r.data.filter((c: any) => c.estado === 'enviando').length);
      }).catch(() => undefined),
      apiClient.getEmailBajas({ limit: '1' }).then((r) => setBajasCount(r.data.totalGlobal || 0)).catch(() => undefined),
    ]).finally(() => setLoading(false));
  }, []);

  const stats = {
    enviados: envios.filter((e) => e.estado === 'enviado').length,
    abiertos: envios.filter((e) => e.abiertoEn).length,
    fallidos: envios.filter((e) => e.estado === 'fallido').length,
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-[32px] font-bold tracking-tight text-[var(--text-primary)]">Email</h1>
          </div>
          <p className="text-[15px] text-[var(--text-secondary)]">Outreach masivo, plantillas y tracking</p>
        </div>
        <Link
          href="/dashboard/email/senders"
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-violet-600 text-white rounded-xl text-[14px] font-medium hover:shadow-lg hover:shadow-violet-500/25 transition-all"
        >
          <Plus className="w-4 h-4" />
          Gestionar senders
        </Link>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KpiCard icon={AtSign} label="Senders activos" value={senders.filter((s) => s.activo).length} color="blue" />
        <KpiCard icon={Send} label="Emails enviados" value={stats.enviados} color="emerald" />
        <KpiCard icon={Eye} label="Aperturas" value={stats.abiertos} color="violet" />
        <KpiCard icon={MousePointerClick} label="Fallidos" value={stats.fallidos} color="red" />
        <KpiCard icon={ShieldOff} label="Bajas" value={bajasCount} color="orange" />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <ActionCard
          href="/dashboard/email/accounts"
          icon={KeyRound}
          title="Cuentas"
          desc="API keys de Resend. Varias = más cuota mensual."
          count="Configurar"
        />
        <ActionCard
          href="/dashboard/email/senders"
          icon={AtSign}
          title="Senders"
          desc="Direcciones desde las que envías por cada software"
          count={`${senders.length} configurados`}
        />
        <ActionCard
          href="/dashboard/email/plantillas"
          icon={FileText}
          title="Plantillas"
          desc="Reutiliza asuntos y cuerpos con variables {{nombre}}, {{empresa}}…"
          count={`${plantillasCount} ${plantillasCount === 1 ? 'plantilla' : 'plantillas'}`}
        />
        <ActionCard
          href="/dashboard/email/campanas"
          icon={Send}
          title="Campañas"
          desc="Envíos masivos a leads filtrados, con throttling y tracking."
          count={campanasEnviando > 0 ? `${campanasEnviando} en curso · ${campanasCount} total` : `${campanasCount} ${campanasCount === 1 ? 'campaña' : 'campañas'}`}
        />
        <ActionCard
          href="/dashboard/email/bajas"
          icon={ShieldOff}
          title="Bajas"
          desc="Contactos que cancelaron suscripción. Excluidos auto de envíos."
          count={`${bajasCount} ${bajasCount === 1 ? 'baja' : 'bajas'}`}
        />
      </div>

      {/* Últimos envíos */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-[var(--border-primary)] flex items-center justify-between">
          <h2 className="text-[18px] font-semibold text-[var(--text-primary)]">Últimos envíos</h2>
          <span className="text-[13px] text-[var(--text-tertiary)]">{envios.length}</span>
        </div>

        {loading ? (
          <div className="px-6 py-12 text-center text-[var(--text-tertiary)]">Cargando...</div>
        ) : envios.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[var(--bg-tertiary)] mx-auto mb-4 flex items-center justify-center">
              <Inbox className="w-8 h-8 text-[var(--text-tertiary)] opacity-50" />
            </div>
            <p className="text-[16px] text-[var(--text-secondary)] font-medium mb-1">Sin envíos todavía</p>
            <p className="text-[13px] text-[var(--text-tertiary)]">Configura un sender y verifica el dominio en Resend para empezar.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border-primary)]">
                <th className="text-left px-6 py-4 text-[13px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider">Destinatario</th>
                <th className="text-left px-6 py-4 text-[13px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider">Asunto</th>
                <th className="text-left px-6 py-4 text-[13px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider">Sender</th>
                <th className="text-left px-6 py-4 text-[13px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider">Estado</th>
                <th className="text-left px-6 py-4 text-[13px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-primary)]">
              {envios.map((e) => (
                <tr key={e.id} className="hover:bg-[var(--bg-tertiary)]/30">
                  <td className="px-6 py-4 text-[14px] text-[var(--text-primary)]">{e.destinatario}</td>
                  <td className="px-6 py-4 text-[14px] text-[var(--text-secondary)] truncate max-w-xs">{e.asunto}</td>
                  <td className="px-6 py-4 text-[13px] text-[var(--text-tertiary)]">{e.sender?.email}</td>
                  <td className="px-6 py-4">
                    <EstadoBadge estado={e.estado} abierto={!!e.abiertoEn} />
                  </td>
                  <td className="px-6 py-4 text-[13px] text-[var(--text-tertiary)]">
                    {new Date(e.createdAt).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Setup notice */}
      <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-2xl p-5">
        <p className="text-[13px] font-semibold text-amber-900 dark:text-amber-300 mb-2">Configuración pendiente</p>
        <ol className="text-[13px] text-amber-800 dark:text-amber-400 space-y-1 list-decimal list-inside">
          <li>Crea cuenta en <a href="https://resend.com" target="_blank" rel="noopener" className="underline">resend.com</a> y obtén una API key.</li>
          <li>Añade <code className="px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 font-mono text-[12px]">RESEND_API_KEY</code> al <code className="px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 font-mono text-[12px]">backend/.env</code>.</li>
          <li>Verifica tu dominio (ej: <code className="px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 font-mono text-[12px]">peluguau.com</code>) en Resend con SPF + DKIM + DMARC.</li>
          <li>Crea un sender desde aquí con un email de ese dominio.</li>
        </ol>
      </div>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    emerald: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
    violet: 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400',
    red: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
  };
  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl p-5">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colors[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <p className="text-[28px] font-bold text-[var(--text-primary)] leading-none tabular-nums">{value}</p>
          <p className="text-[13px] text-[var(--text-tertiary)] mt-1">{label}</p>
        </div>
      </div>
    </div>
  );
}

function ActionCard({ href, icon: Icon, title, desc, count, disabled }: any) {
  const Comp: any = disabled ? 'div' : Link;
  return (
    <Comp
      href={disabled ? undefined : href}
      className={`block bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl p-5 transition-all ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-[var(--text-tertiary)] hover:shadow-sm'
      }`}
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-[var(--bg-tertiary)] flex items-center justify-center">
          <Icon className="w-5 h-5 text-[var(--text-primary)]" />
        </div>
        <div className="flex-1">
          <p className="text-[15px] font-semibold text-[var(--text-primary)]">{title}</p>
          <p className="text-[12px] text-[var(--text-tertiary)] mt-0.5">{count}</p>
        </div>
      </div>
      <p className="text-[13px] text-[var(--text-secondary)]">{desc}</p>
    </Comp>
  );
}

function EstadoBadge({ estado, abierto }: { estado: string; abierto: boolean }) {
  if (abierto) {
    return <span className="px-2.5 py-1 rounded-lg bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-[12px] font-medium">Abierto</span>;
  }
  const map: Record<string, string> = {
    enviado: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
    pendiente: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
    fallido: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
    rebotado: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
  };
  return (
    <span className={`px-2.5 py-1 rounded-lg text-[12px] font-medium capitalize ${map[estado] || 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'}`}>
      {estado}
    </span>
  );
}
