// Core Purpose: UI for connecting various account types (Plaid, Web3, CEX) with household assignment logic and subscription tier limits.
// Last Updated 2026-01-27 16:35 CST
import React, { useState, useEffect, useMemo } from 'react';
import { MoreVertical } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useUserTimeZone } from '../hooks/useUserTimeZone';
import { formatDate, formatTime } from '../utils/datetime';
import { useAccounts } from '../hooks/useAccounts';
import { useManualAssets } from '../hooks/useManualAssets';
import { PlaidLinkButton } from '../components/PlaidLinkButton';
import { useToast } from '../components/ui/Toast';
import { Modal } from '../components/ui/Modal';
import { Select } from '../components/ui/Select';
import { api as apiClient } from '../services/api';
import { householdService } from '../services/householdService';
import { Household, HouseholdMember } from '../types/household';
import { Account, ManualAsset } from '../types';
import { getAccountCategoryDisplay, getAccountPrimaryCategory, getCategoryLabel, type PrimaryAccountCategory } from '../utils/accountCategories';
import { accountLimitsByTier, canUseFeature, FeatureKey, normalizeTierSlug, TierSlug } from '../shared/accessControl';

interface AccountLimits {
  tier: string;
  tier_display: string;
  limits: Record<string, number>;
  current: Record<string, number>;
  total_connected: number;
  total_limit: number;
  upgrade_url: string;
}

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

const PLAN_LABELS: Record<TierSlug, string> = {
  free: 'Free',
  essential: 'Essential',
  pro: 'Pro',
  ultimate: 'Ultimate',
};

