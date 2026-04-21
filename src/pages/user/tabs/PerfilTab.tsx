import { useAuth } from '@/contexts/AuthContext'
import { LogOut, Settings, Bell, LayoutGrid } from 'lucide-react'
import type { User } from '@/types'

export default function PerfilTab() {
  const { current, logout } = useAuth()
  const user = current as User | null

  if (!user) return null

  const initials = (user.username ?? '??').slice(0, 2).toUpperCase()
  const nombre = user.name ?? user.username
  const hilos: string[] = user.groups ?? []

  return (
    <div className="min-h-full bg-[#EDE9F8] pb-24">
      {/* Banner + Avatar */}
      <div className="relative">
        <div className="h-28 bg-[#2D2440]" />
        <div className="absolute left-1/2 -translate-x-1/2 bottom-0 translate-y-1/2">
          <div className="w-20 h-20 rounded-2xl bg-[#EDE9F8] border-4 border-[#EDE9F8] shadow-xl flex items-center justify-center">
            <span className="text-2xl font-black text-[#2D2440] tracking-tight">{initials}</span>
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
            <p className="text-[9px] text-[#B0A8CC] italic tracking-widest">Sin hilos asignados.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {hilos.map(hilo => (
                <span
                  key={hilo}
                  className="px-3 py-1 rounded-full bg-white border border-[#DDD5EE] text-[9px] font-bold tracking-wider text-[#5A4A7A] uppercase"
                >
                  {hilo}
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
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-[#E8503A]"
          >
            <LogOut size={16} />
            Desconectar
          </button>
        </div>
      </div>
    </div>
  )
}
