/*
 * Copyright (c) 2026 Intellifide, LLC.
 * Licensed under PolyForm Noncommercial License 1.0.0.
 * See "PolyForm-Noncommercial-1.0.0.txt" for full text.
 *
 * COMMUNITY RIGHTS:
 * - You CAN modify this code for personal use.
 * - You CAN build and share widgets/plugins for the ecosystem.
 *
 * RESTRICTIONS:
 * - You CANNOT resell, repackage, or distribute this application for a fee.
 * - You CANNOT use this application for commercial enterprise purposes.
 */

// Core Purpose: Hooks for accessing analytics data (Personal/Household).
// Created 2025-12-18 20:50 CST by Antigravity
// Last Modified: 2026-01-25 13:30 CST
import { useState, useCallback, useEffect } from 'react';
import { AnalyticsService, NetWorthResponse, CashFlowResponse, SpendingByCategoryResponse, AnalyticsFilters } from '../services/analytics';
import { useAuth } from './useAuth';

export const useNetWorth = (
    startDate: string,
    endDate: string,
    interval: 'daily' | 'weekly' | 'monthly',
    scope: 'personal' | 'household' = 'personal',
    filters?: AnalyticsFilters
) => {
    const { user } = useAuth();
    const [data, setData] = useState<NetWorthResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetch = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        setError(null);
        try {
            const result = await AnalyticsService.getNetWorth(startDate, endDate, interval, scope, filters);
            setData(result);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to fetch net worth';
            setError(message);
        } finally {
            setLoading(false);
        }
    }, [user, startDate, endDate, interval, scope, filters]);

    useEffect(() => {
        fetch();
    }, [fetch]);

    return { data, loading, error, refetch: fetch };
};

export const useCashFlow = (
    startDate: string,
    endDate: string,
    interval: 'day' | 'week' | 'month',
    scope: 'personal' | 'household' = 'personal',
    filters?: AnalyticsFilters
) => {
    const { user } = useAuth();
    const [data, setData] = useState<CashFlowResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetch = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        setError(null);
        try {
            const result = await AnalyticsService.getCashFlow(startDate, endDate, interval, scope, filters);
            setData(result);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to fetch cash flow';
            setError(message);
        } finally {
            setLoading(false);
        }
    }, [user, startDate, endDate, interval, scope, filters]);

    useEffect(() => {
        fetch();
    }, [fetch]);

    return { data, loading, error, refetch: fetch };
};

export const useSpendingByCategory = (
    startDate: string,
    endDate: string,
    scope: 'personal' | 'household' = 'personal',
    filters?: AnalyticsFilters
) => {
    const { user } = useAuth();
    const [data, setData] = useState<SpendingByCategoryResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetch = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        setError(null);
        try {
            const result = await AnalyticsService.getSpendingByCategory(startDate, endDate, scope, filters);
            setData(result);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to fetch spending data';
            setError(message);
        } finally {
            setLoading(false);
        }
    }, [user, startDate, endDate, scope, filters]);

    useEffect(() => {
        fetch();
    }, [fetch]);

    return { data, loading, error, refetch: fetch };
};
