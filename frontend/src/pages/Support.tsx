import React from 'react';

export const Support = () => {
    return (
        <div>
            <section className="container py-12">
                <h1 className="text-center mb-4 text-3xl font-bold">Support & Contact</h1>
                <p className="text-center text-lg text-text-secondary mb-12 max-w-[700px] mx-auto">
                    We're here to help. Get in touch with our support team or find answers to common questions.
                </p>

                <div className="grid md:grid-cols-2 gap-8 mb-12">
                    {/* Contact Form */}
                    <div className="glass-panel h-fit">
                        <h2 className="mb-6">Send Us a Message</h2>
                        <form id="contact-form" onSubmit={(e) => e.preventDefault()}>
                            <div className="mb-4">
                                <label htmlFor="contact-name" className="block text-sm font-medium text-text-secondary mb-1">Name</label>
                                <input type="text" id="contact-name" name="name" className="form-input w-full" required />
                            </div>
                            <div className="mb-4">
                                <label htmlFor="contact-email" className="block text-sm font-medium text-text-secondary mb-1">Email Address</label>
                                <input type="email" id="contact-email" name="email" className="form-input w-full" required />
                            </div>
                            <div className="mb-4">
                                <label htmlFor="contact-subject" className="block text-sm font-medium text-text-secondary mb-1">Subject</label>
                                <select id="contact-subject" name="subject" className="form-select w-full" required>
                                    <option value="">Select a topic...</option>
                                    <option value="technical">Technical Support</option>
                                    <option value="billing">Billing Question</option>
                                    <option value="feature">Feature Request</option>
                                    <option value="bug">Report a Bug</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div className="mb-4">
                                <label htmlFor="contact-message" className="block text-sm font-medium text-text-secondary mb-1">Message</label>
                                <textarea id="contact-message" name="message" className="form-textarea w-full h-32" required></textarea>
                            </div>
                            <button type="submit" className="btn btn-primary w-full">Send Message</button>
                        </form>
                    </div>

                    <div className="flex flex-col gap-8">
                        {/* My Support Tickets */}
                        <div className="glass-panel">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="m-0">My Support Tickets</h2>
                                <button className="btn btn-primary" onClick={() => document.getElementById('contact-form')?.scrollIntoView({ behavior: 'smooth' })}>Create Ticket</button>
                            </div>
                            <div className="card mb-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="m-0 mb-1 text-lg font-semibold">Ticket #1234</h3>
                                        <p className="text-text-secondary text-sm m-0">
                                            Account linking issue - Unable to connect Chase account
                                        </p>
                                        <p className="text-text-muted text-xs mt-1">
                                            Created: 2 hours ago | Status: <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800">Open</span>
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="text-center p-6 text-text-muted">
                                <p className="m-0">No other active tickets</p>
                                <p className="mt-2 text-sm">
                                    Support tickets are managed by our team. You'll receive email updates when your ticket status changes.
                                </p>
                            </div>
                        </div>

                        {/* Contact Information */}
                        <div className="glass-panel">
                            <h2 className="mb-6">Contact Information</h2>
                            <div className="mb-6">
                                <h3 className="text-lg font-semibold mb-2">Email Support</h3>
                                <p className="mb-2">
                                    <strong>General Inquiries:</strong><br />
                                    <a href="mailto:support@finity.com" className="text-royal-purple hover:underline">support@finity.com</a>
                                </p>
                                <p className="mb-2">
                                    <strong>Privacy & Legal:</strong><br />
                                    <a href="mailto:privacy@finity.com" className="text-royal-purple hover:underline">privacy@finity.com</a>
                                </p>
                                <p>
                                    <strong>Business Inquiries:</strong><br />
                                    <a href="mailto:business@finity.com" className="text-royal-purple hover:underline">business@finity.com</a>
                                </p>
                            </div>

                            <div className="mb-6">
                                <h3 className="text-lg font-semibold mb-2">Phone Support</h3>
                                <p>
                                    <strong>Phone:</strong> <a href="tel:+15551234567" className="text-royal-purple hover:underline">+1 (555) 123-4567</a><br />
                                    <strong>Hours:</strong> Monday - Friday, 9:00 AM - 6:00 PM CT
                                </p>
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold mb-2">Mailing Address</h3>
                                <p className="mb-0">
                                    Intellifide, LLC<br />
                                    1234 Innovation Drive<br />
                                    Suite 500<br />
                                    Austin, TX 78701<br />
                                    United States
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* FAQ Section */}
                <div id="faq" className="glass-panel mb-12">
                    <h2 className="text-center mb-12">Frequently Asked Questions</h2>

                    <div className="max-w-[800px] mx-auto space-y-8">
                        <div>
                            <h3 className="text-xl font-semibold mb-2">How do I link my bank accounts?</h3>
                            <p>You can link your bank accounts through our secure integration with Plaid. Go to your Dashboard, click "Add Account," and follow the prompts to connect your bank. All connections are read-only, so we can view your data but cannot move your money.</p>
                        </div>

                        <div>
                            <h3 className="text-xl font-semibold mb-2">Is my financial data secure?</h3>
                            <p>Yes. We use bank-level encryption, read-only account access, and comply with GLBA and GDPR requirements. Your data is encrypted at rest and in transit. We never store your banking credentials and cannot initiate transactions.</p>
                        </div>

                        <div>
                            <h3 className="text-xl font-semibold mb-2">What happens if I cancel my subscription?</h3>
                            <p>You can cancel your subscription at any time through your account settings. After cancellation, you'll retain access until the end of your billing period. Your data will be retained according to your tier's retention policy, then securely deleted per our Privacy Policy.</p>
                        </div>

                        <div>
                            <h3 className="text-xl font-semibold mb-2">Can I export my data?</h3>
                            <p>Yes. You can export all your account data at any time through your account settings. Data is exported in JSON format and includes all transactions, categories, budgets, and account information.</p>
                        </div>

                        <div>
                            <h3 className="text-xl font-semibold mb-2">How does the AI Assistant work?</h3>
                            <p>The AI Assistant is powered by Vertex AI Gemini 2.5 Flash and provides insights about your financial data. It uses encrypted RAG (Retrieval-Augmented Generation) prompts to provide context-aware responses. The AI Assistant is for informational purposes only and does not provide financial advice.</p>
                        </div>

                        <div>
                            <h3 className="text-xl font-semibold mb-2">What payment methods do you accept?</h3>
                            <p>We accept all major credit cards and process payments securely through Stripe. For Texas-based customers, we collect and remit Texas sales tax on 80% of the subscription fee (20% exemption for data processing services).</p>
                        </div>

                        <div>
                            <h3 className="text-xl font-semibold mb-2">Do you offer refunds?</h3>
                            <p>Subscription fees are non-refundable except as required by law. Pro Tier includes a 7-day free trial so you can try before committing. Essential and Pro tiers can be cancelled at any time.</p>
                        </div>

                        <div>
                            <h3 className="text-xl font-semibold mb-2">How do I delete my account?</h3>
                            <p>You can delete your account at any time through your account settings. Account deletion is permanent and cannot be undone. All your data will be permanently deleted per our Privacy Policy, including linked accounts, transaction history, budgets, and preferences.</p>
                        </div>
                    </div>
                </div>

                {/* Community Links */}
                <div className="glass-panel">
                    <h2 className="text-center mb-6">Join Our Community</h2>
                    <div className="text-center">
                        <p className="mb-6 text-text-secondary">
                            Connect with other Finity users, get tips, and share feedback.
                        </p>
                        <div className="flex gap-4 justify-center flex-wrap">
                            <a href="https://discord.gg/finity" className="btn btn-secondary" target="_blank" rel="noopener noreferrer">Join Discord</a>
                            <a href="https://twitter.com/finity" className="btn btn-secondary" target="_blank" rel="noopener noreferrer">Follow on X</a>
                            <a href="https://youtube.com/@finity" className="btn btn-secondary" target="_blank" rel="noopener noreferrer">Watch on YouTube</a>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};
