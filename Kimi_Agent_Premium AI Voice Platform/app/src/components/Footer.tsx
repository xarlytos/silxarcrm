import { Link } from 'react-router-dom'
import { useState } from 'react'
import { Twitter, Linkedin, Github, Youtube } from 'lucide-react'

const productLinks = [
  { name: 'Caracteristicas', href: '#features' },
  { name: 'Precios', href: '#pricing' },
  { name: 'Agentes', href: '#marketplace' },
  { name: 'Integraciones', href: '#' },
]

const solutionLinks = [
  { name: 'SDR Agent', path: '/sdr-agent' },
  { name: 'Closer Agent', path: '/closer-agent' },
  { name: 'Follow-Up Agent', path: '/follow-up-agent' },
  { name: 'Appointment Agent', path: '/appointment-agent' },
  { name: 'Receptionist Agent', path: '/receptionist-agent' },
]

const companyLinks = [
  { name: 'Sobre Nosotros', href: '#' },
  { name: 'Blog', href: '#' },
  { name: 'Carreras', href: '#' },
  { name: 'Contacto', href: '#' },
]

const legalLinks = [
  { name: 'Privacidad', href: '#' },
  { name: 'Terminos', href: '#' },
  { name: 'Seguridad', href: '#' },
  { name: 'Cookies', href: '#' },
]

export default function Footer() {
  const [email, setEmail] = useState('')

  return (
    <footer className="bg-[#06060A] border-t border-[rgba(255,255,255,0.06)]">
      {/* Newsletter */}
      <div className="max-w-[1280px] mx-auto px-6 lg:px-12 pt-20 pb-12">
        <div className="bg-[#0C0C14] rounded-2xl p-8 lg:p-10 flex flex-col lg:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-[20px] font-semibold text-white mb-1">
              Mantente al dia de la IA conversacional
            </h3>
            <p className="text-[14px] text-[#8A8A9A]">
              Novedades, casos de exito y consejos directamente en tu email.
            </p>
          </div>
          <div className="flex w-full lg:w-auto gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              className="flex-1 lg:w-[280px] h-[48px] px-4 rounded-full bg-[#11111A] border border-[rgba(255,255,255,0.06)] text-white text-[14px] placeholder:text-[#5A5A6A] focus:outline-none focus:border-[rgba(79,110,247,0.4)] transition-colors"
            />
            <button className="btn-primary h-[48px] px-6 shrink-0">
              Suscribirse
            </button>
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="max-w-[1280px] mx-auto px-6 lg:px-12 pb-12">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-10">
          {/* Col 1: Logo + tagline + social */}
          <div className="col-span-2 md:col-span-3 lg:col-span-1">
            <Link to="/" className="flex items-center gap-0 mb-4">
              <span className="text-[20px] font-bold text-white tracking-tight">Voice</span>
              <span className="text-[20px] font-bold tracking-tight gradient-text">Agent</span>
            </Link>
            <p className="text-[14px] text-[#8A8A9A] mb-6 leading-relaxed">
              El Sistema Operativo de los Agentes de Voz IA. Contrata empleados IA que trabajan 24/7.
            </p>
            <div className="flex items-center gap-3">
              <a href="#" className="text-[#5A5A6A] hover:text-white transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="text-[#5A5A6A] hover:text-white transition-colors">
                <Linkedin className="w-5 h-5" />
              </a>
              <a href="#" className="text-[#5A5A6A] hover:text-white transition-colors">
                <Github className="w-5 h-5" />
              </a>
              <a href="#" className="text-[#5A5A6A] hover:text-white transition-colors">
                <Youtube className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Col 2: Product */}
          <div>
            <h4 className="text-[14px] font-semibold text-white mb-4">Producto</h4>
            <ul className="space-y-3">
              {productLinks.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    className="text-[14px] text-[#8A8A9A] hover:text-white transition-colors"
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3: Solutions */}
          <div>
            <h4 className="text-[14px] font-semibold text-white mb-4">Soluciones</h4>
            <ul className="space-y-3">
              {solutionLinks.map((link) => (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    className="text-[14px] text-[#8A8A9A] hover:text-white transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 4: Company */}
          <div>
            <h4 className="text-[14px] font-semibold text-white mb-4">Empresa</h4>
            <ul className="space-y-3">
              {companyLinks.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    className="text-[14px] text-[#8A8A9A] hover:text-white transition-colors"
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 5: Legal */}
          <div>
            <h4 className="text-[14px] font-semibold text-white mb-4">Legal</h4>
            <ul className="space-y-3">
              {legalLinks.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    className="text-[14px] text-[#8A8A9A] hover:text-white transition-colors"
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-[rgba(255,255,255,0.06)]">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-12 py-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-[13px] text-[#5A5A6A]">
            &copy; 2025 VoiceAgent OS. Todos los derechos reservados.
          </p>
          <p className="text-[13px] text-[#5A5A6A]">
            Construyendo el futuro del trabajo
          </p>
        </div>
      </div>
    </footer>
  )
}
