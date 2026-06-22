import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus } from 'lucide-react'

interface FAQItem {
  question: string
  answer: string
}

const faqs: FAQItem[] = [
  {
    question: '¿Suena como un robot?',
    answer:
      'No. Utilizamos tecnología de síntesis de voz de última generación con matices, pausas naturales e inflexiones emocionales. La mayoría de los llamantes no distinguen la voz de una persona real. Puedes escuchar muestras antes de decidirte.',
  },
  {
    question: '¿Qué pasa con llamadas complejas que el agente no puede resolver?',
    answer:
      'El agente tiene tres niveles: (1) Consulta su base de conocimiento, (2) Pide 30 segundos para verificar información, (3) Transfiere a un humano con todo el resumen de la conversación. Nunca deja a un cliente sin respuesta.',
  },
  {
    question: '¿Puedo personalizar el saludo y las respuestas?',
    answer:
      'Totalmente. Personalizas el saludo, despedida, tono de voz, frases de transición y todas las respuestas a preguntas frecuentes. Puedes subir tu guion actual y el agente lo adapta.',
  },
  {
    question: '¿Cómo se integra con mi sistema telefónico actual?',
    answer:
      'Funcionamos con cualquier operador telefónico. Podemos asignarte un número nuevo o redirigir tu número actual al agente. También ofrecemos números locales en múltiples países. La configuración se hace en minutos.',
  },
  {
    question: '¿Captura realmente los datos de los leads?',
    answer:
      'Sí. Durante la llamada, el agente solicita nombre, teléfono, email y motivo de consulta. Todos los datos se registran automáticamente en tu CRM (HubSpot, Salesforce, Pipedrive, etc.) en tiempo real. Puedes revisar transcripciones completas.',
  },
  {
    question: '¿Cuántas llamadas puede atender a la vez?',
    answer:
      'Ilimitadas. Mientras una recepcionista humana atiende una llamada, el agente IA puede atender 10, 100 o 1.000 llamadas simultáneamente sin degradación de calidad. Nunca ocupado. Nunca en espera.',
  },
]

function AccordionItem({ item, index }: { item: FAQItem; index: number }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{
        duration: 0.5,
        delay: index * 0.06,
        ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
      }}
      className="border-b border-[rgba(255,255,255,0.06)]"
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-6 text-left group"
      >
        <span className="text-[18px] font-medium text-white pr-8 group-hover:text-[#4F6EF7] transition-colors">
          {item.question}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ duration: 0.3 }}
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
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <p className="text-[16px] text-[#8A8A9A] leading-relaxed pb-6">
              {item.answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function FAQSection() {
  return (
    <section id="faq" className="py-[100px] lg:py-[140px]" style={{ background: '#06060A' }}>
      <div className="max-w-[800px] mx-auto px-6 lg:px-12">
        {/* Section Header */}
        <div className="text-center mb-12">
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
            className="text-[28px] sm:text-[36px] lg:text-[48px] font-semibold text-white leading-[1.1] tracking-[-0.02em]"
          >
            Preguntas sobre la Receptionist Agent
          </motion.h2>
        </div>

        {/* Accordion */}
        <div>
          {faqs.map((faq, index) => (
            <AccordionItem key={index} item={faq} index={index} />
          ))}
        </div>
      </div>
    </section>
  )
}