const MANUAL_ACCOUNT_CATEGORY_OPTIONS = [
  { value: 'checking', label: 'Checking Account' },
  { value: 'savings', label: 'Savings Account' },
  { value: 'investment', label: 'Investments' },
  { value: 'real_estate', label: 'Real Estate' },
  { value: 'credit', label: 'Credit' },
  { value: 'loan', label: 'Loan' },
  { value: 'mortgage', label: 'Mortgage' },
  { value: 'web3', label: 'Web3' },
  { value: 'cex', label: 'Centralized Exchange (CEX)' },
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

const normalizePlan = (value?: string | null): TierSlug | null => normalizeTierSlug(value);

const formatLimit = (limit: number | 'Unlimited') => (limit === 'Unlimited' ? 'Unlimited' : String(limit));

const getApiErrorMessage = (error: unknown, fallback: string) => {
  if (!error || typeof error !== 'object') return fallback;
  const err = error as { response?: { data?: { detail?: string } }; message?: string };
  return err.response?.data?.detail || err.message || fallback;
};

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
      const errorMessage = (err as ApiError).response?.data?.detail || 'Failed to link wallet';
      toast.show(errorMessage, 'error');
      
      // If limit error, redirect to billing after delay
      if (errorMessage.toLowerCase().includes('limit') || errorMessage.toLowerCase().includes('upgrade')) {
        setTimeout(() => {
          window.location.href = '/settings/billing';
        }, 3000);
      }
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
            <Select
              variant="input"
              value={chain} 
              onChange={(e) => setChain(e.target.value)}
            >
              {CHAIN_PRESETS.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </Select>
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
      const errorMessage = (err as ApiError).response?.data?.detail || 'Failed to link exchange';
      toast.show(errorMessage, 'error');
      
      // If limit error, redirect to billing after delay
      if (errorMessage.toLowerCase().includes('limit') || errorMessage.toLowerCase().includes('upgrade')) {
        setTimeout(() => {
          window.location.href = '/settings/billing';
        }, 3000);
      }
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
            <Select variant="input" value={exchange} onChange={(e) => setExchange(e.target.value)}>
              <option value="coinbase">Coinbase</option>
              <option value="kraken">Kraken</option>
              <option value="binance">Binance</option>
              <option value="binanceus">Binance US</option>
            </Select>
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
  const mapLegacyOverride = (override?: string | null) => {
    if (!override) return '';
    const normalized = override.toLowerCase();
    if (normalized === 'cash') return 'checking';
    if (normalized === 'crypto') {
      if (account.accountType === 'web3') return 'web3';
      if (account.accountType === 'cex') return 'cex';
      return 'cex';
    }
    return override;
  };
  const [categoryOverride, setCategoryOverride] = useState(mapLegacyOverride(account.categoryOverride));
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
              <Select
                variant="input"
                value={assignedUid}
                onChange={(e) => setAssignedUid(e.target.value)}
              >
                <option value="">(Unassigned)</option>
                {getAssignableMembers(household).map((member) => (
                  <option key={member.uid} value={member.uid}>
                    {formatHouseholdMemberLabel(member)} ({member.role})
                  </option>
                ))}
              </Select>
            ) : (
               <div className="text-sm text-text-secondary p-2 bg-surface-2 rounded border border-border">
                 You are not in a household.
               </div>
            )}
             <p className="text-xs text-text-secondary mt-1">Transactions will be tagged to this member in Family View.</p>
          </div>
          <div>
            <label className="form-label">Account Classification</label>
            <Select
              variant="input"
              value={categoryOverride}
              onChange={(e) => setCategoryOverride(e.target.value)}
            >
              <option value="">Auto (recommended)</option>
              {MANUAL_ACCOUNT_CATEGORY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </Select>
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
  const [categoryOverride, setCategoryOverride] = useState('checking');
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
              placeholder="e.g. Checking, Savings, Cash on hand"
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
            <Select
              variant="input"
              value={categoryOverride}
              onChange={(e) => setCategoryOverride(e.target.value)}
            >
              {MANUAL_ACCOUNT_CATEGORY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </Select>
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
              <Select
                variant="input"
                value={assignedUid}
                onChange={(e) => setAssignedUid(e.target.value)}
              >
                <option value="">(Unassigned)</option>
                {getAssignableMembers(household).map((member) => (
                  <option key={member.uid} value={member.uid}>
                    {formatHouseholdMemberLabel(member)} ({member.role})
                  </option>
                ))}
              </Select>
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
              <Select variant="input" name="assetType" value={form.assetType} onChange={handleChange}>
                {MANUAL_ASSET_TYPES.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="form-label text-sm">Asset or Liability</label>
              <Select variant="input" name="balanceType" value={form.balanceType} onChange={handleChange}>
                {BALANCE_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </Select>
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
  const timeZone = useUserTimeZone();
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
  const [connectMenuOpen, setConnectMenuOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'checking' | 'savings' | 'credit' | 'loans' | 'investment' | 'real_estate' | 'collectible' | 'web3' | 'cex' | 'manual'>('all');
  const [syncingAccounts, setSyncingAccounts] = useState<Set<string>>(new Set());
  const [linkedAccountsPage, setLinkedAccountsPage] = useState(1);
  const [linkedAccountsPageSize, setLinkedAccountsPageSize] = useState(10);
  const [linkedAccountsExpanded, setLinkedAccountsExpanded] = useState(true);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'refresh' | 'remove';
    account: typeof accounts[number];
  } | null>(null);
  const [accountLimits, setAccountLimits] = useState<AccountLimits | null>(null);
  const [limitsLoading, setLimitsLoading] = useState(true);

  const planFromProfile = normalizePlan(profile?.plan);
  const activeSubscription = (profile?.subscriptions as Array<{ status?: string; plan?: string | null }> | undefined)
    ?.find((sub) => sub.status === 'active');
  const planFromSubscriptions = normalizePlan(activeSubscription?.plan);
  const plan: TierSlug = planFromProfile || planFromSubscriptions || 'free';
  const planLabel = PLAN_LABELS[plan];
  const hasManualAccess = canUseFeature('assets.manual' as FeatureKey, plan);

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

  useEffect(() => {
    // Fetch account limits from backend
    const fetchLimits = async () => {
      try {
        const response = await apiClient.get<AccountLimits>('/accounts/limits');
        setAccountLimits(response.data);
      } catch (error) {
        console.error('Failed to fetch account limits:', error);
      } finally {
        setLimitsLoading(false);
      }
    };
    fetchLimits();
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
    return fullName || member.username || member.email || 'Member';
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

  const resolveLimit = (accountType: 'traditional' | 'investment' | 'web3' | 'cex' | 'manual') => {
    if (accountLimits?.limits?.[accountType] !== undefined) {
      return accountLimits.limits[accountType];
    }
    return accountLimitsByTier[plan]?.[accountType] ?? 0;
  };

  const bankLimit = resolveLimit('traditional') + resolveLimit('investment');
  const bankLimitLabel = formatLimit(bankLimit);
  const web3LimitLabel = formatLimit(resolveLimit('web3'));
  const cexLimitLabel = formatLimit(resolveLimit('cex'));
  const manualLimitLabel = formatLimit(resolveLimit('manual'));

  const totalLinkedAccountsPages = Math.max(1, Math.ceil(accounts.length / linkedAccountsPageSize));
  const linkedAccountsStart = (linkedAccountsPage - 1) * linkedAccountsPageSize;
  const linkedAccountsEnd = linkedAccountsStart + linkedAccountsPageSize;
  const paginatedLinkedAccounts = accounts.slice(linkedAccountsStart, linkedAccountsEnd);
  const hasLinkedPrevPage = linkedAccountsPage > 1;
  const hasLinkedNextPage = linkedAccountsPage < totalLinkedAccountsPages;

  useEffect(() => {
    if (linkedAccountsPage > totalLinkedAccountsPages) {
      setLinkedAccountsPage(totalLinkedAccountsPages);
    }
  }, [linkedAccountsPage, totalLinkedAccountsPages]);

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

  const checkAccountLimit = (accountType: 'traditional' | 'web3' | 'cex' | 'manual'): boolean => {
    if (!accountLimits) return true; // Allow if limits not loaded yet
    
    const current = accountLimits.current[accountType] || 0;
    const limit = accountLimits.limits[accountType] || 0;
    
    if (current >= limit) {
      const tierDisplay = accountLimits.tier_display;
      const upgradeLink = accountLimits.upgrade_url;
      
      toast.show(
        `You've reached your ${tierDisplay} plan limit of ${limit} ${accountType} account${limit !== 1 ? 's' : ''}. ` +
        `Upgrade to add more connections.`,
        'error'
      );
      
      // Optional: Navigate to upgrade page after a delay
      setTimeout(() => {
        window.location.href = upgradeLink;
      }, 3000);
      
      return false;
    }
    
    return true;
  };

  const handlePlaidSuccess = () => {
    toast.show('Account connected successfully', 'success');
    refetch();
    // Refresh limits after successful connection
    apiClient.get<AccountLimits>('/accounts/limits')
      .then(response => setAccountLimits(response.data))
      .catch(console.error);
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

  type ConnectSection = {
    id: 'bank' | 'web3' | 'cex' | 'manual';
    title: string;
    description: string;
    connected: number;
    allowed: string;
    badge?: string;
    disabled?: boolean;
  };

  const connectSections: ConnectSection[] = [
    {
      id: 'bank' as const,
      title: 'Bank & Credit',
      description: 'Secure read-only sync via Plaid.',
      connected: connectedCounts.bank,
      allowed: bankLimitLabel,
    },
    {
      id: 'web3' as const,
      title: 'Web3 Wallets',
      description: 'Track balances and on-chain activity.',
      connected: connectedCounts.web3,
      allowed: web3LimitLabel,
    },
    {
      id: 'cex' as const,
      title: 'CEX Accounts',
      description: 'Read-only exchange balances and positions.',
      connected: connectedCounts.cex,
      allowed: cexLimitLabel,
    },
    {
      id: 'manual' as const,
      title: 'Manual Accounts',
      description: 'Track manual accounts for transactions and balances.',
      connected: connectedCounts.manual,
      allowed: manualLimitLabel,
      disabled: !hasManualAccess,
    },
  ];

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
    } catch (err: unknown) {
      if (account.accountType === 'traditional') {
        try {
          await refreshMetadata(account.id);
          await refetch();
          toast.show('Transactions sync failed, but account details were refreshed.', 'error');
          return false;
        } catch (refreshErr: unknown) {
          toast.show(getApiErrorMessage(refreshErr, 'Failed to refresh account details'), 'error');
          return false;
        }
      }
      toast.show(getApiErrorMessage(err, 'Failed to sync account'), 'error');
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
        <div className="flex flex-wrap gap-3 mb-6">
          <span className="badge badge-neutral text-xs">Plan: {accountLimits?.tier_display || planLabel}</span>
          <span className="badge badge-neutral text-xs">
            Connected: {accountLimits?.total_connected || accounts.length} / {accountLimits?.total_limit || '...'}
          </span>
          {accountLimits && accountLimits.total_connected >= accountLimits.total_limit && (
            <span className="badge badge-warning text-xs">Limit Reached - Upgrade to Add More</span>
          )}
        </div>
        {accounts.some((account) => account.syncStatus === 'needs_reauth') && (
          <div className="alert alert-warning mb-8">
            <strong>Action needed:</strong> One or more accounts need to be reconnected. For security, please reconnect to restore syncing.
          </div>
        )}

        {/* Connect Accounts */}
        <div className="glass-panel mb-12">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-semibold">Connection Options</h2>
              <p className="text-xs text-text-secondary">Choose an account type to link.</p>
            </div>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => setConnectMenuOpen((prev) => !prev)}
            >
              {connectMenuOpen ? 'Collapse' : 'Expand'}
            </button>
          </div>
          {connectMenuOpen && (
            <div className="space-y-3">
              {connectSections.map((section) => (
                <div key={section.id} className="rounded-2xl border border-white/10 bg-surface-1/40 p-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-base font-semibold text-text-primary">{section.title}</h3>
                      <p className="text-xs text-text-secondary mt-1">{section.description}</p>
                    </div>
                    <div className="flex flex-col items-start md:items-end gap-2">
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-text-muted">Connected: <span className="font-semibold text-text-primary">{section.connected}</span></span>
                        <span className="text-text-muted">Limit: <span className="font-semibold text-text-primary">{section.allowed}</span></span>
                        {section.connected >= (typeof section.allowed === 'string' ? 999 : parseInt(section.allowed)) && (
                          <span className="badge badge-warning text-[10px]">At Limit</span>
                        )}
                      </div>
                      {section.badge && (
                        <span className="badge badge-neutral text-[10px] w-fit">
                          {section.badge}
                        </span>
                      )}
                      <div>
                        {section.id === 'bank' && (
                          <PlaidLinkButton 
                            onSuccess={handlePlaidSuccess} 
                            onError={handlePlaidError}
                            onBeforeOpen={() => checkAccountLimit('traditional')}
                          />
                        )}
                          {section.id === 'web3' && (
                            <button
                              className="btn btn-primary btn-sm w-full md:w-[170px]"
                              type="button"
                              onClick={() => {
                                if (checkAccountLimit('web3')) {
                                  setShowWalletModal(true);
                                }
                              }}
                            >
                              Connect Wallet
                            </button>
                          )}
                          {section.id === 'cex' && (
                            <button
                              className="btn btn-primary btn-sm w-full md:w-[170px]"
                              type="button"
                              onClick={() => {
                                if (checkAccountLimit('cex')) {
                                  setShowCexModal(true);
                                }
                              }}
                            >
                              Connect Exchange
                            </button>
                          )}
                          {section.id === 'manual' && (
                            <button
                              className="btn btn-primary btn-sm w-full md:w-[170px]"
                              type="button"
                              onClick={() => {
                                if (hasManualAccess && checkAccountLimit('manual')) {
                                  setShowManualAccountModal(true);
                                }
                              }}
                              disabled={section.disabled}
                            >
                              {hasManualAccess ? 'Create Manual Account' : 'Upgrade Required'}
                            </button>
                          )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modals */}
        {showWalletModal && (
          <AddWalletModal
            onClose={() => setShowWalletModal(false)}
            onSuccess={() => { 
              setShowWalletModal(false); 
              refetch();
              // Refresh limits
              apiClient.get<AccountLimits>('/accounts/limits')
                .then(response => setAccountLimits(response.data))
                .catch(console.error);
            }}
          />
        )}
        {showCexModal && (
          <AddCexModal
            onClose={() => setShowCexModal(false)}
            onSuccess={() => { 
              setShowCexModal(false); 
              refetch();
              // Refresh limits
              apiClient.get<AccountLimits>('/accounts/limits')
                .then(response => setAccountLimits(response.data))
                .catch(console.error);
            }}
          />
        )}
        {reconnectPayload && (
          <AddCexModal
            title="Reconnect Exchange"
            initialExchange={reconnectPayload.exchange}
            initialName={reconnectPayload.name}
            onClose={() => setReconnectPayload(null)}
            onSuccess={() => { 
              setReconnectPayload(null); 
              refetch();
              // Refresh limits
              apiClient.get<AccountLimits>('/accounts/limits')
                .then(response => setAccountLimits(response.data))
                .catch(console.error);
            }}
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
            onSuccess={() => { 
              setShowManualAccountModal(false); 
              refetch();
              // Refresh limits
              apiClient.get<AccountLimits>('/accounts/limits')
                .then(response => setAccountLimits(response.data))
                .catch(console.error);
            }}
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

        <div className="glass-panel mb-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-semibold">Manual Assets &amp; Liabilities</h2>
              <p className="text-xs text-text-secondary">
                Track property, vehicles, collectibles, and other items that don’t sync as accounts.
              </p>
            </div>
            <button
              className="btn btn-primary btn-sm w-full md:w-[170px]"
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
                          Added {formatDate(asset.purchaseDate, timeZone)}
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

        <div className="glass-panel mb-12 transition-all duration-300">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-semibold">Linked Accounts</h2>
              <p className="text-xs text-text-secondary mt-1">
                Manage all your connected financial accounts and view balances
              </p>
            </div>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => setLinkedAccountsExpanded((prev) => !prev)}
            >
              {linkedAccountsExpanded ? 'Collapse' : 'Expand'}
            </button>
          </div>

          {/* Summary bar when collapsed */}
          {!linkedAccountsExpanded && (
            <div className="flex flex-col md:flex-row justify-between items-center p-6 bg-transparent border border-white/10 rounded-xl cursor-pointer hover:bg-white/5 transition-colors" onClick={() => setLinkedAccountsExpanded(true)}>
              {accounts.length === 0 ? (
                <div className="flex flex-col items-center justify-center w-full text-center">
                  <p className="text-text-muted font-medium">Link your first financial account to see your net worth and cash flow.</p>
                  <p className="text-xs text-text-secondary mt-1">Connect an account below to start syncing.</p>
                </div>
              ) : (
                <>
                  <div className="flex gap-8 flex-wrap">
                    <div>
                      <span className="block text-xs text-text-muted uppercase tracking-wider">Connected</span>
                      <span className="text-lg font-bold text-text-primary">{accounts.length} Accounts</span>
                    </div>
                    <div>
                      <span className="block text-xs text-text-muted uppercase tracking-wider">Categories</span>
                      <span className="text-sm font-medium text-text-primary">
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
                            await handleSync(acc, e);
                          }
                        }
                      }}
                      className="text-xs bg-primary/10 text-primary px-3 py-1.5 rounded hover:bg-primary/20 flex items-center gap-1 transition-colors"
                    >
                      <span className={syncingAccounts.size > 0 ? "animate-spin" : ""}>↻</span> Sync All
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {linkedAccountsExpanded && (
            <>
              {/* Enhanced header with overview stats */}
              {accounts.length > 0 && (
                <div className="mb-6 p-4 bg-surface-1/40 rounded-xl border border-white/10">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <span className="block text-xs text-text-muted uppercase tracking-wider">Total Accounts</span>
                      <span className="text-2xl font-bold text-text-primary">{accounts.length}</span>
                      <span className="text-xs text-text-secondary ml-2">of {accountLimits?.total_limit || '...'} allowed</span>
                    </div>
                    <div>
                      <span className="block text-xs text-text-muted uppercase tracking-wider">Combined Balance</span>
                      <span className="text-2xl font-bold text-royal-purple">{formatCurrency(totalBalance)}</span>
                    </div>
                    <div className="flex flex-col items-start md:items-end justify-center">
                      <button
                        onClick={async (e) => {
                          // Trigger sync for all accounts sequentially
                          for (const acc of syncableAccounts) {
                            if (!syncingAccounts.has(acc.id)) {
                              await handleSync(acc, e);
                            }
                          }
                        }}
                        className="btn btn-primary btn-sm flex items-center gap-2"
                        disabled={syncingAccounts.size > 0}
                      >
                        <span className={syncingAccounts.size > 0 ? "animate-spin" : ""}>↻</span> 
                        {syncingAccounts.size > 0 ? `Syncing ${syncingAccounts.size}...` : 'Sync All Accounts'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Tabs for filtering */}
              <div className="tabs mb-6">
                <ul className="tab-list flex gap-4 border-b border-white/10 flex-wrap overflow-x-auto" role="tablist">
                  <li><button className={`px-4 py-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'all' ? 'border-primary text-primary font-medium' : 'border-transparent text-text-muted hover:text-text-secondary'}`} onClick={() => setActiveTab('all')}>All</button></li>
                  <li><button className={`px-4 py-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'checking' ? 'border-primary text-primary font-medium' : 'border-transparent text-text-muted hover:text-text-secondary'}`} onClick={() => setActiveTab('checking')}>Checking</button></li>
                  <li><button className={`px-4 py-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'savings' ? 'border-primary text-primary font-medium' : 'border-transparent text-text-muted hover:text-text-secondary'}`} onClick={() => setActiveTab('savings')}>Savings</button></li>
                  <li><button className={`px-4 py-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'credit' ? 'border-primary text-primary font-medium' : 'border-transparent text-text-muted hover:text-text-secondary'}`} onClick={() => setActiveTab('credit')}>Credit</button></li>
                  <li><button className={`px-4 py-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'loans' ? 'border-primary text-primary font-medium' : 'border-transparent text-text-muted hover:text-text-secondary'}`} onClick={() => setActiveTab('loans')}>Loans</button></li>
                  <li><button className={`px-4 py-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'investment' ? 'border-primary text-primary font-medium' : 'border-transparent text-text-muted hover:text-text-secondary'}`} onClick={() => setActiveTab('investment')}>Investment</button></li>
                  <li><button className={`px-4 py-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'real_estate' ? 'border-primary text-primary font-medium' : 'border-transparent text-text-muted hover:text-text-secondary'}`} onClick={() => setActiveTab('real_estate')}>Real Estate</button></li>
                  <li><button className={`px-4 py-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'collectible' ? 'border-primary text-primary font-medium' : 'border-transparent text-text-muted hover:text-text-secondary'}`} onClick={() => setActiveTab('collectible')}>Collectibles</button></li>
                  <li><button className={`px-4 py-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'web3' ? 'border-primary text-primary font-medium' : 'border-transparent text-text-muted hover:text-text-secondary'}`} onClick={() => setActiveTab('web3')}>Web3</button></li>
                  <li><button className={`px-4 py-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'cex' ? 'border-primary text-primary font-medium' : 'border-transparent text-text-muted hover:text-text-secondary'}`} onClick={() => setActiveTab('cex')}>CEX</button></li>
                  <li><button className={`px-4 py-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'manual' ? 'border-primary text-primary font-medium' : 'border-transparent text-text-muted hover:text-text-secondary'}`} onClick={() => setActiveTab('manual')}>Manual</button></li>
                </ul>
              </div>

              {/* Card grid view for filtered accounts */}
              {activeTab !== 'all' && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold mb-4 text-text-primary">
                    {activeTab === 'loans' ? 'Loans & Mortgages' : getCategoryLabel(activeTab as PrimaryAccountCategory)}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {filteredAccounts.length === 0 ? (
                      <div className="col-span-full text-center py-10 text-text-muted italic">
                        No {activeTab} accounts found.
                      </div>
                    ) : (
                      filteredAccounts.map((account) => {
                        const display = getAccountCategoryDisplay(account);
                        const label = account.customLabel || account.accountName || 'Unnamed Account';
                        const detailLine = account.accountNumberMasked
                          ? `Ending in ${account.accountNumberMasked}`
                          : display.detail || display.label;
                        return (
                          <div key={account.id} className="relative flex flex-col gap-4 rounded-2xl border border-white/10 bg-surface-1/40 p-5 shadow-glass hover:border-primary/30 transition-all">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
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
                              <span>{account.accountType === 'manual' ? 'Manual' : 'Auto-synced'}</span>
                              <span>{account.updatedAt ? `${formatDate(account.updatedAt, timeZone)}` : 'Recent'}</span>
                            </div>
                            {account.accountType !== 'manual' && (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={(e) => handleSync(account, e)}
                                  disabled={syncingAccounts.has(account.id)}
                                  className="text-xs bg-primary/20 text-primary px-3 py-2 rounded-lg hover:bg-primary/30 disabled:opacity-50 flex items-center gap-2 transition-colors"
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
                </div>
              )}

              {/* Table view for all accounts */}
              {activeTab === 'all' && (
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
                      (activeTab === 'all' ? paginatedLinkedAccounts : filteredAccounts).map((account) => {
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
                            <td className="py-4 text-sm text-text-secondary">{account.updatedAt ? formatTime(account.updatedAt, timeZone) : 'Just now'}</td>
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
                                    className="btn btn-sm btn-outline flex items-center"
                                    onClick={() => setOpenMenuId((prev) => (prev === account.id ? null : account.id))}
                                    aria-haspopup="menu"
                                    aria-expanded={openMenuId === account.id}
                                    aria-label="Open actions menu"
                                  >
                                    <MoreVertical className="w-4 h-4" />
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
                <div className="mt-6 flex justify-center">
                <div className="flex items-center gap-3">
                  <label className="text-xs text-text-muted" htmlFor="linked-accounts-page-size">Rows</label>
                  <Select
                    id="linked-accounts-page-size"
                    variant="none"
                    wrapperClassName="relative inline-block"
                    className="bg-transparent border border-white/10 rounded-md text-sm px-2 py-1 text-text-secondary pr-8"
                    value={linkedAccountsPageSize}
                    onChange={(e) => {
                      setLinkedAccountsPageSize(Number(e.target.value));
                      setLinkedAccountsPage(1);
                    }}
                  >
                    {[10, 25, 50, 100].map((size) => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </Select>
                  <button
                    className="btn btn-sm btn-outline"
                    onClick={() => setLinkedAccountsPage((prev) => Math.max(1, prev - 1))}
                    disabled={!hasLinkedPrevPage}
                  >
                    Prev
                  </button>
                  <button
                    className="btn btn-sm btn-outline"
                    onClick={() => setLinkedAccountsPage((prev) => Math.min(totalLinkedAccountsPages, prev + 1))}
                    disabled={!hasLinkedNextPage}
                  >
                    Next
                  </button>
                </div>
                </div>
              </div>
              )}
            </>
          )}
        </div>

        <div className="alert alert-info mb-8">
          <strong>Read-Only Access:</strong> We never move funds or place trades. Keys and tokens are stored securely.
        </div>

      </section>
    </div>
  );
};
