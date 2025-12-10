// Updated 2025-12-08 21:49 CST by ChatGPT
import { api } from './api'
import { Account, AccountFilter } from '../types'

type ManualAccountPayload = {
  accountType: 'manual'
  provider?: string
  accountName: string
}

type AccountUpdatePayload = Partial<{
  accountName: string
  balance: number
}>

type AccountSyncResponse = {
  syncedCount: number
  newTransactions: number
  startDate: string
  endDate: string
  plan: string
}

const handleError = (error: unknown) => {
  const message =
    error instanceof Error ? error.message : 'Something went wrong. Please try again.'
  window.alert(message)
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
  balance:
    typeof data.balance === 'number'
      ? data.balance
      : data.balance
        ? Number(data.balance)
        : null,
  currency: data.currency ?? null,
  secretRef: data.secret_ref ?? data.secretRef ?? null,
  createdAt: data.created_at ?? data.createdAt,
  updatedAt: data.updated_at ?? data.updatedAt,
})

export const getAccounts = async (filters?: AccountFilter): Promise<Account[]> => {
  try {
    const params = new URLSearchParams()
    if (filters?.accountType) params.set('account_type', filters.accountType)
    if (filters?.provider) params.set('provider', filters.provider)

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

export const syncAccount = async (id: string): Promise<AccountSyncResponse> => {
  try {
    const { data } = await api.post(`/accounts/${id}/sync`)
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
