import { Routes, Route, NavLink, Navigate } from 'react-router-dom'
import { BookOpen, Users, Layers, User } from 'lucide-react'
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
  return (
    <div className="flex flex-col min-h-dvh">
      <main className="flex-1 overflow-y-auto content-with-tabs">
        <Routes>
          <Route index element={<Navigate to="bitacoras" replace />} />
          <Route path="bitacoras" element={<BitacorasTab />} />
          <Route path="hilos"     element={<HilosTab />} />
          <Route path="usuarios"  element={<UsuariosTab />} />
          <Route path="perfil"    element={<PerfilTab />} />
        </Routes>
      </main>

      <nav className="fixed bottom-0 inset-x-0 bg-[#1A1228] border-t border-fulla-border tab-bar-height flex items-start pt-2 z-50">
        {tabs.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center gap-1 py-1 transition-colors ${
                isActive ? 'text-fulla-gold' : 'text-fulla-muted'
              }`
            }
          >
            <Icon size={22} strokeWidth={1.5} />
            <span className="text-[10px] font-bold tracking-wider uppercase">{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
