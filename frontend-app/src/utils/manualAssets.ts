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

import { ManualAsset } from '../types'

const parseDateUTC = (value: string) => {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

const toDateValue = (value?: string | null) => {
  if (!value) return null
  const dateOnly = value.split('T')[0]
  return parseDateUTC(dateOnly).getTime()
}

export const getManualAssetTotals = (assets: ManualAsset[]) => {
  return assets.reduce(
    (acc, asset) => {
      const amount = asset.value || 0
      if (asset.balanceType === 'liability') {
        acc.liabilities += amount
      } else {
        acc.assets += amount
      }
      return acc
    },
    { assets: 0, liabilities: 0 },
  )
}

export const getManualNetWorthAtDate = (assets: ManualAsset[], date: string) => {
  const target = toDateValue(date)
  if (!target) return 0

  return assets.reduce((total, asset) => {
    const purchase = toDateValue(asset.purchaseDate)
    if (purchase && purchase > target) {
      return total
    }
    const amount = asset.value || 0
    return total + (asset.balanceType === 'liability' ? -amount : amount)
  }, 0)
}
