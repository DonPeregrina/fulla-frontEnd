import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as Dialog from '@radix-ui/react-dialog'
import { toast } from 'sonner'
import { ArrowLeft, X, Trash2, UserPlus, UserMinus, Plus, Pencil, ArrowRightLeft, Image as ImageIcon, RotateCcw, Sparkles } from 'lucide-react'
import { hilosApi, preguntasApi, invitacionesApi, usersApi, getNudoNombre, NUDOS_HARDCODED } from '@/services/api'
import { nudoColor } from '@/types'
import type { Hilo, Pregunta } from '@/types'

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
  const [editandoP, setEditandoP] = useState<Pregunta | null>(null) // null = crear, Pregunta = editar
  const [body, setBody] = useState('')
  const [categoryId, setCategoryId] = useState(NUDOS_HARDCODED[0].id)
  const [eliminando, setEliminando] = useState<string | null>(null)
  const [moviendo, setMoviendo] = useState<Pregunta | null>(null)
  const [destinoId, setDestinoId] = useState('')

  const { data: hilosData } = useQuery({ queryKey: ['hilos'], queryFn: () => hilosApi.list() })
  const otrosHilos = (hilosData?.groups ?? []).filter(h => h.id !== hiloId)

  function abrirMover(p: Pregunta) {
    setMoviendo(p); setDestinoId('')
  }

  function abrirCrear() {
    setEditandoP(null); setBody(''); setCategoryId(NUDOS_HARDCODED[0].id); setOpen(true)
  }
  function abrirEditar(p: Pregunta) {
    setEditandoP(p); setBody(p.body); setCategoryId(p.categoryId); setOpen(true)
  }

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['hilo', hiloId] })
    qc.invalidateQueries({ queryKey: ['hilos'] })
  }

  const createMutation = useMutation({
    mutationFn: () => preguntasApi.create(body.trim(), hiloId, categoryId),
    onSuccess: () => { invalidate(); toast.success('Pregunta agregada'); setOpen(false) },
    onError: () => toast.error('No se pudo crear'),
  })

  const updateMutation = useMutation({
    mutationFn: () => preguntasApi.update(editandoP!.id, body.trim(), editandoP!.groupId, categoryId),
    onSuccess: () => { invalidate(); toast.success('Pregunta actualizada'); setOpen(false) },
    onError: () => toast.error('No se pudo actualizar'),
  })

  const moveMutation = useMutation({
    mutationFn: () => preguntasApi.update(moviendo!.id, moviendo!.body, destinoId, moviendo!.categoryId),
    onSuccess: () => {
      const nombre = otrosHilos.find(h => h.id === destinoId)?.name ?? 'el hilo nuevo'
      invalidate()
      qc.invalidateQueries({ queryKey: ['hilo', destinoId] })
      toast.success(`Pregunta movida a ${nombre}`)
      setMoviendo(null)
    },
    onError: () => toast.error('No se pudo mover la pregunta'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => preguntasApi.remove(id),
    onSuccess: () => { invalidate(); toast.success('Pregunta eliminada'); setEliminando(null) },
    onError: () => toast.error('No se pudo eliminar'),
  })

  const isSaving = createMutation.isPending || updateMutation.isPending

  return (
    <div className="space-y-3">
      {/* Botón agregar */}
      <button
        onClick={abrirCrear}
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
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => abrirMover(p)} title="Cambiar de hilo" aria-label="Cambiar de hilo" className="text-[#B0A8CC] hover:text-[#2D2440] transition-colors">
                    <ArrowRightLeft size={13} />
                  </button>
                  <button onClick={() => abrirEditar(p)} className="text-[#B0A8CC] hover:text-[#2D2440] transition-colors">
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => setEliminando(p.id)} className="text-[#E8503A]/40 hover:text-[#E8503A] transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
              {p.answerCount != null && (
                <p className="text-[9px] font-bold uppercase tracking-widest text-[#8878AA]">
                  {p.answerCount} respuesta{p.answerCount !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          )
        })
      )}

      {/* Dialog: Crear / Editar pregunta */}
      <Dialog.Root open={open} onOpenChange={o => { if (!o) setOpen(false) }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
          <Dialog.Content className="fixed inset-x-4 top-[10%] z-50 rounded-[28px] border-2 border-[#C8BEE0] bg-[#EDE9F8] p-6 max-w-sm mx-auto focus:outline-none">
            <div className="flex items-center justify-between mb-5">
              <Dialog.Title className="text-[11px] font-black uppercase tracking-[.2em] text-[#2D2440]">
                {editandoP ? 'Editar Pregunta' : 'Nueva Pregunta'}
              </Dialog.Title>
              <button onClick={() => setOpen(false)} className="w-7 h-7 flex items-center justify-center rounded-full bg-white/50 text-[#8878AA]">
                <X size={14} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[9px] font-bold uppercase tracking-widest text-[#5A4A7A] block mb-1.5">Pregunta</label>
                <textarea
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  placeholder="¿Qué quieres preguntarle al usuario?"
                  rows={3}
                  autoFocus
                  className="w-full bg-white border-2 border-[#DDD5EE] rounded-2xl px-4 py-3 text-sm text-[#2D2440] placeholder:text-[#B0A8CC] focus:outline-none focus:border-[#F0C030] transition-colors resize-none"
                />
              </div>

              <div>
                <label className="text-[9px] font-bold uppercase tracking-widest text-[#5A4A7A] block mb-1.5">Nudo (momento del día)</label>
                <div className="flex flex-wrap gap-2">
                  {NUDOS_HARDCODED.map(n => {
                    const color = nudoColor(n.id)
                    const selected = categoryId === n.id
                    return (
                      <button
                        key={n.id}
                        onClick={() => setCategoryId(n.id)}
                        className="px-3 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-wider border-2 transition-all"
                        style={{ borderColor: color, backgroundColor: selected ? color : 'white', color: selected ? 'white' : color }}
                      >
                        {n.name}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            <button
              onClick={() => editandoP ? updateMutation.mutate() : createMutation.mutate()}
              disabled={!body.trim() || isSaving}
              className="mt-5 w-full py-3.5 rounded-2xl bg-[#F0C030] text-[#2D2440] font-black text-[10px] tracking-widest uppercase disabled:opacity-40 active:scale-95 transition-all"
            >
              {isSaving ? 'Guardando…' : editandoP ? 'Guardar cambios' : 'Agregar pregunta'}
            </button>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Dialog: Cambiar pregunta de hilo */}
      <Dialog.Root open={!!moviendo} onOpenChange={o => !o && setMoviendo(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
          <Dialog.Content className="fixed inset-x-4 top-[18%] z-50 rounded-[28px] border-2 border-[#2D2440]/20 bg-[#EDE9F8] p-6 max-w-sm mx-auto focus:outline-none">
            <Dialog.Title className="text-[11px] font-black uppercase tracking-[.2em] text-[#2D2440] mb-3">
              Cambiar de hilo
            </Dialog.Title>
            <p className="text-xs font-bold text-[#2D2440] leading-snug mb-3">{moviendo?.body}</p>
            <label className="block text-[9px] font-bold uppercase tracking-widest text-[#8878AA] mb-1.5" htmlFor="hilo-destino">
              Mover a
            </label>
            <select
              id="hilo-destino"
              value={destinoId}
              onChange={e => setDestinoId(e.target.value)}
              className="w-full rounded-2xl border-2 border-[#DDD5EE] bg-white px-3 py-3 text-xs font-bold text-[#2D2440] mb-3"
            >
              <option value="">Elige un hilo…</option>
              {otrosHilos.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
            <p className="text-[11px] text-[#5A4A7A] mb-5">
              {moviendo?.answerCount
                ? `Sus ${moviendo.answerCount} respuestas se van con la pregunta y pasarán a verse en el hilo nuevo. `
                : 'Esta pregunta aún no tiene respuestas. '}
              Los usuarios del hilo nuevo la verán como pendiente hasta que la contesten.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setMoviendo(null)} className="flex-1 py-3 rounded-2xl border-2 border-[#DDD5EE] text-[10px] font-bold uppercase tracking-widest text-[#5A4A7A]">
                Cancelar
              </button>
              <button
                onClick={() => moveMutation.mutate()}
                disabled={!destinoId || moveMutation.isPending}
                className="flex-1 py-3 rounded-2xl bg-[#2D2440] text-white text-[10px] font-black uppercase tracking-widest disabled:opacity-40"
              >
                {moveMutation.isPending ? 'Moviendo…' : 'Mover'}
              </button>
            </div>
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

// ─── Tab Imágenes ─────────────────────────────────────────────────────────────

const PLACEHOLDER = '{descripcion}'
const EJEMPLO_INICIAL = '2 huevos revueltos con tocino y un vaso de jugo'

/** Imágenes del asistente de voz para este hilo: si se generan y con qué prompt. */
function TabImagenes({ hilo }: { hilo: Hilo }) {
  const qc = useQueryClient()
  const soportado = hilo.imagesEnabled !== undefined
  const porDefecto = hilo.defaultImagePrompt ?? ''
  const guardado = hilo.imagePrompt ?? porDefecto

  const [activo, setActivo] = useState(!!hilo.imagesEnabled)
  const [prompt, setPrompt] = useState(guardado)
  const [ejemplo, setEjemplo] = useState(EJEMPLO_INICIAL)
  const [imagen, setImagen] = useState<Blob | null>(null)
  const [imagenUrl, setImagenUrl] = useState<string | null>(null)

  // La URL se crea y se libera en el mismo efecto (sobrevive al montaje doble de StrictMode)
  useEffect(() => {
    if (!imagen) { setImagenUrl(null); return }
    const url = URL.createObjectURL(imagen)
    setImagenUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [imagen])

  const sinCambios = activo === !!hilo.imagesEnabled && prompt.trim() === guardado.trim()
  const promptValido = prompt.trim().includes(PLACEHOLDER)

  const saveMutation = useMutation({
    mutationFn: () =>
      // Si el texto es igual al predeterminado se manda vacío: el hilo sigue el predeterminado aunque cambie después
      hilosApi.setImages(hilo.id, hilo.name, activo, prompt.trim() === porDefecto.trim() ? '' : prompt.trim()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hilo', hilo.id] })
      qc.invalidateQueries({ queryKey: ['hilos'] })
      toast.success('Imágenes del hilo guardadas')
    },
    onError: (e: Error) => toast.error(e.message || 'No se pudo guardar'),
  })

  const previewMutation = useMutation({
    mutationFn: () => hilosApi.previewImage(prompt.trim(), ejemplo.trim()),
    onSuccess: setImagen,
    onError: () => toast.error('No se pudo generar la imagen de prueba'),
  })

  if (!soportado) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-[#DDD5EE] bg-white/40 px-5 py-8 text-center">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#5A4A7A]">Aún no disponible</p>
        <p className="mt-1 text-[10px] leading-relaxed text-[#B0A8CC]">
          El servidor todavía no tiene las imágenes por hilo. Aparecerán aquí en cuanto se actualice.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => setActivo(v => !v)}
        role="switch"
        aria-checked={activo}
        className="flex w-full items-center gap-3 rounded-2xl border border-[#DDD5EE] bg-white px-4 py-3.5 text-left"
      >
        <ImageIcon size={16} className="shrink-0 text-[#5A4A7A]" />
        <span className="flex-1 text-[10px] font-black uppercase tracking-widest text-[#2D2440]">
          Generar imágenes en este hilo
          <span className="mt-0.5 block text-[9px] font-normal normal-case tracking-normal text-[#B0A8CC]">
            {activo
              ? 'El asistente dibuja lo que los usuarios contestan en las preguntas de este hilo.'
              : 'Apagado: las respuestas de este hilo no generan imagen.'}
          </span>
        </span>
        <span className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${activo ? 'bg-[#F0C030]' : 'bg-[#DDD5EE]'}`}>
          <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${activo ? 'left-[18px]' : 'left-0.5'}`} />
        </span>
      </button>

      <div className="space-y-2 rounded-2xl border border-[#DDD5EE] bg-white p-4">
        <div className="flex items-center justify-between">
          <label htmlFor="prompt-imagen" className="text-[10px] font-black uppercase tracking-widest text-[#2D2440]">Prompt de la imagen</label>
          <button
            onClick={() => setPrompt(porDefecto)}
            disabled={prompt.trim() === porDefecto.trim()}
            className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-[#5A4A7A] disabled:opacity-30"
          >
            <RotateCcw size={11} /> Predeterminado
          </button>
        </div>
        <textarea
          id="prompt-imagen"
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          rows={7}
          maxLength={1500}
          className="w-full resize-y rounded-xl border-2 border-[#DDD5EE] bg-[#F7F4FC] p-3 font-mono text-[11px] leading-relaxed text-[#2D2440] focus:border-[#F0C030] focus:outline-none"
        />
        <p className={`text-[9px] ${promptValido ? 'text-[#B0A8CC]' : 'font-bold text-[#E8503A]'}`}>
          {promptValido
            ? <>Donde aparece <code className="font-bold">{PLACEHOLDER}</code> se pone lo que contestó el usuario. {prompt.length}/1500</>
            : <>Falta <code>{PLACEHOLDER}</code>: ahí va lo que contestó el usuario.</>}
        </p>
      </div>

      <div className="space-y-3 rounded-2xl border border-[#DDD5EE] bg-white p-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-[#2D2440]">Probar el prompt</p>
        <input
          value={ejemplo}
          onChange={e => setEjemplo(e.target.value)}
          placeholder="Lo que contestaría un usuario"
          className="w-full rounded-xl border-2 border-[#DDD5EE] bg-[#F7F4FC] px-3 py-2 text-[12px] text-[#2D2440] focus:border-[#F0C030] focus:outline-none"
        />
        <button
          onClick={() => previewMutation.mutate()}
          disabled={!promptValido || ejemplo.trim().length < 3 || previewMutation.isPending}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-[#2D2440] py-2.5 text-[10px] font-black uppercase tracking-widest text-[#2D2440] disabled:opacity-35"
        >
          <Sparkles size={13} /> {previewMutation.isPending ? 'Generando…' : 'Generar imagen de prueba'}
        </button>
        {imagenUrl && <img src={imagenUrl} alt="Imagen de prueba" className="w-full rounded-2xl border border-[#DDD5EE]" />}
        <p className="text-[9px] text-[#B0A8CC]">Usa el texto de arriba aunque no lo hayas guardado. Cada prueba tiene un costo pequeño.</p>
      </div>

      <button
        onClick={() => saveMutation.mutate()}
        disabled={sinCambios || !promptValido || saveMutation.isPending}
        className="w-full rounded-2xl bg-[#2D2440] py-3.5 text-[10px] font-black uppercase tracking-widest text-[#F0C030] disabled:opacity-35"
      >
        {saveMutation.isPending ? 'Guardando…' : 'Guardar'}
      </button>
    </div>
  )
}

// ─── HiloDetail ───────────────────────────────────────────────────────────────

export default function HiloDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [tab, setTab] = useState<'usuarios' | 'preguntas' | 'imagenes'>('usuarios')

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
          {(['usuarios', 'preguntas', 'imagenes'] as const).map(t => (
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
                : t === 'preguntas'
                  ? `Preguntas (${hilo?.questions?.length ?? 0})`
                  : 'Imágenes'
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
        ) : tab === 'preguntas' ? (
          <TabPreguntas hiloId={id!} preguntas={hilo?.questions ?? []} />
        ) : hilo ? (
          // key: si se abre otro hilo o cambian los valores guardados, el formulario arranca con ellos
          <TabImagenes key={`${hilo.id}:${hilo.imagesEnabled}:${hilo.imagePrompt ?? ''}`} hilo={hilo} />
        ) : null}
      </div>
    </div>
  )
}
