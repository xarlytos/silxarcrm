'use client';

import { useState } from 'react';
import { LeadSimulado, Personalidad, Dificultad, SpechLlamada } from '@/types';
import { PERSONALIDADES, DIFICULTADES } from './spechHelpers';
import { Play, Sparkles } from 'lucide-react';

interface SimulacionConfigProps {
  spechs: SpechLlamada[];
  selectedSpechId?: string | null;
  onStart: (spechId: string | null, leadSimulado: LeadSimulado) => Promise<void>;
}

const PRESETS_CONTEXTO = [
  'Tiene un negocio establecido pero usa procesos manuales (Excel, hojas de papel)',
  'No conoce el software, ha recibido recomendaciones de un amigo',
  'Ya tiene una solucion del competidor pero no esta del todo satisfecho',
  'Acaba de empezar y busca herramientas para crecer',
  'Es escepticismo total: nunca ha pagado por software empresarial',
];

export default function SimulacionConfig({ spechs, selectedSpechId, onStart }: SimulacionConfigProps) {
  const [spechId, setSpechId] = useState<string | null>(selectedSpechId || (spechs.find((s) => s.esDefault)?.id ?? null));
  const [nombre, setNombre] = useState('Carlos Martinez');
  const [empresa, setEmpresa] = useState('AgroPlus SL');
  const [cargo, setCargo] = useState('Director');
  const [personalidad, setPersonalidad] = useState<Personalidad>('resistente');
  const [dificultad, setDificultad] = useState<Dificultad>('medio');
  const [contexto, setContexto] = useState(PRESETS_CONTEXTO[0]);
  const [starting, setStarting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      alert('Nombre del cliente simulado obligatorio');
      return;
    }
    setStarting(true);
    try {
      await onStart(spechId, {
        nombre: nombre.trim(),
        empresa: empresa.trim() || undefined,
        cargo: cargo.trim() || undefined,
        personalidad,
        contexto,
        dificultad,
      });
    } finally {
      setStarting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/40 dark:to-purple-950/40 border border-violet-200 dark:border-violet-800 rounded-2xl p-4">
        <div className="flex items-start gap-2">
          <Sparkles className="w-5 h-5 text-violet-600 dark:text-violet-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-[14px] font-semibold text-[var(--text-primary)]">Practica con un cliente IA</h3>
            <p className="text-[12px] text-[var(--text-secondary)] mt-1">
              Configura como sera el cliente y la IA responderá en personaje. Al terminar, recibiras feedback detallado.
            </p>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-1.5">
          Spech a practicar
        </label>
        <select
          value={spechId || ''}
          onChange={(e) => setSpechId(e.target.value || null)}
          className="w-full px-4 py-2.5 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl text-[14px] text-[var(--text-primary)]"
        >
          <option value="">Sin guion (libre)</option>
          {spechs.map((s) => (
            <option key={s.id} value={s.id}>
              {s.titulo} {s.esDefault ? '⭐' : ''}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-1.5">Nombre del cliente</label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="w-full px-4 py-2.5 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl text-[14px] text-[var(--text-primary)]"
            required
          />
        </div>
        <div>
          <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-1.5">Empresa</label>
          <input
            type="text"
            value={empresa}
            onChange={(e) => setEmpresa(e.target.value)}
            className="w-full px-4 py-2.5 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl text-[14px] text-[var(--text-primary)]"
          />
        </div>
        <div>
          <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-1.5">Cargo</label>
          <input
            type="text"
            value={cargo}
            onChange={(e) => setCargo(e.target.value)}
            className="w-full px-4 py-2.5 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl text-[14px] text-[var(--text-primary)]"
          />
        </div>
      </div>

      <div>
        <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-2">Personalidad</label>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {PERSONALIDADES.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setPersonalidad(p.value)}
              className={`p-3 rounded-xl border text-left transition-all ${
                personalidad === p.value
                  ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
                  : 'border-[var(--border-primary)] bg-[var(--bg-primary)] hover:border-[var(--text-tertiary)]'
              }`}
            >
              <p className="text-[13px] font-semibold text-[var(--text-primary)]">{p.label}</p>
              <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">{p.desc}</p>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-2">Nivel de dificultad</label>
        <div className="grid grid-cols-3 gap-2">
          {DIFICULTADES.map((d) => (
            <button
              key={d.value}
              type="button"
              onClick={() => setDificultad(d.value)}
              className={`p-3 rounded-xl border text-left transition-all ${
                dificultad === d.value
                  ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
                  : 'border-[var(--border-primary)] bg-[var(--bg-primary)] hover:border-[var(--text-tertiary)]'
              }`}
            >
              <p className="text-[13px] font-semibold text-[var(--text-primary)] capitalize">{d.label}</p>
              <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">{d.desc}</p>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-1.5">
          Contexto / Situacion del cliente
        </label>
        <textarea
          value={contexto}
          onChange={(e) => setContexto(e.target.value)}
          rows={3}
          className="w-full px-4 py-3 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl text-[14px] text-[var(--text-primary)] resize-y"
        />
        <div className="flex flex-wrap gap-1.5 mt-2">
          {PRESETS_CONTEXTO.map((p, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setContexto(p)}
              className="text-[11px] px-2 py-1 bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] rounded-md transition-colors"
            >
              {p.length > 50 ? p.substring(0, 50) + '...' : p}
            </button>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={starting}
        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl text-[14px] font-medium hover:shadow-lg hover:shadow-violet-500/25 transition-all disabled:opacity-50"
      >
        <Play className="w-4 h-4" />
        {starting ? 'Iniciando...' : 'Iniciar simulacion'}
      </button>
    </form>
  );
}
