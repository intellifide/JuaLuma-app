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

// Core Purpose: Main dashboard for personal and household financial insights.
// Last Modified: 2025-01-30

import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useUserTimeZone } from '../hooks/useUserTimeZone';
import { formatDate } from '../utils/datetime';
import { useAccounts } from '../hooks/useAccounts';
import { useManualAssets } from '../hooks/useManualAssets';
import { useBudgetStatus } from '../hooks/useBudgetReporting';
import { useNetWorth, useCashFlow, useSpendingByCategory } from '../hooks/useAnalytics';
import { useRecurringForecast } from '../hooks/useRecurringForecast';
import { useToast } from '../components/ui/Toast';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import Switch from '../components/ui/Switch';
import { InfoPopover } from '../components/ui/InfoPopover';
import { FeaturePreview } from '../components/ui/FeaturePreview';
import { GlassCard } from '../components/ui/GlassCard';
import { householdService } from '../services/householdService';
import { eventTracking, SignupFunnelEvent } from '../services/eventTracking';
import type { DataPoint } from '../services/analytics';
import { formatDateParam, formatTimeframeLabel, getTransactionDateRange } from '../utils/dateRanges';
import { loadDashboardPreferences, saveDashboardPreferences, type InsightsPeriod } from '../utils/dashboardPreferences';
import { getAccountPrimaryCategory, getCategoryLabel, type PrimaryAccountCategory } from '../utils/accountCategories';
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

type PlanTier = 'free' | 'essential' | 'pro' | 'ultimate'

const normalizePlan = (value?: string | null): PlanTier | null => {
  if (!value) return null
  const normalized = value.toLowerCase().trim().split('_')[0] as PlanTier
  if (['free', 'essential', 'pro', 'ultimate'].includes(normalized)) {
    return normalized
  }
  return null
}

type MiniTrendChartProps = {
  primarySeries: DataPoint[]
  secondarySeries?: DataPoint[]
  primaryColor: string
  secondaryColor?: string
  className?: string
}

const buildSparklinePath = (
  series: DataPoint[],
  width: number,
  height: number,
  minValue: number,
  maxValue: number,
) => {
  if (series.length === 0) return { linePath: '', areaPath: '' }

  const paddingX = 6
  const paddingY = 6
  const range = maxValue - minValue || 1
  const denominator = Math.max(series.length - 1, 1)
  const points = series.map((point, index) => {
    const x = paddingX + (index / denominator) * (width - paddingX * 2)
    const y = height - paddingY - ((point.value - minValue) / range) * (height - paddingY * 2)
    return { x, y }
  })

  const linePath = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(' ')

  const firstPoint = points[0]
  const lastPoint = points[points.length - 1]
  const areaPath = `${linePath} L ${lastPoint.x.toFixed(2)} ${(height - paddingY).toFixed(2)} L ${firstPoint.x.toFixed(2)} ${(height - paddingY).toFixed(2)} Z`

  return { linePath, areaPath }
}

const MiniTrendChart: React.FC<MiniTrendChartProps> = ({
  primarySeries,
  secondarySeries,
  primaryColor,
  secondaryColor,
  className = '',
}) => {
  const width = 320
  const height = 78
  const safePrimary = primarySeries?.filter((point) => Number.isFinite(point.value)) ?? []
  const safeSecondary = secondarySeries?.filter((point) => Number.isFinite(point.value)) ?? []
  const hasData = safePrimary.length > 1 || safeSecondary.length > 1

  const { minValue, maxValue } = useMemo(() => {
    const values = [...safePrimary, ...safeSecondary].map((point) => point.value)
    if (values.length === 0) {
      return { minValue: -1, maxValue: 1 }
    }
    let min = Math.min(...values)
    let max = Math.max(...values)
    if (min === max) {
      min -= 1
      max += 1
    }
    return { minValue: min, maxValue: max }
  }, [safePrimary, safeSecondary])

  const primaryPath = useMemo(
    () => buildSparklinePath(safePrimary, width, height, minValue, maxValue),
    [safePrimary, minValue, maxValue],
  )
  const secondaryPath = useMemo(
    () => buildSparklinePath(safeSecondary, width, height, minValue, maxValue),
    [safeSecondary, minValue, maxValue],
  )

  if (!hasData) {
    return (
      <div className={`mini-trend-chart ${className}`} aria-hidden="true">
        <div className="mini-trend-empty-line" />
      </div>
    )
  }

  return (
    <div className={`mini-trend-chart ${className}`} aria-hidden="true">
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="presentation">
        {primaryPath.areaPath && <path d={primaryPath.areaPath} fill={primaryColor} fillOpacity={0.16} />}
        {secondaryPath.areaPath && (
          <path d={secondaryPath.areaPath} fill={secondaryColor ?? 'rgba(255, 255, 255, 0.18)'} fillOpacity={0.1} />
        )}
        {primaryPath.linePath && (
          <path d={primaryPath.linePath} fill="none" stroke={primaryColor} strokeWidth={2.4} strokeLinecap="round" />
        )}
        {secondaryPath.linePath && (
          <path
            d={secondaryPath.linePath}
            fill="none"
            stroke={secondaryColor ?? 'rgba(255, 255, 255, 0.6)'}
            strokeWidth={2.1}
            strokeLinecap="round"
            strokeOpacity={0.95}
          />
        )}
      </svg>
    </div>
  )
}

