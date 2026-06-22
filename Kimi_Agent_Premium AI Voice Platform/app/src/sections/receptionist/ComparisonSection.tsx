import { motion } from 'framer-motion'
import { X, Check } from 'lucide-react'

const comparisonRows = [
  { capability: 'Horario', human: '40h/semana', ai: '168h/semana', highlight: 'ai' },
  { capability: 'Coste mensual', human: '1.800€+', ai: '299€', highlight: 'ai' },
  { capability: 'Tiempo de respuesta', human: '5-15 segundos', ai: '< 3 segundos', highlight: 'ai' },
  { capability: 'Llamadas simultáneas', human: '1', ai: 'Ilimitadas', highlight: 'ai' },
  { capability: 'Ausencias', human: 'Vacaciones, bajas, festivos', ai: '0%', highlight: 'ai' },
  { capability: 'Preguntas resueltas', human: 'Depende del día', ai: '100% consistentes', highlight: 'ai' },
  { capability: 'Leads capturados', human: 'Manual, inconsistente', ai: 'Automático, perfecto', highlight: 'ai' },
  { capability: 'Idiomas', human: '1-2', ai: '30+', highlight: 'ai' },
  { capability: 'Datos/Analytics', human: 'Limitados', ai: 'Completos', highlight: 'ai' },
  { capability: 'Escalado', human: 'Contratar más personal', ai: 'Click de botón', highlight: 'ai' },
]

export default function ComparisonSection() {
  return (
    <section
      id="comparison"
      className="relative py-[100px] lg:py-[140px]"
      style={{ background: '#0C0C14' }}
    >
      <div className="max-w-[900px] mx-auto px-6 lg:px-12">
        {/* Section Header */}
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
          className="text-[28px] sm:text-[36px] lg:text-[48px] font-semibold text-white leading-[1.1] tracking-[-0.02em] text-center mb-16"
        >
          Recepcionista humana vs{' '}
          <span className="gradient-text">Receptionist Agent IA</span>
        </motion.h2>

        {/* Comparison Table */}
        <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] overflow-hidden">
          {/* Table Header */}
          <div
            className="grid grid-cols-[1fr_1fr_1fr] gap-4 p-5 border-b border-[rgba(255,255,255,0.06)]"
            style={{ background: 'rgba(79,110,247,0.08)' }}
          >
            <span className="text-[13px] font-semibold text-[#5A5A6A] uppercase tracking-wider">
              Capacidad
            </span>
            <span className="text-[13px] font-semibold text-[#5A5A6A] uppercase tracking-wider text-center">
              Recepcionista Humana
            </span>
            <span className="text-[13px] font-semibold text-[#4F6EF7] uppercase tracking-wider text-center">
              Receptionist Agent IA
            </span>
          </div>

          {/* Table Rows */}
          {comparisonRows.map((row, index) => (
            <motion.div
              key={row.capability}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{
                duration: 0.5,
                delay: index * 0.08,
                ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
              }}
              className={`grid grid-cols-[1fr_1fr_1fr] gap-4 p-5 items-center ${
                index < comparisonRows.length - 1 ? 'border-b border-[rgba(255,255,255,0.06)]' : ''
              }`}
              style={{
                background: row.highlight === 'ai' ? 'rgba(79,110,247,0.03)' : 'transparent',
              }}
            >
              <span className="text-[15px] font-medium text-white">{row.capability}</span>
              <span className="text-[15px] text-[#8A8A9A] text-center flex items-center justify-center gap-2">
                <X className="w-4 h-4 text-[#EF4444] shrink-0" />
                {row.human}
              </span>
              <span className="text-[15px] text-[#22D3EE] text-center flex items-center justify-center gap-2 font-medium">
                <Check className="w-4 h-4 text-[#10B981] shrink-0" />
                {row.ai}
              </span>
            </motion.div>
          ))}
        </div>

        {/* Bottom Note */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="text-center text-[14px] text-[#5A5A6A] mt-8"
        >
          Ahorro medio con Receptionist Agent:{' '}
          <span className="text-[#22D3EE] font-semibold">18.000€/año</span> por puesto de
          recepción
        </motion.p>
      </div>
    </section>
  )
}
