import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, TrendingUp, Phone, MessageSquare } from 'lucide-react'

const easeOutExpo = [0.16, 1, 0.3, 1] as [number, number, number, number]

export default function Hero() {
  const auroraRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Subtle parallax on scroll
    const handleScroll = () => {
      if (auroraRef.current) {
        auroraRef.current.style.transform = `translateY(${window.scrollY * 0.3}px)`
      }
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <section className="relative min-h-[100dvh] flex items-center overflow-hidden bg-[#06060A]">
      {/* Background Image with Aurora */}
      <div ref={auroraRef} className="absolute inset-0 pointer-events-none">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-60"
          style={{ backgroundImage: 'url(/followup-hero-bg.jpg)' }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#06060A] via-transparent to-[#06060A] opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#06060A] via-transparent to-[#06060A] opacity-60" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-[1280px] mx-auto px-6 lg:px-12 py-24 w-full">
        <div className="grid lg:grid-cols-[55%_45%] gap-12 items-center">
          {/* Left Column - Text */}
          <div className="flex flex-col gap-8">
            {/* Breadcrumb */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-[13px] text-[#5A5A6A]"
            >
              VoiceAgent OS / Agentes / Follow-Up Agent
            </motion.p>

            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2, ease: easeOutExpo }}
            >
              <span className="inline-flex items-center px-4 py-1.5 rounded-full text-[12px] font-medium tracking-wider uppercase bg-[rgba(245,158,11,0.15)] text-[#F59E0B]">
                AGENTE DE RECUPERACION
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3, ease: easeOutExpo }}
              className="text-[40px] sm:text-[56px] lg:text-[72px] xl:text-[80px] font-bold leading-[1.0] tracking-[-0.03em] text-white"
            >
              El{' '}
              <span className="text-[#F59E0B]">80%</span>{' '}
              de las ventas se pierden por falta de seguimiento
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6, ease: easeOutExpo }}
              className="text-[18px] leading-[1.6] text-[#8A8A9A] max-w-[520px]"
            >
              El Follow-Up Agent recupera oportunidades que tu equipo olvido. Recontacta leads por telefono, email y WhatsApp en el momento exacto. Persistente pero nunca molesto.
            </motion.p>

            {/* CTA Group */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.8, ease: easeOutExpo }}
              className="flex flex-wrap items-center gap-4"
            >
              <button className="btn-primary">
                Probar Follow-Up Agent Gratis
              </button>
              <button className="btn-secondary">
                Ver Como Recupera Leads
              </button>
            </motion.div>

            {/* Tertiary CTA */}
            <motion.a
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 1.0 }}
              href="#"
              className="inline-flex items-center gap-2 text-[15px] font-medium text-[#4F6EF7] hover:text-[#7B61FF] transition-colors group"
            >
              Calcular oportunidades perdidas
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </motion.a>

            {/* Quick Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1.0, ease: easeOutExpo }}
              className="flex flex-wrap gap-8 pt-4"
            >
              <div>
                <div className="text-[28px] font-bold text-[#F59E0B]">40%+</div>
                <div className="text-[14px] text-[#8A8A9A]">oportunidades recuperadas</div>
              </div>
              <div>
                <div className="text-[28px] font-bold text-[#22D3EE]">12</div>
                <div className="text-[14px] text-[#8A8A9A]">intentos de contacto max</div>
              </div>
              <div>
                <div className="text-[28px] font-bold text-[#4F6EF7]">3x</div>
                <div className="text-[14px] text-[#8A8A9A]">canales de seguimiento</div>
              </div>
            </motion.div>
          </div>

          {/* Right Column - Visual */}
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 1, delay: 0.5, ease: easeOutExpo }}
            className="hidden lg:flex flex-col items-center justify-center"
          >
            {/* Recovery Visual */}
            <div className="relative w-full max-w-[480px]">
              {/* Floating recovery cards */}
              <div className="relative h-[400px]">
                {/* Center glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full bg-[rgba(245,158,11,0.2)] blur-[60px]" />

                {/* Recovered card */}
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute top-4 left-4 right-4 glass-card !border-l-4 !border-l-[#F59E0B]"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-[rgba(245,158,11,0.15)] flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-[#F59E0B]" />
                    </div>
                    <div>
                      <p className="text-[14px] font-medium text-white">Oportunidad Recuperada</p>
                      <p className="text-[12px] text-[#5A5A6A]">Lead recontactado tras 5 dias</p>
                    </div>
                  </div>
                  <p className="text-[22px] font-bold text-[#F59E0B]">+12.500 EUR</p>
                </motion.div>

                {/* Phone call card */}
                <motion.div
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                  className="absolute top-[180px] left-0 w-[55%] glass-card"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[rgba(79,110,247,0.15)] flex items-center justify-center">
                      <Phone className="w-5 h-5 text-[#4F6EF7]" />
                    </div>
                    <div>
                      <p className="text-[13px] font-medium text-white">Llamada completada</p>
                      <p className="text-[11px] text-[#5A5A6A]">Intento #3 - Lead respondio</p>
                    </div>
                  </div>
                </motion.div>

                {/* WhatsApp card */}
                <motion.div
                  animate={{ y: [0, -7, 0] }}
                  transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                  className="absolute top-[180px] right-0 w-[55%] glass-card"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[rgba(34,211,238,0.15)] flex items-center justify-center">
                      <MessageSquare className="w-5 h-5 text-[#22D3EE]" />
                    </div>
                    <div>
                      <p className="text-[13px] font-medium text-white">WhatsApp enviado</p>
                      <p className="text-[11px] text-[#5A5A6A]">Tasa de apertura: 87%</p>
                    </div>
                  </div>
                </motion.div>

                {/* Bottom stat card */}
                <motion.div
                  animate={{ y: [0, -5, 0] }}
                  transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
                  className="absolute bottom-4 left-8 right-8 glass-card text-center"
                >
                  <p className="text-[12px] text-[#8A8A9A] uppercase tracking-wider">Leads recuperados este mes</p>
                  <p className="text-[36px] font-bold gradient-text mt-1">47</p>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#06060A] to-transparent z-10" />
    </section>
  )
}
