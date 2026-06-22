import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Search, Handshake, RotateCcw, Calendar, Headphones, Check, ArrowRight, Sparkles } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useState } from 'react'

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
  const [isHovered, setIsHovered] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.92 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{
        duration: 0.7,
        delay: index * 0.08,
        ease: [0.23, 1, 0.32, 1] as [number, number, number, number],
      }}
      className={`group ${isFeatured ? 'md:row-span-2' : ''} h-full`}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      <Link to={agent.link} className="block h-full">
        <motion.div
          whileHover={{ y: -8, transition: { duration: 0.4, ease: 'easeOut' } }}
          className={`relative h-full rounded-2xl lg:rounded-3xl p-8 border overflow-hidden backdrop-blur-sm ${
            isFeatured ? 'md:p-10' : ''
          }`}
          style={{
            background: agent.bgTint || 'rgba(17,17,26,0.8)',
            borderColor: agent.borderColor || 'rgba(255,255,255,0.08)',
          }}
        >
          {/* Animated gradient border on hover */}
          <motion.div
            className="absolute inset-0 rounded-2xl lg:rounded-3xl opacity-0 pointer-events-none"
            animate={{
              opacity: isHovered ? 1 : 0,
              boxShadow: isHovered
                ? `0 20px 60px ${agent.badgeColor}15, inset 0 0 1px ${agent.badgeColor}30`
                : `0 0 0px ${agent.badgeColor}00`,
            }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />

          {/* Floating particles effect */}
          <motion.div
            className="absolute inset-0 rounded-2xl lg:rounded-3xl pointer-events-none"
            style={{
              background: `radial-gradient(circle at 50% 50%, ${agent.badgeColor}08 0%, transparent 70%)`,
            }}
            animate={{
              opacity: isHovered ? 1 : 0.3,
            }}
            transition={{ duration: 0.6 }}
          />

          {/* Content wrapper */}
          <div className="relative z-10">
            {/* Badge with floating animation */}
            <motion.span
              className="inline-block px-3 py-1.5 rounded-full text-[11px] font-semibold mb-6 backdrop-blur-sm border"
              style={{
                background: `${agent.badgeColor}12`,
                color: agent.badgeColor,
                borderColor: `${agent.badgeColor}20`,
              }}
              animate={{
                y: isHovered ? -2 : 0,
              }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            >
              {agent.badge}
            </motion.span>

            {/* Icon with rotation */}
            <motion.div
              className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[rgba(255,255,255,0.1)] to-[rgba(255,255,255,0.05)] flex items-center justify-center mb-6 border border-[rgba(255,255,255,0.08)] backdrop-blur-sm"
              whileHover={{
                scale: 1.12,
                rotate: 8,
              }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            >
              <Icon className="w-7 h-7" style={{ color: agent.badgeColor }} />
            </motion.div>

            {/* Title & Subtitle */}
            <motion.h3
              className="text-[20px] sm:text-[24px] lg:text-[28px] font-semibold text-white mb-2 leading-tight"
              animate={{
                color: isHovered ? agent.badgeColor : '#FFFFFF',
              }}
              transition={{ duration: 0.3 }}
            >
              {agent.title}
            </motion.h3>
            <p className="text-[14px] text-[#A1A1B4] mb-6 leading-relaxed line-clamp-2">
              {agent.subtitle}
            </p>

            {/* Features with stagger */}
            <ul className="space-y-2.5 mb-8">
              {agent.features.map((feature, i) => (
                <motion.li
                  key={i}
                  className="flex items-start gap-3"
                  initial={{ opacity: 0.8, x: 0 }}
                  whileHover={{ x: 4 }}
                  animate={{
                    opacity: isHovered ? 1 : 0.85,
                  }}
                  transition={{
                    duration: 0.3,
                  }}
                >
                  <motion.div
                    animate={{
                      scale: isHovered ? 1.15 : 1,
                      rotate: isHovered ? 360 : 0,
                    }}
                    transition={{ duration: 0.5, delay: i * 0.05, ease: 'easeOut' }}
                  >
                    <Check className="w-4 h-4 shrink-0 mt-0.5" style={{ color: agent.badgeColor }} />
                  </motion.div>
                  <span className="text-[13px] text-[#A1A1B4]">{feature}</span>
                </motion.li>
              ))}
            </ul>

            {/* CTA Button */}
            <motion.div
              className="inline-flex items-center gap-2 text-[14px] font-semibold"
              style={{ color: agent.badgeColor }}
              whileHover={{ gap: 8 }}
              transition={{ duration: 0.3 }}
            >
              {isHovered && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.2 }}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                </motion.div>
              )}
              <span>{agent.cta}</span>
              <motion.div
                animate={{
                  x: isHovered ? 4 : 0,
                }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              >
                <ArrowRight className="w-4 h-4" />
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      </Link>
    </motion.div>
  )
}

export default function Marketplace() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.06,
        delayChildren: 0.15,
      },
    },
  }

  return (
    <section
      id="marketplace"
      className="relative py-[80px] lg:py-[160px] overflow-hidden"
      style={{ background: '#06060A' }}
    >
      {/* Dynamic gradient background */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{
          background: [
            'radial-gradient(ellipse 50% 50% at 50% 50%, rgba(79,110,247,0.03) 0%, transparent 70%)',
            'radial-gradient(ellipse 60% 60% at 45% 55%, rgba(79,110,247,0.05) 0%, transparent 75%)',
            'radial-gradient(ellipse 50% 50% at 50% 50%, rgba(79,110,247,0.03) 0%, transparent 70%)',
          ],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage:
            'linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '50px 50px',
        }}
      />

      <div className="relative z-10 max-w-[1280px] mx-auto px-6 lg:px-12">
        {/* Section Header */}
        <motion.div
          className="mb-20"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.7, ease: [0.23, 1, 0.32, 1] }}
        >
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="section-label mb-4 text-[12px] font-semibold uppercase tracking-wider text-[#4F6EF7] opacity-80"
          >
            MARKETPLACE DE AGENTES
          </motion.p>
          <motion.div
            initial={{ opacity: 0, width: 0 }}
            whileInView={{ opacity: 1, width: '3rem' }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.08 }}
            className="h-1 bg-gradient-to-r from-[#4F6EF7] to-transparent rounded-full mb-4"
          />
          <motion.h2
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.23, 1, 0.32, 1] as [number, number, number, number] }}
            className="text-[32px] sm:text-[40px] lg:text-[56px] font-bold text-white leading-[1.08] tracking-[-0.025em] mb-5 max-w-[720px]"
          >
            Contrata a tu equipo de agentes IA especializados
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-[16px] lg:text-[18px] text-[#A1A1B4] leading-relaxed max-w-[680px]"
          >
            Cada agente esta entrenado para una funcion especifica de tu negocio. Despliega uno o un
            equipo completo. Escalan contigo.
          </motion.p>
        </motion.div>

        {/* Bento Grid with enhanced spacing and stagger */}
        <motion.div
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-10"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
        >
          {agents.map((agent, index) => (
            <AgentCardComponent key={agent.title} agent={agent} index={index} />
          ))}
        </motion.div>
      </div>
    </section>
  )
}
