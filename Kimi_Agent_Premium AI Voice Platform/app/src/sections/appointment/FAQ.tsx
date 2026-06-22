import { useRef, useState } from 'react'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import { Plus } from 'lucide-react'

const easeOutExpo = [0.16, 1, 0.3, 1] as [number, number, number, number]

const faqs = [
  {
    question: 'Se integra con mi sistema de agenda actual?',
    answer:
      'Si. Integraciones nativas con Google Calendar, Outlook, Calendly, Acuity, Treatwell, y la mayoria de software de gestion de citas. Tambien ofrecemos API para sistemas propietarios. La sincronizacion es bidireccional y en tiempo real.',
  },
  {
    question: 'Como reduce las ausencias?',
    answer:
      'Tres mecanismos: (1) Confirmacion automatica 24-48h antes por el canal preferido del paciente, (2) Recordatorios 2h antes de la cita, (3) Reagendamiento sin friccion cuando alguien cancela. La combinacion reduce ausencias un 50-60%.',
  },
  {
    question: 'Mis clientes saben que estan hablando con un agente IA?',
    answer:
      'El agente se identifica como asistente de agenda de tu negocio. La voz es natural y la conversacion fluida. La mayoria de los usuarios no distinguen la diferencia. La experiencia es profesional y eficiente.',
  },
  {
    question: 'Puedo definir diferentes tipos de citas y duraciones?',
    answer:
      'Totalmente. Configuras cada tipo de servicio con su duracion, recursos necesarios, profesional asignado, precio e instrucciones especificas. El agente gestiona automaticamente la disponibilidad de cada recurso.',
  },
  {
    question: 'Que pasa si dos personas piden la misma cita al mismo tiempo?',
    answer:
      'El sistema gestiona la concurrencia en tiempo real. La primera persona que confirma obtiene la cita. La segunda recibe automaticamente las siguientes opciones disponibles. No hay solapamientos.',
  },
  {
    question: 'Cuanto tarda en estar operativo?',
    answer:
      'Configuracion basica: 2-4 horas. Incluye conexion a tu calendario, configuracion de servicios, horarios y canales de comunicacion. Operativo al 100%: 24 horas. Incluimos formacion para tu equipo de recepcion.',
  },
]

function FAQItem({
  question,
  answer,
  isOpen,
  onToggle,
}: {
  question: string
  answer: string
  isOpen: boolean
  onToggle: () => void
}) {
  return (
    <div className="border-b border-[rgba(255,255,255,0.06)]">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between py-6 text-left group"
      >
        <span className="text-[18px] font-medium text-white group-hover:text-[#4F6EF7] transition-colors pr-4">
          {question}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ duration: 0.3, ease: easeOutExpo }}
          className="shrink-0"
        >
          <Plus className="w-5 h-5 text-[#4F6EF7]" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: easeOutExpo }}
            className="overflow-hidden"
          >
            <p className="text-[16px] leading-[1.6] text-[#8A8A9A] pb-6">{answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function FAQ() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-15%' })
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <section className="py-[100px] lg:py-[140px] bg-[#06060A]">
      <div className="max-w-[800px] mx-auto px-6 lg:px-12" ref={ref}>
        {/* Headline */}
        <motion.h2
          initial={{ opacity: 0, y: 40 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: easeOutExpo }}
          className="text-[36px] sm:text-[48px] font-semibold leading-[1.1] tracking-[-0.02em] text-white text-center mb-16"
        >
          Preguntas sobre el Appointment Agent
        </motion.h2>

        {/* FAQ Items */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2, ease: easeOutExpo }}
        >
          {faqs.map((faq, i) => (
            <FAQItem
              key={i}
              question={faq.question}
              answer={faq.answer}
              isOpen={openIndex === i}
              onToggle={() => setOpenIndex(openIndex === i ? null : i)}
            />
          ))}
        </motion.div>
      </div>
    </section>
  )
}
