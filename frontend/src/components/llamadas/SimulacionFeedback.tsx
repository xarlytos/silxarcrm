'use client';

import { SimulacionFeedback } from '@/types';
import { Trophy, ThumbsUp, ThumbsDown, Target, RotateCw } from 'lucide-react';

interface SimulacionFeedbackProps {
  feedback: SimulacionFeedback;
  onReintentar?: () => void;
}

const PUNTUACIONES_LABELS: Record<string, string> = {
  apertura: 'Apertura',
  guion: 'Guion',
  escucha: 'Escucha',
  objeciones: 'Objeciones',
  cierre: 'Cierre',
  tono: 'Tono',
};

function getColor(score: number): string {
  if (score >= 8) return 'text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30';
  if (score >= 5) return 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30';
  return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30';
}

export default function SimulacionFeedbackView({ feedback, onReintentar }: SimulacionFeedbackProps) {
  const score = feedback.puntuacionGlobal || 0;
  const scoreColor = getColor(score);

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/40 dark:to-purple-950/40 border border-violet-200 dark:border-violet-800 rounded-2xl p-6">
        <div className="flex items-center gap-4">
          <div className={`w-20 h-20 rounded-2xl flex items-center justify-center ${scoreColor}`}>
            <span className="text-[36px] font-bold">{score}</span>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Trophy className="w-5 h-5 text-violet-600 dark:text-violet-400" />
              <h3 className="text-[18px] font-bold text-[var(--text-primary)]">Puntuacion global</h3>
            </div>
            <p className="text-[14px] text-[var(--text-secondary)]">
              {score >= 8 && '¡Excelente! Llamada de alto nivel.'}
              {score >= 5 && score < 8 && 'Buena base, hay margen de mejora.'}
              {score < 5 && 'Necesita practica. ¡No te rindas!'}
            </p>
          </div>
          {onReintentar && (
            <button
              onClick={onReintentar}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-xl text-[13px] font-medium hover:bg-violet-700 transition-colors"
            >
              <RotateCw className="w-4 h-4" />
              Otra simulacion
            </button>
          )}
        </div>
      </div>

      {feedback.puntuaciones && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Object.entries(feedback.puntuaciones).map(([key, value]) => {
            const label = PUNTUACIONES_LABELS[key] || key;
            const v = (value as number) || 0;
            return (
              <div key={key} className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl p-3">
                <p className="text-[11px] text-[var(--text-tertiary)] uppercase tracking-wider mb-1">{label}</p>
                <div className="flex items-end gap-2">
                  <span className={`text-[24px] font-bold ${getColor(v).split(' ')[0]}`}>{v}</span>
                  <span className="text-[12px] text-[var(--text-tertiary)] mb-1">/10</span>
                </div>
                <div className="mt-1.5 h-1.5 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${getColor(v).split(' ')[1] || 'bg-violet-500'}`}
                    style={{ width: `${v * 10}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {feedback.puntosFuertes && feedback.puntosFuertes.length > 0 && (
          <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <ThumbsUp className="w-4 h-4 text-emerald-600" />
              <h4 className="text-[14px] font-semibold text-emerald-700 dark:text-emerald-400">
                Puntos fuertes
              </h4>
            </div>
            <ul className="space-y-1.5">
              {feedback.puntosFuertes.map((p, i) => (
                <li key={i} className="text-[13px] text-[var(--text-secondary)] flex gap-2">
                  <span className="text-emerald-600">✓</span>
                  {p}
                </li>
              ))}
            </ul>
          </div>
        )}

        {feedback.puntosMejorar && feedback.puntosMejorar.length > 0 && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <ThumbsDown className="w-4 h-4 text-amber-600" />
              <h4 className="text-[14px] font-semibold text-amber-700 dark:text-amber-400">
                A mejorar
              </h4>
            </div>
            <ul className="space-y-1.5">
              {feedback.puntosMejorar.map((p, i) => (
                <li key={i} className="text-[13px] text-[var(--text-secondary)] flex gap-2">
                  <span className="text-amber-600">→</span>
                  {p}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {feedback.feedback && (
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl p-4">
          <h4 className="text-[14px] font-semibold text-[var(--text-primary)] mb-2">Comentario del coach</h4>
          <p className="text-[14px] text-[var(--text-secondary)] leading-relaxed">{feedback.feedback}</p>
        </div>
      )}

      {feedback.proximoPaso && (
        <div className="bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-violet-600" />
            <h4 className="text-[14px] font-semibold text-violet-700 dark:text-violet-400">
              Para la proxima vez
            </h4>
          </div>
          <p className="text-[13px] text-[var(--text-secondary)]">{feedback.proximoPaso}</p>
        </div>
      )}
    </div>
  );
}
