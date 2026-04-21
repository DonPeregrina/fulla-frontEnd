import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as Dialog from '@radix-ui/react-dialog'
import { toast } from 'sonner'
import {
  ArrowLeft, X, ChevronLeft, ChevronRight as ChevronRightIcon,
  LayoutGrid, UserMinus, UserPlus
} from 'lucide-react'
import {
  startOfMonth, endOfMonth, eachDayOfInterval,
  format, addMonths, subMonths, isSameDay
} from 'date-fns'
import { es } from 'date-fns/locale'
import { usersApi, hilosApi, bitacorasApi, getNudoNombre } from '@/services/api'
import { nudoColor } from '@/types'
import { dateToISO, formatDate } from '@/lib/utils'
import type { Bitacora } from '@/types'

// ─── Calendario de bitácoras ──────────────────────────────────────────────────

function CalendarioBitacoras({
  userId,
  bitacoras,
}: {
  userId: string
  bitacoras: Bitacora[]
}) {
  const [mes, setMes] = useState(new Date())
  const [diaSeleccionado, setDiaSeleccionado] = useState<Date | null>(null)

  const diasConReg = new Set(bitacoras.map(b => dateToISO(b.date)))

  const dias = eachDayOfInterval({ start: startOfMonth(mes), end: endOfMonth(mes) })
  const primerDia = dias[0].getDay() // 0=Dom

  const bitacoraDelDia = diaSeleccionado
    ? bitacoras.find(b => dateToISO(b.date) === format(diaSeleccionado, 'yyyy-MM-dd'))
    : null

  return (
    <div className="space-y-3">
      {/* Navegación de mes */}
      <div className="flex items-center justify-between">
        <button onClick={() => setMes(m => subMonths(m, 1))} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-[#DDD5EE] transition-colors">
          <ChevronLeft size={16} className="text-[#5A4A7A]" />
        </button>
        <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#2D2440]">
          {format(mes, 'MMMM yyyy', { locale: es })}
        </p>
        <button onClick={() => setMes(m => addMonths(m, 1))} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-[#DDD5EE] transition-colors">
          <ChevronRightIcon size={16} className="text-[#5A4A7A]" />
        </button>
      </div>

      {/* Cabecera días */}
      <div className="grid grid-cols-7 text-center">
        {['D','L','M','M','J','V','S'].map((d, i) => (
          <div key={i} className="text-[8px] font-bold text-[#B0A8CC] py-1">{d}</div>
        ))}

        {/* Espaciado primer día */}
        {Array.from({ length: primerDia }).map((_, i) => <div key={`e${i}`} />)}

        {dias.map(dia => {
          const iso = format(dia, 'yyyy-MM-dd')
          const tieneReg = diasConReg.has(iso)
          const seleccionado = diaSeleccionado && isSameDay(dia, diaSeleccionado)

          return (
            <button
              key={iso}
              onClick={() => setDiaSeleccionado(seleccionado ? null : dia)}
              className={`relative flex aspect-square items-center justify-center rounded-xl text-[11px] font-bold transition-all ${
                seleccionado
                  ? 'bg-[#2D2440] text-white shadow-[2px_2px_0px_#F0C030]'
                  : tieneReg
                    ? 'hover:bg-[#DDD5EE] text-[#2D2440]'
                    : 'text-[#C4BAD8] cursor-default'
              }`}
              disabled={!tieneReg && !seleccionado}
            >
              {format(dia, 'd')}
              {tieneReg && !seleccionado && (
                <div className="absolute bottom-1 h-1 w-1 rounded-full bg-[#F0C030]" />
              )}
            </button>
          )
        })}
      </div>

      {/* Respuestas del día seleccionado */}
      {bitacoraDelDia && (
        <div className="mt-2 space-y-2 border-t border-[#DDD5EE] pt-3">
          <p className="text-[9px] font-bold uppercase tracking-widest text-[#B0A8CC]">
            {formatDate(diaSeleccionado!, "EEEE d 'de' MMMM")} — {bitacoraDelDia.answers.length} respuestas
          </p>
          {bitacoraDelDia.answers.map(r => {
            const color = nudoColor(r.question?.categoryId ?? '0')
            return (
              <div key={r.id} className="bg-white rounded-xl border border-[#DDD5EE] px-3 py-2.5 space-y-1">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                  <span className="text-[8px] font-bold uppercase tracking-widest" style={{ color }}>
                    {getNudoNombre(r.question?.categoryId ?? '')}
                  </span>
                </div>
                <p className="text-[10px] text-[#B0A8CC] leading-snug">{r.question?.body}</p>
                <p className="text-sm font-bold text-[#2D2440]">{r.body}</p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── UsuarioDetail ────────────────────────────────────────────────────────────

export default function UsuarioDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [agregarHiloOpen, setAgregarHiloOpen] = useState(false)
  const [removiendoHilo, setRemoviendoHilo] = useState<string | null>(null)

  const { data: userData, isLoading } = useQuery({
    queryKey: ['user', id],
    queryFn: () => usersApi.get(id!),
    enabled: !!id,
  })

  const { data: hilosData } = useQuery({
    queryKey: ['hilos'],
    queryFn: () => hilosApi.list(),
  })

  const { data: bitacorasData } = useQuery({
    queryKey: ['bitacoras-user', id],
    queryFn: () => bitacorasApi.list(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  })

  const addHiloMutation = useMutation({
    mutationFn: (groupId: string) => hilosApi.addUser(id!, groupId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user', id] })
      qc.invalidateQueries({ queryKey: ['hilos'] })
      toast.success('Usuario agregado al hilo')
      setAgregarHiloOpen(false)
    },
    onError: () => toast.error('No se pudo agregar'),
  })

  const removeHiloMutation = useMutation({
    mutationFn: (groupId: string) => hilosApi.removeUser(id!, groupId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user', id] })
      qc.invalidateQueries({ queryKey: ['hilos'] })
      toast.success('Usuario removido del hilo')
      setRemoviendoHilo(null)
    },
    onError: () => toast.error('No se pudo remover'),
  })

  const usuario = userData?.user
  const todosHilos = hilosData?.groups ?? []
  const bitacoras = bitacorasData?.collections ?? []

  // Hilos del usuario: aquellos donde aparece como miembro
  const hilosDelUsuario = todosHilos.filter(h =>
    h.users?.some(u => u.id === id)
  )
  const hilosDisponibles = todosHilos.filter(h =>
    !h.users?.some(u => u.id === id)
  )

  const initials = usuario ? (usuario.username ?? '?').slice(0, 2).toUpperCase() : '?'

  return (
    <div className="min-h-full bg-[#EDE9F8] pb-24">
      {/* Header */}
      <div className="px-4 pt-6 pb-4 flex items-center gap-3">
        <button
          onClick={() => navigate('/host/usuarios')}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-[#DDD5EE] shrink-0"
        >
          <ArrowLeft size={16} className="text-[#2D2440]" />
        </button>
        <div className="flex-1 min-w-0">
          {isLoading
            ? <div className="h-5 w-32 bg-[#DDD5EE] rounded-full animate-pulse" />
            : <h1 className="text-lg font-black text-[#2D2440] truncate">{usuario?.name ?? usuario?.username}</h1>
          }
          <p className="text-[9px] text-[#B0A8CC] uppercase tracking-widest font-bold">Perfil del participante</p>
        </div>
      </div>

      <div className="px-4 space-y-4">
        {/* Card de info */}
        {!isLoading && usuario && (
          <div className="bg-white rounded-2xl border border-[#DDD5EE] overflow-hidden">
            <div className="h-14 bg-[#2D2440]" />
            <div className="px-4 pb-4 -mt-7 flex items-end gap-3">
              <div className="w-14 h-14 rounded-xl bg-[#EDE9F8] border-4 border-white flex items-center justify-center shadow-md shrink-0">
                <span className="text-lg font-black text-[#2D2440]">{initials}</span>
              </div>
              <div className="pb-1">
                <p className="text-sm font-black text-[#2D2440]">{usuario.name ?? usuario.username}</p>
                <p className="text-[9px] text-[#B0A8CC] font-bold">@{usuario.username}</p>
              </div>
            </div>
            <div className="border-t border-[#DDD5EE] px-4 py-3">
              <p className="text-[9px] text-[#B0A8CC] uppercase tracking-widest">Email</p>
              <p className="text-xs font-bold text-[#2D2440]">{usuario.email}</p>
            </div>
          </div>
        )}

        {/* Hilos del usuario */}
        <div className="bg-white rounded-2xl border border-[#DDD5EE] overflow-hidden">
          <div className="px-4 py-3 flex items-center justify-between border-b border-[#DDD5EE]">
            <div className="flex items-center gap-2">
              <LayoutGrid size={13} className="text-[#8878AA]" />
              <p className="text-[9px] font-bold uppercase tracking-widest text-[#8878AA]">
                Hilos ({hilosDelUsuario.length})
              </p>
            </div>
            <button
              onClick={() => setAgregarHiloOpen(true)}
              className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-[#2D2440] hover:text-[#F0C030] transition-colors"
            >
              <UserPlus size={12} />
              Agregar
            </button>
          </div>

          {hilosDelUsuario.length === 0 ? (
            <div className="px-4 py-4 text-center">
              <p className="text-[10px] text-[#B0A8CC]">Sin hilos asignados</p>
            </div>
          ) : (
            <div className="divide-y divide-[#DDD5EE]/60">
              {hilosDelUsuario.map(h => (
                <div key={h.id} className="px-4 py-3 flex items-center justify-between gap-3">
                  <p className="text-xs font-bold text-[#2D2440]">{h.name}</p>
                  <button
                    onClick={() => setRemoviendoHilo(h.id)}
                    className="text-[#E8503A]/40 hover:text-[#E8503A] transition-colors shrink-0"
                  >
                    <UserMinus size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Calendario de bitácoras */}
        <div className="bg-white rounded-2xl border border-[#DDD5EE] px-4 py-4">
          <div className="flex items-center gap-2 mb-4">
            <p className="text-[9px] font-bold uppercase tracking-widest text-[#8878AA]">
              Bitácoras ({bitacoras.length})
            </p>
          </div>
          {bitacoras.length === 0 ? (
            <p className="text-center text-[10px] text-[#B0A8CC] py-4">Sin registros aún</p>
          ) : (
            <CalendarioBitacoras userId={id!} bitacoras={bitacoras} />
          )}
        </div>
      </div>

      {/* Dialog: Agregar a hilo */}
      <Dialog.Root open={agregarHiloOpen} onOpenChange={setAgregarHiloOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
          <Dialog.Content className="fixed inset-x-4 top-[15%] z-50 rounded-[28px] border-2 border-[#C8BEE0] bg-[#EDE9F8] p-6 max-w-sm mx-auto focus:outline-none" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
            <div className="flex items-center justify-between mb-5">
              <Dialog.Title className="text-[11px] font-black uppercase tracking-[.2em] text-[#2D2440]">
                Agregar a hilo
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="w-7 h-7 flex items-center justify-center rounded-full bg-white/50 text-[#8878AA]">
                  <X size={14} />
                </button>
              </Dialog.Close>
            </div>
            {hilosDisponibles.length === 0 ? (
              <p className="text-center text-[10px] text-[#B0A8CC] py-4">
                Este usuario ya pertenece a todos los hilos.
              </p>
            ) : (
              <div className="space-y-2">
                {hilosDisponibles.map(h => (
                  <button
                    key={h.id}
                    onClick={() => addHiloMutation.mutate(h.id)}
                    disabled={addHiloMutation.isPending}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-white border border-[#DDD5EE] text-left hover:border-[#F0C030] transition-colors disabled:opacity-50"
                  >
                    <p className="text-xs font-black text-[#2D2440]">{h.name}</p>
                    <span className="ml-auto text-[9px] text-[#B0A8CC]">{h.questions?.length ?? 0} preguntas</span>
                  </button>
                ))}
              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Dialog: Confirmar quitar de hilo */}
      <Dialog.Root open={!!removiendoHilo} onOpenChange={o => !o && setRemoviendoHilo(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
          <Dialog.Content className="fixed inset-x-4 top-[25%] z-50 rounded-[28px] border-2 border-[#E8503A]/30 bg-[#EDE9F8] p-6 max-w-sm mx-auto focus:outline-none">
            <Dialog.Title className="text-[11px] font-black uppercase tracking-[.2em] text-[#E8503A] mb-3">
              Quitar del hilo
            </Dialog.Title>
            <p className="text-xs text-[#5A4A7A] mb-5">
              ¿Quieres quitar a este usuario del hilo? Ya no recibirá sus preguntas.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setRemoviendoHilo(null)} className="flex-1 py-3 rounded-2xl border-2 border-[#DDD5EE] text-[10px] font-bold uppercase tracking-widest text-[#5A4A7A]">
                Cancelar
              </button>
              <button
                onClick={() => removiendoHilo && removeHiloMutation.mutate(removiendoHilo)}
                disabled={removeHiloMutation.isPending}
                className="flex-1 py-3 rounded-2xl bg-[#E8503A] text-white text-[10px] font-black uppercase tracking-widest disabled:opacity-40"
              >
                {removeHiloMutation.isPending ? 'Quitando…' : 'Quitar'}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}
