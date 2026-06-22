import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowRight, Target, Repeat, Calendar, Headphones } from 'lucide-react'

const easeOutExpo = [0.16, 1, 0.3, 1] as [number, number, number, number]

const agents = [
  {
    name: 'Closer Agent',
    path: '/closer-agent',
    icon: Target,
    description: 'Convierte reuniones en ventas cerradas con demos y negociacion IA.',
    color: 'text-success',
    bgColor: 'bg-[rgba(16,185,129,0.1)]',
  },
  {
    name: 'Follow-Up Agent',
    path: '/follow-up-agent',
    icon: Repeat,
    description: 'Recupera leads perdidos y reactiva oportunidades dormidas.',
    color: 'text-warning',
    bgColor: 'bg-[rgba(245,158,11,0.1)]',
  },
  {
    name: 'Appointment Agent',
    path: '/appointment-agent',
    icon: Calendar,
    description: 'Gestiona citas, recordatorios y reprogramaciones automaticamente.',
    color: 'text-accent-cyan',
    bgColor: 'bg-[rgba(34,211,238,0.1)]',
  },
  {
    name: 'Receptionist Agent',
    path: '/receptionist-agent',
    icon: Headphones,
    description: 'Atiende llamadas 24/7, captura leads y transfiere con contexto.',
    color: 'text-accent-blue',
    bgColor: 'bg-[rgba(79,110,247,0.1)]',
  },
]

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
}

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: easeOutExpo } },
}

export default function CrossSell() {
  return (
    <section className="bg-bg-primary" style={{ padding: '100px 0' }}>
      <div className="max-w-[1280px] mx-auto px-6 lg:px-12">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.7, ease: easeOutExpo }}
          className="text-[28px] sm:text-[36px] font-semibold leading-[1.2] tracking-[-0.015em] text-white mb-12"
        >
          Potencia tu equipo con mas agentes IA
        </motion.h2>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {agents.map((agent, i) => {
            const Icon = agent.icon
            return (
              <motion.div key={i} variants={cardVariants}>
                <Link
                  to={agent.path}
                  className="block bg-bg-card rounded-2xl p-6 border border-[rgba(255,255,255,0.06)] hover:border-[rgba(79,110,247,0.25)] hover:-translate-y-1 hover:shadow-card-hover transition-all duration-400"
                >
                  <div className={`w-10 h-10 rounded-lg ${agent.bgColor} flex items-center justify-center mb-4`}>
                    <Icon className={`w-5 h-5 ${agent.color}`} />
                  </div>
                  <h3 className="text-[18px] font-semibold text-white mb-2">
                    {agent.name}
                  </h3>
                  <p className="text-[14px] leading-[1.5] text-text-secondary mb-4">
                    {agent.description}
                  </p>
                  <span className="inline-flex items-center gap-1 text-[14px] font-medium text-accent-blue group">
                    Saber mas <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                  </span>
                </Link>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}
