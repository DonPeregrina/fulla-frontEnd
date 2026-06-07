import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameDay, addMonths, subMonths,
} from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, History } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { respuestasApi, getNudoNombre } from '@/services/api'
import { nudoColor, type Respuesta } from '@/types'
import { dateToISO } from '@/lib/utils'

function Skeleton() {
  return (
    <div className="flex h-full items-center justify-center p-8 text-center">
      <div className="space-y-3">
        <div className="h-6 w-6 rounded-full border-2 border-dashed border-[#F0C030] animate-[spin_4s_linear_infinite] mx-auto" />
        <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-mn-sky animate-pulse">LOADING ARCHIVE…</p>
      </div>
    </div>
  )
}

export default function HistorialTab() {
  const { current } = useAuth()
  const userId = current?.id

  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())

  // Reusar mismo cache que NudosTab
  const { data, isLoading } = useQuery({
    queryKey: ['respuestas-all', userId],
    queryFn: () => respuestasApi.list(userId),
    enabled: !!userId,
    staleTime: 1000 * 60 * 10,
  })

  const todasRespuestas: Respuesta[] = (data?.answers ?? []).filter(r => r.question)

  // Fechas con al menos una respuesta (ISO)
  const fechasConRespuestas = new Set(
    todasRespuestas.map(r => dateToISO(Number(r.createdAt)))
  )

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  })

  const selectedISO = dateToISO(selectedDate)
  const dayAnswers = todasRespuestas
    .filter(r => dateToISO(Number(r.createdAt)) === selectedISO)
    .sort((a, b) => Number(b.createdAt) - Number(a.createdAt))

  if (isLoading) return <Skeleton />

  return (
    <div className="space-y-4 px-4 pb-24 pt-4">

      {/* Header */}
      <div className="border-b border-[#DDD5EE]/50 pb-3">
        <h1 className="text-sm font-bold tracking-[0.2em] text-mn-plum">ARCHIVE RECORD</h1>
        <p className="text-[8px] uppercase tracking-[0.25em] text-mn-sky mt-1">
          {todasRespuestas.length} registros · past log matrix
        </p>
      </div>

      {/* Calendario */}
      <div className="rounded-3xl border-2 border-mn-plum bg-white shadow-sm overflow-hidden">
        {/* Header del mes */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#1A1535]/5 border-b border-[#DDD5EE]/50">
          <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-mn-plum">
            {format(currentMonth, 'MMMM yyyy', { locale: es })}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setCurrentMonth(m => subMonths(m, 1))}
              className="h-7 w-7 border border-[#DDD5EE] bg-white text-mn-plum hover:bg-mn-bg rounded-lg flex items-center justify-center transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setCurrentMonth(m => addMonths(m, 1))}
              className="h-7 w-7 border border-[#DDD5EE] bg-white text-mn-plum hover:bg-mn-bg rounded-lg flex items-center justify-center transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Grid del calendario */}
        <div className="p-3">
          <div className="grid grid-cols-7 gap-1 text-center text-[8px] font-bold text-mn-sky mb-1">
            {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((d, i) => (
              <div key={i} className="py-1 tracking-widest">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, i) => {
              const isSelected = isSameDay(day, selectedDate)
              const iso = dateToISO(day)
              const hasAnswers = fechasConRespuestas.has(iso)
              const count = hasAnswers
                ? todasRespuestas.filter(r => dateToISO(Number(r.createdAt)) === iso).length
                : 0

              return (
                <button
                  key={day.toString()}
                  onClick={() => setSelectedDate(day)}
                  className={`relative flex aspect-square items-center justify-center rounded-xl text-[10px] font-bold transition-all overflow-hidden ${
                    isSelected
                      ? 'bg-mn-plum text-white shadow-[2px_2px_0px_#F0C030]'
                      : hasAnswers
                        ? 'bg-[#1A1535] hover:opacity-80'
                        : 'hover:bg-mn-bg text-mn-sky'
                  }`}
                  style={{ gridColumnStart: i === 0 ? day.getDay() + 1 : undefined }}
                >
                  {/* Día número — azul claro sobre fondo oscuro, blanco cuando seleccionado */}
                  <span
                    className="relative z-10 text-[10px] font-bold"
                    style={{ color: isSelected ? '#fff' : hasAnswers ? '#AADDFF' : undefined }}
                  >
                    {format(day, 'd')}
                  </span>

                  {/* Barra redacted + badge de conteo */}
                  {hasAnswers && !isSelected && (
                    <>
                      <div className="absolute inset-x-1.5 top-1/2 -translate-y-1/2 h-[5px] bg-[#AADDFF]/10 rounded-[1px]" />
                      <span className="absolute bottom-0.5 right-1 text-[7px] font-bold text-[#F0C030] leading-none z-20">
                        {count}
                      </span>
                    </>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Respuestas del día seleccionado */}
      <div className="space-y-3">
        <h2 className="flex items-center gap-2 text-[8px] uppercase tracking-[0.2em] font-bold text-mn-sky">
          <History className="h-3.5 w-3.5 text-[#F0C030]" />
          {format(selectedDate, "d 'de' MMMM", { locale: es })}
          {dayAnswers.length > 0 && (
            <span className="ml-auto text-[7px] text-[#B0A8CC]">{dayAnswers.length} registros</span>
          )}
        </h2>

        {dayAnswers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center border-2 border-dashed border-[#DDD5EE] rounded-2xl bg-white/30">
            <p className="text-[8px] text-mn-sky uppercase tracking-widest italic font-bold">No records on this date</p>
          </div>
        ) : (
          dayAnswers.map(r => {
            const color = nudoColor(r.question!.categoryId)
            const nudoName = getNudoNombre(r.question!.categoryId)
            return (
              <div key={r.id} className="bg-white rounded-2xl border border-[#DDD5EE] px-4 py-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    <span className="text-[8px] font-bold uppercase tracking-widest" style={{ color }}>
                      {nudoName}
                    </span>
                  </div>
                  <span className="text-[8px] text-[#B0A8CC] font-bold tracking-wider">
                    {format(new Date(Number(r.createdAt)), 'HH:mm')}
                  </span>
                </div>
                <p className="text-[9px] font-bold text-mn-plum leading-snug uppercase tracking-wide">
                  {r.question!.body}
                </p>
                <p className="text-sm font-bold" style={{ color: '#F0C030' }}>
                  {r.body}
                </p>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
