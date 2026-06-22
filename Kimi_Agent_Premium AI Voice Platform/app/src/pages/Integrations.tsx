import { motion } from 'framer-motion'
import { ArrowRight, Check } from 'lucide-react'

const integrations = [
  {
    name: 'Salesforce',
    logo: '🔷',
    description: 'Sincronización automática de leads y oportunidades',
    features: ['Lead sync', 'Deal updates', 'Pipeline', 'Real-time'],
  },
  {
    name: 'HubSpot',
    logo: '🟠',
    description: 'Integración completa con CRM y automatización',
    features: ['Contact sync', 'Deal tracking', 'Automation', 'Real-time'],
  },
  {
    name: 'Pipedrive',
    logo: '🔵',
    description: 'Gestión de ventas y seguimiento de deals',
    features: ['Deal sync', 'Activity log', 'Pipeline view', 'Real-time'],
  },
  {
    name: 'Zoho CRM',
    logo: '🟢',
    description: 'Suite completa de CRM con automatización',
    features: ['Lead sync', 'Custom fields', 'Workflows', 'Real-time'],
  },
  {
    name: 'Monday.com',
    logo: '🔴',
    description: 'Gestión de proyectos y equipos',
    features: ['Task creation', 'Status updates', 'Notifications', 'Real-time'],
  },
  {
    name: 'Slack',
    logo: '💜',
    description: 'Notificaciones en tiempo real en tu equipo',
    features: ['Alerts', 'Reports', 'Commands', 'Real-time'],
  },
  {
    name: 'Zapier',
    logo: '🟡',
    description: 'Conecta con 1000+ apps automáticamente',
    features: ['Custom flows', 'Webhooks', 'Zaps', 'Real-time'],
  },
  {
    name: 'Google Workspace',
    logo: '🟦',
    description: 'Integración con Gmail, Calendar y Drive',
    features: ['Email sync', 'Calendar', 'Drive', 'Real-time'],
  },
]

export default function Integrations() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#06060A] to-[#0A0A12] pt-32 pb-20">
      <div className="max-w-[1280px] mx-auto px-6 lg:px-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <p className="text-[#4F6EF7] font-semibold tracking-wider mb-4">INTEGRACIONES</p>
          <h1 className="text-[48px] lg:text-[56px] font-bold text-white mb-6">
            Conecta con tus herramientas favoritas
          </h1>
          <p className="text-[18px] text-[#8A8A9A] max-w-2xl mx-auto">
            Sincronización automática con tu stack de ventas. Sin código, sin configuración compleja.
          </p>
        </motion.div>

        {/* Integrations Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          {integrations.map((integration, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="bg-[#0F0F1E] rounded-xl p-6 border border-[#4F6EF7]/20 hover:border-[#4F6EF7]/40 transition-all hover:shadow-lg hover:shadow-[#4F6EF7]/10"
            >
              <div className="text-[40px] mb-4">{integration.logo}</div>
              <h3 className="text-[18px] font-bold text-white mb-2">{integration.name}</h3>
              <p className="text-[14px] text-[#8A8A9A] mb-6">{integration.description}</p>
              <div className="space-y-2">
                {integration.features.map((feature, j) => (
                  <div key={j} className="flex items-center gap-2 text-[12px] text-[#8A8A9A]">
                    <Check className="w-4 h-4 text-[#10B981]" />
                    {feature}
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Custom Integration */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-gradient-to-r from-[#4F6EF7]/10 to-[#7B61FF]/10 rounded-2xl p-12 border border-[#4F6EF7]/20 text-center"
        >
          <h2 className="text-[32px] font-bold text-white mb-4">
            ¿No ves tu herramienta favorita?
          </h2>
          <p className="text-[18px] text-[#8A8A9A] mb-8 max-w-2xl mx-auto">
            Tenemos una potente API REST y webhooks para conectar con cualquier plataforma. Nuestro equipo también puede crear integraciones personalizadas.
          </p>
          <button className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-[#4F6EF7] to-[#7B61FF] text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-[#4F6EF7]/50 transition-all">
            Solicitar Integración Custom
            <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>

        {/* API Section */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-20 grid lg:grid-cols-2 gap-12"
        >
          <div>
            <h2 className="text-[32px] font-bold text-white mb-6">API REST Completa</h2>
            <ul className="space-y-4">
              {[
                'Autenticación OAuth2',
                'Webhooks en tiempo real',
                'Rate limiting generoso',
                'Documentación completa',
                'SDKs en múltiples lenguajes',
                'Sandbox para testing',
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-[16px] text-[#8A8A9A]">
                  <Check className="w-5 h-5 text-[#10B981]" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-[#0F0F1E] rounded-xl p-8 border border-[#4F6EF7]/20">
            <h3 className="text-[20px] font-bold text-white mb-4">Ejemplo de Webhook</h3>
            <pre className="bg-[#000000] rounded p-4 text-[12px] text-[#10B981] overflow-x-auto">
{`POST /webhook
{
  "event": "call_completed",
  "call_id": "c123",
  "duration": 245,
  "outcome": "booked",
  "lead": {
    "name": "John",
    "email": "john@example.com"
  }
}`}
            </pre>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
