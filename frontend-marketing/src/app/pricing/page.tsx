/**
 * Pricing page with animated plans, comparison matrix, and FAQs.
 */
'use client'

import { useState, useEffect } from 'react'
import { motion } from '@/lib/motion'
import { Check, Minus, Zap, Shield, Globe, Database, Users, Star } from 'lucide-react'

interface SubscriptionPlan {
  code: string
  name: string
  description: string | null
  amount_cents: number
  currency: string
  interval: string
  features: string[]
}

const PLAN_FEATURE_OVERRIDES: Record<string, string[]> = {
  free: [
    '3 traditional accounts (Plaid)',
    '1 web3 wallet',
    '1 CEX account',
    '10 AI queries/day',
    'Transaction history: last 45 days',
  ],
  essential_monthly: [
    '5 traditional accounts (Plaid)',
    '1 web3 wallet',
    '1 CEX account',
    '30 AI queries/day',
    'Transaction history: rolling 365 days',
  ],
  pro_monthly: [
    '10 traditional accounts (Plaid)',
    '2 web3 wallets',
    '3 CEX accounts',
    '40 AI queries/day',
    'Marketplace access',
    '14-day free trial',
  ],
  pro_annual: ['Everything in Pro Monthly', 'Save $50/year', '14-day free trial'],
  ultimate_monthly: [
    '40 traditional accounts (Plaid)',
    '8 web3 wallets',
    '5 CEX accounts',
    '80 AI queries/day',
    'Family features (4 members)',
    '14-day free trial',
  ],
  ultimate_annual: ['Everything in Ultimate Monthly', 'Save $120/year', 'Family features (4 members)', '14-day free trial'],
}

const comparisonRows = [
  { label: 'Traditional Accounts (via Plaid)', free: '3', essential: '5', pro: '10', ultimate: '40', icon: Globe },
  { label: 'Web3 Wallets', free: '1', essential: '1', pro: '2', ultimate: '8', icon: Database },
  { label: 'CEX Accounts', free: '1', essential: '1', pro: '3', ultimate: '5', icon: Shield },
  { label: 'AI Queries/Day', free: '10', essential: '30', pro: '40', ultimate: '80', icon: Zap },
  { label: 'Transaction History', free: '45 days', essential: '365 days', pro: 'All-time', ultimate: 'All-time', icon: Database },
  { label: 'Family Features', free: false, essential: false, pro: false, ultimate: '4 members', icon: Users },
  { label: 'Free Trial', free: false, essential: false, pro: '14 days', ultimate: '14 days', icon: Star },
]

const fallbackPlans: SubscriptionPlan[] = [
  {
    code: 'free',
    name: 'Free',
    description: 'Great for first-time visibility across your money.',
    amount_cents: 0,
    currency: 'USD',
    interval: 'month',
    features: PLAN_FEATURE_OVERRIDES.free,
  },
  {
    code: 'essential_monthly',
    name: 'Essential',
    description: 'For people serious about ongoing planning and optimization.',
    amount_cents: 1200,
    currency: 'USD',
    interval: 'month',
    features: PLAN_FEATURE_OVERRIDES.essential_monthly,
  },
  {
    code: 'pro_monthly',
    name: 'Pro',
    description: 'Advanced workflows for builders and active investors.',
    amount_cents: 2500,
    currency: 'USD',
    interval: 'month',
    features: PLAN_FEATURE_OVERRIDES.pro_monthly,
  },
  {
    code: 'pro_annual',
    name: 'Pro Annual',
    description: 'Everything in Pro, billed yearly with savings.',
    amount_cents: 25000,
    currency: 'USD',
    interval: 'year',
    features: PLAN_FEATURE_OVERRIDES.pro_annual,
  },
  {
    code: 'ultimate_monthly',
    name: 'Ultimate',
    description: 'Full command mode for households and complex portfolios.',
    amount_cents: 6000,
    currency: 'USD',
    interval: 'month',
    features: PLAN_FEATURE_OVERRIDES.ultimate_monthly,
  },
  {
    code: 'ultimate_annual',
    name: 'Ultimate Annual',
    description: 'Everything in Ultimate, billed yearly with savings.',
    amount_cents: 60000,
    currency: 'USD',
    interval: 'year',
    features: PLAN_FEATURE_OVERRIDES.ultimate_annual,
  },
]

