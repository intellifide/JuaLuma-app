// Updated 2025-12-09 16:45 CST by ChatGPT - login submit bypasses native validation
import { FormEvent, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import Switch from '../components/ui/Switch'
import { getIdToken, getPasskeyAuthOptions, MfaRequiredError } from '../services/auth'
import { getPasskeyAssertion } from '../services/passkey'

export const Login = () => {
  const { login, completeLoginMfa } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const returnUrl = params.get('returnUrl') || '/dashboard'

  const [email, setEmail] = useState(params.get('email') || '')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mfaCode, setMfaCode] = useState('')
  const [mfaMethod, setMfaMethod] = useState<'totp' | 'passkey' | null>(null)

  const runPasskeyStep = async () => {
    if (!completeLoginMfa) {
      throw new Error('Unable to complete login challenge.')
    }
    const token = await getIdToken(true)
    if (!token) {
      throw new Error('Session expired. Please sign in again.')
    }
    const options = await getPasskeyAuthOptions(token)
    const assertion = await getPasskeyAssertion(options)
    await completeLoginMfa(undefined, assertion)
  }

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
      if (mfaMethod) {
        if (mfaMethod === 'passkey') {
          await runPasskeyStep()
        } else {
          if (!mfaCode.trim()) {
            setError('Enter your authenticator code to continue.')
            setSubmitting(false)
            return
          }
          if (!completeLoginMfa) {
            throw new Error('Unable to complete login challenge.')
          }
          await completeLoginMfa(mfaCode.trim())
        }
      } else {
        await login(trimmedEmail, trimmedPassword)
      }
      navigate(returnUrl, { replace: true })
    } catch (err) {
      if (err instanceof MfaRequiredError) {
        setMfaMethod(err.method)
        setError(
          err.method === 'passkey'
            ? 'Passkey verification is required. Continue to verify.'
            : 'Two-factor authentication is required. Enter your code to continue.',
        )
        return
      }
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
          <div className="flex flex-col items-center gap-4 mb-2">
            <Link to="/" className="flex flex-col items-center gap-2 group">
              <img src="/assets/logo.png" alt="JuaLuma logo" className="w-20 h-20 rounded-2xl object-contain shadow-xl shadow-primary/20 transition-transform group-hover:scale-110" />
              <span className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-text-primary to-text-secondary tracking-tight">JuaLuma</span>
            </Link>
          </div>
          <p className="text-xl font-semibold text-text-primary text-center opacity-80">
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

              {mfaMethod === 'totp' && (
                <div>
                  <label htmlFor="mfa-code" className="form-label">Authenticator Code</label>
                  <input
                    id="mfa-code"
                    type="text"
                    inputMode="numeric"
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value)}
                    className="form-input"
                    placeholder="123456"
                    autoComplete="one-time-code"
                    maxLength={6}
                  />
                </div>
              )}

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
                {submitting
                  ? 'Signing in...'
                  : mfaMethod === 'passkey'
                    ? 'Continue with Passkey'
                    : mfaMethod === 'totp'
                      ? 'Verify and Sign In'
                      : 'Sign In'}
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
