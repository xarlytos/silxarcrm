import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { CalendarPlus, CheckCircle, RefreshCw, Bell } from 'lucide-react'

const easeOutExpo = [0.16, 1, 0.3, 1] as [number, number, number, number]

const steps = [
  {
    number: '01',
    icon: CalendarPlus,
    title: 'Agenda citas automaticamente',
    description:
      'El paciente o cliente llama, envia WhatsApp o usa tu web. El agente consulta disponibilidad en tu calendario, propone horarios y confirma la cita al instante. Tambien fuera de horario comercial.',
  },
  {
    number: '02',
    icon: CheckCircle,
    title: 'Confirma asistencia previamente',
    description:
      '24-48h antes de la cita, el agente contacta automaticamente por llamada, WhatsApp o SMS para confirmar. Si el paciente confirma, registra la asistencia.',
  },
  {
    number: '03',
    icon: RefreshCw,
    title: 'Reagenda sin friccion',
    description:
      'Si el paciente no puede asistir, el agente propone nuevas fechas disponibles, reagenda al instante y ofrece el hueco liberado a alguien de la lista de espera.',
  },
  {
    number: '04',
    icon: Bell,
    title: 'Recordatorios inteligentes',
    description:
      'Envia recordatorios 24h antes y 2h antes de la cita por el canal preferido del paciente. Incluye direccion, instrucciones y opcion de reagendar.',
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
          className="text-[36px] sm:text-[48px] font-semibold leading-[1.1] tracking-[-0.02em] text-[#0A0A12] max-w-[800px] mb-16"
        >
          Agenda, confirma y reagenda sin intervencion humana
        </motion.h2>

        {/* Steps Grid - 2x2 */}
        <div className="grid md:grid-cols-2 gap-6">
          {steps.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.1 + i * 0.1, ease: easeOutExpo }}
              className="bg-white rounded-2xl p-8 border border-[rgba(0,0,0,0.08)] hover:shadow-lg transition-shadow duration-300"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-xl bg-[#F8F8FB] flex items-center justify-center">
                  <step.icon className="w-7 h-7 text-[#4F6EF7]" />
                </div>
                <span className="text-[32px] font-bold gradient-text">{step.number}</span>
              </div>
              <h3 className="text-[22px] font-semibold text-[#0A0A12] mb-3">{step.title}</h3>
              <p className="text-[16px] leading-[1.6] text-[#5A5A6A]">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
