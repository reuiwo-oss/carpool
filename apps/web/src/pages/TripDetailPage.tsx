import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  deriveParticipantRoles,
  type LegDirection,
  type Seat,
  type Trip,
  type TripRide,
} from '@carpool/shared';
import {
  acceptReservation,
  addTripRide,
  cancelReservation,
  getTrip,
  joinTrip,
  leaveTrip,
  removeTripRide,
  reserveSeat,
} from '../features/trips/tripsApi';
import { RoleBadges } from '../features/trips/roles';
import VehiclePicker from '../features/vehicles/VehiclePicker';
import { useAuth } from '../features/auth/AuthContext';
import { useToast } from '../components/ToastContext';
import SeatMap from '../features/seat-picker/SeatMap';
import { CheckIcon } from '../components/icons';
import { Avatar, BackButton, Corners, PrimaryButton } from '../components/ui';
import { formatWhen, toDatetimeLocal } from '../lib/format';

interface BackState {
  backTo?: string;
  backLabel?: string;
}

const LEG_LABEL: Record<LegDirection, string> = { OUTBOUND: 'Dojazd', RETURN: 'Powrót' };

export default function TripDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const say = useToast();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<{ rideId: string; seatId: string } | null>(null);
  const [addingCar, setAddingCar] = useState(false);
  const [busy, setBusy] = useState(false);

  const { backTo = '/', backLabel = 'Wyniki' } = (location.state ?? {}) as BackState;

  const load = () => getTrip(id!).then(setTrip).catch((e) => setError((e as Error).message));
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  /** Role liczy ta sama funkcja co po stronie API — jedno źródło prawdy. */
  const myRoles = useMemo(
    () => (trip && user ? deriveParticipantRoles(user.id, trip) : []),
    [trip, user],
  );

  const myReservation = useMemo(() => {
    if (!trip || !user) return null;
    for (const ride of trip.rides) {
      const found = ride.reservations.find((r) => r.userId === user.id);
      if (found) return { ...found, ride };
    }
    return null;
  }, [trip, user]);

  if (error) return <p style={{ padding: 20, color: 'var(--color-accent-900)' }}>{error}</p>;
  if (!trip || !user) {
    return <p style={{ padding: 20, color: 'var(--color-neutral-700)' }}>Wczytywanie wycieczki…</p>;
  }

  const isParticipant = myRoles.length > 0;
  const myRide = trip.rides.find((r) => r.driverId === user.id) ?? null;
  const isOrganizer = myRoles.includes('ORGANIZER');
  const nameOf = (userId: string) =>
    trip.participants.find((p) => p.userId === userId)?.name ?? 'Uczestnik';

  const lookingForSeat = trip.participants.filter((p) =>
    deriveParticipantRoles(p.userId, trip).includes('LOOKING_FOR_SEAT'),
  );

  const starts = formatWhen(trip.startsAt);
  const ends = formatWhen(trip.endsAt);

  /** Własne potwierdzone miejsce rysujemy jako MINE; oczekujące API dało już jako PENDING. */
  const seatsOf = (ride: TripRide): Seat[] => {
    if (!myReservation || myReservation.rideId !== ride.id || myReservation.status !== 'ACCEPTED') {
      return ride.seats;
    }
    return ride.seats.map((s) =>
      s.id === myReservation.seatId ? { ...s, status: 'MINE' as const } : s,
    );
  };

  const run = async (action: () => Promise<unknown>, done: string) => {
    if (busy) return;
    setBusy(true);
    try {
      await action();
      say(done);
      setSelected(null);
      await load();
    } catch (e) {
      say((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const tapSeat = (ride: TripRide) => (seat: Seat) => {
    if (myReservation) {
      say('Masz już miejsce w tej wycieczce.');
      return;
    }
    setSelected({ rideId: ride.id, seatId: seat.id });
  };

  const canReserveIn = (ride: TripRide) =>
    isParticipant && !myReservation && ride.driverId !== user.id;

  return (
    <div className="screen">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 12px 0' }}>
        <BackButton label={backLabel} onClick={() => navigate(backTo)} />
        <span className="tag tag-neutral" style={{ marginRight: 8 }}>{starts.day}</span>
      </div>

      <div className="screen-scroll" style={{ padding: '6px 20px 40px' }}>
        <h1 style={{ fontSize: 32, margin: 0, lineHeight: 1.05 }}>{trip.title}</h1>
        <div style={{ fontSize: 15, color: 'var(--color-neutral-700)', marginTop: 4 }}>
          {trip.destination}
        </div>

        <div style={{
          display: 'flex', gap: 20, margin: '14px 0 6px', padding: '12px 0',
          borderTop: '1px solid var(--color-divider)', borderBottom: '1px solid var(--color-divider)',
        }}>
          <div>
            <div className="kicker">Wyjazd</div>
            <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 22, lineHeight: 1.1 }}>
              {starts.time}
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-neutral-600)' }}>{starts.dayShort}</div>
          </div>
          <div>
            <div className="kicker">Powrót</div>
            <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 22, lineHeight: 1.1 }}>
              {ends.time}
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-neutral-600)' }}>{ends.dayShort}</div>
          </div>
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <div className="kicker">Wolne</div>
            <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 22, lineHeight: 1.1 }}>
              {trip.freeSeats}
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-neutral-600)' }}>
              {trip.rides.length} {trip.rides.length === 1 ? 'auto' : 'auta'}
            </div>
          </div>
        </div>

        {trip.description && (
          <p style={{ fontSize: 14, color: 'var(--color-neutral-700)', margin: '10px 0 0', textWrap: 'pretty' }}>
            {trip.description}
          </p>
        )}

        {/* — uczestnicy — */}
        <h2 style={{ fontSize: 20, margin: '22px 0 4px' }}>Kto jedzie</h2>
        {trip.participants.map((p) => (
          <div key={p.userId} style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0',
            borderTop: '1px solid var(--color-divider)',
          }}>
            <Avatar name={p.name} size={34} fontSize={14} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 500 }}>
                {p.name}{p.userId === user.id ? ' · ty' : ''}
              </div>
            </div>
            <RoleBadges roles={deriveParticipantRoles(p.userId, trip)} />
          </div>
        ))}

        {lookingForSeat.length > 0 && (
          <div className="blueprint" style={{ padding: '14px 16px', margin: '16px 6px 0' }}>
            <Corners />
            <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 18, lineHeight: 1.1 }}>
              Szukają miejsca
            </div>
            <div style={{ fontSize: 13, color: 'var(--color-neutral-700)', margin: '4px 0 10px' }}>
              Te osoby są w wycieczce, ale nie mają jeszcze ani auta, ani fotela.
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {lookingForSeat.map((p) => (
                <span key={p.userId} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Avatar name={p.name} size={26} fontSize={11} />
                  <span style={{ fontSize: 14 }}>{p.name}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* — auta — */}
        <h2 style={{ fontSize: 20, margin: '24px 0 4px' }}>
          {trip.rides.length === 0 ? 'Jeszcze bez auta' : 'Auta w wycieczce'}
        </h2>

        {trip.rides.length === 0 && (
          <p style={{ fontSize: 14, color: 'var(--color-neutral-700)', margin: '4px 0 0' }}>
            Nikt nie zgłosił jeszcze samochodu. Każdy uczestnik może dodać swój — bez pytania organizatora.
          </p>
        )}

        {trip.rides.map((ride) => {
          const seats = seatsOf(ride);
          const isMine = ride.driverId === user.id;
          const pending = isMine ? ride.reservations.filter((r) => r.status === 'PENDING') : [];
          const chosen = selected?.rideId === ride.id ? selected.seatId : null;
          const chosenSeat = seats.find((s) => s.id === chosen) ?? null;

          return (
            <div key={ride.id} style={{ margin: '14px 0 0', paddingTop: 12, borderTop: '1px solid var(--color-divider)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Avatar name={ride.driverName} size={38} fontSize={15} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500 }}>{ride.driverName}{isMine ? ' · ty' : ''}</div>
                  {ride.note && (
                    <div style={{ fontSize: 13, color: 'var(--color-neutral-700)' }}>{ride.note}</div>
                  )}
                </div>
                {(isMine || isOrganizer) && (
                  <button type="button" className="btn btn-ghost" disabled={busy}
                    onClick={() => run(() => removeTripRide(trip.id, ride.id), 'Auto wypisane z wycieczki.')}>
                    Usuń auto
                  </button>
                )}
              </div>

              <div style={{ padding: '8px 6px 0' }}>
                <SeatMap
                  seats={seats}
                  interior={ride.interior}
                  selectedSeatId={chosen}
                  showNames={isParticipant}
                  onSelect={canReserveIn(ride) ? tapSeat(ride) : undefined}
                />
              </div>

              {/* Odcinki pod schematem — auto należy do całej wycieczki. */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                {ride.legs.map((leg) => {
                  const when = formatWhen(leg.departureAt);
                  return (
                    <div key={leg.id} style={{ display: 'flex', alignItems: 'baseline', gap: 10, fontSize: 14 }}>
                      <span className="tag tag-outline" style={{ fontSize: 11 }}>{LEG_LABEL[leg.direction]}</span>
                      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {leg.origin}
                      </span>
                      <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 600 }}>{when.time}</span>
                      <span style={{ fontSize: 12, color: 'var(--color-neutral-600)' }}>{when.dayShort}</span>
                    </div>
                  );
                })}
              </div>

              {chosenSeat && (
                <div className="blueprint" style={{
                  padding: '14px 16px', display: 'flex', flexDirection: 'column',
                  gap: 10, margin: '12px 6px 0', borderColor: 'var(--color-accent)',
                }}>
                  <Corners />
                  <div>
                    <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 19, lineHeight: 1.1 }}>
                      {chosenSeat.label}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--color-neutral-700)', marginTop: 2 }}>
                      Miejsce na oba odcinki. {ride.driverName} potwierdza każdą prośbę.
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button type="button" className="btn btn-ghost" onClick={() => setSelected(null)}>
                      Anuluj
                    </button>
                    <button type="button" className="btn btn-primary" disabled={busy}
                      onClick={() => run(
                        () => reserveSeat(trip.id, ride.id, chosenSeat.id),
                        `Prośba wysłana: ${chosenSeat.label}.`,
                      )}>
                      Zarezerwuj miejsce
                    </button>
                  </div>
                </div>
              )}

              {pending.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <div className="kicker">Prośby o miejsce</div>
                  {pending.map((r) => (
                    <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
                      <Avatar name={nameOf(r.userId)} size={30} fontSize={12} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 500 }}>{nameOf(r.userId)}</div>
                        <div style={{ fontSize: 12, color: 'var(--color-neutral-700)' }}>
                          {seats.find((s) => s.id === r.seatId)?.label ?? r.seatId}
                        </div>
                      </div>
                      <button type="button" className="btn btn-ghost" disabled={busy}
                        onClick={() => run(() => cancelReservation(r.id), 'Prośba odrzucona.')}>
                        Odrzuć
                      </button>
                      <button type="button" className="btn btn-primary" disabled={busy}
                        onClick={() => run(() => acceptReservation(r.id), 'Miejsce potwierdzone.')}>
                        Potwierdź
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* — dokładanie własnego auta — */}
        {addingCar && <AddCarPanel trip={trip} onClose={() => setAddingCar(false)} onDone={load} />}

        {/* — akcje — */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 26 }}>
          {myReservation && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 6 }}>
              <CheckIcon size={22} color="var(--color-accent)" />
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 19, lineHeight: 1.1 }}>
                  {myReservation.status === 'ACCEPTED' ? 'Jedziesz' : 'Prośba wysłana'} —{' '}
                  {myReservation.ride.seats.find((s) => s.id === myReservation.seatId)?.label ?? myReservation.seatId}
                </div>
                <div style={{ fontSize: 13, color: 'var(--color-neutral-700)', marginTop: 2 }}>
                  {myReservation.status === 'ACCEPTED'
                    ? `Autem, które prowadzi ${myReservation.ride.driverName}.`
                    : `Miejsce jest zablokowane, dopóki ${myReservation.ride.driverName} nie potwierdzi.`}
                </div>
              </div>
              <button type="button" className="btn btn-secondary" disabled={busy}
                onClick={() => run(() => cancelReservation(myReservation.id), 'Rezerwacja anulowana.')}>
                Anuluj
              </button>
            </div>
          )}

          {!isParticipant && (
            <PrimaryButton disabled={busy} onClick={() => run(() => joinTrip(trip.id), 'Jesteś w wycieczce.')}>
              Dołącz do wycieczki
            </PrimaryButton>
          )}

          {isParticipant && !myRide && !addingCar && (
            <button type="button" className="btn btn-secondary btn-block" style={{ minHeight: 46 }}
              onClick={() => setAddingCar(true)}>
              Dodaj swoje auto
            </button>
          )}

          {isParticipant && (
            <button type="button" className="btn btn-ghost btn-block" style={{ minHeight: 44 }} disabled={busy}
              onClick={() => run(async () => {
                await leaveTrip(trip.id);
                navigate('/mine');
              }, 'Opuszczasz wycieczkę.')}>
              Opuść wycieczkę
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Dokładanie auta do istniejącej wycieczki — te same pola co przy publikacji. */
function AddCarPanel({
  trip,
  onClose,
  onDone,
}: {
  trip: Trip;
  onClose: () => void;
  onDone: () => void;
}) {
  const say = useToast();
  const [vehicleId, setVehicleId] = useState('');
  const [form, setForm] = useState({
    outboundOrigin: '',
    outboundAt: toDatetimeLocal(new Date(trip.startsAt)),
    backOrigin: '',
    backAt: toDatetimeLocal(new Date(trip.endsAt)),
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!vehicleId) {
      setError('Wybierz auto albo dodaj nowe.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await addTripRide(trip.id, {
        vehicleId,
        legs: [
          {
            direction: 'OUTBOUND',
            origin: form.outboundOrigin.trim(),
            departureAt: new Date(form.outboundAt).toISOString(),
          },
          {
            direction: 'RETURN',
            origin: form.backOrigin.trim(),
            departureAt: new Date(form.backAt).toISOString(),
          },
        ],
      });
      say('Twoje auto jedzie w tej wycieczce.');
      onClose();
      onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="blueprint" style={{ padding: '16px 16px', margin: '20px 6px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Corners />
      <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 20 }}>Twoje auto</div>

      <VehiclePicker value={vehicleId} onChange={setVehicleId} />

      <div className="field">
        <label htmlFor="add-out-origin">Zbiórka na dojazd</label>
        <input id="add-out-origin" className="input" placeholder="Kraków, Rondo Mogilskie"
          value={form.outboundOrigin} onChange={(e) => setForm({ ...form, outboundOrigin: e.target.value })} />
      </div>
      <div className="field">
        <label htmlFor="add-out-at">Wyjazd</label>
        <input id="add-out-at" className="input" type="datetime-local"
          value={form.outboundAt} onChange={(e) => setForm({ ...form, outboundAt: e.target.value })} />
      </div>
      <div className="field">
        <label htmlFor="add-back-origin">Zbiórka na powrót</label>
        <input id="add-back-origin" className="input" placeholder="Zakopane, Dworzec"
          value={form.backOrigin} onChange={(e) => setForm({ ...form, backOrigin: e.target.value })} />
      </div>
      <div className="field">
        <label htmlFor="add-back-at">Wyjazd w drogę powrotną</label>
        <input id="add-back-at" className="input" type="datetime-local"
          value={form.backAt} onChange={(e) => setForm({ ...form, backAt: e.target.value })} />
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-ghost" onClick={onClose}>Anuluj</button>
        <button type="button" className="btn btn-primary" disabled={busy} onClick={submit}>
          Dodaj auto
        </button>
      </div>

      {error && <p role="alert" style={{ color: 'var(--color-accent-900)', fontSize: 14 }}>{error}</p>}
    </div>
  );
}
