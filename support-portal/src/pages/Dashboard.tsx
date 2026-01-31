import { useEffect, useState } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import {
    supportService,
    type AgentSummary,
    type TicketDetail,
    type TicketRef,
} from '../services/tickets';
import { ThemeToggle } from '../components/ThemeToggle';

const queueStatusStyles: Record<string, string> = {
    queued: 'bg-amber-100 text-amber-800',
    assigned: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-indigo-100 text-indigo-800',
    escalated: 'bg-rose-100 text-rose-800',
    resolved: 'bg-green-100 text-green-800',
    closed: 'bg-slate-100 text-slate-700',
};

const queueStatusLabel = (status: string) => {
    switch (status) {
        case 'queued':
            return 'Queued';
        case 'assigned':
            return 'Assigned';
        case 'in_progress':
            return 'In Progress';
        case 'escalated':
            return 'Escalated';
        case 'resolved':
            return 'Resolved';
        case 'closed':
            return 'Closed';
        default:
            return status;
    }
};

const titleCase = (value: string) => value ? value.charAt(0).toUpperCase() + value.slice(1) : value;

export default function Dashboard() {
    const [tickets, setTickets] = useState<TicketRef[]>([]);
    const [agents, setAgents] = useState<AgentSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [detailLoading, setDetailLoading] = useState(false);
    const [error, setError] = useState('');
    const [actionError, setActionError] = useState('');
    const [activeTab, setActiveTab] = useState<'all' | 'queue' | 'assigned' | 'escalated' | 'resolved'>('queue');
    const [selectedTicket, setSelectedTicket] = useState<TicketDetail | null>(null);
    const [reply, setReply] = useState('');
    const [assignUid, setAssignUid] = useState('');
    const [escalationNote, setEscalationNote] = useState('');

    const loadTickets = async () => {
        try {
            setLoading(true);
            setError('');

            const filters: { status?: string; queue_status?: string; assignee?: string } = {};
            if (activeTab === 'queue') {
                filters.queue_status = 'queued';
                filters.assignee = 'unassigned';
            }
            if (activeTab === 'assigned') {
                filters.assignee = 'me';
            }
            if (activeTab === 'escalated') {
                filters.queue_status = 'escalated';
            }
            if (activeTab === 'resolved') {
                filters.status = 'resolved';
            }

            const data = await supportService.getTickets(filters);
            setTickets(data);
        } catch (err) {
            console.error(err);
            setError('Failed to load tickets.');
        } finally {
            setLoading(false);
        }
    };

    const loadAgents = async () => {
        try {
            const data = await supportService.getAgents();
            setAgents(data);
        } catch (err) {
            console.error(err);
        }
    };

    const openTicket = async (ticketId: string) => {
        try {
            setDetailLoading(true);
            setActionError('');
            const ticket = await supportService.getTicket(ticketId);
            setSelectedTicket(ticket);
            setAssignUid(ticket.assigned_agent?.uid ?? '');
            setReply('');
            setEscalationNote('');
        } catch (err) {
            console.error(err);
            setActionError('Failed to load ticket details.');
        } finally {
            setDetailLoading(false);
        }
    };

    const refreshTicket = async () => {
        if (!selectedTicket) return;
        const updated = await supportService.getTicket(selectedTicket.id);
        setSelectedTicket(updated);
        setAssignUid(updated.assigned_agent?.uid ?? '');
    };

    const handleReply = async () => {
        if (!selectedTicket || !reply.trim()) return;
        try {
            setActionError('');
            await supportService.replyToTicket(selectedTicket.id, { message: reply.trim() });
            setReply('');
            await refreshTicket();
            await loadTickets();
        } catch (err) {
            console.error(err);
            setActionError('Failed to send reply.');
        }
    };

    const handlePickup = async () => {
        if (!selectedTicket) return;
        try {
            setActionError('');
            await supportService.pickupTicket(selectedTicket.id);
            await refreshTicket();
            await loadTickets();
        } catch (err) {
            console.error(err);
            setActionError('Failed to pick up ticket.');
        }
    };

    const handleAssign = async () => {
        if (!selectedTicket) return;
        try {
            setActionError('');
            await supportService.assignTicket(selectedTicket.id, assignUid || undefined);
            await refreshTicket();
            await loadTickets();
        } catch (err) {
            console.error(err);
            setActionError('Failed to assign ticket.');
        }
    };

    const handleEscalate = async () => {
        if (!selectedTicket) return;
        try {
            setActionError('');
            await supportService.escalateTicket(selectedTicket.id, escalationNote || undefined);
            await refreshTicket();
            await loadTickets();
        } catch (err) {
            console.error(err);
            setActionError('Failed to escalate ticket.');
        }
    };

    const handleStatusUpdate = async (status: string) => {
        if (!selectedTicket) return;
        try {
            setActionError('');
            await supportService.updateStatus(selectedTicket.id, status);
            await refreshTicket();
            await loadTickets();
        } catch (err) {
            console.error(err);
            setActionError('Failed to update status.');
        }
    };

    useEffect(() => {
        loadTickets();
    }, [activeTab]);

    useEffect(() => {
        loadAgents();
    }, []);

    return (
        <div className="min-h-screen flex" style={{ backgroundColor: 'var(--bg-primary)' }}>
            <aside className="w-64 flex-shrink-0 flex flex-col" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                <div className="p-6 flex items-start justify-between gap-2">
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">jualuma Support</h1>
                        <div className="mt-2 text-xs opacity-80 uppercase font-semibold tracking-wider">Agent Portal</div>
                    </div>
                    <ThemeToggle />
                </div>
                <nav className="px-4 space-y-2 flex-1">
                    <button
                        onClick={() => setActiveTab('all')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded shadow-sm text-left transition-colors ${activeTab === 'all' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-800 hover:text-white'}`}
                    >
                        <span className="font-medium">All Tickets</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('queue')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded shadow-sm text-left transition-colors ${activeTab === 'queue' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-800 hover:text-white'}`}
                    >
                        <span className="font-medium">Queue</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('assigned')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded shadow-sm text-left transition-colors ${activeTab === 'assigned' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-800 hover:text-white'}`}
                    >
                        <span className="font-medium">Assigned to Me</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('escalated')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded shadow-sm text-left transition-colors ${activeTab === 'escalated' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-800 hover:text-white'}`}
                    >
                        <span className="font-medium">Escalated</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('resolved')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded shadow-sm text-left transition-colors ${activeTab === 'resolved' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-800 hover:text-white'}`}
                    >
                        <span className="font-medium">Resolved</span>
                    </button>
                </nav>
                <div className="p-4 border-t border-slate-800">
                    <div className="mb-4 px-2">
                        <div className="text-sm font-medium text-slate-300 truncate" title={auth.currentUser?.email || ''}>
                            {auth.currentUser?.email}
                        </div>
                        <div className="text-xs text-slate-500">Support Agent</div>
                    </div>
                    <button
                        onClick={() => signOut(auth)}
                        className="w-full px-4 py-2 bg-slate-800 text-slate-300 rounded hover:bg-slate-700 text-sm transition-colors border border-slate-700"
                    >
                        Sign Out
                    </button>
                </div>
            </aside>

            <main className="flex-1 p-8 overflow-y-auto">
                <header className="mb-8 flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-slate-800">Ticket Dashboard</h2>
                    <button onClick={loadTickets} className="text-sm text-blue-600 hover:text-blue-800">Refresh</button>
                </header>

                {loading ? (
                    <div className="text-center py-12 text-slate-500">Loading tickets...</div>
                ) : error ? (
                    <div className="bg-red-50 text-red-600 p-4 rounded border border-red-100">{error}</div>
                ) : tickets.length === 0 ? (
                    <div className="bg-white rounded shadow-sm p-12 text-center border border-slate-200">
                        <h3 className="text-lg font-medium text-slate-900">No tickets found</h3>
                        <p className="text-slate-500 mt-1">The queue is currently empty.</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Queue Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Subject</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Created</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Customer</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Assigned</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-200">
                                {tickets.map((ticket) => (
                                    <tr key={ticket.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => openTicket(ticket.id)}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${queueStatusStyles[ticket.queue_status] || 'bg-slate-100 text-slate-700'}`}>
                                                {queueStatusLabel(ticket.queue_status)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-slate-900">{ticket.subject}</div>
                                            <div className="text-xs text-slate-500">{ticket.category}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{new Date(ticket.created_at).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-mono text-xs">{ticket.customer_reference}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                            {ticket.assigned_agent?.display_name ?? 'Unassigned'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </main>

            {selectedTicket && (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-6 z-50">
                    <div className="bg-white w-full max-w-5xl rounded-xl shadow-xl overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                            <div>
                                <h3 className="text-lg font-semibold text-slate-900">{selectedTicket.subject}</h3>
                                <p className="text-xs text-slate-500">Ticket #{selectedTicket.id.slice(0, 8)}</p>
                            </div>
                            <button
                                onClick={() => setSelectedTicket(null)}
                                className="text-slate-500 hover:text-slate-700"
                            >
                                X
                            </button>
                        </div>
                        <div className="px-6 py-5 grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2 space-y-6">
                                {detailLoading ? (
                                    <div className="text-slate-500">Loading ticket...</div>
                                ) : (
                                    <>
                                        <div>
                                            <h4 className="text-sm font-semibold text-slate-700">Customer Message</h4>
                                            <p className="mt-2 text-sm text-slate-600 whitespace-pre-wrap">{selectedTicket.description}</p>
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-semibold text-slate-700">Conversation</h4>
                                            <div className="mt-3 space-y-3 max-h-64 overflow-y-auto pr-2">
                                                {selectedTicket.messages.length === 0 ? (
                                                    <div className="text-sm text-slate-500">No replies yet.</div>
                                                ) : (
                                                    selectedTicket.messages.map((msg, index) => (
                                                        <div key={`${msg.created_at}-${index}`} className="border border-slate-200 rounded-lg p-3">
                                                            <div className="text-xs uppercase text-slate-400 font-semibold tracking-wide">{msg.sender}</div>
                                                            <div className="text-sm text-slate-700 mt-1 whitespace-pre-wrap">{msg.message}</div>
                                                            <div className="text-[10px] text-slate-400 mt-2">{new Date(msg.created_at).toLocaleString()}</div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                        <div className="border-t border-slate-200 pt-4">
                                            <h4 className="text-sm font-semibold text-slate-700">Reply to Ticket</h4>
                                            <textarea
                                                className="mt-2 w-full border border-slate-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                rows={4}
                                                value={reply}
                                                onChange={(event) => setReply(event.target.value)}
                                                placeholder="Write a reply for the customer..."
                                            />
                                            <div className="mt-3 flex gap-3">
                                                <button
                                                    onClick={handleReply}
                                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                                                >
                                                    Send Reply
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                            <div className="space-y-5">
                                <div className="border border-slate-200 rounded-lg p-4">
                                    <h4 className="text-sm font-semibold text-slate-700">Ticket Details</h4>
                                    <div className="mt-3 space-y-2 text-sm text-slate-600">
                                        <div className="flex justify-between">
                                            <span>Status</span>
                                            <span className="font-medium text-slate-800">{titleCase(selectedTicket.status)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Queue</span>
                                            <span className="font-medium text-slate-800">{queueStatusLabel(selectedTicket.queue_status)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Customer</span>
                                            <span className="font-mono text-xs">{selectedTicket.customer_reference}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Assigned</span>
                                            <span className="font-medium text-slate-800">
                                                {selectedTicket.assigned_agent?.display_name ?? 'Unassigned'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Category</span>
                                            <span className="font-medium text-slate-800">{selectedTicket.category}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="border border-slate-200 rounded-lg p-4 space-y-3">
                                    <h4 className="text-sm font-semibold text-slate-700">Assignment</h4>
                                    {selectedTicket.queue_status === 'queued' && (
                                        <button
                                            onClick={handlePickup}
                                            className="w-full px-3 py-2 text-sm rounded-lg border border-blue-500 text-blue-600 hover:bg-blue-50"
                                        >
                                            Pick Up Ticket
                                        </button>
                                    )}
                                    <div>
                                        <label className="text-xs text-slate-500">Assign to agent</label>
                                        <select
                                            className="mt-1 w-full border border-slate-300 rounded-lg p-2 text-sm"
                                            value={assignUid}
                                            onChange={(event) => setAssignUid(event.target.value)}
                                        >
                                            <option value="">Assign to me</option>
                                            {agents.map((agent) => (
                                                <option key={agent.uid} value={agent.uid}>
                                                    {agent.display_name}
                                                </option>
                                            ))}
                                        </select>
                                        <button
                                            onClick={handleAssign}
                                            className="mt-2 w-full px-3 py-2 text-sm rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
                                        >
                                            Apply Assignment
                                        </button>
                                    </div>
                                </div>

                                {selectedTicket.category === 'technical' && (
                                    <div className="border border-rose-200 rounded-lg p-4 space-y-3">
                                        <h4 className="text-sm font-semibold text-rose-700">Escalate to Developer</h4>
                                        <textarea
                                            className="w-full border border-rose-200 rounded-lg p-2 text-sm"
                                            rows={3}
                                            value={escalationNote}
                                            onChange={(event) => setEscalationNote(event.target.value)}
                                            placeholder="Add escalation context (optional)"
                                        />
                                        <button
                                            onClick={handleEscalate}
                                            className="w-full px-3 py-2 text-sm rounded-lg bg-rose-600 text-white hover:bg-rose-700"
                                        >
                                            Escalate Ticket
                                        </button>
                                    </div>
                                )}

                                <div className="border border-slate-200 rounded-lg p-4 space-y-2">
                                    <h4 className="text-sm font-semibold text-slate-700">Ticket Status</h4>
                                    <button
                                        onClick={() => handleStatusUpdate('resolved')}
                                        className="w-full px-3 py-2 text-sm rounded-lg border border-green-500 text-green-700 hover:bg-green-50"
                                    >
                                        Mark Resolved
                                    </button>
                                    <button
                                        onClick={() => handleStatusUpdate('closed')}
                                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
                                    >
                                        Close Ticket
                                    </button>
                                </div>

                                {actionError && (
                                    <div className="bg-rose-50 text-rose-700 text-sm p-3 rounded-lg border border-rose-100">
                                        {actionError}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
