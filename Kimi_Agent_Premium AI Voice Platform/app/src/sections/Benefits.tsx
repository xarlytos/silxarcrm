'use client'

import { motion } from 'framer-motion'
import { Clock, Brain, TrendingUp, Wallet, Target, Sparkles } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useEffect, useState } from 'react'

interface BenefitCard {
  icon: LucideIcon
  title: string
  description: string
  stat?: string | { value: number; label: string }
  colSpan?: boolean
}

interface CounterProps {
  from: number
  to: number
  duration?: number
  suffix?: string
  prefix?: string
}

function AnimatedCounter({ from, to, duration = 2, suffix = '', prefix = '' }: CounterProps) {
  const [count, setCount] = useState(from)

  useEffect(() => {
    let startTime: number
    let animationId: number

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / (duration * 1000), 1)

      setCount(Math.floor(from + (to - from) * progress))

      if (progress < 1) {
        animationId = requestAnimationFrame(animate)
      }
    }

    animationId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationId)
  }, [from, to, duration])

  return (
    <>
      {prefix}
      {count}
      {suffix}
    </>
  )
}

const benefits: BenefitCard[] = [
  {
    icon: Clock,
    title: 'Trabaja 24/7, sin pausas',
    description:
      'Mientras tú duermes, comes o planificas tu próximo move, tu agente AI está en llamadas. Sin vacaciones, sin enfermedades, sin agotamiento.',
    stat: { value: 168, label: 'h/semana vs 40h humana' },
    colSpan: true,
  },
  {
    icon: Brain,
    title: 'Memoria infinita',
    description:
      'Cada conversación queda guardada. Tu agente recuerda preferencias, historial, patrones. El próximo contacto es cien veces más relevante.',
  },
  {
    icon: TrendingUp,
    title: 'Escala sin límite',
    description:
      'Necesitas 50 agentes o 5,000? El costo escala linealmente. Lanza nuevos agentes en minutos, no en semanas.',
    stat: { value: 100, label: 'agentes en < 5 min' },
  },
  {
    icon: Wallet,
    title: 'Corta gastos operativos',
    description:
      'Un agente AI cuesta una fracción de un empleado. Adiós rotación, capacitación y ausentismo. Tu margen mejora.',
    stat: { value: 73, label: '% ahorro promedio' },
  },
  {
    icon: Target,
    title: 'Más ventas cerradas',
    description:
      'Seguimiento automatizado, respuesta al instante, cada cliente se siente personalizado. Los leads que otros pierden, tú los cierras.',
    stat: { value: 340, label: '% más seguimiento' },
  },
  {
    icon: Sparkles,
    title: 'Mejora cada día',
    description:
      'Tu agente aprende de cada conversación. Detecta qué funciona, ajusta estrategias, optimiza resultados. No es estático.',
  },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
}

const cardVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.6,
      ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
    },
  },
}

const iconVariants = {
  rest: { scale: 1, rotate: 0 },
  hover: {
    scale: 1.1,
    rotate: 5,
    transition: { duration: 0.3, type: 'spring', stiffness: 300 },
  },
}

const glowVariants = {
  rest: { opacity: 0, scale: 0.8 },
  hover: {
    opacity: 1,
    scale: 1.2,
    transition: { duration: 0.4 },
  },
}

interface HoverState {
  [key: string]: boolean
}

