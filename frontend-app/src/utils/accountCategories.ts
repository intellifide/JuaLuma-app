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

import { Account } from '../types'

export type PrimaryAccountCategory =
  | 'checking'
  | 'savings'
  | 'credit'
  | 'loan'
  | 'mortgage'
  | 'investment'
  | 'web3'
  | 'cex'
  | 'real_estate'
  | 'collectible'
  | 'other'

export type InvestmentBucket = 'traditional' | 'cex' | 'web3' | 'other'

const PRIMARY_LABELS: Record<PrimaryAccountCategory, string> = {
  checking: 'Checking Account',
  savings: 'Savings Account',
  credit: 'Credit',
  loan: 'Loan',
  mortgage: 'Mortgage',
  investment: 'Investments',
  web3: 'Web3',
  cex: 'Centralized Exchange (CEX)',
  real_estate: 'Real Estate',
  collectible: 'Collectibles',
  other: 'Other',
}

const LIABILITY_CATEGORIES = new Set<PrimaryAccountCategory>(['credit', 'loan', 'mortgage'])

const normalize = (value?: string | null) =>
  value
    ? value
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '_')
        .replace(/-+/g, '_')
    : ''

const titleCase = (value: string) =>
  value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())

const inferCashCategoryFromSubtype = (subtype?: string | null): 'checking' | 'savings' | null => {
  if (!subtype) return null
  const value = normalize(subtype)
  if (value.includes('savings') || value.includes('money_market')) return 'savings'
  if (value.includes('checking') || value.includes('cash_management') || value.includes('prepaid')) return 'checking'
  return null
}

const inferCashCategoryFromName = (name?: string | null): 'checking' | 'savings' | null => {
  if (!name) return null
  const value = name.toLowerCase()
  if (value.includes('savings') || value.includes('money market')) return 'savings'
  if (value.includes('checking') || value.includes('cash management')) return 'checking'
  return null
}

const inferCategoryFromSubtype = (subtype: string): PrimaryAccountCategory | null => {
  if (!subtype) return null
  const value = normalize(subtype)
  if (value.includes('mortgage')) return 'mortgage'
  if (value.includes('credit') || value.includes('charge') || value.includes('card')) return 'credit'
  if (value.includes('student') || value.includes('auto') || value.includes('loan') || value.includes('personal')) return 'loan'
  if (value.includes('cd') || value.includes('certificate') || value.includes('time_deposit')) return 'investment'
  const cashCategory = inferCashCategoryFromSubtype(subtype)
  if (cashCategory) return cashCategory
  if (
    value.includes('money_market')
  ) {
    return 'savings'
  }
  if (
    value.includes('401') ||
    value.includes('ira') ||
    value.includes('retirement') ||
    value.includes('brokerage') ||
    value.includes('mutual') ||
    value.includes('custodial') ||
    value.includes('trust') ||
    value.includes('education') ||
    value.includes('hsa') ||
    value.includes('health_savings')
  ) {
    return 'investment'
  }
  return null
}

const inferCategoryFromName = (name?: string | null): PrimaryAccountCategory | null => {
  if (!name) return null
  const value = name.toLowerCase()
  if (value.includes('mortgage')) return 'mortgage'
  if (value.includes('hsa') || value.includes('health savings')) return 'investment'
  if (value.includes('cd') || value.includes('certificate of deposit')) return 'investment'
  if (value.includes('credit card') || value.includes('card')) return 'credit'
  if (value.includes('student loan') || value.includes('auto loan') || value.includes('loan')) return 'loan'
  const cashCategory = inferCashCategoryFromName(name)
  if (cashCategory) return cashCategory
  if (value.includes('ira') || value.includes('401') || value.includes('brokerage') || value.includes('investment')) return 'investment'
  return null
}

const getPlaidCategory = (account: Account): PrimaryAccountCategory => {
  const plaidType = normalize(account.plaidType)
  const plaidSubtype = normalize(account.plaidSubtype)

  if (plaidType === 'depository') {
    const subtypeCategory = inferCategoryFromSubtype(plaidSubtype)
    if (subtypeCategory === 'investment') return 'investment'
    if (subtypeCategory) return subtypeCategory
    const nameCategory = inferCategoryFromName(account.accountName)
    if (nameCategory === 'investment') return 'investment'
    if (nameCategory) return nameCategory
    return 'checking'
  }
  if (plaidType === 'investment') return 'investment'
  if (plaidType === 'credit') return 'credit'
  if (plaidType === 'other') return 'other'
  if (plaidType === 'loan') {
    const subtypeCategory = inferCategoryFromSubtype(plaidSubtype)
    if (subtypeCategory === 'mortgage') return 'mortgage'
    return subtypeCategory || 'loan'
  }
  const subtypeCategory = inferCategoryFromSubtype(plaidSubtype)
  if (subtypeCategory) return subtypeCategory
  const nameCategory = inferCategoryFromName(account.accountName)
  if (nameCategory) return nameCategory
  return 'checking'
}

