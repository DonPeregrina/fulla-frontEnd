/**
 * Racha: días consecutivos con al menos una respuesta, contados por día LOCAL del usuario.
 *
 * - Cuenta hacia atrás desde hoy.
 * - Si hoy todavía no hay respuestas, la racha sigue viva: se cuenta desde ayer
 *   (hoy aún tiene tiempo de sumar). Solo se rompe cuando falta un día completo.
 * - `days` son fechas locales `YYYY-MM-DD`.
 */

/** Suma `n` días (puede ser negativo) a una fecha `YYYY-MM-DD`, sin depender de la zona horaria. */
export function addDaysISO(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10)
}

export function calcStreak(days: string[], today: string): number {
  if (!days.length) return 0
  const set = new Set(days)
  let cursor = set.has(today) ? today : addDaysISO(today, -1)
  let streak = 0
  while (set.has(cursor) && streak < 3650) {
    streak++
    cursor = addDaysISO(cursor, -1)
  }
  return streak
}
