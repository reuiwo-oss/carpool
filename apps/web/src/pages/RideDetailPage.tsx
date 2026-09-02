import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { RideOffer } from '@carpool/shared';
import { bookSeat, getRide } from '../features/rides/ridesApi';
import { useAuth } from '../features/auth/AuthContext';
import SeatMap from '../features/seat-picker/SeatMap';

export default function RideDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [ride, setRide] = useState<RideOffer | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const load = () => getRide(id!).then(setRide).catch(console.error);
  useEffect(() => { load(); }, [id]);

  if (!ride) return <p>Wczytywanie przejazdu…</p>;

  const confirm = async () => {
    if (!selected) return;
    try {
      await bookSeat(ride.id, selected);
      setMessage('Miejsce zarezerwowane. Do zobaczenia w aucie!');
      setSelected(null);
      load(); // odśwież stan miejsc
    } catch (e) {
      setMessage((e as Error).message);
      load();
    }
  };

  return (
    <>
      <h1>{ride.origin} → {ride.destination}</h1>
      <p>
        {ride.carModel} · kierowca: {ride.driverName ?? '—'} · odjazd{' '}
        {new Date(ride.departureAt).toLocaleString('pl-PL')}
      </p>

      <SeatMap seats={ride.seats} selectedSeatId={selected} onSelect={setSelected} />

      {user?.role === 'PASSENGER' && (
        <button disabled={!selected} onClick={confirm}>
          {selected ? 'Zarezerwuj to miejsce' : 'Wybierz wolne miejsce na schemacie'}
        </button>
      )}
      {message && <p>{message}</p>}
    </>
  );
}
