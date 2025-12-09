// Updated 2025-12-08 20:31 CST by ChatGPT
import { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

type ProtectedRouteProps = {
  children: ReactNode
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading } = useAuth()
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

  return <>{children}</>
}
