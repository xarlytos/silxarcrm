import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowRight, UserSearch, HandshakeIcon, TrendingUp, Headphones } from 'lucide-react'

const easeOutExpo = [0.16, 1, 0.3, 1] as [number, number, number, number]

const agents = [
  {
    name: 'SDR Agent',
    path: '/sdr-agent',
    description: 'Prospeccion y cualificacion automatica',
    icon: UserSearch,
    color: 'from-[#4F6EF7] to-[#7B61FF]',
  },
  {
    name: 'Closer Agent',
    path: '/closer-agent',
    description: 'Cierre de ventas y negociacion',
    icon: HandshakeIcon,
    color: 'from-[#7B61FF] to-[#22D3EE]',
  },
  {
    name: 'Follow-Up Agent',
    path: '/follow-up-agent',
    description: 'Recuperacion de leads y nurturing',
    icon: TrendingUp,
    color: 'from-[#F59E0B] to-[#EF4444]',
  },
  {
    name: 'Receptionist Agent',
    path: '/receptionist-agent',
    description: 'Recepcion 24/7 y captura de leads',
    icon: Headphones,
    color: 'from-[#22D3EE] to-[#10B981]',
  },
]

export default function CrossSell() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-15%' })

  return (
    <section className="py-[60px] lg:py-[100px] bg-[#0C0C14]">
      <div className="max-w-[1280px] mx-auto px-6 lg:px-12" ref={ref}>
        {/* Headline */}
        <motion.h2
          initial={{ opacity: 0, y: 40 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: easeOutExpo }}
          className="text-[36px] font-semibold leading-[1.2] tracking-[-0.015em] text-white mb-12"
        >
          Potencia tu negocio con mas agentes IA
        </motion.h2>

        {/* Agent Mini-Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {agents.map((agent, i) => (
            <motion.div
              key={agent.path}
              initial={{ opacity: 0, y: 40 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: i * 0.1, ease: easeOutExpo }}
            >
              <Link
                to={agent.path}
                className="block bg-[#11111A] border border-[rgba(255,255,255,0.06)] rounded-2xl p-6 hover:border-[rgba(79,110,247,0.25)] hover:-translate-y-1 hover:shadow-card-hover transition-all duration-400 group"
              >
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${agent.color} flex items-center justify-center mb-4 opacity-80 group-hover:opacity-100 transition-opacity`}
                >
                  <agent.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-[18px] font-semibold text-white mb-1">{agent.name}</h3>
                <p className="text-[14px] text-[#8A8A9A] mb-4">{agent.description}</p>
                <span className="inline-flex items-center gap-1 text-[14px] font-medium text-[#4F6EF7] group-hover:gap-2 transition-all">
                  Saber mas <ArrowRight className="w-4 h-4" />
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
