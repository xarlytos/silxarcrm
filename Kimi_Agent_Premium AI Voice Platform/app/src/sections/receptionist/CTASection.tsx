import { motion } from 'framer-motion'
import { Play, ArrowRight, Check } from 'lucide-react'

export default function CTASection() {
  return (
    <section
      id="cta"
      className="relative py-[100px] lg:py-[120px] overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #4F6EF7 0%, #7B61FF 100%)',
      }}
    >
      {/* Animated gradient overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 60% 60% at 50% 50%, rgba(255,255,255,0.1) 0%, transparent 70%)',
          animation: 'aurora-shift 8s ease-in-out infinite alternate',
        }}
      />

      <div className="relative z-10 max-w-[800px] mx-auto px-6 lg:px-12 text-center">
        {/* Headline */}
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
          className="text-[36px] sm:text-[48px] lg:text-[56px] font-bold text-white leading-[1.05] tracking-[-0.025em] mb-6"
        >
          Ninguna llamada volverá a ser perdida
        </motion.h2>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
          className="text-[18px] leading-relaxed mb-10"
          style={{ color: 'rgba(255,255,255,0.85)' }}
        >
          Tu Receptionist Agent estará atendiendo llamadas en menos de 24 horas. 14 días de
          prueba gratuita. Sin tarjeta de crédito.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
          className="flex flex-wrap items-center justify-center gap-4 mb-10"
        >
          <button
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-semibold text-[15px] transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: '#FFFFFF',
              color: '#4F6EF7',
              boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
            }}
          >
            Probar Receptionist Agent Gratis
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-medium text-[15px] transition-all duration-200 border hover:bg-[rgba(255,255,255,0.1)]"
            style={{
              background: 'transparent',
              color: '#FFFFFF',
              borderColor: 'rgba(255,255,255,0.4)',
            }}
          >
            <Play className="w-4 h-4" />
            Escuchar Voz del Agente
          </button>
        </motion.div>

        {/* Guarantee */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="flex flex-wrap items-center justify-center gap-6"
        >
          {[
            '14 días gratis',
            'Número de teléfono incluido',
            'Sin permanencia',
          ].map((item) => (
            <span key={item} className="inline-flex items-center gap-2 text-[14px]" style={{ color: 'rgba(255,255,255,0.8)' }}>
              <Check className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.9)' }} />
              {item}
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
