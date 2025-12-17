import { Link } from 'react-router-dom'

export const Features = () => {
    return (
        <div>
            <section className="container py-12">
                <h1 className="text-center mb-4">
                    JuaLuma Features
                </h1>
                <p
                    className="text-center text-lg text-text-secondary mb-12 max-w-[700px] mx-auto"
                >
                    Everything you need to take control of your finances in one powerful platform.
                </p>

                {/* Unified Dashboard */}
                <div className="glass-panel mb-8">
                    <div className="grid grid-2 items-center">
                        <div>
                            <h2>Unified Financial Dashboard</h2>
                            <p>
                                Aggregate all your financial accounts in one place. Connect bank accounts, credit cards, investment
                                accounts, and cryptocurrency exchanges through secure, read-only API connections.
                            </p>
                            <ul className="mt-4 pl-6">
                                <li>Connect up to 5 traditional accounts (Pro Tier)</li>
                                <li>Link up to 5 investment accounts via Plaid Investments API</li>
                                <li>Connect up to 5 Web3 wallets</li>
                                <li>Full API/OAuth support for Coinbase, Kraken, and other CEX platforms</li>
                                <li>Real-time balance updates and transaction sync</li>
                            </ul>
                        </div>
                        <div className="feature-preview">
                            <div className="preview-dashboard">
                                <div className="preview-header">
                                    <div className="preview-dot"></div>
                                    <div className="preview-dot"></div>
                                    <div className="preview-dot"></div>
                                </div>
                                <div className="preview-stats">
                                    <div className="preview-stat">
                                        <span className="preview-stat-label">Net Worth</span>
                                        <span className="preview-stat-value">$247,890</span>
                                        <span className="preview-stat-change positive">↑ 3.2%</span>
                                    </div>
                                    <div className="preview-stat">
                                        <span className="preview-stat-label">Cash Flow</span>
                                        <span className="preview-stat-value">+$2,450</span>
                                    </div>
                                </div>
                                <div className="preview-chart-mini">
                                    <svg viewBox="0 0 200 60" preserveAspectRatio="none">
                                        <polyline
                                            fill="none"
                                            stroke="var(--color-primary)"
                                            strokeWidth="2"
                                            points="0,50 30,45 60,40 90,35 120,30 150,20 200,15"
                                        />
                                        <polyline
                                            fill="url(#previewGrad)"
                                            stroke="none"
                                            points="0,60 0,50 30,45 60,40 90,35 120,30 150,20 200,15 200,60"
                                        />
                                        <defs>
                                            <linearGradient id="previewGrad" x1="0" x2="0" y1="0" y2="1">
                                                <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.3" />
                                                <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
                                            </linearGradient>
                                        </defs>
                                    </svg>
                                </div>
                                <div className="preview-accounts">
                                    <div className="preview-account">
                                        <span>Chase</span>
                                        <span>$8,450</span>
                                    </div>
                                    <div className="preview-account">
                                        <span>Fidelity</span>
                                        <span>$145,230</span>
                                    </div>
                                    <div className="preview-account">
                                        <span>MetaMask</span>
                                        <span>$4,251</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Smart Categorization */}
                <div className="glass-panel mb-12">
                    <div className="grid grid-2 items-center">
                        <div className="feature-preview order-2">
                            <div className="preview-categorization">
                                <div className="preview-header">
                                    <div className="preview-dot"></div>
                                    <div className="preview-dot"></div>
                                    <div className="preview-dot"></div>
                                </div>
                                <div className="preview-transaction">
                                    <div className="preview-tx-icon bg-[var(--color-primary)]">
                                        🍔
                                    </div>
                                    <div className="preview-tx-details">
                                        <span className="preview-tx-name">McDonald&apos;s</span>
                                        <span className="preview-tx-amount">-$12.50</span>
                                    </div>
                                    <span className="preview-category-badge">Food & Dining</span>
                                </div>
                                <div className="preview-transaction">
                                    <div className="preview-tx-icon bg-[var(--color-accent)]">
                                        ⛽
                                    </div>
                                    <div className="preview-tx-details">
                                        <span className="preview-tx-name">Shell Gas</span>
                                        <span className="preview-tx-amount">-$45.00</span>
                                    </div>
                                    <span className="preview-category-badge bg-[#F59E0B]">
                                        Transportation
                                    </span>
                                </div>
                                <div className="preview-transaction highlight">
                                    <div className="preview-tx-icon bg-[#9CA3AF]">
                                        ❓
                                    </div>
                                    <div className="preview-tx-details">
                                        <span className="preview-tx-name">AMZN*2847</span>
                                        <span className="preview-tx-amount">-$89.99</span>
                                    </div>
                                    <span className="preview-category-badge pending">Review</span>
                                </div>
                                <div className="preview-ai-suggest">
                                    <span>🤖 AI suggests: Shopping</span>
                                    <button className="preview-btn-sm">Apply</button>
                                </div>
                            </div>
                        </div>
                        <div className="order-1">
                            <h2>Smart Transaction Categorization</h2>
                            <p>
                                Use our AI-powered tools to instantly categorize thousands of transactions. Automated transaction
                                categorization saves you time and learns from your preferences.
                            </p>
                            <ul className="mt-4 pl-8">
                                <li>Automatic categorization via machine learning</li>
                                <li>Review queue for low-confidence tags</li>
                                <li>System learns from your manual edits</li>
                                <li>Custom category creation</li>
                                <li>Bulk edit and undo capabilities</li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Budget Tracking */}
                <div className="glass-panel mb-12">
                    <div className="grid grid-2 items-center">
                        <div>
                            <h2>Budget Tracking & Alerts</h2>
                            <p>
                                Set limits per category and track your spending. Get alerts when you approach budget limits and
                                visualize budget vs. actual spending.
                            </p>
                            <ul className="mt-4 pl-8">
                                <li>Set monthly budget limits per category</li>
                                <li>Rollover logic (unused budget moves to next month)</li>
                                <li>Threshold alerts (e.g., &quot;You&apos;ve hit 80% of Dining&quot;)</li>
                                <li>Budget vs. Actual visualization</li>
                                <li>Spending trend analysis</li>
                            </ul>
                        </div>
                        <div className="feature-preview">
                            <div className="preview-budget">
                                <div className="preview-header">
                                    <div className="preview-dot"></div>
                                    <div className="preview-dot"></div>
                                    <div className="preview-dot"></div>
                                </div>
                                <div className="preview-budget-title">January Budget</div>
                                <div className="preview-budget-item">
                                    <div className="preview-budget-row">
                                        <span>Food & Dining</span>
                                        <span>$680 / $800</span>
                                    </div>
                                    <div className="preview-progress-bar">
                                        <div className="preview-progress-fill warning w-[85%]"></div>
                                    </div>
                                    <span className="preview-alert">⚠️ 85% used</span>
                                </div>
                                <div className="preview-budget-item">
                                    <div className="preview-budget-row">
                                        <span>Entertainment</span>
                                        <span>$180 / $300</span>
                                    </div>
                                    <div className="preview-progress-bar">
                                        <div className="preview-progress-fill w-[60%]"></div>
                                    </div>
                                </div>
                                <div className="preview-budget-item">
                                    <div className="preview-budget-row">
                                        <span>Transportation</span>
                                        <span>$245 / $400</span>
                                    </div>
                                    <div className="preview-progress-bar">
                                        <div className="preview-progress-fill accent w-[61%]"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Financial Health */}
                <div className="glass-panel mb-12">
                    <div className="grid grid-2 items-center">
                        <div className="feature-preview order-2">
                            <div className="preview-health">
                                <div className="preview-header">
                                    <div className="preview-dot"></div>
                                    <div className="preview-dot"></div>
                                    <div className="preview-dot"></div>
                                </div>
                                <div className="preview-health-grid">
                                    <div className="preview-health-metric">
                                        <div className="relative">
                                            <svg viewBox="0 0 80 80" className="preview-donut">
                                                <circle cx="40" cy="40" r="32" fill="none" stroke="var(--border-color)" strokeWidth="8" />
                                                <circle
                                                    cx="40"
                                                    cy="40"
                                                    r="32"
                                                    fill="none"
                                                    stroke="#10B981"
                                                    strokeWidth="8"
                                                    strokeDasharray="160 201"
                                                    strokeDashoffset="0"
                                                    transform="rotate(-90 40 40)"
                                                />
                                            </svg>
                                            <div
                                                className="preview-health-value absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                                            >
                                                79%
                                            </div>
                                        </div>
                                        <span className="preview-health-name block mt-2">
                                            Health Score
                                        </span>
                                    </div>
                                    <div className="preview-health-stats">
                                        <div className="preview-health-stat">
                                            <span className="preview-health-stat-icon">📈</span>
                                            <div>
                                                <span className="preview-health-stat-label">Assets</span>
                                                <span className="preview-health-stat-value">$267,450</span>
                                            </div>
                                        </div>
                                        <div className="preview-health-stat">
                                            <span className="preview-health-stat-icon">📉</span>
                                            <div>
                                                <span className="preview-health-stat-label">Liabilities</span>
                                                <span className="preview-health-stat-value">$19,560</span>
                                            </div>
                                        </div>
                                        <div className="preview-health-stat highlight">
                                            <span className="preview-health-stat-icon">💰</span>
                                            <div>
                                                <span className="preview-health-stat-label">Net Worth</span>
                                                <span className="preview-health-stat-value positive">$247,890</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="order-1">
                            <h2>Financial Health Metrics</h2>
                            <p>Get a clear view of your financial health with comprehensive metrics and forecasts.</p>
                            <ul className="mt-4 pl-8">
                                <li>Cash flow: Inflow/Outflow summary</li>
                                <li>30-90 day cash flow forecast</li>
                                <li>Net worth: Assets vs. Liabilities delta tracking</li>
                                <li>Holistic balance sheet view</li>
                                <li>Dynamic infographics and visualizations</li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Recurring Detection */}
                <div className="glass-panel mb-12">
                    <div className="grid grid-2 items-center">
                        <div>
                            <h2>Recurring Transaction Detection</h2>
                            <p>Automatically detect bills, income, and subscriptions. Never forget a recurring payment again.</p>
                            <ul className="mt-4 pl-8">
                                <li>Automated detection of recurring bills</li>
                                <li>Income pattern recognition</li>
                                <li>Subscription tracking and flagging</li>
                                <li>Upcoming bill notifications</li>
                                <li>Flagging workflow for &quot;forgotten&quot; subscriptions</li>
                            </ul>
                        </div>
                        <div className="feature-preview">
                            <div className="preview-recurring">
                                <div className="preview-header">
                                    <div className="preview-dot"></div>
                                    <div className="preview-dot"></div>
                                    <div className="preview-dot"></div>
                                </div>
                                <div className="preview-recurring-title">Upcoming Bills</div>
                                <div className="preview-recurring-item">
                                    <div className="preview-recurring-icon">🎬</div>
                                    <div className="preview-recurring-details">
                                        <span className="preview-recurring-name">Netflix</span>
                                        <span className="preview-recurring-date">Feb 1</span>
                                    </div>
                                    <span className="preview-recurring-amount">$15.99</span>
                                </div>
                                <div className="preview-recurring-item">
                                    <div className="preview-recurring-icon">🎵</div>
                                    <div className="preview-recurring-details">
                                        <span className="preview-recurring-name">Spotify</span>
                                        <span className="preview-recurring-date">Feb 3</span>
                                    </div>
                                    <span className="preview-recurring-amount">$9.99</span>
                                </div>
                                <div className="preview-recurring-item alert">
                                    <div className="preview-recurring-icon">🏋️</div>
                                    <div className="preview-recurring-details">
                                        <span className="preview-recurring-name">Gym</span>
                                        <span className="preview-recurring-date">Tomorrow</span>
                                    </div>
                                    <span className="preview-recurring-amount">$49.99</span>
                                </div>
                                <div className="preview-recurring-total">
                                    <span>Monthly Total</span>
                                    <span>$138.95</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* AI Assistant */}
                <div className="glass-panel mb-12">
                    <div className="grid grid-2 items-center">
                        <div className="feature-preview order-2">
                            <div className="preview-ai-chat">
                                <div className="preview-header">
                                    <div className="preview-dot"></div>
                                    <div className="preview-dot"></div>
                                    <div className="preview-dot"></div>
                                </div>
                                <div className="preview-chat-window">
                                    <div className="preview-chat-msg user">How much did I spend on food this month?</div>
                                    <div className="preview-chat-msg assistant">
                                        <span className="preview-chat-typing">●●●</span>
                                        Based on your transactions, you&apos;ve spent <strong>$680</strong> on Food &amp; Dining this month. That&apos;s
                                        85% of your $800 budget. You have $120 remaining.
                                    </div>
                                </div>
                                <div className="preview-chat-input">
                                    <input type="text" placeholder="Ask about your finances..." disabled />
                                    <button className="preview-chat-send">→</button>
                                </div>
                            </div>
                        </div>
                        <div className="order-1">
                            <h2>AI-Powered Financial Analysis</h2>
                            <p>
                                Access AI-powered financial analysis tools powered by Gemini 2.5 Flash (All Tiers) with
                                encrypted RAG prompts.
                            </p>
                            <ul className="mt-4 pl-8">
                                <li>75 cloud AI queries per day (Pro/Essential Tier)</li>
                                <li>Encrypted RAG prompts for context-aware responses</li>
                                <li>Budget status and net worth insights</li>
                                <li>Spending pattern analysis</li>
                                <li>Financial education and guidance</li>
                            </ul>
                            <div className="alert alert-info mt-4">
                                <strong>Important:</strong> AI Assistant provides access to third-party language models. It is NOT a
                                financial, investment, tax, or legal advisor. AI responses are not verified or endorsed by Intellifide,
                                LLC. Do not rely on AI for financial decisions.
                            </div>
                        </div>
                    </div>
                </div>

                {/* Investment Tracking */}
                <div className="glass-panel mb-12">
                    <div className="grid grid-2 items-center">
                        <div>
                            <h2>Investment Account Aggregation</h2>
                            <p>Track your investment accounts, holdings, and portfolio value all in one place.</p>
                            <ul className="mt-4 pl-8">
                                <li>Investment account aggregation via Plaid Investments API</li>
                                <li>Holdings tracking and portfolio value</li>
                                <li>Investment transaction history</li>
                                <li>Support for multiple brokerages</li>
                                <li>Portfolio performance analysis</li>
                            </ul>
                        </div>
                        <div className="feature-preview">
                            <div className="preview-investments">
                                <div className="preview-header">
                                    <div className="preview-dot"></div>
                                    <div className="preview-dot"></div>
                                    <div className="preview-dot"></div>
                                </div>
                                <div className="preview-portfolio-value">
                                    <span className="preview-portfolio-label">Portfolio Value</span>
                                    <span className="preview-portfolio-amount">$213,651</span>
                                    <span className="preview-portfolio-change positive">↑ $4,230 (2.0%)</span>
                                </div>
                                <div className="preview-holdings">
                                    <div className="preview-holding">
                                        <span className="preview-holding-symbol">AAPL</span>
                                        <span className="preview-holding-shares">25 shares</span>
                                        <span className="preview-holding-value">$4,638</span>
                                        <span className="preview-holding-change positive">+2.3%</span>
                                    </div>
                                    <div className="preview-holding">
                                        <span className="preview-holding-symbol">VTI</span>
                                        <span className="preview-holding-shares">150 shares</span>
                                        <span className="preview-holding-value">$36,870</span>
                                        <span className="preview-holding-change positive">+2.5%</span>
                                    </div>
                                    <div className="preview-holding">
                                        <span className="preview-holding-symbol">BTC</span>
                                        <span className="preview-holding-shares">0.5 BTC</span>
                                        <span className="preview-holding-value">$21,250</span>
                                        <span className="preview-holding-change positive">+5.2%</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Web3 & CEX */}
                <div className="glass-panel mb-12">
                    <div className="grid grid-2 items-center">
                        <div className="feature-preview order-2">
                            <div className="preview-web3">
                                <div className="preview-header">
                                    <div className="preview-dot"></div>
                                    <div className="preview-dot"></div>
                                    <div className="preview-dot"></div>
                                </div>
                                <div className="preview-wallet-header">
                                    <span className="preview-wallet-icon">🦊</span>
                                    <div className="preview-wallet-info">
                                        <span className="preview-wallet-name">MetaMask</span>
                                        <span className="preview-wallet-addr">0x742d...8a3f</span>
                                    </div>
                                    <span className="preview-wallet-connected">● Connected</span>
                                </div>
                                <div className="preview-crypto-holdings">
                                    <div className="preview-crypto-item">
                                        <span className="preview-crypto-icon">Ξ</span>
                                        <span className="preview-crypto-name">Ethereum</span>
                                        <span className="preview-crypto-balance">1.25 ETH</span>
                                        <span className="preview-crypto-value">$3,563</span>
                                    </div>
                                    <div className="preview-crypto-item">
                                        <span className="preview-crypto-icon">₿</span>
                                        <span className="preview-crypto-name">Bitcoin</span>
                                        <span className="preview-crypto-balance">0.015 BTC</span>
                                        <span className="preview-crypto-value">$638</span>
                                    </div>
                                    <div className="preview-crypto-item nft">
                                        <span className="preview-crypto-icon">🖼️</span>
                                        <span className="preview-crypto-name">NFTs</span>
                                        <span className="preview-crypto-balance">3 items</span>
                                        <span className="preview-crypto-value">$850</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="order-1">
                            <h2>Web3 Wallet & CEX Integration</h2>
                            <p>Connect your Web3 wallets and cryptocurrency exchanges to see your complete crypto portfolio.</p>
                            <ul className="mt-4 pl-8">
                                <li>Web3 wallet connections (token balances and NFTs)</li>
                                <li>CEX API/OAuth support (Coinbase, Kraken, etc.)</li>
                                <li>Unified crypto portfolio view</li>
                                <li>Large transfer notifications</li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Manual Assets */}
                <div className="glass-panel mb-12">
                    <div className="grid grid-2 items-center">
                        <div>
                            <h2>Manual Asset Tracking</h2>
                            <p>
                                Track non-API assets like your house, car, or collectibles to get a complete picture of your net worth.
                            </p>
                            <ul className="mt-4 pl-8">
                                <li>Track house, car, and collectible values</li>
                                <li>Manual asset entry and updates</li>
                                <li>Included in net worth calculations</li>
                                <li>Purchase date and notes tracking</li>
                            </ul>
                        </div>
                        <div className="feature-preview">
                            <div className="preview-assets">
                                <div className="preview-header">
                                    <div className="preview-dot"></div>
                                    <div className="preview-dot"></div>
                                    <div className="preview-dot"></div>
                                </div>
                                <div className="preview-assets-title">Manual Assets</div>
                                <div className="preview-asset-item">
                                    <span className="preview-asset-icon">🏠</span>
                                    <div className="preview-asset-details">
                                        <span className="preview-asset-name">Primary Residence</span>
                                        <span className="preview-asset-date">Purchased: Mar 2020</span>
                                    </div>
                                    <span className="preview-asset-value">$425,000</span>
                                </div>
                                <div className="preview-asset-item">
                                    <span className="preview-asset-icon">🚗</span>
                                    <div className="preview-asset-details">
                                        <span className="preview-asset-name">2022 Tesla Model 3</span>
                                        <span className="preview-asset-date">Purchased: Jun 2022</span>
                                    </div>
                                    <span className="preview-asset-value">$35,000</span>
                                </div>
                                <div className="preview-asset-item">
                                    <span className="preview-asset-icon">🎨</span>
                                    <div className="preview-asset-details">
                                        <span className="preview-asset-name">Art Collection</span>
                                        <span className="preview-asset-date">Various</span>
                                    </div>
                                    <span className="preview-asset-value">$12,500</span>
                                </div>
                                <div className="preview-assets-total">
                                    <span>Total Manual Assets</span>
                                    <span>$472,500</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* CTA */}
                <div className="text-center mt-12">
                    <h2 className="mb-6">Ready to Experience These Features?</h2>
                    <Link to="/signup" className="btn btn-primary btn-lg">
                        Get Started Free
                    </Link>
                    <p className="mt-4">
                        <Link to="/pricing">View pricing plans →</Link>
                    </p>
                </div>
            </section>
        </div>
    )
}
