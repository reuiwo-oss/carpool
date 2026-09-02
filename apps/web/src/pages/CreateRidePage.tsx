import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createRide } from '../features/rides/ridesApi';

export default function CreateRidePage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    carModel: '',
    seatCount: 4,
    origin: '',
    destination: '',
    departureAt: '',
  });
  const [error, setError] = useState('');

  const submit = async () => {
    try {
      const ride = await createRide({ ...form, departureAt: new Date(form.departureAt).toISOString() });
      navigate(`/rides/${ride.id}`);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <>
      <h1>Nowy przejazd</h1>
      <input placeholder="Model auta (np. Škoda Octavia)" value={form.carModel}
        onChange={(e) => setForm({ ...form, carModel: e.target.value })} />
      <label>
        Miejsca dla pasażerów
        <input type="number" min={1} max={7} value={form.seatCount}
          onChange={(e) => setForm({ ...form, seatCount: Number(e.target.value) })} />
      </label>
      <input placeholder="Skąd" value={form.origin}
        onChange={(e) => setForm({ ...form, origin: e.target.value })} />
      <input placeholder="Dokąd" value={form.destination}
        onChange={(e) => setForm({ ...form, destination: e.target.value })} />
      <input type="datetime-local" value={form.departureAt}
        onChange={(e) => setForm({ ...form, departureAt: e.target.value })} />
      {error && <p>{error}</p>}
      <button onClick={submit}>Opublikuj przejazd</button>
    </>
  );
}
