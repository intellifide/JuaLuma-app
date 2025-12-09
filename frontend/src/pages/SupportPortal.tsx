import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export const SupportPortal = () => {
    const [selectedTicket, setSelectedTicket] = useState<string>('1234');

    const handleTicketClick = (ticketId: string) => {
        setSelectedTicket(ticketId);
    };

    return (
        <div className="pt-0"> {/* Remove default padding top if handled by Layout or common styles, but here we might need consistent spacing */}
            {/* Mock Banner */}
            <div className="sticky top-0 z-50 bg-amber-100 border-b-2 border-amber-400 text-amber-800 px-4 py-2 text-center font-semibold">
                ⚠️ MOCK IMPLEMENTATION - All controls are disabled. No data changes will occur.
            </div>

            <section className="container py-8">
                {/* Agent Information */}
                <div className="glass-panel mb-8">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="mb-1 m-0">Agent Information</h2>
                            <p className="text-text-secondary m-0">
                                <strong>Name:</strong> Sarah Johnson | <strong>Company ID:</strong> INT-AGENT-2024-001
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-text-muted m-0">
                                Session started: 2:15 PM CT
                            </p>
                            <p className="text-sm text-text-muted mt-1">
                                All actions are tracked and audited
                            </p>
                        </div>
                    </div>
                </div>

                <div className="mb-8">
                    <h1>Customer Support Portal</h1>
                    <p className="text-text-secondary mt-2">
                        Ticket Management & Customer Inquiry Handling
                    </p>
                    <div className="bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-lg p-4 mt-4">
                        <strong>Note:</strong> This portal is designed for non-technical customer service representatives.
                        All actions are read-only in this mock implementation. No PII (Personally Identifiable Information) or AI chat logs are displayed.
                        All agent actions are tracked for accountability, quality assurance, and customer service metrics.
                    </div>
                </div>

                {/* Stats Overview */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <div className="card">
                        <h3 className="text-sm text-text-muted mb-2">Open Tickets</h3>
                        <p className="text-3xl font-bold text-primary">47</p>
                        <p className="text-sm text-text-muted mt-1">12 high priority</p>
                    </div>
                    <div className="card">
                        <h3 className="text-sm text-text-muted mb-2">In Progress</h3>
                        <p className="text-3xl font-bold text-primary">23</p>
                        <p className="text-sm text-text-muted mt-1">Assigned to agents</p>
                    </div>
                    <div className="card">
                        <h3 className="text-sm text-text-muted mb-2">Avg Response Time</h3>
                        <p className="text-3xl font-bold text-primary">2.3h</p>
                        <p className="text-sm text-text-muted mt-1">Target: &lt;4 hours</p>
                    </div>
                    <div className="card">
                        <h3 className="text-sm text-text-muted mb-2">Resolved Today</h3>
                        <p className="text-3xl font-bold text-primary">18</p>
                        <p className="text-sm text-text-muted mt-1">+5 from yesterday</p>
                    </div>
                </div>

                {/* Ticket Management Interface */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                    {/* Ticket List */}
                    <div className="glass-panel h-[600px] flex flex-col">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="m-0">Ticket Queue</h2>
                            <div className="flex gap-2">
                                <select className="form-select w-auto" disabled>
                                    <option>All Status</option>
                                    <option>Open</option>
                                    <option>In Progress</option>
                                    <option>Resolved</option>
                                </select>
                                <select className="form-select w-auto" disabled>
                                    <option>All Priority</option>
                                    <option>High</option>
                                    <option>Normal</option>
                                    <option>Low</option>
                                </select>
                            </div>
                        </div>
                        <div className="mb-4">
                            <input type="text" className="form-input" placeholder="Search tickets..." disabled />
                        </div>
                        <div className="overflow-y-auto flex-1 pr-2">
                            {/* Ticket Items */}
                            <div
                                className={`card cursor-pointer transition-colors duration-200 hover:bg-bg-secondary mb-4 ${selectedTicket === '1234' ? 'bg-primary/10 border-l-4 border-l-primary' : ''}`}
                                onClick={() => handleTicketClick('1234')}
                            >
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <h3 className="m-0 mb-1">Ticket #1234</h3>
                                        <p className="text-text-secondary text-sm m-0">
                                            Account linking issue - Unable to connect Chase account
                                        </p>
                                        <p className="text-text-muted text-xs mt-1">
                                            Created: 2 hours ago | Customer: j***@example.com
                                        </p>
                                    </div>
                                    <span className="badge bg-red-500 text-white">High</span>
                                </div>
                                <div className="mt-2">
                                    <span className="badge bg-amber-500 text-white mr-2">Open</span>
                                    <span className="badge bg-gray-500 text-white">Unassigned</span>
                                </div>
                            </div>

                            <div
                                className={`card cursor-pointer transition-colors duration-200 hover:bg-bg-secondary mb-4 ${selectedTicket === '1233' ? 'bg-primary/10 border-l-4 border-l-primary' : ''}`}
                                onClick={() => handleTicketClick('1233')}
                            >
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <h3 className="m-0 mb-1">Ticket #1233</h3>
                                        <p className="text-text-secondary text-sm m-0">
                                            Billing question - Pro tier trial expiration
                                        </p>
                                        <p className="text-text-muted text-xs mt-1">
                                            Created: 5 hours ago | Customer: s***@example.com
                                        </p>
                                    </div>
                                    <span className="badge bg-gray-500 text-white">Normal</span>
                                </div>
                                <div className="mt-2">
                                    <span className="badge bg-emerald-500 text-white mr-2">In Progress</span>
                                    <span className="badge bg-blue-500 text-white">Agent: Sarah</span>
                                </div>
                            </div>

                            <div
                                className={`card cursor-pointer transition-colors duration-200 hover:bg-bg-secondary mb-4 ${selectedTicket === '1232' ? 'bg-primary/10 border-l-4 border-l-primary' : ''}`}
                                onClick={() => handleTicketClick('1232')}
                            >
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <h3 className="m-0 mb-1">Ticket #1232</h3>
                                        <p className="text-text-secondary text-sm m-0">
                                            Feature request - Export transactions to CSV
                                        </p>
                                        <p className="text-text-muted text-xs mt-1">
                                            Created: 1 day ago | Customer: m***@example.com
                                        </p>
                                    </div>
                                    <span className="badge bg-gray-500 text-white">Low</span>
                                </div>
                                <div className="mt-2">
                                    <span className="badge bg-emerald-500 text-white mr-2">Resolved</span>
                                    <span className="badge bg-blue-500 text-white">Agent: Mike</span>
                                </div>
                            </div>

                            <div
                                className={`card cursor-pointer transition-colors duration-200 hover:bg-bg-secondary mb-4 ${selectedTicket === '1231' ? 'bg-primary/10 border-l-4 border-l-primary' : ''}`}
                                onClick={() => handleTicketClick('1231')}
                            >
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <h3 className="m-0 mb-1">Ticket #1231</h3>
                                        <p className="text-text-secondary text-sm m-0">
                                            Password reset request
                                        </p>
                                        <p className="text-text-muted text-xs mt-1">
                                            Created: 1 day ago | Customer: a***@example.com
                                        </p>
                                    </div>
                                    <span className="badge bg-gray-500 text-white">Normal</span>
                                </div>
                                <div className="mt-2">
                                    <span className="badge bg-emerald-500 text-white mr-2">Resolved</span>
                                    <span className="badge bg-blue-500 text-white">Agent: Sarah</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Ticket Detail Pane */}
                    <div className="glass-panel min-h-[600px]">
                        {selectedTicket === '1234' ? (
                            <>
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="m-0">Ticket #1234</h2>
                                    <div className="flex gap-2">
                                        <button className="btn btn-sm btn-outline" disabled>Assign to Me</button>
                                        <button className="btn btn-sm btn-outline" disabled>Escalate</button>
                                    </div>
                                </div>

                                {/* Ticket Info */}
                                <div className="card mb-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-sm text-text-muted mb-1">Status</p>
                                            <p><span className="badge bg-amber-500 text-white">Open</span></p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-text-muted mb-1">Priority</p>
                                            <p><span className="badge bg-red-500 text-white">High</span></p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-text-muted mb-1">Created</p>
                                            <p>2 hours ago</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-text-muted mb-1">Assigned To</p>
                                            <p>Unassigned</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Customer Info (Masked) */}
                                <div className="card mb-6">
                                    <h3 className="mb-4">Customer Information</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-sm text-text-muted mb-1">Email</p>
                                            <p>j***@example.com</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-text-muted mb-1">Account Status</p>
                                            <p><span className="badge badge-success">Active</span> - Pro Tier</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-text-muted mb-1">Linked Accounts</p>
                                            <p>3 accounts</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-text-muted mb-1">Member Since</p>
                                            <p>Jan 2024</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Ticket Messages */}
                                <div className="mb-6">
                                    <h3 className="mb-4">Conversation</h3>
                                    <div className="flex flex-col gap-4">
                                        <div className="card">
                                            <div className="flex justify-between mb-2">
                                                <strong>Customer</strong>
                                                <span className="text-xs text-text-muted">2 hours ago</span>
                                            </div>
                                            <p className="m-0">I'm unable to connect my Chase checking account. The Plaid link keeps failing with an error message. I've tried multiple times but it's not working.</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Internal Notes */}
                                <div className="mb-6">
                                    <h3 className="mb-4">Internal Notes</h3>
                                    <div className="card mb-4">
                                        <div className="flex justify-between mb-2">
                                            <strong>System</strong>
                                            <span className="text-xs text-text-muted">2 hours ago</span>
                                        </div>
                                        <p className="m-0 text-sm text-text-muted">Ticket automatically categorized as "Technical Support"</p>
                                    </div>
                                    <textarea className="form-textarea mb-2" placeholder="Add internal note..." disabled></textarea>
                                    <button className="btn btn-outline" disabled>Add Note</button>
                                </div>

                                {/* Canned Responses */}
                                <div className="mb-6">
                                    <h3 className="mb-4">Quick Responses</h3>
                                    <select className="form-select mb-2" disabled>
                                        <option>Select a canned response...</option>
                                        <option>Account linking troubleshooting steps</option>
                                        <option>Plaid connection reset instructions</option>
                                        <option>Escalate to technical team</option>
                                    </select>
                                    <button className="btn btn-outline" disabled>Insert Response</button>
                                </div>

                                {/* Response Form */}
                                <div>
                                    <h3 className="mb-4">Reply to Customer</h3>
                                    <textarea className="form-textarea mb-2 min-h-[120px]" placeholder="Type your response..." disabled></textarea>
                                    <div className="flex gap-2">
                                        <button className="btn btn-primary" disabled>Send Response</button>
                                        <button className="btn btn-outline" disabled>Mark as Resolved</button>
                                        <select className="form-select w-auto" disabled>
                                            <option>Reassign to...</option>
                                            <option>Sarah</option>
                                            <option>Mike</option>
                                            <option>Unassigned</option>
                                        </select>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="flex items-center justify-center h-full text-text-muted">
                                Select a ticket to view details (Mock: Only #1234 has full details)
                            </div>
                        )}
                    </div>
                </div>

                {/* System Status */}
                <div className="glass-panel">
                    <h2 className="mb-6">System Status</h2>
                    <div className="bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-lg p-4 mb-4">
                        <strong>System Status:</strong> All systems operational. No scheduled maintenance.
                    </div>
                    <div className="bg-blue-100 border border-blue-300 text-blue-800 rounded-lg p-4">
                        <strong>Note:</strong> Automated ticket management via GCP Cloud Workflows is in development.
                    </div>
                </div>
            </section>
        </div>
    );
};
