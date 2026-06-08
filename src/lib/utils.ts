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
