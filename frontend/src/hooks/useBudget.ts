import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';

export interface Budget {
    category: string;
    amount: number | null; // null means no budget set
}

export const useBudget = () => {
    const { user } = useAuth();
    const [budgets, setBudgets] = useState<Budget[]>([]);

    // Initial load/mock
    useEffect(() => {
        if (!user) return;
        // Fetch from backend in future. using local storage for now or simple mock
        const saved = localStorage.getItem(`jualuma_budgets_${user.uid}`);
        if (saved) {
            setBudgets(JSON.parse(saved));
        } else {
            setBudgets([]);
        }
    }, [user]);

    const saveBudget = async (category: string, amount: number | null) => {
        setBudgets(prev => {
            const existing = prev.find(b => b.category === category);
            let nextState;
            if (existing) {
                nextState = prev.map(b => b.category === category ? { ...b, amount } : b);
            } else {
                nextState = [...prev, { category, amount }];
            }

            // Persist
            if (user) localStorage.setItem(`jualuma_budgets_${user.uid}`, JSON.stringify(nextState));
            return nextState;
        });

        // In real backend, we would POST to /api/budgets here
    };

    return { budgets, saveBudget };
};
