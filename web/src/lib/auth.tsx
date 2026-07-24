import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { apiRequest } from '@/lib/queryClient';
import type { User } from '@shared/schema';

interface AuthState {
  user: User | null;
  enforcement: 'on' | 'off';
  bypass: boolean;
  loading: boolean;
  login: (login: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

interface MeResponse {
  user: User | null;
  enforcement: 'on' | 'off';
  bypass: boolean;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [enforcement, setEnforcement] = useState<'on' | 'off'>('off');
  const [bypass, setBypass] = useState(false);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    try {
      const { resolveApiUrl, buildFetchInit } = await import('@/lib/api-config');
      const url = resolveApiUrl('/api/auth/me');
      const init = await buildFetchInit({});
      const res = await fetch(url, init);
      if (res.ok) {
        const data = (await res.json()) as MeResponse;
        setUser(data.user);
        setEnforcement(data.enforcement);
        setBypass(data.bypass);
      } else {
        setUser(null);
        setEnforcement('on');
        setBypass(false);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function login(loginVal: string, password: string): Promise<User> {
    const { user: u } = await apiRequest<{ user: User }>('POST', '/api/auth/login', {
      login: loginVal,
      password,
    });
    await refresh();
    return u;
  }

  async function logout() {
    try {
      await apiRequest('POST', '/api/auth/logout');
    } catch {
      /* noop */
    }
    setUser(null);
    setEnforcement('on');
  }

  return (
    <AuthContext.Provider value={{ user, enforcement, bypass, loading, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

export function hasRole(user: User | null, ...roles: Array<User['role']>): boolean {
  if (!user) return false;
  return roles.includes(user.role);
}
