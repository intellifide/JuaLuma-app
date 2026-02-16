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

// Last Modified: 2026-01-24 04:25 CST
import React from 'react';
import { Link } from 'react-router-dom';

interface QuotaDisplayProps {
    used: number;
    limit: number;
    tier: string;
    loading?: boolean;
}

export const QuotaDisplay: React.FC<QuotaDisplayProps> = ({ used, limit, tier, loading }) => {
    if (loading) {
        return (
            <div className="flex flex-col items-end justify-center animate-pulse">
                <div className="h-4 w-32 rounded mb-1" style={{ background: 'var(--surface-active)' }}></div>
                <div className="h-2 w-24 rounded" style={{ background: 'var(--surface-active)' }}></div>
            </div>
        );
    }

    const percentage = Math.min((used / limit) * 100, 100);
    const isExceeded = used >= limit;
    const isNearLimit = percentage >= 80;

    // Color based on usage
    let progressBarColor = 'bg-primary';
    if (isExceeded) progressBarColor = 'bg-red-500';
    else if (isNearLimit) progressBarColor = 'bg-yellow-500';

    return (
        <div className="flex flex-col items-end min-w-[200px]">
            <div className="flex items-center gap-2 mb-1">
                <span className={`text-sm font-medium ${isExceeded ? 'text-red-400' : 'text-text-primary'}`}>
                    {used} / {limit}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full text-text-secondary border capitalize" style={{ borderColor: 'var(--border-subtle)', background: 'var(--surface-hover)' }}>
                    {tier.replace('_', ' ')}
                </span>
            </div>

            <div className="w-full h-2 rounded-full overflow-hidden relative" style={{ background: 'var(--border-subtle)' }}>
                <div
                    className={`h-full ${progressBarColor} transition-all duration-500 ease-out`}
                    style={{ width: `${percentage}%` }}
                />
            </div>

            {isExceeded && tier === 'free' && (
                <Link to="/settings" className="text-xs text-primary hover:underline mt-1 font-medium transition-colors">
                    Upgrade &rarr;
                </Link>
            )}
        </div>
    );
};
