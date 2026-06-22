import { motion } from 'framer-motion'
import { ArrowRight, Star } from 'lucide-react'

const stories = [
  {
    id: 1,
    title: 'De 12 a 47 reuniones por semana en 90 días',
    author: 'Ana García',
    role: 'VP Sales @ DataPro',
    date: '2026-05-15',
    excerpt: 'Cómo reemplazamos nuestro equipo de SDRs con un agente IA y triplicamos nuestro pipeline',
    content: `Cuando llegué a DataPro hace tres años, el equipo de ventas estaba estancado. Teníamos tres SDRs
fulltime generando apenas 12 reuniones por semana. El costo anual era de €180K en salarios, sin contar
beneficios y rotación.

Hace seis meses decidimos probar VoiceAgent OS. El setup fue increíblemente simple: conectamos nuestro
CRM (Salesforce), definimos el perfil de cliente ideal, y el SDR Agent empezó a trabajar.

En la primera semana, el agente generó 18 reuniones. En el mes uno, alcanzamos 35. Hoy, estamos en 47 reuniones
por semana, sin un solo SDR humano.

Lo mejor: la calidad de los leads es mejor. El agente AI no se cansa, no se va a vacaciones, y nunca
olvida un seguimiento. Mi equipo solo cierra ahora. El agente maneja toda la prospección.

Hemos ahorrado €180K anuales y nuestro pipeline creció un 340%. No puedo recomendar esto más.`,
    stats: [
      { label: 'Reuniones/semana antes', value: '12' },
      { label: 'Reuniones/semana ahora', value: '47' },
      { label: 'Crecimiento', value: '+340%' },
      { label: 'Ahorro anual', value: '€180K' },
    ],
  },
  {
    id: 2,
    title: 'Eliminamos el 73% de costes de ventas',
    author: 'Carlos López',
    role: 'CEO @ TechFlow',
    date: '2026-04-22',
    excerpt: 'Por qué despedimos nuestro equipo de SDRs y nos triplicó los ingresos',
    content: `TechFlow es una SaaS B2B de €2M ARR. Gastar €240K/año en un equipo de SDRs que generaba apenas
80 deals/mes era insostenible.

Cuando descubrimos VoiceAgent, la propuesta fue clara: "¿Qué si tu agente IA genera 240 deals/mes?"

Parecía ciencia ficción. Pero después de dos semanas de testing, nos dimos cuenta de que era real.

Hoy:
- El Closer Agent cierra 18% más deals que nuestros mejores closers humanos
- El SDR Agent genera 280 leads/día (vs 60 antes)
- Nuestro CAC bajó de €480 a €128
- El payback time se redujo de 8 meses a 2 meses

No fue fácil despedir al equipo de SDRs. Pero todos encontraron mejores roles en la empresa. Y nosotros
ganamos en velocidad, consistencia y escala.

El margen operativo subió de 12% a 30%. Eso es un cambio de juego.`,
    stats: [
      { label: 'Deals/mes antes', value: '80' },
      { label: 'Deals/mes ahora', value: '240' },
      { label: 'CAC reducido', value: '-73%' },
      { label: 'Margen operativo', value: '+18pp' },
    ],
  },
  {
    id: 3,
    title: 'Cómo un startup de 5 personas compite con empresas de 50',
    author: 'María Rodríguez',
    role: 'Founder @ NovaCRM',
    date: '2026-03-18',
    excerpt: 'Nuestra ventaja competitiva no es el dinero. Es que los agentes IA trabajan 24/7',
    content: `Cuando fundé NovaCRM con un equipo de 5 personas, sabía que no podíamos competir con Salesforce
en dinero. Pero sí podíamos competir en velocidad.

El problema: éramos tan pequeños que no podíamos permitirnos SDRs. Nuestro fundador (yo) estaba haciendo
prospección mientras construía el producto.

Descubrí VoiceAgent por casualidad. Y cambió todo.

Hoy, nuestro SDR Agent genera 500+ contactos por día. Nuestro Follow-Up Agent automatiza 100% de los
follow-ups. Nuestro Closer Agent asiste en demos.

Resultados:
- Pipeline: €1.8M (vs €200K hace un año)
- Tasa de conversión: 8% (vs 2% cuando lo hacía yo manualmente)
- Costo por lead: €12 (vs €180 en agencias)

Y lo mejor: mi equipo de 5 personas ahora genera más pipeline que startups con 20 personas.

El futuro no es contratar. Es automatizar. Y el que automatice primero gana.`,
    stats: [
      { label: 'Pipeline generado', value: '€1.8M' },
      { label: 'Contactos/día', value: '500+' },
      { label: 'Tasa de conversión', value: '8%' },
      { label: 'Team size', value: '5 personas' },
    ],
  },
]

