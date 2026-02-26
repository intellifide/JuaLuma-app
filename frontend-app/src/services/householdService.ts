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

// Core Purpose: Provide API helpers for household management workflows.
// Last Modified: 2026-01-18 00:40 CST

import { api } from './api'
import {
  Household,
  CreateHouseholdPayload,
  InviteMemberPayload,
  AcceptInvitePayload,
} from '../types/household'

interface InviteStatus {
  valid: boolean
  email: string
  is_minor: boolean
  user_exists: boolean
  household_id: string
}

export const householdService = {
  createHousehold: async (payload: CreateHouseholdPayload): Promise<Household> => {
    const response = await api.post<Household>('/households/', payload)
    return response.data
  },

  getMyHousehold: async (): Promise<Household> => {
    const response = await api.get<Household>('/households/me')
    return response.data
  },

  inviteMember: async (payload: InviteMemberPayload): Promise<{ message: string; invite_id: string }> => {
    const response = await api.post('/households/invites', payload)
    return response.data
  },

  checkInviteStatus: async (token: string): Promise<InviteStatus> => {
    const response = await api.get<InviteStatus>(`/households/invites/${token}`)
    return response.data
  },

  acceptInvite: async (payload: AcceptInvitePayload): Promise<{ message: string }> => {
    const response = await api.post('/households/invites/accept', payload)
    return response.data
  },

  leaveHousehold: async (): Promise<{ status: string; detail: string }> => {
    const response = await api.delete('/households/members/me')
    return response.data
  },

  // Remove a household member (admin only).
  removeMember: async (memberUid: string): Promise<{ status: string; detail: string }> => {
    const response = await api.delete(`/households/members/${memberUid}`)
    return response.data
  },

  // Cancel a pending invite (admin only).
  cancelInvite: async (inviteId: string): Promise<{ status: string; detail: string }> => {
    const response = await api.delete(`/households/invites/${inviteId}`)
    return response.data
  },
}
