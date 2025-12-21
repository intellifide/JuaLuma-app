import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { selectFreePlan } from '../services/auth'
import { createCheckoutSession, createBillingPortalSession, getPlans, SubscriptionTier } from '../services/billing'
import { eventTracking, SignupFunnelEvent } from '../services/eventTracking'

export const Pricing = () => {
    const { user, profile, refetchProfile } = useAuth()
    const navigate = useNavigate()
    const [loading, setLoading] = useState<string | null>(null)
    const [plans, setPlans] = useState<SubscriptionTier[]>([])
    const [fetchError, setFetchError] = useState<string | null>(null)

    useEffect(() => {
        const fetchPlans = async () => {
            try {
                const data = await getPlans()
                setPlans(data)
            } catch (err) {
                console.error('Failed to fetch plans:', err)
                setFetchError('Failed to load pricing plans.')
            }
        }
        fetchPlans()

        // Track when user views the pricing page (plan selection)
        if (profile?.status === 'pending_plan_selection') {
            eventTracking.trackSignupFunnel(SignupFunnelEvent.PLAN_SELECTION_VIEWED)
        }
    }, [profile?.status])

    const handlePlanSelect = async (planCode: string) => {
        if (!user) {
            navigate('/signup')
            return
        }

        // If it's already the current plan, maybe we want to go to the portal?
        // But free plan doesn't have a portal usually.
        if (profile?.plan === planCode && planCode !== 'free') {
            await handleManageSubscription()
            return
        }

        setLoading(planCode)
        try {
            if (planCode === 'free') {
                // Track free plan selection
                eventTracking.trackSignupFunnel(SignupFunnelEvent.FREE_PLAN_SELECTED)
                await selectFreePlan()
                await refetchProfile()
                navigate('/dashboard')
            } else {
                // Track paid plan checkout initiation
                eventTracking.trackSignupFunnel(SignupFunnelEvent.PAID_PLAN_SELECTED, { plan: planCode })
                eventTracking.trackSignupFunnel(SignupFunnelEvent.CHECKOUT_STARTED, { plan: planCode })
                const url = await createCheckoutSession(planCode, window.location.origin + '/checkout/success')
                window.location.href = url
            }
        } catch (error) {
            console.error('Plan selection failed:', error)
            alert('Failed to select plan. Please try again.')
        } finally {
            setLoading(null)
        }
    }

    const handleManageSubscription = async () => {
        setLoading('portal')
        try {
            const url = await createBillingPortalSession(window.location.origin + '/pricing')
            window.location.href = url
        } catch (error) {
            console.error('Failed to open billing portal:', error)
            alert('Could not open billing portal. Please contact support.')
        } finally {
            setLoading(null)
        }
    }

    const [billingCycle, setBillingCycle] = useState<'month' | 'year'>('month')

    const displayPlans = plans.filter(p => {
        if (p.code === 'free') return true
        if (p.code === 'essential_monthly') return true 
        return p.interval === billingCycle
    }).sort((a, b) => a.amount_cents - b.amount_cents)

    const BtnText = ({ plan }: { plan: string }) => {
        if (loading === plan || (loading === 'portal' && profile?.plan === plan)) return <span>Processing...</span>
        if (profile?.plan === plan) {
            return <span>{plan === 'free' ? 'Current Plan' : 'Manage Subscription'}</span>
        }
        return <span>{user ? 'Select Plan' : 'Get Started'}</span>
    }

    return (
        <div>
            <section className="container py-12">
                <h1 className="text-center mb-4">
                    Choose Your Plan
                </h1>
                <p className="text-center text-lg text-text-secondary mb-8 max-w-[700px] mx-auto">
                    Start free and upgrade when you need more features. All plans include bank-level security and read-only
                    account access.
                </p>

                {/* Toggle */}
                <div className="flex justify-center items-center gap-4 mb-12">
                    <span className={`text-sm font-medium ${billingCycle === 'month' ? 'text-primary' : 'text-text-muted'}`}>Monthly</span>
                    <button 
                        onClick={() => setBillingCycle(billingCycle === 'month' ? 'year' : 'month')}
                        className={`w-14 h-7 rounded-full p-1 transition-colors ${billingCycle === 'year' ? 'bg-primary' : 'bg-slate-600'}`}
                    >
                        <div className={`w-5 h-5 bg-white rounded-full transition-transform ${billingCycle === 'year' ? 'translate-x-7' : 'translate-x-0'}`} />
                    </button>
                    <span className={`text-sm font-medium ${billingCycle === 'year' ? 'text-primary' : 'text-text-muted'}`}>Yearly <span className="text-accent text-xs">(2 Months Free)</span></span>
                </div>

                {fetchError && <p className="text-center text-error mb-8">{fetchError}</p>}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                    {displayPlans.map((plan) => {
                        const isCurrent = profile?.plan === plan.code;
                        const isMonthlyOnly = billingCycle === 'year' && plan.interval === 'month' && plan.code !== 'free';

                        return (
                            <div key={plan.code} className={`card relative flex flex-col ${isCurrent ? 'border-2 border-primary' : plan.code.includes('essential') ? 'border-2 border-aqua' : ''} ${isMonthlyOnly ? 'opacity-70 grayscale-[0.5]' : ''}`}>
                                {isCurrent && (
                                    <div className="absolute top-[-12px] left-1/2 -translate-x-1/2 bg-primary text-white px-4 py-1 rounded-xl text-xs font-semibold">
                                        CURRENT PLAN
                                    </div>
                                )}
                                {!isCurrent && plan.code.includes('essential') && billingCycle === 'month' && (
                                    <div className="absolute top-[-12px] left-1/2 -translate-x-1/2 bg-aqua text-white px-4 py-1 rounded-xl text-xs font-semibold">
                                        POPULAR
                                    </div>
                                )}
                                
                                <div className="card-header">
                                    <h3>{plan.name}</h3>
                                    <div className="text-3xl font-bold text-royal-purple my-4">
                                        ${plan.amount_cents / 100}
                                        <span className="text-base font-normal">/{plan.interval}</span>
                                    </div>
                                    {plan.description && <p className="text-sm text-text-secondary mb-4 min-h-[40px]">{plan.description}</p>}
                                    {isMonthlyOnly && <p className="text-xs text-orange-400 font-semibold mb-2">Monthly Only (No Annual Discount)</p>}
                                </div>
                                <div className="card-body flex-grow">
                                    <ul className="list-none p-0 text-sm space-y-2">
                                        {plan.features.map((feature, idx) => (
                                            <li key={idx} className="flex gap-2">
                                                <span className="text-primary">✓</span> 
                                                <span>{feature}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="card-footer mt-6">
                                    <button
                                        onClick={() => handlePlanSelect(plan.code)}
                                        disabled={!!loading || (isCurrent && plan.code === 'free')}
                                        className={`btn w-full ${isCurrent ? 'btn-primary' : plan.code === 'free' ? 'btn-outline' : plan.code.includes('essential') ? 'btn-accent' : 'btn-primary'}`}
                                    >
                                        <BtnText plan={plan.code} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Feature Comparison */}
                <div className="glass-panel mb-12">
                    <h2 className="text-center mb-12">
                        Feature Comparison
                    </h2>
                    <div className="overflow-x-auto">
                        <table className="table w-full text-center">
                            <thead>
                                <tr>
                                    <th className="text-left">Feature</th>
                                    <th>Free</th>
                                    <th>Essential</th>
                                    <th>Pro</th>
                                    <th>Ultimate</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="text-left"><strong>Traditional Accounts</strong></td>
                                    <td>2</td>
                                    <td>3</td>
                                    <td>5</td>
                                    <td>20</td>
                                </tr>
                                <tr>
                                    <td className="text-left"><strong>Investment Accounts</strong></td>
                                    <td>1</td>
                                    <td>2</td>
                                    <td>5</td>
                                    <td>20</td>
                                </tr>
                                <tr>
                                    <td className="text-left"><strong>Web3 Wallets</strong></td>
                                    <td>1</td>
                                    <td>1</td>
                                    <td>5</td>
                                    <td>20</td>
                                </tr>
                                <tr>
                                    <td className="text-left"><strong>CEX Accounts</strong></td>
                                    <td>1</td>
                                    <td>3</td>
                                    <td>10</td>
                                    <td>20</td>
                                </tr>
                                <tr>
                                    <td className="text-left"><strong>AI Queries/Day</strong></td>
                                    <td>20</td>
                                    <td>30</td>
                                    <td>40</td>
                                    <td>200</td>
                                </tr>
                                <tr>
                                    <td className="text-left"><strong>Data Retention</strong></td>
                                    <td>45 days</td>
                                    <td>Current + Prev Year</td>
                                    <td>Full history</td>
                                    <td>Full history</td>
                                </tr>
                                <tr>
                                    <td className="text-left"><strong>Sync Cadence</strong></td>
                                    <td>Manual (10/day)</td>
                                    <td>Daily automated</td>
                                    <td>Faster scheduled</td>
                                    <td>Faster scheduled</td>
                                </tr>
                                <tr>
                                    <td className="text-left"><strong>Family Features</strong></td>
                                    <td>—</td>
                                    <td>—</td>
                                    <td>—</td>
                                    <td>✓</td>
                                </tr>
                                <tr>
                                    <td className="text-left"><strong>Free Trial</strong></td>
                                    <td>—</td>
                                    <td>—</td>
                                    <td>7 days</td>
                                    <td>—</td>
                                </tr>
                                <tr>
                                    <td className="text-left"><strong>Developer Marketplace</strong></td>
                                    <td>No Access</td>
                                    <td>No Access</td>
                                    <td>Full access</td>
                                    <td>Full access</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* FAQ */}
                <div className="glass-panel">
                    <h2 className="text-center mb-8">
                        Frequently Asked Questions
                    </h2>
                    <div className="max-w-[800px] mx-auto">
                        <div className="mb-6">
                            <h3>Can I change plans later?</h3>
                            <p>
                                Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately, and billing is
                                prorated.
                            </p>
                        </div>
                        <div className="mb-8">
                            <h3>What payment methods do you accept?</h3>
                            <p>
                                We accept all major credit cards and process payments securely through Stripe. For Texas-based customers,
                                we collect and remit Texas sales tax on 80% of the subscription fee.
                            </p>
                        </div>
                        <div className="mb-8">
                            <h3>Is my financial data secure?</h3>
                            <p>
                                Yes. We use bank-level encryption, read-only account access, and comply with GLBA and GDPR requirements.
                                We never move your money or initiate transactions.
                            </p>
                        </div>
                        <div className="mb-8">
                            <h3>What happens to my data if I cancel?</h3>
                            <p>
                                You can export your data at any time. After cancellation, your data is retained according to your tier&apos;s
                                retention policy, then securely deleted per our Privacy Policy.
                            </p>
                        </div>
                        <div className="mb-8">
                            <h3>Do you offer refunds?</h3>
                            <p>
                                Subscription fees are non-refundable except as required by law. Pro Tier includes a 7-day free trial so
                                you can try before committing.
                            </p>
                        </div>
                    </div>
                </div>

                {/* CTA */}
                <div className="text-center mt-16">
                    <h2 className="mb-8">Ready to Get Started?</h2>
                    <Link to="/signup" className="btn btn-primary btn-lg">
                        Create Your Free Account
                    </Link>
                    <p className="mt-4 text-sm text-[var(--text-muted)]">
                        No credit card required. Start with the Free tier and upgrade when you&apos;re ready.
                    </p>
                </div>
            </section >
        </div >
    )
}
