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

const partners = ['PLAID', 'STRIPE', 'FIREBASE', 'VERTEX AI']

export default function AboutPage() {
  return (
    <div className="pb-12">
      <section className="py-12 md:py-16 text-center max-w-4xl mx-auto">
        <p className="marketing-chip mx-auto mb-5">
          <span className="signal-dot" />
          Why JuaLuma exists
        </p>
        <h1 className="text-4xl md:text-6xl mb-5">A financial operating system for real life.</h1>
        <p className="text-lg md:text-xl text-text-secondary">
          We build for people who manage multiple accounts, multiple asset classes, and multiple priorities.
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
          <p className="text-text-secondary leading-relaxed mb-4">
            Data access is read-only where applicable, encrypted in transit and at rest, and designed for strict operational boundaries.
          </p>
          <div className="rounded-xl border border-white/15 bg-white/5 p-4">
            <p className="text-sm text-text-secondary mb-0">
              Texas sales-tax note: subscription tax is applied on 80% of the service value, with 20% treated as exempt data processing under Texas rules.
            </p>
          </div>
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
        <div className="flex flex-wrap justify-center gap-3 md:gap-4">
          {partners.map((partner) => (
            <span key={partner} className="marketing-chip">{partner}</span>
          ))}
        </div>
      </section>
    </div>
  )
}
