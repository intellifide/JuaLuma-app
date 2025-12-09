// Updated 2025-12-08 21:49 CST by ChatGPT
import { PlaidLinkButton } from '../components/PlaidLinkButton'
import { AccountCard } from '../components/AccountCard'
import { useAccounts } from '../hooks/useAccounts'

export const ConnectAccounts = () => {
  const { accounts, loading, remove, sync } = useAccounts()

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-deep-indigo">Connect Accounts</h1>
        <p className="text-slate-600">Link bank, investment, web3, or manual accounts to see them in your dashboard.</p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white/80 border border-slate-200 rounded-2xl shadow-sm p-4">
          <h2 className="text-lg font-semibold text-slate-900">Traditional</h2>
          <p className="text-sm text-slate-600 mb-3">Connect with Plaid (checking, savings, credit).</p>
          <PlaidLinkButton />
        </div>
        <div className="bg-white/80 border border-slate-200 rounded-2xl shadow-sm p-4">
          <h2 className="text-lg font-semibold text-slate-900">Investment</h2>
          <p className="text-sm text-slate-600 mb-3">Brokerages (sandbox) via Plaid investments.</p>
          <PlaidLinkButton />
        </div>
        <div className="bg-white/80 border border-slate-200 rounded-2xl shadow-sm p-4">
          <h2 className="text-lg font-semibold text-slate-900">Manual</h2>
          <p className="text-sm text-slate-600 mb-3">Track assets not supported yet.</p>
          <button
            type="button"
            className="px-4 py-2 rounded-lg bg-royal-purple text-white hover:bg-deep-indigo transition-colors"
            onClick={() => window.alert('Manual account form coming soon.')}
          >
            Add Manual Account
          </button>
        </div>
      </section>

      <section className="bg-white/80 border border-slate-200 rounded-2xl shadow-sm p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">Connected Accounts</h2>
          <p className="text-sm text-slate-500">Free tier: 2 accounts max</p>
        </div>
        {loading ? (
          <p className="text-sm text-slate-500">Loading...</p>
        ) : accounts.length === 0 ? (
          <p className="text-sm text-slate-500">No accounts connected yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {accounts.map((acct) => (
              <AccountCard key={acct.id} account={acct} onDelete={remove} onSync={sync} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
