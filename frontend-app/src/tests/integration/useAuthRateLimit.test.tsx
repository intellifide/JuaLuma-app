/*
 * Copyright (c) 2026 Intellifide, LLC.
 * Licensed under PolyForm Noncommercial License 1.0.0.
 * See "/legal/license" for full license terms.
 *
 * COMMUNITY RIGHTS:
 * - You CAN modify this code for personal use.
 * - You CAN build and share widgets/plugins for the ecosystem.
 *
 * RESTRICTIONS:
 * - You CANNOT resell, repackage, or distribute this application for a fee.
 * - You CANNOT use this application for commercial enterprise purposes.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider, useAuth } from '../../hooks/useAuth'

const mockOnAuthStateChanged = vi.fn()
const mockApiFetch = vi.fn()
const mockClearCachedToken = vi.fn()

const mockUser = {
  uid: 'user-123',
  email: 'user@example.com',
  emailVerified: false,
  displayName: null,
  isAnonymous: false,
  getIdToken: vi.fn(async () => 'token'),
}

let currentUser: typeof mockUser | null = mockUser

vi.mock('../../services/gcp_auth_driver', () => ({
  auth: {
    get currentUser() {
      return currentUser
    },
  },
  onAuthStateChanged: (...args: unknown[]) => mockOnAuthStateChanged(...args),
}))

vi.mock('../../services/auth', () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
  clearCachedToken: (...args: unknown[]) => mockClearCachedToken(...args),
  completeBackendLogin: vi.fn(),
  getIdToken: vi.fn(async () => 'token'),
  getPasskeyAuthOptions: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  resetPassword: vi.fn(),
  signup: vi.fn(),
}))

vi.mock('../../services/passkey', () => ({
  getPasskeyAssertion: vi.fn(),
}))

const Probe = () => {
  const { profile, error, refetchProfile } = useAuth()

  return (
    <div>
      <p data-testid="status">{profile?.status ?? 'none'}</p>
      <p data-testid="error">{error ?? ''}</p>
      <button type="button" onClick={() => void refetchProfile()}>
        Refetch
      </button>
    </div>
  )
}

describe('AuthProvider profile hydration guards', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('VITE_LOCAL_AUTH_BYPASS', 'false')
    currentUser = mockUser
    mockOnAuthStateChanged.mockImplementation((_: unknown, listener: (user: typeof mockUser | null) => void) => {
      listener(currentUser)
      return vi.fn()
    })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('subscribes to auth state once and hydrates profile once', async () => {
    mockApiFetch.mockResolvedValue(
      new Response(JSON.stringify({ user: { uid: 'user-123', status: 'pending_verification' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    render(
      <MemoryRouter>
        <AuthProvider>
          <Probe />
        </AuthProvider>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('pending_verification')
    })

    expect(mockOnAuthStateChanged).toHaveBeenCalledTimes(1)
    expect(mockApiFetch).toHaveBeenCalledTimes(1)
    expect(mockApiFetch).toHaveBeenCalledWith('/auth/profile')
  })

  it('does not immediately retry profile after a 429 response', async () => {
    const rateLimitError = Object.assign(new Error('Too many requests.'), { status: 429 })
    mockApiFetch.mockRejectedValueOnce(rateLimitError)

    render(
      <MemoryRouter>
        <AuthProvider>
          <Probe />
        </AuthProvider>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('Too many requests.')
    })

    expect(mockApiFetch).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'Refetch' }))

    await new Promise((resolve) => setTimeout(resolve, 30))
    expect(mockApiFetch).toHaveBeenCalledTimes(1)
  })
})
