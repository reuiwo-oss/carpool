import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { MyTrips, TripSummary } from '@carpool/shared';
import { listMyTrips } from '../features/trips/tripsApi';
import { RoleBadges } from '../features/trips/roles';
import { useAuth } from '../features/auth/AuthContext';
import { CarIcon } from '../components/icons';
import { Avatar, Corners, LoadError } from '../components/ui';
import { formatWhen, plural } from '../lib/format';

export default function MyTripsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [trips, setTrips] = useState<MyTrips | null>(null);
  const [loadError, setLoadError] = useState('');

  const load = () => {
    setLoadError('');
    listMyTrips().then(setTrips).catch((e) => setLoadError((e as Error).message));
  };

  useEffect(load, []);

  const card = (trip: TripSummary, past: boolean) => {
    const starts = formatWhen(trip.startsAt);
    const ends = formatWhen(trip.endsAt);
    return (
      <button key={trip.id} type="button" className="blueprint"
        onClick={() => navigate(`/trips/${trip.id}`, {
          state: { backTo: '/mine', backLabel: 'Moje wycieczki' },
        })}
        style={{
          padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8, margin: 6,
          textAlign: 'left', background: 'transparent', cursor: 'pointer',
          fontFamily: 'var(--font-body)', color: 'var(--color-text)',
          opacity: past ? 0.72 : 1,
        }}>
        <Corners />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, width: '100%' }}>
          <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 21, lineHeight: 1.1 }}>
            {trip.title}
          </div>
          <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 21 }}>{starts.time}</span>
        </div>
        <div style={{ fontSize: 13, color: 'var(--color-neutral-700)' }}>
          {trip.destination} · {starts.dayShort} → {ends.dayShort}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', flexWrap: 'wrap' }}>
          <RoleBadges roles={trip.myRoles ?? []} />
          <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--color-neutral-700)' }}>
            {trip.participantsCount} {plural(trip.participantsCount, 'osoba', 'osoby', 'osób')}
            {!past && ` · ${trip.freeSeats} ${plural(trip.freeSeats, 'wolne', 'wolne', 'wolnych')}`}
          </span>
        </div>
      </button>
    );
  };

  return (
    <div className="screen">
      <div style={{ padding: '10px 20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: 30, margin: 0 }}>Moje wycieczki</h1>
        {user && <Avatar name={user.name} size={40} fontSize={16} onClick={logout} title="Wyloguj" />}
      </div>

      <div className="screen-scroll" style={{ padding: '14px 20px 100px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button type="button" className="btn btn-secondary btn-block" style={{ minHeight: 46, marginBottom: 4 }}
          onClick={() => navigate('/vehicles')}>
          <CarIcon size={18} />
          Moje auta
        </button>

        {loadError && <LoadError message={loadError} onRetry={load} />}
        {!loadError && trips === null && <p style={{ color: 'var(--color-neutral-700)' }}>Wczytywanie…</p>}

        {trips && trips.upcoming.length === 0 && trips.past.length === 0 && (
          <div className="blueprint" style={{
            padding: '26px 20px', textAlign: 'center', margin: 6,
            display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center',
          }}>
            <Corners />
            <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 24 }}>Żadnych planów?</div>
            <div style={{ fontSize: 14, color: 'var(--color-neutral-700)' }}>
              Dołącz do wycieczki albo zorganizuj własną.
            </div>
            <button type="button" className="btn btn-secondary" style={{ marginTop: 6 }} onClick={() => navigate('/')}>
              Szukaj wycieczki
            </button>
          </div>
        )}

        {trips && trips.upcoming.length > 0 && (
          <>
            <div className="kicker" style={{ padding: '4px 6px 0' }}>Nadchodzące</div>
            {trips.upcoming.map((t) => card(t, false))}
          </>
        )}

        {trips && trips.past.length > 0 && (
          <>
            <div className="kicker" style={{ padding: '12px 6px 0' }}>Odbyte</div>
            {trips.past.map((t) => card(t, true))}
          </>
        )}
      </div>
    </div>
  );
}
