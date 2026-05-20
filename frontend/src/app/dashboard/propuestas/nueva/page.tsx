'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import {
  Plus,
  Trash2,
  Save,
  ArrowLeft,
  FileText,
  Loader2,
} from 'lucide-react';

interface ItemPropuesta {
  servicio: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
}

export default function NuevaPropuestaPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteEmail, setClienteEmail] = useState('');
  const [condiciones, setCondiciones] = useState('Validez de 30 dias desde la fecha de emision. Pago por transferencia bancaria.');
  const [validezDias, setValidezDias] = useState(30);
  const [softwareId, setSoftwareId] = useState('');
  const [items, setItems] = useState<ItemPropuesta[]>([
    { servicio: '', descripcion: '', cantidad: 1, precioUnitario: 0 },
  ]);

  const subtotal = items.reduce((sum, item) => sum + (item.cantidad * item.precioUnitario), 0);
  const impuestos = subtotal * 0.21;
  const total = subtotal + impuestos;

  const addItem = () => {
    setItems([...items, { servicio: '', descripcion: '', cantidad: 1, precioUnitario: 0 }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof ItemPropuesta, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleSubmit = async () => {
    if (!titulo.trim() || !clienteNombre.trim() || !softwareId.trim()) {
      alert('Titulo, nombre del cliente y software son obligatorios');
      return;
    }

    const validItems = items.filter((i) => i.servicio.trim() && i.precioUnitario > 0);
    if (validItems.length === 0) {
      alert('Añade al menos un servicio con precio');
      return;
    }

    setSaving(true);
    try {
      await apiClient.createPropuesta({
        titulo,
        descripcion: descripcion || undefined,
        clienteNombre,
        clienteEmail: clienteEmail || undefined,
        softwareId,
        items: validItems,
        condiciones: condiciones || undefined,
        validezDias,
      });
      router.push('/dashboard/propuestas');
    } catch (err: any) {
      alert(err.message || 'Error guardando propuesta');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-6 px-4">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.push('/dashboard/propuestas')}
          className="p-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] hover:border-violet-500/30 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-[var(--text-secondary)]" />
        </button>
        <div>
          <h1 className="text-[22px] font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <FileText className="w-5 h-5 text-violet-500" />
            Nueva propuesta
          </h1>
        </div>
      </div>

      <div className="space-y-4">
        {/* Info general */}
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl p-5">
          <h2 className="text-[15px] font-semibold text-[var(--text-primary)] mb-4">Informacion general</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1.5">Titulo *</label>
              <input
                type="text"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ej: Propuesta de servicios CRM - Enero 2026"
                className="w-full px-4 py-2.5 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-primary)] text-[14px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-violet-500/30"
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1.5">Software/SaaS *</label>
              <input
                type="text"
                value={softwareId}
                onChange={(e) => setSoftwareId(e.target.value)}
                placeholder="Ej: groomly"
                className="w-full px-4 py-2.5 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-primary)] text-[14px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-violet-500/30"
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1.5">Validez (dias)</label>
              <input
                type="number"
                value={validezDias}
                onChange={(e) => setValidezDias(parseInt(e.target.value) || 30)}
                className="w-full px-4 py-2.5 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-primary)] text-[14px] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-violet-500/30"
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1.5">Nombre del cliente *</label>
              <input
                type="text"
                value={clienteNombre}
                onChange={(e) => setClienteNombre(e.target.value)}
                placeholder="Nombre del cliente o empresa"
                className="w-full px-4 py-2.5 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-primary)] text-[14px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-violet-500/30"
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1.5">Email del cliente</label>
              <input
                type="email"
                value={clienteEmail}
                onChange={(e) => setClienteEmail(e.target.value)}
                placeholder="cliente@empresa.com"
                className="w-full px-4 py-2.5 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-primary)] text-[14px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-violet-500/30"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1.5">Descripcion</label>
              <textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Descripcion general de la propuesta..."
                rows={3}
                className="w-full px-4 py-2.5 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-primary)] text-[14px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-violet-500/30 resize-none"
              />
            </div>
          </div>
        </div>

        {/* Items / Servicios */}
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">Servicios y productos</h2>
            <button
              onClick={addItem}
              className="px-3 py-1.5 rounded-lg text-[12px] font-medium bg-violet-500 text-white hover:bg-violet-600 transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Añadir
            </button>
          </div>

          <div className="space-y-3">
            {items.map((item, index) => (
              <div key={index} className="grid grid-cols-12 gap-3 items-start bg-[var(--bg-primary)] rounded-xl p-3 border border-[var(--border-primary)]">
                <div className="col-span-12 md:col-span-4">
                  <input
                    type="text"
                    value={item.servicio}
                    onChange={(e) => updateItem(index, 'servicio', e.target.value)}
                    placeholder="Servicio o producto"
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                  />
                </div>
                <div className="col-span-12 md:col-span-4">
                  <input
                    type="text"
                    value={item.descripcion}
                    onChange={(e) => updateItem(index, 'descripcion', e.target.value)}
                    placeholder="Descripcion (opcional)"
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                  />
                </div>
                <div className="col-span-5 md:col-span-1">
                  <input
                    type="number"
                    value={item.cantidad}
                    onChange={(e) => updateItem(index, 'cantidad', parseInt(e.target.value) || 0)}
                    placeholder="Cant"
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] text-[13px] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                  />
                </div>
                <div className="col-span-5 md:col-span-2">
                  <input
                    type="number"
                    value={item.precioUnitario}
                    onChange={(e) => updateItem(index, 'precioUnitario', parseFloat(e.target.value) || 0)}
                    placeholder="Precio"
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] text-[13px] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                  />
                </div>
                <div className="col-span-2 md:col-span-1 flex items-center justify-end">
                  <button
                    onClick={() => removeItem(index)}
                    className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Totales */}
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl p-5">
          <div className="flex justify-end">
            <div className="w-full max-w-sm space-y-2">
              <div className="flex justify-between text-[13px] text-[var(--text-secondary)]">
                <span>Subtotal</span>
                <span>{subtotal.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</span>
              </div>
              <div className="flex justify-between text-[13px] text-[var(--text-secondary)]">
                <span>IVA (21%)</span>
                <span>{impuestos.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</span>
              </div>
              <div className="h-px bg-[var(--border-primary)]"></div>
              <div className="flex justify-between text-[16px] font-semibold text-[var(--text-primary)]">
                <span>Total</span>
                <span>{total.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Condiciones */}
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl p-5">
          <h2 className="text-[15px] font-semibold text-[var(--text-primary)] mb-3">Condiciones</h2>
          <textarea
            value={condiciones}
            onChange={(e) => setCondiciones(e.target.value)}
            placeholder="Condiciones de la propuesta..."
            rows={4}
            className="w-full px-4 py-2.5 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-primary)] text-[14px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-violet-500/30 resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={() => router.push('/dashboard/propuestas')}
            className="px-5 py-2.5 rounded-xl text-[14px] font-medium border border-[var(--border-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-6 py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl text-[14px] font-medium hover:shadow-lg hover:shadow-violet-500/25 hover:opacity-90 disabled:opacity-50 transition-all flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Guardar propuesta
          </button>
        </div>
      </div>
    </div>
  );
}
