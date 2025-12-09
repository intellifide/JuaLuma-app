import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { supportService, TicketCreate } from '../../services/support';
import { useToast } from '../ui/Toast';

interface CreateTicketModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export const CreateTicketModal: React.FC<CreateTicketModalProps> = ({ open, onClose, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const { show } = useToast();
    const [formData, setFormData] = useState<TicketCreate>({
        subject: '',
        description: '',
        category: 'technical', // default
        priority: 'normal',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            await supportService.createTicket(formData);
            show('Ticket created successfully', 'success');
            onSuccess();
            onClose();
        } catch (error) {
            show('Failed to create ticket. Please try again.', 'error');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal open={open} onClose={onClose} title="Create Support Ticket">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="subject" className="block text-sm font-bold mb-1">
                        Subject
                    </label>
                    <input
                        type="text"
                        id="subject"
                        name="subject"
                        className="form-input w-full"
                        placeholder="Brief summary of the issue"
                        value={formData.subject}
                        onChange={handleChange}
                        required
                        minLength={5}
                        maxLength={256}
                    />
                </div>

                <div>
                    <label htmlFor="category" className="block text-sm font-bold mb-1">
                        Category
                    </label>
                    <select
                        id="category"
                        name="category"
                        className="form-select w-full"
                        value={formData.category}
                        onChange={handleChange}
                        required
                    >
                        <option value="account">Account Issue</option>
                        <option value="billing">Billing & Payments</option>
                        <option value="technical">Technical Support</option>
                        <option value="feature_request">Feature Request</option>
                    </select>
                </div>

                <div>
                    <label htmlFor="priority" className="block text-sm font-bold mb-1">
                        Priority
                    </label>
                    <select
                        id="priority"
                        name="priority"
                        className="form-select w-full"
                        value={formData.priority}
                        onChange={handleChange}
                        required
                    >
                        <option value="low">Low</option>
                        <option value="normal">Normal</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                    </select>
                </div>

                <div>
                    <label htmlFor="description" className="block text-sm font-bold mb-1">
                        Description
                    </label>
                    <textarea
                        id="description"
                        name="description"
                        className="form-textarea w-full h-32"
                        placeholder="Detailed description of your request..."
                        value={formData.description}
                        onChange={handleChange}
                        required
                        minLength={10}
                    />
                </div>

                <div className="flex justify-end gap-2 mt-6">
                    <Button variant="outline" onClick={onClose} type="button" disabled={loading}>
                        Cancel
                    </Button>
                    <Button variant="primary" type="submit" disabled={loading}>
                        {loading ? 'Submitting...' : 'Submit Ticket'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};
