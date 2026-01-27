// Core Purpose: Account settings page covering profile, subscription, household, and security preferences.
// Last Updated 2026-01-26 13:00 CST

import React, { useCallback, useEffect, useState, FormEvent } from 'react';
import { useAuth } from '../hooks/useAuth';
import { changePassword, apiFetch, listSessions, endSession, endOtherSessions, UserSessionData } from '../services/auth';
import { householdService } from '../services/householdService';
import type { Household } from '../types/household';
import type { UserProfile } from '../hooks/useAuth';

import Switch from '../components/ui/Switch';
import { settingsService, NotificationPreference } from '../services/settingsService';
import { useToast } from '../components/ui/Toast';

type ProfileUpdatePayload = Partial<Pick<UserProfile, 'first_name' | 'last_name' | 'username' | 'phone_number' | 'display_name_pref'>> & {
  phone_number?: string | null;
};

type ErrorResponse = {
  detail?: string;
  message?: string;
  error?: string;
};

type BillingInvoice = {
  id: string;
  created: number;
  amount_paid: number;
  currency: string;
  status: string;
  invoice_pdf?: string | null;
};

const getDefaultSettings = () => ({
  email: {
    lowBalance: true,
    largeTransaction: true,
    budgetThreshold: true,
    recurringBill: true,
    syncFailure: true,
    weeklyDigest: true,
    supportUpdates: true,
    subscriptionUpdates: true,
  },
  sms: {
    lowBalance: true,
    largeTransaction: true,
    budgetThreshold: true,
    recurringBill: true,
    syncFailure: true,
    weeklyDigest: true,
    supportUpdates: true,
    subscriptionUpdates: true,
  },
  push: {
    lowBalance: true,
    largeTransaction: true,
    budgetThreshold: true,
    recurringBill: true,
    syncFailure: true,
    weeklyDigest: true,
    supportUpdates: true,
    subscriptionUpdates: true,
  },
  inApp: {
    lowBalance: true,
    largeTransaction: true,
    budgetThreshold: true,
    recurringBill: true,
    syncFailure: true,
    weeklyDigest: true,
    supportUpdates: true,
    subscriptionUpdates: true,
  },
  quietHours: {
    start: '22:00',
    end: '08:00',
    timezone: 'UTC',
  },
  triggers: {
    lowBalanceThreshold: '100',
    largeTransactionThreshold: '500',
  },
  privacy: {
    dataSharing: false,
    marketingEmails: true,
  }
});

type SettingsState = ReturnType<typeof getDefaultSettings>;

// Profile Form Component
const ProfileForm = ({ profile }: { profile: UserProfile | null }) => {
  const { refetchProfile } = useAuth();
  const toast = useToast();
  const [firstName, setFirstName] = useState(profile?.first_name ?? '');
  const [lastName, setLastName] = useState(profile?.last_name ?? '');
  const [username, setUsername] = useState(profile?.username ?? '');
  const [phoneNumber, setPhoneNumber] = useState(profile?.phone_number ?? '');
  const [displayNamePref, setDisplayNamePref] = useState(profile?.display_name_pref ?? 'name');
  const [saving, setSaving] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name ?? '');
      setLastName(profile.last_name ?? '');
      setUsername(profile.username ?? '');
      setPhoneNumber(profile.phone_number ?? '');
      setDisplayNamePref(profile.display_name_pref ?? 'name');
    }
  }, [profile]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setUsernameError(null);

    try {
      // Prepare payload - convert empty strings to null, ensure required fields are not empty
      if (!firstName.trim()) {
        toast.show('First name is required', 'error');
        setSaving(false);
        return;
      }
      if (!lastName.trim()) {
        toast.show('Last name is required', 'error');
        setSaving(false);
        return;
      }
      
      // Prepare payload - ensure we send null for empty strings, not empty strings
      // Only include fields that have values to avoid validation issues
      const payload: ProfileUpdatePayload = {};
      
      if (firstName.trim()) {
        payload.first_name = firstName.trim();
      }
      if (lastName.trim()) {
        payload.last_name = lastName.trim();
      }
      if (username.trim()) {
        payload.username = username.trim();
      }
      if (phoneNumber.trim()) {
        payload.phone_number = phoneNumber.trim();
      } else if (profile?.phone_number) {
        payload.phone_number = null;
      }
      if (displayNamePref) {
        payload.display_name_pref = displayNamePref;
      }
      
      console.log('Sending profile update payload:', payload);
      
      // Ensure at least one field is being sent
      if (Object.keys(payload).length === 0) {
        toast.show('Please fill in at least one field to update.', 'error');
        setSaving(false);
        return;
      }

      const response = await apiFetch('/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify(payload),
        throwOnError: false,
      });

      if (!response.ok) {
        let errorMessage = 'Failed to update profile';
        let errorData: ErrorResponse = {};
        try {
          errorData = (await response.json()) as ErrorResponse;
          // Check multiple possible error message fields
          errorMessage = errorData.detail || errorData.message || errorData.error || JSON.stringify(errorData) || errorMessage;
          console.error('Profile update error response:', errorData);
          console.error('Profile update error message:', errorMessage);
        } catch (e) {
          const text = await response.text().catch(() => '');
          console.error('Failed to parse error response as JSON:', e);
          console.error('Raw error response:', text);
          errorMessage = text || errorMessage;
        }
        
        // Handle username-specific errors
        const lowerMsg = errorMessage.toLowerCase();
        if (lowerMsg.includes('username') || lowerMsg.includes('taken') || lowerMsg.includes('already')) {
          setUsernameError(errorMessage);
          toast.show(errorMessage, 'error');
          return;
        }
        
        // Handle validation errors
        if (lowerMsg.includes('at least one field') || lowerMsg.includes('provide at least')) {
          toast.show('Please fill in at least one field to update.', 'error');
          return;
        }
        
        // Show the actual error message
        toast.show(errorMessage, 'error');
        console.error('Profile update failed with message:', errorMessage);
        return;
      }

      await refetchProfile();
      toast.show('Profile updated successfully', 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update profile';
      toast.show(message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="profile-first-name" className="block text-sm font-medium text-text-secondary mb-1">
            First Name
          </label>
          <input
            type="text"
            id="profile-first-name"
            className="form-input w-full"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />
        </div>

        <div>
          <label htmlFor="profile-last-name" className="block text-sm font-medium text-text-secondary mb-1">
            Last Name
          </label>
          <input
            type="text"
            id="profile-last-name"
            className="form-input w-full"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
          />
        </div>
      </div>

      <div>
        <label htmlFor="profile-username" className="block text-sm font-medium text-text-secondary mb-1">
          Username (Optional)
        </label>
        <input
          type="text"
          id="profile-username"
          className="form-input w-full"
          value={username}
          onChange={(e) => {
            setUsername(e.target.value);
            setUsernameError(null);
          }}
          minLength={3}
          maxLength={64}
          placeholder="Choose a unique username"
        />
        {usernameError && (
          <p className="text-sm text-red-600 mt-1">{usernameError}</p>
        )}
        <p className="text-xs text-text-muted mt-1">
          Username must be at least 3 characters and unique. Leave blank if you don&apos;t want one.
        </p>
      </div>

      <div>
        <label htmlFor="profile-display-pref" className="block text-sm font-medium text-text-secondary mb-1">
          Display Name Preference
        </label>
        <select
          id="profile-display-pref"
          className="form-select w-full"
          value={displayNamePref}
          onChange={(e) => setDisplayNamePref(e.target.value)}
        >
          <option value="name">First Name + Last Name</option>
          <option value="username">Username (if set)</option>
        </select>
        <p className="text-xs text-text-muted mt-1">
          How your name appears in transactions and other places.
        </p>
      </div>

      <div>
        <label htmlFor="profile-email" className="block text-sm font-medium text-text-secondary mb-1">
          Email Address
        </label>
        <input
          type="email"
          id="profile-email"
          className="form-input w-full"
          value={profile?.email || ''}
          disabled
          readOnly
        />
        <p className="text-xs text-text-muted mt-1">Email cannot be changed from this page.</p>
      </div>

      <div>
        <label htmlFor="profile-phone" className="block text-sm font-medium text-text-secondary mb-1">
          SMS Phone Number
        </label>
        <input
          type="tel"
          id="profile-phone"
          className="form-input w-full"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          placeholder="+12125551234"
        />
        <p className="text-xs text-text-muted mt-1">
          Used for SMS alerts. Enter in E.164 format (example: +12125551234).
        </p>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="btn btn-primary"
      >
        {saving ? 'Saving...' : 'Save Changes'}
      </button>
    </form>
  );
};

