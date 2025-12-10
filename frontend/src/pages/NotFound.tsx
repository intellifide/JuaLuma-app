import { useNavigate } from 'react-router-dom'
import { useTheme } from '../hooks/useTheme'

export default function NotFound() {
    const navigate = useNavigate()
    const { theme } = useTheme()

    return (
        <div className={`min-h-screen flex items-center justify-center p-4 ${theme === 'dark' ? 'dark' : ''}`}>
            <div className="max-w-md w-full text-center">
                <div className="backdrop-blur-glass bg-white/70 dark:bg-gray-900/75 rounded-2xl border border-white/60 dark:border-white/10 shadow-glass p-8 md:p-12">
                    <img
                        src="/assets/finity-logo.png"
                        alt="Finity Logo"
                        className="h-12 mx-auto mb-8"
                    />

                    <h1 className="text-4xl font-bold mb-4 text-slate-900 dark:text-white">Page Not Found</h1>

                    <p className="text-slate-600 dark:text-slate-400 mb-8">
                        The page you're looking for doesn't exist or has been moved.
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
