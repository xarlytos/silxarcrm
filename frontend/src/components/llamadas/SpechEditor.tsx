'use client';

import { useState, useEffect } from 'react';
import { SpechLlamada, ObjecionRespuesta } from '@/types';
import { Save, X, Plus, Trash2, MessageCircleQuestion } from 'lucide-react';

interface SpechEditorProps {
  spech?: SpechLlamada | null;
  softwareId: string;
  onSave: (data: any) => Promise<void>;
  onCancel?: () => void;
}

const VARIABLES_DISPONIBLES = [
  { key: 'nombre', label: 'Nombre del lead' },
  { key: 'empresa', label: 'Empresa' },
  { key: 'cargo', label: 'Cargo' },
  { key: 'telefono', label: 'Telefono' },
  { key: 'email', label: 'Email' },
  { key: 'pais', label: 'Pais' },
];

const OBJETIVOS = ['Cierre', 'Demo', 'Informacion', 'Seguimiento', 'Reactivacion'];

export default function SpechEditor({ spech, softwareId, onSave, onCancel }: SpechEditorProps) {
  const [titulo, setTitulo] = useState(spech?.titulo || '');
  const [contenido, setContenido] = useState(spech?.contenido || '');
  const [objetivo, setObjetivo] = useState(spech?.objetivo || 'Cierre');
  const [activo, setActivo] = useState(spech?.activo ?? true);
  const [objeciones, setObjeciones] = useState<ObjecionRespuesta[]>(spech?.objeciones || []);
  const [saving, setSaving] = useState(false);
  const [textareaRef, setTextareaRef] = useState<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    setTitulo(spech?.titulo || '');
    setContenido(spech?.contenido || '');
    setObjetivo(spech?.objetivo || 'Cierre');
    setActivo(spech?.activo ?? true);
    setObjeciones(spech?.objeciones || []);
  }, [spech?.id]);

  const addObjecion = () => {
    setObjeciones((prev) => [...prev, { objecion: '', respuesta: '' }]);
  };

  const updateObjecion = (idx: number, field: 'objecion' | 'respuesta', value: string) => {
    setObjeciones((prev) => prev.map((o, i) => (i === idx ? { ...o, [field]: value } : o)));
  };

  const removeObjecion = (idx: number) => {
    setObjeciones((prev) => prev.filter((_, i) => i !== idx));
  };

  const insertarVariable = (key: string) => {
    if (!textareaRef) return;
    const start = textareaRef.selectionStart;
    const end = textareaRef.selectionEnd;
    const before = contenido.substring(0, start);
    const after = contenido.substring(end);
    const variable = `{{${key}}}`;
    setContenido(`${before}${variable}${after}`);
    setTimeout(() => {
      textareaRef.focus();
      const pos = start + variable.length;
      textareaRef.setSelectionRange(pos, pos);
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim() || !contenido.trim()) {
      alert('Titulo y contenido obligatorios');
      return;
    }
    setSaving(true);
    try {
      const objecionesLimpias = objeciones
        .map((o) => ({ objecion: o.objecion.trim(), respuesta: o.respuesta.trim() }))
        .filter((o) => o.objecion.length > 0 && o.respuesta.length > 0);

      const payload: any = {
        titulo: titulo.trim(),
        contenido,
        objetivo,
        activo,
        objeciones: objecionesLimpias,
      };
      if (!spech) payload.softwareId = softwareId;
      await onSave(payload);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-1.5">
            Titulo
          </label>
          <input
            type="text"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ej: Primera llamada - Presentacion"
            className="w-full px-4 py-2.5 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl text-[14px] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-violet-500/30"
            required
          />
        </div>
        <div>
          <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-1.5">
            Objetivo
          </label>
          <select
            value={objetivo}
            onChange={(e) => setObjetivo(e.target.value)}
            className="w-full px-4 py-2.5 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl text-[14px] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-violet-500/30"
          >
            {OBJETIVOS.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-[13px] font-medium text-[var(--text-secondary)]">
            Contenido del guion
          </label>
          <div className="flex flex-wrap gap-1">
            {VARIABLES_DISPONIBLES.map((v) => (
              <button
                key={v.key}
                type="button"
                onClick={() => insertarVariable(v.key)}
                title={`Insertar ${v.label}`}
                className="inline-flex items-center gap-1 px-2 py-1 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded-md text-[11px] font-medium hover:bg-violet-200 dark:hover:bg-violet-900/50 transition-colors"
              >
                <Plus className="w-3 h-3" />
                {v.key}
              </button>
            ))}
          </div>
        </div>
        <textarea
          ref={setTextareaRef}
          value={contenido}
          onChange={(e) => setContenido(e.target.value)}
          placeholder={`# Introduccion\nHola {{nombre}}, soy [Tu Nombre] de [Tu Empresa].\n...`}
          rows={14}
          className="w-full px-4 py-3 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl text-[14px] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-violet-500/30 font-mono resize-y"
          required
        />
        <p className="mt-1 text-[12px] text-[var(--text-tertiary)]">
          Usa <code className="text-violet-600">{'{{nombre}}'}</code>, <code className="text-violet-600">{'{{empresa}}'}</code>, etc. Se sustituyen por los datos del lead al llamar.
        </p>
      </div>

      <div className="border border-[var(--border-primary)] rounded-2xl p-4 bg-[var(--bg-secondary)]/50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <MessageCircleQuestion className="w-4 h-4 text-amber-600" />
            <label className="block text-[13px] font-medium text-[var(--text-secondary)]">
              Objeciones y como rebatirlas
            </label>
            {objeciones.length > 0 && (
              <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-md text-[11px] font-medium">
                {objeciones.length}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={addObjecion}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-lg text-[12px] font-medium hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Anadir objecion
          </button>
        </div>

        {objeciones.length === 0 ? (
          <p className="text-[12px] text-[var(--text-tertiary)] py-3 text-center">
            Sin objeciones. Anade las dudas o pegas mas frecuentes y como responderlas para tenerlas a mano durante la llamada.
          </p>
        ) : (
          <div className="space-y-3">
            {objeciones.map((o, idx) => (
              <div
                key={idx}
                className="grid grid-cols-1 md:grid-cols-[1fr_1.5fr_auto] gap-2 items-start p-3 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl"
              >
                <div>
                  <label className="block text-[11px] font-medium uppercase tracking-wider text-[var(--text-tertiary)] mb-1">
                    Objecion #{idx + 1}
                  </label>
                  <textarea
                    value={o.objecion}
                    onChange={(e) => updateObjecion(idx, 'objecion', e.target.value)}
                    placeholder="Ej: Es muy caro / No tengo tiempo / Ya uso otro..."
                    rows={2}
                    className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg text-[13px] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-amber-500/30 resize-y"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium uppercase tracking-wider text-[var(--text-tertiary)] mb-1">
                    Como rebatirla
                  </label>
                  <textarea
                    value={o.respuesta}
                    onChange={(e) => updateObjecion(idx, 'respuesta', e.target.value)}
                    placeholder="Tu respuesta para superar esta objecion..."
                    rows={2}
                    className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg text-[13px] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-emerald-500/30 resize-y"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeObjecion(idx)}
                  title="Eliminar objecion"
                  className="self-start mt-5 p-2 text-[var(--text-tertiary)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={activo}
          onChange={(e) => setActivo(e.target.checked)}
          className="w-4 h-4 rounded text-violet-600 focus:ring-violet-500"
        />
        <span className="text-[14px] text-[var(--text-secondary)]">Activo (disponible para usar)</span>
      </label>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl text-[14px] font-medium hover:shadow-lg hover:shadow-violet-500/25 transition-all disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Guardando...' : spech ? 'Guardar cambios' : 'Crear spech'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex items-center gap-2 px-5 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-secondary)] rounded-xl text-[14px] font-medium hover:bg-[var(--bg-tertiary)] transition-colors"
          >
            <X className="w-4 h-4" />
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
