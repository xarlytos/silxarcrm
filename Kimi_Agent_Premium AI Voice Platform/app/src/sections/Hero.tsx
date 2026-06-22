import { motion } from 'framer-motion'
import { Play, ArrowRight, Rocket } from 'lucide-react'
import { Ferrofluid } from '@/components/Ferrofluid'
import { useEffect, useRef } from 'react'
import { BUTTON_ACTIONS, ROUTES } from '@/lib/routes'

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.3,
    },
  },
}

const letterVariants = {
  hidden: { opacity: 0, y: 80, rotateX: -90 },
  visible: {
    opacity: 1,
    y: 0,
    rotateX: 0,
    transition: {
      duration: 0.9,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
    },
  },
}

const headlineWords = ['Cierra', '€50K/año', 'en', 'ingresos.', 'Mientras', 'duermes.']

function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    let animationFrameId: number
    let time = 0

    // Particles for dynamic animation
    const particles = Array.from({ length: 50 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      life: Math.random() * 100 + 100,
      maxLife: 200,
    }))

    const animate = () => {
      time += 0.003

      // Base dark background
      ctx.fillStyle = '#06060A'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Primary gradient blob (blue/violet)
      const grad1 = ctx.createRadialGradient(
        canvas.width * (0.3 + Math.sin(time * 0.4) * 0.15),
        canvas.height * (0.4 + Math.cos(time * 0.3) * 0.1),
        100,
        canvas.width * (0.3 + Math.sin(time * 0.4) * 0.15),
        canvas.height * (0.4 + Math.cos(time * 0.3) * 0.1),
        600
      )
      grad1.addColorStop(0, 'rgba(79, 110, 247, 0.25)')
      grad1.addColorStop(0.5, 'rgba(79, 110, 247, 0.08)')
      grad1.addColorStop(1, 'rgba(79, 110, 247, 0)')
      ctx.fillStyle = grad1
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Secondary gradient blob (violet/magenta)
      const grad2 = ctx.createRadialGradient(
        canvas.width * (0.7 + Math.sin(time * 0.5) * 0.15),
        canvas.height * (0.3 + Math.cos(time * 0.4) * 0.1),
        80,
        canvas.width * (0.7 + Math.sin(time * 0.5) * 0.15),
        canvas.height * (0.3 + Math.cos(time * 0.4) * 0.1),
        550
      )
      grad2.addColorStop(0, 'rgba(123, 97, 255, 0.2)')
      grad2.addColorStop(0.5, 'rgba(123, 97, 255, 0.06)')
      grad2.addColorStop(1, 'rgba(123, 97, 255, 0)')
      ctx.fillStyle = grad2
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Tertiary accent blob (cyan hints)
      const grad3 = ctx.createRadialGradient(
        canvas.width * (0.5 + Math.sin(time * 0.6) * 0.2),
        canvas.height * (0.6 + Math.cos(time * 0.5) * 0.15),
        120,
        canvas.width * (0.5 + Math.sin(time * 0.6) * 0.2),
        canvas.height * (0.6 + Math.cos(time * 0.5) * 0.15),
        700
      )
      grad3.addColorStop(0, 'rgba(34, 211, 238, 0.1)')
      grad3.addColorStop(0.5, 'rgba(34, 211, 238, 0.03)')
      grad3.addColorStop(1, 'rgba(34, 211, 238, 0)')
      ctx.fillStyle = grad3
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Draw particles
      particles.forEach((p) => {
        p.x += p.vx
        p.y += p.vy
        p.life--

        // Wrap around edges
        if (p.x < 0) p.x = canvas.width
        if (p.x > canvas.width) p.x = 0
        if (p.y < 0) p.y = canvas.height
        if (p.y > canvas.height) p.y = 0

        // Reset dead particles
        if (p.life <= 0) {
          p.x = Math.random() * canvas.width
          p.y = Math.random() * canvas.height
          p.life = p.maxLife
        }

        const alpha = Math.min(p.life / 50, 1) * 0.3

        // Draw particle glow
        const particleGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 8)
        particleGrad.addColorStop(0, `rgba(79, 110, 247, ${alpha})`)
        particleGrad.addColorStop(1, `rgba(79, 110, 247, 0)`)

        ctx.fillStyle = particleGrad
        ctx.fillRect(p.x - 8, p.y - 8, 16, 16)
      })

      // Vignette overlay
      const vignetteGrad = ctx.createRadialGradient(
        canvas.width / 2,
        canvas.height / 2,
        0,
        canvas.width / 2,
        canvas.height / 2,
        Math.max(canvas.width, canvas.height) * 0.7
      )
      vignetteGrad.addColorStop(0, 'rgba(6, 6, 10, 0)')
      vignetteGrad.addColorStop(1, 'rgba(6, 6, 10, 0.6)')
      ctx.fillStyle = vignetteGrad
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      animationFrameId = requestAnimationFrame(animate)
    }

    animate()

    const handleResize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    window.addEventListener('resize', handleResize)

    return () => {
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-0"
      style={{ display: 'block' }}
    />
  )
}

