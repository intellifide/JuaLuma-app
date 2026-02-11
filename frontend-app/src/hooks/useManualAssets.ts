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

import useSWR from 'swr'
import { ManualAsset } from '../types'
import { createManualAsset, deleteManualAsset, getManualAssets, updateManualAsset } from '../services/manualAssets'

export const useManualAssets = () => {
  const { data, error, isLoading, mutate } = useSWR<ManualAsset[]>(
    ['manual-assets'],
    () => getManualAssets(),
  )

  const refetch = () => mutate()

  const create = async (payload: Parameters<typeof createManualAsset>[0]) => {
    const asset = await createManualAsset(payload)
    mutate((prev) => (prev ? [asset, ...prev] : [asset]), { revalidate: false })
    return asset
  }

  const update = async (id: string, payload: Parameters<typeof updateManualAsset>[1]) => {
    const updated = await updateManualAsset(id, payload)
    mutate((prev) => (prev ? prev.map((item) => (item.id === id ? updated : item)) : [updated]), {
      revalidate: false,
    })
    return updated
  }

  const remove = async (id: string) => {
    await deleteManualAsset(id)
    mutate((prev) => (prev ? prev.filter((item) => item.id !== id) : []), {
      revalidate: false,
    })
  }

  return {
    assets: data ?? [],
    loading: isLoading,
    error: error ? (error as Error).message : null,
    refetch,
    create,
    update,
    remove,
  }
}
