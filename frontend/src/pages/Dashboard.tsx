// Core Purpose: Main dashboard for personal and household financial insights.
// Last Modified: 2026-01-18 02:08 CST

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useAccounts } from '../hooks/useAccounts';
import { useTransactions } from '../hooks/useTransactions';
import { useNetWorth, useCashFlow, useSpendingByCategory } from '../hooks/useAnalytics';
import { PlaidLinkButton } from '../components/PlaidLinkButton';
import { Account } from '../types';
import { DataPoint } from '../services/analytics';
import { useToast } from '../components/ui/Toast';
import { Modal } from '../components/ui/Modal';
import Switch from '../components/ui/Switch';
import { householdService } from '../services/householdService';
import { eventTracking, SignupFunnelEvent } from '../services/eventTracking';

// Removed static BUDGET_CAP

// Helpers for Date Management
const getDateRange = (timeframe: string) => {
  const end = new Date();
  const start = new Date();
  let nwInterval: 'daily' | 'weekly' | 'monthly' = 'daily';
  let cfInterval: 'week' | 'month' = 'week';

  switch (timeframe) {
    case '1w':
      start.setDate(end.getDate() - 7);
      nwInterval = 'daily';
      cfInterval = 'week'; // or day if backend supported it, but we added day/week/month
      break;
    case '1m':
      start.setDate(end.getDate() - 30);
      nwInterval = 'daily';
      cfInterval = 'week';
      break;
    case '3m':
      start.setDate(end.getDate() - 90);
      nwInterval = 'weekly';
      cfInterval = 'week';
      break;
    case '6m':
      start.setDate(end.getDate() - 180);
      nwInterval = 'weekly';
      cfInterval = 'month';
      break;
    case '1y':
      start.setDate(end.getDate() - 365);
      nwInterval = 'monthly';
      cfInterval = 'month';
      break;
    case 'ytd':
      start.setMonth(0, 1);
      nwInterval = 'monthly';
      cfInterval = 'month';
      break;
    default: // 1m default
      start.setDate(end.getDate() - 30);
  }
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
    nwInterval,
    cfInterval
  };
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

const formatCompactCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: "compact", maximumFractionDigits: 1 }).format(value);


