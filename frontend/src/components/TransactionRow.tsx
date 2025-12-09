// Updated 2025-12-08 21:49 CST by ChatGPT
import { useEffect, useState } from 'react'
import { Transaction } from '../types'

type TransactionRowProps = {
  transaction: Transaction
  categories?: string[]
  onUpdate?: (id: string, updates: { category?: string; description?: string }) => Promise<void> | void
  onDelete?: (id: string) => Promise<void> | void
}

const defaultCategories = ['Income', 'Bills', 'Food', 'Transport', 'Shopping', 'Health', 'Travel', 'Other']

const formatDate = (iso: string) => {
  const date = new Date(iso)
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

const formatAmount = (amount: number, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount)

export const TransactionRow = ({ transaction, categories = defaultCategories, onUpdate, onDelete }: TransactionRowProps) => {
  const [category, setCategory] = useState(transaction.category ?? '')
  const [prevCategory, setPrevCategory] = useState(transaction.category ?? '')
  const [pending, setPending] = useState(false)

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

  return (
    <tr className="hover:bg-slate-50">
      <td className="px-4 py-3 text-sm text-slate-600">{formatDate(transaction.ts)}</td>
      <td className="px-4 py-3 text-sm text-slate-800">{transaction.merchantName || transaction.description || '—'}</td>
      <td className="px-4 py-3 text-sm">
        <div className="flex items-center gap-2">
          <select
            className="rounded-lg border border-slate-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-royal-purple"
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
          </select>
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
      <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900">
        {formatAmount(transaction.amount, transaction.currency)}
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex justify-end gap-3 text-sm">
          <button
            type="button"
            className="text-royal-purple hover:underline"
            onClick={() => onUpdate?.(transaction.id, {})}
            disabled={pending}
          >
            Edit
          </button>
          <button
            type="button"
            className="text-rose-500 hover:underline"
            onClick={() => onDelete?.(transaction.id)}
            disabled={pending}
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
  )
}
