// Created 2025-12-18 20:50 CST by Antigravity
import { useState, useCallback, useEffect } from 'react';
import { AnalyticsService, NetWorthResponse, CashFlowResponse, SpendingByCategoryResponse } from '../services/analytics';
import { useAuth } from './useAuth';

export const useNetWorth = (startDate: string, endDate: string, interval: 'daily' | 'weekly' | 'monthly') => {
    const { user } = useAuth();
    const [data, setData] = useState<NetWorthResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetch = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        setError(null);
        try {
            const result = await AnalyticsService.getNetWorth(startDate, endDate, interval);
            setData(result);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to fetch net worth';
            setError(message);
        } finally {
            setLoading(false);
        }
    }, [user, startDate, endDate, interval]);

    useEffect(() => {
        fetch();
    }, [fetch]);

    return { data, loading, error, refetch: fetch };
};

export const useCashFlow = (startDate: string, endDate: string, interval: 'day' | 'week' | 'month') => {
    const { user } = useAuth();
    const [data, setData] = useState<CashFlowResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetch = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        setError(null);
        try {
            const result = await AnalyticsService.getCashFlow(startDate, endDate, interval);
            setData(result);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to fetch cash flow';
            setError(message);
        } finally {
            setLoading(false);
        }
    }, [user, startDate, endDate, interval]);

    useEffect(() => {
        fetch();
    }, [fetch]);

    return { data, loading, error, refetch: fetch };
};

export const useSpendingByCategory = (startDate: string, endDate: string) => {
    const { user } = useAuth();
    const [data, setData] = useState<SpendingByCategoryResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetch = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        setError(null);
        try {
            const result = await AnalyticsService.getSpendingByCategory(startDate, endDate);
            setData(result);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to fetch spending data';
            setError(message);
        } finally {
            setLoading(false);
        }
    }, [user, startDate, endDate]);

    useEffect(() => {
        fetch();
    }, [fetch]);

    return { data, loading, error, refetch: fetch };
};
