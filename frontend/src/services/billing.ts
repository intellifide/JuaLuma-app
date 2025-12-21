import { apiFetch } from './auth'

export interface SubscriptionTier {
    code: string
    name: string
    description: string | null
    price_id: string | null
    amount_cents: number
    currency: string
    interval: string
    features: string[]
}

export const getPlans = async (): Promise<SubscriptionTier[]> => {
    const response = await apiFetch('/billing/plans')
    return response.json()
}

export const createCheckoutSession = async (planType: string, returnUrl: string): Promise<string> => {
    const response = await apiFetch('/billing/checkout/session', {
        method: 'POST',
        body: JSON.stringify({ plan_type: planType, return_url: returnUrl }),
    })
    const data = await response.json()
    return data.url
}

export const createBillingPortalSession = async (returnUrl: string): Promise<string> => {
    const response = await apiFetch('/billing/portal', {
        method: 'POST',
        body: JSON.stringify({ return_url: returnUrl }),
    })
    const data = await response.json()
    return data.url
}

export const verifyCheckoutSession = async (sessionId: string): Promise<void> => {
    await apiFetch('/billing/checkout/verify', {
        method: 'POST',
        body: JSON.stringify({ session_id: sessionId }),
    })
}
