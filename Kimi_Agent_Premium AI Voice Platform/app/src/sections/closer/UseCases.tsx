import { motion } from 'framer-motion'
import { Cloud, Briefcase, Gem } from 'lucide-react'

const easeOutExpo = [0.16, 1, 0.3, 1] as [number, number, number, number]

const useCases = [
  {
    icon: Cloud,
    title: 'SaaS B2B con demos de venta',
    description: 'Hace demos de tu software, responde preguntas tecnicas, maneja objeciones de precio y cierra suscripciones mensuales o anuales.',
  },
  {
    icon: Briefcase,
    title: 'Agencias que venden proyectos',
    description: 'Presenta propuestas, explica metodologia, maneja objeciones de presupuesto y cierra contratos de servicios.',
  },
  {
    icon: Gem,
    title: 'Productos y servicios premium',
    description: 'Vehiculos, inmobiliaria, consultoria, formacion. Cualquier venta que requiera una conversacion antes del cierre.',
  },
]

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
}

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: easeOutExpo } },
}

export default function UseCases() {
  return (
    <section className="bg-bg-light" style={{ padding: '100px 0' }}>
      <div className="max-w-[1280px] mx-auto px-6 lg:px-12">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.7, ease: easeOutExpo }}
          className="text-[28px] sm:text-[36px] lg:text-[48px] font-semibold leading-[1.1] tracking-[-0.02em] text-text-light-primary mb-16"
        >
          Quien necesita un Closer Agent
        </motion.h2>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          className="grid md:grid-cols-3 gap-6"
        >
          {useCases.map((uc, i) => {
            const Icon = uc.icon
            return (
              <motion.div
                key={i}
                variants={cardVariants}
                className="bg-white rounded-2xl p-8 border border-[rgba(0,0,0,0.08)] shadow-sm hover:shadow-md transition-shadow duration-300"
              >
                <div className="w-12 h-12 rounded-xl bg-[rgba(79,110,247,0.1)] flex items-center justify-center mb-5">
                  <Icon className="w-5 h-5 text-accent-blue" />
                </div>
                <h3 className="text-[22px] font-semibold text-text-light-primary mb-3 leading-[1.3]">
                  {uc.title}
                </h3>
                <p className="text-[15px] leading-[1.6] text-text-light-secondary">
                  {uc.description}
                </p>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}
