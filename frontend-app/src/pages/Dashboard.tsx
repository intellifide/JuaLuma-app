// Core Purpose: Main dashboard for personal and household financial insights.
// Last Modified: 2026-01-26 09:30 CST

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useAccounts } from '../hooks/useAccounts';
import { useBudget } from '../hooks/useBudget';
import { useTransactions } from '../hooks/useTransactions';
import { useNetWorth, useCashFlow, useSpendingByCategory } from '../hooks/useAnalytics';
import { Transaction } from '../types';
import { useToast } from '../components/ui/Toast';
import { PlaidLinkButton } from '../components/PlaidLinkButton';
import { Modal } from '../components/ui/Modal';
import Switch from '../components/ui/Switch';
import { householdService } from '../services/householdService';
import { eventTracking, SignupFunnelEvent } from '../services/eventTracking';
import { TRANSACTION_CATEGORIES } from '../constants/transactionCategories';
import { loadTransactionPreferences } from '../utils/transactionPreferences';

// Removed static BUDGET_CAP

// Helpers for Date Management
// Format a local date to YYYY-MM-DD for API params.
const formatDateParam = (value: Date) => {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, '0');
  const day = `${value.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Transactions date range mirrors Transactions page behavior.
const getTransactionsDateRange = (timeframe: string) => {
  const end = new Date();
  const start = new Date(end);

  switch (timeframe) {
    case '1w':
      start.setDate(end.getDate() - 7);
      break;
    case '1m':
      start.setDate(end.getDate() - 30);
      break;
    case '3m':
      start.setDate(end.getDate() - 90);
      break;
    case '6m':
      start.setDate(end.getDate() - 180);
      break;
    case '1y':
      start.setDate(end.getDate() - 365);
      break;
    case 'ytd':
      start.setFullYear(end.getFullYear(), 0, 1);
      break;
    case 'all':
      return { start: undefined, end: undefined };
    default:
      start.setDate(end.getDate() - 30);
  }
  return {
    start: formatDateParam(start),
    end: formatDateParam(end),
  };
};

// Resolve a comparable timestamp for consistent transaction ordering.
const getTransactionTimestamp = (txn: Transaction) => {
  const primary = Date.parse(txn.ts);
  if (!Number.isNaN(primary)) return primary;
  const fallback = txn.createdAt ? Date.parse(txn.createdAt) : Number.NaN;
  return Number.isNaN(fallback) ? 0 : fallback;
};

// Normalize a date to local midnight to avoid time drift in params.
const startOfDay = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate());

// Calculate the number of days in a month for safe date clamping.
const getDaysInMonth = (year: number, monthIndex: number) => new Date(year, monthIndex + 1, 0).getDate();

// Shift a date by months while clamping to the target month length.
const shiftMonthsSafe = (value: Date, deltaMonths: number, alignToMonthStart = false) => {
  const baseYear = value.getFullYear();
  const baseMonth = value.getMonth();
  const monthIndex = baseMonth + deltaMonths;
  const targetYear = baseYear + Math.floor(monthIndex / 12);
  const targetMonth = ((monthIndex % 12) + 12) % 12;
  const targetDay = alignToMonthStart
    ? 1
    : Math.min(value.getDate(), getDaysInMonth(targetYear, targetMonth));
  return new Date(targetYear, targetMonth, targetDay);
};

// Resolve date ranges for analytics views with consistent month boundaries.
const getDateRange = (timeframe: string) => {
  const end = startOfDay(new Date());
  let start = new Date(end);
  let nwInterval: 'daily' | 'weekly' | 'monthly' = 'daily';
  let cfInterval: 'week' | 'month' = 'week';

  switch (timeframe) {
    case '1w':
      start.setDate(end.getDate() - 6);
      nwInterval = 'daily';
      cfInterval = 'week';
      break;
    case '1m':
      // Rolling month window with safe month shifting.
      start = shiftMonthsSafe(end, -1);
      nwInterval = 'daily';
      cfInterval = 'week';
      break;
    case '3m':
      // Align to full months to prevent missing month buckets.
      start = shiftMonthsSafe(end, -2, true);
      nwInterval = 'weekly';
      cfInterval = 'month';
      break;
    case '6m':
      // Align to full months to prevent missing month buckets.
      start = shiftMonthsSafe(end, -5, true);
      nwInterval = 'weekly';
      cfInterval = 'month';
      break;
    case '1y':
      // Align to full months for clean yearly trend buckets.
      start = shiftMonthsSafe(end, -11, true);
      nwInterval = 'monthly';
      cfInterval = 'month';
      break;
    case 'ytd':
      // Year to date - start from January 1st of current year.
      start.setMonth(0, 1);
      nwInterval = 'monthly';
      cfInterval = 'month';
      break;
    case 'all':
      // Go back 5 years aligned to the start of the month.
      start = shiftMonthsSafe(end, -59, true);
      nwInterval = 'monthly';
      cfInterval = 'month';
      break;
    default: // 1m default
      start = shiftMonthsSafe(end, -1);
  }
  return {
    start: formatDateParam(start),
    end: formatDateParam(end),
    nwInterval,
    cfInterval
  };
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

const formatCompactCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: "compact", maximumFractionDigits: 1 }).format(value);

const CATEGORIES = TRANSACTION_CATEGORIES;

export default function Dashboard() {
  const { user, profile } = useAuth();
  // Global Data Scope (Personal vs Family)
  const [dashboardScope, setDashboardScope] = useState<'personal' | 'household'>('personal');
  const { accounts, refetch: refetchAccounts } = useAccounts({
    filters: { scope: dashboardScope }
  });
  const isUltimate = Boolean(profile?.plan?.toLowerCase().includes('ultimate'));
  const isHouseholdAdmin = profile?.household_member?.role === 'admin';
  const canViewHousehold = Boolean(profile?.household_member?.can_view_household);
  const canSeeScopeToggle = (isUltimate && isHouseholdAdmin) || canViewHousehold;
  // Show responsible person column for Ultimate tier or household members with view permission
  const shouldShowResponsiblePerson = isUltimate || canViewHousehold;

  const [timeframe, setTimeframe] = useState('1m');
  const { start, end, nwInterval, cfInterval } = useMemo(() => getDateRange(timeframe), [timeframe]);
  
  // Load transaction preferences from localStorage and listen for changes
  const [transactionPreferences, setTransactionPreferences] = useState(() => loadTransactionPreferences());
  
  // Listen for localStorage changes to update preferences in real-time
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'jualuma_transaction_preferences' && e.newValue) {
        try {
          setTransactionPreferences(JSON.parse(e.newValue));
        } catch (err) {
          console.warn('Failed to parse transaction preferences from storage event:', err);
        }
      }
    };
    
    // Also check for changes periodically (in case storage event doesn't fire in same tab)
    const intervalId = setInterval(() => {
      const current = loadTransactionPreferences();
      setTransactionPreferences(prev => {
        // Only update if preferences actually changed
        if (JSON.stringify(prev) !== JSON.stringify(current)) {
          return current;
        }
        return prev;
      });
    }, 2000); // Check every 2 seconds
    
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(intervalId);
    };
  }, []);
  
  // For transactions list, use saved preferences for filters
  // Build exclude account types based on saved preferences
  const excludeAccountTypes = useMemo(() => {
    const excludes: string[] = []
    if (!transactionPreferences.includeWeb3) excludes.push('web3')
    if (!transactionPreferences.includeCEX) excludes.push('cex')
    return excludes.length > 0 ? excludes.join(',') : undefined
  }, [transactionPreferences.includeWeb3, transactionPreferences.includeCEX])

  // Build isManual filter from preferences
  const isManualFilterValue = useMemo(() => {
    if (transactionPreferences.isManualFilter === 'all') return undefined
    return transactionPreferences.isManualFilter === 'manual'
  }, [transactionPreferences.isManualFilter])

  // Build analytics filters from transaction preferences
  const analyticsFilters = useMemo(() => ({
    excludeAccountTypes,
    category: transactionPreferences.category || undefined,
    isManual: isManualFilterValue,
  }), [excludeAccountTypes, transactionPreferences.category, isManualFilterValue])

  // Use saved transaction timeframe to keep dashboard in sync with transactions page
  const { start: transactionsStart, end: transactionsEnd } = useMemo(
    () => getTransactionsDateRange(transactionPreferences.timeframe),
    [transactionPreferences.timeframe],
  );
  const [transactionsPage, setTransactionsPage] = useState(1);
  const [transactionsPageSize, setTransactionsPageSize] = useState(transactionPreferences.pageSize);
  const { transactions, total: transactionsTotal, updateOne, refetch: refetchTransactions } = useTransactions({
    filters: {
      scope: dashboardScope,
      from: transactionsStart,
      to: transactionsEnd,
      page: transactionsPage,
      pageSize: transactionsPageSize,
      category: transactionPreferences.category || undefined,
      excludeAccountTypes,
      isManual: isManualFilterValue,
      sortBy: transactionPreferences.sortBy,
    }
  });
  const [notesHoverId, setNotesHoverId] = useState<string | null>(null);
  const notesHoverTimeout = useRef<number | null>(null);
  const { budgets } = useBudget(dashboardScope);
  const toast = useToast();

  const handlePlaidSuccess = () => {
    toast.show('Account connected successfully', 'success');
    refetchAccounts();
    refetchTransactions();
  };

  const handlePlaidError = (message: string) => {
    toast.show(message, 'error');
  };

  const handleCategoryChange = async (id: string, newCategory: string) => {
    try {
      await updateOne(id, { category: newCategory });
      toast.show('Category updated', 'success');
    } catch (err) {
      toast.show('Failed to update category', 'error');
    }
  };

  


  // Invite Member State
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteIsMinor, setInviteIsMinor] = useState(false);
  const [inviteCanViewHousehold, setInviteCanViewHousehold] = useState(true);
  const [sendingInvite, setSendingInvite] = useState(false);

  // Keep the dashboard scope aligned with the user's household access.
  useEffect(() => {
    if (!canSeeScopeToggle && dashboardScope === 'household') {
      setDashboardScope('personal');
    }
  }, [canSeeScopeToggle, dashboardScope]);

  useEffect(() => {
    setTransactionsPage(1);
  }, [
    dashboardScope,
    transactionsPageSize,
    transactionPreferences.timeframe,
    transactionPreferences.category,
    excludeAccountTypes,
    isManualFilterValue,
    transactionPreferences.sortBy,
  ]);

  const handleInviteClick = async () => {
    const isUltimate = profile?.plan?.toLowerCase().includes('ultimate');
    if (!isUltimate) {
       toast.show("Upgrade to Ultimate to invite family members.", "error");
       return;
    }

    try {
      await householdService.getMyHousehold();
      setInviteModalOpen(true);
    } catch (e) {
      try {
        // Auto-create household if missing (common for new Ultimate users)
        await householdService.createHousehold({ name: 'My Household' });
        setInviteModalOpen(true);
      } catch (createErr) {
        toast.show("Failed to initialize household. Please contact support.", "error");
      }
    }
  };

  const sendInvite = async () => {
    if (!inviteEmail) return;
    setSendingInvite(true);
    try {
      await householdService.inviteMember({ 
        email: inviteEmail, 
        is_minor: inviteIsMinor,
        can_view_household: inviteCanViewHousehold
      });
      toast.show(`Invite sent to ${inviteEmail}`, 'success');
      setInviteModalOpen(false);
      setInviteEmail('');
      setInviteIsMinor(false);
      setInviteCanViewHousehold(true);
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail 
        || (err instanceof Error ? err.message : "Failed to send invite.");
      toast.show(message, "error");
    } finally {
      setSendingInvite(false);
    }
  };

  // Track when user reaches dashboard (final step of signup funnel)
  React.useEffect(() => {
    eventTracking.trackSignupFunnel(SignupFunnelEvent.DASHBOARD_REACHED)
  }, [])

  React.useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const sessionId = query.get('session_id');
    if (sessionId) {
       // Ideally verify via backend
       import('../services/billing').then(({ verifyCheckoutSession }) => {
          verifyCheckoutSession(sessionId)
            .then(() => {
                toast.show('Subscription confirmed!', 'success');
                // Remove param from URL
                const url = new URL(window.location.href);
                url.searchParams.delete('session_id');
                window.history.replaceState({}, '', url.toString());
                // Force reload of user profile
                // Note: refetchAccounts / refetchTransactions might be needed if features are gated
                window.location.reload(); // Simple brute force to ensure all state (profile, etc) updates
            })
            .catch(() => {
                toast.show('Payment verification pending...', 'error');
            });
       });
    }
  }, [toast]);

  const { data: nwData, loading: nwLoading } = useNetWorth(start, end, nwInterval, dashboardScope, analyticsFilters);
  const { data: cfData, loading: cfLoading } = useCashFlow(start, end, cfInterval, dashboardScope, analyticsFilters);
  const { data: spendData } = useSpendingByCategory(start, end, dashboardScope, analyticsFilters);

  // Computed Values for Cards
  const totalBalance = useMemo(() => accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0), [accounts]);

  // Transactions Table (Paginated)
  const recentTransactions = useMemo(() => {
    // Keep most-recent-first ordering stable even with missing timestamps.
    return [...transactions].sort((a, b) => {
      const aTime = getTransactionTimestamp(a);
      const bTime = getTransactionTimestamp(b);
      if (bTime !== aTime) return bTime - aTime;
      return b.id.localeCompare(a.id);
    });
  }, [transactions]);




  // Budget calculations - only include categories with budgets set
  const { budgetSpent, totalBudget } = useMemo(() => {
    if (!spendData?.data || budgets.length === 0) {
      return { budgetSpent: 0, totalBudget: 0 };
    }
    
    // Create a map of budget amounts by category, only for enabled budgets
    const budgetsByCategory = new Map<string, number>();
    budgets.forEach(b => {
      if (b.alert_enabled) {
        const existing = budgetsByCategory.get(b.category) || 0;
        budgetsByCategory.set(b.category, existing + b.amount);
      }
    });
    
    // Calculate total budget (enabled only)
    const total = Array.from(budgetsByCategory.values()).reduce((sum, amount) => sum + amount, 0);
    
    // Calculate spending only for categories with enabled budgets
    const spent = spendData.data
      .filter(item => budgetsByCategory.has(item.category))
      .reduce((sum, item) => sum + item.amount, 0);
    
    return { budgetSpent: spent, totalBudget: total };
  }, [spendData, budgets]);

  const budgetPercent = totalBudget > 0 ? Math.min(100, (budgetSpent / totalBudget) * 100) : 0;

  // Cash Flow Card Sums
  const cashFlowStats = useMemo(() => {
    if (!cfData) return { income: 0, expense: 0, net: 0 };
    const income = cfData.income.reduce((sum, d) => sum + d.value, 0);
    const expense = cfData.expenses.reduce((sum, d) => sum + Math.abs(d.value), 0); // Display as positive
    return { income, expense, net: income - expense };
  }, [cfData]);

  const totalTransactionPages = Math.max(
    1,
    Math.ceil((transactionsTotal || 0) / transactionsPageSize)
  );
  const hasPrevTransactionsPage = transactionsPage > 1;
  const hasNextTransactionsPage = transactionsPage < totalTransactionPages;
  const transactionRangeStart = transactionsTotal
    ? (transactionsPage - 1) * transactionsPageSize + 1
    : 0;
  const transactionRangeEnd = transactionsTotal
    ? Math.min(transactionsTotal, (transactionsPage - 1) * transactionsPageSize + transactions.length)
    : 0;

  return (
    <section className="container mx-auto py-10 px-4 space-y-8">

      {/* Header */}
      <div className="glass-panel p-6 flex flex-col md:flex-row justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Dashboard</h1>
          <p className="text-text-secondary mt-1">Welcome back, {profile?.username || user?.displayName || 'there'}</p>
        </div>
      </div>

      {/* Timeframe Controls */}
      <div className="glass-panel mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="timeframe-controls">
          <div className="section-timeframe-wrapper">
            <span className="section-timeframe-label">View Period:</span>
            <div className="timeframe-selector" role="group" aria-label="Select time period">
              {['1w', '1m', '3m', '6m', '1y', 'ytd', 'all'].map((tf) => (
                <button
                  key={tf}
                  className={`timeframe-btn ${timeframe === tf ? 'active' : ''}`}
                  onClick={() => setTimeframe(tf)}
                >
                  {tf.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
        
        {/* Scope Toggle & Invite */}
        <div className="flex items-center gap-4">
          {canSeeScopeToggle && (
            <div className="flex bg-white/5 border border-white/10 rounded-lg p-1">
              <button
                onClick={() => setDashboardScope('personal')}
                className={`px-3 py-1 text-sm rounded-md transition-all ${
                  dashboardScope === 'personal'
                    ? 'bg-primary text-white shadow font-medium'
                    : 'text-text-muted hover:text-text-secondary'
                }`}
              >
                Personal
              </button>
              <button
                onClick={() => {
                  const isUltimate = profile?.plan?.toLowerCase().includes('ultimate');
                  const hasHouseholdPermission = profile?.household_member?.can_view_household;

                  if (!isUltimate && !hasHouseholdPermission) {
                    toast.show("Upgrade to Ultimate or join a household to view Family metrics.", "error");
                    return;
                  }
                  setDashboardScope('household');
                }}
                className={`px-3 py-1 text-sm rounded-md transition-all ${
                  dashboardScope === 'household'
                    ? 'bg-primary text-white shadow font-medium'
                    : 'text-text-muted hover:text-text-secondary'
                } ${!profile?.plan?.toLowerCase().includes('ultimate') && !profile?.household_member?.can_view_household ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Family
              </button>
            </div>
          )}
          
          {profile?.plan?.toLowerCase().includes('ultimate') && (
            <button 
              onClick={handleInviteClick}
              className="text-xs font-medium text-primary border border-primary/30 rounded px-2 py-1.5 hover:bg-primary/10 transition-colors flex items-center gap-1"
            >
              <span>+</span> Invite Member
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {/* Net Worth */}
        <div className="card">
          <h3 className="text-sm text-text-muted mb-2">Net Worth</h3>
          <p id="net-worth-value" className="text-3xl font-bold text-primary">
            {nwLoading ? '...' : formatCurrency(nwData?.data?.[nwData.data.length - 1]?.value || totalBalance)}
          </p>
          <div className="text-sm mt-1">
            {/* Change calculation could be done here if needed */}
            <span className="text-text-muted">Current</span>
          </div>
        </div>

        {/* Cash Flow */}
        <div className="card">
          <h3 className="text-sm text-text-muted mb-2">Cash Flow</h3>
          <p id="cashflow-value" className={`text-3xl font-bold ${cashFlowStats.net >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {cfLoading ? '...' : formatCurrency(cashFlowStats.net)}
          </p>
          <p className="text-sm text-text-muted mt-1">
            In: <span className="text-emerald-400">{formatCompactCurrency(cashFlowStats.income)}</span> • Out: <span className="text-rose-400">{formatCompactCurrency(cashFlowStats.expense)}</span>
          </p>
        </div>

        {/* Budget */}
        <div className="card">
          <h3 className="text-sm text-text-muted mb-2">Budget Status</h3>
          <p className="text-3xl font-bold text-primary">{budgetPercent.toFixed(0)}%</p>
          <p className="text-sm text-text-muted mt-1">
            {formatCompactCurrency(budgetSpent)} of {formatCompactCurrency(totalBudget)} spent
          </p>
          <div className="w-full bg-white/10 rounded-full h-2 mt-2" aria-label="Budget usage">
            <div className="h-2 rounded-full bg-primary" style={{ width: `${budgetPercent}%` }} />
          </div>
        </div>

        {/* Accounts Count */}
        <div className="card">
          <h3 className="text-sm text-text-muted mb-2">Linked Accounts</h3>
          <p className="text-3xl font-bold text-royal-purple">{accounts.length}</p>
          <p className="text-sm text-text-muted mt-1">Active connections</p>
        </div>
      </div>

      <div className="flex justify-end mb-10">
        <PlaidLinkButton onSuccess={handlePlaidSuccess} onError={handlePlaidError} />
      </div>

      {/* Transactions */}
      <div className="glass-panel mb-10">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-3 mb-6">
          <h2 className="text-xl font-semibold">Transactions</h2>
          <span className="text-xs text-text-muted">
            {transactionRangeStart}-{transactionRangeEnd} of {transactionsTotal || 0}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="table w-full">
            <thead>
              <tr className="text-left text-text-muted border-b border-white/10">
                <th className="pb-3">Date</th>
                <th className="pb-3">Description</th>
                <th className="pb-3">Category</th>
                {shouldShowResponsiblePerson && <th className="pb-3">User</th>}
                <th className="pb-3">Amount</th>
              </tr>
            </thead>
            <tbody>
              {recentTransactions.length === 0 ? (
                <tr>
                  <td colSpan={shouldShowResponsiblePerson ? 5 : 4} className="text-center py-6 text-text-muted italic">No transactions found</td>
                </tr>
              ) : (
                recentTransactions.map(txn => (
                  <tr key={txn.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 text-sm">{new Date(txn.ts).toLocaleDateString()}</td>
                    <td className="py-3 font-medium text-text-primary">
                      <div
                        className="relative inline-flex items-center"
                        onMouseEnter={() => {
                          if (!txn.description) return;
                          if (notesHoverTimeout.current) {
                            window.clearTimeout(notesHoverTimeout.current);
                          }
                          notesHoverTimeout.current = window.setTimeout(() => {
                            setNotesHoverId(txn.id);
                          }, 2000);
                        }}
                        onMouseLeave={() => {
                          if (notesHoverTimeout.current) {
                            window.clearTimeout(notesHoverTimeout.current);
                            notesHoverTimeout.current = null;
                          }
                          setNotesHoverId(null);
                        }}
                      >
                        <span>{txn.merchantName || txn.description || '—'}</span>
                        {txn.description && notesHoverId === txn.id && (
                          <div className="absolute left-0 top-full mt-2 min-w-64 max-w-md rounded-lg border border-white/10 bg-surface-1/90 p-3 text-xs text-text-secondary shadow-xl backdrop-blur z-50 break-words">
                            <p className="text-xs font-semibold text-text-primary mb-1">Notes</p>
                            <p className="text-xs text-text-secondary whitespace-pre-wrap break-all">{txn.description}</p>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3">
                      <select
                        className="bg-transparent border-none text-sm text-primary font-medium focus:ring-0 cursor-pointer"
                        value={txn.category || "Uncategorized"}
                        onChange={(e) => handleCategoryChange(txn.id, e.target.value)}
                      >
                        <option value="Uncategorized" disabled>Select...</option>
                        {CATEGORIES.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </td>
                    {shouldShowResponsiblePerson && (
                      <td className="py-3 text-sm text-text-muted">
                        {txn.userDisplayName || '—'}
                      </td>
                    )}
                    <td className={`py-3 text-right font-bold ${txn.amount < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {formatCurrency(txn.amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-6 flex justify-center">
          <div className="flex items-center gap-3">
            <label className="text-xs text-text-muted" htmlFor="transactions-page-size">Rows</label>
            <select
              id="transactions-page-size"
              className="bg-transparent border border-white/10 rounded-md text-sm px-2 py-1 text-text-secondary"
              value={transactionsPageSize}
              onChange={(e) => setTransactionsPageSize(Number(e.target.value))}
            >
              {[10, 25, 50, 100].map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
            <button
              className="btn btn-sm btn-outline"
              onClick={() => setTransactionsPage((p) => Math.max(1, p - 1))}
              disabled={!hasPrevTransactionsPage}
            >
              Prev
            </button>
            <button
              className="btn btn-sm btn-outline"
              onClick={() => setTransactionsPage((p) => Math.min(totalTransactionPages, p + 1))}
              disabled={!hasNextTransactionsPage}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <Modal
        open={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        title="Invite Family Member"
        footer={
          <div className="flex justify-end gap-2">
            <button 
              onClick={() => setInviteModalOpen(false)} 
              className="btn btn-ghost text-sm"
            >
              Cancel
            </button>
            <button 
              onClick={sendInvite} 
              disabled={sendingInvite || !inviteEmail}
              className="btn btn-primary text-sm"
            >
              {sendingInvite ? 'Sending...' : 'Send Invite'}
            </button>
          </div>
        }
      >
        <div className="space-y-4 py-2">
          <p className="text-sm text-text-muted">
            Enter the email address of the family member you wish to invite. They will receive an email with instructions to join your household.
          </p>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Email Address</label>
            <input 
              type="email" 
              className="form-input w-full" 
              placeholder="family@example.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-4 mt-4">
            <Switch 
              checked={inviteIsMinor}
              onChange={setInviteIsMinor}
              label="Is this member a minor?"
              description="Minors have restricted access to AI features."
            />
            
            <Switch 
              checked={inviteCanViewHousehold}
              onChange={setInviteCanViewHousehold}
              label="Allow viewing finances?"
              description="Enable access to shared household metrics."
              disabled={inviteIsMinor} 
            />
          </div>
        </div>
      </Modal>

    </section>
  );
}
