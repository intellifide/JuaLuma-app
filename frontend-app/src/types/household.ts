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

// Core Purpose: Shared household domain types for frontend state and API data.
// Last Modified: 2026-01-18 00:40 CST

export type HouseholdRole = 'admin' | 'member' | 'restricted_member'

export interface HouseholdMember {
  uid: string
  email?: string
  first_name?: string
  last_name?: string
  username?: string
  role: HouseholdRole
  joined_at?: string // backend sends joined_at
  ai_access_enabled?: boolean // backend sends ai_access_enabled
  can_view_household?: boolean
}

export interface HouseholdInvite {
  id: string
  email: string
  status: 'pending' | 'accepted' | 'declined' | 'expired'
  created_at?: string // backend snake_case
  expires_at?: string // backend snake_case
  can_view_household?: boolean
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
  can_view_household: boolean
}

export interface AcceptInvitePayload {
  token: string
  consent_agreed: boolean
}