export default function Dashboard() {
  const { profile, user } = useAuth();
  const timeZone = useUserTimeZone();
  // Global Data Scope (Personal vs Family)
  const [dashboardScope, setDashboardScope] = useState<'personal' | 'household'>('personal');
  const { accounts } = useAccounts({
    filters: { scope: dashboardScope }
  });
  const { assets: manualAssets } = useManualAssets();
  const {
    data: recurringForecast,
    loading: recurringLoading,
  } = useRecurringForecast(30, 180);
  const isUltimate = Boolean(profile?.plan?.toLowerCase().includes('ultimate'));
  const isHouseholdAdmin = profile?.household_member?.role === 'admin';
  const canViewHousehold = Boolean(profile?.household_member?.can_view_household);
  const canSeeScopeToggle = (isUltimate && isHouseholdAdmin) || canViewHousehold;
  const hasHouseholdAccess = canSeeScopeToggle;
  const familyPreviewTier = hasHouseholdAccess ? 'ultimate' : undefined;
  const uid = user?.uid ?? profile?.uid ?? null;
  const savedDashboardPreferences = useMemo(() => loadDashboardPreferences(uid), [uid]);
  const dashboardName = useMemo(() => {
    const firstName = profile?.first_name?.trim()
    if (firstName) return firstName
    const username = profile?.username?.trim()
    if (username) return username
    return 'User'
  }, [profile?.first_name, profile?.username])
  const [insightsPeriod, setInsightsPeriod] = useState<InsightsPeriod>(
    savedDashboardPreferences.insightsPeriod,
  );

  useEffect(() => {
    saveDashboardPreferences({ insightsPeriod }, uid);
  }, [insightsPeriod, uid]);

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

  const recurringTotal = useMemo(
    () => recurringForecast.reduce((sum, item) => sum + (item.average_amount || 0), 0),
    [recurringForecast],
  );

  const insightsCashFlowInterval = useMemo(
    () => getInsightsCashFlowInterval(insightsPeriod),
    [insightsPeriod],
  );

  const { data: budgetStatus, loading: budgetStatusLoading } = useBudgetStatus(dashboardScope);
  const toast = useToast();




  // Invite Member State
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteIsMinor, setInviteIsMinor] = useState(false);
  const [inviteCanViewHousehold, setInviteCanViewHousehold] = useState(true);
  const [sendingInvite, setSendingInvite] = useState(false);
  const [goalsModalOpen, setGoalsModalOpen] = useState(false);
  const [goals, setGoals] = useState<Goal[]>(() => loadGoals(uid));
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
    saveGoals(goals, uid);
  }, [goals, uid]);

  const activeSubscription = profile?.subscriptions?.find(
    (sub) => sub.status === 'active'
  )
  const planFromProfile = normalizePlan(profile?.plan ?? null)
  const planFromSubscriptions = normalizePlan(activeSubscription?.plan ?? null)
  const effectivePlan: PlanTier = planFromSubscriptions ?? planFromProfile ?? 'free'

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
        if (category.key === 'checking' || category.key === 'savings') {
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

  const budgetTotal = budgetStatus?.total_budget ?? 0;
  const budgetSpent = budgetStatus?.total_spent ?? 0;
  const budgetPercent = budgetStatus?.percent_used ?? 0;

  const insightsSavingsRate = useMemo(() => {
    if (!insightsCashFlowStats.income) return null;
    return insightsCashFlowStats.net / insightsCashFlowStats.income;
  }, [insightsCashFlowStats]);

  const spendingHealth = useMemo(() => {
    const income = insightsCashFlowStats.income;
    const expense = insightsCashFlowStats.expense;
    const net = insightsCashFlowStats.net;

    if (!income || income <= 0) {
      return {
        state: 'needs_data' as const,
        label: 'Needs data',
        summary: 'Add at least one income transaction to generate spending health.',
        scaleIndex: 0,
      };
    }

    const margin = net / income; // <0 means overspending

    const scale = [
      { key: 'overspending', label: 'Overspending' },
      { key: 'tight', label: 'Tight' },
      { key: 'stable', label: 'Stable' },
      { key: 'healthy', label: 'Healthy' },
      { key: 'strong', label: 'Strong' },
    ] as const;

    let scaleIndex = 0;
    if (margin < 0) scaleIndex = 0;
    else if (margin < 0.1) scaleIndex = 1;
    else if (margin < 0.25) scaleIndex = 2;
    else if (margin < 0.4) scaleIndex = 3;
    else scaleIndex = 4;

    const label = scale[scaleIndex].label;
    const summary =
      margin < 0
        ? 'Spending is higher than income for this period.'
        : margin < 0.1
        ? 'You are close to break-even after spending.'
        : margin < 0.25
        ? 'You are saving a modest share of income after spending.'
        : margin < 0.4
        ? 'You are keeping a healthy share of income after spending.'
        : 'You are keeping a strong share of income after spending.';

    return { state: 'ok' as const, label, summary, scaleIndex };
  }, [insightsCashFlowStats.expense, insightsCashFlowStats.income, insightsCashFlowStats.net]);

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

  const assetSnapshot = useMemo(() => {
    const buckets: Record<'checking' | 'savings' | 'other_assets', number> = {
      checking: 0,
      savings: 0,
      other_assets: 0,
    };

    accounts.forEach((account) => {
      const primary = getAccountPrimaryCategory(account);
      if (primary.isLiability) return;
      const balance = account.balance || 0;
      if (balance <= 0) return;

      if (primary.key === 'checking') {
        buckets.checking += balance;
        return;
      }
      if (primary.key === 'savings') {
        buckets.savings += balance;
        return;
      }
      buckets.other_assets += balance;
    });

    manualAssets.forEach((asset) => {
      if (asset.balanceType !== 'asset') return;
      const value = asset.value || 0;
      if (value <= 0) return;
      buckets.other_assets += value;
    });

    const total = Object.values(buckets).reduce((sum, v) => sum + v, 0);
    const labelMap: Record<keyof typeof buckets, string> = {
      checking: 'Checking',
      savings: 'Savings',
      other_assets: 'Other assets',
    };

    const rows = (Object.keys(buckets) as Array<keyof typeof buckets>)
      .map((bucket) => ({
        bucket,
        label: labelMap[bucket],
        amount: buckets[bucket],
        percent: total > 0 ? buckets[bucket] / total : 0,
      }))
      .filter((row) => row.amount > 0)
      .sort((a, b) => b.amount - a.amount);

    return { total, rows };
  }, [accounts, manualAssets]);

  const debtSnapshot = useMemo(() => {
    const buckets: Record<
      'credit_cards' | 'mortgage' | 'auto_loans' | 'student_loans' | 'other_loans' | 'other',
      number
    > = {
      credit_cards: 0,
      mortgage: 0,
      auto_loans: 0,
      student_loans: 0,
      other_loans: 0,
      other: 0,
    };

    const normalize = (value?: string | null) =>
      value
        ? value
            .toLowerCase()
            .trim()
            .replace(/\s+/g, '_')
            .replace(/-+/g, '_')
        : '';

    accounts.forEach((account) => {
      const primary = getAccountPrimaryCategory(account);
      if (!primary.isLiability) return;

      const rawBalance = account.balance || 0;
      const amount = Math.abs(rawBalance);
      if (amount <= 0) return;

      if (primary.key === 'credit') {
        buckets.credit_cards += amount;
        return;
      }

      if (primary.key === 'mortgage') {
        buckets.mortgage += amount;
        return;
      }

      if (primary.key === 'loan') {
        const subtype = normalize(account.plaidSubtype);
        if (subtype.includes('auto')) buckets.auto_loans += amount;
        else if (subtype.includes('student')) buckets.student_loans += amount;
        else buckets.other_loans += amount;
        return;
      }

      buckets.other += amount;
    });

    manualAssets.forEach((asset) => {
      if (asset.balanceType !== 'liability') return;
      const amount = asset.value || 0;
      if (amount <= 0) return;

      const assetType = normalize(asset.assetType);
      const name = (asset.name || '').toLowerCase();

      if (assetType.includes('house') || assetType.includes('real_estate') || name.includes('mortgage')) {
        buckets.mortgage += amount;
        return;
      }

      if (assetType.includes('car') || name.includes('auto')) {
        buckets.auto_loans += amount;
        return;
      }

      if (name.includes('student')) {
        buckets.student_loans += amount;
        return;
      }

      if (name.includes('credit') || name.includes('card')) {
        buckets.credit_cards += amount;
        return;
      }

      if (name.includes('loan')) {
        buckets.other_loans += amount;
        return;
      }

      buckets.other += amount;
    });

    const total = Object.values(buckets).reduce((sum, v) => sum + v, 0);
    const labelMap: Record<keyof typeof buckets, string> = {
      credit_cards: 'Credit cards',
      mortgage: 'Mortgage',
      auto_loans: 'Auto loans',
      student_loans: 'Student loans',
      other_loans: 'Other loans',
      other: 'Other debt',
    };

    const rows = (Object.keys(buckets) as Array<keyof typeof buckets>)
      .map((bucket) => ({
        bucket,
        label: labelMap[bucket],
        amount: buckets[bucket],
        percent: total > 0 ? buckets[bucket] / total : 0,
      }))
      .filter((row) => row.amount > 0)
      .sort((a, b) => b.amount - a.amount);

    return { total, rows };
  }, [accounts, manualAssets]);

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
    <section
      className="container mx-auto py-6 md:py-8 px-3 md:px-4 space-y-6 md:space-y-8"
      data-star-click-block="true"
    >
      <div className="dashboard-intro">
        <h1 className="dashboard-greeting">Good Morning, {dashboardName}</h1>
      </div>

      {/* Insights Period Controls */}
      <div className="glass-panel dashboard-insights-panel mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
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
              <FeaturePreview featureKey="family.tracking" userTier={familyPreviewTier}>
                <button
                  onClick={() => setDashboardScope('household')}
                  className={`px-3 py-1 text-sm rounded-md transition-all ${
                    dashboardScope === 'household'
                      ? 'bg-primary text-white shadow font-medium'
                      : 'text-text-muted hover:text-text-secondary'
                  }`}
                >
                  Family
                </button>
              </FeaturePreview>
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
          <GlassCard className="gap-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm text-text-muted">Net Worth</h3>
                <p className="text-xs text-text-muted">Period: {insightsLabel}</p>
              </div>
              <InfoPopover label="Net worth calculation">
                Assets minus liabilities for connected accounts and manual holdings in the selected period.
              </InfoPopover>
            </div>
            <MiniTrendChart
              primarySeries={netWorthSeries}
              primaryColor="rgba(144, 205, 255, 0.95)"
              className="mb-1"
            />
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
          </GlassCard>

          {/* Cash Flow */}
          <GlassCard className="gap-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm text-text-muted">Cash Flow</h3>
                <p className="text-xs text-text-muted">Period: {insightsLabel}</p>
              </div>
              <InfoPopover label="Cash flow calculation">
                Inflow minus outflow during the selected period, based on categorized transactions.
              </InfoPopover>
            </div>
            <MiniTrendChart
              primarySeries={insightsCashFlowData?.income ?? []}
              secondarySeries={insightsCashFlowData?.expenses ?? []}
              primaryColor="rgba(103, 252, 198, 0.98)"
              secondaryColor="rgba(255, 134, 196, 0.85)"
              className="mb-1"
            />
            <p id="cashflow-value" className={`text-3xl font-bold ${insightsCashFlowStats.net >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {insightsCashFlowLoading ? '...' : formatCurrency(insightsCashFlowStats.net)}
            </p>
            <p className="text-xs text-text-muted">
              In {formatCompactCurrency(insightsCashFlowStats.income)} • Out {formatCompactCurrency(insightsCashFlowStats.expense)}
            </p>
          </GlassCard>

          {/* Budget Status */}
          <GlassCard className="gap-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm text-text-muted">Budget Status</h3>
                <p className="text-xs text-text-muted">Based on each budget's period (MTD/QTD/YTD)</p>
              </div>
              <InfoPopover label="Budget status calculation">
                Budget progress is computed server-side per budget category using its own period (monthly, quarterly, annual) and does not change with the Insights period selector.
              </InfoPopover>
            </div>
            {budgetStatusLoading ? (
              <p className="text-sm text-text-muted">Loading budget status...</p>
            ) : budgetTotal > 0 ? (
              <>
                <p className="text-3xl font-bold text-primary">{budgetPercent.toFixed(0)}%</p>
                <p className="text-xs text-text-muted">
                  {formatCompactCurrency(budgetSpent)} of {formatCompactCurrency(budgetTotal)} spent
                </p>
                <div className="w-full bg-white/10 rounded-full h-2 mt-1" aria-label="Budget usage">
                  <div className="h-2 rounded-full bg-primary" style={{ width: `${budgetPercent}%` }} />
                </div>
              </>
            ) : (
              <p className="text-sm text-text-muted">No active budgets yet.</p>
            )}
          </GlassCard>

          {/* Linked Accounts */}
          <GlassCard className="gap-3">
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
          </GlassCard>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {/* Cash Flow Pulse */}
          <GlassCard className="gap-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">Cash Flow Pulse</h3>
                <p className="text-xs text-text-muted">Period: {insightsLabel}</p>
              </div>
              <InfoPopover label="Cash flow pulse details">
                Quick view of net cash movement for the selected period.
              </InfoPopover>
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
          </GlassCard>

	          {/* Spending Health */}
	          <GlassCard className="gap-4">
	            <div className="flex items-start justify-between gap-3">
	              <div>
	                <h3 className="text-lg font-semibold">Spending Health</h3>
	                <p className="text-xs text-text-muted">Period: {insightsLabel}</p>
	              </div>
	              <InfoPopover label="Spending health details">
	                Quick read on whether your spending is sustainable for the selected period, based on your income versus expenses.
	              </InfoPopover>
	            </div>
	            {spendingHealth.state === 'needs_data' ? (
	              <p className="text-sm text-text-muted">{spendingHealth.summary}</p>
	            ) : (
	              <div className="space-y-3">
	                <div>
	                  <p className="text-xl font-semibold text-primary">{spendingHealth.label}</p>
	                  <p className="text-xs text-text-muted">{spendingHealth.summary}</p>
	                </div>
	                <div className="space-y-2">
	                  <div className="relative">
	                    <div
	                      className="h-2 rounded-full"
	                      style={{
	                        background:
	                          'linear-gradient(90deg, rgba(244,63,94,0.85) 0%, rgba(251,191,36,0.85) 50%, rgba(34,197,94,0.85) 100%)',
	                      }}
	                    />
	                    <div
	                      className="absolute top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white/80 bg-slate-950/80 shadow-lg shadow-black/40 ring-2 ring-white/15"
	                      style={{
	                        left: `${Math.min(98, Math.max(2, (spendingHealth.scaleIndex / 4) * 100))}%`,
	                        transform: 'translate(-50%, -50%)',
	                      }}
	                      aria-hidden="true"
	                    >
	                      <span className="h-2 w-2 rounded-full bg-white/90" />
	                    </div>
	                  </div>
	                  <div className="flex justify-between text-[10px] text-text-muted">
	                    <span>Overspending</span>
	                    <span>Strong</span>
	                  </div>
	                </div>
	              </div>
	            )}
	          </GlassCard>

          {/* Top Money Drivers */}
          <GlassCard className="gap-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">Top Money Drivers</h3>
                <p className="text-xs text-text-muted">Period: {insightsLabel}</p>
              </div>
              <InfoPopover label="Top money drivers details">
                Shows the highest spending categories during the selected period.
              </InfoPopover>
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
          </GlassCard>

          {/* Upcoming Bills (Forecast) */}
          <GlassCard className="gap-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">Upcoming Bills (Forecast)</h3>
                <p className="text-xs text-text-muted">Next 30 days (fixed)</p>
              </div>
              <InfoPopover label="Upcoming bills forecast details">
                Forecasted from recurring transactions after 30+ days of history.
              </InfoPopover>
            </div>
            {recurringLoading ? (
              <p className="text-sm text-text-muted">Loading upcoming bills...</p>
            ) : recurringForecast.length === 0 ? (
              <div className="space-y-2 text-sm text-text-muted">
                <p>No upcoming bills detected yet.</p>
                <p className="text-xs">Forecasting starts after 30+ days of history.</p>
              </div>
            ) : (
              <div className="space-y-3 text-sm">
                {recurringForecast.slice(0, 4).map((item) => (
                  <div key={`${item.merchant}-${item.next_date}`} className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-text-secondary">{item.merchant}</p>
                      <p className="text-xs text-text-muted">
                        {formatDate(item.next_date, timeZone)} · {item.cadence}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-rose-200">
                        -{formatCompactCurrency(item.average_amount)}
                      </p>
                      <p className="text-xs text-text-muted">
                        {item.occurrence_count} occurrences
                      </p>
                    </div>
                  </div>
                ))}
                {recurringForecast.length > 4 && (
                  <p className="text-xs text-text-muted">
                    +{recurringForecast.length - 4} more bills detected
                  </p>
                )}
                <p className="text-xs text-text-muted">
                  Total upcoming {formatCompactCurrency(recurringTotal)}
                </p>
              </div>
            )}
          </GlassCard>

          {/* Savings Progress Snapshot */}
          <div className="card gap-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">Savings Progress Snapshot</h3>
                <p className="text-xs text-text-muted">Period: {insightsLabel}</p>
              </div>
              <InfoPopover label="Savings snapshot details">
                Savings rate calculated from net cash flow in the selected period.
              </InfoPopover>
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
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">Liquidity &amp; Buffer</h3>
                <p className="text-xs text-text-muted">Based on last 30 days</p>
              </div>
              <InfoPopover label="Liquidity and buffer details">
                Estimates runway based on recent expense averages and liquid balances.
              </InfoPopover>
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
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">Anomaly Watch</h3>
                <p className="text-xs text-text-muted">Period: {insightsLabel}</p>
              </div>
              <InfoPopover label="Anomaly watch details">
                Flags unusual changes in spending and category shifts for the period.
              </InfoPopover>
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

	          {/* Asset Snapshot */}
	          <div className="card gap-4">
	            <div className="flex items-start justify-between gap-3">
	              <div>
	                <h3 className="text-lg font-semibold">Asset Snapshot</h3>
	                <p className="text-xs text-text-muted">Assets (today)</p>
	              </div>
	              <InfoPopover label="Asset snapshot details">
	                Breakdown of your assets across checking, savings, and everything else (investments, property, vehicles, crypto, etc). Includes manual assets and excludes liabilities.
	              </InfoPopover>
	            </div>
	            {assetSnapshot.total <= 0 ? (
	              <p className="text-sm text-text-muted">Add an asset balance to see your allocation.</p>
	            ) : (
	              <div className="space-y-3 text-sm">
	                {assetSnapshot.rows.map((item) => (
	                  <div key={item.bucket} className="space-y-1">
	                    <div className="flex items-center justify-between">
	                      <span className="text-text-secondary">{item.label}</span>
	                      <span className="font-semibold">{formatPercent(item.percent)}</span>
	                    </div>
	                    <div className="w-full bg-white/10 rounded-full h-2">
	                      <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.round(item.percent * 100)}%` }} />
	                    </div>
	                  </div>
	                ))}
	                <p className="text-xs text-text-muted">Total assets {formatCompactCurrency(assetSnapshot.total)}</p>
	              </div>
	            )}
	          </div>

	          {/* Debt Snapshot */}
	          <div className="card gap-4">
	            <div className="flex items-start justify-between gap-3">
	              <div>
	                <h3 className="text-lg font-semibold">Debt Snapshot</h3>
	                <p className="text-xs text-text-muted">Liabilities (today)</p>
	              </div>
	              <InfoPopover label="Debt snapshot details">
	                Breakdown of outstanding balances for credit cards, loans, mortgages, and manual liabilities you’ve added.
	              </InfoPopover>
	            </div>
	            {debtSnapshot.total <= 0 ? (
	              <p className="text-sm text-text-muted">No liability balances detected yet.</p>
	            ) : (
	              <div className="space-y-3 text-sm">
	                {debtSnapshot.rows.map((item) => (
	                  <div key={item.bucket} className="space-y-1">
	                    <div className="flex items-center justify-between">
	                      <span className="text-text-secondary">{item.label}</span>
	                      <span className="font-semibold">{formatPercent(item.percent)}</span>
	                    </div>
	                    <div className="w-full bg-white/10 rounded-full h-2">
	                      <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.round(item.percent * 100)}%` }} />
	                    </div>
	                  </div>
	                ))}
	                <p className="text-xs text-text-muted">Total debt {formatCompactCurrency(debtSnapshot.total)}</p>
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
                        <p className="text-xs text-text-muted">Target date: {formatDate(goal.targetDate, timeZone)}</p>
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
            <Select value={goalType} onChange={(e) => setGoalType(e.target.value as GoalType)}>
              {Object.entries(GOAL_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Select>
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
