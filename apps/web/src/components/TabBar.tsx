import { useLocation, useNavigate } from 'react-router-dom';
import type { Role } from '@carpool/shared';
import { ArmchairIcon, PlusIcon, SearchIcon, UsersIcon } from './icons';

/**
 * Dolny pasek zakładek. Kierowca ma dodatkowo „Dodaj" — jedyny element paska
 * z pełnym wypełnieniem akcentem, żeby publikacja była widoczna z każdego ekranu.
 * Wyszukiwanie i społeczność są rozdzielone: feed nigdy nie leży pod wynikami.
 */
export default function TabBar({ role }: { role: Role }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isDriver = role === 'DRIVER';

  const tab = (to: string, label: string, icon: React.ReactNode) => (
    <button
      type="button"
      className="tab"
      onClick={() => navigate(to)}
      aria-current={pathname === to ? 'page' : undefined}
    >
      {icon}
      {label}
    </button>
  );

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
      {tab('/mine', isDriver ? 'Moje przejazdy' : 'Rezerwacje', <ArmchairIcon size={22} />)}
    </nav>
  );
}
