import { motion } from 'framer-motion'
import { Mic, FileText, CheckCircle, Link, Repeat, BarChart3 } from 'lucide-react'

const easeOutExpo = [0.16, 1, 0.3, 1] as [number, number, number, number]

const capabilities = [
  {
    icon: Mic,
    title: 'Voz natural en 30+ idiomas',
    description: 'Espanol, ingles, aleman, frances, portugues y mas. Acentos regionales. Tu interlocutor no sabra que es IA.',
  },
  {
    icon: FileText,
    title: 'Scripts que tu controlas',
    description: 'Define el guion, tono, objeciones comunes y respuestas deseadas. Actualiza en tiempo real sin reentrenamiento.',
  },
  {
    icon: CheckCircle,
    title: 'Cualificacion en tiempo real',
    description: 'Aplica BANT, MEDDIC o tu propio framework. Solo agenda reuniones con leads que cumplen tus criterios.',
  },
  {
    icon: Link,
    title: 'Sincronizacion bidireccional',
    description: 'HubSpot, Salesforce, Pipedrive, Zoho. Cada interaccion se registra automaticamente. Tu pipeline siempre actualizado.',
  },
  {
    icon: Repeat,
    title: 'Hasta 12 intentos de contacto',
    description: 'Persistente pero respetuoso. Varia canales (llamada, email, WhatsApp) y horarios para maximizar tasa de contacto.',
  },
  {
    icon: BarChart3,
    title: 'Metricas de prospeccion',
    description: 'Tasa de contacto, cualificacion, conversion a reunion, sentiment analysis. Datos accionables para optimizar resultados.',
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
        {/* Section label */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5 }}
          className="section-label mb-4"
        >
          CAPACIDADES
        </motion.p>

        {/* Headline */}
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.7, ease: easeOutExpo }}
          className="text-[28px] sm:text-[36px] lg:text-[48px] font-semibold leading-[1.1] tracking-[-0.02em] text-white mb-16 max-w-[600px]"
        >
          Todo lo que tu SDR humano hace, y mas
        </motion.h2>

        {/* Bento Grid */}
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
              <motion.div
                key={i}
                variants={cardVariants}
                className="glass-card group"
              >
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
