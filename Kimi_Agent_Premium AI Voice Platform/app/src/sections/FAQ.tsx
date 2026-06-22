import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus } from 'lucide-react'

interface FAQItem {
  question: string
  answer: string
}

const faqs: FAQItem[] = [
  {
    question: 'Como es la voz del agente? Suena robotico?',
    answer:
      'No. Utilizamos tecnologia de sintesis de voz de ultima generacion que reproduce matices, pausas naturales e inflexiones. La mayoria de las personas no distinguen nuestra voz de una humana. Puedes escuchar una demo antes de decidirte.',
  },
  {
    question: 'Cuanto tarda en estar operativo mi agente?',
    answer:
      'Desde la configuracion inicial hasta la primera llamada: menos de 24 horas. Tu agente se integra con tu CRM, aprende tu guion de ventas y esta listo para trabajar el mismo dia.',
  },
  {
    question: 'Puedo personalizar el guion y las respuestas?',
    answer:
      'Totalmente. Define el guion, las objeciones comunes, las respuestas deseadas y el tono de voz. Tu agente seguira tus instrucciones al pie de la letra y mejorara con el tiempo.',
  },
  {
    question: 'Que pasa si el lead tiene una pregunta compleja?',
    answer:
      'El agente esta entrenado para manejar conversaciones complejas. Si encuentra una situacion que no puede resolver, escalada automaticamente a un humano con todo el contexto de la conversacion.',
  },
  {
    question: 'Se integra con mi CRM actual?',
    answer:
      'Si. Integraciones nativas con HubSpot, Salesforce, Pipedrive, Zoho, Monday.com y mas. Tambien ofrecemos API para integraciones personalizadas.',
  },
  {
    question: 'Es legal usar agentes de voz IA para llamadas comerciales?',
    answer:
      'Si, cumplimos con todas las regulaciones vigentes incluyendo GDPR, LOPD y normativas de llamadas comerciales. Configuramos identificacion automatica y opciones de opt-out.',
  },
  {
    question: 'Cuantos idiomas soporta?',
    answer:
      'Actualmente mas de 30 idiomas con acentos regionales. Espanol (Espana, Mexico, Argentina), ingles (US, UK), aleman, frances, portugues, italiano y muchos mas.',
  },
  {
    question: 'Puedo tener multiples agentes trabajando a la vez?',
    answer:
      'Si. Despliega un equipo completo: un SDR para prospectar, un Closer para cerrar, un Follow-Up para recuperar oportunidades. Todos coordinados y compartiendo contexto.',
  },
  {
    question: 'Que pasa si no me gusta el servicio?',
    answer:
      'Ofrecemos 14 dias de prueba gratuita sin tarjeta de credito. Si no estas satisfecho, cancelas sin compromiso. No hacemos preguntas.',
  },
  {
    question: 'Cual es el precio?',
    answer:
      'Desde 299\u20ac/mes por agente. Sin costes de configuracion. Sin permanencia. Incluye llamadas ilimitadas, todas las integraciones y soporte prioritario. Para equipos grandes, tenemos planes empresariales personalizados.',
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
      className="border-b border-[rgba(255,255,255,0.06)] transition-all duration-300"
    >
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-5 lg:py-6 text-left group"
        whileHover={{ paddingLeft: 4, paddingRight: 4 }}
        transition={{ duration: 0.2 }}
      >
        <motion.span
          className="text-[16px] sm:text-[18px] font-medium text-white pr-4 lg:pr-8 flex-1 group-hover:text-[#4F6EF7] transition-colors duration-300"
          animate={{ x: isOpen ? 4 : 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          {item.question}
        </motion.span>
        <motion.div
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{
            duration: 0.4,
            ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number],
            type: 'spring',
            stiffness: 120,
            damping: 14,
          }}
          className="shrink-0 flex items-center justify-center w-6 h-6"
        >
          <Plus className="w-5 h-5 text-[#4F6EF7] transition-colors duration-300 group-hover:text-[#6B7FFF]" />
        </motion.div>
      </motion.button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              height: { duration: 0.4, ease: [0.4, 0, 0.2, 1] },
              opacity: { duration: 0.3, ease: 'easeOut' },
            }}
            className="overflow-hidden"
          >
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{
                delay: 0.15,
                duration: 0.3,
                ease: [0.23, 1, 0.320, 1] as [number, number, number, number],
              }}
              className="pb-6 lg:pb-8"
            >
              <p className="text-[15px] sm:text-[16px] text-[#8A8A9A] leading-relaxed lg:leading-[1.8]">
                {item.answer}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function FAQ() {
  return (
    <section id="faq" className="py-[80px] lg:py-[120px] bg-[#06060A]">
      <div className="max-w-[800px] mx-auto px-6 lg:px-12">
        {/* Section Header */}
        <div className="text-center mb-16 lg:mb-20">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="section-label mb-4 tracking-widest"
          >
            PREGUNTAS FRECUENTES
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{
              duration: 0.7,
              delay: 0.1,
              ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
            }}
            className="text-[28px] sm:text-[36px] lg:text-[48px] font-semibold text-white leading-[1.1] tracking-[-0.02em]"
          >
            Todo lo que necesitas saber
          </motion.h2>
        </div>

        {/* Accordion */}
        <div className="space-y-px">
          {faqs.map((faq, index) => (
            <AccordionItem key={index} item={faq} index={index} />
          ))}
        </div>
      </div>
    </section>
  )
}
