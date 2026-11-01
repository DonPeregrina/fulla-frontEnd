import { useSyncExternalStore } from 'react'
import { defaultEngineId, type EngineId } from './engines'

/**
 * Ajustes del asistente de voz, compartidos entre Perfil (donde se cambian) y la pestaña Asistente (donde se usan).
 * Se guardan en el dispositivo. Las claves son las mismas de antes para no perder lo que ya estaba elegido.
 */
export type VoiceOut = 'elevenlabs' | 'browser'

const KEY_ENGINE = 'mnestics:voice-engine'
const KEY_VOICE = 'mnestics:voice-out'
const ENGINES: readonly EngineId[] = ['deepgram', 'groq', 'browser']
const VOICES: readonly VoiceOut[] = ['elevenlabs', 'browser']

const listeners = new Set<() => void>()
const notify = () => listeners.forEach(l => l())

function read<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  try {
    const v = localStorage.getItem(key) as T | null
    return v && allowed.includes(v) ? v : fallback
  } catch { return fallback }
}

function write(key: string, value: string) {
  try { localStorage.setItem(key, value) } catch { /* sin almacenamiento */ }
  notify()
}

export const getEngineId = (): EngineId => read(KEY_ENGINE, ENGINES, defaultEngineId())
export const getVoiceOut = (): VoiceOut => read(KEY_VOICE, VOICES, 'elevenlabs')
export const setEngineId = (id: EngineId) => write(KEY_ENGINE, id)
export const setVoiceOut = (v: VoiceOut) => write(KEY_VOICE, v)

const subscribe = (cb: () => void) => { listeners.add(cb); return () => { listeners.delete(cb) } }

export function useVoiceSettings() {
  const engineId = useSyncExternalStore(subscribe, getEngineId, () => 'groq' as EngineId)
  const voiceOut = useSyncExternalStore(subscribe, getVoiceOut, () => 'elevenlabs' as VoiceOut)
  return { engineId, voiceOut, setEngineId, setVoiceOut }
}
