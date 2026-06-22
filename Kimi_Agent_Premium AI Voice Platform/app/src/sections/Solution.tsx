'use client'

import { motion } from 'framer-motion'
import { Download, Phone, Brain, Zap, RotateCcw, Target } from 'lucide-react'
import { useRef, useState } from 'react'

const steps = [
  {
    number: '01',
    title: 'Captura',
    description: 'El agente recibe leads de tus fuentes: web, anuncios, CRM, formularios.',
    icon: Download,
    color: 'from-[#4F6EF7] to-[#7B68EE]',
  },
  {
    number: '02',
    title: 'Conversacion',
    description: 'Llama con voz natural indistinguible de un humano. Mantiene dialogos fluidos.',
    icon: Phone,
    color: 'from-[#FF6B6B] to-[#FF8E72]',
  },
  {
    number: '03',
    title: 'Memoria',
    description: 'Recuerda cada interaccion, preferencia y detalle. Nunca pregunta dos veces lo mismo.',
    icon: Brain,
    color: 'from-[#00D084] to-[#4DB8A8]',
  },
  {
    number: '04',
    title: 'Automatizacion',
    description: 'Ejecuta tareas automaticamente: envia emails, actualiza el CRM, programa citas.',
    icon: Zap,
    color: 'from-[#FFB400] to-[#FF9E1B]',
  },
  {
    number: '05',
    title: 'Seguimiento',
    description: 'Persistente pero respetuoso. Recontacta en el momento optimo para cada lead.',
    icon: RotateCcw,
    color: 'from-[#9B59B6] to-[#C39BD3]',
  },
  {
    number: '06',
    title: 'Resultado',
    description: 'Cita agendada, venta cerrada, oportunidad recuperada. Metricas claras.',
    icon: Target,
    color: 'from-[#E74C3C] to-[#EC7063]',
  },
]

function StepCard({ step, index, onHover, isHovered }: { step: typeof steps[0]; index: number; onHover: (id: number | null) => void; isHovered: number | null }) {
  const Icon = step.icon
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const cardRef = useRef<HTMLDivElement>(null)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return

    const rect = cardRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    setMousePos({ x, y })
  }

  return (
    <motion.div
      key={step.number}
      ref={cardRef}
      initial={{ opacity: 0, y: 40, rotateX: -20 }}
      whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{
        duration: 0.6,
        delay: index * 0.12,
        ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
      }}
      onMouseEnter={() => onHover(index)}
      onMouseLeave={() => onHover(null)}
      onMouseMove={handleMouseMove}
      className="relative group"
      whileHover={{ y: -8 }}
    >
      {/* Glow effect on hover */}
      {isHovered === index && (
        <motion.div
          className={`absolute -inset-0.5 bg-gradient-to-r ${step.color} rounded-2xl blur-xl opacity-20 group-hover:opacity-30 -z-10`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.3 }}
          exit={{ opacity: 0 }}
        />
      )}

      <div className="relative bg-white rounded-2xl p-8 border border-[rgba(0,0,0,0.08)] h-full overflow-hidden shadow-lg group-hover:shadow-2xl transition-all duration-300">
        {/* Animated gradient overlay on mouse move */}
        <motion.div
          className={`absolute inset-0 bg-gradient-to-r ${step.color} opacity-0 group-hover:opacity-5`}
          style={{
            background: isHovered === index
              ? `radial-gradient(circle at ${mousePos.x}px ${mousePos.y}px, var(--color-primary, rgba(79, 110, 247, 0.15)), transparent)`
              : 'transparent'
          }}
          transition={{ duration: 0.2 }}
        />

        {/* Timeline connecting line - animated */}
        {index < steps.length - 1 && (
          <motion.div
            className="hidden lg:block absolute top-1/2 -right-3 w-6 h-[2px] bg-gradient-to-r from-[rgba(79,110,247,0.3)] via-[rgba(79,110,247,0.15)] to-transparent"
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: index * 0.12 + 0.3 }}
            style={{ originX: 0 }}
          />
        )}

        <div className="relative z-10">
          {/* Step number and icon - animated */}
          <motion.div
            className="flex items-center gap-4 mb-6"
            whileHover={{ x: 4 }}
            transition={{ duration: 0.2 }}
          >
            <motion.span
              className={`font-mono text-[24px] font-bold bg-gradient-to-r ${step.color} bg-clip-text text-transparent`}
              whileHover={{ scale: 1.15 }}
              transition={{ duration: 0.2 }}
            >
              {step.number}
            </motion.span>

            <motion.div
              className={`w-12 h-12 rounded-xl bg-gradient-to-br ${step.color} flex items-center justify-center shadow-lg`}
              whileHover={{ rotate: 12, scale: 1.1 }}
              whileInView={{
                rotate: 0,
                transition: { duration: 0.5, delay: index * 0.12 + 0.2 }
              }}
              transition={{ duration: 0.3 }}
            >
              <Icon className="w-6 h-6 text-white" strokeWidth={2.5} />
            </motion.div>
          </motion.div>

          {/* Title - dynamic typography */}
          <motion.h3
            className={`text-[22px] font-bold text-[#0A0A12] mb-3 leading-tight`}
            whileHover={{
              backgroundImage: `linear-gradient(90deg, #0A0A12, #4F6EF7)`,
              backgroundClip: 'text',
              color: 'transparent'
            }}
            transition={{ duration: 0.3 }}
          >
            {step.title}
          </motion.h3>

          {/* Description - reveal on hover */}
          <motion.p
            className="text-[14px] text-[#5A5A6A] leading-relaxed font-medium"
            initial={{ opacity: 0.7 }}
            whileHover={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            {step.description}
          </motion.p>

          {/* Indicator dot - animated */}
          <motion.div
            className={`absolute bottom-4 right-4 w-2 h-2 rounded-full bg-gradient-to-r ${step.color}`}
            animate={isHovered === index ? { scale: [1, 1.4, 1], opacity: [1, 0.6, 1] } : { scale: 1, opacity: 0.5 }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        </div>
      </div>
    </motion.div>
  )
}

