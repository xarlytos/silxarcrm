import { useRef, useEffect, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import { PhoneOff, Users, TrendingUp, Clock, AlertTriangle, DollarSign } from 'lucide-react'

interface StatCardProps {
  icon: React.ReactNode
  number: string
  suffix?: string
  label: string
  sub: string
  tintColor: string
  accentColor: string
  delay: number
}

function StatCard({ icon, number, suffix = '', label, sub, tintColor, accentColor, delay }: StatCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })
  const [displayValue, setDisplayValue] = useState('0')

  useEffect(() => {
    if (!isInView) return

    const numericValue = parseFloat(number)
    const isDecimal = number.includes('.')
    const duration = 2400
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
      initial={{ opacity: 0, y: 60, scale: 0.95 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: '-100px' }}
      transition={{ duration: 0.8, delay: delay / 1000, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
      whileHover={{
        scale: 1.05,
        boxShadow: `0 20px 60px ${accentColor}20`
      }}
      className="group relative rounded-3xl p-8 border border-[rgba(255,255,255,0.08)] overflow-hidden"
      style={{ background: tintColor }}
    >
      {/* Animated background glow */}
      <motion.div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${accentColor}15 0%, transparent 70%)`
        }}
      />

      {/* Pulsing accent corner */}
      <motion.div
        className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-0 group-hover:opacity-20"
        style={{ background: accentColor }}
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 3, repeat: Infinity }}
      />

      <div className="relative z-10">
        {/* Icon */}
        <motion.div
          className="mb-6 flex items-center gap-3"
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center`} style={{ background: `${accentColor}20` }}>
            {icon}
          </div>
        </motion.div>

        {/* Big number with dynamic sizing */}
        <motion.div
          className="mb-3 overflow-hidden"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ delay: delay / 1000 + 0.3 }}
        >
          <motion.div
            className="text-[56px] sm:text-[64px] lg:text-[72px] font-black text-white tabular-nums leading-none"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: delay / 1000 + 0.3, duration: 0.6 }}
          >
            {displayValue}
            <span className="text-[40px] lg:text-[48px] font-bold ml-2">{suffix}</span>
          </motion.div>
        </motion.div>

        {/* Main label with color accent */}
        <motion.p
          className="text-[18px] font-semibold mb-2 leading-tight"
          style={{ color: accentColor }}
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ delay: delay / 1000 + 0.4, duration: 0.6 }}
        >
          {label}
        </motion.p>

        {/* Subtext */}
        <motion.p
          className="text-[14px] text-[#8A8A9A] leading-relaxed"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ delay: delay / 1000 + 0.5, duration: 0.6 }}
        >
          {sub}
        </motion.p>
      </div>
    </motion.div>
  )
}

