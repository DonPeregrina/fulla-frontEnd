import type { Respuesta } from '@/types'

interface StreakRowProps {
  respuestas: Respuesta[]
}

function calcStreak(respuestas: Respuesta[]): number {
  if (!respuestas.length) return 0

  // Obtener fechas únicas con respuestas (formato YYYY-MM-DD)
  const dates = new Set(
    respuestas.map(r => {
      const d = new Date(Number(r.createdAt))
      return isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0]
    }).filter(Boolean)
  )

  let streak = 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (let i = 0; i < 365; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const iso = d.toISOString().split('T')[0]
    if (dates.has(iso)) {
      streak++
    } else {
      break
    }
  }
  return streak
}

const THREAD_COLORS = ['#F0C030', '#AADDFF', '#5588AA', '#E8503A', '#F0C030', '#AADDFF', '#E8503A']

export default function StreakRow({ respuestas }: StreakRowProps) {
  const streak = calcStreak(respuestas)
  const totalDots = 7

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-[#1A1535] shrink-0 border-b border-[#2D2440]/30">
      <div className="flex items-center gap-1.5 whitespace-nowrap">
        <div className="h-2 w-2 rounded-full bg-[#E8503A] animate-ping" />
        <span className="font-mono text-[8px] font-bold tracking-[0.16em] text-[#AADDFF] uppercase">
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
