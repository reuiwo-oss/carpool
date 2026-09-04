import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { addTripRide, createTrip } from '../features/trips/tripsApi';
import VehiclePicker from '../features/vehicles/VehiclePicker';
import { useToast } from '../components/ToastContext';
import { BackButton, PrimaryButton } from '../components/ui';
import { toDatetimeLocal } from '../lib/format';

/** Domyślnie: wyjazd jutro rano, powrót dwa dni później po południu. */
function defaultDates() {
  const out = new Date();
  out.setDate(out.getDate() + 1);
  out.setHours(8, 0, 0, 0);
  const back = new Date(out);
  back.setDate(back.getDate() + 2);
  back.setHours(16, 0, 0, 0);
  return { outbound: toDatetimeLocal(out), back: toDatetimeLocal(back) };
}

export default function CreateTripPage() {
  const navigate = useNavigate();
  const say = useToast();
  const [params] = useSearchParams();
  const dates = defaultDates();

  // Z ekranu próśb wchodzimy tu z gotowym celem.
  const wanted = params.get('destination') ?? '';

  const [form, setForm] = useState({
    title: wanted,
    destination: wanted,
    description: '',
    vehicleId: '',
    note: '',
    outboundOrigin: '',
    outboundAt: dates.outbound,
    backOrigin: '',
    backAt: dates.back,
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (patch: Partial<typeof form>) => setForm({ ...form, ...patch });

  /**
   * Pod spodem lecą dwa żądania — najpierw wycieczka, potem auto z odcinkami.
   * Użytkownik widzi jeden formularz i nie ma powodu wiedzieć o podziale.
   * Gdy potknie się drugie żądanie, wycieczka już istnieje, więc zamiast
   * gubić dane wpuszczamy go do środka z komunikatem, czego brakuje.
   */
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.vehicleId) {
      setError('Wybierz auto albo dodaj nowe.');
      return;
    }
    setBusy(true);
    setError('');

    const outboundAt = new Date(form.outboundAt).toISOString();
    const backAt = new Date(form.backAt).toISOString();
    let tripId: string | null = null;

    try {
      const trip = await createTrip({
        title: form.title.trim(),
        destination: form.destination.trim(),
        description: form.description.trim() || undefined,
        startsAt: outboundAt,
        endsAt: backAt,
      });
      tripId = trip.id;

      await addTripRide(trip.id, {
        vehicleId: form.vehicleId,
        note: form.note.trim() || undefined,
        legs: [
          { direction: 'OUTBOUND', origin: form.outboundOrigin.trim(), departureAt: outboundAt },
          { direction: 'RETURN', origin: form.backOrigin.trim(), departureAt: backAt },
        ],
      });

      say('Wycieczka opublikowana.');
      navigate(`/trips/${trip.id}`, { state: { backTo: '/mine', backLabel: 'Moje wycieczki' } });
    } catch (err) {
      if (tripId) {
        say('Wycieczka powstała, ale auta nie udało się dopisać.');
        navigate(`/trips/${tripId}`, { state: { backTo: '/mine', backLabel: 'Moje wycieczki' } });
        return;
      }
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
        <h1 style={{ fontSize: 32, margin: '0 0 18px' }}>Nowa wycieczka</h1>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="field">
            <label htmlFor="t-title">Nazwa</label>
            <input id="t-title" className="input" placeholder="np. Weekend w Tatrach" required
              value={form.title} onChange={(e) => set({ title: e.target.value })} />
          </div>

          <div className="field">
            <label htmlFor="t-destination">Cel</label>
            <input id="t-destination" className="input" placeholder="Zakopane" required
              value={form.destination} onChange={(e) => set({ destination: e.target.value })} />
          </div>

          <div className="field">
            <label htmlFor="t-description">Opis (opcjonalnie)</label>
            <textarea id="t-description" className="input" placeholder="Co planujecie, co zabrać"
              maxLength={2000} value={form.description}
              onChange={(e) => set({ description: e.target.value })} />
          </div>
        </div>

        <h2 style={{ fontSize: 20, margin: '24px 0 10px' }}>Twoje auto</h2>
        <VehiclePicker value={form.vehicleId} onChange={(vehicleId) => set({ vehicleId })} />

        <div className="field" style={{ marginTop: 12 }}>
          <label htmlFor="t-note">Uwagi do auta (opcjonalnie)</label>
          <input id="t-note" className="input" placeholder="np. bagażnik zajęty w połowie"
            value={form.note} onChange={(e) => set({ note: e.target.value })} />
        </div>

        <h2 style={{ fontSize: 20, margin: '24px 0 4px' }}>Dojazd</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="field">
            <label htmlFor="t-out-origin">Miejsce zbiórki</label>
            <input id="t-out-origin" className="input" placeholder="Kraków, Rondo Mogilskie" required
              value={form.outboundOrigin} onChange={(e) => set({ outboundOrigin: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="t-out-at">Wyjazd</label>
            <input id="t-out-at" className="input" type="datetime-local" required
              value={form.outboundAt} onChange={(e) => set({ outboundAt: e.target.value })} />
          </div>
        </div>

        <h2 style={{ fontSize: 20, margin: '24px 0 4px' }}>Powrót</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="field">
            <label htmlFor="t-back-origin">Miejsce zbiórki</label>
            <input id="t-back-origin" className="input" placeholder="Zakopane, Dworzec" required
              value={form.backOrigin} onChange={(e) => set({ backOrigin: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="t-back-at">Wyjazd w drogę powrotną</label>
            <input id="t-back-at" className="input" type="datetime-local" required
              value={form.backAt} onChange={(e) => set({ backAt: e.target.value })} />
          </div>
        </div>

        <PrimaryButton type="submit" disabled={busy} style={{ marginTop: 24 }}>
          Opublikuj wycieczkę
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
