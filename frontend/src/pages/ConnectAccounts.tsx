import React from 'react';
import { useAccounts } from '../hooks/useAccounts';
import { PlaidLinkButton } from '../components/PlaidLinkButton';

export const ConnectAccounts = () => {
  const { accounts, loading, remove, sync } = useAccounts();

  return (
    <div>
      <section className="container py-12">
        <h1 className="mb-6">Connect & Manage Accounts</h1>
        <p className="text-text-secondary mb-12 max-w-[800px]">
          Link bank accounts, Web3 wallets, and CEX accounts. All connections are read-only; we cannot move your money.
        </p>

        <div className="grid grid-3 mb-12">
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-bold">Bank & Credit (Plaid Sandbox)</h3>
            </div>
            <div className="card-body">
              <p className="mb-4">Connect checking, savings, and credit cards via Plaid Sandbox credentials.</p>
              <ul className="list-disc pl-6 mb-4 space-y-1">
                <li>Sandbox credentials: <strong>user_good / pass_good</strong></li>
                <li>Read-only access; no transfers or trades</li>
                <li>Supports up to 5 traditional accounts (Pro/Essential)</li>
              </ul>
              <div className="mt-4">
                <PlaidLinkButton />
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-bold">Web3 Wallets</h3>
            </div>
            <div className="card-body">
              <p className="mb-4">Connect a Web3 wallet (e.g., MetaMask) for balances and NFTs.</p>
              <ul className="list-disc pl-6 mb-4 space-y-1">
                <li>Supports up to 5 wallets (Pro/Essential)</li>
              </ul>
              <button className="btn btn-secondary w-full md:w-auto" type="button" onClick={() => window.alert('Web3 Wallet connection coming soon.')}>Connect Wallet</button>
            </div>
          </div>
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-bold">CEX Accounts</h3>
            </div>
            <div className="card-body">
              <p className="mb-4">Connect Coinbase, Kraken, and other exchanges via OAuth/API.</p>
              <ul className="list-disc pl-6 mb-4 space-y-1">
                <li>Supports up to 5 CEX accounts (Pro/Essential)</li>
                <li>API keys stored in Secret Manager (never in DB)</li>
              </ul>
              <button className="btn btn-outline w-full md:w-auto" type="button" onClick={() => window.alert('CEX connection coming soon.')}>Connect Exchange</button>
            </div>
          </div>
        </div>

        <div className="glass-panel mb-12">
          <h2 className="mb-6">Linked Accounts</h2>
          <div className="overflow-x-auto">
            <table className="table w-full text-left">
              <thead>
                <tr className="border-b border-border">
                  <th className="pb-3 font-semibold">Institution</th>
                  <th className="pb-3 font-semibold">Type</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold">Last Sync</th>
                  <th className="pb-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-text-muted">Loading accounts...</td>
                  </tr>
                ) : accounts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-text-muted">No accounts connected yet.</td>
                  </tr>
                ) : (
                  accounts.map((account) => (
                    <tr key={account.id} className="border-b border-border/50 hover:bg-surface-2 transition-colors">
                      <td className="py-4 font-medium">{account.accountName || 'Unnamed Account'}</td>
                      <td className="py-4 capitalize">{account.accountType}</td>
                      <td className="py-4"><span className="badge badge-success">Connected</span></td>
                      <td className="py-4 text-sm text-text-secondary">{account.updatedAt ? new Date(account.updatedAt).toLocaleTimeString() : 'Just now'}</td>
                      <td className="py-4">
                        <div className="flex gap-2">
                          <button
                            className="btn btn-sm btn-outline"
                            onClick={() => sync(account.id)}
                          >
                            Refresh
                          </button>
                          <button
                            className="btn btn-sm btn-outline text-red-500 border-red-200 hover:bg-red-50"
                            onClick={() => remove(account.id)}
                          >
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="alert alert-info mb-8">
          <strong>Read-Only Access:</strong> All connections are read-only to maintain non-custodial, non-MSB status. We cannot initiate transactions, transfer funds, or modify account settings. API keys and OAuth tokens are stored only in Secret Manager.
        </div>

        <div className="glass-panel">
          <h2 className="mb-6">Data Retention by Tier</h2>
          <div className="grid grid-2 mt-6">
            <div className="card">
              <h3 className="text-lg font-bold mb-2">Free Tier</h3>
              <p className="font-semibold mb-1">45-day transaction retention</p>
              <p className="text-sm text-text-secondary">
                Transaction data is retained for 45 days. No archive is maintained after this period. AI chat history has no retention limits; all transactions remain fully visible.
              </p>
            </div>
            <div className="card">
              <h3 className="text-lg font-bold mb-2">Essential Tier</h3>
              <p className="font-semibold mb-1">30-day hot + archive</p>
              <p className="text-sm text-text-secondary">
                Recent 30 days stored in Cloud SQL. Older data archived to Coldline storage for read-only retrieval. AI chat history has no retention limits; all transactions remain fully visible.
              </p>
            </div>
            <div className="card">
              <h3 className="text-lg font-bold mb-2">Pro & Ultimate Tiers</h3>
              <p className="font-semibold mb-1">Full transaction retention</p>
              <p className="text-sm text-text-secondary">
                Complete transaction history retained. Data is only removed per "Right to be Forgotten" requests. AI chat history has no retention limits; all transactions remain fully visible.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
