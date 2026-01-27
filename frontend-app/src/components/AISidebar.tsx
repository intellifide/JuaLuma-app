// Last Modified: 2026-01-23 22:15 CST
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Document } from '../services/documentService';

interface Thread {
    id: string;
    title: string;
    timestamp: string;
    preview: string;
    projectId?: string | null;
}

interface Project {
    id: string;
    name: string;
    createdAt: string;
}

interface AISidebarProps {
    documents: Document[];
    projects: Project[];
    threads: Thread[];
    currentThreadId: string | null;
    onSelectThread: (threadId: string) => void;
    onDeleteThread: (threadId: string) => void;
    onCreateProject: (name: string) => void;
    onDeleteProject: (projectId: string) => void;
    onAssignThreadToProject: (threadId: string, projectId: string | null) => void;
    onUploadDoc: (file: File) => void;
    onDownloadDoc: (doc: Document) => void;
}

export const AISidebar: React.FC<AISidebarProps> = ({
    documents,
    projects,
    threads,
    currentThreadId,
    onSelectThread,
    onDeleteThread,
    onCreateProject,
    onDeleteProject,
    onAssignThreadToProject,
    onUploadDoc,
    onDownloadDoc,
}) => {
    const [expandedSection, setExpandedSection] = useState<'documents' | 'history' | 'projects' | null>('documents');
    const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
    const [expandedProjectChats, setExpandedProjectChats] = useState<Set<string>>(new Set());
    const [openThreadMenu, setOpenThreadMenu] = useState<{ id: string; x: number; y: number } | null>(null);
    const [openProjectMenu, setOpenProjectMenu] = useState<{ id: string; x: number; y: number } | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const toggleSection = (section: 'documents' | 'history' | 'projects') => {
        setExpandedSection(expandedSection === section ? null : section);
    };

    const toggleProject = (projectId: string) => {
        setExpandedProjects(prev => {
            const next = new Set(prev);
            const willOpen = !next.has(projectId);
            if (willOpen) {
                next.add(projectId);
                setExpandedProjectChats(prevChats => {
                    const chatNext = new Set(prevChats);
                    chatNext.add(projectId);
                    return chatNext;
                });
            } else {
                next.delete(projectId);
                setExpandedProjectChats(prevChats => {
                    const chatNext = new Set(prevChats);
                    chatNext.delete(projectId);
                    return chatNext;
                });
            }
            return next;
        });
    };

    const toggleProjectChats = (projectId: string) => {
        setExpandedProjectChats(prev => {
            const next = new Set(prev);
            if (next.has(projectId)) {
                next.delete(projectId);
            } else {
                next.add(projectId);
            }
            return next;
        });
    };

    const handleCreateProject = () => {
        const name = window.prompt('New project name');
        if (!name || !name.trim()) return;
        onCreateProject(name.trim());
    };

    const getMenuPosition = (anchor: HTMLElement, menuWidth: number) => {
        const rect = anchor.getBoundingClientRect();
        const padding = 8;
        const left = Math.min(
            Math.max(padding, rect.right - menuWidth),
            window.innerWidth - menuWidth - padding,
        );
        const top = Math.min(rect.bottom + 8, window.innerHeight - padding);
        return { x: left, y: top };
    };

    const getFileIcon = (fileType: string) => {
        const type = fileType.toLowerCase();
        if (['pdf'].includes(type)) return '📄';
        if (['csv', 'xls', 'xlsx'].includes(type)) return '📊';
        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(type)) return '🖼️';
        return '📎';
    };

    const renderThreadItem = (thread: Thread, options?: { showPreview?: boolean; nested?: boolean }) => {
        const showPreview = options?.showPreview ?? true;
        const nested = options?.nested ?? false;
        return (
        <div
            key={thread.id}
            className={`group relative rounded-xl transition-colors ${
                currentThreadId === thread.id
                    ? 'bg-white/10'
                    : 'hover:bg-white/5'
            } ${nested ? 'ml-4' : ''}`}
        >
            <button
                onClick={() => onSelectThread(thread.id)}
                className={`w-full flex items-start gap-2 px-3 py-2 text-left ${nested ? 'py-1.5' : ''}`}
            >
                <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary truncate">
                        {thread.title}
                    </p>
                    {showPreview && (
                        <p className="text-xs text-text-secondary truncate">
                            {thread.preview}
                        </p>
                    )}
                </div>
            </button>
            <div
                className={`absolute right-2 top-1/2 -translate-y-1/2 transition-opacity ${openThreadMenu?.id === thread.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
            >
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        if (openThreadMenu?.id === thread.id) {
                            setOpenThreadMenu(null);
                            return;
                        }
                        const pos = getMenuPosition(e.currentTarget, 192);
                        setOpenThreadMenu({ id: thread.id, ...pos });
                        setOpenProjectMenu(null);
                    }}
                    className="p-1.5 rounded-md hover:bg-white/10 text-text-secondary hover:text-text-primary transition-all"
                    title="More actions"
                    aria-haspopup="menu"
                    aria-expanded={openThreadMenu?.id === thread.id}
                >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <circle cx="5" cy="12" r="2" />
                        <circle cx="12" cy="12" r="2" />
                        <circle cx="19" cy="12" r="2" />
                    </svg>
                </button>
            </div>
        </div>
        );
    };

    const activeThread = openThreadMenu ? threads.find((thread) => thread.id === openThreadMenu.id) : null;
    const threadMenuProjects = activeThread
        ? projects.filter((project) => project.id !== activeThread.projectId)
        : [];
    const activeProject = openProjectMenu ? projects.find((project) => project.id === openProjectMenu.id) : null;

    return (
        <div className="h-full flex flex-col bg-bg-secondary/80 border-r border-white/5">
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-3 py-4">
                {/* Documents Section */}
                <div className="mb-4">
                    <button
                        onClick={() => toggleSection('documents')}
                        className="w-full flex items-center justify-between px-2 py-2 text-left text-text-muted hover:text-text-primary transition-colors"
                    >
                        <span className="text-xs uppercase tracking-widest">Files</span>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-text-secondary bg-white/5 px-1.5 py-0.5 rounded-full">
                                {documents.length}
                            </span>
                            <svg 
                                className={`w-3.5 h-3.5 text-text-secondary transition-transform ${expandedSection === 'documents' ? 'rotate-180' : ''}`} 
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </button>
                    
                    {expandedSection === 'documents' && (
                        <div className="px-1 pb-3">
                            {documents.length === 0 ? (
                                <div className="px-4 py-6 text-center">
                                    <p className="text-xs text-text-secondary mb-2">No files yet</p>
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="text-xs text-primary hover:underline"
                                    >
                                        Upload file
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div className="space-y-1 max-h-64 overflow-y-auto">
                                        {documents.slice(0, 10).map((doc) => (
                                            <button
                                                key={doc.id}
                                                onClick={() => onDownloadDoc(doc)}
                                                className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-white/5 transition-colors text-left group"
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
                                        className="w-full mt-2 px-2 py-2 text-xs text-text-secondary hover:text-primary hover:bg-white/5 rounded-lg transition-colors"
                                    >
                                        + Upload file
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Projects Section */}
                <div className="mb-6">
                    <button
                        onClick={() => toggleSection('projects')}
                        className="w-full flex items-center justify-between px-2 py-2 text-left text-text-muted hover:text-text-primary transition-colors"
                    >
                        <span className="text-xs uppercase tracking-widest">Projects</span>
                        <svg
                            className={`w-3.5 h-3.5 text-text-secondary transition-transform ${expandedSection === 'projects' ? 'rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>

                    {expandedSection === 'projects' && (
                        <div className="px-1 pb-3 space-y-2">
                            <button
                                className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm text-text-primary hover:bg-white/5 transition-colors"
                                onClick={handleCreateProject}
                            >
                                <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v14m7-7H5" />
                                </svg>
                                <span>New project</span>
                            </button>

                            {projects.length === 0 ? (
                                <div className="px-4 py-4 text-center text-xs text-text-secondary">
                                    No projects yet. Group chats by goal or topic.
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    {projects.map((project) => {
                                        const projectThreads = threads.filter((thread) => thread.projectId === project.id);
                                        const expanded = expandedProjects.has(project.id);
                                        const chatsExpanded = expandedProjectChats.has(project.id);
                                        return (
                                            <div key={project.id} className="rounded-xl">
                                                <div className={`flex items-center justify-between px-2 py-2 rounded-xl ${expanded ? 'bg-white/5' : 'hover:bg-white/5'}`}>
                                                    <button
                                                        className="flex items-center gap-2 text-left w-full"
                                                        onClick={() => toggleProject(project.id)}
                                                    >
                                                        <div>
                                                            <p className="text-sm text-text-primary">{project.name}</p>
                                                        </div>
                                                    </button>
                                                    <div className="relative">
                                                        <button
                                                            className="p-1.5 rounded-md hover:bg-white/10 text-text-secondary hover:text-text-primary transition-all"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (openProjectMenu?.id === project.id) {
                                                                    setOpenProjectMenu(null);
                                                                    return;
                                                                }
                                                                const pos = getMenuPosition(e.currentTarget, 176);
                                                                setOpenProjectMenu({ id: project.id, ...pos });
                                                                setOpenThreadMenu(null);
                                                            }}
                                                            title="Project actions"
                                                            aria-haspopup="menu"
                                                            aria-expanded={openProjectMenu?.id === project.id}
                                                        >
                                                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                                                <circle cx="5" cy="12" r="2" />
                                                                <circle cx="12" cy="12" r="2" />
                                                                <circle cx="19" cy="12" r="2" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </div>
                                                {expanded && (
                                                    <div className="px-3 pb-3 space-y-2">
                                                        <button
                                                            className="flex items-center justify-between w-full text-left text-[11px] text-text-secondary hover:text-text-primary"
                                                            onClick={() => toggleProjectChats(project.id)}
                                                        >
                                                            <span className="uppercase tracking-wider">Chats</span>
                                                            <svg
                                                                className={`w-3.5 h-3.5 transition-transform ${chatsExpanded ? 'rotate-180' : ''}`}
                                                                fill="none"
                                                                stroke="currentColor"
                                                                viewBox="0 0 24 24"
                                                            >
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                            </svg>
                                                        </button>
                                                        {chatsExpanded && (
                                                            <div className="pl-3 border-l border-white/5 space-y-1">
                                                                {projectThreads.length === 0 ? (
                                                                    <p className="text-[11px] text-text-secondary">No chats yet.</p>
                                                                ) : (
                                                                    projectThreads.map((thread) => renderThreadItem(thread, { showPreview: false, nested: true }))
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Chat History Section */}
                <div>
                    <button
                        onClick={() => toggleSection('history')}
                        className="w-full flex items-center justify-between px-2 py-2 text-left text-text-muted hover:text-text-primary transition-colors"
                    >
                        <span className="text-xs uppercase tracking-widest">Your chats</span>
                        <svg 
                            className={`w-3.5 h-3.5 text-text-secondary transition-transform ${expandedSection === 'history' ? 'rotate-180' : ''}`} 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                    
                    {expandedSection === 'history' && (
                        <div className="px-1 pb-3">
                            {threads.filter((thread) => !thread.projectId).length === 0 ? (
                                <div className="px-4 py-6 text-center">
                                    <p className="text-xs text-text-secondary">No chats yet</p>
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    {threads.filter((thread) => !thread.projectId).map((thread) => renderThreadItem(thread, { showPreview: false }))}
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
            {openThreadMenu && activeThread && createPortal(
                <div className="fixed inset-0 z-[1000]">
                    <button
                        type="button"
                        className="absolute inset-0 cursor-default"
                        onClick={() => setOpenThreadMenu(null)}
                        aria-label="Close chat menu"
                    />
                    <div
                        className="absolute w-48 rounded-lg border border-white/10 p-2 shadow-xl space-y-1"
                        style={{ left: openThreadMenu.x, top: openThreadMenu.y, backgroundColor: 'var(--bg-secondary)' }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            className="w-full text-left px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-white/5 rounded-md"
                            onClick={() => {
                                onDeleteThread(activeThread.id);
                                setOpenThreadMenu(null);
                            }}
                        >
                            Delete chat
                        </button>
                        <div className="px-3 pt-2 text-[10px] uppercase tracking-wider text-text-muted">
                            Move to
                        </div>
                        {activeThread.projectId && (
                            <button
                                className="w-full text-left px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-white/5 rounded-md"
                                onClick={() => {
                                    onAssignThreadToProject(activeThread.id, null);
                                    setOpenThreadMenu(null);
                                }}
                            >
                                Chats
                            </button>
                        )}
                        {threadMenuProjects.length === 0 ? (
                            <div className="px-3 py-2 text-[11px] text-text-muted">
                                No other projects
                            </div>
                        ) : (
                            threadMenuProjects.map((project) => (
                                <button
                                    key={project.id}
                                    className="w-full text-left px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-white/5 rounded-md"
                                    onClick={() => {
                                        onAssignThreadToProject(activeThread.id, project.id);
                                        setOpenThreadMenu(null);
                                    }}
                                >
                                    {project.name}
                                </button>
                            ))
                        )}
                    </div>
                </div>,
                document.body
            )}
            {openProjectMenu && activeProject && createPortal(
                <div className="fixed inset-0 z-[1000]">
                    <button
                        type="button"
                        className="absolute inset-0 cursor-default"
                        onClick={() => setOpenProjectMenu(null)}
                        aria-label="Close project menu"
                    />
                    <div
                        className="absolute w-44 rounded-lg border border-white/10 p-2 shadow-xl space-y-1"
                        style={{ left: openProjectMenu.x, top: openProjectMenu.y, backgroundColor: 'var(--bg-secondary)' }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            className="w-full text-left px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-white/5 rounded-md"
                            onClick={() => {
                                onDeleteProject(activeProject.id);
                                setOpenProjectMenu(null);
                            }}
                        >
                            Delete project
                        </button>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};
