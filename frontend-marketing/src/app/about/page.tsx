/**
 * CORE PURPOSE: About page detailing the mission, team, and regulatory compliance.
 * LAST MODIFIED: 2026-01-25 20:45 CST
 */
import React from 'react';

export default function AboutPage() {
    return (
        <div className="container py-24">
            <header className="mb-20">
                <h1 className="text-5xl font-extrabold mb-6">Our <span className="text-primary">Mission</span></h1>
                <p className="text-2xl text-muted max-w-3xl leading-relaxed">
                    We believe financial independence is not a destination, but a state of perpetual clarity. JuaLuma was built to give every person the tools to see their entire financial universe in one place, powered by intelligence they can trust.
                </p>
            </header>

            <div className="grid md:grid-cols-2 gap-16 mb-24">
                <section>
                    <h2 className="text-3xl font-bold mb-6">Built for Accuracy</h2>
                    <p className="text-lg text-muted mb-4">
                        Unlike traditional banking apps that offer static snapshots, JuaLuma provides a dynamic canvas. We integrate directly with over 12,000 financial institutions, crypto exchanges, and real estate markets to provide a true reflection of your net worth.
                    </p>
                    <p className="text-lg text-muted">
                        Our AI Assistant doesn't just "chat"—it analyzes your specific transactions using secure RAG technology to provide insights that are strictly personal and highly relevant.
                    </p>
                </section>
                <section>
                    <h2 className="text-3xl font-bold mb-6">Compliance & Security</h2>
                    <p className="text-lg text-muted mb-4">
                        Based in Austin, Texas, JuaLuma adheres to the highest standards of financial security. We are SOC 2 compliant in spirit and implementation, using bank-grade encryption for all data at rest and in transit.
                    </p>
                    <div className="glass-panel p-6 border-l-4 border-l-success">
                        <h4 className="font-bold text-success mb-2">Transparency Note</h4>
                        <p className="text-sm text-muted">
                            Texas residents: We collect and remit 80% Texas sales tax on subscription fees, as 20% of JuaLuma services are classified as non-taxable data processing under Chapter 151 of the Texas Tax Code.
                        </p>
                    </div>
                </section>
            </div>

            <section className="text-center py-20 border-t border-white/5">
                <h2 className="text-3xl font-bold mb-10">Trusted Partners</h2>
                <div className="flex flex-wrap justify-center gap-12 grayscale opacity-50">
                   <span className="text-2xl font-bold">PLAID</span>
                   <span className="text-2xl font-bold">STRIPE</span>
                   <span className="text-2xl font-bold">FIREBASE</span>
                   <span className="text-2xl font-bold">VERTEX AI</span>
                </div>
            </section>
        </div>
    );
}
