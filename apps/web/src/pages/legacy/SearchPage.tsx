import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DEFAULT_INTERIOR, seatLayoutFor, type Seat } from '@carpool/shared';
import { listRides, type RideListItem } from '../features/rides/ridesApi';
import { useAuth } from '../features/auth/AuthContext';
import { useToast } from '../components/ToastContext';
import SeatMap from '../features/seat-picker/SeatMap';
import { ArrowLeftRightIcon, BellIcon, PlusIcon } from '../components/icons';
import { Avatar, Corners, PrimaryButton } from '../components/ui';
import { formatWhen, nextDayChips, ridesCount } from '../lib/format';

/** Schemat do stanu pustego: domyślne wnętrze z samymi wolnymi fotelami. */
const EMPTY_MAP_SEATS: Seat[] = seatLayoutFor(DEFAULT_INTERIOR);

const norm = (s: string) => s.trim().toLowerCase();

export default function SearchPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const say = useToast();
  const [params, setParams] = useSearchParams();
  const [rides, setRides] = useState<RideListItem[] | null>(null);

  // Stan wyszukiwania mieszka w URL — wynik da się odświeżyć i wysłać linkiem.
  const from = params.get('from') ?? '';
  const to = params.get('to') ?? '';
  const day = params.get('day') ?? 'all';

  const setQuery = (next: Partial<{ from: string; to: string; day: string }>) => {
    const merged = { from, to, day, ...next };
    const clean = Object.entries(merged).filter(([k, v]) => v && !(k === 'day' && v === 'all'));
    setParams(Object.fromEntries(clean), { replace: true });
  };

  useEffect(() => {
    listRides().then(setRides).catch(() => setRides([]));
  }, []);

  const chips = useMemo(() => nextDayChips(3), []);

  const results = useMemo(() => {
    if (!rides) return [];
    return rides.filter((r) => {
      if (from && !norm(r.origin).startsWith(norm(from))) return false;
      if (to && !norm(r.destination).startsWith(norm(to))) return false;
      if (day !== 'all' && formatWhen(r.departureAt).key !== day) return false;
      return true;
    });
  }, [rides, from, to, day]);

  const isDriver = user?.role === 'DRIVER';
  const routeText = from && to ? `${from} → ${to}` : from || to ? `${from || '…'} → ${to || '…'}` : 'tej trasie';
  const hasRoute = Boolean(from || to);

  return (
    <div className="screen">
      <div style={{ padding: '10px 20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: 30, margin: 0 }}>Szukaj przejazdu</h1>
        {user && <Avatar name={user.name} size={40} fontSize={16} onClick={logout} title="Wyloguj" />}
      </div>

      <div style={{ padding: '14px 20px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 44px 1fr', gap: 6, alignItems: 'end' }}>
          <div className="field">
            <label htmlFor="q-from">Skąd</label>
            <input id="q-from" className="input" placeholder="Miasto" style={{ minHeight: 44 }}
              value={from} onChange={(e) => setQuery({ from: e.target.value })} />
          </div>
          <button type="button" className="btn btn-secondary" title="Zamień" aria-label="Zamień miejscami"
            onClick={() => setQuery({ from: to, to: from })}
            style={{ height: 44, minHeight: 44, width: 44, padding: 0 }}>
            <ArrowLeftRightIcon size={18} />
          </button>
          <div className="field">
            <label htmlFor="q-to">Dokąd</label>
            <input id="q-to" className="input" placeholder="Miasto" style={{ minHeight: 44 }}
              value={to} onChange={(e) => setQuery({ to: e.target.value })} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          <button type="button" className={`btn ${day === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setQuery({ day: 'all' })} style={{ minHeight: 40, flex: 1 }}>
            Wszystkie
          </button>
          {chips.map((c) => (
            <button key={c.key} type="button" className={`btn ${day === c.key ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setQuery({ day: c.key })} style={{ minHeight: 40, flex: 1 }}>
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="screen-scroll" style={{ padding: '18px 0 90px' }}>
        {rides === null ? (
          <p style={{ padding: '0 20px', color: 'var(--color-neutral-700)' }}>Wczytywanie przejazdów…</p>
        ) : results.length > 0 ? (
          <>
            <div className="kicker" style={{ padding: '0 20px 6px', display: 'flex', justifyContent: 'space-between' }}>
              <span>{ridesCount(results.length)}</span>
              <span>odjazd · wolne</span>
            </div>
            {results.map((r) => {
              const when = formatWhen(r.departureAt);
              const free = r.seatCount - r.bookings.length;
              return (
                <button key={r.id} type="button" className="result-row" onClick={() => navigate(`/rides/${r.id}`)}>
                  <div>
                    <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 26, lineHeight: 1 }}>
                      {when.time}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--color-neutral-600)', marginTop: 2 }}>{when.dayShort}</div>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{
                      fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 19, lineHeight: 1.1,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {r.origin} → {r.destination}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--color-neutral-700)', marginTop: 3 }}>
                      {r.carModel} · {r.driver.name}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className={`tag ${free === 0 ? 'tag-neutral' : 'tag-accent'}`}
                      style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 13, padding: '4px 8px' }}>
                      {free === 0 ? 'pełne' : `${free} wolne`}
                    </span>
                    <Avatar name={r.driver.name} size={40} fontSize={15} />
                  </div>
                </button>
              );
            })}
            <div style={{ borderTop: '1px solid var(--color-divider)' }} />
          </>
        ) : (
          <div style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div className="blueprint" style={{
              padding: '26px 20px', display: 'flex', flexDirection: 'column',
              alignItems: 'center', textAlign: 'center', gap: 10, margin: 6,
            }}>
              <Corners />
              <div style={{ width: 92 }}>
                <SeatMap seats={EMPTY_MAP_SEATS} interior={DEFAULT_INTERIOR} mini />
              </div>
              <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 24, lineHeight: 1.1, marginTop: 6 }}>
                {isDriver ? 'Wolna trasa' : 'Nikt jeszcze nie jedzie'}
              </div>
              <div style={{ fontSize: 14, color: 'var(--color-neutral-700)', maxWidth: '28ch', textWrap: 'pretty' }}>
                {isDriver
                  ? `Na ${routeText} nikt nie oferuje miejsc. Ty możesz być pierwszy.`
                  : `Na ${routeText} nie ma jeszcze auta. Zostaw nam znać — powiemy, gdy ktoś opublikuje przejazd.`}
              </div>
            </div>

            {isDriver ? (
              <PrimaryButton
                onClick={() => navigate(`/rides/new?${new URLSearchParams({ from, to }).toString()}`)}
              >
                <PlusIcon size={18} />
                Opublikuj przejazd na tej trasie
              </PrimaryButton>
            ) : (
              <PrimaryButton
                onClick={() => say(`Powiadomimy cię o przejazdach: ${hasRoute ? routeText : 'wszystkie trasy'}.`)}
              >
                <BellIcon size={18} />
                Daj mi znać, gdy ktoś pojedzie
              </PrimaryButton>
            )}

            <button type="button" className="btn btn-ghost btn-block" style={{ minHeight: 44 }}
              onClick={() => setParams({}, { replace: true })}>
              Pokaż wszystkie przejazdy
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
