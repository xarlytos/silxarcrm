import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Database, Users, Calendar } from 'lucide-react'

const easeOutExpo = [0.16, 1, 0.3, 1] as [number, number, number, number]

const useCases = [
  {
    icon: Database,
    title: 'Empresas con miles de leads olvidados',
    description:
      'Si tu CRM tiene mas de 1.000 contactos sin actividad reciente, tienes un tesoro enterrado. El Follow-Up Agent lo desentierra sistematicamente.',
  },
  {
    icon: Users,
    title: 'Equipos que priorizan leads nuevos',
    description:
      'Los vendedores se centran en leads calientes y olvidan los templados. El Follow-Up Agent se encarga de los seguimientos mientras tu equipo cierra deals frescos.',
  },
  {
    icon: Calendar,
    title: 'Negocios con ciclos de 3-12 meses',
    description:
      'Bienes raices, consultoria, software enterprise, formacion. El Follow-Up Agent mantiene el contacto durante todo el ciclo sin que el lead se enfrie.',
  },
]

export default function UseCases() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-15%' })

  return (
    <section className="py-[60px] lg:py-[100px] bg-[#F8F8FB]">
      <div className="max-w-[1280px] mx-auto px-6 lg:px-12" ref={ref}>
        {/* Headline */}
        <motion.h2
          initial={{ opacity: 0, y: 40 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: easeOutExpo }}
          className="text-[36px] sm:text-[48px] font-semibold leading-[1.1] tracking-[-0.02em] text-[#0A0A12] mb-16"
        >
          Quien necesita un Follow-Up Agent?
        </motion.h2>

        {/* Use Case Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {useCases.map((uc, i) => (
            <motion.div
              key={uc.title}
              initial={{ opacity: 0, y: 40 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: i * 0.12, ease: easeOutExpo }}
              className="bg-white rounded-2xl p-8 border border-[rgba(0,0,0,0.08)] hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
            >
              <div className="w-12 h-12 bg-[#F8F8FB] rounded-xl flex items-center justify-center mb-5">
                <uc.icon className="w-6 h-6 text-[#4F6EF7]" />
              </div>
              <h3 className="text-[22px] font-semibold text-[#0A0A12] leading-[1.3] mb-3">
                {uc.title}
              </h3>
              <p className="text-[16px] leading-[1.6] text-[#5A5A6A]">{uc.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
