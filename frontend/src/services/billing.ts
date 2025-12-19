import { apiFetch } from './auth'

export const createCheckoutSession = async (planType: string, returnUrl: string): Promise<string> => {
    const response = await apiFetch('/billing/checkout/session', {
        method: 'POST',
        body: JSON.stringify({ plan_type: planType, return_url: returnUrl }),
    })
    const data = await response.json()
    return data.url
}
