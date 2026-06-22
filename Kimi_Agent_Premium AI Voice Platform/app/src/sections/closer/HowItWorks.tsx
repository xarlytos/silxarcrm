import { motion } from 'framer-motion'
import { UserCheck, Presentation, ShieldCheck, CheckCircle } from 'lucide-react'

const easeOutExpo = [0.16, 1, 0.3, 1] as [number, number, number, number]

const steps = [
  {
    number: '01',
    icon: UserCheck,
    title: 'Prepara cada demo',
    description: 'Antes de la llamada, el agente investiga al prospecto, revisa interacciones previas y personaliza el enfoque. Llega sabiendo exactamente que necesita el lead.',
  },
  {
    number: '02',
    icon: Presentation,
    title: 'Demo que convence',
    description: 'Guia al prospecto a traves de tu producto destacando las funcionalidades relevantes para su caso de uso. Responde preguntas tecnicas en tiempo real.',
  },
  {
    number: '03',
    icon: ShieldCheck,
    title: 'Ninguna objecion sin respuesta',
    description: 'Precio, tiempo, competencia, autoridad. El agente maneja las 45+ objeciones mas comunes con respuestas probadas. Aprende nuevas objeciones con cada conversacion.',
  },
  {
    number: '04',
    icon: CheckCircle,
    title: 'Cierra el deal',
    description: 'Aplica tecnicas de cierre adaptadas al perfil del prospecto. Define proximos pasos claros. Envia contrato y documentacion. Actualiza el CRM con todo el detalle.',
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
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5 }}
          className="section-label text-accent-blue mb-4"
        >
          COMO FUNCIONA
        </motion.p>

        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.7, ease: easeOutExpo }}
          className="text-[28px] sm:text-[36px] lg:text-[48px] font-semibold leading-[1.1] tracking-[-0.02em] text-text-light-primary mb-16 max-w-[600px]"
        >
          De reunion agendada a deal cerrado
        </motion.h2>

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
              <motion.div key={i} variants={stepVariants} className="relative">
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
