/**
 * Cienki klient HTTP. Ta warstwa jest celowo niezależna od przeglądarki
 * (poza localStorage) — przy przejściu na React Native wystarczy podmienić
 * magazyn tokenu na AsyncStorage/SecureStore.
 */
const BASE = '/api';

/**
 * Gdy backend jest nieosiągalny, proxy Vite odpowiada pustym 500 — nie jest to
 * błąd API, tylko brak API. Bez tego rozróżnienia każdy padnięty serwer wygląda
 * na zepsuty przycisk. Szczegóły: docs/bugfix-2026-09-01-rejestracja-500.md.
 */
export const API_UNREACHABLE = 'Nie mogę połączyć się z serwerem. Czy API działa (npm run dev:api)?';

export function getToken() {
  return localStorage.getItem('token');
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem('token', token);
  else localStorage.removeItem('token');
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
        ...options.headers,
      },
    });
  } catch {
    // Sieć padła zanim cokolwiek doleciało — serwera nie ma.
    throw new Error(API_UNREACHABLE);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({} as { message?: string | string[] }));
    // Nest zwraca message jako string albo listę błędów walidacji.
    const message = Array.isArray(body.message) ? body.message.join('. ') : body.message;
    if (message) throw new Error(message);
    // 5xx bez treści to prawie zawsze proxy zgłaszające nieosiągalny backend.
    throw new Error(res.status >= 500 ? API_UNREACHABLE : `Błąd ${res.status}`);
  }

  // DELETE bywa bez treści — nie wywracaj się na pustym body.
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}
