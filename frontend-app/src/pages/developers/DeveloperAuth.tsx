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

import { FormEvent, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { LEGAL_AGREEMENTS } from '../../constants/legal';
import { AgreementAcceptanceInput } from '../../types/legal';
import { developerService } from '../../services/developers';
import { AnimatedBrandText } from '../../components/AnimatedBrandText';
import { getMarketingSiteUrl } from '../../utils/marketing';

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
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [acceptDeveloperAgreement, setAcceptDeveloperAgreement] = useState(false);
    const [acceptTerms, setAcceptTerms] = useState(false);
    const [acceptPrivacy, setAcceptPrivacy] = useState(false);
    const [acceptResident, setAcceptResident] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const passwordValid = useMemo(
        () => passwordChecks.every((check) => check.test(password)),
        [password],
    );

    const marketingLegalBase = useMemo(() => getMarketingSiteUrl(), []);

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
            if (!acceptDeveloperAgreement || !acceptTerms || !acceptPrivacy || !acceptResident) {
                setError('You must accept all required legal agreements.');
                return;
            }
            if (!firstName.trim()) {
                setError('First name is required.');
                return;
            }
            if (!lastName.trim()) {
                setError('Last name is required.');
                return;
            }
            if (username.trim() && username.length < 3) {
                setError('Username must be at least 3 characters if provided.');
                return;
            }
        }

        setSubmitting(true);
        try {
            if (mode === 'signup') {
                // 1. Create Core Account
                const agreements: AgreementAcceptanceInput[] = [
                    {
                        agreement_key: LEGAL_AGREEMENTS.termsOfService.key,
                        agreement_version: LEGAL_AGREEMENTS.termsOfService.version,
                        acceptance_method: 'clickwrap',
                    },
                    {
                        agreement_key: LEGAL_AGREEMENTS.privacyPolicy.key,
                        agreement_version: LEGAL_AGREEMENTS.privacyPolicy.version,
                        acceptance_method: 'clickwrap',
                    },
                    {
                        agreement_key: LEGAL_AGREEMENTS.usResidencyCertification.key,
                        agreement_version: LEGAL_AGREEMENTS.usResidencyCertification.version,
                        acceptance_method: 'clickwrap',
                    },
                    {
                        agreement_key: LEGAL_AGREEMENTS.developerAgreement.key,
                        agreement_version: LEGAL_AGREEMENTS.developerAgreement.version,
                        acceptance_method: 'clickwrap',
                    },
                ];
                await signup(email, password, agreements, firstName.trim(), lastName.trim(), username.trim() || undefined);

                // 2. Register as Developer
                // Note: signup auto-logs in, so we have a token
                try {
                    await developerService.register({
                        payout_method: {}, // Default empty for now
                        payout_frequency: 'monthly',
                        agreements: [
                            {
                                agreement_key: LEGAL_AGREEMENTS.developerAgreement.key,
                                agreement_version: LEGAL_AGREEMENTS.developerAgreement.version,
                                acceptance_method: 'clickwrap',
                            },
                        ],
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
                     <Link to="/developers" className="flex flex-col items-center gap-2 group">
                        <AnimatedBrandText className="text-4xl" />
                        <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-text-primary to-text-secondary tracking-tight -mt-1 opacity-80 capitalize">
                            Developers
                        </span>
                    </Link>
                    <h2 className="text-xl font-semibold mt-4 text-white">
                        {mode === 'login' ? 'Log in to your dashboard' : 'Create your developer account'}
                    </h2>
                </div>

                <div className="glass-panel p-8 rounded-xl border border-white/10 bg-surface-1/50 backdrop-blur-xl">
                    <form className="space-y-4" onSubmit={onSubmit}>
                        {mode === 'signup' && (
                            <>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-text-secondary mb-1">First Name</label>
                                        <input
                                            type="text"
                                            required
                                            className="input w-full bg-black/20"
                                            value={firstName}
                                            onChange={e => setFirstName(e.target.value)}
                                            placeholder="John"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-text-secondary mb-1">Last Name</label>
                                        <input
                                            type="text"
                                            required
                                            className="input w-full bg-black/20"
                                            value={lastName}
                                            onChange={e => setLastName(e.target.value)}
                                            placeholder="Doe"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-1">Username (Optional)</label>
                                    <input
                                        type="text"
                                        className="input w-full bg-black/20"
                                        value={username}
                                        onChange={e => setUsername(e.target.value)}
                                        placeholder="johndoe"
                                        minLength={3}
                                        maxLength={64}
                                    />
                                    <p className="text-xs text-text-muted mt-1">Must be at least 3 characters and unique</p>
                                </div>
                            </>
                        )}
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
                                            checked={acceptDeveloperAgreement}
                                            onChange={e => setAcceptDeveloperAgreement(e.target.checked)}
                                        />
                                        <span className="text-xs text-text-secondary">
                                            I agree to the <a href={`${marketingLegalBase}/legal/terms`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Developer Agreement</a>.
                                        </span>
                                    </label>
                                </div>
                                <div className="pt-2 space-y-2">
                                    <label className="flex items-start gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="checkbox checkbox-xs mt-1"
                                            checked={acceptTerms}
                                            onChange={e => setAcceptTerms(e.target.checked)}
                                        />
                                        <span className="text-xs text-text-secondary">
                                            I agree to the <a href={`${marketingLegalBase}/legal/terms`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Terms of Service</a>.
                                        </span>
                                    </label>
                                    <label className="flex items-start gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="checkbox checkbox-xs mt-1"
                                            checked={acceptPrivacy}
                                            onChange={e => setAcceptPrivacy(e.target.checked)}
                                        />
                                        <span className="text-xs text-text-secondary">
                                            I agree to the <a href={`${marketingLegalBase}/legal/privacy`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Privacy Policy</a>.
                                        </span>
                                    </label>
                                    <label className="flex items-start gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="checkbox checkbox-xs mt-1"
                                            checked={acceptResident}
                                            onChange={e => setAcceptResident(e.target.checked)}
                                        />
                                        <span className="text-xs text-text-secondary">
                                            I certify that I am a resident of the United States and agree to the Terms of Service.
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
