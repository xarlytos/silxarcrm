import { useRef, useEffect, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import { PhoneOff, Users, TrendingUp } from 'lucide-react'

interface StatCardProps {
  icon: React.ReactNode
  number: string
  suffix?: string
  label: string
  sub: string
  tintColor: string
  delay: number
}

function StatCard({ icon, number, suffix = '', label, sub, tintColor, delay }: StatCardProps) {
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
      // ease-out-expo
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
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-100px' }}
      transition={{ duration: 0.7, delay: delay / 1000, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
      className="rounded-2xl p-8 border border-[rgba(255,255,255,0.06)]"
      style={{ background: tintColor }}
    >
      <div className="mb-4">{icon}</div>
      <div className="text-[48px] lg:text-[56px] font-bold text-white mb-2 tabular-nums">
        {displayValue}
        <span className="text-[32px]">{suffix}</span>
      </div>
      <p className="text-[16px] font-medium text-white mb-2">{label}</p>
      <p className="text-[14px] text-[#8A8A9A] leading-relaxed">{sub}</p>
    </motion.div>
  )
}

export default function Problem() {
  return (
    <section
      id="problem"
      className="relative py-[100px] lg:py-[140px]"
      style={{ background: '#06060A' }}
    >
      {/* Subtle red gradient at center */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 50% 50% at 50% 50%, rgba(239,68,68,0.03) 0%, transparent 70%)',
        }}
      />

      <div className="relative z-10 max-w-[1280px] mx-auto px-6 lg:px-12">
        {/* Section Header */}
        <div className="text-center max-w-[680px] mx-auto mb-16">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="section-label mb-4"
          >
            EL PROBLEMA
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
            className="text-[28px] sm:text-[36px] lg:text-[48px] font-semibold text-white leading-[1.1] tracking-[-0.02em] mb-5"
          >
            Cada d&iacute;a que pasa, tu negocio est&aacute; perdiendo dinero
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-[18px] text-[#8A8A9A] leading-relaxed"
          >
            Los equipos humanos tienen l&iacute;mites. Llamadas no contestadas, leads que se
            enfr&iacute;an, seguimientos olvidados. Cada oportunidad perdida es ingreso que nunca
            recuperar&aacute;s.
          </motion.p>
        </div>

        {/* Stat Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <StatCard
            icon={<PhoneOff className="w-8 h-8 text-[#EF4444]" />}
            number="67"
            suffix="%"
            label="de las llamadas a negocios no son contestadas"
            sub="Cada llamada perdida es un cliente que llama a tu competencia."
            tintColor="rgba(239,68,68,0.05)"
            delay={0}
          />
          <StatCard
            icon={<Users className="w-8 h-8 text-[#F59E0B]" />}
            number="80"
            suffix="%"
            label="de los leads requieren 5+ contactos para convertir"
            sub="La mayor&iacute;a de los equipos se rinden despu&eacute;s del segundo intento."
            tintColor="rgba(245,158,11,0.05)"
            delay={150}
          />
          <StatCard
            icon={<TrendingUp className="w-8 h-8 text-white" />}
            number="3.2"
            suffix="x"
            label="m&aacute;s caro que un agente IA equivalente"
            sub="Salario, formaci&oacute;n, absentismo, rotaci&oacute;n y herramientas."
            tintColor="rgba(255,255,255,0.03)"
            delay={300}
          />
        </div>

        {/* Emotional CTA */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="text-center text-[18px] font-medium text-[#8A8A9A] italic"
        >
          No dejes que tu competencia te adelante
        </motion.p>
      </div>
    </section>
  )
}
