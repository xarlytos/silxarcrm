import { motion } from 'framer-motion'
import { Play, ArrowRight, Rocket } from 'lucide-react'

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.2,
    },
  },
}

const wordVariants = {
  hidden: { opacity: 0, y: 60 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.8,
      ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
    },
  },
}

const headlineWords = ['Tu', 'proximo', 'empleado', 'estrella', 'no', 'es', 'humano']

export default function Hero() {
  return (
    <section
      id="hero"
      className="relative min-h-[100dvh] flex items-center overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #06060A 0%, #0A0A18 50%, #06060A 100%)' }}
    >
      {/* Aurora Background */}
      <div className="absolute inset-0 z-0">
        <img
          src="/hero-aurora-bg.jpg"
          alt=""
          className="w-full h-full object-cover opacity-60"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 80% 50% at 30% 50%, rgba(79,110,247,0.15) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 70% 30%, rgba(123,97,255,0.1) 0%, transparent 50%)',
            animation: 'aurora-shift 8s ease-in-out infinite alternate',
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.4) 100%)',
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-[1280px] mx-auto px-6 lg:px-12 w-full py-32">
        <div className="grid lg:grid-cols-[55%_45%] gap-12 items-center">
          {/* Left: Text */}
          <div>
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8"
              style={{
                background: 'rgba(79,110,247,0.15)',
                border: '1px solid rgba(79,110,247,0.3)',
              }}
            >
              <Rocket className="w-4 h-4 text-[#4F6EF7]" />
              <span className="text-[13px] font-medium text-[#4F6EF7]">
                NUEVO — Ahora con memoria persistente y WhatsApp
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="text-[40px] sm:text-[56px] lg:text-[72px] xl:text-[80px] font-bold leading-[1.0] tracking-[-0.03em] mb-6"
            >
              {headlineWords.map((word, i) => (
                <motion.span
                  key={i}
                  variants={wordVariants}
                  className={`inline-block mr-[0.25em] ${
                    word === 'estrella' ? 'gradient-text' : 'text-white'
                  }`}
                >
                  {word === 'proximo' ? 'pr\u00f3ximo' : word}
                </motion.span>
              ))}
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="text-[18px] text-[#8A8A9A] leading-relaxed max-w-[520px] mb-10"
            >
              Contrata agentes de voz IA especializados que trabajan 24/7, nunca olvidan un
              seguimiento y escalan tu negocio mientras duermes. Desde prospecci&oacute;n hasta
              cierre de ventas.
            </motion.p>

            {/* CTA Group */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-wrap items-center gap-4 mb-12"
            >
              <button className="btn-primary glow-pulse">
                Comenzar Prueba Gratuita
                <ArrowRight className="w-4 h-4" />
              </button>
              <button className="btn-secondary">
                <Play className="w-4 h-4" />
                Ver Demo en Vivo
              </button>
            </motion.div>

            <motion.a
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 1.0 }}
              href="#"
              className="inline-flex items-center gap-2 text-[15px] font-medium text-[#4F6EF7] hover:text-[#7B61FF] transition-colors mb-12"
            >
              Hablar con un experto
              <ArrowRight className="w-4 h-4" />
            </motion.a>

            {/* Trust Bar */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 1.2 }}
            >
              <p className="text-[13px] text-[#5A5A6A] mb-3">
                Conf&iacute;an en nosotros equipos de:
              </p>
              <div className="flex items-center gap-6 flex-wrap">
                {['TechFlow', 'NovaCRM', 'MedSalus', 'BuildCorp', 'DataLabs'].map((name) => (
                  <span
                    key={name}
                    className="text-[14px] font-semibold text-[#5A5A6A] opacity-50 hover:opacity-80 transition-opacity cursor-default"
                  >
                    {name}
                  </span>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Right: Dashboard Mockup */}
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 1, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="hidden lg:block relative"
          >
            <div
              className="relative floating"
              style={{
                transform: 'perspective(1200px) rotateY(-5deg) rotateX(2deg)',
                transformStyle: 'preserve-3d',
              }}
            >
              <img
                src="/hero-dashboard-mockup.png"
                alt="VoiceAgent OS Dashboard"
                className="w-full rounded-2xl shadow-glow-lg"
              />
              <div
                className="absolute inset-0 rounded-2xl"
                style={{
                  boxShadow: '0 0 60px rgba(79,110,247,0.2), 0 20px 60px rgba(0,0,0,0.5)',
                }}
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
