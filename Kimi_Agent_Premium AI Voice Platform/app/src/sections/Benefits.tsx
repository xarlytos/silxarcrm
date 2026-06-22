import { motion } from 'framer-motion'
import { Clock, Brain, TrendingUp, Wallet, Target, Sparkles } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface BenefitCard {
  icon: LucideIcon
  title: string
  description: string
  stat?: string
  colSpan?: boolean
}

const benefits: BenefitCard[] = [
  {
    icon: Clock,
    title: 'Disponible 24/7, 365 dias',
    description:
      'Nunca cierra. Nunca se enferma. Nunca pide vacaciones. Tu agente IA esta trabajando mientras duermes, mientras comes, mientras tu competencia descansa.',
    stat: '168h/semana vs 40h humana',
    colSpan: true,
  },
  {
    icon: Brain,
    title: 'Nunca olvida',
    description:
      'Cada conversacion, cada preferencia, cada detalle queda guardado. El siguiente contacto sera personalizado y relevante.',
  },
  {
    icon: TrendingUp,
    title: 'Escala instantaneamente',
    description:
      '100 llamadas o 10,000? El mismo coste. Anade agentes en segundos, no en meses.',
    stat: '0 a 100 agentes en < 5 minutos',
  },
  {
    icon: Wallet,
    title: 'Reduce costes operativos',
    description:
      'Elimina salarios, formacion, rotacion y absentismo. Un agente IA cuesta una fraccion de un empleado humano equivalente.',
    stat: 'Hasta un 73% de ahorro',
  },
  {
    icon: Target,
    title: 'Aumenta conversiones',
    description:
      'Seguimiento persistente, respuesta inmediata, personalizacion automatica. Los numeros hablan por si solos.',
    stat: '+340% media en seguimiento',
  },
  {
    icon: Sparkles,
    title: 'Aprende continuamente',
    description:
      'Cada conversacion mejora al agente. Analiza patrones, ajusta estrategias y optimiza resultados automaticamente.',
  },
]

export default function Benefits() {
  return (
    <section id="benefits" className="py-[100px] lg:py-[140px] bg-[#0C0C14]">
      <div className="max-w-[1280px] mx-auto px-6 lg:px-12">
        {/* Section Header */}
        <div className="mb-16">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="section-label mb-4"
          >
            BENEFICIOS
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
            className="text-[28px] sm:text-[36px] lg:text-[48px] font-semibold text-white leading-[1.1] tracking-[-0.02em] max-w-[640px]"
          >
            Por que las empresas lideres eligen agentes IA
          </motion.h2>
        </div>

        {/* Bento Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon
            return (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{
                  duration: 0.6,
                  delay: index * 0.1,
                  ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
                }}
                className={`glass-card ${benefit.colSpan ? 'md:col-span-2 lg:col-span-1' : ''}`}
                style={{
                  background: 'linear-gradient(180deg, rgba(79,110,247,0.08) 0%, rgba(123,97,255,0.04) 100%)',
                }}
              >
                <div className="w-12 h-12 rounded-xl bg-[rgba(255,255,255,0.05)] flex items-center justify-center mb-5">
                  <Icon className="w-6 h-6 text-[#4F6EF7]" />
                </div>
                <h3 className="text-[22px] font-semibold text-white mb-3">
                  {benefit.title}
                </h3>
                <p className="text-[15px] text-[#8A8A9A] leading-relaxed mb-4">
                  {benefit.description}
                </p>
                {benefit.stat && (
                  <p className="text-[14px] font-semibold text-[#22D3EE]">
                    {benefit.stat}
                  </p>
                )}
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
