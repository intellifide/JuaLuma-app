import { api } from './api';

export interface DeveloperPayout {
    month: string;
    gross_revenue: number;
    payout_status: string;
}

export const developerService = {
    register: async (payoutMethod: any) => {
        const response = await api.post('/developers', {
            payout_method: payoutMethod,
            payout_frequency: 'monthly'
        });
        return response.data;
    },

    getPayoutHistory: async () => {
        const response = await api.get<DeveloperPayout[]>('/developers/payouts');
        return response.data;
    }
};
