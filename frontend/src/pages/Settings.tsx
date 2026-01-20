// Core Purpose: Account settings page covering profile, subscription, household, and security preferences.
// Last Updated 2026-01-20 03:25 CST by Antigravity - standardize button styling and card layouts

import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { changePassword, apiFetch } from '../services/auth';
import { householdService } from '../services/householdService';
import type { Household } from '../types/household';

// Render the account settings experience with tabbed sections.
export const Settings = () => {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [household, setHousehold] = useState<Household | null>(null);
  const [householdLoading, setHouseholdLoading] = useState(false);
  const [householdError, setHouseholdError] = useState<string | null>(null);
  const [memberActionUid, setMemberActionUid] = useState<string | null>(null);
  const [inviteActionId, setInviteActionId] = useState<string | null>(null);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Billing state
  const [invoices, setInvoices] = useState<any[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [billingPage, setBillingPage] = useState(1);
  const billingPageSize = 5;

  const isRestrictedMember = Boolean(
    profile?.household_member &&
    !['admin', 'owner'].includes(profile?.household_member?.role || '')
  );

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
            const data = await response.json();
            setInvoices(data);
          }
        } catch (error) {
          console.error("Failed to load invoices", error);
        } finally {
          setInvoicesLoading(false);
        }
      };
      void loadInvoices();
    }
  }, [activeTab, loadHousehold]);

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
        <h1 className="mb-8 text-3xl font-bold">Account Settings</h1>

        <div className="tabs mb-8">
          <ul className="flex space-x-1 border-b border-border" role="tablist">
            {tabs.map(tab => (
              <li key={tab.id}>
                <button
                  className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${activeTab === tab.id
                    ? 'border-royal-purple text-royal-purple'
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
              <form onSubmit={(e) => e.preventDefault()}>
                <div className="mb-4">
                  <label htmlFor="profile-name" className="block text-sm font-medium text-text-secondary mb-1">Full Name</label>
                  <input type="text" id="profile-name" name="name" className="form-input w-full" defaultValue={user?.displayName || "John Doe"} required />
                </div>

                <div className="mb-4">
                  <label htmlFor="profile-email" className="block text-sm font-medium text-text-secondary mb-1">Email Address</label>
                  <input type="email" id="profile-email" name="email" className="form-input w-full" defaultValue={user?.email || "john.doe@example.com"} required />
                </div>

                <div className="mb-4">
                  <label htmlFor="profile-phone" className="block text-sm font-medium text-text-secondary mb-1">Phone Number (Optional)</label>
                  <input type="tel" id="profile-phone" name="phone" className="form-input w-full" defaultValue="+1 (555) 123-4567" />
                </div>

                {/* Preferred Currency Section Disabled - Future Feature */}
                {/* <div className="mb-6">
                  <label htmlFor="profile-currency" className="block text-sm font-medium text-text-secondary mb-1">Preferred Currency</label>
                  <select id="profile-currency" name="currency" className="form-select w-full">
                    <option value="USD">USD - US Dollar</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="GBP">GBP - British Pound</option>
                    <option value="CAD">CAD - Canadian Dollar</option>
                    <option value="AUD">AUD - Australian Dollar</option>
                  </select>
                </div> */}

                <button type="submit" className="btn btn-primary">Save Changes</button>
              </form>
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
                        <p className="mt-4 p-2 bg-royal-purple/10 rounded text-sm">
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
                            .map((invoice: any) => (
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
                                  <a href={invoice.invoice_pdf} target="_blank" rel="noopener noreferrer" className="text-royal-purple hover:underline text-sm font-medium">
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
                                <p className="font-medium text-text-primary">{member.email || member.uid}</p>
                                {member.email && (
                                  <p className="text-xs text-text-muted">{member.uid}</p>
                                )}
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
              <form onSubmit={(e) => e.preventDefault()}>
                <h3 className="mt-6 mb-4 font-semibold">Email Notifications</h3>
                <div className="space-y-3">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" name="email-low-balance" className="form-checkbox" defaultChecked />
                    <span>Low balance alerts</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" name="email-large-transaction" className="form-checkbox" defaultChecked />
                    <span>Large transaction notifications</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" name="email-budget-threshold" className="form-checkbox" defaultChecked />
                    <span>Budget threshold alerts</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" name="email-recurring-bill" className="form-checkbox" defaultChecked />
                    <span>Upcoming recurring bills</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" name="email-sync-failure" className="form-checkbox" defaultChecked />
                    <span>Sync failure notifications</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" name="email-weekly-digest" className="form-checkbox" />
                    <span>Weekly financial digest</span>
                  </label>
                </div>

                <h3 className="mt-8 mb-4 font-semibold">SMS Notifications</h3>
                <div className="space-y-3">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" name="sms-low-balance" className="form-checkbox" />
                    <span>Low balance alerts</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" name="sms-large-transaction" className="form-checkbox" />
                    <span>Large transaction notifications</span>
                  </label>
                </div>

                <h3 className="mt-8 mb-4 font-semibold">Quiet Hours</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="mb-4">
                    <label htmlFor="quiet-start" className="block text-sm font-medium text-text-secondary mb-1">Start Time</label>
                    <input type="time" id="quiet-start" name="quiet-start" className="form-input w-full" defaultValue="22:00" />
                  </div>
                  <div className="mb-4">
                    <label htmlFor="quiet-end" className="block text-sm font-medium text-text-secondary mb-1">End Time</label>
                    <input type="time" id="quiet-end" name="quiet-end" className="form-input w-full" defaultValue="08:00" />
                  </div>
                </div>

                <button type="submit" className="btn btn-primary mt-6">Save Preferences</button>
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
                <div className="mb-4">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" name="data-sharing" className="form-checkbox" />
                    <span>Allow anonymized data sharing for service improvement</span>
                  </label>
                  <p className="mt-1 text-sm text-text-muted ml-6">
                    Your personal information is never shared. Only aggregated, anonymized data may be used.
                  </p>
                </div>

                <div className="mb-6">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" name="marketing-emails" className="form-checkbox" />
                    <span>Receive marketing emails and product updates</span>
                  </label>
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
                <div className="card-header pb-2 border-b border-border mb-4">
                  <h3 className="text-xl font-bold">Active Sessions</h3>
                </div>
                <div className="card-body overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="pb-2 text-text-secondary font-medium">Device</th>
                        <th className="pb-2 text-text-secondary font-medium">Location</th>
                        <th className="pb-2 text-text-secondary font-medium">Last Active</th>
                        <th className="pb-2 text-text-secondary font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-text-muted">
                          Session management coming soon.
                        </td>
                      </tr>
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
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Delete Account</h3>
              <button onClick={() => setShowDeleteModal(false)} className="text-text-muted hover:text-text-primary text-2xl" aria-label="Close modal">×</button>
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
