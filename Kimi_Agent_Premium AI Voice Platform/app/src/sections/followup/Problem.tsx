import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Clock, Snowflake, Unlink } from 'lucide-react'

const easeOutExpo = [0.16, 1, 0.3, 1] as [number, number, number, number]

const problems = [
  {
    icon: Clock,
    iconColor: 'text-[#F59E0B]',
    bgColor: 'bg-[rgba(245,158,11,0.15)]',
    title: 'El 44% de los vendedores se rinden despues del 1er intento',
    description:
      'La vida comercial es caotica. Un vendedor humano tiene docenas de leads activos, reuniones, tareas administrativas. El seguimiento sistematico es la primera victima.',
    stat: 'Solo el 8% hace 5+ contactos',
    statColor: 'text-[#F59E0B]',
  },
  {
    icon: Snowflake,
    iconColor: 'text-[#4F6EF7]',
    bgColor: 'bg-[rgba(79,110,247,0.15)]',
    title: 'Un lead no contactado en 48h pierde un 70% de interes',
    description:
      'El momento de interes es fugaz. Si no recontactas rapidamente, el lead olvida por que te contacto y sigue con su vida. Tu competencia si le llamo.',
    stat: '70% de interes perdido en 48h',
    statColor: 'text-[#4F6EF7]',
  },
  {
    icon: Unlink,
    iconColor: 'text-[#EF4444]',
    bgColor: 'bg-[rgba(239,68,68,0.15)]',
    title: 'El 73% de las empresas no tienen un proceso de nurturing definido',
    description:
      'Los leads no estan listos para comprar hoy. Sin un sistema de nurturing persistente, esas oportunidades futuras simplemente se evaporan.',
    stat: '50% de leads calificados compran en 12-18 meses',
    statColor: 'text-[#EF4444]',
  },
]

export default function Problem() {
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
          className="section-label text-[#F59E0B] mb-6"
        >
          EL PROBLEMA
        </motion.p>

        {/* Headline */}
        <motion.h2
          initial={{ opacity: 0, y: 40 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.1, ease: easeOutExpo }}
          className="text-[36px] sm:text-[48px] lg:text-[48px] font-semibold leading-[1.1] tracking-[-0.02em] text-white max-w-[680px] mb-16"
        >
          Tu CRM es un cementerio de oportunidades
        </motion.h2>

        {/* Problem Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {problems.map((card, i) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 40 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, delay: 0.15 + i * 0.15, ease: easeOutExpo }}
              className="glass-card"
            >
              <div
                className={`w-12 h-12 ${card.bgColor} rounded-xl flex items-center justify-center mb-5`}
              >
                <card.icon className={`w-6 h-6 ${card.iconColor}`} />
              </div>
              <h3 className="text-[22px] font-semibold text-white leading-[1.3] mb-3">
                {card.title}
              </h3>
              <p className="text-[16px] leading-[1.6] text-[#8A8A9A] mb-4">
                {card.description}
              </p>
              <p className={`text-[14px] font-semibold ${card.statColor}`}>{card.stat}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
