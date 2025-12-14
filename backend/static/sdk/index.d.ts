export interface WidgetContext {
    theme: 'light' | 'dark';
    user: {
        uid: string;
        tier: 'free' | 'pro' | 'ultimate';
    };
}

export interface FinityClient {
    request: (endpoint: string, options?: RequestInit) => Promise<any>;
}

export interface WidgetProps {
    context: WidgetContext;
    client: FinityClient;
}