// SVG Generators
// SVG Generators
const generateLinePath = (data: DataPoint[], width: number, height: number) => {
  const padding = { top: 10, right: 10, bottom: 25, left: 45 };
  const drawWidth = width - padding.left - padding.right;
  const drawHeight = height - padding.top - padding.bottom;

  if (!data || data.length === 0) return { path: '', areaPath: '', dots: [], yLabels: [], xLabels: [], padding };

  const values = data.map(d => d.value);
  const min = Math.min(...values) * 0.98;
  const max = Math.max(...values) * 1.02;
  const range = max - min || 1;

  const points = data.map((d, i) => {
    const x = padding.left + (i / (data.length - 1)) * drawWidth;
    const y = padding.top + drawHeight - ((d.value - min) / range) * drawHeight;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const path = points.join(' ');
  const areaPath = `${padding.left},${padding.top + drawHeight} ${path} ${padding.left + drawWidth},${padding.top + drawHeight}`;

  // Y-axis labels (Value)
  const yLabels = [min, (min + max) / 2, max].map(val => ({
    label: formatCompactCurrency(val),
    y: padding.top + drawHeight - ((val - min) / range) * drawHeight
  }));

  // X-axis labels (Timeframe - start, mid, end)
  const xLabels = [0, Math.floor(data.length / 2), data.length - 1].map(i => ({
    label: new Date(data[i].date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    x: padding.left + (i / (data.length - 1)) * drawWidth
  }));

  // Select a few points to show dots (start, middle, end)
  const dotIndices = [0, Math.floor(data.length / 2), data.length - 1];
  const dots = dotIndices.map(i => {
    const p = points[i].split(',');
    return { cx: p[0], cy: p[1] };
  });

  return {
    path,
    areaPath,
    dots,
    yLabels,
    xLabels,
    padding
  };
};

const generateBarChart = (income: DataPoint[], expenses: DataPoint[], width: number, height: number, cfInterval: string) => {
  const padding = { top: 10, right: 10, bottom: 25, left: 45 };
  const drawWidth = width - padding.left - padding.right;
  const drawHeight = height - padding.top - padding.bottom;

  // Merge dates to ensure alignment
  const allDates = new Set([...income.map(d => d.date), ...expenses.map(d => d.date)]);
  const sortedDates = Array.from(allDates).sort();

  if (sortedDates.length === 0) return { bars: [], yLabels: [], padding };

  const dataMap: Record<string, { inc: number, exp: number }> = {};
  sortedDates.forEach(d => dataMap[d] = { inc: 0, exp: 0 });

  income.forEach(d => { if (dataMap[d.date]) dataMap[d.date].inc = d.value; });
  expenses.forEach(d => { if (dataMap[d.date]) dataMap[d.date].exp = Math.abs(d.value); });

  // Calculate max for scale
  let maxVal = 0;
  Object.values(dataMap).forEach(v => {
    maxVal = Math.max(maxVal, v.inc, v.exp);
  });
  maxVal = maxVal * 1.1 || 1000;

  const barWidth = (drawWidth / sortedDates.length) * 0.4;
  const gap = (drawWidth / sortedDates.length) * 0.1;

  const bars = sortedDates.map((date, i) => {
    const xBase = padding.left + (drawWidth / sortedDates.length) * i + gap;
    const vals = dataMap[date];

    const hInc = (vals.inc / maxVal) * drawHeight;
    const hExp = (vals.exp / maxVal) * drawHeight;

    return {
      date,
      xInc: xBase,
      yInc: padding.top + drawHeight - hInc,
      hInc,
      xExp: xBase + barWidth,
      yExp: padding.top + drawHeight - hExp,
      hExp,
      labelX: xBase + barWidth,
      label: (() => {
        const d = new Date(date);
        // If we are in 'week' view, the backend returns the start of the week (Mon).
        // User wants the end of the week (Dec 10, Dec 17 etc) for analysis.
        // We'll add 6 days to the start-of-week provided by Postgres date_trunc.
        if (cfInterval === 'week') {
          d.setDate(d.getDate() + 6);
          return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        }
        return d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
      })()
    };
  });

  // Y-axis labels
  const yLabels = [0, maxVal / 2, maxVal].map(val => ({
    label: formatCompactCurrency(val),
    y: padding.top + drawHeight - (val / maxVal) * drawHeight
  }));

  return { bars, yLabels, padding };
};


import { useBudget } from '../hooks/useBudget';

const BudgetTool = ({ categories, scope }: { categories: string[], scope: 'personal' | 'household' }) => {
  const { budgets, saveBudget } = useBudget(scope);
  const [editing, setEditing] = useState<string | null>(null);
  const [tempAmount, setTempAmount] = useState<string>('');
  const [expanded, setExpanded] = useState(false);

  // Budgets are only returned if they exist, so activeBudgets is just 'budgets'
  const activeBudgets = budgets;
  const showAll = expanded || activeBudgets.length === 0;

  // If showing all, use all categories. If collapsed, use only active budget categories.
  // Exception: If no budgets are set at all, we show all (or a message/CTA) but logically 'showAll' covers it if we force expansion or just render nothing?
  // User asked: "only displays what current budgets are set by default in its collapse view. if no budgets are set, the container should display a friendly message stating set your budget by category here."

  const categoriesToDisplay = showAll ? categories : activeBudgets.map(b => b.category);

  // If collapsed and no budgets, we display a message, so categoriesToDisplay might be empty or irrelevant
  const showEmptyMessage = !expanded && activeBudgets.length === 0;

  const getBudget = (cat: string) => {
    // In household scope, we might have multiple budget entries for the same category from different users.
    // We should sum them up for display.
    const matchingBudgets = budgets.filter(b => b.category === cat);
    if (matchingBudgets.length === 0) return undefined;
    
    return matchingBudgets.reduce((sum, b) => sum + b.amount, 0);
  };

  const handleEdit = (cat: string) => {
    setEditing(cat);
    setTempAmount(getBudget(cat)?.toString() || '');
  };

  const handleSave = (cat: string) => {
    const val = tempAmount === '' ? null : parseFloat(tempAmount);
    saveBudget(cat, val);
    setEditing(null);
  };

  return (
    <div className="glass-panel mb-10 transition-all duration-300">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Budget Goals</h2>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-sm font-medium text-royal-purple hover:underline"
        >
          {expanded ? 'Collapse' : (activeBudgets.length > 0 ? 'Edit / Show All' : 'Expand')}
        </button>
      </div>

      {showEmptyMessage ? (
        <div className="text-center py-6 rounded-lg border-2 border-dashed border-white/10 cursor-pointer hover:border-royal-purple/50 transition-colors" onClick={() => setExpanded(true)}>
          <p className="text-text-muted font-medium">Set your budget by category here</p>
          <p className="text-xs text-text-secondary mt-1">Click to expand and set goals</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {categoriesToDisplay.map(cat => (
              <div key={cat} className="p-4 border border-white/10 rounded-lg flex flex-col gap-2 relative bg-transparent hover:bg-white/5 transition-colors">
                <span className="font-medium text-sm text-text-muted">{cat}</span>
                {editing === cat ? (
                  <div className="flex gap-2">
                    <input
                      type="number"
                      className="input py-1 px-2 text-sm w-full bg-transparent border border-white/20 rounded text-text-primary"
                      value={tempAmount}
                      onChange={e => setTempAmount(e.target.value)}
                      placeholder="No Limit"
                      autoFocus
                    />
                    <button onClick={() => handleSave(cat)} className="btn btn-sm btn-primary">✓</button>
                  </div>
                ) : (
                  <div onClick={() => handleEdit(cat)} className="cursor-pointer rounded -ml-1 flex items-center gap-2 group">
                    <span className={`text-lg font-bold ${getBudget(cat) ? 'text-royal-purple' : 'text-text-muted italic'}`}>
                      {getBudget(cat) ? formatCurrency(getBudget(cat)!) : 'Not Set'}
                    </span>
                    <span className="opacity-0 group-hover:opacity-100 text-xs text-royal-purple">✎</span>
                  </div>
                )}
              </div>
            ))}
          </div>
          {expanded && <p className="text-xs text-text-muted mt-4">* Click on an amount to edit. Leave blank for no limit.</p>}
        </div>
      )}
    </div>
  );
};


const CATEGORIES = [
  "Housing", "Transportation", "Food", "Utilities", "Insurance", "Healthcare",
  "Savings", "Personal", "Entertainment", "Miscellaneous", "Income", "Transfer",
  "Groceries", "Dining", "Travel", "Education", "Shopping", "Credit Card Payment", "Investment"
];

export default function Dashboard() {
  const { user, profile } = useAuth();
  const { accounts, refetch: refetchAccounts } = useAccounts();
  // Global Data Scope (Personal vs Family)
  const [dashboardScope, setDashboardScope] = useState<'personal' | 'household'>('personal');
  const isUltimate = Boolean(profile?.plan?.toLowerCase().includes('ultimate'));
  const isHouseholdAdmin = profile?.household_member?.role === 'admin';
  const canViewHousehold = Boolean(profile?.household_member?.can_view_household);
  const canSeeScopeToggle = (isUltimate && isHouseholdAdmin) || canViewHousehold;
  
  const { transactions, refetch: refetchTransactions, updateOne } = useTransactions({
    filters: { scope: dashboardScope }
  });
  const { budgets } = useBudget(dashboardScope);
  const [accountsExpanded, setAccountsExpanded] = useState(false);
  const toast = useToast();

  const handleCategoryChange = async (id: string, newCategory: string) => {
    try {
      await updateOne(id, { category: newCategory });
      toast.show('Category updated', 'success');
    } catch (err) {
      toast.show('Failed to update category', 'error');
    }
  };

  const [timeframe, setTimeframe] = useState('1m');
  const [activeTab, setActiveTab] = useState('all-accounts');

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

  // Analytics Hooks
  const { start, end, nwInterval, cfInterval } = useMemo(() => getDateRange(timeframe), [timeframe]);

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

  const { data: nwData, loading: nwLoading } = useNetWorth(start, end, nwInterval, dashboardScope);
  const { data: cfData, loading: cfLoading } = useCashFlow(start, end, cfInterval, dashboardScope);
  const { data: spendData, loading: spendLoading } = useSpendingByCategory(start, end, dashboardScope);

  // Computed Values for Cards
  const totalBalance = useMemo(() => accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0), [accounts]);

  // Recent Transactions Table (Limit 10)
  const recentTransactions = useMemo(
    () => [...transactions].sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime()).slice(0, 10),
    [transactions]
  );




  // Spending Stats
  const { totalExpense, topCategories } = useMemo(() => {
    if (!spendData?.data) return { totalExpense: 0, topCategories: [] };
    const total = spendData.data.reduce((sum, item) => sum + item.amount, 0);
    return { totalExpense: total, topCategories: spendData.data };
  }, [spendData]);

  const budgetSpent = totalExpense;
  const totalBudget = useMemo(() => budgets.reduce((sum, b) => sum + b.amount, 0), [budgets]);
  const budgetPercent = totalBudget > 0 ? Math.min(100, (budgetSpent / totalBudget) * 100) : 0;

  // Chart Generators
  const netWorthChart = useMemo(() => generateLinePath(nwData?.data || [], 320, 140), [nwData]); // Height 140 match SVG
  const cashFlowChart = useMemo(() => generateBarChart(cfData?.income || [], cfData?.expenses || [], 320, 160, cfInterval), [cfData, cfInterval]);

  // Cash Flow Card Sums
  const cashFlowStats = useMemo(() => {
    if (!cfData) return { income: 0, expense: 0, net: 0 };
    const income = cfData.income.reduce((sum, d) => sum + d.value, 0);
    const expense = cfData.expenses.reduce((sum, d) => sum + Math.abs(d.value), 0); // Display as positive
    return { income, expense, net: income - expense };
  }, [cfData]);

  const handlePlaidSuccess = useCallback(async () => {
    await Promise.all([refetchAccounts(), refetchTransactions()]);
  }, [refetchAccounts, refetchTransactions]);

  // Filter Accounts
  const filteredAccounts = accounts.filter(acc => {
    if (activeTab === 'all-accounts') return true;
    if (activeTab === 'checking') return acc.accountType === 'traditional';
    if (activeTab === 'investment') return acc.accountType === 'investment';
    return false;
  });

  return (
    <section className="container mx-auto py-10 px-4 space-y-8">

      {/* Header */}
      <div className="glass-panel p-6 flex flex-col md:flex-row justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-deep-indigo">Dashboard</h1>
          <p className="text-text-secondary mt-1">Welcome back, {user?.displayName || user?.email}</p>
        </div>
        <div className="mt-4 md:mt-0 flex items-center gap-4">
          <div className="text-right mr-4 hidden md:block">
            <span className="block text-sm text-text-muted">Total Balance ({dashboardScope === 'household' ? 'Family' : 'Personal'})</span>
            <span className="block text-2xl font-bold text-royal-purple">{formatCurrency(totalBalance)}</span>
          </div>
          <PlaidLinkButton onSuccess={handlePlaidSuccess} />
        </div>
      </div>

      {/* Timeframe Controls */}
      <div className="glass-panel mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="timeframe-controls">
          <div className="section-timeframe-wrapper">
            <span className="section-timeframe-label">View Period:</span>
            <div className="timeframe-selector" role="group" aria-label="Select time period">
              {['1w', '1m', '3m', '6m', '1y', 'ytd'].map((tf) => (
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
                    ? 'bg-royal-purple text-white shadow font-medium'
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
                    ? 'bg-royal-purple text-white shadow font-medium'
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
              className="text-xs font-medium text-royal-purple border border-royal-purple/30 rounded px-2 py-1.5 hover:bg-royal-purple/10 transition-colors flex items-center gap-1"
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
          <p id="net-worth-value" className="text-3xl font-bold text-royal-purple">
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
          <p id="cashflow-value" className={`text-3xl font-bold ${cashFlowStats.net >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {cfLoading ? '...' : formatCurrency(cashFlowStats.net)}
          </p>
          <p className="text-sm text-text-muted mt-1">
            In: <span className="text-emerald-600">{formatCompactCurrency(cashFlowStats.income)}</span> • Out: <span className="text-rose-600">{formatCompactCurrency(cashFlowStats.expense)}</span>
          </p>
        </div>

        {/* Budget */}
        <div className="card">
          <h3 className="text-sm text-text-muted mb-2">Budget Status</h3>
          <p className="text-3xl font-bold text-royal-purple">{budgetPercent.toFixed(0)}%</p>
          <p className="text-sm text-text-muted mt-1">
            {formatCompactCurrency(budgetSpent)} of {formatCompactCurrency(totalBudget)} spent
          </p>
          <div className="w-full bg-slate-100 rounded-full h-2 mt-2" aria-label="Budget usage">
            <div className="h-2 rounded-full bg-royal-purple" style={{ width: `${budgetPercent}%` }} />
          </div>
        </div>

        {/* Accounts Count */}
        <div className="card">
          <h3 className="text-sm text-text-muted mb-2">Linked Accounts</h3>
          <p className="text-3xl font-bold text-royal-purple">{accounts.length}</p>
          <p className="text-sm text-text-muted mt-1">Active connections</p>
        </div>
      </div>

      {/* Budgeting Tool */}
      <BudgetTool categories={CATEGORIES} scope={dashboardScope} />

      {/* Infographics & Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        {/* Net Worth Trend */}
        <div className="chart-card" id="networth-chart">
          <div className="chart-title">Net Worth Trend</div>
          <div className="chart-subtitle">Historical Balance</div>

          {nwLoading ? <div className="h-40 flex items-center justify-center text-text-muted">Loading...</div> : (
            <svg className="chart-svg" viewBox="0 0 320 140" role="img" aria-label="Net worth trend">
              <defs>
                <linearGradient id="networthGradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Grid Lines & Y Labels */}
              {netWorthChart.yLabels?.map((l, i) => (
                <g key={i}>
                  <line
                    x1={netWorthChart.padding.left}
                    y1={l.y}
                    x2={320 - netWorthChart.padding.right}
                    y2={l.y}
                    stroke="var(--border-color)"
                    strokeWidth="1"
                    strokeOpacity="0.1"
                  />
                  <text
                    x={netWorthChart.padding.left - 5}
                    y={l.y + 4}
                    fontSize="9"
                    fill="var(--text-muted)"
                    textAnchor="end"
                  >
                    {l.label}
                  </text>
                </g>
              ))}

              {/* X Labels */}
              {netWorthChart.xLabels?.map((l, i) => (
                <text
                  key={i}
                  x={l.x}
                  y={135}
                  fontSize="9"
                  fill="var(--text-muted)"
                  textAnchor="middle"
                >
                  {l.label}
                </text>
              ))}

              {/* Main Axes */}
              <line
                x1={netWorthChart.padding.left}
                y1={140 - netWorthChart.padding.bottom}
                x2={320 - netWorthChart.padding.right}
                y2={140 - netWorthChart.padding.bottom}
                stroke="var(--border-color)"
                strokeWidth="1"
                strokeOpacity="0.3"
              />
              <line
                x1={netWorthChart.padding.left}
                y1={netWorthChart.padding.top}
                x2={netWorthChart.padding.left}
                y2={140 - netWorthChart.padding.bottom}
                stroke="var(--border-color)"
                strokeWidth="1"
                strokeOpacity="0.3"
              />

              <g id="networth-area">
                <polyline fill="url(#networthGradient)" stroke="none" points={netWorthChart.areaPath} />
              </g>
              <g id="networth-line">
                <polyline fill="none" stroke="var(--color-primary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={netWorthChart.path} />
              </g>
              <g id="networth-dots" fill="var(--color-primary)">
                {netWorthChart.dots.map((d, i) => <circle key={i} cx={d.cx} cy={d.cy} r="4" />)}
              </g>
            </svg>
          )}
        </div>

        {/* Cash Flow Chart */}
        <div className="chart-card" id="cashflow-chart">
          <div className="chart-title">Cash Flow</div>
          <div className="chart-subtitle">Income vs Expenses</div>

          {cfLoading ? <div className="h-40 flex items-center justify-center text-text-muted">Loading...</div> : (
            <svg className="chart-svg" viewBox="0 0 320 160" role="img" aria-label="Cash flow bar chart">
              {/* Grid Lines & Y Labels */}
              {cashFlowChart.yLabels?.map((l, i) => (
                <g key={i}>
                  <line
                    x1={cashFlowChart.padding.left}
                    y1={l.y}
                    x2={320 - cashFlowChart.padding.right}
                    y2={l.y}
                    stroke="var(--border-color)"
                    strokeWidth="1"
                    strokeOpacity="0.1"
                  />
                  <text
                    x={cashFlowChart.padding.left - 5}
                    y={l.y + 4}
                    fontSize="9"
                    fill="var(--text-muted)"
                    textAnchor="end"
                  >
                    {l.label}
                  </text>
                </g>
              ))}

              {/* Main Axes */}
              <line
                x1={cashFlowChart.padding.left}
                y1={160 - cashFlowChart.padding.bottom}
                x2={320 - cashFlowChart.padding.right}
                y2={160 - cashFlowChart.padding.bottom}
                stroke="var(--border-color)"
                strokeWidth="1"
                strokeOpacity="0.3"
              />
              <line
                x1={cashFlowChart.padding.left}
                y1={cashFlowChart.padding.top}
                x2={cashFlowChart.padding.left}
                y2={160 - cashFlowChart.padding.bottom}
                stroke="var(--border-color)"
                strokeWidth="1"
                strokeOpacity="0.3"
              />

              {cashFlowChart.bars.map((bar, i) => (
                <g key={i}>
                  {/* Income Bar (Cyan) */}
                  <rect x={bar.xInc} y={bar.yInc} width={((320 - cashFlowChart.padding.left - cashFlowChart.padding.right) / cashFlowChart.bars.length) * 0.4} height={bar.hInc} rx="2" fill="var(--color-accent)" />
                  {/* Expense Bar (Red) */}
                  <rect x={bar.xExp} y={bar.yExp} width={((320 - cashFlowChart.padding.left - cashFlowChart.padding.right) / cashFlowChart.bars.length) * 0.4} height={bar.hExp} rx="2" fill="#DC2626" />

                  {/* X Axis Label */}
                  <text x={bar.labelX} y="155" fontSize="9" fill="var(--text-muted)" textAnchor="middle">{bar.label}</text>
                </g>
              ))}
            </svg>
          )}
          <div className="chart-legend mt-2 flex justify-center gap-4 text-xs">
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-cyan-400 rounded-sm"></span>Income</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-600 rounded-sm"></span>Expenses</span>
          </div>
        </div>

        {/* Spending By Category */}
        <div className="chart-card">
          <div className="chart-title">Spending by Category</div>
          <div className="chart-subtitle">{spendData?.data.length || 0} Categories</div>

          {spendLoading ? <div className="h-40 flex items-center justify-center text-text-muted">Loading...</div> : (
            <div className="space-y-3 mt-4">
              {topCategories.length === 0 ? (
                <div className="text-center text-text-muted py-4">No spending data</div>
              ) : (
                topCategories.map(cat => {
                  const percent = totalExpense > 0 ? (cat.amount / totalExpense) * 100 : 0;
                  return (
                    <div key={cat.category}>
                      <div className="flex justify-between text-xs text-text-secondary mb-1">
                        <span className="font-medium text-text-primary">{cat.category}</span>
                        <span>{formatCompactCurrency(cat.amount)} ({percent.toFixed(0)}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5">
                        <div className="h-1.5 rounded-full bg-royal-purple" style={{ width: `${percent}%` }} />
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* Account Overview */}
      <div className="glass-panel mb-10 transition-all duration-300">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Account Overview</h2>
          <button
            onClick={() => setAccountsExpanded(!accountsExpanded)}
            className="text-sm font-medium text-royal-purple hover:underline"
          >
            {accountsExpanded ? 'Collapse' : 'Manage / Details'}
          </button>
        </div>

        {!accountsExpanded ? (
          <div className="flex flex-col md:flex-row justify-between items-center p-6 bg-transparent border border-white/10 rounded-xl cursor-pointer hover:bg-white/5 transition-colors" onClick={() => setAccountsExpanded(true)}>
            {accounts.length === 0 ? (
              <div className="flex flex-col items-center justify-center w-full text-center">
                <p className="text-text-muted font-medium">Link your first financial account to see your net worth and cash flow.</p>
                <p className="text-xs text-text-secondary mt-1">Connect with Plaid above to securely sync your data.</p>
              </div>
            ) : (
              <>
                <div className="flex gap-8">
                  <div>
                    <span className="block text-xs text-text-muted uppercase tracking-wider">Connected</span>
                    <span className="text-lg font-bold text-text-primary">{accounts.length} Accounts</span>
                  </div>
                  <div>
                    <span className="block text-xs text-text-muted uppercase tracking-wider">Types</span>
                    <span className="text-lg font-bold text-text-primary">
                      {[...new Set(accounts.map(a => a.accountType))].join(', ')}
                    </span>
                  </div>
                </div>
                <div className="text-right mt-4 md:mt-0">
                  <span className="block text-xs text-text-muted uppercase tracking-wider">Total Combined Balance</span>
                  <span className="text-2xl font-bold text-royal-purple">{formatCurrency(totalBalance)}</span>
                </div>
              </>
            )}
          </div>
        ) : (
          <>
            <div className="tabs mb-6">
              <ul className="tab-list flex gap-4 border-b border-white/10" role="tablist">
                <li><button className={`px-4 py-2 border-b-2 transition-colors ${activeTab === 'all-accounts' ? 'border-royal-purple text-royal-purple font-medium' : 'border-transparent text-text-muted hover:text-text-secondary'}`} onClick={() => setActiveTab('all-accounts')}>All Accounts</button></li>
                <li><button className={`px-4 py-2 border-b-2 transition-colors ${activeTab === 'checking' ? 'border-royal-purple text-royal-purple font-medium' : 'border-transparent text-text-muted hover:text-text-secondary'}`} onClick={() => setActiveTab('checking')}>Checking</button></li>
                <li><button className={`px-4 py-2 border-b-2 transition-colors ${activeTab === 'investment' ? 'border-royal-purple text-royal-purple font-medium' : 'border-transparent text-text-muted hover:text-text-secondary'}`} onClick={() => setActiveTab('investment')}>Investment</button></li>
              </ul>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredAccounts.length === 0 ? (
                <div className="col-span-full text-center py-10 text-text-muted italic">
                  No accounts found. {accounts.length === 0 && "Use the button above to link an account."}
                </div>
              ) : (
                filteredAccounts.map((account: Account) => (
                  <div key={account.id} className="card hover:shadow-lg transition-all border-white/5 bg-white/5">
                    <h3 className="font-semibold text-lg">{account.accountName}</h3>
                    <p className="text-2xl font-bold text-royal-purple my-2">
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: account.currency || 'USD' }).format(account.balance || 0)}
                    </p>
                    <p className="text-sm text-text-muted">
                      {account.accountNumberMasked ? `Account ending in ${account.accountNumberMasked}` : account.accountType}
                    </p>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {/* Recent Transactions */}
      <div className="glass-panel mb-10">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Recent Transactions</h2>
          {/* Toggle moved to top of page */}
        </div>
        <div className="overflow-x-auto">
          <table className="table w-full">
            <thead>
              <tr className="text-left text-text-muted border-b border-slate-200">
                <th className="pb-3">Date</th>
                <th className="pb-3">Description</th>
                <th className="pb-3">Category</th>
                <th className="pb-3">Amount</th>
              </tr>
            </thead>
            <tbody>
              {recentTransactions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-6 text-text-muted italic">No transactions found</td>
                </tr>
              ) : (
                recentTransactions.map(txn => (
                  <tr key={txn.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 text-sm">{new Date(txn.ts).toLocaleDateString()}</td>
                    <td className="py-3 font-medium text-text-primary">{txn.description}</td>
                    <td className="py-3">
                      <select
                        className="bg-transparent border-none text-sm text-royal-purple font-medium focus:ring-0 cursor-pointer"
                        value={txn.category || "Uncategorized"}
                        onChange={(e) => handleCategoryChange(txn.id, e.target.value)}
                      >
                        <option value="Uncategorized" disabled>Select...</option>
                        {CATEGORIES.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </td>
                    <td className={`py-3 text-right font-bold ${txn.amount < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {formatCurrency(txn.amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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
