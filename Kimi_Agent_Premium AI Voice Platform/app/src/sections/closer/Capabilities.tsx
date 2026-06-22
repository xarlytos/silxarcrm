import { motion } from 'framer-motion'
import { Presentation, Shield, Scale, Brain, Layers, TrendingUp } from 'lucide-react'

const easeOutExpo = [0.16, 1, 0.3, 1] as [number, number, number, number]

const capabilities = [
  {
    icon: Presentation,
    title: 'Demos adaptadas a cada prospecto',
    description: 'Investiga al lead antes de la llamada y personaliza el enfoque. Muestra solo lo relevante, en el orden correcto, con el tono adecuado.',
  },
  {
    icon: Shield,
    title: '45+ objeciones manejadas nativamente',
    description: 'Demasiado caro, necesito pensarlo, ya tengo un proveedor, no tengo presupuesto. Cada objecion tiene una respuesta probada y personalizable.',
  },
  {
    icon: Scale,
    title: 'Negocia dentro de tus parametros',
    description: 'Define descuentos maximos, condiciones flexibles y limites. El agente negocia para maximizar valor sin salirse de tus margenes.',
  },
  {
    icon: Brain,
    title: 'Recuerda cada detalle',
    description: 'Accede al historial completo de interacciones del lead. Referencia conversaciones previas, preferencias expresadas y compromisos adquiridos.',
  },
  {
    icon: Layers,
    title: 'Cierra por telefono, email o WhatsApp',
    description: 'Algunos deals se cierran en la llamada. Otros requieren seguimiento por email o WhatsApp. El agente elige el canal optimo para cada situacion.',
  },
  {
    icon: TrendingUp,
    title: 'Metricas de cierre en tiempo real',
    description: 'Tasa de conversion por etapa, objeciones mas frecuentes, tiempo medio de cierre. Datos para optimizar tu proceso de ventas continuamente.',
  },
]

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
}

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: easeOutExpo } },
}

export default function Capabilities() {
  return (
    <section className="bg-bg-primary" style={{ padding: '140px 0' }}>
      <div className="max-w-[1280px] mx-auto px-6 lg:px-12">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5 }}
          className="section-label mb-4"
        >
          CAPACIDADES
        </motion.p>

        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.7, ease: easeOutExpo }}
          className="text-[28px] sm:text-[36px] lg:text-[48px] font-semibold leading-[1.1] tracking-[-0.02em] text-white mb-16 max-w-[600px]"
        >
          Un closer de elite, disponible 24/7
        </motion.h2>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {capabilities.map((cap, i) => {
            const Icon = cap.icon
            return (
              <motion.div key={i} variants={cardVariants} className="glass-card group">
                <div className="w-12 h-12 rounded-xl bg-bg-card-hover flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                  <Icon className="w-5 h-5 text-accent-blue" />
                </div>
                <h3 className="text-[22px] font-semibold text-white mb-3 leading-[1.3]">
                  {cap.title}
                </h3>
                <p className="text-[15px] leading-[1.6] text-text-secondary">
                  {cap.description}
                </p>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}
