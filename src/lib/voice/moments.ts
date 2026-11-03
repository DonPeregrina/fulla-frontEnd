/** Los momentos del día son etiquetas fijas heredadas (de cuando se usaba Alexa); aquí se muestran con su significado. */
const MOMENT_LABEL: Record<string, string> = {
  'WAKING UP': 'AL DESPERTAR',
  MORNING: 'MAÑANA',
  AFTERNOON: 'TARDE',
  EVENING: 'ATARDECER',
  NIGHT: 'NOCHE',
  MEAL: 'BOTANAS',
}

export const momentLabel = (moment: string) => MOMENT_LABEL[moment.toUpperCase()] ?? moment
