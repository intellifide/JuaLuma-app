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

// Last Modified: 2026-01-24 04:25 CST
import React, { useState, useEffect, useRef } from 'react';
import useSWR from 'swr';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { useUserTimeZone } from '../hooks/useUserTimeZone';
import { formatTime } from '../utils/datetime';
import { ChatMessage } from '../components/ChatMessage';
import { ChatInput, ComposerAttachment } from '../components/ChatInput';
import { QuotaDisplay } from '../components/QuotaDisplay';
import { aiService, QuotaStatus } from '../services/aiService';
import { AIPrivacyModal } from '../components/AIPrivacyModal';
import { AISidebar } from '../components/AISidebar';
import { documentService, Document } from '../services/documentService';
import { digestService } from '../services/digestService';
import { legalService } from '../services/legal';
import { LEGAL_AGREEMENTS } from '../constants/legal';
import { AI_STORAGE_UPDATED_EVENT, generateThreadTitle, getAIStorageKeys, getStoredMessages, getStoredThreads } from '../utils/aiThreads';
import { usePageContext } from '../hooks/usePageContext';
import { useToast } from '../components/ui/Toast';

interface Message {
  role: 'user' | 'assistant';
  text: string;
  time: string;
  pending?: boolean;
  citations?: Array<{ title: string; url: string }>;
  webSearchUsed?: boolean;
  attachments?: ComposerAttachment[];
}

interface Thread {
  id: string;
  title: string;
  timestamp: string;
  preview: string;
  messages: Message[];
  projectId?: string | null;
}

interface Project {
  id: string;
  name: string;
  createdAt: string;
}


