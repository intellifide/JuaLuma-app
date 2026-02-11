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

// Last Modified: 2026-02-04 12:00 CST
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CopyIconButton } from './ui/CopyIconButton';

interface ChatMessageProps {
    role: 'user' | 'assistant';
    text: string;
    time: string;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ role, text, time }) => {
    return (
        <div className={`chat-message chat-message-${role} group relative`}>
            <div className="chat-message-content">
                {role === 'assistant' ? (
                    <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                            pre: ({ children }) => (
                                <pre className="bg-black/30 p-3 rounded-lg overflow-x-auto my-2">
                                    {children}
                                </pre>
                            ),
                            code: ({ className, children, ...props}) => (
                                <code
                                    className={className ?? "bg-black/20 px-1.5 py-0.5 rounded text-sm font-mono"}
                                    {...props}
                                >
                                    {children}
                                </code>
                            ),
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
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <CopyIconButton
                        value={text}
                        label={role === 'assistant' ? 'Copy assistant message' : 'Copy your message'}
                        onCopiedMessage="Copied message"
                        className="h-6 w-6"
                    />
                </div>
            </div>
        </div>
    );
};
