import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  DEFAULT_INTERIOR,
  INTERIORS,
  SHIPPED_INTERIORS,
  seatLayoutFor,
} from '@carpool/shared';
import { createRide } from '../features/rides/ridesApi';
import { useToast } from '../components/ToastContext';
import SeatMap from '../features/seat-picker/SeatMap';
import { BackButton, PrimaryButton } from '../components/ui';
import { toDatetimeLocal } from '../lib/format';

/** Domyślny odjazd: jutro rano — najczęstszy przypadek, a pole i tak jest edytowalne. */
function defaultDeparture() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(8, 0, 0, 0);
  return toDatetimeLocal(d);
}

const INTERIOR_KEYS = Object.keys(INTERIORS);

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
    interior: DEFAULT_INTERIOR,
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Podgląd tego, co zobaczy pasażer — ten sam generator co po stronie API.
  const previewSeats = useMemo(() => seatLayoutFor(form.interior), [form.interior]);
  const seatCount = INTERIORS[form.interior].slots.length;

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

          {/*
            Typ auta zastąpił stepper — liczba miejsc wynika z wnętrza.
            W tej fazie wdrożone jest tylko Kombi; SUV i pickup są widoczne,
            ale wyłączone, żeby było jasne, co dojdzie później.
          */}
          <div className="field">
            <label id="interior-label">Typ auta</label>
            <div role="radiogroup" aria-labelledby="interior-label"
              style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
              {INTERIOR_KEYS.map((key) => {
                const it = INTERIORS[key];
                const selected = form.interior === key;
                const shipped = SHIPPED_INTERIORS.includes(key);
                return (
                  <button
                    key={key}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    className={`btn ${selected ? 'btn-primary' : 'btn-secondary'}`}
                    disabled={!shipped}
                    title={shipped ? undefined : 'Wkrótce'}
                    onClick={() => setForm({ ...form, interior: key })}
                    style={{ minHeight: 46, flexDirection: 'column', gap: 1, padding: '6px 4px' }}
                  >
                    <span>{it.label}</span>
                    <span style={{ fontSize: 11, opacity: 0.75, fontWeight: 400 }}>{it.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', margin: '22px 0 2px' }}>
          <h2 style={{ fontSize: 20, margin: 0 }}>Tak zobaczą to pasażerowie</h2>
          <span style={{ fontSize: 12, color: 'var(--color-neutral-600)' }}>{seatCount} + kierowca</span>
        </div>

        <div style={{ padding: '4px 40px 0' }}>
          <SeatMap seats={previewSeats} interior={form.interior} backdrop="none" />
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
