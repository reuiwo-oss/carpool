import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import type { Seat } from '@carpool/shared';
import { cancelBooking, getRide, requestSeat, type RideDetail } from '../features/rides/ridesApi';
import { useAuth } from '../features/auth/AuthContext';
import { useToast } from '../components/ToastContext';
import { useUnread } from '../features/messages/UnreadContext';
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
  const { refresh } = useUnread();

  const [ride, setRide] = useState<RideDetail | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
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

  /**
   * Potwierdzone miejsce zalogowanego pasażera rysujemy jako MINE.
   * Oczekującą prośbę API oznaczyło już jako PENDING — nie nadpisujemy jej.
   */
  const seats: Seat[] = useMemo(() => {
    if (!ride) return [];
    if (!myBooking || myBooking.status !== 'ACCEPTED') return ride.seats;
    return ride.seats.map((s) =>
      s.id === myBooking.seatId ? { ...s, status: 'MINE' as const } : s,
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
  const myPendingSeat = myBooking?.status === 'PENDING'
    ? seats.find((s) => s.id === myBooking.seatId) ?? null
    : null;
  const roster = seats.filter((s) => (s.status === 'TAKEN' || s.status === 'PENDING') && s.who);

  /** Wysłanie prośby: drugi dotyk tego samego fotela albo przycisk w karcie. */
  const submitRequest = async (seat: Seat) => {
    if (!isPassenger || !user || busy) return;
    if (myBooking) {
      say('Masz już miejsce w tym aucie.');
      return;
    }
    setBusy(true);
    const before = ride;
    setSelected(null);
    setRide({
      ...ride,
      seats: ride.seats.map((s) => (s.id === seat.id ? { ...s, status: 'PENDING' as const } : s)),
      bookings: [
        ...ride.bookings,
        { id: 'optimistic', seatId: seat.id, passengerId: user.id, status: 'PENDING' },
      ],
    });
    try {
      await requestSeat(ride.id, seat.id, note);
      say(`Prośba wysłana: ${seat.label}.`);
      setNote('');
      await load();
      refresh();
    } catch (e) {
      setRide(before);
      say((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const tapSeat = (seat: Seat) => {
    if (!isPassenger) return;
    if (myBooking) {
      say('Masz już miejsce w tym aucie.');
      return;
    }
    if (selected !== seat.id) {
      setSelected(seat.id);
      return;
    }
    submitRequest(seat);
  };

  const cancel = async () => {
    if (!myBooking || busy) return;
    setBusy(true);
    const before = ride;
    setRide({ ...ride, bookings: ride.bookings.filter((b) => b.id !== myBooking.id) });
    try {
      await cancelBooking(myBooking.id);
      say(myBooking.status === 'PENDING' ? 'Prośba wycofana.' : 'Rezerwacja anulowana.');
      await load();
      refresh();
    } catch (e) {
      setRide(before);
      say((e as Error).message);
    } finally {
      setBusy(false);
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
            interior={ride.interior}
            selectedSeatId={selected}
            showNames={isOwn}
            onSelect={isPassenger ? tapSeat : undefined}
          />
        </div>

        <div className="legend">
          <span><i className="sw-free" />wolne</span>
          <span><i className="sw-pending" />czeka</span>
          <span><i className="sw-taken" />zajęte</span>
          <span><i className="sw-mine" />moje</span>
          <span><i className="sw-driver" />kierowca</span>
          <span><i className="sw-trunk" />bagażnik — wkrótce</span>
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
            <button type="button" className="btn btn-secondary" onClick={cancel} disabled={busy}>Anuluj</button>
          </div>
        ) : myPendingSeat ? (
          <div className="blueprint" style={{
            padding: '14px 16px', display: 'flex', flexDirection: 'column',
            gap: 10, margin: '0 6px', borderColor: 'var(--color-accent)',
          }}>
            <Corners />
            <div>
              <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 19, lineHeight: 1.1 }}>
                Prośba wysłana — {myPendingSeat.label}
              </div>
              <div style={{ fontSize: 13, color: 'var(--color-neutral-700)', marginTop: 2 }}>
                Miejsce jest dla ciebie zablokowane, dopóki {ride.driver.name} nie potwierdzi.
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-ghost" onClick={cancel} disabled={busy}>Wycofaj</button>
              <button type="button" className="btn btn-secondary" onClick={() => navigate('/messages')}>
                Napisz do kierowcy
              </button>
            </div>
          </div>
        ) : selectedSeat ? (
          <div className="blueprint" style={{
            padding: '14px 16px', display: 'flex', flexDirection: 'column',
            gap: 10, margin: '0 6px', borderColor: 'var(--color-accent)',
          }}>
            <Corners />
            <div>
              <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 19, lineHeight: 1.1 }}>
                {selectedSeat.label}
              </div>
              <div style={{ fontSize: 13, color: 'var(--color-neutral-700)', marginTop: 2 }}>
                Kierowca potwierdza każdą prośbę. Dotknij fotel jeszcze raz albo wyślij poniżej.
              </div>
            </div>
            <div className="field">
              <label htmlFor="seat-note">Pytania lub uwagi (opcjonalnie)</label>
              <textarea
                id="seat-note"
                className="input"
                placeholder="np. Będę miał duży plecak — zmieści się?"
                value={note}
                maxLength={1000}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-ghost" onClick={() => { setSelected(null); setNote(''); }}>
                Anuluj
              </button>
              <button type="button" className="btn btn-primary" disabled={busy}
                onClick={() => submitRequest(selectedSeat)}>
                Wyślij prośbę
              </button>
            </div>
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
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500 }}>{s.who}</div>
                  {s.status === 'PENDING' && (
                    <div style={{ fontSize: 12, color: 'var(--color-accent-700)' }}>czeka na potwierdzenie</div>
                  )}
                </div>
                <div style={{ fontSize: 13, color: 'var(--color-neutral-700)' }}>{s.label}</div>
              </div>
            ))}
            {roster.some((s) => s.status === 'PENDING') && (
              <button type="button" className="btn btn-secondary btn-block" style={{ marginTop: 10 }}
                onClick={() => navigate('/messages')}>
                Rozpatrz prośby w Wiadomościach
              </button>
            )}
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
