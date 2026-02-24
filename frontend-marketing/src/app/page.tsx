/*
 * Copyright (c) 2026 Intellifide, LLC.
 * Licensed under PolyForm Noncommercial License 1.0.0.
 * See "/legal/license" for full license terms.
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
import { APP_URL } from '@/lib/constants'
import { Diamond, Link2, LineChart } from 'lucide-react'

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

const workflowCards = [
  {
    icon: Link2,
    title: 'Connect your accounts',
    body: 'Sync banks, brokerages, wallets, and manual assets in one place with clear ownership and account-type controls.',
  },
  {
    icon: LineChart,
    title: 'Watch balances normalize',
    body: 'We convert data into one timeline so your net worth trend, allocation shifts, and monthly changes are instantly readable.',
  },
  {
    icon: Diamond,
    title: 'Act on AI insights',
    body: 'Get spending anomalies, category drifts, and what changed summaries tied directly to real transactions.',
  },
]

export default function Home() {
  return (
    <div className="marketing-home-root -mx-6">
      <div className="marketing-home-bg" aria-hidden />
      <div className="marketing-home-overlay" aria-hidden />

      <div className="relative z-10 px-6 pb-8 md:pb-10">
        <motion.section
          className="marketing-hero-wrap max-w-[1460px] mx-auto"
          variants={container}
          initial="hidden"
          animate="show"
        >
          <motion.h1 variants={item} className="marketing-hero-title">Build a living map of your money.</motion.h1>
          <motion.p variants={item} className="marketing-hero-subtitle">
            Not just another static dashboard. JuaLuma aggregates traditional finance, crypto, and real-world assets into one clear, visual overview with feature replicas of the actual workflow.
          </motion.p>
          <motion.div variants={item} className="marketing-hero-ctas">
            <a href={`${APP_URL}/signup`} className="btn btn-lg marketing-primary-btn">Start Free Trial</a>
            <Link href="/features" className="btn btn-lg marketing-secondary-btn">See Feature Stories</Link>
          </motion.div>

          <motion.div variants={item} className="marketing-preview-panel">
            <h2>Wealth Builder Preview</h2>
            <p>Financial overview demo inspired by live dashboard cards.</p>
            <div className="marketing-metric-grid">
              <article className="marketing-metric-card">
                <h3>Net Worth</h3>
                <p className="marketing-metric-value positive">$638,240</p>
                <p className="marketing-metric-detail">Assets $1.00M • Liabilities $415K</p>
                <p className="marketing-metric-footnote">Up $12.7k in last 30 days</p>
              </article>

              <article className="marketing-metric-card">
                <h3>Cash Flow</h3>
                <p className="marketing-metric-value positive">+$3,180</p>
                <p className="marketing-metric-detail">In $11,450 • Out $8,270</p>
              </article>

              <article className="marketing-metric-card">
                <h3>Budget Status</h3>
                <p className="marketing-metric-value">72%</p>
                <div className="marketing-meter-track" aria-hidden>
                  <span className="marketing-meter-fill" style={{ width: '72%' }} />
                </div>
                <p className="marketing-metric-detail">$8.0k of $8.0k spent</p>
              </article>

              <article className="marketing-metric-card">
                <h3>Linked Accounts</h3>
                <p className="marketing-metric-value">21</p>
                <p className="marketing-metric-detail">Checking 5 • Savings 4 • Brokerage 3 • + more</p>
              </article>
            </div>
          </motion.div>
        </motion.section>

        <section className="marketing-story-wrap max-w-[1460px] mx-auto">
          <motion.h2
            className="marketing-story-title"
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5 }}
          >
            From scattered data to confident decisions
          </motion.h2>
          <motion.p
            className="marketing-story-subtitle"
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5, delay: 0.06 }}
          >
            The app is built for people managing real complexity: multiple accounts, multiple asset classes, and multiple stakeholders.
          </motion.p>

          <div className="marketing-story-grid">
            {workflowCards.map((card, index) => {
              const Icon = card.icon
              return (
                <motion.article
                  key={card.title}
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.5, delay: index * 0.07 }}
                  className="marketing-story-card"
                >
                  <span className="marketing-story-icon" aria-hidden>
                    <Icon size={15} strokeWidth={1.95} />
                  </span>
                  <h3>{card.title}</h3>
                  <p>{card.body}</p>
                </motion.article>
              )
            })}
          </div>
        </section>

        <motion.section
          className="marketing-final-cta max-w-[1460px] mx-auto"
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.5 }}
        >
          <h2>Ready to see your financial system in motion?</h2>
          <a href={`${APP_URL}/signup`} className="btn btn-lg marketing-primary-btn">Create Free Account</a>
        </motion.section>
      </div>
    </div>
  )
}
