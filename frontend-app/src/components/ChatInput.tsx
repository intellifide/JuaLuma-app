/*
 * Copyright (c) 2026 Intellifide, LLC.
 * Licensed under PolyForm Noncommercial License 1.0.0.
 * See "/legal/license" for full license terms.
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
import { MAX_UPLOAD_SIZE_BYTES } from '../services/documentService';
import { FILE_ICON_LABELS, resolveFileIconKind } from '../utils/fileIconMapping';

const SUPPORTED_UPLOAD_EXTENSIONS = new Set([
    // Docs
    'pdf', 'doc', 'docx', 'txt', 'rtf', 'md',
    // Sheets
    'csv', 'xls', 'xlsx',
    // Slides
    'ppt', 'pptx',
    // Images
    'png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'heic', 'svg',
    // Structured text
    'json', 'xml',
]);

const FILE_INPUT_ACCEPT = [
    '.pdf,.doc,.docx,.txt,.rtf,.md',
    '.csv,.xls,.xlsx',
    '.ppt,.pptx',
    '.png,.jpg,.jpeg,.webp,.gif,.bmp,.heic,.svg',
    '.json,.xml',
].join(',');

interface ChatInputProps {
    onSendMessage: (message: string) => void;
    onCancel?: () => void;
    onUploadFile?: (file: File) => void;
    attachments?: ComposerAttachment[];
    onRemoveAttachment?: (attachmentId: string) => void;
    isLoading: boolean;
    disabled?: boolean;
    placeholder?: string;
    quotaExceeded?: boolean;
    autoFocus?: boolean;
}

export interface ComposerAttachment {
    id: string;
    name: string;
    fileType: string;
}

const shortenFileName = (name: string): string => {
    if (name.length <= 10) return name
    return `${name.slice(0, 10)}...`
}

export const ChatInput: React.FC<ChatInputProps> = ({
    onSendMessage,
    onCancel,
    onUploadFile,
    attachments = [],
    onRemoveAttachment,
    isLoading,
    disabled = false,
    placeholder = "Ask me anything about your finances...",
    quotaExceeded = false,
    autoFocus = false,
}) => {
    const [value, setValue] = useState('');
    const [fileError, setFileError] = useState<string | null>(null);
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
            if (autoFocus) {
                textareaRef.current.focus();
            }
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

    useEffect(() => {
        if (!autoFocus || isInputDisabled || !textareaRef.current) return;
        const raf = window.requestAnimationFrame(() => {
            const input = textareaRef.current;
            if (!input) return;
            input.focus();
            const caret = input.value.length;
            input.setSelectionRange(caret, caret);
        });
        return () => window.cancelAnimationFrame(raf);
    }, [autoFocus, isInputDisabled]);

    return (
        <div className="flex flex-col gap-2 p-2 bg-transparent">
            <div
                className="w-full rounded-[1.35rem] p-[1px]"
                style={{
                    background:
                        'linear-gradient(130deg, rgba(90,132,196,0.48) 0%, rgba(92,220,255,0.34) 52%, rgba(152,166,186,0.34) 100%)',
                    boxShadow: '0 10px 32px rgba(3, 8, 22, 0.28)',
                }}
            >
                <div
                    className="relative w-full rounded-[1.3rem] border backdrop-blur-sm shadow-[0_8px_24px_rgba(0,0,0,0.08)]"
                    style={{ borderColor: 'rgba(169, 196, 225, 0.35)', background: 'var(--surface-hover)' }}
                >
                {attachments.length > 0 && (
                    <>
                        <div className="flex flex-wrap items-center gap-2 px-4 pr-24 pt-3 pb-2">
                            {attachments.map((attachment) => (
                                <div
                                    key={attachment.id}
                                    className="inline-flex items-center gap-2 rounded-full border px-2 py-1 text-xs"
                                    style={{ borderColor: 'var(--border-subtle)', background: 'var(--surface)' }}
                                >
                                    <span className="inline-flex h-5 min-w-[2.2rem] items-center justify-center rounded-md bg-black/10 px-1 text-[10px] font-semibold tracking-wide text-text-primary">
                                        {FILE_ICON_LABELS[resolveFileIconKind(attachment.fileType)]}
                                    </span>
                                    <span className="max-w-[8rem] truncate text-text-primary">
                                        {shortenFileName(attachment.name)}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => onRemoveAttachment?.(attachment.id)}
                                        className="rounded p-0.5 text-text-secondary hover:text-text-primary transition-colors"
                                        aria-label={`Remove ${attachment.name}`}
                                        title={`Remove ${attachment.name}`}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M18 6L6 18M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                        <div
                            className="mx-4 mr-24 border-t"
                            style={{ borderColor: 'var(--border-subtle)' }}
                            data-testid="attachment-separator"
                        />
                    </>
                )}
                <textarea
                    ref={textareaRef}
                    value={value}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    placeholder={quotaExceeded ? "Daily query limit reached." : placeholder}
                    className="chat-composer-textarea w-full min-h-[56px] max-h-[200px] resize-none py-4 pr-28 pl-5 rounded-2xl bg-transparent text-text-primary placeholder:text-text-muted/80 focus:outline-none focus-visible:outline-none disabled:opacity-50 disabled:cursor-not-allowed font-sans text-base leading-6"
                    disabled={isInputDisabled}
                    rows={1}
                    aria-label="Chat input"
                />
                <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept={FILE_INPUT_ACCEPT}
                    onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file && onUploadFile) {
                            const extension = file.name.includes('.')
                                ? file.name.split('.').pop()?.toLowerCase() ?? ''
                                : ''
                            if (!SUPPORTED_UPLOAD_EXTENSIONS.has(extension)) {
                                setFileError('Unsupported file type. Please choose a supported file format.')
                            } else if (file.size > MAX_UPLOAD_SIZE_BYTES) {
                                setFileError(
                                    `File is too large. Maximum supported size is ${Math.floor(
                                        MAX_UPLOAD_SIZE_BYTES / (1024 * 1024),
                                    )} MB.`,
                                )
                            } else {
                                setFileError(null)
                                onUploadFile(file)
                            }
                        }
                        if (fileInputRef.current) fileInputRef.current.value = ''
                    }}
                />
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={!canUpload}
                    className="absolute right-[3.1rem] bottom-3 p-0 rounded-xl text-text-secondary hover:text-text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center h-9 w-9 border"
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
                    className="absolute right-3 bottom-3 p-0 rounded-xl border disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center h-9 w-9"
                    style={{
                        borderColor: 'var(--border-subtle)',
                        background: 'var(--send-button-bg)',
                        color: 'var(--send-icon-color)',
                    }}
                    aria-label={isLoading ? "Stop response" : "Send message"}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    {...(isLoading ? { onClick: onCancel } : { onClick: handleSubmit })}
                >
                    {isLoading ? (
                        <div className="w-4 h-4 rounded-sm" style={{ background: 'currentColor' }} />
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="22" y1="2" x2="11" y2="13"></line>
                            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                        </svg>
                    )}
                </button>
                </div>
            </div>
            {fileError && (
                <p className="text-xs text-red-400 px-1">{fileError}</p>
            )}
        </div>
    );
};
