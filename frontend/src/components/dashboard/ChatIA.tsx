'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api';
import { Send, Sparkles, Loader2, Code, Clock, Lightbulb } from 'lucide-react';
import ActionCard, { parseActionProposals } from './ActionCard';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sql?: string;
  time?: number;
}

const examplePrompts = [
  'Resume el estado de mi negocio',
  '¿Cuántos leads tengo por estado?',
  'Dame insights y alertas importantes',
  '¿Qué campañas de email tienen mejor rendimiento?',
  '¿Qué eventos tengo en el calendario esta semana?',
];

// Parse markdown tables into structured data
function parseMarkdownTable(text: string): { type: 'text' | 'table'; content: string; rows?: string[][] }[] {
  const lines = text.split('\n');
  const chunks: { type: 'text' | 'table'; content: string; rows?: string[][] }[] = [];
  let currentText: string[] = [];
  let tableLines: string[] = [];

  const flushText = () => {
    if (currentText.length > 0) {
      chunks.push({ type: 'text', content: currentText.join('\n') });
      currentText = [];
    }
  };

  const flushTable = () => {
    if (tableLines.length >= 2) {
      const rows = tableLines
        .filter((line) => line.trim().startsWith('|'))
        .map((line) =>
          line
            .trim()
            .split('|')
            .map((cell) => cell.trim())
            .filter((cell) => cell.length > 0)
        )
        .filter((row) => row.length > 0);
      // Filter out separator rows (rows containing only dashes)
      const dataRows = rows.filter((row) => !row.every((cell) => /^-+$/.test(cell.replace(/\s/g, ''))));
      if (dataRows.length > 0) {
        chunks.push({ type: 'table', content: tableLines.join('\n'), rows: dataRows });
      } else {
        currentText.push(...tableLines);
      }
    } else {
      currentText.push(...tableLines);
    }
    tableLines = [];
  };

  for (const line of lines) {
    if (line.trim().startsWith('|')) {
      if (currentText.length > 0) flushText();
      tableLines.push(line);
    } else {
      if (tableLines.length > 0) flushTable();
      currentText.push(line);
    }
  }

  flushText();
  flushTable();
  return chunks;
}

