import { useEffect, useState } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { supportService, type TicketRef } from '../services/tickets';

export default function Dashboard() {
    const [tickets, setTickets] = useState<TicketRef[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState<'all' | 'queue' | 'resolved'>('queue');

    const loadTickets = async () => {
        try {
            setLoading(true);
            let status = undefined;
            if (activeTab === 'queue') status = 'open'; // Map My Queue to Open for now
            if (activeTab === 'resolved') status = 'resolved';

            const data = await supportService.getTickets(status);
            setTickets(data);
        } catch (err) {
            console.error(err);
            setError('Failed to load tickets.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTickets();
    }, [activeTab]);

    return (
        <div className="min-h-screen bg-slate-50 flex">
            {/* Sidebar */}
            <aside className="w-64 bg-slate-900 text-white flex-shrink-0 flex flex-col">
                <div className="p-6">
                    <h1 className="text-xl font-bold tracking-tight">JuaLuma Support</h1>
                    <div className="mt-2 text-xs text-slate-400 uppercase font-semibold tracking-wider">Agent Portal</div>
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
                        <span className="font-medium">My Queue</span>
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
                        <div className="text-sm font-medium text-slate-300">{auth.currentUser?.email}</div>
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

            {/* Main Content */}
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
                        <p className="text-slate-500 mt-1">Great job! The queue is empty.</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Subject</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Created</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Customer</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-200">
                                {tickets.map((ticket) => (
                                    <tr key={ticket.id} className="hover:bg-slate-50 transition-colors cursor-pointer">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full 
                        ${ticket.Status === 'Open' ? 'bg-green-100 text-green-800' :
                                                    ticket.Status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                                                        'bg-gray-100 text-gray-800'}`}>
                                                {ticket.Status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{ticket.subject}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{new Date(ticket.created_at).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-mono text-xs">{ticket.customer_uid.substring(0, 8)}...</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </main>
        </div>
    );
}
