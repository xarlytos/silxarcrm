import { motion } from 'framer-motion'
import { Wallet, Activity, AlertTriangle } from 'lucide-react'

const easeOutExpo = [0.16, 1, 0.3, 1] as [number, number, number, number]

const problems = [
  {
    icon: Wallet,
    iconColor: 'text-error',
    title: 'Un SDR humano cuesta 2.500\u20AC+ al mes',
    description: 'Salario base + comisiones + herramientas + formacion. Y eso si no se va en 6 meses. El coste real de un SDR incluye rotacion, absentismo y ramp-up time.',
    stat: 'Coste anual real: 45.000\u20AC+',
  },
  {
    icon: Activity,
    iconColor: 'text-warning',
    title: 'Un SDR humano realiza 30-50 llamadas al dia',
    description: 'Entre preparacion, descansos, reuniones internas y tareas administrativas, el tiempo real de prospeccion es menor del 40% de la jornada.',
    stat: 'Solo 3h de prospeccion real',
  },
  {
    icon: AlertTriangle,
    iconColor: 'text-text-primary',
    title: 'El 60% de los leads nunca reciben suficientes contactos',
    description: 'Un SDR humano olvida, se distrae, tiene malos dias. El seguimiento es inconsistente y la mayoria de las oportunidades se pierden por falta de persistencia.',
    stat: '5+ contactos necesarios para convertir',
  },
]

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.15 },
  },
}

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: easeOutExpo } },
}

export default function Problem() {
  return (
    <section className="relative bg-bg-primary overflow-hidden" style={{ padding: '140px 0' }}>
      {/* Subtle red gradient hint */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[radial-gradient(ellipse_at_center,rgba(239,68,68,0.08)_0%,transparent_70%)] pointer-events-none" />

      <div className="relative max-w-[1280px] mx-auto px-6 lg:px-12">
        {/* Section label */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5 }}
          className="section-label text-error mb-4"
        >
          EL PROBLEMA
        </motion.p>

        {/* Headline */}
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.7, ease: easeOutExpo }}
          className="text-[28px] sm:text-[36px] lg:text-[48px] font-semibold leading-[1.1] tracking-[-0.02em] text-white mb-16 max-w-[700px]"
        >
          La prospeccion manual esta matando tu crecimiento
        </motion.h2>

        {/* Problem Cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          className="grid md:grid-cols-3 gap-6"
        >
          {problems.map((problem, i) => {
            const Icon = problem.icon
            return (
              <motion.div
                key={i}
                variants={cardVariants}
                className="glass-card"
              >
                <div className="w-12 h-12 rounded-xl bg-bg-card-hover flex items-center justify-center mb-5">
                  <Icon className={`w-5 h-5 ${problem.iconColor}`} />
                </div>
                <h3 className="text-[22px] font-semibold text-white mb-3 leading-[1.3]">
                  {problem.title}
                </h3>
                <p className="text-[16px] leading-[1.6] text-text-secondary mb-4">
                  {problem.description}
                </p>
                <p className="text-[14px] font-medium text-accent-cyan">
                  {problem.stat}
                </p>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}
