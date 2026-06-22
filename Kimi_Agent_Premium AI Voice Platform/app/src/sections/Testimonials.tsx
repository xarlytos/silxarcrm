import { motion } from 'framer-motion'
import { Star } from 'lucide-react'

interface Testimonial {
  quote: string
  author: string
  role: string
  company: string
  avatar: string
}

const testimonials: Testimonial[] = [
  {
    quote:
      'Implementamos el SDR Agent y en 30 dias habiamos triplicado las reuniones agendadas. Nuestro equipo humano se pudo centrar en cerrar en lugar de prospectar.',
    author: 'Carlos Mendez',
    role: 'Director Comercial',
    company: 'TechFlow Solutions',
    avatar: '/testimonial-avatar-1.jpg',
  },
  {
    quote:
      'El Follow-Up Agent recupero un 23% de oportunidades que habiamos dado por perdidas. Es como tener un vendedor que nunca se olvida de nadie.',
    author: 'Laura Sanchez',
    role: 'Head of Sales',
    company: 'NovaCRM',
    avatar: '/testimonial-avatar-2.jpg',
  },
  {
    quote:
      'Nuestra clinica redujo las ausencias un 47% con el Appointment Agent. La recepcionista IA confirma citas y reagenda automaticamente.',
    author: 'Miguel Angel Ruiz',
    role: 'CEO',
    company: 'Centro Medico Salus',
    avatar: '/testimonial-avatar-3.jpg',
  },
]

function StarRating({ delay = 0 }: { delay?: number }) {
  return (
    <div className="flex items-center gap-1">
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{
            duration: 0.3,
            delay: delay + i * 0.1,
            type: 'spring',
            stiffness: 300,
          }}
        >
          <Star className="w-4 h-4 fill-[#22D3EE] text-[#22D3EE]" />
        </motion.div>
      ))}
    </div>
  )
}

export default function Testimonials() {
  return (
    <section id="testimonials" className="py-[100px] lg:py-[140px] bg-[#F8F8FB]">
      <div className="max-w-[1280px] mx-auto px-6 lg:px-12">
        {/* Section Header */}
        <div className="text-center max-w-[680px] mx-auto mb-16">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="section-label mb-4"
          >
            TESTIMONIOS
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
            className="text-[28px] sm:text-[36px] lg:text-[48px] font-semibold text-[#0A0A12] leading-[1.1] tracking-[-0.02em]"
          >
            Lo que dicen nuestros clientes
          </motion.h2>
        </div>

        {/* Testimonial Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.author}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{
                duration: 0.6,
                delay: index * 0.15,
                ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
              }}
              className="bg-white rounded-2xl p-8 border border-[rgba(0,0,0,0.08)]"
            >
              {/* Stars */}
              <StarRating delay={index * 0.15 + 0.3} />

              {/* Quote */}
              <p className="mt-5 text-[16px] text-[#0A0A12] leading-relaxed mb-6">
                <span className="text-[#4F6EF7] text-[24px] leading-none">&ldquo;</span>
                {testimonial.quote}
              </p>

              {/* Author */}
              <div className="flex items-center gap-3">
                <img
                  src={testimonial.avatar}
                  alt={testimonial.author}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div>
                  <p className="text-[14px] font-semibold text-[#0A0A12]">
                    {testimonial.author}
                  </p>
                  <p className="text-[13px] text-[#5A5A6A]">
                    {testimonial.role}, {testimonial.company}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Trust Indicators */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="flex flex-wrap items-center justify-center gap-6 lg:gap-10"
        >
          {[
            { value: '500+', label: 'empresas' },
            { value: '2.4M+', label: 'llamadas gestionadas' },
            { value: '98.7%', label: 'satisfaccion' },
          ].map((stat, i) => (
            <div key={stat.label} className="flex items-center gap-3">
              {i > 0 && (
                <span className="hidden sm:block w-1.5 h-1.5 rounded-full bg-[#4F6EF7]" />
              )}
              <span className="text-[18px] font-semibold text-[#0A0A12]">
                {stat.value}
              </span>
              <span className="text-[15px] text-[#5A5A6A]">{stat.label}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
