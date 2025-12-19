// Updated 2025-12-09 16:45 CST by ChatGPT
import { FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export const ResetPassword = () => {
  const { resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setMessage(null)
    setSubmitting(true)

    try {
      await resetPassword(email)
      setMessage('If this email exists, a reset link has been sent. Check your inbox.')
    } catch (err) {
      const friendly =
        err instanceof Error ? err.message : 'Unable to send reset email. Try again.'
      setError(friendly)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-120px)] bg-bg-primary">
      <div className="container py-16">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-8">
          <div>
            <h1 className="text-3xl font-bold mb-4">Reset your password</h1>
            <p className="mb-4">
              Enter the email tied to your jualuma account. We&apos;ll send a password reset link to help you get back in.
            </p>
            <p className="text-sm text-slate-700">
              Make sure the Firebase Auth emulator is running locally so the reset flow works in development.
            </p>
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

              {message && <p className="text-sm text-green-600">{message}</p>}
              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={submitting}
                className="btn w-full justify-center"
              >
                {submitting ? 'Sending reset link...' : 'Send reset link'}
              </button>
            </form>

            <p className="text-center text-sm text-slate-700 mt-4">
              Remember your password?{' '}
              <Link to="/login" className="text-royal-purple font-semibold hover:text-deep-indigo">
                Back to login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
