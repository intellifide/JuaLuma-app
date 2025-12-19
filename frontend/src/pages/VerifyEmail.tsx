import { useState, FormEvent, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { requestEmailCode, verifyEmailCode } from '../services/auth'

export const VerifyEmail = () => {
    const { user, profile, refetchProfile } = useAuth()
    const navigate = useNavigate()
    const [code, setCode] = useState('')
    const [error, setError] = useState('')
    const [message, setMessage] = useState('')
    const [loading, setLoading] = useState(false)
    const [sending, setSending] = useState(false)

    useEffect(() => {
        // If user is already verified (based on profile status), go to dashboard (or next step)
        if (profile?.status !== 'pending_verification') {
            // Assume ProtectedRoute or Dashboard logic will handle 'pending_plan_selection' or 'active'
            navigate('/dashboard')
        }
    }, [profile, navigate])

    const handleSendCode = async () => {
        if (!user?.email) return
        setSending(true)
        setMessage('')
        setError('')
        try {
            await requestEmailCode(user.email)
            setMessage('Un code verification a été envoyé à votre email.')
        } catch (err) {
            setError('Impossible d\'envoyer le code.' + err)
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
            // Navigation will be handled by the effect or ProtectedRoute once profile updates,
            // but we can force it or let it settle.
            // Profile status should update to 'pending_plan_selection'.
        } catch (err) {
            if (err instanceof Error) {
                setError(err.message)
            } else {
                setError('Verification failed.')
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-midnight-black flex items-center justify-center p-4">
            <div className="max-w-md w-full glass-panel p-8 rounded-xl space-y-6">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-neon-blue to-purple-500 bg-clip-text text-transparent">
                    Vérifiez votre email
                </h2>

                <p className="text-slate-300">
                    Pour sécuriser votre compte, veuillez entrer le code reçu par email :
                    <span className="block font-mono text-neon-blue mt-1">{user?.email}</span>
                </p>

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
                            Code de vérification (6 chiffres)
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
                        {loading ? 'Vérification...' : 'Valider'}
                    </button>
                </form>

                <div className="text-center pt-4 border-t border-white/5">
                    <button
                        onClick={handleSendCode}
                        disabled={sending}
                        className="text-sm text-slate-400 hover:text-neon-blue transition-colors"
                    >
                        {sending ? 'Envoi...' : 'Renvoyer le code'}
                    </button>
                </div>
            </div>
        </div>
    )
}
