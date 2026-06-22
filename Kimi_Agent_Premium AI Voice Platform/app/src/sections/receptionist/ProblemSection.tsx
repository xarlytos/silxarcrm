import { motion } from 'framer-motion'
import { PhoneOff, Wallet, Frown } from 'lucide-react'

interface ProblemCardProps {
  icon: React.ReactNode
  title: string
  description: string
  stat: string
  tintColor: string
  delay: number
}

function ProblemCard({ icon, title, description, stat, tintColor, delay }: ProblemCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-100px' }}
      transition={{ duration: 0.7, delay: delay / 1000, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
      className="rounded-2xl p-8 border border-[rgba(255,255,255,0.06)]"
      style={{ background: tintColor }}
    >
      <div className="mb-4">{icon}</div>
      <h3 className="text-[18px] font-semibold text-white mb-3 leading-snug">{title}</h3>
      <p className="text-[14px] text-[#8A8A9A] leading-relaxed mb-4">{description}</p>
      <div className="pt-4 border-t border-[rgba(255,255,255,0.06)]">
        <p className="text-[13px] font-medium text-[#22D3EE]">{stat}</p>
      </div>
    </motion.div>
  )
}

export default function ProblemSection() {
  return (
    <section
      id="problem"
      className="relative py-[100px] lg:py-[140px]"
      style={{ background: '#06060A' }}
    >
      {/* Subtle red gradient at center */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 50% 50% at 50% 50%, rgba(239,68,68,0.03) 0%, transparent 70%)',
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
            className="text-[12px] font-medium tracking-[0.1em] uppercase text-[#EF4444] mb-4"
          >
            EL PROBLEMA
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
            className="text-[28px] sm:text-[36px] lg:text-[48px] font-semibold text-white leading-[1.1] tracking-[-0.02em] max-w-[800px]"
          >
            Cada llamada perdida es un cliente que llama a tu competencia
          </motion.h2>
        </div>

        {/* Problem Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          <ProblemCard
            icon={<PhoneOff className="w-8 h-8 text-[#EF4444]" />}
            title="El 34% de las llamadas a negocios nunca son contestadas"
            description="Fuera de horario, en horario comercial cuando la recepcionista está ocupada, durante reuniones, en días de baja. Tu teléfono suena y suena sin respuesta."
            stat="1 de cada 3 llamadas se pierde"
            tintColor="rgba(239,68,68,0.05)"
            delay={0}
          />
          <ProblemCard
            icon={<Wallet className="w-8 h-8 text-[#F59E0B]" />}
            title="Una recepcionista cuesta 1.800€+ al mes (y no cubre 24h)"
            description="Salario, seguridad social, sustitutos para vacaciones y bajas. Y aun así solo está disponible 40h/semana. Fuera de esas horas, las llamadas van al buzón."
            stat="Coste real anual: 28.000€+"
            tintColor="rgba(245,158,11,0.05)"
            delay={150}
          />
          <ProblemCard
            icon={<Frown className="w-8 h-8 text-white" />}
            title="El 70% de los clientes cuelga si no les atienden en 5 tonos"
            description="Buzón de voz, espera interminable, 'llame más tarde'. Cada mala experiencia telefónica daña tu marca y reduce la probabilidad de que vuelvan a llamar."
            stat="60% no vuelve a llamar tras una mala experiencia"
            tintColor="rgba(255,255,255,0.03)"
            delay={300}
          />
        </div>
      </div>
    </section>
  )
}
