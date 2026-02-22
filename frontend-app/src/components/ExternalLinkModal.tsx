/*
 * Copyright (c) 2026 Intellifide, LLC.
 * Licensed under PolyForm Noncommercial License 1.0.0.
 * See "PolyForm-Noncommercial-1.0.0.txt" for full text.
 *
 * COMMUNITY RIGHTS:
 * - You CAN modify this code for personal use.
 * - You CAN build and share widgets/plugins for the ecosystem.
 *
 * RESTRICTIONS:
 * - You CANNOT resell, repackage, or distribute this application for a fee.
 * - You CANNOT use this application for commercial enterprise purposes.
 */

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
                <div className="modal-header">
                    <h3>External Connection Warning</h3>
                    <button onClick={onClose} className="modal-close" aria-label="Close modal">
                        &times;
                    </button>
                </div>

                <div className="modal-body py-2">
                    <div className="flex flex-col items-center text-center mb-6">
                         <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mb-4 text-royal-purple dark:text-purple-400">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <p className="text-lg mb-2 text-text-primary">
                            You are about to securely connect to your financial institution via <strong className="text-royal-purple dark:text-purple-400">{providerName}</strong>.
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
                        className="btn btn-secondary"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        className="btn"
                    >
                        Continue to Secure Login
                    </button>
                </div>
            </div>
        </div>
    );
};
