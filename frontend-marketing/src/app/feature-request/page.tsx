'use client'

import { motion } from '@/lib/motion'

const roadmap = [
  'AI-driven budget forecasting enhancements',
  'Automated tax categorization workflows',
  'Expanded developer payout and API tooling',
  'Mobile-native portfolio monitoring experiences',
]

export default function FeatureRequestPage() {
  return (
    <div className="pb-12">
      <section className="py-12 md:py-16 text-center max-w-4xl mx-auto">
        <p className="marketing-chip mx-auto mb-5">
          <span className="signal-dot" />
          Product feedback loop
        </p>
        <h1 className="text-4xl md:text-6xl mb-5">Help shape what JuaLuma builds next.</h1>
        <p className="text-lg text-text-secondary">
          We prioritize requests that improve clarity, control, and trust in financial decision-making.
        </p>
      </section>

      <section className="grid lg:grid-cols-2 gap-6 mb-10">
        <div className="glass-panel">
          <h2 className="text-3xl mb-3">Submit a request</h2>
          <p className="text-text-secondary mb-6">
            Share your workflow gap, desired outcome, and who benefits. Product and engineering review requests continuously.
          </p>
          <div className="space-y-3">
            <a href="http://localhost:5175/support/tickets/new" target="_blank" rel="noreferrer" className="btn w-full text-center">Submit via Support Portal</a>
            <a href="mailto:support@jualuma.com" className="btn btn-secondary w-full text-center">Email Feature Team</a>
          </div>
        </div>

        <div className="glass-panel">
          <h2 className="text-3xl mb-3">Current roadmap themes</h2>
          <div className="space-y-3">
            {roadmap.map((item, index) => (
              <motion.div
                key={item}
                initial={{ opacity: 0, x: 12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.4, delay: index * 0.07 }}
                className="rounded-xl border border-white/15 bg-white/5 p-4 text-text-secondary"
              >
                {item}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="glass-panel text-center">
        <h2 className="text-3xl mb-4">What makes a high-impact request?</h2>
        <p className="text-text-secondary max-w-2xl mx-auto mb-0">
          Include the problem, current workaround, and expected result. Requests with clear business impact and reproducible scenarios move faster.
        </p>
      </section>
    </div>
  )
}
