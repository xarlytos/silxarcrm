import { useRef, useEffect, useState } from 'react'
import { motion, useInView, useMotionValue, useTransform, animate } from 'framer-motion'
import { ArrowRight, TrendingUp, BarChart3, Clock, Users, Zap, RotateCcw, Check } from 'lucide-react'
import { BUTTON_ACTIONS, ROUTES } from '@/lib/routes'
import { DailyLeaderboard } from '@/components/DailyLeaderboard'

interface StatProps {
  number: string
  suffix: string
  label: string
  description?: string
  icon?: React.ReactNode
  delay: number
  highlight?: boolean
}

function AnimatedCounter({ value, suffix, decimal = false }: { value: number; suffix: string; decimal?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-50px' })
  const count = useMotionValue(0)

  useEffect(() => {
    if (isInView) {
      const controls = animate(count, value, {
        duration: 2.5,
        ease: [0.16, 1, 0.3, 1],
      })
      return controls.stop
    }
  }, [isInView, value, count])

  const display = useTransform(count, (v) => {
    return decimal ? v.toFixed(1) : Math.round(v).toString()
  })

  return (
    <span ref={ref}>
      <motion.span>{display}</motion.span>
      {suffix}
    </span>
  )
}

function AnimatedStat({ number, suffix, label, description, icon, delay, highlight }: StatProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })
  const numericValue = parseFloat(number)
  const isDecimal = number.includes('.')

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: delay / 1000, ease: [0.16, 1, 0.3, 1] }}
      className={`relative p-6 rounded-2xl transition-all duration-300 ${
        highlight
          ? 'bg-gradient-to-br from-[#4F6EF7] to-[#7B61FF] shadow-lg shadow-[#4F6EF7]/20'
          : 'bg-white border border-[rgba(0,0,0,0.08)] hover:shadow-md hover:border-[rgba(79,110,247,0.2)]'
      }`}
    >
      {/* Corner accent for highlighted stat */}
      {highlight && (
        <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-bl-full blur-2xl" />
      )}

      <div className="relative z-10">
        {icon && (
          <div className={`mb-3 ${highlight ? 'text-white/80' : 'text-[#4F6EF7]'}`}>
            {icon}
          </div>
        )}
        <div className={`text-[40px] lg:text-[52px] font-bold tabular-nums mb-2 ${
          highlight ? 'text-white' : 'text-[#0A0A12]'
        }`}>
          {isInView ? <AnimatedCounter value={numericValue} suffix={suffix} decimal={isDecimal} /> : `0${suffix}`}
        </div>
        <p className={`text-[14px] font-medium mb-1 ${
          highlight ? 'text-white/90' : 'text-[#0A0A12]'
        }`}>
          {label}
        </p>
        {description && (
          <p className={`text-[13px] leading-relaxed ${
            highlight ? 'text-white/75' : 'text-[#5A5A6A]'
          }`}>
            {description}
          </p>
        )}
      </div>
    </motion.div>
  )
}

