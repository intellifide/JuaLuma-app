/*
 * Copyright (c) 2026 Intellifide, LLC.
 * Licensed under PolyForm Noncommercial License 1.0.0.
 * See "PolyForm-Noncommercial-1.0.0.txt" for full text.
 *
 * COMMUNITY RIGHTS:
 * - You CAN modify this code for personal use.
 * - You CAN build and share widgets/plugins for the ecosystem.
 *
 * RESTRICTIONS:
 * - You CANNOT resell, repackage, or distribute this application for a fee.
 * - You CANNOT use this application for commercial enterprise purposes.
 */

// Core Purpose: Render a single transaction row with edit actions.
// Last Updated: 2026-01-24 01:12 CST
import { useEffect, useState } from 'react'
import { Transaction } from '../types'
import { TRANSACTION_CATEGORIES } from '../constants/transactionCategories'
import { useUserTimeZone } from '../hooks/useUserTimeZone'
import { formatDate } from '../utils/datetime'
import { Select } from './ui/Select'

type TransactionRowProps = {
  transaction: Transaction
  categories?: string[]
  onUpdate?: (id: string, updates?: { category?: string; description?: string }) => Promise<void> | void
  onDelete?: (id: string) => Promise<void> | void
}

const defaultCategories = TRANSACTION_CATEGORIES

const formatAmount = (amount: number, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount)

export const TransactionRow = ({ transaction, categories = defaultCategories, onUpdate, onDelete }: TransactionRowProps) => {
  const [category, setCategory] = useState(transaction.category ?? '')
  const [prevCategory, setPrevCategory] = useState(transaction.category ?? '')
  const [pending, setPending] = useState(false)
  const timeZone = useUserTimeZone()

  useEffect(() => {
    setCategory(transaction.category ?? '')
    setPrevCategory(transaction.category ?? '')
  }, [transaction.category])

  const handleCategoryChange = async (next: string) => {
    setCategory(next)
    setPending(true)
    try {
      await onUpdate?.(transaction.id, { category: next })
      setPrevCategory(next)
    } catch (error) {
      setCategory(prevCategory)
      window.alert((error as Error).message ?? 'Unable to update category.')
    } finally {
      setPending(false)
    }
  }

  const handleUndo = async () => {
    setCategory(prevCategory)
    setPending(true)
    try {
      await onUpdate?.(transaction.id, { category: prevCategory })
    } finally {
      setPending(false)
    }
  }

  const hashTooltip = transaction.description?.startsWith('Transaction Hash:')
    ? transaction.description
    : undefined

  return (
    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
      <td className="px-4 py-3 text-sm text-text-secondary">
        {formatDate(transaction.ts, timeZone, { month: 'short', day: 'numeric' })}
      </td>
      <td className="px-4 py-3 text-sm text-text-primary" title={hashTooltip}>
        {transaction.merchantName || transaction.description || '—'}
      </td>
      <td className="px-4 py-3 text-sm">
        <div className="flex items-center gap-2">
          <Select
            className="px-2 py-1 text-sm"
            value={category}
            disabled={pending}
            onChange={(e) => handleCategoryChange(e.target.value)}
          >
            <option value="">Uncategorized</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
          {category !== prevCategory && (
            <button
              type="button"
              className="text-xs text-royal-purple hover:underline"
              onClick={handleUndo}
              disabled={pending}
            >
              Undo
            </button>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-right text-sm font-semibold text-text-primary">
        {formatAmount(transaction.amount, transaction.currency)}
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex justify-end gap-3 text-sm">
          <button
            type="button"
            className="text-royal-purple hover:underline"
            onClick={() => onUpdate?.(transaction.id)}
            disabled={pending}
          >
            Edit
          </button>
          {transaction.isManual && (
            <button
              type="button"
              className="text-rose-500 hover:underline"
              onClick={() => {
                if (window.confirm('Are you sure you want to delete this transaction?')) {
                  onDelete?.(transaction.id)
                }
              }}
              disabled={pending}
            >
              Delete
            </button>
          )}
          {!transaction.isManual && (
            <span className="text-slate-400 text-xs" title="Automated transactions cannot be deleted">
              Auto
            </span>
          )}
        </div>
      </td>
    </tr>
  )
}
