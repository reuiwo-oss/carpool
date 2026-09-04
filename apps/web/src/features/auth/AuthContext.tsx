import { createContext, useContext, useState, ReactNode } from 'react';
import { api, setToken } from '../../api/client';

/**
 * Zalogowany użytkownik bez roli — w modelu wycieczkowym rola nie jest cechą
 * konta, tylko wynikiem udziału w konkretnej wycieczce (`deriveParticipantRoles`).
 */
export interface SessionUser {
  id: string;
  email: string;
  name: string;
}

interface AuthState {
  user: SessionUser | null;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; name: string }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState>(null!);
export const useAuth = () => useContext(AuthContext);

/** Odpowiedź API wciąż niesie `role` — ignorujemy ją, znika w etapie 6. */
const toSession = ({ id, email, name }: SessionUser): SessionUser => ({ id, email, name });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(() => {
    const raw = localStorage.getItem('user');
    return raw ? toSession(JSON.parse(raw)) : null;
  });

  const handleAuth = (res: { accessToken: string; user: SessionUser }) => {
    const session = toSession(res.user);
    setToken(res.accessToken);
    localStorage.setItem('user', JSON.stringify(session));
    setUser(session);
  };

  const login = async (email: string, password: string) => {
    handleAuth(await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }));
  };

  const register = async (data: { email: string; password: string; name: string }) => {
    handleAuth(await api('/auth/register', { method: 'POST', body: JSON.stringify(data) }));
  };

  const logout = () => {
    setToken(null);
    localStorage.removeItem('user');
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, login, register, logout }}>{children}</AuthContext.Provider>;
}