export default function Hero() {
  return (
    <section
      id="hero"
      className="relative min-h-[100dvh] flex items-center overflow-hidden"
    >
      {/* Dynamic Animated Background */}
      <AnimatedBackground />

      {/* Static Gradient Overlay */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.3) 100%)',
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-[1280px] mx-auto px-6 lg:px-12 w-full py-32">
        <div className="grid lg:grid-cols-[55%_45%] gap-12 items-center">
          {/* Left: Text */}
          <div>
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8"
              style={{
                background: 'rgba(79,110,247,0.15)',
                border: '1px solid rgba(79,110,247,0.3)',
              }}
            >
              <Rocket className="w-4 h-4 text-[#4F6EF7]" />
              <span className="text-[13px] font-medium text-[#4F6EF7]">
                NUEVO — Ahora con memoria persistente y WhatsApp
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="text-[40px] sm:text-[56px] lg:text-[72px] xl:text-[80px] font-bold leading-[1.0] tracking-[-0.03em] mb-6 perspective"
              style={{ perspective: '1000px' }}
            >
              {headlineWords.map((word, i) => {
                const displayWord = word === 'proximo' ? 'pr\u00f3ximo' : word
                return (
                  <motion.span
                    key={i}
                    className="inline-block mr-[0.25em]"
                  >
                    {displayWord.split('').map((char, charIdx) => (
                      <motion.span
                        key={charIdx}
                        variants={letterVariants}
                        initial="hidden"
                        animate="visible"
                        className={`inline-block ${
                          word === 'estrella' ? 'gradient-text-shimmer' : 'text-white-shimmer'
                        }`}
                        style={{
                          transformStyle: 'preserve-3d',
                        }}
                      >
                        {char}
                      </motion.span>
                    ))}
                  </motion.span>
                )
              })}
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="text-[18px] text-[#8A8A9A] leading-relaxed max-w-[520px] mb-10 subheadline-glow"
            >
              Tus agentes IA trabajan 24/7 sin errores. Generan 5x más leads que un SDR. Nunca olvidan un
              seguimiento y escalan tu negocio mientras duermes. Desde prospección hasta
              cierre de ventas.
            </motion.p>

            {/* CTA Group */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-wrap items-center gap-4 mb-12"
            >
              <button
                onClick={BUTTON_ACTIONS.startTrial}
                className="btn-primary glow-pulse cursor-pointer"
              >
                Comenzar Prueba Gratuita
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={BUTTON_ACTIONS.viewDemo}
                className="btn-secondary cursor-pointer"
              >
                <Play className="w-4 h-4" />
                Ver Demo en Vivo
              </button>
            </motion.div>

            <motion.a
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 1.0 }}
              href={ROUTES.CONTACT}
              className="inline-flex items-center gap-2 text-[15px] font-medium text-[#4F6EF7] hover:text-[#7B61FF] transition-colors mb-12 cursor-pointer"
            >
              Hablar con un experto
              <ArrowRight className="w-4 h-4" />
            </motion.a>

            {/* Trust Bar */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 1.2 }}
            >
              <p className="text-[13px] text-[#5A5A6A] mb-3">
                Confían en nosotros equipos de:
              </p>
              <div className="flex items-center gap-6 flex-wrap">
                {['TechFlow', 'NovaCRM', 'MedSalus', 'BuildCorp', 'DataLabs'].map((name) => (
                  <span
                    key={name}
                    className="text-[14px] font-semibold text-[#5A5A6A] opacity-50 hover:opacity-80 transition-opacity cursor-default"
                  >
                    {name}
                  </span>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Right: Ferrofluid Animation */}
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 1, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="hidden lg:block relative h-[500px]"
          >
            <Ferrofluid
              colors={['#4F6EF7', '#7B61FF', '#5f0858']}
              speed={1.2}
              turbulence={1.25}
              fluidity={0.09}
              glow={3.1}
              mouseInteraction
              mouseStrength={0.8}
              mouseRadius={0.25}
            />
          </motion.div>
        </div>
      </div>
    </section>
  )
}
