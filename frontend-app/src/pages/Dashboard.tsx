// Core Purpose: Main dashboard for personal and household financial insights.
// Last Modified: 2026-01-26 14:10 CST

import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useAccounts } from '../hooks/useAccounts';
import { useManualAssets } from '../hooks/useManualAssets';
import { useBudget } from '../hooks/useBudget';
import { useNetWorth, useCashFlow, useSpendingByCategory } from '../hooks/useAnalytics';
import { useToast } from '../components/ui/Toast';
import { Modal } from '../components/ui/Modal';
import Switch from '../components/ui/Switch';
import { InfoPopover } from '../components/ui/InfoPopover';
import { householdService } from '../services/householdService';
import { eventTracking, SignupFunnelEvent } from '../services/eventTracking';
import { formatDateParam, formatTimeframeLabel, getTransactionDateRange } from '../utils/dateRanges';
import { loadDashboardPreferences, saveDashboardPreferences, type InsightsPeriod } from '../utils/dashboardPreferences';
import { getAccountPrimaryCategory, getCategoryLabel, getInvestmentBucket, type PrimaryAccountCategory } from '../utils/accountCategories';
import { getManualAssetTotals, getManualNetWorthAtDate } from '../utils/manualAssets';
import { loadGoals, saveGoals, type Goal, type GoalType } from '../utils/goalsStorage';

// Removed static BUDGET_CAP

const INSIGHTS_OPTIONS: { value: InsightsPeriod; label: string }[] = [
  { value: '1w', label: '1W' },
  { value: '1m', label: '1M' },
  { value: '3m', label: '3M' },
  { value: 'ytd', label: 'YTD' },
  { value: '1y', label: '1Y' },
  { value: 'all', label: 'ALL' },
];

const FIXED_TIMEFRAME: InsightsPeriod = '1m';
const ALL_TIME_ANALYTICS_YEARS = 5;

const getInsightsCashFlowInterval = (timeframe: InsightsPeriod): 'day' | 'week' | 'month' => {
  switch (timeframe) {
    case '1w':
      return 'day';
    case '1m':
      return 'week';
    case '3m':
      return 'week';
    case 'ytd':
    case '1y':
    case 'all':
      return 'month';
    default:
      return 'week';
  }
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

const formatCompactCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: "compact", maximumFractionDigits: 1 }).format(value);

const formatPercent = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 0 }).format(value);

const GOAL_TYPE_LABELS: Record<GoalType, string> = {
  emergency_fund: 'Emergency Fund',
  debt_paydown: 'Debt Paydown',
  savings: 'Savings Goal',
  investment: 'Investment Goal',
  custom: 'Custom Goal',
};

const calculateBudgetProgress = (
  spendData: { data: { category: string; amount: number }[] } | null | undefined,
  budgets: { category: string; amount: number; alert_enabled: boolean }[],
) => {
  if (!spendData?.data || budgets.length === 0) {
    return { budgetSpent: 0, totalBudget: 0 };
  }

  const budgetsByCategory = new Map<string, number>();
  budgets.forEach((b) => {
    if (b.alert_enabled) {
      const existing = budgetsByCategory.get(b.category) || 0;
      budgetsByCategory.set(b.category, existing + b.amount);
    }
  });

  const total = Array.from(budgetsByCategory.values()).reduce((sum, amount) => sum + amount, 0);
  const spent = spendData.data
    .filter((item) => budgetsByCategory.has(item.category))
    .reduce((sum, item) => sum + item.amount, 0);

  return { budgetSpent: spent, totalBudget: total };
};

