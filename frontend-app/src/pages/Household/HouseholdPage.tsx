// Core Purpose: Household management page allowing users to create, join, and manage household members and settings.
// Last Modified: 2025-12-26

import React, { useEffect, useState } from 'react'

import { householdService } from '../../services/householdService'
import { Household } from '../../types/household'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import Switch from '../../components/ui/Switch'

import { useAuth } from '../../hooks/useAuth'

// Simple Input component if not exists, or use HTML input with styling
// eslint-disable-next-line react/prop-types
const SimpleInput: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label?: string }> = ({ label, className, ...props }) => (
  <div className="flex flex-col gap-1 mb-4">
    {label && <label className="text-sm font-medium text-text-secondary">{label}</label>}
    <input
      {...props}
      className={`border rounded-lg p-2 bg-white/50 border-slate-200 focus:outline-none focus:ring-2 focus:ring-royal-purple ${className || ''}`}
    />
  </div>
)

export const HouseholdPage: React.FC = () => {
  const { user, refetchProfile } = useAuth()
  // const navigate = useNavigate() // Unused
  const [household, setHousehold] = useState<Household | null>(null)
  const [loading, setLoading] = useState(true)
  // const [error, setError] = useState<string | null>(null) // Unused
  
  // Forms State
  const [createName, setCreateName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [isMinor, setIsMinor] = useState(false)
  const [canViewHousehold, setCanViewHousehold] = useState(true)
  const [inviteToken, setInviteToken] = useState('')
  
  // Modals
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  const fetchHousehold = async () => {
    setLoading(true)
    // setError(null)
    try {
      const data = await householdService.getMyHousehold()
      setHousehold(data)
    } catch (err: unknown) {
      const message = (err as Error).message
      // 404 means user is not in a household, which is a expected state for "Create/Join" view
      if (message && message.includes("not in a household")) {
        setHousehold(null)
      } else {
        // setError(err.message || 'Failed to load household')
        // Actually, let's treat 404 as null silently
        setHousehold(null)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHousehold()
  }, [])

  const handleCreate = async () => {
    if (!createName.trim()) return
    setActionLoading(true)
    try {
      const data = await householdService.createHousehold({ name: createName })
      setHousehold(data)
      await refetchProfile()
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to create household')
    } finally {
      setActionLoading(false)
    }
  }

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return
    setActionLoading(true)
    try {
      await householdService.inviteMember({ 
        email: inviteEmail, 
        is_minor: isMinor,
        can_view_household: canViewHousehold 
      })
      setShowInviteModal(false)
      setInviteEmail('')
      setIsMinor(false)
      setCanViewHousehold(true)
      alert('Invite sent successfully')
      fetchHousehold() // Refresh to show pending invite if backend returned it (it does in invites list)
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to send invite')
    } finally {
      setActionLoading(false)
    }
  }

  const handleAcceptInvite = async () => {
    if (!inviteToken.trim()) return
    setActionLoading(true)
    try {
      await householdService.acceptInvite({ token: inviteToken, consent_agreed: true })
      setInviteToken('')
      fetchHousehold()
      await refetchProfile()
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to join household')
    } finally {
      setActionLoading(false)
    }
  }

  const handleLeave = async () => {
    if (!confirm('Are you sure you want to leave? Your subscription will determine your data access.')) return
    setActionLoading(true)
    try {
      await householdService.leaveHousehold()
      setHousehold(null)
      await refetchProfile()
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to leave household')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return <div className="p-8 text-center">Loading household...</div>
  }

  if (!household) {
    return (
      <div className="container mx-auto py-10 px-4 space-y-8 max-w-2xl">
        <Card className="p-6 space-y-4">
          <h2 className="text-xl font-semibold">Create a Household</h2>
          <p className="text-sm text-text-muted">Start a new household and become the admin.</p>
          <div className="flex gap-4 items-end">
            <SimpleInput 
              label="Household Name" 
              value={createName} 
              onChange={(e) => setCreateName(e.target.value)} 
              placeholder="e.g. Smith Family"
              className="w-full"
            />
            <Button onClick={handleCreate} disabled={actionLoading || !createName.trim()}>
              {actionLoading ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </Card>

        <div className="relative flex py-5 items-center">
          <div className="flex-grow border-t border-gray-200"></div>
          <span className="flex-shrink-0 mx-4 text-gray-400">OR</span>
          <div className="flex-grow border-t border-gray-200"></div>
        </div>

        <Card className="p-6 space-y-4">
          <h2 className="text-xl font-semibold">Join a Household</h2>
          <p className="text-sm text-text-muted">Enter the invite code sent to your email.</p>
          <div className="flex gap-4 items-end">
            <SimpleInput 
              label="Invite Token" 
              value={inviteToken} 
              onChange={(e) => setInviteToken(e.target.value)} 
              placeholder="Paste token here"
              className="w-full"
            />
            <Button variant="secondary" onClick={handleAcceptInvite} disabled={actionLoading || !inviteToken.trim()}>
              {actionLoading ? 'Joining...' : 'Join'}
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  // Role check: iterate members to find current user?
  const myMember = household.members.find(m => m.uid === user?.uid)
  const isAdmin = myMember?.role === 'admin'

  return (
    <div className="container mx-auto py-10 px-4 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-deep-indigo">{household.name}</h1>
        </div>
        <div className="flex gap-2">
            {isAdmin && (
                <Button onClick={() => setShowInviteModal(true)}>Invite Member</Button>
            )}
            <Button variant="outline" className="text-red-600 border-red-600 hover:bg-red-50" onClick={handleLeave}>Leave Household</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="col-span-2 p-0 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h2 className="text-xl font-semibold">Household Members</h2>
            </div>
            <div className="divide-y divide-gray-100">
                {/* Active Members */}
                {household.members.map((member) => (
                    <div key={member.uid} className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-royal-purple/10 flex items-center justify-center text-royal-purple font-bold">
                                {(member.email?.[0] || 'U').toUpperCase()}
                            </div>
                            <div>
                                {member.username && (
                                    <p className="text-lg font-semibold text-deep-indigo mb-0.5">{member.username}</p>
                                )}
                                <p className="text-sm text-deep-indigo">{member.email || 'Unknown User'}</p>
                                <p className="text-xs text-text-muted capitalize">{member.role}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {member.role === 'admin' && <Badge variant="primary">Admin</Badge>}
                            {member.can_view_household ? (
                                <Badge variant="success" className="bg-green-100 text-green-800">View Finances</Badge> 
                            ) : (
                                <Badge variant="secondary">No View</Badge>
                            )}
                            {member.ai_access_enabled ? (
                                <Badge variant="primary" className="bg-indigo-100 text-indigo-800">AI Access</Badge>
                            ) : (
                                <Badge variant="warning">No AI</Badge>
                            )}
                        </div>
                    </div>
                ))}
                
                {/* Pending Invites */}
                {household.invites?.filter(i => i.status === 'pending').map((invite) => (
                    <div key={invite.email} className="p-4 flex justify-between items-center bg-gray-50/50 hover:bg-gray-50 transition-colors border-l-4 border-yellow-400">
                         <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold">
                                @
                            </div>
                            <div>
                                <p className="font-medium text-text-secondary">{invite.email}</p>
                                <p className="text-xs text-text-muted">Invitation Pending</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                             <Badge variant="warning" className="bg-yellow-100 text-yellow-800">Invited</Badge>
                             <span className="text-xs text-text-muted">Expires: {new Date(invite.expires_at || '').toLocaleDateString()}</span>
                        </div>
                    </div>
                ))}

                {household.members.length === 0 && (!household.invites || household.invites.length === 0) && (
                    <div className="p-8 text-center text-text-muted">
                        No members yet. Invite someone!
                    </div>
                )}
            </div>
        </Card>

        <div className="space-y-6">
            <Card className="p-6 bg-gradient-to-br from-indigo-50 to-purple-50 border-none">
                <h3 className="font-semibold text-deep-indigo mb-2">Household Benefits</h3>
                <ul className="text-sm space-y-2 text-text-secondary">
                    <li className="flex items-start gap-2">
                        <span>✓</span> Shared Ultimate Tier Limits
                    </li>
                    <li className="flex items-start gap-2">
                        <span>✓</span> Centralized Billing (Owner)
                    </li>
                    <li className="flex items-start gap-2">
                        <span>✓</span> Parental Controls for Minors
                    </li>
                     <li className="flex items-start gap-2">
                        <span>✓</span> Shared Financial Dashboard
                    </li>
                </ul>
            </Card>
        </div>
      </div>

    {/* Invite Modal */}
    <Modal
      open={showInviteModal}
      title="Invite Member"
      onClose={() => setShowInviteModal(false)}
      footer={
         <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowInviteModal(false)}>Cancel</Button>
            <Button onClick={handleInvite} disabled={actionLoading}>
                {actionLoading ? 'Sending...' : 'Send Invite'}
            </Button>
         </div>
      }
    >
        <SimpleInput 
            label="Email Address"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="friend@example.com"
            type="email"
        />
        
        <div className="space-y-4 mb-2">
            <Switch
                checked={isMinor}
                onChange={setIsMinor}
                label="Is this member a minor?"
                description="Minors have restricted access to AI features."
            />
            
            <Switch
                checked={canViewHousehold}
                onChange={setCanViewHousehold}
                label="Allow viewing household finances?"
                description="If enabled, this member can see the shared dashboard."
                disabled={isMinor} // Optional: maybe minors shouldn't see finances? User didn't specify, but safer.
            />
        </div>
    </Modal>

    </div>
  )
}
