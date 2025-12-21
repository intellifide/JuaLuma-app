/**
 * CORE PURPOSE: Landing page for the Developer Portal.
 * LAST MODIFIED: 2025-12-21 17:15 CST
 */
import React from 'react';
import { Link } from 'react-router-dom';

export const DeveloperLanding = () => {

    return (
        <div className="min-h-screen bg-bg-primary">
            {/* Nav */}
            <nav className="border-b border-white/5 bg-bg-primary/50 backdrop-blur-md sticky top-0 z-50">
                <div className="container h-16 flex items-center justify-between">
                    <Link to="/" className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                        JuaLuma Developers
                    </Link>
                    <div className="flex items-center gap-4">
                        <Link to="/developers/login" className="text-text-secondary hover:text-white transition-colors">
                            Log In
                        </Link>
                        <Link to="/developers/signup" className="btn btn-primary btn-sm">
                            Join Program
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero */}
            <section className="relative py-24 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-transparent pointer-events-none" />
                <div className="container relative z-10 text-center">
                    <h1 className="text-5xl md:text-6xl font-extrabold mb-6 tracking-tight">
                        Build <span className="text-primary">Financial Tools</span> for Everyone
                    </h1>
                    <p className="text-xl text-text-secondary max-w-2xl mx-auto mb-10">
                        Create powerful financial widgets, reach millions of users, and monetize your expertise on the JuaLuma Marketplace.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link to="/developers/signup" className="btn btn-primary btn-lg">
                            Start Building Now
                        </Link>
                        <Link to="/developer-sdk" className="btn btn-outline btn-lg">
                            Read the Docs
                        </Link>
                    </div>
                </div>
            </section>

            {/* Features */}
            <section className="py-20 bg-surface-1">
                <div className="container">
                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="p-8 rounded-2xl bg-white/5 border border-white/5 hover:border-primary/50 transition-colors">
                            <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center mb-6 text-2xl">
                                💰
                            </div>
                            <h3 className="text-xl font-bold mb-3">Revenue Share</h3>
                            <p className="text-text-secondary">
                                Earn 70% of revenue generated from your paid widgets and subscriptions. Straight to your bank account via Stripe.
                            </p>
                        </div>
                        <div className="p-8 rounded-2xl bg-white/5 border border-white/5 hover:border-primary/50 transition-colors">
                            <div className="w-12 h-12 rounded-lg bg-accent/20 flex items-center justify-center mb-6 text-2xl">
                                🌍
                            </div>
                            <h3 className="text-xl font-bold mb-3">Global Audience</h3>
                            <p className="text-text-secondary">
                                Instantly distribute your tools to our growing user base of financial enthusiasts and professionals.
                            </p>
                        </div>
                        <div className="p-8 rounded-2xl bg-white/5 border border-white/5 hover:border-primary/50 transition-colors">
                            <div className="w-12 h-12 rounded-lg bg-success/20 flex items-center justify-center mb-6 text-2xl">
                                🛠️
                            </div>
                            <h3 className="text-xl font-bold mb-3">Powerful SDK</h3>
                            <p className="text-text-secondary">
                                Build rich, interactive widgets using standard web technologies (HTML/JS) with our secure sandbox API.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-24 text-center">
                <div className="container">
                     <div className="p-12 rounded-3xl bg-gradient-to-r from-surface-2 to-surface-1 border border-white/10">
                         <h2 className="text-3xl font-bold mb-4">Ready to launch?</h2>
                         <p className="text-text-secondary mb-8">Join thousands of developers building the future of finance.</p>
                         <Link to="/developers/signup" className="btn btn-primary">Create Developer Account</Link>
                     </div>
                </div>
            </section>
        </div>
    );
};
