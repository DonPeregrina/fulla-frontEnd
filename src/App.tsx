import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import SignIn from '@/pages/SignIn'
import HostDashboard from '@/pages/host/HostDashboard'
import UserDashboard from '@/pages/user/UserDashboard'

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
    <div className="fixed inset-0 bg-fulla-dark flex items-center justify-center">
      <span className="text-fulla-gold text-4xl font-bold tracking-widest">FULLA</span>
    </div>
  )
}

export default function App() {
  const { session, loading } = useAuth()

  if (loading) return <SplashScreen />

  return (
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
  )
}
