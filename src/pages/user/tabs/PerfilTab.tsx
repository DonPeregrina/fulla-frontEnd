import { useRef, useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { LogOut, Settings, Bell, LayoutGrid, Camera } from 'lucide-react'
import type { User } from '@/types'

function getStoredAvatar(userId: string): string | null {
  try { return localStorage.getItem(`fulla:avatar:${userId}`) } catch { return null }
}
function storeAvatar(userId: string, data: string) {
  try { localStorage.setItem(`fulla:avatar:${userId}`, data) } catch { /* ignore */ }
}

export default function PerfilTab() {
  const { current, logout } = useAuth()
  const user = current as User | null
  const fileRef = useRef<HTMLInputElement>(null)
  const [avatar, setAvatar] = useState<string | null>(null)

  useEffect(() => {
    if (user?.id) setAvatar(getStoredAvatar(user.id))
  }, [user?.id])

  if (!user) return null

  const initials = (user.username ?? '??').slice(0, 2).toUpperCase()
  const nombre = user.name ?? user.username
  const hilos: string[] = user.groups ?? []

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const data = ev.target?.result as string
      setAvatar(data)
      if (user) storeAvatar(user.id, data)
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="min-h-full bg-[#EDE9F8] pb-24">
      {/* Banner */}
      <div className="relative">
        <div className="h-28 bg-[#2D2440] flex items-center justify-center">
          <img src="/logo_png.png" alt="" className="h-10 opacity-20 object-contain" />
        </div>

        {/* Avatar */}
        <div className="absolute left-1/2 -translate-x-1/2 bottom-0 translate-y-1/2">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl border-4 border-[#EDE9F8] shadow-xl overflow-hidden bg-[#DDD5EE] flex items-center justify-center">
              {avatar
                ? <img src={avatar} alt="avatar" className="w-full h-full object-cover" />
                : <span className="text-2xl font-black text-[#2D2440]">{initials}</span>
              }
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#F0C030] flex items-center justify-center shadow-md border-2 border-[#EDE9F8] active:scale-95 transition-transform"
            >
              <Camera size={12} className="text-[#2D2440]" />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="pt-14 pb-2 text-center px-4">
        <h2 className="text-lg font-black text-[#2D2440] tracking-tight uppercase">{nombre}</h2>
        <p className="text-[10px] font-bold text-[#B0A8CC] tracking-[.2em] uppercase">@{user.username}</p>
        <span className="inline-block mt-2 px-3 py-0.5 rounded-full bg-[#2D2440] text-[#F0C030] text-[8px] font-black tracking-widest uppercase">
          Participante
        </span>
      </div>

      <div className="px-4 mt-6 space-y-5">
        {/* Afiliaciones */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <LayoutGrid size={12} className="text-[#8878AA]" />
            <h3 className="text-[9px] font-bold uppercase tracking-[.2em] text-[#8878AA]">Afiliaciones</h3>
          </div>
          {hilos.length === 0 ? (
            <p className="text-[9px] text-[#B0A8CC] italic">Sin hilos asignados.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {hilos.map(h => (
                <span key={h} className="px-3 py-1 rounded-full bg-white border border-[#DDD5EE] text-[9px] font-bold tracking-wider text-[#5A4A7A] uppercase">
                  {h}
                </span>
              ))}
            </div>
          )}
        </section>

        {/* Acciones */}
        <div className="bg-white rounded-2xl border border-[#DDD5EE] divide-y divide-[#DDD5EE] overflow-hidden">
          <button className="w-full flex items-center gap-3 px-4 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-[#5A4A7A]">
            <Settings size={16} className="text-[#B0A8CC]" />
            Configuración
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-[#5A4A7A]">
            <Bell size={16} className="text-[#B0A8CC]" />
            Notificaciones
          </button>
          <button onClick={logout} className="w-full flex items-center gap-3 px-4 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-[#E8503A]">
            <LogOut size={16} />
            Desconectar
          </button>
        </div>
      </div>
    </div>
  )
}
