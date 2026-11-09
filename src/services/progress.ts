import { httpClient } from '@/services/api'
import type { ProgressDay } from '@/types/progress'

export const progressApi = {
  /** Indicadores del día (calorías, macros, verdura), por comida y alimento en foco. Los calcula AgnoRag; Node solo los pasa. */
  daily: (date: string): Promise<ProgressDay> =>
    httpClient
      .get<ProgressDay>('/progress/daily', {
        params: { date, tz: Intl.DateTimeFormat().resolvedOptions().timeZone },
      })
      .then(r => {
        // Si algo intermedio devuelve otra cosa (p. ej. el HTML de la app), es un error, no una pantalla en blanco
        if (!r.data || !Array.isArray(r.data.indicators)) throw new Error('Respuesta de progreso inválida')
        return r.data
      }),
}

export interface GoalBody {
  direction: 'max' | 'min' | 'range'
  target_min: number | null
  target_max: number | null
}

export const goalsApi = {
  /** Crea o reemplaza la meta diaria del usuario (kcal, protein_g, carbs_g, fat_g, veg_g…) */
  put: (metric: string, body: GoalBody) => httpClient.put(`/goals/${metric}`, body).then(r => r.data),
}

export interface KeyInfo {
  configured: boolean
  /** Últimos 4 caracteres; la llave completa nunca vuelve del servidor */
  last4?: string
}

export interface KeyApi {
  get: () => Promise<KeyInfo>
  set: (key: string) => Promise<KeyInfo>
  remove: () => Promise<KeyInfo>
}

const keyApi = (path: string): KeyApi => ({
  get: () => httpClient.get<KeyInfo>(path).then(r => r.data),
  set: key => httpClient.put<KeyInfo>(path, { key }).then(r => r.data),
  remove: () => httpClient.delete<KeyInfo>(path).then(r => r.data),
})

/** Llave de AgnoRag del usuario: con ella ve sus analíticas y se procesan sus respuestas */
export const analyticsKeyApi = keyApi('/analytics-key')
/** Llave de AgnoRag del host (permiso admin): asigna pipelines a sus hilos */
export const enricherKeyApi = keyApi('/enricher-key')

/** ¿El error es "las analíticas no están activadas para esta cuenta"? (falta la llave de analytics) */
export function analyticsNotConfigured(error: unknown): boolean {
  const e = error as { response?: { status?: number; data?: { code?: string } } } | null
  return e?.response?.status === 404 && e.response.data?.code === 'ANALYTICS_NOT_CONFIGURED'
}
