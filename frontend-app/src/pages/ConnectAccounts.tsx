// Core Purpose: UI for connecting various account types (Plaid, Web3, CEX) with household assignment logic.
// Last Updated 2026-01-26 14:10 CST
import React, { useState, useEffect, useMemo } from 'react';
import { MoreVertical } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useAccounts } from '../hooks/useAccounts';
import { useManualAssets } from '../hooks/useManualAssets';
import { PlaidLinkButton } from '../components/PlaidLinkButton';
import { useToast } from '../components/ui/Toast';
import { Modal } from '../components/ui/Modal';
import { api as apiClient } from '../services/api';
import { householdService } from '../services/householdService';
import { Household, HouseholdMember } from '../types/household';
import { Account, ManualAsset } from '../types';
import { getAccountCategoryDisplay, getAccountPrimaryCategory, getCategoryLabel, type PrimaryAccountCategory } from '../utils/accountCategories';

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

const getManualAssetLabel = (value: string) => {
  const match = MANUAL_ASSET_TYPES.find((option) => option.value === value);
  return match ? match.label : value;
};

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

type PlanTier = 'free' | 'essential' | 'pro' | 'ultimate';

const PLAN_LABELS: Record<PlanTier, string> = {
  free: 'Free',
  essential: 'Essential',
  pro: 'Pro',
  ultimate: 'Ultimate',
};

const ACCOUNT_LIMITS: Record<'bank' | 'web3' | 'cex' | 'manual', Record<PlanTier, number | 'Unlimited'>> = {
  bank: { free: 1, essential: 5, pro: 5, ultimate: 10 },
  web3: { free: 1, essential: 5, pro: 5, ultimate: 10 },
  cex: { free: 1, essential: 3, pro: 5, ultimate: 10 },
  manual: { free: 0, essential: 0, pro: 5, ultimate: 10 },
};

const MANUAL_ACCOUNT_CATEGORY_OPTIONS = [
  { value: 'cash', label: 'Cash' },
  { value: 'investment', label: 'Investments' },
  { value: 'real_estate', label: 'Real Estate' },
  { value: 'credit', label: 'Credit' },
  { value: 'loan', label: 'Loan' },
  { value: 'mortgage', label: 'Mortgage' },
  { value: 'crypto', label: 'Crypto' },
  { value: 'other', label: 'Other' },
];

const MANUAL_ASSET_TYPES = [
  { value: 'real_estate', label: 'Real Estate' },
  { value: 'house', label: 'House' },
  { value: 'car', label: 'Car' },
  { value: 'collectible', label: 'Collectible' },
];

const BALANCE_TYPE_OPTIONS = [
  { value: 'asset', label: 'Asset' },
  { value: 'liability', label: 'Liability' },
];

const normalizePlan = (value?: string | null): PlanTier | null => {
  if (!value) return null;
  const normalized = value.toLowerCase().trim().split('_')[0] as PlanTier;
  if (normalized === 'free' || normalized === 'essential' || normalized === 'pro' || normalized === 'ultimate') {
    return normalized;
  }
  return null;
};

