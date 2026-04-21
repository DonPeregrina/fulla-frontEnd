import { useState } from 'react'
import { Routes, Route, NavLink, Navigate } from 'react-router-dom'
import { BookOpen, Users, Layers, User, Menu, X, LogOut } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import type { Host } from '@/types'
import BitacorasTab from './tabs/BitacorasTab'
import HilosTab from './tabs/HilosTab'
import UsuariosTab from './tabs/UsuariosTab'
import PerfilTab from './tabs/PerfilTab'

const tabs = [
  { to: '/host/bitacoras', label: 'Bitácoras', Icon: BookOpen },
  { to: '/host/hilos',     label: 'Hilos',     Icon: Layers },
  { to: '/host/usuarios',  label: 'Usuarios',  Icon: Users },
  { to: '/host/perfil',    label: 'Perfil',    Icon: User },
]

export default function HostDashboard() {
  const { current, logout } = useAuth()
  const host = current as Host | null
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <div className="flex flex-col min-h-dvh bg-[#EDE9F8]">
      {/* Top bar */}
      <header className="fixed top-0 inset-x-0 h-14 bg-white border-b border-[#DDD5EE] flex items-center px-4 z-40">
        <button
          onClick={() => setDrawerOpen(true)}
          className="flex items-center justify-center w-9 h-9 rounded-xl hover:bg-[#EDE9F8] transition-colors"
        >
          <Menu size={20} className="text-[#2D2440]" />
        </button>
        <div className="flex-1 flex items-center justify-center gap-2">
          <img src="/logo_png.png" alt="Fulla" className="w-6 h-6 object-contain" />
          <span className="text-[11px] font-black tracking-[.2em] text-[#2D2440] uppercase">Host</span>
        </div>
        <div className="w-9" />
      </header>

      {/* Side drawer */}
      {drawerOpen && (
        <>
          <div className="fixed inset-0 bg-black/30 z-50" onClick={() => setDrawerOpen(false)} />
          <div className="fixed top-0 left-0 h-full w-72 bg-white z-50 flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-[#DDD5EE]">
              <div className="flex items-center gap-2">
                <img src="/logo_png.png" alt="" className="w-8 h-8 object-contain" />
                <span className="text-sm font-black tracking-widest text-[#2D2440] uppercase">Fulla</span>
              </div>
              <button onClick={() => setDrawerOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#EDE9F8]">
                <X size={16} className="text-[#B0A8CC]" />
              </button>
            </div>

            <div className="p-4 border-b border-[#DDD5EE]">
              <p className="text-[9px] font-bold uppercase tracking-widest text-[#B0A8CC] mb-1">Host</p>
              <p className="text-sm font-black text-[#2D2440]">{host?.name ?? 'Administrador'}</p>
              <p className="text-[10px] text-[#B0A8CC]">{host?.email}</p>
            </div>

            <div className="flex-1" />

            <div className="p-4 border-t border-[#DDD5EE]">
              <button
                onClick={() => { setDrawerOpen(false); logout() }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest text-[#E8503A] hover:bg-red-50 transition-colors"
              >
                <LogOut size={16} />
                Cerrar sesión
              </button>
            </div>
          </div>
        </>
      )}

      <main className="flex-1 overflow-y-auto" style={{ paddingTop: '3.5rem', paddingBottom: 'calc(4rem + env(safe-area-inset-bottom))' }}>
        <Routes>
          <Route index element={<Navigate to="bitacoras" replace />} />
          <Route path="bitacoras" element={<BitacorasTab />} />
          <Route path="hilos"     element={<HilosTab />} />
          <Route path="usuarios"  element={<UsuariosTab />} />
          <Route path="perfil"    element={<PerfilTab />} />
        </Routes>
      </main>

      <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-[#DDD5EE] tab-bar-height flex items-start pt-2 z-40">
        {tabs.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center gap-1 py-1 transition-colors ${
                isActive ? 'text-[#2D2440]' : 'text-[#B0A8CC]'
              }`
            }
          >
            <Icon size={20} strokeWidth={1.5} />
            <span className="text-[9px] font-bold tracking-wider uppercase">{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
