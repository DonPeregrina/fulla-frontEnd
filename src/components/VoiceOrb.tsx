import type { Status } from '@/lib/voice/useAssistant'

/** Cómo se ven los anillos en cada estado: hablando = fuertes y rápidos; en reposo = tenues y lentos. */
const LOOK: Record<Status, { color: string; peak: number; seconds: number; breathe: boolean }> = {
  speaking:  { color: '#F0C030', peak: 0.75, seconds: 1.5, breathe: true },
  listening: { color: '#E8503A', peak: 0.5,  seconds: 1.3, breathe: false },
  thinking:  { color: '#8A5FCC', peak: 0.3,  seconds: 2.4, breathe: true },
  idle:      { color: '#F0C030', peak: 0.22, seconds: 3.8, breathe: false },
}

/** La μ de Mnestics, igual que en el prototipo y en la cabecera. */
function Mu({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" aria-hidden>
      <path
        d="M18 62 L18 26 M18 52 Q18 64 32 64 Q46 64 46 52 L46 26 M46 26 L46 64 M46 26 L62 26 M62 26 L62 58"
        stroke="#F0C030" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"
      />
      <circle cx="40" cy="70" r="3.5" fill="#F0C030" />
    </svg>
  )
}

/**
 * Orbe del agente: la μ en un círculo oscuro con anillos que laten.
 * Cuando el asistente habla, los anillos son fuertes; en reposo (escuchando que le hables) son tenues.
 */
export default function VoiceOrb({ status, size = 84 }: { status: Status; size?: number }) {
  const look = LOOK[status]
  const core = Math.round(size * 0.79)
  const ringStyle = (delay: number): React.CSSProperties => ({
    borderColor: look.color,
    ['--ring-peak' as string]: String(look.peak),
    animation: `mn-ring ${look.seconds}s ease-out ${delay}s infinite`,
    opacity: 0,
  })

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }} role="img" aria-label={`Asistente: ${status}`}>
      <span className="mn-orb-ring absolute inset-0 rounded-full border-2" style={ringStyle(0)} />
      <span className="mn-orb-ring absolute inset-0 rounded-full border-2" style={ringStyle(look.seconds / 2)} />
      <span
        className="mn-orb-core relative z-10 flex items-center justify-center rounded-full bg-[#2D2440]"
        style={{ width: core, height: core, animation: look.breathe ? 'mn-breathe 1.4s ease-in-out infinite' : undefined }}
      >
        <Mu size={Math.round(core * 0.58)} />
      </span>
    </div>
  )
}
