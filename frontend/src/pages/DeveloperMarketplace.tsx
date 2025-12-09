import React from 'react';
import { Link } from 'react-router-dom';

export const DeveloperMarketplace = () => {
    return (
        <div className="pt-0"> {/* Remove default padding if needed for hero, or handle in Layout. Assuming layout has content wrapper, I'll use full width hero inside if possible or just standard container structure */}

            {/* Hero Section */}
            <section className="bg-gradient-to-br from-primary to-secondary text-white py-16">
                <div className="container text-center text-text-inverse">
                    <h1 className="text-white mb-6">Build on Finity. Earn from Engagement.</h1>
                    <p className="text-xl text-white/90 mb-8 max-w-[700px] mx-auto">
                        Create widgets that integrate with the Finity platform. Earn revenue based on user engagement and verified ratings.
                    </p>
                    <div className="flex gap-4 justify-center flex-wrap">
                        <Link to="/developer-sdk" className="btn btn-accent btn-lg text-white no-underline">Get Started with SDK</Link>
                        <a href="#submit-widget" className="btn btn-outline btn-lg bg-white/10 border-white/30 text-white hover:bg-white/20">Submit Your Widget</a>
                    </div>
                </div>
            </section>

            <section className="container py-16">
                {/* Access Control Note */}
                <div className="alert bg-blue-500/10 border border-blue-500/20 text-blue-400 p-4 rounded-lg mb-12">
                    <strong>Marketplace Access:</strong> Pro & Ultimate tier subscribers get full marketplace access to publish and distribute widgets. Free & Essential tier users can preview widgets but interactions are blocked—upgrade to publish your own widgets.
                </div>

                {/* Immutable Payout Ledger */}
                <div className="glass-panel mb-12">
                    <h2 className="mb-4">Immutable Payout Ledger</h2>
                    <p className="mb-4">
                        Developer payouts are calculated based on <strong>downloads</strong> and <strong>ratings</strong> tracked immutably:
                    </p>
                    <ul className="list-disc pl-8 mb-4">
                        <li>All download and rating events are written to Cloud SQL ledger tables</li>
                        <li>Data is mirrored to Firestore <code>widget_engagement</code> collection for real-time queries</li>
                        <li>No manual overrides or edits—all records are append-only for audit integrity</li>
                        <li>Complete audit trail retained for financial reconciliation and developer payouts</li>
                    </ul>
                    <p className="text-sm text-text-muted">
                        This ensures accurate and auditable developer payouts. All engagement metrics are cryptographically verifiable.
                    </p>
                </div>

                {/* Ratings Integrity */}
                <div className="glass-panel mb-12">
                    <h2 className="mb-4">Ratings Integrity</h2>
                    <p className="mb-4">
                        The marketplace uses a verified 1-5 star rating system:
                    </p>
                    <ul className="list-disc pl-8 mb-4">
                        <li>Only verified users can submit ratings (prevents spam and fake reviews)</li>
                        <li>Ratings are tied to actual widget usage (minimum interaction threshold required)</li>
                        <li>Anti-fraud monitoring detects and flags suspicious rating patterns</li>
                        <li>All ratings are immutable once submitted (no edits, only appeals process)</li>
                    </ul>
                    <p className="text-sm text-text-muted">
                        This ensures ratings reflect genuine user experience and maintain marketplace quality.
                    </p>
                </div>

                {/* Data Access Model */}
                <div className="glass-panel mb-12">
                    <h2 className="mb-4">Data Access Model</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
                        <div className="card">
                            <h3 className="text-accent mb-4">✓ Allowed Scopes</h3>
                            <ul className="list-disc pl-6 space-y-1">
                                <li>Read-only ledger access (transactions, balances)</li>
                                <li>Read-only account metadata (names, types, status)</li>
                                <li>Read-only category and budget data</li>
                                <li>Read-only analytics and infographics</li>
                                <li>Sandbox/test data for development</li>
                                <li>Secrets stored in Secret Manager (never in widget bundles)</li>
                            </ul>
                        </div>
                        <div className="card">
                            <h3 className="text-red-600 mb-4">✗ Not Allowed</h3>
                            <ul className="list-disc pl-6 space-y-1">
                                <li>No transfer or withdrawal capabilities</li>
                                <li>No trade execution or order placement</li>
                                <li>No write access to user accounts</li>
                                <li>No modification of transaction data</li>
                                <li>No access to raw API keys or credentials</li>
                                <li>No PII collection beyond what's necessary for widget function</li>
                            </ul>
                        </div>
                    </div>
                    <div className="alert bg-amber-500/10 border border-amber-500/20 text-amber-500 p-4 rounded-lg mt-6">
                        <strong>Read-Only Mandate:</strong> All widgets must operate in read-only mode to maintain non-custodial, non-MSB status under FinCEN regulations. Any widget attempting write operations will be rejected during security review.
                    </div>
                </div>

                {/* Preview & Paywall Behavior */}
                <div className="glass-panel mb-12">
                    <h2 className="mb-4">Preview & Paywall Behavior</h2>
                    <p className="mb-4">
                        Premium widgets can expose preview content to Free/Essential tier users:
                    </p>
                    <ul className="list-disc pl-8 mb-4">
                        <li>Widgets can be marked as "previewable" during submission</li>
                        <li>Preview mode uses synthetic/curated data (no real user data exposed)</li>
                        <li>All interactive elements are blocked for Free/Essential users</li>
                        <li>Upgrade CTA modal appears when users attempt to interact</li>
                        <li>Pro/Ultimate users get full functionality with real data</li>
                    </ul>
                    <p className="text-sm text-text-muted">
                        This allows users to discover premium features while maintaining clear upgrade incentives.
                    </p>
                </div>

                {/* Submission Workflow */}
                <div className="glass-panel mb-12 text-left" id="submit-widget"> {/* Explicit text-left just in case */}
                    <h2 className="mb-4">Submission Workflow</h2>
                    <p className="mb-6">
                        Follow these steps to submit your widget for review and publication:
                    </p>

                    <div className="space-y-8 mb-8">
                        <div className="flex items-start pb-6 border-b border-border">
                            <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold mr-4 shrink-0">1</div>
                            <div>
                                <h3 className="mb-2">Build & Validate</h3>
                                <p>Use the <Link to="/developer-sdk" className="text-primary hover:underline">Developer SDK</Link> to create your widget. Define manifest, scopes, and preview data. Run validation checks before submission.</p>
                            </div>
                        </div>

                        <div className="flex items-start pb-6 border-b border-border">
                            <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold mr-4 shrink-0">2</div>
                            <div>
                                <h3 className="mb-2">Submit Package</h3>
                                <p>Upload widget bundle (manifest, code, assets). Declare required scopes, preview data flag, and version number. All bundles must include checksum and signed manifest.</p>
                            </div>
                        </div>

                        <div className="flex items-start pb-6 border-b border-border">
                            <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold mr-4 shrink-0">3</div>
                            <div>
                                <h3 className="mb-2">Security Review</h3>
                                <p>Finity team reviews scopes, validates read-only constraints, checks for disallowed operations, and verifies no secrets in bundles. Target review time: 5-7 business days.</p>
                            </div>
                        </div>

                        <div className="flex items-start pb-6 border-b border-border">
                            <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold mr-4 shrink-0">4</div>
                            <div>
                                <h3 className="mb-2">Sandbox Validation</h3>
                                <p>Widget is tested in isolated sandbox environment with synthetic data. Automated tests verify functionality, performance, and security boundaries.</p>
                            </div>
                        </div>

                        <div className="flex items-start pb-6 border-b border-border">
                            <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold mr-4 shrink-0">5</div>
                            <div>
                                <h3 className="mb-2">Legal Approval</h3>
                                <p>Developer Agreement must be executed (includes IP assignment to Intellifide, LLC). All widgets must comply with GLBA, GDPR, and FinCEN non-MSB requirements.</p>
                            </div>
                        </div>

                        <div className="flex items-start">
                            <div className="w-10 h-10 rounded-full bg-accent text-white flex items-center justify-center font-bold mr-4 shrink-0">6</div>
                            <div>
                                <h3 className="mb-2">Publish</h3>
                                <p>Once approved, widget appears in customer marketplace. Status badges: Draft → Submitted → In Review → Changes Requested → Approved → Published.</p>
                            </div>
                        </div>
                    </div>

                    <div className="alert bg-blue-500/10 border border-blue-500/20 text-blue-400 p-4 rounded-lg">
                        <strong>Note:</strong> This is a mock submission interface. In production, widgets will be submitted via Developer SDK CLI or web portal with full validation and security checks.
                    </div>
                </div>

                {/* Observability for Developers */}
                <div className="glass-panel mb-12">
                    <h2 className="mb-4">Observability & Metrics</h2>
                    <p className="mb-4">
                        Developers can monitor their widget performance through the developer dashboard:
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
                        <div>
                            <h4 className="mb-2 font-semibold">Available Metrics</h4>
                            <ul className="list-disc pl-6 space-y-1">
                                <li>Total downloads</li>
                                <li>Daily active users (DAU)</li>
                                <li>Session length and engagement</li>
                                <li>Error rates and crash reports</li>
                                <li>Rating distribution (1-5 stars)</li>
                                <li>Upgrade conversion from preview</li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="mb-2 font-semibold">Privacy Boundaries</h4>
                            <ul className="list-disc pl-6 space-y-1">
                                <li>No PII exposure in metrics</li>
                                <li>Aggregated data only</li>
                                <li>No access to individual user data</li>
                                <li>Telemetry limited to performance</li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Policies & Removals */}
                <div className="glass-panel mb-12">
                    <h2 className="mb-4">Policies & Removals</h2>
                    <p className="mb-4">
                        Finity maintains strict policies to ensure marketplace quality and security:
                    </p>
                    <ul className="list-disc pl-8 mb-4">
                        <li><strong>Kill Switch:</strong> Widgets can be immediately disabled if security issues are detected or abuse is reported</li>
                        <li><strong>Version Rollback:</strong> Previous versions can be restored if new releases cause issues</li>
                        <li><strong>Removal Criteria:</strong> Violations include scope misuse, security findings, abuse reports, or non-compliance with Developer Agreement</li>
                        <li><strong>Appeal Process:</strong> Developers can appeal removals through dedicated support channel</li>
                    </ul>
                    <p className="text-sm text-text-muted">
                        All enforcement actions are logged and auditable. Developers receive notifications before removal when possible.
                    </p>
                </div>

                {/* Security & Compliance */}
                <div className="glass-panel mb-12">
                    <h2 className="mb-4">Security & Compliance</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
                        <div>
                            <h4 className="mb-2 font-semibold">Content Security Policy</h4>
                            <ul className="list-disc pl-6 space-y-1 text-sm">
                                <li>Widgets run in isolated iframes</li>
                                <li>Strict CSP enforced (no inline scripts)</li>
                                <li>Limited allowed origins</li>
                                <li>External calls blocked unless whitelisted</li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="mb-2 font-semibold">Secrets & Credentials</h4>
                            <ul className="list-disc pl-6 space-y-1 text-sm">
                                <li>No secrets in widget bundles</li>
                                <li>Secrets injected via Secret Manager</li>
                                <li>Least privilege access</li>
                                <li>Automatic detection of exposed keys</li>
                            </ul>
                        </div>
                    </div>
                    <div className="alert bg-amber-500/10 border border-amber-500/20 text-amber-500 p-4 rounded-lg mt-6">
                        <strong>Submission Rejection:</strong> Widgets containing secrets, API keys, or credentials will be automatically rejected during security review.
                    </div>
                </div>

                {/* Rate Limits & Resource Guards */}
                <div className="glass-panel mb-12">
                    <h2 className="mb-4">Rate Limits & Resource Guards</h2>
                    <p className="mb-4">
                        To ensure platform stability and fair resource usage:
                    </p>
                    <ul className="list-disc pl-8 mb-4">
                        <li>Per-widget rate limits enforced (prevents abuse and runaway costs)</li>
                        <li>Memory and CPU budgets per widget instance</li>
                        <li>Circuit breakers automatically disable widgets exceeding limits</li>
                        <li>Telemetry monitoring detects anomalies and triggers alerts</li>
                    </ul>
                    <p className="text-sm text-text-muted">
                        Specific limits will be defined per widget tier and communicated during onboarding.
                    </p>
                </div>

                {/* CTA Section */}
                <div className="text-center mt-16 mb-8">
                    <h2 className="mb-6">Ready to Build?</h2>
                    <p className="mb-8 max-w-[600px] mx-auto">
                        Start building your widget with the Developer SDK. All tools and documentation are available to get you started.
                    </p>
                    <div className="flex gap-4 justify-center flex-wrap">
                        <Link to="/developer-sdk" className="btn btn-primary btn-lg">Get Started with SDK</Link>
                        <Link to="/support" className="btn btn-outline btn-lg">Developer Support</Link>
                    </div>
                </div>
            </section>
        </div>
    );
};
