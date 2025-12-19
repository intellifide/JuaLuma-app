// Updated 2025-12-09 16:45 CST by ChatGPT
import { Link } from 'react-router-dom'

const features = [
  { title: 'Unified Dashboard', copy: 'Aggregate bank, card, investment, and crypto accounts in one glass dashboard.' },
  { title: 'Smart Categorization', copy: 'AI-powered rules that learn your preferences and keep thousands of transactions organized.' },
  { title: 'Budget Tracking', copy: 'Track budgets vs. actuals with alerts before you overspend.' },
  { title: 'Financial Health', copy: 'Net worth, cash flow summaries, and 30–90 day forecasts at a glance.' },
  { title: 'Recurring Detection', copy: 'Auto-detect bills, income, and subscriptions so nothing slips through.' },
  { title: 'AI-Powered Insights', copy: 'Vertex AI Gemini insights on spending patterns and financial trends.' },
]

export const Home = () => (
  <div>
    <section className="hero py-16 bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] text-[var(--text-inverse)]">
      <div className="container text-center">
        <h1 className="text-[var(--text-inverse)] mb-8">
          See All Your Finances in One Place
        </h1>
        <p className="text-xl text-white/90 mb-12 max-w-[600px] mx-auto">
          Automatically categorize your transactions, track spending, and get a clear view of your financial health.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link to="/signup" className="btn btn-accent btn-lg">
            Get Started Free
          </Link>
          <Link
            to="/features"
            className="btn btn-outline btn-lg bg-white/10 border-white/30 text-[var(--text-inverse)] hover:bg-white/20"
          >
            Learn More
          </Link>
        </div>
      </div>
    </section>

    <section className="container py-16">
      <h2 className="text-center mb-12">
        Everything You Need to Manage Your Finances
      </h2>
      <div className="grid gap-8 grid-cols-[repeat(auto-fit,minmax(250px,1fr))]">
        {features.map((feature) => (
          <div key={feature.title} className="card">
            <div className="card-header">
              <h3>{feature.title}</h3>
            </div>
            <div className="card-body">
              <p>{feature.copy}</p>
            </div>
          </div>
        ))}
      </div>
    </section>

    <section className="glass-panel my-16 mx-auto max-w-[1200px] p-16">
      <div className="container">
        <h2 className="text-center mb-8">
          Bank-Level Security
        </h2>
        <div className="grid gap-8 grid-cols-[repeat(auto-fit,minmax(300px,1fr))]">
          <div>
            <h3>Read-Only Access</h3>
            <p>
              <strong>We never move your money.</strong> All account connections are strictly read-only. We can view your financial data but cannot initiate transactions, transfer funds, or modify account settings.
            </p>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              All integrations maintain non-custodial status. The platform never executes write-access transfers or withdrawals.
            </p>
          </div>
          <div>
            <h3>Encryption &amp; Compliance</h3>
            <p>Your data is encrypted at rest and in transit. We comply with GLBA and GDPR requirements. Bank-level security and encryption protect your information.</p>
          </div>
        </div>
      </div>
    </section>

    <section className="container text-center py-16">
      <h2 className="mb-8">Ready to Get Started?</h2>
      <p className="text-lg mb-12 text-[var(--text-secondary)]">
        Join thousands of users who are taking control of their finances with jualuma.
      </p>
      <Link to="/signup" className="btn btn-lg">
        Create Your Free Account
      </Link>
      <p className="mt-4 text-sm text-[var(--text-muted)]">
        No credit card required. Free tier includes basic account aggregation.
      </p>
    </section>
  </div>
)

