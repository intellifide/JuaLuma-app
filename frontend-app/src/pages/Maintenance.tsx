import { useTheme } from '../hooks/useTheme'

export default function Maintenance() {
    const { theme } = useTheme()

    return (
        <div className={`min-h-screen flex items-center justify-center p-4 ${theme === 'dark' ? 'dark' : ''}`}>
            <div className="max-w-md w-full text-center">
                <div className="backdrop-blur-glass bg-white/70 dark:bg-gray-900/75 rounded-2xl border border-white/60 dark:border-white/10 shadow-glass p-8 md:p-12">
                    <img
                        src="/assets/jualuma-logo.png"
                        alt="jualuma Logo"
                        className="h-12 mx-auto mb-8"
                    />

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
