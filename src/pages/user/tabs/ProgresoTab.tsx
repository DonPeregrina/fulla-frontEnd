import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { progressApi, goalsApi, analyticsNotConfigured } from '@/services/progress'
import FocusCards from '@/components/progress/FocusCards'
import type { Indicator, IndicatorStatus, Target } from '@/types/progress'

const STATUS: Record<IndicatorStatus, { label: string; color: string }> = {
  ok:      { label: 'BIEN',      color: '#3DB86E' },
  under:   { label: 'FALTA',     color: '#B08A10' },
  near:    { label: 'CERCA',     color: '#B08A10' },
  over:    { label: 'PASADO',    color: '#E8503A' },
  no_data: { label: 'SIN DATOS', color: '#8878AA' },
}
const NO_GOAL = { label: 'SIN META', color: '#8878AA' }

// Color de cada indicador; los que no se conocen usan el azul de la marca
const BAR_COLOR: Record<string, string> = { protein_g: '#E8503A', carbs_g: '#EDB828', fat_g: '#5B8DE8', veg_g: '#3DB86E' }
const barColor = (i: Indicator) => (i.status === 'over' ? '#E8503A' : BAR_COLOR[i.key] ?? '#5588AA')

/** La meta cae al ~77 % del carril, así queda espacio para ver cuánto te pasaste */
const SCALE = 1.3

const fmt = (n: number) => Math.round(n).toLocaleString('es-MX')
const goalMax = (t: Target) => (t.type === 'max' || t.type === 'range' ? t.max : t.type === 'min' ? t.min : 0)

/** Texto de la meta: "140", "≤ 200" no, solo el número o el rango, para "98 / 140 g" */
function goalText(t: Target): string {
  if (t.type === 'max') return fmt(t.max)
  if (t.type === 'min') return fmt(t.min)
  if (t.type === 'range') return `${fmt(t.min)}–${fmt(t.max)}`
  return ''
}

/** Posiciones (0..1 del carril) del relleno, de la marca de la meta y, si es rango, de su banda */
function track(i: Indicator) {
  const t = i.target
  const v = i.value ?? 0
  if (t.type === 'none') {
    // Sin meta no hay marca: el relleno se compara con lo más alto de los últimos días
    const top = Math.max(v, ...(i.series ?? []).map(s => s.value), 1)
    return { fill: v / (top * 1.1), marker: null as number | null, band: null as [number, number] | null }
  }
  const g = goalMax(t)
  const span = g * SCALE
  return {
    fill: Math.min(v / span, 1),
    marker: 1 / SCALE,
    band: t.type === 'range' ? ([t.min / span, g / span] as [number, number]) : null,
  }
}

/** Frase corta bajo el valor: "faltan 42 g", "quedan 14 g", "te pasaste 12 g" */
function hint(i: Indicator): { text: string; color: string } {
  const t = i.target
  const u = i.unit
  if (i.value == null) return { text: '—', color: '#8878AA' }
  if (t.type === 'none') return { text: 'sin meta', color: '#8878AA' }
  const v = i.value
  const col = i.status === 'over' ? '#E8503A' : i.status === 'ok' ? '#2E9E5B' : '#B08A10'
  if (t.type === 'max') return v > t.max ? { text: `te pasaste ${fmt(v - t.max)} ${u}`, color: col } : { text: `quedan ${fmt(t.max - v)} ${u}`, color: col }
  if (t.type === 'min') return v < t.min ? { text: `faltan ${fmt(t.min - v)} ${u}`, color: col } : { text: 'meta cumplida', color: col }
  if (v < t.min) return { text: `faltan ${fmt(t.min - v)} ${u}`, color: col }
  if (v > t.max) return { text: `te pasaste ${fmt(v - t.max)} ${u}`, color: col }
  return { text: 'en rango', color: col }
}

/** Día (YYYY-MM-DD) en la zona del dispositivo y cuántos días hacia atrás se pueden consultar (0 = hoy) */
const MAX_DAYS_BACK = 6

function dayAt(offset: number) {
  const d = new Date()
  d.setDate(d.getDate() - offset)
  return d
}
const dayKey = (offset: number) => dayAt(offset).toLocaleDateString('en-CA')

function dayLabel(offset: number) {
  const short = dayAt(offset).toLocaleDateString('es-MX', { weekday: 'short', day: '2-digit' }).replace('.', '').toUpperCase()
  return offset === 0 ? `HOY · ${short}` : offset === 1 ? `AYER · ${short}` : short
}

