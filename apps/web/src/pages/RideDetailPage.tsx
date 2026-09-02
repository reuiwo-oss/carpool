import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import type { Seat } from '@carpool/shared';
import { bookSeat, cancelBooking, getRide, type RideDetail } from '../features/rides/ridesApi';
import { useAuth } from '../features/auth/AuthContext';
import { useToast } from '../components/ToastContext';
import SeatMap from '../features/seat-picker/SeatMap';
import { ArrowRightIcon, CheckIcon } from '../components/icons';
import { Avatar, BackButton, Corners } from '../components/ui';
import { formatWhen } from '../lib/format';

interface BackState {
  backTo?: string;
  backLabel?: string;
}

export default function RideDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const say = useToast();

  const [ride, setRide] = useState<RideDetail | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState('');

  const { backTo = '/', backLabel = 'Wyniki' } = (location.state ?? {}) as BackState;

  const load = () => getRide(id!).then(setRide).catch((e) => setError((e as Error).message));
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const myBooking = useMemo(
    () => ride?.bookings.find((b) => b.passengerId === user?.id) ?? null,
    [ride, user],
  );

  /** Miejsce zalogowanego pasażera rysujemy jako MINE — API tego nie wie. */
  const seats: Seat[] = useMemo(() => {
    if (!ride) return [];
    return ride.seats.map((s) =>
      myBooking && s.id === myBooking.seatId ? { ...s, status: 'MINE' as const } : s,
    );
  }, [ride, myBooking]);

  if (error) return <p style={{ padding: 20, color: 'var(--color-accent-900)' }}>{error}</p>;
  if (!ride) return <p style={{ padding: 20, color: 'var(--color-neutral-700)' }}>Wczytywanie przejazdu…</p>;

  const isPassenger = user?.role === 'PASSENGER';
  const isOwn = ride.driverId === user?.id;
  const when = formatWhen(ride.departureAt);
  const free = seats.filter((s) => s.status === 'FREE').length;
  const selectedSeat = seats.find((s) => s.id === selected) ?? null;
  const mySeat = seats.find((s) => s.status === 'MINE') ?? null;
  const roster = seats.filter((s) => s.status === 'TAKEN' && s.who);

  /** Dwa dotknięcia tego samego fotela: pierwsze wybiera, drugie rezerwuje. */
  const tapSeat = async (seat: Seat) => {
    if (!isPassenger || !user) return;
    if (myBooking) {
      say('Masz już miejsce w tym aucie.');
      return;
    }
    if (selected !== seat.id) {
      setSelected(seat.id);
      return;
    }

    const before = ride;
    setSelected(null);
    setRide({
      ...ride,
      bookings: [...ride.bookings, { id: 'optimistic', seatId: seat.id, passengerId: user.id }],
    });
    try {
      await bookSeat(ride.id, seat.id);
      say(`Miejsce zarezerwowane: ${seat.label}.`);
      await load();
    } catch (e) {
      setRide(before);
      say((e as Error).message);
    }
  };

  const cancel = async () => {
    if (!myBooking) return;
    const before = ride;
    setRide({ ...ride, bookings: ride.bookings.filter((b) => b.id !== myBooking.id) });
    try {
      await cancelBooking(myBooking.id);
      say('Rezerwacja anulowana.');
      await load();
    } catch (e) {
      setRide(before);
      say((e as Error).message);
    }
  };

  const mapHeading = isOwn ? 'Kto gdzie siedzi' : isPassenger ? 'Wybierz miejsce' : 'Miejsca w aucie';

  return (
    <div className="screen">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 12px 0' }}>
        <BackButton label={backLabel} onClick={() => navigate(backTo)} />
        <span className="tag tag-neutral" style={{ marginRight: 8 }}>{when.day}</span>
      </div>

      <div className="screen-scroll" style={{ padding: '6px 20px 40px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: 34, margin: 0, lineHeight: 1 }}>{ride.origin}</h1>
          <span style={{ alignSelf: 'center' }}>
            <ArrowRightIcon size={24} color="var(--color-accent)" />
          </span>
          <h1 style={{ fontSize: 34, margin: 0, lineHeight: 1 }}>{ride.destination}</h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 6 }}>
          <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 30, lineHeight: 1 }}>
            {when.time}
          </span>
          <span style={{ fontSize: 14, color: 'var(--color-neutral-700)' }}>odjazd</span>
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, margin: '18px 0 6px', padding: '12px 0',
          borderTop: '1px solid var(--color-divider)', borderBottom: '1px solid var(--color-divider)',
        }}>
          <Avatar name={ride.driver.name} size={44} fontSize={17} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 500 }}>{ride.driver.name}</div>
            <div style={{ fontSize: 13, color: 'var(--color-neutral-700)' }}>{ride.carModel}</div>
          </div>
          <span className={`tag ${free === 0 ? 'tag-neutral' : 'tag-accent'}`}
            style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 13, padding: '4px 8px' }}>
            {free === 0 ? 'pełne' : `${free} wolne z ${ride.seatCount}`}
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', margin: '16px 0 4px' }}>
          <h2 style={{ fontSize: 20, margin: 0 }}>{mapHeading}</h2>
          <span style={{ fontSize: 12, color: 'var(--color-neutral-600)' }}>{ride.carModel}</span>
        </div>

        <div style={{ padding: '4px 6px 0' }}>
          <SeatMap
            seats={seats}
            selectedSeatId={selected}
            showNames={isOwn}
            onSelect={isPassenger ? tapSeat : undefined}
          />
        </div>

        <div className="legend">
          <span><i className="sw-free" />wolne</span>
          <span><i className="sw-taken" />zajęte</span>
          <span><i className="sw-mine" />moje</span>
          <span><i className="sw-driver" />kierowca</span>
        </div>

        {/* Dokładnie jedna sekcja pod schematem — zależnie od roli i stanu. */}
        {mySeat ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 6 }}>
            <CheckIcon size={22} color="var(--color-accent)" />
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 19, lineHeight: 1.1 }}>
                Jedziesz — {mySeat.label}
              </div>
              <div style={{ fontSize: 13, color: 'var(--color-neutral-700)', marginTop: 2 }}>
                Do zobaczenia w aucie.
              </div>
            </div>
            <button type="button" className="btn btn-secondary" onClick={cancel}>Anuluj</button>
          </div>
        ) : selectedSeat ? (
          <div className="blueprint" style={{
            padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12,
            margin: '0 6px', borderColor: 'var(--color-accent)',
          }}>
            <Corners />
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 19, lineHeight: 1.1 }}>
                {selectedSeat.label}
              </div>
              <div style={{ fontSize: 13, color: 'var(--color-neutral-700)', marginTop: 2 }}>
                Dotknij fotel jeszcze raz, żeby potwierdzić.
              </div>
            </div>
            <button type="button" className="btn btn-ghost" onClick={() => setSelected(null)}>Anuluj</button>
          </div>
        ) : isOwn && roster.length > 0 ? (
          <>
            <div className="kicker" style={{ margin: '10px 0 4px' }}>Kto jedzie</div>
            {roster.map((s) => (
              <div key={s.id} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0',
                borderTop: '1px solid var(--color-divider)',
              }}>
                <Avatar name={s.who!} size={34} fontSize={14} />
                <div style={{ flex: 1, fontWeight: 500 }}>{s.who}</div>
                <div style={{ fontSize: 13, color: 'var(--color-neutral-700)' }}>{s.label}</div>
              </div>
            ))}
          </>
        ) : isPassenger && free > 0 ? (
          <div style={{ textAlign: 'center', fontSize: 14, color: 'var(--color-neutral-700)', padding: '4px 0 8px' }}>
            Dotknij wolny fotel, żeby go wybrać.
          </div>
        ) : null}
      </div>
    </div>
  );
}
