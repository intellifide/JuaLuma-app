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

const pillars = [
  {
    title: 'Signal over noise',
    body: 'Most people have data everywhere but clarity nowhere. JuaLuma is designed to reduce account chaos into a coherent, current view of reality.',
  },
  {
    title: 'Trust through transparency',
    body: 'We favor explainable insight cards and explicit data boundaries so users understand what changed, why it changed, and what to do next.',
  },
  {
    title: 'Built for complexity',
    body: 'The product is intentionally multi-asset and multi-scope: personal and household workflows, traditional and on-chain finance, and manual assets.',
  },
]

const partners = [
  { name: 'Plaid', logo: '/assets/partners/plaid.svg' },
  { name: 'Stripe', logo: '/assets/partners/stripe.svg' },
  { name: 'Google Cloud', logo: '/assets/partners/google-cloud.svg' },
]

export default function AboutPage() {
  return (
    <div className="pb-12">
      <section className="py-12 md:py-16 text-center max-w-4xl mx-auto">
        <h1 className="text-4xl md:text-6xl mb-5">A financial operating system for real life.</h1>
        <p className="text-lg md:text-xl text-text-secondary">
          We build for people who manage multiple accounts, multiple asset classes, and multiple priorities.
        </p>
        <p className="text-sm text-text-muted mt-4">
          JuaLuma is a product brand under Intellifide LLC.
        </p>
      </section>

      <section className="grid lg:grid-cols-2 gap-6 mb-8">
        <div className="glass-panel">
          <h2 className="text-3xl mb-4">Mission</h2>
          <p className="text-text-secondary leading-relaxed mb-0">
            Financial confidence should come from visibility and context, not guesswork. JuaLuma turns disconnected data from banks, brokerages, wallets, and manual assets into a live strategic view you can act on.
          </p>
        </div>

        <div className="glass-panel">
          <h2 className="text-3xl mb-4">Security and compliance</h2>
          <p className="text-text-secondary leading-relaxed mb-0">
            Data access is read-only where applicable, encrypted in transit and at rest, and designed for strict operational boundaries.
          </p>
        </div>
      </section>

      <section className="grid md:grid-cols-3 gap-5 mb-10">
        {pillars.map((pillar, index) => (
          <motion.article
            key={pillar.title}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.45, delay: index * 0.06 }}
            className="glass-panel"
          >
            <h3 className="text-2xl mb-3">{pillar.title}</h3>
            <p className="text-text-secondary mb-0">{pillar.body}</p>
          </motion.article>
        ))}
      </section>

      <section className="glass-panel text-center">
        <h2 className="text-3xl mb-5">Technology partners</h2>
        <div className="flex flex-wrap justify-center items-center gap-6 md:gap-8">
          {partners.map((partner) => (
            <div
              key={partner.name}
              className="flex items-center justify-center rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] px-6 py-5 min-w-[180px] h-24"
              title={partner.name}
            >
              {partner.logo ? (
                <img
                  src={partner.logo}
                  alt=""
                  className={`w-auto object-contain opacity-95 ${partner.name === 'Plaid' ? 'max-h-[4.5rem]' : 'max-h-12'}`}
                />
              ) : (
                <span className="text-xs font-semibold tracking-[0.12em] text-text-secondary">
                  {partner.name}
                </span>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
