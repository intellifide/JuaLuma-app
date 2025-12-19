import React, { useCallback, useMemo, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useAccounts } from '../hooks/useAccounts';
import { useTransactions } from '../hooks/useTransactions';
import { useNetWorth, useCashFlow, useSpendingByCategory } from '../hooks/useAnalytics';
import { PlaidLinkButton } from '../components/PlaidLinkButton';
import { Account } from '../types';
import { DataPoint } from '../services/analytics';

const BUDGET_CAP = 3750; // Simple static budget cap for now

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
const generateLinePath = (data: DataPoint[], width: number, height: number) => {
  if (!data || data.length === 0) return { path: '', areaPath: '', dots: [], min: 0, max: 0, startLabel: '', endLabel: '' };

  const values = data.map(d => d.value);
  const min = Math.min(...values) * 0.99;
  const max = Math.max(...values) * 1.01;
  const range = max - min || 1;

  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((d.value - min) / range) * height;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const path = points.join(' ');
  const areaPath = `0,${height} ${path} ${width},${height}`;

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
    min,
    max,
    startLabel: formatCompactCurrency(data[0].value),
    endLabel: formatCompactCurrency(data[data.length - 1].value)
  };
};

const generateBarChart = (income: DataPoint[], expenses: DataPoint[], width: number, height: number) => {
  // Merge dates to ensure alignment
  const allDates = new Set([...income.map(d => d.date), ...expenses.map(d => d.date)]);
  const sortedDates = Array.from(allDates).sort();

  const dataMap: Record<string, { inc: number, exp: number }> = {};
  sortedDates.forEach(d => dataMap[d] = { inc: 0, exp: 0 });

  income.forEach(d => { if (dataMap[d.date]) dataMap[d.date].inc = d.value; });
  expenses.forEach(d => { if (dataMap[d.date]) dataMap[d.date].exp = Math.abs(d.value); }); // Expenses are negative from DB, simplify? Backend sends +? No DB stored negative. Analytics checks < 0 and sums. But response converts to float. Let's assume + magnitude for display.

  // Calculate max for scale
  let maxVal = 0;
  Object.values(dataMap).forEach(v => {
    maxVal = Math.max(maxVal, v.inc, v.exp);
  });
  maxVal = maxVal * 1.1 || 100;

  const barWidth = (width / sortedDates.length) * 0.4; // 40% width for each bar
  const gap = (width / sortedDates.length) * 0.2;

  const bars = sortedDates.map((date, i) => {
    const xBase = (width / sortedDates.length) * i + gap;
    const vals = dataMap[date];

    const hInc = (vals.inc / maxVal) * height;
    // Let's use standard bottom-up.

    const hExp = (vals.exp / maxVal) * height;
    // Side by side?

    return {
      date,
      xInc: xBase,
      yInc: height - hInc,
      hInc,
      xExp: xBase + barWidth,
      yExp: height - hExp,
      hExp,
      label: new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    };
  });

  return { bars, maxVal };
};


