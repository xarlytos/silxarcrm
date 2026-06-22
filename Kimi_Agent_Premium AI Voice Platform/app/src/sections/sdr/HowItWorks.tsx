import { motion } from 'framer-motion'
import { Download, Phone, Filter, CalendarCheck } from 'lucide-react'

const easeOutExpo = [0.16, 1, 0.3, 1] as [number, number, number, number]

const steps = [
  {
    number: '01',
    icon: Download,
    title: 'Captura',
    description: 'El agente recibe leads de tus fuentes: formularios web, anuncios, LinkedIn, eventos, bases de datos. Se integra con tu CRM para sincronizacion en tiempo real.',
  },
  {
    number: '02',
    icon: Phone,
    title: 'Cold Call Inteligente',
    description: 'Llama con voz indistinguible de humana. Presenta tu propuesta de valor, maneja objeciones iniciales y genera interes. Nunca suena robotico ni forzado.',
  },
  {
    number: '03',
    icon: Filter,
    title: 'Cualificacion Automatica',
    description: 'Aplica tu framework de cualificacion (BANT, MEDDIC, o el que uses). Evalua presupuesto, autoridad, necesidad y timing. Solo pasa leads cualificados.',
  },
  {
    number: '04',
    icon: CalendarCheck,
    title: 'Agenda Reuniones',
    description: 'Propone horarios disponibles de tu calendario, confirma asistencia y envia recordatorios. La reunion aparece en tu calendario con toda la informacion del lead.',
  },
]

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
}

const stepVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: easeOutExpo } },
}

export default function HowItWorks() {
  return (
    <section className="bg-bg-light" style={{ padding: '140px 0' }}>
      <div className="max-w-[1280px] mx-auto px-6 lg:px-12">
        {/* Section label */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5 }}
          className="section-label text-accent-blue mb-4"
        >
          COMO FUNCIONA
        </motion.p>

        {/* Headline */}
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.7, ease: easeOutExpo }}
          className="text-[28px] sm:text-[36px] lg:text-[48px] font-semibold leading-[1.1] tracking-[-0.02em] text-text-light-primary mb-16 max-w-[700px]"
        >
          De lead a reunion agendada, sin intervencion humana
        </motion.h2>

        {/* Steps */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {steps.map((step, i) => {
            const Icon = step.icon
            return (
              <motion.div
                key={i}
                variants={stepVariants}
                className="relative"
              >
                {/* Connector line (not on last item) */}
                {i < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-[calc(50%+24px)] right-[calc(-50%+24px)] h-[2px]">
                    <div className="w-full h-full bg-gradient-to-r from-accent-blue/30 to-transparent" />
                  </div>
                )}

                <div className="bg-white rounded-2xl p-8 border border-[rgba(0,0,0,0.08)] shadow-sm h-full">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-[12px] font-mono font-medium text-accent-blue">{step.number}</span>
                    <div className="w-10 h-10 rounded-lg bg-[rgba(79,110,247,0.1)] flex items-center justify-center">
                      <Icon className="w-5 h-5 text-accent-blue" />
                    </div>
                  </div>
                  <h3 className="text-[20px] font-semibold text-text-light-primary mb-3">
                    {step.title}
                  </h3>
                  <p className="text-[15px] leading-[1.6] text-text-light-secondary">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}
