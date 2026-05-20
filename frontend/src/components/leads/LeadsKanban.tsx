'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Lead, LeadEstado } from '@/types';
import LeadPriorityBadge from './LeadPriorityBadge';
import { formatRelativeTime } from '@/lib/utils';
import { Mail, Phone, Building2, GripVertical, Trash2 } from 'lucide-react';

interface LeadsKanbanProps {
  leads: Lead[];
  onDelete: (id: string) => void;
  onStatusChange: (id: string, estado: LeadEstado) => void;
}

const estados: LeadEstado[] = [
  'NUEVO',
  'CONTACTADO',
  'INTERESADO',
  'EN_SEGUIMIENTO',
  'CALIFICADO',
  'RECHAZADO',
  'NO_RESPONDE',
  'CONVERTIDO',
];

const estadoLabels: Record<LeadEstado, string> = {
  NUEVO: 'Nuevo',
  CONTACTADO: 'Contactado',
  INTERESADO: 'Interesado',
  EN_SEGUIMIENTO: 'En seguimiento',
  CALIFICADO: 'Calificado',
  RECHAZADO: 'Rechazado',
  NO_RESPONDE: 'No responde',
  CONVERTIDO: 'Convertido',
};

const colHeaderBg: Record<LeadEstado, string> = {
  NUEVO: 'bg-slate-100 dark:bg-slate-800/50',
  CONTACTADO: 'bg-blue-100 dark:bg-blue-900/30',
  INTERESADO: 'bg-emerald-100 dark:bg-emerald-900/30',
  EN_SEGUIMIENTO: 'bg-amber-100 dark:bg-amber-900/30',
  CALIFICADO: 'bg-indigo-100 dark:bg-indigo-900/30',
  RECHAZADO: 'bg-red-100 dark:bg-red-900/30',
  NO_RESPONDE: 'bg-orange-100 dark:bg-orange-900/30',
  CONVERTIDO: 'bg-violet-100 dark:bg-violet-900/30',
};

export default function LeadsKanban({ leads, onDelete, onStatusChange }: LeadsKanbanProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverEstado, setDragOverEstado] = useState<LeadEstado | null>(null);

  const leadsByEstado = (estado: LeadEstado) => leads.filter((l) => l.estado === estado);

  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    setDraggingId(leadId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDragOverEstado(null);
  };

  const handleDrop = (e: React.DragEvent, estado: LeadEstado) => {
    e.preventDefault();
    if (draggingId) {
      onStatusChange(draggingId, estado);
    }
    setDraggingId(null);
    setDragOverEstado(null);
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4"
      style={{ scrollbarWidth: 'thin' }}
    >
      {estados.map((estado) => {
        const columnLeads = leadsByEstado(estado);
        return (
          <div
            key={estado}
            className={`flex-shrink-0 w-[280px] flex flex-col rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] transition-colors ${
              dragOverEstado === estado ? 'ring-2 ring-violet-500/40' : ''
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverEstado(estado);
            }}
            onDragLeave={() => setDragOverEstado(null)}
            onDrop={(e) => handleDrop(e, estado)}
          >
            {/* Column header */}
            <div className={`px-4 py-3 rounded-t-2xl ${colHeaderBg[estado]} border-b border-[var(--border-primary)]`}>
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-semibold text-[var(--text-primary)]">
                  {estadoLabels[estado]}
                </span>
                <span className="text-[12px] font-medium text-[var(--text-tertiary)] px-2 py-0.5 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-primary)]">
                  {columnLeads.length}
                </span>
              </div>
            </div>

            {/* Cards */}
            <div className="p-3 space-y-3 flex-1 min-h-[120px]">
              {columnLeads.map((lead) => (
                <div
                  key={lead.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, lead.id)}
                  onDragEnd={handleDragEnd}
                  className={`group bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl p-4 cursor-grab active:cursor-grabbing hover:border-violet-400/50 transition-all ${
                    draggingId === lead.id ? 'opacity-50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <Link
                      href={`/dashboard/leads/${lead.id}`}
                      className="text-[14px] font-semibold text-[var(--text-primary)] hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
                    >
                      {lead.nombre}
                    </Link>
                    <GripVertical className="w-3.5 h-3.5 text-[var(--text-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>

                  <p className="text-[12px] text-[var(--text-tertiary)] mb-3 flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    {lead.email}
                  </p>

                  <div className="flex items-center gap-2 mb-3">
                    <LeadPriorityBadge prioridad={lead.prioridad} />
                    <span className="text-[11px] text-[var(--text-tertiary)] capitalize">
                      {lead.origen}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[var(--border-primary)]">
                    <span className="text-[11px] text-[var(--text-tertiary)]">
                      {formatRelativeTime(lead.createdAt)}
                    </span>
                    <div className="flex items-center gap-2">
                      {lead.telefono && (
                        <Phone className="w-3 h-3 text-[var(--text-tertiary)]" />
                      )}
                      {lead.empresa && (
                        <Building2 className="w-3 h-3 text-[var(--text-tertiary)]" />
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(lead.id);
                        }}
                        className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {columnLeads.length === 0 && (
                <div className="text-center py-6 text-[12px] text-[var(--text-tertiary)]">
                  Arrastra leads aquí
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
