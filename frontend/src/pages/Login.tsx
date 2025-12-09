// Updated 2025-12-08 20:31 CST by ChatGPT
import { FormEvent, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export const Login = () => {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const returnUrl = params.get('returnUrl') || '/dashboard'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await login(email, password)
      navigate(returnUrl, { replace: true })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to log in. Try again.'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-royal-purple/10 via-white to-aqua/10 flex items-center">
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 px-6 py-12">
        <div className="space-y-4">
          <h1 className="text-3xl font-bold text-deep-indigo">Welcome back</h1>
          <p className="text-slate-700">
            Sign in to access your dashboard, AI assistant, and personalized settings. Use your email and password
            created during signup.
          </p>
          <div className="rounded-xl border border-slate-200 bg-white/70 p-4 shadow-sm">
            <p className="text-sm text-slate-700">
              Local development uses the Firebase Auth emulator. Make sure it&apos;s running on{' '}
              <code className="bg-slate-100 px-2 py-1 rounded">localhost:9099</code>.
            </p>
          </div>
        </div>

        <div className="bg-white/80 border border-slate-200 rounded-2xl shadow-xl p-8 backdrop-blur">
          <form className="space-y-4" onSubmit={onSubmit}>
            <div>
              <label className="block text-sm font-medium text-slate-700">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-royal-purple"
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-royal-purple"
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-royal-purple focus:ring-royal-purple"
                />
                Remember me
              </label>
              <Link to="/reset-password" className="text-sm text-royal-purple hover:text-deep-indigo font-medium">
                Forgot password?
              </Link>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-lg bg-royal-purple text-white font-semibold hover:bg-deep-indigo transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-700 mt-4">
            Don&apos;t have an account?{' '}
            <Link to="/signup" className="text-royal-purple font-semibold hover:text-deep-indigo">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
