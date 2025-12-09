// Updated 2025-12-08 20:31 CST by ChatGPT
import { useAuth } from '../hooks/useAuth'

export const Dashboard = () => {
  const { profile } = useAuth()

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="bg-white/80 border border-slate-200 rounded-2xl shadow-xl p-8 backdrop-blur">
        <h1 className="text-3xl font-bold text-deep-indigo mb-4">Dashboard</h1>
        <p className="text-slate-700 mb-6">
          You are signed in. Use this area to surface account data, subscription details, and AI usage summaries.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-slate-200 p-4">
            <h2 className="text-lg font-semibold text-royal-purple">Profile</h2>
            <ul className="text-slate-700 text-sm space-y-1 mt-2">
              <li>Email: {profile?.email ?? '—'}</li>
              <li>Role: {profile?.role ?? '—'}</li>
              <li>Theme: {profile?.theme_pref ?? '—'}</li>
              <li>Currency: {profile?.currency_pref ?? '—'}</li>
            </ul>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <h2 className="text-lg font-semibold text-royal-purple">Subscription</h2>
            <p className="text-slate-700 text-sm">
              Plan: {profile?.plan ?? profile?.subscriptions?.[0]?.plan ?? 'Not set'}
            </p>
            <p className="text-slate-700 text-sm">
              Status: {profile?.subscription_status ?? profile?.subscriptions?.[0]?.status ?? 'Not set'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
