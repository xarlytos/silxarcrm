import { useRef, useEffect, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import { ArrowRight } from 'lucide-react'

interface StatProps {
  number: string
  suffix: string
  label: string
  delay: number
}

function AnimatedStat({ number, suffix, label, delay }: StatProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })
  const [displayValue, setDisplayValue] = useState('0')

  useEffect(() => {
    if (!isInView) return

    const numericValue = parseFloat(number)
    const isDecimal = number.includes('.')
    const duration = 2000
    const startTime = performance.now()

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(2, -10 * progress)
      const current = numericValue * eased

      if (isDecimal) {
        setDisplayValue(current.toFixed(1))
      } else {
        setDisplayValue(Math.round(current).toString())
      }

      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        setDisplayValue(number)
      }
    }

    const timer = setTimeout(() => {
      requestAnimationFrame(animate)
    }, delay)

    return () => clearTimeout(timer)
  }, [isInView, number, delay])

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: delay / 1000 }}
      className="mb-8"
    >
      <div className="text-[36px] lg:text-[48px] font-bold text-[#0A0A12] tabular-nums">
        {displayValue}
        <span className="text-[24px]">{suffix}</span>
      </div>
      <p className="text-[15px] text-[#5A5A6A] mt-1">{label}</p>
    </motion.div>
  )
}

export default function ROI() {
  return (
    <section id="pricing" className="py-[100px] lg:py-[140px] bg-[#F8F8FB]">
      <div className="max-w-[1280px] mx-auto px-6 lg:px-12">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left: Text + Stats */}
          <div>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="section-label mb-4"
            >
              RETORNO DE INVERSI&Oacute;N
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
              className="text-[28px] sm:text-[36px] lg:text-[48px] font-semibold text-[#0A0A12] leading-[1.1] tracking-[-0.02em] mb-10"
            >
              Los n&uacute;meros no mienten
            </motion.h2>

            <div className="grid sm:grid-cols-2 gap-x-8">
              <AnimatedStat number="73" suffix="%" label="reduccion en costes de ventas" delay={0} />
              <AnimatedStat number="5" suffix="x" label="mas leads contactados por dia" delay={200} />
              <AnimatedStat number="340" suffix="%" label="incremento en tasa de seguimiento" delay={400} />
              <AnimatedStat number="2.4" suffix="M\u20ac" label="ingresos recuperados por clientes (2024)" delay={600} />
            </div>

            {/* Case Study */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="mt-6 p-5 bg-white rounded-xl border border-[rgba(0,0,0,0.08)]"
            >
              <p className="text-[15px] text-[#5A5A6A] italic leading-relaxed mb-3">
                &ldquo;Empresa de software B2B redujo su coste de adquisicion un 64% y triplico sus
                reuniones agendadas en 90 dias.&rdquo;
              </p>
              <a
                href="#"
                className="inline-flex items-center gap-2 text-[14px] font-medium text-[#4F6EF7] hover:text-[#7B61FF] transition-colors"
              >
                Ver todos los casos de exito
                <ArrowRight className="w-4 h-4" />
              </a>
            </motion.div>
          </div>

          {/* Right: Chart */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <img
              src="/roi-chart.png"
              alt="Comparacion de costes: Equipo Humano vs VoiceAgent OS"
              className="w-full rounded-2xl shadow-lg"
            />
          </motion.div>
        </div>
      </div>
    </section>
  )
}
