/**
 * Cienki klient HTTP. Ta warstwa jest celowo niezależna od przeglądarki
 * (poza localStorage) — przy przejściu na React Native wystarczy podmienić
 * magazyn tokenu na AsyncStorage/SecureStore.
 */
const BASE = '/api';

export function getToken() {
  return localStorage.getItem('token');
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem('token', token);
  else localStorage.removeItem('token');
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `Błąd ${res.status}`);
  }
  return res.json();
}
