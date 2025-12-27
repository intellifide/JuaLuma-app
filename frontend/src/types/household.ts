export type HouseholdRole = 'admin' | 'member' | 'restricted_member'

export interface HouseholdMember {
  uid: string
  email?: string
  role: HouseholdRole
  joined_at?: string // backend sends joined_at
  ai_access_enabled?: boolean // backend sends ai_access_enabled
}

export interface HouseholdInvite {
  email: string
  status: 'pending' | 'accepted' | 'declined' | 'expired'
  created_at?: string // backend snake_case
  expires_at?: string // backend snake_case
}

export interface Household {
  id: string
  name: string
  owner_uid: string // backend snake_case
  created_at?: string // backend snake_case
  members: HouseholdMember[]
  invites: HouseholdInvite[]
}

export interface CreateHouseholdPayload {
  name: string
}

export interface InviteMemberPayload {
  email: string
  is_minor: boolean
}

export interface AcceptInvitePayload {
  token: string
  consent_agreed: boolean
}
