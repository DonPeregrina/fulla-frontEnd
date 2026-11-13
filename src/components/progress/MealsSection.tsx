import { useMemo, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Check, Minus, Utensils, X } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { momentLabel } from '@/lib/voice/moments'
import { useArchiveImages, type ArchivedView } from '@/lib/voice/useArchive'
import { parseDiaISO } from '@/lib/utils'
import type { Indicator, IndicatorStatus, Meal } from '@/types/progress'
import { BAR_COLOR, DEFAULT_BAR_COLOR, fmt, goalMax, goalText, STATUS } from './shared'

// "Comidas del día": un recuadro por momento, con la imagen que el asistente archivó en este dispositivo y el
// resultado de ese momento contra su meta. Los recuadros salen de lo que mande el servidor (`meals`), más las
// imágenes de momentos que el servidor no desglosa (p. ej. al despertar), que se muestran sin números.
// Al tocar uno se ve cuánto aportó a cada pilar (indicador con meta) como % de la meta del día, y los alimentos
// que se entendieron, para poder auditar la elementización.

interface Tile {
  /** Momento en mayúsculas ("MORNING"), la misma llave con la que se archiva la imagen */
  moment: string
  label: string
  meal?: Meal
  image?: ArchivedView
}

// Orden del día; lo que no esté aquí (incluida "Otros") va al final
const MOMENT_ORDER = ['WAKING UP', 'MORNING', 'MEAL', 'AFTERNOON', 'EVENING', 'NIGHT']
const rank = (moment: string) => {
  const i = MOMENT_ORDER.indexOf(moment)
  return i === -1 ? MOMENT_ORDER.length : i
}

function buildTiles(meals: Meal[], images: ArchivedView[]): Tile[] {
  const byMoment = new Map(images.map(i => [i.moment.toUpperCase(), i]))
  const covered = new Set(meals.map(m => m.slot.toUpperCase()))
  const tiles: Tile[] = meals
    .map(m => ({ moment: m.slot.toUpperCase(), label: m.label, meal: m, image: byMoment.get(m.slot.toUpperCase()) }))
    // Un momento sin registros ni imagen no aporta nada: no se pinta
    .filter(t => t.image || t.meal.status !== 'no_data')
  for (const img of images) {
    const moment = img.moment.toUpperCase()
    if (!covered.has(moment)) tiles.push({ moment, label: momentLabel(moment), image: img })
  }
  return tiles.sort((a, b) => rank(a.moment) - rank(b.moment))
}

// Sin meta no hay "bien" ni "mal": AgnoRag devuelve 'ok' en ese caso, así que aquí no se muestra estatus
const hasGoal = (m?: Meal) => !!m && m.target.type !== 'none'

const NO_STATUS_COLOR = '#C4BAD8'
const BADGE: Partial<Record<IndicatorStatus, typeof Check>> = { ok: Check, over: X, near: Minus, under: Minus }

function Badge({ status }: { status?: IndicatorStatus }) {
  const Icon = status ? BADGE[status] : undefined
  if (!status || !Icon) return null
  return (
    <span
      className="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full text-white ring-2 ring-white"
      style={{ background: STATUS[status].color }}
      aria-hidden="true"
    >
      <Icon size={12} strokeWidth={3} />
    </span>
  )
}

function Picture({ tile, className }: { tile: Tile; className: string }) {
  return tile.image ? (
    <img src={tile.image.url} alt={tile.image.description} className={`${className} object-cover`} />
  ) : (
    <div className={`${className} grid place-items-center bg-[#E9E2F7] text-[#8878AA]`}>
      <Utensils size={22} />
    </div>
  )
}

/** "320 kcal · meta 400–600", o "—" mientras se procesa */
function Amount({ meal }: { meal: Meal }) {
  return (
    <>
      {meal.kcal == null ? '—' : fmt(meal.kcal)} <span className="text-[#8878AA]">kcal</span>
      {hasGoal(meal) && <span className="text-[#8878AA]"> · meta {goalText(meal.target)}</span>}
    </>
  )
}

/** Un pilar es cualquier indicador con meta (las calorías ya se ven aparte, contra la meta de la franja) */
const pillarsOf = (indicators: Indicator[]) => indicators.filter(i => i.display !== 'budget' && i.target.type !== 'none')

