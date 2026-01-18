import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { householdService } from '../services/householdService'
import { useAuth } from '../hooks/useAuth'
import { AlertCircle, CheckCircle, Shield, Loader2 } from 'lucide-react'

export default function JoinHousehold() {
  const { user, loading: authLoading } = useAuth()
  const [checkingInvite, setCheckingInvite] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [agreed, setAgreed] = useState(false)
  const [status, setStatus] = useState<'validating' | 'pending' | 'joining' | 'success' | 'failed'>('validating')
  const [inviteDetails, setInviteDetails] = useState<{ email: string; user_exists: boolean } | null>(null)
  
  const location = useLocation()
  const navigate = useNavigate()
  
  // Extract token from URL query params
  const searchParams = new URLSearchParams(location.search)
  const token = searchParams.get('token')

  useEffect(() => {
    async function validateInvite() {
        if (!token) {
            setError('Invalid invite link. Missing token.')
            setStatus('failed')
            setCheckingInvite(false)
            return
        }

        try {
            const info = await householdService.checkInviteStatus(token)
            setInviteDetails(info)
            setStatus('pending')
        } catch (err: unknown) {
            console.error('Invalid invite:', err)
            const message = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Invalid or expired invite link.'
            setError(message)
            setStatus('failed')
        } finally {
            setCheckingInvite(false)
        }
    }

    validateInvite()
  }, [token])

  // Handle Redirection logic after validation & auth check
  useEffect(() => {
    // Wait for auth to settle and invite confirmation
    if (authLoading || checkingInvite || status !== 'pending' || !inviteDetails) return

    // Create the Return URL to come back here exactly
    const returnUrl = encodeURIComponent(`/household/accept-invite?token=${token}`)

    if (!user) {
        // User is NOT logged in.
        // Redirect based on whether they have an account (user_exists)
        if (inviteDetails.user_exists) {
            // Send to Login (pre-fill email if possible via state or query param logic not shown here, simply redirecting)
            // Ideally passing email would be nice: /login?email=...
            navigate(`/login?returnUrl=${returnUrl}&email=${encodeURIComponent(inviteDetails.email)}`)
        } else {
            // Send to Signup
            navigate(`/signup?returnUrl=${returnUrl}&email=${encodeURIComponent(inviteDetails.email)}`)
        }
    } 
    // If user IS logged in, we stay here and show the Accept UI.
    // Safety check: warn if logged-in email doesn't match invite email?
    if (user && user.email !== inviteDetails.email) {
        setError(`This invite was sent to ${inviteDetails.email}, but you are logged in as ${user.email}. You can still join if this is intentional.`)
    }

  }, [user, authLoading, checkingInvite, status, inviteDetails, navigate, token])


  const handleJoin = async () => {
    if (!token) return
    if (!agreed) {
      setError('You must agree to the data sharing terms.')
      return
    }

    setLoading(true)
    setError(null)
    setStatus('joining')

    try {
      await householdService.acceptInvite({ 
        token, 
        consent_agreed: true 
      })
      setStatus('success')
      // Redirect to dashboard after short delay
      setTimeout(() => {
        navigate('/dashboard')
      }, 2000)
    } catch (err: unknown) {
      console.error('Failed to join household:', err)
      const message = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Failed to join household. Please try again.'
      setError(message)
      setStatus('failed')
    } finally {
      setLoading(false)
    }
  }

  if (checkingInvite || authLoading || status === 'validating') {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-900 text-white p-4">
             <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
             <p className="text-neutral-400">Verifying invite...</p>
        </div>
      )
  }

  if (status === 'success') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-900 text-white p-4">
        <div className="bg-neutral-800 p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-neutral-700">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-6" />
          <h2 className="text-2xl font-bold mb-2">Welcome Home!</h2>
          <p className="text-neutral-400">You have successfully joined the household.</p>
          <p className="text-sm text-neutral-500 mt-4">Redirecting you to the dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-900 text-white p-4">
      <div className="bg-neutral-800 p-8 rounded-2xl shadow-xl max-w-xl w-full border border-neutral-700">
        <div className="flex items-center justify-center mb-6">
          <div className="bg-blue-600/20 p-3 rounded-full">
            <Shield className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-center mb-2">Join Household</h1>
        <p className="text-neutral-400 text-center mb-8">
          You have been invited to join a JuaLuma household.
        </p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {status === 'failed' && (
           <div className="text-center">
             <button 
                onClick={() => navigate('/')}
                className="bg-neutral-700 hover:bg-neutral-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
             >
               Go to Dashboard
             </button>
           </div>
        )}

        {(status === 'pending' || status === 'joining') && (
          <div className="space-y-6">
            <div className="bg-neutral-900/50 p-6 rounded-xl border border-neutral-700/50 text-sm text-neutral-300 space-y-4 max-h-60 overflow-y-auto">
              <h3 className="font-semibold text-white">Data Sharing Consent & Privacy Policy</h3>
              <p>
                By joining this household, you explicitly agree to share your financial data with the household owner and other authorized members.
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  Your <strong>account balances, transaction history, and net worth</strong> will be visible to household administrators.
                </li>
                <li>
                  This data will be aggregated into the household&apos;s total financial overview.
                </li>
                <li>
                  Authorized members may use <strong>AI Assistants</strong> that have access to this shared pool of financial data to answer questions and provide insights (e.g., &quot;How much did we spend on groceries?&quot;).
                </li>
                <li>
                  If you previously held a paid subscription, it will be canceled, and your account will be converted to a dependent &quot;Free&quot; tier under this household.
                </li>
              </ul>
              <p className="text-xs text-neutral-500 pt-2">
                This consent is required to enable the collaborative financial planning features of JuaLuma. You may leave the household at any time, which will stop future data sharing, though historical aggregated reports may retain anonymous statistics.
              </p>
            </div>

            <label className="flex items-start gap-3 p-4 bg-neutral-700/10 rounded-lg cursor-pointer hover:bg-neutral-700/20 transition-colors">
              <input 
                type="checkbox" 
                className="mt-1 w-4 h-4 rounded border-neutral-600 bg-neutral-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-neutral-800"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
              />
              <span className="text-sm text-neutral-200 select-none">
                I have read and agree to the Data Sharing Consent & Privacy Policy above. I understand that my financial information will be shared with this household.
              </span>
            </label>

            <button
              onClick={handleJoin}
              disabled={!agreed || loading}
              className={`w-full py-3 px-6 rounded-lg font-medium text-white transition-all transform active:scale-[0.98] ${
                agreed && !loading
                  ? 'bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-500/20' 
                  : 'bg-neutral-700 cursor-not-allowed opacity-50'
              }`}
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <span>Joining...</span>
                </div>
              ) : (
                'Accept Invite & Join Household'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