export default function AIAssistant() {
  const { user } = useAuth();
  const toast = useToast();
  const timeZone = useUserTimeZone();
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isWebSearching, setIsWebSearching] = useState(false);
  const [quota, setQuota] = useState<QuotaStatus | null>(null);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [digestThreads, setDigestThreads] = useState<Thread[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const pageContext = usePageContext();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const streamAbortRef = useRef<AbortController | null>(null);
  const [hasFetchedHistory, setHasFetchedHistory] = useState(false);
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [composerAttachments, setComposerAttachments] = useState<ComposerAttachment[]>([]);
  const { storageKey, threadStorageKey, threadsStorageKey } = getAIStorageKeys(user?.uid ?? null);
  const projectsStorageKey = user?.uid ? `jualuma_ai_projects_${user.uid}` : 'jualuma_ai_projects_anon';

  // Real documents state
  const [documents, setDocuments] = useState<Document[]>([]);
  const { data: fetchedDocs, mutate: mutateDocs } = useSWR<Document[]>('/documents/', () => documentService.getAll());

  useEffect(() => {
    if (fetchedDocs) {
      setDocuments(fetchedDocs);
    }
  }, [fetchedDocs]);

  useEffect(() => {
    const accepted = localStorage.getItem('jualuma_privacy_accepted');
    if (accepted === 'true') {
      setPrivacyAccepted(true);
    } else {
      setTimeout(() => setShowPrivacyModal(true), 500);
    }
  }, []);

  // Load threads and restore session when user is available
  useEffect(() => {
    if (!user?.uid) {
      // Clear state if no user
      setThreads([]);
      setDigestThreads([]);
      setProjects([]);
      setMessages([]);
      setCurrentThreadId(null);
      setHasFetchedHistory(false);
      return;
    }

    // Load threads from localStorage
    const savedThreads = localStorage.getItem(threadsStorageKey);
    if (savedThreads) {
      try {
        const parsedThreads = JSON.parse(savedThreads);
        setThreads(parsedThreads);
      } catch (e) {
        console.error("Failed to parse saved threads:", e);
      }
    }

    const savedProjects = localStorage.getItem(projectsStorageKey);
    if (savedProjects) {
      try {
        const parsedProjects = JSON.parse(savedProjects);
        setProjects(parsedProjects);
      } catch (e) {
        console.error("Failed to parse saved projects:", e);
      }
    }

    // Restore current thread if exists
    const savedThreadId = localStorage.getItem(threadStorageKey);
    if (savedThreadId) {
      const threadMessages = localStorage.getItem(`${storageKey}_${savedThreadId}`);
      if (threadMessages) {
        try {
          const parsedMessages = JSON.parse(threadMessages);
          setMessages(parsedMessages);
          setCurrentThreadId(savedThreadId);
        } catch (e) {
          console.error("Failed to restore thread messages:", e);
        }
      }
    }

    // Load server-side digest threads (do not persist to localStorage).
    digestService
      .listThreads()
      .then((items) => {
        const mapped: Thread[] = items.map((t) => ({
          id: `digest:${t.thread_id}`,
          title: t.title,
          timestamp: t.timestamp,
          preview: t.preview,
          messages: [],
          projectId: null,
        }))
        setDigestThreads(mapped)
      })
      .catch((err) => {
        console.error('Failed to load digest threads:', err)
        setDigestThreads([])
      })
  }, [user?.uid, threadsStorageKey, threadStorageKey, storageKey, projectsStorageKey]);

  useEffect(() => {
    if (!user?.uid) return;
    const handleStorageSync = (event: Event) => {
      const custom = event as CustomEvent<{ threadId?: string }>
      const updatedThreads = getStoredThreads(threadsStorageKey) as Thread[]
      setThreads(updatedThreads)

      const changedThreadId = custom.detail?.threadId
      if (!changedThreadId) return
      if (!currentThreadId || currentThreadId !== changedThreadId) return

      const syncedMessages = getStoredMessages(storageKey, changedThreadId) as Message[]
      if (syncedMessages.length > 0) {
        setMessages(syncedMessages)
      }
    }

    window.addEventListener(AI_STORAGE_UPDATED_EVENT, handleStorageSync as EventListener)
    return () => window.removeEventListener(AI_STORAGE_UPDATED_EVENT, handleStorageSync as EventListener)
  }, [user?.uid, threadsStorageKey, storageKey, currentThreadId]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user || !privacyAccepted || hasFetchedHistory) return;

      try {
        const quotaData = await aiService.getQuota();
        setQuota(quotaData);
        setHasFetchedHistory(true);
      } catch (err) {
        console.error("Error fetching AI data:", err);
      }
    };

    fetchData();
  }, [user, privacyAccepted, hasFetchedHistory]);

  const handleAcceptPrivacy = async () => {
    try {
      await legalService.acceptAgreements([
        {
          agreement_key: LEGAL_AGREEMENTS.aiPrivacyUserAgreement.key,
          agreement_version: LEGAL_AGREEMENTS.aiPrivacyUserAgreement.version,
          acceptance_method: 'scrollwrap',
        },
      ]);
    } catch (error) {
      console.error('Failed to record AI privacy agreement:', error);
    }
    localStorage.setItem('jualuma_privacy_accepted', 'true');
    setPrivacyAccepted(true);
    setShowPrivacyModal(false);
  };

  const handleClosePrivacyModal = () => {
    setShowPrivacyModal(false);
  }

  const handleNewChat = () => {
    // Generate a new thread ID for this conversation
    const newThreadId = Date.now().toString();
    setCurrentThreadId(newThreadId);
    localStorage.setItem(threadStorageKey, newThreadId);

    // Clear current messages and start fresh
    // Don't save the thread yet - only save when user sends first message
    setMessages([]);
  };

  const handleCreateProject = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const newProject: Project = {
      id: Date.now().toString(),
      name: trimmed,
      createdAt: new Date().toISOString(),
    };
    const updated = [newProject, ...projects];
    setProjects(updated);
    localStorage.setItem(projectsStorageKey, JSON.stringify(updated));
  };

  const handleDeleteProject = (projectId: string) => {
    const updatedProjects = projects.filter((project) => project.id !== projectId);
    setProjects(updatedProjects);
    localStorage.setItem(projectsStorageKey, JSON.stringify(updatedProjects));

    const updatedThreads = threads.map((thread) =>
      thread.projectId === projectId ? { ...thread, projectId: null } : thread,
    );
    setThreads(updatedThreads);
    localStorage.setItem(threadsStorageKey, JSON.stringify(updatedThreads));
  };

  const handleAssignThreadToProject = (threadId: string, projectId: string | null) => {
    const updatedThreads = threads.map((thread) =>
      thread.id === threadId ? { ...thread, projectId } : thread,
    );
    setThreads(updatedThreads);
    localStorage.setItem(threadsStorageKey, JSON.stringify(updatedThreads));
  };

  const handleSelectThread = (threadId: string) => {
    if (threadId.startsWith('digest:')) {
      const digestId = threadId.slice('digest:'.length)
      setCurrentThreadId(threadId)
      digestService
        .getThread(digestId)
        .then((data) => {
          const mappedMessages: Message[] = data.messages.map((m) => ({
            role: m.role,
            text: m.text,
            time: formatTime(m.time, timeZone),
          }))
          setMessages(mappedMessages)
        })
        .catch((err) => {
          console.error('Failed to load digest thread messages:', err)
          setMessages([
            {
              role: 'assistant',
              text: 'Unable to load this digest right now.',
              time: formatTime(new Date().toISOString(), timeZone),
            },
          ])
        })
      return
    }

    const thread = threads.find((t) => t.id === threadId)
    if (!thread) return

    setCurrentThreadId(threadId)
    setMessages(thread.messages)
    localStorage.setItem(threadStorageKey, threadId)
  };

  const handleDeleteThread = (threadId: string) => {
    if (threadId.startsWith('digest:')) return
    // Remove from threads list
    const updatedThreads = threads.filter(t => t.id !== threadId);
    setThreads(updatedThreads);
    localStorage.setItem(threadsStorageKey, JSON.stringify(updatedThreads));

    // Remove thread data
    localStorage.removeItem(`${storageKey}_${threadId}`);

    // If deleting current thread, clear messages and generate new thread ID
    if (currentThreadId === threadId) {
      const newThreadId = Date.now().toString();
      setCurrentThreadId(newThreadId);
      localStorage.setItem(threadStorageKey, newThreadId);
      setMessages([]);
    }
  };

  const handleDownloadDoc = async (doc: Document) => {
    try {
        // Navigate directly to the document (browser handles viewing vs downloading)
        const url = documentService.getDownloadUrl(doc.id);
        window.open(url, '_blank');
    } catch (e) {
        console.error("Navigation failed", e);
    }
  };

  const handleUploadDoc = async (file: File) => {
      try {
          const uploadedDoc = await documentService.upload(file);
          setComposerAttachments((prev) => [
            ...prev,
            {
              id: uploadedDoc.id,
              name: uploadedDoc.name,
              fileType: uploadedDoc.fileType,
            },
          ]);
          toast.show('File uploaded successfully.', 'success');
          mutateDocs(); // Refresh list
      } catch (e: unknown) {
          const message = e instanceof Error ? e.message : 'Upload failed. Please try again.';
          toast.show(message, 'error');
          console.error("Upload failed", e);
      }
  };

  const handleRemoveAttachment = (attachmentId: string) => {
    setComposerAttachments((prev) =>
      prev.filter((attachment) => attachment.id !== attachmentId),
    );
  };

  const handleSendMessage = async (text: string) => {
    if (!user) return;

    // Ensure we have a current thread ID
    let threadId = currentThreadId;
    if (!threadId) {
      threadId = Date.now().toString();
      setCurrentThreadId(threadId);
      localStorage.setItem(threadStorageKey, threadId);
    }

    const sentAttachments = composerAttachments;
    const newMessage: Message = {
      role: 'user',
      text: text,
      time: formatTime(new Date(), timeZone, { hour: '2-digit', minute: '2-digit' }),
      attachments: sentAttachments,
    };

    setMessages(prev => [...prev, newMessage]);
    setComposerAttachments([]);
    setIsTyping(true);
    const assistantTime = formatTime(new Date(), timeZone, { hour: '2-digit', minute: '2-digit' });
    let streamedText = '';
    setMessages(prev => [...prev, { role: 'assistant', text: '', time: assistantTime, pending: true }]);

    try {
      const abortController = new AbortController();
      streamAbortRef.current = abortController;
      const attachmentIds = sentAttachments.map((attachment) => attachment.id);
      const response = await aiService.sendMessageStream(text, {
        signal: abortController.signal,
        chunkDebounceMs: 50,
        onWebSearchStatus: (status) => {
          setIsWebSearching(status === 'started');
        },
        onChunk: (delta: string) => {
          if (!delta) return;
          streamedText += delta;
          setMessages((prev) => {
            const updated = [...prev];
            const pendingAssistantIndex = [...updated]
              .reverse()
              .findIndex((msg) => msg.role === 'assistant' && msg.pending);
            if (pendingAssistantIndex >= 0) {
              const index = updated.length - 1 - pendingAssistantIndex;
              updated[index] = {
                ...updated[index],
                pending: false,
                text: (updated[index].text || '') + delta,
              };
              return updated;
            }

            const lastAssistantIndex = [...updated].reverse().findIndex((msg) => msg.role === 'assistant');
            if (lastAssistantIndex >= 0) {
              const index = updated.length - 1 - lastAssistantIndex;
              updated[index] = { ...updated[index], text: (updated[index].text || '') + delta, pending: false };
            }
            return updated;
          });
        },
      }, pageContext, attachmentIds);

      const finalResponse = response.response || streamedText;
      setMessages(prev => {
        const updated = [...prev];
        const pendingAssistantIndex = [...updated]
          .reverse()
          .findIndex((msg) => msg.role === 'assistant' && msg.pending);
        const lastAssistantIndex = pendingAssistantIndex >= 0
          ? updated.length - 1 - pendingAssistantIndex
          : (() => {
              const idx = [...updated].reverse().findIndex((msg) => msg.role === 'assistant');
              return idx >= 0 ? updated.length - 1 - idx : -1;
            })();
        if (lastAssistantIndex >= 0) {
          updated[lastAssistantIndex] = {
            ...updated[lastAssistantIndex],
            pending: false,
            text: finalResponse,
            citations: response.citations ?? [],
            webSearchUsed: response.web_search_used ?? false,
          };
        } else {
          updated.push({
            role: 'assistant',
            text: finalResponse,
            time: assistantTime,
            pending: false,
            citations: response.citations ?? [],
            webSearchUsed: response.web_search_used ?? false,
          });
        }

        // Update thread in threads list
        const threadIndex = threads.findIndex(t => t.id === threadId);
        let updatedThreads = [...threads];

        if (threadIndex >= 0) {
          // Update existing thread
          updatedThreads[threadIndex] = {
            ...updatedThreads[threadIndex],
            title: updatedThreads[threadIndex].title || generateThreadTitle(text),
            timestamp: new Date().toISOString(),
            preview: finalResponse.slice(0, 60) + (finalResponse.length > 60 ? '...' : ''),
            messages: updated
          };
        } else {
          // Create new thread entry
          const newThread: Thread = {
            id: threadId!,
            title: generateThreadTitle(text),
            timestamp: new Date().toISOString(),
            preview: finalResponse.slice(0, 60) + (finalResponse.length > 60 ? '...' : ''),
            messages: updated,
            projectId: null,
          };
          updatedThreads = [newThread, ...updatedThreads];
        }

        setThreads(updatedThreads);
        localStorage.setItem(threadsStorageKey, JSON.stringify(updatedThreads));
        localStorage.setItem(`${storageKey}_${threadId}`, JSON.stringify(updated));

        return updated;
      });

      if (
        response.quota_limit !== undefined &&
        response.quota_used !== undefined
      ) {
        const nextLimit = response.quota_limit;
        const nextUsed = response.quota_used;
        setQuota({
          used: nextUsed,
          limit: nextLimit,
          usage_progress: nextLimit > 0 ? Math.min(Math.max(nextUsed / nextLimit, 0), 1) : 0,
          usage_copy: quota?.usage_copy ?? 'AI usage this period',
          tier: quota?.tier ?? 'free',
          resets_at: quota?.resets_at ?? '',
        });
      } else if (response.quota_remaining !== undefined && quota) {
        const nextUsed = Math.max(quota.limit - response.quota_remaining, 0);
        setQuota({
          ...quota,
          used: nextUsed,
          usage_progress: quota.limit > 0 ? Math.min(Math.max(nextUsed / quota.limit, 0), 1) : 0,
          usage_copy: quota.usage_copy ?? 'AI usage this period',
        });
      } else {
        const latestQuota = await aiService.getQuota();
        setQuota(latestQuota);
      }

    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        setMessages((prev) => {
          const updated = [...prev];
          const lastAssistantIndex = [...updated]
            .reverse()
            .findIndex((msg) => msg.role === 'assistant' && msg.pending);
          if (lastAssistantIndex >= 0) {
            const index = updated.length - 1 - lastAssistantIndex;
            if (!updated[index].text.trim()) {
              updated.splice(index, 1);
            }
          }
          localStorage.setItem(`${storageKey}_${threadId}`, JSON.stringify(updated));
          return updated;
        });
        return;
      }
      setMessages(prev => {
        const updated = [...prev];
        const errorText = `Error: ${error instanceof Error ? error.message : 'Something went wrong.'}`;
        const pendingAssistantIndex = [...updated]
          .reverse()
          .findIndex((msg) => msg.role === 'assistant' && msg.pending);
        const lastAssistantIndex = pendingAssistantIndex >= 0
          ? updated.length - 1 - pendingAssistantIndex
          : (() => {
              const idx = [...updated].reverse().findIndex((msg) => msg.role === 'assistant');
              return idx >= 0 ? updated.length - 1 - idx : -1;
            })();
        if (lastAssistantIndex >= 0) {
          updated[lastAssistantIndex] = {
            ...updated[lastAssistantIndex],
            pending: false,
            text: errorText,
            citations: [],
            webSearchUsed: false,
          };
        } else {
          updated.push({
            role: 'assistant',
            text: errorText,
            time: formatTime(new Date(), timeZone, { hour: '2-digit', minute: '2-digit' }),
            pending: false,
          });
        }
        localStorage.setItem(`${storageKey}_${threadId}`, JSON.stringify(updated));
        return updated;
      });
    } finally {
      setIsWebSearching(false);
      streamAbortRef.current = null;
      setIsTyping(false);
    }
  };

  const handleCancelResponse = () => {
    streamAbortRef.current?.abort();
  };


  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      // Constrain scroll to the chat container so the whole page doesn't jump
      if (typeof container.scrollTo === 'function') {
        container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
      } else {
        // JSDOM fallback
        container.scrollTop = container.scrollHeight;
      }
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  const quotaExceeded = quota ? quota.used >= quota.limit : false;
  const shouldShowAssistantThinking =
    isTyping &&
    messages.length > 0 &&
    messages[messages.length - 1].role === 'assistant' &&
    Boolean(messages[messages.length - 1].pending) &&
    !messages[messages.length - 1].text.trim();
  const visibleMessages = messages.filter(
    (msg) => !(msg.role === 'assistant' && msg.pending && !msg.text.trim()),
  );

  return (
    <div className="ai-surface h-full min-h-0 flex flex-col overflow-hidden bg-bg-primary">
      <AIPrivacyModal
        isOpen={showPrivacyModal}
        onAccept={handleAcceptPrivacy}
        onClose={handleClosePrivacyModal}
      />

      {/* Header */}
      <header className="flex-shrink-0 border-b bg-bg-secondary/30" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg hover:bg-white/5 transition-colors text-text-secondary hover:text-text-primary"
              title="Toggle sidebar"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleNewChat}
              className="p-2 rounded-full border text-text-primary transition-colors"
              style={{ borderColor: 'var(--border-subtle)', background: 'var(--surface-hover)' }}
              title="New chat"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <QuotaDisplay
              used={quota?.used ?? 0}
              limit={quota?.limit ?? 20}
              usageProgress={quota?.usage_progress}
              usageCopy={quota?.usage_copy}
              resetsAt={quota?.resets_at}
              tier={quota?.tier ?? 'free'}
              loading={!quota}
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Sidebar */}
        {sidebarOpen && (
          <aside className="w-80 flex-shrink-0">
      <AISidebar
        documents={documents}
        projects={projects}
        threads={[...digestThreads, ...threads]}
        currentThreadId={currentThreadId}
        onSelectThread={handleSelectThread}
        onDeleteThread={handleDeleteThread}
              onCreateProject={handleCreateProject}
              onDeleteProject={handleDeleteProject}
              onAssignThreadToProject={handleAssignThreadToProject}
              onUploadDoc={handleUploadDoc}
              onDownloadDoc={handleDownloadDoc}
            />
          </aside>
        )}

        {/* Chat Area */}
        <main className="flex-1 flex flex-col overflow-hidden relative min-h-0">
          {!privacyAccepted && (
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-10">
              <div className="bg-bg-secondary p-8 rounded-lg text-center max-w-[400px] border" style={{ borderColor: 'var(--border-subtle)' }}>
                <p className="mb-4">Please accept the Privacy & User Agreement to access the AI Assistant.</p>
                <button className="btn btn-primary" onClick={() => setShowPrivacyModal(true)}>Review Agreement</button>
              </div>
            </div>
          )}

          {/* Messages Container */}
          <div
            className="flex-1 overflow-y-auto px-6 py-6"
            ref={messagesContainerRef}
            role="log"
            aria-live="polite"
            aria-label="Chat messages"
          >
            <div className="max-w-4xl mx-auto space-y-6 flex flex-col">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-semibold mb-6" style={{ background: 'var(--surface-active)' }}>
                    AI
                  </div>
                  <h2 className="text-3xl font-semibold mb-4">Hello! I&apos;m your AI Assistant</h2>
                  <p className="text-text-secondary mb-8 max-w-md">
                    I can help you understand your spending patterns, track your net worth, review your subscriptions, and answer questions about your financial data.
                  </p>
                  <div className="grid grid-cols-2 gap-4 max-w-2xl">
                    <motion.button
                      onClick={() => handleSendMessage("How much did I spend this month?")}
                      className="p-4 rounded-lg border transition-colors text-left hover:opacity-80"
                      style={{ background: 'var(--surface-hover)', borderColor: 'var(--border-subtle)' }}
                      whileHover={{ y: -2 }}
                      transition={{ duration: 0.16 }}
                    >
                      <div className="text-sm font-medium mb-1">💰 Spending Summary</div>
                      <div className="text-xs text-text-secondary">How much did I spend this month?</div>
                    </motion.button>
                    <motion.button
                      onClick={() => handleSendMessage("What's my net worth?")}
                      className="p-4 rounded-lg border transition-colors text-left hover:opacity-80"
                      style={{ background: 'var(--surface-hover)', borderColor: 'var(--border-subtle)' }}
                      whileHover={{ y: -2 }}
                      transition={{ duration: 0.16 }}
                    >
                      <div className="text-sm font-medium mb-1">📊 Net Worth</div>
                      <div className="text-xs text-text-secondary">What&apos;s my net worth?</div>
                    </motion.button>
                    <motion.button
                      onClick={() => handleSendMessage("Show my subscriptions")}
                      className="p-4 rounded-lg border transition-colors text-left hover:opacity-80"
                      style={{ background: 'var(--surface-hover)', borderColor: 'var(--border-subtle)' }}
                      whileHover={{ y: -2 }}
                      transition={{ duration: 0.16 }}
                    >
                      <div className="text-sm font-medium mb-1">🔄 Subscriptions</div>
                      <div className="text-xs text-text-secondary">Show my subscriptions</div>
                    </motion.button>
                    <motion.button
                      onClick={() => handleSendMessage("Analyze my spending by category")}
                      className="p-4 rounded-lg border transition-colors text-left hover:opacity-80"
                      style={{ background: 'var(--surface-hover)', borderColor: 'var(--border-subtle)' }}
                      whileHover={{ y: -2 }}
                      transition={{ duration: 0.16 }}
                    >
                      <div className="text-sm font-medium mb-1">📈 Category Analysis</div>
                      <div className="text-xs text-text-secondary">Analyze my spending by category</div>
                    </motion.button>
                  </div>
                </div>
              ) : (
                <>
                  <AnimatePresence initial={false}>
                    {visibleMessages.map((msg, idx) => (
                      <motion.div
                        key={`${msg.role}-${msg.time}-${idx}`}
                        layout
                        initial={{ opacity: 0, y: 12, scale: 0.995 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.99 }}
                        transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                      >
                        <ChatMessage
                          role={msg.role}
                          text={msg.text}
                          time={msg.time}
                          citations={msg.citations}
                          attachments={msg.attachments}
                        />
                      </motion.div>
                    ))}
                    {shouldShowAssistantThinking && (
                      <motion.div
                        key="assistant-thinking-row"
                        className="chat-message chat-message-assistant"
                        initial={{ opacity: 0, y: 8, scale: 0.995 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.99 }}
                        transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                      >
                        <div className="assistant-thinking-indicator" aria-live="polite">
                          <span className="assistant-thinking-indicator-text">Crunching numbers</span>
                          <span className="assistant-thinking-indicator-dots" aria-hidden="true">
                            <span />
                            <span />
                            <span />
                          </span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {isWebSearching && (
                    <div className="chat-message chat-message-assistant">
                      <div className="chat-message-content text-sm text-text-secondary">
                        <span className="inline-flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                          Searching the web...
                        </span>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </>
              )}
            </div>
          </div>

          {/* Input Area */}
          <div className="flex-shrink-0 bg-transparent">
            <div className="max-w-4xl mx-auto px-6 py-4">
              <ChatInput
                onSendMessage={handleSendMessage}
                onCancel={handleCancelResponse}
                onUploadFile={handleUploadDoc}
                attachments={composerAttachments}
                onRemoveAttachment={handleRemoveAttachment}
                isLoading={isTyping}
                disabled={!privacyAccepted}
                quotaExceeded={quotaExceeded}
                autoFocus
              />
              <div className="mt-3 text-xs text-text-secondary text-center">
                <strong>Disclaimer:</strong> JuaLuma Insights are generated by AI for informational purposes only. Generated content may be inaccurate. Consult a qualified professional.
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
