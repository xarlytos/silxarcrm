import { motion } from 'framer-motion'
import { Check, X, Crown, TrendingUp, Zap } from 'lucide-react'
import { useState } from 'react'

interface ComparisonRow {
  metric: string
  human: string
  ai: string
  icon?: React.ReactNode
  impact?: 'high' | 'medium'
}

const rows: ComparisonRow[] = [
  { metric: 'Horario de trabajo', human: '40h/semana', ai: '168h/semana', impact: 'high' },
  { metric: 'Coste mensual', human: '2.500\u20ac+', ai: 'Desde 299\u20ac', impact: 'high' },
  { metric: 'Tiempo de respuesta', human: 'Horas/dias', ai: 'Instantaneo', impact: 'high' },
  { metric: 'Seguimiento persistente', human: 'Depende del dia', ai: 'Siempre perfecto', impact: 'high' },
  { metric: 'Escalado', human: 'Meses de contratacion', ai: 'Segundos', impact: 'high' },
  { metric: 'Formacion', human: 'Semanas/meses', ai: 'Listo en minutos', impact: 'medium' },
  { metric: 'Rotacion', human: '15-25% anual', ai: '0%', impact: 'medium' },
  { metric: 'Llamadas simultaneas', human: '1', ai: 'Ilimitadas', impact: 'high' },
  { metric: 'Datos y analitica', human: 'Limitados', ai: 'Completos en tiempo real', impact: 'high' },
  { metric: 'Humor y estado de animo', human: 'Variable', ai: 'Siempre optimo', impact: 'medium' },
]

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.2,
    },
  },
}

const rowVariants = {
  hidden: { opacity: 0, x: -30, scale: 0.95 },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: {
      duration: 0.6,
      ease: [0.16, 1, 0.3, 1],
    },
  },
}

function ComparisonRow({ row, index, isHovered, setHovered }: any) {
  return (
    <motion.div
      variants={rowVariants}
      onHoverStart={() => setHovered(index)}
      onHoverEnd={() => setHovered(null)}
      className={`group relative grid grid-cols-[1fr_1fr_1fr] gap-4 px-6 py-5 items-center transition-all duration-300 ${
        index < rows.length - 1 ? 'border-b border-[rgba(255,255,255,0.06)]' : ''
      } ${isHovered ? 'bg-[rgba(79,110,247,0.15)]' : 'hover:bg-[rgba(79,110,247,0.08)]'}`}
    >
      {/* Animated background accent on hover */}
      {isHovered && (
        <motion.div
          layoutId="hoverBg"
          className="absolute inset-0 bg-gradient-to-r from-[rgba(79,110,247,0.1)] via-transparent to-transparent pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        />
      )}

      {/* Metric Label */}
      <motion.div
        className="relative z-10 flex items-center gap-3"
        animate={{ x: isHovered ? 4 : 0 }}
        transition={{ duration: 0.2 }}
      >
        {row.impact === 'high' && (
          <motion.div
            animate={{ scale: isHovered ? 1.2 : 1, rotate: isHovered ? 180 : 0 }}
            transition={{ duration: 0.3 }}
            className="text-[#4F6EF7]"
          >
            <Zap className="w-4 h-4" />
          </motion.div>
        )}
        <span className="text-[15px] font-medium text-white">{row.metric}</span>
      </motion.div>

      {/* Human Column */}
      <motion.div
        className="relative z-10 text-center"
        animate={{ opacity: isHovered ? 0.7 : 1, scale: isHovered ? 0.95 : 1 }}
        transition={{ duration: 0.2 }}
      >
        <div className="flex items-center justify-center gap-2">
          <motion.div
            animate={{ rotate: isHovered ? 360 : 0 }}
            transition={{ duration: 0.4 }}
          >
            <X className="w-4 h-4 text-[#EF4444] shrink-0" />
          </motion.div>
          <span className="text-[15px] text-[#8A8A9A]">{row.human}</span>
        </div>
      </motion.div>

      {/* AI Column - Enhanced */}
      <motion.div
        className="relative z-10"
        animate={{ scale: isHovered ? 1.05 : 1 }}
        transition={{ duration: 0.2 }}
      >
        <div className="text-center flex items-center justify-center gap-2">
          <motion.div
            animate={{
              scale: isHovered ? [1, 1.3, 1] : 1,
              rotate: isHovered ? 360 : 0,
            }}
            transition={{
              duration: 0.5,
              rotate: { duration: 0.6 },
            }}
          >
            <Check className="w-4 h-4 text-[#10B981] shrink-0" />
          </motion.div>
          <span className="text-[15px] text-[#22D3EE] font-medium">{row.ai}</span>
        </div>

        {/* Glow effect on hover */}
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 0.3, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute inset-0 rounded-lg bg-[#10B981] blur-xl -z-10"
          />
        )}
      </motion.div>
    </motion.div>
  )
}

