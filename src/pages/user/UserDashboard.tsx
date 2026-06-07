import { Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { BookOpen, User } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useQuery } from '@tanstack/react-query'
import { respuestasApi } from '@/services/api'
import NudosTab from './tabs/NudosTab'
import HistorialTab from './tabs/HistorialTab'
import PerfilTab from './tabs/PerfilTab'
import TopNavBar from '@/components/TopNavBar'
import StreakRow from '@/components/StreakRow'
import MnesticsLogo from '@/components/MnesticsLogo'

const tabs = [
  { to: '/user',          label: 'Nodo',   id: 'nodo'   },
  { to: '/user/historial',label: 'Diario', id: 'diario' },
  { to: '/user/perfil',   label: 'Perfil', id: 'perfil' },
]

function TabIcon({ id, isActive }: { id: string; isActive: boolean }) {
  if (id === 'nodo') {
    return (
      <div className="relative flex h-7 w-7 items-center justify-center">
        <div className={`transition-transform duration-500 ${isActive ? 'scale-110' : 'scale-90'}`}>
          <MnesticsLogo size="xs" variant={isActive ? 'reveal' : 'minimal'} />
        </div>
        {isActive && (
          <div className="absolute h-9 w-9 rounded-full border border-dashed border-[#F0C030]/40 animate-[spin_12s_linear_infinite]" />
        )}
      </div>
    )
  }
  if (id === 'diario') return <BookOpen className={`h-[18px] w-[18px] transition-all ${isActive ? 'stroke-[#F0C030] stroke-[2.5px]' : 'stroke-[#5588AA]'}`} />
  return <User className={`h-[18px] w-[18px] transition-all ${isActive ? 'stroke-[#F0C030] stroke-[2.5px]' : 'stroke-[#5588AA]'}`} />
}

export default function UserDashboard() {
  const location = useLocation()
  const { current } = useAuth()
  const userId = current?.id

  // Reusar mismo cache que NudosTab para streak
  const { data: respuestasData } = useQuery({
    queryKey: ['respuestas-all', userId],
    queryFn: () => respuestasApi.list(userId),
    enabled: !!userId,
    staleTime: 1000 * 60 * 10,
  })
  const respuestas = respuestasData?.answers ?? []

  const avatarInitial = current && 'username' in current
    ? (current.username as string).charAt(0).toUpperCase()
    : undefined

  return (
    <div className="flex flex-col min-h-dvh bg-mn-bg">
      <TopNavBar avatarInitial={avatarInitial} />
      <StreakRow respuestas={respuestas} />

      <main className="flex-1 overflow-y-auto" style={{ paddingTop: 'calc(3rem + env(safe-area-inset-top) + 2.25rem)' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="h-full"
          >
            <Routes>
              <Route index element={<NudosTab />} />
              <Route path="historial" element={<HistorialTab />} />
              <Route path="perfil"    element={<PerfilTab />} />
              <Route path="hilos"     element={<Navigate to="/user" replace />} />
              <Route path="capturas"  element={<Navigate to="/user" replace />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </main>

      <nav className="fixed bottom-0 inset-x-0 z-50 flex w-full items-center justify-around border-t border-[#2D2440] bg-[#1A1535] pb-[env(safe-area-inset-bottom)] pt-2.5 shadow-[0_-4px_12px_rgba(26,21,53,0.3)]">
        {tabs.map(({ to, label, id }) => {
          const isActive = id === 'nodo'
            ? location.pathname === '/user' || location.pathname === '/user/'
            : location.pathname.startsWith(to)

          return (
            <NavLink
              key={to}
              to={to}
              end={to === '/user'}
              className="flex flex-col items-center gap-1 p-2 transition-all duration-300"
            >
              <TabIcon id={id} isActive={isActive} />
              <span className={`text-[8px] font-bold uppercase tracking-wider mt-0.5 transition-colors ${isActive ? 'text-[#F0C030]' : 'text-[#5588AA]'}`}>
                {label}
              </span>
            </NavLink>
          )
        })}
      </nav>
    </div>
  )
}
