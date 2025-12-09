import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export const DeveloperSDK = () => {
    const [activeTab, setActiveTab] = useState('playground');
    const [validationResult, setValidationResult] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);

    const handleValidate = () => {
        const nameInput = document.getElementById('widget-name') as HTMLInputElement;
        const versionInput = document.getElementById('widget-version') as HTMLInputElement;
        const name = nameInput?.value;
        const version = versionInput?.value;

        if (!name || !version) {
            setValidationResult({ type: 'error', message: '❌ Validation failed: Widget name and version are required.' });
            return;
        }

        if (!/^\d+\.\d+\.\d+$/.test(version)) {
            setValidationResult({ type: 'error', message: '❌ Validation failed: Version must be in format X.Y.Z (e.g., 1.0.0).' });
            return;
        }

        const checkedScopes = document.querySelectorAll('input[type="checkbox"][id^="scope-"]:checked');
        if (checkedScopes.length === 0) {
            setValidationResult({ type: 'warning', message: '⚠️ Warning: No scopes selected. Your widget may not have access to any data.' });
            return;
        }

        setValidationResult({ type: 'success', message: '✓ Manifest validated successfully! Ready for submission.' });
    };

    return (
        <div className="container py-16">
            <h1 className="mb-4">Developer SDK & Sandbox</h1>
            <p className="text-lg text-text-secondary mb-12 max-w-[700px]">
                Build, test, and validate your widgets before submission. All tools run locally with mock data—no backend required for development.
            </p>

            {/* Tab Navigation */}
            <div className="flex gap-4 border-b-2 border-border mb-8 flex-wrap" role="tablist">
                {['playground', 'scopes', 'cli', 'checklist', 'test-harness'].map((tab) => (
                    <button
                        key={tab}
                        className={`py-3 px-4 bg-transparent border-0 border-b-4 cursor-pointer text-base text-text-secondary transition-all hover:text-primary ${activeTab === tab ? 'text-primary border-primary font-semibold' : 'border-transparent'
                            }`}
                        role="tab"
                        aria-selected={activeTab === tab}
                        onClick={() => setActiveTab(tab)}
                    >
                        {tab === 'playground' && 'Playground'}
                        {tab === 'scopes' && 'Scopes'}
                        {tab === 'cli' && 'CLI & Install'}
                        {tab === 'checklist' && 'Submission Checklist'}
                        {tab === 'test-harness' && 'Test Harness'}
                    </button>
                ))}
            </div>

            {/* Playground Tab */}
            {activeTab === 'playground' && (
                <div role="tabpanel">
                    <div className="glass-panel">
                        <h2 className="mb-6">Widget Manifest Editor</h2>
                        <p className="mb-6 text-text-muted">
                            Define your widget's manifest, scopes, and preview data. All fields are validated before submission.
                        </p>

                        <div className="grid gap-4">
                            <div className="mb-4">
                                <label htmlFor="widget-name" className="block mb-1 font-semibold text-text-primary">Widget Name *</label>
                                <input type="text" id="widget-name" defaultValue="Budget Calculator Pro" placeholder="e.g., Budget Calculator Pro" className="w-full p-2 border border-border rounded text-base bg-bg-primary text-text-primary" />
                            </div>

                            <div className="mb-4">
                                <label htmlFor="widget-version" className="block mb-1 font-semibold text-text-primary">Version *</label>
                                <input type="text" id="widget-version" defaultValue="1.0.0" placeholder="e.g., 1.0.0" className="w-full p-2 border border-border rounded text-base bg-bg-primary text-text-primary" />
                            </div>

                            <div className="mb-4">
                                <label htmlFor="widget-description" className="block mb-1 font-semibold text-text-primary">Description *</label>
                                <textarea id="widget-description" defaultValue="Advanced budget calculator with scenario planning and forecasting capabilities. Helps users visualize spending patterns and set realistic financial goals." placeholder="Describe what your widget does..." className="w-full p-2 border border-border rounded text-base bg-bg-primary text-text-primary min-h-[100px] resize-y"></textarea>
                            </div>

                            <div className="mb-4">
                                <label className="block mb-2 font-semibold text-text-primary">Required Scopes *</label>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <input type="checkbox" id="scope-ledger" defaultChecked className="w-auto accent-primary" />
                                        <label htmlFor="scope-ledger">Read-only ledger access</label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input type="checkbox" id="scope-accounts" className="w-auto accent-primary" />
                                        <label htmlFor="scope-accounts">Read-only account metadata</label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input type="checkbox" id="scope-categories" defaultChecked className="w-auto accent-primary" />
                                        <label htmlFor="scope-categories">Read-only category data</label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input type="checkbox" id="scope-budgets" defaultChecked className="w-auto accent-primary" />
                                        <label htmlFor="scope-budgets">Read-only budget data</label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input type="checkbox" id="scope-analytics" className="w-auto accent-primary" />
                                        <label htmlFor="scope-analytics">Read-only analytics</label>
                                    </div>
                                </div>
                            </div>

                            <div className="mb-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" id="preview-enabled" defaultChecked className="w-auto accent-primary" />
                                    <span>Enable Preview Mode</span>
                                    <span className="inline-block px-2 py-0.5 bg-accent text-white rounded text-xs font-semibold ml-2">PREVIEW</span>
                                </label>
                                <p className="text-sm text-text-muted mt-1">
                                    When enabled, Free/Essential tier users can see a preview with synthetic data. Interactions are blocked until upgrade.
                                </p>
                            </div>

                            <div className="mb-4">
                                <label htmlFor="preview-data" className="block mb-1 font-semibold text-text-primary">Preview Data (JSON)</label>
                                <textarea id="preview-data" placeholder='{"transactions": [...], "budgets": [...]}' defaultValue={`{
  "transactions": [
    {"date": "2025-01-15", "amount": -45.50, "category": "Food & Dining", "merchant": "Blue Bottle Coffee"},
    {"date": "2025-01-14", "amount": -120.00, "category": "Shopping", "merchant": "Amazon"},
    {"date": "2025-01-13", "amount": 3200.00, "category": "Income", "merchant": "Employer"}
  ],
  "budgets": [
    {"category": "Food & Dining", "limit": 500, "spent": 320},
    {"category": "Shopping", "limit": 300, "spent": 180}
  ]
}`} className="w-full p-2 border border-border rounded text-base font-mono bg-bg-primary text-text-primary min-h-[200px]"></textarea>
                            </div>

                            <button className="btn btn-primary w-fit" onClick={handleValidate}>Validate Manifest</button>
                            {validationResult && (
                                <div className={`p-3 rounded text-sm font-semibold mt-4 ${validationResult.type === 'success' ? 'bg-[#D1FAE5] text-[#065F46]' :
                                        validationResult.type === 'error' ? 'bg-[#FEE2E2] text-[#991B1B]' :
                                            'bg-[#FEF3C7] text-[#92400E]'
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
                <div role="tabpanel">
                    <div className="glass-panel">
                        <h2 className="mb-6">Available Scopes</h2>
                        <p className="mb-6">
                            Widgets can request read-only access to specific data types. All scopes are reviewed during security review.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
                            <div className="card">
                                <h3 className="text-accent mb-4">✓ Allowed Scopes</h3>
                                <ul className="list-disc pl-6 space-y-1">
                                    <li><strong>ledger:read</strong> - Read transaction ledger</li>
                                    <li><strong>accounts:read</strong> - Read account metadata</li>
                                    <li><strong>categories:read</strong> - Read category definitions</li>
                                    <li><strong>budgets:read</strong> - Read budget limits and spending</li>
                                    <li><strong>analytics:read</strong> - Read aggregated analytics</li>
                                    <li><strong>recurring:read</strong> - Read recurring transaction patterns</li>
                                </ul>
                            </div>
                            <div className="card">
                                <h3 className="text-red-600 mb-4">✗ Prohibited</h3>
                                <ul className="list-disc pl-6 space-y-1">
                                    <li><strong>No write operations</strong> - Cannot modify any data</li>
                                    <li><strong>No transfers</strong> - Cannot initiate money movements</li>
                                    <li><strong>No trades</strong> - Cannot execute investment trades</li>
                                    <li><strong>No secrets</strong> - Cannot access API keys or credentials</li>
                                    <li><strong>No PII</strong> - Limited to necessary data only</li>
                                </ul>
                            </div>
                        </div>

                        <div className="alert bg-amber-500/10 border border-amber-500/20 text-amber-500 p-4 rounded-lg mt-6">
                            <strong>Scope Validation:</strong> Requesting disallowed scopes will cause your submission to be rejected. Only request scopes your widget actually needs.
                        </div>
                    </div>
                </div>
            )}

            {/* CLI & Install Tab */}
            {activeTab === 'cli' && (
                <div role="tabpanel">
                    <div className="glass-panel">
                        <h2 className="mb-6">Installation & CLI</h2>

                        <h3 className="mt-6 mb-4 font-bold text-lg">Install SDK</h3>
                        <div className="bg-bg-secondary border border-border rounded p-4 font-mono text-sm overflow-x-auto mb-4">
                            npm install @finity/sdk
                        </div>

                        <h3 className="mt-6 mb-4 font-bold text-lg">Initialize Widget</h3>
                        <div className="bg-bg-secondary border border-border rounded p-4 font-mono text-sm overflow-x-auto mb-4 whitespace-pre">
                            {`# Initialize new widget project
finity dev init my-widget

# This creates:
# - widget.json (manifest)
# - src/index.js (widget entry point)
# - preview-data.json (synthetic data for preview mode)
# - .finityignore (files to exclude from bundle)`}
                        </div>

                        <h3 className="mt-6 mb-4 font-bold text-lg">Example Widget Code</h3>
                        <div className="bg-bg-secondary border border-border rounded p-4 font-mono text-sm overflow-x-auto mb-4 whitespace-pre">
                            {`import { FinitySDK } from '@finity/sdk';

const sdk = new FinitySDK({
  scopes: ['ledger:read', 'budgets:read'],
  previewEnabled: true
});

// Listen for transaction events
sdk.on('transaction', (transaction) => {
  console.log('New transaction:', transaction);
  updateBudgetDisplay(transaction);
});

// Access ledger data
const transactions = await sdk.ledger.getTransactions({
  startDate: '2025-01-01',
  endDate: '2025-01-31'
});

// Access budget data
const budgets = await sdk.budgets.getAll();`}
                        </div>

                        <h3 className="mt-6 mb-4 font-bold text-lg">Build & Validate</h3>
                        <div className="bg-bg-secondary border border-border rounded p-4 font-mono text-sm overflow-x-auto mb-4 whitespace-pre">
                            {`# Build widget bundle
finity dev build

# Validate manifest and scopes
finity dev validate

# Run in local sandbox
finity dev sandbox`}
                        </div>

                        <div className="alert bg-blue-500/10 border border-blue-500/20 text-blue-400 p-4 rounded-lg mt-6">
                            <strong>Note:</strong> This is a mock SDK interface. In production, the CLI will provide full validation, bundling, and local testing capabilities.
                        </div>
                    </div>
                </div>
            )}

            {/* Submission Checklist Tab */}
            {activeTab === 'checklist' && (
                <div role="tabpanel">
                    <div className="glass-panel">
                        <h2 className="mb-6">Pre-Submission Checklist</h2>
                        <p className="mb-6">
                            Ensure all items are completed before submitting your widget for review:
                        </p>

                        <div className="mt-6 space-y-4">
                            {[
                                "Manifest validation passes - All required fields present, version format correct",
                                "Scopes validated - Only allowed scopes requested, no prohibited operations",
                                "Preview data provided - If preview mode enabled, synthetic data included",
                                "No secrets in bundle - No API keys, credentials, or .env files included",
                                "Read-only operations - No write, transfer, or trade operations",
                                "Developer Agreement signed - IP assignment and terms accepted",
                                "Bundle checksum generated - Manifest signed and hash included",
                                "Local testing passed - Widget runs successfully in sandbox environment"
                            ].map((item, index) => {
                                const [bold, text] = item.split(' - ');
                                return (
                                    <div key={index} className="flex items-center gap-2 p-4 bg-bg-secondary rounded border border-border">
                                        <input type="checkbox" checked readOnly disabled className="w-auto accent-primary opacity-70" />
                                        <label className="m-0 text-text-primary"><strong>{bold}</strong> - {text}</label>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="mt-8 p-6 bg-accent text-white rounded text-center">
                            <p className="m-0 text-lg font-semibold">✓ All checks passed! Ready to submit.</p>
                            <Link to="/developer-marketplace#submit-widget" className="btn btn-outline mt-4 inline-block bg-white/20 border-white/50 text-white hover:bg-white/30">Submit for Review</Link>
                        </div>
                    </div>
                </div>
            )}

            {/* Test Harness Tab */}
            {activeTab === 'test-harness' && (
                <div role="tabpanel">
                    <div className="glass-panel">
                        <h2 className="mb-6">Test Harness</h2>
                        <p className="mb-6">
                            Test your widget with mock events and data. All events use synthetic data—no real user information.
                        </p>

                        <div className="mt-6">
                            <h3 className="mb-4 font-bold text-lg">Mock Events</h3>

                            <div className="space-y-4">
                                <div className="bg-bg-secondary border border-border rounded p-4">
                                    <h4 className="mb-2 text-primary font-semibold">onTransaction</h4>
                                    <p className="text-sm text-text-muted mb-2">Fired when a new transaction is detected</p>
                                    <div className="bg-bg-primary border border-border rounded p-3 font-mono text-sm overflow-x-auto mb-3 whitespace-pre">
                                        {`{
  "id": "txn_12345",
  "date": "2025-01-15T10:30:00Z",
  "amount": -45.50,
  "merchant": "Blue Bottle Coffee",
  "category": "Food & Dining",
  "accountId": "acc_chase_checking"
}`}
                                    </div>
                                    <button className="btn btn-sm btn-outline" disabled>Trigger Event</button>
                                </div>

                                <div className="bg-bg-secondary border border-border rounded p-4">
                                    <h4 className="mb-2 text-primary font-semibold">onBudgetAlert</h4>
                                    <p className="text-sm text-text-muted mb-2">Fired when budget threshold is reached</p>
                                    <div className="bg-bg-primary border border-border rounded p-3 font-mono text-sm overflow-x-auto mb-3 whitespace-pre">
                                        {`{
  "budgetCategory": "Food & Dining",
  "limit": 500.00,
  "spent": 450.00,
  "percentage": 90,
  "threshold": 80
}`}
                                    </div>
                                    <button className="btn btn-sm btn-outline" disabled>Trigger Event</button>
                                </div>

                                <div className="bg-bg-secondary border border-border rounded p-4">
                                    <h4 className="mb-2 text-primary font-semibold">onAccountSync</h4>
                                    <p className="text-sm text-text-muted mb-2">Fired when account sync completes</p>
                                    <div className="bg-bg-primary border border-border rounded p-3 font-mono text-sm overflow-x-auto mb-3 whitespace-pre">
                                        {`{
  "accountId": "acc_fidelity_401k",
  "accountType": "investment",
  "syncStatus": "success",
  "transactionsAdded": 12,
  "lastSync": "2025-01-15T14:20:00Z"
}`}
                                    </div>
                                    <button className="btn btn-sm btn-outline" disabled>Trigger Event</button>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8">
                            <h3 className="mb-4 font-bold text-lg">Run in Sandbox</h3>
                            <p className="mb-4">
                                Launch your widget in an isolated sandbox environment with full mock data:
                            </p>
                            <button className="btn btn-primary" disabled>Run in Sandbox (Mock)</button>
                            <p className="text-sm text-text-muted mt-2">
                                In production, this will launch a local sandbox server with your widget loaded and all SDK methods available.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
