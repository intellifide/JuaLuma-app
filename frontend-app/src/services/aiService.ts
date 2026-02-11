/*
 * Copyright (c) 2026 Intellifide, LLC.
 * Licensed under PolyForm Noncommercial License 1.0.0.
 * See "PolyForm-Noncommercial-1.0.0.txt" for full text.
 *
 * COMMUNITY RIGHTS:
 * - You CAN modify this code for personal use.
 * - You CAN build and share widgets/plugins for the ecosystem.
 *
 * RESTRICTIONS:
 * - You CANNOT resell, repackage, or distribute this application for a fee.
 * - You CANNOT use this application for commercial enterprise purposes.
 */

import { api } from './api';

export interface AIResponse {
    response: string;
    tokens: number;
    quota_remaining?: number;
    quota_limit?: number;
    quota_used?: number;
}

export interface HistoryItem {
    prompt: string;
    response: string;
    timestamp: string;
}

export interface HistoryResponse {
    messages: HistoryItem[];
}

export interface QuotaStatus {
    used: number;
    limit: number;
    resets_at: string;
    tier: string;
}

export const aiService = {
    sendMessage: async (message: string): Promise<AIResponse> => {
        const response = await api.post<AIResponse>('/ai/chat', { message });
        return response.data;
    },

    getHistory: async (): Promise<HistoryItem[]> => {
        try {
            const response = await api.get<HistoryResponse>('/ai/history');
            return response.data.messages;
        } catch (error) {
            console.error("Failed to fetch history:", error);
            return [];
        }
    },

    getQuota: async (): Promise<QuotaStatus | null> => {
        try {
            const response = await api.get<QuotaStatus>('/ai/quota');
            return response.data;
        } catch (error) {
            return null;
        }
    }
};
