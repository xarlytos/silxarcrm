'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import { ArrowLeft, AtSign, Plus, Star, Trash2, CheckCircle2, AlertCircle, X } from 'lucide-react';

interface Sender {
  id: string;
  softwareId: string;
  email: string;
  nombre: string;
  esDefault: boolean;
  activo: boolean;
  verificado: boolean;
  accountId: string | null;
  account?: { id: string; nombre: string; proveedor: string; activo: boolean } | null;
  createdAt: string;
}

interface Account {
  id: string;
  softwareId: string;
  nombre: string;
  proveedor: string;
  activo: boolean;
}

export default function EmailSendersPage() {
  const [senders, setSenders] = useState<Sender[]>([]);
  const [softwares, setSoftwares] = useState<{ saas: string }[]>([]);
  const [softwareFilter, setSoftwareFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [form, setForm] = useState({ softwareId: '', email: '', nombre: '', esDefault: false, accountId: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiClient.getEmailSenders(softwareFilter || undefined);
      setSenders(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    apiClient.getSaasList().then((r) => setSoftwares(r.data)).catch(() => setSoftwares([]));
  }, []);

  // Cargar cuentas disponibles cuando cambia el software del form
  useEffect(() => {
    if (form.softwareId) {
      apiClient.getEmailAccounts(form.softwareId).then((r) => setAccounts(r.data)).catch(() => setAccounts([]));
    } else {
      setAccounts([]);
    }
  }, [form.softwareId]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [softwareFilter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.accountId) {
      setError('Selecciona una cuenta de envío. Si no hay ninguna, créala primero.');
      return;
    }
    setSaving(true);
    try {
      await apiClient.createEmailSender({
        softwareId: form.softwareId,
        email: form.email,
        nombre: form.nombre,
        esDefault: form.esDefault,
        accountId: form.accountId,
      });
      setShowForm(false);
      setForm({ softwareId: '', email: '', nombre: '', esDefault: false, accountId: '' });
      load();
    } catch (err: any) {
      setError(err.message || 'Error creando sender');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este sender?')) return;
    try {
      await apiClient.deleteEmailSender(id);
      load();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await apiClient.updateEmailSender(id, { esDefault: true });
      load();
    } catch {
      alert('Error');
    }
  };

  const handleToggleActivo = async (s: Sender) => {
    try {
      await apiClient.updateEmailSender(s.id, { activo: !s.activo });
      load();
    } catch {
      alert('Error');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard/email" className="inline-flex items-center gap-1 text-[13px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] mb-2">
            <ArrowLeft className="w-3.5 h-3.5" /> Volver
          </Link>
          <h1 className="text-[28px] font-bold tracking-tight text-[var(--text-primary)]">Senders</h1>
          <p className="text-[14px] text-[var(--text-secondary)] mt-1">Direcciones desde las que se envían los emails. Varias por software.</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-violet-600 text-white rounded-xl text-[14px] font-medium hover:shadow-lg transition-all"
        >
          <Plus className="w-4 h-4" />
          Nuevo sender
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-3">
        <select
          value={softwareFilter}
          onChange={(e) => setSoftwareFilter(e.target.value)}
          className="px-4 py-2.5 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl text-[14px] text-[var(--text-primary)]"
        >
          <option value="">Todos los softwares</option>
          {softwares.map((s) => (
            <option key={s.saas} value={s.saas}>{s.saas}</option>
          ))}
        </select>
      </div>

      {/* List */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl overflow-hidden">
        {loading ? (
          <div className="px-6 py-12 text-center text-[var(--text-tertiary)]">Cargando...</div>
        ) : senders.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[var(--bg-tertiary)] mx-auto mb-4 flex items-center justify-center">
              <AtSign className="w-8 h-8 text-[var(--text-tertiary)] opacity-50" />
            </div>
            <p className="text-[16px] text-[var(--text-secondary)] font-medium mb-1">Sin senders configurados</p>
            <p className="text-[13px] text-[var(--text-tertiary)]">Crea uno para poder enviar emails.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border-primary)]">
                <th className="text-left px-6 py-4 text-[12px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider">Email</th>
                <th className="text-left px-6 py-4 text-[12px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider">Display</th>
                <th className="text-left px-6 py-4 text-[12px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider">Software</th>
                <th className="text-left px-6 py-4 text-[12px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider">Cuenta</th>
                <th className="text-left px-6 py-4 text-[12px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider">Estado</th>
                <th className="text-right px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-primary)]">
              {senders.map((s) => (
                <tr key={s.id} className="hover:bg-[var(--bg-tertiary)]/30">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-medium text-[var(--text-primary)]">{s.email}</span>
                      {s.esDefault && (
                        <span title="Default" className="text-amber-500"><Star className="w-3.5 h-3.5 fill-amber-500" /></span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-[14px] text-[var(--text-secondary)]">{s.nombre}</td>
                  <td className="px-6 py-4 text-[13px] text-[var(--text-tertiary)] capitalize">{s.softwareId}</td>
                  <td className="px-6 py-4 text-[13px]">
                    {s.account ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[var(--text-secondary)]">{s.account.nombre}</span>
                        {!s.account.activo && (
                          <span className="px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-[10px] font-medium">
                            inactiva
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-amber-600 text-[12px] inline-flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Sin cuenta
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {s.verificado ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-[11px] font-medium">
                          <CheckCircle2 className="w-3 h-3" /> Verificado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-[11px] font-medium">
                          <AlertCircle className="w-3 h-3" /> Sin verificar
                        </span>
                      )}
                      <button
                        onClick={() => handleToggleActivo(s)}
                        className={`px-2 py-0.5 rounded-md text-[11px] font-medium ${
                          s.activo
                            ? 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
                            : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                        }`}
                      >
                        {s.activo ? 'Activo' : 'Inactivo'}
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {!s.esDefault && (
                        <button
                          onClick={() => handleSetDefault(s.id)}
                          title="Marcar como default"
                          className="p-1.5 text-[var(--text-tertiary)] hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-lg"
                        >
                          <Star className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(s.id)}
                        className="p-1.5 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[18px] font-semibold text-[var(--text-primary)]">Nuevo sender</h2>
              <button onClick={() => setShowForm(false)} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-1.5">Software *</label>
                <select
                  required
                  value={form.softwareId}
                  onChange={(e) => setForm({ ...form, softwareId: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl text-[14px]"
                >
                  <option value="" disabled>Selecciona...</option>
                  {softwares.map((s) => (
                    <option key={s.saas} value={s.saas}>{s.saas}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-1.5">Cuenta de envío *</label>
                {accounts.length === 0 ? (
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-[12px] text-amber-700 dark:text-amber-300">
                    No hay cuentas para este software.{' '}
                    <Link href="/dashboard/email/accounts" className="underline font-medium">Crea una primero</Link>
                  </div>
                ) : (
                  <select
                    required
                    value={form.accountId}
                    onChange={(e) => setForm({ ...form, accountId: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl text-[14px]"
                  >
                    <option value="" disabled>Selecciona cuenta...</option>
                    {accounts.filter((a) => a.activo).map((a) => (
                      <option key={a.id} value={a.id}>{a.nombre} ({a.proveedor})</option>
                    ))}
                  </select>
                )}
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-1.5">Email *</label>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="contacto@peluguau.com"
                  className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl text-[14px]"
                />
                <p className="text-[12px] text-[var(--text-tertiary)] mt-1">El dominio debe estar verificado en Resend.</p>
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-1.5">Nombre display *</label>
                <input
                  required
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  placeholder="Equipo PeluGuau"
                  className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl text-[14px]"
                />
                <p className="text-[12px] text-[var(--text-tertiary)] mt-1">Cómo aparece el remitente en la bandeja del destinatario.</p>
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.esDefault}
                  onChange={(e) => setForm({ ...form, esDefault: e.target.checked })}
                  className="rounded"
                />
                <span className="text-[13px] text-[var(--text-secondary)]">Marcar como sender por defecto para este software</span>
              </label>
              {error && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-[13px]">
                  {error}
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-violet-600 text-white rounded-xl text-[14px] font-medium disabled:opacity-50"
                >
                  {saving ? 'Creando...' : 'Crear sender'}
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