function ROICalculator() {
  const [teamSize, setTeamSize] = useState(5)
  const monthlyCostHuman = teamSize * 2500
  const monthlyCostAI = 299
  const monthlySavings = monthlyCostHuman - monthlyCostAI
  const yearlySavings = monthlySavings * 12

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: 0.7 }}
      className="mt-8 p-6 bg-gradient-to-br from-[#4F6EF7]/5 to-[#7B61FF]/5 rounded-2xl border border-[#4F6EF7]/20"
    >
      <h3 className="text-[16px] font-semibold text-[#0A0A12] mb-4">Calcula tu ROI</h3>
      <div className="space-y-4">
        <div>
          <label className="text-[14px] font-medium text-[#5A5A6A] block mb-2">
            Tu tamaño de equipo: {teamSize} personas
          </label>
          <input
            type="range"
            min="1"
            max="20"
            value={teamSize}
            onChange={(e) => setTeamSize(parseInt(e.target.value))}
            className="w-full h-2 bg-[#E5E5EA] rounded-lg appearance-none cursor-pointer accent-[#4F6EF7]"
          />
        </div>

        <div className="grid grid-cols-3 gap-3 pt-2">
          <div className="p-3 bg-white rounded-lg border border-[rgba(0,0,0,0.08)]">
            <p className="text-[12px] text-[#5A5A6A] mb-1">Coste Humano</p>
            <p className="text-[18px] font-bold text-[#E74C3C]">€{monthlyCostHuman.toLocaleString()}</p>
            <p className="text-[11px] text-[#999] mt-1">/mes</p>
          </div>
          <div className="p-3 bg-white rounded-lg border border-[rgba(0,0,0,0.08)]">
            <p className="text-[12px] text-[#5A5A6A] mb-1">Coste AI</p>
            <p className="text-[18px] font-bold text-[#27AE60]">€{monthlyCostAI}</p>
            <p className="text-[11px] text-[#999] mt-1">/mes</p>
          </div>
          <div className="p-3 bg-gradient-to-br from-[#4F6EF7]/10 to-[#7B61FF]/10 rounded-lg border border-[#4F6EF7]/20">
            <p className="text-[12px] text-[#4F6EF7] font-medium mb-1">Ahorro</p>
            <p className="text-[18px] font-bold text-[#4F6EF7]">€{monthlySavings.toLocaleString()}</p>
            <p className="text-[11px] text-[#5A5A6A] mt-1">/mes</p>
          </div>
        </div>

        <div className="pt-2 p-3 bg-white rounded-lg border border-[rgba(79,110,247,0.2)]">
          <p className="text-[12px] text-[#5A5A6A] mb-1">Ahorro anual</p>
          <p className="text-[24px] font-bold text-[#4F6EF7]">€{yearlySavings.toLocaleString()}</p>
        </div>
      </div>
    </motion.div>
  )
}

