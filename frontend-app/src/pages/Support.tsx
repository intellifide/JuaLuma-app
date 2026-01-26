// Core Purpose: UI for managing support tickets and accessing help center.
// Last Updated 2026-01-25 21:35 CST

import React, { useState, useEffect } from 'react';
import { supportService, Ticket } from '../services/support';
import { getAccounts } from '../services/accounts';
import { useToast } from '../components/ui/Toast';
import { Button } from '../components/ui/Button';
import { useNavigate } from 'react-router-dom';
import { Plus, MessageSquare, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { Badge } from '../components/ui/Badge';

const CreateTicketModal = ({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) => {
    const [subject, setSubject] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('general');
    const [loading, setLoading] = useState(false);
    const toast = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await supportService.createTicket({ subject, description, category });
            toast.show('Ticket created successfully', 'success');
            onSuccess();
        } catch (err) {
            toast.show('Failed to create ticket', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-overlay flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="modal-content max-w-lg w-full">
                <div className="modal-header">
                    <h3>Create Support Ticket</h3>
                    <button onClick={onClose} className="modal-close">✕</button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="form-label text-sm font-medium">Subject</label>
                        <input
                            type="text"
                            className="input"
                            placeholder="Brief summary of the issue"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label className="form-label text-sm font-medium">Category</label>
                        <select
                            className="input"
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                        >
                            <option value="general">General Inquiry</option>
                            <option value="technical">Technical Support</option>
                            <option value="billing">Billing & Subscription</option>
                            <option value="feature">Feature Request</option>
                        </select>
                    </div>
                    <div>
                        <label className="form-label text-sm font-medium">Description</label>
                        <textarea
                            className="input min-h-[150px] py-3"
                            placeholder="Please provide as much detail as possible..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            required
                        />
                    </div>
                    <div className="flex gap-3 justify-end mt-8">
                        <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
                        <Button variant="primary" type="submit" disabled={loading}>
                            {loading ? 'Creating...' : 'Submit Ticket'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const SystemStatus = ({ onClose }: { onClose: () => void }) => {
    const [status, setStatus] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [hasWeb3, setHasWeb3] = useState(false);
    const [hasCex, setHasCex] = useState(false);

    useEffect(() => {
        const fetchHealth = async () => {
            try {
                const health = await supportService.getHealth();
                setStatus(health);
            } catch (err) {
                console.error('Failed to fetch system status', err);
            } finally {
                setLoading(false);
            }
        };
        fetchHealth();
    }, []);

    useEffect(() => {
        const fetchConnections = async () => {
            try {
                const [web3Accounts, cexAccounts] = await Promise.all([
                    getAccounts({ accountType: 'web3' }),
                    getAccounts({ accountType: 'cex' })
                ]);
                setHasWeb3(web3Accounts.length > 0);
                setHasCex(cexAccounts.length > 0);
            } catch (err) {
                console.error('Failed to load account connectivity', err);
            }
        };
        fetchConnections();
    }, []);

    const serviceMap: { [key: string]: string } = {
        status: 'Backend API Service',
        database: 'Core Database',
        firestore: 'Application Data Store',
        plaid: 'Banking Connectivity (Plaid)',
        ai_assistant: 'Smart Financial Artificial Intelligence',
        ...(hasWeb3 ? { web3: 'Web3 Connection Service' } : {}),
        ...(hasCex ? { cex: 'Exchange Connection Service' } : {}),
        marketplace: 'Marketplace Connectivity'
    };

    const isStable = (value?: string) => value === 'connected' || value === 'healthy' || value === 'stable';

    const getStatusVariant = (value?: string) => (isStable(value) ? 'success' : 'danger');

    const getStatusLabel = (value?: string) => (isStable(value) ? 'Stable' : 'Unstable');

    return (
        <div className="fixed inset-0 bg-overlay flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="modal-content max-w-md w-full">
                <div className="modal-header">
                    <h3>System Connectivity Status</h3>
                    <button onClick={onClose} className="modal-close">✕</button>
                </div>
                <div className="py-2 px-2 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {loading ? (
                        <div className="text-center py-6 text-text-secondary animate-pulse font-medium">Probing systems...</div>
                    ) : (
                        <div className="space-y-2 p-2">
                            {Object.entries(serviceMap).map(([key, label]) => {
                                const value = status?.[key];
                                if (!value && key !== 'status') return null; // Skip if service result not in response
                                
                                return (
                                    <div key={key} className="flex items-center justify-between p-3 bg-surface-2 rounded-lg border border-border/50 hover:border-border transition-colors">
                                        <div className="flex flex-col">
                                            <span className="font-semibold text-sm text-text-primary">{label}</span>
                                        </div>
                                        <Badge variant={getStatusVariant(value)}>
                                            {getStatusLabel(value)}
                                        </Badge>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
                <div className="modal-footer flex-col items-start gap-2">
                    <p className="text-[10px] text-text-muted leading-relaxed">
                        Security Notice: Connectivity status is verified every 60 seconds. Our engineering team is automatically notified of any service disruptions.
                    </p>
                    <Button variant="outline" size="sm" className="w-full mt-2" onClick={onClose}>
                        Close Monitor
                    </Button>
                </div>
            </div>
        </div>
    );
};

export const Support = () => {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showStatus, setShowStatus] = useState(false);
    const toast = useToast();
    const navigate = useNavigate();

    const fetchTickets = async () => {
        try {
            const data = await supportService.getTickets();
            setTickets(data);
        } catch (err) {
            toast.show('Failed to load tickets', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTickets();
    }, []);

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'open': return <Clock className="w-4 h-4 text-primary" />;
            case 'resolved': return <CheckCircle2 className="w-4 h-4 text-green-400" />;
            case 'closed': return <AlertCircle className="w-4 h-4 text-text-muted" />;
            default: return null;
        }
    };

    return (
        <div className="container py-8 max-w-6xl">
            <div className="flex justify-between items-center mb-10">
                <div>
                    <h1 className="text-3xl font-bold mb-2">Help & Support</h1>
                    <p className="text-text-secondary">Track your tickets or get help from our team.</p>
                </div>
                <Button variant="primary" onClick={() => setShowModal(true)} className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    New Ticket
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                <div className="glass-panel text-center py-8">
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                        <MessageSquare className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-bold mb-2">Documentation</h3>
                    <p className="text-sm text-text-secondary mb-4 px-4">Browse our detailed guides and help articles.</p>
                    <button className="text-primary text-sm font-medium hover:underline">Read APIs docs</button>
                </div>
                <div className="glass-panel text-center py-8">
                    <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="w-6 h-6 text-accent" />
                    </div>
                    <h3 className="font-bold mb-2">System Status</h3>
                    <p className="text-sm text-text-secondary mb-4 px-4">Check if there are any current interruptions.</p>
                    <button onClick={() => setShowStatus(true)} className="text-accent text-sm font-medium hover:underline">View Status</button>
                </div>
            </div>

            <div className="glass-panel">
                <h2 className="text-xl font-bold mb-6">Recent Tickets</h2>
                
                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-16 bg-surface-2 animate-pulse rounded-lg" />
                        ))}
                    </div>
                ) : tickets.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-white/5 rounded-xl">
                        <MessageSquare className="w-12 h-12 text-text-muted mx-auto mb-4 opacity-20" />
                        <p className="text-text-secondary">You haven't created any support tickets yet.</p>
                        <button onClick={() => setShowModal(true)} className="text-primary text-sm mt-2 hover:underline">
                            Open your first ticket
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {tickets.map((ticket) => (
                            <div 
                                key={ticket.id}
                                onClick={() => navigate(`/support/tickets/${ticket.id}`)}
                                className="flex items-center justify-between p-4 rounded-xl border border-white/5 hover:bg-white/5 transition-all cursor-pointer group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-lg bg-surface-2 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                                        {getStatusIcon(ticket.status)}
                                    </div>
                                    <div>
                                        <h4 className="font-medium group-hover:text-primary transition-colors">{ticket.subject}</h4>
                                        <p className="text-xs text-text-secondary mt-0.5">
                                            #{ticket.id.slice(0, 8)} &bull; {new Date(ticket.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <Badge variant={ticket.status === 'open' ? 'success' : ticket.status === 'resolved' ? 'warning' : 'secondary'}>
                                        {ticket.status.toUpperCase()}
                                    </Badge>
                                    <span className="text-text-muted group-hover:translate-x-1 transition-transform">→</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {showModal && (
                <CreateTicketModal 
                    onClose={() => setShowModal(false)} 
                    onSuccess={() => { setShowModal(false); fetchTickets(); }}
                />
            )}

            {showStatus && (
                <SystemStatus onClose={() => setShowStatus(false)} />
            )}
        </div>
    );
};
