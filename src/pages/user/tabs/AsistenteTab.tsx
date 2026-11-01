import { useEffect, useRef, useState } from 'react'
import { Mic, RotateCcw, Send, CheckCircle2, FlaskConical } from 'lucide-react'
import FoodCard from '@/components/FoodCard'
import { setTestMode } from '@/lib/voice/testMode'
import { ENGINES } from '@/lib/voice/engines'
import { useAssistant, type Status, type VoiceOut } from '@/lib/voice/useAssistant'

const STATUS_LABEL: Record<Status, string> = {
  idle: 'Mantén para hablar',
  listening: 'Escuchando…',
  thinking: 'Pensando…',
  speaking: 'Hablando… (toca para interrumpir)',
}

const VOICES: { id: VoiceOut; label: string }[] = [
  { id: 'elevenlabs', label: 'ElevenLabs' },
  { id: 'browser', label: 'Navegador' },
]

const chip = (active: boolean, disabled = false) =>
  `px-3 py-2 rounded-xl border text-[9px] font-bold uppercase tracking-widest transition-colors ${
    active ? 'bg-[#1A1535] border-[#1A1535] text-[#F0C030]' : 'bg-white border-[#DDD5EE] text-mn-plum'
  } ${disabled ? 'opacity-35' : ''}`

