export interface WidgetContext {
    theme: 'light' | 'dark';
    user: {
        uid: string;
        tier: 'free' | 'pro' | 'ultimate';
    };
}

export interface jualumaClient {
    request: (endpoint: string, options?: RequestInit) => Promise<any>;
}

export interface WidgetProps {
    context: WidgetContext;
    client: jualumaClient;
}
