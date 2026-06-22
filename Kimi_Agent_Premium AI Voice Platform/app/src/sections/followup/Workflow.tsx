import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Search, Tags, PhoneCall, HeartHandshake, Trophy } from 'lucide-react'

const easeOutExpo = [0.16, 1, 0.3, 1] as [number, number, number, number]

const steps = [
  {
    number: '01',
    icon: Search,
    title: 'Identifica oportunidades perdidas',
    description:
      'Analiza tu CRM y detecta leads sin contacto reciente, oportunidades estancadas, y prospects que mostraron interes pero nunca recibieron seguimiento.',
  },
  {
    number: '02',
    icon: Tags,
    title: 'Clasifica por potencial',
    description:
      'Prioriza leads segun scoring predictivo: interes previo, fit con ICP, tiempo desde ultimo contacto, y probabilidad de conversion.',
  },
  {
    number: '03',
    icon: PhoneCall,
    title: 'Recontacta en el canal optimo',
    description:
      'Llama, envia email o WhatsApp segun el perfil del lead y el momento. Varia el mensaje y el canal para maximizar respuesta sin ser invasivo.',
  },
  {
    number: '04',
    icon: HeartHandshake,
    title: 'Cultiva la relacion',
    description:
      'Envia contenido relevante, recordatorios de valor, casos de exito similares. Mantiene tu marca en la mente del lead hasta que este listo para comprar.',
  },
  {
    number: '05',
    icon: Trophy,
    title: 'Recupera la oportunidad',
    description:
      'Cuando el lead muestra senales de compra, agenda una reunion o transfiere a tu equipo de cierre con todo el historial de nurturing.',
  },
]

export default function Workflow() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-15%' })

  return (
    <section className="py-[100px] lg:py-[140px] bg-[#F8F8FB]">
      <div className="max-w-[1280px] mx-auto px-6 lg:px-12" ref={ref}>
        {/* Section Label */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, ease: easeOutExpo }}
          className="section-label text-[#4F6EF7] mb-6"
        >
          COMO FUNCIONA
        </motion.p>

        {/* Headline */}
        <motion.h2
          initial={{ opacity: 0, y: 40 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.1, ease: easeOutExpo }}
          className="text-[36px] sm:text-[48px] font-semibold leading-[1.1] tracking-[-0.02em] text-[#0A0A12] max-w-[680px] mb-16"
        >
          De oportunidad olvidada a cliente recuperado
        </motion.h2>

        {/* Steps */}
        <div className="space-y-6">
          {steps.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.1 + i * 0.1, ease: easeOutExpo }}
              className="flex gap-6 bg-white rounded-2xl p-6 lg:p-8 border border-[rgba(0,0,0,0.08)] hover:shadow-lg transition-shadow duration-300"
            >
              {/* Number + Icon */}
              <div className="flex flex-col items-center gap-2 shrink-0">
                <div className="w-14 h-14 rounded-xl bg-[#F8F8FB] flex items-center justify-center">
                  <step.icon className="w-7 h-7 text-[#4F6EF7]" />
                </div>
                <span className="text-[24px] font-bold gradient-text">{step.number}</span>
              </div>

              {/* Content */}
              <div className="flex-1">
                <h3 className="text-[22px] font-semibold text-[#0A0A12] mb-2">{step.title}</h3>
                <p className="text-[16px] leading-[1.6] text-[#5A5A6A]">{step.description}</p>
              </div>

              {/* Connector line (except last) */}
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute left-[68px] mt-[72px] h-[calc(100%+24px)] w-px bg-gradient-to-b from-[#4F6EF7] to-transparent" />
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