/** Lo aportado como % de la meta del día de ese pilar (puede pasar de 100) */
function pctOfGoal(value: number | undefined, ind: Indicator): number | null {
  const ref = goalMax(ind.target)
  return value == null || ref <= 0 ? null : (value / ref) * 100
}

const pillarColor = (key: string) => BAR_COLOR[key] ?? DEFAULT_BAR_COLOR

function PillarBars({ meal, pillars }: { meal: Meal; pillars: Indicator[] }) {
  if (!meal.values || pillars.length === 0) return null
  return (
    <div className="space-y-1.5 rounded-xl bg-[#F8F6FD] px-3 py-2.5">
      <div className="text-[7.5px] font-bold tracking-[0.14em] text-[#8878AA]">APORTE A TU META DEL DÍA</div>
      {pillars.map(p => {
        const value = meal.values?.[p.key] ?? 0
        const pct = pctOfGoal(value, p)
        return (
          <div key={p.key}>
            <div className="flex items-baseline justify-between text-[9px] font-bold text-[#2D2440]">
              <span className="uppercase">{p.label}</span>
              <span>
                {fmt(value)} {p.unit}
                <span className="text-[#8878AA]"> · {pct == null ? '—' : `${fmt(pct)}%`}</span>
              </span>
            </div>
            <div className="mt-0.5 h-2 overflow-hidden rounded-[2px] bg-[#DDD5EE]">
              <div className="h-full rounded-[2px]" style={{ width: `${Math.min(pct ?? 0, 100)}%`, background: pillarColor(p.key) }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ItemList({ meal, pillars }: { meal: Meal; pillars: Indicator[] }) {
  const items = meal.items ?? []
  if (items.length === 0) return null
  const hidden = (meal.n_lines ?? items.length) - items.length
  return (
    <div className="space-y-1">
      <div className="text-[7.5px] font-bold tracking-[0.14em] text-[#8878AA]">LO QUE SE ENTENDIÓ</div>
      <ul className="divide-y divide-dashed divide-[#DDD5EE]">
        {items.map((it, idx) => {
          const name = it.item ?? it.raw_fragment ?? '—'
          const said = it.raw_fragment && it.item && it.raw_fragment.trim().toLowerCase() !== it.item.trim().toLowerCase() ? it.raw_fragment : null
          const chips = pillars
            .map(p => ({ p, pct: pctOfGoal(it.values?.[p.key], p) }))
            .filter(c => c.pct != null && Math.round(c.pct) >= 1)
          return (
            <li key={`${name}-${idx}`} className="py-1.5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="min-w-0 truncate text-[10px] font-bold uppercase text-[#2D2440]">{name}</span>
                <span className="shrink-0 text-[9px] font-bold text-[#5A4A7A]">
                  {fmt(it.values?.kcal ?? 0)} kcal <span className="text-[#8878AA]">· {fmt(it.grams)} g</span>
                </span>
              </div>
              {said && <div className="truncate text-[8.5px] italic text-[#8878AA]">dijiste: “{said}”</div>}
              {(chips.length > 0 || it.estimated || it.no_profile) && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {chips.map(({ p, pct }) => (
                    <span key={p.key} className="inline-flex items-center gap-1 rounded-full bg-[#F1EDFA] px-1.5 py-0.5 text-[7.5px] font-bold text-[#5A4A7A]">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: pillarColor(p.key) }} />
                      {p.label} {fmt(pct!)}%
                    </span>
                  ))}
                  {it.estimated && <span className="rounded-full bg-[#F6EBC8] px-1.5 py-0.5 text-[7.5px] font-bold text-[#8A6B0A]">cantidad supuesta</span>}
                  {it.no_profile && <span className="rounded-full bg-[#FBE3DE] px-1.5 py-0.5 text-[7.5px] font-bold text-[#C23A26]">sin perfil nutricional</span>}
                </div>
              )}
            </li>
          )
        })}
      </ul>
      {hidden > 0 && <div className="text-[8px] text-[#8878AA]">+{hidden} más no se muestran</div>}
    </div>
  )
}

export default function MealsSection({ date, meals, indicators }: { date: string; meals?: Meal[]; indicators: Indicator[] }) {
  const { current } = useAuth()
  const all = useArchiveImages(current?.id)
  const tiles = useMemo(
    () => buildTiles(meals ?? [], all.filter(i => i.day === date)),
    [meals, all, date],
  )
  const pillars = useMemo(() => pillarsOf(indicators), [indicators])
  const [open, setOpen] = useState<Tile | null>(null)

  if (tiles.length === 0) return null

  return (
    <section className="overflow-hidden rounded-md border-[1.5px] border-[#C4BAD8] bg-[#F8F6FD]">
      <div className="flex items-center justify-between bg-[#2D2440] px-2.5 py-1.5 text-[8px] font-bold tracking-[0.12em] text-[#EDE9F8]">
        <span>{date} // COMIDAS</span>
        <b className="text-mn-gold">{tiles.length}</b>
      </div>

      <div className="grid grid-cols-2 gap-2 p-2">
        {tiles.map(t => {
          const status = hasGoal(t.meal) ? t.meal!.status : undefined
          return (
            <button
              key={t.moment}
              type="button"
              onClick={() => setOpen(t)}
              className="flex min-w-0 flex-col overflow-hidden rounded-xl border-[1.5px] bg-white text-left transition-transform active:scale-[0.98]"
              style={{ borderColor: status && status !== 'no_data' ? STATUS[status].color : NO_STATUS_COLOR }}
            >
              <div className="relative">
                <Picture tile={t} className="aspect-square w-full" />
                <Badge status={status} />
              </div>
              <div className="space-y-0.5 px-2 py-1.5">
                <span className="block truncate text-[9px] font-bold uppercase">{t.label}</span>
                {t.meal ? (
                  <>
                    <span className="block text-[9px] font-bold text-[#2D2440]"><Amount meal={t.meal} /></span>
                    {status && (
                      <span className="inline-block rounded-sm px-1.5 py-0.5 text-[7px] font-bold tracking-[0.06em] text-white" style={{ background: STATUS[status].color }}>
                        {STATUS[status].label}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="block text-[8px] text-[#8878AA]">sin desglose</span>
                )}
              </div>
            </button>
          )
        })}
      </div>

      <Dialog.Root open={!!open} onOpenChange={o => { if (!o) setOpen(null) }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60" />
          <Dialog.Content className="fixed inset-x-4 top-[8%] z-50 mx-auto max-h-[84vh] max-w-sm space-y-3 overflow-y-auto rounded-[24px] border border-[#DDD5EE] bg-white p-4 focus:outline-none">
            {open && (
              <>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Dialog.Title className="text-[9px] font-bold uppercase tracking-[0.14em] text-mn-plum">
                      {open.label} · {format(parseDiaISO(date), "d 'de' MMMM", { locale: es })}
                    </Dialog.Title>
                    <Dialog.Description className="mt-1 text-[11px] leading-snug text-[#5A4A7A]">
                      {open.image?.description ?? 'Sin imagen en este dispositivo'}
                    </Dialog.Description>
                  </div>
                  <Dialog.Close className="rounded-full bg-[#EDE9F8] p-1.5 text-mn-plum" aria-label="Cerrar"><X size={14} /></Dialog.Close>
                </div>
                {open.image && <img src={open.image.url} alt={open.image.description} className="w-full rounded-2xl border border-[#DDD5EE]" />}
                {open.meal && (
                  <>
                    <div className="flex items-center justify-between rounded-xl bg-[#F8F6FD] px-3 py-2 text-[11px] font-bold text-[#2D2440]">
                      <span><Amount meal={open.meal} /></span>
                      {hasGoal(open.meal) && (
                        <span className="rounded-sm px-2 py-1 text-[8px] font-bold tracking-[0.06em] text-white" style={{ background: STATUS[open.meal.status].color }}>
                          {STATUS[open.meal.status].label}
                        </span>
                      )}
                    </div>
                    <PillarBars meal={open.meal} pillars={pillars} />
                    <ItemList meal={open.meal} pillars={pillars} />
                  </>
                )}
              </>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  )
}
