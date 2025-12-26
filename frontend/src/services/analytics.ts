// Core Purpose: Analytics service for fetching net worth, cash flow, and spending data.
// Created 2025-12-18 20:45 CST by Antigravity
// Last Modified: 2025-12-26
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
    getNetWorth: async (startDate: string, endDate: string, interval: 'daily' | 'weekly' | 'monthly' = 'daily', scope: 'personal' | 'household' = 'personal'): Promise<NetWorthResponse> => {
        const response = await api.get<NetWorthResponse>('/analytics/net-worth', {
            params: { start_date: startDate, end_date: endDate, interval, scope },
        });
        return response.data;
    },

    getCashFlow: async (startDate: string, endDate: string, interval: 'day' | 'week' | 'month' = 'month', scope: 'personal' | 'household' = 'personal'): Promise<CashFlowResponse> => {
        const response = await api.get<CashFlowResponse>('/analytics/cash-flow', {
            params: { start_date: startDate, end_date: endDate, interval, scope },
        });
        return response.data;
    },

    getSpendingByCategory: async (startDate: string, endDate: string, scope: 'personal' | 'household' = 'personal'): Promise<SpendingByCategoryResponse> => {
        const response = await api.get<SpendingByCategoryResponse>('/analytics/spending-by-category', {
            params: { start_date: startDate, end_date: endDate, scope },
        });
        return response.data;
    }
};
