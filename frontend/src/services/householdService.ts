import { api } from './api'
import {
  Household,
  CreateHouseholdPayload,
  InviteMemberPayload,
  AcceptInvitePayload,
} from '../types/household'

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

  acceptInvite: async (payload: AcceptInvitePayload): Promise<{ message: string }> => {
    const response = await api.post('/households/invites/accept', payload)
    return response.data
  },

  leaveHousehold: async (): Promise<{ status: string; detail: string }> => {
    const response = await api.delete('/households/members/me')
    return response.data
  },
}
