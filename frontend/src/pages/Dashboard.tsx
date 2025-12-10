import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useAccounts } from '../hooks/useAccounts';
import { useTransactions } from '../hooks/useTransactions';
import { PlaidLinkButton } from '../components/PlaidLinkButton';
import { Account, Transaction } from '../types';

interface DashboardDataset {
  netWorth: string;
  netWorthChange: string;
  cashFlow: string;
  cashFlowBreakdown: string;
  budgetPercent: string;
  budgetAmount: string;
  accounts: string;
  cashflowLabels: string[];
  networthChart: {
    startLabel: string;
    endLabel: string;
    subtitle: string;
    points: string;
  };
}

// Mock Data Sets from template for Charts (Visuals only)
const DATASETS: Record<string, DashboardDataset> = {
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

export default function Dashboard() {
  const { user } = useAuth();
  const { accounts, refetch: refetchAccounts } = useAccounts();
  const { transactions } = useTransactions();

  const [timeframe, setTimeframe] = useState('1m');
  const [activeTab, setActiveTab] = useState('all-accounts');

  const currentData: DashboardDataset = DATASETS[timeframe] || DATASETS['1m'];

  // Calculate Real Total Balance
  const totalBalance = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
  const formattedBalance = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalBalance);

  // Filter Accounts
  const filteredAccounts = accounts.filter(acc => {
    if (activeTab === 'all-accounts') return true;
    if (activeTab === 'checking') return acc.accountType === 'traditional';
    if (activeTab === 'investment') return acc.accountType === 'investment';
    // Add logic for web3/cex if those types existed in our backend, simpler fallback:
    return false;
  });

  // Calculate Net Worth Chart SVG Path
  const netWorthPoints = currentData.networthChart.points;
  const netWorthArea = `0,120 ${netWorthPoints} 320,120`;
  const netWorthDots = netWorthPoints.split(' ').map((p: string) => {
    const [x, y] = p.split(',');
    return { cx: x, cy: y };
  });

  return (
    <section className="container mx-auto py-10 px-4 space-y-8">

      {/* Header with Plaid Connect */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-white/50 backdrop-blur-md p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-3xl font-bold text-deep-indigo">Dashboard</h1>
          <p className="text-slate-600 mt-1">Welcome back, {user?.displayName || user?.email}</p>
        </div>
        <div className="mt-4 md:mt-0 flex items-center gap-4">
          <div className="text-right mr-4 hidden md:block">
            <span className="block text-sm text-slate-500">Total Balance</span>
            <span className="block text-2xl font-bold text-royal-purple">{formattedBalance}</span>
          </div>
          <PlaidLinkButton onSuccess={refetchAccounts} />
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
          <div className="custom-period-wrapper mt-4">
            <span className="section-timeframe-label">Custom Period:</span>
            <div className="flex gap-2 items-center">
              <label htmlFor="custom-start-date" className="sr-only">Start date</label>
              <input type="date" id="custom-start-date" className="form-input w-auto" />
              <span>to</span>
              <label htmlFor="custom-end-date" className="sr-only">End date</label>
              <input type="date" id="custom-end-date" className="form-input w-auto" />
              <button id="apply-custom-period" className="btn btn-sm btn-primary px-3 py-1 text-sm">Apply</button>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <div className="card">
          <h3 className="text-sm text-slate-500 mb-2">Total Net Worth</h3>
          {/* Use Real Balance if > 0, else mock for display */}
          <p id="net-worth-value" className="text-3xl font-bold text-royal-purple">{totalBalance > 0 ? formattedBalance : currentData.netWorth}</p>
          <p id="net-worth-change" className="text-sm text-emerald-600 mt-1">{currentData.netWorthChange}</p>
        </div>
        <div className="card">
          <h3 className="text-sm text-slate-500 mb-2">Cash Flow (This Month)</h3>
          <p id="cashflow-value" className="text-3xl font-bold text-royal-purple">{currentData.cashFlow}</p>
          <p id="cashflow-breakdown" className="text-sm text-slate-500 mt-1">{currentData.cashFlowBreakdown}</p>
        </div>
        <div className="card">
          <h3 className="text-sm text-slate-500 mb-2">Budget Status</h3>
          <p id="budget-percent" className="text-3xl font-bold text-royal-purple">{currentData.budgetPercent}</p>
          <p id="budget-amount" className="text-sm text-slate-500 mt-1">{currentData.budgetAmount}</p>
        </div>
        <div className="card">
          <h3 className="text-sm text-slate-500 mb-2">Linked Accounts</h3>
          <p id="accounts-count" className="text-3xl font-bold text-royal-purple">{accounts.length > 0 ? accounts.length : currentData.accounts}</p>
          <p className="text-sm text-slate-500 mt-1">Real-time Data</p>
        </div>
      </div>

      {/* Infographics & Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        {/* Net Worth Trend */}
        <div className="chart-card" id="networth-chart">
          <div className="chart-title">Net Worth Trend</div>
          <div className="chart-subtitle" id="networth-subtitle">{currentData.networthChart.subtitle}</div>
          <p className="sr-only" id="networth-desc">Net worth trend chart showing growth over selected time period.</p>
          <svg className="chart-svg" viewBox="0 0 320 140" role="img" aria-label="Net worth trend line chart" aria-describedby="networth-desc">
            <defs>
              <linearGradient id="networthGradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.25" />
                <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <g id="networth-area">
              <polyline fill="url(#networthGradient)" stroke="none" points={netWorthArea} />
            </g>
            <g id="networth-line">
              <polyline fill="none" stroke="var(--color-primary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={currentData.networthChart.points} />
            </g>
            <g id="networth-dots" fill="var(--color-primary)">
              {netWorthDots.map((d: { cx: string; cy: string }, i: number) => (
                <circle key={i} cx={d.cx} cy={d.cy} r="4" />
              ))}
            </g>
            <text id="networth-start-label" x="5" y="20" fontSize="12" fill="var(--text-muted)">{currentData.networthChart.startLabel}</text>
            <text id="networth-end-label" x="260" y="30" fontSize="12" fill="var(--text-primary)">{currentData.networthChart.endLabel}</text>
          </svg>
          <div className="chart-legend">
            <span className="legend-item"><span className="legend-swatch bg-royal-purple"></span>Net Worth</span>
          </div>
        </div>

        {/* Cash Flow */}
        <div className="chart-card" id="cashflow-chart">
          <div className="chart-title">Cash Flow</div>
          <div className="chart-subtitle">Income vs. Expenses</div>
          <p className="sr-only" id="cashflow-desc">Cash flow chart showing income and expenses by week.</p>
          <svg className="chart-svg" viewBox="0 0 320 160" role="img" aria-label="Cash flow bar chart" aria-describedby="cashflow-desc">
            <rect x="20" y="45" width="50" height="70" rx="6" fill="var(--color-primary)" />
            <rect x="90" y="25" width="50" height="100" rx="6" fill="var(--color-accent)" />
            <rect x="170" y="55" width="50" height="70" rx="6" fill="#DC2626" />
            <rect x="250" y="70" width="50" height="55" rx="6" fill="#DC2626" />
            <text x="45" y="150" fontSize="11" fill="var(--text-muted)" textAnchor="middle">Week 1</text>
            <text x="115" y="150" fontSize="11" fill="var(--text-muted)" textAnchor="middle">Week 2</text>
            <text x="195" y="150" fontSize="11" fill="var(--text-muted)" textAnchor="middle">Week 3</text>
            <text x="275" y="150" fontSize="11" fill="var(--text-muted)" textAnchor="middle">Week 4</text>
            <text x="45" y="38" fontSize="11" fill="var(--color-primary)" textAnchor="middle" fontWeight="600">{currentData.cashflowLabels[0]}</text>
            <text x="115" y="18" fontSize="11" fill="var(--color-accent)" textAnchor="middle" fontWeight="600">{currentData.cashflowLabels[1]}</text>
            <text x="195" y="48" fontSize="11" fill="#DC2626" textAnchor="middle" fontWeight="600">{currentData.cashflowLabels[2]}</text>
            <text x="275" y="63" fontSize="11" fill="#DC2626" textAnchor="middle" fontWeight="600">{currentData.cashflowLabels[3]}</text>
          </svg>
          <div className="chart-legend">
            <span className="legend-item"><span className="legend-swatch bg-cyan-400"></span>Income</span>
            <span className="legend-item"><span className="legend-swatch bg-red-600"></span>Expenses</span>
          </div>
        </div>

        {/* Spending by Category */}
        <div className="chart-card">
          <div className="chart-title">Spending by Category</div>
          <div className="chart-subtitle">Month-to-date distribution</div>
          <p className="sr-only" id="spending-desc">Spending distribution.</p>
          <svg className="chart-svg" viewBox="0 0 200 200" role="img" aria-label="Spending by category donut chart" aria-describedby="spending-desc">
            <circle cx="100" cy="100" r="80" fill="none" stroke="var(--border-color)" strokeWidth="24" />
            <circle cx="100" cy="100" r="80" fill="none" stroke="var(--color-primary)" strokeWidth="24" strokeDasharray="150 502" strokeDashoffset="0" />
            <circle cx="100" cy="100" r="80" fill="none" stroke="var(--color-accent)" strokeWidth="24" strokeDasharray="120 502" strokeDashoffset="-150" />
            <circle cx="100" cy="100" r="80" fill="none" stroke="#F59E0B" strokeWidth="24" strokeDasharray="90 502" strokeDashoffset="-270" />
            <circle cx="100" cy="100" r="80" fill="none" stroke="#10B981" strokeWidth="24" strokeDasharray="60 502" strokeDashoffset="-360" />
            <circle cx="100" cy="100" r="80" fill="none" stroke="#EF4444" strokeWidth="24" strokeDasharray="82 502" strokeDashoffset="-420" />
            <text x="100" y="105" textAnchor="middle" fontSize="18" fill="var(--text-primary)" fontWeight="700">$2,550</text>
            <text x="100" y="125" textAnchor="middle" fontSize="12" fill="var(--text-muted)">Spent / $3,750</text>
          </svg>
          <div className="chart-legend">
            <span className="legend-item"><span className="legend-swatch bg-royal-purple"></span>Food</span>
            <span className="legend-item"><span className="legend-swatch bg-cyan-400"></span>Fun</span>
            <span className="legend-item"><span className="legend-swatch bg-amber-500"></span>Transport</span>
            <span className="legend-item"><span className="legend-swatch bg-emerald-500"></span>Utils</span>
            <span className="legend-item"><span className="legend-swatch bg-red-500"></span>Other</span>
          </div>
        </div>
      </div>

      {/* Account Overview (Real Data) */}
      <div className="glass-panel mb-10">
        <h2 className="mb-6 text-xl font-semibold">Account Overview</h2>
        <div className="tabs mb-6">
          <ul className="tab-list flex gap-4 border-b border-slate-200" role="tablist">
            <li><button className={`px-4 py-2 border-b-2 transition-colors ${activeTab === 'all-accounts' ? 'border-royal-purple text-royal-purple font-medium' : 'border-transparent text-slate-500 hover:text-slate-700'}`} onClick={() => setActiveTab('all-accounts')}>All Accounts</button></li>
            <li><button className={`px-4 py-2 border-b-2 transition-colors ${activeTab === 'checking' ? 'border-royal-purple text-royal-purple font-medium' : 'border-transparent text-slate-500 hover:text-slate-700'}`} onClick={() => setActiveTab('checking')}>Checking</button></li>
            <li><button className={`px-4 py-2 border-b-2 transition-colors ${activeTab === 'investment' ? 'border-royal-purple text-royal-purple font-medium' : 'border-transparent text-slate-500 hover:text-slate-700'}`} onClick={() => setActiveTab('investment')}>Investment</button></li>
          </ul>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {accounts.length === 0 ? (
            <div className="col-span-full text-center py-10 text-slate-500 italic">
              No accounts connected. Use the button above to link an account.
            </div>
          ) : (
            filteredAccounts.map((account: Account) => (
              <div key={account.id} className="card hover:shadow-lg transition-shadow">
                <h3 className="font-semibold text-lg">{account.accountName}</h3>
                <p className="text-2xl font-bold text-royal-purple my-2">
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: account.currency || 'USD' }).format(account.balance || 0)}
                </p>
                <p className="text-sm text-slate-500">
                  {account.accountNumberMasked ? `Account ending in ${account.accountNumberMasked}` : account.accountType}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Recent Transactions (Real Data) */}
      <div className="glass-panel mb-10">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Recent Transactions</h2>
          <button className="btn btn-outline btn-sm">View All</button>
        </div>
        <div className="overflow-x-auto">
          <table className="table w-full">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-200">
                <th className="pb-3">Date</th>
                <th className="pb-3">Description</th>
                <th className="pb-3">Category</th>
                <th className="pb-3">Amount</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-6 text-slate-500 italic">No transactions found</td>
                </tr>
              ) : (
                transactions.slice(0, 10).map((txn: Transaction) => (
                  <tr key={txn.id} className="border-b border-slate-100 last:border-0">
                    <td className="py-3 text-slate-700">{new Date(txn.ts).toLocaleDateString()}</td>
                    <td className="py-3 font-medium text-slate-900">{txn.merchantName || txn.description}</td>
                    <td className="py-3">
                      <span className="px-2 py-1 rounded-full bg-slate-100 text-xs text-slate-600">
                        {txn.category || 'Uncategorized'}
                      </span>
                    </td>
                    <td className={`py-3 text-right font-medium ${txn.amount > 0 ? 'text-emerald-600' : 'text-slate-900'}`}>
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: txn.currency || 'USD' }).format(txn.amount)}
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
