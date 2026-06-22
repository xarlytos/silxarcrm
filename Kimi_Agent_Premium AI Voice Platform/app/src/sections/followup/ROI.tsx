import { useRef, useEffect, useState } from 'react'
import { motion, useInView } from 'framer-motion'

const easeOutExpo = [0.16, 1, 0.3, 1] as [number, number, number, number]

interface CounterProps {
  end: string
  duration?: number
  delay?: number
  inView: boolean
}

function Counter({ end, duration = 2000, delay = 0, inView }: CounterProps) {
  const [display, setDisplay] = useState('0')

  useEffect(() => {
    if (!inView) return

    const numericMatch = end.match(/[\d,.]+/)
    if (!numericMatch) {
      setDisplay(end)
      return
    }

    const numericStr = numericMatch[0].replace(/,/g, '.')
    const target = parseFloat(numericStr)
    const prefix = end.slice(0, end.indexOf(numericMatch[0]))
    const suffix = end.slice(end.indexOf(numericMatch[0]) + numericMatch[0].length)

    const startTime = performance.now() + delay
    const decimals = numericStr.includes('.') ? numericStr.split('.')[1].length : 0

    let rafId: number
    const animate = (now: number) => {
      if (now < startTime) {
        rafId = requestAnimationFrame(animate)
        return
      }
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      // Ease out expo
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress)
      const current = target * eased
      setDisplay(prefix + current.toFixed(decimals).replace('.', ',') + suffix)
      if (progress < 1) {
        rafId = requestAnimationFrame(animate)
      }
    }

    rafId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafId)
  }, [inView, end, duration, delay])

  return <span>{display}</span>
}

const stats = [
  { value: '40%', label: 'Oportunidades recuperadas', prefix: '+' },
  { value: '1.000+', label: 'Leads recontactados/mes' },
  { value: '35%', label: 'Tasa de respuesta' },
  { value: '180.000 EUR', label: 'Revenue recuperado (media/cliente ano)', isMoney: true },
  { value: '85%', label: 'Reduccion en leads perdidos', prefix: '' },
  { value: '12 EUR', label: 'Coste por lead recuperado', isMoney: true },
]

export default function ROI() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-15%' })

  return (
    <section className="py-[100px] lg:py-[140px] bg-[#0C0C14]">
      <div className="max-w-[1280px] mx-auto px-6 lg:px-12" ref={ref}>
        {/* Headline */}
        <motion.h2
          initial={{ opacity: 0, y: 40 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: easeOutExpo }}
          className="text-[36px] sm:text-[48px] font-semibold leading-[1.1] tracking-[-0.02em] text-white mb-16"
        >
          Dinero que ya tenias y no sabias
        </motion.h2>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: i * 0.15, ease: easeOutExpo }}
              className="bg-[#11111A] border border-[rgba(255,255,255,0.06)] rounded-2xl p-6 lg:p-8"
            >
              <div className="text-[36px] lg:text-[48px] font-bold text-[#22D3EE]">
                {stat.prefix}
                <Counter end={stat.value} delay={i * 150} inView={inView} />
              </div>
              <p className="text-[14px] text-[#8A8A9A] mt-2">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Recovery Visualization */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.5, ease: easeOutExpo }}
          className="flex flex-col lg:flex-row items-center gap-8 bg-[#11111A] border border-[rgba(255,255,255,0.06)] rounded-2xl p-8 lg:p-12"
        >
          {/* Left: Lost to Recovered visual */}
          <div className="flex-1 flex items-center justify-center gap-4">
            <div className="text-center">
              <div className="w-32 h-32 rounded-2xl bg-[#0C0C14] border border-[rgba(239,68,68,0.3)] flex items-center justify-center mb-3">
                <div>
                  <p className="text-[28px] font-bold text-[#EF4444]">1.000</p>
                  <p className="text-[11px] text-[#5A5A6A]">Leads perdidos</p>
                </div>
              </div>
            </div>
            <motion.div
              animate={{ x: [0, 8, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="text-[24px] font-bold text-[#F59E0B]"
            >
              &rarr;
            </motion.div>
            <div className="text-center">
              <div className="w-32 h-32 rounded-2xl bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.4)] flex items-center justify-center mb-3 shadow-[0_0_30px_rgba(16,185,129,0.15)]">
                <div>
                  <p className="text-[28px] font-bold text-[#10B981]">+400</p>
                  <p className="text-[11px] text-[#5A5A6A]">Recuperados</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Testimonial */}
          <div className="flex-1 border-l-0 lg:border-l-[3px] border-t-[3px] lg:border-t-0 border-[#F59E0B] pt-6 lg:pt-0 lg:pl-8">
            <p className="text-[18px] leading-[1.6] text-white italic mb-4">
              "En el primer mes, el Follow-Up Agent recupero 23 oportunidades que habiamos archivado. Seis de ellas se convirtieron en clientes. ROI del 2.400% en 30 dias."
            </p>
            <p className="text-[14px] font-semibold text-[#8A8A9A]">
              Sandra Vila, CRO @ NexSoft
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
