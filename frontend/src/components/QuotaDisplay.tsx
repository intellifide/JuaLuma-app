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
            <div className="flex flex-col items-end justify-center h-full animate-pulse">
                <div className="h-4 w-32 bg-white/10 rounded mb-1"></div>
                <div className="h-2 w-24 bg-white/10 rounded"></div>
            </div>
        );
    }

    const percentage = Math.min((used / limit) * 100, 100);
    const isExceeded = used >= limit;
    const isNearLimit = percentage >= 80;

    // Color based on usage
    let progressBarColor = 'bg-royal-purple';
    if (isExceeded) progressBarColor = 'bg-red-500';
    else if (isNearLimit) progressBarColor = 'bg-yellow-500';

    return (
        <div className="flex flex-col items-end">
            <div className="flex items-center gap-2 mb-2">
                <span className={`text-sm font-medium ${isExceeded ? 'text-red-500' : 'text-text-primary'}`}>
                    {used} / {limit} queries
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-surface-2 text-text-secondary border border-white/10 uppercase tracking-wider">
                    {tier}
                </span>
            </div>

            <div className="w-48 h-2 bg-surface-2 rounded-full overflow-hidden border border-white/5 relative">
                <div
                    className={`h-full ${progressBarColor} transition-all duration-500 ease-out absolute left-0 top-0`}
                    style={{ width: `${percentage}%` }}
                />
            </div>

            {isExceeded && tier === 'free' && (
                <Link to="/settings" className="text-xs text-royal-purple hover:text-royal-purple-dark mt-1 font-medium transition-colors">
                    Upgrade to increase limit &rarr;
                </Link>
            )}

            <p className="text-[10px] text-text-muted mt-1 text-right">
                Resets at midnight CT
            </p>
        </div>
    );
};
