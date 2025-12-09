// Updated 2025-12-08 21:49 CST by ChatGPT
import useSWR from 'swr'
import { PaginatedResponse, Transaction, TransactionFilters } from '../types'
import {
  bulkUpdateTransactions,
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
  }
}
