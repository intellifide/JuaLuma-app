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

// Maintenance Page. Last modified: 2026-02-02 18:50 CST
import { useTheme } from '../hooks/useTheme'
import { AnimatedBrandText } from '../components/AnimatedBrandText'

export default function Maintenance() {
    const { theme } = useTheme()
    return (
        <div className={`min-h-screen flex items-center justify-center p-4 ${theme === 'dark' ? 'dark' : ''}`}>
            <div className="max-w-md w-full text-center">
                <div className="backdrop-blur-glass bg-white/70 dark:bg-gray-900/75 rounded-2xl border border-white/60 dark:border-white/10 shadow-glass p-8 md:p-12">
                    <div className="mb-8">
                        <AnimatedBrandText className="text-4xl" />
                    </div>

                    <h1 className="text-3xl font-bold mb-4 text-slate-900 dark:text-white">We&apos;ll be right back</h1>

                    <p className="text-slate-600 dark:text-slate-400 mb-2">
                        We&apos;re performing scheduled maintenance to improve the service.
                    </p>

                    <p className="text-slate-500 dark:text-slate-500 text-sm">
                        Please check back soon. Your data remains safe and encrypted.
                    </p>
                </div>
            </div>
        </div>
    )
}
