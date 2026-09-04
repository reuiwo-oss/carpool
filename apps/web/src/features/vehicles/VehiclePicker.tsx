import { useEffect, useState } from 'react';
import {
  DEFAULT_INTERIOR,
  INTERIORS,
  SHIPPED_INTERIORS,
  seatLayoutFor,
  type Vehicle,
} from '@carpool/shared';
import { createVehicle, listVehicles } from './vehiclesApi';
import SeatMap from '../seat-picker/SeatMap';
import { Corners, LoadError } from '../../components/ui';

const INTERIOR_KEYS = Object.keys(INTERIORS);

export const vehicleLabel = (v: Vehicle) => [v.make, v.model].filter(Boolean).join(' ') || v.model;

/**
 * Formularz nowego auta. Stoi osobno od listy, bo używają go dwa ekrany:
 * garaż i formularz wycieczki — pytanie jest w obu identyczne.
 */
export function VehicleForm({
  onCreated,
  onCancel,
}: {
  onCreated: (vehicle: Vehicle) => void;
  onCancel?: () => void;
}) {
  const [form, setForm] = useState({ make: '', model: '', interior: DEFAULT_INTERIOR });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    setError('');
    try {
      const vehicle = await createVehicle(form);
      setForm({ make: '', model: '', interior: DEFAULT_INTERIOR });
      onCreated(vehicle);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="blueprint" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <Corners />
      <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 18 }}>Nowe auto</div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div className="field">
          <label htmlFor="v-make">Marka</label>
          <input id="v-make" className="input" placeholder="Škoda" value={form.make}
            onChange={(e) => setForm({ ...form, make: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="v-model">Model</label>
          <input id="v-model" className="input" placeholder="Octavia" value={form.model}
            onChange={(e) => setForm({ ...form, model: e.target.value })} />
        </div>
      </div>

      {/* Typ auta zamiast liczby miejsc — układ foteli wynika z wnętrza. */}
      <div className="field">
        <label id="v-interior-label">Typ auta</label>
        <div role="radiogroup" aria-labelledby="v-interior-label"
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
          {INTERIOR_KEYS.map((key) => {
            const it = INTERIORS[key];
            const shipped = SHIPPED_INTERIORS.includes(key);
            return (
              <button key={key} type="button" role="radio" aria-checked={form.interior === key}
                className={`btn ${form.interior === key ? 'btn-primary' : 'btn-secondary'}`}
                disabled={!shipped} title={shipped ? undefined : 'Wkrótce'}
                onClick={() => setForm({ ...form, interior: key })}
                style={{ minHeight: 46, flexDirection: 'column', gap: 1, padding: '6px 4px' }}>
                <span>{it.label}</span>
                <span style={{ fontSize: 11, opacity: 0.75, fontWeight: 400 }}>{it.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ padding: '0 40px' }}>
        <SeatMap seats={seatLayoutFor(form.interior)} interior={form.interior} backdrop="none" />
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        {onCancel && (
          <button type="button" className="btn btn-ghost" onClick={onCancel}>Anuluj</button>
        )}
        <button type="button" className="btn btn-primary" disabled={busy || !form.model.trim()} onClick={save}>
          Zapisz auto
        </button>
      </div>

      {error && <p role="alert" style={{ color: 'var(--color-accent-900)', fontSize: 14 }}>{error}</p>}
    </div>
  );
}

/**
 * Wybór auta z garażu z możliwością dodania nowego bez opuszczania formularza —
 * używany przy publikacji wycieczki i przy dokładaniu auta do cudzej.
 */
export default function VehiclePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (vehicleId: string) => void;
}) {
  const [vehicles, setVehicles] = useState<Vehicle[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [loadError, setLoadError] = useState('');

  const load = () => {
    setLoadError('');
    listVehicles()
      .then((rows) => {
        setVehicles(rows);
        // Pusty garaż od razu otwiera formularz — inaczej ekran wygląda
        // na zepsuty: lista aut bez ani jednego auta. Tylko po udanym
        // wczytaniu: nieosiągalne API to nie jest pusty garaż.
        if (rows.length === 0) setAdding(true);
        else if (!value) onChange(rows[0].id);
      })
      .catch((e) => setLoadError((e as Error).message));
  };

  useEffect(load, []);

  if (loadError) return <LoadError message={loadError} onRetry={load} />;

  if (vehicles === null) {
    return <p style={{ color: 'var(--color-neutral-700)', fontSize: 14 }}>Wczytywanie garażu…</p>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {vehicles.length > 0 && (
        <div className="field">
          <label id="vehicle-label">Twoje auto</label>
          <div role="radiogroup" aria-labelledby="vehicle-label"
            style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {vehicles.map((v) => (
              <button key={v.id} type="button" role="radio" aria-checked={value === v.id}
                className={`btn ${value === v.id ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => onChange(v.id)}
                style={{ minHeight: 46, justifyContent: 'space-between', padding: '6px 12px' }}>
                <span>{vehicleLabel(v)}</span>
                <span style={{ fontSize: 12, opacity: 0.75, fontWeight: 400 }}>
                  {v.seatLayout.length - 1} + kierowca
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {adding ? (
        <VehicleForm
          onCreated={(vehicle) => {
            setVehicles((rows) => [vehicle, ...(rows ?? [])]);
            onChange(vehicle.id);
            setAdding(false);
          }}
          onCancel={vehicles.length > 0 ? () => setAdding(false) : undefined}
        />
      ) : (
        <button type="button" className="btn btn-ghost" onClick={() => setAdding(true)}
          style={{ alignSelf: 'flex-start' }}>
          + Dodaj inne auto
        </button>
      )}
    </div>
  );
}
