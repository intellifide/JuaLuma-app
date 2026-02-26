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
 * CORE PURPOSE: Developer SDK documentation and reference guide.
 * LAST MODIFIED: 2026-01-25 20:47 CST
 */
import React from 'react';

export default function DeveloperSDKPage() {
    return (
        <div className="container py-24">
            <header className="mb-16">
                <h1 className="text-5xl font-extrabold mb-4">Developer <span className="text-primary">SDK</span></h1>
                <p className="text-xl text-muted">Build, test, and deploy JuaLuma widgets with our secure API tools.</p>
            </header>

            <div className="grid lg:grid-cols-[250px_1fr] gap-12">
                <nav className="space-y-2 sticky top-24 h-fit">
                    <a href="#intro" className="block text-primary font-bold">Introduction</a>
                    <a href="#auth" className="block text-muted hover:text-white transition-colors">Authentication</a>
                    <a href="#scopes" className="block text-muted hover:text-white transition-colors">Data Scopes</a>
                    <a href="#events" className="block text-muted hover:text-white transition-colors">Event Handling</a>
                    <a href="#deployment" className="block text-muted hover:text-white transition-colors">Deployment</a>
                </nav>

                <main className="max-w-4xl">
                    <section id="intro" className="mb-16">
                        <h2 className="text-3xl font-bold mb-6">Introduction</h2>
                        <p className="text-lg text-muted mb-6 leading-relaxed">
                            The JuaLuma SDK is a JavaScript-based toolkit designed to create sandbox-safe widgets. All widgets run in an isolated environment that restricts direct DOM access and external network calls, ensuring user data privacy while providing rich interactivity.
                        </p>
                        <div className="bg-black/40 p-6 rounded-xl border border-white/10 font-mono text-sm mb-6">
                            <span className="text-muted"># Install SDK CLI globally</span><br/>
                            <span className="text-primary">npm install -g @jualuma/cli</span>
                        </div>
                    </section>

                    <section id="scopes" className="mb-16">
                        <h2 className="text-3xl font-bold mb-6">Data Scopes</h2>
                        <p className="text-muted mb-6">All data access must be explicitly declared in your <code>widget.json</code> manifest and approved by the user during installation.</p>
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/10">
                                    <th className="py-4 font-bold">Scope</th>
                                    <th className="py-4 font-bold">Description</th>
                                    <th className="py-4 font-bold">Access</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                <tr className="border-b border-white/5">
                                    <td className="py-4 font-mono text-primary">read:transactions</td>
                                    <td className="py-4 text-muted">Read transaction history and amounts</td>
                                    <td className="py-4">Read-only</td>
                                </tr>
                                <tr className="border-b border-white/5">
                                    <td className="py-4 font-mono text-primary">read:accounts</td>
                                    <td className="py-4 text-muted">Read account balances and metadata</td>
                                    <td className="py-4">Read-only</td>
                                </tr>
                                <tr className="border-b border-white/5">
                                    <td className="py-4 font-mono text-primary">read:budgets</td>
                                    <td className="py-4 text-muted">Read budget limits and spending</td>
                                    <td className="py-4">Read-only</td>
                                </tr>
                            </tbody>
                        </table>
                    </section>

                    <section id="deployment" className="mb-16">
                         <h2 className="text-3xl font-bold mb-6">Deployment</h2>
                         <p className="text-muted mb-6">Once your widget is ready, use the CLI to package and submit for review.</p>
                         <div className="bg-surface-2 p-8 rounded-2xl border border-white/5">
                             <div className="badge bg-green-500/20 text-green-400 mb-4">Command</div>
                             <code className="text-primary text-lg block mb-4">JuaLuma submit --bundle ./dist/widget.zip</code>
                             <p className="text-sm text-muted">Our team reviews all submissions for security and performance. Approval typically takes 2-3 business days.</p>
                         </div>
                    </section>
                </main>
            </div>
        </div>
    );
}
