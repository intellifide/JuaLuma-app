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

import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

const ensureStorage = (name: 'localStorage' | 'sessionStorage') => {
    const existing = globalThis[name] as Storage | undefined
    if (
        existing &&
        typeof existing.getItem === 'function' &&
        typeof existing.setItem === 'function' &&
        typeof existing.removeItem === 'function' &&
        typeof existing.clear === 'function'
    ) {
        return
    }

    const store = new Map<string, string>()
    const polyfill: Storage = {
        get length() {
            return store.size
        },
        clear() {
            store.clear()
        },
        getItem(key: string) {
            return store.has(key) ? store.get(key)! : null
        },
        key(index: number) {
            return Array.from(store.keys())[index] ?? null
        },
        removeItem(key: string) {
            store.delete(key)
        },
        setItem(key: string, value: string) {
            store.set(key, String(value))
        },
    }

    Object.defineProperty(globalThis, name, {
        configurable: true,
        value: polyfill,
    })
}

ensureStorage('localStorage')
ensureStorage('sessionStorage')

// 2025-12-10 13:45 CST - keep tests clean between runs
afterEach(() => {
    cleanup()
})
