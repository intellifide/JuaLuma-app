import Link from 'next/link'

export default function Features() {
    return (
        <div className="container mx-auto px-4 py-12">
             <h1 className="text-center mb-4">Features</h1>
             <p className="text-center text-lg text-text-secondary mb-16 max-w-2xl mx-auto">
                Comprehensive tools for the modern investor.
             </p>

             <div className="space-y-20">
                {/* Feature 1 */}
                <div className="glass-panel grid md:grid-cols-2 gap-8 items-center">
                    <div>
                        <h2 className="text-3xl mb-4">Unified Dashboard</h2>
                        <p className="text-lg text-text-secondary leading-relaxed">
                            See your entire net worth in one glance. We aggregate data from Plaid-connected banks, credit cards, investment accounts, and on-chain crypto wallets.
                        </p>
                        <ul className="mt-6 space-y-2">
                             <li className="flex items-center gap-2"><span>✅</span> Real-time balance updates</li>
                             <li className="flex items-center gap-2"><span>✅</span> Multi-currency support</li>
                             <li className="flex items-center gap-2"><span>✅</span> Historical net worth tracking</li>
                        </ul>
                    </div>
                    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-6 border border-white/10 shadow-inner">
                        <div className="flex justify-between items-center mb-8">
                            <div className="h-4 w-32 bg-gray-700 rounded animate-pulse"/>
                            <div className="h-8 w-8 bg-gray-700 rounded-full animate-pulse"/>
                        </div>
                        <div className="space-y-4">
                            <div className="h-24 bg-gray-700/50 rounded-lg animate-pulse"/>
                            <div className="h-24 bg-gray-700/50 rounded-lg animate-pulse delay-75"/>
                            <div className="h-24 bg-gray-700/50 rounded-lg animate-pulse delay-150"/>
                        </div>
                    </div>
                </div>

                {/* Feature 2 */}
                <div className="glass-panel grid md:grid-cols-2 gap-8 items-center">
                    <div className="order-2 md:order-1 bg-gradient-to-br from-indigo-900/50 to-purple-900/50 rounded-xl p-6 border border-white/10 flex items-center justify-center">
                        <span className="text-6xl">🤖</span>
                    </div>
                    <div className="order-1 md:order-2">
                        <h2 className="text-3xl mb-4">AI Financial Assistant</h2>
                        <p className="text-lg text-text-secondary leading-relaxed">
                            Ask questions about your spending like &quot;How much did I spend on coffee last month?&quot; or &quot;Can I afford a vacation?&quot;. Our AI analyzes your transaction history to give personalized answers.
                        </p>
                    </div>
                </div>
             </div>

             <div className="text-center mt-20">
                <a href="http://localhost:5175/signup" className="btn btn-lg btn-primary">Start Exploring Features</a>
             </div>
        </div>
    )
}
