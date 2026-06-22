import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Menu, X } from 'lucide-react'

const agentLinks = [
  { name: 'SDR Agent', path: '/sdr-agent', desc: 'Prospeccion y cualificacion' },
  { name: 'Closer Agent', path: '/closer-agent', desc: 'Cierre de ventas' },
  { name: 'Follow-Up Agent', path: '/follow-up-agent', desc: 'Recuperacion de leads' },
  { name: 'Appointment Agent', path: '/appointment-agent', desc: 'Gestion de citas' },
  { name: 'Receptionist Agent', path: '/receptionist-agent', desc: 'Recepcion 24/7' },
]

const productLinks = [
  { name: 'Caracteristicas', href: '#features' },
  { name: 'Marketplace', href: '#marketplace' },
  { name: 'Precios', href: '#pricing' },
  { name: 'Integraciones', href: '#integrations' },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [agentsOpen, setAgentsOpen] = useState(false)
  const [productOpen, setProductOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    setMobileOpen(false)
    setAgentsOpen(false)
    setProductOpen(false)
  }, [location.pathname])

  const handleAnchorClick = (href: string) => {
    if (location.pathname !== '/') {
      return
    }
    const el = document.querySelector(href)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' })
    }
    setProductOpen(false)
  }

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 h-[72px] transition-all duration-300 ${
        scrolled
          ? 'bg-[rgba(6,6,10,0.8)] backdrop-blur-xl border-b border-[rgba(255,255,255,0.06)]'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-[1280px] mx-auto h-full flex items-center justify-between px-6 lg:px-12">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-0 shrink-0">
          <span className="text-[20px] font-bold text-white tracking-tight">Voice</span>
          <span className="text-[20px] font-bold tracking-tight gradient-text">Agent</span>
        </Link>

        {/* Desktop Nav Links */}
        <div className="hidden lg:flex items-center gap-8">
          {/* Product Dropdown */}
          <div className="relative">
            <button
              onClick={() => setProductOpen(!productOpen)}
              className="flex items-center gap-1 text-[15px] font-medium text-[#8A8A9A] hover:text-white transition-colors"
            >
              Producto
              <ChevronDown className={`w-4 h-4 transition-transform ${productOpen ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {productOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-full left-0 mt-2 w-48 bg-[#11111A] border border-[rgba(255,255,255,0.06)] rounded-xl p-2 shadow-lg"
                >
                  {productLinks.map((link) => (
                    <button
                      key={link.name}
                      onClick={() => handleAnchorClick(link.href)}
                      className="block w-full text-left px-4 py-2 text-[14px] text-[#8A8A9A] hover:text-white hover:bg-[rgba(255,255,255,0.05)] rounded-lg transition-colors"
                    >
                      {link.name}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Agents Dropdown */}
          <div className="relative">
            <button
              onClick={() => setAgentsOpen(!agentsOpen)}
              className="flex items-center gap-1 text-[15px] font-medium text-[#8A8A9A] hover:text-white transition-colors"
            >
              Agentes
              <ChevronDown className={`w-4 h-4 transition-transform ${agentsOpen ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {agentsOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-full left-0 mt-2 w-64 bg-[#11111A] border border-[rgba(255,255,255,0.06)] rounded-xl p-2 shadow-lg"
                >
                  {agentLinks.map((agent) => (
                    <Link
                      key={agent.path}
                      to={agent.path}
                      className="flex flex-col px-4 py-2 text-[14px] text-[#8A8A9A] hover:text-white hover:bg-[rgba(255,255,255,0.05)] rounded-lg transition-colors"
                    >
                      <span className="font-medium text-white">{agent.name}</span>
                      <span className="text-[12px] text-[#5A5A6A]">{agent.desc}</span>
                    </Link>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={() => handleAnchorClick('#pricing')}
            className="text-[15px] font-medium text-[#8A8A9A] hover:text-white transition-colors"
          >
            Precios
          </button>
          <button
            onClick={() => handleAnchorClick('#faq')}
            className="text-[15px] font-medium text-[#8A8A9A] hover:text-white transition-colors"
          >
            Recursos
          </button>
          <button
            onClick={() => handleAnchorClick('#testimonials')}
            className="text-[15px] font-medium text-[#8A8A9A] hover:text-white transition-colors"
          >
            Empresa
          </button>
        </div>

        {/* Desktop CTAs */}
        <div className="hidden lg:flex items-center gap-3">
          <button className="btn-secondary text-[14px] py-2.5 px-5">
            Reservar Demo
          </button>
          <button className="btn-primary text-[14px] py-2.5 px-5">
            Prueba Gratis
          </button>
        </div>

        {/* Mobile Menu Toggle */}
        <button
          className="lg:hidden text-white p-2"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-[rgba(6,6,10,0.95)] backdrop-blur-xl border-b border-[rgba(255,255,255,0.06)]"
          >
            <div className="px-6 py-6 flex flex-col gap-4">
              <p className="text-[12px] font-medium text-[#5A5A6A] uppercase tracking-wider">Agentes</p>
              {agentLinks.map((agent) => (
                <Link
                  key={agent.path}
                  to={agent.path}
                  className="text-[16px] text-[#8A8A9A] hover:text-white transition-colors py-1"
                >
                  {agent.name}
                </Link>
              ))}
              <div className="border-t border-[rgba(255,255,255,0.06)] my-2" />
              <button className="btn-primary w-full justify-center">
                Prueba Gratis
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}