export default function Dashboard() {
  const { profile } = useAuth();
  // Global Data Scope (Personal vs Family)
  const [dashboardScope, setDashboardScope] = useState<'personal' | 'household'>('personal');
  const { accounts } = useAccounts({
    filters: { scope: dashboardScope }
  });
  const { assets: manualAssets } = useManualAssets();
  const isUltimate = Boolean(profile?.plan?.toLowerCase().includes('ultimate'));
  const isHouseholdAdmin = profile?.household_member?.role === 'admin';
  const canViewHousehold = Boolean(profile?.household_member?.can_view_household);
  const canSeeScopeToggle = (isUltimate && isHouseholdAdmin) || canViewHousehold;
  const savedDashboardPreferences = useMemo(() => loadDashboardPreferences(), []);
  const [insightsPeriod, setInsightsPeriod] = useState<InsightsPeriod>(
    savedDashboardPreferences.insightsPeriod,
  );

  useEffect(() => {
    saveDashboardPreferences({ insightsPeriod });
  }, [insightsPeriod]);

  const insightsLabel = formatTimeframeLabel(insightsPeriod);

  const todayParam = useMemo(() => formatDateParam(new Date()), []);
  const fixedRange = useMemo(
    () =>
      getTransactionDateRange(FIXED_TIMEFRAME, {
        allowAllDates: true,
        allTimeYears: ALL_TIME_ANALYTICS_YEARS,
      }),
    [],
  );
  const fixedStart = fixedRange.start ?? todayParam;
  const fixedEnd = fixedRange.end ?? todayParam;

  const insightsRange = useMemo(
    () =>
      getTransactionDateRange(insightsPeriod, {
        allowAllDates: true,
        allTimeYears: ALL_TIME_ANALYTICS_YEARS,
      }),
    [insightsPeriod],
  );
  const insightsStart = insightsRange.start ?? fixedStart;
  const insightsEnd = insightsRange.end ?? fixedEnd;

  const insightsCashFlowInterval = useMemo(
    () => getInsightsCashFlowInterval(insightsPeriod),
    [insightsPeriod],
  );

  const { budgets } = useBudget(dashboardScope);
  const toast = useToast();

  


  // Invite Member State
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteIsMinor, setInviteIsMinor] = useState(false);
  const [inviteCanViewHousehold, setInviteCanViewHousehold] = useState(true);
  const [sendingInvite, setSendingInvite] = useState(false);
  const [goalsModalOpen, setGoalsModalOpen] = useState(false);
  const [goals, setGoals] = useState<Goal[]>(() => loadGoals());
  const [goalTitle, setGoalTitle] = useState('');
  const [goalType, setGoalType] = useState<GoalType>('savings');
  const [goalTarget, setGoalTarget] = useState('');
  const [goalCurrent, setGoalCurrent] = useState('');
  const [goalTargetDate, setGoalTargetDate] = useState('');

  // Keep the dashboard scope aligned with the user's household access.
  useEffect(() => {
    if (!canSeeScopeToggle && dashboardScope === 'household') {
      setDashboardScope('personal');
    }
  }, [canSeeScopeToggle, dashboardScope]);

  useEffect(() => {
    saveGoals(goals);
  }, [goals]);

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
                // Note: refetchAccounts might be needed if features are gated
                window.location.reload(); // Simple brute force to ensure all state (profile, etc) updates
            })
            .catch(() => {
                toast.show('Payment verification pending...', 'error');
            });
       });
    }
  }, [toast]);

  const { data: insightsNetWorthData, loading: insightsNetWorthLoading } = useNetWorth(
    insightsStart,
    insightsEnd,
    'daily',
    dashboardScope,
  );
  const { data: fixedCashFlowData } = useCashFlow(
    fixedStart,
    fixedEnd,
    'week',
    dashboardScope,
  );

  const { data: insightsCashFlowData, loading: insightsCashFlowLoading } = useCashFlow(
    insightsStart,
    insightsEnd,
    insightsCashFlowInterval,
    dashboardScope,
  );
  const { data: insightsSpendData, loading: insightsSpendLoading } = useSpendingByCategory(
    insightsStart,
    insightsEnd,
    dashboardScope,
  );

  const fixedCashFlowStats = useMemo(() => {
    if (!fixedCashFlowData) return { income: 0, expense: 0, net: 0 };
    const income = fixedCashFlowData.income.reduce((sum, d) => sum + d.value, 0);
    const expense = fixedCashFlowData.expenses.reduce((sum, d) => sum + Math.abs(d.value), 0);
    return { income, expense, net: income - expense };
  }, [fixedCashFlowData]);

  const insightsCashFlowStats = useMemo(() => {
    if (!insightsCashFlowData) return { income: 0, expense: 0, net: 0 };
    const income = insightsCashFlowData.income.reduce((sum, d) => sum + d.value, 0);
    const expense = insightsCashFlowData.expenses.reduce((sum, d) => sum + Math.abs(d.value), 0);
    return { income, expense, net: income - expense };
  }, [insightsCashFlowData]);

  const manualTotals = useMemo(() => getManualAssetTotals(manualAssets), [manualAssets]);

  const { assetsTotal, liabilitiesTotal, netWorthTotal, liquidBalance } = useMemo(() => {
    let assets = 0;
    let liabilities = 0;
    let liquid = 0;

    accounts.forEach((account) => {
      const balance = account.balance || 0;
      const category = getAccountPrimaryCategory(account);
      if (category.isLiability) {
        liabilities += Math.abs(balance);
      } else {
        assets += balance;
        if (category.key === 'cash') {
          liquid += balance;
        }
      }
    });

    return {
      assetsTotal: assets + manualTotals.assets,
      liabilitiesTotal: liabilities + manualTotals.liabilities,
      netWorthTotal: assets + manualTotals.assets - (liabilities + manualTotals.liabilities),
      liquidBalance: liquid,
    };
  }, [accounts, manualTotals]);

  const { budgetSpent: insightsBudgetSpent, totalBudget: insightsTotalBudget } = useMemo(
    () => calculateBudgetProgress(insightsSpendData, budgets),
    [insightsSpendData, budgets],
  );

  const insightsBudgetPercent =
    insightsTotalBudget > 0
      ? Math.min(100, (insightsBudgetSpent / insightsTotalBudget) * 100)
      : 0;

  const insightsSavingsRate = useMemo(() => {
    if (!insightsCashFlowStats.income) return null;
    return insightsCashFlowStats.net / insightsCashFlowStats.income;
  }, [insightsCashFlowStats]);

  const spendingHealthScore = useMemo(() => {
    if (!insightsCashFlowStats.income) return null;
    const rawScore = (1 - insightsCashFlowStats.expense / insightsCashFlowStats.income) * 100;
    return Math.max(0, Math.min(100, Math.round(rawScore)));
  }, [insightsCashFlowStats]);

  const spendingHealthLabel = useMemo(() => {
    if (spendingHealthScore === null) return 'Needs data';
    if (spendingHealthScore >= 75) return 'Strong';
    if (spendingHealthScore >= 50) return 'Balanced';
    return 'Caution';
  }, [spendingHealthScore]);

  const insightsTopCategories = useMemo(() => {
    if (!insightsSpendData?.data?.length) return [];
    return [...insightsSpendData.data].sort((a, b) => b.amount - a.amount).slice(0, 3);
  }, [insightsSpendData]);

  const insightsTotalSpend = useMemo(() => {
    if (!insightsSpendData?.data?.length) return 0;
    return insightsSpendData.data.reduce((sum, item) => sum + item.amount, 0);
  }, [insightsSpendData]);

  const topSpendShare = insightsTopCategories.length
    ? insightsTotalSpend > 0
      ? insightsTopCategories[0].amount / insightsTotalSpend
      : 0
    : 0;

  const anomalyStatus = useMemo(() => {
    if (!insightsCashFlowData && !insightsSpendData) {
      return { title: 'Awaiting signals', detail: 'Connect accounts to detect changes.', tone: 'neutral' };
    }
    if (insightsCashFlowStats.net < 0) {
      return {
        title: 'Spending exceeded income',
        detail: `${formatCompactCurrency(Math.abs(insightsCashFlowStats.net))} net outflow`,
        tone: 'warning',
      };
    }
    if (topSpendShare >= 0.5 && insightsTopCategories[0]) {
      return {
        title: `${insightsTopCategories[0].category} dominates`,
        detail: `${Math.round(topSpendShare * 100)}% of spend`,
        tone: 'warning',
      };
    }
    return { title: 'No anomalies detected', detail: 'Patterns look steady.', tone: 'good' };
  }, [insightsCashFlowData, insightsSpendData, insightsCashFlowStats, topSpendShare, insightsTopCategories]);

  const liquidityMonths = useMemo(() => {
    const monthlyExpense = fixedCashFlowStats.expense;
    const baseBalance = liquidBalance > 0 ? liquidBalance : assetsTotal;
    if (monthlyExpense <= 0 || baseBalance <= 0) return null;
    return baseBalance / monthlyExpense;
  }, [fixedCashFlowStats.expense, liquidBalance, assetsTotal]);

  const handleAddGoal = () => {
    const targetValue = Number(goalTarget);
    if (!goalTitle.trim() || !goalTarget || Number.isNaN(targetValue) || targetValue <= 0) {
      toast.show('Please enter a goal title and target amount.', 'error');
      return;
    }
    const currentValue = goalCurrent ? Number(goalCurrent) : 0;
    const newGoal: Goal = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      type: goalType,
      title: goalTitle.trim(),
      targetAmount: targetValue,
      currentAmount: Number.isNaN(currentValue) ? 0 : currentValue,
      targetDate: goalTargetDate || null,
      createdAt: new Date().toISOString(),
    };
    setGoals((prev) => [newGoal, ...prev]);
    setGoalTitle('');
    setGoalTarget('');
    setGoalCurrent('');
    setGoalTargetDate('');
    setGoalType('savings');
    setGoalsModalOpen(false);
    toast.show('Goal added', 'success');
  };

  const handleRemoveGoal = (id: string) => {
    setGoals((prev) => prev.filter((goal) => goal.id !== id));
    toast.show('Goal removed', 'success');
  };

  const investmentAllocation = useMemo(() => {
    const buckets: Record<'traditional' | 'cex' | 'web3' | 'other', number> = {
      traditional: 0,
      cex: 0,
      web3: 0,
      other: 0,
    };

    accounts.forEach((account) => {
      const bucket = getInvestmentBucket(account);
      if (!bucket) return;
      const balance = account.balance || 0;
      if (balance <= 0) return;
      buckets[bucket] += balance;
    });

    const total = Object.values(buckets).reduce((sum, value) => sum + value, 0);
    const rows = (Object.keys(buckets) as Array<keyof typeof buckets>).map((bucket) => ({
      bucket,
      amount: buckets[bucket],
      percent: total > 0 ? buckets[bucket] / total : 0,
    }));

    return { total, rows };
  }, [accounts]);

  const netWorthSeries = useMemo(() => {
    if (!insightsNetWorthData?.data) return [];
    return insightsNetWorthData.data.map((point) => ({
      ...point,
      value: point.value + getManualNetWorthAtDate(manualAssets, point.date),
    }));
  }, [insightsNetWorthData?.data, manualAssets]);
  const netWorthCurrent = netWorthSeries.length
    ? netWorthSeries[netWorthSeries.length - 1].value
    : netWorthTotal;
  const netWorthStart = netWorthSeries.length ? netWorthSeries[0].value : null;
  const netWorthChange = netWorthStart !== null ? netWorthCurrent - netWorthStart : null;

  const linkedAccountCategories = useMemo(() => {
    const counts = new Map<PrimaryAccountCategory, number>();
    accounts.forEach((account) => {
      const category = getAccountPrimaryCategory(account).key;
      counts.set(category, (counts.get(category) || 0) + 1);
    });
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [accounts]);

  return (
    <section className="container mx-auto py-10 px-4 space-y-8">

      {/* Insights Period Controls */}
      <div className="glass-panel mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="timeframe-controls">
          <div className="section-timeframe-wrapper">
            <span className="section-timeframe-label">Insights Period:</span>
            <div className="timeframe-selector" role="group" aria-label="Select time period">
              {INSIGHTS_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  className={`timeframe-btn ${insightsPeriod === option.value ? 'active' : ''}`}
                  onClick={() => setInsightsPeriod(option.value)}
                >
                  {option.label}
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

      {/* Financial Overview */}
      <div className="glass-panel mb-10">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-3 mb-6">
          <h2 className="text-xl font-semibold">Financial Overview</h2>
          <span className="text-xs text-text-muted">Insights Period {insightsLabel} applied to summary + select modules</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-6">
          {/* Net Worth */}
          <div className="card gap-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm text-text-muted">Net Worth</h3>
                <p className="text-xs text-text-muted">Period: {insightsLabel}</p>
              </div>
              <InfoPopover label="Net worth calculation">
                Assets minus liabilities for connected accounts and manual holdings in the selected period.
              </InfoPopover>
            </div>
            <p id="net-worth-value" className="text-3xl font-bold text-primary">
              {insightsNetWorthLoading ? '...' : formatCurrency(netWorthCurrent)}
            </p>
            <p className="text-xs text-text-muted">
              Assets {formatCompactCurrency(assetsTotal)} • Liabilities {formatCompactCurrency(liabilitiesTotal)}
            </p>
            {netWorthChange !== null && (
              <p className={`text-xs ${netWorthChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {netWorthChange >= 0 ? 'Up' : 'Down'} {formatCompactCurrency(Math.abs(netWorthChange))} in {insightsLabel}
              </p>
            )}
          </div>

          {/* Cash Flow */}
          <div className="card gap-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm text-text-muted">Cash Flow</h3>
                <p className="text-xs text-text-muted">Period: {insightsLabel}</p>
              </div>
              <InfoPopover label="Cash flow calculation">
                Inflow minus outflow during the selected period, based on categorized transactions.
              </InfoPopover>
            </div>
            <p id="cashflow-value" className={`text-3xl font-bold ${insightsCashFlowStats.net >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {insightsCashFlowLoading ? '...' : formatCurrency(insightsCashFlowStats.net)}
            </p>
            <p className="text-xs text-text-muted">
              In {formatCompactCurrency(insightsCashFlowStats.income)} • Out {formatCompactCurrency(insightsCashFlowStats.expense)}
            </p>
          </div>

          {/* Budget Status */}
          <div className="card gap-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm text-text-muted">Budget Status</h3>
                <p className="text-xs text-text-muted">Period: {insightsLabel}</p>
              </div>
              <InfoPopover label="Budget status calculation">
                Percent of active budget targets spent in the selected period.
              </InfoPopover>
            </div>
            {insightsTotalBudget > 0 ? (
              <>
                <p className="text-3xl font-bold text-primary">{insightsBudgetPercent.toFixed(0)}%</p>
                <p className="text-xs text-text-muted">
                  {formatCompactCurrency(insightsBudgetSpent)} of {formatCompactCurrency(insightsTotalBudget)} spent
                </p>
                <div className="w-full bg-white/10 rounded-full h-2 mt-1" aria-label="Budget usage">
                  <div className="h-2 rounded-full bg-primary" style={{ width: `${insightsBudgetPercent}%` }} />
                </div>
              </>
            ) : (
              <p className="text-sm text-text-muted">No active budgets yet.</p>
            )}
          </div>

          {/* Linked Accounts */}
          <div className="card gap-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm text-text-muted">Linked Accounts</h3>
                <p className="text-xs text-text-muted">As of today</p>
              </div>
              <InfoPopover label="Linked accounts summary">
                Total connected accounts and their primary categories.
              </InfoPopover>
            </div>
            <p className="text-3xl font-bold text-royal-purple">{accounts.length}</p>
            {linkedAccountCategories.length === 0 ? (
              <p className="text-xs text-text-muted">No accounts connected yet.</p>
            ) : (
              <p className="text-xs text-text-muted">
                {linkedAccountCategories.slice(0, 3).map(([category, count]) => `${getCategoryLabel(category)} ${count}`).join(' • ')}
                {linkedAccountCategories.length > 3 ? ' • +more' : ''}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {/* Cash Flow Pulse */}
          <div className="card gap-4">
            <div>
              <h3 className="text-lg font-semibold">Cash Flow Pulse</h3>
              <p className="text-xs text-text-muted">Period: {insightsLabel}</p>
            </div>
            {insightsCashFlowLoading ? (
              <p className="text-sm text-text-muted">Loading cash flow...</p>
            ) : insightsCashFlowStats.income === 0 && insightsCashFlowStats.expense === 0 ? (
              <p className="text-sm text-text-muted">No cash flow activity yet.</p>
            ) : (
              <div className="space-y-2">
                <p className={`text-2xl font-bold ${insightsCashFlowStats.net >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {formatCurrency(insightsCashFlowStats.net)}
                </p>
                <p className="text-xs text-text-muted">
                  In {formatCompactCurrency(insightsCashFlowStats.income)} • Out {formatCompactCurrency(insightsCashFlowStats.expense)}
                </p>
              </div>
            )}
          </div>

          {/* Spending Health Score */}
          <div className="card gap-4">
            <div>
              <h3 className="text-lg font-semibold">Spending Health Score</h3>
              <p className="text-xs text-text-muted">Period: {insightsLabel}</p>
            </div>
            {spendingHealthScore === null ? (
              <p className="text-sm text-text-muted">Waiting on spending signals.</p>
            ) : (
              <>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-3xl font-bold text-primary">{spendingHealthScore}</p>
                    <p className="text-xs text-text-muted">{spendingHealthLabel}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-text-muted">Budget use</p>
                    <p className="text-sm font-semibold">{insightsBudgetPercent.toFixed(0)}%</p>
                  </div>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2">
                  <div className="h-2 rounded-full bg-primary" style={{ width: `${spendingHealthScore}%` }} />
                </div>
              </>
            )}
          </div>

          {/* Top Money Drivers */}
          <div className="card gap-4">
            <div>
              <h3 className="text-lg font-semibold">Top Money Drivers</h3>
              <p className="text-xs text-text-muted">Period: {insightsLabel}</p>
            </div>
            {insightsSpendLoading ? (
              <p className="text-sm text-text-muted">Loading category mix...</p>
            ) : insightsTopCategories.length === 0 ? (
              <p className="text-sm text-text-muted">No spending history yet.</p>
            ) : (
              <div className="space-y-2 text-sm">
                {insightsTopCategories.map((item) => (
                  <div key={item.category} className="flex items-center justify-between">
                    <span className="text-text-secondary">{item.category}</span>
                    <span className="font-semibold">{formatCompactCurrency(item.amount)}</span>
                  </div>
                ))}
                <p className="text-xs text-text-muted">Total spend {formatCompactCurrency(insightsTotalSpend)}</p>
              </div>
            )}
          </div>

          {/* Upcoming Bills (Forecast) */}
          <div className="card gap-4">
            <div>
              <h3 className="text-lg font-semibold">Upcoming Bills (Forecast)</h3>
              <p className="text-xs text-text-muted">Next 30 days (fixed)</p>
            </div>
            <div className="space-y-2 text-sm text-text-muted">
              <p>No upcoming bills detected yet.</p>
              <p className="text-xs">Forecasting starts after 30+ days of history.</p>
            </div>
          </div>

          {/* Savings Progress Snapshot */}
          <div className="card gap-4">
            <div>
              <h3 className="text-lg font-semibold">Savings Progress Snapshot</h3>
              <p className="text-xs text-text-muted">Period: {insightsLabel}</p>
            </div>
            {insightsSavingsRate === null ? (
              <p className="text-sm text-text-muted">No savings rate yet.</p>
            ) : (
              <div className="space-y-2">
                <p className="text-3xl font-bold text-primary">{formatPercent(insightsSavingsRate)}</p>
                <p className="text-xs text-text-muted">Savings rate</p>
                <p className="text-sm text-text-secondary">
                  Net saved {formatCompactCurrency(insightsCashFlowStats.net)}
                </p>
              </div>
            )}
          </div>

          {/* Liquidity & Buffer */}
          <div className="card gap-4">
            <div>
              <h3 className="text-lg font-semibold">Liquidity &amp; Buffer</h3>
              <p className="text-xs text-text-muted">Based on last 30 days</p>
            </div>
            {liquidityMonths === null ? (
              <p className="text-sm text-text-muted">Add expense history to estimate runway.</p>
            ) : (
              <div className="space-y-2">
                <p className="text-3xl font-bold text-primary">{liquidityMonths.toFixed(1)} mo</p>
                <p className="text-xs text-text-muted">Estimated cash runway</p>
                <p className="text-sm text-text-secondary">
                  Liquid balance {formatCompactCurrency(liquidBalance > 0 ? liquidBalance : assetsTotal)}
                </p>
              </div>
            )}
          </div>

          {/* Anomaly Watch */}
          <div className="card gap-4">
            <div>
              <h3 className="text-lg font-semibold">Anomaly Watch</h3>
              <p className="text-xs text-text-muted">Period: {insightsLabel}</p>
            </div>
            <div
              className={`rounded-lg px-3 py-2 text-sm ${
                anomalyStatus.tone === 'warning'
                  ? 'bg-rose-500/10 text-rose-200'
                  : anomalyStatus.tone === 'good'
                  ? 'bg-emerald-500/10 text-emerald-200'
                  : 'bg-white/5 text-text-secondary'
              }`}
            >
              <p className="font-semibold">{anomalyStatus.title}</p>
              <p className="text-xs text-text-muted">{anomalyStatus.detail}</p>
            </div>
          </div>

          {/* Allocation Snapshot */}
          <div className="card gap-4">
            <div>
              <h3 className="text-lg font-semibold">Investment Allocation Snapshot</h3>
              <p className="text-xs text-text-muted">As of today</p>
            </div>
            {investmentAllocation.total <= 0 ? (
              <p className="text-sm text-text-muted">Connect investment or crypto accounts to see allocation.</p>
            ) : (
              <div className="space-y-3 text-sm">
                {investmentAllocation.rows.map((item) => (
                  <div key={item.bucket} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-text-secondary capitalize">{item.bucket === 'cex' ? 'CEX' : item.bucket}</span>
                      <span className="font-semibold">{formatPercent(item.percent)}</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2">
                      <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.round(item.percent * 100)}%` }} />
                    </div>
                  </div>
                ))}
                <p className="text-xs text-text-muted">Invested balance {formatCompactCurrency(investmentAllocation.total)}</p>
                <p className="text-xs text-text-secondary">Shows how your invested assets are split across account types.</p>
              </div>
            )}
          </div>

          {/* Goals Tracker */}
          <div className="card gap-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold">Goals Tracker</h3>
                <p className="text-xs text-text-muted">As of today</p>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-outline"
                onClick={() => setGoalsModalOpen(true)}
              >
                Add Goal
              </button>
            </div>
            {goals.length === 0 ? (
              <div className="text-sm text-text-muted space-y-2">
                <p>No goals yet. Create a goal to track your progress.</p>
                <p className="text-xs text-text-secondary">Examples: emergency fund, debt payoff, or a savings target.</p>
              </div>
            ) : (
              <div className="space-y-4 text-sm">
                {goals.map((goal) => {
                  const progress = goal.targetAmount > 0 ? Math.min(1, goal.currentAmount / goal.targetAmount) : 0;
                  return (
                    <div key={goal.id} className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold">{goal.title}</p>
                          <p className="text-xs text-text-muted">{GOAL_TYPE_LABELS[goal.type]}</p>
                        </div>
                        <button
                          type="button"
                          className="text-xs text-text-muted hover:text-danger"
                          onClick={() => handleRemoveGoal(goal.id)}
                        >
                          Remove
                        </button>
                      </div>
                      <div className="flex items-center justify-between text-xs text-text-secondary">
                        <span>{formatCompactCurrency(goal.currentAmount)} / {formatCompactCurrency(goal.targetAmount)}</span>
                        <span>{formatPercent(progress)}</span>
                      </div>
                      <div className="w-full bg-white/10 rounded-full h-2">
                        <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.round(progress * 100)}%` }} />
                      </div>
                      {goal.targetDate && (
                        <p className="text-xs text-text-muted">Target date: {new Date(goal.targetDate).toLocaleDateString()}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal
        open={goalsModalOpen}
        onClose={() => setGoalsModalOpen(false)}
        title="Add a Goal"
        footer={
          <div className="flex justify-end gap-2">
            <button className="btn btn-ghost text-sm" onClick={() => setGoalsModalOpen(false)}>
              Cancel
            </button>
            <button className="btn btn-primary text-sm" onClick={handleAddGoal}>
              Save Goal
            </button>
          </div>
        }
      >
        <div className="space-y-4 py-2">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Goal Type</label>
            <select className="form-select w-full" value={goalType} onChange={(e) => setGoalType(e.target.value as GoalType)}>
              {Object.entries(GOAL_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Goal Title</label>
            <input
              type="text"
              className="form-input w-full"
              placeholder="e.g. Emergency Fund"
              value={goalTitle}
              onChange={(e) => setGoalTitle(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Target Amount</label>
              <input
                type="number"
                min="0"
                className="form-input w-full"
                placeholder="0.00"
                value={goalTarget}
                onChange={(e) => setGoalTarget(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Current Amount (optional)</label>
              <input
                type="number"
                min="0"
                className="form-input w-full"
                placeholder="0.00"
                value={goalCurrent}
                onChange={(e) => setGoalCurrent(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Target Date (optional)</label>
            <input
              type="date"
              className="form-input w-full"
              value={goalTargetDate}
              onChange={(e) => setGoalTargetDate(e.target.value)}
            />
          </div>
        </div>
      </Modal>

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
