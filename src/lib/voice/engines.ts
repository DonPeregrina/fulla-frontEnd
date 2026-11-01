import { voiceApi } from '@/services/api'

/**
 * Motores de dictado intercambiables (pulsar para hablar). Todos hacen lo mismo:
 * `listen()` abre el micrófono y devuelve una sesión; `stop()` la cierra y entrega el texto final.
 * `onPartial` recibe el texto en vivo cuando el motor lo permite (Deepgram y navegador).
 */
export type EngineId = 'groq' | 'browser' | 'deepgram'

export interface ListenSession {
  stop(): Promise<string>
}

/** Idioma de dictado. Hoy solo español; el resto del flujo ya recibe el idioma como parámetro. */
export type Lang = 'es' | 'en'
const BROWSER_LANG: Record<Lang, string> = { es: 'es-MX', en: 'en-US' }

export interface Engine {
  id: EngineId
  label: string
  hint: string
  live: boolean
  supported(): boolean
  listen(opts: { lang: Lang; onPartial: (text: string) => void }): Promise<ListenSession>
}

function openMic(): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
}

function pickMime(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined
  return ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'].find(m =>
    MediaRecorder.isTypeSupported(m),
  )
}

const hasRecorder = () =>
  typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia

// ─── Groq: graba y manda el clip al soltar (sin texto en vivo) ───────────────────

const groq: Engine = {
  id: 'groq',
  label: 'Groq',
  hint: 'Graba y transcribe al soltar',
  live: false,
  supported: hasRecorder,
  async listen({ lang }) {
    const stream = await openMic()
    const mime = pickMime()
    const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
    const chunks: Blob[] = []
    recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data) }
    recorder.start()
    return {
      stop: () =>
        new Promise<string>((resolve, reject) => {
          recorder.onstop = async () => {
            stream.getTracks().forEach(t => t.stop())
            const blob = new Blob(chunks, { type: recorder.mimeType || mime || 'audio/webm' })
            if (blob.size < 1500) return resolve('') // pulsación demasiado corta
            try { resolve(await voiceApi.stt(blob, lang)) } catch (e) { reject(e) }
          }
          recorder.stop()
        }),
    }
  },
}

// ─── Navegador: reconocimiento incluido (gratis; en iPhone instalado no funciona) ─

interface BrowserRecognition {
  lang: string
  interimResults: boolean
  continuous: boolean
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null
  onend: (() => void) | null
  onerror: ((e: { error: string }) => void) | null
  start(): void
  stop(): void
}
type RecognitionCtor = new () => BrowserRecognition
const recognitionCtor = (): RecognitionCtor | undefined => {
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition
}

const browser: Engine = {
  id: 'browser',
  label: 'Navegador',
  hint: 'Gratis, texto en vivo (Android)',
  live: true,
  supported: () => !!recognitionCtor(),
  async listen({ lang, onPartial }) {
    const Ctor = recognitionCtor()!
    const rec = new Ctor()
    rec.lang = BROWSER_LANG[lang]
    rec.interimResults = true
    rec.continuous = true
    let finalText = ''
    let latest = ''
    let failure = ''
    rec.onresult = e => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]
        if (r.isFinal) finalText += r[0].transcript + ' '
        else interim += r[0].transcript
      }
      latest = (finalText + interim).trim()
      onPartial(latest)
    }
    rec.onerror = e => { failure = e.error }
    rec.start()
    return {
      stop: () =>
        new Promise<string>((resolve, reject) => {
          rec.onend = () => {
            if (failure && failure !== 'no-speech' && failure !== 'aborted' && !latest) {
              return reject(new Error(`Reconocimiento: ${failure}`))
            }
            resolve((finalText.trim() || latest).trim())
          }
          rec.stop()
        }),
    }
  },
}

// ─── Deepgram: streaming por WebSocket con llave temporal del backend ────────────

/** Abre el socket probando las dos formas de mandar la llave temporal (queda la que Deepgram acepte). */
function openSocket(url: string, token: string): Promise<WebSocket> {
  const attempt = (protocols: string[]) =>
    new Promise<WebSocket>((resolve, reject) => {
      const ws = new WebSocket(url, protocols)
      ws.onopen = () => resolve(ws)
      ws.onerror = () => reject(new Error('Deepgram rechazó la conexión'))
    })
  return attempt(['bearer', token]).catch(() => attempt(['token', token]))
}

const deepgram: Engine = {
  id: 'deepgram',
  label: 'Deepgram',
  hint: 'Streaming en vivo',
  live: true,
  supported: hasRecorder,
  async listen({ lang, onPartial }) {
    const token = await voiceApi.deepgramToken()
    const stream = await openMic()
    const params = new URLSearchParams({
      model: 'nova-3',
      language: lang,
      interim_results: 'true',
      smart_format: 'true',
      punctuate: 'true',
    })
    let ws: WebSocket
    try {
      ws = await openSocket(`wss://api.deepgram.com/v1/listen?${params}`, token)
    } catch (e) {
      stream.getTracks().forEach(t => t.stop())
      throw e
    }

    const finals: string[] = []
    let interim = ''
    ws.onmessage = ev => {
      try {
        const msg = JSON.parse(ev.data as string)
        if (msg.type !== 'Results') return
        const text: string = msg.channel?.alternatives?.[0]?.transcript ?? ''
        if (msg.is_final) { if (text) finals.push(text); interim = '' } else interim = text
        onPartial([...finals, interim].filter(Boolean).join(' '))
      } catch { /* mensaje que no es JSON */ }
    }

    const mime = pickMime()
    const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
    recorder.ondataavailable = e => { if (e.data.size > 0 && ws.readyState === WebSocket.OPEN) ws.send(e.data) }
    recorder.start(250)

    return {
      stop: () =>
        new Promise<string>(resolve => {
          recorder.onstop = () => {
            stream.getTracks().forEach(t => t.stop())
            if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'CloseStream' }))
            // Deepgram cierra solo tras entregar lo pendiente; si tarda, se usa lo que haya
            const done = () => resolve([...finals, interim].filter(Boolean).join(' ').trim())
            ws.onclose = done
            setTimeout(done, 2000)
          }
          recorder.stop()
        }),
    }
  },
}

export const ENGINES: Engine[] = [deepgram, groq, browser]

export function getEngine(id: EngineId): Engine {
  return ENGINES.find(e => e.id === id) ?? groq
}

/** Primer motor disponible en este dispositivo que no dependa de la llave de Deepgram. */
export function defaultEngineId(): EngineId {
  return ENGINES.find(e => e.id !== 'deepgram' && e.supported())?.id ?? 'groq'
}
