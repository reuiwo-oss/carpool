import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  DEFAULT_INTERIOR,
  seatLayoutFor,
  type PlaceRef,
  type Seat,
  type TripSummary,
} from '@carpool/shared';
import { listTrips } from '../features/trips/tripsApi';
import PlacePicker from '../features/places/PlacePicker';
import { useAuth } from '../features/auth/AuthContext';
import SeatMap from '../features/seat-picker/SeatMap';
import { BellIcon, PlusIcon } from '../components/icons';
import { Avatar, Corners, LoadError, PrimaryButton } from '../components/ui';
import { formatWhen, nextDayChips, plural } from '../lib/format';

/** Schemat do stanu pustego: domyślne wnętrze z samymi wolnymi fotelami. */
const EMPTY_MAP_SEATS: Seat[] = seatLayoutFor(DEFAULT_INTERIOR);

const seatsCount = (n: number) => `${n} ${plural(n, 'wolne', 'wolne', 'wolnych')}`;

export default function TripsListPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [trips, setTrips] = useState<TripSummary[] | null>(null);
  const [loadError, setLoadError] = useState('');

  // Stan wyszukiwania mieszka w URL — wynik da się odświeżyć i wysłać linkiem.
  // Nazwa miejsca leci obok id, żeby po odświeżeniu strony było czym wypełnić
  // pole; samo id nic nikomu nie mówi.
  const placeId = params.get('placeId') ?? '';
  const placeName = params.get('place') ?? '';
  const day = params.get('day') ?? 'all';

  const place: PlaceRef | null = placeId ? { placeId, name: placeName } : null;

  const setQuery = (next: Partial<{ placeId: string; place: string; day: string }>) => {
    const merged = { placeId, place: placeName, day, ...next };
    const clean = Object.entries(merged).filter(([k, v]) => v && !(k === 'day' && v === 'all'));
    setParams(Object.fromEntries(clean), { replace: true });
  };

  // Zawężenie po miejscu robi serwer — zna hierarchię, więc wybór Tatr
  // pokazuje też wyjazdy na Rysy. Przeglądarka nie ma jak tego policzyć.
  const load = () => {
    setLoadError('');
    setTrips(null);
    listTrips(placeId || undefined)
      .then(setTrips)
      .catch((e) => setLoadError((e as Error).message));
  };

  useEffect(load, [placeId]);

  const chips = useMemo(() => nextDayChips(3), []);

  const results = useMemo(() => {
    if (!trips) return [];
    if (day === 'all') return trips;
    return trips.filter((t) => formatWhen(t.startsAt).key === day);
  }, [trips, day]);

  const target = placeName ? `do celu „${placeName}"` : 'w tym terminie';

  return (
    <div className="screen">
      <div style={{ padding: '10px 20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: 30, margin: 0 }}>Szukaj wycieczki</h1>
        {user && <Avatar name={user.name} size={40} fontSize={16} onClick={logout} title="Wyloguj" />}
      </div>

      <div style={{ padding: '14px 20px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Bez własnych nazw: filtr ma sens tylko dla miejsc, które wycieczki
            mają przypięte. Wyczyszczenie wraca do pełnej listy. */}
        <PlacePicker
          label="Dokąd?"
          placeholder="Pasmo, szczyt albo miejscowość"
          allowCustom={false}
          value={place}
          onChange={(next) =>
            setQuery({ placeId: next?.placeId ?? '', place: next?.name ?? '' })
          }
        />

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
        {loadError ? (
          <div style={{ padding: '0 18px' }}>
            <LoadError message={loadError} onRetry={load} />
          </div>
        ) : trips === null ? (
          <p style={{ padding: '0 20px', color: 'var(--color-neutral-700)' }}>Wczytywanie wycieczek…</p>
        ) : results.length > 0 ? (
          <>
            <div className="kicker" style={{ padding: '0 20px 6px', display: 'flex', justifyContent: 'space-between' }}>
              <span>{results.length} {plural(results.length, 'wycieczka', 'wycieczki', 'wycieczek')}</span>
              <span>wyjazd · wolne</span>
            </div>
            {results.map((t) => {
              const when = formatWhen(t.startsAt);
              return (
                <button key={t.id} type="button" className="result-row" onClick={() => navigate(`/trips/${t.id}`)}>
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
                      {t.title}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--color-neutral-700)', marginTop: 3 }}>
                      {t.destination} · {t.participantsCount} {plural(t.participantsCount, 'osoba', 'osoby', 'osób')}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className={`tag ${t.freeSeats === 0 ? 'tag-neutral' : 'tag-accent'}`}
                      style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 13, padding: '4px 8px' }}>
                      {t.freeSeats === 0 ? 'pełne' : seatsCount(t.freeSeats)}
                    </span>
                    <Avatar name={t.organizerName} size={40} fontSize={15} />
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
                Nikt jeszcze nie jedzie
              </div>
              <div style={{ fontSize: 14, color: 'var(--color-neutral-700)', maxWidth: '28ch', textWrap: 'pretty' }}>
                Nie ma wycieczki {target}. Możesz ją zorganizować albo poprosić o przejazd — kierowcy zobaczą prośbę.
              </div>
            </div>

            <PrimaryButton onClick={() => navigate('/trips/new')}>
              <PlusIcon size={18} />
              Zorganizuj wycieczkę
            </PrimaryButton>

            <button type="button" className="btn btn-secondary btn-block" style={{ minHeight: 46 }}
              onClick={() => navigate('/requests/new')}>
              <BellIcon size={18} />
              Poproś o przejazd
            </button>

            <button type="button" className="btn btn-ghost btn-block" style={{ minHeight: 44 }}
              onClick={() => setParams({}, { replace: true })}>
              Pokaż wszystkie wycieczki
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
