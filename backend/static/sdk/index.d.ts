export interface WidgetContext {
    theme: 'light' | 'dark';
    user: {
        uid: string;
        tier: 'free' | 'pro' | 'ultimate';
    };
}

export interface JuaLumaClient {
    request: (endpoint: string, options?: RequestInit) => Promise<any>;
}

export interface WidgetProps {
    context: WidgetContext;
    client: JuaLumaClient;
}
