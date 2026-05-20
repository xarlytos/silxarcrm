'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import {
  ArrowLeft, Plus, KeyRound, Trash2, X, AlertCircle, CheckCircle2, Edit3,
} from 'lucide-react';

interface Account {
  id: string;
  softwareId: string;
  proveedor: string;
  nombre: string;
  apiKey: string; // ya viene enmascarada
  cuotaMax: number | null;
  cuotaUsada: number;
  activo: boolean;
  ultimoError: string | null;
  _count?: { senders: number };
  createdAt: string;
}

export default function EmailAccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [softwares, setSoftwares] = useState<{ saas: string }[]>([]);
  const [softwareFilter, setSoftwareFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [form, setForm] = useState({ softwareId: '', proveedor: 'resend', nombre: '', apiKey: '', cuotaMax: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiClient.getEmailAccounts(softwareFilter || undefined);
      setAccounts(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    apiClient.getSaasList().then((r) => setSoftwares(r.data)).catch(() => undefined);
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [softwareFilter]);

  const openCreate = () => {
    setEditing(null);
    setForm({ softwareId: softwareFilter || '', proveedor: 'resend', nombre: '', apiKey: '', cuotaMax: '' });
    setError('');
    setShowForm(true);
  };

  const openEdit = (a: Account) => {
    setEditing(a);
    setForm({
      softwareId: a.softwareId,
      proveedor: a.proveedor,
      nombre: a.nombre,
      apiKey: '', // vacío = no actualizar; usuario puede pegar nueva para rotar
      cuotaMax: a.cuotaMax?.toString() || '',
    });
    setError('');
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        nombre: form.nombre,
        cuotaMax: form.cuotaMax ? parseInt(form.cuotaMax) : null,
        ...(form.apiKey ? { apiKey: form.apiKey } : {}),
      };
      if (editing) {
        await apiClient.updateEmailAccount(editing.id, payload);
      } else {
        await apiClient.createEmailAccount({
          softwareId: form.softwareId,
          proveedor: form.proveedor,
          nombre: form.nombre,
          apiKey: form.apiKey,
          cuotaMax: form.cuotaMax ? parseInt(form.cuotaMax) : null,
        });
      }
      setShowForm(false);
      load();
    } catch (err: any) {
      setError(err.message || 'Error guardando');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (a: Account) => {
    if ((a._count?.senders ?? 0) > 0) {
      alert(`No se puede eliminar: ${a._count?.senders} sender(s) la usan. Reasigna o elimina los senders primero.`);
      return;
    }
    if (!confirm(`¿Eliminar cuenta "${a.nombre}"? La API key se borra de la BD.`)) return;
    try {
      await apiClient.deleteEmailAccount(a.id);
      load();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleToggleActivo = async (a: Account) => {
    try {
      await apiClient.updateEmailAccount(a.id, { activo: !a.activo });
      load();
    } catch {
      alert('Error');
    }
  };

  const handleResetCuota = async (a: Account) => {
    if (!confirm(`¿Resetear cuotaUsada a 0 para "${a.nombre}"? Útil al inicio de cada mes.`)) return;
    try {
      await apiClient.updateEmailAccount(a.id, { cuotaUsada: 0 });
      load();
    } catch {
      alert('Error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard/email" className="inline-flex items-center gap-1 text-[13px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] mb-2">
            <ArrowLeft className="w-3.5 h-3.5" /> Volver
          </Link>
          <h1 className="text-[28px] font-bold tracking-tight text-[var(--text-primary)]">Cuentas de envío</h1>
          <p className="text-[14px] text-[var(--text-secondary)] mt-1">
            API keys de Resend. Varias cuentas por software = más cuota mensual y mayor throughput.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-violet-600 text-white rounded-xl text-[14px] font-medium hover:shadow-lg"
        >
          <Plus className="w-4 h-4" />
          Nueva cuenta
        </button>
      </div>

      <select
        value={softwareFilter}
        onChange={(e) => setSoftwareFilter(e.target.value)}
        className="px-4 py-2.5 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl text-[14px]"
      >
        <option value="">Todos los softwares</option>
        {softwares.map((s) => (<option key={s.saas} value={s.saas}>{s.saas}</option>))}
      </select>

      <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl overflow-hidden">
        {loading ? (
          <div className="px-6 py-12 text-center text-[var(--text-tertiary)]">Cargando...</div>
        ) : accounts.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[var(--bg-tertiary)] mx-auto mb-4 flex items-center justify-center">
              <KeyRound className="w-8 h-8 text-[var(--text-tertiary)] opacity-50" />
            </div>
            <p className="text-[16px] text-[var(--text-secondary)] font-medium mb-1">Sin cuentas configuradas</p>
            <p className="text-[13px] text-[var(--text-tertiary)] mb-6">Añade tu primera API key de Resend.</p>
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--text-primary)] text-[var(--bg-primary)] text-[13px] font-medium rounded-xl"
            >
              <Plus className="w-4 h-4" />
              Crear cuenta
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border-primary)]">
                <th className="text-left px-6 py-3 text-[12px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider">Nombre</th>
                <th className="text-left px-6 py-3 text-[12px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider">Software</th>
                <th className="text-left px-6 py-3 text-[12px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider">API key</th>
                <th className="text-left px-6 py-3 text-[12px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider">Uso</th>
                <th className="text-left px-6 py-3 text-[12px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider">Senders</th>
                <th className="text-left px-6 py-3 text-[12px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider">Estado</th>
                <th className="text-right px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-primary)]">
              {accounts.map((a) => {
                const pct = a.cuotaMax ? Math.min(100, Math.round((a.cuotaUsada / a.cuotaMax) * 100)) : 0;
                const pctColor = pct < 60 ? 'bg-emerald-500' : pct < 90 ? 'bg-amber-500' : 'bg-red-500';
                return (
                  <tr key={a.id} className="group hover:bg-[var(--bg-tertiary)]/30">
                    <td className="px-6 py-3">
                      <p className="text-[14px] font-medium text-[var(--text-primary)]">{a.nombre}</p>
                      <p className="text-[11px] text-[var(--text-tertiary)] capitalize">{a.proveedor}</p>
                    </td>
                    <td className="px-6 py-3 text-[13px] text-[var(--text-tertiary)] capitalize">{a.softwareId}</td>
                    <td className="px-6 py-3 text-[12px] font-mono text-[var(--text-tertiary)]">{a.apiKey}</td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-1.5 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                          <div className={`h-full ${pctColor}`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-[12px] text-[var(--text-tertiary)] tabular-nums">
                          {a.cuotaUsada}{a.cuotaMax ? `/${a.cuotaMax}` : ''}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-[13px] text-[var(--text-secondary)] tabular-nums">{a._count?.senders ?? 0}</td>
                    <td className="px-6 py-3">
                      <button
                        onClick={() => handleToggleActivo(a)}
                        className={`px-2 py-0.5 rounded-md text-[11px] font-medium flex items-center gap-1 ${
                          a.activo
                            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                            : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                        }`}
                      >
                        {a.activo ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                        {a.activo ? 'Activa' : 'Inactiva'}
                      </button>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleResetCuota(a)}
                          title="Resetear cuota usada"
                          className="text-[11px] px-2 py-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded"
                        >
                          Reset cuota
                        </button>
                        <button
                          onClick={() => openEdit(a)}
                          className="p-1.5 text-[var(--text-tertiary)] hover:text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-900/30 rounded-lg"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(a)}
                          className="p-1.5 text-[var(--text-tertiary)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
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
        )}
      </div>

      <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 rounded-2xl p-5 text-[13px] text-blue-800 dark:text-blue-300">
        <p className="font-semibold mb-2">¿Cómo multiplicar tu cuota?</p>
        <ol className="list-decimal list-inside space-y-0.5 text-[12px]">
          <li>Crea varias cuentas en Resend (cada una con su propio email/dominio).</li>
          <li>Verifica el dominio que vas a usar como remitente en cada cuenta.</li>
          <li>Genera una API key en cada cuenta y añádela aquí.</li>
          <li>Crea senders (uno por API key) y úsalos en tus campañas — cada uno suma rate limit y cuota mensual independiente.</li>
        </ol>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[18px] font-semibold text-[var(--text-primary)]">
                {editing ? `Editar "${editing.nombre}"` : 'Nueva cuenta'}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              {!editing && (
                <>
                  <div>
                    <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-1.5">Software *</label>
                    <select
                      required
                      value={form.softwareId}
                      onChange={(e) => setForm({ ...form, softwareId: e.target.value })}
                      className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl text-[14px]"
                    >
                      <option value="" disabled>Selecciona...</option>
                      {softwares.map((s) => (<option key={s.saas} value={s.saas}>{s.saas}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-1.5">Proveedor</label>
                    <select
                      value={form.proveedor}
                      onChange={(e) => setForm({ ...form, proveedor: e.target.value })}
                      className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl text-[14px]"
                    >
                      <option value="resend">Resend</option>
                    </select>
                  </div>
                </>
              )}
              <div>
                <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-1.5">Nombre interno *</label>
                <input
                  required
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  placeholder="Resend principal"
                  className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl text-[14px]"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-1.5">
                  API key {editing ? '(dejar vacío para no cambiar)' : '*'}
                </label>
                <input
                  required={!editing}
                  type="password"
                  value={form.apiKey}
                  onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                  placeholder="re_..."
                  className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl text-[14px] font-mono"
                />
                <p className="text-[11px] text-[var(--text-tertiary)] mt-1">Se guarda en BD. Mantén el secret seguro.</p>
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-1.5">Cuota máxima mensual</label>
                <input
                  type="number"
                  value={form.cuotaMax}
                  onChange={(e) => setForm({ ...form, cuotaMax: e.target.value })}
                  placeholder="3000 (free tier)"
                  className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl text-[14px]"
                />
                <p className="text-[11px] text-[var(--text-tertiary)] mt-1">
                  Resend free = 3000. Vacío = sin límite. Solo para tracking visual; bloquea cuando se alcanza.
                </p>
              </div>
              {error && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-600 text-[13px]">{error}</div>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-violet-600 text-white rounded-xl text-[14px] font-medium disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : editing ? 'Actualizar' : 'Crear cuenta'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2.5 bg-[var(--bg-tertiary)] text-[var(--text-secondary)] rounded-xl text-[14px] font-medium"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
