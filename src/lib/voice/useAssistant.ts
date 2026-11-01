import { useCallback, useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import { voiceApi, type VoiceQuestion } from '@/services/api'
import { defaultEngineId, getEngine, type EngineId, type Lang, type ListenSession } from './engines'
import { isTestMode, useTestMode } from './testMode'

export type Status = 'idle' | 'listening' | 'thinking' | 'speaking'
export type VoiceOut = 'elevenlabs' | 'browser'

/** Un renglón del chat: burbuja del usuario, burbuja del asistente o la tarjeta de imagen de una pregunta de nutrición. */
export interface Line {
  id: number
  who: 'yo' | 'asistente' | 'card'
  text: string
  /** Solo en tarjetas: pregunta y momento del día a los que pertenece. */
  questionId?: string
  moment?: string
}

/** Lo dicho en un momento del día para las preguntas con imagen, y la imagen que se generó con todo eso. */
export interface MomentData {
  texts: string[]
  imageUrl?: string
  generating: boolean
}

// Idioma de dictado: hoy español. Es un ajuste y no un literal repartido por el código (listo para varios idiomas).
const LANG: Lang = 'es'
const DEFAULT_MOMENT = 'MOMENTO'

const KEY_ENGINE = 'mnestics:voice-engine'
const KEY_VOICE = 'mnestics:voice-out'
const SILENCE = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA='

function read<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  try {
    const v = localStorage.getItem(key) as T | null
    return v && allowed.includes(v) ? v : fallback
  } catch { return fallback }
}
function write(key: string, value: string) {
  try { localStorage.setItem(key, value) } catch { /* sin almacenamiento */ }
}

function friendly(e: unknown): string {
  const err = e as { name?: string; message?: string; response?: { status?: number; data?: { message?: string } } }
  if (err?.name === 'NotAllowedError') return 'Permite el micrófono para usar el asistente'
  if (err?.name === 'NotFoundError') return 'No encontré un micrófono'
  if (err?.response?.status === 429) return 'Demasiadas solicitudes de voz, intenta más tarde'
  return err?.response?.data?.message ?? err?.message ?? 'Algo falló con el asistente'
}

