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

import React, { useState, useRef, useEffect } from 'react';

interface ChatInputProps {
    onSendMessage: (message: string) => void;
    onCancel?: () => void;
    onUploadFile?: (file: File) => void;
    isLoading: boolean;
    disabled?: boolean;
    placeholder?: string;
    quotaExceeded?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
    onSendMessage,
    onCancel,
    onUploadFile,
    isLoading,
    disabled = false,
    placeholder = "Ask me anything about your finances...",
    quotaExceeded = false
}) => {
    const [value, setValue] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
        }
    }, [value]);

    const handleSubmit = () => {
        if (!value.trim() || isLoading || disabled || quotaExceeded) return;
        onSendMessage(value);
        setValue('');
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setValue(e.target.value);
    };

    const isInputDisabled = disabled || isLoading || quotaExceeded;
    const canUpload = Boolean(onUploadFile) && !isInputDisabled;

    return (
        <div className="flex flex-col gap-2 p-2 bg-transparent">
            <div className="relative w-full rounded-2xl border backdrop-blur-sm shadow-[0_8px_30px_rgba(0,0,0,0.08)] transition-colors focus-within:border-royal-purple/60" style={{ borderColor: 'var(--border-subtle)', background: 'var(--surface-hover)' }}>
                <textarea
                    ref={textareaRef}
                    value={value}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    placeholder={quotaExceeded ? "Daily query limit reached." : placeholder}
                    className="w-full min-h-[56px] max-h-[200px] resize-none py-4 pr-28 pl-5 rounded-2xl bg-transparent text-text-primary placeholder:text-text-muted/80 focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed font-sans text-base leading-6"
                    disabled={isInputDisabled}
                    rows={1}
                    aria-label="Chat input"
                />
                <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file && onUploadFile) onUploadFile(file)
                        if (fileInputRef.current) fileInputRef.current.value = ''
                    }}
                />
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={!canUpload}
                    className="absolute right-[3.1rem] top-1/2 -translate-y-1/2 p-0 rounded-xl text-text-secondary hover:text-text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center h-9 w-9 border"
                    style={{ borderColor: 'var(--border-subtle)' }}
                    aria-label="Upload file"
                    title="Upload file"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21.44 11.05l-8.49 8.49a5.5 5.5 0 0 1-7.78-7.78l9.2-9.19a3.5 3.5 0 0 1 4.95 4.95l-9.19 9.2a1.5 1.5 0 0 1-2.12-2.13l8.48-8.48" />
                    </svg>
                </button>
                <button
                    disabled={isLoading ? false : (!value.trim() || isInputDisabled)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-0 rounded-xl bg-royal-purple hover:bg-royal-purple-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center h-9 w-9"
                    style={{ color: 'var(--text-primary)' }}
                    aria-label={isLoading ? "Stop response" : "Send message"}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    {...(isLoading ? { onClick: onCancel } : { onClick: handleSubmit })}
                >
                    {isLoading ? (
                        <div className="w-4 h-4 rounded-sm" style={{ background: 'currentColor' }} />
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="22" y1="2" x2="11" y2="13"></line>
                            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                        </svg>
                    )}
                </button>
            </div>
        </div>
    );
};
