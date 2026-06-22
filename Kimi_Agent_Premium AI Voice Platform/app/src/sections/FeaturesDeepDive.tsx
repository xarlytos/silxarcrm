import { motion, useViewportScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'
import {
  Mic,
  Database,
  Link2,
  MessageCircle,
  Mail,
  Workflow,
  BrainCircuit,
  BarChart3,
  Shield,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface FeatureCard {
  icon: LucideIcon
  title: string
  description: string
}

const features: FeatureCard[] = [
  {
    icon: Mic,
    title: 'Voz indistinguible de humana',
    description:
      'Tecnologia de sintesis de voz de ultima generacion. Matices, pausas, emociones. Tu interlocutor no sabra que es IA.',
  },
  {
    icon: Database,
    title: 'Memoria a largo plazo',
    description:
      'Recuerda cada detalle de cada conversacion. Referencia informacion previa naturalmente. El contexto nunca se pierde.',
  },
  {
    icon: Link2,
    title: 'Integracion total con tu CRM',
    description:
      'HubSpot, Salesforce, Pipedrive, Zoho. Sincronizacion bidireccional en tiempo real. Sin trabajo manual.',
  },
  {
    icon: MessageCircle,
    title: 'WhatsApp Business',
    description:
      'El mismo agente gestiona llamadas Y mensajes de WhatsApp. Experiencia omnicanal unificada.',
  },
  {
    icon: Mail,
    title: 'Email y SMS automatizados',
    description:
      'Secuencias de seguimiento multicanal. El agente elige el canal optimo para cada contacto y momento.',
  },
  {
    icon: Workflow,
    title: 'Automatizacion inteligente',
    description:
      'Reglas, triggers, flujos de trabajo personalizados. El agente ejecuta tareas complejas sin intervencion humana.',
  },
  {
    icon: BrainCircuit,
    title: 'IA conversacional avanzada',
    description:
      'Entiende contexto, maneja objeciones, guia conversaciones hacia el objetivo. Aprende de cada interaccion.',
  },
  {
    icon: BarChart3,
    title: 'Analitica en tiempo real',
    description:
      'Dashboard completo con metricas de llamadas, conversiones, sentiment analysis. Datos accionables al instante.',
  },
  {
    icon: Shield,
    title: 'Seguridad empresarial',
    description:
      'Cumplimiento GDPR, encriptacion end-to-end, auditoria completa. Tus datos estan protegidos.',
  },
]

// Floating icons animation variants
const floatingIconVariants = {
  initial: { y: 0 },
  animate: {
    y: [-8, 8, -8],
    transition: {
      duration: 4,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
}

// Pulse glow animation
const pulseGlowVariants = {
  initial: { opacity: 0.5, scale: 0.95 },
  animate: {
    opacity: [0.5, 0.8, 0.5],
    scale: [0.95, 1.05, 0.95],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
}

// Title text reveal
const titleVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
}

// Description stagger
const descriptionVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay: 0.1 },
}

// Card hover effects
const cardVariants = {
  initial: { opacity: 0, y: 40 },
  inView: { opacity: 1, y: 0 },
  hover: {
    y: -8,
    boxShadow: '0 20px 60px rgba(79, 110, 247, 0.25)',
  },
}

function FeatureCardComponent({
  feature,
  index,
  waveDelay,
}: {
  feature: FeatureCard
  index: number
  waveDelay: number
}) {
  const Icon = feature.icon
  const cardRef = useRef<HTMLDivElement>(null)
  const { scrollY } = useViewportScroll()

  // Parallax effect for each card based on grid position
  const row = Math.floor(index / 3)
  const offset = row % 2 === 0 ? 30 : -30

  const y = useTransform(
    scrollY,
    [0, 800],
    [offset, -offset],
    { clamp: true }
  )

  return (
    <motion.div
      ref={cardRef}
      initial="initial"
      whileInView="inView"
      whileHover="hover"
      variants={cardVariants}
      viewport={{ once: true, margin: '-50px' }}
      transition={{
        duration: 0.6,
        delay: waveDelay,
        ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
      }}
      style={{ y }}
      className="relative group overflow-hidden rounded-2xl"
    >
      {/* Animated background blur gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#4F6EF7] via-[#7B61FF] to-[#FF006E] opacity-0 group-hover:opacity-10 blur-2xl transition-opacity duration-500" />

      {/* Glass card with enhanced effects */}
      <div className="relative h-full p-6 lg:p-8 rounded-2xl backdrop-blur-xl border border-white/10 group-hover:border-white/20 transition-all duration-300"
        style={{
          background: 'linear-gradient(135deg, rgba(79,110,247,0.12) 0%, rgba(123,97,255,0.06) 50%, rgba(255,0,110,0.03) 100%)',
        }}
      >
        {/* Glow effect background */}
        <motion.div
          className="absolute -inset-4 bg-gradient-to-r from-[#4F6EF7]/0 via-[#7B61FF]/5 to-[#FF006E]/0 rounded-2xl blur-2xl"
          variants={pulseGlowVariants}
          initial="initial"
          animate="animate"
        />

        {/* Icon container with animations */}
        <motion.div
          initial={{ scale: 0, rotate: -180, opacity: 0 }}
          whileInView={{ scale: 1, rotate: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{
            duration: 0.6,
            delay: waveDelay + 0.15,
            type: 'spring',
            stiffness: 150,
            damping: 12,
          }}
          className="relative z-10 w-14 h-14 rounded-xl mb-6 flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(79,110,247,0.1) 100%)',
            border: '1px solid rgba(79,110,247,0.3)',
          }}
        >
          {/* Icon glow background */}
          <motion.div
            className="absolute inset-0 bg-[#4F6EF7]/20 rounded-xl blur-md"
            variants={pulseGlowVariants}
            initial="initial"
            animate="animate"
          />

          {/* Icon with floating animation */}
          <motion.div
            variants={floatingIconVariants}
            initial="initial"
            animate="animate"
            className="relative z-10"
          >
            <Icon className="w-7 h-7 text-[#4F6EF7] drop-shadow-lg" />
          </motion.div>
        </motion.div>

        {/* Title with enhanced reveal */}
        <motion.h3
          className="text-[18px] font-semibold text-white mb-3 relative z-10"
          variants={titleVariants}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
          transition={{ ...titleVariants.transition, delay: waveDelay + 0.2 }}
        >
          {feature.title}
        </motion.h3>

        {/* Description with staggered reveal */}
        <motion.p
          className="text-[14px] text-[#A0A0B8] leading-relaxed relative z-10 group-hover:text-[#BEBCC8] transition-colors duration-300"
          variants={descriptionVariants}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
          transition={{ ...descriptionVariants.transition, delay: waveDelay + 0.25 }}
        >
          {feature.description}
        </motion.p>

        {/* Hover indicator line */}
        <motion.div
          className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-[#4F6EF7] via-[#7B61FF] to-transparent"
          initial={{ width: 0 }}
          whileHover={{ width: '100%' }}
          transition={{ duration: 0.3 }}
        />
      </div>
    </motion.div>
  )
}

export default function FeaturesDeepDive() {
  return (
    <section id="features" className="py-[100px] lg:py-[140px] bg-[#06060A] relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Gradient orb 1 */}
        <motion.div
          className="absolute w-[500px] h-[500px] bg-[#4F6EF7]/10 rounded-full blur-3xl"
          initial={{ x: -200, y: 100, opacity: 0 }}
          animate={{ x: -100, y: 200, opacity: 0.3 }}
          transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
          style={{ top: '-10%', left: '-5%' }}
        />
        {/* Gradient orb 2 */}
        <motion.div
          className="absolute w-[600px] h-[600px] bg-[#7B61FF]/10 rounded-full blur-3xl"
          initial={{ x: 0, y: -100, opacity: 0 }}
          animate={{ x: 200, y: -50, opacity: 0.25 }}
          transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          style={{ bottom: '-15%', right: '-10%' }}
        />
      </div>

      <div className="max-w-[1280px] mx-auto px-6 lg:px-12 relative z-10">
        {/* Section Header with enhanced animations */}
        <div className="text-center max-w-[680px] mx-auto mb-20">
          <motion.p
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="section-label mb-4 inline-block"
          >
            CARACTER&Iacute;STICAS
          </motion.p>

          <motion.h2
            initial={{ opacity: 0, y: 30, clipPath: 'inset(0 0 100% 0)' }}
            whileInView={{ opacity: 1, y: 0, clipPath: 'inset(0 0 0% 0)' }}
            viewport={{ once: true }}
            transition={{
              duration: 0.8,
              delay: 0.1,
              ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
            }}
            className="text-[28px] sm:text-[36px] lg:text-[48px] font-semibold text-white leading-[1.1] tracking-[-0.02em] bg-gradient-to-r from-white via-[#E8E8F0] to-[#A0A0B8] bg-clip-text text-transparent"
          >
            Tecnologia de vanguardia para conversaciones que convierten
          </motion.h2>

          <motion.div
            className="h-1 w-16 bg-gradient-to-r from-[#4F6EF7] to-[#7B61FF] mx-auto mt-8 rounded-full"
            initial={{ width: 0, opacity: 0 }}
            whileInView={{ width: 64, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
          />
        </div>

        {/* Feature Grid with staggered animations */}
        <motion.div
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
          initial="initial"
          whileInView="inView"
          viewport={{ once: true, margin: '-100px' }}
        >
          {features.map((feature, index) => {
            const row = Math.floor(index / 3)
            const col = index % 3
            const waveDelay = (row + col) * 0.08

            return (
              <FeatureCardComponent
                key={feature.title}
                feature={feature}
                index={index}
                waveDelay={waveDelay}
              />
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}
