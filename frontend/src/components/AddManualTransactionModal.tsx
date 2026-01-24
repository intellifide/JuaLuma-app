// Core Purpose: Modal for adding manual transaction entries (Pro/Ultimate tier only)
// Last Updated: 2026-01-24 01:12 CST

import { useState, useEffect } from 'react'
import { Modal } from './ui/Modal'
import { Button } from './ui/Button'
import { useAccounts } from '../hooks/useAccounts'
import { useToast } from './ui/Toast'
import { createTransaction } from '../services/transactions'
import { Account } from '../types'
import { TRANSACTION_CATEGORIES } from '../constants/transactionCategories'

interface AddManualTransactionModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export const AddManualTransactionModal = ({ open, onClose, onSuccess }: AddManualTransactionModalProps) => {
  const [loading, setLoading] = useState(false)
  const { show } = useToast()
  const { accounts, loading: accountsLoading } = useAccounts({ filters: { accountType: 'manual' } })
  
  const [formData, setFormData] = useState({
    accountId: '',
    ts: new Date().toISOString().slice(0, 16), // Format: YYYY-MM-DDTHH:mm
    amount: '',
    currency: 'USD',
    category: '',
    merchantName: '',
    description: '',
  })

  useEffect(() => {
    // Set first manual account as default if available
    if (accounts.length > 0 && !formData.accountId) {
      setFormData((prev) => ({ ...prev, accountId: accounts[0].id }))
    }
  }, [accounts])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const amount = parseFloat(formData.amount)
      if (isNaN(amount) || amount === 0) {
        show('Please enter a valid amount', 'error')
        return
      }

      if (!formData.accountId) {
        show('Please select an account', 'error')
        return
      }

      // Convert local datetime to ISO string
      const ts = new Date(formData.ts).toISOString()

      await createTransaction({
        accountId: formData.accountId,
        ts,
        amount,
        currency: formData.currency,
        category: formData.category || null,
        merchantName: formData.merchantName || null,
        description: formData.description || null,
      })

      show('Transaction added successfully', 'success')
      onSuccess()
      onClose()
      
      // Reset form
      setFormData({
        accountId: accounts.length > 0 ? accounts[0].id : '',
        ts: new Date().toISOString().slice(0, 16),
        amount: '',
        currency: 'USD',
        category: '',
        merchantName: '',
        description: '',
      })
    } catch (error) {
      show('Failed to create transaction. Please try again.', 'error')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Manual Transaction">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="accountId" className="block text-sm font-bold mb-1">
            Account <span className="text-red-500">*</span>
          </label>
          <select
            id="accountId"
            name="accountId"
            className="form-select w-full"
            value={formData.accountId}
            onChange={handleChange}
            required
            disabled={accountsLoading || accounts.length === 0}
          >
            {accounts.length === 0 ? (
              <option value="">No manual accounts available</option>
            ) : (
              accounts.map((account: Account) => (
                <option key={account.id} value={account.id}>
                  {account.customLabel || account.accountName || 'Unnamed Account'}
                </option>
              ))
            )}
          </select>
          {accounts.length === 0 && (
            <p className="text-xs text-slate-500 mt-1">
              Please create a manual account first from the Accounts page.
            </p>
          )}
        </div>

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
            <select
              id="currency"
              name="currency"
              className="form-select w-full"
              value={formData.currency}
              onChange={handleChange}
            >
              <optgroup label="Fiat Currencies">
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="JPY">JPY</option>
                <option value="CAD">CAD</option>
                <option value="AUD">AUD</option>
              </optgroup>
              <optgroup label="Cryptocurrencies">
                <option value="BTC">BTC (Bitcoin)</option>
                <option value="ETH">ETH (Ethereum)</option>
                <option value="SOL">SOL (Solana)</option>
                <option value="ADA">ADA (Cardano)</option>
                <option value="XRP">XRP (Ripple)</option>
                <option value="USDT">USDT (Tether)</option>
                <option value="USDC">USDC (USD Coin)</option>
                <option value="DAI">DAI (Dai Stablecoin)</option>
              </optgroup>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="merchantName" className="block text-sm font-bold mb-1">
            Description
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

        <div>
          <label htmlFor="category" className="block text-sm font-bold mb-1">
            Category
          </label>
          <select
            id="category"
            name="category"
            className="form-select w-full"
            value={formData.category}
            onChange={handleChange}
          >
            <option value="">Uncategorized</option>
            {TRANSACTION_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-bold mb-1">
            Notes
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
          <Button variant="primary" type="submit" disabled={loading || accounts.length === 0}>
            {loading ? 'Adding...' : 'Add Transaction'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
