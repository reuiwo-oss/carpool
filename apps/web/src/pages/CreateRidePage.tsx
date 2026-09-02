import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { generateSeatLayout } from '@carpool/shared';
import { createRide } from '../features/rides/ridesApi';
import { useToast } from '../components/ToastContext';
import SeatMap from '../features/seat-picker/SeatMap';
import { MinusIcon, PlusIcon } from '../components/icons';
import { BackButton, PrimaryButton } from '../components/ui';
import { toDatetimeLocal } from '../lib/format';

const MIN_SEATS = 1;
const MAX_SEATS = 7;

/** Domyślny odjazd: jutro rano — najczęstszy przypadek, a pole i tak jest edytowalne. */
function defaultDeparture() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(8, 0, 0, 0);
  return toDatetimeLocal(d);
}

export default function CreateRidePage() {
  const navigate = useNavigate();
  const say = useToast();
  const [params] = useSearchParams();

  const [form, setForm] = useState({
    // Ze stanu pustego wyszukiwania wchodzimy tu z gotową trasą.
    origin: params.get('from') ?? '',
    destination: params.get('to') ?? '',
    departureAt: defaultDeparture(),
    carModel: '',
    seatCount: 4,
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Podgląd tego, co zobaczy pasażer — ten sam generator co po stronie API.
  const previewSeats = useMemo(() => generateSeatLayout(form.seatCount), [form.seatCount]);

  const setSeats = (n: number) =>
    setForm((f) => ({ ...f, seatCount: Math.min(MAX_SEATS, Math.max(MIN_SEATS, n)) }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const ride = await createRide({
        ...form,
        departureAt: new Date(form.departureAt).toISOString(),
      });
      say('Przejazd opublikowany.');
      navigate(`/rides/${ride.id}`, { state: { backTo: '/mine', backLabel: 'Moje przejazdy' } });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="screen" onSubmit={submit}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '4px 12px 0' }}>
        <BackButton label="Wróć" onClick={() => navigate(-1)} />
      </div>

      <div className="screen-scroll" style={{ padding: '4px 20px 40px' }}>
        <h1 style={{ fontSize: 32, margin: '0 0 18px' }}>Nowy przejazd</h1>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="field">
              <label htmlFor="ride-from">Skąd</label>
              <input id="ride-from" className="input" placeholder="Kraków" value={form.origin}
                onChange={(e) => setForm({ ...form, origin: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="ride-to">Dokąd</label>
              <input id="ride-to" className="input" placeholder="Zakopane" value={form.destination}
                onChange={(e) => setForm({ ...form, destination: e.target.value })} />
            </div>
          </div>

          <div className="field">
            <label htmlFor="ride-when">Odjazd</label>
            <input id="ride-when" className="input" type="datetime-local" value={form.departureAt}
              onChange={(e) => setForm({ ...form, departureAt: e.target.value })} />
          </div>

          <div className="field">
            <label htmlFor="ride-car">Model auta</label>
            <input id="ride-car" className="input" placeholder="np. Škoda Octavia" value={form.carModel}
              onChange={(e) => setForm({ ...form, carModel: e.target.value })} />
          </div>

          <div className="field">
            <label id="seats-label">Miejsca dla pasażerów</label>
            <div style={{ display: 'grid', gridTemplateColumns: '46px 1fr 46px', gap: 10, alignItems: 'center' }}>
              <button type="button" className="btn btn-secondary" style={{ height: 46, padding: 0 }}
                onClick={() => setSeats(form.seatCount - 1)}
                disabled={form.seatCount <= MIN_SEATS} aria-label="Mniej miejsc">
                <MinusIcon size={18} />
              </button>
              <div aria-live="polite" aria-labelledby="seats-label" style={{
                textAlign: 'center', fontFamily: 'var(--font-heading)',
                fontWeight: 600, fontSize: 30, lineHeight: 1,
              }}>
                {form.seatCount}
              </div>
              <button type="button" className="btn btn-secondary" style={{ height: 46, padding: 0 }}
                onClick={() => setSeats(form.seatCount + 1)}
                disabled={form.seatCount >= MAX_SEATS} aria-label="Więcej miejsc">
                <PlusIcon size={18} />
              </button>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', margin: '22px 0 2px' }}>
          <h2 style={{ fontSize: 20, margin: 0 }}>Tak zobaczą to pasażerowie</h2>
          <span style={{ fontSize: 12, color: 'var(--color-neutral-600)' }}>{form.seatCount} + kierowca</span>
        </div>

        <div style={{ padding: '4px 40px 0' }}>
          <SeatMap seats={previewSeats} />
        </div>

        <PrimaryButton type="submit" disabled={busy} style={{ marginTop: 20 }}>
          Opublikuj przejazd
        </PrimaryButton>

        {error && (
          <p role="alert" style={{ color: 'var(--color-accent-900)', fontSize: 14, marginTop: 12 }}>
            {error}
          </p>
        )}
      </div>
    </form>
  );
}
