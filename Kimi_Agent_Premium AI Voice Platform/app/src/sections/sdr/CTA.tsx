import { motion } from 'framer-motion'

const easeOutExpo = [0.16, 1, 0.3, 1] as [number, number, number, number]

export default function CTA() {
  return (
    <section className="relative overflow-hidden" style={{ padding: '120px 0', background: 'linear-gradient(135deg, #4F6EF7 0%, #7B61FF 100%)' }}>
      {/* Animated background */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-white rounded-full blur-[128px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent-cyan rounded-full blur-[128px] animate-pulse" style={{ animationDelay: '1.5s' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.8, ease: easeOutExpo }}
        className="relative z-10 max-w-[800px] mx-auto px-6 lg:px-12 text-center"
      >
        <h2 className="text-[36px] sm:text-[48px] lg:text-[64px] font-bold leading-[1.05] tracking-[-0.025em] text-white mb-6">
          Tu SDR IA esta listo para empezar
        </h2>

        <p className="text-[18px] leading-[1.6] text-[rgba(255,255,255,0.85)] mb-10 max-w-[600px] mx-auto">
          Configura tu SDR Agent en menos de 24 horas. 14 dias de prueba gratuita. Sin tarjeta de credito.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
          <button className="inline-flex items-center gap-2 bg-white text-accent-blue font-semibold text-[15px] px-8 py-3.5 rounded-full hover:bg-[rgba(255,255,255,0.9)] hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg">
            Probar SDR Agent Gratis
          </button>
          <button className="inline-flex items-center gap-2 bg-transparent text-white font-medium text-[15px] px-8 py-3.5 rounded-full border border-[rgba(255,255,255,0.4)] hover:bg-[rgba(255,255,255,0.1)] hover:border-[rgba(255,255,255,0.6)] transition-all">
            Agendar Demo
          </button>
        </div>

        <p className="text-[14px] text-[rgba(255,255,255,0.7)]">
          <span className="mr-2">&#10003; 14 dias gratis</span>
          <span className="mx-2">&#8226;</span>
          <span className="mx-2">&#10003; Sin permanencia</span>
          <span className="mx-2">&#8226;</span>
          <span className="ml-2">&#10003; Soporte incluido</span>
        </p>
      </motion.div>
    </section>
  )
}
