import { motion } from 'framer-motion'
import { Mail, Phone, MapPin, Send, ArrowRight } from 'lucide-react'
import { useState } from 'react'

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    message: '',
  })
  const [submitted, setSubmitted] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Aquí irá la lógica para enviar el email
    console.log('Form submitted:', formData)
    setSubmitted(true)
    setTimeout(() => {
      setFormData({ name: '', email: '', company: '', message: '' })
      setSubmitted(false)
    }, 3000)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#06060A] to-[#0A0A12] pt-32 pb-20">
      <div className="max-w-[1280px] mx-auto px-6 lg:px-12">
        <div className="grid lg:grid-cols-2 gap-16">
          {/* Left: Contact Info */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="mb-12">
              <p className="text-[#4F6EF7] font-semibold tracking-wider mb-4">CONTÁCTANOS</p>
              <h1 className="text-[48px] font-bold text-white mb-6">
                Queremos que tus agentes cierren €50K antes de 30 días
              </h1>
              <p className="text-[18px] text-[#8A8A9A] leading-relaxed">
                Cuéntanos tu situación. Nosotros ganamos si tu IA gana.
              </p>
            </div>

            {/* Contact Methods */}
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-lg bg-[#4F6EF7]/20 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-6 h-6 text-[#4F6EF7]" />
                </div>
                <div>
                  <p className="text-[14px] text-[#8A8A9A] mb-1">Email</p>
                  <p className="text-[16px] font-semibold text-white">hello@voiceagent.ai</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-lg bg-[#4F6EF7]/20 flex items-center justify-center flex-shrink-0">
                  <Phone className="w-6 h-6 text-[#4F6EF7]" />
                </div>
                <div>
                  <p className="text-[14px] text-[#8A8A9A] mb-1">Teléfono</p>
                  <p className="text-[16px] font-semibold text-white">+34 911 234 567</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-lg bg-[#4F6EF7]/20 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-6 h-6 text-[#4F6EF7]" />
                </div>
                <div>
                  <p className="text-[14px] text-[#8A8A9A] mb-1">Ubicación</p>
                  <p className="text-[16px] font-semibold text-white">Madrid, España</p>
                </div>
              </div>
            </div>

            {/* Hours */}
            <div className="mt-12 p-6 bg-[#0F0F1E] rounded-lg border border-[#4F6EF7]/20">
              <p className="text-[14px] font-semibold text-white mb-3">Horario de atención</p>
              <p className="text-[14px] text-[#8A8A9A] mb-2">Lunes - Viernes: 9:00 - 18:00</p>
              <p className="text-[14px] text-[#8A8A9A]">Sábado - Domingo: Cerrado</p>
            </div>
          </motion.div>

          {/* Right: Contact Form */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="bg-gradient-to-br from-[#0F0F1E] to-[#1A1A2E] rounded-2xl p-8 border border-[#4F6EF7]/20">
              {submitted ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="h-full flex flex-col items-center justify-center text-center py-12"
                >
                  <div className="w-16 h-16 rounded-full bg-[#10B981]/20 flex items-center justify-center mb-6">
                    <Send className="w-8 h-8 text-[#10B981]" />
                  </div>
                  <h3 className="text-[24px] font-bold text-white mb-2">¡Mensaje enviado!</h3>
                  <p className="text-[16px] text-[#8A8A9A]">
                    Nos pondremos en contacto en las próximas 24 horas.
                  </p>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-[14px] font-semibold text-white mb-2">
                      Nombre
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 bg-[#0A0A12] border border-[#4F6EF7]/20 rounded-lg text-white placeholder-[#5A5A6A] focus:border-[#4F6EF7] focus:outline-none transition-colors"
                      placeholder="Tu nombre"
                    />
                  </div>

                  <div>
                    <label className="block text-[14px] font-semibold text-white mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 bg-[#0A0A12] border border-[#4F6EF7]/20 rounded-lg text-white placeholder-[#5A5A6A] focus:border-[#4F6EF7] focus:outline-none transition-colors"
                      placeholder="tu@email.com"
                    />
                  </div>

                  <div>
                    <label className="block text-[14px] font-semibold text-white mb-2">
                      Empresa
                    </label>
                    <input
                      type="text"
                      name="company"
                      value={formData.company}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-[#0A0A12] border border-[#4F6EF7]/20 rounded-lg text-white placeholder-[#5A5A6A] focus:border-[#4F6EF7] focus:outline-none transition-colors"
                      placeholder="Tu empresa"
                    />
                  </div>

                  <div>
                    <label className="block text-[14px] font-semibold text-white mb-2">
                      Mensaje
                    </label>
                    <textarea
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      required
                      rows={4}
                      className="w-full px-4 py-3 bg-[#0A0A12] border border-[#4F6EF7]/20 rounded-lg text-white placeholder-[#5A5A6A] focus:border-[#4F6EF7] focus:outline-none transition-colors resize-none"
                      placeholder="Cuéntanos sobre tu proyecto..."
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full px-6 py-3 bg-gradient-to-r from-[#4F6EF7] to-[#7B61FF] text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-[#4F6EF7]/50 transition-all flex items-center justify-center gap-2"
                  >
                    Enviar Mensaje
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
