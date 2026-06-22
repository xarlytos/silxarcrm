import { useRef, useEffect } from 'react'
import { motion, useInView, useMotionValue, useTransform, animate } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Play, ArrowRight } from 'lucide-react'

const easeOutExpo = [0.16, 1, 0.3, 1] as [number, number, number, number]

function AnimatedCounter({ value, suffix = '', prefix = '' }: { value: number; suffix?: string; prefix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true })
  const count = useMotionValue(0)

  useEffect(() => {
    if (isInView) {
      const controls = animate(count, value, { duration: 2, ease: easeOutExpo })
      return controls.stop
    }
  }, [isInView, value, count])

  const display = useTransform(count, (v) => Math.round(v).toString())

  return (
    <span ref={ref}>
      {prefix}
      <motion.span>{display}</motion.span>
      {suffix}
    </span>
  )
}

const stats = [
  { value: 300, suffix: '%+', label: 'incremento en conversion', prefix: '' },
  { value: 45, suffix: '+', label: 'objeciones manejadas', prefix: '' },
  { value: 0, suffix: '\u20AC', label: 'comisiones', prefix: '' },
]

export default function Hero() {
  return (
    <section className="relative min-h-[100dvh] flex items-center overflow-hidden bg-bg-primary">
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center z-0"
        style={{ backgroundImage: 'url(/closer-hero-bg.jpg)' }}
      />
      <div className="absolute inset-0 bg-[rgba(6,6,10,0.7)] z-[1]" />
      <div className="aurora-bg absolute inset-0 z-[2]" />
      <div className="absolute inset-0 z-[3] vignette" />

      {/* Content */}
      <div className="relative z-10 max-w-[1280px] mx-auto px-6 lg:px-12 py-20 w-full">
        <div className="grid lg:grid-cols-[55%_45%] gap-12 items-center">
          {/* Left column */}
          <div>
            {/* Breadcrumb */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="mb-6"
            >
              <p className="text-[13px] text-text-muted">
                <Link to="/" className="hover:text-white transition-colors">VoiceAgent OS</Link>
                {' / '}
                <span className="text-text-muted">Agentes</span>
                {' / '}
                <span className="text-white">Closer Agent</span>
              </p>
            </motion.div>

            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="mb-6"
            >
              <span className="inline-block px-4 py-1.5 rounded-full text-[12px] font-medium tracking-wider uppercase bg-[rgba(16,185,129,0.15)] text-success">
                AGENTE DE CIERRE
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: easeOutExpo }}
              className="text-[40px] sm:text-[56px] lg:text-[72px] xl:text-[80px] font-bold leading-[1] tracking-[-0.03em] text-white mb-6"
            >
              El agente que convierte reuniones en{' '}
              <span className="gradient-text">ingresos</span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="text-[18px] leading-[1.6] text-text-secondary max-w-[520px] mb-8"
            >
              El Closer Agent realiza demos producto, maneja objeciones como un profesional, negocia terminos y cierra ventas. Cada reunion que agendaste ahora se convierte en cliente.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.7 }}
              className="flex flex-wrap items-center gap-4 mb-12"
            >
              <button className="btn-primary">
                Probar Closer Agent Gratis
              </button>
              <button className="btn-secondary">
                <Play className="w-4 h-4" />
                Ver Demo de Cierre
              </button>
              <Link to="#resultados" className="inline-flex items-center gap-1 text-accent-blue font-medium text-[15px] hover:gap-2 transition-all">
                Ver casos de exito <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>

            {/* Quick Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.9 }}
              className="flex flex-wrap gap-8"
            >
              {stats.map((stat, i) => (
                <div key={i} className="flex flex-col">
                  <span className="text-[24px] font-bold text-accent-cyan">
                    {stat.prefix}
                    <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                  </span>
                  <span className="text-[13px] text-text-muted">{stat.label}</span>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right column - Dashboard mockup */}
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 1, delay: 0.5, ease: easeOutExpo }}
            className="hidden lg:flex items-center justify-center"
          >
            <div className="relative w-full max-w-[500px] aspect-[4/3] rounded-2xl overflow-hidden border border-[rgba(255,255,255,0.08)] shadow-glow-lg floating">
              <div className="absolute inset-0 bg-gradient-to-br from-bg-card to-bg-elevated" />
              <div className="absolute inset-0 flex flex-col p-6">
                {/* Mock header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-error" />
                    <div className="w-3 h-3 rounded-full bg-warning" />
                    <div className="w-3 h-3 rounded-full bg-success" />
                  </div>
                  <span className="text-[11px] text-text-muted font-mono">Closer Agent Dashboard</span>
                </div>
                {/* Mock stats */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[
                    { label: 'Tasa cierre', value: '34%' },
                    { label: 'Demos hoy', value: '8' },
                    { label: 'Ingresos', value: '12.4k' },
                  ].map((s, i) => (
                    <div key={i} className="bg-bg-elevated rounded-xl p-3 border border-[rgba(255,255,255,0.06)]">
                      <p className="text-[10px] text-text-muted mb-1">{s.label}</p>
                      <p className="text-[18px] font-bold text-white">{s.value}</p>
                    </div>
                  ))}
                </div>
                {/* Mock deal pipeline */}
                <div className="flex-1 bg-bg-elevated rounded-xl p-4 border border-[rgba(255,255,255,0.06)]">
                  <p className="text-[10px] text-text-muted mb-3 font-mono uppercase tracking-wider">Pipeline de Cierre</p>
                  {[
                    { name: 'TechSolutions SL', stage: 'Negociacion', color: 'text-warning' },
                    { name: 'Global Media Inc', stage: 'Cerrado', color: 'text-success' },
                    { name: ' InnovaTeam', stage: 'Demo completada', color: 'text-accent-cyan' },
                  ].map((deal, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-[rgba(255,255,255,0.04)] last:border-0">
                      <span className="text-[12px] text-white">{deal.name}</span>
                      <span className={`text-[10px] ${deal.color}`}>{deal.stage}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
