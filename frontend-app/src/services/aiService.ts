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

import { api } from './api';
import { getIdToken } from './auth';
import { normalizeApiErrorMessage } from './apiErrorMessages';
import type { PageContext } from '../hooks/usePageContext';

export interface AIResponse {
    response: string;
    tokens: number;
    quota_remaining?: number;
    quota_limit?: number;
    quota_used?: number;
    effective_model?: string;
    fallback_applied?: boolean;
    fallback_reason?: string | null;
    fallback_message?: string | null;
    web_search_used?: boolean;
    citations?: Array<{ title: string; url: string }>;
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
    usage_progress?: number;
    usage_copy?: string;
    resets_at: string;
    tier: string;
}

type StreamHandlers = {
    onChunk: (delta: string) => void;
    onComplete?: (response: AIResponse) => void;
    onWebSearchStatus?: (status: 'started' | 'completed', resultsCount?: number) => void;
    signal?: AbortSignal;
    chunkDebounceMs?: number;
};

const envBase =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.API_BASE_URL ||
  import.meta.env.VITE_API_TARGET;
const baseURL = (envBase && !envBase.includes('backend')) ? envBase : '/api';

const extractResponseError = async (response: Response): Promise<unknown> => {
    const maybeJson = await response
        .clone()
        .json()
        .catch(() => null as { detail?: unknown; message?: unknown; error?: unknown } | null);
    if (maybeJson) {
        return maybeJson.detail ?? maybeJson.message ?? maybeJson.error;
    }

    const text = await response.text().catch(() => '');
    return text || `Request failed with status code ${response.status}`;
};

export const aiService = {
    sendMessage: async (
        message: string,
        clientContext?: PageContext,
        attachmentIds?: string[],
    ): Promise<AIResponse> => {
        const response = await api.post<AIResponse>(
            '/ai/chat',
            { message, client_context: clientContext, attachment_ids: attachmentIds },
            { timeout: 30000 }
        );
        return response.data;
    },

    sendMessageStream: async (
        message: string,
        handlers: StreamHandlers,
        clientContext?: PageContext,
        attachmentIds?: string[],
    ): Promise<AIResponse> => {
        const token = await getIdToken();
        const flushMs = Math.max(0, handlers.chunkDebounceMs ?? 60);
        const response = await fetch(`${baseURL}/ai/chat/stream`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'text/event-stream',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
                message,
                client_context: clientContext,
                attachment_ids: attachmentIds,
            }),
            signal: handlers.signal,
        });

        if (!response.ok) {
            const rawMessage = await extractResponseError(response);
            throw new Error(normalizeApiErrorMessage(response.status, rawMessage));
        }
        if (!response.body) {
            throw new Error('The AI response stream is temporarily unavailable. Please try again.');
        }

        const decoder = new TextDecoder();
        const reader = response.body.getReader();
        let buffer = '';
        let fullText = '';
        let finalPayload: AIResponse | null = null;
        let pendingDelta = '';
        let lastFlush = Date.now();

        const flushPending = () => {
            if (!pendingDelta) return;
            handlers.onChunk(pendingDelta);
            pendingDelta = '';
            lastFlush = Date.now();
        };

        // eslint-disable-next-line no-constant-condition
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const events = buffer.split('\n\n');
            buffer = events.pop() ?? '';

            for (const evt of events) {
                const dataLine = evt
                    .split('\n')
                    .find((line) => line.startsWith('data:'));
                if (!dataLine) continue;

                const raw = dataLine.slice(5).trim();
                if (!raw) continue;

                const parsed = JSON.parse(raw) as {
                    type?: string;
                    delta?: string;
                    error?: string;
                    response?: string;
                    tokens?: number;
                    quota_remaining?: number;
                    quota_limit?: number;
                    quota_used?: number;
                    effective_model?: string;
                    fallback_applied?: boolean;
                    fallback_reason?: string | null;
                    fallback_message?: string | null;
                    web_search_used?: boolean;
                    citations?: Array<{ title: string; url: string }>;
                    status?: 'started' | 'completed';
                    results_count?: number;
                };

                if (parsed.type === 'chunk' && parsed.delta) {
                    fullText += parsed.delta;
                    pendingDelta += parsed.delta;
                    if (flushMs === 0 || Date.now() - lastFlush >= flushMs) {
                        flushPending();
                    }
                    continue;
                }

                if (parsed.type === 'error') {
                    throw new Error(parsed.error || 'Streaming failed.');
                }

                if (parsed.type === 'web_search') {
                    handlers.onWebSearchStatus?.(parsed.status ?? 'completed', parsed.results_count ?? 0);
                    continue;
                }

                if (parsed.type === 'complete') {
                    finalPayload = {
                        response: parsed.response ?? fullText,
                        tokens: parsed.tokens ?? 0,
                        quota_remaining: parsed.quota_remaining,
                        quota_limit: parsed.quota_limit,
                        quota_used: parsed.quota_used,
                        effective_model: parsed.effective_model,
                        fallback_applied: parsed.fallback_applied,
                        fallback_reason: parsed.fallback_reason,
                        fallback_message: parsed.fallback_message,
                        web_search_used: parsed.web_search_used,
                        citations: parsed.citations ?? [],
                    };
                }
            }
        }

        flushPending();

        const result = finalPayload ?? { response: fullText, tokens: 0 };
        handlers.onComplete?.(result);
        return result;
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
