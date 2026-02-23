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

/**
 * CORE PURPOSE: AI Disclaimer regarding financial advice.
 * LAST MODIFIED: 2026-01-25 20:47 CST
 */
import React from 'react';

export default function AIDisclaimerPage() {
    return (
        <div className="container py-24 max-w-4xl">
            <h1 className="text-5xl font-extrabold mb-10">AI <span className="text-primary">Disclaimer</span></h1>
            <div className="space-y-8 text-muted leading-relaxed">
                <div className="glass-panel p-10 border-l-8 border-l-warning bg-warning/5">
                    <h2 className="text-2xl font-bold mb-6 text-white">Important Financial Disclosure</h2>
                    <div className="space-y-6 text-lg">
                        <p>
                            JuaLuma utilizes Large Language Models (LLMs) and Retrieval-Augmented Generation (RAG) to provide automated analysis, categorization, and insights based on your financial data.
                        </p>
                        <p className="font-bold text-white uppercase tracking-wider bg-white/5 p-4 rounded">
                            The Service does not provide financial, investment, legal, or tax advice.
                        </p>
                        <section className="space-y-4">
                            <h3 className="text-xl font-bold text-white">1. No Professional Advice</h3>
                            <p>All insights, projections, and analysis provided by the JuaLuma AI assistant are for informational and educational purposes only. Intellifide LLC is not a Registered Investment Advisor (RIA) or a licensed broker-dealer. No content provided through the Service should be construed as a recommendation to buy, sell, or hold any security or financial instrument.</p>
                        </section>
                        <section className="space-y-4">
                            <h3 className="text-xl font-bold text-white">2. Accuracy of AI-Generated Content</h3>
                            <p>AI models can produce information that is inaccurate, incomplete, or outdated. This is sometimes referred to as "hallucination." While we strive to maintain high accuracy through RAG (Retrieval-Augmented Generation), you should verify any AI-generated figure or insight against your official bank statements and financial records.</p>
                        </section>
                        <section className="space-y-4">
                            <h3 className="text-xl font-bold text-white">3. User Responsibility</h3>
                            <p>You assume full responsibility for any financial decisions or actions you take based on the information provided by the Service. We strongly recommend consulting with a licensed financial professional before making significant financial decisions.</p>
                        </section>
                        <section className="space-y-4">
                            <h3 className="text-xl font-bold text-white">4. Third-Party Data</h3>
                            <p>Insights are only as accurate as the data provided by your linked financial institutions via Plaid. If there are delays or errors in bank data transmission, AI insights will be affected accordingly.</p>
                        </section>
                        <section className="space-y-4">
                            <h3 className="text-xl font-bold text-white">5. Model Routing, Fallback, and Usage Reset</h3>
                            <p>JuaLuma routes free requests to <strong>gpt-oss-120b</strong> and paid requests to <strong>gemini-2.5-flash</strong>. If paid premium capacity is exhausted for the active period, requests automatically fall back to <strong>gpt-oss-120b</strong> with explicit in-product messaging.</p>
                            <p>Usage is displayed as <strong>AI usage this period</strong> and reset timing follows your billing-cycle anniversary date.</p>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
}
