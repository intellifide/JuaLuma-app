'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface SubscriptionPlan {
    code: string
    name: string
    description: string | null
    amount_cents: number
    currency: string
    interval: string
    features: string[]
}

export default function Pricing() {
    const [billingCycle, setBillingCycle] = useState<'month' | 'year'>('month')
    const [plans, setPlans] = useState<SubscriptionPlan[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // Only run on client side
        if (typeof window === 'undefined') {
            setLoading(false)
            return
        }

        const fetchPlans = async () => {
            // Static fallback plans - used when API is unavailable
            const fallbackPlans: SubscriptionPlan[] = [
                    {
                        code: 'free',
                        name: 'Free',
                        description: 'Basic accounts and tracking',
                        amount_cents: 0,
                        currency: 'USD',
                        interval: 'month',
                        features: [
                            '2 Traditional Accounts',
                            '1 Investment Account',
                            '1 Web3 Wallet',
                            '1 CEX Account',
                            '20 AI Queries/Day'
                        ]
                    },
                    {
                        code: 'essential_monthly',
                        name: 'Essential',
                        description: 'For serious personal finance management',
                        amount_cents: 1200,
                        currency: 'USD',
                        interval: 'month',
                        features: [
                            '3 Traditional Accounts',
                            '2 Investment Accounts',
                            '1 Web3 Wallet',
                            '3 CEX Accounts',
                            '30 AI Queries/Day'
                        ]
                    },
                    {
                        code: 'pro_monthly',
                        name: 'Pro',
                        description: 'Professional tools for wealth builders',
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
                            '14-Day Free Trial'
                        ]
                    },
                    {
                        code: 'pro_annual',
                        name: 'Pro Annual',
                        description: 'Professional tools - 2 Months Free',
                        amount_cents: 25000,
                        currency: 'USD',
                        interval: 'year',
                        features: [
                            'Everything in Pro Monthly',
                            'Save $50/year',
                            '14-Day Free Trial'
                        ]
                    },
                    {
                        code: 'ultimate_monthly',
                        name: 'Ultimate',
                        description: 'The complete financial operating system',
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
                            '14-Day Free Trial'
                        ]
                    },
                    {
                        code: 'ultimate_annual',
                        name: 'Ultimate Annual',
                        description: 'Ultimate power - 2 Months Free',
                        amount_cents: 60000,
                        currency: 'USD',
                        interval: 'year',
                        features: [
                            'Everything in Ultimate Monthly',
                            'Save $120/year',
                            'Family Features Included',
                            '14-Day Free Trial'
                        ]
                    }
                ]

            // Try to fetch plans from API, but silently fallback if unavailable
            // Note: If you see CORS errors, ensure the marketing site URL is added to BACKEND_CORS_ORIGINS
            // in the backend .env file (e.g., BACKEND_CORS_ORIGINS=http://localhost:5175,http://localhost:3000)
            try {
                // Backend runs on port 8001 by default
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'
                
                // Use a short timeout to avoid hanging
                const controller = new AbortController()
                const timeoutId = setTimeout(() => controller.abort(), 2000)
                
                const response = await fetch(`${apiUrl}/api/billing/plans`, {
                    signal: controller.signal,
                    mode: 'cors',
                    credentials: 'omit', // Don't send credentials for CORS
                    headers: {
                        'Accept': 'application/json',
                    },
                })
                
                clearTimeout(timeoutId)
                
                if (response && response.ok) {
                    const data = await response.json()
                    setPlans(data)
                    setLoading(false)
                    return
                }
            } catch (err: any) {
                // Only log non-network errors (like parsing errors)
                // Network errors (connection refused, CORS, etc.) are expected and handled silently
                if (err?.name !== 'AbortError' && !err?.message?.includes('fetch')) {
                    console.warn('Unexpected error fetching plans:', err)
                }
            }
            
            // Use fallback plans if API fails or isn't available
            // This is the expected behavior when the backend isn't running
            setPlans(fallbackPlans)
            setLoading(false)
        }

        fetchPlans()
    }, [])

    const displayPlans = plans.filter(p => {
        if (p.code === 'free') return true
        if (p.code === 'essential_monthly') return true // Essential is monthly only
        return p.interval === billingCycle
    }).sort((a, b) => a.amount_cents - b.amount_cents)

    const getPlanCode = (plan: SubscriptionPlan) => {
        if (plan.code === 'free') return 'free'
        if (plan.code === 'essential_monthly') return 'essential'
        if (plan.code.includes('pro')) return 'pro'
        if (plan.code.includes('ultimate')) return 'ultimate'
        return plan.code
    }

    const getButtonText = (plan: SubscriptionPlan) => {
        if (plan.code === 'free') return 'Get Started'
        if (plan.code.includes('pro') || plan.code.includes('ultimate')) return 'Start Free Trial'
        return 'Go Essential'
    }

    const getButtonClass = (plan: SubscriptionPlan) => {
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
                equivalent: `$${monthlyEquivalent.toFixed(2)}/month`
            }
        }
        return {
            display: `$${amount}`,
            period: '/month',
            equivalent: null
        }
    }

    return (
        <div className="container mx-auto px-4 py-12">
            <h1 className="text-center mb-4">Pricing Plans</h1>
            <p className="text-center text-lg text-text-secondary mb-8 max-w-[700px] mx-auto">
                Start free and upgrade when you need more features. All plans include bank-level security and read-only account access.
            </p>

            {/* Monthly/Annual Toggle */}
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

            {loading ? (
                <div className="text-center py-12">
                    <p className="text-text-secondary">Loading pricing plans...</p>
                </div>
            ) : (
                <>
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto mb-12">
                        {displayPlans.map((plan) => {
                            const isMonthlyOnly = billingCycle === 'year' && plan.interval === 'month' && plan.code !== 'free'
                            const priceInfo = formatPrice(plan.amount_cents, plan.interval)
                            const planCode = getPlanCode(plan)

                            return (
                                <div
                                    key={plan.code}
                                    className={`glass-panel flex flex-col items-center text-center border-t-4 ${
                                        plan.code === 'free' ? 'border-t-gray-400' :
                                        plan.code.includes('essential') ? 'border-t-blue-500' :
                                        plan.code.includes('pro') ? 'border-t-primary shadow-xl relative z-10' :
                                        'border-t-accent'
                                    } ${isMonthlyOnly ? 'opacity-70 grayscale-[0.5]' : ''}`}
                                >
                                    {plan.code.includes('pro') && (
                                        <div className="absolute top-[-12px] left-1/2 -translate-x-1/2 bg-primary text-white px-4 py-1 rounded-xl text-xs font-semibold">
                                            POPULAR
                                        </div>
                                    )}

                                    <h3 className={`mb-2 ${
                                        plan.code.includes('essential') ? 'text-blue-500' :
                                        plan.code.includes('pro') ? 'text-primary' :
                                        plan.code.includes('ultimate') ? 'text-accent' : ''
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

                                    <a
                                        href={`http://localhost:5175/signup?plan=${planCode}${plan.interval === 'year' ? '_annual' : ''}`}
                                        className={getButtonClass(plan)}
                                    >
                                        {getButtonText(plan)}
                                    </a>
                                </div>
                            )
                        })}
                    </div>

                    {/* Feature Comparison Table */}
                    <div className="glass-panel mb-12">
                        <h2 className="text-center mb-12">Feature Comparison</h2>
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
                                        <td>80</td>
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
                                        <td>14 days</td>
                                        <td>14 days</td>
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

                    {/* FAQ Section */}
                    <div className="glass-panel">
                        <h2 className="text-center mb-8">Frequently Asked Questions</h2>
                        <div className="max-w-[800px] mx-auto">
                            <div className="mb-6">
                                <h3 className="mb-2">Can I change plans later?</h3>
                                <p className="text-text-secondary">
                                    Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately, and billing is prorated.
                                </p>
                            </div>
                            <div className="mb-8">
                                <h3 className="mb-2">What payment methods do you accept?</h3>
                                <p className="text-text-secondary">
                                    We accept all major credit cards and process payments securely through Stripe. For Texas-based customers,
                                    we collect and remit Texas sales tax on 80% of the subscription fee.
                                </p>
                            </div>
                            <div className="mb-8">
                                <h3 className="mb-2">Is my financial data secure?</h3>
                                <p className="text-text-secondary">
                                    Yes. We use bank-level encryption, read-only account access, and comply with GLBA and GDPR requirements.
                                    We never move your money or initiate transactions.
                                </p>
                            </div>
                            <div className="mb-8">
                                <h3 className="mb-2">What happens to my data if I cancel?</h3>
                                <p className="text-text-secondary">
                                    You can export your data at any time. After cancellation, your data is retained according to your tier&apos;s
                                    retention policy, then securely deleted per our Privacy Policy.
                                </p>
                            </div>
                            <div className="mb-8">
                                <h3 className="mb-2">Do you offer refunds?</h3>
                                <p className="text-text-secondary">
                                    Subscription fees are non-refundable except as required by law. Pro and Ultimate Tiers include a 14-day free trial so
                                    you can try before committing.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* CTA Section */}
                    <div className="text-center mt-16">
                        <h2 className="mb-8">Ready to Get Started?</h2>
                        <a href="http://localhost:5175/signup" className="btn btn-primary btn-lg">
                            Create Your Free Account
                        </a>
                        <p className="mt-4 text-sm text-text-muted">
                            No credit card required. Start with the Free tier and upgrade when you&apos;re ready.
                        </p>
                    </div>
                </>
            )}
        </div>
    )
}
