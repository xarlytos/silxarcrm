import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Globe, CheckSquare, ListOrdered, Smartphone, Settings, PieChart } from 'lucide-react'

const easeOutExpo = [0.16, 1, 0.3, 1] as [number, number, number, number]

const capabilities = [
  {
    icon: Globe,
    title: 'Citas a cualquier hora',
    description:
      'Tus clientes pueden pedir cita a las 3am. El agente esta siempre disponible. Agenda automaticamente en tu calendario sin intervencion humana.',
  },
  {
    icon: CheckSquare,
    title: 'Confirmacion sin esfuerzo',
    description:
      'Contacta automaticamente 24-48h antes por llamada, WhatsApp o SMS. Registra confirmaciones y alerta de posibles ausencias.',
  },
  {
    icon: ListOrdered,
    title: 'Cubre huecos cancelados al instante',
    description:
      'Cuando alguien cancela, el agente contacta automaticamente a personas de la lista de espera para cubrir ese hueco. Maximiza la ocupacion de tu agenda.',
  },
  {
    icon: Smartphone,
    title: 'Telefono, WhatsApp, Web y SMS',
    description:
      'Tus clientes pueden pedir cita por el canal que prefieran. El agente gestiona todos los canales desde una unica agenda centralizada.',
  },
  {
    icon: Settings,
    title: 'Configurado para tu negocio',
    description:
      'Duracion de citas, servicios disponibles, precios, profesionales, recursos necesarios. Todo adaptado a tu modelo de negocio especifico.',
  },
  {
    icon: PieChart,
    title: 'Metricas de tu agenda en tiempo real',
    description:
      'Tasa de ocupacion, ausencias, cancelaciones, ingresos por cita, horarios mas demandados. Datos para optimizar tu negocio.',
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
          className="text-[36px] sm:text-[48px] font-semibold leading-[1.1] tracking-[-0.02em] text-white max-w-[680px] mb-16"
        >
          Gestion de citas que parece magia
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
