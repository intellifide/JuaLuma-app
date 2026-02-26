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

// Created 2025-12-11 13:00 CST
import { jualumaClient } from './types';

export const mockClient: jualumaClient = {
    request: async <T = unknown>(path: string, options?: RequestInit): Promise<T> => {
        console.log(`[MockClient] Request to ${path}`, options);
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        if (path === '/health') {
            return { status: 'ok', version: '1.0.0' } as unknown as T;
        }

        if (path === '/api/widgets/demo-data') {
            return { data: [1, 2, 3], message: 'Demo data' } as unknown as T;
        }

        return { message: 'Mock response for ' + path } as unknown as T;
    },
    storage: {
        get: async <T = unknown>(key: string): Promise<T | null> => {
            console.log(`[MockClient] Storage GET ${key}`);
            const val = localStorage.getItem(`widget_storage_${key}`);
            return val ? (JSON.parse(val) as T) : null;
        },
        set: async <T = unknown>(key: string, value: T): Promise<void> => {
            console.log(`[MockClient] Storage SET ${key}`, value);
            localStorage.setItem(`widget_storage_${key}`, JSON.stringify(value));
        }
    }
};
