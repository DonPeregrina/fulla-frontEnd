import { useCallback, useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import { voiceApi, type VoiceQuestion } from '@/services/api'
import { getEngine, type Lang, type ListenSession } from './engines'
import { useVoiceSettings } from './settings'
import { isTestMode, useTestMode } from './testMode'
import { saveImage } from './archive'
import { ARCHIVE_KEY } from './useArchive'
import { todayISO } from '@/lib/utils'

export type Status = 'idle' | 'listening' | 'thinking' | 'speaking'

/** Un renglón del chat: burbuja del usuario, burbuja del asistente o la tarjeta de imagen de una pregunta de nutrición. */
export interface Line {
  id: number
  who: 'yo' | 'asistente' | 'card'
  text: string
  /** Solo en tarjetas: pregunta y momento del día a los que pertenece. */
  questionId?: string
  moment?: string
  /** Solo en tarjetas: (momento + hilo) al que pertenece; todas las tarjetas del mismo slot comparten imagen. */
  slot?: string
}

/**
 * Lo dicho en un momento del día y un hilo para las preguntas con imagen, y la imagen que se generó con todo eso.
 * `answers` guarda la ÚLTIMA respuesta de cada pregunta (igual que la base de datos: una respuesta por pregunta y día),
 * así una corrección reemplaza lo anterior en lugar de sumarse.
 */
export interface MomentData {
  answers: Record<string, string>
  imageUrl?: string
  generating: boolean
  /** Hay respuestas que aún no están en la imagen: se dibuja al cerrarse el hilo o con "Dibujar ahora". */
  pending: boolean
  /** Pregunta cuyo hilo aporta el prompt de la imagen, momento y hilo (para archivar). */
  lastQuestionId?: string
  moment?: string
  hiloId?: string
}

/** Una imagen por (momento del día, hilo): dos hilos con imagen en el mismo momento no se mezclan. */
export const slotKey = (moment: string, hiloId?: string | null) => `${moment.toUpperCase()}::${hiloId ?? ''}`

// Idioma de dictado: hoy español. Es un ajuste y no un literal repartido por el código (listo para varios idiomas).
const LANG: Lang = 'es'
const DEFAULT_MOMENT = 'MOMENTO'

const SILENCE = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA='

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

  const { engineId, voiceOut } = useVoiceSettings()
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

  const addLine = (line: Omit<Line, 'id'>) =>
    setLines(l => [...l, { id: ++lineId.current, ...line }])

  function updateMoment(key: string, fn: (m: MomentData) => MomentData) {
    const next = fn(momentsRef.current[key] ?? { answers: {}, generating: false, pending: false })
    momentsRef.current = { ...momentsRef.current, [key]: next }
    setMoments(momentsRef.current)
  }

  /**
   * Anota lo dicho en un (momento, hilo) SIN generar imagen. Las respuestas quedan en `answers` de inmediato, así los
   * stickers en vivo de la tarjeta siguen apareciendo mientras se habla; lo único que se aplaza es la llamada a la imagen.
   */
  function collect(slot: string, moment: string, hiloId: string | undefined, saved: { questionId: string; body: string }[]) {
    updateMoment(slot, m => ({
      ...m,
      moment,
      hiloId,
      answers: { ...m.answers, ...Object.fromEntries(saved.map(s => [s.questionId, s.body])) },
      lastQuestionId: saved[saved.length - 1].questionId,
      pending: true,
    }))
  }

  /**
   * Genera la imagen del (momento, hilo) con TODO lo dicho hasta ahora (plato y bebida). Se genera de nuevo cada vez,
   * no se edita la anterior: así no se acumula deriva. Si llega una respuesta nueva mientras se dibuja, gana la última.
   */
  async function drawSlot(slot: string) {
    const snap = momentsRef.current[slot]
    if (!snap?.lastQuestionId) return
    const seq = (drawSeq.current[slot] = (drawSeq.current[slot] ?? 0) + 1)
    updateMoment(slot, m => ({ ...m, pending: false, generating: true }))
    try {
      const description = Object.values(snap.answers).join(', ')
      const blob = await voiceApi.image(snap.lastQuestionId, description)
      if (seq !== drawSeq.current[slot]) return
      const url = URL.createObjectURL(blob)
      // Archivo local: solo en sesiones reales (en modo pruebas no se archiva) y solo la imagen vigente del hilo
      if (userId && !isTestMode() && snap.moment) {
        void saveImage({
          userId, day: todayISO(), moment: snap.moment, hiloId: snap.hiloId, description, image: blob,
          questionIds: Object.keys(snap.answers),
        }).then(ok => {
          if (ok) qc.invalidateQueries({ queryKey: [ARCHIVE_KEY, userId] })
        })
      }
      const old = momentsRef.current[slot]?.imageUrl
      updateMoment(slot, m => ({ ...m, imageUrl: url, generating: false }))
      if (old) URL.revokeObjectURL(old)
    } catch (e) {
      if (seq !== drawSeq.current[slot]) return
      updateMoment(slot, m => ({ ...m, generating: false }))
      toast.error(`No pude dibujar la imagen: ${friendly(e)}`)
    }
  }

  /**
   * Dibuja lo que ya no va a recibir más respuestas. Un (momento, hilo) con respuestas pendientes ESPERA mientras la
   * siguiente pregunta que plantea el asistente sea del mismo hilo y momento y lleve imagen; se dibuja cuando la
   * siguiente es de otro hilo/momento, no lleva imagen, no hay más preguntas o la sesión terminó.
   */
  function flushFinished(turn: { done: boolean; question?: VoiceQuestion | null }) {
    const q = turn.question
    const waitingSlot = !turn.done && q?.imagen ? slotKey(q.nudo ?? momentRef.current, q.hiloId) : null
    Object.entries(momentsRef.current).forEach(([slot, m]) => {
      if (m.pending && slot !== waitingSlot) void drawSlot(slot)
    })
  }

  /** "Dibujar ahora": el usuario no va a contestar el resto del hilo y quiere ver la imagen ya. */
  const drawNow = (slot: string) => { void drawSlot(slot) }

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
        if (turn.question.nudo) momentRef.current = turn.question.nudo.toUpperCase()
        if (turn.question.imagen) {
          addLine({
            who: 'card', text: '', questionId: turn.question.id, moment: momentRef.current,
            slot: slotKey(momentRef.current, turn.question.hiloId),
          })
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
        // Solo se dibuja lo que trae descripción visual (comida o bebida); un peso o un "nada" no genera imagen
        const withImage = turn.saved.filter(s => s.imagen && s.visual).map(s => ({ ...s, body: s.visual! }))
        // Cada respuesta pertenece al momento Y al hilo de SU pregunta (puede ser un momento anterior si el usuario
        // corrige algo). Aquí solo se anotan; la imagen se pide cuando ya no falten respuestas de ese hilo (abajo).
        const bySlot = new Map<string, { moment: string; hiloId?: string; items: typeof withImage }>()
        withImage.forEach(item => {
          const moment = (item.nudo ?? momentRef.current).toUpperCase()
          const hiloId = item.hiloId ?? undefined
          const slot = slotKey(moment, hiloId)
          const entry = bySlot.get(slot) ?? { moment, hiloId, items: [] }
          entry.items.push(item)
          bySlot.set(slot, entry)
        })
        bySlot.forEach((e, slot) => collect(slot, e.moment, e.hiloId, e.items))
      }
      // Solo se decide al guardar algo o al terminar: un turno de aclaración (sin guardar ni preguntar) no cierra el hilo
      if (turn.saved.length > 0 || turn.done) flushFinished(turn)
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
    await send('[inicio]', { silent: true })
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
    engineId, voiceOut, testMode,
    lines, status, partial, started, done, savedCount, question, moments,
    begin, pressStart, pressEnd, sendText, reset, drawNow,
  }
}
