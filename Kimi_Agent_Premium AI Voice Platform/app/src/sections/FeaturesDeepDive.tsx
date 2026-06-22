import { motion } from 'framer-motion'
import {
  Mic,
  Database,
  Link2,
  MessageCircle,
  Mail,
  Workflow,
  BrainCircuit,
  BarChart3,
  Shield,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface FeatureCard {
  icon: LucideIcon
  title: string
  description: string
}

const features: FeatureCard[] = [
  {
    icon: Mic,
    title: 'Voz indistinguible de humana',
    description:
      'Tecnologia de sintesis de voz de ultima generacion. Matices, pausas, emociones. Tu interlocutor no sabra que es IA.',
  },
  {
    icon: Database,
    title: 'Memoria a largo plazo',
    description:
      'Recuerda cada detalle de cada conversacion. Referencia informacion previa naturalmente. El contexto nunca se pierde.',
  },
  {
    icon: Link2,
    title: 'Integracion total con tu CRM',
    description:
      'HubSpot, Salesforce, Pipedrive, Zoho. Sincronizacion bidireccional en tiempo real. Sin trabajo manual.',
  },
  {
    icon: MessageCircle,
    title: 'WhatsApp Business',
    description:
      'El mismo agente gestiona llamadas Y mensajes de WhatsApp. Experiencia omnicanal unificada.',
  },
  {
    icon: Mail,
    title: 'Email y SMS automatizados',
    description:
      'Secuencias de seguimiento multicanal. El agente elige el canal optimo para cada contacto y momento.',
  },
  {
    icon: Workflow,
    title: 'Automatizacion inteligente',
    description:
      'Reglas, triggers, flujos de trabajo personalizados. El agente ejecuta tareas complejas sin intervencion humana.',
  },
  {
    icon: BrainCircuit,
    title: 'IA conversacional avanzada',
    description:
      'Entiende contexto, maneja objeciones, guia conversaciones hacia el objetivo. Aprende de cada interaccion.',
  },
  {
    icon: BarChart3,
    title: 'Analitica en tiempo real',
    description:
      'Dashboard completo con metricas de llamadas, conversiones, sentiment analysis. Datos accionables al instante.',
  },
  {
    icon: Shield,
    title: 'Seguridad empresarial',
    description:
      'Cumplimiento GDPR, encriptacion end-to-end, auditoria completa. Tus datos estan protegidos.',
  },
]

export default function FeaturesDeepDive() {
  return (
    <section id="features" className="py-[100px] lg:py-[140px] bg-[#06060A]">
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
            CARACTER&Iacute;STICAS
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
            className="text-[28px] sm:text-[36px] lg:text-[48px] font-semibold text-white leading-[1.1] tracking-[-0.02em]"
          >
            Tecnologia de vanguardia para conversaciones que convierten
          </motion.h2>
        </div>

        {/* Feature Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon
            // Determine wave pattern delay: 3x3 grid, wave from top-left
            const row = Math.floor(index / 3)
            const col = index % 3
            const waveDelay = (row + col) * 0.08

            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{
                  duration: 0.6,
                  delay: waveDelay,
                  ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
                }}
                className="glass-card group"
                style={{
                  background: 'linear-gradient(180deg, rgba(79,110,247,0.08) 0%, rgba(123,97,255,0.04) 100%)',
                }}
              >
                <motion.div
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{
                    duration: 0.4,
                    delay: waveDelay + 0.15,
                    type: 'spring',
                    stiffness: 200,
                  }}
                  className="w-12 h-12 rounded-xl bg-[rgba(255,255,255,0.05)] flex items-center justify-center mb-5"
                >
                  <Icon className="w-6 h-6 text-[#4F6EF7]" />
                </motion.div>
                <h3 className="text-[18px] font-semibold text-white mb-3">
                  {feature.title}
                </h3>
                <p className="text-[14px] text-[#8A8A9A] leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
