import type { IndicatorStatus, Target } from '@/types/progress'

// Piezas que comparten la pantalla de Progreso y sus secciones (colores de estatus y formato de números y metas)

export const STATUS: Record<IndicatorStatus, { label: string; color: string }> = {
  ok:      { label: 'BIEN',      color: '#3DB86E' },
  under:   { label: 'FALTA',     color: '#B08A10' },
  near:    { label: 'CERCA',     color: '#B08A10' },
  over:    { label: 'PASADO',    color: '#E8503A' },
  no_data: { label: 'SIN DATOS', color: '#8878AA' },
}

export const fmt = (n: number) => Math.round(n).toLocaleString('es-MX')

// Color de cada indicador; los que no se conocen usan el azul de la marca
export const BAR_COLOR: Record<string, string> = { protein_g: '#E8503A', carbs_g: '#EDB828', fat_g: '#5B8DE8', veg_g: '#3DB86E' }
export const DEFAULT_BAR_COLOR = '#5588AA'

/** Valor de referencia de una meta: el tope (o el techo del rango) y, si es un mínimo, ese mínimo */
export const goalMax = (t: Target) => (t.type === 'max' || t.type === 'range' ? t.max : t.type === 'min' ? t.min : 0)

/** Texto de la meta: solo el número o el rango, para "98 / 140 g" */
export function goalText(t: Target): string {
  if (t.type === 'max') return fmt(t.max)
  if (t.type === 'min') return fmt(t.min)
  if (t.type === 'range') return `${fmt(t.min)}–${fmt(t.max)}`
  return ''
}
