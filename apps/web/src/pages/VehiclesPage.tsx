import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Vehicle } from '@carpool/shared';
import { deleteVehicle, listVehicles } from '../features/vehicles/vehiclesApi';
import { VehicleForm, vehicleLabel } from '../features/vehicles/VehiclePicker';
import { useToast } from '../components/ToastContext';
import SeatMap from '../features/seat-picker/SeatMap';
import { BackButton, Corners, LoadError } from '../components/ui';

export default function VehiclesPage() {
  const navigate = useNavigate();
  const say = useToast();
  const [vehicles, setVehicles] = useState<Vehicle[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [loadError, setLoadError] = useState('');

  const load = () => {
    setLoadError('');
    listVehicles().then(setVehicles).catch((e) => setLoadError((e as Error).message));
  };
  useEffect(load, []);

  const remove = async (vehicle: Vehicle) => {
    try {
      await deleteVehicle(vehicle.id);
      say('Auto usunięte z garażu.');
      load();
    } catch (e) {
      say((e as Error).message);
    }
  };

  return (
    <div className="screen">
      <div style={{ display: 'flex', alignItems: 'center', padding: '4px 12px 0' }}>
        <BackButton label="Moje wycieczki" onClick={() => navigate('/mine')} />
      </div>

      <div className="screen-scroll" style={{ padding: '4px 20px 40px' }}>
        <h1 style={{ fontSize: 32, margin: '0 0 6px' }}>Moje auta</h1>
        <p style={{ fontSize: 14, color: 'var(--color-neutral-700)', margin: '0 0 18px' }}>
          Auto z garażu zgłaszasz do dowolnej wycieczki. Układ foteli zapisuje się wtedy osobno,
          więc późniejsza zmiana tutaj nie przestawia miejsc ludziom, którzy już jadą.
        </p>

        {loadError && <LoadError message={loadError} onRetry={load} />}
        {!loadError && vehicles === null && (
          <p style={{ color: 'var(--color-neutral-700)' }}>Wczytywanie garażu…</p>
        )}

        {!loadError && vehicles?.length === 0 && !adding && (
          <div className="blueprint" style={{
            padding: '26px 20px', textAlign: 'center', margin: 6,
            display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center',
          }}>
            <Corners />
            <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 24 }}>Pusty garaż</div>
            <div style={{ fontSize: 14, color: 'var(--color-neutral-700)' }}>
              Dodaj auto, a będziesz mógł wozić innych.
            </div>
            <button type="button" className="btn btn-secondary" style={{ marginTop: 6 }} onClick={() => setAdding(true)}>
              Dodaj auto
            </button>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {vehicles?.map((v) => (
            <div key={v.id} className="blueprint" style={{
              padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14, margin: 6,
            }}>
              <Corners />
              <div style={{ width: 92, flex: 'none' }}>
                <SeatMap seats={v.seatLayout} interior={v.interior} mini />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 20, lineHeight: 1.1 }}>
                  {vehicleLabel(v)}
                </div>
                <div style={{ fontSize: 13, color: 'var(--color-neutral-700)', marginTop: 2 }}>
                  {v.seatLayout.length - 1} miejsc dla pasażerów
                </div>
              </div>
              <button type="button" className="btn btn-ghost" onClick={() => remove(v)}>Usuń</button>
            </div>
          ))}
        </div>

        {/* Ten sam formularz co przy publikacji wycieczki — jedno miejsce na „dodaj auto". */}
        <div style={{ marginTop: 18, margin: '18px 6px 0' }}>
          {adding ? (
            <VehicleForm
              onCreated={() => {
                say('Auto dodane do garażu.');
                setAdding(false);
                load();
              }}
              onCancel={vehicles && vehicles.length > 0 ? () => setAdding(false) : undefined}
            />
          ) : (
            vehicles &&
            vehicles.length > 0 && (
              <button type="button" className="btn btn-secondary btn-block" style={{ minHeight: 46 }}
                onClick={() => setAdding(true)}>
                + Dodaj auto
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
