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

// Core Purpose: UI for managing support tickets and accessing help center.
// Last Updated 2026-01-27 12:00 CST

import React, { useState, useEffect, useCallback } from 'react';
import { supportService, Ticket } from '../services/support';
import { getAccounts } from '../services/accounts';
import { useToast } from '../components/ui/Toast';
import { Button } from '../components/ui/Button';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { useUserTimeZone } from '../hooks/useUserTimeZone';
import { formatDate } from '../utils/datetime';

type SystemHealth = Record<string, unknown>;

const SystemStatus = ({ onClose }: { onClose: () => void }) => {
    const [status, setStatus] = useState<SystemHealth | null>(null);
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
                                const value = status?.[key] as string | undefined;
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
    const [showStatus, setShowStatus] = useState(false);
    const toast = useToast();
    const navigate = useNavigate();
    const timeZone = useUserTimeZone();

    const fetchTickets = useCallback(async () => {
        try {
            const data = await supportService.getTickets();
            setTickets(data);
        } catch (err) {
            toast.show('Failed to load tickets', 'error');
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchTickets();
    }, [fetchTickets]);

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
            <div className="grid grid-cols-1 md:grid-cols-1 gap-6 mb-12">
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
                <h2 className="text-xl font-bold mb-6">Support Tickets</h2>

                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-16 bg-surface-2 animate-pulse rounded-lg" />
                        ))}
                    </div>
                ) : tickets.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-white/5 rounded-xl">
                        <MessageSquare className="w-12 h-12 text-text-muted mx-auto mb-4 opacity-20" />
                        <p className="text-text-secondary">Your tickets will appear after one has been created.</p>
                        <Button
                            variant="primary"
                            className="mt-4"
                            onClick={() => window.location.href = 'mailto:support@jualuma.com?subject=Support Request'}
                        >
                            Contact Support
                        </Button>
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
                                            #{ticket.id.slice(0, 8)} &bull; {formatDate(ticket.created_at, timeZone)}
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

            {showStatus && (
                <SystemStatus onClose={() => setShowStatus(false)} />
            )}
        </div>
    );
};
