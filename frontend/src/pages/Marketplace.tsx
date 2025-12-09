import React from 'react';
import { Link } from 'react-router-dom';

export const Marketplace = () => {
    return (
        <div className="container py-16">
            <h1 className="text-center mb-4">Finity Marketplace</h1>
            <p className="text-center text-lg text-text-secondary mb-12 max-w-[700px] mx-auto">
                Discover curated widgets and tools from developers to enhance your financial management experience.
            </p>

            {/* Developer Banner CTA */}
            <div className="bg-blue-500/10 border border-blue-500/20 text-blue-400 p-4 rounded-lg mb-12 text-center">
                <strong>Building widgets?</strong> Visit the <Link to="/developer-marketplace" className="font-semibold underline">Developer Marketplace</Link> to create and submit your own widgets for distribution.
            </div>

            {/* Marketplace Info */}
            <div className="glass-panel mb-12">
                <h2 className="mb-4">About the Marketplace</h2>
                <p className="mb-4">
                    The Finity Marketplace is a curated catalog where developers can create and distribute widgets that integrate with the Finity platform. Developers earn revenue based on user engagement and verified ratings (1-5 star system).
                </p>
                <p className="mb-4">
                    All developers must execute a Developer Agreement that has been reviewed and approved by qualified legal counsel. The Developer Agreement includes intellectual property assignment clauses assigning all rights, title, and interest in any work product related to the Finity platform to Intellifide, LLC.
                </p>
                <div className="bg-blue-500/10 border border-blue-500/20 text-blue-400 p-4 rounded-lg">
                    <strong>Note:</strong> The Marketplace is currently in development and will be available in a future release. Check back soon for updates!
                </div>
            </div>

            {/* Preview Widgets */}
            <h2 className="text-center mb-12">Featured Widgets (Preview)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
                <div className="card flex flex-col">
                    <div className="mb-4 border-b border-white/10 pb-4">
                        <h3 className="m-0">Budget Calculator</h3>
                        <div className="flex gap-2 mt-2">
                            <span className="badge bg-emerald-500 text-white">Popular</span>
                            <span className="badge bg-bg-secondary text-text-primary">4.8 ⭐</span>
                        </div>
                    </div>
                    <div className="flex-1">
                        <p>Advanced budget calculator with scenario planning and forecasting capabilities.</p>
                        <p className="text-sm text-text-muted mt-2">
                            <strong>Developer:</strong> FinanceTools Inc.<br />
                            <strong>Downloads:</strong> 12,450<br />
                            <strong>Updated:</strong> 2 weeks ago
                        </p>
                    </div>
                    <div className="mt-6">
                        <button className="btn btn-outline w-full" disabled>Coming Soon</button>
                    </div>
                </div>

                <div className="card flex flex-col">
                    <div className="mb-4 border-b border-white/10 pb-4">
                        <h3 className="m-0">Tax Report Generator</h3>
                        <div className="flex gap-2 mt-2">
                            <span className="badge bg-purple-500 text-white">New</span>
                            <span className="badge bg-bg-secondary text-text-primary">4.6 ⭐</span>
                        </div>
                    </div>
                    <div className="flex-1">
                        <p>Generate comprehensive tax reports from your transaction data. Export to CSV or PDF formats.</p>
                        <p className="text-sm text-text-muted mt-2">
                            <strong>Developer:</strong> TaxHelper Pro<br />
                            <strong>Downloads:</strong> 8,230<br />
                            <strong>Updated:</strong> 1 month ago
                        </p>
                    </div>
                    <div className="mt-6">
                        <button className="btn btn-outline w-full" disabled>Coming Soon</button>
                    </div>
                </div>

                <div className="card flex flex-col">
                    <div className="mb-4 border-b border-white/10 pb-4">
                        <h3 className="m-0">Investment Analyzer</h3>
                        <div className="flex gap-2 mt-2">
                            <span className="badge bg-bg-secondary text-text-primary">4.9 ⭐</span>
                        </div>
                    </div>
                    <div className="flex-1">
                        <p>Analyze your investment portfolio performance with detailed charts and metrics.</p>
                        <p className="text-sm text-text-muted mt-2">
                            <strong>Developer:</strong> Portfolio Insights<br />
                            <strong>Downloads:</strong> 15,680<br />
                            <strong>Updated:</strong> 3 days ago
                        </p>
                    </div>
                    <div className="mt-6">
                        <button className="btn btn-outline w-full" disabled>Coming Soon</button>
                    </div>
                </div>

                <div className="card flex flex-col">
                    <div className="mb-4 border-b border-white/10 pb-4">
                        <h3 className="m-0">Expense Tracker Pro</h3>
                        <div className="flex gap-2 mt-2">
                            <span className="badge bg-bg-secondary text-text-primary">4.7 ⭐</span>
                        </div>
                    </div>
                    <div className="flex-1">
                        <p>Enhanced expense tracking with receipt scanning and automatic categorization.</p>
                        <p className="text-sm text-text-muted mt-2">
                            <strong>Developer:</strong> ExpenseMaster<br />
                            <strong>Downloads:</strong> 9,120<br />
                            <strong>Updated:</strong> 1 week ago
                        </p>
                    </div>
                    <div className="mt-6">
                        <button className="btn btn-outline w-full" disabled>Coming Soon</button>
                    </div>
                </div>

                <div className="card flex flex-col">
                    <div className="mb-4 border-b border-white/10 pb-4">
                        <h3 className="m-0">Goal Tracker</h3>
                        <div className="flex gap-2 mt-2">
                            <span className="badge bg-bg-secondary text-text-primary">4.5 ⭐</span>
                        </div>
                    </div>
                    <div className="flex-1">
                        <p>Set and track financial goals with progress visualization and milestone alerts.</p>
                        <p className="text-sm text-text-muted mt-2">
                            <strong>Developer:</strong> GoalSetter Apps<br />
                            <strong>Downloads:</strong> 6,890<br />
                            <strong>Updated:</strong> 2 months ago
                        </p>
                    </div>
                    <div className="mt-6">
                        <button className="btn btn-outline w-full" disabled>Coming Soon</button>
                    </div>
                </div>

                <div className="card flex flex-col">
                    <div className="mb-4 border-b border-white/10 pb-4">
                        <h3 className="m-0">Bill Reminder</h3>
                        <div className="flex gap-2 mt-2">
                            <span className="badge bg-bg-secondary text-text-primary">4.4 ⭐</span>
                        </div>
                    </div>
                    <div className="flex-1">
                        <p>Never miss a bill with smart reminders and automatic payment tracking.</p>
                        <p className="text-sm text-text-muted mt-2">
                            <strong>Developer:</strong> BillTracker Solutions<br />
                            <strong>Downloads:</strong> 11,340<br />
                            <strong>Updated:</strong> 3 weeks ago
                        </p>
                    </div>
                    <div className="mt-6">
                        <button className="btn btn-outline w-full" disabled>Coming Soon</button>
                    </div>
                </div>
            </div>

            {/* Developer Info */}
            <div className="glass-panel">
                <h2 className="text-center mb-8">For Developers</h2>
                <div className="max-w-[800px] mx-auto">
                    <p className="mb-4">
                        Interested in developing widgets for the Finity Marketplace? We're building a developer program that will allow you to create and distribute widgets that integrate with the Finity platform.
                    </p>
                    <p className="mb-4">
                        Developers earn revenue based on user engagement (downloads) and verified ratings. All widgets must comply with our Developer Agreement and platform guidelines.
                    </p>
                    <p className="mb-4">
                        The Marketplace is currently in development. If you're interested in becoming a developer partner, please contact us for more information.
                    </p>
                    <div className="text-center mt-12">
                        <Link to="/support" className="btn btn-primary">Contact Us About Developer Program</Link>
                    </div>
                </div>
            </div>
        </div>
    );
};
