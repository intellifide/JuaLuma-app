import React from 'react';

export const FeatureRequest = () => {
    return (
        <div>
            <section className="container max-w-[800px] py-12">
                <div className="glass-panel">
                    <h1 className="mb-4">Feature Request</h1>
                    <p className="text-text-secondary mb-8">
                        Tell us what you need. We use this to prioritize our roadmap.
                    </p>

                    <form onSubmit={(e) => { e.preventDefault(); alert('Feature request submitted (mock).'); }}>
                        <div className="mb-4">
                            <label htmlFor="fr-name" className="form-label mb-1 block">Name</label>
                            <input type="text" id="fr-name" name="name" className="form-input w-full" required />
                        </div>
                        <div className="mb-4">
                            <label htmlFor="fr-email" className="form-label mb-1 block">Email</label>
                            <input type="email" id="fr-email" name="email" className="form-input w-full" required />
                        </div>
                        <div className="mb-4">
                            <label htmlFor="fr-summary" className="form-label mb-1 block">Feature Summary</label>
                            <input type="text" id="fr-summary" name="summary" className="form-input w-full" required />
                        </div>
                        <div className="mb-4">
                            <label htmlFor="fr-problem" className="form-label mb-1 block">Problem / Use Case</label>
                            <textarea id="fr-problem" name="problem" className="form-textarea w-full h-32" required></textarea>
                        </div>
                        <div className="mb-4">
                            <label htmlFor="fr-priority" className="form-label mb-1 block">Priority</label>
                            <select id="fr-priority" name="priority" className="form-select w-full" required>
                                <option value="">Select...</option>
                                <option>Critical</option>
                                <option>High</option>
                                <option>Medium</option>
                                <option>Low</option>
                            </select>
                        </div>
                        <div className="mb-4">
                            <label htmlFor="fr-tier" className="form-label mb-1 block">Your Plan</label>
                            <select id="fr-tier" name="tier" className="form-select w-full">
                                <option value="">Select...</option>
                                <option>Free</option>
                                <option>Essential</option>
                                <option>Pro</option>
                                <option>Ultimate</option>
                            </select>
                        </div>
                        <div className="mb-4">
                            <label htmlFor="fr-link" className="form-label mb-1 block">Reference URL (optional)</label>
                            <input type="url" id="fr-link" name="link" className="form-input w-full" />
                        </div>
                        <div className="mb-6">
                            <label className="flex items-center gap-2">
                                <input type="checkbox" className="form-checkbox" required />
                                <span>I consent to being contacted about this request.</span>
                            </label>
                        </div>
                        <button type="submit" className="btn btn-primary w-full">Submit Request</button>
                    </form>
                </div>
            </section>
        </div>
    );
};
