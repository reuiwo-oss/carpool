import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useUnread } from '../features/messages/UnreadContext';
import { ArmchairIcon, MailIcon, PlusIcon, SearchIcon, UsersIcon } from './icons';

/**
 * Dolny pasek zakładek. Ten sam dla wszystkich — rola przestała być cechą
 * konta, więc każdy może i szukać, i publikować.
 *
 * „Dodaj" nie prowadzi wprost do formularza, tylko otwiera arkusz z trzema
 * drogami wyjścia: opublikuj wycieczkę, poproś o przejazd, zobacz kto prosi.
 * To ten sam zestaw, który plan opisywał jako rozwijane menu — tutaj mieści
 * się w mobilnym pasku bez odbierania mu kciuka.
 */
export default function TabBar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { count } = useUnread();
  const [sheet, setSheet] = useState(false);

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
          {badge > 0 && <span className="badge" aria-hidden>{badge > 9 ? '9+' : badge}</span>}
        </span>
        {label}
        {badge > 0 && <span className="sr-only">, nieprzeczytane: {badge}</span>}
      </button>
    );
  };

  const go = (to: string) => {
    setSheet(false);
    navigate(to);
  };

  return (
    <>
      {sheet && (
        <div className="dialog-backdrop" role="dialog" aria-modal="true" aria-label="Co chcesz zrobić"
          onClick={() => setSheet(false)}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-title">Co chcesz zrobić?</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button type="button" className="btn btn-primary btn-block" style={{ minHeight: 48 }}
                onClick={() => go('/trips/new')}>
                Opublikuj wycieczkę
              </button>
              <button type="button" className="btn btn-secondary btn-block" style={{ minHeight: 48 }}
                onClick={() => go('/requests/new')}>
                Poproś o przejazd
              </button>
              <button type="button" className="btn btn-ghost btn-block" style={{ minHeight: 44 }}
                onClick={() => go('/requests')}>
                Zobacz, kto szuka przejazdu
              </button>
            </div>
          </div>
        </div>
      )}

      <nav className="tabbar" aria-label="Nawigacja główna">
        {tab('/', 'Szukaj', <SearchIcon size={22} />)}
        {tab('/community', 'Społeczność', <UsersIcon size={22} />)}
        <button type="button" className="tab" onClick={() => setSheet(true)} aria-haspopup="dialog"
          aria-expanded={sheet}>
          <span className="tab-icon">
            <span className="tab-add-mark">
              <PlusIcon size={18} />
            </span>
          </span>
          Dodaj
        </button>
        {tab('/mine', 'Moje', <ArmchairIcon size={22} />)}
        {tab('/messages', 'Wiadomości', <MailIcon size={22} />, count)}
      </nav>
    </>
  );
}
