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

/**
 * CORE PURPOSE: Event Tracking Service for unified analytics.
 * LAST MODIFIED: 2025-12-21 17:25 CST
 */

// Event names for the signup funnel
export enum SignupFunnelEvent {
    SIGNUP_STARTED = 'signup_started',
    SIGNUP_COMPLETED = 'signup_completed',
    EMAIL_VERIFICATION_STARTED = 'email_verification_started',
    EMAIL_VERIFICATION_COMPLETED = 'email_verification_completed',
    PLAN_SELECTION_VIEWED = 'plan_selection_viewed',
    FREE_PLAN_SELECTED = 'free_plan_selected',
    PAID_PLAN_SELECTED = 'paid_plan_selected',
    CHECKOUT_STARTED = 'checkout_started',
    CHECKOUT_COMPLETED = 'checkout_completed',
    CHECKOUT_FAILED = 'checkout_failed',
    DASHBOARD_REACHED = 'dashboard_reached',
}

export interface EventProperties {
    [key: string]: string | number | boolean | undefined
}

class EventTrackingService {
    private isEnabled: boolean = true

    /**
     * Track an event with optional properties
     */
    track(eventName: string, properties?: EventProperties): void {
        if (!this.isEnabled) return

        // Log to console in development
        if (import.meta.env.DEV) {
            console.log('[Analytics Event]', eventName, properties)
        }

        // Send to Google Analytics if available
        if (typeof window !== 'undefined' && 'gtag' in window) {
            const gtag = (window as unknown as { gtag: (...args: unknown[]) => void }).gtag
            gtag('event', eventName, properties)
        }

        // Add other analytics providers here (Mixpanel, Amplitude, etc.)
        // Example:
        // if (typeof window !== 'undefined' && 'mixpanel' in window) {
        //     (window as any).mixpanel.track(eventName, properties)
        // }
    }

    /**
     * Track a page view
     */
    trackPageView(pagePath: string, pageTitle?: string): void {
        this.track('page_view', {
            page_path: pagePath,
            page_title: pageTitle || document.title,
        })
    }

    /**
     * Track user signup funnel progression
     */
    trackSignupFunnel(event: SignupFunnelEvent, properties?: EventProperties): void {
        const timestamp = new Date().toISOString()
        this.track(event, {
            ...properties,
            funnel: 'signup',
            timestamp,
        })
    }

    /**
     * Identify a user (call after successful signup/login)
     */
    identify(userId: string, traits?: EventProperties): void {
        if (!this.isEnabled) return

        if (import.meta.env.DEV) {
            console.log('[Analytics Identify]', userId, traits)
        }

        // Google Analytics user ID
        if (typeof window !== 'undefined' && 'gtag' in window) {
            const gtag = (window as unknown as { gtag: (...args: unknown[]) => void }).gtag
            gtag('config', 'GA_MEASUREMENT_ID', {
                user_id: userId,
            })
            if (traits) {
                gtag('set', 'user_properties', traits)
            }
        }

        // Add other analytics providers
        // Example:
        // if (typeof window !== 'undefined' && 'mixpanel' in window) {
        //     (window as any).mixpanel.identify(userId)
        //     if (traits) {
        //         (window as any).mixpanel.people.set(traits)
        //     }
        // }
    }

    /**
     * Enable or disable tracking
     */
    setEnabled(enabled: boolean): void {
        this.isEnabled = enabled
    }
}

// Export a singleton instance
export const eventTracking = new EventTrackingService()
