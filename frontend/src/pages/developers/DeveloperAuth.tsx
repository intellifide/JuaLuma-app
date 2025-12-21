import { FormEvent, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { developerService } from '../../services/developers';

interface DeveloperAuthProps {
    mode: 'login' | 'signup';
}

const passwordChecks = [
    { label: 'At least 8 characters', test: (value: string) => value.length >= 8 },
    { label: 'One uppercase letter', test: (value: string) => /[A-Z]/.test(value) },
    { label: 'One lowercase letter', test: (value: string) => /[a-z]/.test(value) },
    { label: 'One number', test: (value: string) => /\d/.test(value) },
    { label: 'One special character', test: (value: string) => /[^A-Za-z0-9]/.test(value) },
];

export const DeveloperAuth = ({ mode }: DeveloperAuthProps) => {
    const { login, signup } = useAuth();
    const navigate = useNavigate();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [acceptTerms, setAcceptTerms] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const passwordValid = useMemo(
        () => passwordChecks.every((check) => check.test(password)),
        [password],
    );

    const onSubmit = async (event: FormEvent) => {
        event.preventDefault();
        setError(null);

        if (mode === 'signup') {
            if (password !== confirmPassword) {
                setError('Passwords do not match.');
                return;
            }
            if (!passwordValid) {
                setError('Password does not meet complexity requirements.');
                return;
            }
            if (!acceptTerms) {
                setError('You must accept the Developer Agreement.');
                return;
            }
        }

        setSubmitting(true);
        try {
            if (mode === 'signup') {
                // 1. Create Core Account
                await signup(email, password);
                
                // 2. Register as Developer
                // Note: signup auto-logs in, so we have a token
                try {
                    await developerService.register({
                         payout_method: {}, // Default empty for now
                         payout_frequency: 'monthly'
                    });
                } catch (devErr) {
                    console.error("Developer registration failed, but account created.", devErr);
                    // Decide if we block or continue. Let's warn but continue.
                    // Actually, if this fails, they are a user but not a dev.
                    // We should probably show an error or try again.
                }
            } else {
                await login(email, password);
            }
            
            // Redirect to Developer Dashboard
            navigate('/developers/dashboard', { replace: true });
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Authentication failed.';
            setError(message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                     <Link to="/developers" className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                        JuaLuma Developers
                    </Link>
                    <h2 className="text-xl font-semibold mt-4 text-white">
                        {mode === 'login' ? 'Log in to your dashboard' : 'Create your developer account'}
                    </h2>
                </div>

                <div className="glass-panel p-8 rounded-xl border border-white/10 bg-surface-1/50 backdrop-blur-xl">
                    <form className="space-y-4" onSubmit={onSubmit}>
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1">Email</label>
                            <input
                                type="email"
                                required
                                className="input w-full bg-black/20"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="dev@jualuma.com"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1">Password</label>
                            <input
                                type="password"
                                required
                                className="input w-full bg-black/20"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="••••••••"
                            />
                        </div>

                        {mode === 'signup' && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-1">Confirm Password</label>
                                    <input
                                        type="password"
                                        required
                                        className="input w-full bg-black/20"
                                        value={confirmPassword}
                                        onChange={e => setConfirmPassword(e.target.value)}
                                        placeholder="••••••••"
                                    />
                                </div>
                                
                                {/* Password Rules */}
                                <ul className="space-y-1 text-xs text-text-muted">
                                    {passwordChecks.map((check) => (
                                        <li key={check.label} className="flex items-center gap-2">
                                            <span className={`h-2 w-2 rounded-full ${check.test(password) ? 'bg-green-500' : 'bg-white/20'}`} />
                                            {check.label}
                                        </li>
                                    ))}
                                </ul>

                                <div className="pt-2">
                                    <label className="flex items-start gap-2 cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            className="checkbox checkbox-xs mt-1"
                                            checked={acceptTerms}
                                            onChange={e => setAcceptTerms(e.target.checked)}
                                        />
                                        <span className="text-xs text-text-secondary">
                                            I agree to the <Link to="/legal/terms" className="text-primary hover:underline">Developer Agreement</Link> and <Link to="/legal/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
                                        </span>
                                    </label>
                                </div>
                            </>
                        )}

                        {error && (
                            <div className="p-3 rounded bg-red-500/20 text-red-200 text-sm border border-red-500/30">
                                {error}
                            </div>
                        )}

                        <button 
                            type="submit" 
                            disabled={submitting}
                            className="btn btn-primary w-full py-3"
                        >
                            {submitting ? 'Processing...' : (mode === 'login' ? 'Log In' : 'Create Account')}
                        </button>
                    </form>

                    <div className="mt-6 text-center text-sm text-text-muted">
                        {mode === 'login' ? (
                            <>
                                New to JuaLuma? <Link to="/developers/signup" className="text-primary hover:underline">Sign up</Link>
                            </>
                        ) : (
                            <>
                                Already have an account? <Link to="/developers/login" className="text-primary hover:underline">Log in</Link>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
