import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus } from 'lucide-react'

const easeOutExpo = [0.16, 1, 0.3, 1] as [number, number, number, number]

const faqs = [
  {
    question: 'Como consigue los leads el SDR Agent?',
    answer: 'Integra tus fuentes actuales: formularios web, anuncios, LinkedIn, eventos, compra de bases de datos. Tambien puede generar listas de prospectos segun tu ICP (Ideal Customer Profile) usando bases de datos publicas y de terceros.',
  },
  {
    question: 'El SDR Agent puede sonar como mi empresa?',
    answer: 'Si. Personalizas el tono, vocabulario, frases de apertura y cierre. Puedes subir ejemplos de llamadas de tu equipo para que el agente adapte su estilo.',
  },
  {
    question: 'Que pasa si un lead no quiere hablar con un bot?',
    answer: 'El agente se identifica como asistente digital de tu empresa. La mayoria de los interlocutores no distinguen la voz. Si alguien prefiere un humano, la llamada se transfiere automaticamente con todo el contexto.',
  },
  {
    question: 'Puedo revisar las llamadas antes de que se hagan?',
    answer: 'En modo training, si. Una vez configurado y validado, el agente opera autonomamente. Siempre tienes acceso a grabaciones y transcripciones de todas las llamadas en tiempo real.',
  },
  {
    question: 'Como evita llamar a numeros en lista Robinson?',
    answer: 'Verificamos automaticamente contra listas de exclusion (Robinson, DNC) antes de cada llamada. Cumplimos con toda la normativa de proteccion de datos y llamadas comerciales.',
  },
  {
    question: 'Cuanto tarda en estar operativo?',
    answer: 'Configuracion inicial: 2-4 horas. Integracion con CRM: 1-2 horas. Primeras llamadas de prueba: mismo dia. Operativo al 100%: 24-48 horas.',
  },
]

function FAQItem({ question, answer, isOpen, onToggle }: {
  question: string
  answer: string
  isOpen: boolean
  onToggle: () => void
}) {
  return (
    <div className="border-b border-[rgba(255,255,255,0.06)]">
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full py-6 text-left group"
      >
        <span className="text-[18px] font-medium text-white group-hover:text-accent-blue transition-colors pr-4">
          {question}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ duration: 0.3 }}
          className="shrink-0"
        >
          <Plus className="w-5 h-5 text-accent-blue" />
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
            <p className="text-[16px] leading-[1.6] text-text-secondary pb-6">
              {answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <section className="bg-bg-elevated" style={{ padding: '140px 0' }}>
      <div className="max-w-[800px] mx-auto px-6 lg:px-12">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.7, ease: easeOutExpo }}
          className="text-[28px] sm:text-[36px] lg:text-[48px] font-semibold leading-[1.1] tracking-[-0.02em] text-white mb-16 text-center"
        >
          Preguntas sobre el SDR Agent
        </motion.h2>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
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