export default function Benefits() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [inViewIndices, setInViewIndices] = useState<Set<number>>(new Set())

  const handleStatViewChange = (index: number, inView: boolean) => {
    setInViewIndices((prev) => {
      const newSet = new Set(prev)
      if (inView) newSet.add(index)
      else newSet.delete(index)
      return newSet
    })
  }

  return (
    <section id="benefits" className="py-[100px] lg:py-[140px] bg-[#0C0C14] relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute w-96 h-96 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-full blur-3xl"
          animate={{
            x: [0, 100, 0],
            y: [0, 50, 0],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          style={{ top: '-50px', left: '-100px' }}
        />
        <motion.div
          className="absolute w-96 h-96 bg-gradient-to-r from-purple-500/10 to-cyan-500/10 rounded-full blur-3xl"
          animate={{
            x: [0, -100, 0],
            y: [0, -50, 0],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
          style={{ bottom: '-50px', right: '-100px' }}
        />
      </div>

      <div className="max-w-[1280px] mx-auto px-6 lg:px-12 relative z-10">
        {/* Section Header */}
        <div className="mb-16">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="section-label mb-4"
          >
            BENEFICIOS
          </motion.p>
          <motion.div
            initial={{ opacity: 0, width: 0 }}
            whileInView={{ opacity: 1, width: '3rem' }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.08 }}
            className="h-1 bg-gradient-to-r from-[#4F6EF7] to-transparent rounded-full mb-4"
          />
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
            className="text-[32px] sm:text-[42px] lg:text-[56px] font-semibold text-white leading-[1.0] tracking-[-0.025em] max-w-[640px]"
          >
            Lo que consigues con un agente AI
          </motion.h2>
        </div>

        {/* Floating Cards Grid */}
        <motion.div
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
        >
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon
            const statObj =
              typeof benefit.stat === 'object'
                ? benefit.stat
                : benefit.stat
                  ? { value: parseInt(benefit.stat.split(' ')[0]), label: benefit.stat }
                  : null

            return (
              <motion.div
                key={benefit.title}
                variants={cardVariants}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                className={`group relative cursor-pointer h-full ${benefit.colSpan ? 'md:col-span-2 lg:col-span-1' : ''}`}
              >
                {/* Hover Glow Effect */}
                <motion.div
                  className="absolute inset-0 rounded-2xl opacity-0 blur-xl"
                  style={{
                    background:
                      hoveredIndex === index
                        ? 'linear-gradient(135deg, rgba(79,110,247,0.4) 0%, rgba(123,97,255,0.3) 100%)'
                        : 'transparent',
                  }}
                  transition={{ duration: 0.3 }}
                />

                {/* Card */}
                <motion.div
                  className="relative h-full p-8 rounded-2xl border border-white/10 backdrop-blur-sm flex flex-col"
                  style={{
                    background: 'linear-gradient(180deg, rgba(79,110,247,0.08) 0%, rgba(123,97,255,0.04) 100%)',
                  }}
                  animate={hoveredIndex === index ? { y: -8, borderColor: 'rgba(79,110,247,0.3)' } : { y: 0, borderColor: 'rgba(255,255,255,0.1)' }}
                  transition={{ duration: 0.3, type: 'spring', stiffness: 300 }}
                >
                  {/* Icon Container */}
                  <motion.div
                    className="relative w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center mb-6 group-hover:shadow-lg group-hover:shadow-blue-500/20"
                    variants={iconVariants}
                    initial="rest"
                    animate={hoveredIndex === index ? 'hover' : 'rest'}
                  >
                    <Icon className="w-7 h-7 text-cyan-400 group-hover:text-cyan-300 transition-colors" />

                    {/* Glow effect behind icon */}
                    <motion.div
                      className="absolute inset-0 rounded-xl bg-gradient-to-br from-blue-400/30 to-purple-400/30 blur-lg -z-10"
                      variants={glowVariants}
                      initial="rest"
                      animate={hoveredIndex === index ? 'hover' : 'rest'}
                    />
                  </motion.div>

                  {/* Content */}
                  <h3 className="text-[20px] lg:text-[22px] font-semibold text-white mb-3 leading-tight group-hover:text-cyan-100 transition-colors">
                    {benefit.title}
                  </h3>
                  <p className="text-[14px] lg:text-[15px] text-gray-400 leading-relaxed mb-6 flex-grow group-hover:text-gray-300 transition-colors">
                    {benefit.description}
                  </p>

                  {/* Stat with Counter Animation */}
                  {statObj && (
                    <motion.div
                      className="pt-4 border-t border-white/10 mt-auto"
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.4 + index * 0.1 }}
                      onViewportEnter={() => handleStatViewChange(index, true)}
                    >
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl lg:text-4xl font-bold text-cyan-400 group-hover:text-cyan-300 transition-colors">
                          {inViewIndices.has(index) ? <AnimatedCounter from={0} to={statObj.value} duration={2} /> : '0'}
                        </span>
                        <span className="text-xs lg:text-sm text-gray-500 font-medium">
                          {statObj.label}
                        </span>
                      </div>
                    </motion.div>
                  )}
                </motion.div>

                {/* Floating particles on hover */}
                {hoveredIndex === index && (
                  <div className="absolute inset-0 pointer-events-none">
                    {[...Array(3)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="absolute w-1 h-1 bg-cyan-400 rounded-full"
                        initial={{
                          x: '50%',
                          y: '50%',
                          opacity: 1,
                        }}
                        animate={{
                          x: `${50 + Math.cos((i / 3) * Math.PI * 2) * 60}%`,
                          y: `${50 + Math.sin((i / 3) * Math.PI * 2) * 60}%`,
                          opacity: 0,
                        }}
                        transition={{
                          duration: 0.8,
                          ease: 'easeOut',
                        }}
                      />
                    ))}
                  </div>
                )}
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}
