// Last Modified: 2026-01-23 22:15 CST
import React, { useState } from 'react';
import { Document } from '../services/documentService';
import { HistoryItem } from '../services/aiService';

interface Thread {
    id: string;
    title: string;
    timestamp: string;
    preview: string;
}

interface AISidebarProps {
    documents: Document[];
    threads: Thread[];
    currentThreadId: string | null;
    onNewChat: () => void;
    onSelectThread: (threadId: string) => void;
    onDeleteThread: (threadId: string) => void;
    onUploadDoc: (file: File) => void;
    onDownloadDoc: (doc: Document) => void;
}

export const AISidebar: React.FC<AISidebarProps> = ({
    documents,
    threads,
    currentThreadId,
    onNewChat,
    onSelectThread,
    onDeleteThread,
    onUploadDoc,
    onDownloadDoc,
}) => {
    const [expandedSection, setExpandedSection] = useState<'documents' | 'history' | null>('history');
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const toggleSection = (section: 'documents' | 'history') => {
        setExpandedSection(expandedSection === section ? null : section);
    };

    const getFileIcon = (fileType: string) => {
        const type = fileType.toLowerCase();
        if (['pdf'].includes(type)) return '📄';
        if (['csv', 'xls', 'xlsx'].includes(type)) return '📊';
        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(type)) return '🖼️';
        return '📎';
    };

    return (
        <div className="h-full flex flex-col bg-bg-secondary/30 border-r border-white/10">
            {/* Header */}
            <div className="p-4 border-b border-white/10">
                <button
                    onClick={onNewChat}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-primary hover:bg-primary/90 text-white transition-colors"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <span className="font-medium">New chat</span>
                </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto">
                {/* Documents Section */}
                <div className="border-b border-white/10">
                    <button
                        onClick={() => toggleSection('documents')}
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            <svg className="w-5 h-5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span className="text-sm font-medium">Documents</span>
                            <span className="text-xs text-text-secondary bg-white/10 px-1.5 py-0.5 rounded-full">
                                {documents.length}
                            </span>
                        </div>
                        <svg 
                            className={`w-4 h-4 text-text-secondary transition-transform ${expandedSection === 'documents' ? 'rotate-180' : ''}`} 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                    
                    {expandedSection === 'documents' && (
                        <div className="px-2 pb-3">
                            {documents.length === 0 ? (
                                <div className="px-4 py-6 text-center">
                                    <p className="text-xs text-text-secondary mb-2">No documents yet</p>
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="text-xs text-primary hover:underline"
                                    >
                                        Upload document
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div className="space-y-1 max-h-64 overflow-y-auto">
                                        {documents.slice(0, 10).map((doc) => (
                                            <button
                                                key={doc.id}
                                                onClick={() => onDownloadDoc(doc)}
                                                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-left group"
                                            >
                                                <span className="text-lg">{getFileIcon(doc.fileType)}</span>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm text-text-primary truncate group-hover:text-primary transition-colors">
                                                        {doc.name}
                                                    </p>
                                                    <p className="text-xs text-text-secondary">
                                                        {doc.size}
                                                    </p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-full mt-2 px-3 py-2 text-xs text-text-secondary hover:text-primary hover:bg-white/5 rounded-lg transition-colors"
                                    >
                                        + Upload document
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Chat History Section */}
                <div>
                    <button
                        onClick={() => toggleSection('history')}
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            <svg className="w-5 h-5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-sm font-medium">Recent</span>
                        </div>
                        <svg 
                            className={`w-4 h-4 text-text-secondary transition-transform ${expandedSection === 'history' ? 'rotate-180' : ''}`} 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                    
                    {expandedSection === 'history' && (
                        <div className="px-2 pb-3">
                            {threads.length === 0 ? (
                                <div className="px-4 py-6 text-center">
                                    <p className="text-xs text-text-secondary">No conversations yet</p>
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    {threads.map((thread) => (
                                        <div
                                            key={thread.id}
                                            className={`group relative rounded-lg transition-colors ${
                                                currentThreadId === thread.id 
                                                    ? 'bg-white/10' 
                                                    : 'hover:bg-white/5'
                                            }`}
                                        >
                                            <button
                                                onClick={() => onSelectThread(thread.id)}
                                                className="w-full flex items-start gap-2 px-3 py-2 text-left"
                                            >
                                                <svg className="w-4 h-4 mt-0.5 text-text-secondary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                                </svg>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm text-text-primary truncate">
                                                        {thread.title}
                                                    </p>
                                                    <p className="text-xs text-text-secondary truncate">
                                                        {thread.preview}
                                                    </p>
                                                </div>
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onDeleteThread(thread.id);
                                                }}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-text-secondary hover:text-red-400 transition-all"
                                                title="Delete conversation"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Hidden file input */}
            <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                        onUploadDoc(e.target.files[0]);
                    }
                }} 
            />
        </div>
    );
};