const getCryptoDetail = (account: Account) => {
  if (account.accountType === 'web3') return account.provider ? titleCase(normalize(account.provider)) : 'Web3 Wallet'
  if (account.accountType === 'cex') return account.provider ? titleCase(normalize(account.provider)) : 'Centralized Exchange'
  return null
}

const mapLegacyOverride = (override: string, account: Account): PrimaryAccountCategory | null => {
  if (!override) return null
  const normalized = normalize(override)
  if (normalized === 'cash') {
    return (
      inferCashCategoryFromSubtype(account.plaidSubtype) ||
      inferCashCategoryFromName(account.accountName) ||
      'checking'
    )
  }
  if (normalized === 'crypto') {
    if (account.accountType === 'web3') return 'web3'
    if (account.accountType === 'cex') return 'cex'
    return 'cex'
  }
  if (normalized in PRIMARY_LABELS) {
    return normalized as PrimaryAccountCategory
  }
  return null
}

export const getAccountPrimaryCategory = (account: Account) => {
  let category: PrimaryAccountCategory = 'other'

  const overrideCategory = mapLegacyOverride(account.categoryOverride || '', account)
  if (overrideCategory) {
    category = overrideCategory
  } else if (account.accountType === 'web3' || account.accountType === 'cex') {
    category = account.accountType === 'web3' ? 'web3' : 'cex'
  } else if (account.accountType === 'investment') {
    category = 'investment'
  } else if (account.accountType === 'manual') {
    const nameCategory = inferCategoryFromName(account.accountName)
    category = nameCategory || 'other'
  } else {
    category = getPlaidCategory(account)
  }

  const manualBalanceType = account.accountType === 'manual' ? account.balanceType : null

  return {
    key: category,
    label: PRIMARY_LABELS[category],
    isLiability: manualBalanceType ? manualBalanceType === 'liability' : LIABILITY_CATEGORIES.has(category),
  }
}

export const getAccountCategoryDetail = (account: Account) => {
  if (account.accountType === 'web3' || account.accountType === 'cex') {
    return getCryptoDetail(account)
  }

  const overrideCategory = mapLegacyOverride(account.categoryOverride || '', account)
  if (overrideCategory) {
    return PRIMARY_LABELS[overrideCategory]
  }

  if (account.accountType === 'manual') {
    return 'Manual'
  }

  const plaidSubtype = normalize(account.plaidSubtype)
  if (plaidSubtype) return titleCase(plaidSubtype)

  const plaidType = normalize(account.plaidType)
  if (plaidType) return titleCase(plaidType)

  const nameCategory = inferCategoryFromName(account.accountName)
  if (nameCategory) return PRIMARY_LABELS[nameCategory]

  return account.accountType ? titleCase(account.accountType) : null
}

export const getAccountCategoryDisplay = (account: Account) => {
  const primary = getAccountPrimaryCategory(account)
  const detail = getAccountCategoryDetail(account)
  return {
    label: primary.label,
    detail,
  }
}

export const getInvestmentBucket = (account: Account): InvestmentBucket | null => {
  if (account.accountType === 'cex') return 'cex'
  if (account.accountType === 'web3') return 'web3'
  if (account.accountType === 'investment') return 'traditional'

  const overrideCategory = mapLegacyOverride(account.categoryOverride || '', account)
  if (overrideCategory) {
    if (overrideCategory === 'investment') return 'other'
    if (overrideCategory === 'web3') return 'web3'
    if (overrideCategory === 'cex') return 'cex'
    return null
  }

  if (account.accountType === 'traditional') {
    const plaidType = normalize(account.plaidType)
    const plaidSubtype = normalize(account.plaidSubtype)
    if (plaidType === 'investment') return 'traditional'
    if (inferCategoryFromSubtype(plaidSubtype) === 'investment') return 'traditional'
    if (inferCategoryFromName(account.accountName) === 'investment') return 'traditional'
  }

  if (account.accountType === 'manual') {
    const nameCategory = inferCategoryFromName(account.accountName)
    if (nameCategory === 'investment') return 'other'
  }

  return null
}

export const getCategoryLabel = (category: PrimaryAccountCategory) => PRIMARY_LABELS[category]

export const isLiabilityCategory = (category: PrimaryAccountCategory) =>
  LIABILITY_CATEGORIES.has(category)
