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


import React, { useEffect, useState } from 'react';
import { getMarketingLegalUrl } from '../utils/marketing';

export const CookieConsentBanner: React.FC = () => {
    const [isVisible, setIsVisible] = useState(false);
    const privacyPolicyUrl = getMarketingLegalUrl('privacy');

    useEffect(() => {
        const consent = localStorage.getItem('jualuma_cookie_consent');
        if (consent === null) {
            setIsVisible(true);
        }
    }, []);

    const handleAccept = () => {
        localStorage.setItem('jualuma_cookie_consent', 'true');
        setIsVisible(false);
    };

    const handleDecline = () => {
        localStorage.setItem('jualuma_cookie_consent', 'false');
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-slide-up">
            <div className="container mx-auto max-w-4xl">
                <div className="glass-panel backdrop-blur-xl bg-white/80 border border-white/20 shadow-2xl rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 dark:bg-slate-900/80 dark:border-slate-700/50">
                    <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                            Cookie Preferences
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                            We use cookies to enhance your experience and analyze our traffic.
                            By clicking &quot;Accept&quot;, you consent to our use of cookies.
                            Read our <a href={privacyPolicyUrl} target="_blank" rel="noopener noreferrer" className="text-royal-purple hover:text-deep-indigo underline">Privacy Policy</a> to learn more.
                        </p>
                    </div>
                    <div className="flex gap-4 min-w-fit">
                        <button
                            onClick={handleDecline}
                            className="px-6 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-800 transition-colors duration-200"
                        >
                            Decline
                        </button>
                        <button
                            onClick={handleAccept}
                            className="px-6 py-2.5 rounded-xl text-sm font-medium bg-royal-purple text-white shadow-lg shadow-royal-purple/25 hover:bg-deep-indigo hover:shadow-royal-purple/40 hover:-translate-y-0.5 transition-all duration-200"
                        >
                            Accept
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
