import React, { useState } from 'react';

interface ChatMessageProps {
    role: 'user' | 'assistant';
    text: string;
    time: string;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ role, text, time }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className={`chat-message chat-message-${role} group relative`}>
            <div className="chat-message-content whitespace-pre-wrap">
                <p>{text}</p>
            </div>
            <div className="flex items-center justify-between mt-1 min-h-[1.25rem]">
                <div className="chat-message-time">{time}</div>
                {role === 'assistant' && (
                    <button
                        onClick={handleCopy}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-text-muted hover:text-color-primary ml-2 bg-transparent border-none cursor-pointer"
                        title="Copy response"
                        aria-label="Copy response to clipboard"
                    >
                        {copied ? 'Copied!' : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                        )}
                    </button>
                )}
            </div>
        </div>
    );
};
