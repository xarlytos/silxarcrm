import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowRight, Target, Zap, RotateCcw, CalendarCheck } from 'lucide-react'

const agents = [
  {
    icon: <Target className="w-6 h-6" />,
    name: 'SDR Agent',
    description: 'Prospección y cualificación de leads automática.',
    path: '/sdr-agent',
    color: '#4F6EF7',
  },
  {
    icon: <Zap className="w-6 h-6" />,
    name: 'Closer Agent',
    description: 'Demos, objeciones y cierre de ventas.',
    path: '/closer-agent',
    color: '#7B61FF',
  },
  {
    icon: <RotateCcw className="w-6 h-6" />,
    name: 'Follow-Up Agent',
    description: 'Recuperación de leads y nurturing.',
    path: '/follow-up-agent',
    color: '#22D3EE',
  },
  {
    icon: <CalendarCheck className="w-6 h-6" />,
    name: 'Appointment Agent',
    description: 'Programación, reprogramación y recordatorios.',
    path: '/appointment-agent',
    color: '#10B981',
  },
]

export default function CrossSellSection() {
  return (
    <section
      id="cross-sell"
      className="relative py-[100px] lg:py-[100px]"
      style={{ background: '#0C0C14' }}
    >
      <div className="max-w-[1280px] mx-auto px-6 lg:px-12">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
          className="text-center mb-12"
        >
          <h2 className="text-[28px] sm:text-[36px] font-semibold text-white leading-[1.1] tracking-[-0.015em] mb-4">
            Construye tu equipo de atención al cliente IA
          </h2>
          <p className="text-[16px] text-[#8A8A9A]">
            Explora otros agentes especializados para cada fase de tu negocio
          </p>
        </motion.div>

        {/* Explore Other Agents Link */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-center mb-12"
        >
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-[15px] font-medium text-[#4F6EF7] hover:text-[#7B61FF] transition-colors"
          >
            Explorar todos los agentes
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>

        {/* Agent Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {agents.map((agent, index) => (
            <motion.div
              key={agent.name}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{
                duration: 0.7,
                delay: index * 0.1,
                ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
              }}
              whileHover={{ y: -4 }}
              className="group"
            >
              <Link
                to={agent.path}
                className="block rounded-[20px] p-6 border border-[rgba(255,255,255,0.06)] transition-all duration-400 h-full"
                style={{ background: '#11111A' }}
              >
                {/* Icon */}
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: `${agent.color}15`, color: agent.color }}
                >
                  {agent.icon}
                </div>

                {/* Name */}
                <h3 className="text-[16px] font-semibold text-white mb-2">{agent.name}</h3>

                {/* Description */}
                <p className="text-[14px] text-[#8A8A9A] leading-relaxed mb-4">
                  {agent.description}
                </p>

                {/* Link */}
                <span
                  className="inline-flex items-center gap-1 text-[14px] font-medium transition-colors"
                  style={{ color: agent.color }}
                >
                  Ver más
                  <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
