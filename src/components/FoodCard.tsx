import { useEffect, useState } from 'react'
import { detectFoods, highlight } from '@/lib/voice/foods'
import type { MomentData } from '@/lib/voice/useAssistant'

/** Posiciones (en %) donde van apareciendo los stickers de lo que se menciona. */
const SLOTS = [
  { x: 24, y: 36 }, { x: 52, y: 26 }, { x: 78, y: 40 },
  { x: 34, y: 70 }, { x: 66, y: 72 }, { x: 14, y: 62 }, { x: 88, y: 70 }, { x: 50, y: 50 },
]

/** Los momentos del día son etiquetas fijas heredadas; aquí se muestran con su significado. */
const MOMENT_LABEL: Record<string, string> = {
  'WAKING UP': 'AL DESPERTAR', MORNING: 'MAÑANA', AFTERNOON: 'TARDE', EVENING: 'ATARDECER', NIGHT: 'NOCHE', MEAL: 'BOTANAS',
}
const momentLabel = (m: string) => MOMENT_LABEL[m] ?? m

function fileCode(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash)
  return `UN-${(Math.abs(hash) % 9000) + 1000}`
}

function Sticker({ emoji, x, y }: { emoji: string; x: number; y: number }) {
  const [shown, setShown] = useState(false)
  useEffect(() => { const t = requestAnimationFrame(() => setShown(true)); return () => cancelAnimationFrame(t) }, [])
  return (
    <span
      className="absolute text-[34px] leading-none select-none transition-all duration-500 ease-[cubic-bezier(.3,1.6,.5,1)]"
      style={{
        left: `${x}%`, top: `${y}%`,
        opacity: shown ? 1 : 0,
        transform: `translate(-50%, -50%) scale(${shown ? 1 : 0.4})`,
      }}
    >
      {emoji}
    </span>
  )
}

const BARS = Array.from({ length: 26 }, (_, i) => ({ h: 6 + Math.round(Math.sin((i / 26) * Math.PI) * 18), d: (i * 90) % 900 }))

/**
 * Tarjeta de una pregunta de nutrición dentro del chat. Mientras hablas: palabras subrayadas, etiquetas y stickers
 * en vivo (solo con un dictado que dé texto en vivo). Al terminar, la imagen real de Gemini se revela encima.
 */
export default function FoodCard({
  moment, questionId, data, live, active, listening, compact,
}: {
  moment: string
  questionId: string
  data?: MomentData
  live: string
  active: boolean
  listening: boolean
  compact: boolean
}) {
  const said = Object.values(data?.answers ?? {}).join(' ')
  const hits = detectFoods(`${said} ${live}`)
  const image = data?.imageUrl

  if (compact) {
    // Pregunta anterior del mismo momento: solo queda una miniatura (la imagen vigente está en la tarjeta nueva)
    return (
      <div className="self-start flex items-center gap-2 rounded-2xl border border-[#DDD5EE] bg-white px-3 py-2">
        {image ? <img src={image} alt="" className="h-10 w-10 rounded-lg object-cover" /> : <span className="text-xl">🍽️</span>}
        <span className="font-mono text-[8px] font-bold uppercase tracking-widest text-mn-sky">{momentLabel(moment)} · registrado</span>
      </div>
    )
  }

  return (
    <div className="self-stretch rounded-[20px] border border-[#DDD5EE] bg-white p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="rounded-full bg-[#2D2440] px-2.5 py-1 font-mono text-[8px] font-bold tracking-[0.1em] text-[#F0C030]">{momentLabel(moment)}</span>
        <span className="font-mono text-[8px] font-bold tracking-[0.06em] text-mn-sky">{fileCode(questionId)} // INGESTA</span>
      </div>

      <div className="relative aspect-[4/3] overflow-hidden rounded-[14px] border-[1.5px] border-[#DDD5EE] bg-[#E9E2F7]">
        <span className="absolute left-2 top-2 z-10 rounded-lg bg-[#2D2440]/80 px-2 py-0.5 font-mono text-[7px] font-bold tracking-[0.1em] text-[#EDE9F8]">
          {data?.generating ? '// DIBUJANDO…' : image ? '// IMG_FINAL' : `// IMG_GEN · ${hits.length}`}
        </span>

        {!image && hits.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center font-mono text-[9px] tracking-[0.06em] text-[#8878AA]">
            esperando descripción<span className="animate-pulse text-[#E8503A]">_</span>
          </div>
        )}

        {/* stickers en vivo (se ocultan cuando llega la imagen real) */}
        <div className={`absolute inset-0 transition-opacity duration-700 ${image ? 'opacity-0' : 'opacity-100'}`}>
          {hits.slice(0, SLOTS.length).map((h, i) => <Sticker key={h.key} emoji={h.emoji} x={SLOTS[i].x} y={SLOTS[i].y} />)}
        </div>

        {image && (
          <img
            src={image}
            alt="Ilustración de lo que consumiste"
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${data?.generating ? 'opacity-50' : 'opacity-100'}`}
          />
        )}
        {data?.generating && !image && (
          <div className="absolute inset-x-0 bottom-0 h-1 animate-pulse bg-[#F0C030]" />
        )}
      </div>

      {hits.length > 0 && (
        <div className="flex min-h-[22px] flex-wrap gap-1.5">
          {hits.map(h => (
            <span key={h.key} className="rounded-[10px] border border-[#DDD5EE] bg-white px-2 py-0.5 font-mono text-[8px] font-bold text-[#5A4A7A]">
              {h.emoji} {h.label}
            </span>
          ))}
        </div>
      )}

      {active && listening && (
        <div className="flex h-[26px] items-center justify-center gap-[3px]">
          {BARS.map((b, i) => (
            <span key={i} className="w-[3px] animate-pulse rounded-sm bg-[#8A5FCC]" style={{ height: b.h, animationDelay: `${b.d}ms` }} />
          ))}
        </div>
      )}

      {active && (listening || live) && (
        <div className="rounded-xl border border-[#DDD5EE] bg-[#FAF9FD] px-3 py-2">
          <div className="mb-1 font-mono text-[7px] font-bold tracking-[0.14em] text-[#B0A8CC]">// TRANSCRIPCIÓN EN VIVO</div>
          <div className="text-[11px] leading-[1.7] text-[#2D2440]">
            {live
              ? highlight(live).map((w, i) => (
                  <span key={i}>
                    {w.food ? <span className="rounded-sm border-b-2 border-[#F0C030] bg-[#F0C03033] px-px">{w.word}</span> : w.word}{' '}
                  </span>
                ))
              : <span className="italic text-[#B0A8CC]">habla ahora…</span>}
            <span className="animate-pulse text-[#E8503A]">_</span>
          </div>
        </div>
      )}
    </div>
  )
}
