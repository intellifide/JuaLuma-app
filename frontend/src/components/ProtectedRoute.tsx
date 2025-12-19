// Updated 2025-12-08 20:31 CST by ChatGPT
import { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

type ProtectedRouteProps = {
  children: ReactNode
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading, profile } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-royal-purple" />
      </div>
    )
  }

  if (!user) {
    const params = new URLSearchParams({ returnUrl: location.pathname })
    return <Navigate to={`/login?${params.toString()}`} replace />
  }

  if (!profile) {
    // If user exists but no profile, something is wrong (backend down?)
    // We can return null or an error page.
    // If loading is false, profile *should* be there.
    return (
      <div className="min-h-screen flex items-center justify-center bg-midnight-black text-neon-blue">
        Loading profile...
      </div>
    )
  }

  if (profile.status === 'pending_verification') {
    return <Navigate to="/verify-email" replace />
  }

  if (profile.status === 'pending_plan_selection') {
    return <Navigate to="/pricing" replace />
  }

  if (profile.status === 'suspended') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-midnight-black text-red-500">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Account Suspended</h1>
          <p>Please contact support.</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
