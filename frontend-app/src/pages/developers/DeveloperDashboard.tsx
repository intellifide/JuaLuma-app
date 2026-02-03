/**
 * CORE PURPOSE: Developer dashboard for managing widgets and payouts.
 * LAST MODIFIED: 2025-12-21 17:15 CST
 */
import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { widgetService } from '../../services/widgets';
import { developerService, DeveloperPayout } from '../../services/developers';
import { Widget, PaginatedResponse } from '../../types';
import { Link, useNavigate } from 'react-router-dom';
import { Select } from '../../components/ui/Select';

export const DeveloperDashboard = () => {
    const { profile } = useAuth();
    const navigate = useNavigate();
    const [myWidgets, setMyWidgets] = useState<Widget[]>([]);
    const [payouts, setPayouts] = useState<DeveloperPayout[]>([]);
    const [activeTab, setActiveTab] = useState<'dashboard' | 'payouts'>('dashboard');
    const [loading, setLoading] = useState(false);
    const [payoutPage, setPayoutPage] = useState(1);
    const [totalPayoutPages, setTotalPayoutPages] = useState(1);
    const pageSize = 10;

    // Widget Submission State
    const [showSubmitModal, setShowSubmitModal] = useState(false);
    const [submitForm, setSubmitForm] = useState({
        name: '',
        description: '',
        category: 'general',
        version: '1.0.0',
        scopes: [] as string[]
    });

    const isDeveloper = (profile as unknown as Record<string, unknown>)?.is_developer;

    useEffect(() => {
        // If not developer, redirect to landing to register
        if (profile && !isDeveloper) {
            navigate('/developers');
        }
    }, [profile, isDeveloper, navigate]);

    const loadDashboard = useCallback(async () => {
        setLoading(true);
        try {
            const [w, pData] = await Promise.all([
                widgetService.listMine(),
                developerService.getTransactions(payoutPage, pageSize).catch(() => ({ data: [], total: 0, page: 1, pageSize } as PaginatedResponse<DeveloperPayout>))
            ]);
            setMyWidgets(w);
            if (pData.data) {
                setPayouts(pData.data);
                setTotalPayoutPages(Math.ceil(pData.total / pageSize));
            }
        } catch (e) {
            console.error("Failed to load developer dashboard", e);
        } finally {
            setLoading(false);
        }
    }, [payoutPage]);

    useEffect(() => {
        if (isDeveloper && profile) {
            loadDashboard();
        }
    }, [isDeveloper, profile, loadDashboard]);

    const handleSubmitWidget = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await widgetService.submit({
                ...submitForm,
                preview_data: { demo: true } // Default mock data
            });
            setShowSubmitModal(false);
            setSubmitForm({ name: '', description: '', category: 'general', version: '1.0.0', scopes: [] });
            loadDashboard();
            window.alert("Widget submitted for review!");
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : 'Unknown error';
            window.alert("Submission failed: " + message);
        }
    };

    const toggleScope = (scope: string) => {
        setSubmitForm(prev => ({
            ...prev,
            scopes: prev.scopes.includes(scope)
                ? prev.scopes.filter(s => s !== scope)
                : [...prev.scopes, scope]
        }));
    };

    if (!profile || loading && myWidgets.length === 0) return <div className="container py-16 text-center">Loading dashboard...</div>;

    return (
        <div className="container py-12">
            <div className="flex justify-end items-center mb-8 gap-4">
                 <a href="/api/developers/sdk" className="btn btn-outline text-sm" download>Download SDK</a>
                 <Link to="/developers" className="btn btn-ghost text-sm">Portal Home</Link>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-white/10 mb-8">
                <button
                    className={`px-6 py-3 border-b-2 transition-colors ${activeTab === 'dashboard' ? 'border-primary text-primary font-semibold' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
                    onClick={() => setActiveTab('dashboard')}
                >
                    My Widgets
                </button>
                <button
                    className={`px-6 py-3 border-b-2 transition-colors ${activeTab === 'payouts' ? 'border-primary text-primary font-semibold' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
                    onClick={() => setActiveTab('payouts')}
                >
                    Payout History
                </button>
            </div>

            {activeTab === 'dashboard' && (
                <div>
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-semibold">Published Widgets</h2>
                        <button className="btn btn-primary" onClick={() => setShowSubmitModal(true)}>+ Submit New Widget</button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {myWidgets.map(w => (
                            <div key={w.id} className="card relative">
                                <div className={`absolute top-4 right-4 badge ${w.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                                    w.status === 'pending_review' ? 'bg-yellow-500/20 text-yellow-400' :
                                        'bg-red-500/20 text-red-400'
                                    }`}>
                                    {w.status.replace('_', ' ')}
                                </div>
                                <h3 className="pr-20 mb-2 truncate" title={w.name}>{w.name}</h3>
                                <p className="text-sm text-text-secondary mb-4 line-clamp-2">{w.description}</p>
                                <div className="flex justify-between text-sm text-text-muted mt-auto pt-4 border-t border-white/5">
                                    <span>v{w.version}</span>
                                    <span>{w.downloads} downloads</span>
                                    <span>{w.rating_avg.toFixed(1)} ⭐</span>
                                </div>
                            </div>
                        ))}
                        {myWidgets.length === 0 && (
                            <div className="col-span-full text-center py-12 glass-panel border border-dashed border-white/10">
                                <p className="text-text-muted">You haven&apos;t submitted any widgets yet.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'payouts' && (
                <div className="glass-panel overflow-hidden p-0">
                    <table className="w-full text-left">
                        <thead className="bg-white/5 border-b border-white/10">
                            <tr>
                                <th className="p-4">Period</th>
                                <th className="p-4">Gross Revenue</th>
                                <th className="p-4">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {payouts.map((p, i) => (
                                <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                                    <td className="p-4">{p.month}</td>
                                    <td className="p-4 font-mono">${p.gross_revenue.toFixed(2)}</td>
                                    <td className="p-4 capitalize">
                                        <span className={`badge ${p.payout_status === 'paid' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                            {p.payout_status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {payouts.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="p-8 text-center text-text-muted">No payout history available.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                    {/* Payout Pagination */}
                    {totalPayoutPages > 1 && (
                        <div className="flex justify-center gap-2 py-4 border-t border-white/5">
                            <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => setPayoutPage(p => Math.max(1, p - 1))}
                                disabled={payoutPage === 1}
                            >
                                &lt; Prev
                            </button>
                            <span className="flex items-center text-sm text-text-secondary">
                                Page {payoutPage} of {totalPayoutPages}
                            </span>
                            <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => setPayoutPage(p => Math.min(totalPayoutPages, p + 1))}
                                disabled={payoutPage === totalPayoutPages}
                            >
                                Next &gt;
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Submit Modal */}
            {showSubmitModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-overlay">
                    <div className="modal-content max-w-lg relative">
                        <div className="modal-header">
                            <h2>Submit New Widget</h2>
                            <button
                                className="modal-close"
                                onClick={() => setShowSubmitModal(false)}
                            >
                                ✕
                            </button>
                        </div>
                        <form onSubmit={handleSubmitWidget} className="space-y-4">
                            <div>
                                <label className="block text-sm text-text-secondary mb-1">Widget Name</label>
                                <input
                                    type="text"
                                    required
                                    className="input w-full"
                                    value={submitForm.name}
                                    onChange={e => setSubmitForm({ ...submitForm, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-text-secondary mb-1">Category</label>
                                <Select
                                    variant="input"
                                    value={submitForm.category}
                                    onChange={e => setSubmitForm({ ...submitForm, category: e.target.value })}
                                >
                                    <option value="general">General</option>
                                    <option value="financial">Financial</option>
                                    <option value="productivity">Productivity</option>
                                    <option value="analysis">Analysis</option>
                                    <option value="utility">Utility</option>
                                </Select>
                            </div>
                            <div>
                                <label className="block text-sm text-text-secondary mb-1">Version</label>
                                <input
                                    type="text"
                                    required
                                    className="input w-full"
                                    value={submitForm.version}
                                    onChange={e => setSubmitForm({ ...submitForm, version: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-text-secondary mb-1">Description</label>
                                <textarea
                                    className="input w-full h-24"
                                    required
                                    value={submitForm.description}
                                    onChange={e => setSubmitForm({ ...submitForm, description: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-text-secondary mb-2">Requested Scopes (Read-Only)</label>
                                <div className="space-y-2 max-h-32 overflow-y-auto p-2 border border-white/10 rounded">
                                    {['read:account', 'read:transactions', 'read:report', 'read:market_data'].map(scope => (
                                        <label key={scope} className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="checkbox checkbox-xs"
                                                checked={submitForm.scopes.includes(scope)}
                                                onChange={() => toggleScope(scope)}
                                            />
                                            <span className="text-sm font-mono">{scope}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button type="button" className="btn btn-ghost flex-1" onClick={() => setShowSubmitModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary flex-1">Submit for Review</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
