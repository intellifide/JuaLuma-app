import React, { useState, useEffect, useRef } from 'react';
import useSWR from 'swr';
import { useAuth } from '../hooks/useAuth';
import { ChatMessage } from '../components/ChatMessage';
import { ChatInput } from '../components/ChatInput';
import { QuotaDisplay } from '../components/QuotaDisplay';
import { aiService, QuotaStatus, HistoryItem } from '../services/aiService';
import { AIPrivacyModal } from '../components/AIPrivacyModal';
import { ChatHistoryList } from '../components/ChatHistoryList';
import { DocumentList } from '../components/DocumentList';
import { documentService, Document } from '../services/documentService';
import { legalService } from '../services/legal';
import { LEGAL_AGREEMENTS } from '../constants/legal';

interface Message {
  role: 'user' | 'assistant';
  text: string;
  time: string;
}


export default function AIAssistant() {
  const { user } = useAuth();
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [quota, setQuota] = useState<QuotaStatus | null>(null);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [hasFetchedHistory, setHasFetchedHistory] = useState(false);
  const storageKey = user?.uid ? `jualuma_ai_thread_${user.uid}` : 'jualuma_ai_thread_anon';

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

  // Reset per-user state when switching users
  useEffect(() => {
    setHasFetchedHistory(false);
    setMessages([]);
    setHistoryItems([]);
    setQuota(null);
  }, [user?.uid]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user || !privacyAccepted || hasFetchedHistory) return;

      try {
        const [history, quotaData] = await Promise.all([
          aiService.getHistory(),
          aiService.getQuota()
        ]);

        setHistoryItems(history);

        const formattedMessages: Message[] = history.flatMap(item => [
          {
            role: 'user' as const,
            text: item.prompt,
            time: new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          },
          {
            role: 'assistant' as const,
            text: item.response,
            time: new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]).filter(m => m.text);

        // If backend has history, prefer it; otherwise fall back to local cache
        if (formattedMessages.length > 0) {
          setMessages(formattedMessages);
          localStorage.setItem(storageKey, JSON.stringify(formattedMessages));
        } else {
          const cached = localStorage.getItem(storageKey);
          if (cached) {
            try {
              const parsed: Message[] = JSON.parse(cached);
              if (parsed.length > 0) {
                setMessages(parsed);
              } else {
                setMessages([{
                  role: 'assistant',
                  text: "Hello! I am Gemini 2.5 Flash. I can help you understand your spending patterns, track your net worth, review your subscriptions, and answer questions about your financial data.\n\nWhat would you like to know?",
                  time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }]);
              }
            } catch {
              setMessages([{
                role: 'assistant',
                text: "Hello! I am Gemini 2.5 Flash. I can help you understand your spending patterns, track your net worth, review your subscriptions, and answer questions about your financial data.\n\nWhat would you like to know?",
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              }]);
            }
          } else {
            setMessages([{
              role: 'assistant',
              text: "Hello! I am Gemini 2.5 Flash. I can help you understand your spending patterns, track your net worth, review your subscriptions, and answer questions about your financial data.\n\nWhat would you like to know?",
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }]);
          }
        }

        setQuota(quotaData);
        setHasFetchedHistory(true);
      } catch (err) {
        console.error("Error fetching AI data:", err);
        // Fallback or error state?
      }
    };

    fetchData();
  }, [user, privacyAccepted, hasFetchedHistory, storageKey]);

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
    // Clear current messages
    setMessages([{
      role: 'assistant',
      text: "Hello! I am Gemini 2.5 Flash. I can help you understand your spending patterns, track your net worth, review your subscriptions, and answer questions about your financial data.\n\nWhat would you like to know?",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);
    
    // Clear local storage for this thread
    localStorage.removeItem(storageKey);
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
        localStorage.setItem(storageKey, JSON.stringify(updated));
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
        localStorage.setItem(storageKey, JSON.stringify(updated));
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
    <section className="container container-narrow py-12">

      <AIPrivacyModal
        isOpen={showPrivacyModal}
        onAccept={handleAcceptPrivacy}
        onClose={handleClosePrivacyModal}
      />

      <div className="glass-panel mb-8" id="ai-chat-wrapper">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <h2 className="m-0">Chat with Gemini</h2>
            <button
              onClick={handleNewChat}
              className="btn btn-ghost btn-sm btn-square text-text-secondary hover:text-primary transition-colors"
              title="Start New Conversation"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          </div>
          <QuotaDisplay
            used={quota?.used ?? 0}
            limit={quota?.limit ?? 20}
            tier={quota?.tier ?? 'free'}
            loading={!quota}
          />
        </div>


        <div id="ai-chat-container" className="chat-container relative">
          {!privacyAccepted && (
            <div id="privacy-block-overlay" className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
              <div className="bg-bg-primary p-8 rounded-lg text-center max-w-[400px]">
                <p className="mb-4">Please accept the Privacy & User Agreement to access the AI Assistant.</p>
                <button id="open-privacy-modal" className="btn btn-primary" onClick={() => setShowPrivacyModal(true)}>Review Agreement</button>
              </div>
            </div>
          )}

          <div
            id="ai-chat-messages"
            className="chat-messages"
            role="log"
            aria-live="polite"
            aria-label="Chat messages"
            ref={messagesContainerRef}
          >
            {messages.map((msg, idx) => (
              <ChatMessage key={idx} role={msg.role} text={msg.text} time={msg.time} />
            ))}

            {isTyping && (
              <div className="chat-message chat-message-assistant chat-typing">
                <div className="chat-message-content">
                  <div className="typing-indicator">
                    <span></span><span></span><span></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <ChatInput
            onSendMessage={handleSendMessage}
            isLoading={isTyping}
            disabled={!privacyAccepted}
            quotaExceeded={quotaExceeded}
          />

          <div className="mt-4 p-4 text-xs text-text-secondary bg-bg-secondary/20 rounded-lg text-center border border-white/5">
            <p className="mb-0">
              <strong>Disclaimer:</strong> jualuma Insights are generated by AI for informational purposes only. Do not rely on them for financial decisions.
              <br />
              Generated content may be inaccurate. Consult a qualified professional.
            </p>
          </div>
        </div>
      </div>

      <ChatHistoryList items={historyItems} />

      <DocumentList 
        documents={documents} 
        onUpload={handleUploadDoc}
        onDownload={handleDownloadDoc}
        onPreview={handlePreviewDoc}
      />

      <div className="glass-panel mt-8">
        <h2>AI Assistant Features</h2>
        <div className="grid grid-2">
          <div className="card">
            <h3>Budget Analysis</h3>
            <p>Get insights about your spending patterns and budget performance. Ask questions like &quot;How am I doing with my budget this month?&quot;</p>
          </div>
          <div className="card">
            <h3>Net Worth Tracking</h3>
            <p>Understand your net worth trends and see what&apos;s driving changes in your financial position over time.</p>
          </div>
          <div className="card">
            <h3>Subscription Review</h3>
            <p>Review all your recurring subscriptions and identify opportunities to save money.</p>
          </div>
          <div className="card">
            <h3>Spending Insights</h3>
            <p>Analyze your spending by category, merchant, or time period to identify trends and patterns.</p>
          </div>
        </div>
      </div>


    </section>
  );
}
