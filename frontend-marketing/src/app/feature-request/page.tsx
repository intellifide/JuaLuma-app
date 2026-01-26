/**
 * CORE PURPOSE: Feature Request and Roadmap page.
 * LAST MODIFIED: 2026-01-25 21:05 CST
 */
import React from 'react';

export default function FeatureRequestPage() {
    return (
        <div className="container py-24">
            <header className="mb-16 text-center max-w-3xl mx-auto">
                <h1 className="text-5xl font-extrabold mb-6 tracking-tight">
                    Help Us Shape <span className="text-primary">JuaLuma</span>
                </h1>
                <p className="text-xl text-muted">
                    We're building the most powerful financial platform together. Your feedback directly impacts our roadmap. Have an idea for a new feature? We want to hear it.
                </p>
            </header>

            <div className="grid md:grid-cols-2 gap-12 items-start max-w-5xl mx-auto">
                <div className="glass-panel p-10">
                    <h2 className="text-2xl font-bold mb-6">Submit a Request</h2>
                    <p className="text-muted mb-8">
                        Our engineering team reviews every request. For immediate assistance or specialized integration needs, please reach out to our support team.
                    </p>
                    <div className="space-y-4">
                        <a href="http://localhost:5175/support/tickets/new" target="_blank" rel="noreferrer" className="btn btn-primary w-full text-center">Submit via Support Portal</a>
                        <a href="mailto:support@jualuma.com" className="btn btn-outline w-full text-center">Email Feature Squad</a>
                    </div>
                </div>

                <div className="space-y-8">
                    <section>
                        <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
                            <span className="text-primary">🚀</span> Current Focus
                        </h3>
                        <p className="text-muted text-sm border-l-2 border-primary pl-4 py-2">
                            We are currently focused on enhancing AI-driven budget forecasting and RAG-powered analysis for real estate investments.
                        </p>
                    </section>
                    
                    <section>
                        <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
                            <span className="text-primary">📅</span> Upcoming Features
                        </h3>
                        <ul className="space-y-3 text-muted text-sm">
                            <li className="flex gap-2">
                                <span className="text-primary">•</span> Automated Tax Categorization (Q1 2026)
                            </li>
                            <li className="flex gap-2">
                                <span className="text-primary">•</span> Multi-Currency Global Payouts for Devs (Q2 2026)
                            </li>
                            <li className="flex gap-2">
                                <span className="text-primary">•</span> Native iOS & Android Apps (Q3 2026)
                            </li>
                        </ul>
                    </section>
                </div>
            </div>
        </div>
    );
}
