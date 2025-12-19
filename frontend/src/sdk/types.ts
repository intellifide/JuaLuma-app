// Created 2025-12-11 13:00 CST
export interface WidgetContext {
    theme: 'light' | 'dark';
    currency: string;
    locale: string;
}

export interface jualumaClient {
    request: <T = unknown>(path: string, options?: RequestInit) => Promise<T>;
    storage: {
        get: <T = unknown>(key: string) => Promise<T | null>;
        set: <T = unknown>(key: string, value: T) => Promise<void>;
    };
}

export interface WidgetProps {
    context: WidgetContext;
    client: jualumaClient;
}
