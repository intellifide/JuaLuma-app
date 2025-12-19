import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { apiFetch } from '../services/auth';

export interface Budget {
    id: string;
    category: string;
    amount: number; // Changed from number | null to number, assuming 0 or delete for "no budget"
    period: string;
}

export const useBudget = () => {
    const { user } = useAuth();
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchBudgets = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const res = await apiFetch('/api/budgets/');
            if (res.ok) {
                const data = await res.json();
                setBudgets(data);
            }
        } catch (e) {
            console.error("Failed to fetch budgets", e);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchBudgets();
    }, [fetchBudgets]);

    const saveBudget = async (category: string, amount: number | null) => {
        if (!user) return;

        try {
            if (amount === null) {
                // Delete
                await apiFetch(`/api/budgets/${category}`, {
                    method: 'DELETE'
                });
            } else {
                // Upsert
                await apiFetch('/api/budgets/', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ category, amount, period: 'monthly' })
                });
            }
            await fetchBudgets();
        } catch (e) {
            console.error("Failed to save budget", e);
        }
    };

    return { budgets, saveBudget, loading, refetch: fetchBudgets };
};
