import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supportService } from '../services/support';
import { Button } from '../components/ui/Button';
import { useToast } from '../components/ui/Toast';
import { Select } from '../components/ui/Select';

export const FeatureRequest = () => {
    const navigate = useNavigate();
    const { show } = useToast();
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);

        const formData = new FormData(e.currentTarget);
        const summary = formData.get('summary') as string;
        const problem = formData.get('problem') as string;


        // Construct detailed description
        const name = formData.get('name');
        const email = formData.get('email');
        const plan = formData.get('tier');
        const link = formData.get('link');

        const description = `Feature Request Details:
Name: ${name}
Email: ${email}
Plan: ${plan}
Reference URL: ${link}

Problem / Use Case:
${problem}`;

        try {
            await supportService.createTicket({
                subject: `[Feature Request] ${summary}`,
                description: description,
                category: 'feature_request',
            });
            show('Feature request submitted successfully', 'success');
            navigate('/support');
        } catch (error) {
            console.error(error);
            show('Failed to submit feature request', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <section className="container max-w-[800px] py-12">
                <div className="glass-panel">
                    <h1 className="mb-4">Feature Request</h1>
                    <p className="text-text-secondary mb-8">
                        Tell us what you need. We use this to prioritize our roadmap.
                    </p>

                    <form onSubmit={handleSubmit}>
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
                            <label htmlFor="fr-tier" className="form-label mb-1 block">Your Plan</label>
                            <Select id="fr-tier" name="tier">
                                <option value="">Select...</option>
                                <option>Free</option>
                                <option>Essential</option>
                                <option>Pro</option>
                                <option>Ultimate</option>
                            </Select>
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
                        <Button variant="primary" type="submit" className="w-full" disabled={loading}>
                            {loading ? 'Submitting...' : 'Submit Request'}
                        </Button>
                    </form>
                </div>
            </section>
        </div>
    );
};
