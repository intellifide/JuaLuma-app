// Updated 2025-12-09 16:45 CST by ChatGPT
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
    <div className="min-h-[calc(100vh-120px)] bg-bg-primary">
      <div className="container py-16">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-8">
          <div>
            <h1 className="text-3xl font-bold mb-4">Create your account</h1>
            <p className="mb-4">
              Build your Finity workspace, access AI assistance, and manage your financial operations from a single, secure dashboard.
            </p>
            <ul className="space-y-2 text-sm text-slate-700">
              {passwordChecks.map((check) => (
                <li key={check.label} className="flex items-center gap-2">
                  <span
                    className={`h-3 w-3 rounded-full ${check.test(password) ? 'bg-green-500' : 'bg-slate-300'}`}
                  />
                  {check.label}
                </li>
              ))}
            </ul>
          </div>

          <div className="glass-panel">
            <form className="space-y-4" onSubmit={onSubmit}>
              <div>
                <label className="form-label">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input"
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>

              <div>
                <label className="form-label">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input"
                  placeholder="Strong password"
                  autoComplete="new-password"
                />
              </div>

              <div>
                <label className="form-label">Confirm Password</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="form-input"
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
                className="btn w-full justify-center"
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
    </div>
  )
}
