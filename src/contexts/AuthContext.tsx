import React, { createContext, useContext, useState, useEffect } from 'react'
import { authApi } from '@/services/api'
import {
  loadSessions, saveSession, setActiveRole, setLabel, removeSession, clearSessions,
  type SessionStore,
} from '@/lib/sessions'
import type { Host, User, Role, Session } from '@/types'

interface AuthState {
  session: Session | null
  current: Host | User | null
  loading: boolean
  /** Hay una sesión guardada pero el servidor está dormido o no responde: la sesión NO se borra. */
  sleeping: boolean
}

interface AuthContextType extends AuthState {
  login: (identifier: string, password: string) => Promise<void>
  /** Cierra la cuenta activa; si hay otra guardada, pasa a ella. */
  logout: () => void
  /** Cambia a la otra cuenta guardada sin pedir credenciales. */
  switchRole: (role: Role) => void
  /** Reintenta entrar con la sesión guardada (p. ej. cuando el servidor ya despertó). */
  retryRestore: () => void
  /** Olvida las sesiones guardadas en este dispositivo. */
  forgetSaved: () => void
  /** Cuentas guardadas en este dispositivo. */
  accounts: SessionStore
  isHost: boolean
  isUser: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

/** 'auth' = el servidor rechazó el token (se borra); cualquier otra cosa = red/servidor dormido (se conserva). */
function classify(err: unknown): 'auth' | 'sleeping' {
  const status = (err as { response?: { status?: number } })?.response?.status
  if (status === 401 || status === 403) return 'auth'
  const msg = err instanceof Error ? err.message.toLowerCase() : ''
  return msg.includes('unauthorized') ? 'auth' : 'sleeping'
}

function labelOf(role: Role, current: Host | User): string {
  const c = current as { name?: string; username?: string; email?: string }
  return (role === 'HOST' ? c.name ?? c.email : c.name ?? c.username) ?? ''
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    session: null,
    current: null,
    loading: true,
    sleeping: false,
  })
  // Fuerza re-render para refrescar `accounts` (viven en localStorage)
  const [, setTick] = useState(0)
  const refresh = () => setTick(t => t + 1)

  async function fetchCurrent(session: Session) {
    const result =
      session.role === 'HOST'
        ? await authApi.currentHost()
        : await authApi.currentUser()

    const current =
      'currentHost' in result ? result.currentHost :
      'currentUser' in result ? result.currentUser : null
    if (current) setLabel(session.role, labelOf(session.role, current))
    setState({ session, current, loading: false, sleeping: false })
  }

  /** Entra con la sesión guardada del rol. Si el servidor rechaza el token, se descarta y se prueba con la otra. */
  async function restore(role: Role): Promise<void> {
    const saved = loadSessions()[role]
    if (!saved) {
      setState({ session: null, current: null, loading: false, sleeping: false })
      return
    }
    setActiveRole(role)
    try {
      await fetchCurrent({ token: saved.token, role })
    } catch (err) {
      if (classify(err) === 'auth') {
        const next = removeSession(role)
        refresh()
        if (next) return restore(next)
        setState({ session: null, current: null, loading: false, sleeping: false })
      } else {
        // Servidor dormido o sin red: se conserva la sesión y se muestra la pantalla de despertar
        setState({ session: null, current: null, loading: false, sleeping: true })
      }
    }
  }

  // Restaurar sesión al arrancar
  useEffect(() => {
    const { active } = loadSessions()
    if (!active) {
      setState(s => ({ ...s, loading: false }))
      return
    }
    restore(active)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // identifier: email → HOST, username → USER
  async function login(identifier: string, password: string) {
    const isHost = identifier.includes('@')
    const role: Role = isHost ? 'HOST' : 'USER'

    let token: string
    try {
      if (isHost) {
        const result = await authApi.loginHost(identifier.trim().toLowerCase(), password)
        token = result.loginHost.token
      } else {
        const result = await authApi.loginUser(identifier.trim(), password)
        token = result.loginUser.token
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message.toLowerCase() : ''
      const isNetworkError = err && typeof err === 'object' && 'isAxiosError' in err &&
        (err as any).isAxiosError && (!(err as any).response || (err as any).response.status >= 500)
      // Prisma connection pool timeout = DB dormida (llega como GraphQL error en HTTP 200)
      const isDbSleeping = msg.includes('connection pool') || msg.includes('timed out')

      if (isNetworkError || isDbSleeping) {
        const sleeping = new Error('Sistema durmiendo')
        ;(sleeping as any).code = 'SLEEPING'
        throw sleeping
      }
      throw err
    }

    // Guarda la sesión de este rol (la del otro rol, si la hay, se conserva) y la deja activa
    saveSession(role, token)
    refresh()
    await fetchCurrent({ token, role })
  }

  function logout() {
    const role = state.session?.role
    const next = role ? removeSession(role) : null
    refresh()
    if (next) {
      setState(s => ({ ...s, loading: true }))
      restore(next)
    } else {
      setState({ session: null, current: null, loading: false, sleeping: false })
    }
  }

  function switchRole(role: Role) {
    if (!loadSessions()[role]) return
    setState(s => ({ ...s, loading: true }))
    restore(role)
  }

  function retryRestore() {
    const { active } = loadSessions()
    if (active) restore(active)
  }

  function forgetSaved() {
    clearSessions()
    refresh()
    setState({ session: null, current: null, loading: false, sleeping: false })
  }

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        logout,
        switchRole,
        retryRestore,
        forgetSaved,
        accounts: loadSessions(),
        isHost: state.session?.role === 'HOST',
        isUser: state.session?.role === 'USER',
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
