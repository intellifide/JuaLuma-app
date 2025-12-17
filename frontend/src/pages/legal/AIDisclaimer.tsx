import { useNavigate } from 'react-router-dom'
import { Navigation } from '../../components/Navigation'
import { Footer } from '../../components/Footer'
import { useTheme } from '../../hooks/useTheme'

const AIDisclaimer = () => {
    const navigate = useNavigate()
    const { theme } = useTheme()

    return (
        <div className={`min-h-screen flex flex-col ${theme === 'dark' ? 'dark' : ''}`}>
            <Navigation />

            <main className="flex-grow pt-24 pb-12 px-6">
                <div className="max-w-4xl mx-auto backdrop-blur-glass bg-white/70 dark:bg-gray-900/75 rounded-2xl border border-white/60 dark:border-white/10 shadow-glass p-8 md:p-12">
                    <h1 className="text-4xl font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
                        AI Disclaimer
                    </h1>

                    <div className="prose dark:prose-invert max-w-none space-y-6 text-slate-700 dark:text-slate-300">
                        <p className="font-semibold text-lg">
                            Last Updated: December 9, 2025
                        </p>

                        <section>
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">1. Nature of AI Services</h2>
                            <p>
                                JuaLuma&apos;s AI Assistant (&quot;The Assistant&quot;) utilizes advanced large language models to provide financial insights, categorization, and analysis. While we strive for accuracy, AI models can occasionally produce incorrect, misleading, or hallucinations (false information). The Assistant&apos;s outputs should be used as a reference only and not as the sole basis for financial decisions.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">2. Not Financial Advice</h2>
                            <p>
                                The information provided by the Assistant does NOT constitute professional financial, investment, tax, or legal advice. JuaLuma is a technology platform, not a registered investment advisor or broker-dealer. You should consult with a qualified professional before making any financial decisions.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">3. Data Usage & Privacy</h2>
                            <p>
                                Your financial data is processed securely. We do not use your personal financial transaction data to train our foundational models without your explicit consent. Anonymized interactions may be used to improve service quality and cache responses. Please refer to our <button onClick={() => navigate('/privacy')} className="text-primary hover:underline">Privacy Policy</button> for full details.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">4. Limitations of Liability</h2>
                            <p>
                                JuaLuma is not liable for any losses or damages resulting from actions taken based on the Assistant&apos;s recommendations or analysis. You agree to independently verify all information provided by the AI.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">5. Third-Party Dependent</h2>
                            <p>
                                Our AI services rely on third-party providers (such as Google and OpenAI). Service interruptions or changes in these third-party services may affect the availability or accuracy of the Assistant.
                            </p>
                        </section>
                    </div>

                    <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-700 flex justify-center">
                        <button
                            onClick={() => navigate(-1)}
                            className="px-6 py-3 bg-primary text-white font-semibold rounded-lg shadow-lg hover:bg-primary-dark transition-all transform hover:-translate-y-0.5"
                        >
                            Back
                        </button>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    )
}

export default AIDisclaimer
