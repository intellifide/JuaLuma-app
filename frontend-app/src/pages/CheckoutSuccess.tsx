import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { verifyCheckoutSession } from '../services/billing'
import { eventTracking, SignupFunnelEvent } from '../services/eventTracking'

export const CheckoutSuccess = () => {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const { user, loading, refetchProfile } = useAuth()
    const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying')
    const [errorMessage, setErrorMessage] = useState<string>('')

    const safeReturnUrl = (value: string | null): string => {
        if (!value) return '/dashboard'
        return value.startsWith('/') ? value : '/dashboard'
    }

    useEffect(() => {
        // Wait for Firebase auth to initialize
        if (loading) {
            return
        }

        // User must be authenticated to verify payment
        if (!user) {
            setStatus('error')
            setErrorMessage('Authentication required. Please log in and try again.')
            return
        }

        const sessionId = searchParams.get('session_id')
        const returnUrl = safeReturnUrl(searchParams.get('returnUrl'))

        if (!sessionId) {
            setStatus('error')
            setErrorMessage('No session ID found. Please try again or contact support.')
            return
        }

        const verifyAndRedirect = async () => {
            try {
                // Verify the checkout session with the backend
                await verifyCheckoutSession(sessionId)

                // Wait a moment for the database to update
                await new Promise(resolve => setTimeout(resolve, 500))

                // Refetch the user profile to get updated subscription info
                await refetchProfile()

                // Track successful checkout completion
                eventTracking.trackSignupFunnel(SignupFunnelEvent.CHECKOUT_COMPLETED, { session_id: sessionId })

                setStatus('success')

                // Redirect to dashboard after a brief delay
                setTimeout(() => {
                    navigate(returnUrl, { replace: true })
                }, 1000)
            } catch (error) {
                console.error('Checkout verification failed:', error)
                // Track checkout failure
                eventTracking.trackSignupFunnel(SignupFunnelEvent.CHECKOUT_FAILED, {
                    session_id: sessionId,
                    error: error instanceof Error ? error.message : 'Unknown error'
                })
                setStatus('error')
                setErrorMessage('Failed to verify your payment. Please contact support if you were charged.')
            }
        }

        verifyAndRedirect()
    }, [searchParams, user, loading, refetchProfile, navigate])

    return (
        <div className="min-h-screen flex items-center justify-center bg-midnight-black">
            <div className="card max-w-md w-full text-center">
                {status === 'verifying' && (
                    <>
                        <div className="mb-6 flex justify-center">
                            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary" />
                        </div>
                        <h1 className="text-2xl font-bold mb-4">Verifying Your Payment</h1>
                        <p className="text-text-secondary">
                            Please wait while we confirm your subscription...
                        </p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <div className="mb-6 flex justify-center">
                            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                                <span className="text-4xl text-green-500">✓</span>
                            </div>
                        </div>
                        <h1 className="text-2xl font-bold mb-4 text-green-500">Payment Successful!</h1>
                        <p className="text-text-secondary">
                            Your subscription has been activated. Redirecting to dashboard...
                        </p>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <div className="mb-6 flex justify-center">
                            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
                                <span className="text-4xl text-red-500">✗</span>
                            </div>
                        </div>
                        <h1 className="text-2xl font-bold mb-4 text-red-500">Verification Failed</h1>
                        <p className="text-text-secondary mb-6">{errorMessage}</p>
                        <div className="flex gap-4 justify-center">
                            <button
                                onClick={() => navigate('/pricing')}
                                className="btn btn-outline"
                            >
                                Back to Pricing
                            </button>
                            <button
                                onClick={() => navigate('/support')}
                                className="btn btn-primary"
                            >
                                Contact Support
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
