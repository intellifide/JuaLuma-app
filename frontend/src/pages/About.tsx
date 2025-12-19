import React from 'react';
import { Link } from 'react-router-dom';

export const About = () => {
    return (
        <div>
            <section className="container py-12">
                <h1 className="text-center mb-4 text-3xl font-bold">About jualuma</h1>
                <p className="text-center text-lg text-text-secondary mb-12 max-w-[700px] mx-auto">
                    Simplifying financial management for everyone, one transaction at a time.
                </p>

                {/* Mission Section */}
                <div id="mission" className="glass-panel mb-12">
                    <h2 className="text-center mb-8">Our Mission</h2>
                    <div className="max-w-[800px] mx-auto space-y-4">
                        <p className="text-lg">
                            At jualuma, we believe that managing your finances shouldn&apos;t be complicated. Our mission is to abstract financial complexity and provide a simple, automated, and visual platform for the mass-market consumer.
                        </p>
                        <p>
                            The product goal is to abstract financial complexity and provide a simple, automated, and visual platform for the mass-market consumer. The engineering focus is on simplicity, automation, and immediate value to serve a broad audience, not just financial experts.
                        </p>
                        <p>
                            Our primary value is the automation of financial tracking to save users time and provide a clear, holistic view of their financial health. Whether you&apos;re just starting out with one or two accounts, or managing a complex portfolio across multiple institutions, jualuma brings everything together in one place.
                        </p>
                    </div>
                </div>

                {/* Values Section */}
                <div className="glass-panel mb-12">
                    <h2 className="text-center mb-12">Our Core Principles</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="card">
                            <h3 className="text-xl font-bold mb-2">Privacy by Design</h3>
                            <p className="text-text-secondary">Data minimization is enforced at the schema level. PII is never collected unless critical. &quot;Right to be Forgotten&quot; is handled via cryptographic erasure and scheduled physical purging.</p>
                        </div>
                        <div className="card">
                            <h3 className="text-xl font-bold mb-2">Security First</h3>
                            <p className="text-text-secondary">Zero Trust architecture. All access is authenticated and authorized. Secrets are never stored in code, environment variables, or databases. Bank-level encryption protects your data.</p>
                        </div>
                        <div className="card">
                            <h3 className="text-xl font-bold mb-2">Read-Only Access</h3>
                            <p className="text-text-secondary">We never move your money. All account connections are strictly read-only to maintain non-MSB (Money Services Business) status. We can view your data but cannot initiate transactions.</p>
                        </div>
                        <div className="card">
                            <h3 className="text-xl font-bold mb-2">Regulatory Compliance</h3>
                            <p className="text-text-secondary">We comply with GLBA Safeguards, FinCEN requirements, and other applicable financial regulations. Our security program aligns with industry standards.</p>
                        </div>
                        <div className="card">
                            <h3 className="text-xl font-bold mb-2">Accessibility</h3>
                            <p className="text-text-secondary">Our platform utilizes an &quot;Engineered Liquid Glass&quot; framework ensuring all text and interactive elements maintain WCAG 2.1 AA (4.5:1) contrast dynamically.</p>
                        </div>
                        <div className="card">
                            <h3 className="text-xl font-bold mb-2">No Financial Advice</h3>
                            <p className="text-text-secondary">jualuma is for informational and educational purposes only. We do not provide financial, investment, tax, or legal advice. Always consult qualified professionals for financial decisions.</p>
                        </div>
                    </div>
                </div>

                {/* Company Info */}
                <div className="glass-panel mb-12">
                    <h2 className="text-center mb-8">About Intellifide, LLC</h2>
                    <div className="max-w-[800px] mx-auto space-y-4">
                        <p>
                            jualuma is developed and operated by <strong>Intellifide, LLC</strong>, a Texas-based technology company focused on developing software applications in areas lacking innovation.
                        </p>
                        <p>
                            Intellifide, LLC is organized to develop and operate multiple software applications, with jualuma being our flagship financial aggregation and analysis platform. We are committed to creating tools that simplify complex processes and provide immediate value to our users.
                        </p>
                        <p>
                            Our team combines expertise in financial technology, security, compliance, and user experience design to deliver a platform that is both powerful and easy to use.
                        </p>
                    </div>
                </div>

                {/* Target Users */}
                <div className="glass-panel mb-12">
                    <h2 className="text-center mb-12">Built for Everyone</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="card">
                            <h3 className="text-xl font-bold mb-2">The Beginner (Free Tier)</h3>
                            <p className="text-text-secondary mb-2">
                                If you&apos;re just starting out with 1-2 bank accounts, jualuma provides an immediate &quot;Aha!&quot; moment. Our priority is on flawless automated categorization, budget visualization, and recurring subscription detection. The system provides value within minutes of linking one account.
                            </p>
                        </div>
                        <div className="card">
                            <h3 className="text-xl font-bold mb-2">The Overwhelmed (Pro Tier)</h3>
                            <p className="text-text-secondary mb-2">
                                If you manage multiple accounts, spreadsheets, and crypto, jualuma provides a robust aggregation engine. Our priority is on reliable multi-source data ingestion (Plaid, CEX APIs, Web3) and a unified feed that consolidates all activity into a single, clean interface.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Contact */}
                <div className="text-center mt-12">
                    <h2 className="mb-4">Get in Touch</h2>
                    <p className="mb-8 text-text-secondary">
                        Have questions? Want to learn more? We&apos;d love to hear from you.
                    </p>
                    <Link to="/support" className="btn btn-primary btn-lg">Contact Us</Link>
                </div>
            </section>
        </div>
    );
};
