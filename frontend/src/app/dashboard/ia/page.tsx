'use client';

import ChatIA from '@/components/dashboard/ChatIA';
import { Sparkles, BarChart3, Users, Mail, Phone, MessageSquare, CalendarDays, Zap } from 'lucide-react';

const features = [
  {
    icon: <Users className="w-5 h-5" />,
    title: 'Leads & Pipeline',
    description: 'Estados, prioridades, asignaciones, conversiones',
  },
  {
    icon: <Mail className="w-5 h-5" />,
    title: 'Email Outreach',
    description: 'Campañas, aperturas, clicks, tasas de conversión',
  },
  {
    icon: <Phone className="w-5 h-5" />,
    title: 'Centro de Llamadas',
    description: 'Llamadas realizadas, duración, tasa de contacto',
  },
  {
    icon: <MessageSquare className="w-5 h-5" />,
    title: 'WhatsApp',
    description: 'Envíos, plantillas, engagement',
  },
  {
    icon: <BarChart3 className="w-5 h-5" />,
    title: 'Métricas SaaS',
    description: 'MRR, ARR, churn, ingresos, suscripciones',
  },
  {
    icon: <CalendarDays className="w-5 h-5" />,
    title: 'Calendario',
    description: 'Eventos próximos, seguimientos, reuniones',
  },
  {
    icon: <Zap className="w-5 h-5" />,
    title: 'Insights Proactivos',
    description: 'Alertas, recomendaciones, predicciones',
  },
  {
    icon: <Sparkles className="w-5 h-5" />,
    title: 'Consultas SQL',
    description: 'Preguntas avanzadas con datos en bruto',
  },
];

export default function IAPage() {
  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-end justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-[32px] font-bold tracking-tight text-[var(--text-primary)]">
              Asistente IA
            </h1>
            <p className="text-[15px] text-[var(--text-secondary)]">
              Analista inteligente con acceso a todo tu CRM
            </p>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {features.map((feature) => (
          <div
            key={feature.title}
            className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl p-5 hover:border-violet-500/30 hover:shadow-lg hover:shadow-violet-500/5 transition-all duration-300"
          >
            <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center mb-3">
              <span className="text-violet-600 dark:text-violet-400">{feature.icon}</span>
            </div>
            <h3 className="text-[15px] font-semibold text-[var(--text-primary)] mb-1">
              {feature.title}
            </h3>
            <p className="text-[13px] text-[var(--text-tertiary)]">
              {feature.description}
            </p>
          </div>
        ))}
      </div>

      {/* Chat */}
      <ChatIA />
    </div>
  );
}
