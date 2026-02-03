// Updated 2026-01-23 12:00 CST
import { FormEvent, useMemo, useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { eventTracking, SignupFunnelEvent } from '../services/eventTracking'
import { LEGAL_AGREEMENTS } from '../constants/legal'
import { AgreementAcceptanceInput } from '../types/legal'
import Switch from '../components/ui/Switch'
import { Alert } from '../components/ui/Alert'
import { Check, Circle, AlertCircle } from 'lucide-react'

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

  const [params] = useSearchParams()
  const returnUrl = params.get('returnUrl')
  const plan = params.get('plan')
  // Use params.get('email') as initial value
  const [email, setEmail] = useState(params.get('email') || '')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [acceptPrivacy, setAcceptPrivacy] = useState(false)
  const [acceptResident, setAcceptResident] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const passwordValid = useMemo(
    () => passwordChecks.every((check) => check.test(password)),
    [password],
  )

  // Marketing site base URL for legal docs (GCP portability: env-driven, no hardcoded origins)
  const marketingLegalBase = useMemo(() => {
    const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost'
    const fallback = isLocalhost ? 'http://localhost:5177' : window.location.origin
    return (import.meta as any).env?.VITE_MARKETING_SITE_URL || fallback
  }, [])

  // Track when user lands on signup page
  useEffect(() => {
    eventTracking.trackSignupFunnel(SignupFunnelEvent.SIGNUP_STARTED)
  }, [])

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

    if (!acceptResident) {
      setError('You must certify that you are a resident of the United States.')
      return
    }

    if (!firstName.trim()) {
      setError('First name is required.')
      return
    }

    if (!lastName.trim()) {
      setError('Last name is required.')
      return
    }

    // Validate username if provided
    if (username.trim() && username.length < 3) {
      setError('Username must be at least 3 characters if provided.')
      return
    }

    setSubmitting(true)
    try {
      const agreements: AgreementAcceptanceInput[] = [
        {
          agreement_key: LEGAL_AGREEMENTS.termsOfService.key,
          agreement_version: LEGAL_AGREEMENTS.termsOfService.version,
          acceptance_method: 'clickwrap',
        },
        {
          agreement_key: LEGAL_AGREEMENTS.privacyPolicy.key,
          agreement_version: LEGAL_AGREEMENTS.privacyPolicy.version,
          acceptance_method: 'clickwrap',
        },
        {
          agreement_key: LEGAL_AGREEMENTS.usResidencyCertification.key,
          agreement_version: LEGAL_AGREEMENTS.usResidencyCertification.version,
          acceptance_method: 'clickwrap',
        },
      ]
      await signup(email, password, agreements, firstName.trim(), lastName.trim(), username.trim() || undefined)
      // Track successful signup
      eventTracking.trackSignupFunnel(SignupFunnelEvent.SIGNUP_COMPLETED, { email })
      // After signup, user status is 'pending_verification'
      // Navigate to verify-email page where they'll enter the OTP
      const nextParams = new URLSearchParams()
      if (returnUrl) {
        nextParams.set('returnUrl', returnUrl)
      }
      if (plan) {
        nextParams.set('plan', plan)
      }
      const queryString = nextParams.toString()
      navigate(`/verify-email${queryString ? `?${queryString}` : ''}`, { replace: true })
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to sign up at the moment.'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center">
      <div className="container py-16 w-full">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-8">
          <div>
            <h1 className="text-3xl font-bold mb-4">Create your account</h1>
            <p className="mb-4">
              Build your JuaLuma workspace, access AI assistance, and manage your financial operations from a single, secure dashboard.
            </p>
            <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
              {passwordChecks.map((check) => (
                <li key={check.label} className="flex items-center gap-2">
                  {check.test(password) ? (
                    <Check className="h-4 w-4 shrink-0 text-green-500" aria-hidden />
                  ) : (
                    <Circle className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                  )}
                  {check.label}
                </li>
              ))}
            </ul>
          </div>

          <div className="glass-panel">
            <form className="space-y-4" onSubmit={onSubmit}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="signup-first-name" className="form-label">First Name</label>
                  <input
                    id="signup-first-name"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="form-input"
                    placeholder="John"
                    autoComplete="given-name"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="signup-last-name" className="form-label">Last Name</label>
                  <input
                    id="signup-last-name"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="form-input"
                    placeholder="Doe"
                    autoComplete="family-name"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="signup-username" className="form-label">Username (Optional)</label>
                <input
                  id="signup-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="form-input"
                  placeholder="johndoe"
                  autoComplete="username"
                  minLength={3}
                  maxLength={64}
                />
                <p className="text-xs text-slate-600 mt-1">Must be at least 3 characters and unique</p>
              </div>

              <div>
                <label htmlFor="signup-email" className="form-label">Email</label>
                <input
                  id="signup-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input"
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />
              </div>

              <div>
                <label htmlFor="signup-password" className="form-label">Password</label>
                <input
                  id="signup-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  required
                />
              </div>

              <div>
                <label htmlFor="confirm-password" className="form-label">Confirm Password</label>
                <input
                  id="confirm-password"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="form-input"
                  placeholder="Repeat password"
                  autoComplete="new-password"
                />
              </div>

              <div className="space-y-4">
                <Switch
                  checked={acceptTerms}
                  onChange={setAcceptTerms}
                  label={
                    <span>
                      I agree to the{' '}
                      <a
                        href={`${marketingLegalBase}/legal/terms`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-royal-purple font-medium hover:text-deep-indigo"
                      >
                        Terms of Service
                      </a>
                    </span>
                  }
                />
                <Switch
                  checked={acceptPrivacy}
                  onChange={setAcceptPrivacy}
                  label={
                    <span>
                      I agree to the{' '}
                      <a
                        href={`${marketingLegalBase}/legal/privacy`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-royal-purple font-medium hover:text-deep-indigo"
                      >
                        Privacy Policy
                      </a>
                    </span>
                  }
                />
                <Switch
                  checked={acceptResident}
                  onChange={setAcceptResident}
                  label="I certify that I am a resident of the United States and agree to the Terms of Service."
                />
              </div>

              {error && (
                <Alert variant="danger" className="flex items-center gap-2 text-sm font-medium text-red-600 dark:text-red-400">
                  <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
                  {error}
                </Alert>
              )}

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
