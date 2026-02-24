/*
 * Copyright (c) 2026 Intellifide, LLC.
 * Licensed under PolyForm Noncommercial License 1.0.0.
 * See "/legal/license" for full license terms.
 *
 * COMMUNITY RIGHTS:
 * - You CAN modify this code for personal use.
 * - You CAN build and share widgets/plugins for the ecosystem.
 *
 * RESTRICTIONS:
 * - You CANNOT resell, repackage, or distribute this application for a fee.
 * - You CANNOT use this application for commercial enterprise purposes.
 */

/**
 * CORE PURPOSE: Marketplace landing page for finding and installing financial widgets.
 * LAST MODIFIED: 2026-01-25 20:45 CST
 */
import React from 'react';

export default function MarketplacePage() {
    return (
        <div className="container py-24">
            <header className="mb-16 text-center">
                <h1 className="text-5xl font-extrabold mb-6 tracking-tight">
                    Financial <span className="text-primary">Marketplace</span>
                </h1>
                <p className="text-xl text-muted max-w-2xl mx-auto">
                    Extend JuaLuma with powerful widgets built by experts. From crypto tracking to custom indexing, find the tools that fit your strategy.
                </p>
            </header>

            <section className="mb-20">
                <div className="grid md:grid-cols-3 gap-8">
                    {/* Featured Widgets */}
                    <div className="glass-panel p-6 border-l-4 border-l-primary hover:scale-[1.02] transition-transform cursor-pointer">
                        <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center text-2xl mb-4">📈</div>
                        <h3 className="text-xl font-bold mb-2">Alpha Stream</h3>
                        <p className="text-muted text-sm mb-4">Real-time sentiment analysis for S&P 500 stocks using AI processing.</p>
                        <div className="flex justify-end items-center text-xs">
                            <span className="text-muted">By JuaLuma Labs</span>
                        </div>
                    </div>

                    <div className="glass-panel p-6 border-l-4 border-l-accent hover:scale-[1.02] transition-transform cursor-pointer">
                        <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center text-2xl mb-4">₿</div>
                        <h3 className="text-xl font-bold mb-2">Crypto Pulse</h3>
                        <p className="text-muted text-sm mb-4">Deep liquidity tracking and whale alert dashboard for major L1s.</p>
                        <div className="flex justify-end items-center text-xs">
                            <span className="text-muted">By ChainInsight</span>
                        </div>
                    </div>

                    <div className="glass-panel p-6 border-l-4 border-l-gray-500 hover:scale-[1.02] transition-transform cursor-pointer">
                        <div className="w-12 h-12 bg-gray-500/10 rounded-lg flex items-center justify-center text-2xl mb-4">📊</div>
                        <h3 className="text-xl font-bold mb-2">Budget Master</h3>
                        <p className="text-muted text-sm mb-4">Advanced categorization and predictive spending charts for small households.</p>
                        <div className="flex justify-end items-center text-xs">
                            <span className="text-muted">By Community</span>
                        </div>
                    </div>
                </div>
            </section>

            <section className="text-center bg-surface-2 p-12 rounded-3xl border border-white/5">
                <h2 className="text-3xl font-bold mb-4">Are you a developer?</h2>
                <p className="text-muted mb-8 max-w-xl mx-auto">
                    Join our developer program and reach thousands of users. Build, publish, and monetize your financial widgets today.
                </p>
                <div className="flex gap-4 justify-center">
                    <a href="/developers" className="btn btn-primary">Become a Partner</a>
                    <a href="/developer-sdk" className="btn btn-outline">Read SDK Docs</a>
                </div>
            </section>
        </div>
    );
}
