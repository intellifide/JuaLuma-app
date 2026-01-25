// Core Purpose: Analytics service for fetching net worth, cash flow, and spending data.
// Created 2025-12-18 20:45 CST by Antigravity
// Last Modified: 2026-01-25 13:30 CST
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

export interface AnalyticsFilters {
    accountType?: string;
    excludeAccountTypes?: string;
    category?: string;
    isManual?: boolean;
}

export const AnalyticsService = {
    getNetWorth: async (
        startDate: string,
        endDate: string,
        interval: 'daily' | 'weekly' | 'monthly' = 'daily',
        scope: 'personal' | 'household' = 'personal',
        filters?: AnalyticsFilters
    ): Promise<NetWorthResponse> => {
        const params: Record<string, string | boolean> = { start_date: startDate, end_date: endDate, interval, scope };
        if (filters?.accountType) params.account_type = filters.accountType;
        if (filters?.excludeAccountTypes) params.exclude_account_types = filters.excludeAccountTypes;
        if (filters?.category) params.category = filters.category;
        if (filters?.isManual !== undefined) params.is_manual = filters.isManual;
        
        const response = await api.get<NetWorthResponse>('/analytics/net-worth', { params });
        return response.data;
    },

    getCashFlow: async (
        startDate: string,
        endDate: string,
        interval: 'day' | 'week' | 'month' = 'month',
        scope: 'personal' | 'household' = 'personal',
        filters?: AnalyticsFilters
    ): Promise<CashFlowResponse> => {
        const params: Record<string, string | boolean> = { start_date: startDate, end_date: endDate, interval, scope };
        if (filters?.accountType) params.account_type = filters.accountType;
        if (filters?.excludeAccountTypes) params.exclude_account_types = filters.excludeAccountTypes;
        if (filters?.category) params.category = filters.category;
        if (filters?.isManual !== undefined) params.is_manual = filters.isManual;
        
        const response = await api.get<CashFlowResponse>('/analytics/cash-flow', { params });
        return response.data;
    },

    getSpendingByCategory: async (
        startDate: string,
        endDate: string,
        scope: 'personal' | 'household' = 'personal',
        filters?: AnalyticsFilters
    ): Promise<SpendingByCategoryResponse> => {
        const params: Record<string, string | boolean> = { start_date: startDate, end_date: endDate, scope };
        if (filters?.accountType) params.account_type = filters.accountType;
        if (filters?.excludeAccountTypes) params.exclude_account_types = filters.excludeAccountTypes;
        if (filters?.category) params.category = filters.category;
        if (filters?.isManual !== undefined) params.is_manual = filters.isManual;
        
        const response = await api.get<SpendingByCategoryResponse>('/analytics/spending-by-category', { params });
        return response.data;
    }
};
