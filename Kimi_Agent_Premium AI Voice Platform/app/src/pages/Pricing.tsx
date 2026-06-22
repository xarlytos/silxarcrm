import { motion } from 'framer-motion'
import { Check, X, ArrowRight, Zap } from 'lucide-react'

const plans = [
  {
    name: 'Starter',
    price: '€299',
    period: '/mes',
    description: 'Perfecto para empezar',
    popular: false,
    features: [
      { name: 'Hasta 3 agentes', included: true },
      { name: 'Llamadas ilimitadas', included: true },
      { name: 'Integraciones básicas (2)', included: true },
      { name: 'Soporte por email', included: true },
      { name: 'Dashboard analítico', included: true },
      { name: 'Sin tarjeta de crédito', included: true },
      { name: 'Integraciones avanzadas', included: false },
      { name: 'API dedicada', included: false },
      { name: 'Soporte 24/7 prioritario', included: false },
    ],
    cta: 'Comenzar Prueba',
    ctaColor: 'bg-[#4F6EF7]',
  },
  {
    name: 'Professional',
    price: '€899',
    period: '/mes',
    description: 'Para equipos en crecimiento',
    popular: true,
    features: [
      { name: 'Hasta 20 agentes', included: true },
      { name: 'Llamadas ilimitadas', included: true },
      { name: 'Integraciones avanzadas', included: true },
      { name: 'API dedicada', included: true },
      { name: 'Dashboard analítico avanzado', included: true },
      { name: 'Soporte 24/7 prioritario', included: true },
      { name: 'Entrenamientos personalizados', included: true },
      { name: 'Analítica predictiva', included: false },
      { name: 'Equipo dedicado', included: false },
    ],
    cta: 'Comenzar Ahora',
    ctaColor: 'bg-gradient-to-r from-[#4F6EF7] to-[#7B61FF]',
  },
  {
    name: 'Enterprise',
    price: 'Personalizado',
    period: '',
    description: 'Soluciones a medida',
    popular: false,
    features: [
      { name: 'Agentes ilimitados', included: true },
      { name: 'Llamadas ilimitadas', included: true },
      { name: 'Todas las integraciones', included: true },
      { name: 'API dedicada & personalizada', included: true },
      { name: 'Dashboard personalizado', included: true },
      { name: 'Soporte 24/7 dedicado', included: true },
      { name: 'Entrenamientos y talleres', included: true },
      { name: 'Analítica predictiva avanzada', included: true },
      { name: 'Equipo técnico dedicado', included: true },
    ],
    cta: 'Contactar Ventas',
    ctaColor: 'bg-[#7B61FF]',
  },
]

export default function Pricing() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#06060A] to-[#0A0A12] pt-32 pb-20">
      <div className="max-w-[1280px] mx-auto px-6 lg:px-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <p className="text-[#4F6EF7] font-semibold tracking-wider mb-4">PLANES Y PRECIOS</p>
          <h1 className="text-[48px] lg:text-[56px] font-bold text-white mb-6">
            Elige tu plan perfecto
          </h1>
          <p className="text-[18px] text-[#8A8A9A] max-w-2xl mx-auto">
            Desde startups hasta empresas. Todos nuestros planes incluyen acceso a prueba de 14 días gratis.
          </p>
        </motion.div>

        {/* Toggle Mensual/Anual */}
        <div className="flex justify-center mb-16">
          <div className="inline-flex items-center gap-4 p-1 bg-[#0F0F1E] rounded-lg border border-[#4F6EF7]/20">
            <button className="px-6 py-2 rounded-lg text-white font-semibold">Mensual</button>
            <button className="px-6 py-2 text-[#8A8A9A] font-semibold hover:text-white transition-colors">
              Anual <span className="ml-2 text-[#10B981]">-20%</span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid lg:grid-cols-3 gap-8 mb-20">
          {plans.map((plan, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`rounded-2xl border transition-all ${
                plan.popular
                  ? 'bg-gradient-to-br from-[#4F6EF7]/20 to-[#7B61FF]/20 border-[#4F6EF7]/40 scale-105 shadow-2xl shadow-[#4F6EF7]/20'
                  : 'bg-[#0F0F1E] border-[#4F6EF7]/20 hover:border-[#4F6EF7]/40'
              } p-8`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="px-4 py-1 bg-gradient-to-r from-[#4F6EF7] to-[#7B61FF] rounded-full flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    <span className="text-[12px] font-bold text-white">MÁS POPULAR</span>
                  </div>
                </div>
              )}

              {/* Plan Name & Price */}
              <h3 className="text-[24px] font-bold text-white mb-2">{plan.name}</h3>
              <p className="text-[14px] text-[#8A8A9A] mb-6">{plan.description}</p>
              <div className="mb-8">
                <div className="text-[48px] font-black text-white">
                  {plan.price}
                  <span className="text-[20px] text-[#8A8A9A] ml-2">{plan.period}</span>
                </div>
                {plan.name !== 'Enterprise' && (
                  <p className="text-[14px] text-[#10B981] font-medium mt-2">✓ Recupera inversión en 4 semanas o cancelación gratis</p>
                )}
              </div>

              {/* CTA Button */}
              <button
                className={`w-full px-6 py-3 rounded-lg text-white font-semibold mb-8 transition-all ${plan.ctaColor} hover:shadow-lg`}
              >
                {plan.cta}
                <ArrowRight className="w-4 h-4 inline ml-2" />
              </button>

              {/* Features */}
              <div className="space-y-4">
                {plan.features.map((feature, j) => (
                  <div key={j} className="flex items-center gap-3">
                    {feature.included ? (
                      <Check className="w-5 h-5 text-[#10B981] flex-shrink-0" />
                    ) : (
                      <X className="w-5 h-5 text-[#5A5A6A] flex-shrink-0" />
                    )}
                    <span
                      className={`text-[14px] ${
                        feature.included ? 'text-white' : 'text-[#5A5A6A]'
                      }`}
                    >
                      {feature.name}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        {/* FAQ Section */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto"
        >
          <h2 className="text-[32px] font-bold text-white mb-12 text-center">Preguntas frecuentes</h2>
          <div className="space-y-4">
            {[
              {
                q: '¿Puedo cambiar de plan en cualquier momento?',
                a: 'Sí, puedes cambiar tu plan en cualquier momento. Los cambios se reflejan en tu próximo ciclo de facturación.',
              },
              {
                q: '¿Qué incluye la prueba gratuita?',
                a: 'Acceso completo a todos los agentes y características por 14 días. No se requiere tarjeta de crédito.',
              },
              {
                q: '¿Hay descuentos por pago anual?',
                a: 'Sí, los pagos anuales incluyen un descuento del 20%. Contacta a nuestro equipo para cotizaciones.',
              },
              {
                q: '¿Qué está incluido en "integraciones avanzadas"?',
                a: 'Acceso a Salesforce, HubSpot, Pipedrive, Zapier, y más. Custom integraciones disponibles en planes Enterprise.',
              },
            ].map((item, i) => (
              <div
                key={i}
                className="p-6 bg-[#0F0F1E] rounded-lg border border-[#4F6EF7]/20 hover:border-[#4F6EF7]/40 transition-all"
              >
                <p className="text-[16px] font-semibold text-white mb-2">{item.q}</p>
                <p className="text-[14px] text-[#8A8A9A]">{item.a}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
