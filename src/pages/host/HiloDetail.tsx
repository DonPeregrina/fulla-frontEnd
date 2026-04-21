import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as Dialog from '@radix-ui/react-dialog'
import { toast } from 'sonner'
import { ArrowLeft, X, Trash2, UserPlus, UserMinus, Plus } from 'lucide-react'
import { hilosApi, preguntasApi, invitacionesApi, usersApi, getNudoNombre, NUDOS_HARDCODED } from '@/services/api'
import { nudoColor } from '@/types'
import type { Pregunta } from '@/types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="px-4 space-y-3 pt-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-white rounded-2xl border border-[#DDD5EE] p-4 animate-pulse space-y-2">
          <div className="h-4 w-40 bg-[#DDD5EE] rounded-full" />
          <div className="h-3 w-24 bg-[#DDD5EE] rounded-full" />
        </div>
      ))}
    </div>
  )
}

// ─── Tab Preguntas ────────────────────────────────────────────────────────────

function TabPreguntas({ hiloId, preguntas }: { hiloId: string; preguntas: Pregunta[] }) {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [body, setBody] = useState('')
  const [categoryId, setCategoryId] = useState(NUDOS_HARDCODED[0].id)
  const [eliminando, setEliminando] = useState<string | null>(null)

  const createMutation = useMutation({
    mutationFn: () => preguntasApi.create(body.trim(), hiloId, categoryId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hilo', hiloId] })
      qc.invalidateQueries({ queryKey: ['hilos'] })
      toast.success('Pregunta agregada')
      setBody(''); setOpen(false)
    },
    onError: () => toast.error('No se pudo crear'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => preguntasApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hilo', hiloId] })
      qc.invalidateQueries({ queryKey: ['hilos'] })
      toast.success('Pregunta eliminada')
      setEliminando(null)
    },
    onError: () => toast.error('No se pudo eliminar'),
  })

  return (
    <div className="space-y-3">
      {/* Botón agregar */}
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-[#DDD5EE] text-[10px] font-bold uppercase tracking-widest text-[#B0A8CC] hover:border-[#F0C030] hover:text-[#F0C030] transition-colors"
      >
        <Plus size={13} />
        Agregar pregunta
      </button>

      {preguntas.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-[10px] text-[#B0A8CC] uppercase tracking-widest">Sin preguntas en este hilo</p>
        </div>
      ) : (
        preguntas.map(p => {
          const color = nudoColor(p.categoryId)
          return (
            <div key={p.id} className="bg-white rounded-2xl border border-[#DDD5EE] px-4 py-3 space-y-2">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                <span className="text-[8px] font-bold uppercase tracking-widest" style={{ color }}>
                  {getNudoNombre(p.categoryId)}
                </span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs font-bold text-[#2D2440] leading-snug flex-1">{p.body}</p>
                <button
                  onClick={() => setEliminando(p.id)}
                  className="shrink-0 text-[#E8503A]/40 hover:text-[#E8503A] transition-colors"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          )
        })
      )}

      {/* Dialog: Nueva pregunta */}
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
          <Dialog.Content className="fixed inset-x-4 top-[10%] z-50 rounded-[28px] border-2 border-[#C8BEE0] bg-[#EDE9F8] p-6 max-w-sm mx-auto focus:outline-none">
            <div className="flex items-center justify-between mb-5">
              <Dialog.Title className="text-[11px] font-black uppercase tracking-[.2em] text-[#2D2440]">
                Nueva Pregunta
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="w-7 h-7 flex items-center justify-center rounded-full bg-white/50 text-[#8878AA]">
                  <X size={14} />
                </button>
              </Dialog.Close>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[9px] font-bold uppercase tracking-widest text-[#5A4A7A] block mb-1.5">Pregunta</label>
                <textarea
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  placeholder="¿Qué quieres preguntarle al usuario?"
                  rows={3}
                  className="w-full bg-white border-2 border-[#DDD5EE] rounded-2xl px-4 py-3 text-sm text-[#2D2440] placeholder:text-[#B0A8CC] focus:outline-none focus:border-[#F0C030] transition-colors resize-none"
                />
              </div>

              <div>
                <label className="text-[9px] font-bold uppercase tracking-widest text-[#5A4A7A] block mb-1.5">Nudo (momento del día)</label>
                <div className="flex flex-wrap gap-2">
                  {NUDOS_HARDCODED.map((n, i) => {
                    const color = nudoColor(n.id, i)
                    const selected = categoryId === n.id
                    return (
                      <button
                        key={n.id}
                        onClick={() => setCategoryId(n.id)}
                        className="px-3 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-wider border-2 transition-all"
                        style={{
                          borderColor: color,
                          backgroundColor: selected ? color : 'white',
                          color: selected ? 'white' : color,
                        }}
                      >
                        {n.name}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            <button
              onClick={() => createMutation.mutate()}
              disabled={!body.trim() || createMutation.isPending}
              className="mt-5 w-full py-3.5 rounded-2xl bg-[#F0C030] text-[#2D2440] font-black text-[10px] tracking-widest uppercase disabled:opacity-40 active:scale-95 transition-all"
            >
              {createMutation.isPending ? 'Guardando…' : 'Agregar pregunta'}
            </button>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Dialog: Confirmar eliminar pregunta */}
      <Dialog.Root open={!!eliminando} onOpenChange={o => !o && setEliminando(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
          <Dialog.Content className="fixed inset-x-4 top-[25%] z-50 rounded-[28px] border-2 border-[#E8503A]/30 bg-[#EDE9F8] p-6 max-w-sm mx-auto focus:outline-none">
            <Dialog.Title className="text-[11px] font-black uppercase tracking-[.2em] text-[#E8503A] mb-3">
              Eliminar pregunta
            </Dialog.Title>
            <p className="text-xs text-[#5A4A7A] mb-5">¿Seguro que quieres eliminar esta pregunta? No se puede deshacer.</p>
            <div className="flex gap-3">
              <button onClick={() => setEliminando(null)} className="flex-1 py-3 rounded-2xl border-2 border-[#DDD5EE] text-[10px] font-bold uppercase tracking-widest text-[#5A4A7A]">
                Cancelar
              </button>
              <button
                onClick={() => eliminando && deleteMutation.mutate(eliminando)}
                disabled={deleteMutation.isPending}
                className="flex-1 py-3 rounded-2xl bg-[#E8503A] text-white text-[10px] font-black uppercase tracking-widest disabled:opacity-40"
              >
                {deleteMutation.isPending ? 'Eliminando…' : 'Eliminar'}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}

// ─── Tab Usuarios ─────────────────────────────────────────────────────────────

function TabUsuarios({ hiloId, usuarios }: { hiloId: string; usuarios: { id: string; username: string; name?: string }[] }) {
  const qc = useQueryClient()
  const [inviteOpen, setInviteOpen] = useState(false)
  const [agregarOpen, setAgregarOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [removiendo, setRemoviendo] = useState<string | null>(null)

  const { data: todosUsersData } = useQuery({
    queryKey: ['users-all'],
    queryFn: () => usersApi.list(),
    enabled: agregarOpen,
  })

  const { data: invitesData } = useQuery({
    queryKey: ['invitaciones'],
    queryFn: () => invitacionesApi.listMine(),
    staleTime: 1000 * 60 * 2,
  })

  const invitesDelHilo = (invitesData?.invites ?? []).filter(i => i.groupId === hiloId)

  const inviteMutation = useMutation({
    mutationFn: () => invitacionesApi.send(email.trim(), hiloId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invitaciones'] })
      toast.success('Invitación enviada')
      setEmail(''); setInviteOpen(false)
    },
    onError: () => toast.error('No se pudo enviar'),
  })

  const addMutation = useMutation({
    mutationFn: (userId: string) => hilosApi.addUser(userId, hiloId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hilo', hiloId] })
      toast.success('Usuario agregado al hilo')
      setAgregarOpen(false)
    },
    onError: () => toast.error('No se pudo agregar'),
  })

  const removeMutation = useMutation({
    mutationFn: (userId: string) => hilosApi.removeUser(userId, hiloId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hilo', hiloId] })
      toast.success('Usuario removido del hilo')
      setRemoviendo(null)
    },
    onError: () => toast.error('No se pudo remover'),
  })

  const cancelInviteMutation = useMutation({
    mutationFn: (id: string) => invitacionesApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invitaciones'] })
      toast.success('Invitación cancelada')
    },
    onError: () => toast.error('No se pudo cancelar'),
  })

  const todosUsers = todosUsersData?.users ?? []
  const usuariosEnHilo = new Set(usuarios.map(u => u.id))
  const usuariosDisponibles = todosUsers.filter(u => !usuariosEnHilo.has(u.id))

  return (
    <div className="space-y-3">
      {/* Botones de acción */}
      <div className="flex gap-2">
        <button
          onClick={() => setInviteOpen(true)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#2D2440] text-[#F0C030] text-[9px] font-black tracking-widest uppercase active:scale-95 transition-transform"
        >
          <UserPlus size={13} />
          Invitar
        </button>
        <button
          onClick={() => setAgregarOpen(true)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border-2 border-[#2D2440] text-[#2D2440] text-[9px] font-black tracking-widest uppercase active:scale-95 transition-transform"
        >
          <Plus size={13} />
          Agregar
        </button>
      </div>

      {/* Lista de usuarios */}
      {usuarios.length === 0 && invitesDelHilo.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-[10px] text-[#B0A8CC] uppercase tracking-widest">Sin usuarios en este hilo</p>
        </div>
      ) : (
        <>
          {usuarios.map(u => (
            <div key={u.id} className="bg-white rounded-2xl border border-[#DDD5EE] px-4 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#EDE9F8] flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-black text-[#2D2440]">
                    {(u.username ?? '?').slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-black text-[#2D2440]">{u.name ?? u.username}</p>
                  <p className="text-[9px] text-[#B0A8CC]">@{u.username}</p>
                </div>
              </div>
              <button onClick={() => setRemoviendo(u.id)} className="text-[#E8503A]/40 hover:text-[#E8503A] transition-colors">
                <UserMinus size={14} />
              </button>
            </div>
          ))}

          {invitesDelHilo.map(inv => (
            <div key={inv.id} className="bg-white rounded-2xl border border-dashed border-[#DDD5EE] px-4 py-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-[#5A4A7A]">{inv.email}</p>
                <span className="text-[8px] font-bold uppercase tracking-wider text-[#B0A8CC]">Invitación pendiente</span>
              </div>
              <button
                onClick={() => cancelInviteMutation.mutate(inv.id)}
                disabled={cancelInviteMutation.isPending}
                className="text-[#E8503A]/40 hover:text-[#E8503A] transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </>
      )}

      {/* Dialog: Invitar por email */}
      <Dialog.Root open={inviteOpen} onOpenChange={setInviteOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
          <Dialog.Content className="fixed inset-x-4 top-[20%] z-50 rounded-[28px] border-2 border-[#C8BEE0] bg-[#EDE9F8] p-6 max-w-sm mx-auto focus:outline-none">
            <div className="flex items-center justify-between mb-5">
              <Dialog.Title className="text-[11px] font-black uppercase tracking-[.2em] text-[#2D2440]">Invitar usuario</Dialog.Title>
              <Dialog.Close asChild>
                <button className="w-7 h-7 flex items-center justify-center rounded-full bg-white/50 text-[#8878AA]">
                  <X size={14} />
                </button>
              </Dialog.Close>
            </div>
            <input
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="email@ejemplo.com"
              type="email"
              autoFocus
              className="w-full bg-white border-2 border-[#DDD5EE] rounded-2xl px-4 py-3 text-sm text-[#2D2440] placeholder:text-[#B0A8CC] focus:outline-none focus:border-[#F0C030] transition-colors"
            />
            <button
              onClick={() => inviteMutation.mutate()}
              disabled={!email.trim() || inviteMutation.isPending}
              className="mt-4 w-full py-3.5 rounded-2xl bg-[#F0C030] text-[#2D2440] font-black text-[10px] tracking-widest uppercase disabled:opacity-40"
            >
              {inviteMutation.isPending ? 'Enviando…' : 'Enviar invitación'}
            </button>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Dialog: Agregar usuario existente */}
      <Dialog.Root open={agregarOpen} onOpenChange={setAgregarOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
          <Dialog.Content className="fixed inset-x-4 top-[10%] z-50 rounded-[28px] border-2 border-[#C8BEE0] bg-[#EDE9F8] p-6 max-w-sm mx-auto focus:outline-none" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            <div className="flex items-center justify-between mb-5">
              <Dialog.Title className="text-[11px] font-black uppercase tracking-[.2em] text-[#2D2440]">Agregar al hilo</Dialog.Title>
              <Dialog.Close asChild>
                <button className="w-7 h-7 flex items-center justify-center rounded-full bg-white/50 text-[#8878AA]">
                  <X size={14} />
                </button>
              </Dialog.Close>
            </div>
            {usuariosDisponibles.length === 0 ? (
              <p className="text-center text-[10px] text-[#B0A8CC] py-4">Todos tus usuarios ya están en este hilo.</p>
            ) : (
              <div className="space-y-2">
                {usuariosDisponibles.map(u => (
                  <button
                    key={u.id}
                    onClick={() => addMutation.mutate(u.id)}
                    disabled={addMutation.isPending}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-white border border-[#DDD5EE] text-left hover:border-[#F0C030] transition-colors disabled:opacity-50"
                  >
                    <div className="w-8 h-8 rounded-xl bg-[#EDE9F8] flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-black text-[#2D2440]">{u.username.slice(0, 2).toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="text-xs font-black text-[#2D2440]">{u.name ?? u.username}</p>
                      <p className="text-[9px] text-[#B0A8CC]">@{u.username}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Dialog: Confirmar remover usuario */}
      <Dialog.Root open={!!removiendo} onOpenChange={o => !o && setRemoviendo(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
          <Dialog.Content className="fixed inset-x-4 top-[25%] z-50 rounded-[28px] border-2 border-[#E8503A]/30 bg-[#EDE9F8] p-6 max-w-sm mx-auto focus:outline-none">
            <Dialog.Title className="text-[11px] font-black uppercase tracking-[.2em] text-[#E8503A] mb-3">Sacar del hilo</Dialog.Title>
            <p className="text-xs text-[#5A4A7A] mb-5">¿Quieres remover a este usuario del hilo?</p>
            <div className="flex gap-3">
              <button onClick={() => setRemoviendo(null)} className="flex-1 py-3 rounded-2xl border-2 border-[#DDD5EE] text-[10px] font-bold uppercase tracking-widest text-[#5A4A7A]">
                Cancelar
              </button>
              <button
                onClick={() => removiendo && removeMutation.mutate(removiendo)}
                disabled={removeMutation.isPending}
                className="flex-1 py-3 rounded-2xl bg-[#E8503A] text-white text-[10px] font-black uppercase tracking-widest disabled:opacity-40"
              >
                {removeMutation.isPending ? 'Removiendo…' : 'Sacar'}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}

// ─── HiloDetail ───────────────────────────────────────────────────────────────

export default function HiloDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [tab, setTab] = useState<'usuarios' | 'preguntas'>('usuarios')

  const { data, isLoading } = useQuery({
    queryKey: ['hilo', id],
    queryFn: () => hilosApi.get(id!),
    enabled: !!id,
  })

  const hilo = data?.group

  return (
    <div className="min-h-full bg-[#EDE9F8] pb-24">
      {/* Header */}
      <div className="px-4 pt-6 pb-4 flex items-center gap-3">
        <button
          onClick={() => navigate('/host/hilos')}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-[#DDD5EE] shrink-0"
        >
          <ArrowLeft size={16} className="text-[#2D2440]" />
        </button>
        <div className="flex-1 min-w-0">
          {isLoading
            ? <div className="h-5 w-32 bg-[#DDD5EE] rounded-full animate-pulse" />
            : <h1 className="text-lg font-black text-[#2D2440] tracking-tight truncate">{hilo?.name}</h1>
          }
          <p className="text-[9px] text-[#B0A8CC] uppercase tracking-widest font-bold">Detalle del hilo</p>
        </div>
      </div>

      {/* Tabs internos */}
      <div className="px-4 mb-4">
        <div className="flex bg-white rounded-2xl border border-[#DDD5EE] p-1 gap-1">
          {(['usuarios', 'preguntas'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                tab === t
                  ? 'bg-[#2D2440] text-[#F0C030]'
                  : 'text-[#B0A8CC] hover:text-[#5A4A7A]'
              }`}
            >
              {t === 'usuarios'
                ? `Usuarios (${hilo?.users?.length ?? 0})`
                : `Preguntas (${hilo?.questions?.length ?? 0})`
              }
            </button>
          ))}
        </div>
      </div>

      {/* Contenido del tab */}
      <div className="px-4">
        {isLoading ? (
          <Skeleton />
        ) : tab === 'usuarios' ? (
          <TabUsuarios hiloId={id!} usuarios={hilo?.users ?? []} />
        ) : (
          <TabPreguntas hiloId={id!} preguntas={hilo?.questions ?? []} />
        )}
      </div>
    </div>
  )
}
