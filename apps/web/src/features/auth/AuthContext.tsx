import { createContext, useContext, useState, ReactNode } from 'react';
import type { AuthUser, Role } from '@carpool/shared';
import { api, setToken } from '../../api/client';

interface AuthState {
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; name: string; role: Role }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState>(null!);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  });

  const handleAuth = (res: { accessToken: string; user: AuthUser }) => {
    setToken(res.accessToken);
    localStorage.setItem('user', JSON.stringify(res.user));
    setUser(res.user);
  };

  const login = async (email: string, password: string) => {
    handleAuth(await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }));
  };

  const register = async (data: { email: string; password: string; name: string; role: Role }) => {
    handleAuth(await api('/auth/register', { method: 'POST', body: JSON.stringify(data) }));
  };

  const logout = () => {
    setToken(null);
    localStorage.removeItem('user');
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, login, register, logout }}>{children}</AuthContext.Provider>;
}
