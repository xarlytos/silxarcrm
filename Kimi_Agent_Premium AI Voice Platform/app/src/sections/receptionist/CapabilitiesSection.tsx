import { motion } from 'framer-motion'
import { Mic, BookOpen, ClipboardList, GitBranch, Languages, Activity } from 'lucide-react'

const capabilities = [
  {
    icon: <Mic className="w-6 h-6" />,
    title: 'Voz que representa tu marca',
    description:
      'Elige tono profesional, amigable o formal. Personaliza el saludo, despedida y frases de transición. Tu agente suena exactamente como quieres que suene tu empresa.',
  },
  {
    icon: <BookOpen className="w-6 h-6" />,
    title: 'Responde preguntas de tu negocio',
    description:
      'Cargas tu FAQ, horarios, servicios, precios, políticas. El agente accede a toda la información en tiempo real y responde con precisión. Actualiza cuando quieras.',
  },
  {
    icon: <ClipboardList className="w-6 h-6" />,
    title: 'Ningún lead se escapa',
    description:
      'Solicita nombre, email, teléfono y motivo de consulta. Registra todo automáticamente en tu CRM. Transfiere leads urgentes a ventas en tiempo real.',
  },
  {
    icon: <GitBranch className="w-6 h-6" />,
    title: 'Transfiere al departamento correcto',
    description:
      'Ventas, soporte, facturación, dirección. El agente identifica la necesidad y transfiere con todo el contexto. Reduce tiempos de atención un 70%.',
  },
  {
    icon: <Languages className="w-6 h-6" />,
    title: 'Atiende en 30+ idiomas',
    description:
      'Detecta automáticamente el idioma del llamante y responde en ese idioma. Perfecto para negocios turísticos, internacionales o en zonas multiculturales.',
  },
  {
    icon: <Activity className="w-6 h-6" />,
    title: 'Métricas de cada llamada',
    description:
      'Volumen, duración, motivos de consulta, tasa de resolución, leads capturados, transferencias. Dashboard en tiempo real para optimizar tu atención.',
  },
]

export default function CapabilitiesSection() {
  return (
    <section
      id="capabilities"
      className="relative py-[100px] lg:py-[140px]"
      style={{ background: '#06060A' }}
    >
      {/* Subtle glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 50% 40% at 50% 30%, rgba(79,110,247,0.05) 0%, transparent 70%)',
        }}
      />

      <div className="relative z-10 max-w-[1280px] mx-auto px-6 lg:px-12">
        {/* Section Header */}
        <div className="mb-16">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-[12px] font-medium tracking-[0.1em] uppercase text-[#4F6EF7] mb-4"
          >
            CAPACIDADES
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
            className="text-[28px] sm:text-[36px] lg:text-[48px] font-semibold text-white leading-[1.1] tracking-[-0.02em] max-w-[700px]"
          >
            Todo lo que esperas de una recepcionista de élite
          </motion.h2>
        </div>

        {/* Bento Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {capabilities.map((cap, index) => (
            <motion.div
              key={cap.title}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{
                duration: 0.7,
                delay: index * 0.1,
                ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
              }}
              whileHover={{ y: -4 }}
              className="rounded-[20px] p-8 border border-[rgba(255,255,255,0.06)] transition-all duration-400 cursor-default group"
              style={{
                background:
                  'linear-gradient(180deg, rgba(79,110,247,0.08) 0%, rgba(123,97,255,0.04) 100%), #11111A',
              }}
            >
              {/* Icon */}
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 text-[#4F6EF7]"
                style={{ background: '#181825' }}
              >
                {cap.icon}
              </div>

              {/* Content */}
              <h3 className="text-[18px] font-semibold text-white mb-3">{cap.title}</h3>
              <p className="text-[14px] text-[#8A8A9A] leading-relaxed">{cap.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
