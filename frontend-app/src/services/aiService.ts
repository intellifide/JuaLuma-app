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
