import { useRef, useEffect, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import { Stethoscope, Dumbbell, Scissors, Wrench, Briefcase } from 'lucide-react'

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

const industries = [
  {
    icon: Stethoscope,
    title: 'Clinicas medicas',
    stat: '55%',
    statLabel: 'Ausencias reducidas',
    description: 'Confirma citas medicas 24h antes, gestiona cancelaciones, reagenda pacientes y mantiene la lista de espera activa.',
    roi: '3.200 EUR/mes',
  },
  {
    icon: Dumbbell,
    title: 'Gimnasios y centros deportivos',
    stat: '38%',
    statLabel: 'Ocupacion de clases',
    description: 'Gestiona reservas de clases, entrenamientos personales y uso de instalaciones. Cubre huecos cancelados automaticamente.',
    roi: '1.800 EUR/mes',
  },
  {
    icon: Scissors,
    title: 'Peluquerias y belleza',
    stat: '60%',
    statLabel: 'Ausencias reducidas',
    description: 'Agenda citas de belleza 24/7, confirma asistencia, gestiona duraciones diferentes por servicio y reagenda sin llamadas perdidas.',
    roi: '1.500 EUR/mes',
  },
  {
    icon: Wrench,
    title: 'Talleres mecanicos',
    stat: '45%',
    statLabel: 'Eficiencia de agenda',
    description: 'Programa revisiones, reparaciones y mantenimientos. Adapta duracion segun el tipo de trabajo. Recordatorios con instrucciones.',
    roi: '2.400 EUR/mes',
  },
  {
    icon: Briefcase,
    title: 'Abogados, asesores, consultores',
    stat: '70%',
    statLabel: 'Tiempo administrativo',
    description: 'Gestiona citas de consulta, envia documentacion previa, confirma asistencia y gestiona cancelaciones de ultima hora.',
    roi: '2.800 EUR/mes',
  },
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
          Resultados por sector
        </motion.h2>

        {/* Industry Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {industries.map((ind, i) => (
            <motion.div
              key={ind.title}
              initial={{ opacity: 0, y: 40 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: i * 0.12, ease: easeOutExpo }}
              className="bg-[#11111A] border border-[rgba(255,255,255,0.06)] rounded-2xl p-6 lg:p-8 hover:border-[rgba(79,110,247,0.25)] hover:-translate-y-1 hover:shadow-card-hover transition-all duration-400"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-[rgba(79,110,247,0.15)] rounded-xl flex items-center justify-center">
                  <ind.icon className="w-6 h-6 text-[#4F6EF7]" />
                </div>
                <h3 className="text-[18px] font-semibold text-white">{ind.title}</h3>
              </div>

              <div className="mb-4">
                <div className="text-[36px] font-bold text-[#22D3EE]">
                  <Counter end={ind.stat} delay={i * 150} inView={inView} />
                </div>
                <p className="text-[13px] text-[#8A8A9A]">{ind.statLabel}</p>
              </div>

              <p className="text-[14px] leading-[1.5] text-[#8A8A9A] mb-4">{ind.description}</p>

              <div className="pt-4 border-t border-[rgba(255,255,255,0.06)]">
                <p className="text-[13px] text-[#8A8A9A]">Ahorro medio:</p>
                <p className="text-[18px] font-semibold text-[#10B981]">{ind.roi}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
