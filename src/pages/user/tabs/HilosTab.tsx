import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { hilosApi, getNudos, getNudoNombre } from '@/services/api'
import { nudoColor, type User } from '@/types'
import { Layers2 } from 'lucide-react'

function Skeleton() {
  return (
    <div className="px-4 space-y-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-white rounded-2xl border border-[#DDD5EE] p-4 animate-pulse space-y-2">
          <div className="h-4 w-40 bg-[#DDD5EE] rounded-full" />
          <div className="h-3 w-24 bg-[#DDD5EE] rounded-full" />
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

  useQuery({
    queryKey: ['nudos'],
    queryFn: getNudos,
    staleTime: Infinity,
  })

  const hilos = hilosData ?? []

  return (
    <div className="min-h-full bg-[#EDE9F8] pb-24">
      <div className="px-5 pt-6 pb-5">
        <p className="text-[10px] uppercase tracking-[.15em] text-[#5A4A7A]">
          {hilos.length} hilo{hilos.length !== 1 ? 's' : ''} asignado{hilos.length !== 1 ? 's' : ''}
        </p>
        <h1 className="text-xl font-black tracking-tight text-[#2D2440] mt-0.5">Mis Hilos</h1>
      </div>

      {groupIds.length === 0 ? (
        <div className="px-4 pt-8 text-center space-y-2">
          <p className="text-sm font-bold uppercase tracking-widest text-[#5A4A7A]">Sin hilos asignados</p>
          <p className="text-[10px] text-[#B0A8CC]">Tu coordinador te agregará pronto.</p>
        </div>
      ) : isLoading ? (
        <Skeleton />
      ) : hilos.length === 0 ? (
        <div className="px-4 pt-8 text-center">
          <p className="text-[10px] text-[#B0A8CC]">No se pudieron cargar los hilos.</p>
        </div>
      ) : (
        <div className="px-4 space-y-3">
          {hilos.map(hilo => {
            const nudosPresentes = [...new Set(hilo.questions.map(q => q.categoryId))]

            return (
              <div key={hilo.id} className="bg-white rounded-2xl border border-[#DDD5EE] p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EDE9F8]">
                    <Layers2 size={16} className="text-[#2D2440]" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-[#2D2440] tracking-tight">{hilo.name}</p>
                    <p className="text-[9px] text-[#B0A8CC] uppercase tracking-widest font-bold">
                      {hilo.questions.length} pregunta{hilo.questions.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                {nudosPresentes.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {nudosPresentes.map((catId, i) => {
                      const color = nudoColor(catId, i)
                      return (
                        <span
                          key={catId}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-bold tracking-widest uppercase border"
                          style={{ backgroundColor: color + '18', color, borderColor: color + '44' }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                          {getNudoNombre(catId)}
                        </span>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}

          <p className="text-center text-[9px] text-[#B0A8CC] uppercase tracking-widest pt-2">
            Tu coordinador administra estos hilos
          </p>
        </div>
      )}
    </div>
  )
}
