import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supportService, Ticket } from '../services/support';
import { CreateTicketModal } from '../components/support/CreateTicketModal';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';

export const Support = () => {
    const navigate = useNavigate();
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const fetchTickets = async () => {
        try {
            const data = await supportService.getTickets();
            setTickets(data);
        } catch (error) {
            console.error('Failed to fetch tickets', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTickets();
    }, []);

    const handleTicketClick = (ticketId: string) => {
        navigate(`/support/tickets/${ticketId}`);
    };

    const StatusBadge = ({ status }: { status: string }) => {
        const variant = status === 'open' ? 'success' : status === 'resolved' ? 'warning' : 'secondary';
        return <Badge variant={variant}>{status.toUpperCase()}</Badge>;
    }

    return (
        <div>
            <section className="container py-12">
                <h1 className="text-center mb-4 text-3xl font-bold">Support & Contact</h1>
                <p className="text-center text-lg text-text-secondary mb-12 max-w-[700px] mx-auto">
                    We&apos;re here to help. Manage your support tickets or find answers to common questions.
                </p>

                <div className="grid md:grid-cols-2 gap-8 mb-12">
                    {/* My Support Tickets */}
                    <div className="glass-panel flex flex-col h-full min-h-[500px]">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="m-0 text-xl font-bold">My Support Tickets</h2>
                            <Button variant="primary" onClick={() => setIsModalOpen(true)}>Create Ticket</Button>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-2 space-y-3">
                            {loading ? (
                                <p className="text-center text-text-secondary py-8">Loading tickets...</p>
                            ) : tickets.length === 0 ? (
                                <div className="text-center p-8 text-text-secondary border border-dashed border-white/10 rounded-lg">
                                    <p className="mb-2">No tickets yet</p>
                                    <p className="text-sm">Create a ticket if you need assistance.</p>
                                </div>
                            ) : (
                                tickets.map(ticket => (
                                    <div
                                        key={ticket.id}
                                        onClick={() => handleTicketClick(ticket.id)}
                                        className="card p-4 hover:border-primary/50 cursor-pointer transition-colors"
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <h3 className="m-0 text-lg font-semibold truncate pr-4">{ticket.subject}</h3>
                                            <StatusBadge status={ticket.status} />
                                        </div>
                                        <p className="text-text-secondary text-sm mb-2 line-clamp-1">
                                            {ticket.description}
                                        </p>
                                        <div className="flex justify-between items-center text-xs text-text-muted">
                                            {/* Note: ticket.id is UUID, slice it */}
                                            <span>#{ticket.id.slice(0, 8)}</span>
                                            <span>Updated: {new Date(ticket.updated_at).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Contact Information */}
                    <div className="glass-panel h-full">
                        <h2 className="mb-6 text-xl font-bold">Contact Information</h2>
                        <div className="mb-6">
                            <h3 className="text-lg font-semibold mb-2">Email Support</h3>
                            <p className="mb-2">
                                <strong>General Inquiries:</strong><br />
                                <a href="mailto:support@JuaLuma.com" className="text-royal-purple hover:underline">support@JuaLuma.com</a>
                            </p>
                            <p className="mb-2">
                                <strong>Privacy & Legal:</strong><br />
                                <a href="mailto:privacy@JuaLuma.com" className="text-royal-purple hover:underline">privacy@JuaLuma.com</a>
                            </p>
                            <p>
                                <strong>Business Inquiries:</strong><br />
                                <a href="mailto:business@JuaLuma.com" className="text-royal-purple hover:underline">business@JuaLuma.com</a>
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

                {/* FAQ Section */}
                <div id="faq" className="glass-panel mb-12">
                    <h2 className="text-center mb-12 font-bold text-2xl">Frequently Asked Questions</h2>

                    <div className="max-w-[800px] mx-auto space-y-8">
                        <div>
                            <h3 className="text-xl font-semibold mb-2">How do I link my bank accounts?</h3>
                            <p>You can link your bank accounts through our secure integration with Plaid. Go to your Dashboard, click &quot;Add Account,&quot; and follow the prompts to connect your bank. All connections are read-only, so we can view your data but cannot move your money.</p>
                        </div>

                        <div>
                            <h3 className="text-xl font-semibold mb-2">Is my financial data secure?</h3>
                            <p>Yes. We use bank-level encryption, read-only account access, and comply with GLBA and GDPR requirements. Your data is encrypted at rest and in transit. We never store your banking credentials and cannot initiate transactions.</p>
                        </div>

                        <div>
                            <h3 className="text-xl font-semibold mb-2">What happens if I cancel my subscription?</h3>
                            <p>You can cancel your subscription at any time through your account settings. After cancellation, you&apos;ll retain access until the end of your billing period. Your data will be retained according to your tier&apos;s retention policy, then securely deleted per our Privacy Policy.</p>
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

                <CreateTicketModal
                    open={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSuccess={fetchTickets}
                />
            </section>
        </div>
    );
};