export function useAssistant() {
  const qc = useQueryClient()
  const { current } = useAuth()
  const userId = current?.id
  const testMode = useTestMode()

  const [engineId, setEngine] = useState<EngineId>(() =>
    read(KEY_ENGINE, ['deepgram', 'groq', 'browser'] as const, defaultEngineId()),
  )
  const [voiceOut, setVoice] = useState<VoiceOut>(() => read(KEY_VOICE, ['elevenlabs', 'browser'] as const, 'elevenlabs'))
  const [lines, setLines] = useState<Line[]>([])
  const [status, setStatus] = useState<Status>('idle')
  const [partial, setPartial] = useState('')
  const [started, setStarted] = useState(false)
  const [done, setDone] = useState(false)
  const [savedCount, setSavedCount] = useState(0)
  const [question, setQuestion] = useState<VoiceQuestion | null>(null)
  const [moments, setMoments] = useState<Record<string, MomentData>>({})

  const historyRef = useRef<unknown[]>([])
  const sessionRef = useRef<ListenSession | null>(null)
  const heldRef = useRef(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const stopSpeech = useRef<(() => void) | null>(null)
  const lineId = useRef(0)
  const momentRef = useRef(DEFAULT_MOMENT)
  const momentsRef = useRef<Record<string, MomentData>>({})
  const drawSeq = useRef<Record<string, number>>({})

  const setEngineId = (id: EngineId) => { setEngine(id); write(KEY_ENGINE, id) }
  const setVoiceOut = (v: VoiceOut) => { setVoice(v); write(KEY_VOICE, v) }

  const addLine = (line: Omit<Line, 'id'>) =>
    setLines(l => [...l, { id: ++lineId.current, ...line }])

  function updateMoment(key: string, fn: (m: MomentData) => MomentData) {
    const next = fn(momentsRef.current[key] ?? { texts: [], generating: false })
    momentsRef.current = { ...momentsRef.current, [key]: next }
    setMoments(momentsRef.current)
  }

  /**
   * Genera la imagen del momento del día con TODO lo dicho hasta ahora (plato y bebida). Se genera de nuevo cada vez,
   * no se edita la anterior: así no se acumula deriva. Si llega una respuesta nueva mientras se dibuja, gana la última.
   */
  async function drawMoment(key: string, questionId: string, newTexts: string[]) {
    const seq = (drawSeq.current[key] = (drawSeq.current[key] ?? 0) + 1)
    updateMoment(key, m => ({ ...m, texts: [...m.texts, ...newTexts], generating: true }))
    try {
      const blob = await voiceApi.image(questionId, momentsRef.current[key].texts.join(', '))
      if (seq !== drawSeq.current[key]) return
      const url = URL.createObjectURL(blob)
      const old = momentsRef.current[key]?.imageUrl
      updateMoment(key, m => ({ ...m, imageUrl: url, generating: false }))
      if (old) URL.revokeObjectURL(old)
    } catch (e) {
      if (seq !== drawSeq.current[key]) return
      updateMoment(key, m => ({ ...m, generating: false }))
      toast.error(`No pude dibujar la imagen: ${friendly(e)}`)
    }
  }

  /** En iPhone, el audio solo suena si el elemento se "desbloquea" dentro de un toque del usuario. */
  function unlockAudio() {
    if (!audioRef.current) audioRef.current = new Audio()
    audioRef.current.src = SILENCE
    audioRef.current.play().catch(() => { /* sin permiso aún */ })
  }

  function playBlob(blob: Blob): Promise<void> {
    return new Promise<void>(resolve => {
      const audio = audioRef.current ?? (audioRef.current = new Audio())
      const url = URL.createObjectURL(blob)
      const end = () => { URL.revokeObjectURL(url); stopSpeech.current = null; resolve() }
      stopSpeech.current = () => { audio.pause(); end() }
      audio.onended = end
      audio.onerror = end
      audio.src = url
      audio.play().catch(end)
    })
  }

  function speakBrowser(text: string): Promise<void> {
    return new Promise<void>(resolve => {
      if (!('speechSynthesis' in window)) return resolve()
      const u = new SpeechSynthesisUtterance(text)
      u.lang = 'es-MX'
      const end = () => { stopSpeech.current = null; resolve() }
      u.onend = end
      u.onerror = end
      stopSpeech.current = () => { window.speechSynthesis.cancel(); end() }
      window.speechSynthesis.speak(u)
    })
  }

  async function speak(text: string) {
    if (!text) return
    setStatus('speaking')
    try {
      if (voiceOut === 'elevenlabs') {
        try {
          await playBlob(await voiceApi.tts(text))
          return
        } catch {
          toast.error('No pude usar la voz de ElevenLabs; uso la del navegador')
        }
      }
      await speakBrowser(text)
    } finally {
      setStatus('idle')
    }
  }

  async function send(text: string, opts: { silent?: boolean } = {}) {
    if (!opts.silent) addLine({ who: 'yo', text })
    setStatus('thinking')
    try {
      const dryRun = isTestMode()
      const turn = await voiceApi.agent(text, historyRef.current, Intl.DateTimeFormat().resolvedOptions().timeZone, dryRun)
      historyRef.current = turn.history
      if (turn.moment) momentRef.current = turn.moment.toUpperCase()
      if (turn.reply) addLine({ who: 'asistente', text: turn.reply })

      if (turn.question) {
        setQuestion(turn.question)
        if (turn.question.imagen) {
          addLine({ who: 'card', text: '', questionId: turn.question.id, moment: momentRef.current })
        }
      } else if (turn.done) {
        setQuestion(null)
      }

      if (turn.saved.length > 0) {
        setSavedCount(c => c + turn.saved.length)
        toast.success(
          dryRun
            ? 'Modo pruebas: respuesta recibida, no se guardó'
            : turn.saved.length === 1 ? 'Respuesta guardada' : `${turn.saved.length} respuestas guardadas`,
        )
        if (!dryRun) {
          qc.invalidateQueries({ queryKey: ['respuestas-recent', userId] })
          qc.invalidateQueries({ queryKey: ['respuestas-month', userId] })
          qc.invalidateQueries({ queryKey: ['bitacoras-dates', userId] })
        }
        const withImage = turn.saved.filter(s => s.imagen)
        if (withImage.length > 0) {
          // La imagen se dibuja mientras el asistente habla, sin hacerlo esperar
          void drawMoment(momentRef.current, withImage[withImage.length - 1].questionId, withImage.map(s => s.body))
        }
      }
      if (turn.done) setDone(true)
      await speak(turn.reply)
    } catch (e) {
      setStatus('idle')
      toast.error(friendly(e))
    }
  }

  /** Termina la sesión de dictado en curso y manda lo dicho al agente. */
  async function finish() {
    const session = sessionRef.current
    sessionRef.current = null
    if (!session) return
    setStatus('thinking')
    try {
      const text = (await session.stop()).trim()
      setPartial('')
      if (!text) {
        setStatus('idle')
        toast('No te escuché, intenta de nuevo')
        return
      }
      await send(text)
    } catch (e) {
      setPartial('')
      setStatus('idle')
      toast.error(friendly(e))
    }
  }

  async function pressStart() {
    if (status === 'thinking' || status === 'listening') return
    stopSpeech.current?.() // interrumpir al asistente mientras habla
    heldRef.current = true
    setPartial('')
    setStatus('listening')
    try {
      const session = await getEngine(engineId).listen({ lang: LANG, onPartial: setPartial })
      sessionRef.current = session
      if (!heldRef.current) await finish() // soltó el botón mientras se pedía el micrófono
    } catch (e) {
      heldRef.current = false
      setStatus('idle')
      toast.error(friendly(e))
    }
  }

  function pressEnd() {
    heldRef.current = false
    if (sessionRef.current) void finish()
  }

  async function begin() {
    unlockAudio()
    setStarted(true)
    await send('Hola', { silent: true })
  }

  function reset() {
    stopSpeech.current?.()
    sessionRef.current?.stop().catch(() => undefined)
    sessionRef.current = null
    heldRef.current = false
    historyRef.current = []
    Object.values(momentsRef.current).forEach(m => { if (m.imageUrl) URL.revokeObjectURL(m.imageUrl) })
    momentsRef.current = {}
    drawSeq.current = {}
    momentRef.current = DEFAULT_MOMENT
    setMoments({})
    setQuestion(null)
    setLines([])
    setPartial('')
    setStatus('idle')
    setStarted(false)
    setDone(false)
    setSavedCount(0)
  }

  const sendText = useCallback(
    (text: string) => {
      const t = text.trim()
      if (t && status === 'idle') void send(t)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [status, voiceOut],
  )

  useEffect(() => () => {
    stopSpeech.current?.()
    sessionRef.current?.stop().catch(() => undefined)
    Object.values(momentsRef.current).forEach(m => { if (m.imageUrl) URL.revokeObjectURL(m.imageUrl) })
  }, [])

  return {
    engineId, setEngineId, voiceOut, setVoiceOut, testMode,
    lines, status, partial, started, done, savedCount, question, moments,
    begin, pressStart, pressEnd, sendText, reset,
  }
}
