// Core Purpose: UI for connecting various account types (Plaid, Web3, CEX) with household assignment logic.
// Last Updated 2026-01-24 00:20 CST
import React, { useState, useEffect, useMemo } from 'react';
import { useAccounts } from '../hooks/useAccounts';
import { PlaidLinkButton } from '../components/PlaidLinkButton';
import { useToast } from '../components/ui/Toast';
import { api as apiClient } from '../services/api';
import { householdService } from '../services/householdService';
import { Household, HouseholdMember } from '../types/household';

interface ApiError {
  response?: {
    data?: {
      detail?: string;
    };
  };
}

const formatHouseholdMemberLabel = (member: HouseholdMember) => {
  const fullName = [member.first_name, member.last_name].filter(Boolean).join(' ').trim();
  return fullName || member.email || 'Member';
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

const getAssignableMembers = (household: Household) => {
  const seen = new Set<string>();
  return household.members.filter((member) => {
    if (member.role !== 'admin' && member.role !== 'member') {
      return false;
    }
    if (seen.has(member.uid)) {
      return false;
    }
    seen.add(member.uid);
    return true;
  });
};

const CHAIN_PRESETS = [
  { id: 'eip155:1', name: 'Ethereum', supported: true },
  { id: 'bip122:000000000019d6689c085ae165831e93', name: 'Bitcoin', supported: true },
  { id: 'solana:5eykt6UsFvXYuy2aiUB66XX7hsgnSSXq', name: 'Solana', supported: true },
  { id: 'eip155:56', name: 'Binance Smart Chain', supported: true },
  { id: 'eip155:137', name: 'Polygon', supported: true },
  { id: 'ripple:mainnet', name: 'XRP (Ripple)', supported: true },
  { id: 'cardano:mainnet', name: 'Cardano', supported: true },
  { id: 'tron:mainnet', name: 'Tron', supported: true },
  { id: 'custom', name: 'Custom (CAIP-2)', supported: false },
];

const AddWalletModal = ({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) => {
  const [address, setAddress] = useState('');
  const [name, setName] = useState('');
  const [chain, setChain] = useState('eip155:1');
  const [customChain, setCustomChain] = useState('');
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const finalChain = chain === 'custom' ? customChain : chain;
      await apiClient.post('/accounts/link/web3', {
        address,
        chain: finalChain,
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

  const selectedPreset = CHAIN_PRESETS.find(p => p.id === chain);

  return (
    <div className="fixed inset-0 bg-overlay flex items-center justify-center z-50 p-4">
      <div className="modal-content max-w-md">
        <div className="modal-header">
          <h3>Connect Web3 Wallet</h3>
          <button onClick={onClose} className="modal-close">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="form-label text-sm">Wallet Label</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. My Ledger, MetaMask 1"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="form-label text-sm">Blockchain Network</label>
            <select 
              className="input" 
              value={chain} 
              onChange={(e) => setChain(e.target.value)}
            >
              {CHAIN_PRESETS.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {chain === 'custom' && (
            <div>
              <label className="form-label text-sm">Custom CAIP-2 ID</label>
              <input
                type="text"
                className="input font-mono text-sm"
                placeholder="namespace:reference (e.g. cosmos:cosmoshub-4)"
                value={customChain}
                onChange={(e) => setCustomChain(e.target.value)}
                required
              />
            </div>
          )}

          {selectedPreset && !selectedPreset.supported && chain !== 'custom' && (
            <div className="alert alert-info py-2 text-xs">
              <strong>Note:</strong> Transaction sync for this network is coming soon. You can still link it for manual tracking.
            </div>
          )}

          <div>
            <label className="form-label text-sm">Wallet Address</label>
            <input
              type="text"
              className="input font-mono text-sm"
              placeholder="Address on selected chain"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
            />
            <p className="text-xs text-text-secondary mt-2">
              Ensure you use the correct address format for the selected network.
            </p>
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
      await apiClient.post('/accounts/link/cex', {
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
        <div className="modal-header">
          <h3>{title}</h3>
          <button onClick={onClose} className="modal-close">✕</button>
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
      assignedMemberUid: assignedUid || null
    });
  };

  return (
    <div className="fixed inset-0 bg-overlay flex items-center justify-center z-50 p-4">
      <div className="modal-content max-w-md">
        <div className="modal-header">
          <h3>Edit Account</h3>
          <button onClick={onClose} className="modal-close">✕</button>
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
                <option value="">(Unassigned)</option>
                {getAssignableMembers(household).map((member) => (
                  <option key={member.uid} value={member.uid}>
                    {formatHouseholdMemberLabel(member)} ({member.role})
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

const AddManualAccountModal = ({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) => {
  const [name, setName] = useState('');
  const [assignedUid, setAssignedUid] = useState('');
  const [household, setHousehold] = useState<Household | null>(null);
  const [householdLoading, setHouseholdLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const { create } = useAccounts();

  useEffect(() => {
    householdService.getMyHousehold()
      .then(setHousehold)
      .catch(() => {
        // Ignore error if not in household
      })
      .finally(() => setHouseholdLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.show('Please enter an account name', 'error');
      return;
    }
    setLoading(true);
    try {
      await create({
        accountType: 'manual',
        accountName: name.trim(),
        assignedMemberUid: assignedUid || null,
      });
      toast.show('Manual account created successfully', 'success');
      onSuccess();
    } catch (err) {
      toast.show((err as ApiError).response?.data?.detail || 'Failed to create account', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-overlay flex items-center justify-center z-50 p-4">
      <div className="modal-content max-w-md">
        <div className="modal-header">
          <h3>Create Manual Account</h3>
          <button onClick={onClose} className="modal-close">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="form-label text-sm">Account Name</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. Cash, Savings, Petty Cash"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
            <p className="text-xs text-text-secondary mt-1">
              Use this account to track manual transactions and cash expenses.
            </p>
          </div>
          <div>
            <label className="form-label">Assign to Household Member</label>
            {householdLoading ? (
              <div className="animate-pulse h-10 w-full bg-surface-2 rounded"></div>
            ) : household ? (
              <select
                className="input"
                value={assignedUid}
                onChange={(e) => setAssignedUid(e.target.value)}
              >
                <option value="">(Unassigned)</option>
                {getAssignableMembers(household).map((member) => (
                  <option key={member.uid} value={member.uid}>
                    {formatHouseholdMemberLabel(member)} ({member.role})
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
            <button type="button" className="btn btn-outline" onClick={onClose} disabled={loading}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create Account'}
            </button>
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
  const [showManualAccountModal, setShowManualAccountModal] = useState(false);
  const [reconnectPayload, setReconnectPayload] = useState<{ exchange: string; name: string } | null>(null);
  const [editingAccount, setEditingAccount] = useState<{ id: string; accountName?: string | null; customLabel?: string | null; assignedMemberUid?: string | null } | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [accountsExpanded, setAccountsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('all-accounts');
  const [syncingAccounts, setSyncingAccounts] = useState<Set<string>>(new Set());

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target?.closest('[data-actions-menu]')) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

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

  const totalBalance = useMemo(() => accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0), [accounts]);

  const filteredAccounts = useMemo(() => accounts.filter(acc => {
    if (activeTab === 'all-accounts') return true;
    if (activeTab === 'checking') return acc.accountType === 'traditional';
    if (activeTab === 'investment') return acc.accountType === 'investment';
    if (activeTab === 'web3') return acc.accountType === 'web3';
    if (activeTab === 'cex') return acc.accountType === 'cex';
    return false;
  }), [accounts, activeTab]);

  const syncableAccounts = useMemo(
    () => filteredAccounts.filter((account) => account.accountType !== 'manual'),
    [filteredAccounts],
  );

  const handleSync = async (accountId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // prevent card click
    if (syncingAccounts.has(accountId)) return;

    setSyncingAccounts(prev => new Set(prev).add(accountId));
    toast.show('Syncing account in background...', 'success');
    try {
      await sync(accountId);
      await refetch();
      toast.show('Account synced successfully', 'success');
    } catch (err: any) {
      console.error("Sync failed", err);
      const msg = err.response?.data?.detail || err.message || 'Failed to sync account';
      toast.show(msg, 'error');
    } finally {
      setSyncingAccounts(prev => {
        const next = new Set(prev);
        next.delete(accountId);
        return next;
      });
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
                className="btn btn-primary w-full md:w-[180px]"
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
                className="btn btn-primary w-full md:w-[180px]"
                type="button"
                onClick={() => setShowCexModal(true)}
              >
                Connect Exchange
              </button>
            </div>
          </div>
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-bold">Manual Accounts</h3>
            </div>
            <div className="card-body">
              <p className="mb-4">Create manual accounts to track cash transactions and custom entries.</p>
              <ul className="list-disc pl-6 mb-4 space-y-1">
                <li>Required for manual transaction entries</li>
                <li>Pro and Ultimate tier feature</li>
              </ul>
            </div>
            <div className="card-footer">
              <button
                className="btn btn-primary w-full md:w-[180px]"
                type="button"
                onClick={() => setShowManualAccountModal(true)}
              >
                Create Manual Account
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
        {showManualAccountModal && (
          <AddManualAccountModal
            onClose={() => setShowManualAccountModal(false)}
            onSuccess={() => { setShowManualAccountModal(false); refetch(); }}
          />
        )}

        {/* Account Overview */}
        <div className="glass-panel mb-10 transition-all duration-300">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Account Overview</h2>
            <button
              onClick={() => setAccountsExpanded(!accountsExpanded)}
              className="text-sm font-medium text-royal-purple hover:underline"
            >
              {accountsExpanded ? 'Collapse' : 'Manage / Details'}
            </button>
          </div>

          {!accountsExpanded ? (
            <div className="flex flex-col md:flex-row justify-between items-center p-6 bg-transparent border border-white/10 rounded-xl cursor-pointer hover:bg-white/5 transition-colors" onClick={() => setAccountsExpanded(true)}>
              {accounts.length === 0 ? (
                <div className="flex flex-col items-center justify-center w-full text-center">
                  <p className="text-text-muted font-medium">Link your first financial account to see your net worth and cash flow.</p>
                  <p className="text-xs text-text-secondary mt-1">Connect with Plaid above to securely sync your data.</p>
                </div>
              ) : (
                <>
                  <div className="flex gap-8">
                    <div>
                      <span className="block text-xs text-text-muted uppercase tracking-wider">Connected</span>
                      <span className="text-lg font-bold text-text-primary">{accounts.length} Accounts</span>
                    </div>
                    <div>
                      <span className="block text-xs text-text-muted uppercase tracking-wider">Types</span>
                      <span className="text-lg font-bold text-text-primary">
                        {[...new Set(accounts.map(a => a.accountType))].join(', ')}
                      </span>
                    </div>
                  </div>
                  <div className="text-right mt-4 md:mt-0 flex flex-col items-end gap-2">
                    <div>
                      <span className="block text-xs text-text-muted uppercase tracking-wider">Total Combined Balance</span>
                      <span className="text-2xl font-bold text-royal-purple">{formatCurrency(totalBalance)}</span>
                    </div>
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        // Trigger sync for all accounts sequentially to prevent rate limits
                        for (const acc of syncableAccounts) {
                          if (!syncingAccounts.has(acc.id)) {
                            // We await each sync to ensure sequential execution
                            await handleSync(acc.id, e);
                          }
                        }
                      }}
                      className="text-xs bg-primary/10 text-primary px-2 py-1 rounded hover:bg-primary/20 flex items-center gap-1 transition-colors"
                    >
                      <span className={syncingAccounts.size > 0 ? "animate-spin" : ""}>↻</span> Sync All
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <>
              <div className="tabs mb-6">
                <ul className="tab-list flex gap-4 border-b border-white/10" role="tablist">
                  <li><button className={`px-4 py-2 border-b-2 transition-colors ${activeTab === 'all-accounts' ? 'border-primary text-primary font-medium' : 'border-transparent text-text-muted hover:text-text-secondary'}`} onClick={() => setActiveTab('all-accounts')}>All Accounts</button></li>
                  <li><button className={`px-4 py-2 border-b-2 transition-colors ${activeTab === 'checking' ? 'border-primary text-primary font-medium' : 'border-transparent text-text-muted hover:text-text-secondary'}`} onClick={() => setActiveTab('checking')}>Checking</button></li>
                  <li><button className={`px-4 py-2 border-b-2 transition-colors ${activeTab === 'investment' ? 'border-primary text-primary font-medium' : 'border-transparent text-text-muted hover:text-text-secondary'}`} onClick={() => setActiveTab('investment')}>Investment</button></li>
                  <li><button className={`px-4 py-2 border-b-2 transition-colors ${activeTab === 'web3' ? 'border-primary text-primary font-medium' : 'border-transparent text-text-muted hover:text-text-secondary'}`} onClick={() => setActiveTab('web3')}>Web3 Wallets</button></li>
                  <li><button className={`px-4 py-2 border-b-2 transition-colors ${activeTab === 'cex' ? 'border-primary text-primary font-medium' : 'border-transparent text-text-muted hover:text-text-secondary'}`} onClick={() => setActiveTab('cex')}>CEX Accounts</button></li>
                </ul>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredAccounts.length === 0 ? (
                  <div className="col-span-full text-center py-10 text-text-muted italic">
                    No accounts found. {accounts.length === 0 && "Use the button above to link an account."}
                  </div>
                ) : (
                  filteredAccounts.map((account) => (
                    <div key={account.id} className="card hover:shadow-lg transition-all border-white/5 bg-white/5 relative group">
                      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      {account.accountType !== 'manual' && (
                        <button
                          onClick={(e) => handleSync(account.id, e)}
                          disabled={syncingAccounts.has(account.id)}
                          className="text-xs bg-primary/20 text-primary px-2 py-1 rounded hover:bg-primary/30 disabled:opacity-50 flex items-center gap-1"
                          title="Sync latest transactions"
                        >
                          {syncingAccounts.has(account.id) ? (
                            <>
                              <span className="animate-spin text-primary">↻</span> Syncing...
                            </>
                          ) : (
                            <>
                              <span>↻</span> Sync
                            </>
                          )}
                        </button>
                      )}
                      </div>
                      <h3 className="font-semibold text-lg">{account.accountName}</h3>
                      <p className="text-2xl font-bold text-primary my-2">
                         {new Intl.NumberFormat('en-US', { style: 'currency', currency: account.currency || 'USD' }).format(account.balance || 0)}
                      </p>
                      <div className="flex justify-between items-center mt-auto pt-2">
                        <span className="text-xs font-mono text-text-muted uppercase tracking-tighter">
                          {account.accountNumberMasked ? `Ending in ${account.accountNumberMasked}` : account.accountType}
                        </span>
                        {account.provider && (
                          <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-text-secondary">
                            {account.provider}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>

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
                          <div className="relative" data-actions-menu>
                            <button
                              className="btn btn-sm btn-ghost"
                              onClick={() => setOpenMenuId((prev) => (prev === account.id ? null : account.id))}
                              aria-haspopup="menu"
                              aria-expanded={openMenuId === account.id}
                              aria-label="Open actions menu"
                            >
                              ▼
                            </button>
                            {openMenuId === account.id && (
                              <div className="absolute right-0 z-10 mt-2 w-44 rounded border border-border bg-surface-1 p-2 shadow-lg space-y-2">
                                <button
                                  className="btn btn-sm btn-ghost w-full justify-start"
                                  onClick={() => {
                                    setEditingAccount(account);
                                    setOpenMenuId(null);
                                  }}
                                >
                                  Edit
                                </button>
                                {account.accountType !== 'manual' && (
                                  <button
                                    className="btn btn-sm btn-ghost w-full justify-start"
                                    onClick={async () => {
                                      try {
                                        await sync(account.id);
                                        toast.show('Account synced successfully', 'success');
                                      } catch (err) {
                                        const msg = err instanceof Error ? err.message : 'Sync failed';
                                        toast.show(msg, 'error');
                                      } finally {
                                        setOpenMenuId(null);
                                      }
                                    }}
                                    disabled={account.syncStatus === 'needs_reauth'}
                                  >
                                    Refresh
                                  </button>
                                )}
                                <button
                                  className="btn btn-sm btn-ghost w-full justify-start text-danger"
                                  onClick={() => {
                                    remove(account.id);
                                    setOpenMenuId(null);
                                  }}
                                >
                                  Remove
                                </button>
                              </div>
                            )}
                          </div>
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

      </section>
    </div>
  );
};
