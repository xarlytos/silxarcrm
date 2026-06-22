import { motion } from 'framer-motion'
import { ArrowRight, Star, TrendingUp } from 'lucide-react'

const caseStudies = [
  {
    id: 1,
    company: 'DataPro',
    role: 'VP Sales',
    author: 'Ana García',
    metric: '4x Más reuniones',
    improvement: 'De 12 a 47 reuniones/semana',
    quote: 'Pasamos de 12 reuniones por semana a 47. Nuestro equipo solo cierra ahora. El agente IA hace todo el trabajo de prospección.',
    savings: '€156.000/año',
    result: 'Incremento de 300% en pipeline',
  },
  {
    id: 2,
    company: 'TechFlow',
    role: 'Sales Director',
    author: 'Carlos López',
    metric: '73% Reducción de costes',
    improvement: 'Eliminó 3 SDRs sin perder volumen',
    quote: 'Reemplazamos nuestro equipo de SDRs con agentes IA. Los resultados han sido increíbles sin ningún compromiso en calidad.',
    savings: '€240.000/año',
    result: 'Margen operativo +18%',
  },
  {
    id: 3,
    company: 'NovaCRM',
    role: 'CEO',
    author: 'María Rodríguez',
    metric: '5x Más leads',
    improvement: 'Prospección 24/7 automática',
    quote: 'Los agentes IA nos permitieron escalar sin escalar costos. Ahora tenemos capacidad de 500+ contactos diarios.',
    savings: '€189.000/año',
    result: 'Crecimiento ingresos +45%',
  },
  {
    id: 4,
    company: 'BuildCorp',
    role: 'Head of Growth',
    author: 'Jorge Martínez',
    metric: '340% Incremento follow-ups',
    improvement: 'Seguimiento automático 24/7',
    quote: 'Nunca nos olvidamos de un follow-up. El agente IA contacta en el momento perfecto, con el mensaje perfecto.',
    savings: '€134.000/año',
    result: 'Conversión +23%',
  },
]

export default function CaseStudies() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#06060A] to-[#0A0A12] pt-32 pb-20">
      <div className="max-w-[1280px] mx-auto px-6 lg:px-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <p className="text-[#4F6EF7] font-semibold tracking-wider mb-4">CASOS DE ÉXITO</p>
          <h1 className="text-[48px] lg:text-[56px] font-bold text-white mb-6">
            Lo que nuestros clientes logran
          </h1>
          <p className="text-[18px] text-[#8A8A9A] max-w-2xl mx-auto">
            Empresas como la tuya están revolucionando sus ventas con nuestros agentes IA
          </p>
        </motion.div>

        {/* Case Studies Grid */}
        <div className="grid lg:grid-cols-2 gap-8">
          {caseStudies.map((study, i) => (
            <motion.div
              key={study.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-gradient-to-br from-[#0F0F1E] to-[#1A1A2E] rounded-2xl p-8 border border-[#4F6EF7]/20 hover:border-[#4F6EF7]/40 transition-all"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-[24px] font-bold text-white mb-1">{study.company}</h3>
                  <p className="text-[14px] text-[#8A8A9A]">{study.author}, {study.role}</p>
                </div>
                <div className="flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-[#F59E0B] text-[#F59E0B]" />
                  ))}
                </div>
              </div>

              {/* Quote */}
              <p className="text-[16px] text-white mb-6 italic leading-relaxed">
                "{study.quote}"
              </p>

              {/* Metrics */}
              <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-[#4F6EF7]/10 rounded-lg border border-[#4F6EF7]/20">
                <div>
                  <p className="text-[12px] text-[#8A8A9A] mb-1">Métrica Principal</p>
                  <p className="text-[20px] font-bold text-[#4F6EF7]">{study.metric}</p>
                </div>
                <div>
                  <p className="text-[12px] text-[#8A8A9A] mb-1">Ahorro Anual</p>
                  <p className="text-[20px] font-bold text-[#10B981]">{study.savings}</p>
                </div>
              </div>

              {/* Results */}
              <div className="space-y-2 pt-4 border-t border-[#4F6EF7]/20">
                <p className="text-[14px] text-[#8A8A9A]">{study.improvement}</p>
                <p className="text-[14px] font-semibold text-[#10B981] flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Resultado: {study.result}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mt-20 p-12 bg-gradient-to-r from-[#4F6EF7]/10 to-[#7B61FF]/10 rounded-2xl border border-[#4F6EF7]/20"
        >
          <h2 className="text-[32px] font-bold text-white mb-4">
            ¿Listo para el siguiente caso de éxito?
          </h2>
          <p className="text-[18px] text-[#8A8A9A] mb-8">
            Únete a cientos de empresas que ya transformaron sus ventas
          </p>
          <button
            onClick={() => document.getElementById('hero')?.scrollIntoView({ behavior: 'smooth' })}
            className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-[#4F6EF7] to-[#7B61FF] text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-[#4F6EF7]/50 transition-all"
          >
            Comenzar Prueba Gratuita
            <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>
      </div>
    </div>
  )
}
