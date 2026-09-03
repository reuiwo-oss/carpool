import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { getUnreadCount } from './messagesApi';

/**
 * Licznik nieprzeczytanych wiadomości dla kulki przy zakładce.
 *
 * Odświeżamy przy zmianie ekranu, po powrocie do karty i co 30 s — bez
 * websocketów. Do wymiany na push, gdy pojawi się aplikacja mobilna.
 */
const UnreadContext = createContext<{ count: number; refresh: () => void }>({
  count: 0,
  refresh: () => {},
});

export const useUnread = () => useContext(UnreadContext);

const POLL_MS = 30_000;

export function UnreadProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [count, setCount] = useState(0);

  const refresh = useCallback(() => {
    if (!user) {
      setCount(0);
      return;
    }
    getUnreadCount()
      .then((r) => setCount(r.count))
      .catch(() => {
        /* licznik jest ozdobą — cicho ignorujemy błąd sieci */
      });
  }, [user]);

  useEffect(refresh, [refresh, pathname]);

  useEffect(() => {
    if (!user) return;
    const id = setInterval(refresh, POLL_MS);
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener('focus', onFocus);
    };
  }, [user, refresh]);

  return <UnreadContext.Provider value={{ count, refresh }}>{children}</UnreadContext.Provider>;
}
