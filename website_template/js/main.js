// jualuma Platform - Main JavaScript
// Last Updated: December 05, 2025 at 09:33 PM
(function () {
  'use strict';

  // Theme Management
  const ThemeManager = {
    init() {
      const savedTheme = localStorage.getItem('theme') || 'light';
      this.setTheme(savedTheme);

      const toggle = document.querySelector('.theme-toggle');
      if (toggle) {
        toggle.addEventListener('click', () => this.toggle());
      }
    },

    setTheme(theme) {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('theme', theme);

      const toggle = document.querySelector('.theme-toggle');
      if (toggle) {
        toggle.textContent = theme === 'dark' ? '☀️' : '🌙';
        toggle.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`);
      }
    },

    toggle() {
      const current = document.documentElement.getAttribute('data-theme') || 'light';
      const newTheme = current === 'dark' ? 'light' : 'dark';
      this.setTheme(newTheme);
    }
  };

  // Mobile Navigation
  const MobileNav = {
    init() {
      const toggle = document.querySelector('.nav-mobile-toggle');
      const nav = document.querySelector('.nav-mobile');

      if (toggle && nav) {
        toggle.addEventListener('click', () => {
          nav.classList.toggle('open');
          toggle.setAttribute('aria-expanded', nav.classList.contains('open'));
        });

        // Close on link click
        nav.querySelectorAll('a').forEach(link => {
          link.addEventListener('click', () => {
            nav.classList.remove('open');
            toggle.setAttribute('aria-expanded', 'false');
          });
        });
      }
    }
  };

  // Active Navigation Highlighting
  const NavHighlight = {
    init() {
      const currentPath = window.location.pathname;
      const navLinks = document.querySelectorAll('.nav-link, .nav-mobile a');

      navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href && (currentPath.includes(href) || (currentPath === '/' && href === 'index.html'))) {
          link.classList.add('active');
        }
      });
    }
  };

  // Tab System
  const TabSystem = {
    init() {
      const tabContainers = document.querySelectorAll('.tabs');

      tabContainers.forEach(container => {
        const buttons = container.querySelectorAll('.tab-button');
        const contents = container.parentElement.querySelectorAll('.tab-content');

        buttons.forEach((button, index) => {
          button.addEventListener('click', () => {
            // Remove active from all
            buttons.forEach(b => b.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));

            // Add active to clicked
            button.classList.add('active');
            if (contents[index]) {
              contents[index].classList.add('active');
            }
          });
        });
      });
    }
  };

  // Modal System
  const ModalSystem = {
    init() {
      // Open modals
      document.querySelectorAll('[data-modal]').forEach(trigger => {
        trigger.addEventListener('click', (e) => {
          e.preventDefault();
          const modalId = trigger.getAttribute('data-modal');
          this.open(modalId);
        });
      });

      // Close modals
      document.querySelectorAll('.modal-close, .modal').forEach(element => {
        element.addEventListener('click', (e) => {
          if (e.target === element || e.target.classList.contains('modal-close')) {
            const modal = element.closest('.modal') || element;
            this.close(modal);
          }
        });
      });

      // Close on Escape
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          const openModal = document.querySelector('.modal.open');
          if (openModal) {
            this.close(openModal);
          }
        }
      });
    },

    open(modalId) {
      const modal = document.getElementById(modalId);
      if (modal) {
        modal.classList.add('open');
        modal.setAttribute('aria-hidden', 'false');

        // Focus trap
        const firstFocusable = modal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (firstFocusable) {
          firstFocusable.focus();
        }

        // Prevent body scroll
        document.body.style.overflow = 'hidden';
      }
    },

    close(modal) {
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';

      // Return focus to trigger
      const trigger = document.querySelector(`[data-modal="${modal.id}"]`);
      if (trigger) {
        trigger.focus();
      }
    }
  };

  // Toast Notifications
  const Toast = {
    show(message, type = 'success') {
      const toast = document.createElement('div');
      toast.className = `toast toast-${type}`;
      toast.setAttribute('role', 'alert');
      toast.setAttribute('aria-live', 'polite');

      const icon = type === 'success' ? '✓' : '✕';
      toast.innerHTML = `
        <span>${icon}</span>
        <span>${message}</span>
      `;

      document.body.appendChild(toast);

      // Show
      setTimeout(() => toast.classList.add('show'), 10);

      // Hide after 3 seconds
      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
      }, 3000);
    }
  };

  // Form Handling (Faux)
  const FormHandler = {
    init() {
      document.querySelectorAll('form[data-faux-submit]').forEach(form => {
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          this.handleSubmit(form);
        });
      });
    },

    handleSubmit(form) {
      const submitButton = form.querySelector('button[type="submit"]');
      const originalText = submitButton ? submitButton.textContent : '';

      // Show loading state
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = 'Submitting...';
        form.classList.add('loading');
      }

      // Simulate API call
      setTimeout(() => {
        // Show success
        Toast.show('Form submitted successfully!', 'success');

        // Reset form
        form.reset();
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = originalText;
        }
        form.classList.remove('loading');
      }, 1500);
    }
  };

  // AI Chat Preview
  const AIChat = {
    init() {
      const chatContainer = document.getElementById('ai-chat-container');
      if (!chatContainer) return;

      const input = chatContainer.querySelector('.chat-input');
      const sendButton = chatContainer.querySelector('.chat-send');
      const messagesContainer = chatContainer.querySelector('.chat-messages');

      if (input && sendButton && messagesContainer) {
        sendButton.addEventListener('click', () => this.sendMessage(input, messagesContainer));
        input.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') {
            this.sendMessage(input, messagesContainer);
          }
        });
      }

      // Load sample threads
      this.loadSampleThreads();
    },

    sendMessage(input, container) {
      const message = input.value.trim();
      if (!message) return;

      // Add user message
      this.addMessage(container, message, 'user');
      input.value = '';

      // Show typing indicator
      const typing = this.addTypingIndicator(container);

      // Simulate AI response
      setTimeout(() => {
        typing.remove();
        const responses = [
          "I can help you understand your spending patterns. Based on your recent transactions, I notice you've been spending more on dining out this month.",
          "Your net worth has increased by 3.2% this month. Would you like me to break down the contributing factors?",
          "I can see you have several recurring subscriptions. Would you like a summary of your monthly recurring expenses?",
          "Based on your budget categories, you're on track for most categories but approaching your limit for entertainment spending."
        ];
        const response = responses[Math.floor(Math.random() * responses.length)];
        this.addMessage(container, response, 'assistant');
      }, 1500);
    },

    addMessage(container, text, role) {
      const messageDiv = document.createElement('div');
      messageDiv.className = `chat-message chat-message-${role}`;
      messageDiv.innerHTML = `
        <div class="chat-message-content">
          <p>${this.escapeHtml(text)}</p>
        </div>
        <div class="chat-message-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
      `;
      container.appendChild(messageDiv);
      container.scrollTop = container.scrollHeight;
    },

    addTypingIndicator(container) {
      const typing = document.createElement('div');
      typing.className = 'chat-message chat-message-assistant chat-typing';
      typing.innerHTML = `
        <div class="chat-message-content">
          <div class="typing-indicator">
            <span></span><span></span><span></span>
          </div>
        </div>
      `;
      container.appendChild(typing);
      container.scrollTop = container.scrollHeight;
      return typing;
    },

    loadSampleThreads() {
      const threadSelector = document.getElementById('chat-thread-selector');
      if (!threadSelector) return;

      const threads = [
        {
          id: 'budget', name: 'Budget Analysis', messages: [
            { role: 'user', text: 'How am I doing with my budget this month?' },
            { role: 'assistant', text: 'You\'re doing well! You\'ve spent 68% of your monthly budget. Dining is at 85% of your limit, while utilities are only at 45%.' }
          ]
        },
        {
          id: 'networth', name: 'Net Worth Tracking', messages: [
            { role: 'user', text: 'Show me my net worth trend' },
            { role: 'assistant', text: 'Your net worth has grown from $125,430 to $132,890 over the past 3 months, a 5.9% increase. Your investment accounts are the primary driver of this growth.' }
          ]
        },
        {
          id: 'subscriptions', name: 'Subscription Review', messages: [
            { role: 'user', text: 'What subscriptions am I paying for?' },
            { role: 'assistant', text: 'You have 8 active subscriptions totaling $127.50/month: Netflix ($15.99), Spotify ($9.99), Adobe Creative Cloud ($52.99), and 5 others. Would you like to see the full list?' }
          ]
        }
      ];

      threadSelector.addEventListener('change', (e) => {
        const threadId = e.target.value;
        const thread = threads.find(t => t.id === threadId);
        if (thread) {
          this.loadThread(thread);
        }
      });
    },

    loadThread(thread) {
      const container = document.getElementById('ai-chat-messages');
      if (!container) return;

      container.innerHTML = '';
      thread.messages.forEach(msg => {
        this.addMessage(container, msg.text, msg.role);
      });
    },

    escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }
  };

  // Dashboard Account Switcher
  const DashboardSwitcher = {
    init() {
      const switchers = document.querySelectorAll('[data-switch-account]');
      switchers.forEach(switcher => {
        switcher.addEventListener('change', (e) => {
          const accountId = e.target.value;
          this.switchAccount(accountId);
        });
      });
    },

    switchAccount(accountId) {
      // Hide all account sections
      document.querySelectorAll('.account-section').forEach(section => {
        section.style.display = 'none';
      });

      // Show selected account
      const selected = document.getElementById(`account-${accountId}`);
      if (selected) {
        selected.style.display = 'block';
      }
    }
  };

  // Auth simulation for prototype
  const AuthSim = {
    key: 'jualuma_session',
    fakeUser: { email: 'demo@jualuma.com', password: 'Demo1234!' },
    init() {
      this.enforceAuth();
      this.bindForms();
      this.bindLogout();
      this.bindDemoLogin();
    },
    isAuthed() {
      try {
        const session = localStorage.getItem(this.key);
        return !!session;
      } catch (e) {
        return false;
      }
    },
    saveSession(email) {
      localStorage.setItem(this.key, JSON.stringify({ email, ts: Date.now() }));
    },
    clearSession() {
      localStorage.removeItem(this.key);
    },
    enforceAuth() {
      const path = window.location.pathname;
      const page = path.split('/').pop() || 'index.html';
      const requiresAuth = [
        'dashboard',
        'ai-assistant',
        'settings',
        'connect-accounts',
        'categories'
      ];
      const needsAuth = requiresAuth.some(p => page.includes(p));
      if (needsAuth && !this.isAuthed()) {
        const next = encodeURIComponent(page);
        window.location.href = `login.html?next=${next}`;
      }
    },
    bindForms() {
      const loginForm = document.querySelector('form[data-auth="login"]');
      const signupForm = document.querySelector('form[data-auth="signup"]');
      if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
          e.preventDefault();
          const email = loginForm.querySelector('#email')?.value || '';
          const pwd = loginForm.querySelector('#password')?.value || '';
          if ((email === this.fakeUser.email && pwd === this.fakeUser.password) || (email && pwd.length >= 6)) {
            this.saveSession(email);
            Toast.show('Logged in (prototype)', 'success');
            const params = new URLSearchParams(window.location.search);
            const next = this.sanitizeNext(params.get('next'));
            window.location.href = next || 'dashboard.html';
          } else {
            Toast.show('Invalid credentials (use demo@jualuma.com / Demo1234!)', 'error');
          }
        });
      }
      if (signupForm) {
        signupForm.addEventListener('submit', (e) => {
          e.preventDefault();
          const email = signupForm.querySelector('#email')?.value || '';
          const pwd = signupForm.querySelector('#password')?.value || '';
          if (email && pwd.length >= 6) {
            this.saveSession(email);
            Toast.show('Account created (prototype)', 'success');
            window.location.href = 'dashboard.html';
          } else {
            Toast.show('Enter a valid email and password', 'error');
          }
        });
      }
    },
    bindLogout() {
      document.querySelectorAll('.logout-link').forEach(link => {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          this.clearSession();
          window.location.href = 'index.html';
        });
      });
    },
    bindDemoLogin() {
      document.querySelectorAll('[data-demo-login]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          this.saveSession(this.fakeUser.email);
          Toast.show('Logged in as demo@jualuma.com (prototype)', 'success');
          window.location.href = 'dashboard.html';
        });
      });
    },
    sanitizeNext(nextParam) {
      if (!nextParam) return null;
      try {
        const decoded = decodeURIComponent(nextParam);
        const file = decoded.split('/').pop() || '';
        const allowed = [
          'dashboard.html',
          'ai-assistant.html',
          'settings.html',
          'connect-accounts.html',
          'categories.html'
        ];
        return allowed.includes(file) ? file : null;
      } catch (e) {
        return null;
      }
    }
  };

  // Feature Preview / Paywall System
  const FeaturePreview = {
    // Hardcoded tier mapping for static prototype
    featureRequirements: {
      'ai.cloud': 'pro',
      'investment.advanced': 'pro',
      'aggregation.advanced': 'essential'
    },

    // Mock current tier (set via data-user-tier on body, defaults to 'free')
    getCurrentTier() {
      const tier = document.body.getAttribute('data-user-tier') || 'free';
      return tier;
    },

    isPremiumFeature(featureKey) {
      const requiredTier = this.featureRequirements[featureKey];
      if (!requiredTier) return false;

      const tierOrder = { 'free': 0, 'essential': 1, 'pro': 2, 'ultimate': 3 };
      const currentTier = tierOrder[this.getCurrentTier()] || 0;
      const requiredTierLevel = tierOrder[requiredTier] || 0;

      return currentTier < requiredTierLevel;
    },

    init() {
      const previewElements = document.querySelectorAll('[data-feature-preview]');
      previewElements.forEach(element => {
        const featureKey = element.getAttribute('data-feature-preview');
        if (this.isPremiumFeature(featureKey)) {
          this.wrapPremiumSection(element, featureKey);
        }
      });
    },

    wrapPremiumSection(element, featureKey) {
      // Add wrapper class
      element.classList.add('feature-preview-wrapper');

      // Create overlay
      const overlay = document.createElement('div');
      overlay.className = 'feature-preview-overlay';
      overlay.setAttribute('aria-hidden', 'true');

      // Create badge
      const badge = document.createElement('div');
      badge.className = 'feature-preview-badge';
      badge.textContent = 'Premium';
      badge.setAttribute('aria-label', 'Premium feature');

      // Insert overlay and badge
      element.style.position = 'relative';
      element.appendChild(overlay);
      element.appendChild(badge);

      // Block interactions on interactive elements
      const interactiveElements = element.querySelectorAll('button, input, select, textarea, a[href], [role="button"], [tabindex]:not([tabindex="-1"])');
      interactiveElements.forEach(el => {
        el.classList.add('feature-preview-blocked');
        el.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.showPaywallModal(featureKey);
        });
        el.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            this.showPaywallModal(featureKey);
          }
        });
      });

      // Block form submissions
      const forms = element.querySelectorAll('form');
      forms.forEach(form => {
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          this.showPaywallModal(featureKey);
        });
      });
    },

    showPaywallModal(featureKey) {
      // Create or show paywall modal
      let modal = document.getElementById('paywall-modal');
      if (!modal) {
        modal = this.createPaywallModal();
        document.body.appendChild(modal);
      }

      // Update modal content based on feature
      const featureNames = {
        'ai.cloud': 'AI-Powered Financial Analysis',
        'investment.advanced': 'Investment Account Aggregation',
        'aggregation.advanced': 'Advanced Account Aggregation'
      };

      const featureName = featureNames[featureKey] || 'Premium Feature';
      const title = modal.querySelector('.paywall-title');
      if (title) title.textContent = `Upgrade to Access ${featureName}`;

      // Show modal
      ModalSystem.open('paywall-modal');
    },

    createPaywallModal() {
      const modal = document.createElement('div');
      modal.id = 'paywall-modal';
      modal.className = 'modal';
      modal.setAttribute('aria-hidden', 'true');
      modal.setAttribute('aria-modal', 'true');
      modal.setAttribute('role', 'dialog');

      modal.innerHTML = `
        <div class="modal-content">
          <button class="modal-close" aria-label="Close modal">&times;</button>
          <h2 class="paywall-title">Upgrade to Access Premium Feature</h2>
          <p>This feature is available with Essential, Pro, or Ultimate plans.</p>
          <div class="paywall-tier-comparison">
            <div class="card">
              <h3>Essential</h3>
              <p class="price">$10<span>/month</span></p>
              <ul>
                <li>75 AI queries/day</li>
                <li>5 accounts per type</li>
                <li>30-day data retention</li>
              </ul>
              <a href="pricing.html" class="btn btn-primary">View Plans</a>
            </div>
            <div class="card">
              <h3>Pro</h3>
              <p class="price">$20<span>/month</span></p>
              <ul>
                <li>75 AI queries/day</li>
                <li>Investment accounts</li>
                <li>Full data retention</li>
                <li>7-day free trial</li>
              </ul>
              <a href="pricing.html" class="btn btn-primary">View Plans</a>
            </div>
            <div class="card">
              <h3>Ultimate</h3>
              <p class="price">$60<span>/month</span></p>
              <ul>
                <li>100 AI queries/day</li>
                <li>Unlimited accounts</li>
                <li>Advanced AI models</li>
                <li>Family features</li>
              </ul>
              <a href="pricing.html" class="btn btn-primary">View Plans</a>
            </div>
          </div>
        </div>
      `;

      return modal;
    }
  };


  // Initialize everything when DOM is ready
  function init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
      return;
    }

    ThemeManager.init();
    MobileNav.init();
    NavHighlight.init();
    TabSystem.init();
    ModalSystem.init();
    FormHandler.init();
    AIChat.init();
    DashboardSwitcher.init();
    AuthSim.init();
    FeaturePreview.init();

    // Service Worker - register for PWA support
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('Service Worker registered:', registration.scope);
        })
        .catch((error) => {
          console.warn('Service Worker registration failed:', error);
        });
    }

    Timeframes.init();
  }

  // Timeframe handling
  const DATASETS = {
    '1w': {
      netWorth: '$247,890', netWorthChange: '↑ 0.4% this week',
      cashFlow: '+$920', cashFlowBreakdown: 'Income: $2,300 | Expenses: $1,380',
      budgetPercent: '22%', budgetAmount: '$825 of $3,750 spent', accounts: '8',
      cashflowLabels: ['+$1.1k', '+$1.3k', '-$0.8k', '-$0.7k'],
      networthChart: { startLabel: '$246k', endLabel: '$248k', subtitle: 'Past 7 days', points: '0,70 50,68 100,65 150,60 200,55 250,52 300,50' }
    },
    '1m': {
      netWorth: '$247,890', netWorthChange: '↑ 3.2% this month',
      cashFlow: '+$2,450', cashFlowBreakdown: 'Income: $6,200 | Expenses: $3,750',
      budgetPercent: '68%', budgetAmount: '$2,550 of $3,750 spent', accounts: '8',
      cashflowLabels: ['+$3.8k', '+$6.2k', '-$2.7k', '-$2.0k'],
      networthChart: { startLabel: '$240k', endLabel: '$248k', subtitle: 'Past 30 days', points: '0,90 50,85 100,78 150,70 200,60 250,55 300,50' }
    },
    '3m': {
      netWorth: '$243,200', netWorthChange: '↑ 6.5% last 3 months',
      cashFlow: '+$6,780', cashFlowBreakdown: 'Income: $18,400 | Expenses: $11,620',
      budgetPercent: '64%', budgetAmount: '$7,100 of $11,000 spent', accounts: '8',
      cashflowLabels: ['+$5.5k', '+$6.8k', '-$2.4k', '-$3.1k'],
      networthChart: { startLabel: '$228k', endLabel: '$243k', subtitle: 'Past 3 months', points: '0,100 50,95 100,85 150,75 200,65 250,55 300,50' }
    },
    '6m': {
      netWorth: '$238,400', netWorthChange: '↑ 9.8% last 6 months',
      cashFlow: '+$11,200', cashFlowBreakdown: 'Income: $37,800 | Expenses: $26,600',
      budgetPercent: '66%', budgetAmount: '$14,700 of $22,300 spent', accounts: '8',
      cashflowLabels: ['+$6.0k', '+$8.2k', '-$4.0k', '-$2.0k'],
      networthChart: { startLabel: '$217k', endLabel: '$238k', subtitle: 'Past 6 months', points: '0,110 50,105 100,90 150,75 200,60 250,52 300,45' }
    },
    '1y': {
      netWorth: '$229,500', netWorthChange: '↑ 14.1% last year',
      cashFlow: '+$18,900', cashFlowBreakdown: 'Income: $74,200 | Expenses: $55,300',
      budgetPercent: '71%', budgetAmount: '$18,200 of $25,500 spent', accounts: '8',
      cashflowLabels: ['+$7.2k', '+$9.1k', '-$5.1k', '-$3.2k'],
      networthChart: { startLabel: '$201k', endLabel: '$230k', subtitle: 'Past 12 months', points: '0,115 50,110 100,95 150,80 200,65 250,50 300,40' }
    },
    'ytd': {
      netWorth: '$247,890', netWorthChange: '↑ 1.2% YTD',
      cashFlow: '+$1,320', cashFlowBreakdown: 'Income: $7,400 | Expenses: $6,080',
      budgetPercent: '36%', budgetAmount: '$1,350 of $3,750 spent', accounts: '8',
      cashflowLabels: ['+$2.1k', '+$2.6k', '-$1.8k', '-$1.5k'],
      networthChart: { startLabel: '$245k', endLabel: '$248k', subtitle: 'Year to date', points: '0,95 50,90 100,82 150,72 200,62 250,55 300,50' }
    }
  };

  const Timeframes = {
    init() {
      this.currentPeriod = '1m';
      this.bindGlobal();
      this.bindCustomPeriod();
    },
    bindGlobal() {
      const buttons = document.querySelectorAll('.timeframe-btn');
      buttons.forEach(btn => {
        btn.addEventListener('click', () => {
          buttons.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const tf = btn.getAttribute('data-timeframe');
          this.currentPeriod = tf;
          this.updateAll(tf);
        });
      });
    },
    bindCustomPeriod() {
      const startInput = document.getElementById('custom-start-date');
      const endInput = document.getElementById('custom-end-date');
      const applyBtn = document.getElementById('apply-custom-period');

      if (startInput && endInput && applyBtn) {
        applyBtn.addEventListener('click', () => {
          const start = startInput.value;
          const end = endInput.value;
          if (start && end && start <= end) {
            // Clear preset button active state
            document.querySelectorAll('.timeframe-btn').forEach(b => b.classList.remove('active'));
            // Update charts with custom period (for prototype, use closest preset)
            // In production, this would fetch data for the custom date range
            this.updateAll('1m'); // Placeholder - would use actual date range
          } else {
            Toast.show('Please select valid start and end dates', 'error');
          }
        });
      }
    },
    updateAll(tf) {
      this.updateSection('summary', tf);
      this.updateSection('cashflow', tf);
      this.updateSection('transactions', tf);
      this.updateNetworthChart(tf);
    },
    updateNetworthChart(tf) {
      const data = DATASETS[tf] || DATASETS['1m'];
      const chartData = data.networthChart;
      if (!chartData) return;

      const subtitle = document.getElementById('networth-subtitle');
      const startLabel = document.getElementById('networth-start-label');
      const endLabel = document.getElementById('networth-end-label');
      const lineEl = document.querySelector('#networth-line polyline');
      const areaEl = document.querySelector('#networth-area polyline');
      const dotsEl = document.getElementById('networth-dots');

      if (subtitle) subtitle.textContent = chartData.subtitle;
      if (startLabel) startLabel.textContent = chartData.startLabel;
      if (endLabel) endLabel.textContent = chartData.endLabel;

      if (lineEl && chartData.points) {
        lineEl.setAttribute('points', chartData.points);
      }

      if (areaEl && chartData.points) {
        // Create area points (add bottom corners)
        const areaPoints = '0,120 ' + chartData.points + ' 320,120';
        areaEl.setAttribute('points', areaPoints);
      }

      // Update dots based on points
      if (dotsEl && chartData.points) {
        const pointPairs = chartData.points.split(' ').map(p => p.split(','));
        let dotsHtml = '';
        pointPairs.forEach(([x, y]) => {
          dotsHtml += `<circle cx="${x}" cy="${y}" r="4" />`;
        });
        dotsEl.innerHTML = dotsHtml;
      }
    },
    updateSection(section, tf) {
      const data = DATASETS[tf] || DATASETS['1m'];
      if (section === 'summary') {
        const nw = document.getElementById('net-worth-value');
        const nwc = document.getElementById('net-worth-change');
        const cf = document.getElementById('cashflow-value');
        const cfb = document.getElementById('cashflow-breakdown');
        const bp = document.getElementById('budget-percent');
        const ba = document.getElementById('budget-amount');
        const ac = document.getElementById('accounts-count');
        if (nw) nw.textContent = data.netWorth;
        if (nwc) nwc.textContent = data.netWorthChange;
        if (cf) cf.textContent = data.cashFlow;
        if (cfb) cfb.textContent = data.cashFlowBreakdown;
        if (bp) bp.textContent = data.budgetPercent;
        if (ba) ba.textContent = data.budgetAmount;
        if (ac) ac.textContent = data.accounts;
      }
      if (section === 'cashflow') {
        const lbls = data.cashflowLabels || [];
        const w1 = document.querySelector('.cf-week1');
        const w2 = document.querySelector('.cf-week2');
        const w3 = document.querySelector('.cf-week3');
        const w4 = document.querySelector('.cf-week4');
        if (w1 && lbls[0]) w1.textContent = lbls[0];
        if (w2 && lbls[1]) w2.textContent = lbls[1];
        if (w3 && lbls[2]) w3.textContent = lbls[2];
        if (w4 && lbls[3]) w4.textContent = lbls[3];
      }
      if (section === 'transactions') {
        // For static prototype, swap a label on the table caption or top row amount
        const firstAmount = document.querySelector('#transactions-body td.amount');
        if (firstAmount) firstAmount.textContent = data.cashflowLabels?.[0] || '-$5.45';
      }
    }
  }

  // Start
  init();

  // Export for global access
  window.jualuma = {
    Toast,
    Modal: ModalSystem,
    Theme: ThemeManager
  };
})();

