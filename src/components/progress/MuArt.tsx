import type { FocusItem } from '@/types/progress'

// Ilustraciones de Mu y de los alimentos (fase 1: estáticas, portadas del mock).
// Un alimento sin ilustración usa el plato genérico. Ver PLAN-PROGRESO.md, sección 8.

function Food({ k }: { k: string }) {
  switch (k) {
    case 'dona':
      return (
        <>
          <circle r="28" fill="#D9A066" />
          <circle r="25" fill="#F4A6C0" />
          <circle r="9" fill="#E9E2F7" />
          <rect x="-16" y="-14" width="7" height="2.6" rx="1.3" fill="#fff" transform="rotate(30 -12 -13)" />
          <rect x="8" y="-18" width="7" height="2.6" rx="1.3" fill="#F0C030" transform="rotate(-20 11 -17)" />
          <rect x="12" y="6" width="7" height="2.6" rx="1.3" fill="#5B8DE8" transform="rotate(50 15 7)" />
          <rect x="-20" y="8" width="7" height="2.6" rx="1.3" fill="#3DB86E" transform="rotate(-40 -16 9)" />
          <rect x="-3" y="15" width="7" height="2.6" rx="1.3" fill="#fff" />
        </>
      )
    case 'refresco':
      return (
        <>
          <line x1="4" y1="-24" x2="10" y2="-38" stroke="#E8503A" strokeWidth="3" strokeLinecap="round" />
          <path d="M-16 -22 L16 -22 L12 28 L-12 28 Z" fill="#E8503A" />
          <path d="M-14.5 -6 L14.5 -6 L13.2 8 L-13.2 8 Z" fill="#fff" />
          <rect x="-19" y="-29" width="38" height="8" rx="3" fill="#fff" stroke="#DDD5EE" strokeWidth="1.5" />
          <circle cx="0" cy="1" r="4" fill="#E8503A" />
        </>
      )
    case 'campechana':
      return (
        <g transform="rotate(-8)">
          <rect x="-32" y="-17" width="64" height="34" rx="14" fill="#D9A066" />
          <path d="M-30 -2 H30 M-31 6 H31 M-28 12 H28" stroke="#B9803F" strokeWidth="2" strokeLinecap="round" />
          <path d="M-26 -15 Q0 -23 26 -15 Q32 -8 26 -3 Q0 -9 -26 -3 Q-32 -8 -26 -15 Z" fill="#F8F0DC" />
          <circle cx="-14" cy="-10" r="1.6" fill="#E8CFA0" />
          <circle cx="0" cy="-12" r="1.6" fill="#E8CFA0" />
          <circle cx="14" cy="-10" r="1.6" fill="#E8CFA0" />
        </g>
      )
    default:
      // Plato genérico para alimentos sin ilustración propia
      return (
        <>
          <circle r="28" fill="#fff" stroke="#DDD5EE" strokeWidth="2" />
          <circle r="18" fill="#EDE9F8" stroke="#DDD5EE" strokeWidth="1.5" />
          <path d="M-8 -6 Q0 -12 8 -6 Q10 4 0 8 Q-10 4 -8 -6 Z" fill="#D9A066" />
        </>
      )
  }
}

const Rejected = ({ x, y, r, w }: { x: number; y: number; r: number; w: number }) => (
  <g transform={`translate(${x} ${y})`}>
    <circle r={r} fill="#E8503A" />
    <path d={`M-${w} -${w} L${w} ${w} M${w} -${w} L-${w} ${w}`} stroke="#fff" strokeWidth={w * 0.65} strokeLinecap="round" />
  </g>
)

/** Mu empujando fuera el alimento que conviene evitar */
export function MuHero({ item }: { item: FocusItem }) {
  return (
    <svg viewBox="0 0 200 104" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" role="img" aria-label={`Mu rechaza ${item.label}`}>
      <rect width="200" height="104" fill="#E9E2F7" />
      <ellipse cx="100" cy="98" rx="95" ry="9" fill="#DDD5EE" />
      <g transform="translate(46 62)">
        <circle r="26" fill="#2D2440" />
        <circle cx="-9" cy="-4" r="3.4" fill="#F0C030" />
        <circle cx="6" cy="-4" r="3.4" fill="#F0C030" />
        <path d="M-9 10 Q-1 6 7 10" stroke="#F0C030" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        <line x1="-14" y1="-13" x2="-5" y2="-10" stroke="#F0C030" strokeWidth="2.4" strokeLinecap="round" />
        <line x1="12" y1="-13" x2="3" y2="-10" stroke="#F0C030" strokeWidth="2.4" strokeLinecap="round" />
      </g>
      <g className="motion-safe:animate-push">
        <line x1="64" y1="64" x2="104" y2="58" stroke="#2D2440" strokeWidth="9" strokeLinecap="round" />
        <circle cx="106" cy="58" r="9" fill="#2D2440" />
        <circle cx="106" cy="58" r="4" fill="#F0C030" />
      </g>
      <g className="motion-safe:animate-slide">
        <g transform="translate(152 60) scale(.9)">
          <Food k={item.item} />
        </g>
      </g>
      <Rejected x={180} y={20} r={11} w={5} />
    </svg>
  )
}

/** Miniatura del alimento #2 y #3 */
export function FoodThumb({ item }: { item: FocusItem }) {
  return (
    <svg viewBox="-40 -46 80 80" width="100%" height="100%" aria-hidden="true">
      <rect x="-40" y="-46" width="80" height="80" fill="#E9E2F7" />
      <g transform="scale(.85)">
        <Food k={item.item} />
      </g>
      <Rejected x={26} y={-28} r={9} w={4} />
    </svg>
  )
}
