import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { changePassword } from '../services/auth';

export const Settings = () => {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const tabs = [
    { id: 'profile', label: 'Profile' },
    { id: 'subscription', label: 'Subscription' },
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

                <div className="mb-6">
                  <label htmlFor="profile-currency" className="block text-sm font-medium text-text-secondary mb-1">Preferred Currency</label>
                  <select id="profile-currency" name="currency" className="form-select w-full">
                    <option value="USD">USD - US Dollar</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="GBP">GBP - British Pound</option>
                    <option value="CAD">CAD - Canadian Dollar</option>
                    <option value="AUD">AUD - Australian Dollar</option>
                  </select>
                </div>

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
              <div className="card mb-6">
                <div className="card-header pb-2 border-b border-border mb-4">
                  <h3 className="text-xl font-bold">Current Plan: {profile?.plan ? profile.plan.charAt(0).toUpperCase() + profile.plan.slice(1) : 'Free'}</h3>
                </div>
                <div className="card-body">
                  <p className="mb-2"><strong>Billing:</strong> {profile?.plan === 'pro' ? '$20.00/month' : 'Free'}</p>
                  {profile?.subscriptions?.[0]?.renew_at && (
                    <p className="mb-2"><strong>Next Billing Date:</strong> {new Date(profile.subscriptions[0].renew_at).toLocaleDateString()}</p>
                  )}
                  <p className="mb-2"><strong>Status:</strong> <span className={`px-2 py-0.5 rounded text-xs font-semibold ${profile?.subscription_status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-800'}`}>{profile?.subscription_status || 'Inactive'}</span></p>
                  <p className="mb-2"><strong>AI Queries:</strong> {profile?.subscriptions?.[0]?.ai_quota_used || 0}/75 used today</p>

                  {profile?.plan === 'pro' && (
                    <p className="mt-4 p-2 bg-royal-purple/10 rounded text-sm">
                      <strong>Tax Note:</strong> Billing includes Texas sales tax on 80% of subscription fee (20% exemption for data processing services)
                    </p>
                  )}
                </div>
                <div className="card-footer mt-6 flex gap-2">
                  <button onClick={async () => {
                    try {
                      const apiBase = import.meta.env.VITE_API_BASE_URL || '/api';
                      if (!user) {
                        alert('You must be signed in to manage billing.');
                        return;
                      }

                      const token = await user.getIdToken();
                      const response = await fetch(`${apiBase}/api/billing/portal`, {
                        method: 'POST',
                        headers: {
                          'Authorization': `Bearer ${token}`,
                          'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ return_url: window.location.href })
                      });

                      if (response.ok) {
                        const data = await response.json();
                        window.location.href = data.url;
                      } else {
                        alert('Failed to redirect to billing portal.');
                      }
                    } catch (e) {
                      console.error("Billing portal error:", e);
                      alert('An error occurred opening the billing portal.');
                    }
                  }} className="btn btn-secondary">Manage Subscription</button>
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
                        <th className="pb-2 text-text-secondary font-medium">Tax</th>
                        <th className="pb-2 text-text-secondary font-medium">Status</th>
                        <th className="pb-2 text-text-secondary font-medium">Invoice</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-text-muted">
                          Billing history is available providing you have an active subscription. Click "Manage Subscription" above to view invoices in the secure customer portal.
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
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
                          const apiBase = import.meta.env.VITE_API_BASE_URL || '/api';
                          const token = await user?.getIdToken();
                          const response = await fetch(`${apiBase}/api/users/export`, {
                            method: 'POST',
                            headers: {
                              'Authorization': `Bearer ${token}`
                            }
                          });

                          if (response.ok) {
                            const blob = await response.blob();
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `jualuma-export-${new Date().toISOString().split('T')[0]}.json`;
                            document.body.appendChild(a);
                            a.click();
                            a.remove();
                          } else {
                            alert('Failed to export data.');
                          }
                        } catch (err) {
                          console.error('Export error:', err);
                          alert('An error occurred during export.');
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-surface-1 rounded-2xl shadow-xl border border-border max-w-md w-full mx-4 overflow-hidden">
            <div className="p-6 border-b border-border flex justify-between items-center">
              <h2 className="text-xl font-bold">Delete Account</h2>
              <button onClick={() => setShowDeleteModal(false)} className="text-text-muted hover:text-text-primary text-2xl" aria-label="Close modal">×</button>
            </div>
            <div className="p-6">
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
                    const apiBase = import.meta.env.VITE_API_BASE_URL || '/api';
                    const token = await user?.getIdToken();
                    const response = await fetch(`${apiBase}/api/users/me`, {
                      method: 'DELETE',
                      headers: {
                        'Authorization': `Bearer ${token}`
                      }
                    });

                    if (response.ok) {
                      window.location.href = '/login';
                    } else {
                      alert('Failed to delete account. Please try again.');
                    }
                  } catch (err) {
                    console.error('Delete account error:', err);
                    alert('An error occurred. Please try again.');
                  }
                }
              }}>
                <div className="mb-6">
                  <label htmlFor="delete-confirm" className="block text-sm font-medium mb-1">
                    Type &quot;DELETE&quot; to confirm:
                  </label>
                  <input
                    type="text"
                    id="delete-confirm"
                    className="form-input w-full"
                    value={deleteConfirm}
                    onChange={(e) => setDeleteConfirm(e.target.value)}
                    required
                  />
                </div>
                <div className="flex gap-4">
                  <button
                    type="submit"
                    className="btn bg-red-600 text-white hover:bg-red-700 flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
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

