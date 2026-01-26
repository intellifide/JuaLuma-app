import Link from 'next/link'

export default function Pricing() {
    return (
        <div className="container mx-auto px-4 py-12">
            <h1 className="text-center mb-4">Pricing Plans</h1>
            <p className="text-center text-lg text-text-secondary mb-12 max-w-[700px] mx-auto">
                Choose the plan that fits your financial journey.
            </p>

            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                {/* Free Tier */}
                <div className="glass-panel flex flex-col items-center text-center border-t-4 border-t-gray-400">
                    <h3 className="mb-2">Free</h3>
                    <div className="text-4xl font-bold mb-4">$0<span className="text-lg font-normal text-muted">/mo</span></div>
                    <ul className="space-y-3 mb-8 text-left w-full pl-8">
                        <li>✓ Connect 2 Bank Accounts</li>
                        <li>✓ 1 Investment Account</li>
                        <li>✓ 1 Web3 Wallet</li>
                        <li>✓ Basic Dashboard</li>
                    </ul>
                    <a href="http://localhost:5175/signup?plan=free" className="btn btn-secondary w-full mt-auto">Get Started</a>
                </div>

                {/* Pro Tier */}
                <div className="glass-panel flex flex-col items-center text-center border-t-4 border-t-primary scale-105 shadow-xl relative">
                    <div className="absolute top-0 right-0 bg-primary text-white text-xs px-3 py-1 rounded-bl-lg font-bold">POPULAR</div>
                    <h3 className="mb-2 text-primary">Pro</h3>
                    <div className="text-4xl font-bold mb-4">$12<span className="text-lg font-normal text-muted">/mo</span></div>
                    <ul className="space-y-3 mb-8 text-left w-full pl-8">
                        <li>✓ Connect 5 Bank Accounts</li>
                        <li>✓ 5 Investment Accounts</li>
                        <li>✓ 5 Web3 Wallets</li>
                        <li>✓ AI Insights (40/day)</li>
                        <li>✓ Custom Categories</li>
                    </ul>
                    <a href="http://localhost:5175/signup?plan=pro" className="btn w-full mt-auto">Start 7-Day Free Trial</a>
                </div>

                {/* Ultimate Tier */}
                <div className="glass-panel flex flex-col items-center text-center border-t-4 border-t-accent">
                    <h3 className="mb-2 text-accent">Ultimate</h3>
                    <div className="text-4xl font-bold mb-4">$29<span className="text-lg font-normal text-muted">/mo</span></div>
                    <ul className="space-y-3 mb-8 text-left w-full pl-8">
                        <li>✓ Unlimited Connections</li>
                        <li>✓ 20 Web3 Wallets</li>
                        <li>✓ Unlimited AI Queries</li>
                        <li>✓ Family Sharing (4 users)</li>
                        <li>✓ Priority Support</li>
                    </ul>
                    <a href="http://localhost:5175/signup?plan=ultimate" className="btn btn-secondary w-full mt-auto">Go Ultimate</a>
                </div>
            </div>
        </div>
    )
}
