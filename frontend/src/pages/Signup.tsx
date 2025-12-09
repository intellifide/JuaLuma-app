// Updated 2025-12-08 20:31 CST by ChatGPT
import { FormEvent, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const passwordChecks = [
  { label: 'At least 8 characters', test: (value: string) => value.length >= 8 },
  { label: 'One uppercase letter', test: (value: string) => /[A-Z]/.test(value) },
  { label: 'One lowercase letter', test: (value: string) => /[a-z]/.test(value) },
  { label: 'One number', test: (value: string) => /\d/.test(value) },
  { label: 'One special character', test: (value: string) => /[^A-Za-z0-9]/.test(value) },
]

export const Signup = () => {
  const { signup } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [acceptPrivacy, setAcceptPrivacy] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const passwordValid = useMemo(
    () => passwordChecks.every((check) => check.test(password)),
    [password],
  )

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    if (!passwordValid) {
      setError('Password must satisfy all strength requirements.')
      return
    }

    if (!acceptTerms || !acceptPrivacy) {
      setError('Please accept the Terms of Service and Privacy Policy.')
      return
    }

    setSubmitting(true)
    try {
      await signup(email, password)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to sign up at the moment.'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-royal-purple/10 via-white to-aqua/10 flex items-center">
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 px-6 py-12">
        <div className="space-y-4">
          <h1 className="text-3xl font-bold text-deep-indigo">Create your account</h1>
          <p className="text-slate-700">
            Build your Finity workspace, access AI assistance, and manage your financial operations from a single,
            secure dashboard.
          </p>
          <ul className="space-y-2 text-sm text-slate-700">
            {passwordChecks.map((check) => (
              <li key={check.label} className="flex items-center gap-2">
                <span
                  className={`h-3 w-3 rounded-full ${
                    check.test(password) ? 'bg-green-500' : 'bg-slate-300'
                  }`}
                />
                {check.label}
              </li>
            ))}
          </ul>
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
                placeholder="Strong password"
                autoComplete="new-password"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Confirm Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-royal-purple"
                placeholder="Repeat password"
                autoComplete="new-password"
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-royal-purple focus:ring-royal-purple"
                  required
                />
                I agree to the{' '}
                <a href="/legal/terms" className="text-royal-purple font-medium hover:text-deep-indigo">
                  Terms of Service
                </a>
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={acceptPrivacy}
                  onChange={(e) => setAcceptPrivacy(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-royal-purple focus:ring-royal-purple"
                  required
                />
                I agree to the{' '}
                <a href="/legal/privacy" className="text-royal-purple font-medium hover:text-deep-indigo">
                  Privacy Policy
                </a>
              </label>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-lg bg-royal-purple text-white font-semibold hover:bg-deep-indigo transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-700 mt-4">
            Already have an account?{' '}
            <Link to="/login" className="text-royal-purple font-semibold hover:text-deep-indigo">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
