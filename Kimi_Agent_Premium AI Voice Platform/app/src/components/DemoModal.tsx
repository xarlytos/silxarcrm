import { motion, AnimatePresence } from 'framer-motion'
import { X, Play } from 'lucide-react'
import { useState } from 'react'

interface DemoModalProps {
  isOpen: boolean
  onClose: () => void
}

export function DemoModal({ isOpen, onClose }: DemoModalProps) {
  const [isPlaying, setIsPlaying] = useState(false)

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 z-40"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-[#0A0A12] rounded-2xl overflow-hidden border border-[#4F6EF7]/20 max-w-4xl w-full">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-[#4F6EF7]/20">
                <h2 className="text-[24px] font-bold text-white">Demo en Vivo</h2>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-[#4F6EF7]/20 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-white" />
                </button>
              </div>

              {/* Video Container */}
              <div className="relative bg-black aspect-video">
                {!isPlaying ? (
                  <motion.button
                    onClick={() => setIsPlaying(true)}
                    whileHover={{ scale: 1.1 }}
                    className="absolute inset-0 flex items-center justify-center group"
                  >
                    <div className="w-20 h-20 rounded-full bg-[#4F6EF7] flex items-center justify-center group-hover:bg-[#7B61FF] transition-colors">
                      <Play className="w-8 h-8 text-white fill-white" />
                    </div>
                  </motion.button>
                ) : (
                  <iframe
                    width="100%"
                    height="100%"
                    src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1"
                    title="VoiceAgent OS Demo"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="border-0"
                  />
                )}
              </div>

              {/* Info */}
              <div className="p-6 bg-gradient-to-b from-transparent to-[#4F6EF7]/5">
                <h3 className="text-[20px] font-bold text-white mb-3">
                  Transforma tus ventas en 5 minutos
                </h3>
                <p className="text-[16px] text-[#8A8A9A] mb-6">
                  Ve en vivo cómo nuestros agentes de voz IA pueden prosperar, persuadir y cerrar deals automáticamente.
                </p>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={onClose}
                    className="px-6 py-3 bg-gradient-to-r from-[#4F6EF7] to-[#7B61FF] text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-[#4F6EF7]/50 transition-all"
                  >
                    Comenzar Prueba Gratuita
                  </button>
                  <button
                    onClick={onClose}
                    className="px-6 py-3 border border-[#4F6EF7]/30 text-white font-semibold rounded-lg hover:bg-[#4F6EF7]/10 transition-colors"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
