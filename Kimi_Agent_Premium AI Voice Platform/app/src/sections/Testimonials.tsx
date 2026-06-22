import { motion } from 'framer-motion'
import { Star } from 'lucide-react'
import { useState } from 'react'

interface Testimonial {
  quote: string
  author: string
  role: string
  company: string
  avatar: string
  highlight?: string
}

const testimonials: Testimonial[] = [
  {
    quote:
      "We were spending 40 hours a week on outreach. Now our SDR Agent does it in 4 hours. The best part? Our team actually closes deals instead of chasing leads. We tripled meetings scheduled in the first month.",
    author: 'Carlos Mendez',
    role: 'Director Comercial',
    company: 'TechFlow Solutions',
    avatar: '/testimonial-avatar-1.jpg',
    highlight: 'SDR Agent',
  },
  {
    quote:
      "We had basically given up on 23% of dead deals. Then the Follow-Up Agent started working them. It's like having someone who never forgets, never gets frustrated, and never sleeps. Those deals started closing.",
    author: 'Laura Sanchez',
    role: 'Head of Sales',
    company: 'NovaCRM',
    avatar: '/testimonial-avatar-2.jpg',
    highlight: 'Follow-Up Agent',
  },
  {
    quote:
      "Our receptionist was drowning in confirmation calls. No-shows were killing us at 23%. After the Appointment Agent took over, no-shows dropped to 12%. We didn't hire anyone. That money went straight to the bottom line.",
    author: 'Miguel Angel Ruiz',
    role: 'CEO',
    company: 'Centro Medico Salus',
    avatar: '/testimonial-avatar-3.jpg',
    highlight: 'Appointment Agent',
  },
]

function StarRating({ delay = 0 }: { delay?: number }) {
  return (
    <div className="flex items-center gap-1">
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0, rotateZ: -180 }}
          whileInView={{ opacity: 1, scale: 1, rotateZ: 0 }}
          viewport={{ once: true }}
          transition={{
            duration: 0.4,
            delay: delay + i * 0.08,
            type: 'spring',
            stiffness: 400,
            damping: 10,
          }}
          className="relative"
        >
          <motion.div
            animate={{
              boxShadow: [
                '0 0 0px rgba(34, 211, 238, 0)',
                '0 0 12px rgba(34, 211, 238, 0.6)',
                '0 0 0px rgba(34, 211, 238, 0)',
              ],
            }}
            transition={{
              duration: 2,
              delay: delay + i * 0.08 + 0.4,
              repeat: Infinity,
            }}
          >
            <Star className="w-4 h-4 fill-[#22D3EE] text-[#22D3EE]" />
          </motion.div>
        </motion.div>
      ))}
    </div>
  )
}

