// Updated 2025-12-08 20:31 CST by ChatGPT
import { useAuth } from '../hooks/useAuth'

export const Settings = () => {
  const { profile } = useAuth()

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="bg-white/80 border border-slate-200 rounded-2xl shadow-xl p-8 backdrop-blur">
        <h1 className="text-3xl font-bold text-deep-indigo mb-4">Settings</h1>
        <p className="text-slate-700 mb-6">
          Manage personal preferences. In future iterations, connect this page to the backend profile patch endpoint to
          update themes and currency preferences.
        </p>
        <div className="space-y-3 text-slate-700">
          <p>Email: {profile?.email ?? '—'}</p>
          <p>Theme: {profile?.theme_pref ?? 'system'}</p>
          <p>Currency: {profile?.currency_pref ?? 'USD'}</p>
        </div>
      </div>
    </div>
  )
}
