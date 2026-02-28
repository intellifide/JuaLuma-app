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

// Core Purpose: Transactions list with filters, search, and bulk actions.
// Last Modified: 2025-01-30

import { useEffect, useMemo, useRef, useState } from 'react'
import { useTransactions } from '../hooks/useTransactions'
import { useAuth } from '../hooks/useAuth'
import { useUserTimeZone } from '../hooks/useUserTimeZone'
import { formatDate } from '../utils/datetime'
import { useAccounts } from '../hooks/useAccounts'
import { useToast } from '../components/ui/Toast'
import { AddManualTransactionModal } from '../components/AddManualTransactionModal'
import { EditTransactionModal } from '../components/EditTransactionModal'
import { Select } from '../components/ui/Select'
import Switch from '../components/ui/Switch'
import { Transaction } from '../types'
import { TRANSACTION_CATEGORIES } from '../constants/transactionCategories'
import {
  loadTransactionPreferences,
  saveTransactionPreferences,
  ACCOUNT_TYPES,
  type AccountTypeFilter,
} from '../utils/transactionPreferences'
import { getTransactionDateRange } from '../utils/dateRanges'

const CATEGORIES = TRANSACTION_CATEGORIES

/** Display labels for account type filters (default = show all). */
const ACCOUNT_TYPE_LABELS: Record<AccountTypeFilter, string> = {
  traditional: 'Traditional (Banks)',
  investment: 'Investment',
  web3: 'Web3',
  cex: 'CEX',
  manual: 'Manual',
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value)

