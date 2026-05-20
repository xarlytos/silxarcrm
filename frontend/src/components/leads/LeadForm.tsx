'use client';

import { useState, useEffect } from 'react';
import { Lead, LeadEstado, PrioridadLead } from '@/types';

interface LeadFormProps {
  initial?: Partial<Lead>;
  softwares: { saas: string; descripcion?: string }[];
  onSubmit: (data: any) => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function LeadForm({ initial, softwares, onSubmit, onCancel, loading }: LeadFormProps) {
  const [form, setForm] = useState({
    nombre: initial?.nombre || '',
    email: initial?.email || '',
    telefono: initial?.telefono || '',
    empresa: initial?.empresa || '',
    cargo: initial?.cargo || '',
    pais: initial?.pais || '',
    origen: initial?.origen || 'manual',
    softwareId: initial?.softwareId || '',
    estado: initial?.estado || 'NUEVO',
    prioridad: initial?.prioridad || 'MEDIA',
    notas: initial?.notas || '',
  });

  // Update softwareId when softwares load if still empty
  useEffect(() => {
    if (!form.softwareId && softwares.length > 0) {
      setForm((prev) => ({ ...prev, softwareId: softwares[0].saas }));
    }
  }, [softwares, form.softwareId]);

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  const estados: LeadEstado[] = ['NUEVO', 'CONTACTADO', 'INTERESADO', 'EN_SEGUIMIENTO', 'CALIFICADO', 'RECHAZADO', 'NO_RESPONDE', 'CONVERTIDO'];
  const prioridades: PrioridadLead[] = ['BAJA', 'MEDIA', 'ALTA', 'URGENTE'];

  const inputClasses = 'w-full px-4 py-2.5 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl text-[14px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-violet-500/30';
  const labelClasses = 'block text-[13px] font-medium text-[var(--text-secondary)] mb-1.5';

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className={labelClasses}>Nombre *</label>
          <input
            required
            value={form.nombre}
            onChange={(e) => handleChange('nombre', e.target.value)}
            className={inputClasses}
            placeholder="Juan Pérez"
          />
        </div>
        <div>
          <label className={labelClasses}>Email</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => handleChange('email', e.target.value)}
            className={inputClasses}
            placeholder="juan@empresa.com (opcional)"
          />
        </div>
        <div>
          <label className={labelClasses}>Teléfono</label>
          <input
            value={form.telefono}
            onChange={(e) => handleChange('telefono', e.target.value)}
            className={inputClasses}
            placeholder="+34 600 000 000"
          />
        </div>
        <div>
          <label className={labelClasses}>Empresa</label>
          <input
            value={form.empresa}
            onChange={(e) => handleChange('empresa', e.target.value)}
            className={inputClasses}
            placeholder="Empresa SA"
          />
        </div>
        <div>
          <label className={labelClasses}>Cargo</label>
          <input
            value={form.cargo}
            onChange={(e) => handleChange('cargo', e.target.value)}
            className={inputClasses}
            placeholder="CEO"
          />
        </div>
        <div>
          <label className={labelClasses}>País</label>
          <input
            value={form.pais}
            onChange={(e) => handleChange('pais', e.target.value)}
            className={inputClasses}
            placeholder="España"
          />
        </div>
        <div>
          <label className={labelClasses}>Origen</label>
          <input
            value={form.origen}
            onChange={(e) => handleChange('origen', e.target.value)}
            className={inputClasses}
            placeholder="web, referido, evento..."
          />
        </div>
        <div>
          <label className={labelClasses}>Software *</label>
          <select
            required
            value={form.softwareId}
            onChange={(e) => handleChange('softwareId', e.target.value)}
            className={inputClasses}
          >
            <option value="" disabled>Seleccionar software...</option>
            {softwares.map((s) => (
              <option key={s.saas} value={s.saas}>{s.saas}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClasses}>Estado</label>
          <select
            value={form.estado}
            onChange={(e) => handleChange('estado', e.target.value)}
            className={inputClasses}
          >
            {estados.map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClasses}>Prioridad</label>
          <select
            value={form.prioridad}
            onChange={(e) => handleChange('prioridad', e.target.value)}
            className={inputClasses}
          >
            {prioridades.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className={labelClasses}>Notas</label>
        <textarea
          value={form.notas}
          onChange={(e) => handleChange('notas', e.target.value)}
          rows={3}
          className={`${inputClasses} resize-none`}
          placeholder="Notas adicionales..."
        />
      </div>
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl text-[14px] font-medium hover:shadow-lg hover:shadow-violet-500/25 transition-all disabled:opacity-50"
        >
          {loading ? 'Guardando...' : initial?.id ? 'Actualizar' : 'Crear lead'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-secondary)] rounded-xl text-[14px] font-medium hover:text-[var(--text-primary)] hover:border-[var(--text-tertiary)] transition-all"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
