// Last Modified: 2026-01-23 22:15 CST
import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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
            <div className="chat-message-content">
                {role === 'assistant' ? (
                    <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                            code: ({node, inline, className, children, ...props}) => {
                                return inline ? (
                                    <code className="bg-black/20 px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
                                        {children}
                                    </code>
                                ) : (
                                    <pre className="bg-black/30 p-3 rounded-lg overflow-x-auto my-2">
                                        <code className={className} {...props}>
                                            {children}
                                        </code>
                                    </pre>
                                );
                            },
                            p: ({children}) => <p className="mb-2 last:mb-0">{children}</p>,
                            ul: ({children}) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                            ol: ({children}) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                            li: ({children}) => <li className="ml-2">{children}</li>,
                            a: ({children, href}) => <a href={href} className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">{children}</a>,
                            strong: ({children}) => <strong className="font-semibold">{children}</strong>,
                            em: ({children}) => <em className="italic">{children}</em>,
                            h1: ({children}) => <h1 className="text-2xl font-bold mb-2">{children}</h1>,
                            h2: ({children}) => <h2 className="text-xl font-bold mb-2">{children}</h2>,
                            h3: ({children}) => <h3 className="text-lg font-bold mb-2">{children}</h3>,
                        }}
                    >
                        {text}
                    </ReactMarkdown>
                ) : (
                    <p className="whitespace-pre-wrap">{text}</p>
                )}
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
