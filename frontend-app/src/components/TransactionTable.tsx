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

// Updated 2025-12-08 21:49 CST by ChatGPT
import { useMemo, useState } from 'react'
import { Transaction } from '../types'
import { TransactionRow } from './TransactionRow'

type TransactionTableProps = {
  transactions: Transaction[]
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
  onPageChange?: (page: number) => void
  page?: number
  pageSize?: number
  total?: number
}

type SortKey = 'ts' | 'merchant' | 'category' | 'amount'

export const TransactionTable = ({
  transactions,
  onEdit,
  onDelete,
  onPageChange,
  page = 1,
  pageSize = 10,
  total = transactions.length,
}: TransactionTableProps) => {
  const [sortKey, setSortKey] = useState<SortKey>('ts')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const sorted = useMemo(() => {
    const copy = [...transactions]
    copy.sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1
      if (sortKey === 'amount') return (a.amount - b.amount) * dir
      if (sortKey === 'category') return ((a.category ?? '') > (b.category ?? '') ? 1 : -1) * dir
      if (sortKey === 'merchant')
        return ((a.merchantName ?? a.description ?? '') > (b.merchantName ?? b.description ?? '')
          ? 1
          : -1) * dir
      // default ts
      return (new Date(a.ts).getTime() - new Date(b.ts).getTime()) * dir
    })
    return copy
  }, [transactions, sortDir, sortKey])

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  return (
    <div className="glass-panel p-0 overflow-hidden">
      <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
        <thead className="bg-white dark:bg-slate-800/60">
          <tr>
            <th
              scope="col"
              className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider cursor-pointer"
              onClick={() => handleSort('ts')}
            >
              Date
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider cursor-pointer"
              onClick={() => handleSort('merchant')}
            >
              Merchant
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider cursor-pointer"
              onClick={() => handleSort('category')}
            >
              Category
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider cursor-pointer"
              onClick={() => handleSort('amount')}
            >
              Amount
            </th>
            <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white/80 dark:bg-slate-900/40">
          {sorted.map((txn) => (
            <TransactionRow
              key={txn.id}
              transaction={txn}
              onUpdate={() => onEdit?.(txn.id)}
              onDelete={onDelete}
            />
          ))}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-6 text-center text-sm text-text-muted">
                No transactions yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="flex items-center justify-between px-4 py-3 bg-white/80 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-700">
        <p className="text-sm text-text-secondary">
          Page {page} of {totalPages}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn btn-outline text-sm"
            onClick={() => onPageChange?.(page - 1)}
            disabled={page <= 1}
          >
            Previous
          </button>
          <button
            type="button"
            className="btn btn-outline text-sm"
            onClick={() => onPageChange?.(page + 1)}
            disabled={page >= totalPages}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}
