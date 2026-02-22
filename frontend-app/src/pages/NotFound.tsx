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

// NotFound Page. Last modified: 2026-02-02 18:50 CST
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../hooks/useTheme'
import { AnimatedBrandText } from '../components/AnimatedBrandText'

export default function NotFound() {
    const navigate = useNavigate()
    const { theme } = useTheme()

    return (
        <div className={`min-h-screen flex items-center justify-center p-4 ${theme === 'dark' ? 'dark' : ''}`}>
            <div className="max-w-md w-full text-center">
                <div className="backdrop-blur-glass bg-white/70 dark:bg-gray-900/75 rounded-2xl border border-white/60 dark:border-white/10 shadow-glass p-8 md:p-12">
                    <div className="mb-8">
                        <AnimatedBrandText className="text-4xl" />
                    </div>

                    <h1 className="text-4xl font-bold mb-4 text-slate-900 dark:text-white">Page Not Found</h1>

                    <p className="text-slate-600 dark:text-slate-400 mb-8">
                        The page you&apos;re looking for doesn&apos;t exist or has been moved.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <button
                            onClick={() => navigate('/')}
                            className="px-6 py-2.5 bg-primary text-white font-semibold rounded-lg shadow-lg hover:bg-primary-dark transition-all transform hover:-translate-y-0.5"
                        >
                            Go Home
                        </button>
                        <button
                            onClick={() => navigate('/support')}
                            className="px-6 py-2.5 bg-transparent border-2 border-primary text-primary font-semibold rounded-lg hover:bg-primary/5 transition-all"
                        >
                            Contact Support
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
