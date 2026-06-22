import { useEffect, useRef } from 'react'
import { motion, useInView, useMotionValue, useTransform, animate } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Play, ArrowRight } from 'lucide-react'

const easeOutExpo = [0.16, 1, 0.3, 1] as [number, number, number, number]

function AnimatedCounter({ value, suffix = '' }: { value: number; suffix?: string }) {
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
      <motion.span>{display}</motion.span>
      {suffix}
    </span>
  )
}

const stats = [
  { value: 100, suffix: '+', label: 'llamadas por dia' },
  { value: 24, suffix: '/7', label: 'disponibilidad' },
  { value: 2, suffix: 'min', label: 'tiempo de respuesta', prefix: '< ' },
]

export default function Hero() {
  return (
    <section className="relative min-h-[100dvh] flex items-center overflow-hidden bg-bg-primary">
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center z-0"
        style={{ backgroundImage: 'url(/sdr-hero-bg.jpg)' }}
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
                <span className="text-white">SDR Agent</span>
              </p>
            </motion.div>

            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="mb-6"
            >
              <span className="inline-block px-4 py-1.5 rounded-full text-[12px] font-medium tracking-wider uppercase bg-[rgba(79,110,247,0.15)] text-accent-blue">
                AGENTE DE PROSPECCION
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: easeOutExpo }}
              className="text-[40px] sm:text-[56px] lg:text-[72px] xl:text-[80px] font-bold leading-[1] tracking-[-0.03em] text-white mb-6"
            >
              Tu equipo de prospeccion que{' '}
              <span className="gradient-text">nunca se rinde</span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="text-[18px] leading-[1.6] text-text-secondary max-w-[520px] mb-8"
            >
              El SDR Agent realiza cold calls con voz natural, cualifica leads en tiempo real y agenda reuniones directamente en tu calendario. Trabaja 24/7. Nunca olvida un seguimiento. Necesita 0 descansos.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.7 }}
              className="flex flex-wrap items-center gap-4 mb-12"
            >
              <button className="btn-primary">
                Probar SDR Agent Gratis
              </button>
              <button className="btn-secondary">
                <Play className="w-4 h-4" />
                Ver Demo en Vivo
              </button>
              <Link to="#roi" className="inline-flex items-center gap-1 text-accent-blue font-medium text-[15px] hover:gap-2 transition-all">
                Calcular tu ROI <ArrowRight className="w-4 h-4" />
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

          {/* Right column - Dashboard mockup placeholder */}
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 1, delay: 0.5, ease: easeOutExpo }}
            className="hidden lg:flex items-center justify-center"
          >
            <div className="relative w-full max-w-[500px] aspect-[4/3] rounded-2xl overflow-hidden border border-[rgba(255,255,255,0.08)] shadow-glow-lg floating">
              <div className="absolute inset-0 bg-gradient-to-br from-bg-card to-bg-elevated" />
              <div className="absolute inset-0 flex flex-col p-6">
                {/* Mock dashboard header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-error" />
                    <div className="w-3 h-3 rounded-full bg-warning" />
                    <div className="w-3 h-3 rounded-full bg-success" />
                  </div>
                  <span className="text-[11px] text-text-muted font-mono">SDR Agent Dashboard</span>
                </div>
                {/* Mock stats row */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[
                    { label: 'Llamadas hoy', value: '87' },
                    { label: 'Tasa contacto', value: '34%' },
                    { label: 'Reuniones', value: '12' },
                  ].map((s, i) => (
                    <div key={i} className="bg-bg-elevated rounded-xl p-3 border border-[rgba(255,255,255,0.06)]">
                      <p className="text-[10px] text-text-muted mb-1">{s.label}</p>
                      <p className="text-[18px] font-bold text-white">{s.value}</p>
                    </div>
                  ))}
                </div>
                {/* Mock lead list */}
                <div className="flex-1 bg-bg-elevated rounded-xl p-4 border border-[rgba(255,255,255,0.06)]">
                  <p className="text-[10px] text-text-muted mb-3 font-mono uppercase tracking-wider">Prospectos Activos</p>
                  {[
                    { name: 'Carlos Martinez', status: 'Calificado', color: 'text-success' },
                    { name: 'Laura Sanchez', status: 'Llamando...', color: 'text-accent-cyan' },
                    { name: 'Miguel Torres', status: 'Pendiente', color: 'text-warning' },
                  ].map((lead, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-[rgba(255,255,255,0.04)] last:border-0">
                      <span className="text-[12px] text-white">{lead.name}</span>
                      <span className={`text-[10px] ${lead.color}`}>{lead.status}</span>
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
