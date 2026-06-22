import { motion } from 'framer-motion'
import { ArrowRight, Calendar, Zap, Clock, Check } from 'lucide-react'

export default function FinalCTA() {
  return (
    <section className="relative py-[100px] lg:py-[120px] overflow-hidden">
      {/* Animated Gradient Background with Multiple Layers */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#4F6EF7] via-[#7B61FF] to-[#4F6EF7] animate-aurora-shift" />

      {/* Floating Orbs - Background Animation */}
      <motion.div
        className="absolute top-[-10%] right-[-5%] w-[400px] h-[400px] rounded-full blur-3xl"
        style={{
          background: 'radial-gradient(circle, rgba(123,97,255,0.3) 0%, rgba(79,110,247,0.1) 100%)',
        }}
        animate={{
          y: [0, 50, -30, 40, 0],
          x: [0, 30, -40, 20, 0],
        }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      />

      <motion.div
        className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full blur-3xl"
        style={{
          background: 'radial-gradient(circle, rgba(79,110,247,0.25) 0%, rgba(123,97,255,0.1) 100%)',
        }}
        animate={{
          y: [0, -60, 40, -30, 0],
          x: [0, -40, 30, -20, 0],
        }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Grid Pattern Overlay with Animation */}
      <motion.div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            'linear-gradient(0deg, transparent 24%, rgba(255,255,255,0.1) 25%, rgba(255,255,255,0.1) 26%, transparent 27%, transparent 74%, rgba(255,255,255,0.1) 75%, rgba(255,255,255,0.1) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(255,255,255,0.1) 25%, rgba(255,255,255,0.1) 26%, transparent 27%, transparent 74%, rgba(255,255,255,0.1) 75%, rgba(255,255,255,0.1) 76%, transparent 77%, transparent)',
          backgroundSize: '50px 50px',
        }}
        animate={{
          backgroundPosition: ['0px 0px', '50px 50px'],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
      />

      {/* Pulse Ring - Attracts Attention */}
      <motion.div
        className="absolute top-1/4 right-1/4 w-2 h-2 rounded-full bg-white"
        animate={{
          boxShadow: [
            '0 0 0 0px rgba(255,255,255,0.7)',
            '0 0 0 40px rgba(255,255,255,0)',
          ],
          scale: [1, 1.2, 1],
        }}
        transition={{ duration: 2.5, repeat: Infinity }}
      />

      {/* Main Content */}
      <div className="relative z-10 max-w-[900px] mx-auto px-6 lg:px-12 text-center">
        {/* Urgency Badge */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[rgba(255,255,255,0.15)] border border-[rgba(255,255,255,0.3)] backdrop-blur-sm mb-6"
        >
          <Zap className="w-4 h-4 text-[#FFD700] animate-pulse" />
          <span className="text-[13px] font-semibold text-white">Oferta Limitada: 14 días gratis + Primer mes 50% OFF</span>
        </motion.div>

        {/* Main Heading with Letter Animation */}
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
          className="text-[36px] sm:text-[48px] lg:text-[68px] font-bold text-white leading-[1.08] tracking-[-0.025em] mb-4"
        >
          <motion.span
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="inline-block"
          >
            Deja de perder
          </motion.span>
          {' '}
          <span className="relative inline-block">
            oportunidades
            <motion.span
              className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-[#22D3EE] to-[#4F6EF7]"
              initial={{ width: 0 }}
              whileInView={{ width: '100%' }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.3 }}
            />
          </span>
          . Empieza hoy.
        </motion.h2>

        {/* Subheading */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="text-[18px] sm:text-[20px] text-[rgba(255,255,255,0.9)] leading-relaxed max-w-[640px] mx-auto mb-8 font-light"
        >
          Tu primer agente IA estará trabajando en menos de 24 horas. Sin configuración compleja. Sin necesidad de código.
        </motion.p>

        {/* CTA Buttons with Advanced Effects */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12"
        >
          {/* Primary Button - Glow + Ripple */}
          <motion.button
            className="group relative inline-flex items-center gap-2 px-8 py-4 rounded-full bg-white text-[#4F6EF7] font-bold text-[16px] overflow-hidden min-w-[280px]"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            {/* Animated glow background on hover */}
            <motion.span
              className="absolute inset-0 rounded-full bg-gradient-to-r from-[#4F6EF7] to-[#7B61FF]"
              initial={{ opacity: 0 }}
              whileHover={{ opacity: 0.2 }}
              transition={{ duration: 0.3 }}
            />

            {/* Ripple effect */}
            <motion.span
              className="absolute inset-0 rounded-full"
              initial={{ boxShadow: '0 0 0 0px rgba(79, 110, 247, 0.7)' }}
              whileHover={{
                boxShadow: [
                  '0 0 0 0px rgba(79, 110, 247, 0.7)',
                  '0 0 0 20px rgba(79, 110, 247, 0)',
                ],
              }}
              transition={{ duration: 0.6 }}
            />

            <span className="relative flex items-center gap-2">
              Comenzar Prueba Gratuita
              <motion.span
                animate={{ x: [0, 4, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <ArrowRight className="w-5 h-5" />
              </motion.span>
            </span>
          </motion.button>

          {/* Secondary Button - Border Glow */}
          <motion.button
            className="group relative inline-flex items-center gap-2 px-8 py-4 rounded-full bg-transparent text-white font-bold text-[16px] border-2 border-white overflow-hidden min-w-[280px]"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            {/* Animated gradient border */}
            <motion.span
              className="absolute inset-0 rounded-full bg-gradient-to-r from-[rgba(34,211,238,0.1)] to-[rgba(79,110,247,0.1)]"
              initial={{ opacity: 0 }}
              whileHover={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            />

            <span className="relative flex items-center gap-2">
              <motion.span
                animate={{ rotate: [0, 20, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Calendar className="w-5 h-5" />
              </motion.span>
              Agendar Demo
            </span>
          </motion.button>
        </motion.div>

        {/* Trust Signals + Urgency Indicators */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.45 }}
          className="flex flex-col items-center gap-6"
        >
          {/* Time-Sensitive Message */}
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[rgba(255,255,255,0.08)] border border-[rgba(255,215,0,0.3)] backdrop-blur-sm"
            animate={{ boxShadow: ['0 0 0 0 rgba(255,215,0,0.3)', '0 0 20px 5px rgba(255,215,0,0)'] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Clock className="w-4 h-4 text-[#FFD700] animate-pulse" />
            <span className="text-[13px] font-semibold text-white">Esta oferta expira en 5 días</span>
          </motion.div>

          {/* Trust Badges */}
          <motion.div
            className="text-[14px] text-[rgba(255,255,255,0.8)]"
          >
            <div className="flex flex-wrap items-center justify-center gap-3 mb-3">
              <motion.span
                className="px-3 py-1 rounded-full bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] flex items-center gap-2"
                whileHover={{ bg: 'rgba(255,255,255,0.15)' }}
              >
                <Check className="w-4 h-4 text-[#10B981]" /> 14 días gratis
              </motion.span>
              <motion.span
                className="px-3 py-1 rounded-full bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] flex items-center gap-2"
                whileHover={{ bg: 'rgba(255,255,255,0.15)' }}
              >
                <Check className="w-4 h-4 text-[#10B981]" /> Sin tarjeta de crédito
              </motion.span>
              <motion.span
                className="px-3 py-1 rounded-full bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] flex items-center gap-2"
                whileHover={{ bg: 'rgba(255,255,255,0.15)' }}
              >
                <Check className="w-4 h-4 text-[#10B981]" /> Cancela cuando quieras
              </motion.span>
            </div>
          </motion.div>

          {/* Counter - Urgency Element */}
          <motion.div
            className="text-[13px] text-[rgba(255,255,255,0.7)] font-medium"
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <span className="text-[#FFD700] font-bold">500+ empresas</span> ya están usando nuestro agente IA
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
