/**
 * Core Purpose: Pricing page component displaying subscription plans, feature comparisons, and FAQs.
 * Last Modified: 2026-01-25T23:50:00-06:00
 */
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Check, Minus, Zap, Shield, Globe, Database, Activity, Users, Star } from 'lucide-react'

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

    const getPlanSubtitle = (planCode: string) => {
        if (planCode === 'free') return 'Money Basics'
        if (planCode.includes('essential')) return 'Level Up'
        if (planCode.includes('pro')) return 'Wealth Builder'
        if (planCode.includes('ultimate')) return 'Household HQ'
        return null
    }

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
                            '10 AI Queries/Day',
                            'Transaction History: Last 45 Days'
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
                            '1 CEX Account',
                            '30 AI Queries/Day',
                            'Transaction History: Rolling 365 Days'
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
                            '2 Web3 Wallets',
                            '3 CEX Accounts',
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
                            '8 Web3 Wallets',
                            '5 CEX Accounts',
                            '80 AI Queries/Day',
                            'Family Features (4 members total)',
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
                            'Family Features (4 members total)',
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
                                    {getPlanSubtitle(plan.code) && (
                                        <div className={`text-sm font-normal mb-4 ${
                                            plan.code === 'free' ? 'text-gray-500' :
                                            plan.code.includes('essential') ? 'text-blue-500/80' :
                                            plan.code.includes('pro') ? 'text-primary/80' :
                                            'text-accent/80'
                                        }`}>
                                            {getPlanSubtitle(plan.code)}
                                        </div>
                                    )}

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
                    <div className="glass-panel mb-12 relative overflow-hidden p-0">
                        {/* Gradient Header Background */}
                        <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
                        
                        <div className="p-8 sm:p-12">
                            <div className="text-center mb-12">
                                <h2 className="mb-4">Feature Comparison</h2>
                                <p className="text-text-secondary max-w-2xl mx-auto">
                                    Detailed breakdown of what's included in each plan so you can choose the perfect fit for your financial journey.
                                </p>
                            </div>

                            <div className="overflow-x-auto -mx-8 sm:mx-0 pb-4">
                                <table className="w-full text-sm sm:text-base border-collapse min-w-[800px]">
                                    <thead>
                                        <tr>
                                            <th className="text-left p-4 pb-8 w-1/4"></th>
                                            <th className="p-4 pb-8 text-center w-[18%]">
                                                <div className="text-xl font-bold text-gray-400 mb-1">Free</div>
                                                <div className="text-sm font-normal text-gray-500">Money Basics</div>
                                            </th>
                                            <th className="p-4 pb-8 text-center w-[18%]">
                                                <div className="text-xl font-bold text-blue-400 mb-1">Essential</div>
                                                <div className="text-sm font-normal text-blue-500/80">Level Up</div>
                                            </th>
                                            <th className="p-4 pb-8 text-center w-[18%] relative">
                                                {/* Highlight Background for Header */}
                                                <div className="absolute inset-x-2 top-0 bottom-0 bg-primary/10 rounded-t-2xl -z-10" />
                                                <div className="text-xl font-bold text-primary mb-1">Pro</div>
	                                                <div className="text-sm font-normal text-primary/80">Wealth Builder</div>
                                            </th>
                                            <th className="p-4 pb-8 text-center w-[18%]">
                                                <div className="text-xl font-bold text-accent mb-1">Ultimate</div>
	                                                <div className="text-sm font-normal text-accent/80">Household HQ</div>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-text-secondary">
                                        {[
                                            { label: 'Traditional Accounts', free: '2', essential: '3', pro: '5', ultimate: '20', icon: Globe },
                                            { label: 'Investment Accounts', free: '1', essential: '2', pro: '5', ultimate: '20', icon: Activity },
                                            { label: 'Web3 Wallets', free: '1', essential: '1', pro: '2', ultimate: '8', icon: Database },
                                            { label: 'CEX Accounts', free: '1', essential: '1', pro: '3', ultimate: '5', icon: Shield },
                                            { label: 'AI Queries/Day', free: '10', essential: '30', pro: '40', ultimate: '80', icon: Zap },
                                            { label: 'Transaction History', free: 'Last 45 Days', essential: 'Rolling 365 Days', pro: 'All-Time', ultimate: 'All-Time', icon: Database },
                                            { label: 'Family Features', free: false, essential: false, pro: false, ultimate: '4 members total', icon: Users },
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
                                                    {/* Highlight Background for Cell */}
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
                                <h3 className="mb-2">What account types does JuaLuma support?</h3>
                                <p className="text-text-secondary">
                                    Traditional accounts are standard bank accounts (checking, savings, and credit card accounts). Investment accounts are
                                    brokerage and retirement accounts that hold securities. Web3 wallets are self-custody blockchain wallet addresses, and CEX
                                    means centralized exchanges such as Coinbase, Kraken, or similar custodial trading platforms.
                                </p>
                            </div>
                            <div className="mb-8">
                                <h3 className="mb-2">What happens to my data if I cancel?</h3>
                                <p className="text-text-secondary">
                                    You can export your data at any time. Data retention and deletion are governed by legal and compliance requirements,
                                    then securely handled according to our Privacy Policy.
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