function TestimonialCard({
  testimonial,
  index,
}: {
  testimonial: Testimonial
  index: number
}) {
  const [isFlipped, setIsFlipped] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, rotateY: -10 }}
      whileInView={{ opacity: 1, y: 0, rotateY: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{
        duration: 0.6,
        delay: index * 0.15,
        ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
      }}
      onMouseEnter={() => setIsFlipped(true)}
      onMouseLeave={() => setIsFlipped(false)}
      style={{
        perspective: '1000px',
      }}
      className="h-full"
    >
      <motion.div
        animate={{
          rotateY: isFlipped ? 8 : 0,
          rotateX: isFlipped ? -5 : 0,
        }}
        transition={{
          type: 'spring',
          stiffness: 300,
          damping: 20,
        }}
        className="relative h-full"
      >
        <div className="bg-white rounded-2xl p-8 border border-[rgba(0,0,0,0.08)] h-full shadow-lg hover:shadow-2xl transition-shadow duration-500 backdrop-blur-sm bg-opacity-95">
          {/* Animated gradient border on hover */}
          <motion.div
            animate={{
              opacity: isFlipped ? 1 : 0,
              boxShadow: isFlipped
                ? '0 0 20px rgba(79, 110, 247, 0.3) inset'
                : '0 0 0px rgba(79, 110, 247, 0) inset',
            }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 rounded-2xl pointer-events-none"
          />

          <div className="relative z-10">
            {/* Stars with animation */}
            <StarRating delay={index * 0.15 + 0.3} />

            {/* Quote with better typography */}
            <motion.div
              animate={{
                y: isFlipped ? -4 : 0,
              }}
              transition={{ duration: 0.3 }}
              className="mt-6 mb-8"
            >
              <div className="flex gap-1 mb-4">
                <span className="text-[#4F6EF7] text-[28px] leading-none opacity-40">
                  "
                </span>
                <span className="text-[#4F6EF7] text-[28px] leading-none opacity-40 ml-auto">
                  "
                </span>
              </div>
              <p className="text-[15px] text-[#0A0A12] leading-relaxed font-[500]">
                {testimonial.quote}
              </p>
            </motion.div>

            {/* Author with image glow effect */}
            <motion.div
              animate={{
                y: isFlipped ? 2 : 0,
              }}
              transition={{ duration: 0.3 }}
              className="flex items-center gap-4"
            >
              <div className="relative flex-shrink-0">
                {/* Glow background */}
                <motion.div
                  animate={{
                    boxShadow: isFlipped
                      ? '0 0 20px rgba(34, 211, 238, 0.4)'
                      : '0 0 8px rgba(34, 211, 238, 0.2)',
                  }}
                  transition={{ duration: 0.3 }}
                  className="absolute inset-0 rounded-full"
                />
                <motion.img
                  src={testimonial.avatar}
                  alt={testimonial.author}
                  animate={{
                    scale: isFlipped ? 1.1 : 1,
                  }}
                  transition={{
                    type: 'spring',
                    stiffness: 300,
                  }}
                  className="w-12 h-12 rounded-full object-cover relative z-10 border-2 border-white"
                />
              </div>

              <div className="min-w-0">
                <motion.p
                  animate={{
                    color: isFlipped ? '#4F6EF7' : '#0A0A12',
                  }}
                  transition={{ duration: 0.3 }}
                  className="text-[14px] font-semibold leading-tight"
                >
                  {testimonial.author}
                </motion.p>
                <p className="text-[12px] text-[#5A5A6A] leading-tight">
                  {testimonial.role}
                </p>
                <p className="text-[12px] text-[#7B7B8F] font-medium">
                  {testimonial.company}
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function Testimonials() {
  return (
    <section id="testimonials" className="py-[100px] lg:py-[140px] bg-gradient-to-b from-[#F8F8FB] to-[#FFFFFF]">
      <div className="max-w-[1280px] mx-auto px-6 lg:px-12">
        {/* Section Header */}
        <div className="text-center max-w-[720px] mx-auto mb-20">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-[12px] font-semibold text-[#4F6EF7] tracking-widest mb-4 uppercase"
          >
            Testimonios
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{
              duration: 0.7,
              delay: 0.1,
              ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
            }}
            className="text-[28px] sm:text-[36px] lg:text-[52px] font-semibold text-[#0A0A12] leading-[1.15] tracking-[-0.02em] mb-6"
          >
            What Teams Actually Do With This
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{
              duration: 0.6,
              delay: 0.2,
            }}
            className="text-[16px] text-[#5A5A6A] leading-relaxed"
          >
            Real results from people running this in production. They didn't script this.
          </motion.p>
        </div>

        {/* Testimonial Cards with Carousel Effect */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="grid md:grid-cols-3 gap-6 mb-20"
        >
          {testimonials.map((testimonial, index) => (
            <TestimonialCard
              key={testimonial.author}
              testimonial={testimonial}
              index={index}
            />
          ))}
        </motion.div>

        {/* Trust Indicators with Enhanced Animation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-wrap items-center justify-center gap-8 lg:gap-12 pt-8 border-t border-[rgba(0,0,0,0.06)]"
        >
          {[
            { value: '500+', label: 'Companies', sublabel: 'using our agents' },
            { value: '2.4M+', label: 'Calls Handled', sublabel: 'annually' },
            { value: '98.7%', label: 'Satisfaction', sublabel: 'from users' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{
                duration: 0.4,
                delay: 0.4 + i * 0.1,
                type: 'spring',
                stiffness: 300,
              }}
              className="text-center"
            >
              <motion.div
                animate={{
                  scale: [1, 1.05, 1],
                }}
                transition={{
                  duration: 3,
                  delay: i * 0.5,
                  repeat: Infinity,
                }}
              >
                <p className="text-[24px] lg:text-[28px] font-bold text-[#0A0A12]">
                  {stat.value}
                </p>
              </motion.div>
              <p className="text-[14px] font-semibold text-[#0A0A12] mt-1">
                {stat.label}
              </p>
              <p className="text-[12px] text-[#5A5A6A]">{stat.sublabel}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
