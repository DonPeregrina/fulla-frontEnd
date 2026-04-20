import React, { createContext, useContext, useState, useEffect } from 'react'
import { authApi } from '@/services/api'
import type { Host, User, Role, Session } from '@/types'

interface AuthState {
  session: Session | null
  current: Host | User | null
  loading: boolean
}

interface AuthContextType extends AuthState {
  login: (identifier: string, password: string) => Promise<void>
  logout: () => void
  isHost: boolean
  isUser: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

const SESSION_KEY = 'fulla:session'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    session: null,
    current: null,
    loading: true,
  })

  // Restaurar sesión al arrancar
  useEffect(() => {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) {
      setState(s => ({ ...s, loading: false }))
      return
    }
    const session: Session = JSON.parse(raw)
    fetchCurrent(session).catch(() => {
      localStorage.removeItem(SESSION_KEY)
      setState({ session: null, current: null, loading: false })
    })
  }, [])

  async function fetchCurrent(session: Session) {
    const result =
      session.role === 'HOST'
        ? await authApi.currentHost()
        : await authApi.currentUser()

    const current =
      'currentHost' in result ? result.currentHost :
      'currentUser' in result ? result.currentUser : null
    setState({ session, current, loading: false })
  }

  // identifier: email → HOST, username → USER
  async function login(identifier: string, password: string) {
    const isHost = identifier.includes('@')
    const role: Role = isHost ? 'HOST' : 'USER'

    let token: string
    if (isHost) {
      const result = await authApi.loginHost(identifier.trim().toLowerCase(), password)
      token = result.loginHost.token
    } else {
      const result = await authApi.loginUser(identifier.trim(), password)
      token = result.loginUser.token
    }
    const session: Session = { token, role }

    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    await fetchCurrent(session)
  }

  function logout() {
    localStorage.removeItem(SESSION_KEY)
    setState({ session: null, current: null, loading: false })
  }

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        logout,
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
