import type { Role } from '@/types'

/**
 * Sesiones guardadas en el dispositivo: una por rol (HOST y USER) para poder cambiar de una a otra sin volver
 * a escribir credenciales. Se guarda el TOKEN de sesión, nunca la contraseña.
 */
export interface SavedSession {
  token: string
  /** Nombre para mostrar en el selector de cuentas (se actualiza al entrar). */
  label?: string
}

export interface SessionStore {
  /** Rol con el que se está usando la app ahora. */
  active: Role | null
  HOST?: SavedSession
  USER?: SavedSession
}

const KEY = 'mnestics:sessions'
const LEGACY_KEY = 'mnestics:session' // versión anterior: una sola sesión { token, role }

function write(store: SessionStore) {
  try { localStorage.setItem(KEY, JSON.stringify(store)) } catch { /* sin almacenamiento */ }
}

export function loadSessions(): SessionStore {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as SessionStore

    // Migración: la sesión única anterior pasa a ser la cuenta activa
    const legacy = localStorage.getItem(LEGACY_KEY)
    if (legacy) {
      const old = JSON.parse(legacy) as { token: string; role: Role }
      const store: SessionStore = { active: old.role, [old.role]: { token: old.token } }
      write(store)
      localStorage.removeItem(LEGACY_KEY)
      return store
    }
  } catch { /* JSON dañado: se trata como sin sesión */ }
  return { active: null }
}

export function activeToken(): string | null {
  const store = loadSessions()
  return store.active ? store[store.active]?.token ?? null : null
}

/** Guarda (o reemplaza) la sesión de un rol y la deja como activa. La del otro rol se conserva. */
export function saveSession(role: Role, token: string, label?: string) {
  const store = loadSessions()
  store[role] = { token, label: label ?? store[role]?.label }
  store.active = role
  write(store)
}

export function setActiveRole(role: Role) {
  const store = loadSessions()
  if (store[role]) { store.active = role; write(store) }
}

export function setLabel(role: Role, label: string) {
  const store = loadSessions()
  if (store[role] && store[role]!.label !== label) { store[role]!.label = label; write(store) }
}

/** Quita la sesión de un rol. Si era la activa, pasa a la otra guardada (si hay). Devuelve el rol activo resultante. */
export function removeSession(role: Role): Role | null {
  const store = loadSessions()
  delete store[role]
  if (store.active === role) {
    store.active = store.HOST ? 'HOST' : store.USER ? 'USER' : null
  }
  write(store)
  return store.active
}

export function clearSessions() {
  try { localStorage.removeItem(KEY); localStorage.removeItem(LEGACY_KEY) } catch { /* ignore */ }
}
