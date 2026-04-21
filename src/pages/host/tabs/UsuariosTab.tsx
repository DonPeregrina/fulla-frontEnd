import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as Dialog from '@radix-ui/react-dialog'
import { toast } from 'sonner'
import { UserPlus, X, ChevronRight, Clock, Users } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { usersApi, invitacionesApi } from '@/services/api'

function Skeleton() {
  return (
    <div className="px-4 space-y-3">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="bg-white rounded-2xl border border-[#DDD5EE] p-4 animate-pulse flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#DDD5EE] shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-32 bg-[#DDD5EE] rounded-full" />
            <div className="h-2.5 w-24 bg-[#DDD5EE] rounded-full" />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function UsuariosTab() {
  const { current } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [inviteOpen, setInviteOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [cancelando, setCancelando] = useState<string | null>(null)

  const { data: usersData, isLoading: loadingUsers } = useQuery({
    queryKey: ['users-all'],
    queryFn: () => usersApi.list(),
    enabled: !!current?.id,
  })

  const { data: invitesData, isLoading: loadingInvites } = useQuery({
    queryKey: ['invitaciones'],
    queryFn: () => invitacionesApi.listMine(),
    enabled: !!current?.id,
    staleTime: 1000 * 60 * 2,
  })

  const inviteMutation = useMutation({
    mutationFn: () => invitacionesApi.send(email.trim()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invitaciones'] })
      toast.success('Invitación enviada')
      setEmail(''); setInviteOpen(false)
    },
    onError: () => toast.error('No se pudo enviar la invitación'),
  })

  const cancelMutation = useMutation({
    mutationFn: (id: string) => invitacionesApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invitaciones'] })
      toast.success('Invitación cancelada')
      setCancelando(null)
    },
    onError: () => toast.error('No se pudo cancelar'),
  })

  const usuarios = usersData?.users ?? []
  const invites = invitesData?.invites ?? []
  const isLoading = loadingUsers || loadingInvites
  const total = usuarios.length + invites.length

  return (
    <div className="min-h-full bg-[#EDE9F8] pb-24">
      {/* Header */}
      <div className="px-5 pt-6 pb-5 flex items-end justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[.15em] text-[#5A4A7A]">
            {usuarios.length} usuario{usuarios.length !== 1 ? 's' : ''}{invites.length > 0 ? ` · ${invites.length} pendiente${invites.length !== 1 ? 's' : ''}` : ''}
          </p>
          <h1 className="text-xl font-black tracking-tight text-[#2D2440] mt-0.5">Usuarios</h1>
        </div>
        <button
          onClick={() => setInviteOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#2D2440] text-[#F0C030] text-[10px] font-black tracking-widest uppercase active:scale-95 transition-transform"
        >
          <UserPlus size={14} />
          Invitar
        </button>
      </div>

      {isLoading ? (
        <Skeleton />
      ) : total === 0 ? (
        <div className="px-4 pt-12 text-center space-y-3">
          <Users size={32} className="mx-auto text-[#DDD5EE]" />
          <p className="text-sm font-bold uppercase tracking-widest text-[#5A4A7A]">Sin usuarios</p>
          <p className="text-[10px] text-[#B0A8CC]">Invita a tus primeros participantes.</p>
        </div>
      ) : (
        <div className="px-4 space-y-2">
          {/* Usuarios activos */}
          {usuarios.map(u => (
            <button
              key={u.id}
              onClick={() => navigate(`/host/usuarios/${u.id}`)}
              className="w-full bg-white rounded-2xl border border-[#DDD5EE] px-4 py-3.5 flex items-center gap-3 text-left hover:border-[#F0C030]/50 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-[#EDE9F8] flex items-center justify-center shrink-0">
                <span className="text-sm font-black text-[#2D2440]">
                  {(u.username ?? '?').slice(0, 2).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-[#2D2440] truncate">{u.name ?? u.username}</p>
                <p className="text-[9px] text-[#B0A8CC] font-bold">
                  @{u.username}
                  {u.groups?.length > 0 && ` · ${u.groups.length} hilo${u.groups.length !== 1 ? 's' : ''}`}
                </p>
              </div>
              <ChevronRight size={16} className="text-[#B0A8CC] shrink-0" />
            </button>
          ))}

          {/* Invitaciones pendientes */}
          {invites.length > 0 && (
            <div className="pt-2">
              <p className="text-[9px] font-bold uppercase tracking-widest text-[#B0A8CC] px-1 mb-2">
                Invitaciones pendientes
              </p>
              {invites.map(inv => (
                <div key={inv.id} className="bg-white rounded-2xl border border-dashed border-[#DDD5EE] px-4 py-3.5 flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-[#EDE9F8] flex items-center justify-center shrink-0">
                    <Clock size={16} className="text-[#B0A8CC]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#5A4A7A] truncate">{inv.email}</p>
                    <p className="text-[9px] text-[#B0A8CC] font-bold uppercase tracking-wider">
                      Pendiente{inv.groupId ? ' · con hilo' : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => setCancelando(inv.id)}
                    className="text-[#E8503A]/40 hover:text-[#E8503A] transition-colors shrink-0"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Dialog: Invitar */}
      <Dialog.Root open={inviteOpen} onOpenChange={setInviteOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
          <Dialog.Content className="fixed inset-x-4 top-[20%] z-50 rounded-[28px] border-2 border-[#C8BEE0] bg-[#EDE9F8] p-6 max-w-sm mx-auto focus:outline-none">
            <div className="flex items-center justify-between mb-2">
              <Dialog.Title className="text-[11px] font-black uppercase tracking-[.2em] text-[#2D2440]">
                Invitar participante
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="w-7 h-7 flex items-center justify-center rounded-full bg-white/50 text-[#8878AA]">
                  <X size={14} />
                </button>
              </Dialog.Close>
            </div>
            <p className="text-[9px] text-[#B0A8CC] mb-4">Recibirán un email para unirse a tu espacio.</p>
            <input
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && email.trim() && inviteMutation.mutate()}
              placeholder="email@ejemplo.com"
              type="email"
              autoFocus
              className="w-full bg-white border-2 border-[#DDD5EE] rounded-2xl px-4 py-3 text-sm text-[#2D2440] placeholder:text-[#B0A8CC] focus:outline-none focus:border-[#F0C030] transition-colors"
            />
            <button
              onClick={() => inviteMutation.mutate()}
              disabled={!email.trim() || inviteMutation.isPending}
              className="mt-4 w-full py-3.5 rounded-2xl bg-[#F0C030] text-[#2D2440] font-black text-[10px] tracking-widest uppercase disabled:opacity-40 active:scale-95 transition-all"
            >
              {inviteMutation.isPending ? 'Enviando…' : 'Enviar invitación'}
            </button>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Dialog: Cancelar invitación */}
      <Dialog.Root open={!!cancelando} onOpenChange={o => !o && setCancelando(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
          <Dialog.Content className="fixed inset-x-4 top-[25%] z-50 rounded-[28px] border-2 border-[#E8503A]/30 bg-[#EDE9F8] p-6 max-w-sm mx-auto focus:outline-none">
            <Dialog.Title className="text-[11px] font-black uppercase tracking-[.2em] text-[#E8503A] mb-3">
              Cancelar invitación
            </Dialog.Title>
            <p className="text-xs text-[#5A4A7A] mb-5">
              ¿Quieres cancelar esta invitación? El usuario ya no podrá usarla para registrarse.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setCancelando(null)} className="flex-1 py-3 rounded-2xl border-2 border-[#DDD5EE] text-[10px] font-bold uppercase tracking-widest text-[#5A4A7A]">
                No
              </button>
              <button
                onClick={() => cancelando && cancelMutation.mutate(cancelando)}
                disabled={cancelMutation.isPending}
                className="flex-1 py-3 rounded-2xl bg-[#E8503A] text-white text-[10px] font-black uppercase tracking-widest disabled:opacity-40"
              >
                {cancelMutation.isPending ? 'Cancelando…' : 'Sí, cancelar'}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}
