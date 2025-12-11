import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://backend:8001';
const API_URL = `${API_BASE}/api/ai`;

export interface AIResponse {
    response: string;
    tokens: number;
    quota_remaining?: number;
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
    sendMessage: async (message: string, token: string): Promise<AIResponse> => {
        try {
            const response = await axios.post(
                `${API_URL}/chat`,
                { message },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                }
            );
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                throw new Error(error.response?.data?.detail || 'Failed to send message');
            }
            throw error;
        }
    },

    getHistory: async (token: string): Promise<HistoryItem[]> => {
        try {
            const response = await axios.get<HistoryResponse>(
                `${API_URL}/history`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );
            return response.data.messages;
        } catch (error) {
            console.error("Failed to fetch history:", error);
            return [];
        }
    },

    getQuota: async (token: string): Promise<QuotaStatus | null> => {
        try {
            const response = await axios.get<QuotaStatus>(
                `${API_URL}/quota`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            return response.data;
        } catch (error) {
            return null;
        }
    }
};
