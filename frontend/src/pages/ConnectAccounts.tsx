import React, { useState } from 'react';
import { useAccounts } from '../hooks/useAccounts';
import { PlaidLinkButton } from '../components/PlaidLinkButton';
import { useToast } from '../components/ui/Toast';
import { api as apiClient } from '../services/api';

const AddWalletModal = ({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) => {
  const [address, setAddress] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiClient.post('/api/accounts/link/web3', {
        address,
        chain_id: 1, // Mainnet default
        account_name: name
      });
      toast.show('Wallet linked successfully', 'success');
      onSuccess();
    } catch (err: any) {
      toast.show(err.response?.data?.detail || 'Failed to link wallet', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-1 bordered p-6 rounded-lg w-full max-w-md shadow-xl">
        <h3 className="text-xl font-bold mb-4">Connect Web3 Wallet</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Wallet Label</label>
            <input
              type="text"
              className="input w-full"
              placeholder="My ETH Vault"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">ETH Address</label>
            <input
              type="text"
              className="input w-full font-mono text-sm"
              placeholder="0x..."
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              pattern="^0x[a-fA-F0-9]{40}$"
              title="Must be a valid Ethereum address starting with 0x"
              required
            />
          </div>
          <div className="flex gap-3 justify-end mt-6">
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={loading}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Linking...' : 'Link Wallet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const AddCexModal = ({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) => {
  const [exchange, setExchange] = useState('coinbase');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiClient.post('/api/accounts/link/cex', {
        exchange_id: exchange,
        api_key: apiKey,
        api_secret: apiSecret,
        account_name: name
      });
      toast.show('Exchange linked successfully', 'success');
      onSuccess();
    } catch (err: any) {
      toast.show(err.response?.data?.detail || 'Failed to link exchange', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-1 bordered p-6 rounded-lg w-full max-w-md shadow-xl">
        <h3 className="text-xl font-bold mb-4">Connect Exchange</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Exchange</label>
            <select className="input w-full" value={exchange} onChange={(e) => setExchange(e.target.value)}>
              <option value="coinbase">Coinbase</option>
              <option value="kraken">Kraken</option>
              <option value="binance">Binance</option>
              <option value="binanceus">Binance US</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Label</label>
            <input
              type="text"
              className="input w-full"
              placeholder="My Pro Trading Account"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">API Key</label>
            <input
              type="password"
              className="input w-full font-mono text-sm"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">API Secret</label>
            <input
              type="password"
              className="input w-full font-mono text-sm"
              value={apiSecret}
              onChange={(e) => setApiSecret(e.target.value)}
              required
            />
          </div>
          <p className="text-xs text-text-secondary">
            Ensure your API key has <strong>Ready-Only</strong> permissions. We do not support trading or withdrawals.
          </p>
          <div className="flex gap-3 justify-end mt-6">
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={loading}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Verifying...' : 'Link Exchange'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const ConnectAccounts = () => {
  const { accounts, loading, remove, sync, refetch } = useAccounts();
  const toast = useToast();
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showCexModal, setShowCexModal] = useState(false);

  const handlePlaidSuccess = () => {
    toast.show('Account connected successfully', 'success');
    refetch();
  };

  const handlePlaidError = (msg: string) => {
    toast.show(msg, 'error');
  };

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
                <PlaidLinkButton onSuccess={handlePlaidSuccess} onError={handlePlaidError} />
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
              <button
                className="btn btn-secondary w-full md:w-auto"
                type="button"
                onClick={() => setShowWalletModal(true)}
              >
                Connect Wallet
              </button>
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
              <button
                className="btn btn-outline w-full md:w-auto"
                type="button"
                onClick={() => setShowCexModal(true)}
              >
                Connect Exchange
              </button>
            </div>
          </div>
        </div>

        {/* Modals */}
        {showWalletModal && (
          <AddWalletModal
            onClose={() => setShowWalletModal(false)}
            onSuccess={() => { setShowWalletModal(false); refetch(); }}
          />
        )}
        {showCexModal && (
          <AddCexModal
            onClose={() => setShowCexModal(false)}
            onSuccess={() => { setShowCexModal(false); refetch(); }}
          />
        )}

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
                Complete transaction history retained. Data is only removed per &quot;Right to be Forgotten&quot; requests. AI chat history has no retention limits; all transactions remain fully visible.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
