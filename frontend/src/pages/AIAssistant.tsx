import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { ChatMessage } from '../components/ChatMessage';
import { ChatInput } from '../components/ChatInput';
import { QuotaDisplay } from '../components/QuotaDisplay';
import { aiService, QuotaStatus } from '../services/aiService';
import { AIPrivacyModal } from '../components/AIPrivacyModal';

interface Message {
  role: 'user' | 'assistant';
  text: string;
  time: string;
}

const sampleThreads = [
  {
    id: 'budget',
    name: 'Budget Analysis',
    messages: [
      { role: 'user', text: 'How am I doing with my budget this month?' },
      { role: 'assistant', text: "You're doing well! You've spent 68% of your monthly budget. Dining is at 85% of your limit, while utilities are only at 45%." }
    ]
  },
  {
    id: 'networth',
    name: 'Net Worth Tracking',
    messages: [
      { role: 'user', text: 'Show me my net worth trend' },
      { role: 'assistant', text: 'Your net worth has grown from $125,430 to $132,890 over the past 3 months, a 5.9% increase. Your investment accounts are the primary driver of this growth.' }
    ]
  },
  {
    id: 'subscriptions',
    name: 'Subscription Review',
    messages: [
      { role: 'user', text: 'What subscriptions am I paying for?' },
      { role: 'assistant', text: 'You have 8 active subscriptions totaling $127.50/month: Netflix ($15.99), Spotify ($9.99), Adobe Creative Cloud ($52.99), and 5 others. Would you like to see the full list?' }
    ]
  }
] as const;

export default function AIAssistant() {
  const { user } = useAuth();
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [quota, setQuota] = useState<QuotaStatus | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [hasFetchedHistory, setHasFetchedHistory] = useState(false);

  useEffect(() => {
    const accepted = localStorage.getItem('finity_privacy_accepted');
    if (accepted === 'true') {
      setPrivacyAccepted(true);
    } else {
      setTimeout(() => setShowPrivacyModal(true), 500);
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!user || !privacyAccepted || hasFetchedHistory) return;

      try {
        const token = await user.getIdToken();
        const [history, quotaData] = await Promise.all([
          aiService.getHistory(token),
          aiService.getQuota(token)
        ]);

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

        if (formattedMessages.length === 0) {
          setMessages([{
            role: 'assistant',
            text: "Hello! I'm your Finity AI Assistant. I can help you understand your spending patterns, track your net worth, review your subscriptions, and answer questions about your financial data.\n\nWhat would you like to know?",
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }]);
        } else {
          setMessages(formattedMessages);
        }

        setQuota(quotaData);
        setHasFetchedHistory(true);
      } catch (err) {
        console.error("Error fetching AI data:", err);
        // Fallback or error state?
      }
    };

    fetchData();
  }, [user, privacyAccepted, hasFetchedHistory]);

  const handleAcceptPrivacy = () => {
    localStorage.setItem('finity_privacy_accepted', 'true');
    setPrivacyAccepted(true);
    setShowPrivacyModal(false);
  };

  const handleClosePrivacyModal = () => {
    setShowPrivacyModal(false);
  }

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
      const token = await user.getIdToken();
      const response = await aiService.sendMessage(text, token);

      const assistantMessage: Message = {
        role: 'assistant',
        text: response.response,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, assistantMessage]);

      if (response.quota_remaining !== undefined && quota) {
        setQuota({
          ...quota,
          used: quota.limit - response.quota_remaining
        });
      } else {
        const q = await aiService.getQuota(token);
        setQuota(q);
      }

    } catch (error: any) {
      const errorMessage: Message = {
        role: 'assistant',
        text: `Error: ${error.message || 'Something went wrong.'}`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const loadSampleThread = (threadId: string) => {
    const thread = sampleThreads.find(t => t.id === threadId);
    if (thread) {
      const threadMessages: Message[] = thread.messages.map(m => ({
        ...m,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }));
      setMessages(threadMessages);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const quotaExceeded = quota ? quota.used >= quota.limit : false;

  return (
    <section className="container container-narrow py-12">
      <h1 className="mb-4">AI Assistant</h1>

      <div className="alert alert-info mb-8">
        <strong>Important Disclaimer:</strong> The AI Assistant provides access to third-party large language models. It is NOT a financial, investment, tax, or legal advisor. Its responses are not endorsed or verified by Intellifide, LLC and may be inaccurate or inappropriate. You must not rely on the AI for any financial decisions. All investments carry risk, and you must consult a qualified professional.
        <p className="mt-2">
          <a href="#" onClick={(e) => { e.preventDefault(); setShowPrivacyModal(true); }}>View full AI Assistant Disclaimer</a>
        </p>
      </div>

      <AIPrivacyModal
        isOpen={showPrivacyModal}
        onAccept={handleAcceptPrivacy}
        onClose={handleClosePrivacyModal}
      />

      <div className="glass-panel mb-8" id="ai-chat-wrapper">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="m-0">Chat with your AI Assistant</h2>
          </div>
          <QuotaDisplay
            used={quota?.used ?? 0}
            limit={quota?.limit ?? 20}
            tier={quota?.tier ?? 'free'}
            loading={!quota}
          />
        </div>

        <div className="mb-4">
          <label htmlFor="chat-thread-selector" className="form-label">Load Sample Conversation:</label>
          <select
            id="chat-thread-selector"
            className="form-input"
            onChange={(e) => loadSampleThread(e.target.value)}
            disabled={!privacyAccepted}
          >
            <option value="">Select a sample conversation...</option>
            <option value="budget">Budget Analysis</option>
            <option value="networth">Net Worth Tracking</option>
            <option value="subscriptions">Subscription Review</option>
          </select>
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

          <div id="ai-chat-messages" className="chat-messages" role="log" aria-live="polite" aria-label="Chat messages">
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
        </div>
      </div>

      <div className="glass-panel">
        <h2>AI Assistant Features</h2>
        <div className="grid grid-2">
          <div className="card">
            <h3>Budget Analysis</h3>
            <p>Get insights about your spending patterns and budget performance. Ask questions like "How am I doing with my budget this month?"</p>
          </div>
          <div className="card">
            <h3>Net Worth Tracking</h3>
            <p>Understand your net worth trends and see what's driving changes in your financial position over time.</p>
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

      <div className="alert alert-info mt-12">
        <strong>Usage Limits:</strong> Free Tier: 20 queries/day (Gemini 2.5 Flash). Essential/Pro: 75 queries/day (Gemini 3 Pro). Ultimate: 200 queries/day (Gemini 3 Pro). Queries reset daily at midnight CT.
      </div>
    </section>
  );
}
