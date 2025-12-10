import { Link } from 'react-router-dom'

export const Pricing = () => {
    return (
        <div>
            <section className="container py-12">
                <h1 className="text-center mb-4">
                    Choose Your Plan
                </h1>
                <p
                    className="text-center text-lg text-text-secondary mb-12 max-w-[700px] mx-auto"
                >
                    Start free and upgrade when you need more features. All plans include bank-level security and read-only
                    account access.
                </p>

                <div className="grid grid-4 mb-12">
                    {/* Free Tier */}
                    <div className="card relative">
                        <div className="card-header">
                            <h3>Free</h3>
                            <div className="text-3xl font-bold text-royal-purple my-4">
                                $0
                                <span className="text-base font-normal">/month</span>
                            </div>
                        </div>
                        <div className="card-body">
                            <ul className="list-none p-0">
                                <li className="mb-2">✓ Link up to 2 Traditional accounts</li>
                                <li className="mb-2">✓ 1 Investment account</li>
                                <li className="mb-2">✓ 1 Web3 wallet</li>
                                <li className="mb-2">✓ 1 CEX account</li>
                                <li className="mb-2">✓ 20 AI queries/day</li>
                                <li className="mb-2">✓ Core infographics and AI overviews</li>
                                <li className="mb-2">✓ 45-day transaction history</li>
                                <li className="mb-2">✓ Manual refresh</li>
                                <li className="mb-2">
                                    ✓ Developer Marketplace preview only (interactions blocked)
                                </li>
                            </ul>
                        </div>
                        <div className="card-footer">
                            <Link to="/signup" className="btn btn-outline w-full">
                                Get Started
                            </Link>
                        </div>
                    </div>

                    {/* Essential Tier */}
                    <div className="card relative border-2 border-aqua">
                        <div className="absolute top-[-12px] left-1/2 -translate-x-1/2 bg-aqua text-white px-4 py-1 rounded-xl text-xs font-semibold">
                            POPULAR
                        </div>
                        <div className="card-header">
                            <h3>Essential</h3>
                            <div className="text-3xl font-bold text-[var(--color-primary)] my-4">
                                $12
                                <span className="text-base font-normal">/month</span>
                            </div>
                        </div>
                        <div className="card-body">
                            <ul className="list-none p-0">
                                <li className="mb-2">✓ Up to 3 Traditional accounts</li>
                                <li className="mb-2">✓ 2 Investment accounts</li>
                                <li className="mb-2">✓ 3 CEX accounts</li>
                                <li className="mb-2">✓ 1 Web3 wallet</li>
                                <li className="mb-2">✓ 30 AI queries/day</li>
                                <li className="mb-2">✓ Enhanced infographics and AI overviews</li>
                                <li className="mb-2">✓ Daily automated refresh</li>
                                <li className="mb-2">
                                    ✓ 30-day recent history; older data archived for lookup
                                </li>
                                <li className="mb-2">
                                    ✓ Developer Marketplace preview only (interactions blocked)
                                </li>
                            </ul>
                        </div>
                        <div className="card-footer">
                            <Link to="/signup" className="btn btn-accent w-full">
                                Get Started
                            </Link>
                        </div>
                    </div>

                    {/* Pro Tier */}
                    {/* Pro Tier */}
                    <div className="card relative">
                        <div className="card-header">
                            <h3>Pro</h3>
                            <div className="text-3xl font-bold text-[var(--color-primary)] my-4">
                                $25
                                <span className="text-base font-normal">/month</span>
                            </div>
                            <div className="text-sm text-[var(--text-muted)]">
                                or $20.83/month annual ($250/year)
                            </div>
                        </div>
                        <div className="card-body">
                            <ul className="list-none p-0">
                                <li className="mb-2">✓ Up to 5 Traditional accounts</li>
                                <li className="mb-2">✓ 5 Investment accounts</li>
                                <li className="mb-2">✓ 5 Web3 wallets</li>
                                <li className="mb-2">✓ Up to 10 CEX accounts</li>
                                <li className="mb-2">✓ 40 AI queries/day</li>
                                <li className="mb-2">✓ Full transaction history</li>
                                <li className="mb-2">✓ Faster scheduled refreshes</li>
                                <li className="mb-2">✓ 7-day free trial</li>
                                <li className="mb-2">✓ Developer Marketplace access</li>
                            </ul>
                        </div>
                        <div className="card-footer">
                            <Link to="/signup" className="btn btn-primary w-full">
                                Start Free Trial
                            </Link>
                        </div>
                    </div>

                    {/* Ultimate Tier */}
                    <div className="card relative opacity-90">
                        <div className="card-header">
                            <h3>Ultimate</h3>
                            <div className="text-3xl font-bold text-[var(--color-primary)] my-4">
                                $60
                                <span className="text-base font-normal">/month</span>
                            </div>
                            <div className="text-sm text-[var(--text-muted)]">or $600/year</div>
                        </div>
                        <div className="card-body">
                            <ul className="list-none p-0">
                                <li className="mb-2">
                                    ✓ Up to 20 Traditional, Investment, Web3, and CEX accounts
                                </li>
                                <li className="mb-2">✓ Advanced AI with smart routing</li>
                                <li className="mb-2">✓ 200 AI queries/day</li>
                                <li className="mb-2">✓ Family/Couple features</li>
                                <li className="mb-2">✓ Individual net worth tracking</li>
                                <li className="mb-2">✓ Account assignment per family member</li>
                                <li className="mb-2">✓ Tab-based interface</li>
                                <li className="mb-2">✓ Combined family dashboard</li>
                                <li className="mb-2">✓ All Pro Tier features</li>
                                <li className="mb-2">✓ Developer Marketplace access</li>
                            </ul>
                        </div>
                        <div className="card-footer">
                            <Link to="/signup" className="btn btn-outline w-full">
                                Get Started
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Feature Comparison */}
                <div className="glass-panel mb-12">
                    <h2 className="text-center mb-12">
                        Feature Comparison
                    </h2>
                    <div className="overflow-x-auto">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Feature</th>
                                    <th>Free</th>
                                    <th>Essential</th>
                                    <th>Pro</th>
                                    <th>Ultimate</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>
                                        <strong>Traditional Accounts</strong>
                                    </td>
                                    <td>2</td>
                                    <td>3</td>
                                    <td>5</td>
                                    <td>20</td>
                                </tr>
                                <tr>
                                    <td>
                                        <strong>Investment Accounts</strong>
                                    </td>
                                    <td>1</td>
                                    <td>2</td>
                                    <td>5</td>
                                    <td>20</td>
                                </tr>
                                <tr>
                                    <td>
                                        <strong>Web3 Wallets</strong>
                                    </td>
                                    <td>1</td>
                                    <td>1</td>
                                    <td>5</td>
                                    <td>20</td>
                                </tr>
                                <tr>
                                    <td>
                                        <strong>CEX Accounts</strong>
                                    </td>
                                    <td>1</td>
                                    <td>3</td>
                                    <td>10</td>
                                    <td>20</td>
                                </tr>
                                <tr>
                                    <td>
                                        <strong>AI Queries/Day</strong>
                                    </td>
                                    <td>20</td>
                                    <td>30</td>
                                    <td>40</td>
                                    <td>200</td>
                                </tr>
                                <tr>
                                    <td>
                                        <strong>AI Model</strong>
                                    </td>
                                    <td>Standard</td>
                                    <td>Standard</td>
                                    <td>Standard</td>
                                    <td>Advanced with smart routing</td>
                                </tr>
                                <tr>
                                    <td>
                                        <strong>Data Retention</strong>
                                    </td>
                                    <td>45 days</td>
                                    <td>30 days hot + archive</td>
                                    <td>Full history</td>
                                    <td>Full history</td>
                                </tr>
                                <tr>
                                    <td>
                                        <strong>Sync Cadence</strong>
                                    </td>
                                    <td>Manual (10/day)</td>
                                    <td>Daily automated</td>
                                    <td>Faster scheduled</td>
                                    <td>Faster scheduled</td>
                                </tr>
                                <tr>
                                    <td>
                                        <strong>Family Features</strong>
                                    </td>
                                    <td>—</td>
                                    <td>—</td>
                                    <td>—</td>
                                    <td>✓</td>
                                </tr>
                                <tr>
                                    <td>
                                        <strong>Free Trial</strong>
                                    </td>
                                    <td>—</td>
                                    <td>—</td>
                                    <td>7 days</td>
                                    <td>—</td>
                                </tr>
                                <tr>
                                    <td>
                                        <strong>Developer Marketplace</strong>
                                    </td>
                                    <td>Preview only (blocked)</td>
                                    <td>Preview only (blocked)</td>
                                    <td>Full access</td>
                                    <td>Full access</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* FAQ */}
                <div className="glass-panel">
                    <h2 className="text-center mb-8">
                        Frequently Asked Questions
                    </h2>
                    <div className="max-w-[800px] mx-auto">
                        <div className="mb-6">
                            <h3>Can I change plans later?</h3>
                            <p>
                                Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately, and billing is
                                prorated.
                            </p>
                        </div>
                        <div className="mb-8">
                            <h3>What payment methods do you accept?</h3>
                            <p>
                                We accept all major credit cards and process payments securely through Stripe. For Texas-based customers,
                                we collect and remit Texas sales tax on 80% of the subscription fee.
                            </p>
                        </div>
                        <div className="mb-8">
                            <h3>Is my financial data secure?</h3>
                            <p>
                                Yes. We use bank-level encryption, read-only account access, and comply with GLBA and GDPR requirements.
                                We never move your money or initiate transactions.
                            </p>
                        </div>
                        <div className="mb-8">
                            <h3>What happens to my data if I cancel?</h3>
                            <p>
                                You can export your data at any time. After cancellation, your data is retained according to your tier&apos;s
                                retention policy, then securely deleted per our Privacy Policy.
                            </p>
                        </div>
                        <div className="mb-8">
                            <h3>Do you offer refunds?</h3>
                            <p>
                                Subscription fees are non-refundable except as required by law. Pro Tier includes a 7-day free trial so
                                you can try before committing.
                            </p>
                        </div>
                    </div>
                </div>

                {/* CTA */}
                <div className="text-center mt-16">
                    <h2 className="mb-8">Ready to Get Started?</h2>
                    <Link to="/signup" className="btn btn-primary btn-lg">
                        Create Your Free Account
                    </Link>
                    <p className="mt-4 text-sm text-[var(--text-muted)]">
                        No credit card required. Start with the Free tier and upgrade when you&apos;re ready.
                    </p>
                </div>
            </section >
        </div >
    )
}
