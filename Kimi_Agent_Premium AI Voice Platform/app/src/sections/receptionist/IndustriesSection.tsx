import { motion } from 'framer-motion'
import { HeartPulse, Hotel, UtensilsCrossed, Home, ShoppingBag, GraduationCap } from 'lucide-react'

const industries = [
  {
    icon: <HeartPulse className="w-6 h-6" />,
    title: 'Centros de salud',
    description:
      'Responde consultas de pacientes, informa de horarios y especialistas, deriva emergencias, captura datos de nuevos pacientes.',
  },
  {
    icon: <Hotel className="w-6 h-6" />,
    title: 'Hoteles y alojamientos',
    description:
      'Reservas, información de habitaciones, servicios, check-in/check-out. Atiende en el idioma del huésped. 24/7 sin coste extra.',
  },
  {
    icon: <UtensilsCrossed className="w-6 h-6" />,
    title: 'Restaurantes y hostelería',
    description:
      'Reservas de mesa, información de menú, horarios, eventos privados. Gestiona lista de espera y cancelaciones.',
  },
  {
    icon: <Home className="w-6 h-6" />,
    title: 'Inmobiliarias',
    description:
      'Información de propiedades, visitas, precios. Captura datos de compradores interesados. Clasifica por urgencia y presupuesto.',
  },
  {
    icon: <ShoppingBag className="w-6 h-6" />,
    title: 'Tiendas y comercios',
    description:
      'Horarios, stock, devoluciones, ubicación. Captura leads de clientes interesados en productos específicos.',
  },
  {
    icon: <GraduationCap className="w-6 h-6" />,
    title: 'Abogados, asesores, consultores',
    description:
      'Primera atención al cliente, captura de caso, información de servicios y tarifas. Deriva al profesional correcto.',
  },
]

export default function IndustriesSection() {
  return (
    <section
      id="industries"
      className="relative py-[100px] lg:py-[100px]"
      style={{ background: '#F8F8FB' }}
    >
      <div className="max-w-[1280px] mx-auto px-6 lg:px-12">
        {/* Section Header */}
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
          className="text-[28px] sm:text-[36px] lg:text-[48px] font-semibold leading-[1.1] tracking-[-0.02em] text-center mb-16 max-w-[800px] mx-auto"
          style={{ color: '#0A0A12' }}
        >
          Diseñado para cualquier negocio que reciba llamadas
        </motion.h2>

        {/* Industries Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {industries.map((industry, index) => (
            <motion.div
              key={industry.title}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{
                duration: 0.7,
                delay: index * 0.1,
                ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
              }}
              whileHover={{ y: -4 }}
              className="rounded-[20px] p-8 border transition-all duration-400 cursor-default group"
              style={{
                background: '#FFFFFF',
                borderColor: 'rgba(0,0,0,0.08)',
              }}
            >
              {/* Icon */}
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
                style={{ background: 'rgba(79,110,247,0.1)', color: '#4F6EF7' }}
              >
                {industry.icon}
              </div>

              {/* Content */}
              <h3 className="text-[18px] font-semibold mb-3" style={{ color: '#0A0A12' }}>
                {industry.title}
              </h3>
              <p className="text-[14px] leading-relaxed" style={{ color: '#5A5A6A' }}>
                {industry.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
