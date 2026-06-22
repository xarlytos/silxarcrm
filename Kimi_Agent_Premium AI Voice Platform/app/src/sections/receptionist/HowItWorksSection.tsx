import { motion } from 'framer-motion'
import { PhoneIncoming, MessageSquare, UserPlus, PhoneForwarded } from 'lucide-react'

const steps = [
  {
    number: '01',
    icon: <PhoneIncoming className="w-6 h-6" />,
    title: 'Contesta en segundos',
    description:
      'Cada llamada es respondida en menos de 3 segundos con un saludo profesional personalizado para tu empresa. Nunca ocupado. Nunca fuera de horario. Nunca de vacaciones.',
  },
  {
    number: '02',
    icon: <MessageSquare className="w-6 h-6" />,
    title: 'Resuelve preguntas frecuentes',
    description:
      'Horarios, ubicación, servicios, precios, políticas. El agente responde las 50+ preguntas más comunes de tu negocio con información precisa y actualizada. Siempre.',
  },
  {
    number: '03',
    icon: <UserPlus className="w-6 h-6" />,
    title: 'Captura datos de cada llamada',
    description:
      'Nombre, teléfono, motivo de la llamada, interés mostrado. Cada interacción se registra automáticamente en tu CRM. Ningún lead se pierde por no haber anotado datos.',
  },
  {
    number: '04',
    icon: <PhoneForwarded className="w-6 h-6" />,
    title: 'Transfiere cuando es necesario',
    description:
      'Cuando la consulta requiere atención humana, el agente transfiere la llamada al departamento o persona correcta con todo el contexto de la conversación.',
  },
]

export default function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="relative py-[100px] lg:py-[140px]"
      style={{ background: '#F8F8FB' }}
    >
      <div className="max-w-[1280px] mx-auto px-6 lg:px-12">
        {/* Section Header */}
        <div className="mb-16">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-[12px] font-medium tracking-[0.1em] uppercase text-[#4F6EF7] mb-4"
          >
            COMO FUNCIONA
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
            className="text-[28px] sm:text-[36px] lg:text-[48px] font-semibold leading-[1.1] tracking-[-0.02em] max-w-[700px]"
            style={{ color: '#0A0A12' }}
          >
            Atiende cada llamada como tu mejor recepcionista
          </motion.h2>
        </div>

        {/* Steps Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{
                duration: 0.7,
                delay: index * 0.1,
                ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
              }}
              className="relative"
            >
              <div
                className="rounded-2xl p-8 border h-full"
                style={{
                  background: '#FFFFFF',
                  borderColor: 'rgba(0,0,0,0.08)',
                }}
              >
                {/* Step Number */}
                <div className="flex items-center justify-between mb-6">
                  <span className="text-[13px] font-bold text-[#4F6EF7]">{step.number}</span>
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ background: 'rgba(79,110,247,0.1)', color: '#4F6EF7' }}
                  >
                    {step.icon}
                  </div>
                </div>

                {/* Content */}
                <h3 className="text-[18px] font-semibold mb-3" style={{ color: '#0A0A12' }}>
                  {step.title}
                </h3>
                <p className="text-[14px] leading-relaxed" style={{ color: '#5A5A6A' }}>
                  {step.description}
                </p>
              </div>

              {/* Connecting line (except last) */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-1/2 -right-3 w-6 h-[2px] bg-[#4F6EF7] opacity-30" />
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
