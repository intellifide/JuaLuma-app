/*
 * Copyright (c) 2026 Intellifide, LLC.
 * Licensed under PolyForm Noncommercial License 1.0.0.
 * See "PolyForm-Noncommercial-1.0.0.txt" for full text.
 *
 * COMMUNITY RIGHTS:
 * - You CAN modify this code for personal use.
 * - You CAN build and share widgets/plugins for the ecosystem.
 *
 * RESTRICTIONS:
 * - You CANNOT resell, repackage, or distribute this application for a fee.
 * - You CANNOT use this application for commercial enterprise purposes.
 */

'use client'

import { motion } from '@/lib/motion'
import { APP_URL } from '@/lib/constants'

const featureStories = [
  {
    title: 'Unified Asset Graph',
    subtitle: 'Traditional finance, crypto, and real assets in one normalized view.',
    bullets: [
      'Bank, card, brokerage, wallet, and manual account ingestion',
      'Cross-account timeline for balances, cash flow, and net worth deltas',
      'Clear account typing to isolate specific risk buckets',
    ],
    tag: 'Aggregation',
  },
  {
    title: 'AI Financial Assistant',
    subtitle: 'Context-aware analysis over your actual transactions, not generic advice.',
    bullets: [
      'Natural language Q&A tied directly to transaction history',
      'Model routing: free uses gpt-oss-120b, paid uses gemini-2.5-flash with paid-capacity fallback',
      'Supported file context uploads: docs, sheets, slides, images, JSON/XML (unsupported files rejected)',
      'Anomaly detection for spending spikes and recurring drifts',
      'Insight cards with explainable “what changed” narratives',
    ],
    tag: 'Intelligence',
  },
  {
    title: 'Household Command Mode',
    subtitle: 'Support personal and family scopes without losing data ownership boundaries.',
    bullets: [
      'Role-aware visibility across household members',
      'Scoped transaction review and collaboration workflows',
      'Plan-based capabilities for premium family analytics',
    ],
    tag: 'Collaboration',
  },
]

const statCards = [
  { label: 'Data Connectors', value: '12,000+', note: 'Plaid institutions + account abstractions' },
  { label: 'Asset Classes', value: '6+', note: 'Cash, investments, crypto, real estate, liabilities, manual' },
  { label: 'Coverage', value: 'Traditional + Web3', note: 'Unified view across bank, brokerage, wallet, and manual accounts' },
  { label: 'Modes', value: 'Personal + Family', note: 'Independent controls and visibility layers' },
]

function AggregationReplica() {
  return (
    <div className="replica-shell rounded-2xl p-4 md:p-5 min-h-[280px]">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="card gap-2">
          <h4 className="text-sm text-text-muted mb-0">Net Worth</h4>
          <p className="text-xs text-text-muted mb-0">Period: Last 30 days</p>
          <p className="text-2xl font-bold text-primary mb-0">$638,240</p>
          <p className="text-xs text-text-muted mb-0">Assets $1.05M • Liabilities $412k</p>
          <p className="text-xs text-emerald-400 mb-0">Up $12.7k in Last 30 days</p>
        </div>

        <div className="card gap-2">
          <h4 className="text-sm text-text-muted mb-0">Cash Flow</h4>
          <p className="text-xs text-text-muted mb-0">Period: Last 30 days</p>
          <p className="text-2xl font-bold text-emerald-400 mb-0">+$3,180</p>
          <p className="text-xs text-text-muted mb-0">In $11,450 • Out $8,270</p>
        </div>

        <div className="card gap-2">
          <h4 className="text-sm text-text-muted mb-0">Budget Status</h4>
          <p className="text-xs text-text-muted mb-0">Based on budget period logic</p>
          <p className="text-2xl font-bold text-primary mb-0">72%</p>
          <p className="text-xs text-text-muted mb-0">$5.8k of $8.0k spent</p>
          <div className="replica-progress-track w-full rounded-full h-2">
            <div className="h-2 rounded-full bg-primary" style={{ width: '72%' }} />
          </div>
        </div>

        <div className="card gap-2">
          <h4 className="text-sm text-text-muted mb-0">Linked Accounts</h4>
          <p className="text-xs text-text-muted mb-0">As of today</p>
          <p className="text-2xl font-bold text-primary mb-0">21</p>
          <p className="text-xs text-text-muted mb-0">Checking 5 • Savings 4 • Brokerage 3 • +more</p>
        </div>
      </div>
    </div>
  )
}

