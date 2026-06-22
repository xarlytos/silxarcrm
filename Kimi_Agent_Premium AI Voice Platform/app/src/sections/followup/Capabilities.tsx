import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Radar, Gauge, Layers, Timer, Sparkles, BarChart2 } from 'lucide-react'

const easeOutExpo = [0.16, 1, 0.3, 1] as [number, number, number, number]

const capabilities = [
  {
    icon: Radar,
    title: 'Detecta oportunidades olvidadas',
    description:
      'Escanea tu CRM continuamente y detecta leads sin contacto, oportunidades estancadas, y contactos que necesitan reactivacion. Nunca se pierde una oportunidad.',
  },
  {
    icon: Gauge,
    title: 'Prioriza por potencial de conversion',
    description:
      'Algoritmo de scoring que evalua cada lead segun interacciones previas, fit con ICP, comportamiento y timing. Enfocate en los leads que realmente van a convertir.',
  },
  {
    icon: Layers,
    title: 'Llamada + Email + WhatsApp + SMS',
    description:
      'Secuencias de seguimiento que alternan canales segun el perfil del lead. Dia 1: Llamada. Dia 3: Email. Dia 7: WhatsApp. Optimizado para respuesta.',
  },
  {
    icon: Timer,
    title: 'Contacta en el momento exacto',
    description:
      'Analiza patrones de respuesta y contacta cada lead en el dia y hora optimos. No mas llamadas a las 9am de un lunes o emails a medianoche.',
  },
  {
    icon: Sparkles,
    title: 'Mensajes que parecen escritos a mano',
    description:
      'Cada mensaje se personaliza con datos del lead: nombre, empresa, sector, interacciones previas. No parece automatizado porque no lo es a nivel de contenido.',
  },
  {
    icon: BarChart2,
    title: 'Metricas de recuperacion claras',
    description:
      'Tasa de recuperacion, canales mas efectivos, tiempo medio de recuperacion, revenue recuperado. Todo en un dashboard en tiempo real.',
  },
]

export default function Capabilities() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-15%' })

  return (
    <section className="py-[100px] lg:py-[140px] bg-[#06060A]">
      <div className="max-w-[1280px] mx-auto px-6 lg:px-12" ref={ref}>
        {/* Section Label */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, ease: easeOutExpo }}
          className="section-label mb-6"
        >
          CAPACIDADES
        </motion.p>

        {/* Headline */}
        <motion.h2
          initial={{ opacity: 0, y: 40 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.1, ease: easeOutExpo }}
          className="text-[36px] sm:text-[48px] font-semibold leading-[1.1] tracking-[-0.02em] text-white max-w-[800px] mb-16"
        >
          El seguimiento que nunca se olvida, nunca se cansa, nunca se rinde
        </motion.h2>

        {/* Bento Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {capabilities.map((cap, i) => (
            <motion.div
              key={cap.title}
              initial={{ opacity: 0, y: 40 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.1 + i * 0.1, ease: easeOutExpo }}
              className="glass-card group"
            >
              <div className="w-12 h-12 bg-[#181825] rounded-xl flex items-center justify-center mb-5 group-hover:bg-[rgba(79,110,247,0.15)] transition-colors duration-300">
                <cap.icon className="w-6 h-6 text-[#4F6EF7]" />
              </div>
              <h3 className="text-[22px] font-semibold text-white leading-[1.3] mb-3">
                {cap.title}
              </h3>
              <p className="text-[16px] leading-[1.6] text-[#8A8A9A]">{cap.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