export default function Problem() {
  const containerRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(containerRef, { once: true, margin: '-200px' })

  return (
    <section
      ref={containerRef}
      id="problem"
      className="relative py-[80px] lg:py-[160px] overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #06060A 0%, #0A0A12 50%, #06060A 100%)' }}
    >
      {/* Dramatic animated gradient background */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 1 }}
        style={{
          background: 'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(239,68,68,0.08) 0%, rgba(245,158,11,0.03) 40%, transparent 85%)',
        }}
      />

      {/* Floating accent elements */}
      <motion.div
        className="absolute top-20 left-10 w-96 h-96 rounded-full opacity-[0.04]"
        style={{ background: 'radial-gradient(circle, #EF4444, transparent)' }}
        animate={{ y: [0, 40, 0], x: [0, 20, 0] }}
        transition={{ duration: 8, repeat: Infinity }}
      />
      <motion.div
        className="absolute bottom-40 right-20 w-80 h-80 rounded-full opacity-[0.03]"
        style={{ background: 'radial-gradient(circle, #F59E0B, transparent)' }}
        animate={{ y: [0, -50, 0], x: [0, -20, 0] }}
        transition={{ duration: 10, repeat: Infinity }}
      />

      <div className="relative z-10 max-w-[1280px] mx-auto px-6 lg:px-12">
        {/* Dramatic Section Header */}
        <div className="text-center max-w-[820px] mx-auto mb-20">
          {/* Label with icon */}
          <motion.div
            className="flex items-center justify-center gap-2 mb-6"
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <AlertTriangle className="w-5 h-5 text-[#EF4444]" />
            <p className="section-label text-[#EF4444]">EL PROBLEMA SILENCIOSO</p>
            <AlertTriangle className="w-5 h-5 text-[#EF4444]" />
          </motion.div>

          {/* Main heading with line breaks for impact */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
          >
            <h2 className="text-[32px] sm:text-[42px] lg:text-[56px] font-black text-white leading-[1.15] tracking-[-0.03em] mb-6">
              <motion.span
                className="inline-block"
                animate={{ opacity: [1, 0.6, 1] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                Cada día
              </motion.span>
              <br />
              <span className="bg-gradient-to-r from-[#EF4444] via-[#F59E0B] to-[#EF4444] bg-clip-text text-transparent">
                tu negocio está perdiendo dinero
              </span>
            </h2>
          </motion.div>

          {/* Subheading with emotional resonance */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="space-y-4"
          >
            <p className="text-[16px] sm:text-[18px] lg:text-[20px] text-[#8A8A9A] leading-relaxed">
              <span className="text-white font-semibold">Tus mejores clientes llaman.</span> <span className="opacity-75">Nadie contesta.</span>
            </p>
            <p className="text-[16px] sm:text-[18px] lg:text-[20px] text-[#8A8A9A] leading-relaxed">
              <span className="text-white font-semibold">Prospectos esperan 3 días.</span> <span className="opacity-75">Llaman a tu rival.</span>
            </p>
            <motion.p
              className="text-[18px] sm:text-[20px] lg:text-[22px] font-bold text-[#EF4444]"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 4, repeat: Infinity }}
            >
              47 seguimientos olvidados/mes = €180K volatilizados.
            </motion.p>
          </motion.div>
        </div>

        {/* Pain Points Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          <StatCard
            icon={<PhoneOff className="w-8 h-8 text-[#EF4444]" />}
            number="67"
            suffix="%"
            label="Llamadas sin respuesta"
            sub="Cada una es un cliente que llama a tu competencia. Instantáneamente."
            tintColor="rgba(239,68,68,0.06)"
            accentColor="#EF4444"
            delay={0}
          />
          <StatCard
            icon={<Users className="w-8 h-8 text-[#F59E0B]" />}
            number="80"
            suffix="%"
            label="Requieren 5+ contactos"
            sub="Tu equipo se rinde después del 2°. Tus competidores no."
            tintColor="rgba(245,158,11,0.06)"
            accentColor="#F59E0B"
            delay={150}
          />
          <StatCard
            icon={<DollarSign className="w-8 h-8 text-[#10B981]" />}
            number="3.2"
            suffix="x"
            label="Más caro que IA"
            sub="Sueldos, formación, absentismo, rotación. El dinero se escurre."
            tintColor="rgba(16,185,129,0.05)"
            accentColor="#10B981"
            delay={300}
          />
        </div>

        {/* Urgency message with animation */}
        <motion.div
          className="text-center max-w-[700px] mx-auto"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.6 }}
        >
          <div className="relative">
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-[#EF4444]/20 via-transparent to-[#F59E0B]/20 blur-xl opacity-0"
              animate={{ opacity: [0.5, 0.8, 0.5] }}
              transition={{ duration: 3, repeat: Infinity }}
            />
            <p className="relative text-[20px] sm:text-[24px] font-bold text-white leading-relaxed">
              Tu competencia <span className="text-[#EF4444]">ya se está moviendo</span>.
              <br />
              <span className="text-[#F59E0B]">¿Tú?</span>
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
