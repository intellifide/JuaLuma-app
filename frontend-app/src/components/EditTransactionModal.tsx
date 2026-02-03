// Core Purpose: Modal for editing manual transaction entries.
// Last Updated: 2026-01-24 07:30 CST

import { useState, useEffect } from 'react'
import { Modal } from './ui/Modal'
import { Button } from './ui/Button'
import { useToast } from './ui/Toast'
import { updateTransaction } from '../services/transactions'
import { Transaction } from '../types'
import { Select } from './ui/Select'
import { useUserTimeZone } from '../hooks/useUserTimeZone'
import { formatDateTime } from '../utils/datetime'
import { TRANSACTION_CATEGORIES } from '../constants/transactionCategories'

interface EditTransactionModalProps {
  open: boolean
  transaction: Transaction | null
  onClose: () => void
  onSuccess: () => void
}

export const EditTransactionModal = ({ open, transaction, onClose, onSuccess }: EditTransactionModalProps) => {
  const [loading, setLoading] = useState(false)
  const timeZone = useUserTimeZone()
  const { show } = useToast()
  
  const [formData, setFormData] = useState({
    ts: '',
    amount: '',
    currency: 'USD',
    category: '',
    merchantName: '',
    description: '',
  })

  useEffect(() => {
    if (transaction) {
      // Convert ISO timestamp to local datetime format for input
      const date = new Date(transaction.ts)
      const localDateTime = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16)

      setFormData({
        ts: localDateTime,
        amount: transaction.amount.toString(),
        currency: transaction.currency,
        category: transaction.category || '',
        merchantName: transaction.merchantName || '',
        description: transaction.description || '',
      })
    }
  }, [transaction])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!transaction) return

    setLoading(true)

    try {
      const amount = parseFloat(formData.amount)
      if (isNaN(amount) || amount === 0) {
        show('Please enter a valid amount', 'error')
        return
      }

      // Convert local datetime to ISO string
      const ts = new Date(formData.ts).toISOString()

      // For manual transactions, we can update all fields
      const updatePayload: {
        amount?: number
        merchantName?: string | null
        ts?: string
        category?: string | null
        description?: string | null
      } = {}

      if (transaction.isManual) {
        updatePayload.amount = amount
        updatePayload.merchantName = formData.merchantName || null
        updatePayload.ts = ts
      }
      
      updatePayload.category = formData.category || null
      updatePayload.description = formData.description || null

      await updateTransaction(transaction.id, updatePayload)

      show('Transaction updated successfully', 'success')
      onSuccess()
      onClose()
    } catch (error) {
      show('Failed to update transaction. Please try again.', 'error')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  if (!transaction) return null

  return (
    <Modal open={open} onClose={onClose} title="Edit Transaction">
      <form onSubmit={handleSubmit} className="space-y-4">
        {transaction.isManual && (
          <>
            <div>
              <label htmlFor="ts" className="block text-sm font-bold mb-1">
                Date & Time <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                id="ts"
                name="ts"
                className="form-input w-full"
                value={formData.ts}
                onChange={handleChange}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="amount" className="block text-sm font-bold mb-1">
                  Amount <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="amount"
                  name="amount"
                  step="0.01"
                  className="form-input w-full"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={handleChange}
                  required
                />
                <p className="text-xs text-slate-500 mt-1">Use negative for expenses, positive for income</p>
              </div>

              <div>
                <label htmlFor="currency" className="block text-sm font-bold mb-1">
                  Currency
                </label>
                <input
                  type="text"
                  id="currency"
                  name="currency"
                  className="form-input w-full"
                  value={formData.currency}
                  disabled
                  title="Currency cannot be changed after creation"
                />
              </div>
            </div>

            <div>
              <label htmlFor="merchantName" className="block text-sm font-bold mb-1">
                Merchant Name
              </label>
              <input
                type="text"
                id="merchantName"
                name="merchantName"
                className="form-input w-full"
                placeholder="e.g., Amazon, Starbucks"
                value={formData.merchantName}
                onChange={handleChange}
                maxLength={256}
              />
            </div>
          </>
        )}

        {!transaction.isManual && (
          <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-lg text-sm text-slate-600 dark:text-slate-400">
            <p className="font-semibold mb-1">Automated Transaction</p>
            <p>This transaction was imported from a connected account. Only category and description can be edited.</p>
            <div className="mt-2 space-y-1">
              <p><strong>Date:</strong> {formatDateTime(transaction.ts, timeZone)}</p>
              <p><strong>Amount:</strong> {(() => {
                // Handle crypto currencies that aren't valid ISO 4217 codes
                const isCrypto = !['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY'].includes(transaction.currency.toUpperCase())
                if (isCrypto) {
                  return `${transaction.amount >= 0 ? '+' : ''}${transaction.amount.toFixed(2)} ${transaction.currency}`
                }
                try {
                  return new Intl.NumberFormat('en-US', { style: 'currency', currency: transaction.currency }).format(transaction.amount)
                } catch {
                  return `${transaction.amount >= 0 ? '+' : ''}${transaction.amount.toFixed(2)} ${transaction.currency}`
                }
              })()}</p>
              {transaction.merchantName && <p><strong>Merchant:</strong> {transaction.merchantName}</p>}
            </div>
          </div>
        )}

        <div>
          <label htmlFor="category" className="block text-sm font-bold mb-1">
            Category
          </label>
          <Select
            id="category"
            name="category"
            value={formData.category}
            onChange={handleChange}
          >
            <option value="">Uncategorized</option>
            {TRANSACTION_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-bold mb-1">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            className="form-textarea w-full h-24"
            placeholder="Additional details about this transaction..."
            value={formData.description}
            onChange={handleChange}
            maxLength={512}
          />
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onClose} type="button" disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? 'Updating...' : 'Update Transaction'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