export default function Comparison() {
  const [hoveredIndex, setHovered] = useState<number | null>(null)

  return (
    <section id="comparison" className="py-[100px] lg:py-[140px] bg-[#0C0C14] relative overflow-hidden">
      {/* Animated background elements */}
      <motion.div
        className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-r from-[#4F6EF7] to-transparent rounded-full blur-3xl opacity-5"
        animate={{ y: [0, 30, 0] }}
        transition={{ duration: 8, repeat: Infinity }}
      />
      <motion.div
        className="absolute bottom-20 right-1/4 w-80 h-80 bg-gradient-to-l from-[#10B981] to-transparent rounded-full blur-3xl opacity-5"
        animate={{ y: [0, -30, 0] }}
        transition={{ duration: 8, repeat: Infinity }}
      />

      <div className="max-w-[900px] mx-auto px-6 lg:px-12 relative z-10">
        {/* Section Header with animated gradient */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
          className="mb-16"
        >
          <h2 className="text-[36px] sm:text-[48px] lg:text-[64px] font-bold text-white leading-[1.05] tracking-[-0.025em] text-center">
            <span className="relative">
              <motion.span
                className="absolute inset-0 bg-gradient-to-r from-[#4F6EF7] via-[#22D3EE] to-[#10B981] bg-clip-text text-transparent opacity-0"
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                Humano vs Agente IA
              </motion.span>
              Humano vs Agente IA
            </span>
          </h2>
        </motion.div>

        {/* Comparison Table */}
        <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] overflow-hidden backdrop-blur-md bg-[rgba(15,15,23,0.8)]">
          {/* Table Header with enhanced styling */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="grid grid-cols-[1fr_1fr_1fr] gap-4 px-6 py-5 bg-gradient-to-r from-[rgba(79,110,247,0.08)] via-transparent to-[rgba(16,185,129,0.08)] border-b border-[rgba(255,255,255,0.08)]"
          >
            <span className="text-[12px] font-bold text-[#5A5A6A] uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5" />
              Metrica
            </span>
            <span className="text-[12px] font-bold text-[#5A5A6A] uppercase tracking-wider text-center">
              Empleado Humano
            </span>
            <span className="text-[12px] font-bold text-[#4F6EF7] uppercase tracking-wider text-center flex items-center justify-center gap-1">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity }}>
                <Crown className="w-3.5 h-3.5" />
              </motion.div>
              VoiceAgent OS
            </span>
          </motion.div>

          {/* Rows Container with stagger animation */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
          >
            {rows.map((row, index) => (
              <ComparisonRow
                key={row.metric}
                row={row}
                index={index}
                isHovered={hoveredIndex === index}
                setHovered={setHovered}
              />
            ))}
          </motion.div>
        </div>

        {/* Animated Conclusion Banner */}
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.4 }}
          whileHover={{ scale: 1.02 }}
          className="mt-10 rounded-2xl p-8 text-center relative overflow-hidden group cursor-pointer"
          style={{
            background: 'linear-gradient(135deg, rgba(79,110,247,0.15) 0%, rgba(16,185,129,0.05) 100%)',
            border: '1px solid rgba(79,110,247,0.2)',
          }}
        >
          {/* Animated border glow */}
          <motion.div
            className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{
              background:
                'linear-gradient(90deg, transparent, rgba(79,110,247,0.3), transparent)',
              filter: 'blur(20px)',
            }}
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 2, repeat: Infinity }}
          />

          <motion.div
            className="relative z-10"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <p className="text-[18px] lg:text-[22px] font-semibold text-white mb-2">
              El agente IA no reemplaza a tu equipo.
            </p>
            <motion.p
              className="text-[16px] lg:text-[18px] bg-gradient-to-r from-[#4F6EF7] via-[#22D3EE] to-[#10B981] bg-clip-text text-transparent font-semibold"
              animate={{ backgroundPosition: ['0%', '100%'] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              Lo potencia exponencialmente.
            </motion.p>
          </motion.div>

          {/* Pulse effect */}
          <motion.div
            className="absolute top-1/2 left-1/2 w-64 h-64 bg-[#4F6EF7] rounded-full blur-3xl opacity-0 group-hover:opacity-5 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </motion.div>

        {/* Bottom accent line with animation */}
        <motion.div
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mt-12 h-1 bg-gradient-to-r from-transparent via-[#4F6EF7] to-transparent origin-left"
        />
      </div>
    </section>
  )
}
