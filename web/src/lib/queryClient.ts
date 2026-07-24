import { QueryClient } from '@tanstack/react-query';
import { resolveApiUrl, buildFetchInit } from './api-config.js';

async function defaultFetcher({ queryKey }: { queryKey: readonly unknown[] }) {
  const path = queryKey
    .map((seg) => (typeof seg === 'string' ? seg : String(seg)))
    .join('/')
    .replace(/\/+/g, '/');

  const url = resolveApiUrl(path);
  const init = await buildFetchInit({ headers: { Accept: 'application/json' } });

  const res = await fetch(url, init);

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`${res.status} ${res.statusText}${body ? ` · ${body}` : ''}`);
  }
  return res.json();
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: defaultFetcher,
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30_000,
    },
    mutations: {
      retry: 0,
    },
  },
});

export type ApiMethod = 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export async function apiRequest<T = unknown>(
  method: ApiMethod,
  url: string,
  body?: unknown,
): Promise<T> {
  const fullUrl = resolveApiUrl(url);
  const init = await buildFetchInit({
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  const res = await fetch(fullUrl, init);

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    let message = `${res.status} ${res.statusText}`;
    try {
      const parsed = JSON.parse(text);
      if (parsed?.error) message = parsed.error;
    } catch {
      if (text) message = text;
    }
    throw new Error(message);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
