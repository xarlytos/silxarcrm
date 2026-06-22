import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Search, Handshake, RotateCcw, Calendar, Headphones, Check, ArrowRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface AgentCard {
  badge: string
  badgeColor: string
  icon: LucideIcon
  title: string
  subtitle: string
  features: string[]
  cta: string
  link: string
  featured?: boolean
  bgTint?: string
  borderColor?: string
}

const agents: AgentCard[] = [
  {
    badge: 'M\u00c1S POPULAR',
    badgeColor: '#7B61FF',
    icon: Search,
    title: 'SDR Agent',
    subtitle: 'Prospeccion y cualificacion automatica',
    features: [
      'Cold calls con voz natural',
      'Cualificacion de leads en tiempo real',
      'Agenda reuniones automaticamente',
      'Integracion con tu CRM',
    ],
    cta: 'Descubrir SDR Agent',
    link: '/sdr-agent',
    featured: true,
    bgTint: 'rgba(79,110,247,0.06)',
    borderColor: 'rgba(79,110,247,0.2)',
  },
  {
    badge: 'CIERRE EXPERTO',
    badgeColor: '#10B981',
    icon: Handshake,
    title: 'Closer Agent',
    subtitle: 'Demos, objeciones y cierre de ventas',
    features: [
      'Demos personalizadas automaticas',
      'Manejo de objeciones avanzado',
      'Cierre con tecnicas probadas',
      'Seguimiento post-venta',
    ],
    cta: 'Descubrir Closer Agent',
    link: '/closer-agent',
  },
  {
    badge: 'RECUPERACION',
    badgeColor: '#F59E0B',
    icon: RotateCcw,
    title: 'Follow-Up Agent',
    subtitle: 'Recupera oportunidades que estas perdiendo',
    features: [
      'Recontacta leads frios automaticamente',
      'Secuencias de recuperacion inteligentes',
      'Identifica oportunidades perdidas',
      'Informa a ventas en tiempo real',
    ],
    cta: 'Descubrir Follow-Up Agent',
    link: '/follow-up-agent',
  },
  {
    badge: 'AGENDA INTELIGENTE',
    badgeColor: '#22D3EE',
    icon: Calendar,
    title: 'Appointment Agent',
    subtitle: 'Gestion de citas sin ausencias',
    features: [
      'Programa citas automaticamente',
      'Confirma y reagenda sin esfuerzo',
      'Reduce ausencias hasta 47%',
      'Sincroniza con tu calendario',
    ],
    cta: 'Descubrir Appointment Agent',
    link: '/appointment-agent',
  },
  {
    badge: '24/7 DISPONIBLE',
    badgeColor: '#4F6EF7',
    icon: Headphones,
    title: 'Receptionist Agent',
    subtitle: 'La recepcionista que nunca duerme',
    features: [
      'Atiende llamadas 24/7 sin descanso',
      'Captura y cualifica leads instantaneamente',
      'Transfiere a humanos cuando es necesario',
      'Responde preguntas frecuentes',
    ],
    cta: 'Descubrir Receptionist Agent',
    link: '/receptionist-agent',
  },
]

function AgentCardComponent({ agent, index }: { agent: AgentCard; index: number }) {
  const Icon = agent.icon
  const isFeatured = agent.featured

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{
        duration: 0.6,
        delay: index * 0.12,
        ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
      }}
      className={`group ${isFeatured ? 'md:row-span-2' : ''}`}
    >
      <Link to={agent.link} className="block h-full">
        <div
          className={`relative h-full rounded-3xl p-8 border transition-all duration-400 ${
            isFeatured ? 'md:p-10' : ''
          }`}
          style={{
            background: agent.bgTint || 'rgba(17,17,26,1)',
            borderColor: agent.borderColor || 'rgba(255,255,255,0.06)',
          }}
        >
          {/* Badge */}
          <span
            className="inline-block px-3 py-1 rounded-full text-[11px] font-semibold mb-5"
            style={{ background: `${agent.badgeColor}20`, color: agent.badgeColor }}
          >
            {agent.badge}
          </span>

          {/* Icon */}
          <div className="w-12 h-12 rounded-xl bg-[rgba(255,255,255,0.05)] flex items-center justify-center mb-4">
            <Icon className="w-6 h-6 text-[#4F6EF7]" />
          </div>

          {/* Title & Subtitle */}
          <h3 className="text-[22px] lg:text-[28px] font-semibold text-white mb-1">
            {agent.title}
          </h3>
          <p className="text-[14px] text-[#8A8A9A] mb-6">{agent.subtitle}</p>

          {/* Features */}
          <ul className="space-y-3 mb-8">
            {agent.features.map((feature, i) => (
              <li key={i} className="flex items-start gap-3">
                <Check className="w-4 h-4 text-[#4F6EF7] mt-0.5 shrink-0" />
                <span className="text-[14px] text-[#8A8A9A]">{feature}</span>
              </li>
            ))}
          </ul>

          {/* CTA */}
          <span className="inline-flex items-center gap-2 text-[14px] font-medium text-[#4F6EF7] group-hover:text-[#7B61FF] transition-colors">
            {agent.cta}
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </span>

          {/* Hover glow effect */}
          <div
            className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-400 pointer-events-none"
            style={{
              boxShadow: '0 12px 48px rgba(79,110,247,0.12)',
              borderColor: 'rgba(79,110,247,0.25)',
              border: '1px solid rgba(79,110,247,0.25)',
            }}
          />
        </div>
      </Link>
    </motion.div>
  )
}

export default function Marketplace() {
  return (
    <section
      id="marketplace"
      className="relative py-[100px] lg:py-[140px]"
      style={{ background: '#06060A' }}
    >
      {/* Subtle blue radial */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 50% 50% at 50% 50%, rgba(79,110,247,0.04) 0%, transparent 70%)',
        }}
      />

      <div className="relative z-10 max-w-[1280px] mx-auto px-6 lg:px-12">
        {/* Section Header */}
        <div className="mb-16">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="section-label mb-4"
          >
            MARKETPLACE DE AGENTES
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
            className="text-[28px] sm:text-[36px] lg:text-[48px] font-semibold text-white leading-[1.1] tracking-[-0.02em] mb-5 max-w-[640px]"
          >
            Contrata a tu equipo de agentes IA especializados
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-[18px] text-[#8A8A9A] leading-relaxed max-w-[600px]"
          >
            Cada agente esta entrenado para una funcion especifica de tu negocio. Despliega uno o un
            equipo completo. Escalan contigo.
          </motion.p>
        </div>

        {/* Bento Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map((agent, index) => (
            <AgentCardComponent key={agent.title} agent={agent} index={index} />
          ))}
        </div>
      </div>
    </section>
  )
}