// Render the account settings experience with tabbed sections.
export const Settings = () => {
  const { user, profile } = useAuth();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('profile');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [household, setHousehold] = useState<Household | null>(null);
  const [householdLoading, setHouseholdLoading] = useState(false);
  const [householdError, setHouseholdError] = useState<string | null>(null);
  const [memberActionUid, setMemberActionUid] = useState<string | null>(null);
  const [inviteActionId, setInviteActionId] = useState<string | null>(null);

  // Settings State
  const [settings, setSettings] = useState<SettingsState>(getDefaultSettings());

  const [notificationSaving, setNotificationSaving] = useState(false);

  // Load Settings from Backend
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const [prefs, userProfile, notificationSettings] = await Promise.all([
          settingsService.getNotificationPreferences(),
          // Use auth profile if available, but for data_sharing_consent we might need fresh fetch or check if profile includes it
          // Assuming profile from useAuth is up to date or we fetch /me
          apiFetch('/users/me').then(res => res.json()),
          settingsService.getNotificationSettings(),
        ]);

        const newSettings = getDefaultSettings();

        // Map Notification Preferences
        prefs.forEach((p: NotificationPreference) => {
           // Convert snake_case event keys to camelCase for frontend state mapping
           // Simple mapping for known keys
           const mapKey = (key: string) => {
             const parts = key.split('_');
             if (parts.length === 1) return parts[0];
             return parts[0] + parts.slice(1).map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('');
           };

           const camelKey = mapKey(p.event_key);
           
           // Handle known email categories
           if (camelKey in newSettings.email) {
             newSettings.email[camelKey as keyof typeof newSettings.email] = p.channel_email;
           }
           
           // Handle known sms categories
           if (camelKey in newSettings.sms) {
             newSettings.sms[camelKey as keyof typeof newSettings.sms] = p.channel_sms;
           }

           // Handle known push categories
           if (camelKey in newSettings.push) {
             newSettings.push[camelKey as keyof typeof newSettings.push] = p.channel_push;
           }

           // Handle known in-app categories
           if (camelKey in newSettings.inApp) {
             newSettings.inApp[camelKey as keyof typeof newSettings.inApp] = p.channel_in_app;
           }

           // Handle marketing emails (mapped to privacy in UI)
           if (p.event_key === 'marketing_updates') {
             newSettings.privacy.marketingEmails = p.channel_email;
           }
        });

        // Map Privacy Settings
        if (userProfile.data_sharing_consent !== undefined) {
          newSettings.privacy.dataSharing = userProfile.data_sharing_consent;
        }

        if (notificationSettings) {
          newSettings.quietHours.start = notificationSettings.quiet_hours_start?.slice(0, 5) ?? '22:00';
          newSettings.quietHours.end = notificationSettings.quiet_hours_end?.slice(0, 5) ?? '08:00';
          newSettings.quietHours.timezone = notificationSettings.timezone || 'UTC';
          newSettings.triggers.lowBalanceThreshold =
            notificationSettings.low_balance_threshold !== null && notificationSettings.low_balance_threshold !== undefined
              ? String(notificationSettings.low_balance_threshold)
              : newSettings.triggers.lowBalanceThreshold;
          newSettings.triggers.largeTransactionThreshold =
            notificationSettings.large_transaction_threshold !== null && notificationSettings.large_transaction_threshold !== undefined
              ? String(notificationSettings.large_transaction_threshold)
              : newSettings.triggers.largeTransactionThreshold;
        }

        setSettings(newSettings);

      } catch (err) {
        console.error("Failed to load settings", err);
      }
    };
    loadSettings();
  }, []); // Run once on mount

  // Helper for snake_case conversion for API calls
  const toSnakeCase = (str: string) => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);

  const handleEmailToggle = async (key: keyof typeof settings.email, value: boolean) => {
    setSettings(s => ({ ...s, email: { ...s.email, [key]: value } }));
    try {
      await settingsService.updateNotificationPreference({
        event_key: toSnakeCase(key),
        channel_email: value
      });
    } catch (e) {
      console.error(e);
      setSettings(s => ({ ...s, email: { ...s.email, [key]: !value } }));
    }
  };

  const handleSmsToggle = async (key: keyof typeof settings.sms, value: boolean) => {
    setSettings(s => ({ ...s, sms: { ...s.sms, [key]: value } }));
    try {
      await settingsService.updateNotificationPreference({
        event_key: toSnakeCase(key),
        channel_sms: value
      });
    } catch (e) {
      console.error(e);
      setSettings(s => ({ ...s, sms: { ...s.sms, [key]: !value } }));
    }
  };

  // Update push notification preferences in the backend and local state.
  const handlePushToggle = async (key: keyof typeof settings.push, value: boolean) => {
    setSettings(s => ({ ...s, push: { ...s.push, [key]: value } }));
    try {
      await settingsService.updateNotificationPreference({
        event_key: toSnakeCase(key),
        channel_push: value
      });
    } catch (e) {
      console.error(e);
      setSettings(s => ({ ...s, push: { ...s.push, [key]: !value } }));
    }
  };

  // Update in-app notification preferences in the backend and local state.
  const handleInAppToggle = async (key: keyof typeof settings.inApp, value: boolean) => {
    setSettings(s => ({ ...s, inApp: { ...s.inApp, [key]: value } }));
    try {
      await settingsService.updateNotificationPreference({
        event_key: toSnakeCase(key),
        channel_in_app: value
      });
    } catch (e) {
      console.error(e);
      setSettings(s => ({ ...s, inApp: { ...s.inApp, [key]: !value } }));
    }
  };

  const handlePrivacyToggle = async (key: keyof typeof settings.privacy, value: boolean) => {
    setSettings(s => ({ ...s, privacy: { ...s.privacy, [key]: value } }));
    try {
      if (key === 'dataSharing') {
        await settingsService.updatePrivacySettings({ data_sharing_consent: value });
      } else if (key === 'marketingEmails') {
        await settingsService.updateNotificationPreference({
          event_key: 'marketing_updates',
          channel_email: value
        });
      }
    } catch (e) {
      console.error(e);
      setSettings(s => ({ ...s, privacy: { ...s.privacy, [key]: !value } }));
    }
  };

  // Persist quiet hours to the backend notification settings.
  const handleNotificationSave = async () => {
    setNotificationSaving(true);
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || settings.quietHours.timezone;
      await settingsService.updateNotificationSettings({
        timezone,
        quiet_hours_start: settings.quietHours.start ? `${settings.quietHours.start}:00` : null,
        quiet_hours_end: settings.quietHours.end ? `${settings.quietHours.end}:00` : null,
        low_balance_threshold: settings.triggers.lowBalanceThreshold
          ? Number(settings.triggers.lowBalanceThreshold)
          : null,
        large_transaction_threshold: settings.triggers.largeTransactionThreshold
          ? Number(settings.triggers.largeTransactionThreshold)
          : null,
      });
      toast.show('Notification settings updated', 'success');
    } catch (e) {
      console.error(e);
      toast.show('Failed to update notification settings', 'error');
    } finally {
      setNotificationSaving(false);
    }
  };

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Billing state
  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [billingPage, setBillingPage] = useState(1);
  const billingPageSize = 5;

  const isRestrictedMember = Boolean(
    profile?.household_member &&
    !['admin', 'owner'].includes(profile?.household_member?.role || '')
  );

  // Session Management State
  const [sessions, setSessions] = useState<UserSessionData[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [terminatingSessionId, setTerminatingSessionId] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const data = await listSessions();
      setSessions(data);
    } catch (err) {
      console.error('Failed to load sessions', err);
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  const handleEndSession = async (sessionId: string) => {
    if (!window.confirm('Terminate this session?')) return;
    setTerminatingSessionId(sessionId);
    try {
      await endSession(sessionId);
      await loadSessions();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to end session');
    } finally {
      setTerminatingSessionId(null);
    }
  };

  const handleEndOtherSessions = async () => {
    if (!window.confirm('Terminate all other active sessions? This will log you out of all other devices.')) return;
    try {
      await endOtherSessions();
      await loadSessions();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to end other sessions');
    }
  };

  // Format a household role string for display in the UI.

  const formatRole = (role: string) =>
    role
      .split('_')
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(' ');

  // Fetch household details for the settings view and handle non-member cases.
  const loadHousehold = useCallback(async () => {
    if (!profile?.household_member) {
      setHousehold(null);
      setHouseholdError(null);
      return;
    }

    setHouseholdLoading(true);
    setHouseholdError(null);

    try {
      const data = await householdService.getMyHousehold();
      setHousehold(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to load household details.';
      if (message.includes('not in a household')) {
        setHousehold(null);
        setHouseholdError(null);
      } else {
        setHousehold(null);
        setHouseholdError(message);
      }
    } finally {
      setHouseholdLoading(false);
    }
  }, [profile?.household_member]);

  // Keep household data synced when the Household tab is active.
  useEffect(() => {
    if (activeTab === 'household') {
      void loadHousehold();
    } else if (activeTab === 'subscription') {
      // Load billing history
      const loadInvoices = async () => {
        setInvoicesLoading(true);
        try {
          // Use apiFetch helper which handles auth headers automatically
          const response = await apiFetch('/billing/invoices');
          if (response.ok) {
            const data = (await response.json()) as BillingInvoice[];
            setInvoices(Array.isArray(data) ? data : []);
          }
        } catch (error) {
          console.error("Failed to load invoices", error);
        } finally {
          setInvoicesLoading(false);
        }
      };
      void loadInvoices();
    } else if (activeTab === 'security') {
      void loadSessions();
    }
  }, [activeTab, loadHousehold, loadSessions]);

  // Control visibility of the household tab based on membership or Ultimate tier.
  const hasUltimatePlan = Boolean(profile?.plan?.includes('ultimate'));
  const showHouseholdTab = Boolean(profile?.household_member) || hasUltimatePlan;

  // Ensure we do not render a hidden tab as the active view.
  useEffect(() => {
    if (!showHouseholdTab && activeTab === 'household') {
      setActiveTab('profile');
    }
  }, [activeTab, showHouseholdTab]);

  // Remove a household member and refresh the household list.
  const handleRemoveMember = useCallback(
    async (memberUid: string, memberEmail?: string) => {
      const label = memberEmail || memberUid;
      if (!window.confirm(`Remove ${label} from the household?`)) return;

      setMemberActionUid(memberUid);
      try {
        await householdService.removeMember(memberUid);
        await loadHousehold();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to remove household member.';
        window.alert(message);
      } finally {
        setMemberActionUid(null);
      }
    },
    [loadHousehold],
  );

  // Cancel a pending invite and refresh the household list.
  const handleCancelInvite = useCallback(
    async (inviteId: string, inviteEmail: string) => {
      if (!window.confirm(`Cancel the invite for ${inviteEmail}?`)) return;

      setInviteActionId(inviteId);
      try {
        await householdService.cancelInvite(inviteId);
        await loadHousehold();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to cancel household invite.';
        window.alert(message);
      } finally {
        setInviteActionId(null);
      }
    },
    [loadHousehold],
  );

  const isHouseholdMember = Boolean(profile?.household_member);
  const isHouseholdAdmin =
    Boolean(profile?.household_member && profile.household_member.role === 'admin') ||
    Boolean(household?.owner_uid && household.owner_uid === user?.uid);
  const pendingInvites = household?.invites?.filter((invite) => invite.status === 'pending') ?? [];

  const tabs = [
    { id: 'profile', label: 'Profile' },
    { id: 'subscription', label: 'Subscription' },
    ...(showHouseholdTab ? [{ id: 'household', label: 'Household' }] : []),
    { id: 'notifications', label: 'Notifications' },
    { id: 'privacy', label: 'Privacy' },
    { id: 'security', label: 'Security' },
  ];

  return (
    <div>
      <section className="container py-12">

        <div className="tabs mb-8">
          <ul className="flex space-x-1 border-b border-border" role="tablist">
            {tabs.map(tab => (
              <li key={tab.id}>
                <button
                  className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-text-muted hover:text-text-primary'
                    }`}
                  onClick={() => setActiveTab(tab.id)}
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  aria-controls={`${tab.id}-tab`}
                >
                  {tab.label}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div id="profile-tab" role="tabpanel">
            <div className="glass-panel">
              <h2 className="mb-6">Profile Information</h2>
              <ProfileForm profile={profile} />
            </div>
          </div>
        )}

        {/* Subscription Tab */}
        {activeTab === 'subscription' && (
          <div id="subscription-tab" role="tabpanel">
            <div className="glass-panel">
              <h2 className="mb-6">Subscription</h2>
              
              {isRestrictedMember ? (
                <div className="card mb-6">
                  <div className="card-body">
                    <h3 className="text-xl font-bold mb-4">Household Membership</h3>
                    <p className="mb-4">
                      Your subscription is part of a Household Plan.
                      Billing and subscription level are managed by the Household Administrator.
                    </p>
                    <div className="p-4 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-lg">
                      <p className="font-semibold">You have full access to JuaLuma features provided by your household.</p>
                      <p className="text-sm mt-1">To change your plan, please contact your Household Admin or leave the household.</p>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="card mb-6">
                    <div className="card-header pb-2 border-b border-border mb-4">
                      <h3 className="text-xl font-bold">Current Plan: {profile?.plan ? profile.plan.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 'Free'}</h3>
                    </div>
                    <div className="card-body">
                      <p className="mb-2"><strong>Billing:</strong> {profile?.plan && profile.plan !== 'free' ? 'Paid Subscription' : 'Free'}</p>
                      {profile?.subscriptions?.[0]?.renew_at && (
                        <p className="mb-2"><strong>Next Billing Date:</strong> {new Date(profile.subscriptions[0].renew_at).toLocaleDateString()}</p>
                      )}
                      <p className="mb-2"><strong>Status:</strong> <span className={`px-2 py-0.5 rounded text-xs font-semibold ${profile?.subscription_status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-800'}`}>{profile?.subscription_status || 'Inactive'}</span></p>

                      {profile?.plan?.includes('pro') && (
                        <p className="mt-4 p-2 bg-primary/10 rounded text-sm">
                          <strong>Tax Note:</strong> Billing includes Texas sales tax on 80% of subscription fee (20% exemption for data processing services)
                        </p>
                      )}
                    </div>
                    <div className="card-footer">
                      <button onClick={async () => {
                        try {
                          if (!user) {
                            alert('You must be signed in to manage billing.');
                            return;
                          }

                          const response = await apiFetch('/billing/portal', {
                            method: 'POST',
                            body: JSON.stringify({ return_url: window.location.href })
                          });

                          if (response.ok) {
                            const data = await response.json();
                            window.location.href = data.url;
                          } else {
                            alert('Failed to redirect to billing portal.');
                          }
                        } catch (e) {
                          const message = e instanceof Error ? e.message : 'An error occurred opening the billing portal.';
                          alert(message);
                        }
                      }} className="btn btn-primary">Manage Subscription</button>
                    </div>
                  </div>

                  <div className="card">
                    <div className="card-header pb-2 border-b border-border mb-4">
                      <h3 className="text-xl font-bold">Billing History</h3>
                    </div>
                    <div className="card-body overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="pb-2 text-text-secondary font-medium">Date</th>
                            <th className="pb-2 text-text-secondary font-medium">Amount</th>
                            <th className="pb-2 text-text-secondary font-medium">Status</th>
                            <th className="pb-2 text-text-secondary font-medium">Invoice</th>
                          </tr>
                        </thead>
                        <tbody>
                          {invoicesLoading && (
                            <tr>
                              <td colSpan={5} className="py-6 text-center text-text-muted">
                                Loading billing history...
                              </td>
                            </tr>
                          )}

                          {!invoicesLoading && invoices.length === 0 && (
                            <tr>
                              <td colSpan={5} className="py-6 text-center text-text-muted">
                                No billing history found.
                              </td>
                            </tr>
                          )}

                          {!invoicesLoading && invoices
                            .slice((billingPage - 1) * billingPageSize, billingPage * billingPageSize)
                            .map((invoice) => (
                            <tr key={invoice.id} className="border-b border-border/50 last:border-0 hover:bg-surface-2 transition-colors">
                              <td className="py-3 text-text-primary">
                                {new Date(invoice.created * 1000).toLocaleDateString()}
                              </td>
                              <td className="py-3 text-text-primary">
                                {(invoice.amount_paid / 100).toLocaleString('en-US', {
                                  style: 'currency',
                                  currency: invoice.currency.toUpperCase()
                                })}
                              </td>
                              <td className="py-3">
                                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${invoice.status === 'paid'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-gray-100 text-gray-800'
                                  }`}>
                                  {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                                </span>
                              </td>
                              <td className="py-3">
                                {invoice.invoice_pdf ? (
                                  <a href={invoice.invoice_pdf} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm font-medium">
                                    Download PDF
                                  </a>
                                ) : (
                                  <span className="text-text-muted text-sm">-</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {/* Pagination Controls */}
                    {!invoicesLoading && invoices.length > billingPageSize && (
                      <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                        <p className="text-sm text-text-secondary">
                          Page {billingPage} of {Math.ceil(invoices.length / billingPageSize)}
                        </p>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="px-3 py-2 text-sm rounded-lg border border-border text-text-primary disabled:opacity-50 hover:bg-surface-2"
                            onClick={() => setBillingPage(p => Math.max(1, p - 1))}
                            disabled={billingPage <= 1}
                          >
                            Previous
                          </button>
                          <button
                            type="button"
                            className="px-3 py-2 text-sm rounded-lg border border-border text-text-primary disabled:opacity-50 hover:bg-surface-2"
                            onClick={() => setBillingPage(p => Math.min(Math.ceil(invoices.length / billingPageSize), p + 1))}
                            disabled={billingPage >= Math.ceil(invoices.length / billingPageSize)}
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Household Tab */}
        {activeTab === 'household' && (
          <div id="household-tab" role="tabpanel">
            <div className="glass-panel">
              <h2 className="mb-6">Household</h2>

              {householdLoading && (
                <div className="text-text-secondary">Loading household...</div>
              )}

              {!householdLoading && householdError && (
                <div className="card mb-6">
                  <div className="card-body">
                    <p className="text-sm text-red-600">{householdError}</p>
                  </div>
                </div>
              )}

              {!householdLoading && !householdError && !isHouseholdMember && (
                <div className="card">
                  <div className="card-body">
                    <p className="text-text-secondary">
                      You are not currently in a household. Join one to view members and invites.
                    </p>
                  </div>
                </div>
              )}

              {!householdLoading && !householdError && isHouseholdMember && !household && (
                <div className="card">
                  <div className="card-body">
                    <p className="text-text-secondary">
                      Household details are not available yet. Please refresh or try again shortly.
                    </p>
                  </div>
                </div>
              )}

              {!householdLoading && !householdError && isHouseholdMember && household && (
                <>
                  <div className="card mb-6">

                    <div className="card-body">
                      {household.members.length > 0 ? (
                        <ul className="divide-y divide-border">
                          {household.members.map((member) => (
                            <li
                              key={member.uid}
                              className="py-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"
                            >
                              <div>
                                {member.username && (
                                  <p className="text-lg font-semibold text-text-primary mb-0.5">{member.username}</p>
                                )}
                                <p className="text-sm text-text-muted">{member.email || 'No email'}</p>
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700">
                                  {formatRole(member.role)}
                                </span>
                                {isHouseholdAdmin && member.uid !== user?.uid && member.role !== 'admin' && (
                                  <button
                                    type="button"
                                    className="btn btn-outline text-red-600 border-red-600 hover:bg-red-50"
                                    disabled={memberActionUid === member.uid}
                                    onClick={() => handleRemoveMember(member.uid, member.email)}
                                  >
                                    {memberActionUid === member.uid ? 'Removing...' : 'Remove Member'}
                                  </button>
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-text-muted">No household members found.</p>
                      )}
                    </div>
                  </div>

                  {isHouseholdAdmin && (
                    <div className="card">
                      <div className="card-header pb-2 border-b border-border mb-4">
                        <h3 className="text-xl font-bold">Pending Invites</h3>
                      </div>
                      <div className="card-body">
                        {pendingInvites.length > 0 ? (
                          <ul className="divide-y divide-border">
                            {pendingInvites.map((invite) => (
                              <li
                                key={invite.id}
                                className="py-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"
                              >
                                <div>
                                  <p className="font-medium text-text-primary">{invite.email}</p>
                                  <p className="text-xs text-text-muted">Status: Pending</p>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800">
                                    Pending
                                  </span>
                                  <button
                                    type="button"
                                    className="btn btn-outline text-red-600 border-red-600 hover:bg-red-50"
                                    disabled={inviteActionId === invite.id}
                                    onClick={() => handleCancelInvite(invite.id, invite.email)}
                                  >
                                    {inviteActionId === invite.id ? 'Cancelling...' : 'Cancel Invite'}
                                  </button>
                                </div>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-text-muted">No pending invites.</p>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div id="notifications-tab" role="tabpanel">
            <div className="glass-panel">
              <h2 className="mb-6">Notification Preferences</h2>
              <form onSubmit={(e) => { e.preventDefault(); handleNotificationSave(); }}>
                <h3 className="mt-6 mb-4 font-semibold">Email Notifications</h3>
                <div className="space-y-4">
                  <Switch
                    checked={settings.email.lowBalance}
                    onChange={(c) => handleEmailToggle('lowBalance', c)}
                    label="Low balance alerts"
                  />
                  <Switch
                    checked={settings.email.largeTransaction}
                    onChange={(c) => handleEmailToggle('largeTransaction', c)}
                    label="Large transaction notifications"
                  />
                  <Switch
                    checked={settings.email.budgetThreshold}
                    onChange={(c) => handleEmailToggle('budgetThreshold', c)}
                    label="Budget threshold alerts"
                  />
                  <Switch
                    checked={settings.email.recurringBill}
                    onChange={(c) => handleEmailToggle('recurringBill', c)}
                    label="Upcoming recurring bills"
                  />
                  <Switch
                    checked={settings.email.syncFailure}
                    onChange={(c) => handleEmailToggle('syncFailure', c)}
                    label="Sync failure notifications"
                  />
                  <Switch
                    checked={settings.email.weeklyDigest}
                    onChange={(c) => handleEmailToggle('weeklyDigest', c)}
                    label="Weekly financial digest"
                  />
                  <Switch
                    checked={settings.email.supportUpdates}
                    onChange={(c) => handleEmailToggle('supportUpdates', c)}
                    label="Support ticket updates"
                  />
                  <Switch
                    checked={settings.email.subscriptionUpdates}
                    onChange={(c) => handleEmailToggle('subscriptionUpdates', c)}
                    label="Subscription updates"
                  />
                </div>

                <h3 className="mt-8 mb-4 font-semibold">SMS Notifications</h3>
                <div className="space-y-4">
                  <Switch
                    checked={settings.sms.lowBalance}
                    onChange={(c) => handleSmsToggle('lowBalance', c)}
                    label="Low balance alerts"
                  />
                  <Switch
                    checked={settings.sms.largeTransaction}
                    onChange={(c) => handleSmsToggle('largeTransaction', c)}
                    label="Large transaction notifications"
                  />
                  <Switch
                    checked={settings.sms.budgetThreshold}
                    onChange={(c) => handleSmsToggle('budgetThreshold', c)}
                    label="Budget threshold alerts"
                  />
                  <Switch
                    checked={settings.sms.recurringBill}
                    onChange={(c) => handleSmsToggle('recurringBill', c)}
                    label="Upcoming recurring bills"
                  />
                  <Switch
                    checked={settings.sms.syncFailure}
                    onChange={(c) => handleSmsToggle('syncFailure', c)}
                    label="Sync failure notifications"
                  />
                  <Switch
                    checked={settings.sms.weeklyDigest}
                    onChange={(c) => handleSmsToggle('weeklyDigest', c)}
                    label="Weekly financial digest"
                  />
                  <Switch
                    checked={settings.sms.supportUpdates}
                    onChange={(c) => handleSmsToggle('supportUpdates', c)}
                    label="Support ticket updates"
                  />
                  <Switch
                    checked={settings.sms.subscriptionUpdates}
                    onChange={(c) => handleSmsToggle('subscriptionUpdates', c)}
                    label="Subscription updates"
                  />
                </div>

                <h3 className="mt-8 mb-4 font-semibold">Push Notifications</h3>
                <div className="space-y-4">
                  <Switch
                    checked={settings.push.lowBalance}
                    onChange={(c) => handlePushToggle('lowBalance', c)}
                    label="Low balance alerts"
                  />
                  <Switch
                    checked={settings.push.largeTransaction}
                    onChange={(c) => handlePushToggle('largeTransaction', c)}
                    label="Large transaction notifications"
                  />
                  <Switch
                    checked={settings.push.budgetThreshold}
                    onChange={(c) => handlePushToggle('budgetThreshold', c)}
                    label="Budget threshold alerts"
                  />
                  <Switch
                    checked={settings.push.recurringBill}
                    onChange={(c) => handlePushToggle('recurringBill', c)}
                    label="Upcoming recurring bills"
                  />
                  <Switch
                    checked={settings.push.syncFailure}
                    onChange={(c) => handlePushToggle('syncFailure', c)}
                    label="Sync failure notifications"
                  />
                  <Switch
                    checked={settings.push.weeklyDigest}
                    onChange={(c) => handlePushToggle('weeklyDigest', c)}
                    label="Weekly financial digest"
                  />
                  <Switch
                    checked={settings.push.supportUpdates}
                    onChange={(c) => handlePushToggle('supportUpdates', c)}
                    label="Support ticket updates"
                  />
                  <Switch
                    checked={settings.push.subscriptionUpdates}
                    onChange={(c) => handlePushToggle('subscriptionUpdates', c)}
                    label="Subscription updates"
                  />
                </div>

                <h3 className="mt-8 mb-4 font-semibold">In-App Notifications</h3>
                <div className="space-y-4">
                  <Switch
                    checked={settings.inApp.lowBalance}
                    onChange={(c) => handleInAppToggle('lowBalance', c)}
                    label="Low balance alerts"
                  />
                  <Switch
                    checked={settings.inApp.largeTransaction}
                    onChange={(c) => handleInAppToggle('largeTransaction', c)}
                    label="Large transaction notifications"
                  />
                  <Switch
                    checked={settings.inApp.budgetThreshold}
                    onChange={(c) => handleInAppToggle('budgetThreshold', c)}
                    label="Budget threshold alerts"
                  />
                  <Switch
                    checked={settings.inApp.recurringBill}
                    onChange={(c) => handleInAppToggle('recurringBill', c)}
                    label="Upcoming recurring bills"
                  />
                  <Switch
                    checked={settings.inApp.syncFailure}
                    onChange={(c) => handleInAppToggle('syncFailure', c)}
                    label="Sync failure notifications"
                  />
                  <Switch
                    checked={settings.inApp.weeklyDigest}
                    onChange={(c) => handleInAppToggle('weeklyDigest', c)}
                    label="Weekly financial digest"
                  />
                  <Switch
                    checked={settings.inApp.supportUpdates}
                    onChange={(c) => handleInAppToggle('supportUpdates', c)}
                    label="Support ticket updates"
                  />
                  <Switch
                    checked={settings.inApp.subscriptionUpdates}
                    onChange={(c) => handleInAppToggle('subscriptionUpdates', c)}
                    label="Subscription updates"
                  />
                </div>

                <h3 className="mt-8 mb-4 font-semibold">Notification Triggers</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="trigger-low-balance" className="block text-sm font-medium text-text-secondary mb-1">
                      Low balance threshold
                    </label>
                    <div className="relative">
                      <span
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-text-muted"
                        style={{ width: '1.5rem', textAlign: 'center' }}
                      >
                        $
                      </span>
                      <input
                        type="number"
                        id="trigger-low-balance"
                        className="form-input w-full"
                        style={{ paddingLeft: '2.55rem' }}
                        value={settings.triggers.lowBalanceThreshold}
                        onChange={(e) => setSettings(s => ({ ...s, triggers: { ...s.triggers, lowBalanceThreshold: e.target.value } }))}
                        min="0"
                        step="1"
                        inputMode="decimal"
                      />
                    </div>
                    <p className="text-xs text-text-muted mt-1">
                      Send low balance alerts when any account falls below this amount.
                    </p>
                  </div>
                  <div>
                    <label htmlFor="trigger-large-transaction" className="block text-sm font-medium text-text-secondary mb-1">
                      Large transaction threshold
                    </label>
                    <div className="relative">
                      <span
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-text-muted"
                        style={{ width: '1.5rem', textAlign: 'center' }}
                      >
                        $
                      </span>
                      <input
                        type="number"
                        id="trigger-large-transaction"
                        className="form-input w-full"
                        style={{ paddingLeft: '2.55rem' }}
                        value={settings.triggers.largeTransactionThreshold}
                        onChange={(e) => setSettings(s => ({ ...s, triggers: { ...s.triggers, largeTransactionThreshold: e.target.value } }))}
                        min="0"
                        step="1"
                        inputMode="decimal"
                      />
                    </div>
                    <p className="text-xs text-text-muted mt-1">
                      Notify when a transaction exceeds this amount.
                    </p>
                  </div>
                </div>

                <h3 className="mt-8 mb-4 font-semibold">Quiet Hours</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="mb-4">
                    <label htmlFor="quiet-start" className="block text-sm font-medium text-text-secondary mb-1">Start Time</label>
                    <input
                      type="time"
                      id="quiet-start"
                      name="quiet-start"
                      className="form-input w-full"
                      value={settings.quietHours.start}
                      onChange={(e) => setSettings(s => ({ ...s, quietHours: { ...s.quietHours, start: e.target.value } }))}
                    />
                  </div>
                  <div className="mb-4">
                    <label htmlFor="quiet-end" className="block text-sm font-medium text-text-secondary mb-1">End Time</label>
                    <input
                      type="time"
                      id="quiet-end"
                      name="quiet-end"
                      className="form-input w-full"
                      value={settings.quietHours.end}
                      onChange={(e) => setSettings(s => ({ ...s, quietHours: { ...s.quietHours, end: e.target.value } }))}
                    />
                  </div>
                </div>

                <button type="submit" className="btn btn-primary mt-6" disabled={notificationSaving}>
                  {notificationSaving ? 'Saving...' : 'Save Preferences'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Privacy Tab */}
        {activeTab === 'privacy' && (
          <div id="privacy-tab" role="tabpanel">
            <div className="glass-panel">
              <h2 className="mb-6">Privacy Settings</h2>
              <form onSubmit={(e) => e.preventDefault()}>
                <div className="mb-4 space-y-4">
                  <Switch
                    checked={settings.privacy.dataSharing}
                    onChange={(c) => handlePrivacyToggle('dataSharing', c)}
                    label="Allow anonymized data sharing for service improvement"
                    description="Your personal information is never shared. Only aggregated, anonymized data may be used."
                  />
                  
                  <Switch
                    checked={settings.privacy.marketingEmails}
                    onChange={(c) => handlePrivacyToggle('marketingEmails', c)}
                    label="Receive marketing emails and product updates"
                  />
                </div>

                <h3 className="mt-8 mb-4 font-semibold">Data Management</h3>
                <div className="card mb-6">
                  <div className="card-body">
                    <h4 className="font-semibold mb-2">Export Your Data</h4>
                    <p className="mb-4 text-text-secondary">
                      Download a copy of all your account data in JSON format.
                    </p>
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={async () => {
                        try {
                          const response = await apiFetch('/users/export', {
                            method: 'POST',
                          });

                          const blob = await response.blob();
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `jualuma-export-${new Date().toISOString().split('T')[0]}.json`;
                          document.body.appendChild(a);
                          a.click();
                          a.remove();
                          window.URL.revokeObjectURL(url);
                        } catch (err) {
                          const message = err instanceof Error ? err.message : 'An error occurred during export.';
                          alert(message);
                        }
                      }}
                    >
                      Export Data
                    </button>
                  </div>
                </div>

                <div className="card mb-6">
                  <div className="card-body">
                    <h4 className="font-semibold mb-2">Delete Account</h4>
                    <p className="mb-4 text-text-secondary">
                      Permanently delete your account and all associated data. This action cannot be undone.
                    </p>
                    <button
                      type="button"
                      className="btn btn-outline text-red-600 border-red-600 hover:bg-red-50"
                      onClick={() => setShowDeleteModal(true)}
                    >
                      Delete Account
                    </button>
                  </div>
                </div>

                <button type="submit" className="btn btn-primary">Save Preferences</button>
              </form>
            </div>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div id="security-tab" role="tabpanel">
            <div className="glass-panel">
              <h2 className="mb-6">Security Settings</h2>

              <div className="card mb-6">
                <div className="card-header pb-2 border-b border-border mb-4">
                  <h3 className="text-xl font-bold">Change Password</h3>
                </div>
                <div className="card-body">
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    setPasswordError(null);
                    setPasswordSuccess(false);

                    if (newPassword !== confirmPassword) {
                      setPasswordError("Passwords do not match.");
                      return;
                    }

                    setPasswordLoading(true);
                    try {
                      await changePassword(currentPassword, newPassword, mfaCode);
                      setPasswordSuccess(true);
                      setCurrentPassword('');
                      setNewPassword('');
                      setConfirmPassword('');
                      setMfaCode('');
                    } catch (err) {
                      setPasswordError(err instanceof Error ? err.message : "Failed to update password.");
                    } finally {
                      setPasswordLoading(false);
                    }
                  }}>
                    {passwordError && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">{passwordError}</div>}
                    {passwordSuccess && <div className="mb-4 p-3 bg-emerald-100 text-emerald-700 rounded-lg text-sm">Password updated successfully.</div>}

                    <div className="mb-4">
                      <label htmlFor="current-password" className="block text-sm font-medium text-text-secondary mb-1">Current Password</label>
                      <input
                        type="password"
                        id="current-password"
                        className="form-input w-full"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        required
                      />
                    </div>
                    <div className="mb-4">
                      <label htmlFor="new-password" className="block text-sm font-medium text-text-secondary mb-1">New Password</label>
                      <input
                        type="password"
                        id="new-password"
                        className="form-input w-full"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        minLength={8}
                      />
                    </div>
                    <div className="mb-4">
                      <label htmlFor="confirm-new-password" className="block text-sm font-medium text-text-secondary mb-1">Confirm New Password</label>
                      <input
                        type="password"
                        id="confirm-new-password"
                        className="form-input w-full"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                      />
                    </div>

                    {profile?.mfa_enabled && (
                      <div className="mb-6">
                        <label htmlFor="mfa-code" className="block text-sm font-medium text-text-secondary mb-1">2FA Verification Code</label>
                        <input
                          type="text"
                          id="mfa-code"
                          className="form-input w-full"
                          placeholder="Enter 6-digit code"
                          value={mfaCode}
                          onChange={(e) => setMfaCode(e.target.value)}
                          required
                          maxLength={6}
                        />
                        <p className="mt-1 text-xs text-text-muted">Since 2FA is enabled, you must provide a valid code to change your password.</p>
                      </div>
                    )}

                    <button type="submit" className="btn btn-primary" disabled={passwordLoading}>
                      {passwordLoading ? "Updating..." : "Update Password"}
                    </button>
                  </form>
                </div>
              </div>

              <div className="card mb-6">
                <div className="card-header pb-2 border-b border-border mb-4">
                  <h3 className="text-xl font-bold">Two-Factor Authentication</h3>
                </div>
                <div className="card-body">
                  <p className="mb-4">
                    <strong>Status:</strong> <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800">Not Enabled</span>
                  </p>
                  <p className="mb-4 text-text-secondary">
                    Add an extra layer of security to your account by enabling two-factor authentication.
                  </p>
                </div>
                <div className="card-footer">
                  <button type="button" className="btn btn-primary">Enable 2FA</button>
                </div>
              </div>

              <div className="card">
                <div className="card-header pb-2 border-b border-border mb-4 flex justify-between items-center">
                  <h3 className="text-xl font-bold">Active Sessions</h3>
                  <button 
                    onClick={handleEndOtherSessions}
                    className="text-sm text-red-500 hover:text-red-600 font-medium"
                    disabled={sessions.filter(s => s.is_active && !s.is_current).length === 0}
                  >
                    End all other sessions
                  </button>
                </div>
                <div className="card-body overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="pb-2 text-text-secondary font-medium">Device & IP</th>
                        <th className="pb-2 text-text-secondary font-medium">Last Active</th>
                        <th className="pb-2 text-text-secondary font-medium">Status</th>
                        <th className="pb-2 text-text-secondary font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessionsLoading && (
                        <tr>
                          <td colSpan={4} className="py-6 text-center text-text-muted">
                            Loading sessions...
                          </td>
                        </tr>
                      )}
                      {!sessionsLoading && sessions.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-6 text-center text-text-muted">
                            No sessions found.
                          </td>
                        </tr>
                      )}
                      {!sessionsLoading && sessions.map((session) => (
                        <tr key={session.id} className="border-b border-border/50 last:border-0 hover:bg-surface-2 transition-colors">
                          <td className="py-3">
                            <div className="font-medium text-text-primary">
                              {session.device_type} {session.is_current && <span className="ml-2 px-1.5 py-0.5 bg-primary/10 text-primary text-[10px] rounded font-bold uppercase">Current</span>}
                            </div>
                            <div className="text-xs text-text-muted">{session.ip_address || 'Unknown IP'}</div>
                          </td>
                          <td className="py-3 text-sm text-text-primary">
                            {new Date(session.last_active).toLocaleString()}
                          </td>
                          <td className="py-3 text-sm">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${session.is_active 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : 'bg-gray-100 text-gray-800'}`}>
                              {session.is_active ? 'Active' : 'Ended'}
                            </span>
                          </td>
                          <td className="py-3">
                            {session.is_active && !session.is_current && (
                              <button
                                onClick={() => handleEndSession(session.id)}
                                className="text-red-500 hover:text-red-600 text-xs font-medium"
                                disabled={terminatingSessionId === session.id}
                              >
                                {terminatingSessionId === session.id ? 'Ending...' : 'End Session'}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay">
          <div className="modal-content max-w-md">
            <div className="modal-header">
              <h3>Delete Account</h3>
              <button onClick={() => setShowDeleteModal(false)} className="modal-close" aria-label="Close modal">×</button>
            </div>
            <div>
              <p className="mb-4">
                Are you sure you want to delete your account? This action cannot be undone.
              </p>
              <p className="mb-4 text-text-secondary">
                All your data will be permanently deleted, including:
              </p>
              <ul className="mb-6 pl-6 list-disc text-text-secondary space-y-1">
                <li>All linked accounts and transaction history</li>
                <li>Budget configurations and categories</li>
                <li>AI chat history</li>
                <li>All preferences and settings</li>
              </ul>
              <form onSubmit={async (e) => {
                e.preventDefault();
                if (deleteConfirm === 'DELETE') {
                  try {
                    await apiFetch('/users/me', {
                      method: 'DELETE',
                    });
                    window.location.href = '/login';
                  } catch (err) {
                    const message = err instanceof Error ? err.message : 'Failed to delete account. Please try again.';
                    alert(message);
                  }
                }
              }}>
                <div className="mb-6">
                  <label htmlFor="delete-confirm" className="form-label">
                    Type &quot;DELETE&quot; to confirm:
                  </label>
                  <input
                    type="text"
                    id="delete-confirm"
                    className="input"
                    value={deleteConfirm}
                    onChange={(e) => setDeleteConfirm(e.target.value)}
                    required
                  />
                </div>
                <div className="flex gap-4">
                  <button
                    type="submit"
                    className="btn btn-danger flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={deleteConfirm !== 'DELETE'}
                  >
                    Delete Account
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline flex-1"
                    onClick={() => setShowDeleteModal(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
