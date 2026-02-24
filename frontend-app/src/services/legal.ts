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

import { api } from './api'
import { AgreementAcceptanceInput } from '../types/legal'

export const legalService = {
  acceptAgreements: async (agreements: AgreementAcceptanceInput[]) => {
    const response = await api.post('/legal/accept', { agreements })
    return response.data as { accepted: number }
  },
}
