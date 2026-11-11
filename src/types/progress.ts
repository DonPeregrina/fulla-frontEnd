// Contrato de la pantalla de Progreso. Ver PLAN-PROGRESO.md y AgnoRag/readmes/PROGRESS_API.md.
// Lo entrega el backend Node (GET /progress/daily); el front solo pinta, no sabe nada de nutrición.

export type IndicatorStatus = 'ok' | 'near' | 'over' | 'under' | 'no_data'

export type Target =
  | { type: 'max'; max: number; value: number }
  | { type: 'min'; min: number; value: number }
  | { type: 'range'; min: number; max: number; value: number }
  | { type: 'none' }

export interface Indicator {
  /** kcal, protein_g, carbs_g, fat_g, veg_g */
  key: string
  label: string
  unit: string
  /** null = sin datos del día */
  value: number | null
  target: Target
  status: IndicatorStatus
  /** 'budget' = tarjeta grande de 20 bloques (calorías); 'segments' = fila de 10 segmentos */
  display: 'budget' | 'segments'
  /** Alimentos que más aportan, para el detalle "de dónde viene" */
  sources?: string[]
  /** El valor incluye cantidades asumidas o estimadas */
  estimated?: boolean
  /** Fracción de las líneas del día con cantidad real y perfil nutricional; baja = muchas porciones asumidas */
  coverage?: number | null
  /** Cuánto queda (negativo = te pasaste) */
  remaining?: number
  /** Últimos días con dato */
  series?: { date: string; value: number }[]
}

export interface Meal {
  /** Morning | Meal | Afternoon | Night */
  slot: string
  /** Desayuno, Snacks, Comida, Cena */
  label: string
  kcal: number
  target: Target
  status: IndicatorStatus
}

export interface FocusItem {
  /** Nombre canónico del alimento, también la clave de su ilustración */
  item: string
  /** Nombre para mostrar en plural ("donas") y artículo ("las") */
  label: string
  article: 'las' | 'los'
  count: number
  /** Cuánto aportó del nutriente en la ventana */
  contribution?: number
  /** Días en que apareció */
  days?: string[]
}

export interface Focus {
  nutrient: string
  /** Estatus del indicador de ese nutriente: define el tono (evitar / vas bien) */
  status: IndicatorStatus
  windowDays: number
  top: FocusItem[]
  /** Titular redactado por Node; todavía no existe, se usa un texto neutro */
  headline?: string
}

export interface FocusFood {
  /** Nombre canónico del alimento, en singular ("queso") */
  item: string
  label: string
  article: 'las' | 'los'
  /** En cuántos días / comidas apareció */
  count: number
  days?: string[]
  contribution?: number
}

/** "Sigue así" y "evita" para la siguiente comida, calculados por AgnoRag con los umbrales que fija el backend */
export interface FocusLists {
  nutrient: string
  windowDays: number
  keep: FocusFood[]
  avoid: FocusFood[]
  /** Por qué una lista puede venir vacía: días con datos, días que cumplieron cada criterio, parámetros usados */
  meta?: { goal?: number | null; daysWithData?: number; keepDays?: number; avoidDays?: number; reason?: string }
}

export interface Suggestion {
  text: string
  generatedAt: string
}

export interface ProgressDay {
  date: string
  timezone: string
  indicators: Indicator[]
  meals?: Meal[]
  focus: Focus | null
  suggestion: Suggestion | null
  /** Entradas del día que aún se están procesando */
  pending: number
}
