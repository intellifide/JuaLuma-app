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

interface RawTransaction {
  id: string
  uid: string
  account_id?: string
  accountId?: string
  ts: string
  amount: number | string
  currency: string
  category?: string | null
  merchant_name?: string | null
  merchantName?: string | null
  description?: string | null
  external_id?: string | null
  externalId?: string | null
  is_manual?: boolean
  isManual?: boolean
  archived?: boolean
  raw_json?: Record<string, unknown> | null
  rawJson?: Record<string, unknown> | null
  created_at?: string
  createdAt?: string
  updated_at?: string
  updatedAt?: string
  user_display_name?: string | null
  userDisplayName?: string | null
  [key: string]: unknown
}

const mapTransaction = (data: unknown): Transaction => {
  const d = data as RawTransaction
  return {
    id: d.id,
    uid: d.uid,
    accountId: d.account_id ?? d.accountId ?? '',
    ts: d.ts,
    amount:
      typeof d.amount === 'number'
        ? d.amount
        : d.amount
          ? Number(d.amount)
          : 0,
    currency: d.currency,
    category: d.category ?? null,
    merchantName: d.merchant_name ?? d.merchantName ?? null,
    description: d.description ?? null,
    externalId: d.external_id ?? d.externalId ?? null,
    isManual: Boolean(d.is_manual ?? d.isManual),
    archived: Boolean(d.archived),
    rawJson: d.raw_json ?? d.rawJson ?? null,
    createdAt: d.created_at ?? d.createdAt,
    updatedAt: d.updated_at ?? d.updatedAt,
    userDisplayName: d.user_display_name ?? d.userDisplayName ?? null,
  }
}

const mapListResponse = (data: unknown): PaginatedResponse<Transaction> => {
  const d = data as { transactions?: RawTransaction[]; data?: RawTransaction[]; total?: number; page?: number; page_size?: number; pageSize?: number }
  return {
    data: Array.isArray(d.transactions)
      ? d.transactions.map(mapTransaction)
      : Array.isArray(d.data)
        ? d.data.map(mapTransaction)
        : [],
    total: d.total ?? 0,
    page: d.page ?? 1,
    pageSize: d.page_size ?? d.pageSize ?? 50,
  }
}

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
  if (filters.scope) params.set('scope', filters.scope)
  if (filters.accountType) params.set('account_type', filters.accountType)
  if (filters.excludeAccountTypes) params.set('exclude_account_types', filters.excludeAccountTypes)
  if (filters.isManual !== undefined) params.set('is_manual', String(filters.isManual))
  if (filters.sortBy) params.set('sort_by', filters.sortBy)
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
  payload: TransactionUpdatePayload & {
    amount?: number
    merchantName?: string | null
    ts?: string
  },
): Promise<Transaction> => {
  try {
    const updateData: Record<string, unknown> = {}
    if (payload.category !== undefined) updateData.category = payload.category
    if (payload.description !== undefined) updateData.description = payload.description
    if (payload.amount !== undefined) updateData.amount = payload.amount
    if (payload.merchantName !== undefined) updateData.merchant_name = payload.merchantName
    if (payload.ts !== undefined) updateData.ts = payload.ts

    const { data } = await api.patch(`/transactions/${id}`, updateData)
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

export const createTransaction = async (payload: {
  accountId: string
  ts: string
  amount: number
  currency?: string
  category?: string | null
  merchantName?: string | null
  description?: string | null
}): Promise<Transaction> => {
  try {
    const { data } = await api.post('/transactions', {
      account_id: payload.accountId,
      ts: payload.ts,
      amount: payload.amount,
      currency: payload.currency || 'USD',
      category: payload.category,
      merchant_name: payload.merchantName,
      description: payload.description,
    })
    return mapTransaction(data)
  } catch (error) {
    handleError(error)
    throw error
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
