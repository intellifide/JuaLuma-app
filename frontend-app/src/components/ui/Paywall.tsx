/*
 * Copyright (c) 2026 Intellifide, LLC.
 * Licensed under PolyForm Noncommercial License 1.0.0.
 * See "PolyForm-Noncommercial-1.0.0.txt" for full text.
 *
 * COMMUNITY RIGHTS:
 * - You CAN modify this code for personal use.
 * - You CAN build and share widgets/plugins for the ecosystem.
 *
 * RESTRICTIONS:
 * - You CANNOT resell, repackage, or distribute this application for a fee.
 * - You CANNOT use this application for commercial enterprise purposes.
 */

import React from 'react';
import { Link } from 'react-router-dom';

interface PaywallProps {
    title: string;
    description: string;
    requiredTier?: string;
}

export const Paywall: React.FC<PaywallProps> = ({
    title,
    description,
    requiredTier = 'Pro'
}) => {
    return (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="glass-panel max-w-2xl w-full p-12 relative overflow-hidden">
                {/* Decorative background elements */}
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-royal-purple/10 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-deep-indigo/10 rounded-full blur-3xl"></div>

                <div className="relative z-10">
                    <div className="w-20 h-20 bg-royal-purple/10 rounded-2xl flex items-center justify-center mx-auto mb-8 border border-royal-purple/20">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#6B46C1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                        </svg>
                    </div>

                    <h1 className="text-3xl font-bold mb-4 bg-gradient-to-r from-royal-purple to-deep-indigo bg-clip-text text-transparent">
                        {title}
                    </h1>

                    <p className="text-lg text-text-secondary mb-8 leading-relaxed">
                        {description}
                    </p>

                    <div className="bg-bg-secondary/50 border border-border rounded-xl p-6 mb-8 text-left">
                        <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4 flex items-center gap-2">
                            <span className="w-2 h-2 bg-royal-purple rounded-full"></span>
                            Unlock Developer Features
                        </h3>
                        <ul className="space-y-3">
                            {[
                                'Build and publish custom widgets',
                                'Full access to the Developer SDK',
                                'Revenue sharing opportunities'
                            ].map((feature, i) => (
                                <li key={i} className="flex items-start gap-3 text-text-primary">
                                    <svg className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                    </svg>
                                    <span className="text-sm font-medium">{feature}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link to="/pricing" className="btn btn-primary px-8 py-3 text-lg shadow-xl shadow-royal-purple/20">
                            Upgrade to {requiredTier}
                        </Link>
                        <Link to="/features" className="btn btn-outline px-8 py-3 text-lg">
                            Learn More
                        </Link>
                    </div>

                    <p className="mt-8 text-xs text-text-muted">
                        Need help? <Link to="/support" className="text-royal-purple hover:underline">Contact our partnership team</Link>
                    </p>
                </div>
            </div>
        </div>
    );
};
