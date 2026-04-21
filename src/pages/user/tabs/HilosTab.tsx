import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { hilosApi, nudosApi } from '@/services/api'
import { nudoColor, type User } from '@/types'
import { Layers2 } from 'lucide-react'

function Skeleton() {
  return (
    <div className="px-4 space-y-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-[#1A1228] rounded-xl p-4 animate-pulse space-y-2">
          <div className="h-4 w-40 bg-fulla-border rounded" />
          <div className="h-3 w-24 bg-fulla-border rounded" />
        </div>
      ))}
    </div>
  )
}

export default function HilosTab() {
  const { current } = useAuth()
  const user = current as User | null
  const groupIds: string[] = user?.groups ?? []

  const { data: hilosData, isLoading } = useQuery({
    queryKey: ['hilos-user', groupIds.join(',')],
    queryFn: () => hilosApi.getByIds(groupIds),
    enabled: groupIds.length > 0,
    staleTime: 1000 * 60 * 5,
  })

  const { data: nudosData } = useQuery({
    queryKey: ['nudos'],
    queryFn: () => nudosApi.list(),
    staleTime: 1000 * 60 * 10,
  })

  const nudosMap = Object.fromEntries(
    (nudosData?.categories ?? []).map((n, i) => [n.id, { ...n, color: nudoColor(n.id, i) }])
  )

  const hilos = hilosData ?? []

  return (
    <div className="pb-4">
      <div className="px-4 pt-6 pb-4">
        <p className="text-fulla-muted text-xs tracking-widest uppercase">
          {hilos.length} hilo{hilos.length !== 1 ? 's' : ''} asignado{hilos.length !== 1 ? 's' : ''}
        </p>
        <h1 className="text-2xl font-black text-[#EDE9F8] tracking-tight">Mis Hilos</h1>
      </div>

      {groupIds.length === 0 ? (
        <div className="px-4 pt-8 text-center space-y-2">
          <p className="text-fulla-muted text-sm">Aún no perteneces a ningún hilo.</p>
          <p className="text-fulla-muted/50 text-xs">Tu coordinador te agregará pronto.</p>
        </div>
      ) : isLoading ? (
        <Skeleton />
      ) : hilos.length === 0 ? (
        <div className="px-4 pt-8 text-center space-y-2">
          <p className="text-fulla-muted text-sm">No se pudieron cargar los hilos.</p>
        </div>
      ) : (
        <div className="px-4 space-y-3">
          {hilos.map(hilo => {
            const nudosPresentes = [...new Set(hilo.questions.map(q => q.categoryId))]
              .map(id => nudosMap[id])
              .filter(Boolean)

            return (
              <div key={hilo.id} className="bg-[#1A1228] rounded-xl border border-fulla-border p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-fulla-gold/10">
                      <Layers2 size={16} className="text-fulla-gold" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-[#EDE9F8] tracking-tight">{hilo.name}</p>
                      <p className="text-[10px] text-fulla-muted uppercase tracking-widest">
                        {hilo.questions.length} pregunta{hilo.questions.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                </div>

                {nudosPresentes.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {nudosPresentes.map(nudo => (
                      <span
                        key={nudo.id}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold tracking-widest uppercase"
                        style={{ backgroundColor: nudo.color + '22', color: nudo.color }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: nudo.color }} />
                        {nudo.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )
          })}

          <p className="text-center text-[10px] text-fulla-muted/50 uppercase tracking-widest pt-2">
            Tu coordinador administra estos hilos
          </p>
        </div>
      )}
    </div>
  )
}
