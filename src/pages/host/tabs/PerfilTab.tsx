import { useRef, useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { LogOut, Settings, Mail, Shield, Camera } from 'lucide-react'
import type { Host } from '@/types'

function getStoredAvatar(hostId: string): string | null {
  try { return localStorage.getItem(`fulla:avatar:${hostId}`) } catch { return null }
}
function storeAvatar(hostId: string, data: string) {
  try { localStorage.setItem(`fulla:avatar:${hostId}`, data) } catch { /* ignore */ }
}

export default function PerfilTab() {
  const { current, logout } = useAuth()
  const host = current as Host | null
  const fileRef = useRef<HTMLInputElement>(null)
  const [avatar, setAvatar] = useState<string | null>(null)

  useEffect(() => {
    if (host?.id) setAvatar(getStoredAvatar(host.id))
  }, [host?.id])

  if (!host) return null

  const initials = (host.name ?? host.email).slice(0, 2).toUpperCase()

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const data = ev.target?.result as string
      setAvatar(data)
      if (host) storeAvatar(host.id, data)
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
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="pt-14 pb-2 text-center px-4">
        <h2 className="text-lg font-black text-[#2D2440] tracking-tight uppercase">{host.name ?? 'Host'}</h2>
        <p className="text-[10px] font-bold text-[#B0A8CC] tracking-[.2em]">{host.email}</p>
        <span className="inline-block mt-2 px-3 py-0.5 rounded-full bg-[#F0C030] text-[#2D2440] text-[8px] font-black tracking-widest uppercase">
          Host
        </span>
      </div>

      <div className="px-4 mt-6 space-y-4">
        {/* Info cards */}
        <div className="space-y-2">
          <div className="bg-white rounded-2xl border border-[#DDD5EE] px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#EDE9F8] flex items-center justify-center shrink-0">
              <Mail size={14} className="text-[#5A4A7A]" />
            </div>
            <div>
              <p className="text-[8px] font-bold uppercase tracking-widest text-[#B0A8CC]">Email</p>
              <p className="text-xs font-bold text-[#2D2440]">{host.email}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-[#DDD5EE] px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#EDE9F8] flex items-center justify-center shrink-0">
              <Shield size={14} className="text-[#5A4A7A]" />
            </div>
            <div>
              <p className="text-[8px] font-bold uppercase tracking-widest text-[#B0A8CC]">Rol</p>
              <p className="text-xs font-bold text-[#2D2440]">Administrador</p>
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div className="bg-white rounded-2xl border border-[#DDD5EE] divide-y divide-[#DDD5EE] overflow-hidden">
          <button className="w-full flex items-center gap-3 px-4 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-[#5A4A7A]">
            <Settings size={16} className="text-[#B0A8CC]" />
            Configuración
          </button>
          <button onClick={logout} className="w-full flex items-center gap-3 px-4 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-[#E8503A]">
            <LogOut size={16} />
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  )
}
