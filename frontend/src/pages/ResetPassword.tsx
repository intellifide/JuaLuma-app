// Updated 2025-12-08 20:31 CST by ChatGPT
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
    <div className="min-h-screen bg-gradient-to-br from-royal-purple/10 via-white to-aqua/10 flex items-center">
      <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 px-6 py-12">
        <div className="space-y-4">
          <h1 className="text-3xl font-bold text-deep-indigo">Reset your password</h1>
          <p className="text-slate-700">
            Enter the email tied to your Finity account. We&apos;ll send a password reset link to help you get back in.
          </p>
          <p className="text-sm text-slate-700">
            Make sure the Firebase Auth emulator is running locally so the reset flow works in development.
          </p>
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

            {message && <p className="text-sm text-green-600">{message}</p>}
            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-lg bg-royal-purple text-white font-semibold hover:bg-deep-indigo transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
  )
}
