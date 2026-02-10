// Core Purpose: Financial analysis view for budgets and trends.
// Last Modified: 2026-01-26 09:30 CST

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useUserTimeZone } from '../hooks/useUserTimeZone';
import { useBudget, Budget } from '../hooks/useBudget';
import { useBudgetHistory, useBudgetStatus, type BudgetPeriod, type BudgetStatusItem } from '../hooks/useBudgetReporting';
import { useNetWorth, useCashFlow, useSpendingByCategory } from '../hooks/useAnalytics';
import { useManualAssets } from '../hooks/useManualAssets';
import { DataPoint } from '../services/analytics';
import { useToast } from '../components/ui/Toast';
import { Modal } from '../components/ui/Modal';
import { FeaturePreview } from '../components/ui/FeaturePreview';
import { ExpandableChartModal } from '../components/ExpandableChartModal';
import Switch from '../components/ui/Switch';
import { Select } from '../components/ui/Select';
import { TRANSACTION_CATEGORIES, getCategoryEmoji } from '../constants/transactionCategories';
import { loadTransactionPreferences, getTransactionPreferencesStorageKey, ACCOUNT_TYPES } from '../utils/transactionPreferences';
import { getManualNetWorthAtDate } from '../utils/manualAssets';

// Helpers for Date Management
// Format a local date to YYYY-MM-DD for API params.
const formatDateParam = (value: Date) => {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, '0');
  const day = `${value.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Parse YYYY-MM-DD in UTC for stable chart labels.
const parseDateUTC = (dateStr: string) => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
};

// Format month/year labels with apostrophe to avoid day/month ambiguity.
const formatMonthYearLabel = (value: Date, timeZone: string) => {
  const month = value.toLocaleDateString(undefined, { month: 'short', timeZone });
  const year = value.toLocaleDateString(undefined, { year: '2-digit', timeZone });
  return `${month} \u2019${year}`;
};

// Sort data points to ensure charts render newest-to-oldest along the x-axis.
const sortDataPointsDesc = (points: DataPoint[]) =>
  [...points].sort((a, b) => b.date.localeCompare(a.date));

// Align x-axis labels based on index position within the chart track.
const getXAxisLabelStyle = (index: number, total: number, x: number) => {
  if (index === 0) {
    return { left: x, transform: 'translateX(0%)' };
  }
  if (index === total - 1) {
    return { left: x, transform: 'translateX(-100%)' };
  }
  return { left: x, transform: 'translateX(-50%)' };
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

const formatSignedCurrency = (value: number) =>
  `${value >= 0 ? '+' : '-'}${formatCurrency(Math.abs(value))}`;

// SVG Generators
const generateLinePath = (
  data: DataPoint[],
  width: number,
  height: number,
  labelMode: 'day' | 'monthYear',
  timeZone: string,
) => {
  const padding = { top: 30, right: 30, bottom: 20, left: 12 };
  const drawWidth = width - padding.left - padding.right;
  const drawHeight = height - padding.top - padding.bottom;

  if (!data || data.length === 0) return { path: '', areaPath: '', dots: [], yLabels: [], xLabels: [], padding, points: [] };

  const values = data.map(d => d.value);
  const min = Math.min(...values) * 0.95;
  const max = Math.max(...values) * 1.08;
  const range = max - min || 1;
  const denominator = Math.max(data.length - 1, 1);

  const points = data.map((d, i) => {
    const x = data.length === 1
      ? padding.left + drawWidth / 2
      : padding.left + (i / denominator) * drawWidth;
    const y = padding.top + drawHeight - ((d.value - min) / range) * drawHeight;
    return { x, y, value: d.value, date: d.date };
  });

  const path = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaPath = `${padding.left},${padding.top + drawHeight} ${path} ${padding.left + drawWidth},${padding.top + drawHeight}`;

  // Y-axis labels (Value)
  const yLabels = [min, (min + max) / 2, max].map(val => ({
    label: formatCompactCurrency(val),
    y: padding.top + drawHeight - ((val - min) / range) * drawHeight
  }));

  // X-axis labels (Timeframe - start, mid, end)
  const labelIndices = Array.from(
    new Set([0, Math.floor(data.length / 2), data.length - 1])
  ).filter((i) => i >= 0 && i < data.length);
  const xLabels = labelIndices.map(i => {
    const value = parseDateUTC(data[i].date);
    const label = labelMode === 'monthYear'
      ? formatMonthYearLabel(value, timeZone)
      : value.toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone });
    return {
      label,
      x: data.length === 1
        ? padding.left + drawWidth / 2
        : padding.left + (i / denominator) * drawWidth
    };
  });

  // Select a few points to show dots (start, middle, end)
  const dotIndices = [0, Math.floor(data.length / 2), data.length - 1];
  const dots = dotIndices.map(i => ({ cx: points[i].x, cy: points[i].y }));

  return {
    path,
    areaPath,
    dots,
    yLabels,
    xLabels,
    padding,
    points
  };
};

const generateCashFlowTrendChart = (
  income: DataPoint[],
  expenses: DataPoint[],
  width: number,
  height: number,
  cfInterval: string,
  timeZone: string,
) => {
  const padding = { top: 30, right: 10, bottom: 20, left: 12 };
  const drawWidth = width - padding.left - padding.right;
  const drawHeight = height - padding.top - padding.bottom;

  // Merge dates to ensure alignment
  const allDates = new Set([...income.map(d => d.date), ...expenses.map(d => d.date)]);
  const sortedDates = Array.from(allDates).sort((a, b) => b.localeCompare(a));

  if (sortedDates.length === 0) {
    return { points: [], inflowPath: '', outflowPath: '', inflowDots: [], outflowDots: [], yLabels: [], xLabels: [], padding };
  }

  const dataMap: Record<string, { inc: number, exp: number }> = {};
  sortedDates.forEach(d => dataMap[d] = { inc: 0, exp: 0 });

  income.forEach(d => { if (dataMap[d.date]) dataMap[d.date].inc = d.value; });
  expenses.forEach(d => { if (dataMap[d.date]) dataMap[d.date].exp = Math.abs(d.value); });

  // Calculate max for scale
  let maxVal = 0;
  Object.values(dataMap).forEach(v => {
    maxVal = Math.max(maxVal, v.inc, v.exp);
  });
  maxVal = maxVal * 1.3 || 1000;

  const denominator = Math.max(sortedDates.length - 1, 1);
  const points = sortedDates.map((date, i) => {
    const data = dataMap[date];
    const x = sortedDates.length === 1
      ? padding.left + drawWidth / 2
      : padding.left + (i / denominator) * drawWidth;
    const yInc = padding.top + drawHeight - ((data.inc / maxVal) * drawHeight);
    const yExp = padding.top + drawHeight - ((data.exp / maxVal) * drawHeight);

    return {
      date,
      inc: data.inc,
      exp: data.exp,
      x,
      yInc,
      yExp,
      label: (() => {
        const d = parseDateUTC(date);
        if (cfInterval === 'week') {
          return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone });
        }
        return formatMonthYearLabel(d, timeZone);
      })(),
    };
  });

  // Y-axis labels
  const yLabels = [0, maxVal / 2, maxVal].map(val => ({
    label: formatCompactCurrency(val),
    y: padding.top + drawHeight - (val / maxVal) * drawHeight
  }));

  const inflowPath = points.map((p) => `${p.x.toFixed(1)},${p.yInc.toFixed(1)}`).join(' ');
  const outflowPath = points.map((p) => `${p.x.toFixed(1)},${p.yExp.toFixed(1)}`).join(' ');

  const dotIndices = Array.from(new Set([0, Math.floor(points.length / 2), points.length - 1]))
    .filter((i) => i >= 0 && i < points.length);
  const inflowDots = dotIndices.map((i) => ({ cx: points[i].x, cy: points[i].yInc }));
  const outflowDots = dotIndices.map((i) => ({ cx: points[i].x, cy: points[i].yExp }));

  const labelIndices = Array.from(new Set([0, Math.floor(points.length / 2), points.length - 1]))
    .filter((i) => i >= 0 && i < points.length);
  const xLabels = labelIndices.map((i) => ({ x: points[i].x, label: points[i].label }));

  return { points, inflowPath, outflowPath, inflowDots, outflowDots, yLabels, xLabels, padding };
};

const BudgetTool = ({
  categories,
  budgets,
  statusItems,
  saveBudget,
  bulkSetPeriod,
  resetBudgets
}: {
  categories: string[],
  budgets: Budget[],
  statusItems: BudgetStatusItem[] | null | undefined,
  saveBudget: (cat: string, amount: number | null, period?: Budget['period'], threshold?: number, enabled?: boolean) => Promise<void>,
  bulkSetPeriod: (period: Budget['period']) => Promise<void>,
  resetBudgets: () => Promise<void>
}) => {
  const { user } = useAuth();
  const [editing, setEditing] = useState<string | null>(null);
  const [tempAmount, setTempAmount] = useState<string>('');
  const [tempPeriod, setTempPeriod] = useState<Budget['period']>('monthly');
  const [tempThreshold, setTempThreshold] = useState<string>('80');
  const [tempAlertEnabled, setTempAlertEnabled] = useState<boolean>(true);
  const [expanded, setExpanded] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [bulkUpdating, setBulkUpdating] = useState(false);

  const activeBudgets = budgets;
  const showAll = expanded || activeBudgets.length === 0;
  const categoriesToDisplay = showAll ? categories : activeBudgets.map(b => b.category);
  const showEmptyMessage = !expanded && activeBudgets.length === 0;

  const statusByCategory = useMemo(() => {
    const map = new Map<string, BudgetStatusItem>();
    (statusItems ?? []).forEach((item) => {
      map.set(item.category, item);
    });
    return map;
  }, [statusItems]);

  const getBudget = (cat: string) => {
    const matchingBudgets = budgets.filter(b => b.category === cat);
    if (matchingBudgets.length === 0) return undefined;
    return matchingBudgets.reduce((sum, b) => sum + b.amount, 0);
  };

  const getOwnBudget = (cat: string) => {
    if (!user) return budgets.find(b => b.category === cat);
    return budgets.find(b => b.category === cat && b.uid === user.uid);
  };

  const handleEdit = (cat: string) => {
    const ownBudget = getOwnBudget(cat);
    setEditing(cat);
    setTempAmount(getBudget(cat)?.toString() || '');
    setTempPeriod(ownBudget?.period ?? 'monthly');
    setTempThreshold(
      ownBudget ? String(Math.round(ownBudget.alert_threshold_percent * 100)) : '80'
    );
    setTempAlertEnabled(ownBudget ? ownBudget.alert_enabled : true);
  };

  const handleSave = (
    cat: string,
    finalAmount?: string,
    finalPeriod?: Budget['period'],
    finalThreshold?: string,
    finalEnabled?: boolean,
  ) => {
    const amountStr = finalAmount !== undefined ? finalAmount : tempAmount;
    const periodVal = finalPeriod !== undefined ? finalPeriod : tempPeriod;
    const thresholdStr = finalThreshold !== undefined ? finalThreshold : tempThreshold;
    const enabled = finalEnabled !== undefined ? finalEnabled : tempAlertEnabled;

    const val = amountStr === '' ? null : parseFloat(amountStr);
    if (val !== null && val < 0 && cat === 'Income') return;
    
    const thresholdPercent = thresholdStr === '' ? 80 : parseFloat(thresholdStr);
    saveBudget(
      cat,
      val,
      periodVal,
      Math.min(100, Math.max(0, thresholdPercent)) / 100,
      enabled
    );
  };

  const confirmReset = async () => {
    setResetting(true);
    await resetBudgets();
    setResetting(false);
    setResetConfirmOpen(false);
  };

  return (
    <div className="glass-panel mb-10 transition-all duration-300">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Budget Goals</h2>
        <div className="flex flex-col items-end gap-2">
          {expanded && activeBudgets.length > 0 && (
            <div className="flex items-center gap-3 text-[11px] text-text-muted">
              <span className="whitespace-nowrap">Set all budgets:</span>
              <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-lg p-1">
                {(['monthly', 'quarterly', 'annual'] as const).map((p) => (
                  <button
                    key={p}
                    disabled={bulkUpdating}
                    onClick={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (
                        !window.confirm(
                          `Set all budgets to ${p}? Amounts will be interpreted as per-${p}.`,
                        )
                      )
                        return;
                      setBulkUpdating(true);
                      await bulkSetPeriod(p);
                      setBulkUpdating(false);
                    }}
                    className={`px-3 py-1 text-xs rounded-md transition-colors ${
                      bulkUpdating
                        ? 'opacity-60 cursor-not-allowed'
                        : 'text-primary hover:bg-white/10'
                    }`}
                  >
                    {p === 'monthly' ? 'Monthly' : p === 'quarterly' ? 'Quarterly' : 'Annual'}
                  </button>
                ))}
              </div>
            </div>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-sm font-medium text-primary hover:underline"
          >
            {expanded ? 'Collapse' : (activeBudgets.length > 0 ? 'Edit / Show All' : 'Expand')}
          </button>
          {activeBudgets.length > 0 && (
            <button
              onClick={() => setResetConfirmOpen(true)}
              className="text-[10px] font-medium text-rose-400/70 hover:text-rose-400 transition-colors uppercase tracking-wider"
            >
              Reset All
            </button>
          )}
        </div>
      </div>

      {showEmptyMessage ? (
        <div className="text-center py-6 rounded-lg border-2 border-dashed border-white/10 cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setExpanded(true)}>
          <p className="text-text-muted font-medium">Set your budget by category here</p>
          <p className="text-xs text-text-secondary mt-1">Click to expand and set goals</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {categoriesToDisplay.map(cat => (
              <div key={cat} className="p-4 border border-white/10 rounded-lg flex flex-col gap-2 relative bg-transparent hover:bg-white/5 transition-colors group">
                <div className="flex justify-between items-start">
                  <span className="font-medium text-sm text-text-muted">{cat}</span>
                  {getBudget(cat) !== undefined && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`Clear budget for ${cat}?`)) {
                          saveBudget(cat, null);
                        }
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 -mr-1 -mt-1 text-text-muted hover:text-rose-400 transition-all"
                      title="Reset category"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                {editing === cat ? (
                  <div className="flex flex-col gap-2">
                    <input
                      type="number"
                      className="input py-1 px-2 text-sm w-full bg-transparent border border-white/20 rounded text-text-primary no-spinner"
                      value={tempAmount}
                      onChange={e => {
                        const val = e.target.value;
                        if (cat === 'Income' && parseFloat(val) < 0) return;
                        setTempAmount(val);
                      }}
                      onBlur={() => { handleSave(cat); setEditing(null); }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          handleSave(cat);
                          setEditing(null);
                        }
                      }}
                      placeholder="No Limit"
                      min={cat === 'Income' ? '0' : undefined}
                      autoFocus
                    />
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-text-muted">Period</label>
                      <Select
                        variant="none"
                        wrapperClassName="relative inline-block"
                        className="input py-1 px-2 text-xs bg-transparent border border-white/20 rounded text-text-primary pr-8"
                        value={tempPeriod}
                        onChange={(e) => {
                          const next = e.target.value as Budget['period'];
                          setTempPeriod(next);
                          handleSave(cat, tempAmount, next, tempThreshold, tempAlertEnabled);
                        }}
                      >
                        <option value="monthly">Monthly</option>
                        <option value="quarterly">Quarterly</option>
                        <option value="annual">Annual</option>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <input
                        type="number"
                        className="input py-1 px-2 text-xs w-16 bg-transparent border border-white/20 rounded text-text-primary no-spinner"
                        value={tempThreshold}
                        onChange={e => setTempThreshold(e.target.value)}
                        onBlur={() => handleSave(cat)}
                        onKeyDown={e => e.key === 'Enter' && handleSave(cat)}
                        min="1"
                        max="100"
                      />
                      <span className="text-xs text-text-muted whitespace-nowrap">% alert</span>
                      <div className="ml-auto flex items-center gap-2">
                        <Switch
                          checked={tempAlertEnabled}
                          onChange={(val) => {
                            setTempAlertEnabled(val);
                            handleSave(cat, tempAmount, tempPeriod, tempThreshold, val);
                          }}
                          label="Enabled"
                          compact
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div onClick={() => handleEdit(cat)} className="cursor-pointer rounded -ml-1 flex items-center gap-2 group">
                    <span className={`text-lg font-bold ${getBudget(cat) ? 'text-primary' : 'text-text-muted italic'}`}>
                      {getBudget(cat) ? formatCurrency(getBudget(cat)!) : 'Not Set'}
                    </span>
                    <span className="opacity-0 group-hover:opacity-100 text-xs text-primary">✎</span>
                    {!getOwnBudget(cat)?.alert_enabled && getBudget(cat) !== undefined && (
                      <span className="text-[10px] text-rose-400 font-medium ml-auto">Disabled</span>
                    )}
                  </div>
                )}

                {(() => {
                  const status = statusByCategory.get(cat);
                  if (!status || getBudget(cat) === undefined) return null;
                  const color =
                    status.status === 'over'
                      ? 'bg-rose-400'
                      : status.status === 'at'
                        ? 'bg-primary'
                        : 'bg-emerald-400';
                  const label =
                    status.period === 'monthly' ? 'MTD' : status.period === 'quarterly' ? 'QTD' : 'YTD';
                  return (
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-text-muted">
                        <span>
                          {label} • {status.status.toUpperCase()}
                        </span>
                        <span className="font-medium text-text-secondary">{Math.round(status.percent_used)}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div className={`h-full ${color}`} style={{ width: `${Math.min(100, Math.max(0, status.percent_used))}%` }} />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-text-muted">
                        <span>{formatCompactCurrency(status.spent)} spent</span>
                        <span>of {formatCompactCurrency(status.budget_amount)}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            ))}
          </div>
          {expanded && <p className="text-xs text-text-muted mt-4">* Changes are saved automatically on change or blur.</p>}
        </div>
      )}

      <Modal
        open={resetConfirmOpen}
        onClose={() => setResetConfirmOpen(false)}
        title="Reset all budget goals?"
        footer={
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setResetConfirmOpen(false)}
              className="btn btn-ghost text-sm"
              disabled={resetting}
            >
              Cancel
            </button>
            <button
              onClick={confirmReset}
              className="btn btn-primary text-sm"
              disabled={resetting}
            >
              {resetting ? 'Resetting...' : 'Reset All'}
            </button>
          </div>
        }
      >
        <div className="space-y-3 py-2">
          <p className="text-sm text-text-muted">
            This will clear every budget goal in the current view. This action cannot be undone.
          </p>
        </div>
      </Modal>
    </div>
  );
};

const CATEGORIES = TRANSACTION_CATEGORIES;

const INSIGHTS_OPTIONS = [
  { value: '1w', label: '1W' },
  { value: '1m', label: '1M' },
  { value: '3m', label: '3M' },
  { value: 'ytd', label: 'YTD' },
  { value: '1y', label: '1Y' },
  { value: 'all', label: 'ALL' },
];

const HISTORY_LOOKBACK: Record<BudgetPeriod, number> = {
  monthly: 6,
  quarterly: 4,
  annual: 2,
};

const BudgetHistoryCard = ({ scope }: { scope: 'personal' | 'household' }) => {
  const [period, setPeriod] = useState<BudgetPeriod>('monthly');
  const lookback = HISTORY_LOOKBACK[period];
  const { data, loading, error } = useBudgetHistory(period, lookback, scope);

  return (
    <div className="glass-panel mb-10 transition-all duration-300">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-xl font-semibold">Budget History</h2>
          <p className="text-sm text-text-muted">How you performed in completed periods.</p>
        </div>
        <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-lg p-1">
          {(['monthly', 'quarterly', 'annual'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                period === p ? 'bg-primary/20 text-primary' : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              {p === 'monthly' ? 'Monthly' : p === 'quarterly' ? 'Quarterly' : 'Annual'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-6 text-center text-text-muted">Loading history...</div>
      ) : error ? (
        <div className="py-6 text-center text-rose-400">{error}</div>
      ) : !data?.buckets?.length ? (
        <div className="py-6 text-center text-text-muted">No history yet.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {data.buckets.map((bucket) => (
            <div
              key={bucket.key}
              className="p-4 border border-white/10 rounded-lg bg-transparent hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="font-medium text-sm">{bucket.key}</div>
                <div className="text-sm font-semibold text-text-secondary">{Math.round(bucket.percent_used)}%</div>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${Math.min(100, Math.max(0, bucket.percent_used))}%` }} />
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-text-muted">
                <span>{formatCompactCurrency(bucket.total_spent)} spent</span>
                <span>of {formatCompactCurrency(bucket.total_budget)}</span>
              </div>
              <div className="mt-2 text-[11px] text-text-muted">
                Under {bucket.counts.under} • At {bucket.counts.at} • Over {bucket.counts.over}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default function FinancialAnalysis() {
  const { profile, user } = useAuth();
  const timeZone = useUserTimeZone();
  const toast = useToast();
  const [dashboardScope, setDashboardScope] = useState<'personal' | 'household'>('personal');
  const isUltimate = Boolean(profile?.plan?.toLowerCase().includes('ultimate'));
  const isHouseholdAdmin = profile?.household_member?.role === 'admin';
  const canViewHousehold = Boolean(profile?.household_member?.can_view_household);
  const canSeeScopeToggle = (isUltimate && isHouseholdAdmin) || canViewHousehold;
  const hasHouseholdAccess = canSeeScopeToggle;
  const familyPreviewTier = hasHouseholdAccess ? 'ultimate' : undefined;

  const [timeframe, setTimeframe] = useState('1m');
  const [expandedChart, setExpandedChart] = useState<'networth' | 'cashflow' | null>(null);
  const { start, end, nwInterval, cfInterval } = useMemo(() => getDateRange(timeframe), [timeframe]);
  const { start: fullStart, end: fullEnd } = useMemo(() => getDateRange('all'), []);

  // Load transaction preferences from localStorage and listen for changes
  const [transactionPreferences, setTransactionPreferences] = useState(() => loadTransactionPreferences(user?.uid));

  // Listen for localStorage changes to update preferences in real-time
  useEffect(() => {
    const key = getTransactionPreferencesStorageKey(user?.uid);
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue) {
        try {
          setTransactionPreferences(JSON.parse(e.newValue));
        } catch (err) {
          console.warn('Failed to parse transaction preferences from storage event:', err);
        }
      }
    };

    // Also check for changes periodically (in case storage event doesn't fire in same tab)
    const intervalId = setInterval(() => {
      const current = loadTransactionPreferences(user?.uid);
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
  }, [user?.uid]);

  // Exclude account types not selected in transaction preferences (default = all)
  const excludeAccountTypes = useMemo(() => {
    const included = transactionPreferences.accountTypesIncluded ?? [...ACCOUNT_TYPES]
    const excluded = ACCOUNT_TYPES.filter((t) => !included.includes(t))
    return excluded.length > 0 ? excluded.join(',') : undefined
  }, [transactionPreferences.accountTypesIncluded])

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

  const { budgets, saveBudget, resetBudgets, bulkSetPeriod } = useBudget(dashboardScope);
  const { data: budgetStatus } = useBudgetStatus(dashboardScope);
  const { assets: manualAssets } = useManualAssets();

  // Keep the dashboard scope aligned with the user's household access.
  useEffect(() => {
    if (!canSeeScopeToggle && dashboardScope === 'household') {
      setDashboardScope('personal');
    }
  }, [canSeeScopeToggle, dashboardScope]);

  const { data: nwData, loading: nwLoading } = useNetWorth(start, end, nwInterval, dashboardScope, analyticsFilters);
  const { data: cfData, loading: cfLoading } = useCashFlow(start, end, cfInterval, dashboardScope, analyticsFilters);
  const { data: nwFullData, loading: nwFullLoading } = useNetWorth(fullStart, fullEnd, 'monthly', dashboardScope, analyticsFilters);
  const { data: cfFullData, loading: cfFullLoading } = useCashFlow(fullStart, fullEnd, 'month', dashboardScope, analyticsFilters);
  const { data: spendData, loading: spendLoading } = useSpendingByCategory(start, end, dashboardScope, analyticsFilters);

  // Spending Stats
  const { totalExpense, topCategories } = useMemo(() => {
    if (!spendData?.data) return { totalExpense: 0, topCategories: [] };
    const total = spendData.data.reduce((sum, item) => sum + item.amount, 0);
    return { totalExpense: total, topCategories: spendData.data };
  }, [spendData]);

  // Chart Generators
  const netWorthPointWidth = nwInterval === 'daily' ? 22 : nwInterval === 'weekly' ? 26 : 30;
  const cashFlowPointWidth = cfInterval === 'week' ? 30 : 42;
  const netWorthLabelMode = timeframe === '1w' || timeframe === '1m' ? 'day' : 'monthYear';
  const netWorthSeries = useMemo(
    () =>
      sortDataPointsDesc(nwData?.data || []).map((point) => ({
        ...point,
        value: point.value + getManualNetWorthAtDate(manualAssets, point.date),
      })),
    [nwData?.data, manualAssets],
  );
  const cashFlowIncomeSeries = useMemo(
    () => sortDataPointsDesc(cfData?.income || []),
    [cfData?.income],
  );
  const cashFlowExpenseSeries = useMemo(
    () => sortDataPointsDesc(cfData?.expenses || []),
    [cfData?.expenses],
  );
  const netWorthFullSeries = useMemo(
    () =>
      sortDataPointsDesc(nwFullData?.data || []).map((point) => ({
        ...point,
        value: point.value + getManualNetWorthAtDate(manualAssets, point.date),
      })),
    [nwFullData?.data, manualAssets],
  );
  const cashFlowFullIncomeSeries = useMemo(
    () => sortDataPointsDesc(cfFullData?.income || []),
    [cfFullData?.income],
  );
  const cashFlowFullExpenseSeries = useMemo(
    () => sortDataPointsDesc(cfFullData?.expenses || []),
    [cfFullData?.expenses],
  );
  const netWorthChartWidth = useMemo(
    () => Math.max(320, netWorthSeries.length * netWorthPointWidth),
    [netWorthSeries.length, netWorthPointWidth],
  );
  const cashFlowChartWidth = useMemo(
    () => Math.max(320, cashFlowIncomeSeries.length * cashFlowPointWidth),
    [cashFlowIncomeSeries.length, cashFlowPointWidth],
  );
  const netWorthChart = useMemo(
    () => generateLinePath(netWorthSeries, netWorthChartWidth, 140, netWorthLabelMode, timeZone),
    [netWorthSeries, netWorthChartWidth, netWorthLabelMode, timeZone],
  ); // Height 140 match SVG
  const cashFlowChart = useMemo(
    () => generateCashFlowTrendChart(cashFlowIncomeSeries, cashFlowExpenseSeries, cashFlowChartWidth, 160, cfInterval, timeZone),
    [cashFlowIncomeSeries, cashFlowExpenseSeries, cashFlowChartWidth, cfInterval, timeZone],
  );

  const hasNetWorthData = useMemo(
    () => netWorthSeries.some((point) => Math.abs(point.value) > 0.005),
    [netWorthSeries],
  );

  const hasCashFlowData = useMemo(
    () => (
      cashFlowIncomeSeries.some((point) => Math.abs(point.value) > 0.005)
      || cashFlowExpenseSeries.some((point) => Math.abs(point.value) > 0.005)
    ),
    [cashFlowIncomeSeries, cashFlowExpenseSeries],
  );

  const netWorthSummary = useMemo(() => {
    const latest = netWorthSeries[0];
    const previous = netWorthSeries[1];
    if (!latest) {
      return { current: null, delta: null };
    }
    return {
      current: latest.value,
      delta: previous ? latest.value - previous.value : null,
    };
  }, [netWorthSeries]);

  const cashFlowSummary = useMemo(() => {
    const inflowTotal = cashFlowIncomeSeries.reduce((sum, point) => sum + point.value, 0);
    const outflowTotal = cashFlowExpenseSeries.reduce((sum, point) => sum + Math.abs(point.value), 0);
    return {
      inflowTotal,
      outflowTotal,
      net: inflowTotal - outflowTotal,
    };
  }, [cashFlowIncomeSeries, cashFlowExpenseSeries]);

  const [netWorthHover, setNetWorthHover] = useState<{
    x: number;
    y: number;
    xPct: number;
    yPct: number;
    value: number;
    date: string;
  } | null>(null);
  const [cashFlowHover, setCashFlowHover] = useState<{
    x: number;
    y: number;
    xPct: number;
    yPct: number;
    label: string;
    date: string;
    inflow: number;
    outflow: number;
    line: 'inflow' | 'outflow';
  } | null>(null);
  const netWorthSvgSize = { width: netWorthChartWidth, height: 140 };
  const cashFlowSvgSize = { width: cashFlowChartWidth, height: 160 };

  useEffect(() => {
    if (!hasNetWorthData) {
      setNetWorthHover(null);
    }
  }, [hasNetWorthData]);

  useEffect(() => {
    if (!hasCashFlowData) {
      setCashFlowHover(null);
    }
  }, [hasCashFlowData]);

  const handleNetWorthMove = useCallback((event: React.MouseEvent<SVGSVGElement>) => {
    if (!netWorthChart.points.length) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * netWorthSvgSize.width;
    const points = netWorthChart.points;
    let closestIndex = 0;
    for (let i = 1; i < points.length; i += 1) {
      if (Math.abs(points[i].x - x) < Math.abs(points[closestIndex].x - x)) {
        closestIndex = i;
      }
    }
    const point = points[closestIndex];
    setNetWorthHover({
      x: point.x,
      y: point.y,
      xPct: (point.x / netWorthSvgSize.width) * 100,
      yPct: (point.y / netWorthSvgSize.height) * 100,
      value: point.value,
      date: point.date,
    });
  }, [netWorthChart.points, netWorthSvgSize.width, netWorthSvgSize.height]);

  const handleCashFlowMove = useCallback((event: React.MouseEvent<SVGSVGElement>) => {
    if (!cashFlowChart.points.length) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * cashFlowSvgSize.width;
    const y = ((event.clientY - rect.top) / rect.height) * cashFlowSvgSize.height;
    const points = cashFlowChart.points;
    let closestIndex = 0;
    for (let i = 1; i < points.length; i += 1) {
      if (Math.abs(points[i].x - x) < Math.abs(points[closestIndex].x - x)) {
        closestIndex = i;
      }
    }
    const point = points[closestIndex];
    const candidates = [
      { y: point.yInc, line: 'inflow' as const },
      { y: point.yExp, line: 'outflow' as const },
    ];
    const chosen = candidates.reduce((prev, curr) => (
      Math.abs(curr.y - y) < Math.abs(prev.y - y) ? curr : prev
    ));
    setCashFlowHover({
      x: point.x,
      y: chosen.y,
      xPct: (point.x / cashFlowSvgSize.width) * 100,
      yPct: (chosen.y / cashFlowSvgSize.height) * 100,
      label: point.label,
      date: point.date,
      inflow: point.inc,
      outflow: point.exp,
      line: chosen.line,
    });
  }, [cashFlowChart.points, cashFlowSvgSize.width, cashFlowSvgSize.height]);

  return (
    <section className="container mx-auto py-10 px-4 space-y-8">
      {/* Timeframe Controls */}
      <div className="glass-panel mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="timeframe-controls">
          <div className="section-timeframe-wrapper">
            <span className="section-timeframe-label">Insights Period:</span>
            <div className="timeframe-selector" role="group" aria-label="Select insights period">
              {INSIGHTS_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  className={`timeframe-btn ${timeframe === option.value ? 'active' : ''}`}
                  onClick={() => setTimeframe(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Scope Toggle */}
        {canSeeScopeToggle && (
          <div className="flex items-center gap-4">
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
          </div>
        )}
      </div>

      {/* Budgeting Tool */}
      <FeaturePreview featureKey="budgets.advanced">
        <BudgetTool
          categories={CATEGORIES}
          budgets={budgets}
          statusItems={budgetStatus?.items}
          saveBudget={saveBudget}
          bulkSetPeriod={bulkSetPeriod}
          resetBudgets={resetBudgets}
        />
      </FeaturePreview>

      <FeaturePreview featureKey="budgets.advanced">
        <BudgetHistoryCard scope={dashboardScope} />
      </FeaturePreview>

      {/* Infographics & Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        {/* Net Worth Trend */}
        <div className="chart-card cursor-pointer hover:shadow-lg transition-shadow" id="networth-chart" onClick={() => setExpandedChart('networth')} title="Click to expand chart">
          <div className="chart-title flex items-center justify-between">
            <span>Net Worth Trend</span>
            <svg className="w-5 h-5 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          </div>
          <div className="chart-subtitle">
            {!hasNetWorthData || netWorthSummary.current === null
              ? 'Awaiting account history'
              : `Current: ${formatCurrency(netWorthSummary.current)}`}
          </div>

          {nwLoading ? <div className="h-40 flex items-center justify-center text-text-muted">Loading...</div> : !hasNetWorthData ? (
            <div className="h-[220px] mt-4 flex flex-col items-center justify-center text-center text-text-muted">
              <div className="text-sm font-medium text-text-secondary">No net worth data yet</div>
              <div className="text-xs mt-1">Connect an account or add transactions to see your trend.</div>
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-[64px_1fr] gap-3">
              <div className="relative h-[140px] text-[10px] text-text-muted">
                <div className="absolute right-0 top-0 h-full w-px bg-white/10" />
                {netWorthChart.yLabels?.map((label, i) => (
                  <div
                    key={i}
                    style={{ position: 'absolute', top: `${(label.y / 140) * 100}%`, transform: 'translateY(-50%)', right: 8 }}
                  >
                    {label.label}
                  </div>
                ))}
              </div>
              <div className="overflow-x-auto pt-10">
                <div className="relative" style={{ width: netWorthChartWidth }}>
                  <svg
                    className="chart-svg"
                    viewBox={`0 0 ${netWorthChartWidth} 140`}
                    style={{ width: '100%', minWidth: 320 }}
                    role="img"
                    aria-label="Net worth trend"
                    onMouseMove={handleNetWorthMove}
                    onMouseLeave={() => setNetWorthHover(null)}
                  >
                    <defs>
                      <linearGradient id="networthGradient" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
                      </linearGradient>
                    </defs>

                    {/* Grid Lines */}
                    {netWorthChart.yLabels?.map((l, i) => (
                      <line
                        key={i}
                        x1={netWorthChart.padding.left}
                        y1={l.y}
                        x2={netWorthChartWidth - netWorthChart.padding.right}
                        y2={l.y}
                        stroke="var(--border-color)"
                        strokeWidth="1"
                        strokeOpacity="0.1"
                      />
                    ))}

                    {/* X Axis */}
                    <line
                      x1={netWorthChart.padding.left}
                      y1={140 - netWorthChart.padding.bottom}
                      x2={netWorthChartWidth - netWorthChart.padding.right}
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

                    {netWorthHover && (
                      <g>
                        <line
                          x1={netWorthHover.x}
                          y1={netWorthChart.padding.top}
                          x2={netWorthHover.x}
                          y2={140 - netWorthChart.padding.bottom}
                          stroke="var(--text-muted)"
                          strokeDasharray="3 3"
                          strokeOpacity="0.5"
                        />
                        <line
                          x1={netWorthChart.padding.left}
                          y1={netWorthHover.y}
                          x2={netWorthChartWidth - netWorthChart.padding.right}
                          y2={netWorthHover.y}
                          stroke="var(--text-muted)"
                          strokeDasharray="3 3"
                          strokeOpacity="0.5"
                        />
                        <circle
                          cx={netWorthHover.x}
                          cy={netWorthHover.y}
                          r="4"
                          fill="var(--bg-secondary)"
                          stroke="var(--color-primary)"
                          strokeWidth="2"
                        />
                      </g>
                    )}
                  </svg>
                  {netWorthHover && (
                    <div
                      className="absolute z-10 rounded-md bg-slate-900/90 text-white text-xs px-2 py-1 pointer-events-none shadow-md"
                      style={{
                        left: `${netWorthHover.xPct}%`,
                        top: `${netWorthHover.yPct}%`,
                        transform: netWorthHover.xPct < 15 ? 'translate(0, -120%)' : netWorthHover.xPct > 85 ? 'translate(-100%, -120%)' : 'translate(-50%, -120%)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <div>{parseDateUTC(netWorthHover.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', timeZone })}</div>
                      <div className="font-semibold">{formatCurrency(netWorthHover.value)}</div>
                    </div>
                  )}
                  <div className="relative h-5 mt-2 text-[10px] text-text-muted">
                    {netWorthChart.xLabels.map((label, index) => (
                      <span
                        key={`${label.label}-${index}`}
                        className="absolute"
                        style={getXAxisLabelStyle(index, netWorthChart.xLabels.length, label.x)}
                      >
                        {label.label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
          {!nwLoading && hasNetWorthData && netWorthSummary.delta !== null && (
            <div className={`mt-2 text-xs ${netWorthSummary.delta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {formatSignedCurrency(netWorthSummary.delta)} vs previous period
            </div>
          )}
        </div>

        {/* Cash Flow Chart */}
        <div className="chart-card cursor-pointer hover:shadow-lg transition-shadow" id="cashflow-chart" onClick={() => setExpandedChart('cashflow')} title="Click to expand chart">
          <div className="chart-title flex items-center justify-between">
            <span>Cash Flow</span>
            <svg className="w-5 h-5 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          </div>
          <div className="chart-subtitle">
            {!hasCashFlowData
              ? 'Awaiting cash flow activity'
              : `Net: ${formatSignedCurrency(cashFlowSummary.net)}`}
          </div>

          {cfLoading ? <div className="h-40 flex items-center justify-center text-text-muted">Loading...</div> : !hasCashFlowData ? (
            <div className="h-[220px] mt-4 flex flex-col items-center justify-center text-center text-text-muted">
              <div className="text-sm font-medium text-text-secondary">No cash flow data yet</div>
              <div className="text-xs mt-1">Once income or spending posts, this chart will populate.</div>
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-[64px_1fr] gap-3">
              <div className="relative h-[160px] text-[10px] text-text-muted">
                <div className="absolute right-0 top-0 h-full w-px bg-white/10" />
                {cashFlowChart.yLabels?.map((label, i) => (
                  <div
                    key={i}
                    style={{ position: 'absolute', top: `${(label.y / 160) * 100}%`, transform: 'translateY(-50%)', right: 8 }}
                  >
                    {label.label}
                  </div>
                ))}
              </div>
              <div className="overflow-x-auto pt-10">
                <div className="relative" style={{ width: cashFlowChartWidth }}>
                  <svg
                    className="chart-svg"
                    viewBox={`0 0 ${cashFlowChartWidth} 160`}
                    style={{ width: '100%', minWidth: 320 }}
                    role="img"
                    aria-label="Cash flow trend"
                    onMouseMove={handleCashFlowMove}
                    onMouseLeave={() => setCashFlowHover(null)}
                  >
                    {/* Grid Lines */}
                    {cashFlowChart.yLabels?.map((l, i) => (
                      <line
                        key={i}
                        x1={cashFlowChart.padding.left}
                        y1={l.y}
                        x2={cashFlowChartWidth - cashFlowChart.padding.right}
                        y2={l.y}
                        stroke="var(--border-color)"
                        strokeWidth="1"
                        strokeOpacity="0.1"
                      />
                    ))}

                    {/* X Axis */}
                    <line
                      x1={cashFlowChart.padding.left}
                      y1={160 - cashFlowChart.padding.bottom}
                      x2={cashFlowChartWidth - cashFlowChart.padding.right}
                      y2={160 - cashFlowChart.padding.bottom}
                      stroke="var(--border-color)"
                      strokeWidth="1"
                      strokeOpacity="0.3"
                    />

                    <polyline fill="none" stroke="var(--color-accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={cashFlowChart.inflowPath} />
                    <polyline fill="none" stroke="#DC2626" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={cashFlowChart.outflowPath} />

                    {cashFlowChart.inflowDots.map((d, i) => (
                      <circle key={`inflow-${i}`} cx={d.cx} cy={d.cy} r="3.5" fill="var(--color-accent)" />
                    ))}
                    {cashFlowChart.outflowDots.map((d, i) => (
                      <circle key={`outflow-${i}`} cx={d.cx} cy={d.cy} r="3.5" fill="#DC2626" />
                    ))}

                    {cashFlowHover && (
                      <g>
                        <line
                          x1={cashFlowHover.x}
                          y1={cashFlowChart.padding.top}
                          x2={cashFlowHover.x}
                          y2={160 - cashFlowChart.padding.bottom}
                          stroke="var(--text-muted)"
                          strokeDasharray="3 3"
                          strokeOpacity="0.5"
                        />
                        <line
                          x1={cashFlowChart.padding.left}
                          y1={cashFlowHover.y}
                          x2={cashFlowChartWidth - cashFlowChart.padding.right}
                          y2={cashFlowHover.y}
                          stroke="var(--text-muted)"
                          strokeDasharray="3 3"
                          strokeOpacity="0.5"
                        />
                        <circle
                          cx={cashFlowHover.x}
                          cy={cashFlowHover.y}
                          r="4"
                          fill="var(--bg-secondary)"
                          stroke={cashFlowHover.line === 'inflow' ? 'var(--color-accent)' : '#DC2626'}
                          strokeWidth="2"
                        />
                      </g>
                    )}
                  </svg>
                  {cashFlowHover && (
                    <div
                      className="absolute z-10 rounded-md bg-slate-900/90 text-white text-xs px-2 py-1 pointer-events-none shadow-md"
                      style={{
                        left: `${cashFlowHover.xPct}%`,
                        top: `${cashFlowHover.yPct}%`,
                        transform: cashFlowHover.xPct < 15 ? 'translate(0, -120%)' : cashFlowHover.xPct > 85 ? 'translate(-100%, -120%)' : 'translate(-50%, -120%)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <div>{parseDateUTC(cashFlowHover.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', timeZone })}</div>
                      <div className="font-semibold">{formatSignedCurrency(cashFlowHover.inflow - cashFlowHover.outflow)} net</div>
                    </div>
                  )}
                  <div className="relative h-5 mt-2 text-[10px] text-text-muted">
                    {cashFlowChart.xLabels.map((label, index) => (
                      <span
                        key={`${label.label}-${index}`}
                        className="absolute"
                        style={getXAxisLabelStyle(index, cashFlowChart.xLabels.length, label.x)}
                      >
                        {label.label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
          {!cfLoading && hasCashFlowData && (
            <>
              <div className="chart-legend mt-2 flex justify-center gap-4 text-xs">
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-cyan-400 rounded-sm"></span>Inflow</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-600 rounded-sm"></span>Outflow</span>
              </div>
            </>
          )}
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
	                  const categoryEmoji = getCategoryEmoji(cat.category)
	                  return (
	                    <div key={cat.category}>
	                      <div className="flex justify-between text-xs text-text-secondary mb-1">
	                        <span className="font-medium text-text-primary">
	                          {categoryEmoji ? `${categoryEmoji} ` : ''}
	                          {cat.category}
	                        </span>
	                        <span>{formatCompactCurrency(cat.amount)} ({percent.toFixed(0)}%)</span>
	                      </div>
	                      <div className="w-full bg-white/10 rounded-full h-1.5">
	                        <div className="h-1.5 rounded-full bg-primary" style={{ width: `${percent}%` }} />
	                      </div>
	                    </div>
	                  )
	                })
	              )}
	            </div>
	          )}
	        </div>
      </div>

      {/* Expandable Chart Modals */}
      <ExpandableChartModal
        isOpen={expandedChart === 'networth'}
        onClose={() => setExpandedChart(null)}
        title="Net Worth Trend - Full History"
        data={netWorthFullSeries.length ? netWorthFullSeries : null}
        type="line"
        loading={nwFullLoading}
      />
      
      <ExpandableChartModal
        isOpen={expandedChart === 'cashflow'}
        onClose={() => setExpandedChart(null)}
        title="Cash Flow - Full History"
        data={null}
        type="bar"
        loading={cfFullLoading}
        incomeData={cashFlowFullIncomeSeries}
        expensesData={cashFlowFullExpenseSeries}
        interval="month"
      />
    </section>
  );
}
