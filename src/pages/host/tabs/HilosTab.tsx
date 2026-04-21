import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as Dialog from '@radix-ui/react-dialog'
import { toast } from 'sonner'
import { Plus, ChevronRight, Layers2, X, Trash2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { hilosApi } from '@/services/api'

function Skeleton() {
  return (
    <div className="px-4 space-y-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-white rounded-2xl border border-[#DDD5EE] p-4 animate-pulse space-y-2">
          <div className="h-4 w-36 bg-[#DDD5EE] rounded-full" />
          <div className="h-3 w-24 bg-[#DDD5EE] rounded-full" />
        </div>
      ))}
    </div>
  )
}

export default function HilosTab() {
  const { current } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [crearOpen, setCrearOpen] = useState(false)
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [eliminando, setEliminando] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['hilos'],
    queryFn: () => hilosApi.list(),
    enabled: !!current?.id,
  })

  const createMutation = useMutation({
    mutationFn: (name: string) => hilosApi.create(name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hilos'] })
      toast.success('Hilo creado')
      setNuevoNombre('')
      setCrearOpen(false)
    },
    onError: () => toast.error('No se pudo crear el hilo'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => hilosApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hilos'] })
      toast.success('Hilo eliminado')
      setEliminando(null)
    },
    onError: () => toast.error('No se pudo eliminar'),
  })

  const hilos = data?.groups ?? []

  return (
    <div className="min-h-full bg-[#EDE9F8] pb-24">
      {/* Header */}
      <div className="px-5 pt-6 pb-5 flex items-end justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[.15em] text-[#5A4A7A]">{hilos.length} hilos</p>
          <h1 className="text-xl font-black tracking-tight text-[#2D2440] mt-0.5">Hilos</h1>
        </div>
        <button
          onClick={() => setCrearOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#2D2440] text-[#F0C030] text-[10px] font-black tracking-widest uppercase active:scale-95 transition-transform"
        >
          <Plus size={14} />
          Nuevo
        </button>
      </div>

      {/* Lista */}
      {isLoading ? (
        <Skeleton />
      ) : hilos.length === 0 ? (
        <div className="px-4 pt-12 text-center space-y-3">
          <Layers2 size={32} className="mx-auto text-[#DDD5EE]" />
          <p className="text-sm font-bold uppercase tracking-widest text-[#5A4A7A]">Sin hilos</p>
          <p className="text-[10px] text-[#B0A8CC]">Crea tu primer hilo para empezar a organizar preguntas.</p>
        </div>
      ) : (
        <div className="px-4 space-y-3">
          {hilos.map(hilo => (
            <div key={hilo.id} className="bg-white rounded-2xl border border-[#DDD5EE] overflow-hidden">
              <button
                onClick={() => navigate(`/host/hilos/${hilo.id}`)}
                className="w-full flex items-center gap-3 px-4 py-4 text-left"
              >
                <div className="w-9 h-9 rounded-xl bg-[#EDE9F8] flex items-center justify-center shrink-0">
                  <Layers2 size={16} className="text-[#2D2440]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-[#2D2440] truncate">{hilo.name}</p>
                  <p className="text-[9px] text-[#B0A8CC] font-bold uppercase tracking-widest mt-0.5">
                    {hilo.users?.length ?? 0} usuario{(hilo.users?.length ?? 0) !== 1 ? 's' : ''}
                    {' · '}
                    {hilo.questions?.length ?? 0} pregunta{(hilo.questions?.length ?? 0) !== 1 ? 's' : ''}
                  </p>
                </div>
                <ChevronRight size={16} className="text-[#B0A8CC] shrink-0" />
              </button>

              {/* Acción eliminar */}
              <div className="border-t border-[#DDD5EE]/60 px-4 py-2 flex justify-end">
                <button
                  onClick={() => setEliminando(hilo.id)}
                  className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-[#E8503A]/60 hover:text-[#E8503A] transition-colors"
                >
                  <Trash2 size={11} />
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialog: Crear hilo */}
      <Dialog.Root open={crearOpen} onOpenChange={setCrearOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
          <Dialog.Content className="fixed inset-x-4 top-[20%] z-50 rounded-[28px] border-2 border-[#C8BEE0] bg-[#EDE9F8] p-6 max-w-sm mx-auto focus:outline-none">
            <div className="flex items-center justify-between mb-5">
              <Dialog.Title className="text-[11px] font-black uppercase tracking-[.2em] text-[#2D2440]">
                Nuevo Hilo
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="w-7 h-7 flex items-center justify-center rounded-full bg-white/50 text-[#8878AA]">
                  <X size={14} />
                </button>
              </Dialog.Close>
            </div>
            <input
              value={nuevoNombre}
              onChange={e => setNuevoNombre(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && nuevoNombre.trim() && createMutation.mutate(nuevoNombre.trim())}
              placeholder="Nombre del hilo…"
              autoFocus
              className="w-full bg-white border-2 border-[#DDD5EE] rounded-2xl px-4 py-3 text-sm text-[#2D2440] placeholder:text-[#B0A8CC] focus:outline-none focus:border-[#F0C030] transition-colors"
            />
            <button
              onClick={() => nuevoNombre.trim() && createMutation.mutate(nuevoNombre.trim())}
              disabled={!nuevoNombre.trim() || createMutation.isPending}
              className="mt-4 w-full py-3.5 rounded-2xl bg-[#F0C030] text-[#2D2440] font-black text-[10px] tracking-widest uppercase disabled:opacity-40 active:scale-95 transition-all"
            >
              {createMutation.isPending ? 'Creando…' : 'Crear hilo'}
            </button>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Dialog: Confirmar eliminar */}
      <Dialog.Root open={!!eliminando} onOpenChange={o => !o && setEliminando(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
          <Dialog.Content className="fixed inset-x-4 top-[25%] z-50 rounded-[28px] border-2 border-[#E8503A]/30 bg-[#EDE9F8] p-6 max-w-sm mx-auto focus:outline-none">
            <Dialog.Title className="text-[11px] font-black uppercase tracking-[.2em] text-[#E8503A] mb-3">
              Eliminar hilo
            </Dialog.Title>
            <p className="text-xs text-[#5A4A7A] mb-1">Esta acción no se puede deshacer.</p>
            <p className="text-[10px] text-[#B0A8CC] mb-5">Se eliminarán todas las preguntas asociadas a este hilo.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setEliminando(null)}
                className="flex-1 py-3 rounded-2xl border-2 border-[#DDD5EE] text-[10px] font-bold uppercase tracking-widest text-[#5A4A7A]"
              >
                Cancelar
              </button>
              <button
                onClick={() => eliminando && deleteMutation.mutate(eliminando)}
                disabled={deleteMutation.isPending}
                className="flex-1 py-3 rounded-2xl bg-[#E8503A] text-white text-[10px] font-black uppercase tracking-widest disabled:opacity-40"
              >
                {deleteMutation.isPending ? 'Eliminando…' : 'Sí, eliminar'}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}