function apiError(e: unknown): string {
  return (e as { response?: { data?: { message?: string } } } | null)?.response?.data?.message ?? 'No se pudo guardar, intenta de nuevo'
}

/** Barra con marca de meta (y banda si la meta es un rango) */
function Track({ ind, height = 'h-2.5' }: { ind: Indicator; height?: string }) {
  const t = track(ind)
  return (
    <div className={`relative flex-1 rounded-[2px] bg-[#DDD5EE] ${height}`}>
      {t.band && (
        <div className="absolute inset-y-0 bg-[#C4BAD8]" style={{ left: `${t.band[0] * 100}%`, width: `${(t.band[1] - t.band[0]) * 100}%` }} />
      )}
      <div className="absolute inset-y-0 left-0 rounded-[2px]" style={{ width: `${Math.max(t.fill, 0) * 100}%`, background: barColor(ind) }} />
      {t.marker != null && <div className="absolute -inset-y-[3px] w-[2px] bg-[#2D2440]" style={{ left: `${t.marker * 100}%` }} />}
    </div>
  )
}

/** Editor de la meta de un indicador (máximo, mínimo o rango). Solo la persona dueña de la cuenta la cambia desde aquí. */
function GoalEditor({ ind, onClose }: { ind: Indicator; onClose: () => void }) {
  const qc = useQueryClient()
  const t = ind.target
  const [dir, setDir] = useState<'max' | 'min' | 'range'>(
    t.type !== 'none' ? t.type : ind.key === 'kcal' || ind.key === 'carbs_g' || ind.key === 'fat_g' ? 'max' : 'min',
  )
  const [min, setMin] = useState(t.type === 'min' || t.type === 'range' ? String(t.min) : '')
  const [max, setMax] = useState(t.type === 'max' || t.type === 'range' ? String(t.max) : '')

  const lo = Number(min)
  const hi = Number(max)
  const valid =
    dir === 'max' ? max.trim() !== '' && hi >= 0 : dir === 'min' ? min.trim() !== '' && lo >= 0 : min.trim() !== '' && max.trim() !== '' && lo >= 0 && hi >= lo

  const save = useMutation({
    mutationFn: () => goalsApi.put(ind.key, { direction: dir, target_min: dir === 'max' ? null : lo, target_max: dir === 'min' ? null : hi }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['progress'] })
      onClose()
    },
  })

  const input = 'w-20 rounded-md border border-[#C4BAD8] bg-white px-2 py-1 text-[11px] font-bold text-[#2D2440] outline-none focus:border-[#2D2440]'
  return (
    <div className="space-y-1.5 bg-[#EFEBFA] px-2.5 py-2">
      <div className="flex gap-1">
        {(['max', 'min', 'range'] as const).map(d => (
          <button
            key={d}
            type="button"
            onClick={() => { setDir(d); save.reset() }}
            className={`rounded-full border px-2 py-0.5 text-[7.5px] font-bold tracking-[0.08em] ${dir === d ? 'border-[#2D2440] bg-[#2D2440] text-mn-gold' : 'border-[#C4BAD8] text-[#5A4A7A]'}`}
          >
            {d === 'max' ? 'TOPE' : d === 'min' ? 'MÍNIMO' : 'RANGO'}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1.5 text-[9px] font-bold text-[#5A4A7A]">
        {dir !== 'max' && <input inputMode="decimal" value={min} onChange={e => { setMin(e.target.value); save.reset() }} placeholder="mín" className={input} />}
        {dir === 'range' && <span>–</span>}
        {dir !== 'min' && <input inputMode="decimal" value={max} onChange={e => { setMax(e.target.value); save.reset() }} placeholder="máx" className={input} />}
        <span>{ind.unit}</span>
        <button
          type="button"
          disabled={!valid || save.isPending}
          onClick={() => save.mutate()}
          className="ml-auto rounded-full bg-mn-gold px-3 py-1 text-[8px] font-bold uppercase tracking-widest text-[#2D2440] disabled:opacity-40"
        >
          {save.isPending ? 'Guardando…' : 'Guardar'}
        </button>
        <button type="button" onClick={onClose} className="text-[8px] font-bold uppercase tracking-widest text-[#8878AA]">
          Cancelar
        </button>
      </div>
      {save.isError && <p className="text-[8.5px] text-[#E8503A]">{apiError(save.error)}</p>}
    </div>
  )
}

function Row({ ind, open, editing, onToggle, onEdit }: { ind: Indicator; open: boolean; editing: boolean; onToggle: () => void; onEdit: () => void }) {
  // Sin meta definida no hay "bien" ni "mal": solo se muestra el dato
  const st = ind.target.type === 'none' && ind.value != null ? NO_GOAL : STATUS[ind.status]
  const h = hint(ind)
  return (
    <div className="border-b border-dashed border-[#C4BAD8]">
      <button type="button" onClick={onToggle} aria-expanded={open} className={`block w-full px-2.5 py-2 text-left hover:bg-[#EFEBFA] ${open ? 'bg-[#EFEBFA]' : ''}`}>
        <div className="flex items-center gap-2">
          {/* nombre y, debajo, cuánto falta o queda */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-[2px]" style={{ background: BAR_COLOR[ind.key] ?? '#5588AA' }} />
              <span className="truncate text-[10px] font-bold uppercase">{ind.label}</span>
            </div>
            <div className="pl-[18px] text-[8.5px] font-bold" style={{ color: h.color }}>
              {h.text}
            </div>
          </div>
          {/* valor / meta en columna fija para que todo quede alineado */}
          <span className="w-[112px] shrink-0 whitespace-nowrap text-right">
            <b className="text-[20px] leading-none">{ind.value == null ? '—' : fmt(ind.value)}</b>
            {ind.target.type !== 'none' && (
              <span className="text-[9px] font-bold text-[#8878AA]"> / {goalText(ind.target)} {ind.unit}</span>
            )}
            {ind.target.type === 'none' && ind.value != null && <span className="text-[9px] font-bold text-[#8878AA]"> {ind.unit}</span>}
          </span>
          <span className="w-[54px] shrink-0 rounded-sm py-1 text-center text-[7.5px] font-bold tracking-[0.06em] text-white" style={{ background: st.color }}>
            {st.label}
          </span>
        </div>
        <div className="mt-1.5">
          <Track ind={ind} />
        </div>
      </button>
      {open && (
        <div className="px-2.5 pb-2 text-[8.5px] leading-normal text-[#5A4A7A]">
          {ind.estimated && ind.value != null && <div>Incluye porciones estimadas.</div>}
          {ind.sources && ind.sources.length > 0 && <div>// DE DÓNDE VIENE: {ind.sources.join(', ')}</div>}
          {!editing && (
            <button type="button" onClick={onEdit} className="mt-1 text-[8px] font-bold uppercase tracking-widest text-[#5588AA]">
              {ind.target.type === 'none' ? 'Definir meta' : 'Editar meta'}
            </button>
          )}
        </div>
      )}
      {editing && <GoalEditor ind={ind} onClose={onEdit} />}
    </div>
  )
}

export default function ProgresoTab() {
  const { current } = useAuth()
  const [offset, setOffset] = useState(0)
  const date = dayKey(offset)
  const [selected, setSelected] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['progress', current?.id, date],
    queryFn: () => progressApi.daily(date),
    enabled: !!current?.id,
    staleTime: 1000 * 60,
    // Al cambiar de día se queda el anterior en pantalla mientras llega el nuevo
    placeholderData: keepPreviousData,
    // Mientras haya entradas procesándose, se refresca solo
    refetchInterval: q => ((q.state.data?.pending ?? 0) > 0 ? 15_000 : false),
    // Sin llave de analytics no tiene caso reintentar
    retry: (count, err) => !analyticsNotConfigured(err) && count < 2,
  })

  // "Sigue así" / "evita": si falla o aún no hay datos, simplemente no se muestra
  const focusQ = useQuery({
    queryKey: ['progress', 'focus', current?.id, date],
    queryFn: () => progressApi.focus(date),
    enabled: !!current?.id && !!data,
    staleTime: 1000 * 60,
    placeholderData: keepPreviousData,
    retry: false,
  })

  const changeDay = (delta: number) => {
    setOffset(o => Math.min(Math.max(o + delta, 0), MAX_DAYS_BACK))
    setSelected(null)
    setEditing(null)
  }

  if (isLoading) return <p className="p-6 text-center text-[10px] font-bold uppercase tracking-widest text-[#8878AA]">cargando…</p>
  if (isError && analyticsNotConfigured(error)) {
    return (
      <div className="p-6 text-center">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#2D2440]">analíticas no activadas</p>
        <p className="mt-2 text-[9px] leading-normal text-[#5A4A7A]">
          Para ver tu progreso necesitas una API key analytics. Pídesela a tu sponsor y agrégala en tu Perfil.
        </p>
      </div>
    )
  }
  if (isError || !data) {
    return (
      <div className="p-6 text-center">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#8878AA]">sin conexión</p>
        <button onClick={() => refetch()} className="mt-3 rounded-full border-[1.5px] border-[#C4BAD8] px-4 py-2 text-[9.5px] font-bold text-[#8878AA]">
          REINTENTAR
        </button>
      </div>
    )
  }

  const kcal = data.indicators.find(i => i.display === 'budget')
  const rows = data.indicators.filter(i => i !== kcal)
  const noKcal = !kcal || kcal.value == null
  const kcalValue = kcal?.value ?? 0
  const cap = kcal && (kcal.target.type === 'max' || kcal.target.type === 'min') ? kcal.target.value : 0
  const stateLabel =
    data.pending > 0
      ? `ACTUALIZANDO ${data.pending}…`
      : noKcal
        ? 'SIN DATOS'
        : cap && kcalValue > cap
          ? 'PASADO DEL TOPE'
          : cap && kcalValue >= cap * 0.85
            ? 'CERCA DEL TOPE'
            : 'EN CURSO'

  // Barra de calorías: lo comido, lo que queda hasta el tope (oscuro) y lo que quede de carril después del tope
  const span = cap * 1.2 || 1
  const eatenPct = Math.min(kcalValue / span, 1) * 100
  const capPct = (cap / span) * 100
  const over = cap > 0 && kcalValue > cap


  return (
    <div className="flex flex-col gap-1.5 px-3.5 pb-28 pt-2">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => changeDay(1)}
          disabled={offset >= MAX_DAYS_BACK}
          aria-label="Día anterior"
          className="rounded-full border-[1.5px] border-[#C4BAD8] p-1 text-[#5A4A7A] enabled:hover:border-[#2D2440] disabled:opacity-30"
        >
          <ChevronLeft size={14} />
        </button>
        <span className="text-[9px] font-bold tracking-[0.12em] text-[#5A4A7A]">{dayLabel(offset)}</span>
        <button
          type="button"
          onClick={() => changeDay(-1)}
          disabled={offset === 0}
          aria-label="Día siguiente"
          className="rounded-full border-[1.5px] border-[#C4BAD8] p-1 text-[#5A4A7A] enabled:hover:border-[#2D2440] disabled:opacity-30"
        >
          <ChevronRight size={14} />
        </button>
      </div>

      {focusQ.data && <FocusCards focus={focusQ.data} />}

      <section className="flex min-h-0 flex-col overflow-hidden rounded-md border-[1.5px] border-[#C4BAD8] bg-[#F8F6FD]">
        <div className="flex items-center justify-between bg-[#2D2440] px-2.5 py-1.5 text-[8px] font-bold tracking-[0.12em] text-[#EDE9F8]">
          <span>{data.date} // BALANCE_DIARIO</span>
          <b className="text-mn-gold">{stateLabel}</b>
        </div>

        {kcal && (
          <div className="border-b border-dashed border-[#C4BAD8] px-2.5 py-2">
            <div className="flex items-end justify-between gap-3">
              <div>
                <div className="text-[7.5px] font-bold tracking-[0.14em] text-[#8878AA]">LLEVAS HOY{kcal.estimated && !noKcal ? ' · EST.' : ''}</div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[38px] font-bold leading-none">{noKcal ? '—' : fmt(kcalValue)}</span>
                  <span className="text-[9px] font-bold text-[#8878AA]">kcal</span>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-baseline justify-end gap-2">
                  <span className="text-[7.5px] font-bold tracking-[0.14em] text-[#8878AA]">TOPE</span>
                  <button
                    type="button"
                    onClick={() => setEditing(editing === kcal.key ? null : kcal.key)}
                    className="text-[8px] font-bold tracking-widest text-[#5588AA] underline decoration-dotted"
                  >
                    editar
                  </button>
                </div>
                <div className="flex items-baseline justify-end gap-1.5">
                  <span className="text-[19px] font-bold leading-none">{fmt(cap)}</span>
                  <span className="text-[9px] font-bold text-[#8878AA]">kcal</span>
                </div>
              </div>
            </div>

            {/* marca del tope, arriba de la barra */}
            <div className="relative mt-1.5 h-3">
              <span className="absolute -translate-x-1/2 text-[6.5px] font-bold tracking-[0.1em] text-[#2D2440]" style={{ left: `${capPct}%` }}>TOPE</span>
            </div>
            <div className="relative h-3 rounded-[2px] bg-[#DDD5EE]" role="img" aria-label={`${fmt(kcalValue)} de ${fmt(cap)} kcal`}>
              {/* lo que queda hasta el tope (oscuro) */}
              <div className="absolute inset-y-0 left-0 rounded-[2px] bg-[#120E28]" style={{ width: `${capPct}%` }} />
              {/* lo comido; lo que pase del tope va en rojo */}
              <div className="absolute inset-y-0 left-0 rounded-[2px] bg-mn-gold" style={{ width: `${Math.min(eatenPct, capPct)}%` }} />
              {over && <div className="absolute inset-y-0 bg-[#E8503A]" style={{ left: `${capPct}%`, width: `${eatenPct - capPct}%` }} />}
              <div className="absolute -inset-y-[3px] w-[2px] bg-[#2D2440]" style={{ left: `${capPct}%` }} />
            </div>

            <div
              className="mt-2 flex items-center justify-between rounded-md px-2.5 py-1.5 text-[9px] font-bold"
              style={{ background: noKcal ? '#EDE9F8' : over ? '#FBE3DE' : '#DDEFE3', color: noKcal ? '#8878AA' : over ? '#C23A26' : '#2E7D4F' }}
            >
              <span className="tracking-[0.08em]">{noKcal ? 'SIN REGISTROS' : over ? 'TE PASASTE' : 'TE QUEDAN'}</span>
              {!noKcal && <span className="text-[13px]">{fmt(Math.abs(cap - kcalValue))} kcal</span>}
            </div>
          </div>
        )}
        {kcal && editing === kcal.key && <GoalEditor ind={kcal} onClose={() => setEditing(null)} />}

        {rows.map(ind => (
          <Row
            key={ind.key}
            ind={ind}
            open={selected === ind.key}
            editing={editing === ind.key}
            onToggle={() => setSelected(selected === ind.key ? null : ind.key)}
            onEdit={() => setEditing(editing === ind.key ? null : ind.key)}
          />
        ))}

        {data.meals && data.meals.length > 0 && (
          <div className="border-b border-dashed border-[#C4BAD8] px-2.5 py-1.5">
            <div className="mb-1 text-[7.5px] font-bold tracking-[0.14em] text-[#8878AA]">POR COMIDA · KCAL</div>
            {data.meals.map(m => (
              <div key={m.slot} className="flex items-center gap-[7px] py-px">
                <div className="w-[70px] text-[9px] font-bold uppercase">{m.label}</div>
                <div className="flex-1 text-[8.5px] text-[#5A4A7A]">
                  {m.status === 'no_data' ? '—' : fmt(m.kcal)}
                  <span className="text-[#8878AA]"> · meta {m.target.type === 'range' ? `${fmt(m.target.min)}–${fmt(m.target.max)}` : goalText(m.target)}</span>
                </div>
                <div className="w-[52px] rounded-sm py-0.5 text-center text-[7.5px] font-bold tracking-[0.06em] text-white" style={{ background: STATUS[m.status].color }}>
                  {STATUS[m.status].label}
                </div>
              </div>
            ))}
          </div>
        )}

        {data.suggestion && (
          <p className="px-2.5 py-1.5 text-[9px] leading-normal text-[#5A4A7A]">
            <b className="text-[#2D2440]">SUGERENCIA:</b> {data.suggestion.text}
          </p>
        )}
      </section>

      <div className="flex gap-2">
        <button
          type="button"
          disabled
          title="Próximamente"
          className="flex-1 rounded-3xl border-[1.5px] border-mn-gold bg-mn-gold p-2.5 text-[9.5px] font-bold text-[#2D2440] opacity-70"
        >
          HABLAR CON MU · PRONTO
        </button>
        <Link to="/user/historial" className="rounded-3xl border-[1.5px] border-[#C4BAD8] p-2.5 text-[9.5px] font-bold text-[#8878AA]">
          ARCHIVO
        </Link>
      </div>
    </div>
  )
}
