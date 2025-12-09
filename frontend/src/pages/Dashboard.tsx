// Updated 2025-12-08 21:49 CST by ChatGPT
import { useMemo, useState } from 'react'
import ReactECharts from 'echarts-for-react'
import { AccountCard } from '../components/AccountCard'
import { PlaidLinkButton } from '../components/PlaidLinkButton'
import { TransactionTable } from '../components/TransactionTable'
import { useAuth } from '../hooks/useAuth'
import { useAccounts } from '../hooks/useAccounts'
import { useTransactions } from '../hooks/useTransactions'
import { Account } from '../types'

const tabs: { key: string; label: string }[] = [
  { key: 'all', label: 'All Accounts' },
  { key: 'traditional', label: 'Traditional' },
  { key: 'investment', label: 'Investment' },
  { key: 'web3', label: 'Web3' },
  { key: 'cex', label: 'CEX' },
  { key: 'manual', label: 'Manual' },
]

export const Dashboard = () => {
  const { profile } = useAuth()
  const [activeTab, setActiveTab] = useState('all')
  const { accounts, loading: accountsLoading, sync, remove } = useAccounts()
  const {
    transactions,
    loading: transactionsLoading,
    page,
    pageSize,
    total,
    refetch: refetchTransactions,
    updateOne,
    remove: removeTransaction,
  } = useTransactions({ filters: { page: 1, pageSize: 10 } })

  const filteredAccounts = useMemo(
    () =>
      activeTab === 'all'
        ? accounts
        : accounts.filter((acct) => acct.accountType === activeTab),
    [accounts, activeTab],
  )

  const totalBalance = useMemo(
    () =>
      accounts.reduce((sum, acct) => sum + (acct.balance ?? 0), 0),
    [accounts],
  )

  const handleSync = async (accountId: string) => {
    await sync(accountId)
    refetchTransactions()
  }

  const renderChart = (title: string, series: number[]) => (
    <ReactECharts
      option={{
        title: { text: title, left: 'center' },
        tooltip: { trigger: 'axis' },
        xAxis: { type: 'category', data: ['W1', 'W2', 'W3', 'W4'] },
        yAxis: { type: 'value' },
        series: [{ data: series, type: 'line', smooth: true, areaStyle: {} }],
      }}
      style={{ height: 240 }}
    />
  )

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 space-y-6">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">Welcome back</p>
          <h1 className="text-3xl font-bold text-deep-indigo">
            {profile?.email ?? 'Dashboard'}
          </h1>
          <p className="text-slate-600">
            Plan: {profile?.plan ?? profile?.subscriptions?.[0]?.plan ?? 'Free'}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-500">Total Balance</p>
          <p className="text-2xl font-semibold text-deep-indigo">
            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalBalance)}
          </p>
        </div>
      </header>

      <section className="bg-white/80 border border-slate-200 rounded-2xl shadow-sm p-4 backdrop-blur space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">Accounts</h2>
          <PlaidLinkButton onSuccess={() => refetchTransactions()} />
        </div>
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1 rounded-full text-sm border ${
                activeTab === tab.key ? 'bg-royal-purple text-white border-royal-purple' : 'border-slate-200 text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {accountsLoading ? (
          <p className="text-sm text-slate-500">Loading accounts...</p>
        ) : filteredAccounts.length === 0 ? (
          <p className="text-sm text-slate-500">No accounts yet. Connect one to get started.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredAccounts.map((account: Account) => (
              <AccountCard
                key={account.id}
                account={account}
                onSync={handleSync}
                onDelete={remove}
                onEdit={() => {}}
              />
            ))}
          </div>
        )}
      </section>

      <section className="bg-white/80 border border-slate-200 rounded-2xl shadow-sm p-4 backdrop-blur space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">Recent Transactions</h2>
          <button
            type="button"
            className="text-royal-purple hover:underline text-sm"
            onClick={() => (window.location.href = '/transactions')}
          >
            View All
          </button>
        </div>
        {transactionsLoading ? (
          <p className="text-sm text-slate-500">Loading transactions...</p>
        ) : (
          <TransactionTable
            transactions={transactions}
            onEdit={(id) => updateOne(id, {})}
            onDelete={removeTransaction}
            page={page}
            pageSize={pageSize}
            total={total}
          />
        )}
      </section>

      <section className="bg-white/80 border border-slate-200 rounded-2xl shadow-sm p-4 backdrop-blur space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">Insights</h2>
          <div className="flex gap-2 text-sm">
            <button type="button" className="px-3 py-1 rounded-lg border border-slate-200 text-slate-700">
              1M
            </button>
            <button type="button" className="px-3 py-1 rounded-lg border border-slate-200 text-slate-700">
              3M
            </button>
            <button type="button" className="px-3 py-1 rounded-lg border border-slate-200 text-slate-700">
              YTD
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {renderChart('Net Worth Trend', [12000, 13500, 14200, 15500])}
          {renderChart('Cash Flow', [3200, 2800, 3500, 3000])}
          {renderChart('Spending by Category', [500, 620, 480, 700])}
        </div>
      </section>
    </div>
  )
}
