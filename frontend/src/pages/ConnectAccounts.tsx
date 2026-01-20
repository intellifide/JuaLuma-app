// Core Purpose: UI for connecting various account types (Plaid, Web3, CEX) with household assignment logic.
// Last Updated 2026-01-20 03:26 CST by Antigravity - consistent card layouts and button positioning
import React, { useState, useEffect } from 'react';
import { useAccounts } from '../hooks/useAccounts';
import { PlaidLinkButton } from '../components/PlaidLinkButton';
import { useToast } from '../components/ui/Toast';
import { api as apiClient } from '../services/api';
import { householdService } from '../services/householdService';
import { Household } from '../types/household';

interface ApiError {
  response?: {
    data?: {
      detail?: string;
    };
  };
}

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
    } catch (err) {
      toast.show((err as ApiError).response?.data?.detail || 'Failed to link wallet', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-overlay flex items-center justify-center z-50 p-4">
      <div className="modal-content max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold">Connect Web3 Wallet</h3>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="form-label">Wallet Label</label>
            <input
              type="text"
              className="input"
              placeholder="My ETH Vault"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="form-label">ETH Address</label>
            <input
              type="text"
              className="input font-mono text-sm"
              placeholder="0x..."
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              pattern="^0x[a-fA-F0-9]{40}$"
              title="Must be a valid Ethereum address starting with 0x"
              required
            />
          </div>
          <div className="flex gap-3 justify-end mt-8">
            <button type="button" className="btn btn-outline" onClick={onClose} disabled={loading}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Linking...' : 'Link Wallet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const AddCexModal = ({
  onClose,
  onSuccess,
  initialExchange = 'coinbase',
  initialName = '',
  title = 'Connect Exchange'
}: {
  onClose: () => void;
  onSuccess: () => void;
  initialExchange?: string;
  initialName?: string;
  title?: string;
}) => {
  const [exchange, setExchange] = useState(initialExchange);
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [name, setName] = useState(initialName);
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
    } catch (err) {
      toast.show((err as ApiError).response?.data?.detail || 'Failed to link exchange', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-overlay flex items-center justify-center z-50 p-4">
      <div className="modal-content max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold">{title}</h3>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="form-label">Exchange</label>
            <select className="input" value={exchange} onChange={(e) => setExchange(e.target.value)}>
              <option value="coinbase">Coinbase</option>
              <option value="kraken">Kraken</option>
              <option value="binance">Binance</option>
              <option value="binanceus">Binance US</option>
            </select>
          </div>
          <div>
            <label className="form-label">Label</label>
            <input
              type="text"
              className="input"
              placeholder="My Pro Trading Account"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="form-label">API Key</label>
            <input
              type="password"
              className="input font-mono text-sm"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="form-label">API Secret</label>
            <input
              type="password"
              className="input font-mono text-sm"
              value={apiSecret}
              onChange={(e) => setApiSecret(e.target.value)}
              required
            />
          </div>
          <p className="text-xs text-text-secondary">
            Ensure your API key has <strong>Read-Only</strong> permissions. We do not support trading or withdrawals.
          </p>
          <div className="flex gap-3 justify-end mt-8">
            <button type="button" className="btn btn-outline" onClick={onClose} disabled={loading}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Verifying...' : 'Link Exchange'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const EditAccountModal = ({
  account,
  onClose,
  onSuccess
}: {
  account: { id: string; accountName?: string | null; customLabel?: string | null; assignedMemberUid?: string | null };
  onClose: () => void;
  onSuccess: (id: string, payload: { accountName?: string; customLabel?: string | null; assignedMemberUid?: string | null }) => void;
}) => {
  const [label, setLabel] = useState(account.customLabel || '');
  const [name, setName] = useState(account.accountName || '');
  const [assignedUid, setAssignedUid] = useState(account.assignedMemberUid || '');
  const [household, setHousehold] = useState<Household | null>(null);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    householdService.getMyHousehold()
      .then(setHousehold)
      .catch(() => {
        // Ignore error if not in household
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSuccess(account.id, {
      accountName: name,
      customLabel: label || null,
      assignedMemberUid: assignedUid || null
    });
  };

  return (
    <div className="fixed inset-0 bg-overlay flex items-center justify-center z-50 p-4">
      <div className="modal-content max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold">Edit Account</h3>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="form-label">Account Name</label>
            <input
              type="text"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Official bank name"
            />
             <p className="text-xs text-text-secondary mt-1">Found inside your bank/app.</p>
          </div>
          <div>
            <label className="form-label">Custom Label</label>
            <input
              type="text"
              className="input"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Vacation Fund, Bobby's Allowance"
            />
            <p className="text-xs text-text-secondary mt-1">Your personal nickname for this account.</p>
          </div>
          <div>
            <label className="form-label">Assign to Household Member</label>
            {loading ? (
              <div className="animate-pulse h-10 w-full bg-surface-2 rounded"></div>
            ) : household ? (
              <select
                className="input"
                value={assignedUid}
                onChange={(e) => setAssignedUid(e.target.value)}
              >
                <option value="">(Unassigned / Me)</option>
                <option value={household.owner_uid}>Myself (Owner)</option>
                {household.members.map(m => (
                   <option key={m.uid} value={m.uid}>
                     {m.email || `Member (${m.uid.substring(0, 4)}...)`} ({m.role})
                   </option>
                ))}
              </select>
            ) : (
               <div className="text-sm text-text-secondary p-2 bg-surface-2 rounded border border-border">
                 You are not in a household.
               </div>
            )}
             <p className="text-xs text-text-secondary mt-1">Transactions will be tagged to this member in Family View.</p>
          </div>
          <div className="flex gap-3 justify-end mt-8">
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const ConnectAccounts = () => {
  const { accounts, loading, remove, sync, update, refetch } = useAccounts();
  const toast = useToast();
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showCexModal, setShowCexModal] = useState(false);
  const [reconnectPayload, setReconnectPayload] = useState<{ exchange: string; name: string } | null>(null);
  const [editingAccount, setEditingAccount] = useState<{ id: string; accountName?: string | null; customLabel?: string | null; assignedMemberUid?: string | null } | null>(null);

  const handlePlaidSuccess = () => {
    toast.show('Account connected successfully', 'success');
    refetch();
  };

  const handlePlaidError = (msg: string) => {
    toast.show(msg, 'error');
  };

  const handleUpdate = async (id: string, payload: { accountName?: string; customLabel?: string | null; assignedMemberUid?: string | null }) => {
      try {
          await update(id, payload);
          toast.show('Account updated', 'success');
          setEditingAccount(null);
      } catch (err: unknown) {
          toast.show((err as Error).message || 'Failed to update', 'error');
      }
  };

  return (
    <div>
      <section className="container py-12">
        <h1 className="mb-6">Connect & Manage Accounts</h1>
        <p className="text-text-secondary mb-12 max-w-[800px]">
          Link bank accounts, Web3 wallets, and CEX accounts. All connections are read-only; we cannot move your money.
        </p>
        {accounts.some((account) => account.syncStatus === 'needs_reauth') && (
          <div className="alert alert-warning mb-8">
            <strong>Action needed:</strong> One or more accounts need to be reconnected. For security, please reconnect to restore syncing.
          </div>
        )}

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
            </div>
            <div className="card-footer">
              <PlaidLinkButton onSuccess={handlePlaidSuccess} onError={handlePlaidError} />
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
            </div>
            <div className="card-footer">
              <button
                className="btn btn-primary w-full md:w-auto"
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
                <li>API keys stored in Secret Manager (never in DB)</li>
              </ul>
            </div>
            <div className="card-footer">
              <button
                className="btn btn-primary w-full md:w-auto"
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
        {reconnectPayload && (
          <AddCexModal
            title="Reconnect Exchange"
            initialExchange={reconnectPayload.exchange}
            initialName={reconnectPayload.name}
            onClose={() => setReconnectPayload(null)}
            onSuccess={() => { setReconnectPayload(null); refetch(); }}
          />
        )}
        {editingAccount && (
            <EditAccountModal
                account={editingAccount}
                onClose={() => setEditingAccount(null)}
                onSuccess={handleUpdate}
            />
        )}

        <div className="glass-panel mb-12">
          <h2 className="mb-6">Linked Accounts</h2>
          <div className="overflow-x-auto">
            <table className="table w-full text-left">
              <thead>
                <tr className="border-b border-border">
                  <th className="pb-3 font-semibold">Account / Label</th>
                  <th className="pb-3 font-semibold">Type</th>
                  <th className="pb-3 font-semibold">Assigned To</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold">Last Sync</th>
                  <th className="pb-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-4 text-center text-text-muted">Loading accounts...</td>
                  </tr>
                ) : accounts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-4 text-center text-text-muted">No accounts connected yet.</td>
                  </tr>
                ) : (
                  accounts.map((account) => (
                    <tr key={account.id} className="border-b border-border/50 hover:bg-surface-2 transition-colors">
                      <td className="py-4">
                          <div className="font-medium">{account.customLabel || account.accountName || 'Unnamed Account'}</div>
                          {account.customLabel && <div className="text-xs text-text-secondary">{account.accountName}</div>}
                      </td>
                      <td className="py-4 capitalize">{account.accountType}</td>
                      <td className="py-4">
                          {account.assignedMemberUid ? (
                              <span className="badge badge-neutral text-xs">Assigned</span>
                          ) : (
                              <span className="text-text-muted text-sm">-</span>
                          )}
                      </td>
                      <td className="py-4">
                        {account.syncStatus === 'needs_reauth' ? (
                          <span className="badge badge-warning">Reconnect needed</span>
                        ) : (
                          <span className="badge badge-success">Connected</span>
                        )}
                      </td>
                      <td className="py-4 text-sm text-text-secondary">{account.updatedAt ? new Date(account.updatedAt).toLocaleTimeString() : 'Just now'}</td>
                      <td className="py-4">
                        <div className="flex gap-2">
                          {account.syncStatus === 'needs_reauth' && account.accountType === 'cex' && (
                            <button
                              className="btn btn-sm btn-primary"
                              onClick={() => setReconnectPayload({
                                exchange: account.provider || 'coinbase',
                                name: account.accountName || 'My Exchange'
                              })}
                            >
                              Reconnect
                            </button>
                          )}
                          <button
                            className="btn btn-sm btn-ghost"
                            onClick={() => setEditingAccount(account)}
                          >
                            Edit
                          </button>
                          <button
                            className="btn btn-sm btn-outline"
                            onClick={() => sync(account.id)}
                            disabled={account.syncStatus === 'needs_reauth'}
                          >
                            Refresh
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger"
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
          <strong>Read-Only Access:</strong> All connections are read-only to maintain non-custodial, non-MSB status. We cannot initiate transactions, transfer funds, or modify account settings. API keys and OAuth tokens are stored in an encrypted secret store.
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