const faqs = [
  {
    q: 'Can I change plans later?',
    a: 'Yes. You can upgrade or downgrade at any time. Plan changes apply immediately and billing is prorated where applicable.',
  },
  {
    q: 'What payment methods do you accept?',
    a: 'All major credit cards are supported via Stripe. Texas residents are taxed on 80% of subscription charges based on data-processing exemption treatment.',
  },
  {
    q: 'Is my financial data secure?',
    a: 'Yes. JuaLuma uses bank-level encryption and read-only access patterns. The platform never initiates money movement on your behalf.',
  },
  {
    q: 'What happens if I cancel?',
    a: 'You keep access through the end of your billing cycle. Data handling and retention follow legal and privacy policy requirements.',
  },
]

export default function Pricing() {
  const [billingCycle, setBillingCycle] = useState<'month' | 'year'>('month')
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (typeof window === 'undefined') {
      setLoading(false)
      return
    }

    const fetchPlans = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 2000)

        const response = await fetch(`${apiUrl}/api/billing/plans`, {
          signal: controller.signal,
          mode: 'cors',
          credentials: 'omit',
          headers: { Accept: 'application/json' },
        })
        clearTimeout(timeoutId)

        if (response.ok) {
          const data = await response.json()
          setPlans(data)
          setLoading(false)
          return
        }
      } catch {
        // Fallback below is expected for local/offline marketing previews.
      }

      setPlans(fallbackPlans)
      setLoading(false)
    }

    fetchPlans()
  }, [])

  const displayPlans = plans
    .filter((p) => {
      if (p.code === 'free') return true
      if (p.code === 'essential_monthly') return true
      return p.interval === billingCycle
    })
    .sort((a, b) => a.amount_cents - b.amount_cents)

  const getPlanCode = (plan: SubscriptionPlan) => {
    if (plan.code === 'free') return 'free'
    if (plan.code === 'essential_monthly') return 'essential'
    if (plan.code.includes('pro')) return 'pro'
    if (plan.code.includes('ultimate')) return 'ultimate'
    return plan.code
  }

  const getPlanSubtitle = (planCode: string) => {
    if (planCode === 'free') return 'Money Basics'
    if (planCode.includes('essential')) return 'Level Up'
    if (planCode.includes('pro')) return 'Wealth Builder'
    if (planCode.includes('ultimate')) return 'Household HQ'
    return null
  }

  const getButtonText = (plan: SubscriptionPlan) => {
    if (plan.code === 'free') return 'Get Started'
    if (plan.code.includes('pro') || plan.code.includes('ultimate')) return 'Start Free Trial'
    return 'Go Essential'
  }

  const getDisplayFeatures = (plan: SubscriptionPlan) => PLAN_FEATURE_OVERRIDES[plan.code] ?? plan.features

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
    return { display: `$${amount}`, period: '/month', equivalent: null }
  }

  const renderCell = (value: string | boolean) => {
    if (value === true) return <Check className="w-4 h-4 mx-auto text-primary" />
    if (value === false) return <Minus className="w-4 h-4 mx-auto text-text-muted" />
    return value
  }

  return (
    <div className="pb-10 md:pb-14">
      <section className="py-12 md:py-16 text-center">
        <p className="marketing-chip mx-auto mb-5">
          <span className="signal-dot" />
          Flexible growth pricing
        </p>
        <h1 className="text-4xl md:text-6xl mb-4">Choose the level of financial command you need.</h1>
        <p className="text-lg text-text-secondary max-w-3xl mx-auto">
          Start free. Upgrade when your portfolio, household, or workflow complexity grows.
        </p>
      </section>

      <section className="flex justify-center items-center gap-4 mb-10">
        <span className={`text-sm font-medium ${billingCycle === 'month' ? 'text-text-primary' : 'text-text-muted'}`}>Monthly</span>
        <button
          onClick={() => setBillingCycle(billingCycle === 'month' ? 'year' : 'month')}
          className={`w-14 h-7 rounded-full p-1 transition-colors ${billingCycle === 'year' ? 'bg-primary' : 'bg-slate-600'}`}
          aria-label="Toggle billing cycle"
        >
          <div className={`w-5 h-5 bg-white rounded-full transition-transform ${billingCycle === 'year' ? 'translate-x-7' : 'translate-x-0'}`} />
        </button>
        <span className={`text-sm font-medium ${billingCycle === 'year' ? 'text-text-primary' : 'text-text-muted'}`}>
          Yearly <span className="text-accent text-xs">(2 months free)</span>
        </span>
      </section>

      {loading ? (
        <div className="text-center py-12 text-text-secondary">Loading pricing plans...</div>
      ) : (
        <>
          <section className="grid md:grid-cols-2 xl:grid-cols-4 gap-5 mb-10">
            {displayPlans.map((plan, index) => {
              const isFeatured = plan.code.includes('pro')
              const priceInfo = formatPrice(plan.amount_cents, plan.interval)
              const planCode = getPlanCode(plan)

              return (
                <motion.article
                  key={plan.code}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.25 }}
                  transition={{ duration: 0.45, delay: index * 0.06 }}
                  className={`glass-panel relative flex flex-col ${isFeatured ? 'ring-1 ring-primary/60' : ''}`}
                >
                  {isFeatured && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-text-inverse px-3 py-1 rounded-full text-[10px] uppercase tracking-[0.16em] font-bold">
                      Most Chosen
                    </div>
                  )}

                  <p className="text-sm uppercase tracking-[0.14em] text-text-muted mb-2">{getPlanSubtitle(plan.code)}</p>
                  <h2 className="text-3xl mb-3">{plan.name}</h2>
                  <p className="text-text-secondary text-sm min-h-[40px]">{plan.description}</p>

                  <div className="my-5">
                    <span className="text-4xl font-semibold">{priceInfo.display}</span>
                    <span className="text-text-secondary ml-1">{priceInfo.period}</span>
                    {priceInfo.equivalent && <p className="text-sm text-text-muted mt-1">{priceInfo.equivalent}</p>}
                  </div>

                  <ul className="space-y-2.5 mb-7 text-sm text-text-secondary flex-grow">
                    {getDisplayFeatures(plan).map((feature) => (
                      <li key={`${plan.code}-${feature}`} className="flex items-start gap-2">
                        <span className="mt-1 h-2 w-2 rounded-full bg-gradient-to-r from-primary to-secondary" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <a href={`http://localhost:5175/signup?plan=${planCode}${plan.interval === 'year' ? '_annual' : ''}`} className={isFeatured ? 'btn w-full' : 'btn btn-secondary w-full'}>
                    {getButtonText(plan)}
                  </a>
                </motion.article>
              )
            })}
          </section>

          <section className="glass-panel mb-10 overflow-hidden">
            <h2 className="text-center mb-7 text-3xl">Feature Comparison</h2>
            <div className="overflow-x-auto pb-2">
              <table className="w-full min-w-[760px] text-sm border-collapse">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left p-3">Capability</th>
                    <th className="p-3">Free</th>
                    <th className="p-3">Essential</th>
                    <th className="p-3">Pro</th>
                    <th className="p-3">Ultimate</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row) => (
                    <tr key={row.label} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="p-3 text-text-primary">
                        <div className="flex items-center gap-2">
                          <row.icon className="w-4 h-4 text-text-muted" />
                          {row.label}
                        </div>
                      </td>
                      <td className="p-3 text-center text-text-secondary">{renderCell(row.free)}</td>
                      <td className="p-3 text-center text-text-secondary">{renderCell(row.essential)}</td>
                      <td className="p-3 text-center text-primary font-semibold">{renderCell(row.pro)}</td>
                      <td className="p-3 text-center text-text-secondary">{renderCell(row.ultimate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="glass-panel mb-10">
            <h2 className="text-center mb-8 text-3xl">Pricing FAQ</h2>
            <div className="grid md:grid-cols-2 gap-5">
              {faqs.map((faq, index) => (
                <motion.article
                  key={faq.q}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                  className="rounded-xl border border-white/10 bg-white/5 p-5"
                >
                  <h3 className="text-xl mb-2">{faq.q}</h3>
                  <p className="text-text-secondary mb-0">{faq.a}</p>
                </motion.article>
              ))}
            </div>
          </section>

          <section className="text-center glass-panel">
            <h2 className="text-3xl md:text-4xl mb-4">Start with Free. Scale when ready.</h2>
            <p className="text-text-secondary mb-7">No credit card required to begin your financial command center.</p>
            <a href="http://localhost:5175/signup" className="btn btn-lg">Create Your Free Account</a>
          </section>
        </>
      )}
    </div>
  )
}
