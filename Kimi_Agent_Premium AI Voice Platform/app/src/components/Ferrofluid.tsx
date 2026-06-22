import { useEffect, useRef } from 'react'

interface FerrofluidProps {
  colors?: string[]
  speed?: number
  scale?: number
  turbulence?: number
  fluidity?: number
  rimWidth?: number
  sharpness?: number
  shimmer?: number
  glow?: number
  flowDirection?: 'up' | 'down' | 'left' | 'right'
  opacity?: number
  mouseInteraction?: boolean
  mouseStrength?: number
  mouseRadius?: number
}

export function Ferrofluid({
  colors = ['#1831b8', '#5f0858', '#21ff06'],
  speed = 1.2,
  turbulence = 1.25,
  fluidity = 0.09,
  rimWidth = 0.2,
  sharpness = 2.5,
  shimmer = 1.5,
  glow = 3.1,
  flowDirection = 'up',
  opacity = 1,
  mouseInteraction = true,
  mouseStrength = 0.8,
  mouseRadius = 0.25,
}: FerrofluidProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mouseRef = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = canvas.offsetWidth * devicePixelRatio
    canvas.height = canvas.offsetHeight * devicePixelRatio

    let time = 0
    let particles: Array<{
      x: number
      y: number
      vx: number
      vy: number
      color: string
      life: number
    }> = []

    const createParticles = () => {
      for (let i = 0; i < 30; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 2 * speed,
          vy: (Math.random() - 0.5) * 2 * speed,
          color: colors[Math.floor(Math.random() * colors.length)],
          life: Math.random() * 100 + 50,
        })
      }
    }

    const animate = () => {
      ctx.fillStyle = `rgba(6, 6, 10, ${0.1 * opacity})`
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      time += 0.01 * speed

      particles = particles.filter((p) => {
        p.life--
        if (p.life <= 0) return false

        const noiseX = Math.sin(time * turbulence + p.x * 0.001) * fluidity
        const noiseY = Math.cos(time * turbulence + p.y * 0.001) * fluidity

        p.vx += noiseX
        p.vy += noiseY

        if (mouseInteraction) {
          const dx = mouseRef.current.x - p.x
          const dy = mouseRef.current.y - p.y
          const dist = Math.sqrt(dx * dx + dy * dy)

          if (dist < mouseRadius * canvas.width) {
            const force = (1 - dist / (mouseRadius * canvas.width)) * mouseStrength
            p.vx += (dx / dist) * force
            p.vy += (dy / dist) * force
          }
        }

        p.x += p.vx
        p.y += p.vy

        if (p.x < 0) p.x = canvas.width
        if (p.x > canvas.width) p.x = 0
        if (p.y < 0) p.y = canvas.height
        if (p.y > canvas.height) p.y = 0

        const alpha = Math.min(p.life / 20, 1) * opacity

        ctx.fillStyle = p.color
        ctx.globalAlpha = alpha
        ctx.beginPath()
        ctx.arc(p.x, p.y, 3 + Math.sin(time + p.life) * 2, 0, Math.PI * 2)
        ctx.fill()

        ctx.shadowColor = p.color
        ctx.shadowBlur = glow * 5
        ctx.fillStyle = p.color
        ctx.globalAlpha = alpha * 0.5
        ctx.beginPath()
        ctx.arc(p.x, p.y, 6, 0, Math.PI * 2)
        ctx.fill()

        return true
      })

      ctx.globalAlpha = 1

      if (particles.length < 50) {
        createParticles()
      }

      requestAnimationFrame(animate)
    }

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      mouseRef.current = {
        x: (e.clientX - rect.left) * devicePixelRatio,
        y: (e.clientY - rect.top) * devicePixelRatio,
      }
    }

    if (mouseInteraction) {
      canvas.addEventListener('mousemove', handleMouseMove)
    }

    createParticles()
    animate()

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove)
    }
  }, [colors, speed, turbulence, fluidity, rimWidth, sharpness, shimmer, glow, opacity, mouseInteraction, mouseStrength, mouseRadius])

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full rounded-2xl"
      style={{
        background: 'radial-gradient(ellipse at center, rgba(20,20,40,0.6) 0%, rgba(6,6,10,0.9) 100%)',
        boxShadow: `0 0 60px rgba(79,110,247,0.2), 0 20px 60px rgba(0,0,0,0.5)`,
      }}
    />
  )
}
