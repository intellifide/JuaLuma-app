import React, { useState, useRef, useEffect } from 'react';

interface ChatInputProps {
    onSendMessage: (message: string) => void;
    isLoading: boolean;
    disabled?: boolean;
    placeholder?: string;
    quotaExceeded?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
    onSendMessage,
    isLoading,
    disabled = false,
    placeholder = "Ask me anything about your finances...",
    quotaExceeded = false
}) => {
    const [value, setValue] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);
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

    return (
        <div className="flex flex-col gap-2 p-4 bg-transparent">
            <div className="relative w-full">
                <textarea
                    ref={textareaRef}
                    value={value}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    placeholder={quotaExceeded ? "Daily query limit reached." : placeholder}
                    className="w-full min-h-[44px] max-h-[200px] resize-none py-3 pr-12 pl-4 rounded-lg bg-transparent text-text-primary border border-border focus:outline-none focus:border-royal-purple transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-sans text-base"
                    disabled={isInputDisabled}
                    rows={1}
                    aria-label="Chat input"
                />
                <button
                    onClick={handleSubmit}
                    disabled={!value.trim() || isInputDisabled}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-white bg-royal-purple hover:bg-royal-purple-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center h-8 w-8"
                    aria-label="Send message"
                >
                    {isLoading ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
