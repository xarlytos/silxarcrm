'use client';

import { useState } from 'react';
import { apiClient } from '@/lib/api';
import { Check, X, Loader2, UserPlus, RefreshCw, StickyNote, Calendar, MessageCircle, AlertCircle } from 'lucide-react';

interface ActionProposal {
  id: string;
  type: string;
  title: string;
  description: string;
  data: Record<string, any>;
}

interface ActionCardProps {
  proposal: ActionProposal;
  onResult?: (success: boolean, message: string) => void;
}

const actionIcons: Record<string, React.ReactNode> = {
  create_lead: <UserPlus className="w-4 h-4" />,
  update_lead_status: <RefreshCw className="w-4 h-4" />,
  add_lead_note: <StickyNote className="w-4 h-4" />,
  create_calendar_event: <Calendar className="w-4 h-4" />,
  send_whatsapp: <MessageCircle className="w-4 h-4" />,
};

const actionColors: Record<string, string> = {
  create_lead: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  update_lead_status: 'bg-blue-50 border-blue-200 text-blue-800',
  add_lead_note: 'bg-amber-50 border-amber-200 text-amber-800',
  create_calendar_event: 'bg-purple-50 border-purple-200 text-purple-800',
  send_whatsapp: 'bg-green-50 border-green-200 text-green-800',
};

const actionButtonColors: Record<string, string> = {
  create_lead: 'bg-emerald-600 hover:bg-emerald-700',
  update_lead_status: 'bg-blue-600 hover:bg-blue-700',
  add_lead_note: 'bg-amber-600 hover:bg-amber-700',
  create_calendar_event: 'bg-purple-600 hover:bg-purple-700',
  send_whatsapp: 'bg-green-600 hover:bg-green-700',
};

export default function ActionCard({ proposal, onResult }: ActionCardProps) {
  const [status, setStatus] = useState<'pending' | 'executing' | 'completed' | 'cancelled' | 'error'>('pending');
  const [errorMsg, setErrorMsg] = useState('');

  const handleConfirm = async () => {
    setStatus('executing');
    try {
      await apiClient.confirmAction(proposal.id);
      setStatus('completed');
      onResult?.(true, 'Accion ejecutada correctamente');
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err.message || 'Error ejecutando la accion');
      onResult?.(false, err.message || 'Error');
    }
  };

  const handleCancel = async () => {
    setStatus('executing');
    try {
      await apiClient.cancelAction(proposal.id);
      setStatus('cancelled');
      onResult?.(false, 'Accion cancelada');
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err.message || 'Error cancelando la accion');
      onResult?.(false, err.message || 'Error');
    }
  };

  const colorClass = actionColors[proposal.type] || 'bg-gray-50 border-gray-200 text-gray-800';
  const btnColor = actionButtonColors[proposal.type] || 'bg-gray-600 hover:bg-gray-700';
  const icon = actionIcons[proposal.type] || <AlertCircle className="w-4 h-4" />;

  if (status === 'completed') {
    return (
      <div className={`rounded-xl border px-4 py-3 ${colorClass} opacity-70`}>
        <div className="flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span className="text-[13px] font-medium">{proposal.title} — Completado</span>
        </div>
      </div>
    );
  }

  if (status === 'cancelled') {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 opacity-60">
        <div className="flex items-center gap-2">
          <X className="w-4 h-4 text-gray-500" />
          <span className="text-[13px] font-medium text-gray-600">{proposal.title} — Cancelado</span>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
        <div className="flex items-center gap-2 text-red-700">
          <AlertCircle className="w-4 h-4" />
          <span className="text-[13px] font-medium">Error: {errorMsg}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border p-4 ${colorClass} shadow-sm`}>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-lg bg-white/80 flex items-center justify-center shadow-sm">
          {icon}
        </div>
        <span className="text-[14px] font-semibold">{proposal.title}</span>
      </div>

      <p className="text-[13px] mb-3 opacity-90 leading-relaxed">{proposal.description}</p>

      {proposal.data && Object.keys(proposal.data).length > 0 && (
        <div className="bg-white/60 rounded-lg px-3 py-2 mb-3 text-[12px] space-y-1">
          {Object.entries(proposal.data).map(([key, value]) => {
            if (key === 'leadId' || key === 'nombreLead') return null;
            return (
              <div key={key} className="flex gap-2">
                <span className="font-medium capitalize opacity-70">{key}:</span>
                <span className="opacity-90">{String(value)}</span>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleConfirm}
          disabled={status === 'executing'}
          className={`flex-1 px-4 py-2 rounded-lg text-[13px] font-medium text-white transition-colors flex items-center justify-center gap-2 ${btnColor} disabled:opacity-50`}
        >
          {status === 'executing' ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Check className="w-3.5 h-3.5" />
          )}
          Confirmar
        </button>
        <button
          onClick={handleCancel}
          disabled={status === 'executing'}
          className="px-4 py-2 rounded-lg text-[13px] font-medium bg-white/80 border border-current opacity-60 hover:opacity-100 transition-opacity disabled:opacity-30"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

export function parseActionProposals(text: string): { cleanText: string; proposals: ActionProposal[] } {
  const proposals: ActionProposal[] = [];
  // Match {"__action__":{...}} blocks
  const actionRegex = /\{\s*"__action__"\s*:\s*(\{[\s\S]*?\})\s*\}/g;
  let match;
  let cleanText = text;

  while ((match = actionRegex.exec(text)) !== null) {
    try {
      const fullMatch = match[0];
      const actionData = JSON.parse(match[1]);
      if (actionData.id && actionData.type) {
        proposals.push(actionData as ActionProposal);
        cleanText = cleanText.replace(fullMatch, '');
      }
    } catch {
      // ignore malformed
    }
  }

  return { cleanText: cleanText.trim(), proposals };
}
