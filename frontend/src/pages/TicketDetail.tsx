import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supportService, Ticket } from '../services/support';
import { Button } from '../components/ui/Button';
import { useToast } from '../components/ui/Toast';
import { Badge } from '../components/ui/Badge'; // Assuming Badge exists

export const TicketDetail = () => {
    const { ticketId } = useParams<{ ticketId: string }>();
    const navigate = useNavigate();
    const { show } = useToast();
    const [ticket, setTicket] = useState<Ticket | null>(null);
    const [loading, setLoading] = useState(true);
    const [reply, setReply] = useState('');
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const fetchTicket = async () => {
        if (!ticketId) return;
        try {
            const data = await supportService.getTicketDetail(ticketId);
            setTicket(data);
        } catch (error) {
            console.error(error);
            show('Failed to load ticket details', 'error');
            navigate('/support');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTicket();
    }, [ticketId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [ticket?.messages]);

    const handleReply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!ticketId || !reply.trim()) return;

        setSending(true);
        try {
            await supportService.addMessage(ticketId, { message: reply });
            setReply('');
            await fetchTicket(); // Refresh to show new message and upd status
            show('Message sent', 'success');
        } catch (error) {
            console.error(error);
            show('Failed to send message', 'error');
        } finally {
            setSending(false);
        }
    };

    const handleClose = async () => {
        if (!ticketId || !window.confirm('Are you sure you want to close this ticket?')) return;
        try {
            await supportService.closeTicket(ticketId);
            show('Ticket closed', 'success');
            fetchTicket();
        } catch (error) {
            console.error(error);
            show('Failed to close ticket', 'error');
        }
    };

    if (loading) return <div className="p-8 text-center">Loading ticket...</div>;
    if (!ticket) return null;

    return (
        <div className="container py-8 max-w-[1000px]">
            <Button variant="outline" onClick={() => navigate('/support')} className="mb-4">
                &larr; Back to Support
            </Button>

            <div className="flex justify-between items-start mb-6">
                <div>
                    <h1 className="text-3xl font-bold mb-2">{ticket.subject}</h1>
                    <div className="flex gap-2 items-center text-sm text-text-secondary">
                        <span>#{ticket.id.slice(0, 8)}</span>
                        <span>&bull;</span>
                        <span>{new Date(ticket.created_at).toLocaleString()}</span>
                        <span>&bull;</span>
                        <span className="capitalize">{ticket.category}</span>
                    </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                    <Badge variant={ticket.status === 'open' ? 'success' : ticket.status === 'resolved' ? 'warning' : 'secondary'}>
                        {ticket.status.toUpperCase()}
                    </Badge>
                    {ticket.status !== 'closed' && (
                        <Button variant="outline" size="sm" onClick={handleClose}>
                            Close Ticket
                        </Button>
                    )}
                </div>
            </div>

            <div className="glass-panel mb-8">
                <h3 className="text-lg font-semibold mb-2">Description</h3>
                <p className="whitespace-pre-wrap">{ticket.description}</p>
            </div>

            <div className="space-y-6 mb-8">
                <h3 className="text-xl font-bold">Conversation</h3>

                {ticket.messages.length === 0 ? (
                    <p className="text-text-secondary italic">No messages yet.</p>
                ) : (
                    ticket.messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`flex flex-col ${msg.sender_type === 'user' ? 'items-end' : 'items-start'}`}
                        >
                            <div className={`max-w-[80%] rounded-lg p-4 ${msg.sender_type === 'user'
                                ? 'bg-primary/10 text-text-primary rounded-tr-none'
                                : 'bg-glass text-text-primary rounded-tl-none border border-white/10'
                                }`}>
                                <p className="whitespace-pre-wrap mb-1">{msg.message}</p>
                                <p className="text-xs opacity-70">
                                    {msg.sender_type === 'user' ? 'You' : 'Support Agent'} &bull; {new Date(msg.created_at).toLocaleString()}
                                </p>
                            </div>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            {ticket.status !== 'closed' ? (
                <div className="glass-panel">
                    <h3 className="text-lg font-semibold mb-4">Reply</h3>
                    <form onSubmit={handleReply}>
                        <textarea
                            className="form-textarea w-full h-32 mb-4"
                            placeholder="Type your reply here..."
                            value={reply}
                            onChange={(e) => setReply(e.target.value)}
                            required
                        />
                        <div className="flex justify-end">
                            <Button variant="primary" type="submit" disabled={sending || !reply.trim()}>
                                {sending ? 'Sending...' : 'Send Reply'}
                            </Button>
                        </div>
                    </form>
                </div>
            ) : (
                <div className="p-6 bg-glass rounded-lg text-center border border-white/10">
                    <p className="text-text-secondary">This ticket is closed. If you need further assistance, please create a new ticket.</p>
                </div>
            )}
        </div>
    );
};
