// Updated 2025-12-08 21:49 CST by ChatGPT
import useSWR from 'swr'
import { Account, AccountFilter } from '../types'
import {
  createManualAccount,
  deleteAccount,
  getAccount,
  getAccounts,
  syncAccount,
  updateAccount,
} from '../services/accounts'

type UseAccountsOptions = {
  filters?: AccountFilter
}

export const useAccounts = (options?: UseAccountsOptions) => {
  const { data, error, isLoading, mutate } = useSWR<Account[]>(
    ['accounts', options?.filters],
    () => getAccounts(options?.filters),
  )

  const refetch = () => mutate()

  const create = async (payload: Parameters<typeof createManualAccount>[0]) => {
    const account = await createManualAccount(payload)
    mutate((prev) => (prev ? [account, ...prev] : [account]), { revalidate: false })
    return account
  }

  const update = async (id: string, payload: Parameters<typeof updateAccount>[1]) => {
    const updated = await updateAccount(id, payload)
    mutate((prev) => (prev ? prev.map((acct) => (acct.id === id ? updated : acct)) : [updated]), {
      revalidate: false,
    })
    return updated
  }

  const remove = async (id: string) => {
    await deleteAccount(id)
    mutate((prev) => (prev ? prev.filter((acct) => acct.id !== id) : []), {
      revalidate: false,
    })
  }

  const sync = async (id: string) => {
    await syncAccount(id)
    // After sync, refetch to pick up any balance updates
    await mutate()
  }

  const fetchOne = (id: string) => getAccount(id)

  return {
    accounts: data ?? [],
    loading: isLoading,
    error: error ? (error as Error).message : null,
    refetch,
    create,
    update,
    remove,
    sync,
    fetchOne,
  }
}
