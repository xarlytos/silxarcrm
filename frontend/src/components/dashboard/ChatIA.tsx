'use client';

import { useState, useRef, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import { Send, Sparkles, Loader2, Code, Clock } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sql?: string;
  time?: number;
}

const examplePrompts = [
  '¿Cuál es el MRR de este mes?',
  'Muestra los clientes con mayor churn',
  'Comparativa de ingresos entre SaaS',
  'Clientes que cancelaron este mes',
  'Tasa de conversión de trials',
];

export default function ChatIA() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setInput('');
    setLoading(true);
    try {
      const res = await apiClient.chatIA(text);
      setMessages((prev) => [...prev, {
        role: 'assistant', content: res.data.response, sql: res.data.sql, time: res.data.time,
      }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Error al procesar tu consulta.' }]);
    } finally {
      setLoading(false);
    }
  };

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
              Pregunta sobre tus datos en lenguaje natural. El asistente analizará tu información y te dará respuestas precisas.
            </p>

            <div className="flex flex-wrap gap-2 justify-center max-w-2xl">
              {examplePrompts.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(prompt)}
                  className="px-4 py-2.5 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-xl text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-violet-500/30 hover:shadow-md transition-all duration-200"
                >
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
              className={`max-w-[80%] rounded-2xl px-5 py-4 ${
                msg.role === 'user'
                  ? 'bg-[var(--text-primary)] text-[var(--bg-primary)]'
                  : 'bg-[var(--bg-tertiary)] border border-[var(--border-primary)]'
              }`}
            >
              <p className="text-[15px] whitespace-pre-wrap leading-relaxed">
                {msg.content}
              </p>

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
              placeholder="Escribe tu pregunta sobre los datos..."
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
