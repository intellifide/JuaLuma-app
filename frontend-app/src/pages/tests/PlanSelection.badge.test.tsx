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

import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import { PlanSelection } from '../PlanSelection'

const getPlansMock = vi.fn().mockResolvedValue([
  {
    code: 'free',
    name: 'Free',
    description: 'Free plan',
    price_id: null,
    amount_cents: 0,
    currency: 'USD',
    interval: 'month',
    features: ['Feature A'],
  },
  {
    code: 'pro_monthly',
    name: 'Pro',
    description: 'Pro plan',
    price_id: 'price_pro',
    amount_cents: 2500,
    currency: 'USD',
    interval: 'month',
    features: ['Feature B'],
  },
])

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { uid: 'user-1' },
    profile: { status: 'pending_plan_selection' },
    loading: false,
    refetchProfile: vi.fn(),
  }),
}))

vi.mock('../../services/billing', () => ({
  getPlans: () => getPlansMock(),
  createCheckoutSession: vi.fn(),
}))

vi.mock('../../services/auth', () => ({
  selectFreePlan: vi.fn(),
}))

vi.mock('../../services/eventTracking', () => ({
  eventTracking: {
    trackSignupFunnel: vi.fn(),
  },
  SignupFunnelEvent: {
    PLAN_SELECTION_VIEWED: 'PLAN_SELECTION_VIEWED',
    FREE_PLAN_SELECTED: 'FREE_PLAN_SELECTED',
    PAID_PLAN_SELECTED: 'PAID_PLAN_SELECTED',
    CHECKOUT_STARTED: 'CHECKOUT_STARTED',
    CHECKOUT_FAILED: 'CHECKOUT_FAILED',
  },
}))

describe('PlanSelection badge visibility', () => {
  it('renders POPULAR badge in a card with overflow-visible to prevent clipping', async () => {
    render(
      <MemoryRouter initialEntries={['/plan-selection']}>
        <Routes>
          <Route path="/plan-selection" element={<PlanSelection />} />
        </Routes>
      </MemoryRouter>,
    )

    const badge = await screen.findByText('POPULAR')
    const card = badge.closest('.glass-panel')

    expect(card).not.toBeNull()
    expect(card).toHaveClass('overflow-visible')
  })
})
