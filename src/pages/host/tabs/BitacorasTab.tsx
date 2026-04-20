import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, ChevronRight, Users } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { bitacorasApi, usersApi, hilosApi } from '@/services/api'
import { dimensionColor, type Bitacora, type Nodo } from '@/types'
import { formatDate, dateToISO } from '@/lib/utils'

function Skeleton() {
  return (
    <div className="px-4 space-y-3">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="bg-[#1A1228] rounded-xl p-4 animate-pulse space-y-2">
          <div className="h-3 w-32 bg-fulla-border rounded" />
          <div className="h-4 w-16 bg-fulla-border rounded" />
        </div>
      ))}
    </div>
  )
}

function NodoRow({ nodo }: { nodo: Nodo }) {
  const color = dimensionColor(nodo.question?.categoryId ?? '0')
  return (
    <div className="flex gap-3 items-start py-2 border-b border-fulla-border/30 last:border-0">
      <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: color }} />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-fulla-muted leading-snug truncate">
          {nodo.question?.body ?? 'Pregunta'}
        </p>
        <p className="text-sm font-medium text-[#EDE9F8] mt-0.5">{nodo.body}</p>
      </div>
    </div>
  )
}

function BitacoraCard({
  bitacora,
  userName,
}: {
  bitacora: Bitacora
  userName: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="bg-[#1A1228] rounded-xl border border-fulla-border overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        <div className="flex-1 min-w-0">
          <p className="text-xs text-fulla-muted uppercase tracking-widest">{userName}</p>
          <p className="text-sm font-bold text-[#EDE9F8]">
            {bitacora.count} nodo{bitacora.count !== 1 ? 's' : ''}
          </p>
        </div>
        {open ? (
          <ChevronDown size={16} className="text-fulla-muted shrink-0" />
        ) : (
          <ChevronRight size={16} className="text-fulla-muted shrink-0" />
        )}
      </button>

      {open && bitacora.answers.length > 0 && (
        <div className="px-4 pb-3">
          {bitacora.answers.map(n => <NodoRow key={n.id} nodo={n} />)}
        </div>
      )}
    </div>
  )
}

function FechaGroup({ fecha, bitacoras, userMap }: {
  fecha: string
  bitacoras: Bitacora[]
  userMap: Record<string, string>
}) {
  const [open, setOpen] = useState(false)
  const totalNodos = bitacoras.reduce((s, b) => s + b.count, 0)

  return (
    <div className="space-y-2">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-1"
      >
        <div className="text-left">
          <p className="text-sm font-black text-[#EDE9F8] tracking-tight capitalize">
            {formatDate(fecha, 'EEEE d \'de\' MMMM')}
          </p>
          <p className="text-[10px] text-fulla-muted uppercase tracking-widest">
            {bitacoras.length} usuario{bitacoras.length !== 1 ? 's' : ''} · {totalNodos} nodos
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1 bg-fulla-green/10 text-fulla-green px-2 py-0.5 rounded-full text-[10px] font-bold">
            <Users size={10} />
            {bitacoras.length}
          </div>
          {open ? <ChevronDown size={14} className="text-fulla-muted" /> : <ChevronRight size={14} className="text-fulla-muted" />}
        </div>
      </button>

      {open && (
        <div className="space-y-2 pl-1">
          {bitacoras.map(b => (
            <BitacoraCard
              key={b.id}
              bitacora={b}
              userName={userMap[b.userId ?? ''] ?? 'Usuario'}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function BitacorasTab() {
  const { current } = useAuth()

  const { data: bitacorasData, isLoading: loadingBitacoras } = useQuery({
    queryKey: ['bitacoras'],
    queryFn: () => bitacorasApi.list(),
    enabled: !!current?.id,
  })

  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.list(),
    enabled: !!current?.id,
  })

  // Cachear grupos en localStorage para que el user tab los pueda usar
  const { data: hilosData } = useQuery({
    queryKey: ['hilos'],
    queryFn: async () => {
      const d = await hilosApi.list()
      const groupMap: Record<string, string> = {}
      d.groups.forEach(g => { groupMap[g.id] = g.name })
      localStorage.setItem('fulla:group-names', JSON.stringify(groupMap))
      return d
    },
    enabled: !!current?.id,
  })

  const userMap: Record<string, string> = Object.fromEntries(
    (usersData?.users ?? []).map(u => [u.id, u.username ?? u.name ?? u.id])
  )

  // Agrupar bitácoras por fecha
  const bitacoras = bitacorasData?.collections ?? []
  const byFecha = bitacoras.reduce<Record<string, Bitacora[]>>((acc, b) => {
    const d = dateToISO(b.date)
    if (!acc[d]) acc[d] = []
    acc[d].push(b)
    return acc
  }, {})
  const fechas = Object.keys(byFecha).sort((a, b) => b.localeCompare(a))

  return (
    <div className="pb-4">
      <div className="px-4 pt-6 pb-4">
        <p className="text-fulla-muted text-xs tracking-widest uppercase">Vista de host</p>
        <h1 className="text-2xl font-black text-[#EDE9F8] tracking-tight">Bitácoras</h1>
      </div>

      {loadingBitacoras ? (
        <Skeleton />
      ) : fechas.length === 0 ? (
        <div className="px-4 pt-8 text-center space-y-2">
          <p className="text-fulla-muted text-sm">Aún no hay nodos registrados.</p>
          <p className="text-fulla-muted/50 text-xs">Cuando tus usuarios respondan aparecerán aquí.</p>
        </div>
      ) : (
        <div className="px-4 space-y-6">
          {fechas.map(f => (
            <FechaGroup
              key={f}
              fecha={f}
              bitacoras={byFecha[f]}
              userMap={userMap}
            />
          ))}
        </div>
      )}
    </div>
  )
}
