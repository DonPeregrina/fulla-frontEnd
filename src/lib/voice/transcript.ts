/**
 * Reconstruye lo dicho a partir de los resultados del reconocimiento de voz del navegador.
 *
 * Chrome de escritorio reemplaza el resultado parcial mientras hablas, pero Chrome de Android entrega CADA parcial
 * como un resultado nuevo y acumulado ("pues", "pues como", "pues como cené", ...). Pegarlos todos repite el texto
 * muchas veces. Aquí se queda solo la versión más completa de cada tramo: si un resultado empieza con (casi) las
 * mismas palabras que el anterior, el anterior era una versión parcial y se descarta.
 */
const norm = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\p{L}\p{N}\s]/gu, '').split(/\s+/).filter(Boolean)

/** ¿`next` es una versión más larga (o corregida al final) de `prev`? Se compara el inicio, palabra por palabra. */
function extendsPrevious(prev: string, next: string): boolean {
  const a = norm(prev)
  const b = norm(next)
  if (a.length === 0 || b.length < a.length) return false
  let common = 0
  while (common < a.length && a[common] === b[common]) common++
  return common >= Math.max(1, Math.ceil(a.length * 0.6))
}

export function buildTranscript(results: ArrayLike<{ 0: { transcript: string } }>): string {
  const segments = Array.from(results, r => r[0].transcript.trim()).filter(Boolean)
  const kept: string[] = []
  segments.forEach((seg, i) => {
    const next = segments[i + 1]
    if (next && extendsPrevious(seg, next)) return // es un parcial: llega uno más completo
    kept.push(seg)
  })
  return kept.join(' ')
}
