import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Check, Minus, Zap, Shield, Globe, Database, Activity, Users, Star } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { createCheckoutSession, getPlans, SubscriptionTier } from '../services/billing'
import { selectFreePlan } from '../services/auth'
import { eventTracking, SignupFunnelEvent } from '../services/eventTracking'

const fallbackPlans: SubscriptionTier[] = [
  {
    code: 'free',
    name: 'Free',
    description: 'Basic accounts and tracking',
    price_id: null,
    amount_cents: 0,
    currency: 'USD',
    interval: 'month',
    features: [
      '2 Traditional Accounts',
      '1 Investment Account',
      '1 Web3 Wallet',
      '1 CEX Account',
      '20 AI Queries/Day',
    ],
  },
  {
    code: 'essential_monthly',
    name: 'Essential',
    description: 'For serious personal finance management',
    price_id: null,
    amount_cents: 1200,
    currency: 'USD',
    interval: 'month',
    features: [
      '3 Traditional Accounts',
      '2 Investment Accounts',
      '1 Web3 Wallet',
      '3 CEX Accounts',
      '30 AI Queries/Day',
    ],
  },
  {
    code: 'pro_monthly',
    name: 'Pro',
    description: 'Professional tools for wealth builders',
    price_id: null,
    amount_cents: 2500,
    currency: 'USD',
    interval: 'month',
    features: [
      '5 Traditional Accounts',
      '5 Investment Accounts',
      '5 Web3 Wallets',
      '10 CEX Accounts',
      '40 AI Queries/Day',
      'Marketplace Access',
      '14-Day Free Trial',
    ],
  },
  {
    code: 'pro_annual',
    name: 'Pro Annual',
    description: 'Professional tools - 2 Months Free',
    price_id: null,
    amount_cents: 25000,
    currency: 'USD',
    interval: 'year',
    features: [
      'Everything in Pro Monthly',
      'Save $50/year',
      '14-Day Free Trial',
    ],
  },
  {
    code: 'ultimate_monthly',
    name: 'Ultimate',
    description: 'The complete financial operating system',
    price_id: null,
    amount_cents: 6000,
    currency: 'USD',
    interval: 'month',
    features: [
      '20 Traditional Accounts',
      '20 Investment Accounts',
      '20 Web3 Wallets',
      '20 CEX Accounts',
      '80 AI Queries/Day',
      'Family Sharing (4 users)',
      '14-Day Free Trial',
    ],
  },
  {
    code: 'ultimate_annual',
    name: 'Ultimate Annual',
    description: 'Ultimate power - 2 Months Free',
    price_id: null,
    amount_cents: 60000,
    currency: 'USD',
    interval: 'year',
    features: [
      'Everything in Ultimate Monthly',
      'Save $120/year',
      'Family Features Included',
      '14-Day Free Trial',
    ],
  },
]

const safeReturnUrl = (value: string | null): string => {
  if (!value) return '/dashboard'
  return value.startsWith('/') ? value : '/dashboard'
}