function IntelligenceReplica() {
  return (
    <div className="replica-shell rounded-2xl p-4 md:p-5 min-h-[280px]">
      <div className="grid grid-cols-1 gap-3">
        <div className="card gap-3">
          <div>
            <h4 className="text-base font-semibold mb-0">Spending Health</h4>
            <p className="text-xs text-text-muted mb-0">Period: Last 30 days</p>
          </div>
          <p className="text-xl font-semibold text-primary mb-0">Stable</p>
          <p className="text-xs text-text-muted mb-0">Spending is within expected range against income.</p>
          <div className="h-2 rounded-full" style={{ background: 'linear-gradient(90deg, rgba(244,63,94,0.85) 0%, rgba(251,191,36,0.85) 50%, rgba(34,197,94,0.85) 100%)' }} />
        </div>

        <div className="card gap-2">
          <h4 className="text-base font-semibold mb-0">Top Money Drivers</h4>
          <p className="text-xs text-text-muted mb-0">Period: Last 30 days</p>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-text-secondary">Housing</span><span className="font-semibold">$2,140</span></div>
            <div className="flex justify-between"><span className="text-text-secondary">Dining</span><span className="font-semibold">$860</span></div>
            <div className="flex justify-between"><span className="text-text-secondary">Transport</span><span className="font-semibold">$520</span></div>
          </div>
          <p className="text-xs text-text-muted mb-0">Total spend $8,270</p>
        </div>

        <div className="card gap-2">
          <h4 className="text-base font-semibold mb-0">Anomaly Watch</h4>
          <p className="text-xs text-text-muted mb-0">Period: Last 30 days</p>
          <div className="alert-soft rounded-lg px-3 py-2 text-sm">
            <p className="font-semibold mb-0">Dining spend elevated</p>
            <p className="alert-soft-muted text-xs mb-0">Weekend delivery spend is 18% above baseline.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function CollaborationReplica() {
  return (
    <div className="replica-shell rounded-2xl p-4 md:p-5 min-h-[280px]">
      <div className="replica-toggle flex border rounded-lg p-1 w-fit mb-3">
        <button className="px-3 py-1 text-sm rounded-md bg-primary text-white shadow font-medium">Personal</button>
        <button className="px-3 py-1 text-sm rounded-md text-text-muted">Family</button>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <div className="card gap-2">
          <h4 className="text-base font-semibold mb-0">Goals Tracker</h4>
          <p className="text-xs text-text-muted mb-0">As of today</p>
          <div className="space-y-2 text-sm">
            <div>
              <div className="flex justify-between text-xs text-text-secondary mb-1"><span>Emergency Fund</span><span>$9.2k / $12k</span></div>
              <div className="replica-progress-track w-full rounded-full h-2"><div className="h-2 rounded-full bg-primary" style={{ width: '77%' }} /></div>
            </div>
            <div>
              <div className="flex justify-between text-xs text-text-secondary mb-1"><span>Debt Payoff</span><span>$6.1k / $15k</span></div>
              <div className="replica-progress-track w-full rounded-full h-2"><div className="h-2 rounded-full bg-primary" style={{ width: '41%' }} /></div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="card gap-2">
            <h4 className="text-sm text-text-muted mb-0">Asset Snapshot</h4>
            <p className="text-xs text-text-muted mb-0">Assets (today)</p>
            <p className="text-sm text-text-secondary mb-0">Real estate 65% • Cash 12% • Brokerage 17% • Crypto 6%</p>
          </div>
          <div className="card gap-2">
            <h4 className="text-sm text-text-muted mb-0">Debt Snapshot</h4>
            <p className="text-xs text-text-muted mb-0">Liabilities (today)</p>
            <p className="text-sm text-text-secondary mb-0">Mortgage 82% • Credit cards 10% • Loans 8%</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Features() {
  return (
    <div className="pb-12 md:pb-16">
      <section className="relative py-12 md:py-16">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-6xl leading-[1.05] mb-5">
            Features built for real-world financial complexity.
          </h1>
          <p className="text-lg md:text-xl text-text-secondary">
            Every module is designed to reduce friction between raw account data and high-confidence decisions.
          </p>
        </div>
      </section>

      <section className="grid md:grid-cols-2 gap-5 mb-8">
        {statCards.map((card, idx) => (
          <motion.article
            key={card.label}
            className="glass-panel"
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.45, delay: idx * 0.07 }}
          >
            <p className="text-sm text-text-secondary mb-2">{card.label}</p>
            <h2 className="text-3xl md:text-4xl mb-1">{card.value}</h2>
            <p className="text-sm text-text-muted mb-0">{card.note}</p>
          </motion.article>
        ))}
      </section>

      <section className="space-y-6 md:space-y-8">
        {featureStories.map((story, idx) => (
          <motion.article
            key={story.title}
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5, delay: idx * 0.08 }}
            className="glass-panel grid lg:grid-cols-[1.1fr_1fr] gap-6 md:gap-8 items-center"
          >
            <div>
              <p className="text-sm uppercase tracking-[0.14em] text-text-muted mb-3">{story.tag}</p>
              <h2 className="text-3xl md:text-4xl mb-4">{story.title}</h2>
              <p className="text-lg text-text-secondary leading-relaxed mb-6">{story.subtitle}</p>
              <ul className="space-y-3">
                {story.bullets.map((point) => (
                  <li key={point} className="flex items-start gap-3 text-text-secondary">
                    <span className="mt-1.5 h-2.5 w-2.5 rounded-full bg-gradient-to-r from-primary to-secondary" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>

            {story.tag === 'Aggregation' ? <AggregationReplica /> : null}
            {story.tag === 'Intelligence' ? <IntelligenceReplica /> : null}
            {story.tag === 'Collaboration' ? <CollaborationReplica /> : null}
          </motion.article>
        ))}
      </section>

      <section className="pt-12 md:pt-16">
        <div className="glass-panel text-center">
          <h2 className="text-3xl md:text-5xl mb-4">See it with your own data.</h2>
          <p className="text-lg text-text-secondary max-w-2xl mx-auto mb-8">
            Start free, connect what you already use, and evaluate how quickly JuaLuma turns disconnected records into a coherent strategy.
          </p>
          <a href={`${APP_URL}/signup`} className="btn btn-lg">
            Start Exploring Features
          </a>
        </div>
      </section>
    </div>
  )
}
