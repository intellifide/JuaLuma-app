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

import Link from 'next/link'
import { motion, type Variants } from '@/lib/motion'

const container: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.08,
    },
  },
}

const item: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
}

const timeline = [
  {
    title: 'Connect your accounts',
    body: 'Sync banks, brokerages, wallets, and manual assets in one place with clear ownership and account-type controls.',
  },
  {
    title: 'Watch balances normalize',
    body: 'We convert data into one timeline so your net worth trend, allocation shifts, and monthly changes are instantly readable.',
  },
  {
    title: 'Act on AI insights',
    body: 'Get spending anomalies, category drifts, and “what changed” summaries tied directly to real transactions.',
  },
]

export default function Home() {
  return (
    <div className="overflow-x-hidden pb-16">
      <section className="relative pt-14 pb-24 md:pt-20 md:pb-28">
        <div className="floating-orb -top-24 -left-20 bg-secondary/30" />
        <div className="floating-orb top-8 -right-20 bg-primary/35" style={{ animationDelay: '-8s' }} />

        <motion.div className="relative z-10" variants={container} initial="hidden" animate="show">
          <motion.h1 variants={item} className="text-center text-4xl md:text-6xl xl:text-7xl max-w-5xl mx-auto leading-[1.04]">
            Build a living map of your money.
            <span className="block mt-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Not just another static dashboard.
            </span>
          </motion.h1>

          <motion.p variants={item} className="text-center text-lg md:text-xl text-text-secondary max-w-3xl mx-auto mt-6 mb-10">
            JuaLuma aggregates traditional finance, crypto, and real-world assets into one clear, visual overview with feature replicas of the actual workflow.
          </motion.p>

          <motion.div variants={item} className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="http://localhost:5175/signup" className="btn btn-lg">
              Start Free Trial
            </a>
            <Link href="/features" className="btn btn-lg btn-secondary">
              See Feature Stories
            </Link>
          </motion.div>

          <motion.div variants={item} className="mt-14 md:mt-16 glass-panel max-w-6xl mx-auto p-4 md:p-6">
            <div className="replica-shell rounded-2xl overflow-hidden p-4 md:p-5">
              <div className="replica-divider px-1 pb-4 border-b flex flex-wrap gap-3 items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-text-primary">Wealth Builder Preview</span>
                  <span className="text-xs text-text-muted">Financial overview demo inspired by live dashboard cards</span>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
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
          </motion.div>
        </motion.div>
      </section>

      <section className="py-16 md:py-20">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-5xl">From scattered data to confident decisions</h2>
          <p className="max-w-2xl mx-auto text-lg text-text-secondary">
            The app is built for people managing real complexity: multiple accounts, multiple asset classes, and multiple stakeholders.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {timeline.map((step, index) => (
            <motion.article
              key={step.title}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, delay: index * 0.07 }}
              className="glass-panel relative"
            >
              <h3 className="text-xl md:text-2xl">{step.title}</h3>
              <p className="text-text-secondary leading-relaxed">{step.body}</p>
            </motion.article>
          ))}
        </div>
      </section>

      <section className="pt-6 md:pt-10 pb-4">
        <div className="glass-panel text-center">
          <h2 className="text-3xl md:text-5xl mb-4">Ready to see your financial system in motion?</h2>
          <p className="max-w-2xl mx-auto text-lg mb-8">
            Start with your current accounts and grow into forecasting, household collaboration, and AI-powered optimization.
          </p>
          <a href="http://localhost:5175/signup" className="btn btn-lg">
            Create Free Account
          </a>
        </div>
      </section>
    </div>
  )
}
