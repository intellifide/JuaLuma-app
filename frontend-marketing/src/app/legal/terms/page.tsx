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
 * CORE PURPOSE: Terms of Service.
 * LAST MODIFIED: 2026-01-25 20:47 CST
 */
import React from 'react';

export default function TermsPage() {
    return (
        <div className="container py-24 max-w-4xl">
            <h1 className="text-5xl font-extrabold mb-10">Terms of <span className="text-primary">Service</span></h1>
            <div className="space-y-8 text-muted leading-relaxed">
                <p className="italic">Last Updated: February 11, 2026</p>
                <section>
                    <h2 className="text-2xl font-bold text-white mb-4">1. Acceptance of Terms</h2>
                    <p>
                        By accessing or using JuaLuma (the "Service"), provided by Intellifide, LLC ("Company," "we," "us," or "our"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you may not access or use the Service.
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-bold text-white mb-4">2. Description of Service</h2>
                    <p>
                        JuaLuma is a financial data aggregation and analysis platform. We use third-party services (such as Plaid) to retrieve your financial data and Large Language Models (LLMs) to provide insights and analysis.
                    </p>
                    <p className="mt-4 font-semibold text-warning">
                        Important: JuaLuma is NOT a licensed financial advisor, investment advisor, tax advisor, or legal advisor. All insights provided by the AI are for informational purposes only.
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-bold text-white mb-4">3. Eligibility</h2>
                    <p>You must be at least 18 years old and a resident of the United States to use the Service. By using the Service, you represent and warrant that you meet these eligibility requirements.</p>
                </section>

                <section>
                    <h2 className="text-2xl font-bold text-white mb-4">4. User Accounts and Security</h2>
                    <p>You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account.</p>
                    <p className="mt-4">We do not store your bank passwords. All financial institution connections are handled via secure, encrypted tokens provided by our data aggregation partners.</p>
                </section>

                <section>
                    <h2 className="text-2xl font-bold text-white mb-4">5. Subscription Tiers and Payments</h2>
                    <ul className="list-disc pl-6 space-y-2">
                        <li><strong>Billing:</strong> Subscriptions are billed in advance on a monthly basis.</li>
                        <li><strong>Texas Sales Tax:</strong> For Texas residents, sales tax is applied to 80% of the service fee, reflecting the state's 20% exemption for data processing services.</li>
                        <li><strong>Cancellations:</strong> You may cancel at any time. Your access will continue until the end of the current billing period.</li>
                        <li><strong>Refunds:</strong> Generally, all fees are non-refundable unless required by law.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-2xl font-bold text-white mb-4">6. AI and Content Disclaimer</h2>
                    <p>The Service utilizes AI technology to process and interpret data. You acknowledge that AI-generated insights may be inaccurate, incomplete, or biased. Always verify AI-generated information against your official financial statements.</p>
                </section>

                <section>
                    <h2 className="text-2xl font-bold text-white mb-4">7. Limitation of Liability</h2>
                    <p>TO THE MAXIMUM EXTENT PERMITTED BY LAW, INTELLIFIDE, LLC SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES, RESULTING FROM YOUR USE OF THE SERVICE.</p>
                </section>

                <section>
                    <h2 className="text-2xl font-bold text-white mb-4">8. Governing Law</h2>
                    <p>These Terms shall be governed by and construed in accordance with the laws of the State of Texas, without regard to its conflict of law principles.</p>
                </section>

                <section>
                    <h2 className="text-2xl font-bold text-white mb-4">9. Source-Available License</h2>
                    <p>
                        JuaLuma is source available under the PolyForm Noncommercial License 1.0.0. You may audit the code, run it locally, and build widgets/plugins for personal and noncommercial ecosystem use.
                    </p>
                    <p className="mt-4">
                        Commercial resale, repackaging, paid redistribution, or enterprise deployment of the application is strictly prohibited without separate written permission from Intellifide, LLC.
                    </p>
                    <p className="mt-4">
                        License text: <a href="/PolyForm-Noncommercial-1.0.0.txt" className="text-primary underline">PolyForm-Noncommercial-1.0.0.txt</a>
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-bold text-white mb-4">10. Developer and API Use</h2>
                    <p>
                        If you use JuaLuma developer tools, APIs, or widget interfaces, you must follow documented authentication, scope, and rate-limit requirements. You may not bypass access controls, scrape unauthorized data, or misrepresent third-party widgets as official Intellifide products.
                    </p>
                </section>

                <section className="bg-surface-1 p-8 rounded-xl border border-white/5 shadow-inner">
                    <h2 className="text-2xl font-bold text-white mb-4">Contact Information</h2>
                    <p>
                        Questions about the Terms of Service should be sent to us at <a href="mailto:intellifidellc@gmail.com" className="text-primary underline">intellifidellc@gmail.com</a>.
                    </p>
                </section>
            </div>
        </div>
    );
}
