import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'

const easeOutExpo = [0.16, 1, 0.3, 1] as [number, number, number, number]

export default function CTA() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-15%' })

  return (
    <section className="relative py-[100px] lg:py-[120px] overflow-hidden">
      {/* Gradient Background */}
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(135deg, #4F6EF7 0%, #7B61FF 100%)' }}
      />
      {/* Animated glow */}
      <motion.div
        animate={{ opacity: [0.3, 0.5, 0.3], scale: [1, 1.1, 1] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[rgba(255,255,255,0.1)] blur-[100px]"
      />

      <div className="relative z-10 max-w-[800px] mx-auto px-6 lg:px-12 text-center" ref={ref}>
        <motion.h2
          initial={{ opacity: 0, y: 40 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: easeOutExpo }}
          className="text-[40px] sm:text-[56px] lg:text-[64px] font-bold leading-[1.05] tracking-[-0.025em] text-white mb-6"
        >
          Tu agenda nunca volvera a tener huecos
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.15, ease: easeOutExpo }}
          className="text-[18px] leading-[1.6] text-[rgba(255,255,255,0.85)] mb-10"
        >
          Reduce tus ausencias a la mitad en 30 dias. 14 dias de prueba gratuita. Sin tarjeta de credito.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.3, ease: easeOutExpo }}
          className="flex flex-wrap items-center justify-center gap-4 mb-8"
        >
          <button className="bg-white text-[#4F6EF7] font-semibold text-[15px] px-8 py-3.5 rounded-full hover:bg-[rgba(255,255,255,0.9)] hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg">
            Probar Appointment Agent Gratis
          </button>
          <button className="bg-transparent text-white font-medium text-[15px] px-8 py-3.5 rounded-full border border-[rgba(255,255,255,0.4)] hover:bg-[rgba(255,255,255,0.1)] hover:border-[rgba(255,255,255,0.6)] transition-all">
            Ver Demo de Agenda
          </button>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="text-[14px] text-[rgba(255,255,255,0.7)]"
        >
          14 dias gratis &bull; Configuracion incluida &bull; Sin permanencia
        </motion.p>
      </div>
    </section>
  )
}
