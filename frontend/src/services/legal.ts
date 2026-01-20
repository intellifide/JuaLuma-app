import { api } from './api'
import { AgreementAcceptanceInput } from '../types/legal'

export const legalService = {
  acceptAgreements: async (agreements: AgreementAcceptanceInput[]) => {
    const response = await api.post('/legal/accept', { agreements })
    return response.data as { accepted: number }
  },
}
