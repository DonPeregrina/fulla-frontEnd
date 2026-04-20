import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { nodosApi, bitacorasApi } from '@/services/api'
import { dimensionColor } from '@/types'
import { formatDate, dateToISO } from '@/lib/utils'

const PAGE_SIZE = 8

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getGroupNames(): Record<string, string> {
  try {
    const raw = localStorage.getItem('fulla:group-names')
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function groupLabel(groupId: string, nameMap: Record<string, string>): string {
  return nameMap[groupId] ?? `Grupo ${groupId.slice(-4)}`
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="px-4 space-y-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-[#1A1228] rounded-xl p-4 space-y-3 animate-pulse">
          <div className="h-3 w-32 bg-fulla-border rounded" />
          <div className="h-2 w-full bg-fulla-border rounded-full" />
          <div className="h-2 w-3/4 bg-fulla-border rounded-full" />
        </div>
      ))}
    </div>
  )
}

// ─── Barra de progreso por grupo ──────────────────────────────────────────────

function GrupoRow({
  groupId,
  answered,
  total,
  nameMap,
}: {
  groupId: string
  answered: number
  total: number
  nameMap: Record<string, string>
}) {
  const pct = total > 0 ? Math.round((answered / total) * 100) : 0
  const color = dimensionColor(groupId)
  const nombre = groupLabel(groupId, nameMap)

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
          <span className="text-xs font-medium text-[#EDE9F8]">{nombre}</span>
        </div>
        <span className="text-[10px] text-fulla-muted tabular-nums">
          {answered}/{total}
        </span>
      </div>
      <div className="h-1 bg-fulla-border rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}

// ─── Tarjeta de un nodo (colección) ──────────────────────────────────────────

function NodoCard({
  fecha,
  grupoStats,
  nameMap,
}: {
  fecha: string
  grupoStats: { groupId: string; answered: number; total: number }[]
  nameMap: Record<string, string>
}) {
  const [open, setOpen] = useState(true)
  const totalRespondidas = grupoStats.reduce((s, g) => s + g.answered, 0)
  const totalPreguntas = grupoStats.reduce((s, g) => s + g.total, 0)
  const pctGlobal = totalPreguntas > 0 ? Math.round((totalRespondidas / totalPreguntas) * 100) : 0

  return (
    <div className="bg-[#1A1228] rounded-xl border border-fulla-border overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div>
          <p className="text-sm font-black text-[#EDE9F8] capitalize">
            {formatDate(fecha, "EEEE d 'de' MMMM")}
          </p>
          <p className="text-[10px] text-fulla-muted uppercase tracking-widest">
            {totalRespondidas}/{totalPreguntas} respuestas · {pctGlobal}%
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black"
            style={{
              background: `conic-gradient(#F0C030 ${pctGlobal * 3.6}deg, #2D2440 0deg)`,
              color: '#F0C030',
            }}
          >
            {pctGlobal}
          </div>
          {open
            ? <ChevronDown size={14} className="text-fulla-muted" />
            : <ChevronRight size={14} className="text-fulla-muted" />
          }
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-fulla-border/40 pt-3">
          {grupoStats.map(g => (
            <GrupoRow key={g.groupId} {...g} nameMap={nameMap} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── CapturasTab ──────────────────────────────────────────────────────────────

export default function CapturasTab() {
  const { current } = useAuth()
  const userId = current?.id
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  // Todas las respuestas para derivar total de preguntas por grupo
  const { data: respuestasData, isLoading: loadingRespuestas } = useQuery({
    queryKey: ['respuestas-all', userId],
    queryFn: () => nodosApi.list(userId),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  })

  // Colecciones del usuario
  const { data: colData, isLoading: loadingCols } = useQuery({
    queryKey: ['capturas', userId],
    queryFn: () => bitacorasApi.list(userId),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  })

  const nameMap = getGroupNames()

  // Total de preguntas por grupo (derivado del historial completo)
  const totalPorGrupo = useMemo(() => {
    const map: Record<string, Set<string>> = {}
    ;(respuestasData?.answers ?? []).forEach(r => {
      if (!r.question?.groupId) return
      if (!map[r.question.groupId]) map[r.question.groupId] = new Set()
      map[r.question.groupId].add(r.questionId)
    })
    return Object.fromEntries(
      Object.entries(map).map(([gId, set]) => [gId, set.size])
    )
  }, [respuestasData])

  // Construir nodos: una entrada por fecha, con stats por grupo
  const nodos = useMemo(() => {
    const cols = (colData?.collections ?? [])
      .slice()
      .sort((a, b) => Number(b.date) - Number(a.date))

    return cols.map(col => {
      const fecha = dateToISO(col.date)

      // Respuestas de esta colección agrupadas por grupo
      const porGrupo: Record<string, Set<string>> = {}
      col.answers.forEach(r => {
        const gId = r.question?.groupId
        if (!gId) return
        if (!porGrupo[gId]) porGrupo[gId] = new Set()
        porGrupo[gId].add(r.questionId)
      })

      const grupoStats = Object.entries(porGrupo).map(([groupId, qIds]) => ({
        groupId,
        answered: qIds.size,
        total: totalPorGrupo[groupId] ?? qIds.size,
      }))

      return { id: col.id, fecha, grupoStats }
    })
  }, [colData, totalPorGrupo])

  const isLoading = loadingRespuestas || loadingCols
  const nombre = current && 'username' in current ? current.username : ''
  const visibles = nodos.slice(0, visibleCount)

  return (
    <div className="pb-4">
      <div className="px-4 pt-6 pb-4">
        <p className="text-fulla-muted text-xs tracking-widest uppercase">
          {nodos.length} capturas registradas
        </p>
        <h1 className="text-2xl font-black text-[#EDE9F8] tracking-tight">
          {nombre ? `Capturas de ${nombre}` : 'Capturas'}
        </h1>
      </div>

      {isLoading ? (
        <Skeleton />
      ) : nodos.length === 0 ? (
        <div className="px-4 pt-8 text-center space-y-2">
          <p className="text-fulla-muted text-sm">Aún no hay capturas registradas.</p>
          <p className="text-fulla-muted/50 text-xs">Responde tus preguntas diarias para ver tu progreso aquí.</p>
        </div>
      ) : (
        <div className="px-4 space-y-3">
          {visibles.map(n => (
            <NodoCard
              key={n.id}
              fecha={n.fecha}
              grupoStats={n.grupoStats}
              nameMap={nameMap}
            />
          ))}

          {visibleCount < nodos.length && (
            <button
              onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
              className="w-full py-3 text-fulla-muted text-xs font-bold tracking-widest uppercase border border-fulla-border rounded-xl hover:border-fulla-gold/40 transition-colors"
            >
              Ver {Math.min(PAGE_SIZE, nodos.length - visibleCount)} más
              · {nodos.length - visibleCount} restantes
            </button>
          )}
        </div>
      )}
    </div>
  )
}
