'use client';

import { SpechLlamada, Lead } from '@/types';
import { rellenarVariablesSpech, highlightVariables } from './spechHelpers';
import { Star, FileText, MessageCircleQuestion, ArrowRight } from 'lucide-react';

interface SpechViewerProps {
  spech: SpechLlamada | null;
  lead?: Lead | null;
  showHighlight?: boolean;
  hideObjeciones?: boolean;
  className?: string;
}

export default function SpechViewer({ spech, lead, showHighlight = false, hideObjeciones = false, className = '' }: SpechViewerProps) {
  if (!spech) {
    return (
      <div className={`flex flex-col items-center justify-center py-12 text-center text-[var(--text-tertiary)] ${className}`}>
        <FileText className="w-10 h-10 mb-3 opacity-40" />
        <p className="text-[14px]">Selecciona un spech para visualizarlo</p>
      </div>
    );
  }

  const contenido = lead
    ? rellenarVariablesSpech(spech.contenido, {
        nombre: lead.nombre,
        empresa: lead.empresa,
        cargo: lead.cargo,
        telefono: lead.telefono,
        email: lead.email,
        pais: lead.pais,
      })
    : spech.contenido;

  const html = showHighlight ? highlightVariables(contenido) : null;

  return (
    <div className={className}>
      <div className="flex items-center gap-2 mb-3">
        {spech.esDefault && <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />}
        <h3 className="text-[18px] font-semibold text-[var(--text-primary)]">{spech.titulo}</h3>
        <span className="ml-auto px-2 py-0.5 rounded-md bg-[var(--bg-tertiary)] text-[11px] font-medium text-[var(--text-tertiary)]">
          {spech.objetivo}
        </span>
      </div>
      {html ? (
        <div
          className="text-[14px] leading-relaxed text-[var(--text-secondary)] whitespace-pre-wrap"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <pre className="text-[14px] leading-relaxed text-[var(--text-secondary)] whitespace-pre-wrap font-sans">
          {contenido}
        </pre>
      )}

      {spech.objeciones && spech.objeciones.length > 0 && !hideObjeciones && (
        <div className="mt-5 pt-4 border-t border-[var(--border-primary)]">
          <div className="flex items-center gap-2 mb-3">
            <MessageCircleQuestion className="w-4 h-4 text-amber-600" />
            <h4 className="text-[13px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
              Objeciones frecuentes
            </h4>
            <span className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded text-[11px] font-medium">
              {spech.objeciones.length}
            </span>
          </div>
          <div className="space-y-2.5">
            {spech.objeciones.map((o, idx) => (
              <div
                key={idx}
                className="border border-[var(--border-primary)] rounded-xl overflow-hidden bg-[var(--bg-primary)]"
              >
                <div className="px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-900/40">
                  <p className="text-[13px] font-medium text-amber-900 dark:text-amber-200">
                    <span className="text-[11px] uppercase tracking-wider text-amber-600 dark:text-amber-400 mr-2">Objecion</span>
                    {o.objecion}
                  </p>
                </div>
                <div className="px-3 py-2 flex gap-2">
                  <ArrowRight className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
                    {o.respuesta}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
