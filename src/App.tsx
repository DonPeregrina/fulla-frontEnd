import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import SignIn from '@/pages/SignIn'
import HostDashboard from '@/pages/host/HostDashboard'
import UserDashboard from '@/pages/user/UserDashboard'
import Shell from '@/components/Shell'
import MnesticsLogo from '@/components/MnesticsLogo'

function ProtectedRoute({
  children,
  role,
}: {
  children: React.ReactNode
  role: 'HOST' | 'USER'
}) {
  const { session, loading } = useAuth()
  if (loading) return <SplashScreen />
  if (!session) return <Navigate to="/signin" replace />
  if (session.role !== role) return <Navigate to="/signin" replace />
  return <>{children}</>
}

function SplashScreen() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-mn-bg min-h-dvh">
      <MnesticsLogo size="xl" variant="reveal" className="mb-4" />
      <span className="font-mono text-xl font-bold tracking-tight text-mn-plum lowercase">
        mnestics<span className="text-mn-sky">.app</span>
      </span>
    </div>
  )
}

export default function App() {
  const { session, loading } = useAuth()

  if (loading) return <Shell><SplashScreen /></Shell>

  return (
    <Shell>
    <Routes>
      <Route
        path="/"
        element={
          session
            ? <Navigate to={session.role === 'HOST' ? '/host' : '/user'} replace />
            : <Navigate to="/signin" replace />
        }
      />
      <Route path="/signin" element={<SignIn />} />
      <Route
        path="/host/*"
        element={
          <ProtectedRoute role="HOST">
            <HostDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/user/*"
        element={
          <ProtectedRoute role="USER">
            <UserDashboard />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </Shell>
  )
}