export const Transactions = () => {
  const { profile, user } = useAuth()
  // Load preferences from localStorage per-user (prevents cross-account leakage).
  const savedPreferences = useMemo(() => loadTransactionPreferences(user?.uid), [user?.uid])

  const [search, setSearch] = useState('')
  const [category, setCategory] = useState(savedPreferences.category)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(savedPreferences.pageSize)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [timeframe, setTimeframe] = useState(savedPreferences.timeframe)
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(savedPreferences.showAdvancedFilters)

  // Account types to include (default = all); saved in preferences
  const [accountTypesIncluded, setAccountTypesIncluded] = useState<AccountTypeFilter[]>(savedPreferences.accountTypesIncluded)
  const [sortBy, setSortBy] = useState<'ts_desc' | 'ts_asc' | 'amount_desc' | 'amount_asc' | 'merchant_asc' | 'merchant_desc'>(savedPreferences.sortBy)
  const [isManualFilter, setIsManualFilter] = useState<'all' | 'manual' | 'auto'>(savedPreferences.isManualFilter)

  const timeZone = useUserTimeZone()
  const toast = useToast()
  const [scope, setScope] = useState<'personal' | 'household'>('personal')
  const { accounts, loading: accountsLoading, error: accountsError } = useAccounts({ filters: { scope } })

  // Check if user has Pro or Ultimate tier for manual transactions
  // Check both profile.plan and subscriptions array as fallback
  const { start, end } = useMemo(() => getTransactionDateRange(timeframe), [timeframe])
  const [notesHoverId, setNotesHoverId] = useState<string | null>(null)
  const notesHoverTimeout = useRef<number | null>(null)
  const accountLookup = useMemo(() => {
    return new Map(accounts.map((account) => [account.id, account]))
  }, [accounts])
  const getWeb3Hash = (txn: Transaction) => {
    if (!txn.externalId) return null
    return txn.externalId.split(':')[0]
  }
  const formatChainLabel = (value?: string | null) => {
    const base = (value || 'Crypto').replace(/[_-]+/g, ' ')
    return base.replace(/\b\w/g, (char) => char.toUpperCase())
  }

  // Exclude account types not selected; default (all selected) = no exclusion
  const excludeAccountTypes = useMemo(() => {
    const excluded = ACCOUNT_TYPES.filter((t) => !accountTypesIncluded.includes(t))
    return excluded.length > 0 ? excluded.join(',') : undefined
  }, [accountTypesIncluded])

  // Build isManual filter
  const isManualFilterValue = useMemo(() => {
    if (isManualFilter === 'all') return undefined
    return isManualFilter === 'manual'
  }, [isManualFilter])

  const {
    transactions,
    total,
    pageSize: actualPageSize,
    loading,
    error: transactionsError,
    refetch,
    updateOne,
    remove,
  } = useTransactions({
    filters: {
      category: category || undefined,
      page,
      pageSize,
      scope,
      from: start,
      to: end,
      excludeAccountTypes,
      isManual: isManualFilterValue,
      sortBy,
    },
    search: search || undefined,
  })

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / actualPageSize)), [total, actualPageSize])
  const transactionRangeStart = useMemo(() => (page - 1) * actualPageSize + 1, [page, actualPageSize])
  const transactionRangeEnd = useMemo(() => Math.min(page * actualPageSize, total), [page, actualPageSize, total])
  const hasPrevPage = page > 1
  const hasNextPage = page < totalPages

  // Save preferences whenever filter/sort settings change
  useEffect(() => {
    saveTransactionPreferences({
      accountTypesIncluded,
      category,
      timeframe,
      isManualFilter,
      sortBy,
      pageSize,
      showAdvancedFilters,
    }, user?.uid)
  }, [accountTypesIncluded, category, timeframe, isManualFilter, sortBy, pageSize, showAdvancedFilters, user?.uid])

  // Track if this is the initial mount to avoid unnecessary refetch
  const isInitialMountRef = useRef(true)

  // Auto-apply search with debouncing to avoid excessive API calls while typing
  useEffect(() => {
    // Skip on initial mount (search is empty by default)
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false
      if (search === '') {
        return
      }
    }

    const timeoutId = setTimeout(() => {
      setPage(1)
      refetch()
    }, 500) // 500ms debounce delay - waits for user to stop typing

    return () => clearTimeout(timeoutId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]) // Only trigger when search value changes

  const handleFilterChange = () => {
    setPage(1)
    // SWR will automatically refetch when filters change, but we call refetch to ensure immediate update
    refetch()
  }

  // Handle Enter key in search input for immediate search
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      setPage(1)
      refetch()
    }
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
      {/* Filters */}
      <div className="glass-panel mb-8 space-y-4">
        <div className="flex flex-col lg:flex-row lg:flex-wrap gap-3">
          <input
            type="text"
            placeholder="Search merchant or description"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            className="form-input lg:flex-1 lg:min-w-[18rem]"
          />
          <Select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value)
              handleFilterChange()
            }}
            wrapperClassName="relative lg:min-w-[12rem]"
          >
            <option value="">All categories</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </Select>
          <Select
            value={timeframe}
            onChange={(e) => {
              setPage(1)
              setTimeframe(e.target.value)
            }}
            wrapperClassName="relative lg:min-w-[11rem]"
          >
            <option value="all">All time</option>
            <option value="1w">Last 7 days</option>
            <option value="1m">Last 30 days</option>
            <option value="3m">Last 90 days</option>
            <option value="6m">Last 180 days</option>
            <option value="1y">Last 12 months</option>
            <option value="ytd">Year to date</option>
          </Select>
          <Select
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value as typeof sortBy)
              handleFilterChange()
            }}
            wrapperClassName="relative lg:min-w-[14rem]"
          >
            <option value="ts_desc">Date (Newest First)</option>
            <option value="ts_asc">Date (Oldest First)</option>
            <option value="amount_desc">Amount (High to Low)</option>
            <option value="amount_asc">Amount (Low to High)</option>
            <option value="merchant_asc">Merchant (A-Z)</option>
            <option value="merchant_desc">Merchant (Z-A)</option>
          </Select>
        </div>

        {excludeAccountTypes ? (
          <div className="alert alert-info flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="text-sm">
              <strong>Account types hidden:</strong>{' '}
              {ACCOUNT_TYPES.filter((t) => !accountTypesIncluded.includes(t))
                .map((t) => ACCOUNT_TYPE_LABELS[t])
                .join(', ')}
              . Toggle types below to show or hide them.
            </div>
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={() => {
                setAccountTypesIncluded([...ACCOUNT_TYPES])
                handleFilterChange()
              }}
            >
              Show all types
            </button>
          </div>
        ) : null}

        {accountsError ? (
          <div className="alert alert-error flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <span className="text-sm">Unable to load account metadata for this scope.</span>
            <button
              type="button"
              className="btn btn-sm btn-outline"
              onClick={() => {
                void refetch()
              }}
            >
              Retry
            </button>
          </div>
        ) : null}

        {/* Advanced Filters Toggle */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <button
            type="button"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="text-sm text-primary hover:underline flex items-center gap-2"
          >
            <span>{showAdvancedFilters ? '▼' : '▶'}</span>
            {showAdvancedFilters ? 'Hide' : 'Show'} Advanced Filters
          </button>

          {/* Scope Toggle */}
          <div className="flex items-center gap-4">
            <div className="flex bg-white/5 border border-white/10 rounded-lg p-1">
              <button
                type="button"
                onClick={() => setScope('personal')}
                className={`px-3 py-1 text-sm rounded-md transition-all ${
                  scope === 'personal'
                    ? 'bg-primary text-white shadow font-medium'
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
                    ? 'bg-primary text-white shadow font-medium'
                    : 'text-text-muted hover:text-text-secondary'
                } ${!profile?.plan?.toLowerCase().includes('ultimate') ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Family
              </button>
            </div>
          </div>
        </div>

        {/* Advanced Filters Panel */}
        {showAdvancedFilters && (
          <div className="border-t border-white/10 pt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Account types to include (default = all) */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-text-primary">Show transactions from</label>
                <div className="space-y-3">
                  {ACCOUNT_TYPES.map((type) => (
                    <Switch
                      key={type}
                      checked={accountTypesIncluded.includes(type)}
                      onChange={(checked) => {
                        setAccountTypesIncluded((prev) => {
                          const next = checked
                            ? [...prev, type].sort(
                                (a, b) => ACCOUNT_TYPES.indexOf(a) - ACCOUNT_TYPES.indexOf(b),
                              )
                            : prev.filter((t) => t !== type)
                          // Keep at least one type selected so the list is not empty
                          if (next.length === 0) return prev
                          return next
                        })
                        handleFilterChange()
                      }}
                      label={ACCOUNT_TYPE_LABELS[type]}
                    />
                  ))}
                </div>
                <p className="text-xs text-text-muted">Turn off to hide that account type. Default: all shown.</p>
              </div>

              {/* Transaction Type Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-primary">Transaction Type</label>
                <Select
                  value={isManualFilter}
                  onChange={(e) => {
                    setIsManualFilter(e.target.value as typeof isManualFilter)
                    handleFilterChange()
                  }}
                  className="text-sm"
                  wrapperClassName="relative"
                >
                  <option value="all">All Transactions</option>
                  <option value="manual">Manual Only</option>
                  <option value="auto">Automated Only</option>
                </Select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Transactions Table */}
      <div className="glass-panel mb-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
          <div className="flex flex-col gap-1 md:flex-row md:items-center md:gap-3">
            <h2 className="text-xl font-semibold">Transactions</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary-dark transition-colors text-sm font-medium"
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
        <div className="overflow-x-auto">
          <table className="table w-full">
            <thead>
              <tr className="text-left text-text-muted border-b border-white/10">
                <th className="pb-3">Date</th>
                <th className="pb-3">Description</th>
                <th className="pb-3">Account</th>
                <th className="pb-3">Category</th>
                <th className="pb-3">Amount</th>
                <th className="pb-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading || accountsLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-6 text-text-muted italic">Loading...</td>
                </tr>
              ) : transactionsError ? (
                <tr>
                  <td colSpan={6} className="py-6">
                    <div className="flex flex-col items-center justify-center gap-3 text-center">
                      <p className="text-sm text-rose-300">Failed to load transactions.</p>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline"
                        onClick={() => {
                          void refetch()
                        }}
                      >
                        Retry
                      </button>
                    </div>
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-6 text-text-muted italic">No transactions found</td>
                </tr>
              ) : (
                transactions.map(txn => {
                  const account = accountLookup.get(txn.accountId)
                  const isWeb3 = account?.accountType === 'web3'
                  const web3Hash = isWeb3 ? getWeb3Hash(txn) : null
                  const tooltipContent = isWeb3 && web3Hash
                    ? `Transaction Hash: ${web3Hash}`
                    : txn.description
                  const rawDirection = (txn.rawJson as Record<string, unknown> | null | undefined)?.direction
                  const directionLabel = rawDirection === 'outflow' || txn.amount < 0 ? 'Sent' : 'Received'
                  const chainLabel = formatChainLabel(account?.provider ?? null)
                  const displayLabel = isWeb3
                    ? `${chainLabel} ${directionLabel}`
                    : (txn.merchantName || txn.description || '—')

                  return (
                    <tr key={txn.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 text-sm">{formatDate(txn.ts, timeZone)}</td>
                    <td className="py-3 font-medium text-text-primary">
                      <div
                        className="relative inline-flex items-center"
                        onMouseEnter={() => {
                          if (!tooltipContent) return
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
                        <span>{displayLabel}</span>
                        {tooltipContent && notesHoverId === txn.id && (
                          <div className="absolute left-0 top-full mt-2 min-w-64 max-w-md rounded-lg border border-white/10 bg-surface-1/90 p-3 text-xs text-text-secondary shadow-xl backdrop-blur z-50 break-words">
                            <p className="text-xs font-semibold text-text-primary mb-1">Notes</p>
                            <p className="text-xs text-text-secondary whitespace-pre-wrap break-all">{tooltipContent}</p>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 text-sm font-medium text-text-primary whitespace-nowrap">
                      {accountLookup.get(txn.accountId)?.customLabel ||
                        accountLookup.get(txn.accountId)?.accountName ||
                        '—'}
                    </td>
                    <td className="py-3">
                      <Select
                        variant="none"
                        wrapperClassName="relative inline-block"
                        className="bg-transparent border-none text-sm text-primary font-medium focus:ring-0 cursor-pointer pr-8"
                        value={txn.category || "Uncategorized"}
                        onChange={(e) => handleCategoryChange(txn.id, e.target.value)}
                      >
                        <option value="Uncategorized" disabled>Select...</option>
                        {CATEGORIES.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </Select>
                    </td>
                    <td className={`py-3 text-right font-bold ${txn.amount < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {formatCurrency(txn.amount)}
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex justify-end gap-3 text-sm">
                        <button
                          type="button"
                          className="text-primary hover:underline"
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
                )})
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-6 flex justify-center">
          <div className="flex items-center gap-3">
            <label className="text-xs text-text-muted" htmlFor="transactions-page-size">Rows</label>
            <Select
              id="transactions-page-size"
              variant="none"
              wrapperClassName="relative inline-block"
              className="bg-transparent border border-white/10 rounded-md text-sm px-2 py-1 text-text-secondary pr-8"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value))
                setPage(1)
              }}
            >
              {[10, 25, 50, 100].map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </Select>
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
        <div className="mt-4 text-xs text-text-muted text-right">
          {transactionRangeStart}-{transactionRangeEnd} of {total || 0}
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
