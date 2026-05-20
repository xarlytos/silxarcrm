'use client';

import { useEffect, useRef, useState } from 'react';
import { MensajeChatSimulacion } from '@/types';
import { Send, StopCircle } from 'lucide-react';

interface SimulacionChatProps {
  mensajes: MensajeChatSimulacion[];
  clienteNombre: string;
  loading?: boolean;
  onSend: (texto: string) => Promise<void>;
  onFinalizar: () => Promise<void>;
}

export default function SimulacionChat({
  mensajes,
  clienteNombre,
  loading,
  onSend,
  onFinalizar,
}: SimulacionChatProps) {
  const [texto, setTexto] = useState('');
  const [sending, setSending] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes.length]);

  const handleSend = async () => {
    if (!texto.trim() || sending) return;
    const t = texto.trim();
    setTexto('');
    setSending(true);
    try {
      await onSend(t);
    } finally {
      setSending(false);
    }
  };

  const handleFinalize = async () => {
    if (!confirm('¿Finalizar simulacion y obtener feedback?')) return;
    setFinalizing(true);
    try {
      await onFinalizar();
    } finally {
      setFinalizing(false);
    }
  };

  return (
    <div className="flex flex-col h-[600px] bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--border-primary)] bg-[var(--bg-tertiary)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-[12px] font-bold">
            {clienteNombre.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-[13px] font-semibold text-[var(--text-primary)]">{clienteNombre}</p>
            <p className="text-[11px] text-[var(--text-tertiary)]">Cliente simulado · IA</p>
          </div>
        </div>
        <button
          onClick={handleFinalize}
          disabled={finalizing || mensajes.length < 2}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-[12px] font-medium hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors disabled:opacity-50"
        >
          <StopCircle className="w-3.5 h-3.5" />
          {finalizing ? 'Analizando...' : 'Finalizar'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[var(--bg-primary)]">
        {mensajes.length === 0 && (
          <div className="text-center text-[13px] text-[var(--text-tertiary)] py-8">
            Esperando primera respuesta del cliente...
          </div>
        )}
        {mensajes.map((m, i) => {
          const esAgente = m.rol === 'agente';
          return (
            <div key={i} className={`flex ${esAgente ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-[14px] ${
                  esAgente
                    ? 'bg-violet-600 text-white rounded-br-md'
                    : 'bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-primary)] rounded-bl-md'
                }`}
              >
                {m.texto}
              </div>
            </div>
          );
        })}
        {(loading || sending) && (
          <div className="flex justify-start">
            <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl rounded-bl-md px-4 py-2.5 text-[var(--text-tertiary)]">
              <span className="inline-flex gap-1">
                <span className="w-1.5 h-1.5 bg-[var(--text-tertiary)] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-[var(--text-tertiary)] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-[var(--text-tertiary)] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="p-3 border-t border-[var(--border-primary)] bg-[var(--bg-secondary)]">
        <div className="flex gap-2">
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Escribe lo que dirias por telefono... (Enter para enviar)"
            rows={2}
            disabled={sending || finalizing}
            className="flex-1 px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl text-[14px] text-[var(--text-primary)] resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/30"
          />
          <button
            onClick={handleSend}
            disabled={!texto.trim() || sending || finalizing}
            className="flex items-center justify-center w-12 bg-gradient-to-br from-violet-500 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all disabled:opacity-40"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
