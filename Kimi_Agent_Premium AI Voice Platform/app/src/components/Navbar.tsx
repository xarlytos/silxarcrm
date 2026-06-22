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

// Animation variants
const dropdownVariants = {
  hidden: { opacity: 0, y: -8, scale: 0.96 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.2, ease: 'easeOut' } },
  exit: { opacity: 0, y: -8, scale: 0.96, transition: { duration: 0.15, ease: 'easeIn' } },
}

const mobileMenuVariants = {
  hidden: { opacity: 0, height: 0 },
  visible: { opacity: 1, height: 'auto', transition: { duration: 0.3, ease: 'easeOut' } },
  exit: { opacity: 0, height: 0, transition: { duration: 0.2, ease: 'easeIn' } },
}

const mobileItemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.05, duration: 0.3, ease: 'easeOut' },
  }),
}

const linkHoverVariants = {
  initial: { color: '#8A8A9A' },
  hover: { color: '#FFFFFF', transition: { duration: 0.2 } },
}

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
      className={`fixed top-0 left-0 right-0 z-50 h-[72px] transition-all duration-500 ease-out ${
        scrolled
          ? 'bg-[rgba(6,6,10,0.8)] backdrop-blur-xl border-b border-[rgba(255,255,255,0.06)] shadow-lg shadow-[rgba(0,0,0,0.3)]'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-[1280px] mx-auto h-full flex items-center justify-between px-6 lg:px-12">
        {/* Logo */}
        <Link
          to="/"
          className="flex items-center gap-0 shrink-0 group hover:opacity-80 transition-opacity duration-300"
        >
          <motion.span
            className="text-[20px] font-bold text-white tracking-tight"
            whileHover={{ scale: 1.05 }}
            transition={{ type: 'spring', stiffness: 400, damping: 10 }}
          >
            Voice
          </motion.span>
          <motion.span
            className="text-[20px] font-bold tracking-tight gradient-text"
            whileHover={{ scale: 1.05 }}
            transition={{ type: 'spring', stiffness: 400, damping: 10 }}
          >
            Agent
          </motion.span>
        </Link>

        {/* Desktop Nav Links */}
        <div className="hidden lg:flex items-center gap-8">
          {/* Product Dropdown */}
          <div className="relative">
            <motion.button
              onClick={() => setProductOpen(!productOpen)}
              className="flex items-center gap-1 text-[15px] font-medium text-[#8A8A9A] hover:text-white transition-colors"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.2 }}
            >
              Producto
              <motion.div
                animate={{ rotate: productOpen ? 180 : 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
              >
                <ChevronDown className="w-4 h-4" />
              </motion.div>
            </motion.button>
            <AnimatePresence>
              {productOpen && (
                <motion.div
                  variants={dropdownVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="absolute top-full left-0 mt-2 w-48 bg-[#11111A] border border-[rgba(255,255,255,0.06)] rounded-xl p-2 shadow-lg backdrop-blur-sm"
                >
                  {productLinks.map((link, idx) => (
                    <motion.button
                      key={link.name}
                      onClick={() => handleAnchorClick(link.href)}
                      className="block w-full text-left px-4 py-2 text-[14px] text-[#8A8A9A] hover:text-white hover:bg-[rgba(255,255,255,0.05)] rounded-lg transition-colors group"
                      whileHover={{ x: 4, backgroundColor: 'rgba(255,255,255,0.08)' }}
                      transition={{ duration: 0.2 }}
                      custom={idx}
                    >
                      <span className="group-hover:translate-x-1 transition-transform duration-200 inline-block">
                        {link.name}
                      </span>
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Agents Dropdown */}
          <div className="relative">
            <motion.button
              onClick={() => setAgentsOpen(!agentsOpen)}
              className="flex items-center gap-1 text-[15px] font-medium text-[#8A8A9A] hover:text-white transition-colors"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.2 }}
            >
              Agentes
              <motion.div
                animate={{ rotate: agentsOpen ? 180 : 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
              >
                <ChevronDown className="w-4 h-4" />
              </motion.div>
            </motion.button>
            <AnimatePresence>
              {agentsOpen && (
                <motion.div
                  variants={dropdownVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="absolute top-full left-0 mt-2 w-64 bg-[#11111A] border border-[rgba(255,255,255,0.06)] rounded-xl p-2 shadow-lg backdrop-blur-sm"
                >
                  {agentLinks.map((agent, idx) => (
                    <motion.div key={agent.path} custom={idx} variants={mobileItemVariants}>
                      <Link
                        to={agent.path}
                        className="flex flex-col px-4 py-3 text-[14px] text-[#8A8A9A] hover:text-white hover:bg-[rgba(255,255,255,0.05)] rounded-lg transition-colors group"
                      >
                        <motion.span
                          className="font-medium text-white group-hover:translate-x-1 transition-transform duration-200 inline-block"
                          whileHover={{ x: 4 }}
                        >
                          {agent.name}
                        </motion.span>
                        <span className="text-[12px] text-[#5A5A6A] group-hover:text-[#7A7A8A] transition-colors duration-200">
                          {agent.desc}
                        </span>
                      </Link>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <motion.button
            onClick={() => handleAnchorClick('#pricing')}
            className="text-[15px] font-medium text-[#8A8A9A] hover:text-white transition-colors relative"
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.2 }}
          >
            Precios
            <motion.div
              className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-transparent via-white to-transparent"
              initial={{ width: 0 }}
              whileHover={{ width: '100%' }}
              transition={{ duration: 0.3 }}
            />
          </motion.button>
          <motion.button
            onClick={() => handleAnchorClick('#faq')}
            className="text-[15px] font-medium text-[#8A8A9A] hover:text-white transition-colors relative"
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.2 }}
          >
            Recursos
            <motion.div
              className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-transparent via-white to-transparent"
              initial={{ width: 0 }}
              whileHover={{ width: '100%' }}
              transition={{ duration: 0.3 }}
            />
          </motion.button>
          <motion.button
            onClick={() => handleAnchorClick('#testimonials')}
            className="text-[15px] font-medium text-[#8A8A9A] hover:text-white transition-colors relative"
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.2 }}
          >
            Empresa
            <motion.div
              className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-transparent via-white to-transparent"
              initial={{ width: 0 }}
              whileHover={{ width: '100%' }}
              transition={{ duration: 0.3 }}
            />
          </motion.button>
        </div>

        {/* Desktop CTAs */}
        <div className="hidden lg:flex items-center gap-3">
          <motion.button
            className="btn-secondary text-[14px] py-2.5 px-5"
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 400, damping: 10 }}
          >
            Reservar Demo
          </motion.button>
          <motion.button
            className="btn-primary text-[14px] py-2.5 px-5"
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 400, damping: 10 }}
          >
            Prueba Gratis
          </motion.button>
        </div>

        {/* Mobile Menu Toggle */}
        <motion.button
          className="lg:hidden text-white p-2 hover:bg-[rgba(255,255,255,0.05)] rounded-lg transition-colors"
          onClick={() => setMobileOpen(!mobileOpen)}
          whileTap={{ scale: 0.95 }}
        >
          <motion.div
            animate={{ rotate: mobileOpen ? 90 : 0 }}
            transition={{ duration: 0.2 }}
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </motion.div>
        </motion.button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            variants={mobileMenuVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="lg:hidden bg-[rgba(6,6,10,0.95)] backdrop-blur-xl border-b border-[rgba(255,255,255,0.06)]"
          >
            <div className="px-6 py-6 flex flex-col gap-4">
              <motion.p className="text-[12px] font-medium text-[#5A5A6A] uppercase tracking-wider">
                Agentes
              </motion.p>
              {agentLinks.map((agent, idx) => (
                <motion.div
                  key={agent.path}
                  custom={idx}
                  variants={mobileItemVariants}
                  initial="hidden"
                  animate="visible"
                >
                  <Link
                    to={agent.path}
                    className="text-[16px] text-[#8A8A9A] hover:text-white transition-colors py-2 px-3 rounded-lg hover:bg-[rgba(255,255,255,0.05)] block"
                  >
                    {agent.name}
                  </Link>
                </motion.div>
              ))}
              <motion.div
                className="border-t border-[rgba(255,255,255,0.06)] my-2"
                variants={mobileItemVariants}
                custom={agentLinks.length}
              />
              <motion.button
                className="btn-primary w-full justify-center"
                custom={agentLinks.length + 1}
                variants={mobileItemVariants}
                whileTap={{ scale: 0.95 }}
              >
                Prueba Gratis
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}