function MessageContent({ content }: { content: string }) {
  const chunks = parseMarkdownTable(content);

  return (
    <div className="space-y-3">
      {chunks.map((chunk, i) => {
        if (chunk.type === 'table' && chunk.rows && chunk.rows.length > 0) {
          const headers = chunk.rows[0];
          const data = chunk.rows.slice(1);
          return (
            <div key={i} className="overflow-x-auto rounded-xl border border-[var(--border-primary)]">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="bg-[var(--bg-secondary)] border-b border-[var(--border-primary)]">
                    {headers.map((h, hi) => (
                      <th key={hi} className="px-3 py-2 text-left font-semibold text-[var(--text-primary)] whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, ri) => (
                    <tr
                      key={ri}
                      className="border-b border-[var(--border-primary)] last:border-0 hover:bg-[var(--bg-secondary)]/50 transition-colors"
                    >
                      {row.map((cell, ci) => (
                        <td key={ci} className="px-3 py-2 text-[var(--text-secondary)] whitespace-nowrap">
                          <CellContent text={cell} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        return (
          <p key={i} className="text-[15px] whitespace-pre-wrap leading-relaxed">
            <InlineContent text={chunk.content} />
          </p>
        );
      })}
    </div>
  );
}

// Render cell content with colored badges for known statuses
function CellContent({ text }: { text: string }) {
  const statusColors: Record<string, string> = {
    NUEVO: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    CONTACTADO: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    INTERESADO: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    'EN SEGUIMIENTO': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    CALIFICADO: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
    RECHAZADO: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    'NO RESPONDE': 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
    CONVERTIDO: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    activo: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    activa: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    inactivo: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
    cancelada: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    trial: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    completada: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    fallida: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    enviada: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    borrador: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
    BAJA: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
    MEDIA: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    ALTA: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    URGENTE: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };

  const upper = text.trim().toUpperCase();
  const lower = text.trim().toLowerCase();
  const key = Object.keys(statusColors).find((k) => k.toUpperCase() === upper || k.toLowerCase() === lower);

  if (key) {
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ${statusColors[key]}`}>
        {text}
      </span>
    );
  }

  // Highlight numbers in bold
  if (/^\d+([.,]\d+)?\s*(€|%|ms|seg|min|hrs?)?$/.test(text.trim())) {
    return <span className="font-semibold text-[var(--text-primary)]">{text}</span>;
  }

  return <>{text}</>;
}

// Inline formatting for bold, emojis, etc.
function InlineContent({ text }: { text: string }) {
  // Split by bold markers and emoji-like patterns
  const parts = text.split(/(\*\*[\s\S]*?\*\*|\d+([.,]\d+)?\s*(€|%|ms|seg|min|hrs?))/g).filter(Boolean);

  if (parts.length <= 1) return <>{text}</>;

  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} className="font-semibold text-[var(--text-primary)]">{part.slice(2, -2)}</strong>;
        }
        if (/^\d+([.,]\d+)?\s*(€|%|ms|seg|min|hrs?)$/.test(part.trim())) {
          return <strong key={i} className="font-semibold text-[var(--text-primary)]">{part}</strong>;
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

export default function ChatIA() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const assistantIndexRef = useRef<number>(-1);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Check for pending message from InsightsWidget
  useEffect(() => {
    const pending = localStorage.getItem('ia_pending_message');
    if (pending) {
      localStorage.removeItem('ia_pending_message');
      sendMessage(pending);
    }
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setInput('');
    setLoading(true);

    // Add empty assistant message placeholder
    setMessages((prev) => {
      const next = [...prev, { role: 'assistant' as const, content: '' }];
      assistantIndexRef.current = next.length - 1;
      return next;
    });

    try {
      // Try streaming first
      let streamedContent = '';
      let streamSuccess = false;

      await apiClient.chatIAStream(text, {
        onToken: (token) => {
          streamedContent += token;
          streamSuccess = true;
          setMessages((prev) => {
            const next = [...prev];
            const idx = assistantIndexRef.current;
            if (idx >= 0 && idx < next.length) {
              next[idx] = { ...next[idx], content: streamedContent };
            }
            return next;
          });
        },
        onError: (error) => {
          console.warn('Streaming error:', error);
        },
        onComplete: (result) => {
          streamSuccess = true;
          setMessages((prev) => {
            const next = [...prev];
            const idx = assistantIndexRef.current;
            if (idx >= 0 && idx < next.length) {
              next[idx] = {
                ...next[idx],
                content: result.response,
                sql: result.sql,
                time: result.time,
              };
            }
            return next;
          });
          setLoading(false);
        },
      });

      if (!streamSuccess) {
        // Fallback to non-streaming
        const res = await apiClient.chatIA(text);
        setMessages((prev) => {
          const next = [...prev];
          const idx = assistantIndexRef.current;
          if (idx >= 0 && idx < next.length) {
            next[idx] = {
              ...next[idx],
              content: res.data.response,
              sql: res.data.sql,
              time: res.data.time,
            };
          }
          return next;
        });
      }
    } catch {
      setMessages((prev) => {
        const next = [...prev];
        const idx = assistantIndexRef.current;
        if (idx >= 0 && idx < next.length) {
          next[idx] = { ...next[idx], content: 'Error al procesar tu consulta.' };
        }
        return next;
      });
    } finally {
      setLoading(false);
    }
  }, [loading]);

  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl flex flex-col h-[600px] shadow-lg shadow-black/5">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[var(--border-primary)] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-[16px] font-semibold text-[var(--text-primary)]">Asistente IA</h3>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[13px] text-[var(--text-tertiary)]">En línea</span>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/30 dark:to-purple-900/30 flex items-center justify-center mb-6">
              <Sparkles className="w-10 h-10 text-violet-600 dark:text-violet-400" />
            </div>

            <h4 className="text-[20px] font-semibold text-[var(--text-primary)] mb-2">
              ¿Qué quieres saber?
            </h4>
            <p className="text-[15px] text-[var(--text-tertiary)] mb-8 text-center max-w-md">
              Pregunta sobre leads, campañas, llamadas, calendario o métricas. El asistente tiene acceso a todos tus datos.
            </p>

            <div className="flex flex-wrap gap-2 justify-center max-w-2xl">
              {examplePrompts.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(prompt)}
                  className="px-4 py-2.5 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-xl text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-violet-500/30 hover:shadow-md transition-all duration-200 flex items-center gap-2"
                >
                  <Lightbulb className="w-3.5 h-3.5 text-violet-500" />
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mr-3 shrink-0">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
            )}

            <div
              className={`max-w-[85%] rounded-2xl px-5 py-4 ${
                msg.role === 'user'
                  ? 'bg-[var(--text-primary)] text-[var(--bg-primary)]'
                  : 'bg-[var(--bg-tertiary)] border border-[var(--border-primary)]'
              }`}
            >
              {msg.role === 'user' ? (
                <p className="text-[15px] whitespace-pre-wrap leading-relaxed">{msg.content}</p>
              ) : (
                (() => {
                  const { cleanText, proposals } = parseActionProposals(msg.content);
                  return (
                    <div className="space-y-3">
                      {cleanText && <MessageContent content={cleanText} />}
                      {proposals.map((proposal) => (
                        <ActionCard key={proposal.id} proposal={proposal} />
                      ))}
                    </div>
                  );
                })()
              )}

              {msg.sql && (
                <details className="mt-3 group">
                  <summary className="flex items-center gap-2 text-[12px] text-[var(--text-tertiary)] cursor-pointer hover:text-violet-500 transition-colors">
                    <Code className="w-3.5 h-3.5" />
                    Ver SQL generado
                  </summary>
                  <pre className="mt-2 text-[12px] font-mono bg-[var(--bg-secondary)] p-3 rounded-xl overflow-x-auto text-[var(--text-secondary)] border border-[var(--border-primary)]">
                    {msg.sql}
                  </pre>
                </details>
              )}

              {msg.time && (
                <div className="flex items-center gap-1 mt-2 text-[11px] text-[var(--text-tertiary)]">
                  <Clock className="w-3 h-3" />
                  {msg.time}ms
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mr-3 shrink-0">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-2xl px-5 py-4">
              <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-[14px]">Analizando datos...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-6 py-4 border-t border-[var(--border-primary)]">
        <form
          onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}
          className="flex gap-3"
        >
          <div className="flex-1 relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Pregunta sobre leads, email, llamadas, calendario, métricas..."
              disabled={loading}
              className="w-full px-5 py-3.5 pr-12 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-primary)] text-[15px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 disabled:opacity-50 transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-6 py-3.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl text-[15px] font-medium hover:shadow-lg hover:shadow-violet-500/25 hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            Enviar
          </button>
        </form>
        <p className="text-[12px] text-[var(--text-tertiary)] mt-2 text-center">
          El asistente puede cometer errores. Verifica la información importante.
        </p>
      </div>
    </div>
  );
}
