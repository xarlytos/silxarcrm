import { useRef, useState } from 'react'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import { Plus } from 'lucide-react'

const easeOutExpo = [0.16, 1, 0.3, 1] as [number, number, number, number]

const faqs = [
  {
    question: 'Como encuentra las oportunidades perdidas?',
    answer:
      'El agente se conecta a tu CRM (HubSpot, Salesforce, Pipedrive, etc.) y analiza tu base de datos. Detecta leads sin contacto en X dias, oportunidades en etapas estancadas, contactos archivados sin actividad reciente. Tu defines los criterios.',
  },
  {
    question: 'No es molesto contactar a alguien que no respondio hace meses?',
    answer:
      'El agente disena mensajes que no parecen seguimientos atrasados. Usa excusas contextuales: "Hemos lanzado una funcion que encaja con tu caso", "Un cliente similar obtuvo X resultado". Siempre aporta valor, nunca pide disculpas por contactar.',
  },
  {
    question: 'Cuantas veces contacta a cada lead?',
    answer:
      'Totalmente configurable. Por defecto: hasta 12 contactos distribuidos en 90 dias, alternando canales. Puedes ajustar frecuencia, canales, y condiciones de parada. El agente respeta las respuestas negativas y los opt-out automaticamente.',
  },
  {
    question: 'Puedo ver que leads va a contactar antes de que lo haga?',
    answer:
      'Si. El modo revision te muestra la lista de leads planificados, los mensajes que enviara, y te permite aprobar, editar o eliminar contactos antes de que se ejecute.',
  },
  {
    question: 'Que pasa si un lead responde negativamente?',
    answer:
      'El agente detecta respuestas negativas y para el seguimiento automaticamente. Registra el motivo y clasifica el lead. Si la respuesta es ambigua, aplica una ultima secuencia de recuperacion suave antes de archivar.',
  },
  {
    question: 'Cuanto revenue puedo esperar recuperar?',
    answer:
      'Depende del tamano de tu CRM y tu ticket medio. Clientes con 5.000+ leads archivados y ticket medio de 5.000 EUR+ suelen recuperar entre 100K EUR y 500K EUR anuales. Te damos una estimacion gratuita antes de empezar.',
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
          Preguntas sobre el Follow-Up Agent
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
