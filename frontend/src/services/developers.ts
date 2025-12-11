import { api } from './api';
import { PaginatedResponse } from '../types';

export interface DeveloperPayout {
    month: string;
    gross_revenue: number;
    payout_status: string;
}

export const developerService = {
    register: async (payoutMethod: unknown) => {
        const response = await api.post('/developers', {
            payout_method: payoutMethod,
            payout_frequency: 'monthly'
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
