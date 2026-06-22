import { motion } from 'framer-motion'
import { Crown, TrendingUp } from 'lucide-react'

interface LeaderboardEntry {
  rank: number
  name: string
  company: string
  meetings: number
  growth: number
}

const mockLeaderboard: LeaderboardEntry[] = [
  { rank: 1, name: 'Ana García', company: 'DataPro', meetings: 347, growth: 340 },
  { rank: 2, name: 'Carlos López', company: 'TechFlow', meetings: 289, growth: 280 },
  { rank: 3, name: 'María Rodríguez', company: 'NovaCRM', meetings: 256, growth: 245 },
  { rank: 4, name: 'Jorge Martínez', company: 'BuildCorp', meetings: 198, growth: 175 },
  { rank: 5, name: 'Sofia Hernández', company: 'VentureLabs', meetings: 167, growth: 142 },
]

export function DailyLeaderboard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="bg-gradient-to-br from-[#4F6EF7]/20 to-[#7B61FF]/20 rounded-2xl p-6 border border-[#4F6EF7]/30 backdrop-blur-sm"
    >
      <div className="flex items-center gap-2 mb-6">
        <Crown className="w-5 h-5 text-[#F59E0B]" />
        <h3 className="text-[16px] font-bold text-white">Top Performers Esta Semana</h3>
      </div>

      <div className="space-y-3">
        {mockLeaderboard.map((entry, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.05 }}
            className={`flex items-center justify-between p-3 rounded-lg transition-all ${
              i < 3
                ? 'bg-gradient-to-r from-[#4F6EF7]/30 to-transparent border border-[#4F6EF7]/50 shadow-lg shadow-[#4F6EF7]/20'
                : 'bg-[#0A0A12]/40 border border-[#4F6EF7]/20'
            }`}
          >
            <div className="flex items-center gap-3 flex-1">
              <div className="w-6 h-6 rounded-full bg-[#4F6EF7] flex items-center justify-center flex-shrink-0">
                <span className="text-[12px] font-bold text-white">{entry.rank}</span>
              </div>
              <div>
                <p className="text-[13px] font-semibold text-white">{entry.name}</p>
                <p className="text-[11px] text-[#8A8A9A]">{entry.company}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-[13px] font-bold text-white">{entry.meetings}</p>
                <p className="text-[10px] text-[#8A8A9A]">reuniones</p>
              </div>
              <div className="flex items-center gap-1 px-2 py-1 bg-[#10B981]/20 rounded border border-[#10B981]/30">
                <TrendingUp className="w-3 h-3 text-[#10B981]" />
                <span className="text-[11px] font-semibold text-[#10B981]">+{entry.growth}%</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.3 }}
        className="mt-6 pt-6 border-t border-[#4F6EF7]/20 text-center"
      >
        <p className="text-[12px] text-[#8A8A9A] mb-3">¿Dónde está tu equipo?</p>
        <button className="w-full px-4 py-2 bg-gradient-to-r from-[#4F6EF7] to-[#7B61FF] text-white text-[13px] font-semibold rounded-lg hover:shadow-lg hover:shadow-[#4F6EF7]/50 transition-all">
          Únete a los Top Performers
        </button>
      </motion.div>
    </motion.div>
  )
}
