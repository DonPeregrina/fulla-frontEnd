import { useEffect, useRef, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import VoiceOrb from '@/components/VoiceOrb'
import { progressApi } from '@/services/progress'
import { getEngine, type ListenSession } from '@/lib/voice/engines'
import { BAR_COLOR, DEFAULT_BAR_COLOR, STATUS, fmt, goalMax } from './shared'
import type { Indicator, WhatIfResult } from '@/types/progress'

// Modal manos-libres de "Hablar con Mu": hipotéticos ("se me antoja una dona") y su impacto proyectado en los
// indicadores de hoy. No guarda nada, no inventa números: los calcula el backend (AgnoRag), Mu solo comenta.
// Termina de grabar sola al oír la palabra "listo" (o tras 15 s de silencio), sin tener que sostener un botón.

const SCALE = 1.3
const SILENCE_TIMEOUT_MS = 15000
const END_WORD = /\blisto\b\s*\.?\s*$/i

const stripEndWord = (text: string) => text.replace(END_WORD, '').trim()

function speakBrowser(text: string) {
  if (!text || !('speechSynthesis' in window)) return
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'es-MX'
  window.speechSynthesis.speak(u)
}

function apiError(e: unknown): string {
  const res = (e as { response?: { status?: number; data?: { message?: string; code?: string } } } | null)?.response
  // 404 sin código propio = el servicio de analíticas todavía no tiene esta función (no es un error de la persona)
  if (res?.status === 404 && res.data?.code !== 'ANALYTICS_NOT_CONFIGURED') {
    return 'Mu todavía no está disponible, vuelve a intentarlo más tarde'
  }
  return res?.data?.message ?? 'Mu no pudo calcular esto todavía, intenta de nuevo'
}

type Phase = 'start' | 'listening' | 'thinking' | 'result' | 'error'

/** Barra antes/después de un indicador: relleno tenue = hoy, relleno fuerte = con el hipotético */
function DeltaBar({ ind, projectedValue, projectedLabel }: { ind: Indicator; projectedValue: number; projectedLabel: keyof typeof STATUS }) {
  const t = ind.target
  const ratio = (v: number) => {
    if (t.type === 'none') return Math.min(v / (Math.max(v, projectedValue, 1) * 1.1), 1)
    const span = goalMax(t) * SCALE
    return Math.max(0, Math.min(v / span, 1))
  }
  const marker = t.type === 'none' ? null : 1 / SCALE
  const color = BAR_COLOR[ind.key] ?? DEFAULT_BAR_COLOR
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[9px] font-bold uppercase tracking-[0.08em] text-[#5A4A7A]">{ind.label}</span>
        <span className="text-[10px] font-bold text-[#2D2440]">
          {fmt(ind.value ?? 0)} → {fmt(projectedValue)} {ind.unit}
        </span>
      </div>
      <div className="relative h-2.5 rounded-[2px] bg-[#DDD5EE]">
        <div className="absolute inset-y-0 left-0 rounded-[2px] opacity-40" style={{ width: `${ratio(ind.value ?? 0) * 100}%`, background: color }} />
        <div className="absolute inset-y-0 left-0 rounded-[2px]" style={{ width: `${ratio(projectedValue) * 100}%`, background: color }} />
        {marker != null && <div className="absolute -inset-y-[3px] w-[2px] bg-[#2D2440]" style={{ left: `${marker * 100}%` }} />}
      </div>
      <span className="text-[8px] font-bold tracking-[0.06em]" style={{ color: STATUS[projectedLabel].color }}>
        {STATUS[projectedLabel].label}
      </span>
    </div>
  )
}

export default function MuModal({ open, onClose, indicators }: { open: boolean; onClose: () => void; indicators: Indicator[] }) {
  const [phase, setPhase] = useState<Phase>('start')
  const [transcript, setTranscript] = useState('')
  const [result, setResult] = useState<WhatIfResult | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const sessionRef = useRef<ListenSession | null>(null)
  const silenceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const doneRef = useRef(false) // evita cerrar el turno dos veces (palabra "listo" + silencio a la vez)

  function clearSilence() {
    if (silenceRef.current) clearTimeout(silenceRef.current)
    silenceRef.current = null
  }

  function reset() {
    doneRef.current = true
    clearSilence()
    sessionRef.current?.stop().catch(() => {})
    sessionRef.current = null
    setPhase('start')
    setTranscript('')
    setResult(null)
    setErrorMsg('')
  }

  // Al cerrarse el modal se corta cualquier micrófono abierto, aunque la respuesta no haya llegado
  useEffect(() => {
    if (!open) reset()
  }, [open])

  async function finish(session: ListenSession, liveText: string) {
    if (doneRef.current) return
    doneRef.current = true
    clearSilence()
    sessionRef.current = null
    let finalText = liveText
    try {
      finalText = await session.stop()
    } catch {
      /* se usa lo último que se escuchó en vivo */
    }
    const text = stripEndWord(finalText || liveText)
    if (!text) {
      setPhase('start')
      return
    }
    setPhase('thinking')
    try {
      const r = await progressApi.whatIf(text)
      setResult(r)
      setPhase('result')
      speakBrowser(r.comment)
    } catch (e) {
      setErrorMsg(apiError(e))
      setPhase('error')
    }
  }

  async function startListening() {
    doneRef.current = false
    setErrorMsg('')
    setTranscript('')
    setResult(null)
    setPhase('listening')
    try {
      const session = await getEngine('deepgram').listen({
        lang: 'es',
        onPartial: text => {
          setTranscript(text)
          clearSilence()
          silenceRef.current = setTimeout(() => void finish(session, text), SILENCE_TIMEOUT_MS)
          if (END_WORD.test(text)) void finish(session, text)
        },
      })
      sessionRef.current = session
      silenceRef.current = setTimeout(() => void finish(session, ''), SILENCE_TIMEOUT_MS)
    } catch {
      setPhase('error')
      setErrorMsg('No se pudo abrir el micrófono')
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={o => { if (!o) onClose() }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60" />
        <Dialog.Content className="fixed inset-x-4 top-[14%] z-50 mx-auto max-h-[76vh] max-w-sm space-y-4 overflow-y-auto rounded-[24px] border border-[#DDD5EE] bg-white p-5 focus:outline-none">
          <div className="flex items-start justify-between gap-2">
            <Dialog.Title className="text-[10px] font-bold uppercase tracking-[0.14em] text-mn-plum">HABLAR CON MU</Dialog.Title>
            <Dialog.Close className="rounded-full bg-[#EDE9F8] p-1.5 text-mn-plum" aria-label="Cerrar"><X size={14} /></Dialog.Close>
          </div>
          {!result && <Dialog.Description className="sr-only">Habla un hipotético de comida y Mu te muestra el impacto</Dialog.Description>}

          {phase !== 'result' && (
            <div className="flex flex-col items-center gap-3 py-2">
              <VoiceOrb status={phase === 'thinking' ? 'thinking' : phase === 'listening' ? 'listening' : 'idle'} size={96} />
              {phase === 'start' && (
                <>
                  <p className="text-center text-[11px] leading-snug text-[#5A4A7A]">
                    Dime qué se te antoja y te muestro cómo te dejaría. Di <b>"listo"</b> cuando termines de hablar.
                  </p>
                  <button
                    type="button"
                    onClick={() => void startListening()}
                    className="rounded-3xl bg-mn-gold px-5 py-2.5 text-[10px] font-bold text-[#2D2440]"
                  >
                    TOCA PARA HABLAR
                  </button>
                </>
              )}
              {phase === 'listening' && (
                <p className="min-h-[2.5em] text-center text-[12px] leading-snug text-[#2D2440]">{transcript || 'Escuchando…'}</p>
              )}
              {phase === 'thinking' && <p className="text-[11px] text-[#8878AA]">Mu está pensando…</p>}
              {phase === 'error' && (
                <>
                  <p className="text-center text-[11px] leading-snug text-[#E8503A]">{errorMsg}</p>
                  <button
                    type="button"
                    onClick={() => void startListening()}
                    className="rounded-3xl border-[1.5px] border-mn-gold px-5 py-2 text-[10px] font-bold text-mn-plum"
                  >
                    REINTENTAR
                  </button>
                </>
              )}
            </div>
          )}

          {phase === 'result' && result && (
            <div className="space-y-4">
              <div className="space-y-3">
                {result.indicators.map(wi => {
                  const ind = indicators.find(i => i.key === wi.key)
                  if (!ind) return null
                  return <DeltaBar key={wi.key} ind={ind} projectedValue={wi.value} projectedLabel={wi.status} />
                })}
              </div>
              <p className="text-[12px] leading-snug text-[#2D2440]">{result.comment}</p>
              {result.suggestion && (
                <p className="rounded-xl bg-[#F8F6FD] px-3 py-2 text-[11px] leading-snug text-[#5A4A7A]">{result.suggestion}</p>
              )}
              <button
                type="button"
                onClick={() => void startListening()}
                className="w-full rounded-3xl bg-mn-gold px-5 py-2.5 text-[10px] font-bold text-[#2D2440]"
              >
                PREGUNTAR OTRA COSA
              </button>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
