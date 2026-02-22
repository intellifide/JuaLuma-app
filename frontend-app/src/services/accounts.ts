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
import { api } from './api'
import { Account, AccountFilter } from '../types'

type ManualAccountPayload = {
  accountType: 'manual'
  provider?: string
  accountName: string
  balance?: number
  assignedMemberUid?: string | null
  customLabel?: string | null
  categoryOverride?: string | null
  balanceType?: 'asset' | 'liability' | null
}

type AccountUpdatePayload = Partial<{
  accountName: string
  balance: number
  assignedMemberUid: string | null
  customLabel: string | null
  categoryOverride: string | null
  balanceType: 'asset' | 'liability' | null
}>

type AccountSyncResponse = {
  syncedCount: number
  newTransactions: number
  startDate: string
  endDate: string
  plan: string
}

const handleError = (error: unknown) => {
  throw error
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapAccount = (data: any): Account => ({
  id: data.id,
  uid: data.uid,
  accountType: data.account_type ?? data.accountType ?? null,
  provider: data.provider ?? null,
  accountName: data.account_name ?? data.accountName ?? null,
  accountNumberMasked: data.account_number_masked ?? data.accountNumberMasked ?? null,
  categoryOverride: data.category_override ?? data.categoryOverride ?? null,
  balanceType: data.balance_type ?? data.balanceType ?? null,
  balance:
    typeof data.balance === 'number'
      ? data.balance
      : data.balance
        ? Number(data.balance)
        : null,
  currency: data.currency ?? null,
  assignedMemberUid: data.assigned_member_uid ?? data.assignedMemberUid ?? null,
  customLabel: data.custom_label ?? data.customLabel ?? null,
  plaidType: data.plaid_type ?? data.plaidType ?? null,
  plaidSubtype: data.plaid_subtype ?? data.plaidSubtype ?? null,
  syncStatus: data.sync_status ?? data.syncStatus ?? null,
  lastSyncedAt: data.last_synced_at ?? data.lastSyncedAt ?? null,
  connectionHealth: data.connection_health ?? data.connectionHealth ?? null,
  reconnectRequired: Boolean(data.reconnect_required ?? data.reconnectRequired ?? false),
  syncMode: data.sync_mode ?? data.syncMode ?? null,
  createdAt: data.created_at ?? data.createdAt,
  updatedAt: data.updated_at ?? data.updatedAt,
})

export const getAccounts = async (filters?: AccountFilter): Promise<Account[]> => {
  try {
    const params = new URLSearchParams()
    if (filters?.accountType) params.set('account_type', filters.accountType)
    if (filters?.provider) params.set('provider', filters.provider)
    if (filters?.scope) params.set('scope', filters.scope)

    const { data } = await api.get('/accounts', { params })
    return Array.isArray(data) ? data.map(mapAccount) : []
  } catch (error) {
    handleError(error)
    return []
  }
}

export const getAccount = async (id: string): Promise<Account> => {
  try {
    const { data } = await api.get(`/accounts/${id}`)
    return mapAccount(data)
  } catch (error) {
    handleError(error)
    throw error
  }
}

export const createManualAccount = async (
  payload: ManualAccountPayload,
): Promise<Account> => {
  try {
  const { data } = await api.post('/accounts/manual', {
    account_type: payload.accountType,
    provider: payload.provider,
    account_name: payload.accountName,
    balance: payload.balance,
    assigned_member_uid: payload.assignedMemberUid,
    custom_label: payload.customLabel,
    category_override: payload.categoryOverride,
    balance_type: payload.balanceType,
  })
    return mapAccount(data)
  } catch (error) {
    handleError(error)
    throw error
  }
}

export const updateAccount = async (
  id: string,
  payload: AccountUpdatePayload,
): Promise<Account> => {
  try {
  const { data } = await api.patch(`/accounts/${id}`, {
    account_name: payload.accountName,
    balance: payload.balance,
    assigned_member_uid: payload.assignedMemberUid,
    custom_label: payload.customLabel,
    category_override: payload.categoryOverride,
    balance_type: payload.balanceType,
  })
    return mapAccount(data)
  } catch (error) {
    handleError(error)
    throw error
  }
}

export const deleteAccount = async (id: string): Promise<void> => {
  try {
    await api.delete(`/accounts/${id}`)
  } catch (error) {
    handleError(error)
  }
}

export const syncAccount = async (id: string, initialSync = false): Promise<AccountSyncResponse> => {
  try {
    const params = new URLSearchParams()
    if (initialSync) params.set('initial_sync', 'true')

    const { data } = await api.post(`/accounts/${id}/sync`, null, { params })
    return {
      syncedCount: data.synced_count ?? data.syncedCount ?? 0,
      newTransactions: data.new_transactions ?? data.newTransactions ?? 0,
      startDate: data.start_date ?? data.startDate,
      endDate: data.end_date ?? data.endDate,
      plan: data.plan,
    }
  } catch (error) {
    handleError(error)
    throw error
  }
}

export const refreshAccountMetadata = async (id: string): Promise<Account> => {
  try {
    const { data } = await api.post(`/accounts/${id}/refresh-metadata`)
    return mapAccount(data)
  } catch (error) {
    handleError(error)
    throw error
  }
}