export default function CreatorStories() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#06060A] to-[#0A0A12] pt-32 pb-20">
      <div className="max-w-[1280px] mx-auto px-6 lg:px-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-20"
        >
          <p className="text-[#4F6EF7] font-semibold tracking-wider mb-4">HISTORIAS REALES</p>
          <h1 className="text-[48px] lg:text-[56px] font-bold text-white mb-6">
            Cómo los mejores están usando VoiceAgent
          </h1>
          <p className="text-[18px] text-[#8A8A9A] max-w-2xl mx-auto">
            Historias verificadas de clientes que transformaron sus ventas con agentes IA
          </p>
        </motion.div>

        {/* Stories */}
        <div className="space-y-16">
          {stories.map((story, i) => (
            <motion.article
              key={i}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-gradient-to-br from-[#0F0F1E] to-[#1A1A2E] rounded-2xl border border-[#4F6EF7]/20 p-12 hover:border-[#4F6EF7]/40 transition-all"
            >
              {/* Header */}
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-[32px] font-bold text-white flex-1">{story.title}</h2>
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-[#F59E0B] text-[#F59E0B]" />
                    ))}
                  </div>
                </div>
                <p className="text-[14px] text-[#8A8A9A]">
                  {story.author} • {story.role} • {new Date(story.date).toLocaleDateString('es-ES')}
                </p>
              </div>

              {/* Content */}
              <div className="mb-10">
                <p className="text-[18px] text-[#8A8A9A] leading-relaxed whitespace-pre-line">
                  {story.content}
                </p>
              </div>

              {/* Stats Grid */}
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10 p-6 bg-[#4F6EF7]/10 rounded-lg border border-[#4F6EF7]/20">
                {story.stats.map((stat, j) => (
                  <div key={j} className="text-center">
                    <p className="text-[24px] lg:text-[32px] font-black text-[#4F6EF7] mb-1">
                      {stat.value}
                    </p>
                    <p className="text-[13px] text-[#8A8A9A]">{stat.label}</p>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <motion.a
                href="/contact"
                whileHover={{ x: 4 }}
                className="inline-flex items-center gap-2 text-[14px] font-semibold text-[#4F6EF7] hover:text-[#7B61FF] transition-colors group"
              >
                Leer caso completo
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </motion.a>
            </motion.article>
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-20 text-center p-12 bg-gradient-to-r from-[#4F6EF7]/10 to-[#7B61FF]/10 rounded-2xl border border-[#4F6EF7]/20"
        >
          <h2 className="text-[32px] font-bold text-white mb-4">
            ¿Listo para escribir tu propia historia?
          </h2>
          <p className="text-[18px] text-[#8A8A9A] mb-8 max-w-2xl mx-auto">
            Únete a cientos de empresas que ya transformaron sus ventas con VoiceAgent OS
          </p>
          <button className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-[#4F6EF7] to-[#7B61FF] text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-[#4F6EF7]/50 transition-all">
            Comenzar Prueba Gratuita
            <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>
      </div>
    </div>
  )
}
