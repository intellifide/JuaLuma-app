// Last Modified: 2026-01-24 04:25 CST
import React, { useState, useEffect, useRef } from 'react';
import useSWR from 'swr';
import { useAuth } from '../hooks/useAuth';
import { ChatMessage } from '../components/ChatMessage';
import { ChatInput } from '../components/ChatInput';
import { QuotaDisplay } from '../components/QuotaDisplay';
import { aiService, QuotaStatus, HistoryItem } from '../services/aiService';
import { AIPrivacyModal } from '../components/AIPrivacyModal';
import { AISidebar } from '../components/AISidebar';
import { documentService, Document } from '../services/documentService';
import { legalService } from '../services/legal';
import { LEGAL_AGREEMENTS } from '../constants/legal';

interface Message {
  role: 'user' | 'assistant';
  text: string;
  time: string;
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
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [quota, setQuota] = useState<QuotaStatus | null>(null);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [hasFetchedHistory, setHasFetchedHistory] = useState(false);
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const storageKey = user?.uid ? `jualuma_ai_thread_${user.uid}` : 'jualuma_ai_thread_anon';
  const threadStorageKey = user?.uid ? `jualuma_ai_current_thread_${user.uid}` : 'jualuma_ai_current_thread_anon';
  const threadsStorageKey = user?.uid ? `jualuma_ai_threads_${user.uid}` : 'jualuma_ai_threads_anon';
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
  }, [user?.uid, threadsStorageKey, threadStorageKey, storageKey, projectsStorageKey]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user || !privacyAccepted || hasFetchedHistory) return;

      try {
        const [history, quotaData] = await Promise.all([
          aiService.getHistory(),
          aiService.getQuota()
        ]);

        // Set history items for the ChatHistoryList component (separate from current conversation)
        setHistoryItems(history);
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
    const thread = threads.find(t => t.id === threadId);
    if (thread) {
      setCurrentThreadId(threadId);
      setMessages(thread.messages);
      localStorage.setItem(threadStorageKey, threadId);
    }
  };

  const handleDeleteThread = (threadId: string) => {
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
          await documentService.upload(file);
          mutateDocs(); // Refresh list
      } catch (e) {
          console.error("Upload failed", e);
      }
  };

  const handlePreviewDoc = (doc: Document) => {
      return documentService.getPreviewUrl(doc.id);
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

    const newMessage: Message = {
      role: 'user',
      text: text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, newMessage]);
    setIsTyping(true);

    try {
      const response = await aiService.sendMessage(text);

      const assistantMessage: Message = {
        role: 'assistant',
        text: response.response,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      
      setMessages(prev => {
        const updated = [...prev, assistantMessage];
        
        // Update thread in threads list
        const threadIndex = threads.findIndex(t => t.id === threadId);
        let updatedThreads = [...threads];
        
        if (threadIndex >= 0) {
          // Update existing thread
          updatedThreads[threadIndex] = {
            ...updatedThreads[threadIndex],
            title: text.slice(0, 50) + (text.length > 50 ? '...' : ''),
            timestamp: new Date().toISOString(),
            preview: response.response.slice(0, 60) + (response.response.length > 60 ? '...' : ''),
            messages: updated
          };
        } else {
          // Create new thread entry
          const newThread: Thread = {
            id: threadId!,
            title: text.slice(0, 50) + (text.length > 50 ? '...' : ''),
            timestamp: new Date().toISOString(),
            preview: response.response.slice(0, 60) + (response.response.length > 60 ? '...' : ''),
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

      // Update history list with new interaction
      const newHistoryItem: HistoryItem = {
        prompt: text,
        response: response.response,
        timestamp: new Date().toISOString()
      };
      setHistoryItems(prev => [newHistoryItem, ...prev]);

      if (
        response.quota_limit !== undefined &&
        response.quota_used !== undefined
      ) {
        setQuota({
          used: response.quota_used,
          limit: response.quota_limit,
          tier: quota?.tier ?? 'free',
          resets_at: quota?.resets_at ?? '',
        });
      } else if (response.quota_remaining !== undefined && quota) {
        setQuota({
          ...quota,
          used: Math.max(quota.limit - response.quota_remaining, 0),
        });
      } else {
        const latestQuota = await aiService.getQuota();
        setQuota(latestQuota);
      }

    } catch (error: unknown) {
      const errorMessage: Message = {
        role: 'assistant',
        text: `Error: ${error instanceof Error ? error.message : 'Something went wrong.'}`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => {
        const updated = [...prev, errorMessage];
        localStorage.setItem(`${storageKey}_${threadId}`, JSON.stringify(updated));
        return updated;
      });
    } finally {
      setIsTyping(false);
    }
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

  return (
    <div className="h-full min-h-0 flex flex-col overflow-hidden bg-bg-primary">
      <AIPrivacyModal
        isOpen={showPrivacyModal}
        onAccept={handleAcceptPrivacy}
        onClose={handleClosePrivacyModal}
      />

      {/* Header */}
      <header className="flex-shrink-0 border-b border-white/10 bg-bg-secondary/30">
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
            <h1 className="text-xl font-semibold m-0">AI Assistant</h1>
          </div>
          <QuotaDisplay
            used={quota?.used ?? 0}
            limit={quota?.limit ?? 20}
            tier={quota?.tier ?? 'free'}
            loading={!quota}
          />
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
              threads={threads}
              currentThreadId={currentThreadId}
              onNewChat={handleNewChat}
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
              <div className="bg-bg-secondary p-8 rounded-lg text-center max-w-[400px] border border-white/10">
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
                  <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-lg font-semibold mb-6">
                    AI
                  </div>
                  <h2 className="text-3xl font-semibold mb-4">Hello! I'm your AI Assistant</h2>
                  <p className="text-text-secondary mb-8 max-w-md">
                    I can help you understand your spending patterns, track your net worth, review your subscriptions, and answer questions about your financial data.
                  </p>
                  <div className="grid grid-cols-2 gap-4 max-w-2xl">
                    <button
                      onClick={() => handleSendMessage("How much did I spend this month?")}
                      className="p-4 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-left"
                    >
                      <div className="text-sm font-medium mb-1">💰 Spending Summary</div>
                      <div className="text-xs text-text-secondary">How much did I spend this month?</div>
                    </button>
                    <button
                      onClick={() => handleSendMessage("What's my net worth?")}
                      className="p-4 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-left"
                    >
                      <div className="text-sm font-medium mb-1">📊 Net Worth</div>
                      <div className="text-xs text-text-secondary">What's my net worth?</div>
                    </button>
                    <button
                      onClick={() => handleSendMessage("Show my subscriptions")}
                      className="p-4 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-left"
                    >
                      <div className="text-sm font-medium mb-1">🔄 Subscriptions</div>
                      <div className="text-xs text-text-secondary">Show my subscriptions</div>
                    </button>
                    <button
                      onClick={() => handleSendMessage("Analyze my spending by category")}
                      className="p-4 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-left"
                    >
                      <div className="text-sm font-medium mb-1">📈 Category Analysis</div>
                      <div className="text-xs text-text-secondary">Analyze my spending by category</div>
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((msg, idx) => (
                    <ChatMessage key={idx} role={msg.role} text={msg.text} time={msg.time} />
                  ))}

                  {isTyping && (
                    <div className="chat-message chat-message-assistant">
                      <div className="chat-message-content">
                        <div className="typing-indicator">
                          <span></span><span></span><span></span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>
          </div>

          {/* Input Area */}
          <div className="flex-shrink-0 border-t border-white/10 bg-bg-secondary/30">
            <div className="max-w-4xl mx-auto px-6 py-4">
              <ChatInput
                onSendMessage={handleSendMessage}
                isLoading={isTyping}
                disabled={!privacyAccepted}
                quotaExceeded={quotaExceeded}
              />
              <div className="mt-3 text-xs text-text-secondary text-center">
                <strong>Disclaimer:</strong> jualuma Insights are generated by AI for informational purposes only. Generated content may be inaccurate. Consult a qualified professional.
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
