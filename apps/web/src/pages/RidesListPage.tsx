import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { RideOffer } from '@carpool/shared';
import { listRides } from '../features/rides/ridesApi';

export default function RidesListPage() {
  const [rides, setRides] = useState<RideOffer[]>([]);

  useEffect(() => {
    listRides().then(setRides).catch(console.error);
  }, []);

  if (rides.length === 0) {
    return <p>Nie ma jeszcze żadnych przejazdów. Kierowcy mogą dodać pierwszy.</p>;
  }

  return (
    <>
      <h1>Nadchodzące przejazdy</h1>
      <ul>
        {rides.map((r) => (
          <li key={r.id}>
            <Link to={`/rides/${r.id}`}>
              {r.origin} → {r.destination}
            </Link>{' '}
            — {r.carModel}, odjazd {new Date(r.departureAt).toLocaleString('pl-PL')}
          </li>
        ))}
      </ul>
    </>
  );
}
