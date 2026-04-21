import { Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom'
import { Layers2, CalendarDays, User, Circle } from 'lucide-react'
import NudosTab from './tabs/NudosTab'
import HilosTab from './tabs/HilosTab'
import HistorialTab from './tabs/HistorialTab'
import PerfilTab from './tabs/PerfilTab'

const tabs = [
  { to: '/user/hilos',    label: 'Hilos',    icon: 'hilos' as const },
  { to: '/user',          label: 'Nudos',    icon: 'nudos' as const },
  { to: '/user/historial',label: 'Historial',icon: 'historial' as const },
  { to: '/user/perfil',   label: 'Perfil',   icon: 'perfil' as const },
]

function TabIcon({ icon, isActive }: { icon: string; isActive: boolean }) {
  const color = isActive ? '#2D2440' : '#B0A8CC'

  if (icon === 'nudos') {
    return (
      <div className="relative flex h-6 w-6 items-center justify-center">
        <Circle className="h-5 w-5 transition-all" style={{ fill: isActive ? '#2D2440' : 'transparent', color }} />
        <div
          className="absolute h-7 w-7 rounded-full border border-dashed transition-opacity"
          style={{
            borderColor: '#2D2440',
            opacity: isActive ? 0.4 : 0,
            animation: isActive ? 'spin 10s linear infinite' : undefined,
          }}
        />
      </div>
    )
  }

  if (icon === 'hilos') return <Layers2 className="h-5 w-5" style={{ color }} />
  if (icon === 'historial') return <CalendarDays className="h-5 w-5" style={{ color }} />
  return <User className="h-5 w-5" style={{ color }} />
}

export default function UserDashboard() {
  const location = useLocation()

  return (
    <div className="flex flex-col min-h-dvh">
      <main className="flex-1 overflow-y-auto content-with-tabs">
        <Routes>
          <Route index element={<NudosTab />} />
          <Route path="hilos"    element={<HilosTab />} />
          <Route path="historial" element={<HistorialTab />} />
          <Route path="perfil"   element={<PerfilTab />} />
          <Route path="capturas" element={<Navigate to="/user" replace />} />
        </Routes>
      </main>

      <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-[#DDD5EE] tab-bar-height flex items-start pt-2 z-50">
        {tabs.map(({ to, label, icon }) => {
          const isActive = icon === 'nudos'
            ? location.pathname === '/user' || location.pathname === '/user/'
            : location.pathname.startsWith(to)

          return (
            <NavLink
              key={to}
              to={to}
              end={to === '/user'}
              className="flex-1 flex flex-col items-center gap-1 py-1 transition-all"
            >
              <TabIcon icon={icon} isActive={isActive} />
              <span
                className="text-[8px] font-bold uppercase tracking-wider transition-colors"
                style={{ color: isActive ? '#2D2440' : '#B0A8CC' }}
              >
                {label}
              </span>
            </NavLink>
          )
        })}
      </nav>
    </div>
  )
}
