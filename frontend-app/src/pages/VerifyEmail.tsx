/**
 * CORE PURPOSE: Email verification page for user onboarding.
 * LAST MODIFIED: 2025-12-21 17:05 CST
 */
import { useState, FormEvent, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { requestEmailCode, verifyEmailCode } from '../services/auth'
import { eventTracking, SignupFunnelEvent } from '../services/eventTracking'

export const VerifyEmail = () => {
    const { user, profile, refetchProfile } = useAuth()
    const navigate = useNavigate()
    const [code, setCode] = useState('')
    const [error, setError] = useState('')
    const [message, setMessage] = useState('')
    const [loading, setLoading] = useState(false)
    const [sending, setSending] = useState(false)

    // Track when user lands on email verification page
    useEffect(() => {
        eventTracking.trackSignupFunnel(SignupFunnelEvent.EMAIL_VERIFICATION_STARTED)
    }, [])

    const [params] = useSearchParams()
    const returnUrl = params.get('returnUrl')
    const plan = params.get('plan')

    useEffect(() => {
        // If user has completed verification, redirect to pricing or dashboard
        // ProtectedRoute will handle the final destination based on status
        // BUT we want to preserve returnUrl if present
        
        const nextParams = new URLSearchParams()
        if (returnUrl) {
            nextParams.set('returnUrl', returnUrl)
        }
        if (plan) {
            nextParams.set('plan', plan)
        }
        const queryString = nextParams.toString()
        
        // Prioritize household invites - bypass pricing check
        if (returnUrl && returnUrl.includes('/household/accept-invite')) {
             navigate(returnUrl, { replace: true })
             return
        }

        if (profile?.status === 'pending_plan_selection') {
            navigate(`/plan-selection${queryString ? `?${queryString}` : ''}`, { replace: true })
        } else if (profile?.status === 'active') {
            // If active, go to returnUrl if exists, else dashboard
            navigate(returnUrl || '/dashboard', { replace: true })
        }
        // If status is 'pending_verification', stay on this page
    }, [profile, navigate, returnUrl])

    const handleSendCode = async () => {
        if (!user?.email) return
        setSending(true)
        setMessage('')
        setError('')
        try {
            await requestEmailCode(user.email)
            setMessage('A new verification code has been sent to your email. Please check your inbox and spam folder. The code will expire in 10 minutes.')
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error'
            setError(`Unable to send verification code: ${errorMessage}. Please try again or contact support if the issue persists.`)
        } finally {
            setSending(false)
        }
    }

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        try {
            await verifyEmailCode(code)
            await refetchProfile()
            // Track successful verification
            eventTracking.trackSignupFunnel(SignupFunnelEvent.EMAIL_VERIFICATION_COMPLETED)
            // Navigation will be handled by the effect or ProtectedRoute once profile updates,
            // but we can force it or let it settle.
            // Profile status should update to 'pending_plan_selection'.
        } catch (err) {
            if (err instanceof Error) {
                setError(err.message.includes('Invalid') || err.message.includes('expired')
                    ? 'Invalid or expired code. Please request a new code and try again.'
                    : err.message
                )
            } else {
                setError('Verification failed. Please check your code and try again.')
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-midnight-black flex items-center justify-center p-4">
            <div className="max-w-md w-full glass-panel p-8 rounded-xl space-y-6">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-neon-blue to-purple-500 bg-clip-text text-transparent">
                    Verify Your Email
                </h2>

                <p className="text-slate-300">
                    To secure your account, please enter the verification code sent to your email:
                    <span className="block font-mono text-neon-blue mt-1">{user?.email}</span>
                </p>

                <div className="p-3 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-lg text-sm">
                    <strong>Haven&apos;t received your code?</strong>
                    <ul className="mt-2 ml-4 space-y-1 list-disc text-xs">
                        <li>Check your spam/junk folder</li>
                        <li>Ensure {user?.email} is correct</li>
                        <li>Wait 1-2 minutes for delivery</li>
                        <li>Click &quot;Resend Code&quot; below if needed</li>
                    </ul>
                </div>

                {error && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg text-sm">
                        {error}
                    </div>
                )}

                {message && (
                    <div className="p-3 bg-green-500/10 border border-green-500/20 text-green-500 rounded-lg text-sm">
                        {message}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">
                            Verification Code (6 digits)
                        </label>
                        <input
                            type="text"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-neon-blue focus:border-transparent outline-none transition-all"
                            placeholder="123456"
                            maxLength={6}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading || code.length < 6}
                        className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Verifying...' : 'Validate'}
                    </button>
                </form>

                <div className="text-center pt-4 border-t border-white/5">
                    <button
                        onClick={handleSendCode}
                        disabled={sending}
                        className="text-sm text-slate-400 hover:text-neon-blue transition-colors"
                    >
                        {sending ? 'Sending...' : 'Resend Code'}
                    </button>
                </div>
            </div>
        </div>
    )
}
