import { motion } from 'framer-motion'
import { Check, X, Crown } from 'lucide-react'

interface ComparisonRow {
  metric: string
  human: string
  ai: string
}

const rows: ComparisonRow[] = [
  { metric: 'Horario de trabajo', human: '40h/semana', ai: '168h/semana' },
  { metric: 'Coste mensual', human: '2.500\u20ac+', ai: 'Desde 299\u20ac' },
  { metric: 'Tiempo de respuesta', human: 'Horas/dias', ai: 'Instantaneo' },
  { metric: 'Seguimiento persistente', human: 'Depende del dia', ai: 'Siempre perfecto' },
  { metric: 'Escalado', human: 'Meses de contratacion', ai: 'Segundos' },
  { metric: 'Formacion', human: 'Semanas/meses', ai: 'Listo en minutos' },
  { metric: 'Rotacion', human: '15-25% anual', ai: '0%' },
  { metric: 'Llamadas simultaneas', human: '1', ai: 'Ilimitadas' },
  { metric: 'Datos y analitica', human: 'Limitados', ai: 'Completos en tiempo real' },
  { metric: 'Humor y estado de animo', human: 'Variable', ai: 'Siempre optimo' },
]

export default function Comparison() {
  return (
    <section id="comparison" className="py-[100px] lg:py-[140px] bg-[#0C0C14]">
      <div className="max-w-[900px] mx-auto px-6 lg:px-12">
        {/* Section Header */}
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
          className="text-[36px] sm:text-[48px] lg:text-[64px] font-bold text-white leading-[1.05] tracking-[-0.025em] text-center mb-16"
        >
          Humano vs Agente IA
        </motion.h2>

        {/* Comparison Table */}
        <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-[1fr_1fr_1fr] gap-4 px-6 py-4 bg-[rgba(255,255,255,0.03)]">
            <span className="text-[12px] font-medium text-[#5A5A6A] uppercase tracking-wider">
              Metrica
            </span>
            <span className="text-[12px] font-medium text-[#5A5A6A] uppercase tracking-wider text-center">
              Empleado Humano
            </span>
            <span className="text-[12px] font-medium text-[#4F6EF7] uppercase tracking-wider text-center flex items-center justify-center gap-1">
              <Crown className="w-3.5 h-3.5" />
              VoiceAgent OS
            </span>
          </div>

          {/* Rows */}
          {rows.map((row, index) => (
            <motion.div
              key={row.metric}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{
                duration: 0.5,
                delay: index * 0.08,
                ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
              }}
              className={`grid grid-cols-[1fr_1fr_1fr] gap-4 px-6 py-4 items-center ${
                index < rows.length - 1 ? 'border-b border-[rgba(255,255,255,0.06)]' : ''
              }`}
            >
              <span className="text-[15px] font-medium text-white">{row.metric}</span>
              <span className="text-[15px] text-[#8A8A9A] text-center flex items-center justify-center gap-2">
                <X className="w-4 h-4 text-[#EF4444] shrink-0" />
                {row.human}
              </span>
              <motion.span
                initial={{ scale: 0.8 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true }}
                transition={{
                  duration: 0.3,
                  delay: index * 0.08 + 0.2,
                  type: 'spring',
                  stiffness: 300,
                }}
                className="text-[15px] text-[#22D3EE] text-center flex items-center justify-center gap-2 font-medium"
              >
                <Check className="w-4 h-4 text-[#10B981] shrink-0" />
                {row.ai}
              </motion.span>
            </motion.div>
          ))}
        </div>

        {/* Conclusion Banner */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-10 rounded-2xl p-6 text-center"
          style={{
            background: 'linear-gradient(180deg, rgba(79,110,247,0.08) 0%, rgba(123,97,255,0.04) 100%)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <p className="text-[18px] lg:text-[22px] font-semibold text-white">
            El agente IA no reemplaza a tu equipo. Lo potencia.
          </p>
        </motion.div>
      </div>
    </section>
  )
}
