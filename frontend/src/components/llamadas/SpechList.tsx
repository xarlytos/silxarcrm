'use client';

import { SpechLlamada } from '@/types';
import { Star, FileText, Copy, Trash2, MoreVertical } from 'lucide-react';
import { useState } from 'react';

interface SpechListProps {
  spechs: SpechLlamada[];
  selectedId?: string | null;
  onSelect: (spech: SpechLlamada) => void;
  onSetDefault?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export default function SpechList({
  spechs,
  selectedId,
  onSelect,
  onSetDefault,
  onDuplicate,
  onDelete,
}: SpechListProps) {
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  if (spechs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center text-[var(--text-tertiary)]">
        <FileText className="w-10 h-10 mb-3 opacity-40" />
        <p className="text-[14px]">No hay spechs creados</p>
        <p className="text-[12px] mt-1">Crea tu primer guion para empezar</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {spechs.map((spech) => (
        <div
          key={spech.id}
          onClick={() => onSelect(spech)}
          className={`group p-3 rounded-xl border transition-all cursor-pointer ${
            selectedId === spech.id
              ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
              : 'border-[var(--border-primary)] bg-[var(--bg-primary)] hover:border-[var(--text-tertiary)]'
          }`}
        >
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {spech.esDefault && (
                  <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400 shrink-0" />
                )}
                <h4 className="text-[14px] font-medium text-[var(--text-primary)] truncate">
                  {spech.titulo}
                </h4>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[11px] text-[var(--text-tertiary)]">{spech.objetivo}</span>
                {!spech.activo && (
                  <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                    inactivo
                  </span>
                )}
              </div>
            </div>
            {(onSetDefault || onDuplicate || onDelete) && (
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(menuOpen === spech.id ? null : spech.id);
                  }}
                  className="p-1 rounded-lg text-[var(--text-tertiary)] hover:bg-[var(--bg-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
                {menuOpen === spech.id && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(null);
                      }}
                    />
                    <div className="absolute right-0 top-full mt-1 z-20 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl shadow-lg overflow-hidden min-w-[180px]">
                      {onSetDefault && !spech.esDefault && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSetDefault(spech.id);
                            setMenuOpen(null);
                          }}
                          className="flex items-center gap-2 w-full px-3 py-2 text-[13px] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                        >
                          <Star className="w-3.5 h-3.5" />
                          Marcar como default
                        </button>
                      )}
                      {onDuplicate && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDuplicate(spech.id);
                            setMenuOpen(null);
                          }}
                          className="flex items-center gap-2 w-full px-3 py-2 text-[13px] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          Duplicar
                        </button>
                      )}
                      {onDelete && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`¿Eliminar "${spech.titulo}"?`)) onDelete(spech.id);
                            setMenuOpen(null);
                          }}
                          className="flex items-center gap-2 w-full px-3 py-2 text-[13px] text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Eliminar
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
