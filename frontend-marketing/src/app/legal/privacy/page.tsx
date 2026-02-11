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
 * CORE PURPOSE: Privacy Policy detailing data handling and Texas compliance.
 * LAST MODIFIED: 2026-01-25 20:47 CST
 */
import React from 'react';

export default function PrivacyPage() {
    return (
        <div className="container py-24 max-w-4xl">
            <h1 className="text-5xl font-extrabold mb-10">Privacy <span className="text-primary">Policy</span></h1>
            <div className="space-y-8 text-muted leading-relaxed">
                <p className="italic">Effective Date: February 11, 2026</p>
                <section>
                    <h2 className="text-2xl font-bold text-white mb-4">Introduction</h2>
                    <p>
                        Intellifide, LLC ("Company," "we," "us," or "our") operates the JuaLuma financial aggregation and analysis platform ("Service"). We are committed to protecting your privacy and handling your personal information responsibly.
                    </p>
                    <p className="mt-4">
                        <strong>Important:</strong> As a financial data aggregator, we are classified as a "financial institution" under the Gramm-Leach-Bliley Act (GLBA). This Privacy Policy describes how we collect, use, share, and protect your information in compliance with GLBA and other applicable privacy laws.
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-bold text-white mb-4">1. Information We Collect</h2>
                    <h3 className="text-xl font-semibold text-white/90 mb-2">1.1 Information You Provide</h3>
                    <ul className="list-disc pl-6 space-y-2">
                        <li><strong>Account Information:</strong> Name, Email address, encrypted password, phone number, and subscription preferences.</li>
                        <li><strong>Financial Account Information:</strong> Masked/encrypted account numbers, balances, transaction history, and Web3 wallet addresses.</li>
                        <li><strong>Usage Information:</strong> Preferences, settings, notification settings, and theme preferences.</li>
                    </ul>
                    <h3 className="text-xl font-semibold text-white/90 mt-6 mb-2">1.2 Information We Collect Automatically</h3>
                    <p>We collect technical information including IP addresses, device info, browser type, and usage patterns to ensure security and improve our service.</p>
                    <h3 className="text-xl font-semibold text-white/90 mt-6 mb-2">1.3 Data From Linked Financial Providers</h3>
                    <p>
                        When you connect financial accounts, we receive read-only data from providers such as Plaid and exchange integrations, including account metadata, masked identifiers, balances, and transaction history.
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-bold text-white mb-4">2. How We Use Your Information</h2>
                    <ul className="list-disc pl-6 space-y-2">
                        <li><strong>Service Provision:</strong> Aggregating and analyzing financial data, generating reports, and providing AI-powered analysis tools.</li>
                        <li><strong>Service Improvement:</strong> Developing new features, optimizing performance, and ensuring security.</li>
                        <li><strong>Legal and Compliance:</strong> Complying with GLBA, response to legal process, and protecting our rights.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-2xl font-bold text-white mb-4">3. Information Sharing and Disclosure</h2>
                    <p><strong>We Do NOT Sell Your Information.</strong> We do not sell, rent, or trade your personal information to third parties for their marketing purposes.</p>
                    <p className="mt-4">We share information with service providers like Plaid (data aggregation), Stripe (payment processing), and Google Cloud Platform (infrastructure) under strict confidentiality agreements.</p>
                    <p className="mt-4">
                        We may also disclose data as required by law, legal process, fraud prevention requirements, or to protect users and platform integrity.
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-bold text-white mb-4">4. Data Security</h2>
                    <p>We implement industry-standard security measures including AES-256 encryption at rest, TLS 1.3 in transit, and multi-factor authentication. We comply with the GLBA Safeguards Rule through a written WISP (Written Information Security Program).</p>
                </section>

                <section>
                    <h2 className="text-2xl font-bold text-white mb-4">5. Your Privacy Rights</h2>
                    <p>As a financial institution, we provide privacy notices and opt-out rights as required by GLBA. California residents also have rights under the CCPA, including the Right to Know, Right to Delete, and Right to Non-Discrimination.</p>
                </section>

                <section>
                    <h2 className="text-2xl font-bold text-white mb-4">6. Data Retention and Deletion</h2>
                    <p>
                        We retain data only as long as needed for service operation, security, legal compliance, tax and payment obligations, and dispute resolution.
                    </p>
                    <p className="mt-4">
                        You may request account deletion through account settings or by contacting privacy@jualuma.com. We process verified deletion requests within a commercially reasonable period, subject to legal retention requirements. Backup copies may persist temporarily under standard backup lifecycles.
                    </p>
                </section>

                <section className="bg-surface-1 p-8 rounded-xl border border-white/5 shadow-inner">
                    <h2 className="text-2xl font-bold text-white mb-4">Contact Us</h2>
                    <p>
                        For any privacy inquiries or to exercise your rights, please contact the Data Privacy Officer at <a href="mailto:intellifidellc@gmail.com" className="text-primary underline">intellifidellc@gmail.com</a>.
                    </p>
                    <p className="mt-4 text-sm opacity-70">
                        Intellifide, LLC<br />
                        Texas Compliance Office
                    </p>
                </section>
            </div>
        </div>
    );
}
