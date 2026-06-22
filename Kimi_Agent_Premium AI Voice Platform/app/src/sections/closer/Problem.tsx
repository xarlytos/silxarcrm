import { motion } from 'framer-motion'
import { DollarSign, TrendingDown, Users } from 'lucide-react'

const easeOutExpo = [0.16, 1, 0.3, 1] as [number, number, number, number]

const problems = [
  {
    icon: DollarSign,
    iconColor: 'text-error',
    title: 'Un closer senior cuesta 4.000\u20AC+ al mes + comisiones',
    description: 'Los mejores closers exigen salarios altos, comisiones generosas y condiciones favorables. Si se van, se llevan el know-how de cierre.',
    stat: 'Comisiones: 5-15% del deal',
  },
  {
    icon: TrendingDown,
    iconColor: 'text-warning',
    title: 'El rendimiento de un closer depende de su dia',
    description: 'Mal humor, resaca, problemas personales, fatiga. Un closer humano tiene dias buenos y malos. Los malos dias te cuestan miles en deals perdidos.',
    stat: 'Variacion de rendimiento: hasta 40%',
  },
  {
    icon: Users,
    iconColor: 'text-text-primary',
    title: 'No puedes clonar a tu mejor closer',
    description: 'Tu mejor closer solo puede hacer una demo a la vez. Contratar y formar a otro del mismo nivel lleva meses. El crecimiento se estanca.',
    stat: '1 demo a la vez vs ilimitadas',
  },
]

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15 } },
}

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: easeOutExpo } },
}

export default function Problem() {
  return (
    <section className="relative bg-bg-primary overflow-hidden" style={{ padding: '140px 0' }}>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[radial-gradient(ellipse_at_center,rgba(239,68,68,0.06)_0%,transparent_70%)] pointer-events-none" />

      <div className="relative max-w-[1280px] mx-auto px-6 lg:px-12">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5 }}
          className="section-label text-error mb-4"
        >
          EL PROBLEMA
        </motion.p>

        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.7, ease: easeOutExpo }}
          className="text-[28px] sm:text-[36px] lg:text-[48px] font-semibold leading-[1.1] tracking-[-0.02em] text-white mb-16 max-w-[750px]"
        >
          El 67% de las reuniones de ventas no se convierten en cliente
        </motion.h2>

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
              <motion.div key={i} variants={cardVariants} className="glass-card">
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
