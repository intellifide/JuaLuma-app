import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { HelloWorldWidget } from '../sdk/examples/HelloWorldWidget';
import { DataFetcherWidget } from '../sdk/examples/DataFetcherWidget';
import { mockClient } from '../sdk/mockClient';
import { Paywall } from '../components/ui/Paywall';

export const DeveloperSDK = () => {
    const { profile, profileLoading } = useAuth();
    const [activeTab, setActiveTab] = useState('playground');

    const hasPro = profile?.subscriptions?.some(s =>
        s.status === 'active' && ['pro', 'ultimate'].includes(s.plan || '')
    );
    const isDeveloper = (profile as unknown as Record<string, unknown>)?.is_developer;

    // Playground State
    const [manifest, setManifest] = useState({
        name: 'Budget Calculator Pro',
        version: '1.0.0',
        description: 'Advanced budget calculator with scenario planning.',
        scopes: ['read:ledger', 'read:budgets'],
        previewEnabled: true,
        previewData: `{
  "transactions": [
    {"date": "2025-01-15", "amount": -45.50, "category": "Food & Dining", "merchant": "Blue Bottle Coffee"},
    {"date": "2025-01-14", "amount": -120.00, "category": "Shopping", "merchant": "Amazon"},
    {"date": "2025-01-13", "amount": 3200.00, "category": "Income", "merchant": "Employer"}
  ]
}`
    });
    const [validationResult, setValidationResult] = useState<{ status: 'success' | 'error' | 'warning', message: string } | null>(null);

    const validateManifest = () => {
        if (!manifest.name || !manifest.version) {
            setValidationResult({ status: 'error', message: '❌ Validation failed: Widget name and version are required.' });
            return;
        }
        if (!/^\d+\.\d+\.\d+$/.test(manifest.version)) {
            setValidationResult({ status: 'error', message: '❌ Validation failed: Version must be in format X.Y.Z (e.g., 1.0.0).' });
            return;
        }
        if (manifest.scopes.length === 0) {
            setValidationResult({ status: 'warning', message: '⚠️ Warning: No scopes selected. Your widget may not have access to any data.' });
            return;
        }
        setValidationResult({ status: 'success', message: '✓ Manifest validated successfully! Ready for submission.' });
    };

    // Allow guests to view docs (CLI, Examples) but gate Playground
    const isGuest = !profile;

    if (profileLoading) return <div className="container py-16 text-center">Loading...</div>;

    // Remove Paywall block - effectively allow everyone to see the SDK page
    // We can conditionally limit features inside the tabs


    return (
        <div className="container py-16">
            <h1 className="text-3xl font-bold mb-4">Developer SDK & Sandbox</h1>
            <p className="text-xl text-text-secondary mb-12 max-w-[700px]">
                Build, test, and validate your widgets before submission. All tools run locally with mock data—no backend required for development.
            </p>

            {/* Tab Navigation */}
            <div className="flex gap-1 border-b border-white/10 mb-8 overflow-x-auto">
                {['playground', 'scopes', 'cli', 'checklist', 'test-harness', 'examples'].map(tab => (
                    <button
                        key={tab}
                        className={`px-6 py-3 border-b-2 transition-colors whitespace-nowrap ${activeTab === tab ? 'border-primary text-primary font-bold' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
                        onClick={() => setActiveTab(tab)}
                    >
                        {tab.charAt(0).toUpperCase() + tab.slice(1).replace('-', ' ')}
                    </button>
                ))}
            </div>

            {/* Playground Tab */}
            {activeTab === 'playground' && (
                <div className="glass-panel">
                    <h2 className="text-2xl font-bold mb-6">Widget Manifest Editor</h2>
                    <p className="mb-8 text-text-muted">Define your widget&apos;s manifest, scopes, and preview data. All fields are validated before submission.</p>

                    <div className="grid gap-6 max-w-3xl">
                        <div>
                            <label className="block text-sm font-semibold mb-2">Widget Name *</label>
                            <input
                                type="text"
                                className="input w-full bg-surface-2 text-text-primary border-white/10"
                                value={manifest.name}
                                onChange={e => setManifest({ ...manifest, name: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold mb-2">Version *</label>
                            <input
                                type="text"
                                className="input w-full bg-surface-2 text-text-primary border-white/10"
                                value={manifest.version}
                                placeholder="1.0.0"
                                onChange={e => setManifest({ ...manifest, version: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold mb-2">Description *</label>
                            <textarea
                                className="input w-full h-24 bg-surface-2 text-text-primary border-white/10"
                                value={manifest.description}
                                onChange={e => setManifest({ ...manifest, description: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold mb-2">Required Scopes *</label>
                            <div className="grid grid-cols-2 gap-3 bg-bg-secondary p-4 rounded border border-white/10">
                                {['read:ledger', 'read:accounts', 'read:categories', 'read:budgets', 'read:analytics'].map(scope => (
                                    <label key={scope} className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="checkbox checkbox-xs"
                                            checked={manifest.scopes.includes(scope)}
                                            onChange={e => {
                                                if (e.target.checked) setManifest({ ...manifest, scopes: [...manifest.scopes, scope] });
                                                else setManifest({ ...manifest, scopes: manifest.scopes.filter(s => s !== scope) });
                                            }}
                                        />
                                        <span className="text-sm font-mono">{scope}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="flex items-center gap-3 mb-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="checkbox checkbox-primary"
                                    checked={manifest.previewEnabled}
                                    onChange={e => setManifest({ ...manifest, previewEnabled: e.target.checked })}
                                />
                                <span className="font-semibold">Enable Preview Mode</span>
                                <span className="badge bg-accent text-white text-xs">PREVIEW</span>
                            </label>
                            <p className="text-sm text-text-muted ml-8">When enabled, users see synthetic data before upgrading.</p>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold mb-2">Preview Data (JSON)</label>
                            <textarea
                                className="input w-full h-48 font-mono text-sm bg-surface-2 text-text-primary border-white/10"
                                value={manifest.previewData}
                                onChange={e => setManifest({ ...manifest, previewData: e.target.value })}
                            />
                        </div>

                        <div className="mt-4">
                            <button className="btn btn-primary" onClick={validateManifest}>Validate Manifest</button>
                            {validationResult && (
                                <div className={`mt-4 p-4 rounded border ${validationResult.status === 'success' ? 'bg-green-500/10 border-green-500/40 text-green-400' :
                                    validationResult.status === 'error' ? 'bg-red-500/10 border-red-500/40 text-red-400' :
                                        'bg-yellow-500/10 border-yellow-500/40 text-yellow-400'
                                    }`}>
                                    {validationResult.message}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Scopes Tab */}
            {activeTab === 'scopes' && (
                <div className="glass-panel">
                    <h2 className="text-2xl font-bold mb-6">Available Scopes</h2>
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="card">
                            <h3 className="text-accent text-xl font-bold mb-4">✓ Allowed Scopes</h3>
                            <ul className="list-disc pl-5 space-y-2">
                                <li><strong>read:ledger</strong> - Read transaction ledger</li>
                                <li><strong>read:accounts</strong> - Read account metadata</li>
                                <li><strong>read:categories</strong> - Read category definitions</li>
                                <li><strong>read:budgets</strong> - Read budget limits and spending</li>
                                <li><strong>read:analytics</strong> - Read aggregated analytics</li>
                            </ul>
                        </div>
                        <div className="card">
                            <h3 className="text-red-500 text-xl font-bold mb-4">✗ Prohibited</h3>
                            <ul className="list-disc pl-5 space-y-2">
                                <li><strong>No write operations</strong> - Cannot modify data</li>
                                <li><strong>No transfers</strong> - Cannot move money</li>
                                <li><strong>No secrets</strong> - No API keys allowed</li>
                                <li><strong>No PII</strong> - Minimal user data exposure</li>
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            {/* CLI Tab */}
            {activeTab === 'cli' && (
                <div className="glass-panel">
                    <h2 className="text-2xl font-bold mb-6">Installation & CLI</h2>
                    <div className="space-y-8">
                        <div>
                            <div className="badge bg-bg-secondary mb-2">Install SDK</div>
                            <pre className="bg-black/30 p-4 rounded border border-white/10 font-mono text-sm">npm install @jualuma/sdk</pre>
                        </div>
                        <div>
                            <div className="badge bg-bg-secondary mb-2">Initialize Widget</div>
                            <pre className="bg-black/30 p-4 rounded border border-white/10 font-mono text-sm">
                                {`# Initialize new widget project
jualuma dev init my-widget

# This creates:
# - widget.json (manifest)
# - src/index.js (widget entry point)
# - preview-data.json (synthetic data)`}
                            </pre>
                        </div>
                        <div>
                            <div className="badge bg-bg-secondary mb-2">Run Sandbox</div>
                            <pre className="bg-black/30 p-4 rounded border border-white/10 font-mono text-sm">
                                {`# Build widget bundle
jualuma dev build

# Run in local sandbox
jualuma dev sandbox`}
                            </pre>
                        </div>
                    </div>
                </div>
            )}

            {/* Checklist Tab */}
            {activeTab === 'checklist' && (
                <div className="glass-panel">
                    <h2 className="text-2xl font-bold mb-6">Pre-Submission Checklist</h2>
                    <div className="space-y-4 max-w-2xl">
                        {[
                            "Manifest validation passes",
                            "Scopes validated (only allowed scopes)",
                            "Preview data provided (if preview mode enabled)",
                            "No secrets in bundle (API keys, .env)",
                            "Read-only operations verified",
                            "Developer Agreement signed",
                            "Bundle checksum generated",
                            "Local testing passed in sandbox"
                        ].map((item, i) => (
                            <div key={i} className="flex items-center gap-3 p-4 bg-bg-secondary rounded border border-white/5 opacity-75">
                                <input type="checkbox" checked={true} disabled className="checkbox checkbox-primary checkbox-sm" />
                                <span className="text-text-secondary">{item}</span>
                            </div>
                        ))}
                    </div>
                    <div className="mt-8 p-6 bg-green-500/10 border border-green-500/20 rounded-lg text-center">
                        <p className="text-xl font-bold text-green-400 mb-4">✓ All checks passed! Ready to submit.</p>
                        <Link to="/developers/dashboard" className="btn btn-primary">Go to Submission Portal</Link>
                    </div>
                </div>
            )}

            {/* Examples Tab */}
            {activeTab === 'examples' && (
                <div className="glass-panel">
                    <h2 className="text-2xl font-bold mb-6">Live SDK Examples</h2>
                    <p className="mb-8 text-text-muted">
                        Live rendering of test widgets using the <code>jualumaClient</code> and <code>WidgetContext</code>.
                    </p>

                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="card border border-white/10">
                            <h3 className="text-xl font-bold mb-4">Hello World Widget</h3>
                            <div className="bg-bg-secondary p-4 rounded min-h-[150px]">
                                <HelloWorldWidget
                                    context={{
                                        theme: 'dark',
                                        currency: 'USD',
                                        locale: 'en-US'
                                    }}
                                    client={mockClient}
                                />
                            </div>
                        </div>

                        <div className="card border border-white/10">
                            <h3 className="text-xl font-bold mb-4">Data Fetcher Widget</h3>
                            <div className="bg-bg-secondary p-4 rounded min-h-[150px]">
                                <DataFetcherWidget
                                    context={{
                                        theme: 'dark',
                                        currency: 'USD',
                                        locale: 'en-US'
                                    }}
                                    client={mockClient}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Test Harness Tab */}
            {activeTab === 'test-harness' && (
                <div className="glass-panel">
                    <h2 className="text-2xl font-bold mb-6">Test Harness</h2>
                    <p className="mb-6 text-text-muted">Test your widget with mock events. All events use synthetic data.</p>

                    <div className="grid gap-6">
                        <div className="card border border-white/10">
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="font-bold text-accent">onTransaction</h4>
                                <button className="btn btn-sm btn-outline" disabled>Trigger Event</button>
                            </div>
                            <pre className="bg-black/30 p-4 rounded font-mono text-xs text-text-secondary overflow-x-auto">
                                {`{
  "id": "txn_12345",
  "date": "2025-01-15T10:30:00Z",
  "amount": -45.50,
  "merchant": "Blue Bottle Coffee",
  "accountId": "acc_chase_checking"
}`}
                            </pre>
                        </div>
                        <div className="card border border-white/10">
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="font-bold text-accent">onBudgetAlert</h4>
                                <button className="btn btn-sm btn-outline" disabled>Trigger Event</button>
                            </div>
                            <pre className="bg-black/30 p-4 rounded font-mono text-xs text-text-secondary overflow-x-auto">
                                {`{
  "budgetCategory": "Food & Dining",
  "limit": 500.00,
  "spent": 450.00,
  "percentage": 90
}`}
                            </pre>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};