const formatLimit = (limit: number | 'Unlimited') => (limit === 'Unlimited' ? 'Unlimited' : String(limit));

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
  account: Account;
  onClose: () => void;
  onSuccess: (id: string, payload: { accountName?: string; customLabel?: string | null; assignedMemberUid?: string | null; categoryOverride?: string | null; balanceType?: 'asset' | 'liability' | null }) => void;
}) => {
  const [name, setName] = useState(account.accountName || '');
  const [assignedUid, setAssignedUid] = useState(account.assignedMemberUid || '');
  const [categoryOverride, setCategoryOverride] = useState(account.categoryOverride || '');
  const [balanceType, setBalanceType] = useState<'asset' | 'liability'>(account.balanceType || 'asset');
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
    const payload: {
      accountName?: string;
      assignedMemberUid?: string | null;
      categoryOverride?: string | null;
      balanceType?: 'asset' | 'liability';
    } = {
      accountName: name,
      assignedMemberUid: assignedUid || null,
      categoryOverride: categoryOverride || null,
    };
    if (account.accountType === 'manual') {
      payload.balanceType = balanceType;
    }
    onSuccess(account.id, payload);
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
          <div>
            <label className="form-label">Account Classification</label>
            <select
              className="input"
              value={categoryOverride}
              onChange={(e) => setCategoryOverride(e.target.value)}
            >
              <option value="">Auto (recommended)</option>
              {MANUAL_ACCOUNT_CATEGORY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <p className="text-xs text-text-secondary mt-1">
              Overrides how this account is grouped in assets and liabilities.
            </p>
          </div>
          {account.accountType === 'manual' && (
            <div>
              <label className="form-label">Balance Type</label>
              <div className="flex gap-2">
                {BALANCE_TYPE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`px-3 py-2 rounded-lg border text-sm transition-colors ${
                      balanceType === option.value
                        ? 'border-primary text-primary bg-primary/10'
                        : 'border-border text-text-secondary hover:text-text-primary'
                    }`}
                    onClick={() => setBalanceType(option.value as 'asset' | 'liability')}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-text-secondary mt-1">
                Manual accounts can be counted as assets or liabilities.
              </p>
            </div>
          )}
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
  const [categoryOverride, setCategoryOverride] = useState('cash');
  const [balanceType, setBalanceType] = useState<'asset' | 'liability'>('asset');
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
        categoryOverride,
        balanceType,
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
              Use this account to track manual transactions and balances.
            </p>
          </div>
          <div>
            <label className="form-label text-sm">Category</label>
            <select
              className="input"
              value={categoryOverride}
              onChange={(e) => setCategoryOverride(e.target.value)}
            >
              {MANUAL_ACCOUNT_CATEGORY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <p className="text-xs text-text-secondary mt-1">
              Helps place this account in assets vs liabilities and dashboards.
            </p>
          </div>
          <div>
            <label className="form-label text-sm">Balance Type</label>
            <div className="flex gap-2">
              {BALANCE_TYPE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`px-3 py-2 rounded-lg border text-sm transition-colors ${
                    balanceType === option.value
                      ? 'border-primary text-primary bg-primary/10'
                      : 'border-border text-text-secondary hover:text-text-primary'
                  }`}
                  onClick={() => setBalanceType(option.value as 'asset' | 'liability')}
                >
                  {option.label}
                </button>
              ))}
            </div>
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
          <div>
            <label className="form-label">Account Classification</label>
            <select
              className="input"
              value={categoryOverride}
              onChange={(e) => setCategoryOverride(e.target.value)}
            >
              <option value="">Auto (recommended)</option>
              {MANUAL_ACCOUNT_CATEGORY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <p className="text-xs text-text-secondary mt-1">
              Overrides how this account is grouped in assets and liabilities.
            </p>
          </div>
          {account.accountType === 'manual' && (
            <div>
              <label className="form-label">Balance Type</label>
              <div className="flex gap-2">
                {BALANCE_TYPE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`px-3 py-2 rounded-lg border text-sm transition-colors ${
                      balanceType === option.value
                        ? 'border-primary text-primary bg-primary/10'
                        : 'border-border text-text-secondary hover:text-text-primary'
                    }`}
                    onClick={() => setBalanceType(option.value as 'asset' | 'liability')}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-text-secondary mt-1">
                Manual accounts can be counted as assets or liabilities.
              </p>
            </div>
          )}
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

type ManualAssetFormValues = {
  assetType: string;
  balanceType: 'asset' | 'liability';
  name: string;
  value: string;
  purchaseDate: string;
  notes: string;
};

const ManualAssetModal = ({
  asset,
  onClose,
  onSave,
}: {
  asset?: ManualAsset | null;
  onClose: () => void;
  onSave: (payload: { assetType: string; balanceType: 'asset' | 'liability'; name: string; value: number; purchaseDate?: string | null; notes?: string | null }) => Promise<void>;
}) => {
  const [form, setForm] = useState<ManualAssetFormValues>({
    assetType: asset?.assetType || 'real_estate',
    balanceType: asset?.balanceType || 'asset',
    name: asset?.name || '',
    value: asset?.value?.toString() || '',
    purchaseDate: asset?.purchaseDate ? asset.purchaseDate.split('T')[0] : '',
    notes: asset?.notes || '',
  });
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    setForm({
      assetType: asset?.assetType || 'real_estate',
      balanceType: asset?.balanceType || 'asset',
      name: asset?.name || '',
      value: asset?.value?.toString() || '',
      purchaseDate: asset?.purchaseDate ? asset.purchaseDate.split('T')[0] : '',
      notes: asset?.notes || '',
    });
  }, [asset]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.show('Please enter a name', 'error');
      return;
    }
    const value = Number(form.value);
    if (!value || value <= 0) {
      toast.show('Please enter a value greater than 0', 'error');
      return;
    }
    setSaving(true);
    try {
      await onSave({
        assetType: form.assetType,
        balanceType: form.balanceType,
        name: form.name.trim(),
        value,
        purchaseDate: form.purchaseDate || null,
        notes: form.notes.trim() || null,
      });
      onClose();
    } catch (err: unknown) {
      toast.show((err as Error).message || 'Unable to save manual asset.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-overlay flex items-center justify-center z-50 p-4">
      <div className="modal-content max-w-lg">
        <div className="modal-header">
          <h3>{asset ? 'Edit Manual Asset' : 'Add Manual Asset'}</h3>
          <button onClick={onClose} className="modal-close">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="form-label text-sm">Name</label>
            <input
              type="text"
              name="name"
              className="input"
              value={form.name}
              onChange={handleChange}
              placeholder="e.g. Rental Property, Classic Car"
              required
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label text-sm">Category</label>
              <select name="assetType" className="input" value={form.assetType} onChange={handleChange}>
                {MANUAL_ASSET_TYPES.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label text-sm">Asset or Liability</label>
              <select name="balanceType" className="input" value={form.balanceType} onChange={handleChange}>
                {BALANCE_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label text-sm">Value</label>
              <input
                type="number"
                name="value"
                className="input"
                placeholder="0.00"
                value={form.value}
                onChange={handleChange}
                min="0"
                step="0.01"
                required
              />
            </div>
            <div>
              <label className="form-label text-sm">Purchase Date (optional)</label>
              <input
                type="date"
                name="purchaseDate"
                className="input"
                value={form.purchaseDate}
                onChange={handleChange}
              />
            </div>
          </div>
          <div>
            <label className="form-label text-sm">Notes (optional)</label>
            <textarea
              name="notes"
              className="input min-h-[90px]"
              value={form.notes}
              onChange={handleChange}
              placeholder="Add any context about this asset or liability."
            />
          </div>
          <div className="flex gap-3 justify-end mt-6">
            <button type="button" className="btn btn-outline" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const ConnectAccounts = () => {
  const { accounts, loading, remove, sync, refreshMetadata, update, refetch } = useAccounts();
  const {
    assets: manualAssets,
    loading: manualAssetsLoading,
    create: createManualAsset,
    update: updateManualAsset,
    remove: removeManualAsset,
  } = useManualAssets();
  const { profile } = useAuth();
  const toast = useToast();
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showCexModal, setShowCexModal] = useState(false);
  const [showManualAccountModal, setShowManualAccountModal] = useState(false);
  const [showManualAssetModal, setShowManualAssetModal] = useState(false);
  const [editingManualAsset, setEditingManualAsset] = useState<ManualAsset | null>(null);
  const [reconnectPayload, setReconnectPayload] = useState<{ exchange: string; name: string } | null>(null);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [accountsExpanded, setAccountsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'cash' | 'credit' | 'loans' | 'investment' | 'real_estate' | 'crypto' | 'manual'>('all');
  const [syncingAccounts, setSyncingAccounts] = useState<Set<string>>(new Set());
  const [confirmAction, setConfirmAction] = useState<{
    type: 'refresh' | 'remove';
    account: typeof accounts[number];
  } | null>(null);

  const planFromProfile = normalizePlan(profile?.plan);
  const activeSubscription = profile?.subscriptions?.find((sub: any) => sub.status === 'active');
  const planFromSubscriptions = normalizePlan(activeSubscription?.plan);
  const plan: PlanTier = planFromProfile || planFromSubscriptions || 'free';
  const planLabel = PLAN_LABELS[plan];
  const hasManualAccess = plan === 'pro' || plan === 'ultimate';

  const [household, setHousehold] = useState<Household | null>(null);
  const [householdLoading, setHouseholdLoading] = useState(true);

  useEffect(() => {
    householdService
      .getMyHousehold()
      .then(setHousehold)
      .catch(() => {
        // Ignore if not in household
      })
      .finally(() => setHouseholdLoading(false));
  }, []);

  const assignedMemberLookup = useMemo(() => {
    const map = new Map<string, HouseholdMember>();
    household?.members.forEach((member) => {
      map.set(member.uid, member);
    });
    return map;
  }, [household]);

  const resolveAssignedLabel = (uid?: string | null) => {
    if (!uid) return 'Unassigned';
    const member = assignedMemberLookup.get(uid);
    if (!member) return 'Assigned';
    const fullName = [member.first_name, member.last_name].filter(Boolean).join(' ').trim();
    return member.username || fullName || member.email || 'Member';
  };

  const connectedCounts = useMemo(() => {
    const bank = accounts.filter(
      (account) =>
        account.provider === 'plaid' ||
        account.accountType === 'traditional' ||
        account.accountType === 'investment',
    ).length;
    const web3 = accounts.filter((account) => account.accountType === 'web3').length;
    const cex = accounts.filter((account) => account.accountType === 'cex').length;
    const manual = accounts.filter((account) => account.accountType === 'manual').length;
    return { bank, web3, cex, manual };
  }, [accounts]);

  const bankLimitLabel = formatLimit(ACCOUNT_LIMITS.bank[plan]);
  const web3LimitLabel = formatLimit(ACCOUNT_LIMITS.web3[plan]);
  const cexLimitLabel = formatLimit(ACCOUNT_LIMITS.cex[plan]);
  const manualLimitLabel = formatLimit(ACCOUNT_LIMITS.manual[plan]);

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

  const handleUpdate = async (
    id: string,
    payload: {
      accountName?: string;
      customLabel?: string | null;
      assignedMemberUid?: string | null;
      categoryOverride?: string | null;
      balanceType?: 'asset' | 'liability' | null;
    },
  ) => {
      try {
          await update(id, payload);
          toast.show('Account updated', 'success');
          setEditingAccount(null);
      } catch (err: unknown) {
          toast.show((err as Error).message || 'Failed to update', 'error');
      }
  };

  const totalBalance = useMemo(() => accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0), [accounts]);
  const categoryCounts = useMemo(() => {
    const counts = new Map<PrimaryAccountCategory, number>();
    accounts.forEach((account) => {
      const category = getAccountPrimaryCategory(account).key;
      counts.set(category, (counts.get(category) || 0) + 1);
    });
    return counts;
  }, [accounts]);

  const categorySummary = useMemo(() => {
    if (categoryCounts.size === 0) return 'No categories yet';
    return Array.from(categoryCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([category, count]) => `${getCategoryLabel(category)} (${count})`)
      .join(', ');
  }, [categoryCounts]);

  const filteredAccounts = useMemo(() => {
    if (activeTab === 'all') return accounts;
    if (activeTab === 'manual') return accounts.filter((acc) => acc.accountType === 'manual');

    return accounts.filter((acc) => {
      const primary = getAccountPrimaryCategory(acc).key;
      if (activeTab === 'loans') return primary === 'loan' || primary === 'mortgage';
      if (activeTab === 'investment') return primary === 'investment';
      return primary === activeTab;
    });
  }, [accounts, activeTab]);

  const syncableAccounts = useMemo(
    () => filteredAccounts.filter((account) => account.accountType !== 'manual'),
    [filteredAccounts],
  );

  const performSync = async (account: typeof accounts[number]) => {
    try {
      await sync(account.id);
      await refetch();
      toast.show('Account synced successfully', 'success');
      return true;
    } catch (err: any) {
      if (account.accountType === 'traditional') {
        try {
          await refreshMetadata(account.id);
          await refetch();
          toast.show('Transactions sync failed, but account details were refreshed.', 'warning');
          return false;
        } catch (refreshErr: any) {
          const msg = refreshErr?.response?.data?.detail || refreshErr?.message || 'Failed to refresh account details';
          toast.show(msg, 'error');
          return false;
        }
      }
      const msg = err?.response?.data?.detail || err?.message || 'Failed to sync account';
      toast.show(msg, 'error');
      return false;
    }
  };

  const handleSync = async (account: typeof accounts[number], e: React.MouseEvent) => {
    e.stopPropagation(); // prevent card click
    if (syncingAccounts.has(account.id)) return;

    setSyncingAccounts(prev => new Set(prev).add(account.id));
    toast.show('Syncing account in background...', 'success');
    try {
      await performSync(account);
    } finally {
      setSyncingAccounts(prev => {
        const next = new Set(prev);
        next.delete(account.id);
        return next;
      });
    }
  };

  const confirmTitle = confirmAction?.type === 'remove' ? 'Remove account?' : 'Refresh account?';
  const confirmDescription =
    confirmAction?.type === 'remove'
      ? 'This disconnects the account and removes its data from your dashboard.'
      : 'This will pull the latest balances and transactions from this account.';

  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    const { type, account } = confirmAction;
    try {
      if (type === 'refresh') {
        await performSync(account);
      } else {
        await remove(account.id);
        toast.show('Account removed', 'success');
      }
      await refetch();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Action failed';
      toast.show(msg, 'error');
    } finally {
      setConfirmAction(null);
    }
  };

  const handleSaveManualAsset = async (payload: { assetType: string; balanceType: 'asset' | 'liability'; name: string; value: number; purchaseDate?: string | null; notes?: string | null }) => {
    if (editingManualAsset) {
      await updateManualAsset(editingManualAsset.id, payload);
      toast.show('Manual asset updated', 'success');
      setEditingManualAsset(null);
    } else {
      await createManualAsset(payload);
      toast.show('Manual asset added', 'success');
    }
    setShowManualAssetModal(false);
  };

  return (
    <div>
      <section className="container py-12">
        <h1 className="mb-4">Connect Accounts</h1>
        <p className="text-text-secondary mb-8 max-w-[720px]">
          Manage bank, wallet, exchange, and manual accounts. Connections are read-only.
        </p>
        <div className="flex flex-wrap gap-3 mb-8">
          <span className="badge badge-neutral text-xs">Plan: {planLabel}</span>
          <span className="badge badge-neutral text-xs">Connected: {accounts.length}</span>
        </div>
        {accounts.some((account) => account.syncStatus === 'needs_reauth') && (
          <div className="alert alert-warning mb-8">
            <strong>Action needed:</strong> One or more accounts need to be reconnected. For security, please reconnect to restore syncing.
          </div>
        )}

        <div className="grid grid-3 mb-12">
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-bold">Bank &amp; Credit</h3>
            </div>
            <div className="card-body space-y-3">
              <p className="text-sm text-text-secondary">Secure read-only sync via Plaid Sandbox.</p>
              <div className="flex items-center justify-between text-xs text-text-muted">
                <span>Connected {connectedCounts.bank}</span>
                <span>Allowed {bankLimitLabel} ({planLabel})</span>
              </div>
              <p className="text-xs text-text-secondary">Sandbox: <strong>user_good / pass_good</strong></p>
            </div>
            <div className="card-footer">
              <PlaidLinkButton onSuccess={handlePlaidSuccess} onError={handlePlaidError} />
            </div>
          </div>
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-bold">Web3 Wallets</h3>
            </div>
            <div className="card-body space-y-3">
              <p className="text-sm text-text-secondary">Track balances and on-chain activity.</p>
              <div className="flex items-center justify-between text-xs text-text-muted">
                <span>Connected {connectedCounts.web3}</span>
                <span>Allowed {web3LimitLabel} ({planLabel})</span>
              </div>
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
            <div className="card-body space-y-3">
              <p className="text-sm text-text-secondary">Read-only exchange balances and positions.</p>
              <div className="flex items-center justify-between text-xs text-text-muted">
                <span>Connected {connectedCounts.cex}</span>
                <span>Allowed {cexLimitLabel} ({planLabel})</span>
              </div>
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
            <div className="card-body space-y-3">
              <p className="text-sm text-text-secondary">Track manual accounts for transactions and balances.</p>
              <div className="flex items-center justify-between text-xs text-text-muted">
                <span>Connected {connectedCounts.manual}</span>
                <span>Allowed {manualLimitLabel} ({planLabel})</span>
              </div>
              <span className="badge badge-neutral text-[10px] w-fit">Pro / Ultimate</span>
            </div>
            <div className="card-footer">
              <button
                className="btn btn-primary w-full md:w-[180px]"
                type="button"
                onClick={() => hasManualAccess && setShowManualAccountModal(true)}
                disabled={!hasManualAccess}
              >
                {hasManualAccess ? 'Create Manual Account' : 'Upgrade Required'}
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
        {(showManualAssetModal || editingManualAsset) && (
          <ManualAssetModal
            asset={editingManualAsset}
            onClose={() => {
              setShowManualAssetModal(false);
              setEditingManualAsset(null);
            }}
            onSave={handleSaveManualAsset}
          />
        )}
        <Modal
          open={Boolean(confirmAction)}
          onClose={() => setConfirmAction(null)}
          title={confirmTitle}
          footer={(
            <div className="flex justify-end gap-2">
              <button className="btn btn-ghost text-sm" onClick={() => setConfirmAction(null)}>
                Cancel
              </button>
              <button className="btn btn-primary text-sm" onClick={handleConfirmAction}>
                Confirm
              </button>
            </div>
          )}
        >
          <div className="py-2 space-y-2">
            <p className="text-sm text-text-secondary">{confirmDescription}</p>
            {confirmAction?.type === 'remove' && (
              <p className="text-xs text-text-muted">You can reconnect this account anytime from the top panel.</p>
            )}
          </div>
        </Modal>

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
                  <p className="text-xs text-text-secondary mt-1">Connect an account above to start syncing.</p>
                </div>
              ) : (
                <>
                  <div className="flex gap-8">
                    <div>
                      <span className="block text-xs text-text-muted uppercase tracking-wider">Connected</span>
                      <span className="text-lg font-bold text-text-primary">{accounts.length} Accounts</span>
                    </div>
                    <div>
                      <span className="block text-xs text-text-muted uppercase tracking-wider">Categories</span>
                      <span className="text-lg font-bold text-text-primary">
                        {categorySummary}
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
                            await handleSync(acc, e);
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
                <ul className="tab-list flex gap-4 border-b border-white/10 flex-wrap" role="tablist">
                  <li><button className={`px-4 py-2 border-b-2 transition-colors ${activeTab === 'all' ? 'border-primary text-primary font-medium' : 'border-transparent text-text-muted hover:text-text-secondary'}`} onClick={() => setActiveTab('all')}>All Accounts</button></li>
                  <li><button className={`px-4 py-2 border-b-2 transition-colors ${activeTab === 'cash' ? 'border-primary text-primary font-medium' : 'border-transparent text-text-muted hover:text-text-secondary'}`} onClick={() => setActiveTab('cash')}>Cash</button></li>
                  <li><button className={`px-4 py-2 border-b-2 transition-colors ${activeTab === 'credit' ? 'border-primary text-primary font-medium' : 'border-transparent text-text-muted hover:text-text-secondary'}`} onClick={() => setActiveTab('credit')}>Credit</button></li>
                  <li><button className={`px-4 py-2 border-b-2 transition-colors ${activeTab === 'loans' ? 'border-primary text-primary font-medium' : 'border-transparent text-text-muted hover:text-text-secondary'}`} onClick={() => setActiveTab('loans')}>Loans</button></li>
                  <li><button className={`px-4 py-2 border-b-2 transition-colors ${activeTab === 'investment' ? 'border-primary text-primary font-medium' : 'border-transparent text-text-muted hover:text-text-secondary'}`} onClick={() => setActiveTab('investment')}>Investments</button></li>
                  <li><button className={`px-4 py-2 border-b-2 transition-colors ${activeTab === 'real_estate' ? 'border-primary text-primary font-medium' : 'border-transparent text-text-muted hover:text-text-secondary'}`} onClick={() => setActiveTab('real_estate')}>Real Estate</button></li>
                  <li><button className={`px-4 py-2 border-b-2 transition-colors ${activeTab === 'crypto' ? 'border-primary text-primary font-medium' : 'border-transparent text-text-muted hover:text-text-secondary'}`} onClick={() => setActiveTab('crypto')}>Crypto</button></li>
                  <li><button className={`px-4 py-2 border-b-2 transition-colors ${activeTab === 'manual' ? 'border-primary text-primary font-medium' : 'border-transparent text-text-muted hover:text-text-secondary'}`} onClick={() => setActiveTab('manual')}>Manual</button></li>
                </ul>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredAccounts.length === 0 ? (
                  <div className="col-span-full text-center py-10 text-text-muted italic">
                    No accounts found. {accounts.length === 0 && "Use the button above to link an account."}
                  </div>
                ) : (
                  filteredAccounts.map((account) => {
                    const display = getAccountCategoryDisplay(account);
                    const label = account.customLabel || account.accountName || 'Unnamed Account';
                    const detailLine = account.accountNumberMasked
                      ? `Ending in ${account.accountNumberMasked}`
                      : display.detail || display.label;
                    return (
                      <div key={account.id} className="relative flex flex-col gap-4 rounded-2xl border border-white/10 bg-surface-1/40 p-5 shadow-glass">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-[11px] uppercase tracking-widest text-text-muted">
                              {display.label}
                            </p>
                            <h3 className="text-lg font-semibold text-text-primary">{label}</h3>
                            <p className="text-xs text-text-secondary">{detailLine}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[11px] uppercase tracking-widest text-text-muted">Balance</p>
                            <p className="text-2xl font-bold text-primary">
                              {new Intl.NumberFormat('en-US', { style: 'currency', currency: account.currency || 'USD' }).format(account.balance || 0)}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {display.detail && (
                            <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] text-text-secondary">
                              {display.detail}
                            </span>
                          )}
                          {account.balanceType && (
                            <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] text-text-secondary">
                              {account.balanceType === 'liability' ? 'Liability' : 'Asset'}
                            </span>
                          )}
                          {account.provider && (
                            <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] text-text-secondary">
                              {account.provider}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between text-xs text-text-secondary">
                          <span>{account.accountType === 'manual' ? 'Manual tracking' : 'Auto-synced'}</span>
                          <span>{account.updatedAt ? `Updated ${new Date(account.updatedAt).toLocaleDateString()}` : 'Updated recently'}</span>
                        </div>
                        {account.accountType !== 'manual' && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => handleSync(account, e)}
                              disabled={syncingAccounts.has(account.id)}
                              className="text-xs bg-primary/20 text-primary px-3 py-2 rounded-lg hover:bg-primary/30 disabled:opacity-50 flex items-center gap-2"
                              title="Sync latest transactions"
                            >
                              <span className={syncingAccounts.has(account.id) ? 'animate-spin' : ''}>↻</span>
                              {syncingAccounts.has(account.id) ? 'Syncing...' : 'Sync'}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>

        <div className="glass-panel mb-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-semibold">Manual Assets &amp; Liabilities</h2>
              <p className="text-xs text-text-secondary">
                Track property, vehicles, collectibles, and other items that don’t sync as accounts.
              </p>
            </div>
            <button
              className="btn btn-primary"
              type="button"
              onClick={() => {
                setEditingManualAsset(null);
                setShowManualAssetModal(true);
              }}
            >
              Add Manual Asset
            </button>
          </div>
          {manualAssetsLoading ? (
            <div className="py-8 text-center text-text-secondary">Loading manual assets...</div>
          ) : manualAssets.length === 0 ? (
            <div className="py-8 text-center text-text-secondary">
              No manual assets or liabilities yet. Add one to include it in your net worth.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {manualAssets.map((asset) => (
                <div key={asset.id} className="rounded-2xl border border-white/10 bg-surface-1/40 p-5 shadow-glass flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-widest text-text-muted">
                        {getManualAssetLabel(asset.assetType)}
                      </p>
                      <h3 className="text-lg font-semibold text-text-primary">{asset.name}</h3>
                      {asset.purchaseDate && (
                        <p className="text-xs text-text-secondary">
                          Added {new Date(asset.purchaseDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] uppercase tracking-widest text-text-muted">
                        {asset.balanceType === 'liability' ? 'Liability' : 'Asset'}
                      </p>
                      <p className={`text-xl font-bold ${asset.balanceType === 'liability' ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {formatCurrency(asset.value)}
                      </p>
                    </div>
                  </div>
                  {asset.notes && (
                    <p className="text-xs text-text-secondary line-clamp-2">
                      {asset.notes}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-auto">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline"
                      onClick={() => {
                        setEditingManualAsset(asset);
                        setShowManualAssetModal(true);
                      }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost text-danger"
                      onClick={() => {
                        if (window.confirm('Delete this manual asset?')) {
                          removeManualAsset(asset.id);
                        }
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass-panel mb-12">
          <h2 className="mb-6">Linked Accounts</h2>
          <div className="overflow-x-auto">
            <table className="table w-full text-left">
              <thead>
                <tr className="border-b border-border">
                  <th className="pb-3 font-semibold">Account / Label</th>
                  <th className="pb-3 font-semibold">Category</th>
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
                  accounts.map((account) => {
                    const display = getAccountCategoryDisplay(account);
                    return (
                      <tr key={account.id} className="border-b border-border/50 hover:bg-surface-2 transition-colors">
                        <td className="py-4">
                            <div className="font-medium">{account.customLabel || account.accountName || 'Unnamed Account'}</div>
                            {account.customLabel && <div className="text-xs text-text-secondary">{account.accountName}</div>}
                        </td>
                        <td className="py-4">
                          <div className="font-medium">{display.label}</div>
                          {display.detail && (
                            <div className="text-xs text-text-secondary">{display.detail}</div>
                          )}
                          {account.balanceType && (
                            <div className="text-[10px] uppercase tracking-widest text-text-muted mt-1">
                              {account.balanceType === 'liability' ? 'Liability' : 'Asset'}
                            </div>
                          )}
                        </td>
                        <td className="py-4 text-sm text-text-secondary">
                          {householdLoading ? 'Loading...' : resolveAssignedLabel(account.assignedMemberUid)}
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
                          <div className="flex gap-2 items-center">
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
                                className="btn btn-sm btn-outline flex items-center gap-1"
                                onClick={() => setOpenMenuId((prev) => (prev === account.id ? null : account.id))}
                                aria-haspopup="menu"
                                aria-expanded={openMenuId === account.id}
                                aria-label="Open actions menu"
                              >
                                <MoreVertical className="w-4 h-4" />
                                <span className="hidden md:inline">Actions</span>
                              </button>
                              {openMenuId === account.id && (
                                <div className="absolute right-0 z-10 mt-2 w-48 rounded border border-border bg-surface-1 p-2 shadow-lg space-y-2">
                                  <button
                                    className="btn btn-sm btn-ghost w-full justify-start"
                                    onClick={() => {
                                      setEditingAccount(account);
                                      setOpenMenuId(null);
                                    }}
                                  >
                                    Edit Details
                                  </button>
                                  {account.accountType !== 'manual' && (
                                    <button
                                      className="btn btn-sm btn-ghost w-full justify-start"
                                      onClick={() => {
                                        setConfirmAction({ type: 'refresh', account });
                                        setOpenMenuId(null);
                                      }}
                                      disabled={account.syncStatus === 'needs_reauth'}
                                    >
                                      Refresh Sync
                                    </button>
                                  )}
                                  <button
                                    className="btn btn-sm btn-ghost w-full justify-start text-danger"
                                    onClick={() => {
                                      setConfirmAction({ type: 'remove', account });
                                      setOpenMenuId(null);
                                    }}
                                  >
                                    Remove Account
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="alert alert-info mb-8">
          <strong>Read-Only Access:</strong> We never move funds or place trades. Keys and tokens are stored securely.
        </div>

      </section>
    </div>
  );
};