export default function Dashboard() {
  const { user } = useAuth();
  const { accounts, refetch: refetchAccounts } = useAccounts();
  const { transactions, refetch: refetchTransactions } = useTransactions();

  const [timeframe, setTimeframe] = useState('1m');
  const [activeTab, setActiveTab] = useState('all-accounts');

  // Analytics Hooks
  const { start, end, nwInterval, cfInterval } = useMemo(() => getDateRange(timeframe), [timeframe]);

  const { data: nwData, loading: nwLoading } = useNetWorth(start, end, nwInterval);
  const { data: cfData, loading: cfLoading } = useCashFlow(start, end, cfInterval);
  const { data: spendData, loading: spendLoading } = useSpendingByCategory(start, end);

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
    return { totalExpense: total, topCategories: spendData.data.slice(0, 5) };
  }, [spendData]);

  const budgetSpent = totalExpense;
  const budgetPercent = BUDGET_CAP > 0 ? Math.min(100, (budgetSpent / BUDGET_CAP) * 100) : 0;

  // Chart Generators
  const netWorthChart = useMemo(() => generateLinePath(nwData?.data || [], 320, 140), [nwData]); // Height 140 match SVG
  const cashFlowChart = useMemo(() => generateBarChart(cfData?.income || [], cfData?.expenses || [], 320, 160), [cfData]);

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
      <div className="flex flex-col md:flex-row justify-between items-center bg-white/50 backdrop-blur-md p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-3xl font-bold text-deep-indigo">Dashboard</h1>
          <p className="text-text-secondary mt-1">Welcome back, {user?.displayName || user?.email}</p>
        </div>
        <div className="mt-4 md:mt-0 flex items-center gap-4">
          <div className="text-right mr-4 hidden md:block">
            <span className="block text-sm text-text-muted">Total Balance</span>
            <span className="block text-2xl font-bold text-royal-purple">{formatCurrency(totalBalance)}</span>
          </div>
          <PlaidLinkButton onSuccess={handlePlaidSuccess} />
        </div>
      </div>

      {/* Timeframe Controls */}
      <div className="glass-panel mb-8">
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
            {formatCompactCurrency(budgetSpent)} of {formatCompactCurrency(BUDGET_CAP)} spent
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
              <g id="networth-area">
                <polyline fill="url(#networthGradient)" stroke="none" points={netWorthChart.areaPath} />
              </g>
              <g id="networth-line">
                <polyline fill="none" stroke="var(--color-primary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={netWorthChart.path} />
              </g>
              <g id="networth-dots" fill="var(--color-primary)">
                {netWorthChart.dots.map((d, i) => <circle key={i} cx={d.cx} cy={d.cy} r="4" />)}
              </g>
              <text x="5" y="20" fontSize="10" fill="var(--text-muted)">{netWorthChart.startLabel}</text>
              <text x="315" y="135" fontSize="10" fill="var(--text-muted)" textAnchor="end">{netWorthChart.endLabel}</text>
            </svg>
          )}
        </div>

        {/* Cash Flow Chart */}
        <div className="chart-card" id="cashflow-chart">
          <div className="chart-title">Cash Flow</div>
          <div className="chart-subtitle">Income vs Expenses</div>

          {cfLoading ? <div className="h-40 flex items-center justify-center text-text-muted">Loading...</div> : (
            <svg className="chart-svg" viewBox="0 0 320 160" role="img" aria-label="Cash flow bar chart">
              {cashFlowChart.bars.map((bar, i) => (
                <g key={i}>
                  {/* Income Bar (Cyan) */}
                  <rect x={bar.xInc} y={bar.yInc} width={(320 / cashFlowChart.bars.length) * 0.4} height={bar.hInc} rx="2" fill="var(--color-accent)" />
                  {/* Expense Bar (Red) */}
                  <rect x={bar.xExp} y={bar.yExp} width={(320 / cashFlowChart.bars.length) * 0.4} height={bar.hExp} rx="2" fill="#DC2626" />

                  {/* X Axis Label */}
                  <text x={bar.xInc + 5} y="155" fontSize="9" fill="var(--text-muted)" textAnchor="middle">{bar.label}</text>
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
          <div className="chart-subtitle">{spendData?.data.length || 0} Categories Active</div>

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
      <div className="glass-panel mb-10">
        <h2 className="mb-6 text-xl font-semibold">Account Overview</h2>
        <div className="tabs mb-6">
          <ul className="tab-list flex gap-4 border-b border-slate-200" role="tablist">
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
              <div key={account.id} className="card hover:shadow-lg transition-shadow">
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
      </div>

      {/* Recent Transactions */}
      <div className="glass-panel mb-10">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Recent Transactions</h2>
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
                  <tr key={txn.id} className="border-b border-slate-100 last:border-0">
                    <td className="py-3 text-text-secondary">{new Date(txn.ts).toLocaleDateString()}</td>
                    <td className="py-3 font-medium text-text-primary">{txn.merchantName || txn.description}</td>
                    <td className="py-3">
                      <span className="px-2 py-1 rounded-full bg-slate-100 text-xs text-text-secondary">
                        {txn.category || 'Uncategorized'}
                      </span>
                    </td>
                    <td className={`py-3 text-right font-medium ${txn.amount > 0 ? 'text-emerald-600' : 'text-text-primary'}`}>
                      {formatCurrency(txn.amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </section>
  );
}
