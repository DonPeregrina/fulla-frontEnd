import { useSyncExternalStore } from 'react'

/**
 * Modo pruebas del asistente de voz: conversa, dibuja y confirma como siempre, pero NO guarda respuestas.
 * Se guarda en el dispositivo y se comparte entre la pestaña del asistente y Perfil.
 */
const KEY = 'mnestics:voice-test'
const listeners = new Set<() => void>()

export function isTestMode(): boolean {
  try { return localStorage.getItem(KEY) === '1' } catch { return false }
}

export function setTestMode(on: boolean) {
  try { localStorage.setItem(KEY, on ? '1' : '0') } catch { /* sin almacenamiento */ }
  listeners.forEach(l => l())
}

export function useTestMode(): boolean {
  return useSyncExternalStore(
    cb => { listeners.add(cb); return () => { listeners.delete(cb) } },
    isTestMode,
    () => false,
  )
}
