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
 * CORE PURPOSE: Developer Program landing page.
 * LAST MODIFIED: 2026-01-25 20:47 CST
 */
import React from 'react';
import { AppAuthLink } from '@/components/AppAuthLink';

export default function DevelopersPage() {
    return (
        <div className="container py-24">
            <header className="mb-16 text-center">
                <h1 className="text-5xl font-extrabold mb-6 tracking-tight">
                    Build the <span className="text-primary">Future of Finance</span>
                </h1>
                <p className="text-xl text-muted max-w-2xl mx-auto">
                    Join thousands of developers building powerful widgets on the JuaLuma platform. Access real-time financial data safely and build tools for personal and community use.
                </p>
                <div className="flex gap-4 justify-center mt-10">
                    <AppAuthLink appPath="/signup?role=developer" className="btn btn-primary">Join Developer Program</AppAuthLink>
                    <a href="/developer-sdk" className="btn btn-outline">Read the SDK Docs</a>
                </div>
            </header>

            <section className="glass-panel p-8 mb-16">
                <h2 className="text-2xl font-bold mb-4">Community Licensing</h2>
                <p className="text-muted mb-3">
                    JuaLuma is <strong>Source Available</strong>. You are free to audit the code, run it locally, and build widgets for the ecosystem. No special license is required to contribute.
                </p>
                <p className="text-muted mb-3">
                    Commercial resale or enterprise deployment is strictly prohibited.
                </p>
                <a href="/legal/license" className="text-primary underline" title="JuaLuma License Notice">
                    View the full license
                </a>
            </section>

            <section className="grid md:grid-cols-3 gap-8 mb-24">
                <div className="glass-panel p-8">
                    <div className="text-3xl mb-4">💰</div>
                    <h3 className="text-xl font-bold mb-3">70% Revenue Share</h3>
                    <p className="text-muted text-sm">Earn significant revenue from your paid widgets. We handle the billing and infrastructure so you can focus on code.</p>
                </div>
                <div className="glass-panel p-8">
                    <div className="text-3xl mb-4">🛠️</div>
                    <h3 className="text-xl font-bold mb-3">Powerful SDK</h3>
                    <p className="text-muted text-sm">Build using standard web technologies. Our secure sandbox ensures user privacy while giving you the data you need.</p>
                </div>
                <div className="glass-panel p-8">
                    <div className="text-3xl mb-4">🌍</div>
                    <h3 className="text-xl font-bold mb-3">Instant Distribution</h3>
                    <p className="text-muted text-sm">Launch your tools to a growing global audience of financial enthusiasts and professionals immediately.</p>
                </div>
            </section>

            <section className="bg-surface-2 p-12 rounded-3xl border border-white/5">
                <div className="grid md:grid-cols-2 gap-12 items-center">
                    <div>
                        <h2 className="text-3xl font-bold mb-6">Built-in Trust</h2>
                        <ul className="space-y-4">
                            <li className="flex items-start gap-3">
                                <span className="text-primary font-bold">✓</span>
                                <div>
                                    <h4 className="font-bold">OAuth Security</h4>
                                    <p className="text-sm text-muted">User-approved scopes only. No direct access to bank credentials ever.</p>
                                </div>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="text-primary font-bold">✓</span>
                                <div>
                                    <h4 className="font-bold">Global Settlement</h4>
                                    <p className="text-sm text-muted">Automatic payouts via Stripe Connect to over 40 countries.</p>
                                </div>
                            </li>
                        </ul>
                    </div>
                    <div className="bg-black/30 p-6 rounded-2xl border border-white/10 font-mono text-sm">
                        <div className="text-muted mb-4">// Initialize your first widget</div>
                        <div className="text-primary">npx @jualuma/sdk init my-widget</div>
                        <div className="text-muted mt-4">cd my-widget && npm run dev</div>
                    </div>
                </div>
            </section>
        </div>
    );
}
