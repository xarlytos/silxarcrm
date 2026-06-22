import { motion } from 'framer-motion'
import { Rocket, Megaphone, Building2 } from 'lucide-react'

const easeOutExpo = [0.16, 1, 0.3, 1] as [number, number, number, number]

const useCases = [
  {
    icon: Rocket,
    title: 'Startups que necesitan escalar ventas',
    description: 'Sin presupuesto para un equipo de SDRs. El agente prospeciona 24/7 mientras tu equipo se centra en el producto.',
  },
  {
    icon: Megaphone,
    title: 'Agencias que generan leads para clientes',
    description: 'Prospecta automaticamente para multiples clientes. Separa pipelines, aplica scripts diferentes, reporta por cuenta.',
  },
  {
    icon: Building2,
    title: 'Empresas B2B con ciclo de ventas largo',
    description: 'Manten el pipeline lleno sin depender de la motivacion de un equipo humano. Seguimiento impecable en ciclos de 3-6 meses.',
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
          Para quien es el SDR Agent
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
