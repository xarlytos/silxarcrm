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
    if (value < 10) return v.toFixed(1)
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
  { value: 300, suffix: '%', label: 'Incremento en conversion', prefix: '+' },
  { value: 68, suffix: '%', label: 'Reduccion en coste de cierre' },
  { value: 45, suffix: '%', label: 'Tiempo medio de cierre', prefix: '-' },
  { value: 100, suffix: '%', label: 'Tasa de seguimiento post-demo' },
  { value: 4.7, suffix: '/5', label: 'Satisfaccion del prospecto' },
  { value: 999, suffix: '+', label: 'Deals cerrados simultaneos' },
]

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15 } },
}

const statVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.7, ease: easeOutExpo } },
}

export default function Results() {
  return (
    <section id="resultados" className="bg-bg-elevated" style={{ padding: '140px 0' }}>
      <div className="max-w-[1280px] mx-auto px-6 lg:px-12">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.7, ease: easeOutExpo }}
          className="text-[28px] sm:text-[36px] lg:text-[48px] font-semibold leading-[1.1] tracking-[-0.02em] text-white mb-16 max-w-[600px]"
        >
          Resultados que hablan por si solos
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
                <p className="text-[14px] text-text-secondary">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* Testimonial */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.8, ease: easeOutExpo, delay: 0.4 }}
            className="border-l-[3px] border-success pl-8"
          >
            <p className="text-[22px] lg:text-[26px] leading-[1.5] text-white italic mb-6">
              "Nuestro Closer Agent cierra el 34% de las demos. Nuestro closer humano cerraba el 22%. Y el agente nunca pide comision, nunca se va de vacaciones y nunca tiene un mal dia."
            </p>
            <p className="text-[16px] font-medium text-white">
              Pedro Lopez, <span className="text-text-secondary">CEO @ CloudTech</span>
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