export default function AsistenteTab() {
  const a = useAssistant()
  const [typed, setTyped] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }) }, [a.lines, a.partial])

  const talking = a.status === 'listening'
  // La tarjeta más reciente de cada momento del día es la vigente; las anteriores quedan como miniatura
  const lastCardOfMoment: Record<string, number> = {}
  a.lines.forEach(l => { if (l.who === 'card' && l.moment) lastCardOfMoment[l.moment] = l.id })

  return (
    <div className="flex flex-col min-h-full bg-mn-bg pb-72 px-4 pt-3 gap-3 select-none">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[9px] font-bold text-mn-sky tracking-[0.1em] uppercase">
          // Asistente de voz
          {a.testMode && <span className="ml-2 rounded-full bg-[#E8503A] px-2 py-0.5 text-[8px] text-white">Modo pruebas</span>}
        </span>
        {a.started && (
          <button onClick={a.reset} className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-mn-plum">
            <RotateCcw size={12} /> Reiniciar
          </button>
        )}
      </div>

      {/* Ajustes de prueba: motor de dictado y voz */}
      <div className="bg-white border border-[#DDD5EE] rounded-[20px] p-3 space-y-2">
        <p className="font-mono text-[8px] font-bold text-mn-sky tracking-[0.12em] uppercase">Dictado</p>
        <div className="flex flex-wrap gap-2">
          {ENGINES.map(e => (
            <button
              key={e.id}
              onClick={() => e.supported() && a.setEngineId(e.id)}
              disabled={!e.supported()}
              title={e.hint}
              className={chip(a.engineId === e.id, !e.supported())}
            >
              {e.label}{e.live ? ' · en vivo' : ''}
            </button>
          ))}
        </div>
        <p className="font-mono text-[8px] font-bold text-mn-sky tracking-[0.12em] uppercase pt-1">Voz del asistente</p>
        <div className="flex flex-wrap gap-2">
          {VOICES.map(v => (
            <button key={v.id} onClick={() => a.setVoiceOut(v.id)} className={chip(a.voiceOut === v.id)}>{v.label}</button>
          ))}
        </div>
        <p className="font-mono text-[8px] font-bold text-mn-sky tracking-[0.12em] uppercase pt-1">Pruebas</p>
        <button onClick={() => setTestMode(!a.testMode)} className={`${chip(a.testMode)} flex items-center gap-1.5`}>
          <FlaskConical size={12} /> Modo pruebas · {a.testMode ? 'no guarda' : 'guarda'}
        </button>
      </div>

      {!a.started ? (
        <div className="flex flex-col items-center justify-center text-center gap-4 py-10">
          <p className="text-[11px] text-mn-plum max-w-[260px] leading-relaxed">
            Te preguntaré en qué momento del día estás y luego tus preguntas, una por una. Responde hablando.
          </p>
          <button
            onClick={() => void a.begin()}
            className="px-8 py-4 rounded-2xl bg-[#F0C030] text-[#1A1535] text-[10px] font-bold uppercase tracking-[0.2em] active:scale-95 transition-transform"
          >
            Empezar
          </button>
        </div>
      ) : (
        <>
          {/* Conversación */}
          <div className="flex flex-col gap-2">
            {a.lines.map(l => {
              if (l.who === 'card') {
                const isLatest = lastCardOfMoment[l.moment!] === l.id
                const active = isLatest && a.question?.id === l.questionId
                return (
                  <FoodCard
                    key={l.id}
                    moment={l.moment!}
                    questionId={l.questionId!}
                    data={a.moments[l.moment!]}
                    live={active ? a.partial : ''}
                    active={active}
                    listening={a.status === 'listening'}
                    compact={!isLatest}
                  />
                )
              }
              return (
                <div
                  key={l.id}
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-[12px] leading-relaxed ${
                    l.who === 'yo'
                      ? 'self-end bg-[#1A1535] text-white'
                      : 'self-start bg-white border border-[#DDD5EE] text-mn-plum'
                  }`}
                >
                  {l.text}
                </div>
              )
            })}
            {a.partial && !a.question?.imagen && (
              <div className="self-end max-w-[85%] rounded-2xl px-4 py-3 text-[12px] italic bg-[#EDE9F8] text-mn-plum">
                {a.partial}…
              </div>
            )}
            {a.status === 'thinking' && (
              <div className="self-start px-2 text-[10px] text-mn-sky animate-pulse font-mono">…</div>
            )}
            <div ref={endRef} />
          </div>

          {a.savedCount > 0 && (
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-emerald-600">
              <CheckCircle2 size={14} /> {a.savedCount} {a.savedCount === 1 ? 'respuesta guardada' : 'respuestas guardadas'}
            </div>
          )}

          {a.done ? (
            <div className="text-center py-4">
              <p className="text-[11px] text-mn-plum mb-3">Sesión terminada.</p>
              <button onClick={a.reset} className="px-6 py-3 rounded-2xl bg-[#1A1535] text-[#F0C030] text-[9px] font-bold uppercase tracking-widest">
                Nueva sesión
              </button>
            </div>
          ) : (
            <div className="fixed inset-x-0 bottom-[72px] z-40 flex flex-col items-center gap-2 px-4 pb-2 pointer-events-none">
              <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-mn-plum pointer-events-none">
                {STATUS_LABEL[a.status]}
              </span>
              <button
                onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); void a.pressStart() }}
                onPointerUp={a.pressEnd}
                onPointerCancel={a.pressEnd}
                onContextMenu={e => e.preventDefault()}
                disabled={a.status === 'thinking'}
                aria-label="Mantén para hablar"
                style={{ touchAction: 'none' }}
                className={`pointer-events-auto flex h-20 w-20 items-center justify-center rounded-full border-2 shadow-lg transition-all ${
                  talking
                    ? 'scale-110 border-[#F0C030] bg-[#F0C030] text-[#1A1535]'
                    : 'border-[#1A1535] bg-[#1A1535] text-[#F0C030]'
                } disabled:opacity-40`}
              >
                <Mic size={30} />
              </button>
              <form
                className="pointer-events-auto flex w-full max-w-sm gap-2"
                onSubmit={e => { e.preventDefault(); a.sendText(typed); setTyped('') }}
              >
                <input
                  value={typed}
                  onChange={e => setTyped(e.target.value)}
                  placeholder="o escribe tu respuesta…"
                  className="flex-1 rounded-xl border border-[#DDD5EE] bg-white px-3 py-2 text-[12px] text-mn-plum focus:outline-none focus:border-[#F0C030]"
                />
                <button type="submit" disabled={!typed.trim() || a.status !== 'idle'} className="rounded-xl bg-[#1A1535] px-3 text-[#F0C030] disabled:opacity-35">
                  <Send size={16} />
                </button>
              </form>
            </div>
          )}
        </>
      )}
    </div>
  )
}
