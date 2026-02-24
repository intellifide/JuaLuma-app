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

import { api } from './api';
import { PaginatedResponse } from '../types';

export interface DeveloperPayout {
    month: string;
    gross_revenue: number;
    payout_status: string;
}

export const developerService = {
    register: async (data: { payout_method: unknown; payout_frequency?: string; agreements?: Array<{ agreement_key: string; agreement_version?: string; acceptance_method?: string }> }) => {
        const response = await api.post('/developers', {
            payout_method: data.payout_method,
            payout_frequency: data.payout_frequency || 'monthly',
            agreements: data.agreements || [],
        });
        return response.data;
    },

    getPayoutHistory: async () => {
        const response = await api.get<DeveloperPayout[]>('/developers/payouts');
        return response.data;
    },

    getTransactions: async (page: number = 1, pageSize: number = 10) => {
        const response = await api.get<PaginatedResponse<DeveloperPayout>>(`/developers/transactions?page=${page}&page_size=${pageSize}`);
        return response.data;
    }
};
