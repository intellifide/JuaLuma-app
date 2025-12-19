import React from 'react';

interface ExternalLinkModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    providerName: string;
}

export const ExternalLinkModal: React.FC<ExternalLinkModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    providerName,
}) => {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content max-w-md">
                <div className="modal-header">
                    <h3 className="text-xl font-bold">External Connection Warning</h3>
                    <button onClick={onClose} className="text-text-secondary hover:text-text-primary">
                        &times;
                    </button>
                </div>

                <div className="modal-body py-4">
                    <p className="mb-4">
                        You are securely connecting to your financial institution via <strong>{providerName}</strong>.
                    </p>
                    <p className="text-sm text-text-secondary mb-4">
                        jualuma does not see, store, or have access to your external login credentials. You are interacting directly with {providerName}.
                    </p>
                </div>

                <div className="modal-footer flex justify-end gap-3 mt-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg border border-border-color text-text-primary hover:bg-bg-secondary transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        className="px-4 py-2 rounded-lg bg-royal-purple text-white hover:bg-deep-indigo transition-colors"
                    >
                        Continue to Secure Login
                    </button>
                </div>
            </div>
        </div>
    );
};
