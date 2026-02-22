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

// Updated 2025-12-08 21:49 CST by ChatGPT
import useSWR from 'swr'
import { PaginatedResponse, Transaction, TransactionFilters } from '../types'
import {
  bulkUpdateTransactions,
  createTransaction,
  deleteTransaction,
  getTransactions,
  searchTransactions,
  updateTransaction,
} from '../services/transactions'

type UseTransactionsOptions = {
  filters?: TransactionFilters
  search?: string
}

export const useTransactions = (options?: UseTransactionsOptions) => {
  const fetcher = () =>
    options?.search
      ? searchTransactions(options.search as string, options.filters)
      : getTransactions(options?.filters)

  const { data, error, isLoading, mutate } = useSWR<PaginatedResponse<Transaction>>(
    ['transactions', options?.filters, options?.search],
    fetcher,
  )

  const refetch = () => mutate()

  const updateOne = async (id: string, updates: Partial<Transaction>) => {
    const updated = await updateTransaction(id, {
      category: updates.category,
      description: updates.description,
    })
    mutate(
      (prev) =>
        prev
          ? {
              ...prev,
              data: prev.data.map((txn) => (txn.id === id ? updated : txn)),
            }
          : { data: [updated], total: 1, page: 1, pageSize: 50 },
      { revalidate: false },
    )
    return updated
  }

  const bulkUpdate = async (ids: string[], updates: Partial<Transaction>) => {
    await bulkUpdateTransactions({
      transactionIds: ids,
      updates: { category: updates.category, description: updates.description },
    })
    mutate()
  }

  const remove = async (id: string) => {
    await deleteTransaction(id)
    mutate(
      (prev) =>
        prev
          ? {
              ...prev,
              data: prev.data.filter((txn) => txn.id !== id),
              total: Math.max(0, prev.total - 1),
            }
          : { data: [], total: 0, page: 1, pageSize: 50 },
      { revalidate: false },
    )
  }

  const create = async (payload: Parameters<typeof createTransaction>[0]) => {
    const newTransaction = await createTransaction(payload)
    mutate(
      (prev) =>
        prev
          ? {
              ...prev,
              data: [newTransaction, ...prev.data],
              total: prev.total + 1,
            }
          : { data: [newTransaction], total: 1, page: 1, pageSize: 50 },
      { revalidate: false },
    )
    return newTransaction
  }

  return {
    transactions: data?.data ?? [],
    total: data?.total ?? 0,
    page: data?.page ?? 1,
    pageSize: data?.pageSize ?? 50,
    loading: isLoading,
    error: error ? (error as Error).message : null,
    refetch,
    updateOne,
    bulkUpdate,
    remove,
    create,
  }
}
