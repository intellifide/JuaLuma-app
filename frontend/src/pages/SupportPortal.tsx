import React, { useState } from 'react';
import useSWR, { mutate } from 'swr';
import { api } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { format } from 'date-fns';

// Types
interface Ticket {
    id: string;
    customer_uid: string;
    subject: string;
    Status: string;
    Priority: string;
    created_at: string;
    updated_at: string;
}

interface TicketDetail extends Ticket {
    description: string;
    messages: {
        sender: string;
        message: string;
        created_at: string;
    }[];
}

const fetcher = (url: string) => api.get(url).then(res => res.data);

export const SupportPortal = () => {
    const { user, profile } = useAuth();
    const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<string>('All Status');
    const [replyText, setReplyText] = useState('');
    const [isInternal, setIsInternal] = useState(false);

    // List Tickets
    const { data: tickets, error: ticketsError } = useSWR<Ticket[]>(
        `/api/support-portal/tickets?status=${statusFilter}`,
        fetcher
    );

    // Detail Ticket (Conditional Fetch)
    const { data: ticketDetail, error: detailError } = useSWR<TicketDetail>(
        selectedTicketId ? `/api/support-portal/tickets/${selectedTicketId}` : null,
        fetcher
    );

    const handleTicketClick = (ticketId: string) => {
        setSelectedTicketId(ticketId);
        setReplyText(''); // Clear draft
    };

    // ... (rest of component handles)

    const handleReply = async () => {
        if (!selectedTicketId || !replyText.trim()) return;
        try {
            await api.post(`/api/support-portal/tickets/${selectedTicketId}/reply`, {
                message: replyText,
                internal_note: isInternal
            });
            mutate(`/api/support-portal/tickets/${selectedTicketId}`); // Refresh detail
            setReplyText('');
            alert('Reply sent and logged.');
        } catch (err: any) {
            alert('Failed to send reply: ' + (err.response?.data?.detail || err.message));
        }
    };

    const handleStatusChange = async (newStatus: string) => {
        if (!selectedTicketId) return;
        try {
            await api.post(`/api/support-portal/tickets/${selectedTicketId}/status`, {
                status: newStatus
            });
            mutate(`/api/support-portal/tickets/${selectedTicketId}`);
            mutate(`/api/support-portal/tickets?status=${statusFilter}`); // Refresh list
        } catch (err: any) {
            alert('Failed to update status');
        }
    };

    if (!tickets && !ticketsError) return <div className="p-8">Loading Portal...</div>;

    return (
        <div className="pt-0">
            <section className="container py-8">
                {/* Agent Header */}
                <div className="glass-panel mb-8">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="mb-1 m-0">Support Portal (Live)</h2>
                            <p className="text-text-secondary m-0">
                                <strong>Agent:</strong> {user?.displayName || profile?.email || 'Unknown'} | <strong>Role:</strong> {profile?.role || 'authorized'}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-text-muted mt-1">
                                Audit Logging Active via Cloud SQL
                            </p>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                    {/* Ticket List */}
                    <div className="glass-panel h-[700px] flex flex-col">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="m-0">Ticket Queue</h2>
                            <select
                                className="form-select w-auto"
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <option>All Status</option>
                                <option>Open</option>
                                <option>In Progress</option>
                                <option>Resolved</option>
                                <option>Closed</option>
                            </select>
                        </div>

                        <div className="overflow-y-auto flex-1 pr-2">
                            {tickets?.map((ticket) => (
                                <div
                                    key={ticket.id}
                                    className={`card cursor-pointer transition-colors duration-200 hover:bg-bg-secondary mb-4 ${selectedTicketId === ticket.id ? 'bg-primary/10 border-l-4 border-l-primary' : ''}`}
                                    onClick={() => handleTicketClick(ticket.id)}
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <h3 className="m-0 mb-1 truncate text-base">{ticket.subject}</h3>
                                            <p className="text-text-muted text-xs mt-1">
                                                {format(new Date(ticket.created_at), 'MMM d, h:mm a')} | #{ticket.id.slice(0, 8)}
                                            </p>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <span className={`badge ${ticket.Priority === 'High' ? 'bg-red-500' : 'bg-gray-500'} text-white text-xs`}>
                                                {ticket.Priority}
                                            </span>
                                            <span className={`badge ${ticket.Status === 'Open' ? 'bg-amber-500' : 'bg-emerald-500'} text-white text-xs`}>
                                                {ticket.Status}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {tickets?.length === 0 && <p className="text-center text-text-muted mt-8">No tickets found.</p>}
                        </div>
                    </div>

                    {/* Ticket Detail */}
                    <div className="glass-panel h-[700px] overflow-y-auto">
                        {!selectedTicketId ? (
                            <div className="flex items-center justify-center h-full text-text-muted">
                                Select a ticket to view details and audit logs.
                            </div>
                        ) : !ticketDetail ? (
                            <div className="p-4">Loading details...</div>
                        ) : (
                            <>
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="m-0 text-xl">#{ticketDetail.id.slice(0, 8)}</h2>
                                    <div className="flex gap-2">
                                        {ticketDetail.Status !== 'Resolved' && (
                                            <button
                                                className="btn btn-sm btn-outline text-emerald-400 border-emerald-400 hover:bg-emerald-400/10"
                                                onClick={() => handleStatusChange('Resolved')}
                                            >
                                                Resolve
                                            </button>
                                        )}
                                        {ticketDetail.Status === 'Resolved' && (
                                            <button
                                                className="btn btn-sm btn-outline text-amber-400 border-amber-400 hover:bg-amber-400/10"
                                                onClick={() => handleStatusChange('Open')}
                                            >
                                                Reopen
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="card mb-6">
                                    <h3 className="text-lg font-semibold mb-2">{ticketDetail.subject}</h3>
                                    <p className="text-text-secondary whitespace-pre-wrap">{ticketDetail.description}</p>
                                </div>

                                {/* Thread */}
                                <div className="mb-6 space-y-4">
                                    <h4 className="text-text-muted text-sm uppercase tracking-wider">Conversation</h4>
                                    {ticketDetail.messages.map((msg, i) => (
                                        <div key={i} className={`card ${msg.sender === 'agent' ? 'bg-primary/5 ml-8 border-primary/20' : 'mr-8'}`}>
                                            <div className="flex justify-between mb-1">
                                                <strong className={msg.sender === 'agent' ? 'text-primary' : ''}>
                                                    {msg.sender === 'agent' ? 'Agent' : 'Customer'}
                                                </strong>
                                                <span className="text-xs text-text-muted">
                                                    {format(new Date(msg.created_at), 'MMM d, h:mm a')}
                                                </span>
                                            </div>
                                            <p className="m-0 whitespace-pre-wrap">{msg.message}</p>
                                        </div>
                                    ))}
                                </div>

                                {/* Reply Box */}
                                <div className="border-t border-border/50 pt-4 mt-8">
                                    <h3 className="mb-4">Reply</h3>
                                    <textarea
                                        className="form-textarea mb-2 min-h-[100px]"
                                        placeholder="Type response... (Logged in Audit Trail)"
                                        value={replyText}
                                        onChange={(e) => setReplyText(e.target.value)}
                                    ></textarea>
                                    <div className="flex items-center justify-between">
                                        <label className="flex items-center gap-2 text-sm text-text-muted">
                                            <input
                                                type="checkbox"
                                                checked={isInternal}
                                                onChange={(e) => setIsInternal(e.target.checked)}
                                                className="rounded border-border bg-bg-secondary"
                                            />
                                            Internal Note (Not visible to user)
                                        </label>
                                        <button
                                            className="btn btn-primary"
                                            onClick={handleReply}
                                            disabled={!replyText.trim()}
                                        >
                                            Send Reply
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </section>
        </div>
    );
};
