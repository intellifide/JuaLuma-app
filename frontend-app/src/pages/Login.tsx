// Updated 2025-12-09 16:45 CST by ChatGPT - login submit bypasses native validation
import { FormEvent, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import Switch from '../components/ui/Switch'

export const Login = () => {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const returnUrl = params.get('returnUrl') || '/dashboard'

  const [email, setEmail] = useState(params.get('email') || '')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)

    const trimmedEmail = email.trim()
    const trimmedPassword = password.trim()

    if (!trimmedEmail || !trimmedPassword) {
      setError('Email and password are required.')
      return
    }

    setSubmitting(true)
    try {
      await login(trimmedEmail, trimmedPassword)
      navigate(returnUrl, { replace: true })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to log in. Try again.'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center">
      <div className="container py-16 w-full">
        <div className="flex flex-col items-center gap-6 max-w-md mx-auto">
          <p className="text-xl font-semibold text-text-primary text-center">
            Welcome Back. Please sign in to continue
          </p>
          <div className="glass-panel w-full">
            <form className="space-y-4" onSubmit={onSubmit} noValidate>
              <div>
                <label htmlFor="email" className="form-label">Email</label>
                <input
                  id="email"
                  type="text"
                  inputMode="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input"
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>

              <div>
                <label htmlFor="password" className="form-label">Password</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>

              <div className="flex items-center justify-between">
                <Switch
                  checked={rememberMe}
                  onChange={setRememberMe}
                  label="Remember me"
                />
                <Link to="/reset-password" className="text-sm text-royal-purple hover:text-deep-indigo font-medium">
                  Forgot password?
                </Link>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={submitting}
                className="btn w-full justify-center"
              >
                {submitting ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <p className="text-center text-sm text-slate-700 mt-4">
              Don&apos;t have an account?{' '}
              <Link 
                to={`/signup${returnUrl && returnUrl !== '/dashboard' ? `?returnUrl=${encodeURIComponent(returnUrl)}` : ''}`}
                className="text-royal-purple font-semibold hover:text-deep-indigo"
              >
                Create one
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
