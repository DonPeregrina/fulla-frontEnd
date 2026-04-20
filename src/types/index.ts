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

// ─── Dimensiones (Categories en el schema) ───────────────────────────────────

export interface Dimension {
  id: string
  name: string
  // El schema no expone color — usamos una paleta local por index/id
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
  /** Campo en el schema: `body` */
  body: string
  categoryId: string
  groupId: string
}

// ─── Nodos (Answers en el schema) ────────────────────────────────────────────
// Un Nodo es el hallazgo: la respuesta de un usuario a una pregunta.
// El schema guarda el valor siempre como string en el campo `body`.

export interface Nodo {
  id: string
  /** Valor registrado como string (el backend lo trata siempre como texto) */
  body: string
  userId: string
  questionId: string
  timezone: string
  /** La pregunta anidada viene cuando se hace include en la query */
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
  answers: Nodo[]
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

// ─── Colores de Dimensión (paleta local, no viene del backend) ───────────────

export const DIMENSION_COLORS: Record<string, string> = {
  default: '#B0A8CC',
}

/** Asigna un color consistente a una categoría por su id */
const PALETTE = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#f97316']
export function dimensionColor(categoryId: string, index?: number): string {
  if (index !== undefined) return PALETTE[index % PALETTE.length]
  // Derivar index del id de forma determinista
  const sum = categoryId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return PALETTE[sum % PALETTE.length]
}
