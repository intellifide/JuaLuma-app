// Updated 2025-12-09 16:45 CST by ChatGPT
import { FormEvent, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { confirmResetPassword, requestEmailCode, verifyResetPasswordCode } from '../services/auth'

export const ResetPassword = () => {
  const { resetPassword } = useAuth()
  const [searchParams] = useSearchParams()
  const oobCode = searchParams.get('oobCode') || ''
  const hasResetCode = Boolean(oobCode)
  const [email, setEmail] = useState('')
  const [mfaCode, setMfaCode] = useState('')
  const [showMfa, setShowMfa] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [sendingCode, setSendingCode] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [codeMessage, setCodeMessage] = useState<string | null>(null)
  const [resetEmail, setResetEmail] = useState<string | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [resetting, setResetting] = useState(false)
  const [resetMessage, setResetMessage] = useState<string | null>(null)
  const [resetError, setResetError] = useState<string | null>(null)
  const [linkInvalid, setLinkInvalid] = useState(false)

  useEffect(() => {
    if (!hasResetCode) return
    let active = true
    setResetEmail(null)
    setResetError(null)
    setResetMessage(null)
    setLinkInvalid(false)

    verifyResetPasswordCode(oobCode)
      .then((resolvedEmail) => {
        if (!active) return
        setResetEmail(resolvedEmail)
      })
      .catch((err) => {
        if (!active) return
        const friendly =
          err instanceof Error ? err.message : 'This reset link is invalid or expired.'
        setResetError(friendly)
        setLinkInvalid(true)
      })

    return () => {
      active = false
    }
  }, [hasResetCode, oobCode])

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setMessage(null)
    setNotice(null)
    setCodeMessage(null)
    setSubmitting(true)

    try {
      const status = await resetPassword(email, mfaCode || undefined)
      if (status === 'mfa_required') {
        setShowMfa(true)
        setNotice('2FA is enabled on this account. Enter your code to send the reset link.')
        return
      }
      setMessage('If this email exists, a reset link has been sent. Check your inbox.')
      setShowMfa(false)
    } catch (err) {
      const friendly =
        err instanceof Error ? err.message : 'Unable to send reset email. Try again.'
      setError(friendly)
    } finally {
      setSubmitting(false)
    }
  }

  const onResetSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!oobCode) return
    setResetError(null)
    setResetMessage(null)
    setLinkInvalid(false)

    if (!newPassword || newPassword.length < 8) {
      setResetError('Password must be at least 8 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setResetError('Passwords do not match.')
      return
    }

    setResetting(true)
    try {
      await confirmResetPassword(oobCode, newPassword)
      setResetMessage('Password updated. You can now log in with your new password.')
    } catch (err) {
      const friendly =
        err instanceof Error ? err.message : 'Unable to reset password. Try again.'
      setResetError(friendly)
      if (friendly.toLowerCase().includes('reset link')) {
        setLinkInvalid(true)
      }
    } finally {
      setResetting(false)
    }
  }

  const handleSendCode = async () => {
    if (!email) return
    setSendingCode(true)
    setCodeMessage(null)
    setError(null)
    try {
      await requestEmailCode(email)
      setCodeMessage('A verification code was sent. Check your inbox and spam folder.')
    } catch (err) {
      const friendly = err instanceof Error ? err.message : 'Unable to send code right now.'
      setError(friendly)
    } finally {
      setSendingCode(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-120px)] bg-bg-primary">
      <div className="container py-16">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-8">
          <div>
            <h1 className="text-3xl font-bold mb-4">
              {hasResetCode ? 'Set a new password' : 'Reset your password'}
            </h1>
            {hasResetCode ? (
              <p className="mb-4">
                Choose a new password for {resetEmail || 'your account'}.
              </p>
            ) : (
              <>
                <p className="mb-4">
                  Enter the email tied to your jualuma account. We&apos;ll send a password reset link to help you get back in.
                </p>
                <p className="text-sm text-slate-700">
                  Make sure the Firebase Auth emulator is running locally so the reset flow works in development.
                </p>
              </>
            )}
          </div>

          <div className="glass-panel">
            {hasResetCode ? (
              <form className="space-y-4" onSubmit={onResetSubmit}>
                <div>
                  <label className="form-label">New Password</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="form-input"
                    placeholder="Create a new password"
                    autoComplete="new-password"
                    disabled={linkInvalid}
                  />
                </div>
                <div>
                  <label className="form-label">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="form-input"
                    placeholder="Re-enter your new password"
                    autoComplete="new-password"
                    disabled={linkInvalid}
                  />
                </div>

                {resetMessage && <p className="text-sm text-green-600">{resetMessage}</p>}
                {resetError && (
                  <p className="text-sm text-red-600">
                    {resetError}
                    {linkInvalid && (
                      <>
                        {' '}
                        <Link to="/reset-password" className="font-semibold text-royal-purple hover:text-deep-indigo">
                          Request a new link
                        </Link>
                      </>
                    )}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={resetting || linkInvalid}
                  className="btn w-full justify-center"
                >
                  {resetting ? 'Updating password...' : 'Reset password'}
                </button>
              </form>
            ) : (
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
                    disabled={showMfa}
                  />
                </div>

                {showMfa && (
                  <div>
                    <label className="form-label">Verification Code</label>
                    <input
                      type="text"
                      required
                      value={mfaCode}
                      onChange={(e) => setMfaCode(e.target.value)}
                      className="form-input"
                      placeholder="123456"
                      maxLength={6}
                      autoFocus
                    />
                    <p className="mt-1 text-xs text-slate-500">
                      Enter the code from your authenticator app or email.
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      We&apos;ll email your reset link after the code is verified.
                    </p>
                    <div className="mt-2 flex items-center justify-between text-xs text-slate-600">
                      <button
                        type="button"
                        onClick={handleSendCode}
                        disabled={sendingCode}
                        className="text-royal-purple font-semibold hover:text-deep-indigo"
                      >
                        {sendingCode ? 'Sending code...' : 'Send email code'}
                      </button>
                      {codeMessage && <span className="text-green-600">{codeMessage}</span>}
                    </div>
                  </div>
                )}

                {message && <p className="text-sm text-green-600">{message}</p>}
                {notice && <p className="text-sm text-slate-600">{notice}</p>}
                {error && <p className="text-sm text-red-600">{error}</p>}

                <button
                  type="submit"
                  disabled={submitting}
                  className="btn w-full justify-center"
                >
                  {submitting
                    ? 'Sending reset link...'
                    : showMfa
                      ? 'Verify & send reset link'
                      : 'Send reset link'}
                </button>
              </form>
            )}

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
