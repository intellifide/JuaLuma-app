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
        <div className="modal open">
            <div className="modal-content max-w-2xl w-full mx-4">
                <div className="modal-header border-b border-border-color pb-4 mb-4">
                    <h3 className="text-2xl font-bold text-royal-purple dark:text-purple-300">External Connection Warning</h3>
                    <button onClick={onClose} className="text-text-secondary hover:text-royal-purple text-2xl leading-none">
                        &times;
                    </button>
                </div>

                <div className="modal-body py-2">
                    <div className="flex flex-col items-center text-center mb-6">
                         <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4 text-blue-600">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <p className="text-lg mb-2">
                            You are about to securely connect to your financial institution via <strong className="text-royal-purple">{providerName}</strong>.
                        </p>
                        <p className="text-text-secondary max-w-md">
                            jualuma does not see, store, or have access to your external login credentials. You are interacting directly with {providerName}.
                        </p>
                    </div>
                </div>

                <div className="modal-footer flex justify-end gap-3 mt-4 border-t border-border-color pt-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-2 rounded-lg border border-border-color text-text-primary hover:bg-bg-secondary transition-colors font-medium"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        className="px-6 py-2 rounded-lg bg-royal-purple text-white hover:bg-deep-indigo transition-colors font-semibold shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                    >
                        Continue to Secure Login
                    </button>
                </div>
            </div>
        </div>
    );
};
