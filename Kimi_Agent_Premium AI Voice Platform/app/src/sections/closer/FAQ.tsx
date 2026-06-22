import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus } from 'lucide-react'

const easeOutExpo = [0.16, 1, 0.3, 1] as [number, number, number, number]

const faqs = [
  {
    question: 'El Closer Agent puede hacer demos de productos tecnicos?',
    answer: 'Si. Le proporcionas documentacion, guiones de demo y preguntas frecuentes. El agente estudia tu producto y puede guiar al prospecto a traves de funcionalidades complejas, responder preguntas tecnicas y destacar el valor en funcion del caso de uso del lead.',
  },
  {
    question: 'Que pasa si el prospecto hace una pregunta que el agente no puede responder?',
    answer: 'El agente tiene tres niveles de escalado: (1) Pide 30 segundos para consultar documentacion, (2) Ofrece responder por email con detalle tecnico, (3) Transfiere a un experto humano con todo el contexto de la conversacion.',
  },
  {
    question: 'Puedo definir los descuentos y condiciones que el agente puede ofrecer?',
    answer: 'Totalmente. Configuras reglas de precio, descuentos maximos, condiciones de pago aceptables y bundles disponibles. El agente negocia dentro de estos parametros y nunca los sobrepasa.',
  },
  {
    question: 'Como maneja objeciones complejas como "ya tengo un proveedor"?',
    answer: 'El agente tiene scripts probados para las 45+ objeciones mas comunes. Para cada una, aplica tecnicas de reframe: agradece, valida, pregunta, presenta alternativa. Puedes personalizar cada respuesta segun tu metodologia de ventas.',
  },
  {
    question: 'Se integra con herramientas de firma electronica?',
    answer: 'Si. Integraciones nativas con DocuSign, PandaDoc, Signaturit y otras plataformas de firma. El agente puede enviar contratos durante o despues de la llamada y hacer seguimiento hasta la firma.',
  },
  {
    question: 'Puedo escuchar las demos que hace el agente?',
    answer: 'Todas las llamadas se graban y transcriben automaticamente. Tienes acceso en tiempo real a un dashboard con llamadas activas, grabaciones, transcripciones y analisis de sentiment.',
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
    <section className="bg-bg-primary" style={{ padding: '140px 0' }}>
      <div className="max-w-[800px] mx-auto px-6 lg:px-12">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.7, ease: easeOutExpo }}
          className="text-[28px] sm:text-[36px] lg:text-[48px] font-semibold leading-[1.1] tracking-[-0.02em] text-white mb-16 text-center"
        >
          Preguntas sobre el Closer Agent
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
