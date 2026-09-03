import { useLocation, useNavigate } from 'react-router-dom';
import type { Role } from '@carpool/shared';
import { useUnread } from '../features/messages/UnreadContext';
import { ArmchairIcon, MailIcon, PlusIcon, SearchIcon, UsersIcon } from './icons';

/**
 * Dolny pasek zakładek. Kierowca ma dodatkowo „Dodaj" — jedyny element paska
 * z pełnym wypełnieniem akcentem, żeby publikacja była widoczna z każdego ekranu.
 * Wyszukiwanie i społeczność są rozdzielone: feed nigdy nie leży pod wynikami.
 *
 * Kierowca ma tu pięć pozycji na 402 px, dlatego etykiety są skrócone
 * („Moje" zamiast „Moje przejazdy") — inaczej łamią się na dwie linie.
 */
export default function TabBar({ role }: { role: Role }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { count } = useUnread();
  const isDriver = role === 'DRIVER';

  const tab = (to: string, label: string, icon: React.ReactNode, badge = 0) => {
    const active = pathname === to || (to !== '/' && pathname.startsWith(to));
    return (
      <button
        type="button"
        className="tab"
        onClick={() => navigate(to)}
        aria-current={active ? 'page' : undefined}
      >
        <span className="tab-icon">
          {icon}
          {badge > 0 && (
            <span className="badge" aria-hidden>{badge > 9 ? '9+' : badge}</span>
          )}
        </span>
        {label}
        {badge > 0 && <span className="sr-only">, nieprzeczytane: {badge}</span>}
      </button>
    );
  };

  return (
    <nav className="tabbar" aria-label="Nawigacja główna">
      {tab('/', 'Szukaj', <SearchIcon size={22} />)}
      {tab('/community', 'Społeczność', <UsersIcon size={22} />)}
      {isDriver &&
        tab(
          '/rides/new',
          'Dodaj',
          <span className="tab-add-mark">
            <PlusIcon size={18} />
          </span>,
        )}
      {tab('/mine', isDriver ? 'Moje' : 'Rezerwacje', <ArmchairIcon size={22} />)}
      {tab('/messages', 'Wiadomości', <MailIcon size={22} />, count)}
    </nav>
  );
}