export default function ROI() {
  return (
    <section id="pricing" className="py-[120px] lg:py-[160px] bg-gradient-to-b from-[#F8F8FB] to-white">
      <div className="max-w-[1280px] mx-auto px-6 lg:px-12">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl mb-14"
        >
          <p className="section-label mb-3 text-[#4F6EF7] font-semibold tracking-wider">
            RETORNO DE INVERSIÓN
          </p>
          <div className="h-1 bg-gradient-to-r from-[#4F6EF7] to-transparent rounded-full mb-4 w-12" />
          <h2 className="text-[32px] sm:text-[40px] lg:text-[52px] font-bold text-[#0A0A12] leading-[1.2] tracking-[-0.02em] mb-4">
            Transforma costes en conversiones
          </h2>
          <p className="text-[16px] text-[#5A5A6A] leading-relaxed">
            Nuestros clientes reducen hasta un 73% sus costes de venta mientras triplican sus reuniones agendadas en 90 días.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-16 items-start">
          {/* Left: Stats Grid + Calculator */}
          <div>
            {/* Stats Grid */}
            <div className="grid sm:grid-cols-2 gap-4 mb-2">
              <AnimatedStat
                number="73"
                suffix="%"
                label="Reducción en costes de ventas"
                description="Eliminates SDR payroll expenses"
                icon={<TrendingUp className="w-5 h-5" />}
                delay={0}
              />
              <AnimatedStat
                number="5"
                suffix="x"
                label="5x leads contactados"
                description="Comparado con SDR humano"
                icon={<Users className="w-5 h-5" />}
                delay={150}
              />
              <AnimatedStat
                number="340"
                suffix="%"
                label="Incremento en follow-ups"
                description="Tasa de seguimiento autom\u00e1tico"
                icon={<BarChart3 className="w-5 h-5" />}
                delay={300}
                highlight
              />
              <AnimatedStat
                number="2.4"
                suffix="M€"
                label="Ingresos recuperados"
                description="Clientes activos (2024)"
                icon={<Clock className="w-5 h-5" />}
                delay={450}
              />
            </div>

            {/* ROI Calculator */}
            <ROICalculator />

            {/* Case Study */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="mt-8 p-6 bg-white rounded-2xl border border-[rgba(0,0,0,0.08)] hover:shadow-lg hover:border-[#4F6EF7]/20 transition-all"
            >
              <div className="mb-4 flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#4F6EF7] to-[#7B61FF] flex items-center justify-center">
                  <Check className="w-5 h-5 text-white" />
                </div>
                <p className="text-[12px] font-semibold text-[#4F6EF7] uppercase tracking-wide">Caso de éxito</p>
              </div>
              <p className="text-[15px] text-[#0A0A12] font-medium leading-relaxed mb-3">
                "Pasamos de 12 reuniones por semana a 47. Nuestro equipo solo cierra ahora. El SDK Agent hace todo el trabajo sucio."
              </p>
              <p className="text-[14px] text-[#5A5A6A] mb-4">
                <span className="font-semibold text-[#0A0A12]">Ana García</span>, VP Sales @ DataPro
              </p>
              <motion.a
                href={ROUTES.CASE_STUDIES}
                onClick={(e) => {
                  e.preventDefault()
                  BUTTON_ACTIONS.viewCaseStudies()
                }}
                whileHover={{ x: 4 }}
                className="inline-flex items-center gap-2 text-[14px] font-semibold text-[#4F6EF7] hover:text-[#7B61FF] transition-colors group"
              >
                Ver todos los casos de \Ã©xito
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </motion.a>
            </motion.div>
          </div>

          {/* Right: Comparison Visual */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="space-y-6"
          >
            {/* Cost Comparison Chart */}
            <div className="p-8 bg-white rounded-2xl border border-[rgba(0,0,0,0.08)]">
              <p className="text-[14px] font-semibold text-[#0A0A12] mb-8 text-center">Comparativa de costes mensuales</p>
              <div className="flex items-end justify-around gap-12 h-[280px] mb-6">
                {/* Human SDR */}
                <div className="flex flex-col items-center flex-1">
                  <motion.div
                    initial={{ height: 0 }}
                    whileInView={{ height: 240 }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
                    className="w-full rounded-t-lg bg-gradient-to-t from-[#E74C3C] to-[#C0392B] shadow-lg"
                  />
                  <div className="mt-4 text-center">
                    <p className="text-[16px] font-bold text-[#E74C3C] mb-1">€2.500+</p>
                    <p className="text-[12px] font-medium text-[#5A5A6A]">SDR Humano</p>
                    <p className="text-[11px] text-[#999] mt-1">por persona/mes</p>
                  </div>
                </div>

                {/* AI Agent */}
                <div className="flex flex-col items-center flex-1">
                  <motion.div
                    initial={{ height: 0 }}
                    whileInView={{ height: 40 }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.5 }}
                    className="w-full rounded-t-lg bg-gradient-to-t from-[#27AE60] to-[#229954] shadow-lg"
                  />
                  <div className="mt-4 text-center">
                    <p className="text-[16px] font-bold text-[#27AE60] mb-1">€299</p>
                    <p className="text-[12px] font-medium text-[#5A5A6A]">VoiceAgent OS</p>
                    <p className="text-[11px] text-[#999] mt-1">unlimited/mes</p>
                  </div>
                </div>
              </div>

              {/* Savings Banner */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.7 }}
                className="p-4 bg-gradient-to-r from-[#27AE60]/10 to-[#4F6EF7]/10 rounded-lg border border-[#27AE60]/20"
              >
                <p className="text-[13px] text-[#5A5A6A] text-center mb-1">Ahorro mensual</p>
                <p className="text-[28px] font-bold text-center text-[#27AE60]">€1.800 - €12.000+</p>
                <p className="text-[12px] text-[#5A5A6A] text-center mt-2">Dependiendo del tamaño del equipo</p>
              </motion.div>
            </div>

            {/* Key Benefits */}
            <div className="grid grid-cols-1 gap-3">
              {[
                { icon: <Zap className="w-5 h-5 text-[#F59E0B]" />, label: 'Sin tiempo de onboarding', value: 'Listo en minutos' },
                { icon: <RotateCcw className="w-5 h-5 text-[#3B82F6]" />, label: '24/7 disponible', value: 'Nunca descansa' },
                { icon: <TrendingUp className="w-5 h-5 text-[#10B981]" />, label: 'Escalable', value: 'Crece sin costes fijos' },
              ].map((benefit, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.5 + i * 0.1 }}
                  className="p-4 bg-white rounded-lg border border-[rgba(0,0,0,0.08)] hover:border-[#4F6EF7]/20 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {benefit.icon}
                      <div>
                        <p className="text-[13px] font-medium text-[#0A0A12]">{benefit.label}</p>
                        <p className="text-[12px] text-[#5A5A6A] mt-1">{benefit.value}</p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-[#4F6EF7]/40" />
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Daily Leaderboard Widget */}
            <DailyLeaderboard />
          </motion.div>
        </div>
      </div>
    </section>
  )
}

