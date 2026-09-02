import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateSeatLayout, type Seat } from '@carpool/shared';
import {
  cancelBooking,
  listMyBookings,
  listMyRides,
  type MyBooking,
  type MyRide,
} from '../features/rides/ridesApi';
import { useAuth } from '../features/auth/AuthContext';
import { useToast } from '../components/ToastContext';
import SeatMap from '../features/seat-picker/SeatMap';
import { Avatar, Corners } from '../components/ui';
import { formatWhen, plural } from '../lib/format';

/** Układ miejsc z zajętością — ten sam generator co po stronie API. */
function seatsWithBookings(seatCount: number, taken: string[], mineSeatId?: string): Seat[] {
  return generateSeatLayout(seatCount).map((seat) => {
    if (seat.status === 'DRIVER') return seat;
    if (mineSeatId && seat.id === mineSeatId) return { ...seat, status: 'MINE' as const };
    return taken.includes(seat.id) ? { ...seat, status: 'TAKEN' as const } : seat;
  });
}

export default function MinePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const say = useToast();
  const isDriver = user?.role === 'DRIVER';

  const [bookings, setBookings] = useState<MyBooking[] | null>(null);
  const [rides, setRides] = useState<MyRide[] | null>(null);

  const load = useCallback(() => {
    if (isDriver) listMyRides().then(setRides).catch(() => setRides([]));
    else listMyBookings().then(setBookings).catch(() => setBookings([]));
  }, [isDriver]);

  useEffect(load, [load]);

  const cancel = async (booking: MyBooking) => {
    const before = bookings;
    setBookings((bs) => bs?.filter((b) => b.id !== booking.id) ?? null);
    try {
      await cancelBooking(booking.id);
      say('Rezerwacja anulowana.');
      load();
    } catch (e) {
      setBookings(before);
      say((e as Error).message);
    }
  };

  const loading = isDriver ? rides === null : bookings === null;

  return (
    <div className="screen">
      <div style={{ padding: '10px 20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: 30, margin: 0 }}>{isDriver ? 'Moje przejazdy' : 'Moje rezerwacje'}</h1>
        {user && <Avatar name={user.name} size={40} fontSize={16} onClick={logout} title="Wyloguj" />}
      </div>

      <div className="screen-scroll" style={{ padding: '14px 20px 100px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {loading && <p style={{ color: 'var(--color-neutral-700)' }}>Wczytywanie…</p>}

        {/* — pasażer — */}
        {!isDriver && bookings?.length === 0 && (
          <div className="blueprint" style={{
            padding: '26px 20px', textAlign: 'center', margin: 6,
            display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center',
          }}>
            <Corners />
            <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 24 }}>Żadnych planów?</div>
            <div style={{ fontSize: 14, color: 'var(--color-neutral-700)' }}>Znajdź przejazd i wybierz fotel.</div>
            <button type="button" className="btn btn-secondary" style={{ marginTop: 6 }} onClick={() => navigate('/')}>
              Szukaj przejazdu
            </button>
          </div>
        )}

        {!isDriver && bookings?.map((b) => {
          const when = formatWhen(b.ride.departureAt);
          const seats = seatsWithBookings(
            b.ride.seatCount,
            (b.ride.bookings ?? []).map((x) => x.seatId),
            b.seatId,
          );
          const mySeat = seats.find((s) => s.id === b.seatId);
          return (
            <div key={b.id} className="blueprint" style={{
              padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10, margin: 6,
            }}>
              <Corners />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 21, lineHeight: 1.1 }}>
                  {b.ride.origin} → {b.ride.destination}
                </div>
                <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 21 }}>{when.time}</span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--color-neutral-700)' }}>
                {when.day} · {b.ride.carModel} · {b.ride.driver.name}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 92, flex: 'none' }}>
                  <SeatMap seats={seats} mini />
                </div>
                <div style={{ flex: 1 }}>
                  <div className="kicker">Twoje miejsce</div>
                  <div style={{ fontWeight: 500 }}>{mySeat?.label ?? b.seatId}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-ghost" onClick={() => cancel(b)}>Anuluj rezerwację</button>
                <button type="button" className="btn btn-secondary" onClick={() => navigate(`/rides/${b.rideId}`, {
                  state: { backTo: '/mine', backLabel: 'Rezerwacje' },
                })}>
                  Szczegóły
                </button>
              </div>
            </div>
          );
        })}

        {/* — kierowca — */}
        {isDriver && rides?.length === 0 && (
          <div className="blueprint" style={{
            padding: '26px 20px', textAlign: 'center', margin: 6,
            display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center',
          }}>
            <Corners />
            <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 24 }}>Jeszcze nic nie jedzie</div>
            <div style={{ fontSize: 14, color: 'var(--color-neutral-700)' }}>Opublikuj przejazd i zabierz kogoś ze sobą.</div>
            <button type="button" className="btn btn-secondary" style={{ marginTop: 6 }} onClick={() => navigate('/rides/new')}>
              Nowy przejazd
            </button>
          </div>
        )}

        {isDriver && rides?.map((r) => {
          const when = formatWhen(r.departureAt);
          const seats = seatsWithBookings(r.seatCount, r.bookings.map((x) => x.seatId));
          const names = r.bookings.map((x) => x.passenger.name).join(', ');
          return (
            <button key={r.id} type="button" className="blueprint"
              onClick={() => navigate(`/rides/${r.id}`, { state: { backTo: '/mine', backLabel: 'Moje przejazdy' } })}
              style={{
                padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10, margin: 6,
                textAlign: 'left', background: 'transparent', cursor: 'pointer',
                fontFamily: 'var(--font-body)', color: 'var(--color-text)',
              }}>
              <Corners />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, width: '100%' }}>
                <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 21, lineHeight: 1.1 }}>
                  {r.origin} → {r.destination}
                </div>
                <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 21 }}>{when.time}</span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--color-neutral-700)' }}>{when.day} · {r.carModel}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
                <div style={{ width: 92, flex: 'none' }}>
                  <SeatMap seats={seats} mini />
                </div>
                <div style={{ flex: 1 }}>
                  <div className="kicker">Obsada</div>
                  <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 22, lineHeight: 1.1 }}>
                    {r.bookings.length} z {r.seatCount}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--color-neutral-700)' }}>
                    {names || 'Jeszcze nikt — podziel się linkiem'}
                  </div>
                </div>
              </div>
            </button>
          );
        })}

        {isDriver && rides && rides.length > 0 && (
          <p className="kicker" style={{ textAlign: 'center', margin: 0 }}>
            {rides.length} {plural(rides.length, 'przejazd', 'przejazdy', 'przejazdów')}
          </p>
        )}
      </div>
    </div>
  );
}
