'use client';

import { useState } from 'react';
import { X, Plus, Loader2 } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreate: (data: { nombre: string; nicho: string; descripcion?: string; keywords: string[] }) => void;
  loading?: boolean;
}

export default function CreateProjectModal({ open, onClose, onCreate, loading }: Props) {
  const [nombre, setNombre] = useState('');
  const [nicho, setNicho] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [keywordInput, setKeywordInput] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);

  if (!open) return null;

  function addKeyword() {
    const k = keywordInput.trim();
    if (k && !keywords.includes(k)) {
      setKeywords([...keywords, k]);
      setKeywordInput('');
    }
  }

  function removeKeyword(k: string) {
    setKeywords(keywords.filter((kw) => kw !== k));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim() || !nicho.trim()) return;
    onCreate({ nombre: nombre.trim(), nicho: nicho.trim(), descripcion: descripcion.trim() || undefined, keywords });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-primary)]">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">Nuevo Proyecto</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Nombre del proyecto *</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="ej: Fitness Planner Bundle"
              className="w-full h-10 px-3 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Nicho / Tema *</label>
            <input
              type="text"
              value={nicho}
              onChange={(e) => setNicho(e.target.value)}
              placeholder="ej: fitness para mujeres 40+"
              className="w-full h-10 px-3 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Descripción</label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Describe el proyecto..."
              rows={3}
              className="w-full px-3 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Keywords</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addKeyword(); } }}
                placeholder="Añade keywords y presiona Enter"
                className="flex-1 h-10 px-3 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all"
              />
              <button
                type="button"
                onClick={addKeyword}
                className="h-10 px-3 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-blue-500/40 transition-all"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {keywords.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {keywords.map((k) => (
                  <span key={k} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-500/10 border border-blue-500/20 text-xs text-blue-600 dark:text-blue-400">
                    {k}
                    <button type="button" onClick={() => removeKeyword(k)} className="hover:text-red-500">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-4 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !nombre.trim() || !nicho.trim()}
              className="h-10 px-5 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Crear proyecto
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
