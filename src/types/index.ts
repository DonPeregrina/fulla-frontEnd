// ─── Roles ───────────────────────────────────────────────────────────────────

export type Role = 'HOST' | 'USER'

// ─── Identidades ─────────────────────────────────────────────────────────────

export interface Host {
  id: string
  email: string
  name?: string
}

export interface User {
  id: string
  username: string
  name?: string
  email: string
  hostId: string
  /** IDs de los Hilos (groups) a los que pertenece */
  groups: string[]
}

// ─── Nudos (Categories en el schema) ─────────────────────────────────────────
// Un Nudo es la agrupación temporal de preguntas (ej: Despertando, Mañana, Tarde, Noche).
// El schema los llama "categories". El color se asigna localmente con nudoColor().

export interface Nudo {
  id: string
  name: string
}

// ─── Hilos (Groups en el schema) ─────────────────────────────────────────────

export interface Hilo {
  id: string
  name: string
  hostId: string
  users: Pick<User, 'id' | 'username' | 'name'>[]
  questions: Pregunta[]
}

// ─── Preguntas (Questions en el schema) ──────────────────────────────────────

export interface Pregunta {
  id: string
  body: string
  categoryId: string
  groupId: string
}

// ─── Respuestas (Answers en el schema) ───────────────────────────────────────

export interface Respuesta {
  id: string
  body: string
  userId: string
  questionId: string
  timezone: string
  question?: Pregunta
  createdAt: string
}

// ─── Bitácora (Collection en el schema) ──────────────────────────────────────

export interface Bitacora {
  id: string
  /** Unix ms timestamp string desde el backend, ej: "1773100800000" */
  date: string | number
  count: number
  userId?: string
  answers: Respuesta[]
}

// ─── Invitación (Invite en el schema) ────────────────────────────────────────

export interface Invitacion {
  id: string
  email: string
  groupId?: string
  hostId: string
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface Session {
  token: string
  role: Role
}

// ─── Colores de Nudo ─────────────────────────────────────────────────────────

const PALETTE = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#f97316']

export function nudoColor(categoryId: string, index?: number): string {
  if (index !== undefined) return PALETTE[index % PALETTE.length]
  const sum = categoryId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return PALETTE[sum % PALETTE.length]
}

// Backward-compat aliases
export type Dimension = Nudo
export type Nodo = Respuesta
export { nudoColor as dimensionColor }
export const DIMENSION_COLORS: Record<string, string> = { default: '#B0A8CC' }