export const PlanSelection = () => {
  const { user, profile, loading, refetchProfile } = useAuth()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [billingCycle, setBillingCycle] = useState<'month' | 'year'>('month')
  const [plans, setPlans] = useState<SubscriptionTier[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [processingPlan, setProcessingPlan] = useState<string | null>(null)

  const returnUrl = params.get('returnUrl')
  const resolvedReturnUrl = useMemo(() => safeReturnUrl(returnUrl), [returnUrl])
  const initialPlan = params.get('plan')?.toLowerCase() || ''

  useEffect(() => {
    if (initialPlan.includes('annual')) {
      setBillingCycle('year')
    }
  }, [initialPlan])

  useEffect(() => {
    eventTracking.trackSignupFunnel(SignupFunnelEvent.PLAN_SELECTION_VIEWED)
  }, [])

  useEffect(() => {
    if (loading) return

    if (!user) {
      const nextParams = new URLSearchParams({ returnUrl: `/plan-selection${location.search}` })
      navigate(`/signup?${nextParams.toString()}`, { replace: true })
      return
    }

    if (profile?.status === 'pending_verification') {
      const nextParams = new URLSearchParams({ returnUrl: `/plan-selection${location.search}` })
      navigate(`/verify-email?${nextParams.toString()}`, { replace: true })
      return
    }

    if (profile?.status === 'active') {
      navigate(resolvedReturnUrl, { replace: true })
    }
  }, [loading, user, profile?.status, navigate, resolvedReturnUrl, location.search])

  useEffect(() => {
    const loadPlans = async () => {
      try {
        const response = await getPlans()
        setPlans(response.length ? response : fallbackPlans)
      } catch {
        setPlans(fallbackPlans)
      } finally {
        setIsLoading(false)
      }
    }

    loadPlans()
  }, [])

  const displayPlans = plans
    .filter((plan) => {
      if (plan.code === 'free') return true
      if (plan.code === 'essential_monthly') return true
      return plan.interval === billingCycle
    })
    .sort((a, b) => a.amount_cents - b.amount_cents)

  const getButtonText = (plan: SubscriptionTier) => {
    if (plan.code === 'free') return 'Get Started'
    if (plan.code.includes('pro') || plan.code.includes('ultimate')) return 'Start Free Trial'
    return 'Go Essential'
  }

  const getButtonClass = (plan: SubscriptionTier) => {
    if (plan.code === 'free') return 'btn btn-secondary w-full mt-auto'
    if (plan.code.includes('essential')) return 'btn btn-secondary w-full mt-auto'
    return 'btn w-full mt-auto'
  }

  const formatPrice = (amountCents: number, interval: string) => {
    const amount = amountCents / 100
    if (interval === 'year') {
      const monthlyEquivalent = amount / 12
      return {
        display: `$${amount.toLocaleString()}`,
        period: '/year',
        equivalent: `$${monthlyEquivalent.toFixed(2)}/month`,
      }
    }
    return {
      display: `$${amount}`,
      period: '/month',
      equivalent: null,
    }
  }

  const handleSelectPlan = async (plan: SubscriptionTier) => {
    if (processingPlan) return
    setProcessingPlan(plan.code)
    setError(null)

    try {
      if (plan.code === 'free') {
        eventTracking.trackSignupFunnel(SignupFunnelEvent.FREE_PLAN_SELECTED)
        await selectFreePlan()
        await refetchProfile()
        navigate(resolvedReturnUrl, { replace: true })
        return
      }

      eventTracking.trackSignupFunnel(SignupFunnelEvent.PAID_PLAN_SELECTED, { plan: plan.code })

      const successUrl = new URL('/checkout/success', window.location.origin)
      if (returnUrl) {
        successUrl.searchParams.set('returnUrl', returnUrl)
      }

      const checkoutUrl = await createCheckoutSession(plan.code, successUrl.toString())
      eventTracking.trackSignupFunnel(SignupFunnelEvent.CHECKOUT_STARTED, { plan: plan.code })
      window.location.assign(checkoutUrl)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to start checkout.'
      setError(message)
      eventTracking.trackSignupFunnel(SignupFunnelEvent.CHECKOUT_FAILED, {
        plan: plan.code,
        error: message,
      })
    } finally {
      setProcessingPlan(null)
    }
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-center mb-4">Choose Your Plan</h1>
      <p className="text-center text-lg text-text-secondary mb-8 max-w-[700px] mx-auto">
        Explore the capabilities of each tier and unlock the features that best fit your financial workflow.
      </p>

      <div className="flex justify-center items-center gap-4 mb-12">
        <span className={`text-sm font-medium ${billingCycle === 'month' ? 'text-primary' : 'text-text-muted'}`}>
          Monthly
        </span>
        <button
          onClick={() => setBillingCycle(billingCycle === 'month' ? 'year' : 'month')}
          className={`w-14 h-7 rounded-full p-1 transition-colors ${billingCycle === 'year' ? 'bg-primary' : 'bg-slate-600'}`}
          aria-label="Toggle billing cycle"
        >
          <div className={`w-5 h-5 bg-white rounded-full transition-transform ${billingCycle === 'year' ? 'translate-x-7' : 'translate-x-0'}`} />
        </button>
        <span className={`text-sm font-medium ${billingCycle === 'year' ? 'text-primary' : 'text-text-muted'}`}>
          Yearly <span className="text-accent text-xs">(2 Months Free)</span>
        </span>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-text-secondary">Loading plan details...</p>
        </div>
      ) : (
        <>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto mb-12">
            {displayPlans.map((plan) => {
              const isMonthlyOnly = billingCycle === 'year' && plan.interval === 'month' && plan.code !== 'free'
              const priceInfo = formatPrice(plan.amount_cents, plan.interval)

              return (
                <div
                  key={plan.code}
                  className={`glass-panel flex flex-col items-center text-center border-t-4 ${
                    plan.code === 'free'
                      ? 'border-t-gray-400'
                      : plan.code.includes('essential')
                        ? 'border-t-blue-500'
                        : plan.code.includes('pro')
                          ? 'border-t-primary shadow-xl relative z-10'
                          : 'border-t-accent'
                  } ${isMonthlyOnly ? 'opacity-70 grayscale-[0.5]' : ''}`}
                >
                  {plan.code.includes('pro') && (
                    <div className="absolute top-[-12px] left-1/2 -translate-x-1/2 bg-primary text-white px-4 py-1 rounded-xl text-xs font-semibold">
                      POPULAR
                    </div>
                  )}

                  <h3 className={`mb-2 ${
                    plan.code.includes('essential')
                      ? 'text-blue-500'
                      : plan.code.includes('pro')
                        ? 'text-primary'
                        : plan.code.includes('ultimate')
                          ? 'text-accent'
                          : ''
                  }`}>
                    {plan.name}
                  </h3>

                  <div className="text-4xl font-bold mb-2">
                    {priceInfo.display}
                    <span className="text-lg font-normal text-muted">{priceInfo.period}</span>
                  </div>
                  {priceInfo.equivalent && (
                    <div className="text-sm text-text-secondary mb-4">
                      {priceInfo.equivalent}
                    </div>
                  )}
                  {plan.description && (
                    <p className="text-sm text-text-secondary mb-4 min-h-[40px]">{plan.description}</p>
                  )}
                  {isMonthlyOnly && (
                    <p className="text-xs text-orange-400 font-semibold mb-2">Monthly Only (No Annual Discount)</p>
                  )}

                  <ul className="space-y-3 mb-8 text-left w-full pl-8 flex-grow">
                    {plan.features.map((feature, idx) => (
                      <li key={idx}>✓ {feature}</li>
                    ))}
                  </ul>

                  <button
                    type="button"
                    onClick={() => handleSelectPlan(plan)}
                    className={getButtonClass(plan)}
                    disabled={processingPlan === plan.code}
                  >
                    {processingPlan === plan.code ? 'Processing...' : getButtonText(plan)}
                  </button>
                </div>
              )
            })}
          </div>

          <div className="glass-panel mb-12 relative overflow-hidden p-0">
            <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />

            <div className="p-8 sm:p-12">
              <div className="text-center mb-12">
                <h2 className="mb-4">Feature Comparison</h2>
                <p className="text-text-secondary max-w-2xl mx-auto">
                  Detailed breakdown of what&apos;s included in each plan so you can choose the perfect fit.
                </p>
              </div>

              <div className="overflow-x-auto -mx-8 sm:mx-0 pb-4">
                <table className="w-full text-sm sm:text-base border-collapse min-w-[800px]">
                  <thead>
                    <tr>
                      <th className="text-left p-4 pb-8 w-1/4"></th>
                      <th className="p-4 pb-8 text-center w-[18%]">
                        <div className="text-xl font-bold text-gray-400 mb-1">Free</div>
                        <div className="text-sm font-normal text-gray-500">Starter</div>
                      </th>
                      <th className="p-4 pb-8 text-center w-[18%]">
                        <div className="text-xl font-bold text-blue-400 mb-1">Essential</div>
                        <div className="text-sm font-normal text-blue-500/80">Growth</div>
                      </th>
                      <th className="p-4 pb-8 text-center w-[18%] relative">
                        <div className="absolute inset-x-2 top-0 bottom-0 bg-primary/10 rounded-t-2xl -z-10" />
                        <div className="text-xl font-bold text-primary mb-1">Pro</div>
                        <div className="text-sm font-normal text-primary/80">Most Popular</div>
                      </th>
                      <th className="p-4 pb-8 text-center w-[18%]">
                        <div className="text-xl font-bold text-accent mb-1">Ultimate</div>
                        <div className="text-sm font-normal text-accent/80">Power User</div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="text-text-secondary">
                    {[
                      { label: 'Traditional Accounts', free: '2', essential: '3', pro: '5', ultimate: '20', icon: Globe },
                      { label: 'Investment Accounts', free: '1', essential: '2', pro: '5', ultimate: '20', icon: Activity },
                      { label: 'Web3 Wallets', free: '1', essential: '1', pro: '5', ultimate: '20', icon: Database },
                      { label: 'CEX Accounts', free: '1', essential: '3', pro: '10', ultimate: '20', icon: Shield },
                      { label: 'AI Queries/Day', free: '20', essential: '30', pro: '40', ultimate: '80', icon: Zap },
                      { label: 'Data Retention', free: '45 days', essential: 'Current + Prev', pro: 'Full History', ultimate: 'Full History', icon: Database },
                      { label: 'Family Features', free: false, essential: false, pro: false, ultimate: true, icon: Users },
                      { label: 'Free Trial', free: false, essential: false, pro: '14 days', ultimate: '14 days', icon: Star },
                      { label: 'Developer Marketplace', free: false, essential: false, pro: true, ultimate: true, icon: Globe },
                    ].map((row, idx) => (
                      <tr key={idx} className="group hover:bg-white/5 transition-colors border-b border-white/5 last:border-0">
                        <td className="p-4 py-5 text-left font-medium text-text-primary flex items-center gap-3">
                          <row.icon className="w-4 h-4 text-text-muted opacity-70" />
                          {row.label}
                        </td>
                        <td className="p-4 py-5 text-center font-medium">{row.free === false ? <Minus className="w-5 h-5 mx-auto text-gray-600" /> : row.free === true ? <Check className="w-5 h-5 mx-auto text-green-500" /> : row.free}</td>
                        <td className="p-4 py-5 text-center font-medium text-blue-300/90">{row.essential === false ? <Minus className="w-5 h-5 mx-auto text-gray-600" /> : row.essential === true ? <Check className="w-5 h-5 mx-auto text-blue-500" /> : row.essential}</td>
                        <td className="p-4 py-5 text-center font-bold text-primary relative">
                          <div className="absolute inset-x-2 inset-y-0 bg-primary/5 -z-10 group-hover:bg-primary/10 transition-colors" />
                          {row.pro === false ? <Minus className="w-5 h-5 mx-auto text-gray-600/50" /> : row.pro === true ? <Check className="w-5 h-5 mx-auto text-primary" /> : row.pro}
                        </td>
                        <td className="p-4 py-5 text-center font-medium text-accent/90">{row.ultimate === false ? <Minus className="w-5 h-5 mx-auto text-gray-600" /> : row.ultimate === true ? <Check className="w-5 h-5 mx-auto text-accent" /> : row.ultimate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {error && (
        <div className="max-w-2xl mx-auto text-center text-sm text-red-400 mt-6">
          {error}
        </div>
      )}
    </div>
  )
}
