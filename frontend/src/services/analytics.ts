// Created 2025-12-18 20:45 CST by Antigravity
import { api } from './api';

export interface DataPoint {
    date: string;
    value: number;
}

export interface CashFlowResponse {
    income: DataPoint[];
    expenses: DataPoint[];
}

export interface CategorySpend {
    category: string;
    amount: number;
}

export interface SpendingByCategoryResponse {
    data: CategorySpend[];
}

export interface NetWorthResponse {
    data: DataPoint[];
}

// Convert string date (YYYY-MM-DD) to API expected format if needed
// Or simply pass ISO date strings.
// The backend expects YYYY-MM-DD for date parameters.

export const AnalyticsService = {
    getNetWorth: async (startDate: string, endDate: string, interval: 'daily' | 'weekly' | 'monthly' = 'daily'): Promise<NetWorthResponse> => {
        const response = await api.get<NetWorthResponse>('/analytics/net-worth', {
            params: { start_date: startDate, end_date: endDate, interval },
        });
        return response.data;
    },

    getCashFlow: async (startDate: string, endDate: string, interval: 'day' | 'week' | 'month' = 'month'): Promise<CashFlowResponse> => {
        const response = await api.get<CashFlowResponse>('/analytics/cash-flow', {
            params: { start_date: startDate, end_date: endDate, interval },
        });
        return response.data;
    },

    getSpendingByCategory: async (startDate: string, endDate: string): Promise<SpendingByCategoryResponse> => {
        const response = await api.get<SpendingByCategoryResponse>('/analytics/spending-by-category', {
            params: { start_date: startDate, end_date: endDate },
        });
        return response.data;
    }
};
