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

const faqs = [
  {
    q: 'Is my bank data safe?',
    a: 'Yes. JuaLuma never stores bank login credentials. Account linking is handled through secure providers and read-only access patterns.',
  },
  {
    q: 'Do you sell my data?',
    a: 'No. We do not sell your personal or financial data. Your data is used only to deliver the product and support you.',
  },
  {
    q: 'Is my data used to train AI?',
    a: 'No. JuaLuma routes requests through configured runtime models (`gpt-oss-120b` and `gemini-2.5-flash`) and does not use your data to train foundation models.',
  },
  {
    q: 'How does the AI assistant answer questions?',
    a: 'It analyzes categorized transaction/account context plus supported uploaded files to generate specific answers, not generic finance content.',
  },
  {
    q: 'How does AI fallback and reset timing work?',
    a: 'Paid usage defaults to `gemini-2.5-flash` and falls back to `gpt-oss-120b` when paid premium capacity is exhausted for the period. Usage is shown as `AI usage this period` with a billing-cycle reset date.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. You can cancel from account billing settings and keep paid access until the current period ends.',
  },
  {
    q: 'Is JuaLuma source available?',
    a: (
      <>
        JuaLuma is Source Available (Personal Use). You can audit the code, run it locally, and build widgets for the ecosystem. Commercial resale or enterprise deployment is strictly prohibited.{' '}
        <a className="text-primary underline" href="/legal/license" title="JuaLuma License Notice">
          View the full license
        </a>
        .
      </>
    ),
  },
]

export default function SupportPage() {
  return (
    <div className="pb-12">
      <section className="py-12 md:py-16 text-center max-w-4xl mx-auto">
        <h1 className="text-4xl md:text-6xl mb-5">Need help getting the most from your financial data?</h1>
        <p className="text-lg text-text-secondary">
          Find answers quickly, then escalate to support when you need account-specific help.
        </p>
      </section>

      <section id="faq" className="grid md:grid-cols-2 gap-5 mb-10">
        {faqs.map((item, index) => (
          <motion.article
            key={item.q}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.4, delay: index * 0.05 }}
            className="glass-panel"
          >
            <h2 className="text-2xl mb-3">{item.q}</h2>
            <p className="text-text-secondary mb-0">{item.a}</p>
          </motion.article>
        ))}
      </section>

      <section className="glass-panel text-center">
        <h2 className="text-3xl md:text-4xl mb-4">Still need assistance?</h2>
        <p className="text-text-secondary mb-7 max-w-2xl mx-auto">
          Log in for ticket support or contact us directly for onboarding and product issues.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a href={`${APP_URL}/login`} className="btn">Log In to Submit Ticket</a>
          <a href="mailto:support@jualuma.com" className="btn btn-secondary">Email Support</a>
        </div>
      </section>
    </div>
  )
}
