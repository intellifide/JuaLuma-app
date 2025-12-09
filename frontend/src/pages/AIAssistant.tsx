import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';

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
  const [canAcceptPrivacy, setCanAcceptPrivacy] = useState(false);
  const policyScrollRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      text: "Hello! I'm your Finity AI Assistant. I can help you understand your spending patterns, track your net worth, review your subscriptions, and answer questions about your financial data.\n\nWhat would you like to know?",
      time: '10:15 AM' // Mock time for initial message
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const accepted = localStorage.getItem('finity_privacy_accepted');
    if (accepted === 'true') {
      setPrivacyAccepted(true);
    } else {
      // Show modal on load if not accepted (simulated delay)
      setTimeout(() => setShowPrivacyModal(true), 500);
    }
  }, []);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const atBottom = Math.abs(element.scrollHeight - element.scrollTop - element.clientHeight) < 2;
    if (atBottom) {
      setCanAcceptPrivacy(true);
    }
  };

  const handleAcceptPrivacy = () => {
    localStorage.setItem('finity_privacy_accepted', 'true');
    setPrivacyAccepted(true);
    setShowPrivacyModal(false);
  };

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    const newMessage: Message = {
      role: 'user',
      text: inputValue,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, newMessage]);
    setInputValue('');
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      setIsTyping(false);
      const responses = [
        "I can help you understand your spending patterns. Based on your recent transactions, I notice you've been spending more on dining out this month.",
        "Your net worth has increased by 3.2% this month. Would you like me to break down the contributing factors?",
        "I can see you have several recurring subscriptions. Would you like a summary of your monthly recurring expenses?",
        "Based on your budget categories, you're on track for most categories but approaching your limit for entertainment spending."
      ];
      const responseText = responses[Math.floor(Math.random() * responses.length)];

      const assistantMessage: Message = {
        role: 'assistant',
        text: responseText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, assistantMessage]);
    }, 1500);
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

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  return (
    <section className="container container-narrow py-12">
      <h1 className="mb-4">AI Assistant</h1>

      <div className="alert alert-info mb-8">
        <strong>Important Disclaimer:</strong> The AI Assistant provides access to third-party large language models. It is NOT a financial, investment, tax, or legal advisor. Its responses are not endorsed or verified by Intellifide, LLC and may be inaccurate or inappropriate. You must not rely on the AI for any financial decisions. All investments carry risk, and you must consult a qualified professional.
        <p className="mt-2">
          <a href="#" onClick={(e) => { e.preventDefault(); setShowPrivacyModal(true); }}>View full AI Assistant Disclaimer</a>
        </p>
      </div>

      {/* Privacy Modal */}
      <div className={`modal ${showPrivacyModal ? 'open' : ''}`} aria-hidden={!showPrivacyModal} role="dialog" aria-labelledby="privacy-modal-title">
        <div className="modal-content">
          <div className="modal-header">
            <h2 id="privacy-modal-title">Privacy & User Agreement</h2>
            <button className="modal-close" onClick={() => setShowPrivacyModal(false)} aria-label="Close modal">×</button>
          </div>
          <div className="modal-body">
            <div
              className="policy-scroll"
              id="privacy-policy-scroll"
              tabIndex={0}
              aria-label="AI Assistant disclaimer - scroll to read full text before accepting"
              onScroll={handleScroll}
              ref={policyScrollRef}
            >
              <p><strong>AI Assistant Disclaimer and User Acknowledgment</strong></p>
              <p>The Finity AI Assistant provides access to third-party large language models (Vertex AI Gemini). It is <strong>not</strong> a financial, investment, tax, or legal advisor.</p>
              <h3>1. No Advice</h3>
              <ul>
                <li>Not a financial, investment, tax, or legal advisor.</li>
                <li>Responses are not endorsed or verified and may be inaccurate or inappropriate.</li>
              </ul>
              <h3>2. Your Responsibility</h3>
              <ul>
                <li>Do not rely on AI responses for financial decisions.</li>
                <li>Consult qualified professionals for financial, investment, tax, or legal matters.</li>
                <li>You use the AI Assistant at your own risk.</li>
              </ul>
              <h3>3. No Liability</h3>
              <ul>
                <li>Intellifide, LLC disclaims liability for decisions based on AI responses.</li>
                <li>No warranties on accuracy, completeness, or appropriateness.</li>
              </ul>
              <h3>4. Data & Privacy</h3>
              <ul>
                <li>AI chat history has no retention limits; transactions remain visible.</li>
                <li>Use is subject to the Terms of Service and Privacy Policy.</li>
              </ul>
              <h3>5. Third-Party Services</h3>
              <ul>
                <li>Uses third-party LLM services (Vertex AI); their terms and privacy policies apply.</li>
              </ul>
              <h3>6. Acknowledgment</h3>
              <ul>
                <li>By accepting, you confirm you have read and understand this disclaimer and accept all risks.</li>
              </ul>
            </div>
            <p id="privacy-scroll-hint" className="policy-scroll-footer">
              {canAcceptPrivacy ? 'You can now accept and continue.' : 'Scroll to the bottom to enable “Accept & Continue”.'}
            </p>
            <div className="flex gap-4 mt-8">
              <button
                id="accept-privacy"
                className="btn btn-primary flex-1"
                disabled={!canAcceptPrivacy}
                aria-disabled={!canAcceptPrivacy}
                onClick={handleAcceptPrivacy}
              >
                Accept & Continue
              </button>
              <button
                id="deny-privacy"
                className="btn btn-outline flex-1"
                onClick={() => setShowPrivacyModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Interface */}
      <div className="glass-panel mb-8" id="ai-chat-wrapper">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="m-0">Chat with your AI Assistant</h2>
          </div>
          <div>
            <span className="badge" id="quota-badge">Quota: 0/20 queries today</span>
            <p className="text-xs text-text-muted mt-2 text-right">
              Resets at midnight CT
            </p>
          </div>
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
              <div key={idx} className={`chat-message chat-message-${msg.role}`}>
                <div className="chat-message-content whitespace-pre-wrap">
                  <p>{msg.text}</p>
                </div>
                <div className="chat-message-time">{msg.time}</div>
              </div>
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

          <div className="chat-input-container">
            <input
              type="text"
              id="chat-input"
              className="chat-input"
              placeholder="Ask me anything about your finances..."
              aria-label="Chat input"
              disabled={!privacyAccepted}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            />
            <button
              id="chat-send"
              className="btn btn-primary chat-send"
              disabled={!privacyAccepted}
              onClick={handleSendMessage}
            >
              Send
            </button>
          </div>
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
