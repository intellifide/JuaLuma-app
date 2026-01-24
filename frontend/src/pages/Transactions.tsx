// Core Purpose: Transactions list with filters, search, and bulk actions.
// Last Updated: 2026-01-24 01:12 CST

import { useMemo, useRef, useState } from 'react'
import { useTransactions } from '../hooks/useTransactions'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../components/ui/Toast'
import { AddManualTransactionModal } from '../components/AddManualTransactionModal'
import { EditTransactionModal } from '../components/EditTransactionModal'
import { Transaction } from '../types'
import { TRANSACTION_CATEGORIES } from '../constants/transactionCategories'

const CATEGORIES = TRANSACTION_CATEGORIES

// Helpers for Date Management
const formatDateParam = (value: Date) => {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, '0');
  const day = `${value.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getDateRange = (timeframe: string) => {
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

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value)

export const Transactions = () => {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [timeframe, setTimeframe] = useState('all')

  const { profile } = useAuth()
  const toast = useToast()
  const [scope, setScope] = useState<'personal' | 'household'>('personal')
  
  // Check if user has Pro or Ultimate tier for manual transactions
  // Check both profile.plan and subscriptions array as fallback
  const planFromProfile = profile?.plan?.toLowerCase()?.trim()
  // Check active subscriptions first
  const activeSubscription = profile?.subscriptions?.find((sub: any) => sub.status === 'active')
  const planFromSubscriptions = activeSubscription?.plan?.toLowerCase()?.trim()
  const plan = planFromProfile || planFromSubscriptions || 'free'
  const hasManualAccess = plan === 'pro' || plan === 'ultimate'
  const { start, end } = useMemo(() => getDateRange(timeframe), [timeframe])
  const [notesHoverId, setNotesHoverId] = useState<string | null>(null)
  const notesHoverTimeout = useRef<number | null>(null)

  const { transactions, total, pageSize: actualPageSize, loading, refetch, updateOne, remove } = useTransactions({
    filters: {
      category: category || undefined,
      page,
      pageSize,
      scope,
      from: start,
      to: end,
    },
    search: search || undefined,
  })

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / actualPageSize)), [total, actualPageSize])
  const transactionRangeStart = useMemo(() => (page - 1) * actualPageSize + 1, [page, actualPageSize])
  const transactionRangeEnd = useMemo(() => Math.min(page * actualPageSize, total), [page, actualPageSize, total])
  const hasPrevPage = page > 1
  const hasNextPage = page < totalPages

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    refetch()
  }

  const handleEdit = (id: string) => {
    const transaction = transactions.find((t) => t.id === id)
    if (transaction) {
      setEditingTransaction(transaction)
    }
  }

  const handleCategoryChange = async (id: string, newCategory: string) => {
    try {
      await updateOne(id, { category: newCategory })
      toast.show('Category updated', 'success')
    } catch (err) {
      toast.show('Failed to update category', 'error')
    }
  }

  const handleModalSuccess = () => {
    refetch()
  }

  return (
    <section className="container mx-auto py-10 px-4 space-y-8">
      {/* Header */}
      <div className="glass-panel p-6 flex flex-col md:flex-row justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-deep-indigo">Transactions</h1>
          <p className="text-text-secondary mt-1">Filter, search, and bulk edit your transactions.</p>
        </div>
        <div className="mt-4 md:mt-0 flex items-center gap-4">
          <button
            type="button"
            className="px-4 py-2 rounded-lg bg-royal-purple text-white hover:bg-deep-indigo transition-colors text-sm font-medium"
            onClick={() => setShowAddModal(true)}
          >
            Add Transaction
          </button>
          <button
            type="button"
            className="btn btn-outline text-sm"
            onClick={() => window.alert('Export to CSV coming soon.')}
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-panel mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-3 flex-1">
          <input
            type="text"
            placeholder="Search merchant or description"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="form-select"
          >
            <option value="">All categories</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          <select
            value={timeframe}
            onChange={(e) => {
              setPage(1)
              setTimeframe(e.target.value)
            }}
            className="form-select"
          >
            <option value="all">All time</option>
            <option value="1w">Last 7 days</option>
            <option value="1m">Last 30 days</option>
            <option value="3m">Last 90 days</option>
            <option value="6m">Last 180 days</option>
            <option value="1y">Last 12 months</option>
            <option value="ytd">Year to date</option>
          </select>
          <button
            type="submit"
            className="btn btn-primary"
          >
            Apply
          </button>
        </form>
        
        {/* Scope Toggle */}
        <div className="flex items-center gap-4">
          <div className="flex bg-white/5 border border-white/10 rounded-lg p-1">
            <button
              type="button"
              onClick={() => setScope('personal')}
              className={`px-3 py-1 text-sm rounded-md transition-all ${
                scope === 'personal'
                  ? 'bg-royal-purple text-white shadow font-medium'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              Personal
            </button>
            <button
              type="button"
              onClick={() => {
                const isUltimate = profile?.plan?.toLowerCase().includes('ultimate');
                if (!isUltimate) {
                  toast.show("Upgrade to Ultimate to view Family transactions.", "error");
                  return;
                }
                setScope('household');
              }}
              className={`px-3 py-1 text-sm rounded-md transition-all ${
                scope === 'household'
                  ? 'bg-royal-purple text-white shadow font-medium'
                  : 'text-text-muted hover:text-text-secondary'
              } ${!profile?.plan?.toLowerCase().includes('ultimate') ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Family
            </button>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="glass-panel mb-10">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-3 mb-6">
          <h2 className="text-xl font-semibold">Transactions</h2>
          <span className="text-xs text-text-muted">
            {transactionRangeStart}-{transactionRangeEnd} of {total || 0}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="table w-full">
            <thead>
              <tr className="text-left text-text-muted border-b border-slate-200">
                <th className="pb-3">Date</th>
                <th className="pb-3">Description</th>
                <th className="pb-3">Category</th>
                <th className="pb-3">Amount</th>
                <th className="pb-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-6 text-text-muted italic">Loading...</td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-6 text-text-muted italic">No transactions found</td>
                </tr>
              ) : (
                transactions.map(txn => (
                  <tr key={txn.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 text-sm">{new Date(txn.ts).toLocaleDateString()}</td>
                    <td className="py-3 font-medium text-text-primary">
                      <div
                        className="relative inline-flex items-center"
                        onMouseEnter={() => {
                          if (!txn.description) return
                          if (notesHoverTimeout.current) {
                            window.clearTimeout(notesHoverTimeout.current)
                          }
                          notesHoverTimeout.current = window.setTimeout(() => {
                            setNotesHoverId(txn.id)
                          }, 2000)
                        }}
                        onMouseLeave={() => {
                          if (notesHoverTimeout.current) {
                            window.clearTimeout(notesHoverTimeout.current)
                            notesHoverTimeout.current = null
                          }
                          setNotesHoverId(null)
                        }}
                      >
                        <span>{txn.merchantName || txn.description || '—'}</span>
                        {txn.description && notesHoverId === txn.id && (
                          <div className="absolute left-0 top-full mt-2 w-64 rounded-lg border border-white/10 bg-surface-1/90 p-3 text-xs text-text-secondary shadow-xl backdrop-blur z-50">
                            <p className="text-xs font-semibold text-text-primary mb-1">Notes</p>
                            <p className="text-xs text-text-secondary">{txn.description}</p>
                          </div>
                        )}
                      </div>
                    </td>
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
                    <td className="py-3 text-right">
                      <div className="flex justify-end gap-3 text-sm">
                        <button
                          type="button"
                          className="text-royal-purple hover:underline"
                          onClick={() => handleEdit(txn.id)}
                        >
                          Edit
                        </button>
                        {txn.isManual && (
                          <button
                            type="button"
                            className="text-rose-500 hover:underline"
                            onClick={() => {
                              if (window.confirm('Are you sure you want to delete this transaction?')) {
                                remove(txn.id)
                              }
                            }}
                          >
                            Delete
                          </button>
                        )}
                        {!txn.isManual && (
                          <span className="text-text-muted text-xs" title="Automated transactions cannot be deleted">
                            Auto
                          </span>
                        )}
                      </div>
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
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value))
                setPage(1)
              }}
            >
              {[10, 25, 50, 100].map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
            <button
              className="btn btn-sm btn-outline"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={!hasPrevPage}
            >
              Prev
            </button>
            <button
              className="btn btn-sm btn-outline"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={!hasNextPage}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <AddManualTransactionModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={handleModalSuccess}
      />

      <EditTransactionModal
        open={!!editingTransaction}
        transaction={editingTransaction}
        onClose={() => setEditingTransaction(null)}
        onSuccess={handleModalSuccess}
      />
    </section>
  )
}