export default function Solution() {
  const [hoveredCard, setHoveredCard] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Scroll reveal text animation
  const titleVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        delay: i * 0.08,
        ease: [0.16, 1, 0.3, 1]
      }
    })
  }

  return (
    <section id="solution" className="py-[100px] lg:py-[140px] bg-gradient-to-b from-[#F8F8FB] via-[#F8F8FB] to-[#FFFFFF] relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute w-[400px] h-[400px] rounded-full bg-gradient-to-br from-[#4F6EF7] via-[#7B68EE] to-transparent opacity-5 blur-3xl"
          animate={{ y: [0, 100, 0], x: [0, 50, 0] }}
          transition={{ duration: 20, repeat: Infinity }}
          style={{ top: '-50%', right: '-10%' }}
        />
        <motion.div
          className="absolute w-[300px] h-[300px] rounded-full bg-gradient-to-bl from-[#00D084] to-transparent opacity-5 blur-3xl"
          animate={{ y: [100, 0, 100], x: [-50, 0, -50] }}
          transition={{ duration: 25, repeat: Infinity }}
          style={{ bottom: '-20%', left: '-5%' }}
        />
      </div>

      <div className="max-w-[1280px] mx-auto px-6 lg:px-12 relative z-10">
        {/* Section Header with dynamic typography */}
        <div className="text-center max-w-[800px] mx-auto mb-20">
          <motion.p
            initial={{ opacity: 0, y: 20, letterSpacing: '0.1em' }}
            whileInView={{ opacity: 1, y: 0, letterSpacing: '0.05em' }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="section-label mb-6 text-[12px] font-semibold tracking-widest text-[#4F6EF7] uppercase"
          >
            LA SOLUCIÓN
          </motion.p>

          {/* Multi-line title with staggered animation */}
          <motion.div className="mb-6 h-auto">
            <motion.h2
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="text-[32px] sm:text-[40px] lg:text-[56px] font-black text-[#0A0A12] leading-[1.15] tracking-[-0.02em] mb-2"
            >
              Un empleado IA
            </motion.h2>
            <motion.h2
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="text-[32px] sm:text-[40px] lg:text-[56px] font-black leading-[1.15] tracking-[-0.02em] bg-gradient-to-r from-[#4F6EF7] via-[#7B68EE] to-[#00D084] bg-clip-text text-transparent"
            >
              trabajando para ti en 6 pasos
            </motion.h2>
          </motion.div>

          {/* Subtitle with fade and slide */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-[16px] sm:text-[18px] text-[#5A5A6A] leading-relaxed font-medium max-w-[600px] mx-auto"
          >
            <span className="font-bold text-[#0A0A12]">Desde el primer contacto hasta el cierre.</span> Tu agente IA captura, conversa, recuerda, automatiza y sigue hasta conseguir el resultado.
          </motion.p>
        </div>

        {/* Steps Grid with enhanced animations */}
        <motion.div
          ref={containerRef}
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-10"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
        >
          {steps.map((step, index) => (
            <StepCard
              key={step.number}
              step={step}
              index={index}
              onHover={setHoveredCard}
              isHovered={hoveredCard}
            />
          ))}
        </motion.div>

        {/* Process flow indicator */}
        <motion.div
          className="mt-16 flex justify-center items-center gap-3"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <div className="flex gap-2">
            {steps.map((_, index) => (
              <motion.div
                key={index}
                className="h-1.5 bg-[#E0E0E8] rounded-full"
                animate={{
                  width: hoveredCard === null ? 8 : hoveredCard === index ? 24 : 8,
                  background: hoveredCard === null || hoveredCard === index ? '#4F6EF7' : '#E0E0E8'
                }}
                transition={{ duration: 0.3 }}
              />
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
