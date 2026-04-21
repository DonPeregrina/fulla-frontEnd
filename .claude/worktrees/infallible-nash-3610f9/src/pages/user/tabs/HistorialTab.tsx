import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { respuestasApi, getNudoNombre } from '@/services/api'
import { nudoColor, type Respuesta } from '@/types'
import { formatDate } from '@/lib/utils'

const PAGE_SIZE = 20

function Skeleton() {
  return (
    <div className="px-4 space-y-3">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="bg-white rounded-2xl border border-[#DDD5EE] p-4 animate-pulse space-y-2">
          <div className="h-2.5 w-24 bg-[#DDD5EE] rounded-full" />
          <div className="h-3 w-3/4 bg-[#DDD5EE] rounded-full" />
          <div className="h-3 w-1/2 bg-[#DDD5EE] rounded-full" />
        </div>
      ))}
    </div>
  )
}

export default function HistorialTab() {
  const { current } = useAuth()
  const userId = current?.id
  const [visibles, setVisibles] = useState(PAGE_SIZE)

  // Reusar el mismo cache que NudosTab — cero fetch extra
  const { data, isLoading } = useQuery({
    queryKey: ['respuestas-all', userId],
    queryFn: () => respuestasApi.list(userId),
    enabled: !!userId,
    staleTime: 1000 * 60 * 10,
  })

  const todasRespuestas: Respuesta[] = (data?.answers ?? [])
    .filter(r => r.question)
    .sort((a, b) => Number(b.createdAt) - Number(a.createdAt))

  const mostradas = todasRespuestas.slice(0, visibles)
  const hayMas = visibles < todasRespuestas.length

  return (
    <div className="min-h-full bg-[#EDE9F8] pb-24">
      {/* Header */}
      <div className="px-5 pt-6 pb-5">
        <p className="text-[10px] uppercase tracking-[.15em] text-[#5A4A7A]">
          {todasRespuestas.length} registros
        </p>
        <h1 className="text-xl font-black tracking-tight text-[#2D2440] mt-0.5">Historial</h1>
      </div>

      {isLoading ? (
        <Skeleton />
      ) : todasRespuestas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-[#5A4A7A]">Sin registros</p>
          <p className="text-[10px] text-[#B0A8CC] mt-2">Responde tus nudos diarios para ver tu historial aquí.</p>
        </div>
      ) : (
        <div className="px-4 space-y-2">
          {mostradas.map(r => {
            const nudoName = getNudoNombre(r.question!.categoryId)
            const color = nudoColor(r.question!.categoryId)
            const fecha = formatDate(Number(r.createdAt), "d MMM · HH:mm")

            return (
              <div key={r.id} className="bg-white rounded-2xl border border-[#DDD5EE] px-4 py-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    <span className="text-[8px] font-bold uppercase tracking-widest" style={{ color }}>
                      {nudoName}
                    </span>
                  </div>
                  <span className="text-[8px] text-[#B0A8CC] font-bold tracking-wider">{fecha}</span>
                </div>
                <p className="text-[10px] font-bold text-[#5A4A7A] leading-snug uppercase tracking-wide">
                  {r.question!.body}
                </p>
                <p className="text-sm font-bold" style={{ color: '#F0C030' }}>
                  {r.body}
                </p>
              </div>
            )
          })}

          {hayMas && (
            <button
              onClick={() => setVisibles(v => v + PAGE_SIZE)}
              className="w-full py-3.5 mt-2 rounded-2xl border-2 border-dashed border-[#DDD5EE] text-[9px] font-bold uppercase tracking-widest text-[#B0A8CC] hover:border-[#F0C030] hover:text-[#F0C030] transition-colors"
            >
              Ver {Math.min(PAGE_SIZE, todasRespuestas.length - visibles)} más
              · {todasRespuestas.length - visibles} restantes
            </button>
          )}
        </div>
      )}
    </div>
  )
}
