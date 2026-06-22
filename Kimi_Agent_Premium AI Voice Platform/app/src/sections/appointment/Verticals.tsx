import { useRef, useState } from 'react'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import { Plus } from 'lucide-react'

const easeOutExpo = [0.16, 1, 0.3, 1] as [number, number, number, number]

const verticals = [
  {
    name: 'Clinicas Dentales',
    description:
      'Gestion de citas de revisiones, limpiezas, tratamientos. Recordatorios con instrucciones especificas (ayuno, documentacion). Confirmacion 48h antes.',
  },
  {
    name: 'Clinicas de Fisioterapia',
    description:
      'Reservas de sesiones, gestion de bajas medicas, seguimiento de tratamientos. Recordatorios de ejercicios entre sesiones.',
  },
  {
    name: 'Spas y Centros de Bienestar',
    description:
      'Reservas de tratamientos, gestion de paquetes, confirmaciones con instrucciones de preparacion. Upselling de tratamientos complementarios.',
  },
  {
    name: 'Centros de Formacion',
    description:
      'Gestion de clases, reservas de prueba, seguimiento de alumnos. Confirmaciones y recordatorios de material necesario.',
  },
  {
    name: 'Servicios a Domicilio',
    description:
      'Programacion de visitas, gestion de rutas, confirmaciones con direcciones. Notificacion al tecnico y al cliente.',
  },
]

function VerticalItem({
  name,
  description,
  isOpen,
  onToggle,
}: {
  name: string
  description: string
  isOpen: boolean
  onToggle: () => void
}) {
  return (
    <div className="border-b border-[rgba(0,0,0,0.08)]">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between py-5 text-left group"
      >
        <span className="text-[18px] font-medium text-[#0A0A12] group-hover:text-[#4F6EF7] transition-colors pr-4">
          {name}
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
            <p className="text-[16px] leading-[1.6] text-[#5A5A6A] pb-5">{description}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function Verticals() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-15%' })
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <section className="py-[60px] lg:py-[100px] bg-[#F8F8FB]">
      <div className="max-w-[1280px] mx-auto px-6 lg:px-12" ref={ref}>
        {/* Headline */}
        <motion.h2
          initial={{ opacity: 0, y: 40 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: easeOutExpo }}
          className="text-[36px] sm:text-[48px] font-semibold leading-[1.1] tracking-[-0.02em] text-[#0A0A12] mb-12"
        >
          Disenado para tu tipo de negocio
        </motion.h2>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2, ease: easeOutExpo }}
          className="bg-white rounded-2xl p-6 lg:p-8 border border-[rgba(0,0,0,0.08)]"
        >
          {verticals.map((v, i) => (
            <VerticalItem
              key={v.name}
              name={v.name}
              description={v.description}
              isOpen={openIndex === i}
              onToggle={() => setOpenIndex(openIndex === i ? null : i)}
            />
          ))}
        </motion.div>
      </div>
    </section>
  )
}
