import { calcStreak } from '@/lib/streak'
import { todayISO } from '@/lib/utils'

interface StreakRowProps {
  /** Días con al menos una respuesta, fechas locales YYYY-MM-DD */
  dates: string[]
}

const THREAD_COLORS = ['#F0C030', '#AADDFF', '#5588AA', '#E8503A', '#F0C030', '#AADDFF', '#E8503A']

export default function StreakRow({ dates }: StreakRowProps) {
  const streak = calcStreak(dates, todayISO())
  const totalDots = 7

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-[#1A1535] shrink-0 border-b border-[#2D2440]/30">
      <div className="flex items-center gap-1.5 whitespace-nowrap">
        <div className="h-2 w-2 rounded-full bg-[#E8503A] animate-ping" />
        <span className="font-mono text-[10px] font-bold tracking-[0.16em] text-[#AADDFF] uppercase">
          STABLE MEMORY: <span className="text-[#E8503A]">{streak}D STREAK</span>
        </span>
      </div>
      <div className="flex flex-1 gap-1 justify-end overflow-hidden">
        {Array.from({ length: totalDots }).map((_, i) => (
          <div
            key={i}
            className="h-1.5 w-1.5 shrink-0 rounded-[1px] transition-all duration-300"
            style={{
              backgroundColor: i < streak ? THREAD_COLORS[i % THREAD_COLORS.length] : 'transparent',
              border: i < streak ? 'none' : '1px solid #2D2440',
            }}
          />
        ))}
      </div>
    </div>
  )
}
