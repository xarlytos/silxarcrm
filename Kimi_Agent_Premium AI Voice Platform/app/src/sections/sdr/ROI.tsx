import { useRef, useEffect } from 'react'
import { motion, useInView, useMotionValue, useTransform, animate } from 'framer-motion'

const easeOutExpo = [0.16, 1, 0.3, 1] as [number, number, number, number]

function Counter({ value, suffix = '', prefix = '' }: { value: number; suffix?: string; prefix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-50px' })
  const count = useMotionValue(0)

  useEffect(() => {
    if (isInView) {
      const controls = animate(count, value, { duration: 2, ease: easeOutExpo })
      return controls.stop
    }
  }, [isInView, value, count])

  const display = useTransform(count, (v) => {
    if (value >= 100) return Math.round(v).toString()
    return Math.round(v).toString()
  })

  return (
    <span ref={ref}>
      {prefix}
      <motion.span>{display}</motion.span>
      {suffix}
    </span>
  )
}

const stats = [
  { value: 100, suffix: '+', label: 'Llamadas por dia' },
  { value: 73, suffix: '%', label: 'Reduccion coste SDR' },
  { value: 340, suffix: '%', label: 'Incremento reuniones agendadas' },
  { value: 35, suffix: '%', label: 'Tasa de contacto', sub: '(vs 15% humana)' },
  { value: 200, suffix: '+', label: 'Leads cualificados/mes' },
  { value: 2, suffix: ' min', label: 'Tiempo de respuesta', prefix: '< ' },
]

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15 } },
}

const statVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.7, ease: easeOutExpo } },
}

export default function ROI() {
  return (
    <section id="roi" className="bg-bg-elevated" style={{ padding: '140px 0' }}>
      <div className="max-w-[1280px] mx-auto px-6 lg:px-12">
        {/* Section label */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5 }}
          className="section-label text-accent-cyan mb-4"
        >
          RESULTADOS
        </motion.p>

        {/* Headline */}
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.7, ease: easeOutExpo }}
          className="text-[28px] sm:text-[36px] lg:text-[48px] font-semibold leading-[1.1] tracking-[-0.02em] text-white mb-16 max-w-[600px]"
        >
          Lo que el SDR Agent aporta a tu negocio
        </motion.h2>

        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Stats Grid */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            className="grid grid-cols-2 gap-4"
          >
            {stats.map((stat, i) => (
              <motion.div
                key={i}
                variants={statVariants}
                className="bg-bg-card rounded-2xl p-6 border border-[rgba(255,255,255,0.06)]"
              >
                <p className="text-[36px] lg:text-[48px] font-bold text-accent-cyan mb-1">
                  {stat.prefix}
                  <Counter value={stat.value} suffix={stat.suffix} />
                </p>
                <p className="text-[14px] text-text-secondary">
                  {stat.label}
                </p>
                {stat.sub && (
                  <p className="text-[12px] text-text-muted mt-1">{stat.sub}</p>
                )}
              </motion.div>
            ))}
          </motion.div>

          {/* ROI Visual + Quote */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.8, ease: easeOutExpo }}
          >
            {/* Bar Chart */}
            <div className="bg-bg-card rounded-2xl p-8 border border-[rgba(255,255,255,0.06)] mb-6">
              <p className="text-[14px] text-text-secondary mb-6 text-center">Comparativa de coste mensual</p>
              <div className="flex items-end justify-center gap-16 h-[200px]">
                <div className="flex flex-col items-center">
                  <div className="text-[14px] font-medium text-error mb-2">2.500\u20AC+</div>
                  <motion.div
                    initial={{ height: 0 }}
                    whileInView={{ height: 160 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, ease: easeOutExpo, delay: 0.3 }}
                    className="w-20 rounded-t-xl bg-error/60"
                  />
                  <p className="text-[12px] text-text-muted mt-3">SDR Humano</p>
                </div>
                <div className="flex flex-col items-center">
                  <div className="text-[14px] font-medium text-success mb-2">299\u20AC</div>
                  <motion.div
                    initial={{ height: 0 }}
                    whileInView={{ height: 40 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, ease: easeOutExpo, delay: 0.5 }}
                    className="w-20 rounded-t-xl bg-success/60"
                  />
                  <p className="text-[12px] text-text-muted mt-3">SDR Agent</p>
                </div>
              </div>
              <p className="text-[16px] font-semibold text-white text-center mt-4">
                Ahorro mensual: <span className="text-success">1.800\u20AC+</span>
              </p>
            </div>

            {/* Case Study Quote */}
            <div className="border-l-[3px] border-accent-blue pl-6">
              <p className="text-[18px] leading-[1.6] text-text-secondary italic mb-3">
                "Pasamos de 12 reuniones agendadas por semana a 47. Nuestro equipo de ventas solo cierra ahora. El SDR Agent hace todo el trabajo sucio."
              </p>
              <p className="text-[14px] font-medium text-white">
                Ana Garcia, <span className="text-text-secondary">VP Sales @ DataPro</span>
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
