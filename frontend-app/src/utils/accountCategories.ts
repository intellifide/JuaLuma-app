import { Account } from '../types'

export type PrimaryAccountCategory =
  | 'cash'
  | 'credit'
  | 'loan'
  | 'mortgage'
  | 'investment'
  | 'crypto'
  | 'other'

export type InvestmentBucket = 'traditional' | 'cex' | 'web3' | 'other'

const PRIMARY_LABELS: Record<PrimaryAccountCategory, string> = {
  cash: 'Cash',
  credit: 'Credit',
  loan: 'Loan',
  mortgage: 'Mortgage',
  investment: 'Investments',
  crypto: 'Crypto',
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

const inferCategoryFromSubtype = (subtype: string): PrimaryAccountCategory | null => {
  if (!subtype) return null
  const value = normalize(subtype)
  if (value.includes('mortgage')) return 'mortgage'
  if (value.includes('credit') || value.includes('charge') || value.includes('card')) return 'credit'
  if (value.includes('student') || value.includes('auto') || value.includes('loan') || value.includes('personal')) return 'loan'
  if (
    value.includes('checking') ||
    value.includes('savings') ||
    value.includes('cd') ||
    value.includes('money_market') ||
    value.includes('cash_management') ||
    value.includes('prepaid')
  ) {
    return 'cash'
  }
  if (
    value.includes('401') ||
    value.includes('ira') ||
    value.includes('retirement') ||
    value.includes('brokerage') ||
    value.includes('mutual') ||
    value.includes('custodial') ||
    value.includes('trust') ||
    value.includes('education')
  ) {
    return 'investment'
  }
  return null
}

const inferCategoryFromName = (name?: string | null): PrimaryAccountCategory | null => {
  if (!name) return null
  const value = name.toLowerCase()
  if (value.includes('mortgage')) return 'mortgage'
  if (value.includes('credit card') || value.includes('card')) return 'credit'
  if (value.includes('student loan') || value.includes('auto loan') || value.includes('loan')) return 'loan'
  if (value.includes('checking') || value.includes('savings') || value.includes('cash')) return 'cash'
  if (value.includes('ira') || value.includes('401') || value.includes('brokerage') || value.includes('investment')) return 'investment'
  return null
}

const getPlaidCategory = (account: Account): PrimaryAccountCategory => {
  const plaidType = normalize(account.plaidType)
  const plaidSubtype = normalize(account.plaidSubtype)

  if (plaidType === 'depository') return 'cash'
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
  return 'cash'
}

const getCryptoDetail = (account: Account) => {
  if (account.accountType === 'web3') return account.provider ? titleCase(normalize(account.provider)) : 'Web3 Wallet'
  if (account.accountType === 'cex') return account.provider ? titleCase(normalize(account.provider)) : 'Exchange'
  return null
}

export const getAccountPrimaryCategory = (account: Account) => {
  let category: PrimaryAccountCategory = 'other'

  if (account.accountType === 'web3' || account.accountType === 'cex') {
    category = 'crypto'
  } else if (account.accountType === 'investment') {
    category = 'investment'
  } else if (account.accountType === 'manual') {
    category = 'other'
  } else {
    category = getPlaidCategory(account)
  }

  return {
    key: category,
    label: PRIMARY_LABELS[category],
    isLiability: LIABILITY_CATEGORIES.has(category),
  }
}

export const getAccountCategoryDetail = (account: Account) => {
  if (account.accountType === 'web3' || account.accountType === 'cex') {
    return getCryptoDetail(account)
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
