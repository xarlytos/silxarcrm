import { motion } from 'framer-motion'
import { ArrowRight, Calendar } from 'lucide-react'

export default function FinalCTA() {
  return (
    <section className="relative py-[100px] lg:py-[120px] overflow-hidden">
      {/* Gradient Background */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(135deg, #4F6EF7 0%, #7B61FF 100%)',
          animation: 'aurora-shift 10s ease-in-out infinite alternate',
        }}
      />
      {/* Subtle pattern overlay */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            'radial-gradient(circle at 25% 25%, white 1px, transparent 1px), radial-gradient(circle at 75% 75%, white 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      <div className="relative z-10 max-w-[800px] mx-auto px-6 lg:px-12 text-center">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
          className="text-[36px] sm:text-[48px] lg:text-[64px] font-bold text-white leading-[1.05] tracking-[-0.025em] mb-6"
        >
          Deja de perder oportunidades. Empieza hoy.
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-[18px] text-[rgba(255,255,255,0.85)] leading-relaxed max-w-[560px] mx-auto mb-10"
        >
          Tu primer agente IA estara trabajando en menos de 24 horas. Prueba gratuita de 14 dias.
          Sin tarjeta de credito. Sin compromiso.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex flex-wrap items-center justify-center gap-4 mb-8"
        >
          <button className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-white text-[#4F6EF7] font-semibold text-[15px] hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200">
            Comenzar Prueba Gratuita
            <ArrowRight className="w-4 h-4" />
          </button>
          <button className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-transparent text-white font-semibold text-[15px] border border-[rgba(255,255,255,0.4)] hover:bg-[rgba(255,255,255,0.1)] transition-all duration-200">
            <Calendar className="w-4 h-4" />
            Agendar Demo Personalizada
          </button>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="text-[14px] text-[rgba(255,255,255,0.7)]"
        >
          <span className="inline-flex items-center gap-4 flex-wrap justify-center">
            <span>14 dias gratis</span>
            <span className="w-1 h-1 rounded-full bg-[rgba(255,255,255,0.5)]" />
            <span>Sin tarjeta</span>
            <span className="w-1 h-1 rounded-full bg-[rgba(255,255,255,0.5)]" />
            <span>Cancela cuando quieras</span>
          </span>
        </motion.p>
      </div>
    </section>
  )
}
