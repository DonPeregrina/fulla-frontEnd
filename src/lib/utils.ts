import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Convierte fecha de cualquier formato a Date.
 *  Acepta: ISO string, Unix ms timestamp (string o number), o Date */
export function toDate(date: string | number | Date): Date {
  if (date instanceof Date) return date
  const n = Number(date)
  // Si es un número válido de ms (> año 2000 = 946684800000)
  if (!isNaN(n) && n > 946684800000) return new Date(n)
  return new Date(date)
}

export function formatDate(date: string | number | Date, formatStr = 'PPP') {
  return format(toDate(date), formatStr, { locale: es })
}

function localISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function dateToISO(date: string | number | Date): string {
  return localISO(toDate(date))
}

export function todayISO(): string {
  return localISO(new Date())
}

/** Migra las claves de localStorage del nombre anterior (`fulla:`) a `mnestics:` sin perder sesión ni avatares. */
export function migrateLegacyStorage(): void {
  try {
    for (const key of Object.keys(localStorage)) {
      if (!key.startsWith('fulla:')) continue
      const next = `mnestics:${key.slice('fulla:'.length)}`
      if (localStorage.getItem(next) === null) localStorage.setItem(next, localStorage.getItem(key)!)
      localStorage.removeItem(key)
    }
  } catch { /* localStorage no disponible */ }
}

/**
 * Día de una bitácora (`collections`) como "YYYY-MM-DD".
 * `date` es la medianoche UTC de ese día (el día ya viene agrupado por el backend), así que se lee en UTC:
 * convertirlo a hora local lo corría un día atrás.
 */
export function diaDeBitacora(date: string | number | Date): string {
  return toDate(date).toISOString().slice(0, 10)
}

/** "YYYY-MM-DD" -> Date a medianoche LOCAL (new Date('YYYY-MM-DD') lo interpreta en UTC y lo corre un día atrás). */
export function parseDiaISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}
