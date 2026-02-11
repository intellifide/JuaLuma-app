'use client'

import { motion } from '@/lib/motion'

const faqs = [
  {
    q: 'Is my bank data safe?',
    a: 'Yes. JuaLuma never stores bank login credentials. Account linking is handled through secure providers and read-only access patterns.',
  },
  {
    q: 'How does the AI assistant answer questions?',
    a: 'It analyzes your categorized transaction history and account context to generate specific answers, not generic finance content.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. You can cancel from account billing settings and keep paid access until the current period ends.',
  },
  {
    q: 'How does Texas tax treatment work?',
    a: 'For qualifying users, tax is applied to 80% of the service fee in line with data-processing treatment.',
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
          <a href="http://localhost:5175/login" className="btn">Log In to Submit Ticket</a>
          <a href="mailto:support@jualuma.com" className="btn btn-secondary">Email Support</a>
        </div>
      </section>
    </div>
  )
}
