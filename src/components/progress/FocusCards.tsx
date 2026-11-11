import { useQuery } from '@tanstack/react-query'
import { Ban, Check, Utensils } from 'lucide-react'
import { progressApi } from '@/services/progress'
import type { FocusFood, FocusLists } from '@/types/progress'

// Dos tarjetas: "SIGUE ASÍ" (con ✓) y "EVITA" (con 🚫). La imagen de cada alimento la genera el servidor una sola
// vez y se reutiliza; el ✓ y el 🚫 los dibuja la app encima para que siempre salgan iguales.

type Kind = 'keep' | 'avoid'

const STYLE: Record<Kind, { title: string; sub: string; color: string; Icon: typeof Check }> = {
  keep:  { title: 'SIGUE ASÍ', sub: 'lo que te funcionó', color: '#3DB86E', Icon: Check },
  avoid: { title: 'EVITA',     sub: 'lo que más pesó',    color: '#E8503A', Icon: Ban },
}

function FoodTile({ food, kind }: { food: FocusFood; kind: Kind }) {
  const { color, Icon } = STYLE[kind]
  const img = useQuery({
    queryKey: ['food-image', food.item],
    queryFn: () => progressApi.foodImage(food.item),
    // El alimento no cambia de aspecto: se guarda mientras la app esté abierta
    staleTime: Infinity,
    retry: 1,
  })
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
      <div className="relative w-full">
        <div className="aspect-square w-full overflow-hidden rounded-xl border-[1.5px] border-mn-border bg-[#E9E2F7]">
          {img.data ? (
            <img src={img.data} alt={food.item} className="h-full w-full object-cover" />
          ) : img.isError ? (
            <div className="grid h-full w-full place-items-center text-[#8878AA]">
              <Utensils size={22} />
            </div>
          ) : (
            <div className="h-full w-full animate-pulse bg-[#DDD5EE]" />
          )}
        </div>
        <span
          className="absolute -bottom-2 left-1/2 grid h-5 w-5 -translate-x-1/2 place-items-center rounded-full text-white ring-2 ring-[#EDE9F8]"
          style={{ background: color }}
          aria-hidden="true"
        >
          <Icon size={12} strokeWidth={3} />
        </span>
      </div>
      <span className="line-clamp-2 min-h-[2.2em] w-full break-words text-center text-[8px] font-bold uppercase leading-[1.1] tracking-[0.04em] text-[#5A4A7A]">
        {food.item}
      </span>
    </div>
  )
}

function Side({ kind, foods }: { kind: Kind; foods: FocusFood[] }) {
  const { title, sub, color } = STYLE[kind]
  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-[14px] border-[1.5px] border-mn-border bg-[#F8F6FD] p-2">
      <div>
        <b className="block text-[10px] tracking-[0.06em]" style={{ color }}>{title}</b>
        <span className="text-[7.5px] font-bold text-[#8878AA]">{sub}</span>
      </div>
      {foods.length > 0 ? (
        <div className="flex gap-2 pb-2">
          {foods.map(f => (
            <FoodTile key={f.item} food={f} kind={kind} />
          ))}
        </div>
      ) : (
        <p className="py-3 text-center text-[8px] leading-normal text-[#8878AA]">Aún no hay días suficientes</p>
      )}
    </div>
  )
}

export default function FocusCards({ focus }: { focus: FocusLists }) {
  // Sin nada que mostrar en ninguno de los dos lados, el bloque no aparece
  if (focus.keep.length === 0 && focus.avoid.length === 0) return null
  return (
    <div className="grid grid-cols-2 gap-1.5">
      <Side kind="keep" foods={focus.keep} />
      <Side kind="avoid" foods={focus.avoid} />
    </div>
  )
}
