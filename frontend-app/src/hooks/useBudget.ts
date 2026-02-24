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

// Core Purpose: Hook for managing user budgets (Personal/Household).
// Last Modified: 2026-01-23 23:05 CST
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { apiFetch } from '../services/auth';

export interface Budget {
    id: string;
    uid: string;
    category: string;
    amount: number; // Changed from number | null to number, assuming 0 or delete for "no budget"
    period: 'monthly' | 'quarterly' | 'annual' | string;
    alert_enabled: boolean;
    alert_threshold_percent: number;
}

export const useBudget = (scope: 'personal' | 'household' = 'personal') => {
    const { user } = useAuth();
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchBudgets = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const res = await apiFetch(`/budgets/?scope=${scope}`);
            if (res.ok) {
                const data = await res.json();
                setBudgets(data);
            }
        } catch (e) {
            console.error("Failed to fetch budgets", e);
        } finally {
            setLoading(false);
        }
    }, [user, scope]);

    useEffect(() => {
        fetchBudgets();
    }, [fetchBudgets]);

    const saveBudget = async (
        category: string,
        amount: number | null,
        period: Budget['period'] = 'monthly',
        alertThresholdPercent?: number,
        alertEnabled?: boolean,
    ) => {
        if (!user) return;

        try {
            if (amount === null) {
                // Delete
                await apiFetch(`/budgets/${category}?scope=${scope}`, {
                    method: 'DELETE'
                });
            } else {
                // Upsert
                await apiFetch(`/budgets/?scope=${scope}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        category,
                        amount,
                        period,
                        alert_threshold_percent: alertThresholdPercent ?? 0.8,
                        alert_enabled: alertEnabled ?? true,
                    })
                });
            }
            await fetchBudgets();
        } catch (e) {
            console.error("Failed to save budget", e);
        }
    };

    const resetBudgets = async () => {
        if (!user) return;
        try {
            await apiFetch(`/budgets/?scope=${scope}`, {
                method: 'DELETE'
            });
            await fetchBudgets();
        } catch (e) {
            console.error("Failed to reset budgets", e);
        }
    };

    const bulkSetPeriod = async (period: Budget['period']) => {
        if (!user) return;
        try {
            await apiFetch(`/budgets/bulk-period?scope=${scope}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ period }),
            });
            await fetchBudgets();
        } catch (e) {
            console.error("Failed to bulk update budget periods", e);
        }
    };

    return { budgets, saveBudget, resetBudgets, bulkSetPeriod, loading, refetch: fetchBudgets };
};
