'use client';

import {
  Brain,
  Zap,
  Wrench,
  AlertTriangle,
  Lightbulb,
  MessageSquareQuote,
  Sparkles,
  Target,
} from 'lucide-react';

interface IaClassification {
  sector?: string;
  subsector?: string;
  painPoints?: string[];
  automationOpportunities?: string[];
  personalizedPitch?: string;
  softwareType?: string;
  confidence?: 'alta' | 'media' | 'baja';
}

interface Props {
  iaData: IaClassification | null | undefined;
}

const confidenceColor: Record<string, string> = {
  alta: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  media: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  baja: 'bg-red-500/10 text-red-600 border-red-500/20',
};

const confidenceLabel: Record<string, string> = {
  alta: 'Alta',
  media: 'Media',
  baja: 'Baja',
};

export default function LeadIAAnalysis({ iaData }: Props) {
  if (!iaData) return null;

  const {
    sector,
    subsector,
    painPoints,
    automationOpportunities,
    personalizedPitch,
    softwareType,
    confidence,
  } = iaData;

  const hasContent =
    sector ||
    subsector ||
    (painPoints && painPoints.length > 0) ||
    (automationOpportunities && automationOpportunities.length > 0) ||
    personalizedPitch ||
    softwareType;

  if (!hasContent) return null;

  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-[var(--border-primary)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-violet-500" />
          <h3 className="text-[16px] font-semibold text-[var(--text-primary)]">
            Análisis IA
          </h3>
        </div>
        {confidence && (
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-medium border ${confidenceColor[confidence] || confidenceColor.media}`}
          >
            Confianza {confidenceLabel[confidence]}
          </span>
        )}
      </div>

      <div className="p-5 space-y-5">
        {/* Sector / Subsector */}
        {(sector || subsector) && (
          <div className="flex flex-wrap gap-2">
            {sector && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-500/10 text-violet-600 text-[12px] font-medium">
                <Target className="w-3 h-3" />
                {sector}
              </span>
            )}
            {subsector && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-600 text-[12px] font-medium">
                <Sparkles className="w-3 h-3" />
                {subsector}
              </span>
            )}
          </div>
        )}

        {/* Pitch */}
        {personalizedPitch && (
          <div className="bg-gradient-to-br from-violet-500/5 to-purple-500/5 border border-violet-500/10 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquareQuote className="w-3.5 h-3.5 text-violet-500" />
              <span className="text-[12px] font-semibold text-violet-600 uppercase tracking-wide">
                Pitch personalizado
              </span>
            </div>
            <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed italic">
              &ldquo;{personalizedPitch}&rdquo;
            </p>
          </div>
        )}

        {/* Software recomendado */}
        {softwareType && (
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0 mt-0.5">
              <Lightbulb className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wide">
                Software recomendado
              </span>
              <p className="text-[13px] text-[var(--text-primary)] mt-0.5">
                {softwareType}
              </p>
            </div>
          </div>
        )}

        {/* Pain Points */}
        {painPoints && painPoints.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-[11px] font-semibold text-amber-600 uppercase tracking-wide">
                Pain points detectados
              </span>
            </div>
            <ul className="space-y-1.5">
              {painPoints.map((p, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-[13px] text-[var(--text-secondary)]"
                >
                  <span className="w-1 h-1 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                  {p}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Automation Opportunities */}
        {automationOpportunities && automationOpportunities.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-3.5 h-3.5 text-sky-500" />
              <span className="text-[11px] font-semibold text-sky-600 uppercase tracking-wide">
                Oportunidades de automatización
              </span>
            </div>
            <ul className="space-y-1.5">
              {automationOpportunities.map((a, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-[13px] text-[var(--text-secondary)]"
                >
                  <span className="w-1 h-1 rounded-full bg-sky-400 mt-1.5 shrink-0" />
                  {a}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Metadata footer */}
        <div className="pt-3 border-t border-[var(--border-primary)]">
          <p className="text-[11px] text-[var(--text-tertiary)]">
            Generado por MiniMax AI · Sector derivado del scan de Google Places
          </p>
        </div>
      </div>
    </div>
  );
}
