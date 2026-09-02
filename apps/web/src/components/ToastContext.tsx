import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { CheckIcon } from './icons';

/**
 * Jeden toast naraz, gaśnie po 2,6 s. Potwierdzenia akcji (rezerwacja,
 * publikacja) i błędy API — projekt nie przewiduje modali na te komunikaty.
 */
const ToastContext = createContext<(message: string) => void>(() => {});

export const useToast = () => useContext(ToastContext);

const DURATION = 2600;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const say = useCallback((text: string) => {
    clearTimeout(timer.current);
    setMessage(text);
    timer.current = setTimeout(() => setMessage(''), DURATION);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <ToastContext.Provider value={say}>
      {children}
      {message && (
        // aria-live, bo komunikat pojawia się bez zmiany fokusu
        <div className="toast" role="status" aria-live="polite">
          <CheckIcon size={18} />
          {message}
        </div>
      )}
    </ToastContext.Provider>
  );
}
