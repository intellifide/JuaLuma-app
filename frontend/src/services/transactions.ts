// Updated 2025-12-08 21:49 CST by ChatGPT
import { api } from './api'
import { PaginatedResponse, Transaction, TransactionFilters } from '../types'

type TransactionUpdatePayload = Partial<{
  category: string
  description: string
}>

type BulkUpdatePayload = {
  transactionIds: string[]
  updates: TransactionUpdatePayload
}

const handleError = (error: unknown) => {
  const message =
    error instanceof Error ? error.message : 'Something went wrong. Please try again.'
  window.alert(message)
  throw error
}

const mapTransaction = (data: any): Transaction => ({
  id: data.id,
  uid: data.uid,
  accountId: data.account_id ?? data.accountId,
  ts: data.ts,
  amount:
    typeof data.amount === 'number'
      ? data.amount
      : data.amount
        ? Number(data.amount)
        : 0,
  currency: data.currency,
  category: data.category ?? null,
  merchantName: data.merchant_name ?? data.merchantName ?? null,
  description: data.description ?? null,
  externalId: data.external_id ?? data.externalId ?? null,
  isManual: Boolean(data.is_manual ?? data.isManual),
  archived: Boolean(data.archived),
  rawJson: data.raw_json ?? data.rawJson ?? null,
  createdAt: data.created_at ?? data.createdAt,
  updatedAt: data.updated_at ?? data.updatedAt,
})

const mapListResponse = (data: any): PaginatedResponse<Transaction> => ({
  data: Array.isArray(data.transactions)
    ? data.transactions.map(mapTransaction)
    : Array.isArray(data.data)
      ? data.data.map(mapTransaction)
      : [],
  total: data.total ?? 0,
  page: data.page ?? 1,
  pageSize: data.page_size ?? data.pageSize ?? 50,
})

const buildQueryParams = (filters?: TransactionFilters) => {
  const params = new URLSearchParams()
  if (!filters) return params
  if (filters.accountId) params.set('account_id', filters.accountId)
  if (filters.category) params.set('category', filters.category)
  if (filters.search) params.set('search', filters.search)
  if (filters.from) params.set('start_date', filters.from)
  if (filters.to) params.set('end_date', filters.to)
  if (filters.page) params.set('page', String(filters.page))
  if (filters.pageSize) params.set('page_size', String(filters.pageSize))
  return params
}

export const getTransactions = async (
  filters?: TransactionFilters,
): Promise<PaginatedResponse<Transaction>> => {
  try {
    const { data } = await api.get('/transactions', { params: buildQueryParams(filters) })
    return mapListResponse(data)
  } catch (error) {
    handleError(error)
    return { data: [], total: 0, page: 1, pageSize: 50 }
  }
}

export const getTransaction = async (id: string): Promise<Transaction> => {
  try {
    const { data } = await api.get(`/transactions/${id}`)
    return mapTransaction(data)
  } catch (error) {
    handleError(error)
    throw error
  }
}

export const updateTransaction = async (
  id: string,
  payload: TransactionUpdatePayload,
): Promise<Transaction> => {
  try {
    const { data } = await api.patch(`/transactions/${id}`, {
      category: payload.category,
      description: payload.description,
    })
    return mapTransaction(data)
  } catch (error) {
    handleError(error)
    throw error
  }
}

export const bulkUpdateTransactions = async (
  payload: BulkUpdatePayload,
): Promise<number> => {
  try {
    const { data } = await api.patch('/transactions/bulk', {
      transaction_ids: payload.transactionIds,
      updates: {
        category: payload.updates.category,
        description: payload.updates.description,
      },
    })
    return data.updated_count ?? data.updatedCount ?? payload.transactionIds.length
  } catch (error) {
    handleError(error)
    throw error
  }
}

export const deleteTransaction = async (id: string): Promise<void> => {
  try {
    await api.delete(`/transactions/${id}`)
  } catch (error) {
    handleError(error)
  }
}

export const searchTransactions = async (
  query: string,
  filters?: TransactionFilters,
): Promise<PaginatedResponse<Transaction>> => {
  try {
    const params = buildQueryParams(filters)
    params.set('q', query)
    const { data } = await api.get('/transactions/search', { params })
    return mapListResponse(data)
  } catch (error) {
    handleError(error)
    return { data: [], total: 0, page: 1, pageSize: 50 }
  }
}
