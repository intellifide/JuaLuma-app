// Updated 2025-12-08 21:49 CST by ChatGPT

export type Role = 'user' | 'support_agent' | 'support_manager'

export type Plan = 'free' | 'essential' | 'pro' | 'ultimate'

export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'paused'

export type AccountType = 'traditional' | 'investment' | 'web3' | 'cex' | 'manual'

export type AccountProvider = 'plaid' | 'manual' | 'cex' | 'web3' | 'other'

export interface User {
  uid: string
  email: string
  role: Role
  themePref?: string | null
  currencyPref?: string | null
  developerPayoutId?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface Subscription {
  id: string
  uid: string
  plan: Plan
  status?: SubscriptionStatus | null
  renewAt?: string | null
  aiQuotaUsed?: number | null
  createdAt?: string
  updatedAt?: string
}

export interface Account {
  id: string
  uid: string
  accountType?: AccountType | null
  provider?: AccountProvider | null
  accountName?: string | null
  accountNumberMasked?: string | null
  balance?: number | null
  currency?: string | null
  secretRef?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface Transaction {
  id: string
  uid: string
  accountId: string
  ts: string
  amount: number
  currency: string
  category?: string | null
  merchantName?: string | null
  description?: string | null
  externalId?: string | null
  isManual: boolean
  archived: boolean
  rawJson?: Record<string, unknown> | null
  createdAt?: string
  updatedAt?: string
}

export interface AISettings {
  id: string
  uid: string
  provider: string
  modelId: string
  userDekRef?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface NotificationPreference {
  id: string
  uid: string
  eventKey: string
  channelEmail: boolean
  channelSms: boolean
  quietHoursStart?: string | null
  quietHoursEnd?: string | null
  createdAt?: string
  updatedAt?: string
}

export type AccountFilter = Partial<{
  accountType: AccountType
  provider: AccountProvider
}>

export type TransactionFilters = Partial<{
  accountId: string
  category: string
  search: string
  from: string
  to: string
  page: number
  pageSize: number
}>

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}

export interface Widget {
  id: string
  developer_uid: string
  name: string
  description?: string
  category: string
  version: string
  status: string
  downloads: number
  rating_avg: number
  rating_count: number
  preview_data?: Record<string, unknown>
  created_at: string
  updated_at: string
}
