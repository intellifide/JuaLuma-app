import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from './useAuth';

type PageContext = {
  route: string;
  query: string;
  pageTitle: string;
  section: string;
  generatedAt: string;
  viewport?: { width: number; height: number };
  user: {
    uid?: string;
    email?: string | null;
    status?: string | null;
    role?: string | null;
  };
  visibleState: Record<string, unknown>;
};

const inferSection = (pathname: string): string => {
  if (pathname.startsWith('/dashboard')) return 'dashboard';
  if (pathname.startsWith('/financial-analysis')) return 'financial-analysis';
  if (pathname.startsWith('/transactions')) return 'transactions';
  if (pathname.startsWith('/connect-accounts')) return 'connect-accounts';
  if (pathname.startsWith('/settings')) return 'settings';
  if (pathname.startsWith('/support')) return 'support';
  if (pathname.startsWith('/ai-assistant')) return 'ai-assistant';
  return 'app';
};

export const usePageContext = (): PageContext => {
  const location = useLocation();
  const { user, profile } = useAuth();

  return useMemo(() => {
    const viewport =
      typeof window !== 'undefined'
        ? { width: window.innerWidth, height: window.innerHeight }
        : undefined;

    const visibleState: Record<string, unknown> = {
      dashboardPreferences:
        typeof localStorage !== 'undefined'
          ? localStorage.getItem('jualuma_dashboard_preferences')
          : null,
      activeAiThread:
        typeof localStorage !== 'undefined'
          ? localStorage.getItem(`jualuma_ai_current_thread_${user?.uid ?? 'anon'}`)
          : null,
      selectedPath: location.pathname,
    };

    return {
      route: location.pathname,
      query: location.search,
      pageTitle: typeof document !== 'undefined' ? document.title : 'Jualuma App',
      section: inferSection(location.pathname),
      generatedAt: new Date().toISOString(),
      viewport,
      user: {
        uid: user?.uid,
        email: user?.email ?? null,
        status: profile?.status ?? null,
        role: profile?.role ?? null,
      },
      visibleState,
    };
  }, [location.pathname, location.search, profile?.role, profile?.status, user?.email, user?.uid]);
};

export type { PageContext };
