'use client';

import { useState } from 'react';
import { Lead } from '@/types';
import { Search, Phone, AlertCircle, User } from 'lucide-react';
import LeadStatusBadge from '@/components/leads/LeadStatusBadge';

interface LeadSelectorProps {
  leads: Lead[];
  selectedId?: string | null;
  onSelect: (lead: Lead) => void;
  loading?: boolean;
  showOnlyWithPhone?: boolean;
}

export default function LeadSelector({
  leads,
  selectedId,
  onSelect,
  loading = false,
  showOnlyWithPhone = false,
}: LeadSelectorProps) {
  const [search, setSearch] = useState('');

  const filtered = leads
    .filter((l) => (showOnlyWithPhone ? l.telefono : true))
    .filter((l) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        l.nombre.toLowerCase().includes(q) ||
        (l.email || '').toLowerCase().includes(q) ||
        l.empresa?.toLowerCase().includes(q)
      );
    });

  return (
    <div className="flex flex-col h-full">
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar lead..."
          className="w-full pl-10 pr-4 py-2 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-violet-500/30"
        />
      </div>

      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
        {loading && (
          <div className="flex items-center justify-center py-8 text-[var(--text-tertiary)] text-[13px]">
            <div className="w-4 h-4 border-2 border-[var(--border-primary)] border-t-[var(--text-primary)] rounded-full animate-spin mr-2" />
            Cargando...
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center text-[var(--text-tertiary)]">
            <User className="w-8 h-8 mb-2 opacity-40" />
            <p className="text-[13px]">Sin leads</p>
          </div>
        )}
        {filtered.map((lead) => {
          const isSelected = selectedId === lead.id;
          return (
            <button
              key={lead.id}
              onClick={() => onSelect(lead)}
              className={`w-full text-left p-3 rounded-xl border transition-all ${
                isSelected
                  ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
                  : 'border-[var(--border-primary)] bg-[var(--bg-primary)] hover:border-[var(--text-tertiary)]'
              }`}
            >
              <div className="flex items-start gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--text-primary)] to-[var(--text-secondary)] flex items-center justify-center text-[var(--bg-primary)] text-[12px] font-bold shrink-0">
                  {lead.nombre.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-[var(--text-primary)] truncate">
                    {lead.nombre}
                  </p>
                  {lead.empresa && (
                    <p className="text-[11px] text-[var(--text-tertiary)] truncate">
                      {lead.empresa}
                    </p>
                  )}
                  <div className="flex items-center gap-1.5 mt-1">
                    {lead.telefono ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
                        <Phone className="w-3 h-3" />
                        {lead.telefono}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] text-amber-600">
                        <AlertCircle className="w-3 h-3" />
                        sin telefono
                      </span>
                    )}
                  </div>
                  <div className="mt-1.5">
                    <LeadStatusBadge estado={lead.estado} />
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
