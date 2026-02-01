/* Marketing landing home page — hero, value props, CTA. Last modified: 2025-01-30 */
import Link from 'next/link'

export default function Home() {
  return (
    <div className="overflow-x-hidden">
        {/* Hero Section */}
        <section className="relative pt-20 pb-32 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />
          <div className="container mx-auto px-4 text-center relative z-10">
            <h1 className="text-5xl md:text-7xl font-bold mb-6 animate-fade-in">
              <span className="text-[var(--text-primary)]">Master Your Wealth.</span>
              <br />
              <span className="text-primary">Without Limits.</span>
            </h1>
            <p className="text-xl md:text-2xl text-text-secondary max-w-2xl mx-auto mb-10 animate-slide-up" style={{ animationDelay: '0.1s' }}>
              The all-in-one platform for tracking traditional finance, crypto, real estate, and more.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <a href="http://localhost:5175/signup" className="btn btn-lg shadow-lg shadow-primary/25">
                Start Free Trial
              </a>
              <Link href="/features" className="btn btn-lg btn-secondary">
                Explore Features
              </Link>
            </div>
            
            {/* Hero Image / Preview */}
            <div className="mt-16 glass-panel max-w-5xl mx-auto p-4 animate-slide-up " style={{ animationDelay: '0.3s' }}>
               <div className="aspect-video bg-black/50 rounded-lg flex items-center justify-center border border-white/10">
                  <p className="text-muted">Interactive Dashboard Preview</p>
               </div>
            </div>
          </div>
        </section>

        {/* Value Props */}
        <section className="py-20 bg-surface-2/50">
          <div className="container mx-auto px-4 grid md:grid-cols-3 gap-8">
            <div className="glass-panel text-center hover:scale-105 transition-transform duration-300">
              <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-6 text-3xl">
                🏦
              </div>
              <h3>Universal Aggregation</h3>
              <p>Connect 12,000+ banks, credit cards, and investment accounts securely via Plaid.</p>
            </div>
            <div className="glass-panel text-center hover:scale-105 transition-transform duration-300">
               <div className="w-16 h-16 bg-accent/20 rounded-2xl flex items-center justify-center mx-auto mb-6 text-3xl">
                🦊
              </div>
              <h3>Web3 Native</h3>
              <p>Track Ethereum, Bitcoin, Solana, and NFTs alongside your 401k and savings.</p>
            </div>
            <div className="glass-panel text-center hover:scale-105 transition-transform duration-300">
               <div className="w-16 h-16 bg-purple-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6 text-3xl">
                🤖
              </div>
              <h3>AI Intelligence</h3>
              <p>Get personalized insights, budget forecasting, and net worth analysis powered by AI.</p>
            </div>
          </div>
        </section>

        {/* CTA */}
         <section className="container mx-auto px-4 py-32 text-center">
            <h2 className="text-4xl font-bold mb-8">Ready to take control?</h2>
            <a href="http://localhost:5175/signup" className="btn btn-lg btn-primary">
              Create Free Account
            </a>
         </section>
    </div>
  )
}
