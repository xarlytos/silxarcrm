import { motion } from 'framer-motion'
import { Check, X } from 'lucide-react'

const easeOutExpo = [0.16, 1, 0.3, 1] as [number, number, number, number]

const rows = [
  { feature: 'Llamadas diarias', human: '30-50', agent: '100+', highlight: true },
  { feature: 'Horario', human: '8h/dia', agent: '24/7', highlight: true },
  { feature: 'Coste mensual', human: '2.500\u20AC+', agent: '299\u20AC', highlight: true },
  { feature: 'Tiempo ramp-up', human: '2-3 meses', agent: '24 horas', highlight: true },
  { feature: 'Rotacion anual', human: '15-25%', agent: '0%', highlight: false },
  { feature: 'Seguimiento leads', human: 'Inconsistente', agent: 'Perfecto siempre', highlight: true },
  { feature: 'Multilingue', human: '1-2 idiomas', agent: '30+ idiomas', highlight: true },
  { feature: 'Llamadas simultaneas', human: '1', agent: 'Ilimitadas', highlight: true },
  { feature: 'Datos/Analytics', human: 'Limitados', agent: 'Completos', highlight: false },
  { feature: 'Escalado', human: 'Contratar + formar', agent: 'Click de boton', highlight: true },
]

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
}

const rowVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.5, ease: easeOutExpo } },
}

export default function Comparison() {
  return (
    <section className="bg-bg-primary" style={{ padding: '100px 0' }}>
      <div className="max-w-[900px] mx-auto px-6 lg:px-12">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.7, ease: easeOutExpo }}
          className="text-[28px] sm:text-[36px] lg:text-[48px] font-semibold leading-[1.1] tracking-[-0.02em] text-white mb-16 text-center"
        >
          SDR Humano vs SDR Agent IA
        </motion.h2>

        {/* Table Header */}
        <div className="grid grid-cols-[1fr_1fr_1fr] gap-4 pb-4 border-b border-[rgba(255,255,255,0.12)] mb-0">
          <span className="text-[12px] font-medium text-text-muted uppercase tracking-wider">Capacidad</span>
          <span className="text-[12px] font-medium text-text-muted uppercase tracking-wider text-center">SDR Humano</span>
          <span className="text-[12px] font-medium text-accent-cyan uppercase tracking-wider text-center">SDR Agent IA</span>
        </div>

        {/* Rows */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
        >
          {rows.map((row, i) => (
            <motion.div
              key={i}
              variants={rowVariants}
              className={`grid grid-cols-[1fr_1fr_1fr] gap-4 py-4 border-b border-[rgba(255,255,255,0.06)] items-center ${
                row.highlight ? '' : ''
              }`}
            >
              <span className="text-[15px] text-white font-medium">{row.feature}</span>
              <span className="text-[15px] text-text-secondary text-center flex items-center justify-center gap-2">
                {row.human === 'Inconsistente' || row.human === 'Limitados' ? (
                  <X className="w-4 h-4 text-error shrink-0" />
                ) : null}
                {row.human}
              </span>
              <span className="text-[15px] text-accent-cyan text-center flex items-center justify-center gap-2 font-medium">
                <Check className="w-4 h-4 text-success shrink-0" />
                {row.agent}
              </span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
