import { motion } from 'framer-motion'
import { Download, Phone, Brain, Zap, RotateCcw, Target } from 'lucide-react'

const steps = [
  {
    number: '01',
    title: 'Captura',
    description: 'El agente recibe leads de tus fuentes: web, anuncios, CRM, formularios.',
    icon: Download,
  },
  {
    number: '02',
    title: 'Conversacion',
    description: 'Llama con voz natural indistinguible de un humano. Mantiene dialogos fluidos.',
    icon: Phone,
  },
  {
    number: '03',
    title: 'Memoria',
    description: 'Recuerda cada interaccion, preferencia y detalle. Nunca pregunta dos veces lo mismo.',
    icon: Brain,
  },
  {
    number: '04',
    title: 'Automatizacion',
    description: 'Ejecuta tareas automaticamente: envia emails, actualiza el CRM, programa citas.',
    icon: Zap,
  },
  {
    number: '05',
    title: 'Seguimiento',
    description: 'Persistente pero respetuoso. Recontacta en el momento optimo para cada lead.',
    icon: RotateCcw,
  },
  {
    number: '06',
    title: 'Resultado',
    description: 'Cita agendada, venta cerrada, oportunidad recuperada. Metricas claras.',
    icon: Target,
  },
]

export default function Solution() {
  return (
    <section id="solution" className="py-[100px] lg:py-[140px] bg-[#F8F8FB]">
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
            LA SOLUCI&Oacute;N
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
            className="text-[28px] sm:text-[36px] lg:text-[48px] font-semibold text-[#0A0A12] leading-[1.1] tracking-[-0.02em] mb-5"
          >
            Un empleado IA trabajando para ti en 6 pasos
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-[18px] text-[#5A5A6A] leading-relaxed"
          >
            Desde el primer contacto hasta el cierre. Tu agente IA captura, conversa,
            recuerda, automatiza y sigue hasta conseguir el resultado.
          </motion.p>
        </div>

        {/* Steps Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {steps.map((step, index) => {
            const Icon = step.icon
            return (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{
                  duration: 0.6,
                  delay: index * 0.1,
                  ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
                }}
                className="relative"
              >
                <div className="bg-white rounded-2xl p-8 border border-[rgba(0,0,0,0.08)] h-full hover:shadow-md transition-shadow duration-300">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="font-mono text-[14px] text-[#4F6EF7] font-medium">
                      {step.number}
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-[rgba(79,110,247,0.1)] flex items-center justify-center">
                      <Icon className="w-5 h-5 text-[#4F6EF7]" />
                    </div>
                  </div>
                  <h3 className="text-[20px] font-semibold text-[#0A0A12] mb-2">
                    {step.title}
                  </h3>
                  <p className="text-[15px] text-[#5A5A6A] leading-relaxed">
                    {step.description}
                  </p>
                </div>
                {/* Connecting line (except last) */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-3 w-6 h-[2px] bg-[rgba(79,110,247,0.2)]" />
                )}
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
