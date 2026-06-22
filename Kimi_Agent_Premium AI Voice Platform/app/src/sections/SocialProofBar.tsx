import { motion } from 'framer-motion'
import { TrendingUp, Users, Zap } from 'lucide-react'

export default function SocialProofBar() {
  const stats = [
    { icon: Users, label: '8,642+', description: 'empresas confían en nosotros' },
    { icon: TrendingUp, label: '€4.2M+', description: 'en ingresos generados' },
    { icon: Zap, label: '€1.8B+', description: 'en pipeline creado' },
  ]

  return (
    <section className="py-8 lg:py-12 bg-gradient-to-b from-[#06060A] to-[#0A0A12] border-b border-[#4F6EF7]/10">
      <div className="max-w-[1280px] mx-auto px-6 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="grid grid-cols-3 gap-8 lg:gap-16"
        >
          {stats.map((stat, i) => {
            const Icon = stat.icon
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <div className="flex justify-center mb-3">
                  <Icon className="w-6 h-6 text-[#4F6EF7]" />
                </div>
                <p className="text-[24px] lg:text-[32px] font-bold text-white mb-1">
                  {stat.label}
                </p>
                <p className="text-[13px] lg:text-[14px] text-[#8A8A9A]">
                  {stat.description}
                </p>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}
