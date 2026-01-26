/**
 * CORE PURPOSE: Support page with FAQ and contact information.
 * LAST MODIFIED: 2026-01-25 20:45 CST
 */
import React from 'react';

export default function SupportPage() {
    return (
        <div className="container py-24">
            <header className="mb-16 text-center">
                <h1 className="text-5xl font-extrabold mb-6">How can we <span className="text-primary">help?</span></h1>
                <p className="text-xl text-muted max-w-2xl mx-auto">
                    Search our documentation or reach out to our team. We're here to help you get the most out of your financial data.
                </p>
            </header>

            <section id="faq" className="mb-24">
                <h2 className="text-3xl font-bold mb-10 text-center">Frequently Asked Questions</h2>
                <div className="grid gap-6 max-w-4xl mx-auto">
                    {[
                        { 
                            q: "Is my bank data safe?", 
                            a: "Yes. JuaLuma never stores your bank login credentials. We use Plaid, a bank-grade security layer, to securely link your accounts with read-only access." 
                        },
                        { 
                            q: "What is the Texas Sales Tax exemption?", 
                            a: "Under Texas Law, data processing services are 20% exempt from sales tax. JuaLuma automatically applies this rule, collecting tax on only 80% of your subscription fee if you are a Texas resident." 
                        },
                        { 
                            q: "Can I cancel my subscription anytime?", 
                            a: "Absolutely. You can manage your subscription through the Customer Portal in your account settings. If you cancel, you will retain Pro access until the end of your current billing period." 
                        },
                        { 
                            q: "How does the AI Assistant work?", 
                            a: "It uses a process called RAG (Retrieval-Augmented Generation) to look at your categorized transactions and answer specific questions like 'How much did I spend on coffee last month?' in real-time." 
                        }
                    ].map((item, i) => (
                        <div key={i} className="glass-panel p-6">
                            <h3 className="text-xl font-bold mb-3">{item.q}</h3>
                            <p className="text-muted">{item.a}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section className="text-center bg-surface-1 p-16 rounded-3xl border border-white/5">
                <h2 className="text-3xl font-bold mb-4">Still need assistance?</h2>
                <p className="text-muted mb-8">Logged in users can create support tickets directly from the dashboard.</p>
                <div className="flex gap-4 justify-center">
                    <a href="http://localhost:5175/login" className="btn btn-primary">Log In to Submit Ticket</a>
                    <a href="mailto:support@jualuma.com" className="btn btn-outline">Email Support</a>
                </div>
            </section>
        </div>
    );
}
