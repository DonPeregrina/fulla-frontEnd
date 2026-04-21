import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, ChevronRight, Users } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { bitacorasApi, usersApi, hilosApi } from '@/services/api'
import { nudoColor, type Bitacora, type Respuesta } from '@/types'
import { formatDate, dateToISO } from '@/lib/utils'

function Skeleton() {
  return (
    <div className="px-4 space-y-3">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="bg-white rounded-2xl border border-[#DDD5EE] p-4 animate-pulse space-y-2">
          <div className="h-3 w-32 bg-[#DDD5EE] rounded-full" />
          <div className="h-4 w-16 bg-[#DDD5EE] rounded-full" />
        </div>
      ))}
    </div>
  )
}

function RespuestaRow({ r }: { r: Respuesta }) {
  const color = nudoColor(r.question?.categoryId ?? '0')
  return (
    <div className="flex gap-3 items-start py-2 border-b border-[#DDD5EE]/60 last:border-0">
      <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: color }} />
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-[#B0A8CC] leading-snug truncate">{r.question?.body ?? 'Pregunta'}</p>
        <p className="text-sm font-bold text-[#2D2440] mt-0.5">{r.body}</p>
      </div>
    </div>
  )
}

function BitacoraCard({ bitacora, userName }: { bitacora: Bitacora; userName: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="bg-white rounded-2xl border border-[#DDD5EE] overflow-hidden">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-3 px-4 py-3 text-left">
        <div className="flex-1 min-w-0">
          <p className="text-[9px] text-[#B0A8CC] uppercase tracking-widest font-bold">{userName}</p>
          <p className="text-sm font-black text-[#2D2440]">
            {bitacora.count} respuesta{bitacora.count !== 1 ? 's' : ''}
          </p>
        </div>
        {open
          ? <ChevronDown size={16} className="text-[#B0A8CC] shrink-0" />
          : <ChevronRight size={16} className="text-[#B0A8CC] shrink-0" />
        }
      </button>
      {open && bitacora.answers.length > 0 && (
        <div className="px-4 pb-3 border-t border-[#DDD5EE]/60">
          {bitacora.answers.map(r => <RespuestaRow key={r.id} r={r} />)}
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
  const totalR = bitacoras.reduce((s, b) => s + b.count, 0)
  return (
    <div className="space-y-2">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between px-1 py-1">
        <div className="text-left">
          <p className="text-sm font-black text-[#2D2440] tracking-tight capitalize">
            {formatDate(fecha, "EEEE d 'de' MMMM")}
          </p>
          <p className="text-[9px] text-[#B0A8CC] uppercase tracking-widest font-bold">
            {bitacoras.length} usuario{bitacoras.length !== 1 ? 's' : ''} · {totalR} respuestas
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1 bg-[#10b981]/10 text-[#10b981] px-2 py-0.5 rounded-full text-[9px] font-bold">
            <Users size={10} />
            {bitacoras.length}
          </div>
          {open
            ? <ChevronDown size={14} className="text-[#B0A8CC]" />
            : <ChevronRight size={14} className="text-[#B0A8CC]" />
          }
        </div>
      </button>
      {open && (
        <div className="space-y-2 pl-1">
          {bitacoras.map(b => (
            <BitacoraCard key={b.id} bitacora={b} userName={userMap[b.userId ?? ''] ?? 'Usuario'} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function BitacorasTab() {
  const { current } = useAuth()

  const { data: bitacorasData, isLoading } = useQuery({
    queryKey: ['bitacoras'],
    queryFn: () => bitacorasApi.list(),
    enabled: !!current?.id,
  })

  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.list(),
    enabled: !!current?.id,
  })

  useQuery({
    queryKey: ['hilos'],
    queryFn: async () => {
      const d = await hilosApi.list()
      const map: Record<string, string> = {}
      d.groups.forEach(g => { map[g.id] = g.name })
      localStorage.setItem('fulla:group-names', JSON.stringify(map))
      return d
    },
    enabled: !!current?.id,
  })

  const userMap: Record<string, string> = Object.fromEntries(
    (usersData?.users ?? []).map(u => [u.id, u.username ?? u.name ?? u.id])
  )

  const bitacoras = bitacorasData?.collections ?? []
  const byFecha = bitacoras.reduce<Record<string, Bitacora[]>>((acc, b) => {
    const d = dateToISO(b.date)
    if (!acc[d]) acc[d] = []
    acc[d].push(b)
    return acc
  }, {})
  const fechas = Object.keys(byFecha).sort((a, b) => b.localeCompare(a))

  return (
    <div className="min-h-full bg-[#EDE9F8] pb-4">
      <div className="px-5 pt-6 pb-5">
        <p className="text-[10px] uppercase tracking-[.15em] text-[#5A4A7A]">Vista de host</p>
        <h1 className="text-xl font-black text-[#2D2440] tracking-tight mt-0.5">Bitácoras</h1>
      </div>

      {isLoading ? (
        <Skeleton />
      ) : fechas.length === 0 ? (
        <div className="px-4 pt-8 text-center space-y-2">
          <p className="text-sm font-bold uppercase tracking-widest text-[#5A4A7A]">Sin registros</p>
          <p className="text-[10px] text-[#B0A8CC]">Cuando tus usuarios respondan aparecerán aquí.</p>
        </div>
      ) : (
        <div className="px-4 space-y-6">
          {fechas.map(f => (
            <FechaGroup key={f} fecha={f} bitacoras={byFecha[f]} userMap={userMap} />
          ))}
        </div>
      )}
    </div>
  )
}
