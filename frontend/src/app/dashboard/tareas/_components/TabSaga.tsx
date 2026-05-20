'use client';

import { useEffect, useState } from 'react';
import { ChevronRight, FileText, Lock, Sparkles } from 'lucide-react';
import { SAGA_CHAPTERS, getNextChapter, type SagaChapter } from '../_lib/saga';
import { romanize } from '../_lib/utils';

/* ============================================================
   Tab: Saga del Marketer — narrativa cinematográfica
============================================================ */

export function TabSaga({
  level, sagaRead, onMarkRead,
}: {
  level: number;
  sagaRead: string[];
  onMarkRead: (id: string) => void;
}) {
  const next = getNextChapter(level);

  return (
    <div className="space-y-5">
      {/* Intro */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-950/60 via-slate-900/60 to-indigo-950/60 border border-violet-500/20 p-5 md:p-7">
        <div className="absolute inset-0 bg-[linear-gradient(110deg,transparent_25%,rgba(167,139,250,0.06)_50%,transparent_75%)] animate-shine pointer-events-none" />
        <div className="relative flex items-start gap-4">
          <div className="shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500/30 to-fuchsia-500/30 ring-2 ring-violet-400/40 flex items-center justify-center">
            <FileText className="w-7 h-7 text-violet-300" />
          </div>
          <div className="flex-1">
            <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-violet-400">La saga del Marketer</p>
            <h2 className="text-[22px] md:text-[26px] font-black text-violet-100 mt-1 leading-tight">Tu crónica épica</h2>
            <p className="text-[13px] text-violet-200/70 mt-1.5 leading-snug max-w-2xl">
              Cada nivel desbloquea un nuevo capítulo de tu viaje. Los antiguos del marketing escriben tu historia a medida que avanzas.
              {next && <span className="block mt-1 text-amber-400/80">→ Próximo capítulo en Lvl {next.minLevel}: <span className="font-bold">{next.titulo}</span></span>}
            </p>
          </div>
        </div>
      </div>

      {/* Chapters */}
      <div className="space-y-4">
        {SAGA_CHAPTERS.map((ch, i) => {
          const isUnlocked = level >= ch.minLevel;
          const isNew = isUnlocked && !sagaRead.includes(ch.id);
          return (
            <ChapterCard
              key={ch.id}
              chapter={ch}
              isUnlocked={isUnlocked}
              isNew={isNew}
              index={i + 1}
              onReveal={() => onMarkRead(ch.id)}
            />
          );
        })}
      </div>
    </div>
  );
}

function ChapterCard({
  chapter, isUnlocked, isNew, index, onReveal,
}: {
  chapter: SagaChapter;
  isUnlocked: boolean;
  isNew: boolean;
  index: number;
  onReveal: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (expanded && isNew) onReveal();
  }, [expanded, isNew, onReveal]);

  if (!isUnlocked) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-[var(--bg-secondary)] border border-dashed border-[var(--border-primary)] p-5 opacity-60">
        <div className="absolute inset-0 backdrop-blur-[2px] bg-[var(--bg-secondary)]/30 pointer-events-none" />
        <div className="relative flex items-center gap-4">
          <div className="shrink-0 w-12 h-12 rounded-2xl bg-[var(--bg-tertiary)] ring-1 ring-[var(--border-primary)] flex items-center justify-center">
            <Lock className="w-5 h-5 text-[var(--text-tertiary)]" />
          </div>
          <div className="flex-1 blur-[1.5px]">
            <p className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">Capítulo {romanize(index)}</p>
            <p className="text-[15px] font-bold text-[var(--text-tertiary)] truncate">??? ??? ???</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">Se desbloquea en</p>
            <p className="text-[20px] font-black text-[var(--text-tertiary)]">Lvl {chapter.minLevel}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setExpanded((e) => !e)}
      className={`relative w-full text-left overflow-hidden rounded-2xl border bg-gradient-to-br ${chapter.hue} border-violet-400/30 hover:border-violet-400/50 transition-all p-5 md:p-6 ${expanded ? 'shadow-2xl shadow-violet-500/20' : ''}`}
    >
      <div className="absolute inset-0 bg-[linear-gradient(110deg,transparent_25%,rgba(255,255,255,0.04)_50%,transparent_75%)] animate-shine pointer-events-none" />
      {isNew && (
        <span className="absolute top-3 right-3 inline-flex items-center gap-1 px-2 h-[20px] rounded-md bg-amber-500/30 ring-1 ring-amber-400/50 text-amber-300 text-[10px] font-bold uppercase tracking-wider animate-pulse">
          <Sparkles className="w-3 h-3" /> Nuevo
        </span>
      )}
      <div className="relative flex items-start gap-4">
        <div className="shrink-0 w-14 h-14 rounded-2xl bg-black/30 ring-2 ring-amber-400/40 flex items-center justify-center">
          <span className="text-amber-300 font-black text-[18px]">{romanize(index)}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-amber-300/80">{chapter.narrador}</p>
          <h3 className="text-[18px] md:text-[20px] font-black text-amber-100 leading-tight mt-0.5">{chapter.titulo}</h3>
          {expanded ? (
            <div className="mt-3 animate-fade-in">
              <p className="text-[13.5px] leading-relaxed text-amber-50/90 italic">{chapter.cuerpo}</p>
              <div className="mt-4 pl-4 border-l-2 border-amber-400/40">
                <p className="text-[13px] font-bold text-amber-300/90 italic">— "{chapter.cita}"</p>
              </div>
            </div>
          ) : (
            <p className="text-[12px] text-amber-100/60 mt-1 truncate">{chapter.cuerpo.slice(0, 110)}...</p>
          )}
        </div>
        <ChevronRight className={`shrink-0 w-5 h-5 text-amber-300/60 transition-transform mt-1 ${expanded ? 'rotate-90' : ''}`} />
      </div>
    </button>
  );
}
