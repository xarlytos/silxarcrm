'use client';

import { useState } from 'react';
import { Package, FileText, Store, Trash2, ChevronRight, Loader2 } from 'lucide-react';
import type { AssetProject } from '@/types';

interface Props {
  project: AssetProject;
  onDelete: (id: string) => void;
  onClick: (project: AssetProject) => void;
}

export default function AssetProjectCard({ project, onDelete, onClick }: Props) {
  const [deleting, setDeleting] = useState(false);

  const productCount = project._count?.products || 0;
  const listingCount = project._count?.listings || 0;

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm(`¿Eliminar el proyecto "${project.nombre}"?`)) return;
    setDeleting(true);
    await onDelete(project.id);
    setDeleting(false);
  }

  return (
    <div
      onClick={() => onClick(project)}
      className="group relative bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-xl p-5 cursor-pointer hover:border-blue-500/40 hover:shadow-[0_0_0_3px_rgba(13,116,206,0.06)] transition-all duration-300"
    >
      {/* Delete button */}
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="absolute top-3 right-3 w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-tertiary)] hover:text-red-500 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all duration-200"
      >
        {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
      </button>

      {/* Icon + Title */}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 via-violet-500/15 to-fuchsia-500/10 ring-1 ring-blue-500/30 flex items-center justify-center shrink-0">
          <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="min-w-0 flex-1 pr-6">
          <h3 className="font-semibold text-[var(--text-primary)] text-sm truncate">{project.nombre}</h3>
          <p className="text-xs text-[var(--text-tertiary)] mt-0.5">{project.nicho}</p>
        </div>
      </div>

      {/* Description */}
      {project.descripcion && (
        <p className="text-xs text-[var(--text-secondary)] line-clamp-2 mb-3">{project.descripcion}</p>
      )}

      {/* Stats */}
      <div className="flex items-center gap-4 mt-auto">
        <div className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)]">
          <FileText className="w-3.5 h-3.5" />
          <span>{productCount} producto{productCount !== 1 ? 's' : ''}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)]">
          <Store className="w-3.5 h-3.5" />
          <span>{listingCount} listing{listingCount !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Arrow */}
      <ChevronRight className="absolute bottom-4 right-4 w-4 h-4 text-[var(--text-tertiary)] opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-300" />
    </div>
  );
}
