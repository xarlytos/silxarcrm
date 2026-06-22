import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { CalendarX, PhoneCall, Clock } from 'lucide-react'

const easeOutExpo = [0.16, 1, 0.3, 1] as [number, number, number, number]

const problems = [
  {
    icon: CalendarX,
    iconColor: 'text-[#EF4444]',
    bgColor: 'bg-[rgba(239,68,68,0.15)]',
    title: 'Una ausencia cuesta entre 50 EUR y 500 EUR dependiendo del sector',
    description:
      'Tiempo perdido del profesional, espacio infrautilizado, oportunidad de otro paciente/cliente perdida. Una clinica con 20% de ausencias pierde decenas de miles al ano.',
    stat: 'Tasa media de ausencias: 18-25%',
    statColor: 'text-[#EF4444]',
  },
  {
    icon: PhoneCall,
    iconColor: 'text-[#F59E0B]',
    bgColor: 'bg-[rgba(245,158,11,0.15)]',
    title: 'Tu equipo pierde 2-3 horas diarias confirmando citas',
    description:
      'Llamar a cada paciente/cliente para confirmar, reagendar los que no pueden, gestionar lista de espera. Trabajo manual que un agente IA hace en minutos.',
    stat: '15-30 minutos por cada 10 citas',
    statColor: 'text-[#F59E0B]',
  },
  {
    icon: Clock,
    iconColor: 'text-white',
    bgColor: 'bg-[rgba(255,255,255,0.08)]',
    title: 'El 40% de las llamadas a tu negocio son para pedir cita',
    description:
      'Tu recepcionista atiende llamadas de agendamiento en horario comercial. Fuera de ese horario, esas llamadas se pierden o dejan mensaje.',
    stat: '60% de llamadas fuera de horario se pierden',
    statColor: 'text-[#8A8A9A]',
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
          className="section-label text-[#EF4444] mb-6"
        >
          EL PROBLEMA
        </motion.p>

        {/* Headline */}
        <motion.h2
          initial={{ opacity: 0, y: 40 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.1, ease: easeOutExpo }}
          className="text-[36px] sm:text-[48px] font-semibold leading-[1.1] tracking-[-0.02em] text-white max-w-[680px] mb-16"
        >
          Las ausencias te cuestan mas de lo que crees
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
